import {
  PersistenceManager,
  GamePersistenceManager,
  createPersistenceManager,
  createGamePersistenceManager 
} from '../persistenceManager';
import { DEFAULT_VENUE_TYPE } from '../../constants/matchVenues';
import { STORAGE_KEYS } from '../../constants/storageKeys';

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

    it('should return stored state when default state is null', () => {
      const nullDefaultManager = new PersistenceManager(TEST_KEY, null);
      const storedState = {
        isPeriodActive: true,
        periodStartTime: 1234567890,
        lastSubstitutionTime: 1234567800
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));

      const result = nullDefaultManager.loadState();
      expect(result).toEqual(storedState);
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


  describe('_mergeWithDefaults', () => {
    it('should merge simple properties', () => {
      const defaultState = { a: 1, b: 2, c: 3 };
      const loadedState = { b: 20, d: 4 };
      const manager = new PersistenceManager(TEST_KEY, defaultState);
      
      const result = manager._mergeWithDefaults(loadedState);
      expect(result).toEqual({ a: 1, b: 20, c: 3, d: 4 });
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
        teamConfig: { format: '5v5', squadSize: 7, formation: '2-2' },
        formation: expect.any(Object)
      });
    });
  });

  describe('saveGameState', () => {
    it('should save only specified game state fields', () => {
      const fullGameState = {
        allPlayers: [{ id: '1', displayName: 'Player 1', firstName: 'Player', lastName: 'One' }],
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
      expect(savedState.allPlayers[0]).not.toHaveProperty('name');
      expect(savedState.allPlayers[0]).toHaveProperty('displayName', 'Player 1');
      expect(savedState).toHaveProperty('formation');
    });

    it('should save ownScore and opponentScore fields', () => {
      const gameStateWithScores = {
        allPlayers: [{ id: '1', displayName: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        ownScore: 3,
        opponentScore: 2,
        opponentTeam: 'Test Opponent',
        formation: { goalie: '1' },
        gameLog: []
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(gameStateWithScores);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      
      // Verify scores are included in saved state
      expect(savedState).toHaveProperty('ownScore', 3);
      expect(savedState).toHaveProperty('opponentScore', 2);
      expect(savedState).toHaveProperty('opponentTeam', 'Test Opponent');
    });

    it('should handle missing score fields gracefully', () => {
      const gameStateWithoutScores = {
        allPlayers: [{ id: '1', displayName: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        formation: { goalie: '1' },
        gameLog: []
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(gameStateWithoutScores);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      
      // Verify score fields default to zeros when absent
      expect(savedState.ownScore).toBe(0);
      expect(savedState.opponentScore).toBe(0);
    });

    it('should save zero scores correctly', () => {
      const gameStateWithZeroScores = {
        allPlayers: [{ id: '1', displayName: 'Player 1' }],
        view: 'game',
        selectedSquadIds: ['1'],
        ownScore: 0,
        opponentScore: 0,
        formation: { goalie: '1' },
        gameLog: []
      };
      
      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(gameStateWithZeroScores);
      
      expect(gameManager.saveState).toHaveBeenCalled();
      const savedState = gameManager.saveState.mock.calls[0][0];
      
      // Verify zero scores are saved correctly
      expect(savedState.ownScore).toBe(0);
      expect(savedState.opponentScore).toBe(0);
    });

    it('should default venueType when not provided', () => {
      const partialState = {
        allPlayers: [],
        view: 'config',
        selectedSquadIds: []
      };

      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(partialState);

      const savedState = gameManager.saveState.mock.calls[0][0];
      expect(savedState.venueType).toBe(DEFAULT_VENUE_TYPE);
    });

    it('should default venueType when explicitly null', () => {
      const stateWithNullVenue = {
        allPlayers: [],
        view: 'config',
        selectedSquadIds: [],
        venueType: null
      };

      jest.spyOn(gameManager, 'saveState');
      gameManager.saveGameState(stateWithNullVenue);

      const savedState = gameManager.saveState.mock.calls[0][0];
      expect(savedState.venueType).toBe(DEFAULT_VENUE_TYPE);
    });

    it('should warn and skip save for invalid game state', () => {
      jest.spyOn(gameManager, 'saveState');
      const result = gameManager.saveGameState(null);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('GamePersistenceManager.saveGameState called with invalid gameState. Aborting save.');
      expect(gameManager.saveState).not.toHaveBeenCalled();
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
      expect(manager.storageKey).toBe(STORAGE_KEYS.GAME_STATE);
    });
  });
});
