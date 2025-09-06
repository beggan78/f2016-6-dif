/**
 * Tests for sessionDetectionUtils
 */

import {
  isNavigationTimingSupported,
  isPerformanceNavigationSupported,
  isPageVisibilitySupported,
  getNavigationType,
  getVisibilityState,
  isLikelyPageRefresh,
  isExternalNavigation,
  getTimeSinceLastActivity,
  hasEstablishedSession,
  normalizeConfidenceScores,
  createDetectionSummary,
  validateDetectionResult,
  safeSessionStorage
} from '../sessionDetectionUtils';

// Mock browser APIs
const mockPerformance = {
  navigation: { type: 0 },
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
  removeItem: jest.fn((key) => { delete mockSessionStorage.storage[key]; })
};

describe('sessionDetectionUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.storage = {};
    global.performance = mockPerformance;
    global.document = mockDocument;
    global.sessionStorage = mockSessionStorage;
    global.window = { location: { origin: 'http://localhost:3000' } };
  });

  describe('feature detection', () => {
    it('should detect navigation timing support', () => {
      expect(isNavigationTimingSupported()).toBe(true);
      
      global.performance = undefined;
      expect(isNavigationTimingSupported()).toBe(false);
    });

    it('should detect performance navigation support', () => {
      expect(isPerformanceNavigationSupported()).toBe(true);
      
      mockPerformance.navigation = undefined;
      expect(isPerformanceNavigationSupported()).toBe(false);
    });

    it('should detect page visibility support', () => {
      expect(isPageVisibilitySupported()).toBe(true);
      
      global.document = { visibilityState: undefined };
      expect(isPageVisibilitySupported()).toBe(false);
    });
  });

  describe('getNavigationType', () => {
    it('should return modern navigation type when available', () => {
      mockPerformance.getEntriesByType.mockReturnValue([
        { type: 'reload' }
      ]);

      expect(getNavigationType()).toBe('reload');
    });

    it('should fallback to legacy navigation API', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);
      mockPerformance.navigation.type = 1;

      expect(getNavigationType()).toBe('reload');
    });

    it('should map legacy navigation types correctly', () => {
      mockPerformance.getEntriesByType.mockReturnValue([]);
      
      mockPerformance.navigation.type = 0;
      expect(getNavigationType()).toBe('navigate');
      
      mockPerformance.navigation.type = 1;
      expect(getNavigationType()).toBe('reload');
      
      mockPerformance.navigation.type = 2;
      expect(getNavigationType()).toBe('back_forward');
      
      mockPerformance.navigation.type = 999;
      expect(getNavigationType()).toBe('unknown');
    });

    it('should return unknown when APIs unavailable', () => {
      global.performance = undefined;
      expect(getNavigationType()).toBe('unknown');
    });
  });

  describe('getVisibilityState', () => {
    it('should return visibility state when supported', () => {
      mockDocument.visibilityState = 'hidden';
      expect(getVisibilityState()).toBe('hidden');
    });

    it('should return unknown when not supported', () => {
      global.document = {};
      expect(getVisibilityState()).toBe('unknown');
    });
  });

  describe('isLikelyPageRefresh', () => {
    it('should return true for reload navigation', () => {
      mockPerformance.getEntriesByType.mockReturnValue([
        { type: 'reload' }
      ]);

      expect(isLikelyPageRefresh()).toBe(true);
    });

    it('should return false for navigate', () => {
      mockPerformance.getEntriesByType.mockReturnValue([
        { type: 'navigate' }
      ]);

      expect(isLikelyPageRefresh()).toBe(false);
    });
  });

  describe('isExternalNavigation', () => {
    it('should return true for external referrer', () => {
      mockDocument.referrer = 'https://google.com';
      expect(isExternalNavigation()).toBe(true);
    });

    it('should return false for same origin referrer', () => {
      mockDocument.referrer = 'http://localhost:3000/other-page';
      expect(isExternalNavigation()).toBe(false);
    });

    it('should return true for no referrer', () => {
      mockDocument.referrer = '';
      expect(isExternalNavigation()).toBe(true);
    });
  });

  describe('getTimeSinceLastActivity', () => {
    it('should return time difference when activity exists', () => {
      const pastTime = Date.now() - 5000; // 5 seconds ago
      mockSessionStorage.storage['sport-wizard-last-activity'] = pastTime.toString();

      const timeSince = getTimeSinceLastActivity();
      expect(timeSince).toBeGreaterThan(4000);
      expect(timeSince).toBeLessThan(6000);
    });

    it('should return null when no activity recorded', () => {
      expect(getTimeSinceLastActivity()).toBeNull();
    });
  });

  describe('hasEstablishedSession', () => {
    it('should return true when session initialized', () => {
      mockSessionStorage.storage['auth_session_initialized'] = 'true';
      expect(hasEstablishedSession()).toBe(true);
    });

    it('should return false when no session', () => {
      expect(hasEstablishedSession()).toBe(false);
    });
  });

  describe('normalizeConfidenceScores', () => {
    it('should normalize scores to 0-100 range', () => {
      const scores = {
        typeA: 50,
        typeB: 100,
        typeC: 25
      };

      const normalized = normalizeConfidenceScores(scores);

      expect(normalized.typeA).toBe(50);
      expect(normalized.typeB).toBe(100);
      expect(normalized.typeC).toBe(25);
    });

    it('should handle zero max value', () => {
      const scores = {
        typeA: 0,
        typeB: 0
      };

      const normalized = normalizeConfidenceScores(scores);
      expect(normalized).toEqual(scores);
    });
  });

  describe('createDetectionSummary', () => {
    it('should create comprehensive summary', () => {
      const signals = {
        navigation: {
          navigationTiming: { type: 'reload' },
          referrer: 'http://localhost:3000',
          pageLoadCount: 3,
          visibility: 'visible'
        },
        session: {
          authSessionInitialized: 'true',
          authTimestamp: '1234567890',
          lastActivity: '1234567890'
        }
      };

      const summary = createDetectionSummary(signals);

      expect(summary.navigation.type).toBe('reload');
      expect(summary.navigation.referrer).toBe('present');
      expect(summary.navigation.pageLoadCount).toBe(3);
      expect(summary.session.hasAuthSession).toBe(true);
      expect(summary.session.hasAuthTimestamp).toBe(true);
    });

    it('should handle missing signals gracefully', () => {
      const summary = createDetectionSummary({});

      expect(summary.navigation).toBeDefined();
      expect(summary.session).toBeDefined();
      expect(summary.timing).toBeDefined();
    });
  });

  describe('validateDetectionResult', () => {
    it('should validate complete result', () => {
      const result = {
        type: 'NEW_SIGN_IN',
        confidence: 80,
        scores: { test: 80 },
        timestamp: Date.now()
      };

      expect(validateDetectionResult(result)).toBe(true);
    });

    it('should reject incomplete result', () => {
      const result = {
        type: 'NEW_SIGN_IN'
        // Missing required fields
      };

      expect(validateDetectionResult(result)).toBe(false);
    });
  });

  describe('safeSessionStorage', () => {
    it('should handle getItem safely', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = safeSessionStorage.getItem('test');
      expect(result).toBeNull();
    });

    it('should handle setItem safely', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = safeSessionStorage.setItem('test', 'value');
      expect(result).toBe(false);
    });

    it('should handle removeItem safely', () => {
      mockSessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = safeSessionStorage.removeItem('test');
      expect(result).toBe(false);
    });

    it('should work normally when no errors', () => {
      const getResult = safeSessionStorage.getItem('test');
      expect(getResult).toBeNull();

      const setResult = safeSessionStorage.setItem('test', 'value');
      expect(setResult).toBe(true);

      const removeResult = safeSessionStorage.removeItem('test');
      expect(removeResult).toBe(true);
    });
  });
});