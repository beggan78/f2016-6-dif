import { useEffect, useState } from 'react';
import { getMostRecentFinishedMatch, resolveMatchPlanningDefaults } from '../services/matchPlanningService';

export const usePlanningDefaults = (teamId, loadTeamPreferences) => {
  const [defaults, setDefaults] = useState(null);
  const [defaultsError, setDefaultsError] = useState(null);

  useEffect(() => {
    let isActive = true;

    if (!teamId || !loadTeamPreferences) {
      setDefaults(null);
      return () => {
        isActive = false;
      };
    }

    setDefaultsError(null);

    const loadDefaults = async () => {
      let preferences = {};
      let recentMatch = null;

      try {
        preferences = await loadTeamPreferences(teamId);
      } catch (error) {
        console.error('Failed to load team preferences:', error);
        setDefaultsError('Failed to load match defaults.');
      }

      try {
        recentMatch = await getMostRecentFinishedMatch(teamId);
      } catch (error) {
        console.error('Failed to load recent match:', error);
        setDefaultsError('Failed to load match defaults.');
      }

      if (!isActive) return;
      setDefaults(resolveMatchPlanningDefaults(preferences, recentMatch));
    };

    loadDefaults();

    return () => {
      isActive = false;
    };
  }, [teamId, loadTeamPreferences]);

  return { defaults, defaultsError };
};
