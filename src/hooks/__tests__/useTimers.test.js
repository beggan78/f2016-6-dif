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

    it('should initialize from localStorage when saved state exists', () => {
      const savedState = {
        matchTimerSeconds: 600,
        subTimerSeconds: 120,
        isPeriodActive: false,
        isSubTimerPaused: false,
        periodStartTime: 999000,
        lastSubTime: 999500,
        pausedSubTime: 0,
        subPauseStartTime: null,
      };
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedState));
      
      const { result } = renderHook(() => useTimers(15));

      // With saved state, the hook should use the saved values
      expect(result.current.matchTimerSeconds).toBe(600);
      expect(result.current.subTimerSeconds).toBe(120);
      expect(result.current.isPeriodActive).toBe(false);
      expect(result.current.isSubTimerPaused).toBe(false);
      expect(result.current.periodStartTime).toBe(999000);
      expect(result.current.lastSubTime).toBe(999500);
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

    it('should not update match timer when period duration changes and period is active', () => {
      const { result, rerender } = renderHook(
        ({ duration }) => useTimers(duration),
        { initialProps: { duration: 15 } }
      );

      // Start the timer
      act(() => {
        result.current.startTimers();
      });

      // Change duration while timer is active
      act(() => {
        rerender({ duration: 20 });
      });

      // Timer should not be updated to new duration when period is active
      // The useEffect checks isPeriodActive and only updates when not active
      expect(result.current.matchTimerSeconds).toBe(900); // Should remain at 15 * 60
    });
  });

  describe('localStorage Persistence', () => {
    it('should save timer state to localStorage when state changes', () => {
      const { result } = renderHook(() => useTimers(15));

      // localStorage should be called on initial render
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Clear previous calls to test the next change
      localStorageMock.setItem.mockClear();

      act(() => {
        result.current.startTimers();
      });

      // Should be called again after state change
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dif-coach-timer-state',
        expect.any(String)
      );
    });

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

    it('should clear timer state from localStorage', () => {
      const { result } = renderHook(() => useTimers(15));

      act(() => {
        result.current.clearTimerState();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dif-coach-timer-state');
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
      expect(result.current.lastSubTime).toBe(1008000);
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
    it('should reset all timers to initial state', () => {
      const { result } = renderHook(() => useTimers(15));

      // Start and modify timers
      act(() => {
        result.current.startTimers();
      });

      Date.now.mockReturnValue(1005000);
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Reset everything
      act(() => {
        result.current.resetAllTimers();
      });

      expect(result.current.matchTimerSeconds).toBe(900);
      expect(result.current.subTimerSeconds).toBe(0);
      expect(result.current.isPeriodActive).toBe(false);
      expect(result.current.isSubTimerPaused).toBe(false);
      expect(result.current.periodStartTime).toBe(null);
      expect(result.current.lastSubTime).toBe(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dif-coach-timer-state');
    });

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

    it('should handle sub timer operations when lastSubTime is null', () => {
      // Ensure clean localStorage for this test
      localStorageMock.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useTimers(15));

      // Initial state should have lastSubTime as null
      expect(result.current.lastSubTime).toBe(null);
      expect(result.current.isSubTimerPaused).toBe(false);

      // Try to pause when lastSubTime is null (period not started)
      act(() => {
        result.current.pauseSubTimer(mockUpdatePlayerStats);
      });

      // Should not pause when lastSubTime is null
      expect(result.current.isSubTimerPaused).toBe(false);
      expect(mockUpdatePlayerStats).not.toHaveBeenCalled();
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
});