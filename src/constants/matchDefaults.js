/**
 * Default values for match configuration
 * Centralized constants to avoid magic strings throughout the codebase
 */

// Match configuration defaults
export const MATCH_DEFAULTS = {
  FORMAT: '5v5',
  FORMATION: '2-2',
  PERIODS: 3,
  PERIOD_DURATION_MINUTES: 15,
  MATCH_TYPE: 'league',
  MIN_PLAYERS_REQUIRED: 5
};

// Database state defaults
export const MATCH_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  FINISHED: 'finished',
  CONFIRMED: 'confirmed'
};

// UI display defaults
export const UI_DEFAULTS = {
  UNKNOWN_OPPONENT: 'Unknown Opponent',
  UNKNOWN_DATE: 'Unknown date',
  DEFAULT_SUBSTITUTION_LABEL: 'Individual'
};

// Error message constants for user-friendly display
export const ERROR_MESSAGES = {
  MATCH_ID_REQUIRED: 'Match ID is required',
  MATCH_NOT_FOUND: 'Pending match not found or not accessible',
  INSUFFICIENT_PLAYERS: 'Not enough available players to resume match (minimum 5 required)',
  DATABASE_ERROR: 'Unable to access match data. Please try again.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  NETWORK_ERROR: 'Network connection error. Please check your connection and try again.'
};

// Success message constants
export const SUCCESS_MESSAGES = {
  MATCH_RESUMED: 'Match resumed successfully! Configure any final settings and click "Enter Game".',
  MATCH_DELETED: 'Pending match deleted successfully',
  MATCH_SAVED: 'Match successfully saved to history!'
};