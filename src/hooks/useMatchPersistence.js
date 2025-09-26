/**
 * Match Persistence Hook
 * 
 * Handles database operations, auto-save logic, and localStorage persistence.
 * Extracted from useGameState to follow Single Responsibility Principle.
 */

import { useCallback } from 'react';
import { createGamePersistenceManager } from '../utils/persistenceManager';
import { saveMatchConfiguration as saveMatchConfigurationService } from '../services/matchConfigurationService';

// PersistenceManager for handling localStorage operations
const persistenceManager = createGamePersistenceManager('dif-coach-game-state');

/**
 * Hook for handling database operations and persistence
 * @param {Object} gameState - Current game state
 * @param {Object} setters - State setter functions
 * @param {Object} teamContext - Team context data
 * @returns {Object} Database and persistence functions
 */
export function useMatchPersistence(gameState, setters, teamContext) {
  const {
    allPlayers,
    selectedSquadIds,
    numPeriods,
    periodGoalieIds,
    teamConfig,
    selectedFormation,
    periodDurationMinutes,
    opponentTeam,
    captainId,
    matchType,
    venueType,
    formation,
    currentMatchId,
    matchCreated
  } = gameState;

  const {
    setCurrentMatchId,
    setMatchCreated
  } = setters;

  const { currentTeam } = teamContext;

  /**
   * Load initial state from persistence manager
   * @returns {Object|null} Loaded state or null if no saved state
   */
  const loadPersistedState = useCallback(() => {
    return persistenceManager.loadState();
  }, []);

  /**
   * Save match configuration to database
   */
  const saveMatchConfiguration = useCallback(async () => {
    try {
      const result = await saveMatchConfigurationService({
        teamConfig,
        selectedFormation,
        numPeriods,
        periodDurationMinutes,
        opponentTeam,
        captainId,
        matchType,
        venueType,
        formation,
        periodGoalieIds,
        selectedSquadIds,
        allPlayers,
        currentTeam,
        currentMatchId,
        matchCreated,
        setCurrentMatchId,
        setMatchCreated
      });
      
      if (!result.success) {
        console.warn('⚠️ Failed to save match configuration:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error saving match configuration:', error);
      return { success: false, error: error.message };
    }
  }, [
    teamConfig, selectedFormation, numPeriods, periodDurationMinutes,
    opponentTeam, captainId, matchType, venueType, formation, periodGoalieIds,
    selectedSquadIds, allPlayers, currentTeam, currentMatchId,
    matchCreated, setCurrentMatchId, setMatchCreated
  ]);

  /**
   * Clear persisted state
   */
  const clearPersistedState = useCallback(() => {
    const result = persistenceManager.clearState();
    return result;
  }, []);

  return {
    // State loading/saving
    loadPersistedState,
    clearPersistedState,

    // Database operations
    saveMatchConfiguration,

  };
}
