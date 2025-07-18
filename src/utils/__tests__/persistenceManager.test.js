import { 
  PersistenceManager, 
  GamePersistenceManager,
  createPersistenceManager,
  createGamePersistenceManager 
} from '../persistenceManager';

describe('PersistenceManager', () => {
  let manager;
  let mockLocalStorage;
  const TEST_KEY = 'test-storage-key';
  const TEST_DEFAULT_STATE = { count: 0, name: 'test' };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      key: jest.fn(),
      length: 0,
      clear: jest.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    global.Blob = jest.fn().mockImplementation((content) => ({
      size: content[0].length
    }));

    console.warn = jest.fn();
    console.error = jest.fn();

    manager = new PersistenceManager(TEST_KEY, TEST_DEFAULT_STATE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and initialization', () => {
    it('should initialize with storage key and default state', () => {
      expect(manager.storageKey).toBe(TEST_KEY);
      expect(manager.defaultState).toEqual(TEST_DEFAULT_STATE);
    });

    it('should check storage support during initialization', () => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('__storage_test__', 'test');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__storage_test__');
    });

    it('should handle localStorage not supported', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not supported');
      });

      const unsupportedManager = new PersistenceManager(TEST_KEY, TEST_DEFAULT_STATE);
      expect(unsupportedManager.isSupported).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'localStorage is not supported or available:', 
        expect.any(Error)
      );
    });
  });

  describe('loadState', () => {
    it('should return default state when localStorage is not supported', () => {
      manager.isSupported = false;
      const result = manager.loadState();
      expect(result).toEqual(TEST_DEFAULT_STATE);
    });

    it('should return default state when no stored data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const result = manager.loadState();
      expect(result).toEqual(TEST_DEFAULT_STATE);
    });

    it('should load and parse valid stored state', () => {
      const storedState = { count: 5, name: 'stored' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));
      
      const result = manager.loadState();
      expect(result).toEqual(expect.objectContaining(storedState));
    });

    it('should merge loaded state with defaults', () => {
      const partialState = { count: 10 }; // Missing 'name' field
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(partialState));
      
      const result = manager.loadState();
      expect(result).toEqual({ count: 10, name: 'test' });
    });

    it('should handle invalid JSON in storage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      const result = manager.loadState();
      expect(result).toEqual(TEST_DEFAULT_STATE);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load state from localStorage:', 
        expect.any(Error)
      );
    });

    it('should handle non-object parsed data', () => {
      mockLocalStorage.getItem.mockReturnValue('"string value"');
      
      const result = manager.loadState();
      expect(result).toEqual(TEST_DEFAULT_STATE);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid state format in localStorage, using default state'
      );
    });

    it('should handle null parsed data', () => {
      mockLocalStorage.getItem.mockReturnValue('null');
      
      const result = manager.loadState();
      expect(result).toEqual(TEST_DEFAULT_STATE);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid state format in localStorage, using default state'
      );
    });

    it('should handle localStorage access errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      
      const result = manager.loadState();
      expect(result).toEqual(TEST_DEFAULT_STATE);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load state from localStorage:', 
        expect.any(Error)
      );
    });
  });

  describe('saveState', () => {
    const validState = { count: 5, name: 'test' };

    it('should return false when localStorage is not supported', () => {
      manager.isSupported = false;
      const result = manager.saveState(validState);
      expect(result).toBe(false);
    });

    it('should successfully save valid state', () => {
      const result = manager.saveState(validState);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        TEST_KEY, 
        JSON.stringify(validState)
      );
    });

    it('should handle null state', () => {
      const result = manager.saveState(null);
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Invalid state provided for saving');
    });

    it('should handle non-object state', () => {
      const result = manager.saveState('string state');
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Invalid state provided for saving');
    });

    it('should handle localStorage write errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage write failed');
      });
      
      const result = manager.saveState(validState);
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save state to localStorage:', 
        expect.any(Error)
      );
    });

    it('should handle quota exceeded error with retry', () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      mockLocalStorage.setItem
        .mockImplementationOnce(() => { throw quotaError; })
        .mockImplementationOnce(() => {}); // Success on retry
      
      const result = manager.saveState(validState);
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(TEST_KEY);
      expect(console.warn).toHaveBeenCalledWith('Storage quota exceeded, attempting to clear and retry');
    });

    it('should handle quota exceeded error with failed retry', () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      mockLocalStorage.setItem.mockImplementation(() => { throw quotaError; });
      
      const result = manager.saveState(validState);
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save even after clearing storage:', 
        expect.any(Error)
      );
    });
  });

  describe('clearState', () => {
    it('should return false when localStorage is not supported', () => {
      manager.isSupported = false;
      const result = manager.clearState();
      expect(result).toBe(false);
    });

    it('should successfully clear state', () => {
      const result = manager.clearState();
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(TEST_KEY);
    });

    it('should handle clear errors', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove failed');
      });
      
      const result = manager.clearState();
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to clear state from localStorage:', 
        expect.any(Error)
      );
    });
  });

  describe('hasStoredState', () => {
    it('should return false when localStorage is not supported', () => {
      manager.isSupported = false;
      const result = manager.hasStoredState();
      expect(result).toBe(false);
    });

    it('should return true when state exists', () => {
      mockLocalStorage.getItem.mockReturnValue('{"data": "exists"}');
      const result = manager.hasStoredState();
      expect(result).toBe(true);
    });

    it('should return false when state does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const result = manager.hasStoredState();
      expect(result).toBe(false);
    });

    it('should handle access errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });
      
      const result = manager.hasStoredState();
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to check for stored state:', 
        expect.any(Error)
      );
    });
  });

  describe('getStorageInfo', () => {
    it('should return unsupported info when localStorage is not supported', () => {
      manager.isSupported = false;
      const result = manager.getStorageInfo();
      expect(result).toEqual({ supported: false, size: 0, available: 0 });
    });

    it('should return storage info for existing data', () => {
      const testData = '{"test": "data"}';
      mockLocalStorage.getItem.mockReturnValue(testData);
      
      const result = manager.getStorageInfo();
      expect(result).toMatchObject({
        supported: true,
        size: testData.length,
        key: TEST_KEY
      });
    });

    it('should return zero size for no data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = manager.getStorageInfo();
      expect(result.size).toBe(0);
    });

    it('should handle storage info errors', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Info error');
      });
      
      const result = manager.getStorageInfo();
      expect(result).toMatchObject({
        supported: false,
        size: 0,
        available: 0,
        error: 'Info error'
      });
    });
  });

  describe('backup and restore operations', () => {
    const testState = { count: 10, name: 'backup-test' };

    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === TEST_KEY) return JSON.stringify(testState);
        return null;
      });
    });

    describe('createBackup', () => {
      it('should create backup with generated key', () => {
        const backupKey = manager.createBackup();
        
        expect(backupKey).toMatch(new RegExp(`${TEST_KEY}_backup_\\d+`));
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          backupKey, 
          JSON.stringify(testState)
        );
      });

      it('should create backup with custom key', () => {
        const customKey = 'custom-backup-key';
        const backupKey = manager.createBackup(customKey);
        
        expect(backupKey).toBe(customKey);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          customKey, 
          JSON.stringify(testState)
        );
      });

      it('should handle backup creation errors', () => {
        mockLocalStorage.setItem.mockImplementation(() => {
          throw new Error('Backup failed');
        });
        
        const backupKey = manager.createBackup();
        expect(backupKey).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
          'Failed to create backup:', 
          expect.any(Error)
        );
      });
    });

    describe('restoreFromBackup', () => {
      const backupKey = 'test-backup';
      const backupData = { count: 20, name: 'restored' };

      it('should successfully restore from backup', () => {
        mockLocalStorage.getItem.mockImplementation((key) => {
          if (key === backupKey) return JSON.stringify(backupData);
          return null;
        });
        
        const result = manager.restoreFromBackup(backupKey);
        expect(result).toBe(true);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          TEST_KEY, 
          JSON.stringify(backupData)
        );
      });

      it('should handle missing backup', () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        
        const result = manager.restoreFromBackup(backupKey);
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          'No backup found with key:', 
          backupKey
        );
      });

      it('should handle invalid backup data', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid json');
        
        const result = manager.restoreFromBackup(backupKey);
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          'Failed to restore from backup:', 
          expect.any(Error)
        );
      });
    });

    describe('listBackups', () => {
      it('should list all backups', () => {
        const backupKeys = [
          `${TEST_KEY}_backup_1000`,
          `${TEST_KEY}_backup_2000`,
          'other-key'
        ];
        
        mockLocalStorage.length = backupKeys.length;
        mockLocalStorage.key.mockImplementation((index) => backupKeys[index]);
        
        const backups = manager.listBackups();
        expect(backups).toHaveLength(2);
        expect(backups[0].timestamp).toBe(2000); // Sorted descending
        expect(backups[1].timestamp).toBe(1000);
      });

      it('should handle listing errors', () => {
        mockLocalStorage.length = 1;
        mockLocalStorage.key.mockImplementation(() => {
          throw new Error('Key access failed');
        });
        
        const backups = manager.listBackups();
        expect(backups).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith(
          'Failed to list backups:', 
          expect.any(Error)
        );
      });
    });

    describe('cleanupBackups', () => {
      it('should clean up old backups', () => {
        const backupKeys = [
          `${TEST_KEY}_backup_3000`,
          `${TEST_KEY}_backup_2000`,
          `${TEST_KEY}_backup_1000`
        ];
        
        mockLocalStorage.length = backupKeys.length;
        mockLocalStorage.key.mockImplementation((index) => backupKeys[index]);
        
        const deletedCount = manager.cleanupBackups(2);
        expect(deletedCount).toBe(1);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`${TEST_KEY}_backup_1000`);
      });

      it('should handle cleanup errors', () => {
        mockLocalStorage.removeItem.mockImplementation(() => {
          throw new Error('Delete failed');
        });
        
        const backupKeys = [`${TEST_KEY}_backup_1000`];
        mockLocalStorage.length = backupKeys.length;
        mockLocalStorage.key.mockImplementation((index) => backupKeys[index]);
        
        const deletedCount = manager.cleanupBackups(0);
        expect(deletedCount).toBe(0);
        expect(console.warn).toHaveBeenCalledWith(
          'Failed to delete backup:', 
          `${TEST_KEY}_backup_1000`,
          expect.any(Error)
        );
      });
    });
  });

  describe('_mergeWithDefaults', () => {
    it('should merge simple properties', () => {
      const defaultState = { a: 1, b: 2, c: 3 };
      const loadedState = { b: 20, d: 4 };
      const manager = new PersistenceManager(TEST_KEY, defaultState);
      
      const result = manager._mergeWithDefaults(loadedState);
      expect(result).toEqual({ a: 1, b: 20, c: 3 });
    });

    it('should deep merge objects', () => {
      const defaultState = { 
        config: { theme: 'light', lang: 'en' },
        data: { count: 0 }
      };
      const loadedState = { 
        config: { theme: 'dark' },
        data: { count: 5 }
      };
      const manager = new PersistenceManager(TEST_KEY, defaultState);
      
      const result = manager._mergeWithDefaults(loadedState);
      expect(result).toEqual({
        config: { theme: 'dark', lang: 'en' },
        data: { count: 5 }
      });
    });

    it('should not deep merge arrays', () => {
      const defaultState = { items: [1, 2, 3] };
      const loadedState = { items: [4, 5] };
      const manager = new PersistenceManager(TEST_KEY, defaultState);
      
      const result = manager._mergeWithDefaults(loadedState);
      expect(result).toEqual({ items: [4, 5] });
    });
  });

  describe('_sanitizeState', () => {
    it('should remove non-serializable data', () => {
      const stateWithFunctions = {
        data: 'valid',
        func: () => {},
        nested: {
          valid: true,
          invalid: undefined
        }
      };
      
      const result = manager._sanitizeState(stateWithFunctions);
      expect(result).toEqual({
        data: 'valid',
        nested: { valid: true }
      });
    });
  });
});

