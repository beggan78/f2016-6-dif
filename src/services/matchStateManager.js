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
import { matchPassesFilters } from '../utils/matchFilterUtils';

const DISPLAY_ROLE_TO_DB_ROLE_MAP = {
  Goalkeeper: roleToDatabase(PLAYER_ROLES.GOALIE),
  Goalie: roleToDatabase(PLAYER_ROLES.GOALIE),
  Defender: roleToDatabase(PLAYER_ROLES.DEFENDER),
  Midfielder: roleToDatabase(PLAYER_ROLES.MIDFIELDER),
  Attacker: roleToDatabase(PLAYER_ROLES.ATTACKER),
  Substitute: roleToDatabase(PLAYER_ROLES.SUBSTITUTE)
};

const DB_ROLE_TO_DISPLAY_ROLE_MAP = {
  goalie: 'Goalkeeper',
  defender: 'Defender',
  midfielder: 'Midfielder',
  attacker: 'Attacker',
  substitute: 'Substitute'
};

function mapDisplayRoleToDatabaseRole(displayRole) {
  if (!displayRole) {
    return null;
  }

  if (DISPLAY_ROLE_TO_DB_ROLE_MAP[displayRole]) {
    return DISPLAY_ROLE_TO_DB_ROLE_MAP[displayRole];
  }

  return mapStartingRoleToDBRole(displayRole);
}

function formatDatabaseRoleForDisplay(dbRole) {
  if (!dbRole) {
    return 'Unknown';
  }

  if (DB_ROLE_TO_DISPLAY_ROLE_MAP[dbRole]) {
    return DB_ROLE_TO_DISPLAY_ROLE_MAP[dbRole];
  }

  return dbRole.charAt(0).toUpperCase() + dbRole.slice(1);
}

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
 * Create a fully confirmed match record directly from manual input.
 * Inserts both the match metadata and optional player statistics so the entry
 * appears immediately in match history.
 * @param {Object} matchData - Manual match details collected from the UI
 * @param {string} matchData.teamId - Team ID (required)
 * @param {string} matchData.date - Match date in YYYY-MM-DD (required)
 * @param {string} matchData.time - Match start time in HH:MM (required)
 * @param {string} matchData.type - Match type enum value (required)
 * @param {string} matchData.venueType - Venue type enum value (required)
 * @param {string} matchData.format - Match format (required)
 * @param {string} matchData.formation - Formation identifier (required)
 * @param {number} matchData.periods - Number of periods (required)
 * @param {number} matchData.periodDuration - Period duration in minutes (required)
 * @param {number} [matchData.goalsScored=0] - Goals scored by the team
 * @param {number} [matchData.goalsConceded=0] - Goals conceded by the opponent
 * @param {number} [matchData.matchDurationSeconds] - Total match duration in seconds
 * @param {string} [matchData.opponent] - Opponent name
 * @param {string} [matchData.captainId] - Captain player ID
 * @param {Array} playerStats - Optional player stat objects from the edit view
 * @returns {Promise<{success: boolean, matchId?: string, error?: string}>}
 */
