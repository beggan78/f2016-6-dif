/**
 * Centralized localStorage Keys Registry
 * All localStorage keys used in the application should be defined here
 * to prevent typos and enable easy refactoring
 */

export const STORAGE_KEYS = {
  // Game state
  GAME_STATE: 'sport-wizard-game-state',
  TIMER_STATE: 'sport-wizard-timer-state',
  SUBSTITUTION_COUNT: 'sport-wizard-substitution-count',

  // Match events and history
  MATCH_EVENTS: 'sport-wizard-match-events',
  MATCH_HISTORY: 'sport-wizard-match-history',

  // User preferences
  PREFERENCES: 'sport-wizard-preferences',
  TACTICAL_PREFERENCES: 'sport-wizard-tactical-preferences',
  TIMELINE_PREFERENCES: 'sport-wizard-timeline-preferences',

  // UI state
  NAVIGATION_HISTORY: 'sport-wizard-navigation-history',
  STATS_FILTERS: 'sport-wizard-stats-filter',
  STATISTICS_ACTIVE_TAB: 'sport-wizard-statistics-active-tab', // Updated from 'statistics-active-tab'
  STATISTICS_TIME_RANGE: 'sport-wizard-statistics-time-range',
  DISMISSED_MODALS: 'sport-wizard-dismissed-modals',

  // Authentication
  AUTH_SESSION: 'sport-wizard-session',
  AUTH_USER_PREFERENCES: 'sport-wizard-user-prefs',
  AUTH_REMEMBER_EMAIL: 'sport-wizard-remember-email',
  AUTH_LAST_LOGIN: 'sport-wizard-last-login',

  // Team management
  CURRENT_TEAM_ID: 'sport-wizard-current-team-id', // Updated from 'currentTeamId'
  PENDING_INVITATION: 'sport-wizard-pending-invitation', // Updated from 'pendingInvitation'

  // Cache (Supabase data) - uses different prefix
  CACHE_PREFIX: 'supabase_app_',

  // Session guards
  SESSION_LAST_SIGN_OUT: 'sport-wizard-last-sign-out',

  // Debug/development
  DEBUG_MODE: 'sport-wizard-debug-mode',

  // Internal test keys (used by PersistenceManager and tests)
  STORAGE_TEST: '__storage_test__',
  SIZE_TEST: '__size_test__',
};

/**
 * Deprecated/legacy keys - kept for migration and cleanup purposes only
 * DO NOT use these in new code - they are here for backward compatibility
 */
export const DEPRECATED_KEYS = {
  // Legacy match event storage (replaced by MATCH_EVENTS)
  MATCH_EVENTS_BACKUP: 'sport-wizard-match-events-backup',
  MATCH_EVENTS_EMERGENCY: 'sport-wizard-match-events-emergency',

  // Legacy audio preferences (migrated to PREFERENCES.audio)
  AUDIO_PREFERENCES_LEGACY: 'sport-wizard-audio-preferences',

  // Old naming convention keys (before standardization)
  CURRENT_TEAM_ID_OLD: 'currentTeamId',
  PENDING_INVITATION_OLD: 'pendingInvitation',
  STATISTICS_ACTIVE_TAB_OLD: 'statistics-active-tab',

  // Deprecated prefixes (replaced by specific keys)
  DISMISSED_MODALS_PREFIX: 'sport-wizard-dismissedModals-',
  TIMER_PREFIX: 'sport-wizard-timer-',
};

/**
 * Keys that should be preserved across session cleanups (user preferences)
 */
export const PRESERVED_STORAGE_KEYS = [
  STORAGE_KEYS.TIMELINE_PREFERENCES,
  STORAGE_KEYS.PREFERENCES,
  STORAGE_KEYS.TACTICAL_PREFERENCES,
  STORAGE_KEYS.AUTH_USER_PREFERENCES,
  STORAGE_KEYS.AUTH_REMEMBER_EMAIL,
  STORAGE_KEYS.AUTH_LAST_LOGIN,
];

/**
 * Keys that should be cleaned up on sign-out (session-specific data)
 */
export const SESSION_STORAGE_KEYS = [
  STORAGE_KEYS.GAME_STATE,
  STORAGE_KEYS.TIMER_STATE,
  STORAGE_KEYS.SUBSTITUTION_COUNT,
  STORAGE_KEYS.MATCH_EVENTS,
  STORAGE_KEYS.MATCH_HISTORY,
  STORAGE_KEYS.NAVIGATION_HISTORY,
  STORAGE_KEYS.CURRENT_TEAM_ID,
  STORAGE_KEYS.PENDING_INVITATION,
  STORAGE_KEYS.AUTH_SESSION,
];

/**
 * Prefixes for pattern matching (keys that start with these patterns)
 */
export const SESSION_STORAGE_PREFIXES = [
  DEPRECATED_KEYS.TIMER_PREFIX,
  DEPRECATED_KEYS.DISMISSED_MODALS_PREFIX,
];

/**
 * Migration map for renamed keys
 * Maps old key names to new standardized names
 */
export const KEY_MIGRATIONS = {
  [DEPRECATED_KEYS.CURRENT_TEAM_ID_OLD]: STORAGE_KEYS.CURRENT_TEAM_ID,
  [DEPRECATED_KEYS.PENDING_INVITATION_OLD]: STORAGE_KEYS.PENDING_INVITATION,
  [DEPRECATED_KEYS.STATISTICS_ACTIVE_TAB_OLD]: STORAGE_KEYS.STATISTICS_ACTIVE_TAB,
};

/**
 * Migrate old storage keys to new standardized names
 * Should be called once on app startup
 * @returns {Object} Migration results
 */
export const migrateStorageKeys = () => {
  const results = {
    migrated: [],
    skipped: [],
    errors: []
  };

  try {
    Object.entries(KEY_MIGRATIONS).forEach(([oldKey, newKey]) => {
      try {
        const oldValue = localStorage.getItem(oldKey);

        if (oldValue !== null) {
          // Only migrate if new key doesn't already exist
          const newValue = localStorage.getItem(newKey);
          if (newValue === null) {
            localStorage.setItem(newKey, oldValue);
            localStorage.removeItem(oldKey);
            results.migrated.push({ from: oldKey, to: newKey });
          } else {
            // New key already exists, just remove old key
            localStorage.removeItem(oldKey);
            results.skipped.push({ key: oldKey, reason: 'new_key_exists' });
          }
        }
      } catch (error) {
        results.errors.push({ key: oldKey, error: error.message });
      }
    });
  } catch (error) {
    console.error('Storage key migration failed:', error);
    results.errors.push({ error: error.message });
  }

  return results;
};
