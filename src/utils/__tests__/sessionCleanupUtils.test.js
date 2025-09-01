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
        'dif-coach-timeline-preferences': '{"showDetails":true}',
        'sport-wizard-preferences': '{"sound":"enabled"}',
        'sport-wizard-tactical-preferences': '{"formation":"2-2"}',
        
        // Keys to clean up (session-specific)
        'dif-coach-game-state': '{"currentMatchId":"123"}',
        'currentTeamId': 'team-456',
        'dif-coach-match-history': '[{"id":1}]',
        'dif-coach-match-events': '{"events":[]}',
        'dif-coach-match-events-backup': '{"events":[]}',
        'dif-coach-timer-12345': '{"startTime":1000}',
        'sport-wizard-dismissedModals-team123': '{"welcome":true}',
        'pendingInvitation': '{"teamId":"abc"}',
        'sport-wizard-navigation-history': '{"stack":[]}'
      };

      // Populate localStorage
      mockLocalStorage.__setStore({ ...testData });

      const result = cleanupPreviousSession();

      expect(result.success).toBe(true);
      expect(result.removedKeys).toHaveLength(9); // Should remove 9 session keys
      expect(result.preservedKeys).toHaveLength(3); // Should preserve 3 preference keys

      const store = mockLocalStorage.__getStore();
      
      // Verify preserved keys still exist
      expect(store['dif-coach-timeline-preferences']).toBeDefined();
      expect(store['sport-wizard-preferences']).toBeDefined();
      expect(store['sport-wizard-tactical-preferences']).toBeDefined();
      
      // Verify cleaned up keys are gone
      expect(store['dif-coach-game-state']).toBeUndefined();
      expect(store['currentTeamId']).toBeUndefined();
      expect(store['dif-coach-match-history']).toBeUndefined();
      expect(store['dif-coach-match-events']).toBeUndefined();
      expect(store['dif-coach-timer-12345']).toBeUndefined();
      expect(store['pendingInvitation']).toBeUndefined();
    });

    it('should handle pattern matching for keys with suffixes', () => {
      mockLocalStorage.__setStore({
        'dif-coach-timer-match123': '{"time":100}',
        'dif-coach-timer-game456': '{"time":200}',
        'sport-wizard-dismissedModals-team1': '{"modal":true}',
        'sport-wizard-dismissedModals-team2': '{"modal":false}',
        'sport-wizard-preferences': '{"sound":true}' // Should be preserved
      });

      const result = cleanupPreviousSession();

      expect(result.success).toBe(true);
      expect(result.removedKeys).toHaveLength(4); // Should clean up 4 pattern-matched keys
      
      const store = mockLocalStorage.__getStore();
      expect(store['sport-wizard-preferences']).toBeDefined(); // Preserved
      expect(store['dif-coach-timer-match123']).toBeUndefined(); // Cleaned
      expect(store['sport-wizard-dismissedModals-team1']).toBeUndefined(); // Cleaned
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
        'dif-coach-game-state': '{"test":true}'
      });

      // Should not throw, but handle errors gracefully
      const result = cleanupPreviousSession();
      
      expect(result.success).toBe(true);
      // The key should still be in removedKeys even if removal failed
      expect(result.removedKeys).toContain('dif-coach-game-state');
      
      // Restore original method
      mockLocalStorage.removeItem = originalRemoveItem;
    });
  });

  describe('getCleanupInfo', () => {
    it('should correctly categorize localStorage keys', () => {
      mockLocalStorage.__setStore({
        'sport-wizard-preferences': '{"test":true}',
        'dif-coach-game-state': '{"test":true}',
        'unknown-key': '{"test":true}',
        'dif-coach-timer-123': '{"test":true}'
      });

      const info = getCleanupInfo();

      expect(info.toPreserve).toContain('sport-wizard-preferences');
      expect(info.toCleanup).toContain('dif-coach-game-state');
      expect(info.toCleanup).toContain('dif-coach-timer-123');
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