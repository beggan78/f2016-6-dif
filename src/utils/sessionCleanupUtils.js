/**
 * Utilities for cleaning up localStorage from previous sessions
 * Preserves user preferences while clearing session-specific data
 */

/**
 * Keys that should be preserved across sessions (user preferences)
 */
const PRESERVED_KEYS = [
  'dif-coach-timeline-preferences',
  'sport-wizard-preferences', 
  'sport-wizard-tactical-preferences'
];

/**
 * Key patterns that should be cleaned up (session-specific data)
 */
const CLEANUP_PATTERNS = [
  'dif-coach-game-state',
  'currentTeamId',
  'dif-coach-match-history', 
  'dif-coach-match-events',
  'dif-coach-match-events-backup',
  'dif-coach-match-events-emergency',
  'dif-coach-timer-',
  'sport-wizard-dismissedModals-',
  'pendingInvitation',
  'sport-wizard-navigation-history'
];

/**
 * Check if a localStorage key should be preserved
 */
function shouldPreserveKey(key) {
  return PRESERVED_KEYS.includes(key);
}

/**
 * Check if a localStorage key matches cleanup patterns
 */
function shouldCleanupKey(key) {
  return CLEANUP_PATTERNS.some(pattern => {
    if (pattern.endsWith('-')) {
      // Pattern matching (e.g., 'dif-coach-timer-' matches 'dif-coach-timer-12345')
      return key.startsWith(pattern);
    } else {
      // Exact match
      return key === pattern;
    }
  });
}

/**
 * Clean up localStorage from previous sessions while preserving user preferences
 * This should be called immediately after successful sign-in
 */
export function cleanupPreviousSession() {
  try {
    const keysToRemove = [];
    const allKeys = [];
    const preservedKeys = [];
    const unknownKeys = [];
    
    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      allKeys.push(key);
      
      // Skip preserved keys (user preferences)
      if (shouldPreserveKey(key)) {
        preservedKeys.push(key);
        continue;
      }
      
      // Mark session-specific keys for removal
      if (shouldCleanupKey(key)) {
        keysToRemove.push(key);
      } else {
        unknownKeys.push(key);
      }
    }
    
    
    // Remove the keys (done separately to avoid modifying during iteration)
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key ${key}:`, error);
      }
    });
    
    
    return {
      success: true,
      removedKeys: keysToRemove,
      preservedKeys: PRESERVED_KEYS.filter(key => localStorage.getItem(key) !== null)
    };
    
  } catch (error) {
    console.warn('Failed to clean up localStorage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get information about what would be cleaned up (for debugging)
 */
export function getCleanupInfo() {
  const info = {
    toPreserve: [],
    toCleanup: [],
    unknown: []
  };
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (shouldPreserveKey(key)) {
        info.toPreserve.push(key);
      } else if (shouldCleanupKey(key)) {
        info.toCleanup.push(key);
      } else {
        info.unknown.push(key);
      }
    }
  } catch (error) {
    console.warn('Failed to analyze localStorage:', error);
  }
  
  return info;
}

/**
 * Clear ALL localStorage (for emergency use only)
 */
export function clearAllLocalStorage() {
  try {
    const keyCount = localStorage.length;
    localStorage.clear();
    
    
    return { success: true, clearedKeys: keyCount };
  } catch (error) {
    console.warn('Failed to clear all localStorage:', error);
    return { success: false, error: error.message };
  }
}