/**
 * Authentication Constants
 * 
 * Centralized constants for authentication system.
 * Provides single source of truth for validation rules, messages, and configuration.
 */

/**
 * Authentication form field names
 */
export const AUTH_FIELDS = {
  EMAIL: 'email',
  PASSWORD: 'password',
  CONFIRM_PASSWORD: 'confirmPassword',
  NAME: 'name'
};

/**
 * Authentication form types
 */
export const AUTH_FORM_TYPES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  RESET_PASSWORD: 'resetPassword',
  CHANGE_PASSWORD: 'changePassword'
};

/**
 * Authentication operation types
 */
export const AUTH_OPERATIONS = {
  SIGN_IN: 'signin',
  SIGN_UP: 'signup',
  SIGN_OUT: 'signout',
  RESET_PASSWORD: 'resetPassword',
  UPDATE_PASSWORD: 'updatePassword',
  UPDATE_PROFILE: 'updateProfile'
};

/**
 * Authentication states
 */
export const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
  EMAIL_CONFIRMATION_REQUIRED: 'emailConfirmationRequired'
};

/**
 * Modal types for authentication flows
 */
export const AUTH_MODAL_TYPES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  RESET_PASSWORD: 'resetPassword',
  PROFILE_COMPLETION: 'profileCompletion',
  SESSION_EXPIRY: 'sessionExpiry'
};

/**
 * CSS class constants for consistent styling
 */
export const AUTH_STYLES = {
  ERROR_FIELD: 'border-rose-500 focus:ring-rose-400 focus:border-rose-500',
  ERROR_TEXT: 'text-rose-400 text-sm mt-1',
  ERROR_BANNER: 'bg-rose-900/50 border border-rose-600 rounded-lg p-3',
  ERROR_BANNER_TEXT: 'text-rose-200 text-sm',
  SUCCESS_BANNER: 'bg-emerald-900/50 border border-emerald-600 rounded-lg p-3',
  SUCCESS_BANNER_TEXT: 'text-emerald-200 text-sm',
  INFO_BANNER: 'bg-sky-900/50 border border-sky-600 rounded-lg p-4',
  INFO_BANNER_TEXT: 'text-sky-200 text-sm',
  LOADING_BUTTON: 'opacity-50 cursor-not-allowed',
  FORM_CONTAINER: 'space-y-6',
  FORM_FIELDS: 'space-y-4'
};

/**
 * Timing constants for authentication flows
 */
export const AUTH_TIMINGS = {
  ERROR_CLEAR_DELAY: 300, // ms
  SUCCESS_MESSAGE_DURATION: 5000, // ms
  SESSION_WARNING_TIME: 5 * 60 * 1000, // 5 minutes in ms
  SESSION_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes in ms
  OPERATION_TIMEOUT: 10000, // 10 seconds in ms
  DEBOUNCE_DELAY: 300 // ms
};

/**
 * Local storage keys for authentication data
 */
export const AUTH_STORAGE_KEYS = {
  SESSION_DATA: 'dif-coach-session',
  USER_PREFERENCES: 'dif-coach-user-prefs',
  REMEMBER_EMAIL: 'dif-coach-remember-email',
  LAST_LOGIN: 'dif-coach-last-login',
  CURRENT_TEAM_ID: 'currentTeamId'
};

/**
 * Feature flags for authentication features
 */
export const AUTH_FEATURES = {
  EMAIL_CONFIRMATION_REQUIRED: true,
  REMEMBER_EMAIL: true,
  SESSION_MONITORING: true,
  PROFILE_COMPLETION_REQUIRED: true,
  AUTOMATIC_SESSION_REFRESH: true,
  MULTI_TAB_SYNC: true
};

/**
 * API endpoints for authentication (relative to base URL)
 */
export const AUTH_ENDPOINTS = {
  SIGN_IN: '/auth/signin',
  SIGN_UP: '/auth/signup',
  SIGN_OUT: '/auth/signout',
  RESET_PASSWORD: '/auth/reset-password',
  REFRESH_TOKEN: '/auth/refresh',
  VERIFY_EMAIL: '/auth/verify-email'
};

