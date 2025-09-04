/**
 * Error formatting utilities for consistent user-friendly error messages
 * across the pending match resume feature
 */

import { ERROR_MESSAGES } from '../constants/matchDefaults';
import { isNetworkError } from './validationHelpers';

/**
 * Formats database errors into user-friendly messages
 * @param {object|Error} error - Database error object
 * @returns {string} User-friendly error message
 */
export const formatDatabaseError = (error) => {
  if (!error) return ERROR_MESSAGES.UNEXPECTED_ERROR;

  // Handle specific Supabase error codes
  if (error.code === 'PGRST116') {
    return ERROR_MESSAGES.MATCH_NOT_FOUND;
  }

  // Handle permission errors
  if (error.message?.includes('permission denied')) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }

  // Handle network errors
  if (isNetworkError(error)) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Handle other database errors generically
  if (error.message) {
    // Log technical error for debugging but return user-friendly message
    console.error('Database error details:', error.message);
    return ERROR_MESSAGES.DATABASE_ERROR;
  }

  return ERROR_MESSAGES.UNEXPECTED_ERROR;
};

/**
 * Formats validation errors into user-friendly messages
 * @param {string[]} issues - Array of validation issues
 * @returns {string} Formatted error message
 */
export const formatValidationError = (issues) => {
  if (!Array.isArray(issues) || issues.length === 0) {
    return ERROR_MESSAGES.UNEXPECTED_ERROR;
  }

  // For single issue, return it directly (they should already be user-friendly)
  if (issues.length === 1) {
    return issues[0];
  }

  // For multiple issues, format as list
  return `Multiple issues found:\n• ${issues.join('\n• ')}`;
};

/**
 * Formats service operation errors consistently
 * @param {string} operation - Operation being performed (e.g., 'loading match data')
 * @param {object|Error} error - Error that occurred
 * @returns {{success: false, error: string}} Formatted service error response
 */
export const formatServiceError = (operation, error) => {
  let errorMessage;

  if (isNetworkError(error)) {
    errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
  } else if (error?.code || error?.message) {
    errorMessage = formatDatabaseError(error);
  } else {
    errorMessage = ERROR_MESSAGES.UNEXPECTED_ERROR;
  }

  // Log technical details for debugging
  console.error(`❌ Failed ${operation}:`, error);

  return {
    success: false,
    error: errorMessage
  };
};

/**
 * Creates a consistent error object for service responses
 * @param {string} userMessage - User-friendly error message
 * @param {object|Error} [technicalError] - Technical error for logging
 * @param {string} [operation] - Operation context for logging
 * @returns {{success: false, error: string}} Service error response
 */
export const createServiceError = (userMessage, technicalError, operation) => {
  // Log technical details if provided
  if (technicalError && operation) {
    console.error(`❌ ${operation}:`, technicalError);
  }

  return {
    success: false,
    error: userMessage
  };
};

/**
 * Wraps async operations with consistent error handling
 * @param {Function} asyncFn - Async function to execute
 * @param {string} operation - Description of operation for logging
 * @returns {Promise<{success: boolean, error?: string, data?: any}>} Wrapped result
 */
export const withErrorHandling = async (asyncFn, operation) => {
  try {
    const result = await asyncFn();
    return { success: true, data: result };
  } catch (error) {
    return formatServiceError(operation, error);
  }
};