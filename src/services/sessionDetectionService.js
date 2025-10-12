/**
 * Session Detection Service
 * 
 * Analyzes multiple browser signals to distinguish between:
 * - NEW_SIGN_IN: User actively signed into the application
 * - PAGE_REFRESH: User refreshed the browser page
 */

import { STORAGE_KEYS } from '../constants/storageKeys';

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
  PAGE_LOAD_COUNT: 'sport-wizard-page-load-count',
  DETECTION_CACHE: 'sport-wizard-detection-cache',
  DETECTION_SESSION_ID: 'sport-wizard-detection-session-id'
};

const SUPABASE_TOKEN_KEY_PATTERN = /^sb-.*-auth-token$/;

const SESSION_GUARD_KEYS = {
  LAST_SIGN_OUT: STORAGE_KEYS.SESSION_LAST_SIGN_OUT,
};

const SIGN_OUT_SUPPRESS_WINDOW_MS = 10000;

const SESSION_FLAG_KEYS = {
  PENDING_SIGN_IN: 'sport-wizard-pending-sign-in'
};

/**
 * Enhanced debug logging with detection state tracking - DO NOT REMOVE!
 */
const debugLog = (type, additionalInfo = '') => {
  if (process.env.NODE_ENV !== 'development') return;

  const messages = {
    [DETECTION_TYPES.NEW_SIGN_IN]: '🔍 NEW_SIGN_IN DETECTED',
    [DETECTION_TYPES.PAGE_REFRESH]: '🔄 PAGE_REFRESH DETECTED'
  };

  const message = messages[type] || '🔧 UNKNOWN DETECTION';
  console.log(additionalInfo ? `${message} ${additionalInfo}` : message);
};

/**
 * Generate a unique session ID for this browser session
 */
