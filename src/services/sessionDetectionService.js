/**
 * Session Detection Service
 * 
 * Analyzes multiple browser signals to distinguish between:
 * - NEW_SIGN_IN: User actively signed into the application
 * - PAGE_REFRESH: User refreshed the browser page
 */

// Detection result types - simplified to binary decision
export const DETECTION_TYPES = {
  NEW_SIGN_IN: 'NEW_SIGN_IN',
  PAGE_REFRESH: 'PAGE_REFRESH'
};

// Timing constants for session detection
export const TIMING_CONSTANTS = {
  FRESH_AUTH_WINDOW_MS: 10000,        // 10 seconds - max age for "fresh" auth
  API_READY_DELAY_MS: 100,            // Small delay for browser APIs
  DOM_READY_DELAY_MS: 200,            // Delay for DOM readiness
  RELIABLE_CONFIDENCE_THRESHOLD: 60   // Min confidence for "reliable" detection
};

// Essential session storage keys
const SESSION_KEYS = {
  AUTH_TIMESTAMP: 'sport-wizard-auth-timestamp',
  LAST_ACTIVITY: 'sport-wizard-last-activity',
  PAGE_LOAD_COUNT: 'sport-wizard-page-load-count'
};

/**
 * Simple debug logging with just detection results
 */
const debugLog = (type) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const messages = {
    [DETECTION_TYPES.NEW_SIGN_IN]: '🔍 NEW_SIGN_IN DETECTED',
    [DETECTION_TYPES.PAGE_REFRESH]: '🔄 PAGE_REFRESH DETECTED'
  };
  
  console.log(messages[type] || '🔧 UNKNOWN DETECTION');
};


/**
 * Collect essential navigation signals 
 */
function collectNavigationSignals() {
  // Page load count for this session (most important signal)
  const currentCount = parseInt(sessionStorage.getItem(SESSION_KEYS.PAGE_LOAD_COUNT) || '0');
  const pageLoadCount = currentCount + 1;
  sessionStorage.setItem(SESSION_KEYS.PAGE_LOAD_COUNT, pageLoadCount.toString());

  // Get navigation type with fallback
  let navigationType = 0; // default: navigate
  let navigationTiming = null;

  // Try modern Navigation Timing API first
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      navigationTiming = { type: navEntries[0].type };
    }
  } catch (error) {
    // Fallback to legacy API
    if (performance.navigation) {
      navigationType = performance.navigation.type;
    }
  }

  return {
    pageLoadCount,
    navigationType,
    navigationTiming,
    timestamp: Date.now()
  };
}

/**
 * Collect essential session signals
 */
function collectSessionSignals() {
  return {
    authTimestamp: sessionStorage.getItem(SESSION_KEYS.AUTH_TIMESTAMP),
    lastActivity: sessionStorage.getItem(SESSION_KEYS.LAST_ACTIVITY),
    authSessionInitialized: sessionStorage.getItem('auth_session_initialized')
  };
}

/**
 * Pure function to determine if this is a new sign-in
 */
function isNewSignIn(pageLoadCount, hasActivity, navType, authTimestamp) {
  // Primary indicators: Low page count + no activity history
  if (pageLoadCount <= 2 && !hasActivity) {
    return true;
  }
  
  // Fresh auth override: Very recent authentication
  if (authTimestamp) {
    const authAge = Date.now() - parseInt(authTimestamp);
    if (authAge < TIMING_CONSTANTS.FRESH_AUTH_WINDOW_MS) {
      return true;
    }
  }
  
  return false;
}

/**
 * Pure function to determine if this is a page refresh
 */
function isPageRefresh(pageLoadCount, hasActivity, navType) {
  // Clear established session indicators
  if (pageLoadCount >= 3 && hasActivity) {
    return true;
  }
  
  // Reload navigation with existing session
  if (navType === 'reload' && hasActivity) {
    return true;
  }
  
  return false;
}

/**
 * Main detection logic using pure functions
 */
