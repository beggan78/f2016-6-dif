import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Manages localStorage operations for game state persistence
 * Provides centralized error handling, validation, and state management
 */
export class PersistenceManager {
  constructor(storageKey, defaultState = {}) {
    this.storageKey = storageKey;
    this.defaultState = defaultState;
    this.isSupported = this._checkStorageSupport();
  }

  /**
   * Check if localStorage is supported and available
   */
  _checkStorageSupport() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not supported or available:', error);
      return false;
    }
  }

  /**
   * Load state from localStorage with error handling and validation
   */
  loadState() {
    if (!this.isSupported) {
      return this.defaultState;
    }

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) {
        return this.defaultState;
      }

      const parsedState = JSON.parse(saved);
      
      
      // Validate that the loaded state is an object
      if (typeof parsedState !== 'object' || parsedState === null) {
        console.warn('Invalid state format in localStorage, using default state');
        return this.defaultState;
      }

      // Merge with default state to ensure all required fields exist
      return this._mergeWithDefaults(parsedState);
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
      return this.defaultState;
    }
  }

  /**
   * Save state to localStorage with error handling
   */
  saveState(state) {
    if (!this.isSupported) {
      return false;
    }

    try {
      // Validate state before saving
      if (typeof state !== 'object' || state === null) {
        console.warn('Invalid state provided for saving');
        return false;
      }

      const stateToSave = this._sanitizeState(state);
      localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
      
      // If quota exceeded, try to clear old data and retry
      if (error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, attempting to clear and retry');
        this.clearState();
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(state));
          return true;
        } catch (retryError) {
          console.error('Failed to save even after clearing storage:', retryError);
        }
      }
      
      return false;
    }
  }

  /**
   * Clear stored state
   */
  clearState() {
    if (!this.isSupported) {
      return false;
    }

    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.warn('Failed to clear state from localStorage:', error);
      return false;
    }
  }

  /**
   * Check if state exists in storage
   */
  hasStoredState() {
    if (!this.isSupported) {
      return false;
    }

    try {
      return localStorage.getItem(this.storageKey) !== null;
    } catch (error) {
      console.warn('Failed to check for stored state:', error);
      return false;
    }
  }

  /**
   * Get storage information
   */
  getStorageInfo() {
    if (!this.isSupported) {
      return { supported: false, size: 0, available: 0 };
    }

    try {
      const currentData = localStorage.getItem(this.storageKey);
      const size = currentData ? new Blob([currentData]).size : 0;
      
      // Estimate available space (rough approximation)
      let available = 0;
      try {
        const testData = 'x'.repeat(1024 * 1024); // 1MB test
        localStorage.setItem('__size_test__', testData);
        localStorage.removeItem('__size_test__');
        available = 5 * 1024 * 1024; // Assume 5MB if no error
      } catch (e) {
        available = 0;
      }

      return {
        supported: true,
        size,
        available,
        key: this.storageKey
      };
    } catch (error) {
      return { supported: false, size: 0, available: 0, error: error.message };
    }
  }

  /**
   * Merge loaded state with default state to ensure all fields exist
   */
  _mergeWithDefaults(loadedState) {
    // When no default state is provided (null/undefined) just return the stored state
    if (!this.defaultState || typeof this.defaultState !== 'object' || Array.isArray(this.defaultState)) {
      if (Array.isArray(loadedState)) {
        return [...loadedState];
      }
      return { ...loadedState };
    }

    const merged = { ...this.defaultState };

    // Deep merge for nested objects
    Object.keys(loadedState).forEach((key) => {
      if (key in this.defaultState) {
        if (
          typeof this.defaultState[key] === 'object' &&
          this.defaultState[key] !== null &&
          !Array.isArray(this.defaultState[key])
        ) {
          // Deep merge for objects (but not arrays)
          merged[key] = { ...this.defaultState[key], ...loadedState[key] };
        } else {
          merged[key] = loadedState[key];
        }
      } else {
        // Preserve additional keys found in stored state to avoid losing new data fields
        merged[key] = loadedState[key];
      }
    });

    return merged;
  }

  /**
   * Sanitize state before saving (remove functions, undefined values, etc.)
   */
  _sanitizeState(state) {
    return JSON.parse(JSON.stringify(state)); // Simple way to remove non-serializable data
  }

}

/**
 * Game-specific persistence manager with predefined default state
 */
