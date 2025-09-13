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
 * Hook for handling database operations and backup management
 * @param {Object} gameState - Current game state
 * @param {Object} setters - State setter functions
 * @param {Object} teamContext - Team context data
 * @returns {Object} Database and backup-related functions
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
    formation,
    currentMatchId,
    matchCreationAttempted
  } = gameState;

  const {
    setCurrentMatchId,
    setMatchCreationAttempted
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
        formation,
        periodGoalieIds,
        selectedSquadIds,
        allPlayers,
        currentTeam,
        currentMatchId,
        matchCreationAttempted,
        setCurrentMatchId,
        setMatchCreationAttempted
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
    opponentTeam, captainId, matchType, formation, periodGoalieIds,
    selectedSquadIds, allPlayers, currentTeam, currentMatchId,
    matchCreationAttempted, setCurrentMatchId, setMatchCreationAttempted
  ]);

  /**
   * Create a backup of current state
   */
  const createBackup = useCallback(() => {
    return persistenceManager.createBackup();
  }, []);

  /**
   * Auto-backup functionality
   */
  const autoBackup = useCallback(() => {
    persistenceManager.autoBackup();
  }, []);

  /**
   * Clear persisted state
   */
  const clearPersistedState = useCallback(() => {
    const result = persistenceManager.clearState();
    return result;
  }, []);

  /**
   * Get available backups
   */
  const getAvailableBackups = useCallback(() => {
    return persistenceManager.listBackups();
  }, []);

  /**
   * Restore state from backup
   */
  const restoreFromBackup = useCallback((backupKey) => {
    const result = persistenceManager.restoreFromBackup(backupKey);
    return result;
  }, []);

  /**
   * Get storage information
   */
  const getStorageInfo = useCallback(() => {
    return persistenceManager.getStorageInfo();
  }, []);

  /**
   * Clean up old backups
   */
  const cleanupBackups = useCallback((maxBackups = 5) => {
    persistenceManager.cleanupBackups(maxBackups);
  }, []);

  return {
    // State loading/saving
    loadPersistedState,
    clearPersistedState,

    // Database operations
    saveMatchConfiguration,

    // Backup management
    createBackup,
    autoBackup,
    getAvailableBackups,
    restoreFromBackup,
    getStorageInfo,
    cleanupBackups
  };
}