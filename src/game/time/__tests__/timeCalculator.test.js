/**
 * Unit tests for pure time calculation functions
 * Tests mathematical time operations with no side effects
 */

import {
  calculateDurationSeconds,
  shouldSkipTimeCalculation,
  isValidTimeRange,
  calculateCurrentStintDuration,
  calculateUndoTimerTarget
} from '../timeCalculator';

describe('timeCalculator', () => {
  describe('calculateDurationSeconds', () => {
    test('should calculate duration correctly for valid time ranges', () => {
      const startTime = 1000; // 1 second
      const endTime = 4000;   // 4 seconds
      
      const duration = calculateDurationSeconds(startTime, endTime);
      
      expect(duration).toBe(3); // 3 seconds difference
    });

    test('should round to nearest integer', () => {
      const startTime = 1000;
      const endTime = 2500; // 1.5 seconds difference
      
      const duration = calculateDurationSeconds(startTime, endTime);
      
      expect(duration).toBe(2); // Rounded from 1.5
    });

    test('should handle same start and end time', () => {
      const sameTime = 1000;
      
      const duration = calculateDurationSeconds(sameTime, sameTime);
      
      expect(duration).toBe(0);
    });

    test('should return 0 for invalid start time', () => {
      expect(calculateDurationSeconds(0, 2000)).toBe(0);
      expect(calculateDurationSeconds(-1000, 2000)).toBe(0);
      expect(calculateDurationSeconds(null, 2000)).toBe(0);
      expect(calculateDurationSeconds(undefined, 2000)).toBe(0);
    });

    test('should return 0 for invalid end time', () => {
      expect(calculateDurationSeconds(1000, 0)).toBe(0);
      expect(calculateDurationSeconds(1000, null)).toBe(0);
      expect(calculateDurationSeconds(1000, undefined)).toBe(0);
    });

    test('should return 0 when end time is before start time', () => {
      const startTime = 2000;
      const endTime = 1000;
      
      const duration = calculateDurationSeconds(startTime, endTime);
      
      expect(duration).toBe(0);
    });

    test('should handle large time differences', () => {
      const startTime = 1000;
      const endTime = 61000; // 60 seconds later
      
      const duration = calculateDurationSeconds(startTime, endTime);
      
      expect(duration).toBe(60);
    });

    test('should handle millisecond precision', () => {
      const startTime = 1000;
      const endTime = 1001; // 1 millisecond later
      
      const duration = calculateDurationSeconds(startTime, endTime);
      
      expect(duration).toBe(0); // Less than 0.5 seconds, rounds to 0
    });

    test('should handle half-second boundaries', () => {
      const startTime = 1000;
      const endTime = 1500; // Exactly 0.5 seconds later
      
      const duration = calculateDurationSeconds(startTime, endTime);
      
      expect(duration).toBe(1); // 0.5 rounds to 1
    });
  });

  describe('shouldSkipTimeCalculation', () => {
    test('should skip when timer is paused', () => {
      const isTimerPaused = true;
      const lastStintStartTime = 1000;
      
      const shouldSkip = shouldSkipTimeCalculation(isTimerPaused, lastStintStartTime);
      
      expect(shouldSkip).toBe(true);
    });

    test('should skip when lastStintStartTime is invalid', () => {
      const isTimerPaused = false;
      
      expect(shouldSkipTimeCalculation(isTimerPaused, 0)).toBe(true);
      expect(shouldSkipTimeCalculation(isTimerPaused, -1)).toBe(true);
      expect(shouldSkipTimeCalculation(isTimerPaused, null)).toBe(true);
      expect(shouldSkipTimeCalculation(isTimerPaused, undefined)).toBe(true);
    });

    test('should not skip when timer is active and lastStintStartTime is valid', () => {
      const isTimerPaused = false;
      const lastStintStartTime = 1000;
      
      const shouldSkip = shouldSkipTimeCalculation(isTimerPaused, lastStintStartTime);
      
      expect(shouldSkip).toBe(false);
    });

    test('should skip when both conditions are true', () => {
      const isTimerPaused = true;
      const lastStintStartTime = 0;
      
      const shouldSkip = shouldSkipTimeCalculation(isTimerPaused, lastStintStartTime);
      
      expect(shouldSkip).toBe(true);
    });

    test('should handle edge case values', () => {
      // Edge case: timer paused but valid stint time
      expect(shouldSkipTimeCalculation(true, 1000)).toBe(true);
      
      // Edge case: timer not paused but invalid stint time
      expect(shouldSkipTimeCalculation(false, 0)).toBe(true);
      
      // Edge case: minimal valid stint time
      expect(shouldSkipTimeCalculation(false, 1)).toBe(false);
    });
  });

  describe('isValidTimeRange', () => {
    test('should validate correct time ranges', () => {
      expect(isValidTimeRange(1000, 2000)).toBe(true);
      expect(isValidTimeRange(1000, 1000)).toBe(true); // Same time is valid
      expect(isValidTimeRange(1, 2)).toBe(true);
    });

    test('should reject invalid start times', () => {
      expect(isValidTimeRange(0, 2000)).toBe(false);
      expect(isValidTimeRange(-1000, 2000)).toBe(false);
    });

    test('should reject end times before start times', () => {
      expect(isValidTimeRange(2000, 1000)).toBe(false);
      expect(isValidTimeRange(1000, 999)).toBe(false);
    });

    test('should handle null and undefined values', () => {
      expect(isValidTimeRange(null, 2000)).toBe(false);
      expect(isValidTimeRange(1000, null)).toBe(false);
      expect(isValidTimeRange(undefined, 2000)).toBe(false);
      expect(isValidTimeRange(1000, undefined)).toBe(false);
      expect(isValidTimeRange(null, null)).toBe(false);
    });

    test('should handle edge cases', () => {
      // Minimal valid times
      expect(isValidTimeRange(1, 1)).toBe(true);
      expect(isValidTimeRange(1, 2)).toBe(true);
      
      // Large time values
      expect(isValidTimeRange(1000000, 2000000)).toBe(true);
    });
  });

  describe('calculateCurrentStintDuration', () => {
    test('should calculate stint duration for valid time range', () => {
      const stintStartTime = 1000;
      const currentTime = 4000;
      
      const duration = calculateCurrentStintDuration(stintStartTime, currentTime);
      
      expect(duration).toBe(3); // 3 seconds
    });

    test('should return 0 for invalid time range', () => {
      expect(calculateCurrentStintDuration(0, 2000)).toBe(0);
      expect(calculateCurrentStintDuration(2000, 1000)).toBe(0);
      expect(calculateCurrentStintDuration(null, 2000)).toBe(0);
      expect(calculateCurrentStintDuration(1000, null)).toBe(0);
    });

    test('should handle same start and current time', () => {
      const sameTime = 1000;
      
      const duration = calculateCurrentStintDuration(sameTime, sameTime);
      
      expect(duration).toBe(0);
    });

    test('should use calculateDurationSeconds internally', () => {
      const stintStartTime = 1000;
      const currentTime = 2500; // 1.5 seconds later
      
      const duration = calculateCurrentStintDuration(stintStartTime, currentTime);
      
      expect(duration).toBe(2); // Should round like calculateDurationSeconds
    });

    test('should handle edge cases consistently with isValidTimeRange', () => {
      // These should all return 0 because they're invalid ranges
      expect(calculateCurrentStintDuration(-1000, 2000)).toBe(0);
      expect(calculateCurrentStintDuration(0, 2000)).toBe(0);
      expect(calculateCurrentStintDuration(2000, 1999)).toBe(0);
    });
  });

  describe('calculateUndoTimerTarget', () => {
    test('should calculate correct target timer value', () => {
      const timerValueAtSubstitution = 120; // 2 minutes
      const substitutionTimestamp = 1000;
      const currentTimestamp = 4000; // 3 seconds later
      
      const targetValue = calculateUndoTimerTarget(
        timerValueAtSubstitution, 
        substitutionTimestamp, 
        currentTimestamp
      );
      
      expect(targetValue).toBe(123); // 120 + 3 seconds
    });

    test('should handle same substitution and current time', () => {
      const timerValueAtSubstitution = 120;
      const sameTime = 1000;
      
      const targetValue = calculateUndoTimerTarget(
        timerValueAtSubstitution, 
        sameTime, 
        sameTime
      );
      
      expect(targetValue).toBe(120); // No time elapsed
    });

    test('should use current Date.now() when no current timestamp provided', () => {
      const timerValueAtSubstitution = 120;
      const substitutionTimestamp = Date.now() - 3000; // 3 seconds ago
      
      const targetValue = calculateUndoTimerTarget(
        timerValueAtSubstitution, 
        substitutionTimestamp
      );
      
      // Should be approximately 123, allowing for small timing differences
      expect(targetValue).toBeGreaterThanOrEqual(122);
      expect(targetValue).toBeLessThanOrEqual(124);
    });

    test('should return original value for invalid substitution timestamp', () => {
      const timerValueAtSubstitution = 120;
      
      expect(calculateUndoTimerTarget(timerValueAtSubstitution, 0)).toBe(120);
      expect(calculateUndoTimerTarget(timerValueAtSubstitution, -1000)).toBe(120);
      expect(calculateUndoTimerTarget(timerValueAtSubstitution, null)).toBe(120);
      expect(calculateUndoTimerTarget(timerValueAtSubstitution, undefined)).toBe(120);
    });

    test('should handle large time differences', () => {
      const timerValueAtSubstitution = 60; // 1 minute
      const substitutionTimestamp = 1000;
      const currentTimestamp = 61000; // 60 seconds later
      
      const targetValue = calculateUndoTimerTarget(
        timerValueAtSubstitution, 
        substitutionTimestamp, 
        currentTimestamp
      );
      
      expect(targetValue).toBe(120); // 60 + 60 seconds
    });

    test('should handle negative timer values', () => {
      const timerValueAtSubstitution = -30; // Overtime
      const substitutionTimestamp = 1000;
      const currentTimestamp = 4000; // 3 seconds later
      
      const targetValue = calculateUndoTimerTarget(
        timerValueAtSubstitution, 
        substitutionTimestamp, 
        currentTimestamp
      );
      
      expect(targetValue).toBe(-27); // -30 + 3 seconds
    });

    test('should handle fractional timer values', () => {
      const timerValueAtSubstitution = 120.7;
      const substitutionTimestamp = 1000;
      const currentTimestamp = 3500; // 2.5 seconds later
      
      const targetValue = calculateUndoTimerTarget(
        timerValueAtSubstitution, 
        substitutionTimestamp, 
        currentTimestamp
      );
      
      expect(targetValue).toBe(123.7); // 120.7 + 3 (2.5 rounded to 3)
    });
  });

  describe('integration tests', () => {
    test('time calculation functions should work together consistently', () => {
      const startTime = 1000;
      const currentTime = 4000;
      
      // These should all agree on the time difference
      const directDuration = calculateDurationSeconds(startTime, currentTime);
      const stintDuration = calculateCurrentStintDuration(startTime, currentTime);
      const isValid = isValidTimeRange(startTime, currentTime);
      const shouldSkip = shouldSkipTimeCalculation(false, startTime);
      
      expect(directDuration).toBe(stintDuration);
      expect(isValid).toBe(true);
      expect(shouldSkip).toBe(false);
    });

    test('invalid time ranges should be consistently handled', () => {
      const invalidStart = 0;
      const validEnd = 2000;
      
      expect(calculateDurationSeconds(invalidStart, validEnd)).toBe(0);
      expect(calculateCurrentStintDuration(invalidStart, validEnd)).toBe(0);
      expect(isValidTimeRange(invalidStart, validEnd)).toBe(false);
      expect(shouldSkipTimeCalculation(false, invalidStart)).toBe(true);
    });

    test('paused timer should skip all calculations', () => {
      const validStart = 1000;
      const validEnd = 2000;
      
      expect(shouldSkipTimeCalculation(true, validStart)).toBe(true);
      expect(isValidTimeRange(validStart, validEnd)).toBe(true); // Still valid range
      
      // When timer is paused, we should skip calculation even if range is valid
      if (!shouldSkipTimeCalculation(true, validStart)) {
        // This should not execute
        expect(calculateCurrentStintDuration(validStart, validEnd)).toBe(1);
      }
    });
  });
});