/**
 * Regular expressions for validation
 */
export const AUTH_REGEX = {
  EMAIL: /\S+@\S+\.\S+/,
  PASSWORD_UPPERCASE: /(?=.*[A-Z])/,
  PASSWORD_LOWERCASE: /(?=.*[a-z])/,
  PASSWORD_NUMBER: /(?=.*\d)/,
  PASSWORD_SPECIAL: /(?=.*[!@#$%^&*])/,
  NAME: /^[a-zA-Z\s'-]{2,50}$/
};

/**
 * Validation limits and requirements
 */
export const AUTH_LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000 // 15 minutes
};

/**
 * Default form values
 */
export const AUTH_DEFAULTS = {
  FORM_DATA: {
    [AUTH_FIELDS.EMAIL]: '',
    [AUTH_FIELDS.PASSWORD]: '',
    [AUTH_FIELDS.CONFIRM_PASSWORD]: '',
    [AUTH_FIELDS.NAME]: ''
  },
  FORM_ERRORS: {},
  LOADING: false,
  SUCCESS_MESSAGE: '',
  REMEMBER_EMAIL: false
};

/**
 * Accessibility constants
 */
export const AUTH_A11Y = {
  LABELS: {
    EMAIL: 'Email Address',
    PASSWORD: 'Password',
    CONFIRM_PASSWORD: 'Confirm Password',
    NAME: 'Full Name',
    REMEMBER_EMAIL: 'Remember email address',
    SHOW_PASSWORD: 'Show password',
    HIDE_PASSWORD: 'Hide password'
  },
  DESCRIPTIONS: {
    PASSWORD_REQUIREMENTS: 'Password must be at least 8 characters with uppercase and lowercase letters and numbers',
    EMAIL_FORMAT: 'Enter a valid email address in the format user@example.com',
    REQUIRED_FIELD: 'This field is required',
    OPTIONAL_FIELD: 'This field is optional'
  },
  ARIA_LABELS: {
    LOGIN_FORM: 'Sign in to your account',
    SIGNUP_FORM: 'Create a new account',
    RESET_PASSWORD_FORM: 'Reset your password',
    ERROR_MESSAGE: 'Error message',
    SUCCESS_MESSAGE: 'Success message',
    LOADING_INDICATOR: 'Loading...'
  }
};

/**
 * Event names for authentication system
 */
export const AUTH_EVENTS = {
  SIGN_IN_SUCCESS: 'auth:signin:success',
  SIGN_IN_ERROR: 'auth:signin:error',
  SIGN_UP_SUCCESS: 'auth:signup:success',
  SIGN_UP_ERROR: 'auth:signup:error',
  SIGN_OUT_SUCCESS: 'auth:signout:success',
  SESSION_EXPIRED: 'auth:session:expired',
  PROFILE_UPDATED: 'auth:profile:updated',
  ERROR_CLEARED: 'auth:error:cleared'
};

/**
 * Debug logging configuration
 */
export const AUTH_DEBUG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  LOG_PREFIX: '🔐 AUTH:',
  SENSITIVE_FIELDS: [AUTH_FIELDS.PASSWORD, AUTH_FIELDS.CONFIRM_PASSWORD, 'token', 'refresh_token']
};

/**
 * Configuration for different environments
 */
export const AUTH_CONFIG = {
  development: {
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    DEBUG_ENABLED: true,
    STRICT_VALIDATION: false
  },
  production: {
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
    DEBUG_ENABLED: false,
    STRICT_VALIDATION: true
  },
  test: {
    SESSION_TIMEOUT: 10 * 60 * 1000, // 10 minutes
    DEBUG_ENABLED: false,
    STRICT_VALIDATION: true
  }
};

/**
 * Get environment-specific configuration
 * @returns {Object} Configuration for current environment
 */
export const getAuthConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return AUTH_CONFIG[env] || AUTH_CONFIG.development;
};