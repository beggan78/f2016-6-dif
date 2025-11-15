import { supabase } from '../lib/supabase';
import { getTeamConnectors } from './connectorService';
import { CONNECTOR_STATUS } from '../constants/connectorProviders';

const DEFAULT_LOOKAHEAD_DAYS = 5;

/**
 * Fetch upcoming matches for a connector within the provided date window.
 * Limits to opponent/match_date fields since that's all we need for prefill logic.
 * @param {string} connectorId
 * @param {number} lookaheadDays
 * @returns {Promise<Array<{opponent: string, match_date: string}>>}
 */
export async function getUpcomingMatchesWithinWindow(connectorId, lookaheadDays = DEFAULT_LOOKAHEAD_DAYS) {
  if (!connectorId) {
    throw new Error('Connector ID is required');
  }

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + lookaheadDays);

  const startDate = today.toISOString().split('T')[0];
  const endDate = windowEnd.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('upcoming_match')
    .select('opponent, match_date')
    .eq('connector_id', connectorId)
    .gte('match_date', startDate)
    .lte('match_date', endDate)
    .order('match_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch upcoming matches for connector:', error);
    throw new Error('Failed to load upcoming matches');
  }

  return data || [];
}

/**
 * Fetch pending matches for a team to build an exclusion list.
 * @param {string} teamId
 * @returns {Promise<Array<{opponent: string | null}>>}
 */
export async function getPendingMatchesForTeam(teamId) {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  const { data, error } = await supabase
    .from('match')
    .select('opponent')
    .eq('team_id', teamId)
    .eq('state', 'pending')
    .is('deleted_at', null);

  if (error) {
    console.error('Failed to fetch pending matches for team:', error);
    throw new Error('Failed to load pending matches');
  }

  return data || [];
}

/**
 * Suggest an opponent using connector-provided upcoming matches.
 * - Considers matches happening within the next five days (configurable)
 * - Filters out opponents that already have pending matches configured
 * - Picks the opponent with the earliest match_date among the filtered set
 * @param {string} teamId
 * @param {{lookaheadDays?: number}} options
 * @returns {Promise<{opponent: string | null, connectorId?: string, matchDate?: string, reason?: string}>}
 */
export async function suggestUpcomingOpponent(teamId, options = {}) {
  const { lookaheadDays = DEFAULT_LOOKAHEAD_DAYS } = options;

  if (!teamId) {
    return { opponent: null, reason: 'missing-team' };
  }

  try {
    const connectors = await getTeamConnectors(teamId);
    const activeConnectors = (connectors || []).filter(
      (connector) => connector.status === CONNECTOR_STATUS.CONNECTED
    );

    if (activeConnectors.length === 0) {
      return { opponent: null, reason: 'no-active-connector' };
    }

    const pendingMatches = await getPendingMatchesForTeam(teamId);
    console.info(
      '[OpponentPrefill] Pending matches for team %s: %o',
      teamId,
      (pendingMatches || []).map(match => ({
        opponent: match.opponent || null
      }))
    );
    const pendingOpponentSet = new Set(
      (pendingMatches || [])
        .map((match) => (match.opponent || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const candidateMatches = [];

    for (const connector of activeConnectors) {
      try {
        const matches = await getUpcomingMatchesWithinWindow(connector.id, lookaheadDays);
        console.info(
          '[OpponentPrefill] Upcoming matches for connector %s within %d days: %o',
          connector.id,
          lookaheadDays,
          matches.map(match => ({
            opponent: match.opponent || null,
            matchDate: match.match_date
          }))
        );
        matches.forEach((match) => {
          const opponentName = (match.opponent || '').trim();
          if (!opponentName) {
            return;
          }

          const normalized = opponentName.toLowerCase();
          if (pendingOpponentSet.has(normalized)) {
            return;
          }

          candidateMatches.push({
            connectorId: connector.id,
            opponent: opponentName,
            matchDate: match.match_date
          });
        });
      } catch (error) {
        console.warn('Failed to load upcoming matches for connector during opponent suggestion:', error);
      }
    }

    if (candidateMatches.length === 0) {
      return { opponent: null, reason: 'no-eligible-upcoming' };
    }

    candidateMatches.sort((a, b) => {
      const dateA = new Date(a.matchDate);
      const dateB = new Date(b.matchDate);
      return dateA - dateB;
    });

    const bestMatch = candidateMatches[0];

    return {
      opponent: bestMatch.opponent,
      connectorId: bestMatch.connectorId,
      matchDate: bestMatch.matchDate,
      reason: 'matched'
    };
  } catch (error) {
    console.error('Failed to suggest upcoming opponent:', error);
    return { opponent: null, reason: 'error', error: error.message || 'Failed to suggest opponent' };
  }
}

export const opponentPrefillConstants = {
  DEFAULT_LOOKAHEAD_DAYS
};
