/**
 * Match Integration Service
 *
 * Provides integration between match records and external data sources
 * like upcoming matches from provider connectors.
 */

import { supabase } from '../lib/supabase';

/**
 * Find upcoming match by opponent name for a team
 *
 * Searches the upcoming_match table for a match against the specified opponent
 * for the given team. Matching is case-insensitive and whitespace-trimmed.
 *
 * @param {string} teamId - Team ID
 * @param {string} opponentName - Opponent team name to match
 * @returns {Promise<Object|null>} Upcoming match record or null if not found
 *
 * @example
 * const match = await findUpcomingMatchByOpponent('team-123', 'Palawan');
 * if (match) {
 *   console.log(`Scheduled: ${match.match_date} ${match.match_time}`);
 * }
 */
export async function findUpcomingMatchByOpponent(teamId, opponentName) {
  if (!teamId || !opponentName) return null;

  try {
    // Normalize opponent name for matching
    const normalizedOpponent = opponentName.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Query upcoming_match through connector relationship
    // RLS ensures we only see matches for teams we have access to
    const { data, error } = await supabase
      .from('upcoming_match')
      .select(`
        *,
        connector!inner (
          team_id
        )
      `)
      .eq('connector.team_id', teamId)
      .gte('match_date', today)
      .order('match_date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Find by opponent name (case-insensitive match)
    const found = data.find(m =>
      m.opponent.trim().toLowerCase() === normalizedOpponent
    );

    return found || null;
  } catch (error) {
    console.error('Error finding upcoming match:', error);
    return null;
  }
}

/**
 * Get upcoming matches for a team from connected providers.
 *
 * @param {string} teamId - Team ID
 * @returns {Promise<{success: boolean, matches?: Array, error?: string}>}
 */
export async function getUpcomingMatchesForTeam(teamId) {
  try {
    if (!teamId) {
      return {
        success: false,
        error: 'Team ID is required'
      };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('upcoming_match')
      .select(`
        id,
        opponent,
        match_date,
        match_time,
        venue,
        planned_match_id,
        connector!inner (
          team_id
        )
      `)
      .eq('connector.team_id', teamId)
      .gte('match_date', today)
      .is('planned_match_id', null)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    if (error) {
      console.error('Failed to get upcoming matches:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    const matches = (data || []).map(match => ({
      id: match.id,
      opponent: match.opponent,
      matchDate: match.match_date,
      matchTime: match.match_time,
      venue: match.venue,
      plannedMatchId: match.planned_match_id || null
    }));

    return {
      success: true,
      matches
    };
  } catch (error) {
    console.error('Exception while getting upcoming matches:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get provider-reported availability/response for players in upcoming matches.
 *
 * @param {Array<string>} matchIds - Upcoming match IDs
 * @returns {Promise<{success: boolean, availabilityByMatch?: Object, error?: string}>}
 */
export async function getMatchPlayerAvailability(matchIds) {
  try {
    const normalizedMatchIds = Array.isArray(matchIds)
      ? matchIds.filter((id) => Boolean(id))
      : [];

    if (normalizedMatchIds.length === 0) {
      return {
        success: true,
        availabilityByMatch: {}
      };
    }

    const { data, error } = await supabase
      .from('upcoming_match_player')
      .select(`
        upcoming_match_id,
        availability,
        response,
        invite_status,
        connected_player:connected_player_id (
          player_id
        )
      `)
      .in('upcoming_match_id', normalizedMatchIds)
      .not('connected_player.player_id', 'is', null);

    if (error) {
      console.error('Failed to get upcoming match player availability:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    const availabilityByMatch = {};
    (data || []).forEach((record) => {
      const matchId = record.upcoming_match_id;
      const playerId = record.connected_player?.player_id;
      if (!matchId || !playerId) {
        return;
      }

      if (!availabilityByMatch[matchId]) {
        availabilityByMatch[matchId] = {};
      }

      availabilityByMatch[matchId][playerId] = {
        availability: record.availability,
        response: record.response,
        inviteStatus: record.invite_status || null
      };
    });

    return {
      success: true,
      availabilityByMatch
    };
  } catch (error) {
    console.error('Exception while getting match player availability:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}
