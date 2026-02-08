import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMostRecentFinishedMatch, resolveMatchPlanningDefaults } from '../services/matchPlanningService';

export const usePlanningDefaults = (teamId, loadTeamPreferences) => {
  const { t } = useTranslation('common');
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
        setDefaultsError(t('errors.failedToLoadMatchDefaults'));
      }

      try {
        recentMatch = await getMostRecentFinishedMatch(teamId);
      } catch (error) {
        console.error('Failed to load recent match:', error);
        setDefaultsError(t('errors.failedToLoadMatchDefaults'));
      }

      if (!isActive) return;
      setDefaults(resolveMatchPlanningDefaults(preferences, recentMatch));
    };

    loadDefaults();

    return () => {
      isActive = false;
    };
  }, [teamId, loadTeamPreferences, t]);

  return { defaults, defaultsError };
};
