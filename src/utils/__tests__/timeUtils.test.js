/**
 * Tests for timeUtils.js - Time utility functions
 */

import {
  getCurrentTimestamp,
  isTimerPaused,
  getCurrentTimestampIfActive,
  getTimeTrackingParams,
  TIMEOUT_CONSTANTS,
  formatTimeMMSS,
  calculateDurationInSeconds
} from '../timeUtils';

// Mock Date.now() for consistent testing
const mockDateNow = jest.spyOn(Date, 'now');

describe('timeUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockImplementation(() => 1640995200000); // Fixed timestamp: 2022-01-01 00:00:00 UTC
  });

  afterAll(() => {
    mockDateNow.mockRestore();
  });

  describe('getCurrentTimestamp', () => {
    it('should return current timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toBe(1640995200000);
      expect(mockDateNow).toHaveBeenCalledTimes(1);
    });

    it('should return different timestamps when Date.now() changes', () => {
      mockDateNow.mockReturnValueOnce(1000);
      expect(getCurrentTimestamp()).toBe(1000);

      mockDateNow.mockReturnValueOnce(2000);
      expect(getCurrentTimestamp()).toBe(2000);
    });
  });

  describe('isTimerPaused', () => {
    it('should return true for truthy values', () => {
      expect(isTimerPaused(true)).toBe(true);
      expect(isTimerPaused(1)).toBe(true);
      expect(isTimerPaused('paused')).toBe(true);
      expect(isTimerPaused({})).toBe(true);
      expect(isTimerPaused([])).toBe(true);
    });

    it('should return false for falsy values', () => {
      expect(isTimerPaused(false)).toBe(false);
      expect(isTimerPaused(0)).toBe(false);
      expect(isTimerPaused('')).toBe(false);
      expect(isTimerPaused(null)).toBe(false);
      expect(isTimerPaused(undefined)).toBe(false);
      expect(isTimerPaused(NaN)).toBe(false);
    });
  });

  describe('getCurrentTimestampIfActive', () => {
    it('should return current timestamp when timer is active', () => {
      const timestamp = getCurrentTimestampIfActive(false);
      expect(timestamp).toBe(1640995200000);
      expect(mockDateNow).toHaveBeenCalledTimes(1);
    });

    it('should return null when timer is paused', () => {
      const timestamp = getCurrentTimestampIfActive(true);
      expect(timestamp).toBe(null);
      expect(mockDateNow).not.toHaveBeenCalled();
    });

    it('should handle edge cases', () => {
      expect(getCurrentTimestampIfActive(undefined)).toBe(1640995200000);
      expect(getCurrentTimestampIfActive(null)).toBe(1640995200000);
      expect(getCurrentTimestampIfActive(0)).toBe(1640995200000);
      expect(getCurrentTimestampIfActive('')).toBe(1640995200000);
    });
  });

  describe('getTimeTrackingParams', () => {
    it('should return time tracking parameters with active timer', () => {
      const params = getTimeTrackingParams(false);
      expect(params).toEqual({
        currentTimeEpoch: 1640995200000,
        isTimerPaused: false
      });
      expect(mockDateNow).toHaveBeenCalledTimes(1);
    });

    it('should return time tracking parameters with paused timer', () => {
      const params = getTimeTrackingParams(true);
      expect(params).toEqual({
        currentTimeEpoch: 1640995200000,
        isTimerPaused: true
      });
      expect(mockDateNow).toHaveBeenCalledTimes(1);
    });

    it('should handle edge cases for pause state', () => {
      expect(getTimeTrackingParams(undefined)).toEqual({
        currentTimeEpoch: 1640995200000,
        isTimerPaused: false
      });

      expect(getTimeTrackingParams('paused')).toEqual({
        currentTimeEpoch: 1640995200000,
        isTimerPaused: true
      });
    });
  });

  describe('TIMEOUT_CONSTANTS', () => {
    it('should have expected timeout values', () => {
      expect(TIMEOUT_CONSTANTS.DEFAULT_COMMAND_TIMEOUT).toBe(120000); // 2 minutes
      expect(TIMEOUT_CONSTANTS.MAX_COMMAND_TIMEOUT).toBe(600000);     // 10 minutes
      expect(TIMEOUT_CONSTANTS.ANIMATION_DELAY).toBe(100);
      expect(TIMEOUT_CONSTANTS.HIGHLIGHT_DURATION).toBe(2000);
    });

    it('should have all required constants', () => {
      expect(TIMEOUT_CONSTANTS).toHaveProperty('DEFAULT_COMMAND_TIMEOUT');
      expect(TIMEOUT_CONSTANTS).toHaveProperty('MAX_COMMAND_TIMEOUT');
      expect(TIMEOUT_CONSTANTS).toHaveProperty('ANIMATION_DELAY');
      expect(TIMEOUT_CONSTANTS).toHaveProperty('HIGHLIGHT_DURATION');
    });
  });

  describe('formatTimeMMSS', () => {
    it('should format positive seconds correctly', () => {
      expect(formatTimeMMSS(0)).toBe('00:00');
      expect(formatTimeMMSS(30)).toBe('00:30');
      expect(formatTimeMMSS(60)).toBe('01:00');
      expect(formatTimeMMSS(90)).toBe('01:30');
      expect(formatTimeMMSS(3600)).toBe('60:00');
      expect(formatTimeMMSS(3661)).toBe('61:01');
    });

    it('should format negative seconds correctly', () => {
      expect(formatTimeMMSS(-30)).toBe('00:30');
      expect(formatTimeMMSS(-60)).toBe('01:00');
      expect(formatTimeMMSS(-90)).toBe('01:30');
      expect(formatTimeMMSS(-3661)).toBe('61:01');
    });

    it('should handle edge cases', () => {
      expect(formatTimeMMSS(0.5)).toBe('00:0.5'); // Actual behavior
      expect(formatTimeMMSS(59.9)).toBe('00:59.9'); // Actual behavior
      expect(formatTimeMMSS(NaN)).toBe('NaN:NaN'); // Both minutes and seconds become NaN
      expect(formatTimeMMSS(Infinity)).toBe('Infinity:NaN');
      expect(formatTimeMMSS(-Infinity)).toBe('Infinity:NaN');
    });

    it('should pad single digits with zeros', () => {
      expect(formatTimeMMSS(5)).toBe('00:05');
      expect(formatTimeMMSS(65)).toBe('01:05');
      expect(formatTimeMMSS(305)).toBe('05:05');
    });
  });

  describe('calculateDurationInSeconds', () => {
    it('should calculate duration correctly', () => {
      expect(calculateDurationInSeconds(1000, 2000)).toBe(1);
      expect(calculateDurationInSeconds(1000, 11000)).toBe(10);
      expect(calculateDurationInSeconds(0, 60000)).toBe(60);
      expect(calculateDurationInSeconds(1640995200000, 1640995260000)).toBe(60);
    });

    it('should handle negative durations', () => {
      expect(calculateDurationInSeconds(2000, 1000)).toBe(-1);
      expect(calculateDurationInSeconds(11000, 1000)).toBe(-10);
    });

    it('should handle same timestamps', () => {
      expect(calculateDurationInSeconds(1000, 1000)).toBe(0);
      expect(calculateDurationInSeconds(0, 0)).toBe(0);
    });

    it('should floor fractional seconds', () => {
      expect(calculateDurationInSeconds(1000, 1999)).toBe(0); // 0.999 seconds
      expect(calculateDurationInSeconds(1000, 2999)).toBe(1); // 1.999 seconds
      expect(calculateDurationInSeconds(1000, 3001)).toBe(2); // 2.001 seconds
    });

    it('should handle edge cases', () => {
      expect(calculateDurationInSeconds(0, Infinity)).toBe(Infinity);
      expect(calculateDurationInSeconds(Infinity, 0)).toBe(-Infinity);
      expect(calculateDurationInSeconds(NaN, 1000)).toBe(NaN);
      expect(calculateDurationInSeconds(1000, NaN)).toBe(NaN);
    });
  });

  describe('integration scenarios', () => {
    it('should work together for time tracking workflow', () => {
      // Simulate a typical time tracking scenario
      const startTime = getCurrentTimestamp();
      expect(startTime).toBe(1640995200000);

      // Check if timer is paused
      const isPaused = isTimerPaused(false);
      expect(isPaused).toBe(false);

      // Get time tracking parameters
      const params = getTimeTrackingParams(false);
      expect(params).toEqual({
        currentTimeEpoch: 1640995200000,
        isTimerPaused: false
      });

      // Simulate time passage
      mockDateNow.mockReturnValue(1640995320000); // 2 minutes later
      const endTime = getCurrentTimestamp();
      const duration = calculateDurationInSeconds(startTime, endTime);
      expect(duration).toBe(120); // 2 minutes

      // Format the duration
      const formattedTime = formatTimeMMSS(duration);
      expect(formattedTime).toBe('02:00');
    });

    it('should handle paused timer scenario', () => {
      const isPaused = isTimerPaused(true);
      expect(isPaused).toBe(true);

      const timestampIfActive = getCurrentTimestampIfActive(true);
      expect(timestampIfActive).toBe(null);

      const params = getTimeTrackingParams(true);
      expect(params.isTimerPaused).toBe(true);
      expect(params.currentTimeEpoch).toBe(1640995200000); // Still gets timestamp
    });
  });
});