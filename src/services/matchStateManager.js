/**
 * Match State Management Service
 * 
 * Handles the lifecycle of match records in the database with proper state transitions:
 * - running: Match is actively being played
 * - finished: Match completed but not yet saved to history  
 * - confirmed: Match saved to history by user
 * - pending: Match created but not yet started (user hasn't clicked Start Match button)
 */

import { supabase } from '../lib/supabase';
import { PLAYER_ROLES } from '../constants/playerConstants';
import { roleToDatabase, normalizeRole } from '../constants/roleConstants';
import { FORMATS, FORMAT_CONFIGS, FORMATIONS } from '../constants/teamConfiguration';
import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';
import { normalizeFormationStructure } from '../utils/formationUtils';

/**
 * Create a new match record when the first period starts and insert initial player stats
 * @param {Object} matchData - Match configuration and team data
 * @param {string} matchData.teamId - Team ID (required)
 * @param {string} matchData.format - Match format (required, e.g., '5v5')
 * @param {string} matchData.formation - Formation configuration (required)
 * @param {number} matchData.periods - Number of periods (required)
 * @param {number} matchData.periodDurationMinutes - Duration per period (required)
 * @param {string} matchData.type - Match type (required, e.g., 'friendly')
 * @param {string} matchData.opponent - Opponent team name (optional)
 * @param {string} matchData.captainId - Captain player ID (optional)
 * @param {Array} allPlayers - Array of all players from game state (optional, for initial stats)
 * @returns {Promise<{success: boolean, matchId?: string, playerStatsInserted?: number, error?: string}>}
 */
