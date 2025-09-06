/**
 * Tests for sessionDetectionService
 */

import {
  detectSessionType,
  shouldCleanupSession,
  shouldShowRecoveryModal,
  resetSessionTracking,
  DETECTION_TYPES
} from '../sessionDetectionService';

// Mock browser APIs
const mockPerformance = {
  navigation: { type: 0, redirectCount: 0 },
  getEntriesByType: jest.fn()
};

const mockDocument = {
  referrer: '',
  visibilityState: 'visible'
};

const mockSessionStorage = {
  storage: {},
  getItem: jest.fn((key) => mockSessionStorage.storage[key] || null),
  setItem: jest.fn((key, value) => { mockSessionStorage.storage[key] = value; }),
  removeItem: jest.fn((key) => { delete mockSessionStorage.storage[key]; }),
  clear: jest.fn(() => { mockSessionStorage.storage = {}; })
};

// Setup global mocks
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});
Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});
Object.defineProperty(global, 'window', {
  value: { location: { origin: 'http://localhost:3000' } },
  writable: true
});

describe('sessionDetectionService', () => {
  beforeEach(() => {
    // Clear all mocks and storage
    jest.clearAllMocks();
    mockSessionStorage.clear();
    
    // Reset performance mock
    mockPerformance.navigation = { type: 0, redirectCount: 0 };
    mockPerformance.getEntriesByType.mockReturnValue([]);
    
    // Reset document mock
    mockDocument.referrer = '';
    mockDocument.visibilityState = 'visible';
  });

  describe('detectSessionType', () => {
    it('should detect new sign-in for fresh session', () => {
      // Setup: No existing session storage, navigate type
      mockPerformance.navigation.type = 0; // navigate
      mockPerformance.getEntriesByType.mockReturnValue([
        { type: 'navigate', redirectCount: 0 }
      ]);

      const result = detectSessionType();

      expect(result.type).toBe(DETECTION_TYPES.NEW_SIGN_IN);
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.scores[DETECTION_TYPES.NEW_SIGN_IN]).toBeGreaterThan(0);
    });

    it('should detect page refresh for reload navigation', () => {
      // Setup: Existing session, reload type
      mockSessionStorage.storage['auth_session_initialized'] = 'true';
      mockPerformance.navigation.type = 1; // reload
      mockPerformance.getEntriesByType.mockReturnValue([
        { type: 'reload', redirectCount: 0 }
      ]);

      const result = detectSessionType();

      expect(result.type).toBe(DETECTION_TYPES.PAGE_REFRESH);
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.scores[DETECTION_TYPES.PAGE_REFRESH]).toBeGreaterThan(0);
    });

    it('should detect tab switch for existing session with navigate', () => {
      // Setup: Existing session, navigate type, same origin referrer
      mockSessionStorage.storage['auth_session_initialized'] = 'true';
      mockSessionStorage.storage['sport-wizard-auth-timestamp'] = (Date.now() - 60000).toString(); // 1 minute ago
      mockPerformance.navigation.type = 0; // navigate
      mockDocument.referrer = 'http://localhost:3000/other-page';
      
      const result = detectSessionType();

      // Should lean towards tab switch due to existing session
      expect(result.type).toBe(DETECTION_TYPES.TAB_SWITCH);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle missing browser APIs gracefully', () => {
      // Setup: No performance APIs available
      global.performance = undefined;
      
      const result = detectSessionType();

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.scores).toBeDefined();
    });

    it('should return fallback result when detection fails', () => {
      // Setup: Mock an error in the detection process
      mockPerformance.getEntriesByType.mockImplementation(() => {
        throw new Error('API error');
      });

      const result = detectSessionType();

      expect(result.type).toBe(DETECTION_TYPES.PAGE_REFRESH);
      expect(result.confidence).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should track session data correctly', () => {
      detectSessionType();

      // Should set session tracking data
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'sport-wizard-page-load-count',
        expect.any(String)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'sport-wizard-last-activity',
        expect.any(String)
      );
    });
  });

  describe('shouldCleanupSession', () => {
    it('should return true for high-confidence new sign-in', () => {
      const detectionResult = {
        type: DETECTION_TYPES.NEW_SIGN_IN,
        confidence: 80
      };

      expect(shouldCleanupSession(detectionResult)).toBe(true);
    });

    it('should return false for low-confidence new sign-in', () => {
      const detectionResult = {
        type: DETECTION_TYPES.NEW_SIGN_IN,
        confidence: 40
      };

      expect(shouldCleanupSession(detectionResult)).toBe(false);
    });

    it('should return false for page refresh', () => {
      const detectionResult = {
        type: DETECTION_TYPES.PAGE_REFRESH,
        confidence: 90
      };

      expect(shouldCleanupSession(detectionResult)).toBe(false);
    });

    it('should return false for tab switch', () => {
      const detectionResult = {
        type: DETECTION_TYPES.TAB_SWITCH,
        confidence: 70
      };

      expect(shouldCleanupSession(detectionResult)).toBe(false);
    });
  });

  describe('shouldShowRecoveryModal', () => {
    it('should return true for tab switch', () => {
      const detectionResult = {
        type: DETECTION_TYPES.TAB_SWITCH,
        confidence: 60
      };

      expect(shouldShowRecoveryModal(detectionResult)).toBe(true);
    });

    it('should return true for low-confidence uncertain result', () => {
      const detectionResult = {
        type: DETECTION_TYPES.UNCERTAIN,
        confidence: 20
      };

      expect(shouldShowRecoveryModal(detectionResult)).toBe(true);
    });

    it('should return false for new sign-in', () => {
      const detectionResult = {
        type: DETECTION_TYPES.NEW_SIGN_IN,
        confidence: 80
      };

      expect(shouldShowRecoveryModal(detectionResult)).toBe(false);
    });

    it('should return false for page refresh', () => {
      const detectionResult = {
        type: DETECTION_TYPES.PAGE_REFRESH,
        confidence: 85
      };

      expect(shouldShowRecoveryModal(detectionResult)).toBe(false);
    });
  });

  describe('confidence scoring', () => {
    it('should give higher scores for reload navigation type', () => {
      mockPerformance.navigation.type = 1; // reload
      mockSessionStorage.storage['auth_session_initialized'] = 'true';

      const result = detectSessionType();

      expect(result.scores[DETECTION_TYPES.PAGE_REFRESH]).toBeGreaterThan(
        result.scores[DETECTION_TYPES.NEW_SIGN_IN]
      );
    });

    it('should consider auth timestamp in scoring', () => {
      // Recent auth timestamp should favor new sign-in
      mockSessionStorage.storage['sport-wizard-auth-timestamp'] = (Date.now() - 2000).toString(); // 2 seconds ago
      mockPerformance.navigation.type = 0; // navigate

      const result = detectSessionType();

      expect(result.scores[DETECTION_TYPES.NEW_SIGN_IN]).toBeGreaterThan(0);
    });

    it('should consider referrer in scoring', () => {
      // External referrer should favor new sign-in
      mockDocument.referrer = 'https://google.com';
      mockPerformance.navigation.type = 0; // navigate

      const result = detectSessionType();

      expect(result.scores[DETECTION_TYPES.NEW_SIGN_IN]).toBeGreaterThan(
        result.scores[DETECTION_TYPES.TAB_SWITCH]
      );
    });
  });

  describe('resetSessionTracking', () => {
    it('should clear all session storage keys', () => {
      // Setup some session data
      mockSessionStorage.storage['sport-wizard-auth-timestamp'] = 'test';
      mockSessionStorage.storage['sport-wizard-last-activity'] = 'test';
      mockSessionStorage.storage['sport-wizard-tab-session-id'] = 'test';

      resetSessionTracking();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledTimes(5); // All SESSION_KEYS
    });
  });

  describe('edge cases', () => {
    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = detectSessionType();

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle missing navigation timing gracefully', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);
      mockPerformance.navigation = undefined;

      const result = detectSessionType();

      expect(result.type).toBeDefined();
      expect(result.scores).toBeDefined();
    });

    it('should generate unique tab session IDs', () => {
      detectSessionType();
      const firstId = mockSessionStorage.storage['sport-wizard-tab-session-id'];

      mockSessionStorage.clear();
      detectSessionType();
      const secondId = mockSessionStorage.storage['sport-wizard-tab-session-id'];

      expect(firstId).not.toBe(secondId);
      expect(firstId).toMatch(/^tab_\d+_/);
      expect(secondId).toMatch(/^tab_\d+_/);
    });
  });
});