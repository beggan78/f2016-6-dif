/**
 * Unit tests for stint-based time tracking and player stat integration
 * Tests time allocation by player status and role
 */

import {
  updatePlayerTimeStats,
  startNewStint,
  completeCurrentStint,
  handlePauseResumeTime,
  resetPlayerStintTimer
} from '../stintManager';

import { PLAYER_ROLES, PLAYER_STATUS } from '../../../constants/playerConstants';
import { createMockPlayer, createTimeHelpers } from '../../testUtils';

// Mock the timeCalculator module
jest.mock('../timeCalculator', () => ({
  shouldSkipTimeCalculation: jest.fn(),
  calculateCurrentStintDuration: jest.fn()
}));

import { shouldSkipTimeCalculation, calculateCurrentStintDuration } from '../timeCalculator';

describe('stintManager', () => {
  const timeHelpers = createTimeHelpers();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePlayerTimeStats', () => {
    test('should skip calculation when timer is paused', () => {
      shouldSkipTimeCalculation.mockReturnValue(true);
      
      const player = createMockPlayer('1', {
        stats: {
          timeOnFieldSeconds: 100,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const result = updatePlayerTimeStats(player, timeHelpers.getTimeAfter(5), true);
      
      expect(shouldSkipTimeCalculation).toHaveBeenCalledWith(true, timeHelpers.baseTime);
      expect(result.timeOnFieldSeconds).toBe(100); // Unchanged
      expect(result.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged
    });

    test('should update time stats for field player with defender role', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(5); // 5 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.DEFENDER,
          timeOnFieldSeconds: 100,
          timeAsDefenderSeconds: 60,
          timeAsAttackerSeconds: 40,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(5);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(calculateCurrentStintDuration).toHaveBeenCalledWith(timeHelpers.baseTime, currentTime);
      expect(result.timeOnFieldSeconds).toBe(105); // 100 + 5
      expect(result.timeAsDefenderSeconds).toBe(65); // 60 + 5
      expect(result.timeAsAttackerSeconds).toBe(40); // Unchanged
      expect(result.lastStintStartTimeEpoch).toBe(currentTime);
    });

    test('should update time stats for field player with midfielder role', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(4); // 4 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.MIDFIELDER,
          timeOnFieldSeconds: 80,
          timeAsDefenderSeconds: 30,
          timeAsAttackerSeconds: 25,
          timeAsMidfielderSeconds: 20,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(4);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(calculateCurrentStintDuration).toHaveBeenCalledWith(timeHelpers.baseTime, currentTime);
      expect(result.timeOnFieldSeconds).toBe(84); // 80 + 4
      expect(result.timeAsDefenderSeconds).toBe(30); // Unchanged
      expect(result.timeAsAttackerSeconds).toBe(25); // Unchanged
      expect(result.timeAsMidfielderSeconds).toBe(24); // 20 + 4
      expect(result.lastStintStartTimeEpoch).toBe(currentTime);
    });

    test('should update time stats for field player with attacker role', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(3); // 3 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.ATTACKER,
          timeOnFieldSeconds: 50,
          timeAsDefenderSeconds: 20,
          timeAsAttackerSeconds: 30,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(3);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(result.timeOnFieldSeconds).toBe(53); // 50 + 3
      expect(result.timeAsDefenderSeconds).toBe(20); // Unchanged
      expect(result.timeAsAttackerSeconds).toBe(33); // 30 + 3
      expect(result.lastStintStartTimeEpoch).toBe(currentTime);
    });

    test('should update time stats for substitute player', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(10); // 10 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.SUBSTITUTE,
          currentRole: PLAYER_ROLES.SUBSTITUTE,
          timeAsSubSeconds: 30,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(10);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(result.timeAsSubSeconds).toBe(40); // 30 + 10
      expect(result.lastStintStartTimeEpoch).toBe(currentTime);
    });

    test('should update time stats for goalie player', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(7); // 7 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.GOALIE,
          currentRole: PLAYER_ROLES.GOALIE,
          timeAsGoalieSeconds: 120,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(7);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(result.timeAsGoalieSeconds).toBe(127); // 120 + 7
      expect(result.lastStintStartTimeEpoch).toBe(currentTime);
    });

    test('should handle unknown player status gracefully', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(5);
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: 'unknown_status',
          timeOnFieldSeconds: 100,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(5);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(result.timeOnFieldSeconds).toBe(100); // No time added for unknown status
      expect(result.lastStintStartTimeEpoch).toBe(currentTime); // But stint timer updated
    });

    test('should not update stint timer when calculation is skipped', () => {
      shouldSkipTimeCalculation.mockReturnValue(true);
      
      const player = createMockPlayer('1', {
        stats: {
          timeOnFieldSeconds: 100,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(5);
      const result = updatePlayerTimeStats(player, currentTime, true);
      
      expect(result.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged
    });
  });

  describe('startNewStint', () => {
    test('should update player stint start time', () => {
      const player = createMockPlayer('1', {
        stats: {
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const newTime = timeHelpers.getTimeAfter(10);
      const result = startNewStint(player, newTime);
      
      expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
      expect(result.id).toBe(player.id); // Other properties preserved
      expect(result.name).toBe(player.name);
    });

    test('should preserve all other player properties', () => {
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.DEFENDER,
          timeOnFieldSeconds: 100,
          timeAsDefenderSeconds: 60,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const newTime = timeHelpers.getTimeAfter(5);
      const result = startNewStint(player, newTime);
      
      expect(result.stats.currentStatus).toBe(PLAYER_STATUS.ON_FIELD);
      expect(result.stats.currentRole).toBe(PLAYER_ROLES.DEFENDER);
      expect(result.stats.timeOnFieldSeconds).toBe(100);
      expect(result.stats.timeAsDefenderSeconds).toBe(60);
      expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
    });
  });

  describe('completeCurrentStint', () => {
    test('should update player time stats and preserve structure', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(8); // 8 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.ATTACKER,
          timeOnFieldSeconds: 50,
          timeAsAttackerSeconds: 30,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const currentTime = timeHelpers.getTimeAfter(8);
      const result = completeCurrentStint(player, currentTime, false);
      
      expect(result.id).toBe(player.id);
      expect(result.name).toBe(player.name);
      expect(result.stats.timeOnFieldSeconds).toBe(58); // 50 + 8
      expect(result.stats.timeAsAttackerSeconds).toBe(38); // 30 + 8
      expect(result.stats.lastStintStartTimeEpoch).toBe(currentTime);
    });

    test('should handle paused timer correctly', () => {
      shouldSkipTimeCalculation.mockReturnValue(true);
      
      const player = createMockPlayer('1', {
        stats: {
          timeOnFieldSeconds: 100,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const result = completeCurrentStint(player, timeHelpers.getTimeAfter(5), true);
      
      expect(result.stats.timeOnFieldSeconds).toBe(100); // Unchanged
      expect(result.stats.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged
    });
  });

  describe('handlePauseResumeTime', () => {
    describe('when pausing (isPausing = true)', () => {
      test('should accumulate time without resetting stint timer', () => {
        shouldSkipTimeCalculation.mockReturnValue(false);
        calculateCurrentStintDuration.mockReturnValue(6); // 6 seconds
        
        const player = createMockPlayer('1', {
          stats: {
            currentStatus: PLAYER_STATUS.ON_FIELD,
            currentRole: PLAYER_ROLES.DEFENDER,
            timeOnFieldSeconds: 80,
            timeAsDefenderSeconds: 50,
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const currentTime = timeHelpers.getTimeAfter(6);
        const result = handlePauseResumeTime(player, currentTime, true);
        
        expect(result.stats.timeOnFieldSeconds).toBe(86); // 80 + 6
        expect(result.stats.timeAsDefenderSeconds).toBe(56); // 50 + 6
        expect(result.stats.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged!
      });

      test('should skip accumulation if calculation should be skipped', () => {
        shouldSkipTimeCalculation.mockReturnValue(true);
        
        const player = createMockPlayer('1', {
          stats: {
            timeOnFieldSeconds: 80,
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const result = handlePauseResumeTime(player, timeHelpers.getTimeAfter(6), true);
        
        expect(result.stats.timeOnFieldSeconds).toBe(80); // Unchanged
        expect(result.stats.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged
      });
    });

    describe('when resuming (isPausing = false)', () => {
      test('should reset stint start time for on_field player', () => {
        const player = createMockPlayer('1', {
          stats: {
            currentStatus: 'on_field',
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const newTime = timeHelpers.getTimeAfter(10);
        const result = handlePauseResumeTime(player, newTime, false);
        
        expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
      });

      test('should reset stint start time for substitute player', () => {
        const player = createMockPlayer('1', {
          stats: {
            currentStatus: 'substitute',
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const newTime = timeHelpers.getTimeAfter(10);
        const result = handlePauseResumeTime(player, newTime, false);
        
        expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
      });

      test('should reset stint start time for goalie player', () => {
        const player = createMockPlayer('1', {
          stats: {
            currentStatus: 'goalie',
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const newTime = timeHelpers.getTimeAfter(10);
        const result = handlePauseResumeTime(player, newTime, false);
        
        expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
      });

      test('should not reset stint start time for inactive player', () => {
        const player = createMockPlayer('1', {
          stats: {
            currentStatus: 'inactive',
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const newTime = timeHelpers.getTimeAfter(10);
        const result = handlePauseResumeTime(player, newTime, false);
        
        expect(result.stats.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged
      });

      test('should preserve all other player stats', () => {
        const player = createMockPlayer('1', {
          stats: {
            currentStatus: 'on_field',
            currentRole: PLAYER_ROLES.ATTACKER,
            timeOnFieldSeconds: 120,
            timeAsAttackerSeconds: 80,
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const newTime = timeHelpers.getTimeAfter(15);
        const result = handlePauseResumeTime(player, newTime, false);
        
        expect(result.stats.currentStatus).toBe('on_field');
        expect(result.stats.currentRole).toBe(PLAYER_ROLES.ATTACKER);
        expect(result.stats.timeOnFieldSeconds).toBe(120);
        expect(result.stats.timeAsAttackerSeconds).toBe(80);
        expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
      });
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete stint lifecycle', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(5);
      
      // Start with fresh player
      let player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.DEFENDER,
          timeOnFieldSeconds: 0,
          timeAsDefenderSeconds: 0,
          lastStintStartTimeEpoch: 0
        }
      });
      
      // Start new stint
      const stintStartTime = timeHelpers.baseTime;
      player = startNewStint(player, stintStartTime);
      expect(player.stats.lastStintStartTimeEpoch).toBe(stintStartTime);
      
      // Complete stint
      const stintEndTime = timeHelpers.getTimeAfter(5);
      player = completeCurrentStint(player, stintEndTime, false);
      expect(player.stats.timeOnFieldSeconds).toBe(5);
      expect(player.stats.timeAsDefenderSeconds).toBe(5);
      expect(player.stats.lastStintStartTimeEpoch).toBe(stintEndTime);
    });

    test('should handle pause/resume cycle with time accumulation', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(3);
      
      let player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.ATTACKER,
          timeOnFieldSeconds: 10,
          timeAsAttackerSeconds: 8,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      // Pause - should accumulate time but keep stint timer
      const pauseTime = timeHelpers.getTimeAfter(3);
      player = handlePauseResumeTime(player, pauseTime, true);
      expect(player.stats.timeOnFieldSeconds).toBe(13); // 10 + 3
      expect(player.stats.timeAsAttackerSeconds).toBe(11); // 8 + 3
      expect(player.stats.lastStintStartTimeEpoch).toBe(timeHelpers.baseTime); // Unchanged
      
      // Resume - should reset stint timer
      const resumeTime = timeHelpers.getTimeAfter(10);
      player = handlePauseResumeTime(player, resumeTime, false);
      expect(player.stats.timeOnFieldSeconds).toBe(13); // Unchanged during resume
      expect(player.stats.timeAsAttackerSeconds).toBe(11); // Unchanged during resume
      expect(player.stats.lastStintStartTimeEpoch).toBe(resumeTime); // Reset
    });
  });

  describe('resetPlayerStintTimer', () => {
    test('should reset stint timer without adding time to counters', () => {
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.ATTACKER,
          timeOnFieldSeconds: 50,
          timeAsAttackerSeconds: 30,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const newTime = timeHelpers.getTimeAfter(10);
      const result = resetPlayerStintTimer(player, newTime);
      
      // Time counters should remain unchanged
      expect(result.stats.timeOnFieldSeconds).toBe(50);
      expect(result.stats.timeAsAttackerSeconds).toBe(30);
      expect(result.stats.currentStatus).toBe(PLAYER_STATUS.ON_FIELD);
      expect(result.stats.currentRole).toBe(PLAYER_ROLES.ATTACKER);
      
      // Only stint timer should be updated
      expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
      
      // Player identity should be preserved
      expect(result.id).toBe(player.id);
      expect(result.name).toBe(player.name);
    });

    test('should handle invalid time gracefully', () => {
      const player = createMockPlayer('1', {
        stats: {
          timeOnFieldSeconds: 100,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const result = resetPlayerStintTimer(player, 0); // Invalid time
      
      expect(result.stats.timeOnFieldSeconds).toBe(100); // Unchanged
      expect(result.stats.lastStintStartTimeEpoch).toBeGreaterThan(0); // Fallback time applied
    });

    test('should preserve all player stats except stint timer', () => {
      const player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.SUBSTITUTE,
          currentRole: PLAYER_ROLES.SUBSTITUTE,
          timeOnFieldSeconds: 120,
          timeAsAttackerSeconds: 80,
          timeAsDefenderSeconds: 40,
          timeAsSubSeconds: 60,
          timeAsGoalieSeconds: 0,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const newTime = timeHelpers.getTimeAfter(15);
      const result = resetPlayerStintTimer(player, newTime);
      
      // All time counters should be preserved
      expect(result.stats.timeOnFieldSeconds).toBe(120);
      expect(result.stats.timeAsAttackerSeconds).toBe(80);
      expect(result.stats.timeAsDefenderSeconds).toBe(40);
      expect(result.stats.timeAsSubSeconds).toBe(60);
      expect(result.stats.timeAsGoalieSeconds).toBe(0);
      
      // Status and role should be preserved
      expect(result.stats.currentStatus).toBe(PLAYER_STATUS.SUBSTITUTE);
      expect(result.stats.currentRole).toBe(PLAYER_ROLES.SUBSTITUTE);
      
      // Only stint timer should change
      expect(result.stats.lastStintStartTimeEpoch).toBe(newTime);
    });
  });

  describe('pause-substitute bug scenario', () => {
    test('should not add extra time during pause-substitute sequence', () => {
      // Mock time calculations to simulate real scenario
      shouldSkipTimeCalculation.mockImplementation((isTimerPaused, stintStart) => {
        return isTimerPaused || !stintStart || stintStart <= 0;
      });
      calculateCurrentStintDuration.mockImplementation((start, end) => {
        return Math.round((end - start) / 1000);
      });

      // Start: Player on field for 10 seconds
      let player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.ATTACKER,
          timeOnFieldSeconds: 0,
          timeAsAttackerSeconds: 0,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });

      // Step 1: Timer runs for 10 seconds
      const after10Seconds = timeHelpers.getTimeAfter(10);
      const updatedStats = updatePlayerTimeStats(player, after10Seconds, false);
      player = { ...player, stats: updatedStats };
      expect(player.stats.timeOnFieldSeconds).toBe(10);
      expect(player.stats.timeAsAttackerSeconds).toBe(10);

      // Step 2: Timer pauses (player accumulates time but keeps stint timer)
      const pauseTime = timeHelpers.getTimeAfter(10); // Same time as pause happens immediately
      player = handlePauseResumeTime(player, pauseTime, true);
      expect(player.stats.timeOnFieldSeconds).toBe(10); // Should stay at 10
      expect(player.stats.timeAsAttackerSeconds).toBe(10); // Should stay at 10
      expect(player.stats.lastStintStartTimeEpoch).toBe(after10Seconds); // Should be the updated time from step 1

      // Step 3: 10 seconds pass while paused (no time should accumulate)
      // In real app, this is just time passing, no function calls during pause

      // Step 4: Substitution happens during pause (using new resetPlayerStintTimer)
      const substitutionTime = timeHelpers.getTimeAfter(20); // 10s later during pause
      player = resetPlayerStintTimer(player, substitutionTime);
      
      // CRITICAL: Time should remain at 10 seconds, not jump to 30
      expect(player.stats.timeOnFieldSeconds).toBe(10); // Should stay at 10, NOT 30
      expect(player.stats.timeAsAttackerSeconds).toBe(10); // Should stay at 10, NOT 30
      
      // Stint timer should be reset to substitution time
      expect(player.stats.lastStintStartTimeEpoch).toBe(substitutionTime);
    });

    test('should handle pause-substitute with different timing scenarios', () => {
      shouldSkipTimeCalculation.mockImplementation((isTimerPaused, stintStart) => {
        return isTimerPaused || !stintStart || stintStart <= 0;
      });
      calculateCurrentStintDuration.mockImplementation((start, end) => {
        return Math.round((end - start) / 1000);
      });

      // Scenario: Player has 30 seconds accumulated, timer paused for 5 seconds, then substituted
      let player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.DEFENDER,
          timeOnFieldSeconds: 30,
          timeAsDefenderSeconds: 25,
          timeAsAttackerSeconds: 5,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });

      // Run for 5 more seconds
      const after5Seconds = timeHelpers.getTimeAfter(5);
      const updatedStats = updatePlayerTimeStats(player, after5Seconds, false);
      player = { ...player, stats: updatedStats };
      expect(player.stats.timeOnFieldSeconds).toBe(35);
      expect(player.stats.timeAsDefenderSeconds).toBe(30);

      // Pause
      player = handlePauseResumeTime(player, after5Seconds, true);

      // Substitute after 3 seconds of pause
      const substitutionTime = timeHelpers.getTimeAfter(8); // 3 seconds later
      player = resetPlayerStintTimer(player, substitutionTime);
      
      // Time should remain at pause values, not add the 3 paused seconds
      expect(player.stats.timeOnFieldSeconds).toBe(35); // Should stay at 35
      expect(player.stats.timeAsDefenderSeconds).toBe(30); // Should stay at 30
      expect(player.stats.timeAsAttackerSeconds).toBe(5); // Should stay at 5
    });

    test('should work correctly when timer is not paused during substitution', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(8);

      // Normal substitution without pause
      let player = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.ATTACKER,
          timeOnFieldSeconds: 20,
          timeAsAttackerSeconds: 15,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });

      // Substitute using resetPlayerStintTimer (should not add time)
      const substitutionTime = timeHelpers.getTimeAfter(8);
      player = resetPlayerStintTimer(player, substitutionTime);
      
      // Time should remain unchanged (no additional time added)
      expect(player.stats.timeOnFieldSeconds).toBe(20);
      expect(player.stats.timeAsAttackerSeconds).toBe(15);
      expect(player.stats.lastStintStartTimeEpoch).toBe(substitutionTime);
    });

    test('should demonstrate difference between updatePlayerTimeStats and resetPlayerStintTimer', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(7);

      const basePlayer = createMockPlayer('1', {
        stats: {
          currentStatus: PLAYER_STATUS.ON_FIELD,
          currentRole: PLAYER_ROLES.DEFENDER,
          timeOnFieldSeconds: 15,
          timeAsDefenderSeconds: 10,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });

      const currentTime = timeHelpers.getTimeAfter(7);

      // Test updatePlayerTimeStats (old behavior - adds time)
      const playerWithUpdate = updatePlayerTimeStats(basePlayer, currentTime, false);
      expect(playerWithUpdate.timeOnFieldSeconds).toBe(22); // 15 + 7
      expect(playerWithUpdate.timeAsDefenderSeconds).toBe(17); // 10 + 7

      // Test resetPlayerStintTimer (new behavior - no time added)
      const playerWithReset = resetPlayerStintTimer(basePlayer, currentTime);
      expect(playerWithReset.stats.timeOnFieldSeconds).toBe(15); // unchanged
      expect(playerWithReset.stats.timeAsDefenderSeconds).toBe(10); // unchanged
      expect(playerWithReset.stats.lastStintStartTimeEpoch).toBe(currentTime); // timer reset
    });
  });
});