export async function createMatch(matchData, allPlayers = [], selectedSquadIds = []) {
  try {
    // Validate required fields
    const requiredFields = ['teamId', 'format', 'formation', 'periods', 'periodDurationMinutes', 'type', 'venueType'];
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
      venue_type: matchData.venueType,
      state: 'pending' // Match created but not yet started
    };


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

    // Insert initial player match statistics immediately after match creation
    let playerStatsInserted = 0;
    if (allPlayers && allPlayers.length > 0) {
      const participatingPlayers = Array.isArray(selectedSquadIds) && selectedSquadIds.length > 0
        ? allPlayers.filter(player => selectedSquadIds.includes(player.id))
        : allPlayers;

      const playerStatsResult = await insertInitialPlayerMatchStats(
        data.id,
        participatingPlayers,
        matchData.captainId,
        selectedSquadIds
      );
      
      if (playerStatsResult.success) {
        playerStatsInserted = playerStatsResult.inserted;
      } else {
        console.warn('⚠️  Match created but failed to insert initial player stats:', playerStatsResult.error);
        // Don't fail the entire operation if player stats fail - the match creation was successful
      }
    }

    return {
      success: true,
      matchId: data.id,
      playerStatsInserted
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
 * Update match from pending to running state when user clicks Start Match
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMatchToRunning(matchId) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }


    const { error } = await supabase
      .from('match')
      .update({ 
        state: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .eq('state', 'pending'); // Only update if currently pending

    if (error) {
      console.error('❌ Failed to start match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Exception while starting match:', error);
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
 * @param {Array} allPlayers - Array of all players from game state (optional)
 * @param {Object} goalScorers - Goal scorers data { eventId: playerId } (optional)
 * @param {Array} matchEvents - Array of match events for goal counting (optional)
 * @returns {Promise<{success: boolean, playerStatsUpdated?: number, error?: string}>}
 */
export async function updateMatchToFinished(matchId, finalStats, allPlayers = [], goalScorers = {}, matchEvents = []) {
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

    // Update player match statistics with performance data when match finishes
    let playerStatsUpdated = 0;
    if (allPlayers && allPlayers.length > 0) {
      
      const playerStatsResult = await updatePlayerMatchStatsOnFinish(matchId, allPlayers, goalScorers, matchEvents);
      
      if (playerStatsResult.success) {
        playerStatsUpdated = playerStatsResult.updated;
      } else {
        console.warn('⚠️  Match finished but failed to update player stats:', playerStatsResult.error);
        // Don't fail the entire operation if player stats fail - the match state update was successful
      }
    }

    return { 
      success: true, 
      playerStatsUpdated 
    };

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
 * @param {string} fairPlayAwardId - Fair play award player ID (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMatchToConfirmed(matchId, fairPlayAwardId = null) {
  try {
    const updateData = { state: 'confirmed' };
    
    // Include fair play award if provided
    if (fairPlayAwardId !== null) {
      updateData.fair_play_award = fairPlayAwardId;
    }

    const { data: updatedMatches, error } = await supabase
      .from('match')
      .update(updateData)
      .eq('id', matchId)
      .eq('state', 'finished')
      .select('id'); // Ensure at least one row was updated

    if (error) {
      console.error('❌ Failed to update match to confirmed:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (!updatedMatches || updatedMatches.length === 0) {
      const warningMessage = 'Match must be finished before it can be saved to history.';
      console.warn(`⚠️  No finished match found to confirm for matchId=${matchId}`);
      return {
        success: false,
        error: warningMessage
      };
    }

    // If fair play award was provided, also update player_match_stats
    if (fairPlayAwardId !== null) {
      const statsResult = await updatePlayerMatchStatsFairPlayAward(matchId, fairPlayAwardId);
      if (!statsResult.success) {
        console.error('❌ Failed to persist fair play award update during match confirmation:', statsResult.error);
        return {
          success: false,
          error: statsResult.error || 'Unable to assign fair play award for this match.'
        };
      }
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
 * Update the got_fair_play_award field in player_match_stats for a specific match
 * @param {string} matchId - Match ID
 * @param {string} fairPlayAwardPlayerId - Player ID who gets the fair play award
 * @returns {Promise<{success: boolean, updated: number, error?: string}>}
 */
export async function updatePlayerMatchStatsFairPlayAward(matchId, fairPlayAwardPlayerId) {
  try {
    // First, clear any existing fair play awards for this match
    const { error: clearError } = await supabase
      .from('player_match_stats')
      .update({ got_fair_play_award: false })
      .eq('match_id', matchId)
      .eq('got_fair_play_award', true);

    if (clearError) {
      console.error('❌ Failed to clear existing fair play awards:', clearError);
      return {
        success: false,
        error: `Database error: ${clearError.message}`
      };
    }

    // Then set the fair play award for the selected player
    const { data, error } = await supabase
      .from('player_match_stats')
      .update({ got_fair_play_award: true })
      .eq('match_id', matchId)
      .eq('player_id', fairPlayAwardPlayerId)
      .select('id');

    if (error) {
      console.error('❌ Failed to update fair play award in player stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      console.error('❌ No player match stats rows updated with fair play award for match:', matchId);
      return {
        success: false,
        error: 'No player statistics were updated with the fair play award. Ensure the player participated in this match.'
      };
    }

    return {
      success: true,
      updated: data?.length || 0
    };

  } catch (error) {
    console.error('❌ Exception while updating fair play award in player stats:', error);
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
    captainId,
    matchType = 'league', // Default to league if not provided
    venueType = DEFAULT_VENUE_TYPE
  } = gameState;

  const formatKey = teamConfig?.format || FORMATS.FORMAT_5V5;
  const formatConfig = FORMAT_CONFIGS[formatKey] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
  const defaultFormation = formatConfig?.defaultFormation || FORMATIONS.FORMATION_2_2;

  return {
    teamId,
    format: teamConfig?.format || FORMATS.FORMAT_5V5,
    formation: selectedFormation || teamConfig?.formation || defaultFormation,
    periods,
    periodDurationMinutes,
    type: matchType,
    opponent: opponentTeam || null,
    captainId: captainId || null,
    venueType: venueType || DEFAULT_VENUE_TYPE
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
    return roleToDatabase(PLAYER_ROLES.UNKNOWN);
  }

  // Handle pairs mode positions - normalize and convert currentRole
  if (position === 'leftPair' || position === 'rightPair') {
    if (currentRole) {
      const normalizedRole = normalizeRole(currentRole);
      return roleToDatabase(normalizedRole);
    }
    return roleToDatabase(PLAYER_ROLES.UNKNOWN);
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
    case 'leftMidfielder':
    case 'rightMidfielder':
    case 'centerMidfielder':
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
      return roleToDatabase(PLAYER_ROLES.UNKNOWN);
  }
}

/**
 * Map game state player role to database player_role enum (DEPRECATED - use mapFormationPositionToRole)
 * @param {string} gameStateRole - Role from game state (PLAYER_ROLES constants or any format)
 * @returns {string} Database player_role enum value
 */
export function mapStartingRoleToDBRole(gameStateRole) {
  if (!gameStateRole) {
    console.warn('⚠️  No starting role provided, defaulting to unknown');
    return roleToDatabase(PLAYER_ROLES.UNKNOWN);
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
 * Format initial player stats for database insertion when match starts
 * @param {Object} player - Player object from game state
 * @param {string} matchId - Match ID
 * @param {string} captainId - Captain player ID for this match
 * @returns {Object|null} Formatted initial player match stats for database, or null if player didn't participate
 */
export function formatInitialPlayerStats(player, matchId, captainId) {
  // Only process players who are participating in the match (have startedMatchAs or startedAtPosition)
  if (!player.stats?.startedMatchAs && !player.stats?.startedAtPosition) {
    return null;
  }

  let startingRole;
  if (player.stats?.startedAtRole) {
    startingRole = roleToDatabase(player.stats.startedAtRole);
  } else if (player.stats?.startedAtPosition) {
    startingRole = mapFormationPositionToRole(player.stats.startedAtPosition, player.stats.currentRole);
  } else {
    startingRole = roleToDatabase(PLAYER_ROLES.UNKNOWN);
  }

  return {
    player_id: player.id,
    match_id: matchId,
    // Match participation details - only data available at match start
    started_as: startingRole,
    was_captain: player.id === captainId || player.stats?.isCaptain || false,
    // Performance metrics default to 0/false - will be updated when match finishes
    goals_scored: 0,
    goalie_time_seconds: 0,
    defender_time_seconds: 0,
    midfielder_time_seconds: 0,
    attacker_time_seconds: 0,
    substitute_time_seconds: 0,
    total_field_time_seconds: 0,
    got_fair_play_award: false
  };
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


  let startingRole;
  if (player.stats?.startedAtRole) {
    startingRole = roleToDatabase(player.stats.startedAtRole);
  } else if (player.stats?.startedAtPosition) {
    startingRole = mapFormationPositionToRole(player.stats.startedAtPosition, player.stats.currentRole);
  } else {
    startingRole = roleToDatabase(PLAYER_ROLES.UNKNOWN);
  }

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
    started_as: startingRole,
    was_captain: player.stats.isCaptain || false,
    got_fair_play_award: player.hasFairPlayAward || false
  };
}

/**
 * Insert initial player match statistics when match starts
 * @param {string} matchId - Match ID
 * @param {Array} allPlayers - Array of all players from game state
 * @param {string} captainId - Captain player ID for this match
 * @returns {Promise<{success: boolean, inserted: number, error?: string}>}
 */
export async function insertInitialPlayerMatchStats(matchId, allPlayers, captainId, selectedSquadIds = []) {
  try {
    const participatingPlayers = Array.isArray(selectedSquadIds) && selectedSquadIds.length > 0
      ? allPlayers.filter(player => selectedSquadIds.includes(player.id))
      : allPlayers;

    // Filter and format initial player stats for players who are participating
    const initialPlayerStatsData = participatingPlayers
      .map(player => formatInitialPlayerStats(player, matchId, captainId))
      .filter(stats => stats !== null); // Remove players who aren't participating

    if (initialPlayerStatsData.length === 0) {
      console.warn('⚠️  No initial player stats to insert - no players participating?');
      return {
        success: true,
        inserted: 0
      };
    }


    const { data, error } = await supabase
      .from('player_match_stats')
      .insert(initialPlayerStatsData)
      .select('id');

    if (error) {
      console.error('❌ Failed to insert initial player match stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return {
      success: true,
      inserted: data?.length || 0
    };

  } catch (error) {
    console.error('❌ Exception while inserting initial player match stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Update existing match record with new configuration (for back-and-forth navigation)
 * @param {string} matchId - Match ID to update
 * @param {Object} matchData - Updated match configuration and team data
 * @param {string} matchData.teamId - Team ID (required)
 * @param {string} matchData.format - Match format (required, e.g., '5v5')
 * @param {string} matchData.formation - Formation configuration (required)
 * @param {number} matchData.periods - Number of periods (required)
 * @param {number} matchData.periodDurationMinutes - Duration per period (required)
 * @param {string} matchData.type - Match type (required, e.g., 'friendly')
 * @param {string} matchData.opponent - Opponent team name (optional)
 * @param {string} matchData.captainId - Captain player ID (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateExistingMatch(matchId, matchData) {
  try {
    // Validate required fields
    const requiredFields = ['teamId', 'format', 'formation', 'periods', 'periodDurationMinutes', 'type', 'venueType'];
    const missingFields = requiredFields.filter(field => !matchData[field]);
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    // Prepare update data (only updateable fields)
    const updateData = {
      format: matchData.format,
      formation: matchData.formation,
      periods: matchData.periods,
      period_duration_minutes: matchData.periodDurationMinutes,
      type: matchData.type,
      opponent: matchData.opponent || null,
      captain: matchData.captainId || null,
      venue_type: matchData.venueType,
      updated_at: new Date().toISOString()
    };


    const { error } = await supabase
      .from('match')
      .update(updateData)
      .eq('id', matchId)
      .eq('state', 'pending'); // Only update pending matches

    if (error) {
      console.warn('⚠️  Failed to update existing match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }


    return { success: true };

  } catch (error) {
    console.warn('⚠️  Exception while updating existing match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Delete all player match statistics for a specific match (for squad changes)
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, deleted: number, error?: string}>}
 */
export async function deletePlayerMatchStats(matchId) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }


    const { data, error } = await supabase
      .from('player_match_stats')
      .delete()
      .eq('match_id', matchId)
      .select('id'); // Return deleted record IDs for counting

    if (error) {
      console.warn('⚠️  Failed to delete existing player match stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    const deletedCount = data?.length || 0;

    return {
      success: true,
      deleted: deletedCount
    };

  } catch (error) {
    console.warn('⚠️  Exception while deleting player match stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Upsert player match statistics with updated squad/formation without destructive deletes
 * @param {string} matchId - Match ID
 * @param {Array} allPlayers - Array of all players from game state
 * @param {string} captainId - Captain player ID for this match
 * @param {Array} selectedSquadIds - Array of currently selected player IDs (optional, for filtering)
 * @returns {Promise<{success: boolean, inserted: number, deleted: number, error?: string}>}
 */
export async function upsertPlayerMatchStats(matchId, allPlayers, captainId, selectedSquadIds = null) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    // Filter to only currently selected players (defensive approach)
    let playersToProcess = allPlayers;
    if (selectedSquadIds && Array.isArray(selectedSquadIds) && selectedSquadIds.length > 0) {
      playersToProcess = allPlayers.filter(player => selectedSquadIds.includes(player.id));
    }

    const statsPayload = playersToProcess
      .map(player => formatInitialPlayerStats(player, matchId, captainId))
      .filter(stats => stats !== null);

    if (statsPayload.length === 0) {
      return {
        success: true,
        inserted: 0,
        updated: 0
      };
    }

    const { data, error } = await supabase
      .from('player_match_stats')
      .upsert(statsPayload, { onConflict: 'match_id,player_id' })
      .select('id');

    if (error) {
      console.error('❌ Failed to upsert player match stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return {
      success: true,
      inserted: data?.length || 0,
      updated: data?.length || 0
    };

  } catch (error) {
    console.warn('⚠️  Exception while upserting player match stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Save initial match configuration when user clicks "Enter Game"
 * @param {string} matchId - Match ID
 * @param {Object} initialConfig - Complete initial configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveInitialMatchConfig(matchId, initialConfig) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    if (!initialConfig || typeof initialConfig !== 'object') {
      return {
        success: false,
        error: 'Initial configuration is required'
      };
    }

    // Normalize the formation structure before saving to database
    const cleanInitialConfig = { ...initialConfig };

    if (initialConfig.formation && initialConfig.teamConfig && initialConfig.squadSelection) {
      // Direct usage since database teamConfig now uses flat format
      const runtimeTeamConfig = {
        format: initialConfig.teamConfig?.format,
        formation: initialConfig.teamConfig?.formation,
        squadSize: initialConfig.teamConfig?.squadSize,
        substitutionType: initialConfig.teamConfig?.substitutionType || 'individual',
        ...(initialConfig.teamConfig?.pairRoleRotation && {
          pairRoleRotation: initialConfig.teamConfig.pairRoleRotation
        })
      };

      // Normalize the formation structure
      cleanInitialConfig.formation = normalizeFormationStructure(
        initialConfig.formation,
        runtimeTeamConfig,
        initialConfig.squadSelection
      );
    }

    const { error } = await supabase
      .from('match')
      .update({
        initial_config: cleanInitialConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .eq('state', 'pending'); // Only update pending matches

    if (error) {
      console.error('❌ Failed to save initial match config:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Exception while saving initial match config:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get pending match with initial configuration for a team
 * @param {string} teamId - Team ID
 * @returns {Promise<{success: boolean, match?: Object, error?: string}>}
 */
export async function getPendingMatchForTeam(teamId) {
  try {
    if (!teamId) {
      return {
        success: false,
        error: 'Team ID is required'
      };
    }

    const { data, error } = await supabase
      .from('match')
      .select('*')
      .eq('team_id', teamId)
      .eq('state', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to get pending match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return {
      success: true,
      match: data || null
    };

  } catch (error) {
    console.error('❌ Exception while getting pending match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Delete pending match and clear local state
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function discardPendingMatch(matchId) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }


    // First delete any associated player match stats
    await supabase
      .from('player_match_stats')
      .delete()
      .eq('match_id', matchId);

    // Then delete the match itself
    const { error } = await supabase
      .from('match')
      .delete()
      .eq('id', matchId)
      .eq('state', 'pending'); // Only delete pending matches

    if (error) {
      console.error('❌ Failed to discard pending match:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Exception while discarding pending match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Update player match statistics when match finishes
 * @param {string} matchId - Match ID
 * @param {Array} allPlayers - Array of all players from game state
 * @param {Object} goalScorers - Goal scorers data { eventId: playerId }
 * @param {Array} matchEvents - Array of match events for goal counting
 * @returns {Promise<{success: boolean, updated: number, error?: string}>}
 */
export async function updatePlayerMatchStatsOnFinish(matchId, allPlayers, goalScorers = {}, matchEvents = []) {
  try {
    // Filter players who participated in the match
    const participatingPlayers = allPlayers.filter(player => 
      player.stats?.startedMatchAs || player.stats?.startedAtPosition
    );

    if (participatingPlayers.length === 0) {
      console.warn('⚠️  No player stats to update - no players participated?');
      return {
        success: true,
        updated: 0
      };
    }


    let updatedCount = 0;
    
    // Update each player's performance stats individually
    for (const player of participatingPlayers) {
      const playerStats = formatPlayerMatchStats(player, matchId, goalScorers, matchEvents);
      if (!playerStats) continue;

      // Extract only the fields that should be updated when match finishes
      const updateData = {
        goals_scored: playerStats.goals_scored,
        goalie_time_seconds: playerStats.goalie_time_seconds,
        defender_time_seconds: playerStats.defender_time_seconds,
        midfielder_time_seconds: playerStats.midfielder_time_seconds,
        attacker_time_seconds: playerStats.attacker_time_seconds,
        substitute_time_seconds: playerStats.substitute_time_seconds,
        total_field_time_seconds: playerStats.total_field_time_seconds,
        got_fair_play_award: playerStats.got_fair_play_award,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('player_match_stats')
        .update(updateData)
        .eq('match_id', matchId)
        .eq('player_id', player.id);

      if (error) {
        console.error(`❌ Failed to update player match stats for ${player.id}:`, error);
        // Continue with other players instead of failing completely
      } else {
        updatedCount++;
      }
    }

    
    return {
      success: true,
      updated: updatedCount
    };

  } catch (error) {
    console.error('❌ Exception while updating player match stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}
