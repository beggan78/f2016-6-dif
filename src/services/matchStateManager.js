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
import { PLAYER_ROLES } from '../constants/playerConstants';
import { roleToDatabase, normalizeRole } from '../constants/roleConstants';

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

    if (process.env.NODE_ENV === 'development') {
      console.log('🏃 Creating match record:', matchRecord);
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Match created successfully:', data.id);
    }
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

    if (process.env.NODE_ENV === 'development') {
      console.log('🏁 Updating match to finished:', matchId, updateData);
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Match updated to finished successfully');
    }
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
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Updating match to confirmed:', matchId);
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Match confirmed successfully');
    }
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

/**
 * Map formation position to database player_role enum with pairs mode support
 * @param {string} position - Formation position (e.g., 'defender', 'left', 'attacker', 'goalie', 'leftPair', 'rightPair')
 * @param {string} currentRole - Player's current role (for pairs mode: any format accepted)
 * @returns {string} Database player_role enum value
 */
export function mapFormationPositionToRole(position, currentRole = null) {
  if (!position) {
    console.warn('⚠️  No position provided to mapFormationPositionToRole');
    return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
  }

  // Handle pairs mode positions - normalize and convert currentRole
  if (position === 'leftPair' || position === 'rightPair') {
    if (currentRole) {
      const normalizedRole = normalizeRole(currentRole);
      return roleToDatabase(normalizedRole);
    }
    return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
  }

  // Handle substitute pair
  if (position === 'subPair') {
    return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
  }

  switch (position) {
    // Goalie position
    case 'goalie':
      return roleToDatabase(PLAYER_ROLES.GOALIE);
    
    // Defender positions (2-2 and 1-2-1 formations)
    case 'leftDefender':
    case 'rightDefender':
    case 'defender':        // 1-2-1 center back
      return roleToDatabase(PLAYER_ROLES.DEFENDER);
    
    // Midfielder positions (1-2-1 formation)
    case 'left':            // Left midfielder in 1-2-1
    case 'right':           // Right midfielder in 1-2-1
      return roleToDatabase(PLAYER_ROLES.MIDFIELDER);
    
    // Attacker positions (2-2 and 1-2-1 formations)  
    case 'leftAttacker':
    case 'rightAttacker':
    case 'attacker':        // 1-2-1 center forward
      return roleToDatabase(PLAYER_ROLES.ATTACKER);
    
    // Substitute positions
    case 'substitute':
    case 'substitute_1':
    case 'substitute_2':
    case 'substitute_3':
    case 'substitute_4':
    case 'substitute_5':
      return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
    
    default:
      console.warn('⚠️  Unexpected position value:', position);
      return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
  }
}

/**
 * Map game state player role to database player_role enum (DEPRECATED - use mapFormationPositionToRole)
 * @param {string} gameStateRole - Role from game state (PLAYER_ROLES constants or any format)
 * @returns {string} Database player_role enum value
 */
export function mapStartingRoleToDBRole(gameStateRole) {
  if (!gameStateRole) {
    console.warn('⚠️  No starting role provided, defaulting to substitute');
    return roleToDatabase(PLAYER_ROLES.SUBSTITUTE);
  }

  // Normalize any role format to PLAYER_ROLES constant, then convert to database format
  const normalizedRole = normalizeRole(gameStateRole);
  
  // For 'FIELD_PLAYER', default to 'defender' since we track actual time in specific roles
  if (normalizedRole === PLAYER_ROLES.FIELD_PLAYER) {
    return roleToDatabase(PLAYER_ROLES.DEFENDER);
  }
  
  return roleToDatabase(normalizedRole);
}

/**
 * Count goals scored by a specific player using same logic as PlayerStatsTable
 * @param {Object} goalScorers - Goal scorers object { eventId: playerId }
 * @param {Array} matchEvents - Array of match events
 * @param {string} playerId - Player ID to count goals for
 * @returns {number} Number of goals scored by the player
 */