export class GamePersistenceManager extends PersistenceManager {
  constructor(storageKey = STORAGE_KEYS.GAME_STATE) {
    // Import here to avoid circular dependency
    const { getInitialFormationTemplate } = require('../constants/gameModes');
    const { createDefaultTeamConfig, FORMATS } = require('../constants/teamConfiguration');
    const { DEFAULT_MATCH_TYPE } = require('../constants/matchTypes');
    const { DEFAULT_VENUE_TYPE } = require('../constants/matchVenues');
    
    const defaultTeamConfig = createDefaultTeamConfig(7, FORMATS.FORMAT_5V5);
    
    const defaultGameState = {
      allPlayers: [],
      view: 'config',
      selectedSquadIds: [],
      numPeriods: 3,
      periodDurationMinutes: 15,
      periodGoalieIds: {},
      teamConfig: defaultTeamConfig,
      selectedFormation: defaultTeamConfig.formation,
      alertMinutes: 2,
      captainId: null,
      currentPeriodNumber: 1,
      formation: getInitialFormationTemplate(defaultTeamConfig),
      nextPhysicalPairToSubOut: 'leftPair',
      nextPlayerToSubOut: 'leftDefender',
      nextPlayerIdToSubOut: null,
      nextNextPlayerIdToSubOut: null,
      rotationQueue: [],
      gameLog: [],
      opponentTeam: '',
      matchType: DEFAULT_MATCH_TYPE,
      venueType: DEFAULT_VENUE_TYPE,
      ownScore: 0,
      opponentScore: 0,
      // Match event tracking state for Match Report feature
      matchEvents: [],
      matchStartTime: null,
      goalScorers: {},
      eventSequenceNumber: 0,
      lastEventBackup: null,
      timerPauseStartTime: null,
      totalMatchPausedDuration: 0,
      // Match lifecycle state management
      currentMatchId: null,
      matchCreated: false,
    };

    super(storageKey, defaultGameState);
  }

  /**
   * Save only specific game state fields
   */
  saveGameState(gameState) {
    if (!gameState || typeof gameState !== 'object') {
      console.warn('GamePersistenceManager.saveGameState called with invalid gameState. Aborting save.');
      return false;
    }

    const defaults = this.defaultState || {};

    // Only save serializable game state, exclude React-specific fields
    const stateToSave = {
      allPlayers: gameState.allPlayers ?? defaults.allPlayers ?? [],
      view: gameState.view ?? defaults.view ?? 'config',
      selectedSquadIds: gameState.selectedSquadIds ?? defaults.selectedSquadIds ?? [],
      numPeriods: gameState.numPeriods ?? defaults.numPeriods ?? 3,
      periodDurationMinutes: gameState.periodDurationMinutes ?? defaults.periodDurationMinutes ?? 15,
      periodGoalieIds: gameState.periodGoalieIds ?? defaults.periodGoalieIds ?? {},
      teamConfig: gameState.teamConfig ?? defaults.teamConfig ?? null,
      selectedFormation: gameState.selectedFormation ?? defaults.selectedFormation ?? null,
      alertMinutes: gameState.alertMinutes ?? defaults.alertMinutes ?? 0,
      captainId: gameState.captainId ?? defaults.captainId ?? null,
      currentPeriodNumber: gameState.currentPeriodNumber ?? defaults.currentPeriodNumber ?? 1,
      formation: gameState.formation ?? defaults.formation ?? null,
      nextPhysicalPairToSubOut: gameState.nextPhysicalPairToSubOut ?? defaults.nextPhysicalPairToSubOut ?? null,
      nextPlayerToSubOut: gameState.nextPlayerToSubOut ?? defaults.nextPlayerToSubOut ?? null,
      nextPlayerIdToSubOut: gameState.nextPlayerIdToSubOut ?? defaults.nextPlayerIdToSubOut ?? null,
      nextNextPlayerIdToSubOut: gameState.nextNextPlayerIdToSubOut ?? defaults.nextNextPlayerIdToSubOut ?? null,
      rotationQueue: gameState.rotationQueue ?? defaults.rotationQueue ?? [],
      gameLog: gameState.gameLog ?? defaults.gameLog ?? [],
      opponentTeam: gameState.opponentTeam ?? defaults.opponentTeam ?? '',
      matchType: gameState.matchType ?? defaults.matchType ?? 'league',
      venueType: gameState.venueType ?? defaults.venueType ?? DEFAULT_VENUE_TYPE,
      ownScore: gameState.ownScore ?? defaults.ownScore ?? 0,
      opponentScore: gameState.opponentScore ?? defaults.opponentScore ?? 0,
      // Match event tracking state for Match Report feature
      matchEvents: gameState.matchEvents ?? defaults.matchEvents ?? [],
      matchStartTime: gameState.matchStartTime ?? defaults.matchStartTime ?? null,
      goalScorers: gameState.goalScorers ?? defaults.goalScorers ?? {},
      eventSequenceNumber: gameState.eventSequenceNumber ?? defaults.eventSequenceNumber ?? 0,
      lastEventBackup: gameState.lastEventBackup ?? defaults.lastEventBackup ?? null,
      timerPauseStartTime: gameState.timerPauseStartTime ?? defaults.timerPauseStartTime ?? null,
      totalMatchPausedDuration: gameState.totalMatchPausedDuration ?? defaults.totalMatchPausedDuration ?? 0,
      // Match lifecycle state management
      currentMatchId: gameState.currentMatchId ?? defaults.currentMatchId ?? null,
      matchCreated: gameState.matchCreated ?? defaults.matchCreated ?? false,
    };

    return this.saveState(stateToSave);
  }

}

/**
 * Factory functions for easy creation
 */
export function createPersistenceManager(storageKey, defaultState = {}) {
  return new PersistenceManager(storageKey, defaultState);
}

export function createGamePersistenceManager(storageKey = STORAGE_KEYS.GAME_STATE) {
  return new GamePersistenceManager(storageKey);
}
