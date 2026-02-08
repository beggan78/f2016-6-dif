import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPlayerStats } from '../services/matchStateManager';

/**
 * Custom hook for fetching player stats for Period 1 recommendations
 *
 * This hook fetches player statistics for the last 6 months to support both
 * substitute and position recommendations. It only fetches data for Period 1
 * and handles race conditions automatically.
 *
 * @param {string} teamId - The team ID to fetch stats for
 * @param {number} currentPeriodNumber - The current period number (only fetches for Period 1)
 * @param {Array} selectedSquadPlayers - Array of selected squad players
 * @returns {Object} { playerStats, loading, error }
 *   - playerStats: Array of player stat objects with percentages (null if no data)
 *   - loading: Boolean indicating if data is being fetched
 *   - error: Error message string (null if no error)
 *
 * @example
 * const { playerStats, loading, error } = usePlayerRecommendationData(
 *   currentTeam?.id,
 *   currentPeriodNumber,
 *   selectedSquadPlayers
 * );
 */
export function usePlayerRecommendationData(teamId, currentPeriodNumber, selectedSquadPlayers) {
  const { t } = useTranslation('common');
  const [playerStats, setPlayerStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch for Period 1 with valid team and squad
    if (currentPeriodNumber !== 1 || !teamId || !selectedSquadPlayers?.length) {
      setPlayerStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    const fetchPlayerStats = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch stats for last 6 months
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 6);

        const response = await getPlayerStats(teamId, startDate, endDate);

        // Check if component is still mounted
        if (!isActive) {
          return;
        }

        if (response?.success) {
          setPlayerStats(response.players || []);
          setError(null);
        } else {
          setPlayerStats(null);
          setError(response?.error || t('errors.failedToLoadPlayerStats'));
        }
      } catch (err) {
        // Check if component is still mounted
        if (!isActive) {
          return;
        }

        setPlayerStats(null);
        setError(err.message || t('errors.failedToLoadPlayerStats'));
      } finally {
        // Only update loading state if still mounted
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchPlayerStats();

    // Cleanup function to handle component unmount
    return () => {
      isActive = false;
    };
  }, [teamId, currentPeriodNumber, selectedSquadPlayers, t]);

  return { playerStats, loading, error };
}