export function countPlayerGoals(goalScorers, matchEvents, playerId) {
  // Import EVENT_TYPES dynamically to avoid circular dependencies
  const EVENT_TYPES = {
    GOAL_SCORED: 'goal_scored',
    GOAL_CONCEDED: 'goal_conceded'
  };
  
  let goalCount = 0;
  
  
  // Count goals from match events (same logic as PlayerStatsTable)
  if (matchEvents && Array.isArray(matchEvents)) {
    matchEvents.forEach(event => {
      if ((event.type === EVENT_TYPES.GOAL_SCORED || event.type === EVENT_TYPES.GOAL_CONCEDED) && !event.undone) {
        // Check goalScorers mapping first, then fall back to event data
        const scorerId = goalScorers[event.id] || event.data?.scorerId;
        if (scorerId === playerId) {
          goalCount++;
        }
      }
    });
  }
  
  // Fallback to goalScorers object if no matchEvents (backward compatibility)
  if (goalCount === 0 && goalScorers && typeof goalScorers === 'object') {
    goalCount = Object.values(goalScorers).filter(scorerId => scorerId === playerId).length;
  }
  
  return goalCount;
}

/**
 * Format individual player stats for database insertion
 * @param {Object} player - Player object from game state
 * @param {string} matchId - Match ID
 * @param {Object} goalScorers - Goal scorers data { eventId: playerId }
 * @param {Array} matchEvents - Array of match events for goal counting
 * @returns {Object} Formatted player match stats for database
 */
export function formatPlayerMatchStats(player, matchId, goalScorers = {}, matchEvents = []) {
  // Only process players who participated in the match
  if (!player.stats?.startedMatchAs) {
    return null;
  }

  // Calculate total field time excluding goalie time
  const totalFieldTime = Math.max(0, (player.stats.timeOnFieldSeconds || 0) - (player.stats.timeAsGoalieSeconds || 0));
  
  // Count goals scored by this player
  const goalsScored = countPlayerGoals(goalScorers, matchEvents, player.id);

  // DEBUG: Log starting position mapping
  // eslint-disable-next-line no-unused-vars
  const startedAtPosition = player.stats.startedAtPosition;
  // eslint-disable-next-line no-unused-vars
  const startedMatchAs = player.stats.startedMatchAs;
  // eslint-disable-next-line no-unused-vars
  const currentRole = player.stats.currentRole;

  return {
    player_id: player.id,
    match_id: matchId,
    // Performance metrics
    goals_scored: goalsScored,
    // Time tracking for all roles
    goalie_time_seconds: player.stats.timeAsGoalieSeconds || 0,
    defender_time_seconds: player.stats.timeAsDefenderSeconds || 0,
    midfielder_time_seconds: player.stats.timeAsMidfielderSeconds || 0,
    attacker_time_seconds: player.stats.timeAsAttackerSeconds || 0,
    substitute_time_seconds: player.stats.timeAsSubSeconds || 0,
    // Total outfield time (excluding goalie time)
    total_field_time_seconds: totalFieldTime,
    // Match participation details
    started_as: player.stats.startedAtPosition 
      ? mapFormationPositionToRole(player.stats.startedAtPosition, player.stats.currentRole)
      : mapStartingRoleToDBRole(player.stats.startedMatchAs), // Fallback for backward compatibility
    was_captain: player.stats.isCaptain || false,
    got_fair_play_award: player.hasFairPlayAward || false
  };
}

/**
 * Insert player match statistics for all players who participated
 * @param {string} matchId - Match ID
 * @param {Array} allPlayers - Array of all players from game state
 * @param {Object} goalScorers - Goal scorers data { eventId: playerId }
 * @param {Array} matchEvents - Array of match events for goal counting
 * @returns {Promise<{success: boolean, inserted: number, error?: string}>}
 */
export async function insertPlayerMatchStats(matchId, allPlayers, goalScorers = {}, matchEvents = []) {
  try {
    // Filter and format player stats for players who participated
    const playerStatsData = allPlayers
      .map(player => formatPlayerMatchStats(player, matchId, goalScorers, matchEvents))
      .filter(stats => stats !== null); // Remove players who didn't participate

    if (playerStatsData.length === 0) {
      console.warn('⚠️  No player stats to insert - no players participated?');
      return {
        success: true,
        inserted: 0
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Inserting player match stats:', playerStatsData.length, 'players');
    }

    const { data, error } = await supabase
      .from('player_match_stats')
      .insert(playerStatsData)
      .select('id');

    if (error) {
      console.error('❌ Failed to insert player match stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Player match stats inserted successfully:', data?.length || 0, 'records');
    }
    return {
      success: true,
      inserted: data?.length || 0
    };

  } catch (error) {
    console.error('❌ Exception while inserting player match stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}