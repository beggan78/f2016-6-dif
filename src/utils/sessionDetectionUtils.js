/**
 * Session Detection Utilities
 * 
 * Helper functions for browser API feature detection and signal analysis
 */

/**
 * Check if Navigation Timing API is available
 */
export function isNavigationTimingSupported() {
  return typeof performance !== 'undefined' && 
         typeof performance.getEntriesByType === 'function';
}

/**
 * Check if Performance Navigation API is available (legacy)
 */
export function isPerformanceNavigationSupported() {
  return typeof performance !== 'undefined' && 
         typeof performance.navigation !== 'undefined';
}

/**
 * Check if Page Visibility API is available
 */
export function isPageVisibilitySupported() {
  return typeof document !== 'undefined' && 
         typeof document.visibilityState !== 'undefined';
}

/**
 * Get safe navigation type with fallbacks
 */
export function getNavigationType() {
  // Try modern Navigation Timing API first
  if (isNavigationTimingSupported()) {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries && navEntries.length > 0) {
        return navEntries[0].type;
      }
    } catch (error) {
      console.warn('Failed to get navigation entry:', error);
    }
  }

  // Fallback to legacy Performance Navigation API
  if (isPerformanceNavigationSupported()) {
    const type = performance.navigation.type;
    switch (type) {
      case 0: return 'navigate';
      case 1: return 'reload';
      case 2: return 'back_forward';
      default: return 'unknown';
    }
  }

  return 'unknown';
}

/**
 * Get safe visibility state with fallback
 */
export function getVisibilityState() {
  if (isPageVisibilitySupported()) {
    return document.visibilityState;
  }
  return 'unknown';
}

/**
 * Check if current page load is likely a page refresh
 */
export function isLikelyPageRefresh() {
  const navType = getNavigationType();
  return navType === 'reload';
}

/**
 * Check if current page load is from external source
 */
export function isExternalNavigation() {
  const referrer = document.referrer;
  if (!referrer) return true; // No referrer suggests external
  
  const currentOrigin = window.location.origin;
  return !referrer.startsWith(currentOrigin);
}

/**
 * Calculate time since last activity
 */
export function getTimeSinceLastActivity() {
  const lastActivity = sessionStorage.getItem('sport-wizard-last-activity');
  if (!lastActivity) return null;
  
  return Date.now() - parseInt(lastActivity);
}

/**
 * Check if session storage indicates established session
 */
export function hasEstablishedSession() {
  return sessionStorage.getItem('auth_session_initialized') !== null;
}

/**
 * Get current page load count for session
 */
export function getPageLoadCount() {
  return parseInt(sessionStorage.getItem('sport-wizard-page-load-count') || '0');
}

/**
 * Feature detection summary
 */
export function getFeatureSupport() {
  return {
    navigationTiming: isNavigationTimingSupported(),
    performanceNavigation: isPerformanceNavigationSupported(),
    pageVisibility: isPageVisibilitySupported(),
    sessionStorage: typeof sessionStorage !== 'undefined'
  };
}

/**
 * Collect basic environment signals
 */
export function collectEnvironmentSignals() {
  return {
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    url: window.location.href,
    origin: window.location.origin,
    referrer: document.referrer,
    features: getFeatureSupport()
  };
}

/**
 * Normalize confidence scores to 0-100 range
 */
export function normalizeConfidenceScores(scores) {
  const values = Object.values(scores);
  const maxValue = Math.max(...values);
  
  if (maxValue === 0) return scores;
  
  const normalized = {};
  for (const [key, value] of Object.entries(scores)) {
    normalized[key] = Math.round((value / maxValue) * 100);
  }
  
  return normalized;
}

/**
 * Create a summary of detection signals for debugging
 */
export function createDetectionSummary(signals) {
  const nav = signals.navigation || {};
  const session = signals.session || {};
  
  return {
    navigation: {
      type: nav.navigationTiming?.type || nav.navigationType,
      referrer: nav.referrer ? 'present' : 'none',
      pageLoadCount: nav.pageLoadCount || 0,
      visibility: nav.visibility
    },
    session: {
      hasAuthSession: !!session.authSessionInitialized,
      hasAuthTimestamp: !!session.authTimestamp,
      hasLastActivity: !!session.lastActivity,
      tabSessionId: !!session.tabSessionId
    },
    timing: {
      timestamp: nav.timestamp || Date.now()
    }
  };
}

/**
 * Validate detection result structure
 */
export function validateDetectionResult(result) {
  const requiredFields = ['type', 'confidence', 'scores', 'timestamp'];
  
  for (const field of requiredFields) {
    if (!(field in result)) {
      console.warn(`Detection result missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Safe sessionStorage operations with error handling
 */
export const safeSessionStorage = {
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get sessionStorage item ${key}:`, error);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set sessionStorage item ${key}:`, error);
      return false;
    }
  },
  
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove sessionStorage item ${key}:`, error);
      return false;
    }
  }
};