export async function createManualMatch(matchData, playerStats = []) {
  try {
    const requiredFields = [
      'teamId',
      'date',
      'time',
      'type',
      'venueType',
      'format',
      'formation',
      'periods',
      'periodDuration'
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = matchData[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    const goalsScored = typeof matchData.goalsScored === 'number' ? matchData.goalsScored : 0;
    const goalsConceded = typeof matchData.goalsConceded === 'number' ? matchData.goalsConceded : 0;
    const outcome = calculateMatchOutcome(goalsScored, goalsConceded);

    // Default duration: total minutes from periods * period duration
    const computedDurationSeconds = (Number(matchData.periods) || 0) * (Number(matchData.periodDuration) || 0) * 60;
    const matchDurationSeconds = typeof matchData.matchDurationSeconds === 'number'
      ? matchData.matchDurationSeconds
      : computedDurationSeconds;

    // Compose ISO timestamp from provided date and time (falls back to UTC midnight if parsing fails)
    let startedAt;
    try {
      const isoString = `${matchData.date}T${matchData.time}:00`;
      startedAt = new Date(isoString).toISOString();
    } catch (error) {
      startedAt = new Date().toISOString();
    }

    const nowIso = new Date().toISOString();

    const fairPlayAwardPlayerId = matchData.fairPlayAwardPlayerId
      || playerStats.find((player) => player?.receivedFairPlayAward)?.playerId
      || null;

    const captainId = matchData.captainId
      || playerStats.find((player) => player?.wasCaptain)?.playerId
      || null;

    const insertData = {
      team_id: matchData.teamId,
      opponent: matchData.opponent || null,
      goals_scored: goalsScored,
      goals_conceded: goalsConceded,
      outcome,
      venue_type: matchData.venueType,
      type: typeof matchData.type === 'string' ? matchData.type.toLowerCase() : matchData.type,
      format: matchData.format,
      formation: matchData.formation,
      periods: Number(matchData.periods) || 0,
      period_duration_minutes: Number(matchData.periodDuration) || 0,
      match_duration_seconds: matchDurationSeconds,
      started_at: startedAt,
      finished_at: startedAt,
      updated_at: nowIso,
      state: 'confirmed',
      fair_play_award: fairPlayAwardPlayerId,
      captain: captainId
    };

    const { data: matchInsertResult, error: matchInsertError } = await supabase
      .from('match')
      .insert(insertData)
      .select('id')
      .single();

    if (matchInsertError) {
      console.error('❌ Failed to create manual match:', matchInsertError);
      return {
        success: false,
        error: `Database error: ${matchInsertError.message}`
      };
    }

    const createdMatchId = matchInsertResult?.id;

    if (!createdMatchId) {
      return {
        success: false,
        error: 'Failed to create match: Missing match identifier from database response.'
      };
    }

    const hasPlayerStats = Array.isArray(playerStats) && playerStats.length > 0;

    if (hasPlayerStats) {
      const statRows = playerStats
        .filter((player) => player?.playerId)
        .map((player) => buildPlayerMatchStatUpdateRow(createdMatchId, player.playerId, player));

      if (statRows.length > 0) {
        const { error: statsError } = await supabase
          .from('player_match_stats')
          .upsert(statRows, { onConflict: 'match_id,player_id' });

        if (statsError) {
          console.error('❌ Failed to insert manual player stats:', statsError);
          return {
            success: false,
            error: `Database error: ${statsError.message}`
          };
        }
      }
    }

    return {
      success: true,
      matchId: createdMatchId
    };

  } catch (error) {
    console.error('❌ Exception while creating manual match:', error);
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


    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('match')
      .update({
        state: 'running',
        started_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', matchId)
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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
 * Get confirmed matches for a team (match history)
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Optional start date filter
 * @param {Date} endDate - Optional end date filter
 * @returns {Promise<{success: boolean, matches?: Array, error?: string}>}
 */
export async function getConfirmedMatches(teamId, startDate = null, endDate = null) {
  try {
    if (!teamId) {
      return {
        success: false,
        error: 'Team ID is required'
      };
    }

    let query = supabase
      .from('match')
      .select(`
        id,
        started_at,
        opponent,
        goals_scored,
        goals_conceded,
        venue_type,
        type,
        outcome,
        format,
        formation,
        periods,
        period_duration_minutes,
        captain,
        player_match_stats (
        player:player_id (
          id,
          display_name,
          first_name
        )
      )
      `)
      .eq('team_id', teamId)
      .eq('state', 'confirmed')
      .is('deleted_at', null)
      .order('started_at', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('started_at', startDate.toISOString());
    }
    if (endDate) {
      // Add one day to include the entire end date
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      query = query.lt('started_at', endDatePlusOne.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to get confirmed matches:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    // Transform data to match UI expectations
    const matches = (data || []).map(match => {
      // Extract unique player names from player_match_stats
      const playerNames = match.player_match_stats
        .filter(stat => stat.player)
        .map(stat => stat.player.display_name || stat.player.first_name || 'Unknown Player');

      return {
        id: match.id,
        date: match.started_at,
        opponent: match.opponent || 'Unknown',
        goalsScored: match.goals_scored,
        goalsConceded: match.goals_conceded,
        venueType: match.venue_type,
        type: match.type.charAt(0).toUpperCase() + match.type.slice(1),
        outcome: match.outcome === 'win' ? 'W' : match.outcome === 'draw' ? 'D' : 'L',
        format: match.format,
        players: playerNames
      };
    });

    return {
      success: true,
      matches
    };

  } catch (error) {
    console.error('❌ Exception while getting confirmed matches:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get match details with player statistics
 * @param {string} matchId - Match ID
 * @returns {Promise<{success: boolean, match?: Object, playerStats?: Array, error?: string}>}
 */
export async function getMatchDetails(matchId) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    const { data: match, error: matchError } = await supabase
      .from('match')
      .select(`
        id,
        started_at,
        opponent,
        goals_scored,
        goals_conceded,
        venue_type,
        type,
        outcome,
        format,
        formation,
        periods,
        period_duration_minutes,
        match_duration_seconds,
        captain
      `)
      .eq('id', matchId)
      .is('deleted_at', null)
      .single();

    if (matchError) {
      console.error('❌ Failed to get match details:', matchError);
      return {
        success: false,
        error: `Database error: ${matchError.message}`
      };
    }

    // Get player statistics for this match
    const { data: playerStats, error: statsError } = await supabase
      .from('player_match_stats')
      .select(`
        player:player_id (
          id,
          display_name,
          first_name
        ),
        goals_scored,
        goalie_time_seconds,
        defender_time_seconds,
        midfielder_time_seconds,
        attacker_time_seconds,
        substitute_time_seconds,
        total_field_time_seconds,
        started_as,
        was_captain,
        got_fair_play_award
      `)
      .eq('match_id', matchId);

    if (statsError) {
      console.error('❌ Failed to get player stats:', statsError);
      return {
        success: false,
        error: `Database error: ${statsError.message}`
      };
    }

    // Transform match data to UI format
    const matchDate = new Date(match.started_at);

    const normalizedType = typeof match.type === 'string'
      ? match.type.toLowerCase()
      : 'league';

    const transformedMatch = {
      id: match.id,
      date: matchDate.toISOString().split('T')[0],
      time: matchDate.toTimeString().slice(0, 5),
      type: normalizedType,
      opponent: match.opponent || 'Unknown',
      goalsScored: match.goals_scored,
      goalsConceded: match.goals_conceded,
      venueType: match.venue_type,
      outcome: match.outcome === 'win' ? 'W' : match.outcome === 'draw' ? 'D' : 'L',
      format: match.format,
      periods: match.periods,
      periodDuration: match.period_duration_minutes,
      matchDurationSeconds: match.match_duration_seconds,
      formation: match.formation
    };

    // Transform player stats to UI format (convert seconds to minutes)
    const transformedPlayerStats = playerStats
      .filter(stat => stat.player)
      .map((stat, index) => {
        const displayName = stat.player.display_name || stat.player.first_name || 'Unnamed Player';
        return {
          id: index + 1,
          playerId: stat.player.id,
          displayName,
          goalsScored: stat.goals_scored || 0,
          totalTimePlayed: (stat.total_field_time_seconds || 0) / 60,
          timeAsDefender: (stat.defender_time_seconds || 0) / 60,
          timeAsMidfielder: (stat.midfielder_time_seconds || 0) / 60,
          timeAsAttacker: (stat.attacker_time_seconds || 0) / 60,
          timeAsGoalkeeper: (stat.goalie_time_seconds || 0) / 60,
          startingRole: formatDatabaseRoleForDisplay(stat.started_as),
          wasCaptain: stat.was_captain || false,
          receivedFairPlayAward: stat.got_fair_play_award || false
        };
      });

    return {
      success: true,
      match: transformedMatch,
      playerStats: transformedPlayerStats
    };

  } catch (error) {
    console.error('❌ Exception while getting match details:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get aggregated player statistics for a team
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Optional start date filter
 * @param {Date} endDate - Optional end date filter
 * @param {Object} filters - Additional match filters (type, outcome, venue, opponent, player, format)
 * @returns {Promise<{success: boolean, players?: Array, error?: string}>}
 */
export async function getPlayerStats(teamId, startDate = null, endDate = null, filters = {}) {
  try {
    if (!teamId) {
      return {
        success: false,
        error: 'Team ID is required'
      };
    }

    const toStartOfDay = (date) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const toEndOfDay = (date) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    };

    const normalizeFilterArray = (value) => (Array.isArray(value) ? value : []);

    const normalizedFilters = {
      typeFilter: normalizeFilterArray(filters.typeFilter),
      outcomeFilter: normalizeFilterArray(filters.outcomeFilter),
      venueFilter: normalizeFilterArray(filters.venueFilter),
      opponentFilter: normalizeFilterArray(filters.opponentFilter),
      playerFilter: normalizeFilterArray(filters.playerFilter),
      formatFilter: normalizeFilterArray(filters.formatFilter)
    };

    const normalizedStartDate = toStartOfDay(startDate);
    const normalizedEndDate = toEndOfDay(endDate);

    const formatMatchType = (type) => {
      if (!type || typeof type !== 'string') return null;
      return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const mapOutcomeToDisplay = (outcome) => {
      if (!outcome) return null;
      if (outcome === 'win') return 'W';
      if (outcome === 'draw') return 'D';
      if (outcome === 'loss') return 'L';
      return outcome;
    };

    // Query to get all player match stats for the team's confirmed matches
    let query = supabase
      .from('player_match_stats')
      .select(`
        player_id,
        goals_scored,
        goalie_time_seconds,
        defender_time_seconds,
        midfielder_time_seconds,
        attacker_time_seconds,
        total_field_time_seconds,
        started_as,
        was_captain,
        got_fair_play_award,
        match:match_id (
          id,
          team_id,
          state,
          deleted_at,
          started_at,
          type,
          outcome,
          venue_type,
          opponent,
          format
        ),
        player:player_id (
          id,
          display_name,
          first_name,
          team_id
        )
      `);

    // First fetch all data, then filter in memory
    // (Supabase doesn't support nested filters directly in the select)
    const { data: allStats, error: statsError } = await query;

    if (statsError) {
      console.error('❌ Failed to get player stats:', statsError);
      return {
        success: false,
        error: `Database error: ${statsError.message}`
      };
    }

    // Build helper maps for filtering
    const matchDetailsMap = new Map();

    (allStats || []).forEach((stat) => {
      if (!stat.match || stat.match.team_id !== teamId || stat.match.state !== 'confirmed' || stat.match.deleted_at !== null) {
        return;
      }

      const matchId = stat.match.id;
      if (!matchId) {
        return;
      }

      const existingDetails = matchDetailsMap.get(matchId);

      const matchDetails = existingDetails || {
        id: matchId,
        date: stat.match.started_at,
        type: formatMatchType(stat.match.type),
        outcome: mapOutcomeToDisplay(stat.match.outcome),
        venueType: stat.match.venue_type,
        opponent: stat.match.opponent || 'Unknown',
        format: stat.match.format,
        players: new Set()
      };

      const playerDisplayName = stat.player?.display_name || stat.player?.first_name;
      if (playerDisplayName) {
        matchDetails.players.add(playerDisplayName);
      }

      matchDetailsMap.set(matchId, matchDetails);
    });

    // Filter for confirmed matches of this team only and apply match filters
    const filteredStats = (allStats || []).filter(stat => {
      if (!stat.match || !stat.player) return false;
      if (stat.match.team_id !== teamId) return false;
      if (stat.match.state !== 'confirmed') return false;
      if (stat.match.deleted_at !== null) return false;

      // Apply date filters if provided
      if (normalizedStartDate || normalizedEndDate) {
        const matchDate = new Date(stat.match.started_at);
        if (normalizedStartDate && matchDate < normalizedStartDate) return false;
        if (normalizedEndDate && matchDate > normalizedEndDate) return false;
      }

      const matchDetails = matchDetailsMap.get(stat.match.id);
      if (!matchDetails) {
        return false;
      }

      const matchForFilters = {
        ...matchDetails,
        players: Array.from(matchDetails.players)
      };

      if (!matchPassesFilters(matchForFilters, {
        ...normalizedFilters,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate
      })) {
        return false;
      }

      return true;
    });

    // Group stats by player
    const playerStatsMap = new Map();

    filteredStats.forEach(stat => {
      const playerId = stat.player_id;

      if (!playerStatsMap.has(playerId)) {
        const displayName = stat.player.display_name || stat.player.first_name || 'Unnamed Player';
        playerStatsMap.set(playerId, {
          playerId: playerId,
          displayName,
          matchesPlayed: 0,
          goalsScored: 0,
          totalDefenderSeconds: 0,
          totalMidfielderSeconds: 0,
          totalAttackerSeconds: 0,
          totalGoalieSeconds: 0,
          totalFieldTimeSeconds: 0,
          substituteStarts: 0,
          matchesAsCaptain: 0,
          fairPlayAwards: 0
        });
      }

      const playerData = playerStatsMap.get(playerId);
      playerData.matchesPlayed += 1;
      playerData.goalsScored += stat.goals_scored || 0;
      playerData.totalDefenderSeconds += stat.defender_time_seconds || 0;
      playerData.totalMidfielderSeconds += stat.midfielder_time_seconds || 0;
      playerData.totalAttackerSeconds += stat.attacker_time_seconds || 0;
      playerData.totalGoalieSeconds += stat.goalie_time_seconds || 0;
      playerData.totalFieldTimeSeconds += stat.total_field_time_seconds || 0;
      if (stat.started_as === 'substitute') playerData.substituteStarts += 1;
      if (stat.was_captain) playerData.matchesAsCaptain += 1;
      if (stat.got_fair_play_award) playerData.fairPlayAwards += 1;
    });

    // Transform to UI format with percentage calculations
    const players = Array.from(playerStatsMap.values()).map(player => {
      const totalOutfielderSeconds = player.totalDefenderSeconds +
                                      player.totalMidfielderSeconds +
                                      player.totalAttackerSeconds;

      // Calculate average time per match in minutes
      const averageTimePerMatch = player.matchesPlayed > 0
        ? player.totalFieldTimeSeconds / 60 / player.matchesPlayed
        : 0;

      // Calculate percentage started as substitute
      const percentStartedAsSubstitute = player.matchesPlayed > 0
        ? (player.substituteStarts / player.matchesPlayed) * 100
        : 0;

      // Calculate position percentages
      // For outfield positions, use outfielder time as denominator
      const percentTimeAsDefender = totalOutfielderSeconds > 0
        ? (player.totalDefenderSeconds / totalOutfielderSeconds) * 100
        : 0;

      const percentTimeAsMidfielder = totalOutfielderSeconds > 0
        ? (player.totalMidfielderSeconds / totalOutfielderSeconds) * 100
        : 0;

      const percentTimeAsAttacker = totalOutfielderSeconds > 0
        ? (player.totalAttackerSeconds / totalOutfielderSeconds) * 100
        : 0;

      // For goalie, use total playing time (goalie + outfield) as denominator
      const percentTimeAsGoalkeeper = (player.totalGoalieSeconds + player.totalFieldTimeSeconds) > 0
        ? (player.totalGoalieSeconds / (player.totalGoalieSeconds + player.totalFieldTimeSeconds)) * 100
        : 0;

      return {
        id: player.playerId,
        displayName: player.displayName,
        matchesPlayed: player.matchesPlayed,
        goalsScored: player.goalsScored,
        totalFieldTimeSeconds: player.totalFieldTimeSeconds,
        averageTimePerMatch: averageTimePerMatch,
        percentStartedAsSubstitute: Math.round(percentStartedAsSubstitute * 10) / 10, // 1 decimal
        percentTimeAsDefender: Math.round(percentTimeAsDefender * 10) / 10,
        percentTimeAsMidfielder: Math.round(percentTimeAsMidfielder * 10) / 10,
        percentTimeAsAttacker: Math.round(percentTimeAsAttacker * 10) / 10,
        percentTimeAsGoalkeeper: Math.round(percentTimeAsGoalkeeper * 10) / 10,
        matchesAsCaptain: player.matchesAsCaptain,
        fairPlayAwards: player.fairPlayAwards
      };
    });

    return {
      success: true,
      players
    };

  } catch (error) {
    console.error('❌ Exception while getting player stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get aggregated team statistics
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Optional start date filter
 * @param {Date} endDate - Optional end date filter
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export async function getTeamStats(teamId, startDate = null, endDate = null) {
  try {
    if (!teamId) {
      return {
        success: false,
        error: 'Team ID is required'
      };
    }

    // Query all confirmed matches for the team
    let query = supabase
      .from('match')
      .select('*')
      .eq('team_id', teamId)
      .eq('state', 'confirmed')
      .is('deleted_at', null)
      .order('started_at', { ascending: false });

    const { data: matches, error: matchError } = await query;

    if (matchError) {
      console.error('❌ Failed to get team stats:', matchError);
      return {
        success: false,
        error: `Database error: ${matchError.message}`
      };
    }

    // Filter by date range if provided
    const filteredMatches = (matches || []).filter(match => {
      if (startDate || endDate) {
        const matchDate = new Date(match.started_at);
        if (startDate && matchDate < startDate) return false;
        if (endDate) {
          const endDatePlusOne = new Date(endDate);
          endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
          if (matchDate >= endDatePlusOne) return false;
        }
      }
      return true;
    });

    // Calculate overall statistics
    const totalMatches = filteredMatches.length;
    const wins = filteredMatches.filter(m => m.outcome === 'win').length;
    const draws = filteredMatches.filter(m => m.outcome === 'draw').length;
    const losses = filteredMatches.filter(m => m.outcome === 'loss').length;

    const goalsScored = filteredMatches.reduce((sum, m) => sum + (m.goals_scored || 0), 0);
    const goalsConceded = filteredMatches.reduce((sum, m) => sum + (m.goals_conceded || 0), 0);

    const cleanSheets = filteredMatches.filter(m => m.goals_conceded === 0).length;

    // Calculate home/away/neutral records
    const homeMatches = filteredMatches.filter(m => m.venue_type === 'home');
    const awayMatches = filteredMatches.filter(m => m.venue_type === 'away');
    const neutralMatches = filteredMatches.filter(m => m.venue_type === 'neutral');

    const homeRecord = {
      wins: homeMatches.filter(m => m.outcome === 'win').length,
      draws: homeMatches.filter(m => m.outcome === 'draw').length,
      losses: homeMatches.filter(m => m.outcome === 'loss').length,
      total: homeMatches.length
    };

    const awayRecord = {
      wins: awayMatches.filter(m => m.outcome === 'win').length,
      draws: awayMatches.filter(m => m.outcome === 'draw').length,
      losses: awayMatches.filter(m => m.outcome === 'loss').length,
      total: awayMatches.length
    };

    const neutralRecord = {
      wins: neutralMatches.filter(m => m.outcome === 'win').length,
      draws: neutralMatches.filter(m => m.outcome === 'draw').length,
      losses: neutralMatches.filter(m => m.outcome === 'loss').length,
      total: neutralMatches.length
    };

    // Format recent matches for display (top 5)
    const recentMatches = filteredMatches.slice(0, 5).map(match => {
      const matchDate = new Date(match.started_at);
      return {
        id: match.id,
        date: matchDate.toISOString().split('T')[0],
        opponent: match.opponent || 'Unknown',
        score: `${match.goals_scored}-${match.goals_conceded}`,
        result: match.outcome === 'win' ? 'W' : match.outcome === 'draw' ? 'D' : 'L'
      };
    });

    // Calculate derived statistics
    const averageGoalsScored = totalMatches > 0 ? goalsScored / totalMatches : 0;
    const averageGoalsConceded = totalMatches > 0 ? goalsConceded / totalMatches : 0;
    const cleanSheetPercentage = totalMatches > 0 ? (cleanSheets / totalMatches) * 100 : 0;

    return {
      success: true,
      stats: {
        totalMatches,
        wins,
        draws,
        losses,
        goalsScored,
        goalsConceded,
        averageGoalsScored: Math.round(averageGoalsScored * 10) / 10,
        averageGoalsConceded: Math.round(averageGoalsConceded * 10) / 10,
        cleanSheets,
        cleanSheetPercentage: Math.round(cleanSheetPercentage * 10) / 10,
        homeRecord,
        awayRecord,
        neutralRecord,
        recentMatches
      }
    };

  } catch (error) {
    console.error('❌ Exception while getting team stats:', error);
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
 * Map formation position to database player_role enum
 * @param {string} position - Formation position (e.g., 'defender', 'left', 'attacker', 'goalie')
 * @param {string} currentRole - Player's current role (optional, for fallback)
 * @returns {string} Database player_role enum value
 */
export function mapFormationPositionToRole(position, currentRole = null) {
  if (!position) {
    console.warn('⚠️  No position provided to mapFormationPositionToRole');
    return roleToDatabase(PLAYER_ROLES.UNKNOWN);
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

  // Calculate total field time using the outfield counter tracked in game state
  const totalFieldTime = Math.max(0, player.stats.timeOnFieldSeconds || 0);

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
      .is('deleted_at', null)
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
        ...(initialConfig.teamConfig?.pairedRoleStrategy && {
          pairedRoleStrategy: initialConfig.teamConfig.pairedRoleStrategy
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
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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

    // Then soft delete the match record
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('match')
      .update(
        {
          deleted_at: nowIso
        },
        { returning: 'minimal' }
      )
      .eq('id', matchId)
      .is('deleted_at', null)
      .eq('state', 'pending'); // Only update pending matches

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

export async function deleteConfirmedMatch(matchId) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    const nowIso = new Date().toISOString();

    const statsResult = await supabase
      .from('player_match_stats')
      .delete()
      .eq('match_id', matchId);

    if (statsResult.error) {
      console.error('❌ Failed to delete player match stats:', statsResult.error);
      return {
        success: false,
        error: `Database error: ${statsResult.error.message}`
      };
    }

    const matchResult = await supabase
      .from('match')
      .update(
        {
          deleted_at: nowIso
        },
        { returning: 'minimal' }
      )
      .eq('id', matchId)
      .is('deleted_at', null)
      .in('state', ['finished', 'confirmed']);

    if (matchResult.error) {
      console.error('❌ Failed to delete confirmed match:', matchResult.error);
      return {
        success: false,
        error: `Database error: ${matchResult.error.message}`
      };
    }

    if (!matchResult.data || matchResult.data.length === 0) {
      return {
        success: false,
        error: 'Match not found or already deleted'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Exception while deleting confirmed match:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Update match details from the edit view
 * @param {string} matchId - Match ID
 * @param {Object} matchUpdates - Updated match fields
 * @param {string} matchUpdates.opponent - Opponent team name (optional)
 * @param {number} matchUpdates.goalsScored - Goals scored by team
 * @param {number} matchUpdates.goalsConceded - Goals conceded by team
 * @param {string} matchUpdates.venueType - Venue type (home/away/neutral)
 * @param {string} matchUpdates.type - Match type
 * @param {string} matchUpdates.format - Match format
 * @param {string} matchUpdates.formation - Formation
 * @param {number} matchUpdates.periods - Number of periods
 * @param {number} matchUpdates.periodDuration - Period duration in minutes
 * @param {string} matchUpdates.date - Match date (YYYY-MM-DD)
 * @param {string} matchUpdates.time - Match time (HH:MM)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateMatchDetails(matchId, matchUpdates) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    // Recalculate outcome based on scores
    const outcome = calculateMatchOutcome(matchUpdates.goalsScored, matchUpdates.goalsConceded);

    // Combine date and time to create started_at timestamp
    const startedAt = new Date(`${matchUpdates.date}T${matchUpdates.time}:00`).toISOString();

    // Prepare update data
    const updateData = {
      opponent: matchUpdates.opponent || null,
      goals_scored: matchUpdates.goalsScored,
      goals_conceded: matchUpdates.goalsConceded,
      outcome: outcome,
      venue_type: matchUpdates.venueType,
      type: matchUpdates.type.toLowerCase(),
      format: matchUpdates.format,
      formation: matchUpdates.formation,
      periods: matchUpdates.periods,
      period_duration_minutes: matchUpdates.periodDuration,
      match_duration_seconds: matchUpdates.matchDurationSeconds,
      started_at: startedAt,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('match')
      .update(updateData)
      .eq('id', matchId)
      .is('deleted_at', null);

    if (error) {
      console.error('❌ Failed to update match details:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Exception while updating match details:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Update individual player match statistics from the edit view
 * @param {string} matchId - Match ID
 * @param {string} playerId - Player ID (from playerStats.playerId)
 * @param {Object} statUpdates - Updated stat fields
 * @param {number} statUpdates.goalsScored - Goals scored
 * @param {number} statUpdates.timeAsDefender - Time as defender (minutes)
 * @param {number} statUpdates.timeAsMidfielder - Time as midfielder (minutes)
 * @param {number} statUpdates.timeAsAttacker - Time as attacker (minutes)
 * @param {number} statUpdates.timeAsGoalkeeper - Time as goalkeeper (minutes)
 * @param {string} statUpdates.startingRole - Starting role
 * @param {boolean} statUpdates.wasCaptain - Was captain flag
 * @param {boolean} statUpdates.receivedFairPlayAward - Fair play award flag
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function buildPlayerMatchStatUpdateRow(matchId, playerId, statUpdates) {
  const defenderSeconds = Math.round((statUpdates.timeAsDefender || 0) * 60);
  const midfielderSeconds = Math.round((statUpdates.timeAsMidfielder || 0) * 60);
  const attackerSeconds = Math.round((statUpdates.timeAsAttacker || 0) * 60);
  const goalieSeconds = Math.round((statUpdates.timeAsGoalkeeper || 0) * 60);

  const totalFieldTimeSeconds = defenderSeconds + midfielderSeconds + attackerSeconds;

  const startedAs = statUpdates.startingRole ? mapDisplayRoleToDatabaseRole(statUpdates.startingRole) : null;

  return {
    match_id: matchId,
    player_id: playerId,
    goals_scored: statUpdates.goalsScored,
    defender_time_seconds: defenderSeconds,
    midfielder_time_seconds: midfielderSeconds,
    attacker_time_seconds: attackerSeconds,
    goalie_time_seconds: goalieSeconds,
    total_field_time_seconds: totalFieldTimeSeconds,
    started_as: startedAs,
    was_captain: statUpdates.wasCaptain,
    got_fair_play_award: statUpdates.receivedFairPlayAward,
    updated_at: new Date().toISOString()
  };
}

export async function updatePlayerMatchStat(matchId, playerId, statUpdates) {
  try {
    if (!matchId || !playerId) {
      return {
        success: false,
        error: 'Match ID and Player ID are required'
      };
    }

    const updateData = buildPlayerMatchStatUpdateRow(matchId, playerId, statUpdates);

    const { error } = await supabase
      .from('player_match_stats')
      .update(updateData)
      .eq('match_id', matchId)
      .eq('player_id', playerId);

    if (error) {
      console.error('❌ Failed to update player match stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Exception while updating player match stats:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

export async function updatePlayerMatchStatsBatch(matchId, playerStats = []) {
  try {
    if (!matchId) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    if (!Array.isArray(playerStats)) {
      return {
        success: false,
        error: 'Player stats must be an array'
      };
    }

    if (playerStats.length === 0) {
      return {
        success: true,
        updated: 0
      };
    }

    const updateRows = playerStats
      .filter(player => player?.playerId)
      .map(player => buildPlayerMatchStatUpdateRow(matchId, player.playerId, player));

    if (updateRows.length === 0) {
      return {
        success: false,
        error: 'No valid player stats to update'
      };
    }

    const { error } = await supabase
      .from('player_match_stats')
      .upsert(updateRows, {
        onConflict: 'match_id,player_id'
      });

    if (error) {
      console.error('❌ Failed to batch update player match stats:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    return {
      success: true,
      updated: updateRows.length
    };
  } catch (error) {
    console.error('❌ Exception while batch updating player match stats:', error);
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
