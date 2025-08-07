/**
 * Time utility functions for game timing operations
 * Centralizes timestamp generation and timer-related operations
 */

/**
 * Get current timestamp in milliseconds
 * Centralized replacement for Date.now() calls throughout the application
 * @returns {number} Current timestamp in milliseconds since epoch
 */
export const getCurrentTimestamp = () => Date.now();

/**
 * Check if the substitution timer is currently paused
 * @param {boolean} isSubTimerPaused - Timer pause state
 * @returns {boolean} True if timer is paused, false otherwise
 */
export const isTimerPaused = (isSubTimerPaused) => Boolean(isSubTimerPaused);

/**
 * Get current timestamp only if timer is not paused
 * @param {boolean} isSubTimerPaused - Timer pause state
 * @returns {number|null} Current timestamp if timer is active, null if paused
 */
export const getCurrentTimestampIfActive = (isSubTimerPaused) => {
  return isTimerPaused(isSubTimerPaused) ? null : getCurrentTimestamp();
};

/**
 * Common time tracking parameters for substitution operations
 * @param {boolean} isSubTimerPaused - Timer pause state
 * @returns {Object} Object with currentTimeEpoch and isTimerPaused properties
 */
export const getTimeTrackingParams = (isSubTimerPaused) => ({
  currentTimeEpoch: getCurrentTimestamp(),
  isTimerPaused: isTimerPaused(isSubTimerPaused)
});

/**
 * Timeout constants for various operations
 */
export const TIMEOUT_CONSTANTS = {
  DEFAULT_COMMAND_TIMEOUT: 120000, // 2 minutes
  MAX_COMMAND_TIMEOUT: 600000,     // 10 minutes
  ANIMATION_DELAY: 100,            // Animation timing
  HIGHLIGHT_DURATION: 2000         // Player highlight duration
};

/**
 * Format time duration in seconds to MM:SS format
 * @param {number} seconds - Time duration in seconds
 * @returns {string} Formatted time string (MM:SS)
 */
export const formatTimeMMSS = (seconds) => {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate duration between two timestamps in seconds
 * @param {number} startTime - Start timestamp in milliseconds
 * @param {number} endTime - End timestamp in milliseconds
 * @returns {number} Duration in seconds
 */
export const calculateDurationInSeconds = (startTime, endTime) => {
  return Math.floor((endTime - startTime) / 1000);
};