function determineSessionType(navSignals, sessionSignals) {
  const pageLoadCount = navSignals.pageLoadCount;
  const hasActivity = !!sessionSignals.lastActivity;
  const navType = navSignals.navigationTiming?.type || 
                 (navSignals.navigationType === 1 ? 'reload' : 'navigate');
  const authTimestamp = sessionSignals.authTimestamp;

  if (isNewSignIn(pageLoadCount, hasActivity, navType, authTimestamp)) {
    return DETECTION_TYPES.NEW_SIGN_IN;
  }
  
  if (isPageRefresh(pageLoadCount, hasActivity, navType)) {
    return DETECTION_TYPES.PAGE_REFRESH;
  }
  
  // Default to page refresh (safer fallback)
  return DETECTION_TYPES.PAGE_REFRESH;
}


/**
 * Update essential session tracking data
 */
function updateSessionTracking(detectionType) {
  const now = Date.now().toString();
  
  // Update activity timestamp
  sessionStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, now);

  // If new sign-in detected, update auth timestamp
  if (detectionType === DETECTION_TYPES.NEW_SIGN_IN) {
    sessionStorage.setItem(SESSION_KEYS.AUTH_TIMESTAMP, now);
  }
}

/**
 * Main detection function
 * Analyzes all available signals and returns detection result
 */
export function detectSessionType() {
  try {
    // Collect all available signals
    const navSignals = collectNavigationSignals();
    const sessionSignals = collectSessionSignals();

    // Use pure function logic for detection
    const detectedType = determineSessionType(navSignals, sessionSignals);
    
    // Simple confidence based on detection clarity
    const confidence = detectedType === DETECTION_TYPES.NEW_SIGN_IN ? 85 : 75;

    // Create result object
    const result = {
      type: detectedType,
      confidence,
      signals: {
        navigation: navSignals,
        session: sessionSignals
      },
      timestamp: Date.now()
    };

    // Update session tracking
    updateSessionTracking(detectedType);

    // Simple detection logging
    debugLog(detectedType);

    return result;

  } catch (error) {
    console.error('Session detection failed:', error);
    
    // Fallback to safe default
    const fallbackResult = {
      type: DETECTION_TYPES.PAGE_REFRESH,
      confidence: 0,
      scores: {},
      signals: {},
      error: error.message,
      timestamp: Date.now()
    };

    debugLog(DETECTION_TYPES.PAGE_REFRESH);

    return fallbackResult;
  }
}

/**
 * Simple API: Check if this is a new sign-in
 */
export function isNewSignInDetected() {
  const result = detectSessionType();
  return result.type === DETECTION_TYPES.NEW_SIGN_IN;
}

/**
 * Simple API: Check if we should clean up localStorage
 */
export function shouldCleanupSession(detectionResult = null) {
  if (!detectionResult) {
    return isNewSignInDetected();
  }
  // Legacy API support
  return detectionResult.type === DETECTION_TYPES.NEW_SIGN_IN;
}

/**
 * Check if we should show recovery modals based on detection result
 * With binary decision, we don't show recovery modals
 */
export function shouldShowRecoveryModal(detectionResult) {
  return false; // Simplified: binary decision means no ambiguous cases
}

/**
 * Reset session tracking (for testing purposes)
 */
export function resetSessionTracking() {
  Object.values(SESSION_KEYS).forEach(key => {
    sessionStorage.removeItem(key);
  });
  
  // Session tracking reset - no logging needed
}

/**
 * Clear ALL session detection and auth state for fresh testing
 * This should completely reset the session to test NEW_SIGN_IN detection
 */
export function clearAllSessionData() {
  try {
    // Clear all session detection keys
    Object.values(SESSION_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    // Clear auth session flag
    sessionStorage.removeItem('auth_session_initialized');
    
    // Clear any other auth-related session storage
    const authKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('auth') || key.includes('sport-wizard') || key.includes('dif-coach')
    );
    
    authKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    // Session data cleared - no logging needed
    
    return {
      success: true,
      clearedKeys: [...Object.values(SESSION_KEYS), 'auth_session_initialized', ...authKeys]
    };
  } catch (error) {
    console.error('Failed to clear session data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Debug function: Make this available globally for testing
 */
if (process.env.NODE_ENV === 'development') {
  window.clearAllSessionData = clearAllSessionData;
  window.resetSessionTracking = resetSessionTracking;
}