/**
 * Match State Management Service
 * 
 * Handles the lifecycle of match records in the database with proper state transitions:
 * - running: Match is actively being played
 * - finished: Match completed but not yet saved to history  
 * - confirmed: Match saved to history by user
 * - pending: Unused state (reserved for future features)
 */

import { supabase } from '../lib/supabase';

/**
 * Create a new match record when the first period starts
 * @param {Object} matchData - Match configuration and team data
 * @param {string} matchData.teamId - Team ID (required)
 * @param {string} matchData.format - Match format (required, e.g., '5v5')
 * @param {string} matchData.formation - Formation configuration (required)
 * @param {number} matchData.periods - Number of periods (required)
 * @param {number} matchData.periodDurationMinutes - Duration per period (required)
 * @param {string} matchData.type - Match type (required, e.g., 'friendly')
 * @param {string} matchData.opponent - Opponent team name (optional)
 * @param {string} matchData.captainId - Captain player ID (optional)
 * @returns {Promise<{success: boolean, matchId?: string, error?: string}>}
 */
export async function createMatch(matchData) {
  try {
    // Validate required fields
    const requiredFields = ['teamId', 'format', 'formation', 'periods', 'periodDurationMinutes', 'type'];
    const missingFields = requiredFields.filter(field => !matchData[field]);
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    // Prepare match record
    const matchRecord = {
      team_id: matchData.teamId,
      format: matchData.format,
      formation: matchData.formation,
      periods: matchData.periods,
      period_duration_minutes: matchData.periodDurationMinutes,
      type: matchData.type,
      opponent: matchData.opponent || null,
      captain: matchData.captainId || null,
      state: 'running' // Explicit state (though it's also the default)
    };

    console.log('🏃 Creating match record:', matchRecord);

    const { data, error } = await supabase
      .from('match')
      .insert(matchRecord)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to create match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    console.log('✅ Match created successfully:', data.id);
    return {
      success: true,
      matchId: data.id
    };

  } catch (error) {
    console.error('❌ Exception while creating match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Update match to finished state when the last period ends
 * @param {string} matchId - Match ID
 * @param {Object} finalStats - Final match statistics
 * @param {number} finalStats.matchDurationSeconds - Total match duration
 * @param {number} finalStats.goalsScored - Goals scored by team
 * @param {number} finalStats.goalsConceded - Goals conceded by team
 * @param {string} finalStats.outcome - Match outcome ('win', 'loss', 'draw')
 * @param {string} finalStats.fairPlayAwardId - Fair play award player ID (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMatchToFinished(matchId, finalStats) {
  try {
    // Validate required fields
    const requiredFields = ['matchDurationSeconds', 'goalsScored', 'goalsConceded', 'outcome'];
    const missingFields = requiredFields.filter(field => finalStats[field] === undefined || finalStats[field] === null);
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required final stats: ${missingFields.join(', ')}`
      };
    }

    const updateData = {
      state: 'finished',
      finished_at: new Date().toISOString(),
      match_duration_seconds: finalStats.matchDurationSeconds,
      goals_scored: finalStats.goalsScored,
      goals_conceded: finalStats.goalsConceded,
      outcome: finalStats.outcome,
      fair_play_award: finalStats.fairPlayAwardId || null
    };

    console.log('🏁 Updating match to finished:', matchId, updateData);

    const { error } = await supabase
      .from('match')
      .update(updateData)
      .eq('id', matchId)
      .eq('state', 'running'); // Only update if currently running

    if (error) {
      console.error('❌ Failed to update match to finished:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    console.log('✅ Match updated to finished successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Exception while updating match to finished:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Update match to confirmed state when user saves to history
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMatchToConfirmed(matchId) {
  try {
    console.log('✅ Updating match to confirmed:', matchId);

    const { error } = await supabase
      .from('match')
      .update({ state: 'confirmed' })
      .eq('id', matchId)
      .eq('state', 'finished'); // Only update if currently finished

    if (error) {
      console.error('❌ Failed to update match to confirmed:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    console.log('✅ Match confirmed successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Exception while confirming match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get match by ID
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, match?: Object, error?: string}>}
 */
export async function getMatch(matchId) {
  try {
    const { data, error } = await supabase
      .from('match')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Match not found'
        };
      }
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return {
      success: true,
      match: data
    };

  } catch (error) {
    console.error('❌ Exception while getting match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Check if team has any running matches (prevents duplicates)
 * @param {string} teamId - Team ID
 * @returns {Promise<{success: boolean, hasRunningMatch: boolean, error?: string}>}
 */
export async function checkForRunningMatch(teamId) {
  try {
    const { data, error } = await supabase
      .from('match')
      .select('id')
      .eq('team_id', teamId)
      .eq('state', 'running')
      .limit(1);

    if (error) {
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return {
      success: true,
      hasRunningMatch: data.length > 0
    };

  } catch (error) {
    console.error('❌ Exception while checking for running match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Calculate match outcome based on scores
 * @param {number} goalsScored - Goals scored by team
 * @param {number} goalsConceded - Goals conceded by team
 * @returns {string} Outcome: 'win', 'loss', or 'draw'
 */
export function calculateMatchOutcome(goalsScored, goalsConceded) {
  if (goalsScored > goalsConceded) return 'win';
  if (goalsScored < goalsConceded) return 'loss';
  return 'draw';
}

/**
 * Format match data from game state for database storage
 * @param {Object} gameState - Current game state
 * @param {string} teamId - Team ID
 * @returns {Object} Formatted match data
 */
export function formatMatchDataFromGameState(gameState, teamId) {
  const {
    teamConfig,
    selectedFormation,
    periods = 3,
    periodDurationMinutes = 15,
    opponentTeam,
    captainId
  } = gameState;

  return {
    teamId,
    format: teamConfig?.format || '5v5',
    formation: selectedFormation || teamConfig?.formation || '2-2',
    periods,
    periodDurationMinutes,
    type: 'friendly', // Default for now, could be configurable
    opponent: opponentTeam || null,
    captainId: captainId || null
  };
}

/**
 * Format final stats from game state for match completion
 * @param {Object} gameState - Current game state
 * @param {number} matchDurationSeconds - Total match duration
 * @returns {Object} Formatted final stats
 */
export function formatFinalStatsFromGameState(gameState, matchDurationSeconds) {
  const { ownScore, opponentScore, allPlayers } = gameState;

  // Find fair play award winner (could be determined by user selection)
  const fairPlayWinner = allPlayers.find(p => p.hasFairPlayAward);

  return {
    matchDurationSeconds,
    goalsScored: ownScore || 0,
    goalsConceded: opponentScore || 0,
    outcome: calculateMatchOutcome(ownScore || 0, opponentScore || 0),
    fairPlayAwardId: fairPlayWinner?.id || null
  };
}