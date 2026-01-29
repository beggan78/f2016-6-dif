import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { AUTO_SELECT_STRATEGY } from '../constants/planMatchesConstants';
import { usePersistentState } from './usePersistentState';
import {
  areIdListsEqual,
  areMatchListsEqual,
  areSelectionMapsEqual,
  areStatusMapsEqual
} from '../utils/comparisonUtils';
import { reconcilePlanProgress } from '../utils/planningStateReconciler';

const PLAN_PROGRESS_DEFAULT_STATE = {
  teamId: null,
  matches: [],
  selectedPlayersByMatch: {},
  sortMetric: AUTO_SELECT_STRATEGY.PRACTICES,
  plannedMatchIds: []
};

export const usePlanProgress = ({ teamId, matchesToPlan, debugEnabled }) => {
  const [planningStatus, setPlanningStatus] = useState({});
  const [planProgress, setPlanProgress] = usePersistentState(
    STORAGE_KEYS.PLAN_MATCH_PROGRESS,
    PLAN_PROGRESS_DEFAULT_STATE,
    teamId
  );

  const matches = useMemo(() => {
    if (Array.isArray(planProgress?.matches) && planProgress.matches.length > 0) {
      return planProgress.matches;
    }
    return Array.isArray(matchesToPlan) ? matchesToPlan : [];
  }, [planProgress?.matches, matchesToPlan]);

  const selectedPlayersByMatch = useMemo(() => {
    if (planProgress?.selectedPlayersByMatch && typeof planProgress.selectedPlayersByMatch === 'object') {
      return planProgress.selectedPlayersByMatch;
    }
    return {};
  }, [planProgress?.selectedPlayersByMatch]);

  const sortMetric = useMemo(() => {
    return Object.values(AUTO_SELECT_STRATEGY).includes(planProgress?.sortMetric)
      ? planProgress.sortMetric
      : AUTO_SELECT_STRATEGY.PRACTICES;
  }, [planProgress?.sortMetric]);

  const plannedMatchIds = useMemo(() => {
    return Array.isArray(planProgress?.plannedMatchIds) ? planProgress.plannedMatchIds : [];
  }, [planProgress?.plannedMatchIds]);

  const setMatches = useCallback((updater) => {
    setPlanProgress((prev) => {
      const base = prev && typeof prev === 'object' ? prev : PLAN_PROGRESS_DEFAULT_STATE;
      const prevMatches = Array.isArray(base.matches) ? base.matches : [];
      const nextMatches = typeof updater === 'function' ? updater(prevMatches) : updater;
      if (areMatchListsEqual(prevMatches, nextMatches)) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        matches: nextMatches
      };
    });
  }, [teamId, setPlanProgress]);

  const setSelectedPlayersByMatch = useCallback((updater) => {
    setPlanProgress((prev) => {
      const base = prev && typeof prev === 'object' ? prev : PLAN_PROGRESS_DEFAULT_STATE;
      const prevSelections = base.selectedPlayersByMatch && typeof base.selectedPlayersByMatch === 'object'
        ? base.selectedPlayersByMatch
        : {};
      const nextSelections = typeof updater === 'function' ? updater(prevSelections) : updater;
      if (areSelectionMapsEqual(prevSelections, nextSelections)) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        selectedPlayersByMatch: nextSelections
      };
    });
  }, [teamId, setPlanProgress]);

  const setSortMetric = useCallback((updater) => {
    setPlanProgress((prev) => {
      const base = prev && typeof prev === 'object' ? prev : PLAN_PROGRESS_DEFAULT_STATE;
      const prevMetric = Object.values(AUTO_SELECT_STRATEGY).includes(base.sortMetric)
        ? base.sortMetric
        : AUTO_SELECT_STRATEGY.PRACTICES;
      const nextMetric = typeof updater === 'function' ? updater(prevMetric) : updater;
      if (nextMetric === prevMetric) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        sortMetric: nextMetric
      };
    });
  }, [teamId, setPlanProgress]);

  const setPlannedMatchIds = useCallback((updater) => {
    setPlanProgress((prev) => {
      const base = prev && typeof prev === 'object' ? prev : PLAN_PROGRESS_DEFAULT_STATE;
      const prevIds = Array.isArray(base.plannedMatchIds) ? base.plannedMatchIds : [];
      const nextIds = typeof updater === 'function' ? updater(prevIds) : updater;
      if (areIdListsEqual(prevIds, nextIds)) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        plannedMatchIds: nextIds
      };
    });
  }, [teamId, setPlanProgress]);

  const lastMatchesToPlanRef = useRef(null);

  useEffect(() => {
    lastMatchesToPlanRef.current = null;
  }, [teamId, planProgress?.teamId]);

  useEffect(() => {
    if (!teamId) {
      const reconciled = reconcilePlanProgress({
        currentTeamId: null,
        matchesToPlan,
        planProgress: null
      });
      setMatches(reconciled.matches);
      setSelectedPlayersByMatch(reconciled.selectedPlayersByMatch);
      setSortMetric(reconciled.sortMetric);
      setPlannedMatchIds(reconciled.plannedMatchIds);
      setPlanningStatus((prev) => (
        areStatusMapsEqual(prev, reconciled.planningStatus) ? prev : reconciled.planningStatus
      ));
      lastMatchesToPlanRef.current = null;
      if (debugEnabled) {
        console.debug('[PlanMatchesScreen] plan progress load: no team', {
          matchesToPlanCount: Array.isArray(matchesToPlan) ? matchesToPlan.length : 0
        });
      }
      return;
    }

    if (areMatchListsEqual(lastMatchesToPlanRef.current, matchesToPlan)) {
      if (debugEnabled) {
        console.debug('[PlanMatchesScreen] plan progress load: matchesToPlan unchanged, skipping');
      }
      return;
    }
    lastMatchesToPlanRef.current = matchesToPlan;

    const reconciled = reconcilePlanProgress({
      currentTeamId: teamId,
      matchesToPlan,
      planProgress
    });

    if (debugEnabled) {
      console.debug('[PlanMatchesScreen] plan progress load', {
        teamId,
        matchesToPlanCount: Array.isArray(matchesToPlan) ? matchesToPlan.length : 0,
        storedMatchCount: Array.isArray(planProgress?.matches) ? planProgress.matches.length : 0,
        resolvedMatchCount: reconciled.matches.length
      });
    }

    setMatches(reconciled.matches);
    setSelectedPlayersByMatch(reconciled.selectedPlayersByMatch);
    setSortMetric(reconciled.sortMetric);
    setPlannedMatchIds(reconciled.plannedMatchIds);
    setPlanningStatus((prev) => (
      areStatusMapsEqual(prev, reconciled.planningStatus) ? prev : reconciled.planningStatus
    ));
  }, [
    debugEnabled,
    matchesToPlan,
    planProgress,
    setMatches,
    setPlanningStatus,
    setPlannedMatchIds,
    setSelectedPlayersByMatch,
    setSortMetric,
    teamId
  ]);

  return {
    matches,
    selectedPlayersByMatch,
    sortMetric,
    plannedMatchIds,
    setSelectedPlayersByMatch,
    setSortMetric,
    setPlannedMatchIds,
    planningStatus,
    setPlanningStatus
  };
};
