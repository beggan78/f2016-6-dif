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
        periodStartTime: saved.periodStartTime ?? null,
        lastSubTime: saved.lastSubTime ?? null,
      };
    }
    return {
      matchTimerSeconds: periodDurationMinutes * 60,
      subTimerSeconds: 0,
      isPeriodActive: false,
      periodStartTime: null,
      lastSubTime: null,
    };
  };

  const initialTimerState = initializeTimerState();
  
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(initialTimerState.matchTimerSeconds);
  const [subTimerSeconds, setSubTimerSeconds] = useState(initialTimerState.subTimerSeconds);
  const [isPeriodActive, setIsPeriodActive] = useState(initialTimerState.isPeriodActive);
  const [periodStartTime, setPeriodStartTime] = useState(initialTimerState.periodStartTime);
  const [lastSubTime, setLastSubTime] = useState(initialTimerState.lastSubTime);
  const [updateIntervalId, setUpdateIntervalId] = useState(null);

  // Timer Effects
  useEffect(() => {
    if (isPeriodActive && periodStartTime) {
      const updateTimers = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - periodStartTime) / 1000);
        const remainingSeconds = Math.max(0, (periodDurationMinutes * 60) - elapsedSeconds);
        
        setMatchTimerSeconds(remainingSeconds);
        
        if (lastSubTime) {
          const subElapsedSeconds = Math.floor((now - lastSubTime) / 1000);
          setSubTimerSeconds(subElapsedSeconds);
        }
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
  }, [isPeriodActive, periodStartTime, lastSubTime, periodDurationMinutes]); // NOTE: updateIntervalId removed from deps to prevent infinite loop

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
      periodStartTime,
      lastSubTime,
    };
    saveTimerState(currentTimerState);
  }, [matchTimerSeconds, subTimerSeconds, isPeriodActive, periodStartTime, lastSubTime]);

  const resetSubTimer = () => {
    setLastSubTime(Date.now());
    setSubTimerSeconds(0);
  };

  const startTimers = () => {
    const now = Date.now();
    setPeriodStartTime(now);
    setLastSubTime(now);
    setIsPeriodActive(true);
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

  return {
    matchTimerSeconds,
    setMatchTimerSeconds,
    subTimerSeconds,
    setSubTimerSeconds,
    isPeriodActive,
    setIsPeriodActive,
    resetSubTimer,
    startTimers,
    stopTimers,
    periodStartTime,
    lastSubTime,
    clearTimerState,
  };
}