function generateDetectionSessionId() {
  return `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create detection session ID
 */
function getDetectionSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEYS.DETECTION_SESSION_ID);
  if (!sessionId) {
    sessionId = generateDetectionSessionId();
    try {
      sessionStorage.setItem(SESSION_KEYS.DETECTION_SESSION_ID, sessionId);
    } catch (error) {
      console.warn('Failed to store session ID (storage quota exceeded?):', error);
      // Continue with generated ID even if storage fails
    }
  }
  return sessionId;
}

/**
 * Cache detection result to prevent repeated execution
 */
function cacheDetectionResult(result, sessionId) {
  try {
    const cacheData = {
      result,
      sessionId,
      timestamp: Date.now()
    };
    sessionStorage.setItem(SESSION_KEYS.DETECTION_CACHE, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache detection result (storage quota exceeded?):', error);
    // Detection will work without caching, just with potential repeated execution
  }
}

/**
 * Get cached detection result if valid
 */
function getCachedDetectionResult() {
  try {
    const cached = sessionStorage.getItem(SESSION_KEYS.DETECTION_CACHE);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const currentSessionId = getDetectionSessionId();

    // Cache is valid if from same session and less than 30 seconds old
    const age = Date.now() - cacheData.timestamp;
    const isValid = cacheData.sessionId === currentSessionId && age < 30000;

    if (isValid) {
      debugLog(cacheData.result.type, '(CACHED)');
      return cacheData.result;
    }
  } catch (error) {
    // Invalid cache data - will regenerate
  }
  return null;
}


/**
 * Collect essential navigation signals 
 */
function collectNavigationSignals() {
  // Page load count for this session (most important signal)
  const currentCount = parseInt(sessionStorage.getItem(SESSION_KEYS.PAGE_LOAD_COUNT) || '0');
  const pageLoadCount = currentCount + 1;

  // Try to set page load count with error handling
  try {
    sessionStorage.setItem(SESSION_KEYS.PAGE_LOAD_COUNT, pageLoadCount.toString());
  } catch (error) {
    console.warn('Failed to update page load count (storage quota exceeded?):', error);
    // Continue with detection even if storage fails
  }

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
 * Collect essential session signals (READ-ONLY - no side effects)
 * CRITICAL: Do not read auth_session_initialized here to avoid circular logic
 */
function hasSupabaseSessionToken() {
  const storageCandidates = [];

  if (typeof sessionStorage !== 'undefined') storageCandidates.push(sessionStorage);
  if (typeof localStorage !== 'undefined') storageCandidates.push(localStorage);

  const addGlobalStorage = (storageRef) => {
    if (storageRef && !storageCandidates.includes(storageRef)) {
      storageCandidates.push(storageRef);
    }
  };

  if (typeof global !== 'undefined') {
    addGlobalStorage(global.sessionStorage);
    addGlobalStorage(global.localStorage);
  }

  if (typeof window !== 'undefined') {
    addGlobalStorage(window.sessionStorage);
    addGlobalStorage(window.localStorage);
  }

  const seen = new Set();

  return storageCandidates.some((storageRef) => {
    if (!storageRef || typeof storageRef.getItem !== 'function') {
      return false;
    }

    if (seen.has(storageRef)) {
      return false;
    }
    seen.add(storageRef);

    try {
      const length = typeof storageRef.length === 'number'
        ? storageRef.length
        : (typeof storageRef.key === 'function' ? Number.MAX_SAFE_INTEGER : 0);

      if (typeof storageRef.key !== 'function') {
        return Object.keys(storageRef).some((key) => {
          if (typeof key !== 'string') return false;
          if (!SUPABASE_TOKEN_KEY_PATTERN.test(key)) return false;
          return !!storageRef.getItem(key);
        });
      }

      for (let index = 0; index < length; index += 1) {
        const key = storageRef.key(index);
        if (!key || typeof key !== 'string') continue;
        if (!SUPABASE_TOKEN_KEY_PATTERN.test(key)) continue;
        if (storageRef.getItem(key)) {
          return true;
        }
      }
    } catch (error) {
      return false;
    }

    return false;
  });
}

function consumeSignOutGuard() {
  const storageRefs = [];

  if (typeof localStorage !== 'undefined') storageRefs.push(localStorage);
  if (typeof global !== 'undefined' && global.localStorage) storageRefs.push(global.localStorage);
  if (typeof window !== 'undefined' && window.localStorage) storageRefs.push(window.localStorage);

  let guardTimestamp = null;

  storageRefs.forEach((storageRef) => {
    if (!storageRef || typeof storageRef.getItem !== 'function') return;

    try {
      const rawValue = storageRef.getItem(SESSION_GUARD_KEYS.LAST_SIGN_OUT);
      if (rawValue) {
        const parsed = parseInt(rawValue, 10);
        if (!Number.isNaN(parsed)) {
          guardTimestamp = Math.max(guardTimestamp ?? parsed, parsed);
        }
      }
      storageRef.removeItem(SESSION_GUARD_KEYS.LAST_SIGN_OUT);
    } catch (error) {
      // Ignore storage access issues
    }
  });

  return guardTimestamp;
}

function consumePendingSignInFlag() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }

    const rawValue = sessionStorage.getItem(SESSION_FLAG_KEYS.PENDING_SIGN_IN);
    if (!rawValue) {
      return false;
    }

    sessionStorage.removeItem(SESSION_FLAG_KEYS.PENDING_SIGN_IN);
    return true;
  } catch (error) {
    return false;
  }
}

function collectSessionSignals() {
  return {
    authTimestamp: sessionStorage.getItem(SESSION_KEYS.AUTH_TIMESTAMP),
    lastActivity: sessionStorage.getItem(SESSION_KEYS.LAST_ACTIVITY),
    // REMOVED: authSessionInitialized - this creates circular dependency
    // Detection should be based on independent signals only
    hasSupabaseSession: hasSupabaseSessionToken(),
    pageLoadCount: parseInt(sessionStorage.getItem(SESSION_KEYS.PAGE_LOAD_COUNT) || '0')
  };
}

/**
 * Pure function to determine if this is a new sign-in
 * Uses only independent signals to avoid circular logic
 */
function isNewSignIn(navPageLoadCount, sessionPageLoadCount, hasActivity, navType, authTimestamp, hasSupabaseSession, hasRecentSignOut, hasPendingSignIn) {
  // Use navigation page load count (incremented fresh) vs session page load count (persistent)
  const actualPageLoadCount = Math.max(navPageLoadCount, sessionPageLoadCount);

  if (hasPendingSignIn) {
    return true;
  }

  if (hasRecentSignOut) {
    return false;
  }

  if (!hasSupabaseSession) {
    return false;
  }

  const lacksRecordedActivity = !hasActivity;

  // **FIX**: Prevent false NEW_SIGN_IN detection during in-app actions like "New Game"
  // Check if auth session was already initialized in this browser session
  const authSessionInitialized = sessionStorage.getItem('auth_session_initialized') === 'true';

  // If the auth session is already initialized, be much more conservative about NEW_SIGN_IN detection
  // This prevents in-app actions from being incorrectly classified as new sign-ins
  if (authSessionInitialized && hasSupabaseSession) {
    // For already-initialized sessions, only detect NEW_SIGN_IN if we have very strong evidence
    // like extremely low page count (user just opened browser) or explicit pending sign-in flag
    if (actualPageLoadCount <= 1 || sessionStorage.getItem(SESSION_FLAG_KEYS.PENDING_SIGN_IN)) {
      // Allow NEW_SIGN_IN for genuine cases even in initialized sessions
    } else {
      // For any other case in an initialized session, treat as in-app action, not new sign-in
      return false;
    }
  }

  // Primary indicators: Low page count + no previous activity
  if (lacksRecordedActivity && actualPageLoadCount <= 2) {
    return true;
  }

  // Fresh auth override: Very recent authentication with Supabase session present AND no prior activity
  if (lacksRecordedActivity && authTimestamp) {
    const parsedAuthTimestamp = parseInt(authTimestamp, 10);
    if (!Number.isNaN(parsedAuthTimestamp)) {
      const authAge = Date.now() - parsedAuthTimestamp;
      if (authAge < TIMING_CONSTANTS.FRESH_AUTH_WINDOW_MS) {
        return true;
      }
    }
  }

  // First-time sign-in fallback: Has Supabase session but no activity history within early page loads
  if (lacksRecordedActivity && actualPageLoadCount <= 3) {
    return true;
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
 * Uses independent signals to avoid circular dependencies
 */
function determineSessionType(navSignals, sessionSignals, options = {}) {
  const { hasRecentSignOut = false, hasPendingSignIn = false } = options;
  const navPageLoadCount = navSignals.pageLoadCount;
  const sessionPageLoadCount = sessionSignals.pageLoadCount;
  const hasActivity = !!sessionSignals.lastActivity;
  const navType = navSignals.navigationTiming?.type ||
                 (navSignals.navigationType === 1 ? 'reload' : 'navigate');
  const authTimestamp = sessionSignals.authTimestamp;
  const hasSupabaseSession = sessionSignals.hasSupabaseSession;

  if (isNewSignIn(navPageLoadCount, sessionPageLoadCount, hasActivity, navType, authTimestamp, hasSupabaseSession, hasRecentSignOut, hasPendingSignIn)) {
    return DETECTION_TYPES.NEW_SIGN_IN;
  }

  if (isPageRefresh(Math.max(navPageLoadCount, sessionPageLoadCount), hasActivity, navType)) {
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

  try {
    // Update activity timestamp
    sessionStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, now);

    // If new sign-in detected, update auth timestamp
    if (detectionType === DETECTION_TYPES.NEW_SIGN_IN) {
      sessionStorage.setItem(SESSION_KEYS.AUTH_TIMESTAMP, now);
    }
  } catch (error) {
    console.warn('Failed to update session tracking (storage quota exceeded?):', error);
    // Detection still works without session tracking updates
  }
}

/**
 * Main detection function with caching and race condition protection
 * Analyzes all available signals and returns detection result
 */
export function detectSessionType() {
  try {
    const signOutGuardTimestamp = consumeSignOutGuard();
    const hasRecentSignOut = !!(signOutGuardTimestamp && (Date.now() - signOutGuardTimestamp < SIGN_OUT_SUPPRESS_WINDOW_MS));
    const hasPendingSignIn = consumePendingSignInFlag();
    const bypassCache = hasRecentSignOut || hasPendingSignIn;

    // FIRST: Check for cached result to prevent repeated execution (unless we're coming straight from sign-out or awaiting sign-in confirmation)
    if (!bypassCache) {
      const cachedResult = getCachedDetectionResult();
      if (cachedResult) {
        return cachedResult; // Return cached result with (CACHED) debug log
      }
    } else {
      sessionStorage.removeItem(SESSION_KEYS.DETECTION_CACHE);
    }

    // Get detection session ID for this session
    const sessionId = getDetectionSessionId();

    // Collect all available signals
    const navSignals = collectNavigationSignals();
    const sessionSignals = collectSessionSignals();

    // Use pure function logic for detection
    const detectedType = determineSessionType(navSignals, sessionSignals, { hasRecentSignOut, hasPendingSignIn });

    // Enhanced confidence based on signal strength
    let confidence = 75; // Base confidence
    if (detectedType === DETECTION_TYPES.NEW_SIGN_IN) {
      // Higher confidence for new sign-in when we have strong signals
      if (sessionSignals.hasSupabaseSession && !sessionSignals.lastActivity) {
        confidence = 90; // Very confident - has auth but no history
      } else if (sessionSignals.authTimestamp) {
        confidence = 85; // Confident - fresh auth timestamp
      }
    } else if (detectedType === DETECTION_TYPES.PAGE_REFRESH) {
      if (sessionSignals.lastActivity && sessionSignals.pageLoadCount >= 2) {
        confidence = 85; // Confident - established session
      }
    }

    // Create result object with enhanced data
    const result = {
      type: detectedType,
      confidence,
      scores: {
        pageLoadCount: Math.max(navSignals.pageLoadCount, sessionSignals.pageLoadCount),
        hasActivity: !!sessionSignals.lastActivity,
        hasSupabaseSession: sessionSignals.hasSupabaseSession,
        authAge: sessionSignals.authTimestamp ? Date.now() - parseInt(sessionSignals.authTimestamp) : null
      },
      signals: {
        navigation: navSignals,
        session: sessionSignals
      },
      sessionId,
      timestamp: Date.now()
    };

    // Cache the result BEFORE any side effects
    if (!bypassCache) {
      cacheDetectionResult(result, sessionId);
    }

    // Update session tracking AFTER detection and caching
    updateSessionTracking(detectedType);

    // Enhanced detection logging
    debugLog(detectedType, `(confidence: ${confidence}%, session: ${sessionId.substr(-4)})`);

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
      sessionId: null,
      timestamp: Date.now()
    };

    debugLog(DETECTION_TYPES.PAGE_REFRESH, '(FALLBACK)');

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

    sessionStorage.removeItem(SESSION_FLAG_KEYS.PENDING_SIGN_IN);
    
    // Clear auth session flag
    sessionStorage.removeItem('auth_session_initialized');
    
    // Clear any other auth-related session storage
    const authKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('auth') || key.includes('sport-wizard') || key.includes('dif-coach')
    );
    
    authKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });

    const removeSupabaseTokens = (storageRef) => {
      if (!storageRef || typeof storageRef.removeItem !== 'function') {
        return;
      }

      try {
        if (typeof storageRef.key === 'function') {
          const keysToRemove = [];
          for (let index = 0; index < (storageRef.length || 0); index += 1) {
            const key = storageRef.key(index);
            if (key && SUPABASE_TOKEN_KEY_PATTERN.test(key)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => storageRef.removeItem(key));
        } else {
          Object.keys(storageRef).forEach((key) => {
            if (SUPABASE_TOKEN_KEY_PATTERN.test(key)) {
              storageRef.removeItem(key);
            }
          });
        }
      } catch (storageError) {
        // Ignore cleanup errors - typically blocked in restricted environments
      }
    };

    removeSupabaseTokens(typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    removeSupabaseTokens(typeof localStorage !== 'undefined' ? localStorage : null);
    removeSupabaseTokens(typeof global !== 'undefined' ? global.localStorage : null);
    removeSupabaseTokens(typeof window !== 'undefined' ? window.localStorage : null);
    
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
 * Debug storage info utility
 */
export function debugStorageInfo() {
  const info = {
    localStorage: {},
    sessionStorage: {},
    totalSize: 0
  };

  try {
    // List all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = value ? new Blob([value]).size : 0;
      info.localStorage[key] = { size, preview: value?.substring(0, 100) + '...' };
      info.totalSize += size;
    }

    // List all sessionStorage keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      const size = value ? new Blob([value]).size : 0;
      info.sessionStorage[key] = { size, preview: value?.substring(0, 100) + '...' };
      info.totalSize += size;
    }

    console.table(info.localStorage);
    console.table(info.sessionStorage);
    console.log(`Total size: ${(info.totalSize / 1024).toFixed(2)} KB`);

    return info;
  } catch (error) {
    console.error('Error analyzing storage:', error);
    return null;
  }
}


/**
 * Debug function: Make this available globally for testing
 */
if (process.env.NODE_ENV === 'development') {
  window.clearAllSessionData = clearAllSessionData;
  window.resetSessionTracking = resetSessionTracking;
  window.debugStorageInfo = debugStorageInfo;
}

export function markPendingSignIn() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_FLAG_KEYS.PENDING_SIGN_IN, Date.now().toString());
    }
  } catch (error) {
    // Ignore storage failures
  }
}

export function markSignOutGuard() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_GUARD_KEYS.LAST_SIGN_OUT, Date.now().toString());
    }
  } catch (error) {
    // Ignore storage failures
  }

  try {
    if (typeof global !== 'undefined' && global.localStorage) {
      global.localStorage.setItem(SESSION_GUARD_KEYS.LAST_SIGN_OUT, Date.now().toString());
    }
  } catch (error) {
    // Ignore storage failures
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_GUARD_KEYS.LAST_SIGN_OUT, Date.now().toString());
    }
  } catch (error) {
    // Ignore storage failures
  }
}
