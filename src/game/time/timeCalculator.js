/**
 * Pure time calculation functions with no side effects
 * These functions handle raw mathematical time operations
 */

/**
 * Calculate duration in seconds between two epoch timestamps
 * @param {number} startTimeEpoch - Start time in milliseconds since epoch
 * @param {number} endTimeEpoch - End time in milliseconds since epoch
 * @returns {number} Duration in seconds, rounded to nearest integer
 */
export const calculateDurationSeconds = (startTimeEpoch, endTimeEpoch) => {
  if (!startTimeEpoch || startTimeEpoch <= 0 || !endTimeEpoch || endTimeEpoch < startTimeEpoch) {
    return 0;
  }
  return Math.round((endTimeEpoch - startTimeEpoch) / 1000);
};

/**
 * Check if time calculation should be skipped
 * @param {boolean} isTimerPaused - Whether the timer is currently paused
 * @param {number} lastStintStartTimeEpoch - When the current stint started
 * @returns {boolean} True if time calculation should be skipped
 */
export const shouldSkipTimeCalculation = (isTimerPaused, lastStintStartTimeEpoch) => {
  return isTimerPaused || !lastStintStartTimeEpoch || lastStintStartTimeEpoch <= 0;
};

/**
 * Validate that a time range is valid
 * @param {number} startTimeEpoch - Start time in milliseconds since epoch
 * @param {number} endTimeEpoch - End time in milliseconds since epoch
 * @returns {boolean} True if the time range is valid
 */
export const isValidTimeRange = (startTimeEpoch, endTimeEpoch) => {
  return startTimeEpoch > 0 && endTimeEpoch >= startTimeEpoch;
};

/**
 * Calculate the time elapsed in the current stint
 * @param {number} lastStintStartTimeEpoch - When the current stint started
 * @param {number} currentTimeEpoch - Current time
 * @returns {number} Time elapsed in seconds, or 0 if invalid
 */
export const calculateCurrentStintDuration = (lastStintStartTimeEpoch, currentTimeEpoch) => {
  if (!isValidTimeRange(lastStintStartTimeEpoch, currentTimeEpoch)) {
    return 0;
  }
  return calculateDurationSeconds(lastStintStartTimeEpoch, currentTimeEpoch);
};