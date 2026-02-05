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
  calculateDurationInSeconds,
  setOtpSentTime,
  checkOtpExpiry,
  clearOtpSentTime
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

  describe('OTP Timestamp Management', () => {
    const testEmail = 'test@example.com';
    const testEmail2 = 'another@example.com';

    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
      jest.clearAllMocks();
      mockDateNow.mockImplementation(() => 1640995200000); // Fixed timestamp: 2022-01-01 00:00:00 UTC
    });

    afterEach(() => {
      localStorage.clear();
    });

    describe('setOtpSentTime', () => {
      it('should store timestamp for email', () => {
        const result = setOtpSentTime(testEmail);
        expect(result).toBe(true);

        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640995200000');
      });

      it('should normalize email to lowercase', () => {
        setOtpSentTime('TEST@EXAMPLE.COM');

        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640995200000');
      });

      it('should trim whitespace from email', () => {
        setOtpSentTime('  test@example.com  ');

        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640995200000');
      });

      it('should return false for empty email', () => {
        expect(setOtpSentTime('')).toBe(false);
        expect(setOtpSentTime(null)).toBe(false);
        expect(setOtpSentTime(undefined)).toBe(false);
      });

      it('should handle localStorage errors gracefully', () => {
        // Mock localStorage.setItem to throw error
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

        const result = setOtpSentTime(testEmail);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to store OTP sent time:', expect.any(Error));

        consoleWarnSpy.mockRestore();
        setItemSpy.mockRestore();
      });

      it('should overwrite existing timestamp', () => {
        setOtpSentTime(testEmail);
        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBe('1640995200000');

        mockDateNow.mockReturnValue(1640995260000); // 1 minute later
        setOtpSentTime(testEmail);
        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBe('1640995260000');
      });

      it('should store timestamps for multiple emails independently', () => {
        setOtpSentTime(testEmail);
        mockDateNow.mockReturnValue(1640995260000);
        setOtpSentTime(testEmail2);

        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBe('1640995200000');
        expect(localStorage.getItem('sport-wizard-otp-sent-another@example.com')).toBe('1640995260000');
      });
    });

    describe('checkOtpExpiry', () => {
      it('should return non-expired status for fresh OTP', () => {
        setOtpSentTime(testEmail);

        const result = checkOtpExpiry(testEmail);
        expect(result).toEqual({
          isExpired: false,
          minutesRemaining: 59,
          sentTime: 1640995200000
        });
      });

      it('should calculate correct minutes remaining', () => {
        setOtpSentTime(testEmail);

        // 30 minutes later
        mockDateNow.mockReturnValue(1640995200000 + (30 * 60 * 1000));
        const result = checkOtpExpiry(testEmail);

        expect(result).toEqual({
          isExpired: false,
          minutesRemaining: 29,
          sentTime: 1640995200000
        });
      });

      it('should mark as expired after 59 minutes', () => {
        setOtpSentTime(testEmail);

        // 59 minutes later
        mockDateNow.mockReturnValue(1640995200000 + (59 * 60 * 1000));
        const result = checkOtpExpiry(testEmail);

        expect(result).toEqual({
          isExpired: true,
          minutesRemaining: 0,
          sentTime: 1640995200000
        });
      });

      it('should mark as expired after 60+ minutes', () => {
        setOtpSentTime(testEmail);

        // 90 minutes later
        mockDateNow.mockReturnValue(1640995200000 + (90 * 60 * 1000));
        const result = checkOtpExpiry(testEmail);

        expect(result).toEqual({
          isExpired: true,
          minutesRemaining: 0,
          sentTime: 1640995200000
        });
      });

      it('should return non-expired when no timestamp found', () => {
        const result = checkOtpExpiry(testEmail);

        expect(result).toEqual({
          isExpired: false,
          minutesRemaining: 60,
          sentTime: null
        });
      });

      it('should return non-expired for empty email', () => {
        expect(checkOtpExpiry('')).toEqual({
          isExpired: false,
          minutesRemaining: 60,
          sentTime: null
        });

        expect(checkOtpExpiry(null)).toEqual({
          isExpired: false,
          minutesRemaining: 60,
          sentTime: null
        });

        expect(checkOtpExpiry(undefined)).toEqual({
          isExpired: false,
          minutesRemaining: 60,
          sentTime: null
        });
      });

      it('should handle corrupted timestamp data', () => {
        localStorage.setItem('sport-wizard-otp-sent-test@example.com', 'not-a-number');

        const result = checkOtpExpiry(testEmail);
        expect(result).toEqual({
          isExpired: false,
          minutesRemaining: 60,
          sentTime: null
        });
      });

      it('should handle localStorage errors gracefully', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const result = checkOtpExpiry(testEmail);

        expect(result).toEqual({
          isExpired: false,
          minutesRemaining: 60,
          sentTime: null
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to check OTP expiry:', expect.any(Error));

        consoleWarnSpy.mockRestore();
        getItemSpy.mockRestore();
      });

      it('should normalize email when checking', () => {
        setOtpSentTime('test@example.com');

        // Check with uppercase
        const result1 = checkOtpExpiry('TEST@EXAMPLE.COM');
        expect(result1.sentTime).toBe(1640995200000);

        // Check with whitespace
        const result2 = checkOtpExpiry('  test@example.com  ');
        expect(result2.sentTime).toBe(1640995200000);
      });

      it('should handle timestamps at exact expiry boundary', () => {
        setOtpSentTime(testEmail);

        // Exactly 58 minutes 59.999 seconds later (rounds down to 58 minutes)
        mockDateNow.mockReturnValue(1640995200000 + (58 * 60 * 1000) + 59999);
        const result = checkOtpExpiry(testEmail);

        expect(result.isExpired).toBe(false);
        expect(result.minutesRemaining).toBe(1);
      });
    });

    describe('clearOtpSentTime', () => {
      it('should remove timestamp for email', () => {
        setOtpSentTime(testEmail);
        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBeTruthy();

        const result = clearOtpSentTime(testEmail);
        expect(result).toBe(true);
        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBeNull();
      });

      it('should normalize email when clearing', () => {
        setOtpSentTime('test@example.com');

        clearOtpSentTime('TEST@EXAMPLE.COM');
        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBeNull();
      });

      it('should return false for empty email', () => {
        expect(clearOtpSentTime('')).toBe(false);
        expect(clearOtpSentTime(null)).toBe(false);
        expect(clearOtpSentTime(undefined)).toBe(false);
      });

      it('should handle localStorage errors gracefully', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const result = clearOtpSentTime(testEmail);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to clear OTP sent time:', expect.any(Error));

        consoleWarnSpy.mockRestore();
        removeItemSpy.mockRestore();
      });

      it('should not affect other email timestamps', () => {
        setOtpSentTime(testEmail);
        setOtpSentTime(testEmail2);

        clearOtpSentTime(testEmail);

        expect(localStorage.getItem('sport-wizard-otp-sent-test@example.com')).toBeNull();
        expect(localStorage.getItem('sport-wizard-otp-sent-another@example.com')).toBeTruthy();
      });

      it('should return true even if timestamp does not exist', () => {
        const result = clearOtpSentTime(testEmail);
        expect(result).toBe(true);
      });
    });

    describe('setOtpSentTime with server timestamp', () => {
      it('should use server timestamp when provided as ISO string', () => {
        const isoString = '2022-01-01T01:00:00.000Z'; // 1 hour after mock time
        const result = setOtpSentTime(testEmail, isoString);

        expect(result).toBe(true);
        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640998800000'); // Converted to milliseconds
      });

      it('should use server timestamp when provided as milliseconds', () => {
        const timestamp = 1640998800000;
        const result = setOtpSentTime(testEmail, timestamp);

        expect(result).toBe(true);
        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640998800000');
      });

      it('should fall back to client time for invalid ISO string', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = setOtpSentTime(testEmail, 'invalid-date');

        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid server timestamp, falling back to client time:',
          'invalid-date'
        );
        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640995200000'); // Falls back to Date.now()

        consoleWarnSpy.mockRestore();
      });

      it('should fall back to client time for null server timestamp', () => {
        const result = setOtpSentTime(testEmail, null);

        expect(result).toBe(true);
        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640995200000'); // Falls back to Date.now()
      });

      it('should fall back to client time for unknown format', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = setOtpSentTime(testEmail, { unexpected: 'object' });

        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Unknown timestamp format, falling back to client time:',
          { unexpected: 'object' }
        );

        consoleWarnSpy.mockRestore();
      });

      it('should prefer server timestamp over client time', () => {
        // Server time is 2 hours ahead of client time
        const serverTime = '2022-01-01T02:00:00.000Z';
        mockDateNow.mockReturnValue(1640995200000); // Client: 2022-01-01T00:00:00Z

        setOtpSentTime(testEmail, serverTime);

        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1641002400000'); // Server time, not client time
      });

      it('should work with existing single-parameter calls (backward compatibility)', () => {
        const result = setOtpSentTime(testEmail);

        expect(result).toBe(true);
        const stored = localStorage.getItem('sport-wizard-otp-sent-test@example.com');
        expect(stored).toBe('1640995200000');
      });
    });

    describe('OTP workflow integration', () => {
      it('should handle complete OTP lifecycle', () => {
        // 1. User signs up - OTP sent
        setOtpSentTime(testEmail);

        // 2. Check immediately - should not be expired
        let status = checkOtpExpiry(testEmail);
        expect(status.isExpired).toBe(false);
        expect(status.minutesRemaining).toBe(59);

        // 3. Wait 30 minutes
        mockDateNow.mockReturnValue(1640995200000 + (30 * 60 * 1000));
        status = checkOtpExpiry(testEmail);
        expect(status.isExpired).toBe(false);
        expect(status.minutesRemaining).toBe(29);

        // 4. Wait until expired (60 minutes total)
        mockDateNow.mockReturnValue(1640995200000 + (60 * 60 * 1000));
        status = checkOtpExpiry(testEmail);
        expect(status.isExpired).toBe(true);
        expect(status.minutesRemaining).toBe(0);

        // 5. User requests new OTP
        setOtpSentTime(testEmail);
        status = checkOtpExpiry(testEmail);
        expect(status.isExpired).toBe(false);
        expect(status.minutesRemaining).toBe(59);

        // 6. User successfully verifies
        clearOtpSentTime(testEmail);
        status = checkOtpExpiry(testEmail);
        expect(status.sentTime).toBeNull();
      });

      it('should handle multiple users independently', () => {
        // User 1 signs up
        setOtpSentTime(testEmail);

        // 30 minutes later, User 2 signs up
        mockDateNow.mockReturnValue(1640995200000 + (30 * 60 * 1000));
        setOtpSentTime(testEmail2);

        // Check both users
        const status1 = checkOtpExpiry(testEmail);
        const status2 = checkOtpExpiry(testEmail2);

        expect(status1.minutesRemaining).toBe(29); // User 1: 30 minutes old
        expect(status2.minutesRemaining).toBe(59); // User 2: Just sent

        // User 1 verifies
        clearOtpSentTime(testEmail);

        // User 2's timestamp unaffected
        const status2After = checkOtpExpiry(testEmail2);
        expect(status2After.sentTime).toBe(1640995200000 + (30 * 60 * 1000));
      });
    });
  });
});