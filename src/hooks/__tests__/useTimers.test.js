/**
 * useTimers Hook Tests
 * 
 * Comprehensive testing suite for the useTimers hook - a critical piece managing
 * timer persistence, controls, and synchronization across game sessions.
 * 
 * Test Coverage: 30+ tests covering:
 * - Timer initialization and localStorage persistence
 * - Period timer controls (start, stop, duration changes)
 * - Substitution timer controls (reset, restore, pause, resume)
 * - Timer synchronization and real-time updates
 * - Page visibility and refresh handling
 * - State persistence across browser sessions
 * - Integration with player stats updates
 * - Error handling and edge cases
 * - Memory cleanup and interval management
 */

import { renderHook, act } from '@testing-library/react';
import { useTimers } from '../useTimers';

// Mock gameEventLogger functions
jest.mock('../../utils/gameEventLogger', () => ({
  logEvent: jest.fn(),
  EVENT_TYPES: {
    MATCH_START: 'match_start',
    MATCH_END: 'match_end',
    PERIOD_START: 'period_start',
    PERIOD_END: 'period_end',
    TIMER_PAUSED: 'timer_paused',
    TIMER_RESUMED: 'timer_resumed',
    SUBSTITUTION: 'substitution',
    GOALIE_SWITCH: 'goalie_switch'
  },
  calculateMatchTime: jest.fn().mockReturnValue('00:00'),
  initializeEventLogger: jest.fn(),
  clearAllEvents: jest.fn(),
  loadEvents: jest.fn(),
  saveEvents: jest.fn(),
  getMatchEvents: jest.fn().mockReturnValue([]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock console methods to suppress expected warnings during tests
const originalConsoleWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
});

describe('useTimers', () => {
  let mockUpdatePlayerStats;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset gameEventLogger mocks
    const { logEvent, calculateMatchTime } = require('../../utils/gameEventLogger');
    logEvent.mockClear();
    calculateMatchTime.mockReturnValue('00:00');
    
    // Mock setInterval and clearInterval
    jest.useFakeTimers();
    
    // Mock Date.now to have consistent timing
    jest.spyOn(Date, 'now').mockImplementation(() => 1000000); // Fixed timestamp
    
    // Mock updatePlayerStats function
    mockUpdatePlayerStats = jest.fn();
    
    // Mock document visibility API
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });
    
    // Mock addEventListener and removeEventListener
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Timer Initialization', () => {
    it('should initialize with default values when no saved state', () => {
      const { result } = renderHook(() => useTimers(15));

      expect(result.current.matchTimerSeconds).toBe(900); // 15 * 60
      expect(result.current.subTimerSeconds).toBe(0);
      expect(result.current.isPeriodActive).toBe(false);
      expect(result.current.isSubTimerPaused).toBe(false);
      expect(result.current.periodStartTime).toBe(null);
      expect(result.current.lastSubTime).toBe(null);
    });


    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const { result } = renderHook(() => useTimers(20));

      expect(result.current.matchTimerSeconds).toBe(1200); // 20 * 60
      expect(result.current.subTimerSeconds).toBe(0);
      // Note: console.warn is mocked globally, so we can't easily test it here
    });

    it('should handle missing localStorage gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const { result } = renderHook(() => useTimers(10));

      expect(result.current.matchTimerSeconds).toBe(600); // 10 * 60
      // Note: console.warn is mocked globally, so we can't easily test it here
    });

    it('should update match timer when period duration changes and period is inactive', () => {
      const { result, rerender } = renderHook(
        ({ duration }) => useTimers(duration),
        { initialProps: { duration: 15 } }
      );

      expect(result.current.matchTimerSeconds).toBe(900);

      rerender({ duration: 20 });

      expect(result.current.matchTimerSeconds).toBe(1200);
    });

  });

  describe('localStorage Persistence', () => {

    it('should handle localStorage save errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useTimers(15));

      // Should not throw when localStorage fails
      expect(() => {
        act(() => {
          result.current.startTimers();
        });
      }).not.toThrow();
    });


    it('should handle localStorage clear errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useTimers(15));

      // Should not throw when localStorage fails
      expect(() => {
        act(() => {
          result.current.clearTimerState();
        });
      }).not.toThrow();
    });
  });

  describe('Period Timer Controls', () => {
    it('should start timers correctly', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      expect(result.current.isPeriodActive).toBe(true);
      expect(result.current.isSubTimerPaused).toBe(false);
      expect(result.current.periodStartTime).toBe(1000000);
      expect(result.current.lastSubTime).toBe(1000000);
    });

    it('should stop timers correctly', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      act(() => {
        result.current.stopTimers();
      });

      expect(result.current.isPeriodActive).toBe(false);
    });

    it('should update timers at intervals when period is active', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Advance time by 5 seconds
      act(() => {
        Date.now.mockReturnValue(1005000);
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.matchTimerSeconds).toBe(895); // 900 - 5
      expect(result.current.subTimerSeconds).toBe(5);
    });

    it('should clean up interval when component unmounts', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { result, unmount } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    // Regression test for timer display freezing issue
    it('should recalculate timer values when forceUpdateCounter changes', () => {
      const { result } = renderHook(() => useTimers(15));
      
      act(() => {
        result.current.startTimers();
      });

      const initialMatchTimer = result.current.matchTimerSeconds;
      const initialSubTimer = result.current.subTimerSeconds;

      // Advance time and trigger interval callback
      act(() => {
        Date.now.mockReturnValue(1005000); // +5 seconds from initial 1000000
        jest.advanceTimersByTime(1000); // Trigger setInterval callback
      });

      // Verify timer values actually changed (this would fail with the original bug)
      expect(result.current.matchTimerSeconds).not.toBe(initialMatchTimer);
      expect(result.current.subTimerSeconds).not.toBe(initialSubTimer);
      expect(result.current.matchTimerSeconds).toBe(895); // 900 - 5
      expect(result.current.subTimerSeconds).toBe(5);
    });

    // Regression test for infinite interval creation
    it('should not create infinite intervals during updates', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const { result } = renderHook(() => useTimers(15));
      
      act(() => {
        result.current.startTimers();
      });

      const initialCallCount = setIntervalSpy.mock.calls.length;
      
      // Trigger multiple timer updates
      act(() => {
        jest.advanceTimersByTime(3000); // 3 seconds of updates
      });

      // Should not create additional intervals beyond the initial one
      expect(setIntervalSpy.mock.calls.length).toBe(initialCallCount);
      
      setIntervalSpy.mockRestore();
    });

    it('should handle page visibility changes', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Verify visibility change listener was added
      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      // Simulate coming back to the page after time has passed
      const visibilityChangeHandler = document.addEventListener.mock.calls
        .find(call => call[0] === 'visibilitychange')[1];

      act(() => {
        Date.now.mockReturnValue(1010000); // 10 seconds later
        visibilityChangeHandler();
      });

      expect(result.current.matchTimerSeconds).toBe(890); // 900 - 10
    });
  });

  describe('Substitution Timer Controls', () => {
    it('should reset sub timer correctly', () => {
      const { result } = renderHook(() => useTimers(15));

      // Start timers and advance time
      act(() => {
        result.current.startTimers();
      });

      Date.now.mockReturnValue(1005000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Reset sub timer
      Date.now.mockReturnValue(1010000);
      act(() => {
        result.current.resetSubTimer();
      });

      expect(result.current.subTimerSeconds).toBe(0);
      expect(result.current.lastSubTime).toBe(1010000);
      expect(result.current.isSubTimerPaused).toBe(false);
    });

    it('should restore sub timer to specific value', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      act(() => {
        result.current.restoreSubTimer(180); // 3 minutes
      });

      expect(result.current.subTimerSeconds).toBe(180);
      expect(result.current.lastSubTime).toBe(820000); // 1000000 - (180 * 1000)
      expect(result.current.isSubTimerPaused).toBe(false);
    });

    it('should pause sub timer correctly', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Advance time to 5 seconds
      Date.now.mockReturnValue(1005000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Pause the timer
      Date.now.mockReturnValue(1005000);
      act(() => {
        result.current.pauseSubTimer(mockUpdatePlayerStats);
      });

      expect(result.current.isSubTimerPaused).toBe(true);
      expect(result.current.subTimerSeconds).toBe(5);
      expect(mockUpdatePlayerStats).toHaveBeenCalledWith(1005000, true);
    });

    it('should resume sub timer correctly', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Pause and then resume
      Date.now.mockReturnValue(1005000);
      act(() => {
        result.current.pauseSubTimer(mockUpdatePlayerStats);
      });

      Date.now.mockReturnValue(1008000);
      act(() => {
        result.current.resumeSubTimer(mockUpdatePlayerStats);
      });

      expect(result.current.isSubTimerPaused).toBe(false);
      expect(result.current.lastSubTime).toBe(1000000); // Should remain the original substitution time
      expect(mockUpdatePlayerStats).toHaveBeenCalledWith(1008000, false);
    });

    it('should not pause when already paused', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      act(() => {
        result.current.pauseSubTimer(mockUpdatePlayerStats);
      });

      mockUpdatePlayerStats.mockClear();

      act(() => {
        result.current.pauseSubTimer(mockUpdatePlayerStats);
      });

      expect(mockUpdatePlayerStats).not.toHaveBeenCalled();
    });

    it('should not resume when not paused', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      act(() => {
        result.current.resumeSubTimer(mockUpdatePlayerStats);
      });

      expect(mockUpdatePlayerStats).not.toHaveBeenCalled();
    });

    it('should maintain paused time correctly across pause/resume cycles', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Run for 3 seconds
      Date.now.mockReturnValue(1003000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Pause for 2 seconds
      act(() => {
        result.current.pauseSubTimer();
      });

      Date.now.mockReturnValue(1005000); // 2 seconds while paused

      // Resume and run for 2 more seconds
      act(() => {
        result.current.resumeSubTimer();
      });

      Date.now.mockReturnValue(1007000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should show 5 seconds total (3 + 2), ignoring the 2 seconds while paused
      expect(result.current.subTimerSeconds).toBe(5);
    });
  });

  describe('Timer Reset and Cleanup', () => {

    it('should clear intervals on reset', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      act(() => {
        result.current.resetAllTimers();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should remove event listeners on cleanup', () => {
      const { result, unmount } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero period duration', () => {
      const { result } = renderHook(() => useTimers(0));

      expect(result.current.matchTimerSeconds).toBe(0);

      act(() => {
        result.current.startTimers();
      });

      Date.now.mockReturnValue(1001000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.matchTimerSeconds).toBe(-1); // Timer can go negative
    });

    it('should handle negative period duration gracefully', () => {
      const { result } = renderHook(() => useTimers(-5));

      expect(result.current.matchTimerSeconds).toBe(-300); // -5 * 60
    });

    it('should handle very large period duration', () => {
      const { result } = renderHook(() => useTimers(999));

      expect(result.current.matchTimerSeconds).toBe(59940); // 999 * 60
    });

    it('should handle missing updatePlayerStats function in pause/resume', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Should not throw when updatePlayerStats is undefined
      expect(() => {
        act(() => {
          result.current.pauseSubTimer();
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.resumeSubTimer();
        });
      }).not.toThrow();
    });

    it('should handle rapid start/stop cycles', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
        result.current.stopTimers();
        result.current.startTimers();
        result.current.stopTimers();
      });

      expect(result.current.isPeriodActive).toBe(false);
    });

    it('should handle timer updates when period is not active', () => {
      const { result } = renderHook(() => useTimers(15));

      // Timer should not update when period is not active
      Date.now.mockReturnValue(1005000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.matchTimerSeconds).toBe(900); // Should remain unchanged
      expect(result.current.subTimerSeconds).toBe(0);
    });

  });

  describe('Real-time Synchronization', () => {
    it('should maintain accurate timing across multiple intervals', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Simulate multiple timer ticks
      for (let i = 1; i <= 5; i++) {
        Date.now.mockReturnValue(1000000 + (i * 1000));
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(result.current.matchTimerSeconds).toBe(895); // 900 - 5
      expect(result.current.subTimerSeconds).toBe(5);
    });

    it('should handle time jumps (e.g., system clock changes)', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Simulate a large time jump (e.g., 1 hour)
      Date.now.mockReturnValue(1000000 + 3600000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.matchTimerSeconds).toBe(-2700); // Timer went way negative
      expect(result.current.subTimerSeconds).toBe(3600); // 1 hour in seconds
    });

    it('should update correctly after browser tab becomes visible again', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.startTimers();
      });

      // Simulate tab being hidden and time passing
      Date.now.mockReturnValue(1030000); // 30 seconds later

      const visibilityChangeHandler = document.addEventListener.mock.calls
        .find(call => call[0] === 'visibilitychange')[1];

      act(() => {
        visibilityChangeHandler();
      });

      expect(result.current.matchTimerSeconds).toBe(870); // 900 - 30
      expect(result.current.subTimerSeconds).toBe(30);
    });
  });

  describe('Critical Bug Prevention Tests', () => {
    describe('Match Clock Independence', () => {
      it('should keep match timer running when sub timer is paused', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Run for 3 seconds
        Date.now.mockReturnValue(1003000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(result.current.matchTimerSeconds).toBe(897); // 900 - 3
        expect(result.current.subTimerSeconds).toBe(3);

        // Pause sub timer for 2 seconds
        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1005000); // 2 seconds while paused
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // CRITICAL: Match timer should continue running, sub timer should stay at 3
        expect(result.current.matchTimerSeconds).toBe(895); // 900 - 5 (continues running)
        expect(result.current.subTimerSeconds).toBe(3); // Paused at 3

        // Resume and run for 2 more seconds
        act(() => {
          result.current.resumeSubTimer();
        });

        Date.now.mockReturnValue(1007000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Match timer: 7 seconds total, Sub timer: 5 seconds (3 + 2, ignoring pause)
        expect(result.current.matchTimerSeconds).toBe(893); // 900 - 7
        expect(result.current.subTimerSeconds).toBe(5); // 3 + 2 (pause ignored)
      });

      it('should calculate match timer independently of pause state', () => {
        const { result } = renderHook(() => useTimers(10));

        act(() => {
          result.current.startTimers();
        });

        // Pause immediately
        act(() => {
          result.current.pauseSubTimer();
        });

        // Advance time by 30 seconds while paused
        Date.now.mockReturnValue(1030000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Match timer should reflect 30 seconds elapsed regardless of pause
        expect(result.current.matchTimerSeconds).toBe(570); // 600 - 30
        expect(result.current.subTimerSeconds).toBe(0); // Paused at 0
      });

      it('should maintain match timer accuracy across multiple pause/resume cycles', () => {
        const { result } = renderHook(() => useTimers(5));

        act(() => {
          result.current.startTimers();
        });

        // First cycle: run 10s, pause 5s, resume
        Date.now.mockReturnValue(1010000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        
        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1015000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        act(() => {
          result.current.resumeSubTimer();
        });

        // Second cycle: run 10s, pause 5s, resume
        Date.now.mockReturnValue(1025000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1030000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        act(() => {
          result.current.resumeSubTimer();
        });

        // Final run
        Date.now.mockReturnValue(1040000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Match timer should show 40 seconds elapsed total (ignoring all pauses)
        expect(result.current.matchTimerSeconds).toBe(260); // 300 - 40
        // Sub timer should show 30 seconds (10+10+10, ignoring 10 seconds of pause)
        expect(result.current.subTimerSeconds).toBe(30);
      });
    });

    describe('lastSubstitutionTime Persistence', () => {
      it('should persist lastSubstitutionTime immediately after resetSubTimer', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Clear previous calls
        setItemSpy.mockClear();

        // Reset sub timer (this was the bug - timestamp wasn't persisting)
        Date.now.mockReturnValue(1010000);
        act(() => {
          result.current.resetSubTimer();
        });

        // CRITICAL: localStorage should be called immediately with correct timestamp
        expect(setItemSpy).toHaveBeenCalledWith(
          'dif-coach-timer-state',
          expect.stringContaining('"lastSubstitutionTime":1010000')
        );

        setItemSpy.mockRestore();
      });

      it('should handle React async state updates correctly with saveTimerStateWithOverrides', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        setItemSpy.mockClear();

        // Test that immediate persistence works during state transitions
        Date.now.mockReturnValue(1020000);
        act(() => {
          result.current.resetSubTimer();
        });

        // Should save with override values, not stale React state
        const lastCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1];
        const savedState = JSON.parse(lastCall[1]);
        
        expect(savedState.lastSubstitutionTime).toBe(1020000);
        expect(savedState.pauseStartTime).toBe(null);
        expect(savedState.totalPausedDuration).toBe(0);

        setItemSpy.mockRestore();
      });

      it('should persist state immediately during pause operations', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        setItemSpy.mockClear();

        // Pause should save immediately
        Date.now.mockReturnValue(1005000);
        act(() => {
          result.current.pauseSubTimer();
        });

        expect(setItemSpy).toHaveBeenCalledWith(
          'dif-coach-timer-state',
          expect.stringContaining('"pauseStartTime":1005000')
        );

        setItemSpy.mockClear();

        // Resume should save immediately  
        Date.now.mockReturnValue(1010000);
        act(() => {
          result.current.resumeSubTimer();
        });

        expect(setItemSpy).toHaveBeenCalledWith(
          'dif-coach-timer-state',
          expect.stringContaining('"pauseStartTime":null')
        );

        setItemSpy.mockRestore();
      });
    });

    describe('Performance - localStorage Optimization', () => {
      it('should only save to localStorage during meaningful events, not every second', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        setItemSpy.mockClear();

        // Simulate timer running for 10 seconds
        for (let i = 1; i <= 10; i++) {
          Date.now.mockReturnValue(1000000 + (i * 1000));
          act(() => {
            jest.advanceTimersByTime(1000);
          });
        }

        // CRITICAL: No localStorage saves should occur during normal timer updates
        expect(setItemSpy).not.toHaveBeenCalled();

        setItemSpy.mockRestore();
      });

      it('should save to localStorage only during meaningful timer events', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { result } = renderHook(() => useTimers(15));

        setItemSpy.mockClear();

        // These operations should trigger saves
        act(() => {
          result.current.startTimers(); // Should save
        });
        
        expect(setItemSpy).toHaveBeenCalledTimes(1);

        act(() => {
          result.current.pauseSubTimer(); // Should save
        });
        
        expect(setItemSpy).toHaveBeenCalledTimes(2);

        act(() => {
          result.current.resumeSubTimer(); // Should save
        });
        
        expect(setItemSpy).toHaveBeenCalledTimes(3);

        act(() => {
          result.current.resetSubTimer(); // Should save
        });
        
        expect(setItemSpy).toHaveBeenCalledTimes(4);

        setItemSpy.mockRestore();
      });

      it('should not save to localStorage during forceUpdateCounter changes', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        setItemSpy.mockClear();

        // Force multiple timer display updates
        act(() => {
          jest.advanceTimersByTime(5000); // 5 timer ticks
        });

        // Should not trigger any localStorage saves
        expect(setItemSpy).not.toHaveBeenCalled();

        setItemSpy.mockRestore();
      });
    });
  });

  describe('Timestamp Architecture Tests', () => {
    describe('Timestamp Calculation Accuracy', () => {
      it('should calculate timer values accurately from timestamps', () => {
        const { result } = renderHook(() => useTimers(10));

        act(() => {
          result.current.startTimers();
        });

        // Test specific timestamp calculations
        Date.now.mockReturnValue(1015000); // 15 seconds later
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Match timer: 600 - 15 = 585
        expect(result.current.matchTimerSeconds).toBe(585);
        // Sub timer: 15 seconds from start
        expect(result.current.subTimerSeconds).toBe(15);
      });

      it('should handle timestamp-based calculations during restore operations', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Restore to specific value (simulates undo operation)
        Date.now.mockReturnValue(1005000);
        act(() => {
          result.current.restoreSubTimer(120); // 2 minutes
        });

        // Should show exactly 120 seconds
        expect(result.current.subTimerSeconds).toBe(120);
        
        // Advance time by 10 seconds
        Date.now.mockReturnValue(1015000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Should now show 130 seconds
        expect(result.current.subTimerSeconds).toBe(130);
      });

      it('should maintain accuracy with large timestamp values', () => {
        // Test with large timestamp values (year 2030)
        const futureTimestamp = 1893456000000;
        Date.now.mockReturnValue(futureTimestamp);
        
        const { result } = renderHook(() => useTimers(5));

        act(() => {
          result.current.startTimers();
        });

        // Advance by 30 seconds
        Date.now.mockReturnValue(futureTimestamp + 30000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(result.current.matchTimerSeconds).toBe(270); // 300 - 30
        expect(result.current.subTimerSeconds).toBe(30);
      });
    });

    describe('Time Jump Handling', () => {
      it('should handle system clock changes correctly', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Simulate system clock jumping forward by 1 hour
        Date.now.mockReturnValue(1000000 + 3600000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Should handle the large time jump
        expect(result.current.matchTimerSeconds).toBe(-2700); // Negative (overtime)
        expect(result.current.subTimerSeconds).toBe(3600); // 1 hour
      });

      it('should handle backward time changes', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Advance normally first
        Date.now.mockReturnValue(1010000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        expect(result.current.subTimerSeconds).toBe(10);

        // Simulate clock going backward (daylight saving, etc.)
        Date.now.mockReturnValue(1005000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Sub timer should handle negative elapsed time gracefully
        expect(result.current.subTimerSeconds).toBe(5);
      });
    });

    describe('Pause Duration Accumulation', () => {
      it('should accurately accumulate pause durations across multiple cycles', () => {
        const { result } = renderHook(() => useTimers(10));

        act(() => {
          result.current.startTimers();
        });

        // First pause cycle: run 5s, pause 3s, resume
        Date.now.mockReturnValue(1005000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1008000); // 3s pause
        act(() => {
          result.current.resumeSubTimer();
        });

        // Second pause cycle: run 4s, pause 2s, resume  
        Date.now.mockReturnValue(1012000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1014000); // 2s pause
        act(() => {
          result.current.resumeSubTimer();
        });

        // Final run: 3s
        Date.now.mockReturnValue(1017000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Total: 5s + 4s + 3s = 12s (ignoring 5s total pause)
        expect(result.current.subTimerSeconds).toBe(12);
        // Match timer: 17s total (ignoring pauses)
        expect(result.current.matchTimerSeconds).toBe(583); // 600 - 17
      });

      it('should reset pause accumulation on resetSubTimer', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Build up some pause time
        Date.now.mockReturnValue(1005000);
        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1010000);
        act(() => {
          result.current.resumeSubTimer();
        });

        // Now reset - should clear all pause accumulation
        Date.now.mockReturnValue(1015000);
        act(() => {
          result.current.resetSubTimer();
        });

        // Advance time after reset
        Date.now.mockReturnValue(1020000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Should show 5 seconds from reset, not affected by previous pause
        expect(result.current.subTimerSeconds).toBe(5);
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle zero elapsed time correctly', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // No time advance - should show zero
        expect(result.current.subTimerSeconds).toBe(0);
        expect(result.current.matchTimerSeconds).toBe(900);
      });

      it('should handle fractional seconds correctly', () => {
        const { result } = renderHook(() => useTimers(15));

        act(() => {
          result.current.startTimers();
        });

        // Advance by 1.7 seconds
        Date.now.mockReturnValue(1001700);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Should floor to 1 second
        expect(result.current.subTimerSeconds).toBe(1);
        expect(result.current.matchTimerSeconds).toBe(899);
      });

      it('should handle null timestamps gracefully', () => {
        const { result } = renderHook(() => useTimers(15));

        // Don't start timers - timestamps should be null
        expect(result.current.matchTimerSeconds).toBe(900); // Default duration
        expect(result.current.subTimerSeconds).toBe(0); // Default for null timestamp
      });
    });

    describe('Pause-Substitute-Resume Scenarios', () => {
      it('should handle pause → substitute → resume correctly', () => {
        const { result } = renderHook(() => useTimers(15));

        // Start timers
        act(() => {
          result.current.startTimers();
        });

        // Run for 5 seconds
        Date.now.mockReturnValue(1005000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(5);

        // Pause timer
        act(() => {
          result.current.pauseSubTimer();
        });
        expect(result.current.isSubTimerPaused).toBe(true);

        // Wait 5 seconds while paused (timer should stay at 5)
        Date.now.mockReturnValue(1010000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(5); // Should stay frozen

        // Substitute (reset timer but keep pause state)
        act(() => {
          result.current.resetSubTimer();
        });
        expect(result.current.subTimerSeconds).toBe(0); // Timer reset to 0
        expect(result.current.isSubTimerPaused).toBe(true); // Still paused

        // Wait 3 more seconds while paused (timer should stay at 0)
        Date.now.mockReturnValue(1013000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(0); // Should stay at 0

        // Resume timer
        act(() => {
          result.current.resumeSubTimer();
        });
        expect(result.current.isSubTimerPaused).toBe(false);

        // Run for 7 more seconds
        Date.now.mockReturnValue(1020000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(7); // Should count from 0 after resume
      });

      it('should handle pause → substitute → undo → resume correctly', () => {
        const { result } = renderHook(() => useTimers(15));

        // Start timers
        act(() => {
          result.current.startTimers();
        });

        // Run for 8 seconds
        Date.now.mockReturnValue(1008000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(8);

        // Pause timer
        act(() => {
          result.current.pauseSubTimer();
        });
        expect(result.current.isSubTimerPaused).toBe(true);

        // Substitute (reset timer but keep pause state)
        act(() => {
          result.current.resetSubTimer();
        });
        expect(result.current.subTimerSeconds).toBe(0);
        expect(result.current.isSubTimerPaused).toBe(true);

        // Resume first to clear pause state, then test undo
        act(() => {
          result.current.resumeSubTimer();
        });

        // Now undo - restore to 8 seconds 
        Date.now.mockReturnValue(1015000);
        act(() => {
          result.current.restoreSubTimer(8);
        });
        expect(result.current.subTimerSeconds).toBe(8); // Shows 8 seconds

        // Run for 4 more seconds
        Date.now.mockReturnValue(1019000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(12); // 8 + 4
      });

      it('should handle multiple pause-resume cycles with substitutions', () => {
        const { result } = renderHook(() => useTimers(15));

        // Start timers
        act(() => {
          result.current.startTimers();
        });

        // First cycle: run 3s, pause 2s, resume 2s
        Date.now.mockReturnValue(1003000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(3);

        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1005000);
        act(() => {
          result.current.resumeSubTimer();
        });

        Date.now.mockReturnValue(1007000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(5); // 3 + 2 (ignoring 2s pause)

        // Pause again
        act(() => {
          result.current.pauseSubTimer();
        });

        // Substitute during pause
        Date.now.mockReturnValue(1010000);
        act(() => {
          result.current.resetSubTimer();
        });
        expect(result.current.subTimerSeconds).toBe(0);
        expect(result.current.isSubTimerPaused).toBe(true);

        // Resume after substitution
        act(() => {
          result.current.resumeSubTimer();
        });

        // Run for 6 more seconds
        Date.now.mockReturnValue(1016000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        expect(result.current.subTimerSeconds).toBe(6); // Fresh start from substitution
      });

      it('should reset totalPausedDuration to zero during resetSubTimer', () => {
        const { result } = renderHook(() => useTimers(15));

        // Start timers
        act(() => {
          result.current.startTimers();
        });

        // Build up some pause duration
        Date.now.mockReturnValue(1005000);
        act(() => {
          result.current.pauseSubTimer();
        });

        Date.now.mockReturnValue(1010000);
        act(() => {
          result.current.resumeSubTimer();
        });

        // Pause again and substitute
        Date.now.mockReturnValue(1012000);
        act(() => {
          result.current.pauseSubTimer();
        });

        // This should reset totalPausedDuration to 0 regardless of pause state
        act(() => {
          result.current.resetSubTimer();
        });

        // Resume and verify clean slate
        Date.now.mockReturnValue(1015000);
        act(() => {
          result.current.resumeSubTimer();
        });

        Date.now.mockReturnValue(1020000);
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Should show 5 seconds, not affected by previous pause accumulation
        expect(result.current.subTimerSeconds).toBe(5);
      });
    });
  });
});