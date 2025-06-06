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
    const merged = { ...this.defaultState };
    
    // Deep merge for nested objects
    Object.keys(loadedState).forEach(key => {
      if (key in this.defaultState) {
        if (typeof this.defaultState[key] === 'object' && 
            this.defaultState[key] !== null && 
            !Array.isArray(this.defaultState[key])) {
          // Deep merge for objects (but not arrays)
          merged[key] = { ...this.defaultState[key], ...loadedState[key] };
        } else {
          merged[key] = loadedState[key];
        }
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

  /**
   * Create a backup of current state
   */
  createBackup(backupKey = null) {
    const actualBackupKey = backupKey || `${this.storageKey}_backup_${Date.now()}`;
    
    try {
      const currentState = this.loadState();
      localStorage.setItem(actualBackupKey, JSON.stringify(currentState));
      return actualBackupKey;
    } catch (error) {
      console.warn('Failed to create backup:', error);
      return null;
    }
  }

  /**
   * Restore from a backup
   */
  restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        console.warn('No backup found with key:', backupKey);
        return false;
      }

      const backupState = JSON.parse(backupData);
      return this.saveState(backupState);
    } catch (error) {
      console.warn('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * List all backups for this storage key
   */
  listBackups() {
    const backups = [];
    const prefix = `${this.storageKey}_backup_`;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const timestamp = key.replace(prefix, '');
          backups.push({
            key,
            timestamp: parseInt(timestamp),
            date: new Date(parseInt(timestamp))
          });
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Clean up old backups (keep only the most recent N)
   */
  cleanupBackups(keepCount = 5) {
    const backups = this.listBackups();
    const toDelete = backups.slice(keepCount);
    
    let deletedCount = 0;
    toDelete.forEach(backup => {
      try {
        localStorage.removeItem(backup.key);
        deletedCount++;
      } catch (error) {
        console.warn('Failed to delete backup:', backup.key, error);
      }
    });
    
    return deletedCount;
  }
}

/**
 * Game-specific persistence manager with predefined default state
 */
export class GamePersistenceManager extends PersistenceManager {
  constructor(storageKey = 'dif-coach-game-state') {
    const defaultGameState = {
      allPlayers: [],
      view: 'config',
      selectedSquadIds: [],
      numPeriods: 3,
      periodDurationMinutes: 15,
      periodGoalieIds: {},
      formationType: 'PAIRS_7',
      alertMinutes: 2,
      currentPeriodNumber: 1,
      periodFormation: {
        goalie: null,
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null },
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute: null,
        leftDefender7: null,
        rightDefender7: null,
        leftAttacker7: null,
        rightAttacker7: null,
        substitute7_1: null,
        substitute7_2: null,
      },
      nextPhysicalPairToSubOut: 'leftPair',
      nextPlayerToSubOut: 'leftDefender',
      nextPlayerIdToSubOut: null,
      nextNextPlayerIdToSubOut: null,
      rotationQueue: [],
      gameLog: [],
    };

    super(storageKey, defaultGameState);
  }

  /**
   * Save only specific game state fields
   */
  saveGameState(gameState) {
    // Only save serializable game state, exclude React-specific fields
    const stateToSave = {
      allPlayers: gameState.allPlayers,
      view: gameState.view,
      selectedSquadIds: gameState.selectedSquadIds,
      numPeriods: gameState.numPeriods,
      periodDurationMinutes: gameState.periodDurationMinutes,
      periodGoalieIds: gameState.periodGoalieIds,
      formationType: gameState.formationType,
      alertMinutes: gameState.alertMinutes,
      currentPeriodNumber: gameState.currentPeriodNumber,
      periodFormation: gameState.periodFormation,
      nextPhysicalPairToSubOut: gameState.nextPhysicalPairToSubOut,
      nextPlayerToSubOut: gameState.nextPlayerToSubOut,
      nextPlayerIdToSubOut: gameState.nextPlayerIdToSubOut,
      nextNextPlayerIdToSubOut: gameState.nextNextPlayerIdToSubOut,
      rotationQueue: gameState.rotationQueue,
      gameLog: gameState.gameLog,
    };

    return this.saveState(stateToSave);
  }

  /**
   * Auto-backup before major operations
   */
  autoBackup() {
    const backups = this.listBackups();
    const lastBackup = backups[0];
    const now = Date.now();
    
    // Only create backup if last one was more than 10 minutes ago
    if (!lastBackup || (now - lastBackup.timestamp) > 10 * 60 * 1000) {
      const backupKey = this.createBackup();
      if (backupKey) {
        // Clean up old backups, keep only 3 most recent
        this.cleanupBackups(3);
      }
      return backupKey;
    }
    
    return null;
  }
}

/**
 * Factory functions for easy creation
 */
export function createPersistenceManager(storageKey, defaultState = {}) {
  return new PersistenceManager(storageKey, defaultState);
}

export function createGamePersistenceManager(storageKey = 'dif-coach-game-state') {
  return new GamePersistenceManager(storageKey);
}