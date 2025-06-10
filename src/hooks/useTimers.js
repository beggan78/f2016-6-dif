import { useState, useEffect } from 'react';

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

export function useTimers(periodDurationMinutes) {
  // Initialize timer state from localStorage or defaults
  const initializeTimerState = () => {
    const saved = loadTimerState();
    if (saved) {
      return {
        matchTimerSeconds: saved.matchTimerSeconds ?? (periodDurationMinutes * 60),
        subTimerSeconds: saved.subTimerSeconds ?? 0,
        isPeriodActive: saved.isPeriodActive ?? false,
        isSubTimerPaused: saved.isSubTimerPaused ?? false,
        periodStartTime: saved.periodStartTime ?? null,
        lastSubTime: saved.lastSubTime ?? null,
        pausedSubTime: saved.pausedSubTime ?? 0, // Accumulated time before pause
        subPauseStartTime: saved.subPauseStartTime ?? null,
      };
    }
    return {
      matchTimerSeconds: periodDurationMinutes * 60,
      subTimerSeconds: 0,
      isPeriodActive: false,
      isSubTimerPaused: false,
      periodStartTime: null,
      lastSubTime: null,
      pausedSubTime: 0,
      subPauseStartTime: null,
    };
  };

  const initialTimerState = initializeTimerState();
  
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(initialTimerState.matchTimerSeconds);
  const [subTimerSeconds, setSubTimerSeconds] = useState(initialTimerState.subTimerSeconds);
  const [isPeriodActive, setIsPeriodActive] = useState(initialTimerState.isPeriodActive);
  const [isSubTimerPaused, setIsSubTimerPaused] = useState(initialTimerState.isSubTimerPaused);
  const [periodStartTime, setPeriodStartTime] = useState(initialTimerState.periodStartTime);
  const [lastSubTime, setLastSubTime] = useState(initialTimerState.lastSubTime);
  const [pausedSubTime, setPausedSubTime] = useState(initialTimerState.pausedSubTime);
  const [subPauseStartTime, setSubPauseStartTime] = useState(initialTimerState.subPauseStartTime);
  const [updateIntervalId, setUpdateIntervalId] = useState(null);

  // Timer Effects
  useEffect(() => {
    if (isPeriodActive && periodStartTime) {
      const updateTimers = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - periodStartTime) / 1000);
        const remainingSeconds = (periodDurationMinutes * 60) - elapsedSeconds;
        
        setMatchTimerSeconds(remainingSeconds);
        
        if (lastSubTime && !isSubTimerPaused) {
          // Normal running: calculate from last sub time + any accumulated paused time
          const subElapsedSeconds = Math.floor((now - lastSubTime) / 1000) + pausedSubTime;
          setSubTimerSeconds(subElapsedSeconds);
        }
        // When paused, don't update the timer - it should stay at the value when paused
        // The pauseSubTimer function will handle setting the correct paused time
      };
      
      // Update immediately
      updateTimers();
      
      // Then update every second
      const interval = setInterval(updateTimers, 1000);
      setUpdateIntervalId(interval);
      
      // Handle page visibility changes to force updates when coming back
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          updateTimers();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      if (updateIntervalId) {
        clearInterval(updateIntervalId);
        setUpdateIntervalId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeriodActive, periodStartTime, lastSubTime, periodDurationMinutes, isSubTimerPaused, pausedSubTime, subPauseStartTime]); // NOTE: updateIntervalId removed from deps to prevent infinite loop

  // Update timer when period duration changes
  useEffect(() => {
    if (!isPeriodActive) {
      setMatchTimerSeconds(periodDurationMinutes * 60);
    }
  }, [periodDurationMinutes, isPeriodActive]);

  // Save timer state to localStorage whenever it changes - NOTE: Critical for refresh persistence
  useEffect(() => {
    const currentTimerState = {
      matchTimerSeconds,
      subTimerSeconds,
      isPeriodActive,
      isSubTimerPaused,
      periodStartTime,
      lastSubTime,
      pausedSubTime,
      subPauseStartTime,
    };
    saveTimerState(currentTimerState);
  }, [matchTimerSeconds, subTimerSeconds, isPeriodActive, isSubTimerPaused, periodStartTime, lastSubTime, pausedSubTime, subPauseStartTime]);

  const resetSubTimer = () => {
    setLastSubTime(Date.now());
    setSubTimerSeconds(0);
    setPausedSubTime(0);
    setIsSubTimerPaused(false);
    setSubPauseStartTime(null);
  };

  const pauseSubTimer = (updatePlayerStats) => {
    if (!isSubTimerPaused && lastSubTime) {
      const now = Date.now();
      // Calculate and accumulate the time that passed since last sub or resume
      const additionalTime = Math.floor((now - lastSubTime) / 1000);
      const totalTime = pausedSubTime + additionalTime;
      setPausedSubTime(totalTime);
      setSubTimerSeconds(totalTime); // Set the timer to show the correct paused time
      setSubPauseStartTime(now);
      setIsSubTimerPaused(true);
      
      // Update all player stats to freeze their current time
      if (updatePlayerStats) {
        updatePlayerStats(now, true); // true = pausing
      }
    }
  };

  const resumeSubTimer = (updatePlayerStats) => {
    if (isSubTimerPaused) {
      const now = Date.now();
      setLastSubTime(now);
      setIsSubTimerPaused(false);
      setSubPauseStartTime(null);
      
      // Reset all active player stint timers
      if (updatePlayerStats) {
        updatePlayerStats(now, false); // false = resuming
      }
    }
  };

  const startTimers = () => {
    const now = Date.now();
    setPeriodStartTime(now);
    setLastSubTime(now);
    setIsPeriodActive(true);
    setIsSubTimerPaused(false);
    setPausedSubTime(0);
    setSubPauseStartTime(null);
  };

  const stopTimers = () => {
    setIsPeriodActive(false);
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      setUpdateIntervalId(null);
    }
  };

  // Clear stored timer state - useful for starting fresh
  const clearTimerState = () => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear timer state:', error);
    }
  };

  // Reset all timer state to initial values
  const resetAllTimers = () => {
    setMatchTimerSeconds(periodDurationMinutes * 60);
    setSubTimerSeconds(0);
    setIsPeriodActive(false);
    setIsSubTimerPaused(false);
    setPeriodStartTime(null);
    setLastSubTime(null);
    setPausedSubTime(0);
    setSubPauseStartTime(null);
    
    // Clear any running interval
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      setUpdateIntervalId(null);
    }
    
    // Clear localStorage
    clearTimerState();
  };

  return {
    matchTimerSeconds,
    setMatchTimerSeconds,
    subTimerSeconds,
    setSubTimerSeconds,
    isPeriodActive,
    setIsPeriodActive,
    isSubTimerPaused,
    resetSubTimer,
    pauseSubTimer,
    resumeSubTimer,
    startTimers,
    stopTimers,
    periodStartTime,
    lastSubTime,
    clearTimerState,
    resetAllTimers,
  };
}