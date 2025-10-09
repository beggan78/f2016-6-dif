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
  MATCH_EVENTS_BACKUP: 'sport-wizard-match-events-backup', // Legacy, for cleanup
  MATCH_EVENTS_EMERGENCY: 'sport-wizard-match-events-emergency', // Legacy, for cleanup
  MATCH_HISTORY: 'sport-wizard-match-history',

  // User preferences
  PREFERENCES: 'sport-wizard-preferences',
  AUDIO_PREFERENCES_LEGACY: 'sport-wizard-audio-preferences', // Deprecated, migrated to PREFERENCES
  TACTICAL_PREFERENCES: 'sport-wizard-tactical-preferences',
  TIMELINE_PREFERENCES: 'sport-wizard-timeline-preferences',

  // UI state
  NAVIGATION_HISTORY: 'sport-wizard-navigation-history',
  STATS_FILTERS: 'sport-wizard-stats-filter',
  STATISTICS_ACTIVE_TAB: 'statistics-active-tab',
  DISMISSED_MODALS: 'sport-wizard-dismissed-modals',

  // Team management
  CURRENT_TEAM_ID: 'currentTeamId',
  PENDING_INVITATION: 'pendingInvitation',

  // Cache (Supabase data) - uses different prefix
  CACHE_PREFIX: 'supabase_app_',

  // Session/temporary keys - use with pattern matching (deprecated in favor of specific keys)
  DISMISSED_MODALS_PREFIX: 'sport-wizard-dismissedModals-',
  TIMER_PREFIX: 'sport-wizard-timer-',

  // Session guards
  SESSION_LAST_SIGN_OUT: 'sport-wizard-last-sign-out',

  // Debug/development
  DEBUG_MODE: 'sport-wizard-debug-mode',

  // Internal test keys (used by PersistenceManager and tests)
  STORAGE_TEST: '__storage_test__',
  SIZE_TEST: '__size_test__',
};

/**
 * Keys that should be preserved across session cleanups (user preferences)
 */
export const PRESERVED_STORAGE_KEYS = [
  STORAGE_KEYS.TIMELINE_PREFERENCES,
  STORAGE_KEYS.PREFERENCES,
  STORAGE_KEYS.TACTICAL_PREFERENCES,
];

/**
 * Keys that should be cleaned up on sign-out (session-specific data)
 */
export const SESSION_STORAGE_KEYS = [
  STORAGE_KEYS.GAME_STATE,
  STORAGE_KEYS.TIMER_STATE,
  STORAGE_KEYS.SUBSTITUTION_COUNT,
  STORAGE_KEYS.MATCH_EVENTS,
  STORAGE_KEYS.MATCH_EVENTS_BACKUP,
  STORAGE_KEYS.MATCH_EVENTS_EMERGENCY,
  STORAGE_KEYS.MATCH_HISTORY,
  STORAGE_KEYS.NAVIGATION_HISTORY,
  STORAGE_KEYS.CURRENT_TEAM_ID,
  STORAGE_KEYS.PENDING_INVITATION,
];

/**
 * Prefixes for pattern matching (keys that start with these patterns)
 */
export const SESSION_STORAGE_PREFIXES = [
  STORAGE_KEYS.TIMER_PREFIX,
  STORAGE_KEYS.DISMISSED_MODALS_PREFIX,
];