describe('GamePersistenceManager', () => {
  let gameManager;

  beforeEach(() => {
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      key: jest.fn(),
      length: 0
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    console.warn = jest.fn();
    gameManager = new GamePersistenceManager('test-game-key');
  });

  describe('constructor', () => {
    it('should initialize with game-specific default state', () => {
      expect(gameManager.defaultState).toMatchObject({
        allPlayers: [],
        view: 'config',
        selectedSquadIds: [],
        teamMode: 'PAIRS_7',
        formation: expect.any(Object)
      });
    });
  });

  describe('saveGameState', () => {
    it('should save only specified game state fields', () => {
      const fullGameState = {
        allPlayers: [{ id: '1', name: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        reactSpecificField: 'should not be saved',
        functions: () => {},
        formation: { goalie: '1' }
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(fullGameState);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      expect(savedState).not.toHaveProperty('reactSpecificField');
      expect(savedState).not.toHaveProperty('functions');
      expect(savedState).toHaveProperty('allPlayers');
      expect(savedState).toHaveProperty('formation');
    });

    it('should save homeScore and awayScore fields', () => {
      const gameStateWithScores = {
        allPlayers: [{ id: '1', name: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        homeScore: 3,
        awayScore: 2,
        opponentTeamName: 'Test Opponent',
        formation: { goalie: '1' },
        gameLog: []
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(gameStateWithScores);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      
      // Verify scores are included in saved state
      expect(savedState).toHaveProperty('homeScore', 3);
      expect(savedState).toHaveProperty('awayScore', 2);
      expect(savedState).toHaveProperty('opponentTeamName', 'Test Opponent');
    });

    it('should handle missing score fields gracefully', () => {
      const gameStateWithoutScores = {
        allPlayers: [{ id: '1', name: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        formation: { goalie: '1' },
        gameLog: []
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(gameStateWithoutScores);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      
      // Verify score fields are present (even if undefined)
      expect('homeScore' in savedState).toBe(true);
      expect('awayScore' in savedState).toBe(true);
      expect(savedState.homeScore).toBeUndefined();
      expect(savedState.awayScore).toBeUndefined();
    });

    it('should save zero scores correctly', () => {
      const gameStateWithZeroScores = {
        allPlayers: [{ id: '1', name: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        homeScore: 0,
        awayScore: 0,
        formation: { goalie: '1' },
        gameLog: []
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(gameStateWithZeroScores);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      
      // Verify zero scores are saved correctly
      expect(savedState.homeScore).toBe(0);
      expect(savedState.awayScore).toBe(0);
    });
  });

  describe('autoBackup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      gameManager.listBackups = jest.fn();
      gameManager.createBackup = jest.fn();
      gameManager.cleanupBackups = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create backup when no previous backup exists', () => {
      gameManager.listBackups.mockReturnValue([]);
      gameManager.createBackup.mockReturnValue('backup-key');
      
      const result = gameManager.autoBackup();
      
      expect(gameManager.createBackup).toHaveBeenCalled();
      expect(gameManager.cleanupBackups).toHaveBeenCalledWith(3);
      expect(result).toBe('backup-key');
    });

    it('should create backup when last backup is old', () => {
      const oldBackup = { timestamp: Date.now() - 15 * 60 * 1000 }; // 15 minutes ago
      gameManager.listBackups.mockReturnValue([oldBackup]);
      gameManager.createBackup.mockReturnValue('backup-key');
      
      const result = gameManager.autoBackup();
      
      expect(gameManager.createBackup).toHaveBeenCalled();
      expect(result).toBe('backup-key');
    });

    it('should not create backup when recent backup exists', () => {
      const recentBackup = { timestamp: Date.now() - 5 * 60 * 1000 }; // 5 minutes ago
      gameManager.listBackups.mockReturnValue([recentBackup]);
      
      const result = gameManager.autoBackup();
      
      expect(gameManager.createBackup).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});

describe('Factory functions', () => {
  beforeEach(() => {
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    console.warn = jest.fn();
  });

  describe('createPersistenceManager', () => {
    it('should create PersistenceManager instance', () => {
      const manager = createPersistenceManager('test-key', { test: true });
      expect(manager).toBeInstanceOf(PersistenceManager);
      expect(manager.storageKey).toBe('test-key');
      expect(manager.defaultState).toEqual({ test: true });
    });
  });

  describe('createGamePersistenceManager', () => {
    it('should create GamePersistenceManager instance', () => {
      const manager = createGamePersistenceManager('custom-key');
      expect(manager).toBeInstanceOf(GamePersistenceManager);
      expect(manager.storageKey).toBe('custom-key');
    });

    it('should use default key when none provided', () => {
      const manager = createGamePersistenceManager();
      expect(manager.storageKey).toBe('dif-coach-game-state');
    });
  });
});