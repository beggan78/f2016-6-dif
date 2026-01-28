import { useEffect, useMemo, useState } from 'react';
import { createPersistenceManager } from '../utils/persistenceManager';

const attachTeamId = (state, teamId) => {
  if (!teamId) return state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return state;
  if (state.teamId === teamId) return state;
  return { ...state, teamId };
};

/**
 * usePersistentState Hook
 *
 * Provides a useState-like API that persists to localStorage by team.
 * State is only loaded/saved when a teamId is available.
 *
 * @param {string} storageKey - localStorage key for persistence
 * @param {Object} defaultState - default state object
 * @param {string|null|undefined} teamId - current team id
 * @returns {[Object, Function]} State and setter
 */
export function usePersistentState(storageKey, defaultState, teamId) {
  const persistenceManager = useMemo(
    () => createPersistenceManager(storageKey, defaultState),
    [storageKey, defaultState]
  );

  const [state, setState] = useState(() => {
    if (!teamId) {
      return defaultState;
    }

    const stored = persistenceManager.loadState();
    return stored?.teamId === teamId ? stored : attachTeamId(defaultState, teamId);
  });

  useEffect(() => {
    if (!teamId) {
      setState((prev) => (prev === defaultState ? prev : defaultState));
      return;
    }

    const stored = persistenceManager.loadState();
    const nextState = stored?.teamId === teamId
      ? stored
      : attachTeamId(defaultState, teamId);

    setState((prev) => (prev === nextState ? prev : nextState));
  }, [teamId, persistenceManager, defaultState]);

  useEffect(() => {
    if (!teamId) return;
    persistenceManager.saveState(attachTeamId(state, teamId));
  }, [state, teamId, persistenceManager]);

  return [state, setState];
}
