import { useState, useEffect, useCallback, useRef } from 'react';
import { getUpcomingMatchesForTeam } from '../services/matchIntegrationService';

/**
 * Fetch upcoming matches for a team.
 *
 * @param {string} teamId - Team ID to load upcoming matches for
 * @returns {{ matches: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useUpcomingTeamMatches(teamId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isActiveRef = useRef(true);

  const fetchUpcomingMatches = useCallback(async () => {
    if (!teamId) {
      if (isActiveRef.current) {
        setMatches([]);
        setLoading(false);
        setError(null);
      }
      return;
    }

    try {
      if (isActiveRef.current) {
        setLoading(true);
        setError(null);
      }
      const result = await getUpcomingMatchesForTeam(teamId);

      if (!isActiveRef.current) return;

      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setError(result.error || 'Failed to load upcoming matches');
      }
    } catch (err) {
      console.error('Error fetching upcoming matches:', err);
      if (isActiveRef.current) {
        setError('Failed to load upcoming matches');
      }
    } finally {
      if (isActiveRef.current) {
        setLoading(false);
      }
    }
  }, [teamId]);

  useEffect(() => {
    isActiveRef.current = true;
    fetchUpcomingMatches();
    return () => {
      isActiveRef.current = false;
    };
  }, [fetchUpcomingMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchUpcomingMatches
  };
}
