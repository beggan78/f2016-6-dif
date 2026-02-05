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

/**
 * OTP Timestamp Management
 * Tracks when OTP codes are sent to provide client-side expiry checking
 */

/**
 * Store timestamp when OTP was sent
 * Storage key format: 'sport-wizard-otp-sent-{email}'
 * @param {string} email - Email address that received the OTP
 * @returns {boolean} True if timestamp was stored successfully, false otherwise
 */
export const setOtpSentTime = (email) => {
  if (!email) return false;

  try {
    const timestamp = getCurrentTimestamp();
    const key = `sport-wizard-otp-sent-${email.toLowerCase().trim()}`;
    localStorage.setItem(key, timestamp.toString());
    return true;
  } catch (error) {
    console.warn('Failed to store OTP sent time:', error);
    return false;
  }
};

/**
 * Check if OTP has expired (> 59 minutes old)
 * Uses 59-minute threshold (1-minute buffer before server-side 60-minute expiry)
 * @param {string} email - Email address to check OTP expiry for
 * @returns {Object} Object with expiry status:
 *   - isExpired {boolean} - Whether OTP is older than 59 minutes
 *   - minutesRemaining {number} - Minutes until expiry (0 if expired)
 *   - sentTime {number|null} - Original timestamp when OTP was sent (null if not found)
 */
export const checkOtpExpiry = (email) => {
  if (!email) {
    return { isExpired: false, minutesRemaining: 60, sentTime: null };
  }

  try {
    const key = `sport-wizard-otp-sent-${email.toLowerCase().trim()}`;
    const storedTime = localStorage.getItem(key);

    if (!storedTime) {
      // No timestamp - graceful degradation: treat as non-expired
      return { isExpired: false, minutesRemaining: 60, sentTime: null };
    }

    const sentTime = parseInt(storedTime, 10);
    if (isNaN(sentTime)) {
      return { isExpired: false, minutesRemaining: 60, sentTime: null };
    }

    const now = getCurrentTimestamp();
    const ageInMinutes = Math.floor((now - sentTime) / 1000 / 60);
    const minutesRemaining = Math.max(0, 59 - ageInMinutes);
    const isExpired = ageInMinutes >= 59;

    return { isExpired, minutesRemaining, sentTime };
  } catch (error) {
    console.warn('Failed to check OTP expiry:', error);
    return { isExpired: false, minutesRemaining: 60, sentTime: null };
  }
};

/**
 * Clear OTP timestamp (call on successful verification)
 * @param {string} email - Email address to clear OTP timestamp for
 * @returns {boolean} True if timestamp was cleared successfully, false otherwise
 */
export const clearOtpSentTime = (email) => {
  if (!email) return false;
  try {
    const key = `sport-wizard-otp-sent-${email.toLowerCase().trim()}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('Failed to clear OTP sent time:', error);
    return false;
  }
};