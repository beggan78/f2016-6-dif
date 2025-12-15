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
