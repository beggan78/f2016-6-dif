import { useState, useEffect } from 'react';

export function useTimers(periodDurationMinutes) {
  // Timers
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(periodDurationMinutes * 60);
  const [subTimerSeconds, setSubTimerSeconds] = useState(0);
  const [isPeriodActive, setIsPeriodActive] = useState(false);
  const [matchTimerIntervalId, setMatchTimerIntervalId] = useState(null);
  const [subTimerIntervalId, setSubTimerIntervalId] = useState(null);

  // Timer Effects
  useEffect(() => {
    if (isPeriodActive) {
      const mInterval = setInterval(() => {
        setMatchTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(mInterval);
            // Optionally auto-end period or alert, but prompt says manual end
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setMatchTimerIntervalId(mInterval);

      const sInterval = setInterval(() => {
        setSubTimerSeconds(prev => prev + 1);
      }, 1000);
      setSubTimerIntervalId(sInterval);
    } else {
      if (matchTimerIntervalId) clearInterval(matchTimerIntervalId);
      if (subTimerIntervalId) clearInterval(subTimerIntervalId);
    }
    return () => {
      if (matchTimerIntervalId) clearInterval(matchTimerIntervalId);
      if (subTimerIntervalId) clearInterval(subTimerIntervalId);
    };
  }, [isPeriodActive]);

  // Update timer when period duration changes
  useEffect(() => {
    setMatchTimerSeconds(periodDurationMinutes * 60);
  }, [periodDurationMinutes]);

  const resetSubTimer = () => {
    setSubTimerSeconds(0);
  };

  const startTimers = () => {
    setIsPeriodActive(true);
  };

  const stopTimers = () => {
    setIsPeriodActive(false);
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
  };
}