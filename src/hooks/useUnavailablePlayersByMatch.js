import { useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { usePersistentState } from './usePersistentState';
import { areSelectionMapsEqual } from '../utils/comparisonUtils';

const UNAVAILABLE_DEFAULT_STATE = {
  teamId: null,
  matches: {},
  providerAvailableOverridesByMatch: {}
};

export const useUnavailablePlayersByMatch = (teamId) => {
  const [unavailableState, setUnavailableState] = usePersistentState(
    STORAGE_KEYS.PLAN_MATCH_UNAVAILABLE_PLAYERS,
    UNAVAILABLE_DEFAULT_STATE,
    teamId
  );

  const unavailablePlayersByMatch = useMemo(() => {
    if (unavailableState?.matches && typeof unavailableState.matches === 'object') {
      return unavailableState.matches;
    }
    return {};
  }, [unavailableState?.matches]);

  const providerAvailableOverridesByMatch = useMemo(() => {
    if (
      unavailableState?.providerAvailableOverridesByMatch
      && typeof unavailableState.providerAvailableOverridesByMatch === 'object'
    ) {
      return unavailableState.providerAvailableOverridesByMatch;
    }
    return {};
  }, [unavailableState?.providerAvailableOverridesByMatch]);

  const setUnavailablePlayersByMatch = useCallback((updater) => {
    setUnavailableState((prev) => {
      const base = prev && typeof prev === 'object' ? prev : UNAVAILABLE_DEFAULT_STATE;
      const prevMatches = base.matches && typeof base.matches === 'object' ? base.matches : {};
      const nextMatches = typeof updater === 'function' ? updater(prevMatches) : updater;
      if (areSelectionMapsEqual(prevMatches, nextMatches)) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        matches: nextMatches
      };
    });
  }, [teamId, setUnavailableState]);

  const setProviderAvailableOverridesByMatch = useCallback((updater) => {
    setUnavailableState((prev) => {
      const base = prev && typeof prev === 'object' ? prev : UNAVAILABLE_DEFAULT_STATE;
      const prevOverrides = base.providerAvailableOverridesByMatch
        && typeof base.providerAvailableOverridesByMatch === 'object'
        ? base.providerAvailableOverridesByMatch
        : {};
      const nextOverrides = typeof updater === 'function' ? updater(prevOverrides) : updater;
      if (areSelectionMapsEqual(prevOverrides, nextOverrides)) {
        return prev;
      }
      return {
        ...base,
        teamId: teamId ?? null,
        providerAvailableOverridesByMatch: nextOverrides
      };
    });
  }, [teamId, setUnavailableState]);

  return {
    unavailablePlayersByMatch,
    providerAvailableOverridesByMatch,
    setUnavailablePlayersByMatch,
    setProviderAvailableOverridesByMatch
  };
};
