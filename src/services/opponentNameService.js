import { supabase } from '../lib/supabase';

/**
 * Fetch previously used opponent names for a team.
 *
 * @param {string} teamId - Team identifier
 * @param {Object} [options]
 * @param {number} [options.limit=100] - Maximum number of rows to inspect
 * @returns {Promise<{success: boolean, names: string[], error?: string}>}
 */
export async function getOpponentNameHistory(teamId, options = {}) {
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 100;

  if (!teamId) {
    return {
      success: true,
      names: []
    };
  }

  try {
    const { data, error } = await supabase
      .from('match')
      .select('opponent, started_at')
      .eq('team_id', teamId)
      .not('opponent', 'is', null)
      .neq('opponent', '')
      .is('deleted_at', null)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load opponent name history:', error);
      return {
        success: false,
        names: [],
        error: 'Failed to load opponent history.'
      };
    }

    const seen = new Set();
    const uniqueNames = [];

    (data || []).forEach((row) => {
      const trimmed = row?.opponent ? String(row.opponent).trim() : '';
      if (!trimmed) return;

      const normalized = trimmed.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      uniqueNames.push(trimmed);
    });

    return {
      success: true,
      names: uniqueNames
    };
  } catch (err) {
    console.error('Unexpected error retrieving opponent history:', err);
    return {
      success: false,
      names: [],
      error: 'Unexpected error loading opponent history.'
    };
  }
}
