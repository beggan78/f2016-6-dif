import { useState, useEffect } from 'react';

export function useTimers(periodDurationMinutes) {
  // Timers
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(periodDurationMinutes * 60);
  const [subTimerSeconds, setSubTimerSeconds] = useState(0);
  const [isPeriodActive, setIsPeriodActive] = useState(false);
  const [periodStartTime, setPeriodStartTime] = useState(null);
  const [lastSubTime, setLastSubTime] = useState(null);
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
  }, [isPeriodActive, periodStartTime, lastSubTime, periodDurationMinutes, updateIntervalId]);

  // Update timer when period duration changes
  useEffect(() => {
    if (!isPeriodActive) {
      setMatchTimerSeconds(periodDurationMinutes * 60);
    }
  }, [periodDurationMinutes, isPeriodActive]);

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
  };
}