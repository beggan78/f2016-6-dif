/**
 * Unit tests for stint-based time tracking and player stat integration
 * Tests time allocation by player status and role
 */

import {
  updatePlayerTimeStats,
  startNewStint,
  completeCurrentStint,
  handlePauseResumeTime
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
          currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
          currentPeriodRole: PLAYER_ROLES.DEFENDER,
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

    test('should update time stats for field player with attacker role', () => {
      shouldSkipTimeCalculation.mockReturnValue(false);
      calculateCurrentStintDuration.mockReturnValue(3); // 3 seconds
      
      const player = createMockPlayer('1', {
        stats: {
          currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
          currentPeriodRole: PLAYER_ROLES.ATTACKER,
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
          currentPeriodStatus: PLAYER_STATUS.SUBSTITUTE,
          currentPeriodRole: PLAYER_ROLES.SUBSTITUTE,
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
          currentPeriodStatus: PLAYER_STATUS.GOALIE,
          currentPeriodRole: PLAYER_ROLES.GOALIE,
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
          currentPeriodStatus: 'unknown_status',
          timeOnFieldSeconds: 100,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const currentTime = timeHelpers.getTimeAfter(5);
      const result = updatePlayerTimeStats(player, currentTime, false);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown player status: unknown_status');
      expect(result.timeOnFieldSeconds).toBe(100); // No time added for unknown status
      expect(result.lastStintStartTimeEpoch).toBe(currentTime); // But stint timer updated
      
      consoleWarnSpy.mockRestore();
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
          currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
          currentPeriodRole: PLAYER_ROLES.DEFENDER,
          timeOnFieldSeconds: 100,
          timeAsDefenderSeconds: 60,
          lastStintStartTimeEpoch: timeHelpers.baseTime
        }
      });
      
      const newTime = timeHelpers.getTimeAfter(5);
      const result = startNewStint(player, newTime);
      
      expect(result.stats.currentPeriodStatus).toBe(PLAYER_STATUS.ON_FIELD);
      expect(result.stats.currentPeriodRole).toBe(PLAYER_ROLES.DEFENDER);
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
          currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
          currentPeriodRole: PLAYER_ROLES.ATTACKER,
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
            currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
            currentPeriodRole: PLAYER_ROLES.DEFENDER,
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
            currentPeriodStatus: 'on_field',
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
            currentPeriodStatus: 'substitute',
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
            currentPeriodStatus: 'goalie',
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
            currentPeriodStatus: 'inactive',
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
            currentPeriodStatus: 'on_field',
            currentPeriodRole: PLAYER_ROLES.ATTACKER,
            timeOnFieldSeconds: 120,
            timeAsAttackerSeconds: 80,
            lastStintStartTimeEpoch: timeHelpers.baseTime
          }
        });
        
        const newTime = timeHelpers.getTimeAfter(15);
        const result = handlePauseResumeTime(player, newTime, false);
        
        expect(result.stats.currentPeriodStatus).toBe('on_field');
        expect(result.stats.currentPeriodRole).toBe(PLAYER_ROLES.ATTACKER);
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
          currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
          currentPeriodRole: PLAYER_ROLES.DEFENDER,
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
          currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
          currentPeriodRole: PLAYER_ROLES.ATTACKER,
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
});