import { useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { AUTO_SELECT_STRATEGY } from '../constants/planMatchesConstants';
import { usePersistentState } from './usePersistentState';
import { areStatusMapsEqual } from '../utils/comparisonUtils';

const AUTO_SELECT_DEFAULT_STATE = {
  teamId: null,
  ensureCoverage: true,
  metric: AUTO_SELECT_STRATEGY.PRACTICES,
  targetCounts: {}
};

export const useAutoSelectPreferences = (teamId) => {
  const [autoSelectPreferences, setAutoSelectPreferences] = usePersistentState(
    STORAGE_KEYS.PLAN_MATCH_AUTO_SELECT_SETTINGS,
    AUTO_SELECT_DEFAULT_STATE,
    teamId
  );

  const autoSelectSettings = useMemo(() => {
    const ensureCoverage = typeof autoSelectPreferences?.ensureCoverage === 'boolean'
      ? autoSelectPreferences.ensureCoverage
      : true;
    const metric = Object.values(AUTO_SELECT_STRATEGY).includes(autoSelectPreferences?.metric)
      ? autoSelectPreferences.metric
      : AUTO_SELECT_STRATEGY.PRACTICES;
    return { ensureCoverage, metric };
  }, [autoSelectPreferences?.ensureCoverage, autoSelectPreferences?.metric]);

  const targetCounts = useMemo(() => {
    if (autoSelectPreferences?.targetCounts && typeof autoSelectPreferences.targetCounts === 'object') {
      return autoSelectPreferences.targetCounts;
    }
    return {};
  }, [autoSelectPreferences?.targetCounts]);

  const setAutoSelectSettings = useCallback((updater) => {
    setAutoSelectPreferences((prev) => {
      const base = prev && typeof prev === 'object' ? prev : AUTO_SELECT_DEFAULT_STATE;
      const prevCoverage = typeof base.ensureCoverage === 'boolean' ? base.ensureCoverage : true;
      const prevMetric = Object.values(AUTO_SELECT_STRATEGY).includes(base.metric)
        ? base.metric
        : AUTO_SELECT_STRATEGY.PRACTICES;
      const nextSettings = typeof updater === 'function'
        ? updater({ ensureCoverage: prevCoverage, metric: prevMetric })
        : updater;
      const nextCoverage = typeof nextSettings?.ensureCoverage === 'boolean'
        ? nextSettings.ensureCoverage
        : prevCoverage;
      const nextMetric = Object.values(AUTO_SELECT_STRATEGY).includes(nextSettings?.metric)
        ? nextSettings.metric
        : prevMetric;
      if (nextCoverage === prevCoverage && nextMetric === prevMetric) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        ensureCoverage: nextCoverage,
        metric: nextMetric,
        targetCounts: base.targetCounts || {}
      };
    });
  }, [teamId, setAutoSelectPreferences]);

  const setTargetCounts = useCallback((updater) => {
    setAutoSelectPreferences((prev) => {
      const base = prev && typeof prev === 'object' ? prev : AUTO_SELECT_DEFAULT_STATE;
      const prevTargets = base.targetCounts && typeof base.targetCounts === 'object' ? base.targetCounts : {};
      const nextTargets = typeof updater === 'function' ? updater(prevTargets) : updater;
      if (areStatusMapsEqual(prevTargets, nextTargets)) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        ensureCoverage: typeof base.ensureCoverage === 'boolean' ? base.ensureCoverage : true,
        metric: Object.values(AUTO_SELECT_STRATEGY).includes(base.metric)
          ? base.metric
          : AUTO_SELECT_STRATEGY.PRACTICES,
        targetCounts: nextTargets
      };
    });
  }, [teamId, setAutoSelectPreferences]);

  return {
    autoSelectSettings,
    targetCounts,
    setAutoSelectSettings,
    setTargetCounts
  };
};
