import { useCallback, useEffect, useState, useMemo } from 'react';
import { createPersistenceManager } from '../utils/persistenceManager';
import { STORAGE_KEYS } from '../constants/storageKeys';

const createDefaultFilters = () => ({
  typeFilter: [],
  outcomeFilter: [],
  venueFilter: [],
  opponentFilter: [],
  playerFilter: [],
  formatFilter: []
});

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

export function useStatsFilters() {
  const filtersPersistence = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.STATS_FILTERS, createDefaultFilters()),
    []
  );

  const [filters, setFilters] = useState(() => {
    const stored = filtersPersistence.loadState();
    return ensureFilterArrays(stored);
  });

  useEffect(() => {
    filtersPersistence.saveState(filters);
  }, [filters, filtersPersistence]);

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
