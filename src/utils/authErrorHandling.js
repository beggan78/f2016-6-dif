/**
 * Authentication Error Handling Utilities
 * 
 * Centralized error handling functions for authentication components.
 * Provides consistent error message formatting and display logic.
 */

import { VALIDATION_MESSAGES } from './authValidation';

/**
 * Common authentication error messages and their user-friendly versions
 */
export const AUTH_ERROR_MESSAGES = {
  // Supabase auth errors
  'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
  'Email not confirmed': 'Please verify your email with the 6-digit code we sent you.',
  'User already registered': 'An account with this email already exists. Please sign in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  'Signup requires a valid password': 'Please enter a valid password.',
  'Unable to validate email address': 'Please enter a valid email address.',
  'Email address not found': 'No account found with this email address.',
  'Too many requests': 'Too many attempts. Please wait a moment before trying again.',
  'Network request failed': 'Connection error. Please check your internet connection and try again.',
  
  // Generic errors
  'Failed to fetch': 'Connection error. Please check your internet connection and try again.',
  'NetworkError': 'Network error. Please try again.',
  'TypeError': 'An unexpected error occurred. Please try again.',
  
  // Default fallback
  'default': VALIDATION_MESSAGES.general.unexpected
};

/**
 * Formats an authentication error message for display to users
 * @param {string|Error|Object} error - The error to format
 * @returns {string} User-friendly error message
 */
export const formatAuthError = (error) => {
  if (!error) {
    return null;
  }
  
  // Handle different error formats
  let errorMessage = '';
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error.message) {
    errorMessage = error.message;
  } else if (error.error_description) {
    errorMessage = error.error_description;
  } else if (error.msg) {
    errorMessage = error.msg;
  } else {
    errorMessage = 'Unknown error';
  }
  
  // Look for known error patterns and return user-friendly messages
  for (const [pattern, friendlyMessage] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (pattern !== 'default' && errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }
  
  // If no specific pattern matches, return the default message
  return AUTH_ERROR_MESSAGES.default;
};

/**
 * Determines if an error should be displayed to the user
 * Some errors are technical and shouldn't be shown directly
 * @param {string|Error|Object} error - The error to check
 * @returns {boolean} Whether the error should be displayed
 */
export const shouldDisplayError = (error) => {
  if (!error) {
    return false;
  }
  
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  
  // Don't display these technical errors
  const hiddenErrorPatterns = [
    'AbortError',
    'CancelledError',
    'TimeoutError'
  ];
  
  return !hiddenErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Gets the primary error message from multiple possible error sources
 * Prioritizes form errors over auth context errors
 * @param {Object} options - Error sources
 * @param {Object} options.formErrors - Form validation errors
 * @param {string} options.authError - Auth context error
 * @param {string} options.generalError - General form error
 * @returns {string|null} The primary error message to display
 */
export const getPrimaryErrorMessage = ({ formErrors = {}, authError = null, generalError = null }) => {
  // Priority order: general form error > auth context error > first form field error
  
  if (generalError) {
    return formatAuthError(generalError);
  }
  
  if (authError && shouldDisplayError(authError)) {
    return formatAuthError(authError);
  }
  
  // Look for the first form field error (if any)
  const firstFieldError = Object.values(formErrors).find(error => error);
  if (firstFieldError) {
    return firstFieldError;
  }
  
  return null;
};

/**
 * Creates a standardized error object for auth operations
 * @param {string|Error|Object} error - The original error
 * @param {string} operation - The operation that failed (e.g., 'signin', 'signup')
 * @param {Object} context - Additional context about the error
 * @returns {Object} Standardized error object
 */
export const createAuthError = (error, operation = 'auth', context = {}) => {
  const formattedMessage = formatAuthError(error);
  
  return {
    message: formattedMessage,
    originalError: error,
    operation,
    timestamp: new Date().toISOString(),
    shouldDisplay: shouldDisplayError(error),
    context
  };
};

/**
 * Determines the appropriate CSS classes for error display
 * @param {boolean} hasError - Whether there is an error to display
 * @param {string} variant - The error display variant ('inline', 'banner', 'field')
 * @returns {Object} CSS classes for error styling
 */
export const getErrorDisplayClasses = (hasError, variant = 'banner') => {
  const baseClasses = {
    banner: {
      container: hasError ? 'bg-rose-900/50 border border-rose-600 rounded-lg p-3' : 'hidden',
      text: 'text-rose-200 text-sm'
    },
    inline: {
      container: hasError ? 'text-rose-400 text-sm mt-1' : 'hidden',
      text: ''
    },
    field: {
      container: hasError ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : '',
      text: hasError ? 'text-rose-400 text-sm mt-1' : 'hidden'
    }
  };
  
  return baseClasses[variant] || baseClasses.banner;
};

/**
 * Utility to handle async authentication operations with error handling
 * @param {Function} operation - The async operation to execute
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @param {Object} options - Operation options
 * @returns {Promise} The operation result
 */
export const handleAuthOperation = async (operation, onSuccess, onError, options = {}) => {
  const { operationName = 'authentication', timeout = 10000 } = options;
  
  try {
    // Add timeout to prevent hanging operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });
    
    const result = await Promise.race([operation(), timeoutPromise]);
    
    if (result.error) {
      const authError = createAuthError(result.error, operationName);
      onError(authError);
      return result;
    }
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
  } catch (error) {
    const authError = createAuthError(error, operationName);
    onError(authError);
    throw authError;
  }
};

/**
 * Debounced error clearing function to prevent excessive re-renders
 * @param {Function} clearFunction - The function to call to clear errors
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced clear function
 */
export const createDebouncedErrorClear = (clearFunction, delay = 300) => {
  let timeoutId = null;
  
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      clearFunction(...args);
      timeoutId = null;
    }, delay);
  };
};