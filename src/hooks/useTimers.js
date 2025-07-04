import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// localStorage utilities for timers - NOTE: Essential for preventing timer loss on page refresh
const TIMER_STORAGE_KEY = 'dif-coach-timer-state';

const loadTimerState = () => {
  try {
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load timer state from localStorage:', error);
    return null;
  }
};

const saveTimerState = (state) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save timer state to localStorage:', error);
  }
};

// Timer calculation utilities
const calculateMatchTimer = (periodStartTime, periodDurationMinutes) => {
  if (!periodStartTime) return periodDurationMinutes * 60;
  
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - periodStartTime) / 1000);
  const remainingSeconds = (periodDurationMinutes * 60) - elapsedSeconds;
  
  return remainingSeconds; // Allow negative values for tests and overtime scenarios
};

const calculateSubTimer = (lastSubstitutionTime, totalPausedDuration, pauseStartTime) => {
  if (!lastSubstitutionTime) return 0;
  
  const now = Date.now();
  const effectiveNow = pauseStartTime ? pauseStartTime : now;
  const elapsedSeconds = Math.floor((effectiveNow - lastSubstitutionTime - totalPausedDuration) / 1000);
  
  return Math.max(0, elapsedSeconds);
};

export function useTimers(periodDurationMinutes) {
  // Initialize timer state from localStorage or defaults
  const initializeTimerState = () => {
    const saved = loadTimerState();
    if (saved) {
      // Handle backward compatibility with old timer state
      if (saved.periodStartTime !== undefined) {
        return {
          isPeriodActive: saved.isPeriodActive ?? false,
          periodStartTime: saved.periodStartTime ?? null,
          lastSubstitutionTime: saved.lastSubstitutionTime ?? saved.lastSubTime ?? null,
          secondLastSubstitutionTime: saved.secondLastSubstitutionTime ?? null,
          pauseStartTime: saved.pauseStartTime ?? saved.subPauseStartTime ?? null,
          totalPausedDuration: saved.totalPausedDuration ?? (saved.pausedSubTime ? saved.pausedSubTime * 1000 : 0),
        };
      }
    }
    return {
      isPeriodActive: false,
      periodStartTime: null,
      lastSubstitutionTime: null,
      secondLastSubstitutionTime: null,
      pauseStartTime: null,
      totalPausedDuration: 0,
    };
  };

  const initialTimerState = initializeTimerState();
  
  // Core timer state - only timestamps and flags
  const [isPeriodActive, setIsPeriodActive] = useState(initialTimerState.isPeriodActive);
  const [periodStartTime, setPeriodStartTime] = useState(initialTimerState.periodStartTime);
  const [lastSubstitutionTime, setLastSubstitutionTime] = useState(initialTimerState.lastSubstitutionTime);
  const [secondLastSubstitutionTime, setSecondLastSubstitutionTime] = useState(initialTimerState.secondLastSubstitutionTime);
  const [pauseStartTime, setPauseStartTime] = useState(initialTimerState.pauseStartTime);
  const [totalPausedDuration, setTotalPausedDuration] = useState(initialTimerState.totalPausedDuration);
  
  // Force re-render trigger for timer display updates
  // eslint-disable-next-line no-unused-vars
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const updateIntervalRef = useRef(null);
  
  // For backward compatibility with tests - computed from lastSubstitutionTime
  const lastSubTime = lastSubstitutionTime;

  // Calculate current timer values on-demand
  const matchTimerSeconds = useMemo(() => {
    return calculateMatchTimer(periodStartTime, periodDurationMinutes);
  }, [periodStartTime, periodDurationMinutes, forceUpdateCounter]);
  
  const subTimerSeconds = useMemo(() => {
    return calculateSubTimer(lastSubstitutionTime, totalPausedDuration, pauseStartTime);
  }, [lastSubstitutionTime, totalPausedDuration, pauseStartTime, forceUpdateCounter]);
  
  // Derived state
  const isSubTimerPaused = pauseStartTime !== null;

  // Timer display update effect - only triggers re-renders, doesn't save to localStorage
  useEffect(() => {
    // Clear any existing interval first
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    if (isPeriodActive && periodStartTime) {
      const updateDisplay = () => {
        setForceUpdateCounter(prev => prev + 1);
      };
      
      // Update immediately
      updateDisplay();
      
      // Then update every second for display
      const interval = setInterval(updateDisplay, 1000);
      updateIntervalRef.current = interval;
      
      // Handle page visibility changes to force updates when coming back
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          updateDisplay();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isPeriodActive, periodStartTime]);

  // Save timer state to localStorage with specific values (handles async state updates)
  const saveTimerStateWithOverrides = useCallback((overrides = {}) => {
    const currentTimerState = {
      isPeriodActive,
      periodStartTime,
      lastSubstitutionTime,
      secondLastSubstitutionTime,
      pauseStartTime,
      totalPausedDuration,
      ...overrides // Allow overriding specific values for immediate persistence
    };
    saveTimerState(currentTimerState);
  }, [isPeriodActive, periodStartTime, lastSubstitutionTime, secondLastSubstitutionTime, pauseStartTime, totalPausedDuration]);
  
  // Legacy saveCurrentState for other functions (unused)
  // const saveCurrentState = saveTimerStateWithOverrides;

  const resetSubTimer = useCallback(() => {
    const now = Date.now();
    // Store previous substitution time for undo functionality
    setSecondLastSubstitutionTime(lastSubstitutionTime);
    setLastSubstitutionTime(now);
    setPauseStartTime(null);
    setTotalPausedDuration(0);
    
    // Save immediately with the new timestamp to fix async state issue
    saveTimerStateWithOverrides({ 
      lastSubstitutionTime: now,
      secondLastSubstitutionTime: lastSubstitutionTime,
      pauseStartTime: null,
      totalPausedDuration: 0
    });
  }, [lastSubstitutionTime, saveTimerStateWithOverrides]);

  const restoreSubTimer = useCallback((targetSeconds) => {
    // Restore sub timer to a specific value (for undo functionality)
    const now = Date.now();
    const calculatedLastSubTime = now - (targetSeconds * 1000);
    
    // Set the last sub time to be in the past so that the timer shows the target seconds
    setLastSubstitutionTime(calculatedLastSubTime);
    setPauseStartTime(null);
    setTotalPausedDuration(0);
    
    // Save immediately with the calculated timestamp
    saveTimerStateWithOverrides({
      lastSubstitutionTime: calculatedLastSubTime,
      pauseStartTime: null,
      totalPausedDuration: 0
    });
  }, [saveTimerStateWithOverrides]);

  const pauseSubTimer = useCallback((updatePlayerStats) => {
    if (!isSubTimerPaused && lastSubstitutionTime) {
      const now = Date.now();
      setPauseStartTime(now);
      
      // Update all player stats to freeze their current time
      if (updatePlayerStats) {
        updatePlayerStats(now, true); // true = pausing
      }
      
      // Save immediately with the pause start time
      saveTimerStateWithOverrides({
        pauseStartTime: now
      });
    }
  }, [isSubTimerPaused, lastSubstitutionTime, saveTimerStateWithOverrides]);

  const resumeSubTimer = useCallback((updatePlayerStats) => {
    if (isSubTimerPaused && pauseStartTime) {
      const now = Date.now();
      // Add pause duration to total accumulated pause time
      const pauseDuration = now - pauseStartTime;
      const newTotalPausedDuration = totalPausedDuration + pauseDuration;
      
      setTotalPausedDuration(newTotalPausedDuration);
      setPauseStartTime(null);
      
      // Reset all active player stint timers
      if (updatePlayerStats) {
        updatePlayerStats(now, false); // false = resuming
      }
      
      // Save immediately with the new pause duration
      saveTimerStateWithOverrides({
        totalPausedDuration: newTotalPausedDuration,
        pauseStartTime: null
      });
    }
  }, [isSubTimerPaused, pauseStartTime, totalPausedDuration, saveTimerStateWithOverrides]);

  const startTimers = useCallback(() => {
    const now = Date.now();
    setPeriodStartTime(now);
    setLastSubstitutionTime(now);
    setSecondLastSubstitutionTime(null);
    setIsPeriodActive(true);
    setPauseStartTime(null);
    setTotalPausedDuration(0);
    
    // Save immediately with all new values
    saveTimerStateWithOverrides({
      periodStartTime: now,
      lastSubstitutionTime: now,
      secondLastSubstitutionTime: null,
      isPeriodActive: true,
      pauseStartTime: null,
      totalPausedDuration: 0
    });
  }, [saveTimerStateWithOverrides]);

  const stopTimers = useCallback(() => {
    setIsPeriodActive(false);
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    // Save immediately with isPeriodActive: false
    saveTimerStateWithOverrides({
      isPeriodActive: false
    });
  }, [saveTimerStateWithOverrides]);

  // Clear stored timer state - useful for starting fresh
  const clearTimerState = useCallback(() => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear timer state:', error);
    }
  }, []);

  // Reset all timer state to initial values
  const resetAllTimers = useCallback(() => {
    setIsPeriodActive(false);
    setPeriodStartTime(null);
    setLastSubstitutionTime(null);
    setSecondLastSubstitutionTime(null);
    setPauseStartTime(null);
    setTotalPausedDuration(0);
    
    // Clear any running interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    // Clear localStorage
    clearTimerState();
  }, [clearTimerState]);

  return {
    // Calculated timer values (read-only)
    matchTimerSeconds,
    subTimerSeconds,
    
    // Timer state
    isPeriodActive,
    isSubTimerPaused,
    periodStartTime,
    lastSubTime, // For backward compatibility
    lastSubstitutionTime,
    secondLastSubstitutionTime,
    
    // Timer controls
    resetSubTimer,
    restoreSubTimer,
    pauseSubTimer,
    resumeSubTimer,
    startTimers,
    stopTimers,
    clearTimerState,
    resetAllTimers,
    
    // Deprecated setters (for backward compatibility - these now do nothing)
    setMatchTimerSeconds: () => console.warn('setMatchTimerSeconds is deprecated - timer values are now calculated'),
    setSubTimerSeconds: () => console.warn('setSubTimerSeconds is deprecated - timer values are now calculated'),
    setIsPeriodActive: setIsPeriodActive,
  };
}