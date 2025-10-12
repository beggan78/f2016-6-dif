// Mock localStorage before importing the functions
const mockLocalStorage = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    // Helper methods for testing
    __getStore: () => ({ ...store }),
    __setStore: (newStore) => { 
      store = { ...newStore };
    }
  };
})();

// Replace the real localStorage with our mock
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage
});

import {
  cleanupPreviousSession,
  getCleanupInfo,
  clearAllLocalStorage
} from '../sessionCleanupUtils';
import { STORAGE_KEYS, DEPRECATED_KEYS } from '../../constants/storageKeys';

describe('sessionCleanupUtils', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks
    mockLocalStorage.__setStore({});
    jest.clearAllMocks();
  });

  describe('cleanupPreviousSession', () => {
    it('should clean up session-specific keys while preserving user preferences', () => {
      // Setup localStorage with mixed data
      const testData = {
        // Keys to preserve (user preferences)
        [STORAGE_KEYS.TIMELINE_PREFERENCES]: '{"showDetails":true}',
        [STORAGE_KEYS.PREFERENCES]: '{"sound":"enabled"}',
        [STORAGE_KEYS.TACTICAL_PREFERENCES]: '{"formation":"2-2"}',

        // Keys to clean up (session-specific)
        [STORAGE_KEYS.GAME_STATE]: '{"currentMatchId":"123"}',
        [DEPRECATED_KEYS.CURRENT_TEAM_ID_OLD]: 'team-456',
        [STORAGE_KEYS.MATCH_HISTORY]: '[{"id":1}]',
        [STORAGE_KEYS.MATCH_EVENTS]: '{"events":[]}',
        [DEPRECATED_KEYS.MATCH_EVENTS_BACKUP]: '{"events":[]}',
        [`${DEPRECATED_KEYS.TIMER_PREFIX}12345`]: '{"startTime":1000}',
        [`${DEPRECATED_KEYS.DISMISSED_MODALS_PREFIX}team123`]: '{"welcome":true}',
        [DEPRECATED_KEYS.PENDING_INVITATION_OLD]: '{"teamId":"abc"}',
        [STORAGE_KEYS.NAVIGATION_HISTORY]: '{"stack":[]}'
      };

      // Populate localStorage
      mockLocalStorage.__setStore({ ...testData });

      const result = cleanupPreviousSession();

      expect(result.success).toBe(true);
      expect(result.removedKeys).toHaveLength(9); // Should remove 9 session keys
      expect(result.preservedKeys).toHaveLength(3); // Should preserve 3 preference keys

      const store = mockLocalStorage.__getStore();
      
      // Verify preserved keys still exist
      expect(store[STORAGE_KEYS.TIMELINE_PREFERENCES]).toBeDefined();
      expect(store[STORAGE_KEYS.PREFERENCES]).toBeDefined();
      expect(store[STORAGE_KEYS.TACTICAL_PREFERENCES]).toBeDefined();
      
      // Verify cleaned up keys are gone
      expect(store[STORAGE_KEYS.GAME_STATE]).toBeUndefined();
      expect(store[DEPRECATED_KEYS.CURRENT_TEAM_ID_OLD]).toBeUndefined();
      expect(store[STORAGE_KEYS.MATCH_HISTORY]).toBeUndefined();
      expect(store[STORAGE_KEYS.MATCH_EVENTS]).toBeUndefined();
      expect(store[`${DEPRECATED_KEYS.TIMER_PREFIX}12345`]).toBeUndefined();
      expect(store[DEPRECATED_KEYS.PENDING_INVITATION_OLD]).toBeUndefined();
    });

    it('should handle pattern matching for keys with suffixes', () => {
      mockLocalStorage.__setStore({
        [`${DEPRECATED_KEYS.TIMER_PREFIX}match123`]: '{"time":100}',
        [`${DEPRECATED_KEYS.TIMER_PREFIX}game456`]: '{"time":200}',
        [`${DEPRECATED_KEYS.DISMISSED_MODALS_PREFIX}team1`]: '{"modal":true}',
        [`${DEPRECATED_KEYS.DISMISSED_MODALS_PREFIX}team2`]: '{"modal":false}',
        [STORAGE_KEYS.PREFERENCES]: '{"sound":true}' // Should be preserved
      });

      const result = cleanupPreviousSession();

      expect(result.success).toBe(true);
      expect(result.removedKeys).toHaveLength(4); // Should clean up 4 pattern-matched keys
      
      const store = mockLocalStorage.__getStore();
      expect(store[STORAGE_KEYS.PREFERENCES]).toBeDefined(); // Preserved
      expect(store[`${DEPRECATED_KEYS.TIMER_PREFIX}match123`]).toBeUndefined(); // Cleaned
      expect(store[`${DEPRECATED_KEYS.DISMISSED_MODALS_PREFIX}team1`]).toBeUndefined(); // Cleaned
    });

    it('should handle empty localStorage gracefully', () => {
      const result = cleanupPreviousSession();

      expect(result.success).toBe(true);
      expect(result.removedKeys).toHaveLength(0);
      expect(result.preservedKeys).toHaveLength(0);
    });

    it('should handle localStorage errors gracefully', () => {
      // Override removeItem to throw an error just for this test
      const originalRemoveItem = mockLocalStorage.removeItem;
      mockLocalStorage.removeItem = () => {
        throw new Error('Storage error');
      };

      mockLocalStorage.__setStore({
        [STORAGE_KEYS.GAME_STATE]: '{"test":true}'
      });

      // Should not throw, but handle errors gracefully
      const result = cleanupPreviousSession();
      
      expect(result.success).toBe(true);
      // The key should still be in removedKeys even if removal failed
      expect(result.removedKeys).toContain(STORAGE_KEYS.GAME_STATE);
      
      // Restore original method
      mockLocalStorage.removeItem = originalRemoveItem;
    });
  });

  describe('getCleanupInfo', () => {
    it('should correctly categorize localStorage keys', () => {
      mockLocalStorage.__setStore({
        [STORAGE_KEYS.PREFERENCES]: '{"test":true}',
        [STORAGE_KEYS.GAME_STATE]: '{"test":true}',
        'unknown-key': '{"test":true}',
        [`${DEPRECATED_KEYS.TIMER_PREFIX}123`]: '{"test":true}'
      });

      const info = getCleanupInfo();

      expect(info.toPreserve).toContain(STORAGE_KEYS.PREFERENCES);
      expect(info.toCleanup).toContain(STORAGE_KEYS.GAME_STATE);
      expect(info.toCleanup).toContain(`${DEPRECATED_KEYS.TIMER_PREFIX}123`);
      expect(info.unknown).toContain('unknown-key');
    });
  });

  describe('clearAllLocalStorage', () => {
    it('should clear all localStorage keys', () => {
      mockLocalStorage.__setStore({
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3'
      });

      const result = clearAllLocalStorage();

      expect(result.success).toBe(true);
      expect(result.clearedKeys).toBe(3);
      expect(mockLocalStorage.__getStore()).toEqual({});
    });

    it('should handle localStorage clear errors', () => {
      const originalClear = mockLocalStorage.clear;
      mockLocalStorage.clear = () => {
        throw new Error('Clear failed');
      };

      const result = clearAllLocalStorage();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clear failed');
      
      // Restore original method
      mockLocalStorage.clear = originalClear;
    });
  });
});
