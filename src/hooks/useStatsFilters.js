import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sport-wizard-stats-filter';

const createDefaultFilters = () => ({
  typeFilter: [],
  outcomeFilter: [],
  venueFilter: [],
  opponentFilter: [],
  playerFilter: [],
  formatFilter: []
});

const canUsePersistentStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && process.env.NODE_ENV !== 'test';

const ensureFilterArrays = (filters) => {
  const safeFilters = filters && typeof filters === 'object' ? filters : {};

  return {
    typeFilter: Array.isArray(safeFilters.typeFilter) ? safeFilters.typeFilter : [],
    outcomeFilter: Array.isArray(safeFilters.outcomeFilter) ? safeFilters.outcomeFilter : [],
    venueFilter: Array.isArray(safeFilters.venueFilter) ? safeFilters.venueFilter : [],
    opponentFilter: Array.isArray(safeFilters.opponentFilter) ? safeFilters.opponentFilter : [],
    playerFilter: Array.isArray(safeFilters.playerFilter) ? safeFilters.playerFilter : [],
    formatFilter: Array.isArray(safeFilters.formatFilter) ? safeFilters.formatFilter : []
  };
};

const readStoredFilters = () => {
  if (!canUsePersistentStorage()) {
    return createDefaultFilters();
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return createDefaultFilters();
    }

    const parsed = JSON.parse(storedValue);
    return ensureFilterArrays(parsed);
  } catch (error) {
    console.error('Failed to parse stored stats filters', error);
    return createDefaultFilters();
  }
};

const persistFilters = (filters) => {
  if (!canUsePersistentStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error('Failed to persist stats filters', error);
  }
};

export function useStatsFilters() {
  const [filters, setFilters] = useState(() => readStoredFilters());

  useEffect(() => {
    persistFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!canUsePersistentStorage()) {
      return undefined;
    }

    const handleStorageChange = (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      try {
        const nextFilters = event.newValue
          ? ensureFilterArrays(JSON.parse(event.newValue))
          : createDefaultFilters();

        setFilters(nextFilters);
      } catch (storageError) {
        console.error('Failed to sync stats filters from storage event', storageError);
        setFilters(createDefaultFilters());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const nextValue = Array.isArray(value) ? value : [];
      if (prev[key] === nextValue) {
        return prev;
      }

      const nextFilters = { ...prev, [key]: nextValue };
      return nextFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(() => createDefaultFilters());
  }, []);

  return {
    typeFilter: filters.typeFilter,
    outcomeFilter: filters.outcomeFilter,
    venueFilter: filters.venueFilter,
    opponentFilter: filters.opponentFilter,
    playerFilter: filters.playerFilter,
    formatFilter: filters.formatFilter,
    setTypeFilter: useCallback((value) => updateFilter('typeFilter', value), [updateFilter]),
    setOutcomeFilter: useCallback((value) => updateFilter('outcomeFilter', value), [updateFilter]),
    setVenueFilter: useCallback((value) => updateFilter('venueFilter', value), [updateFilter]),
    setOpponentFilter: useCallback((value) => updateFilter('opponentFilter', value), [updateFilter]),
    setPlayerFilter: useCallback((value) => updateFilter('playerFilter', value), [updateFilter]),
    setFormatFilter: useCallback((value) => updateFilter('formatFilter', value), [updateFilter]),
    clearFilters
  };
}

export const STATS_FILTERS_STORAGE_KEY = STORAGE_KEY;
