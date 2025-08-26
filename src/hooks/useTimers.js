import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logEvent, EVENT_TYPES, calculateMatchTime } from '../utils/gameEventLogger';
import { ErrorRecovery } from '../utils/errorHandler';

// localStorage utilities for timers - NOTE: Essential for preventing timer loss on page refresh
const TIMER_STORAGE_KEY = 'dif-coach-timer-state';

const loadTimerState = () => {
  return ErrorRecovery.safeLocalStorage.get(TIMER_STORAGE_KEY, null);
};

const saveTimerState = (state) => {
  return ErrorRecovery.safeLocalStorage.set(TIMER_STORAGE_KEY, state);
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

export function useTimers(periodDurationMinutes, alertMinutes = 0, playAlertSounds = null, currentPeriodNumber = 1) {
  // Initialize timer state from localStorage or defaults
  const initializeTimerState = () => {
    const saved = loadTimerState();
    if (saved) {
      return {
        isPeriodActive: saved.isPeriodActive ?? false,
        periodStartTime: saved.periodStartTime ?? null,
        lastSubstitutionTime: saved.lastSubstitutionTime ?? null,
        secondLastSubstitutionTime: saved.secondLastSubstitutionTime ?? null,
        pauseStartTime: saved.pauseStartTime ?? null,
        totalPausedDuration: saved.totalPausedDuration ?? 0,
      };
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
  
  // Audio alert state management to prevent duplicate plays
  const lastAlertTimeRef = useRef(null);
  const [hasPlayedAlert, setHasPlayedAlert] = useState(false);
  

  // Calculate current timer values on-demand
  // forceUpdateCounter is intentionally included to trigger recalculation via setInterval for real-time timer updates
  const matchTimerSeconds = useMemo(() => {
    return calculateMatchTimer(periodStartTime, periodDurationMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- forceUpdateCounter intentionally triggers timer recalculation
  }, [periodStartTime, periodDurationMinutes, forceUpdateCounter]);
  
  // forceUpdateCounter is intentionally included to trigger recalculation via setInterval for real-time timer updates
  const subTimerSeconds = useMemo(() => {
    return calculateSubTimer(lastSubstitutionTime, totalPausedDuration, pauseStartTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- forceUpdateCounter intentionally triggers timer recalculation
  }, [lastSubstitutionTime, totalPausedDuration, pauseStartTime, forceUpdateCounter]);
  
  // Derived state
  const isSubTimerPaused = pauseStartTime !== null;
  
  // Audio alert logic - triggers when sub timer reaches alert threshold
  useEffect(() => {
    if (alertMinutes > 0 && playAlertSounds && subTimerSeconds >= alertMinutes * 60) {
      const currentAlertTime = Math.floor(subTimerSeconds / 60); // Convert to minutes
      
      // Only play alert once when crossing the threshold, and prevent duplicate plays
      if (lastAlertTimeRef.current !== currentAlertTime && !hasPlayedAlert) {
        lastAlertTimeRef.current = currentAlertTime;
        setHasPlayedAlert(true);
        
        // Trigger audio and vibration alerts
        playAlertSounds();
      }
    } else if (subTimerSeconds < alertMinutes * 60) {
      // Reset alert state when timer goes below threshold (after substitution)
      if (hasPlayedAlert) {
        setHasPlayedAlert(false);
        lastAlertTimeRef.current = null;
      }
    }
  }, [subTimerSeconds, alertMinutes, playAlertSounds, hasPlayedAlert]);

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
    setTotalPausedDuration(0);
    const newStartPauseTime = isSubTimerPaused ? now : null;
    setPauseStartTime(newStartPauseTime);
    // No additional state changes needed - pause state is preserved by design

    // Save immediately with the new timestamp to fix async state issue
    saveTimerStateWithOverrides({ 
      lastSubstitutionTime: now,
      secondLastSubstitutionTime: lastSubstitutionTime,
      totalPausedDuration: 0,
      pauseStartTime: newStartPauseTime
    });
  }, [lastSubstitutionTime, isSubTimerPaused, saveTimerStateWithOverrides]);

  const restoreSubTimer = useCallback((targetSeconds) => {
    // Restore sub timer to a specific value (for undo functionality)
    const now = Date.now();
    const calculatedLastSubTime = now - (targetSeconds * 1000);
    
    // Set the last sub time to be in the past so that the timer shows the target seconds
    setLastSubstitutionTime(calculatedLastSubTime);
    setTotalPausedDuration(0);
//    setPauseStartTime(null);

    // Save immediately with the calculated timestamp
    saveTimerStateWithOverrides({
      lastSubstitutionTime: calculatedLastSubTime,
      totalPausedDuration: 0
//      pauseStartTime: null,
    });
  }, [saveTimerStateWithOverrides]);

  const pauseSubTimer = useCallback((updatePlayerStats) => {
    if (!isSubTimerPaused && lastSubstitutionTime) {
      const now = Date.now();
      
      try {
        // Log pause event with timer state information
        logEvent(EVENT_TYPES.TIMER_PAUSED, {
          pauseType: 'substitution',
          currentMatchTime: calculateMatchTime(now),
          periodNumber: currentPeriodNumber || 1,
          subTimerSeconds: calculateSubTimer(lastSubstitutionTime, totalPausedDuration, null),
          matchTimerSeconds: calculateMatchTimer(periodStartTime, periodDurationMinutes),
          pauseReason: 'substitution_pause',
          timerState: {
            beforePause: {
              isPaused: false,
              lastSubstitutionTime,
              totalPausedDuration,
              pauseStartTime: null
            }
          }
        });
      } catch (error) {
        console.error('Error logging timer pause event:', error);
      }
      
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
  }, [isSubTimerPaused, lastSubstitutionTime, saveTimerStateWithOverrides, totalPausedDuration, periodStartTime, periodDurationMinutes, currentPeriodNumber]);

  const resumeSubTimer = useCallback((updatePlayerStats) => {
    if (isSubTimerPaused && pauseStartTime) {
      const now = Date.now();
      // Add pause duration to total accumulated pause time
      const pauseDuration = now - pauseStartTime;
      
      // Reset totalPausedDuration if last substitution was during pause
      const newTotalPausedDuration = totalPausedDuration + pauseDuration;

      try {
        // Log resume event with timer state information
        logEvent(EVENT_TYPES.TIMER_RESUMED, {
          pauseType: 'substitution',
          currentMatchTime: calculateMatchTime(now),
          periodNumber: currentPeriodNumber || 1,
          pauseDurationMs: pauseDuration,
          pauseDurationSeconds: Math.floor(pauseDuration / 1000),
          subTimerSeconds: calculateSubTimer(lastSubstitutionTime, newTotalPausedDuration, null),
          matchTimerSeconds: calculateMatchTimer(periodStartTime, periodDurationMinutes),
          resumeReason: 'substitution_resume',
          timerState: {
            beforeResume: {
              isPaused: true,
              lastSubstitutionTime,
              totalPausedDuration,
              pauseStartTime
            },
            afterResume: {
              isPaused: false,
              lastSubstitutionTime,
              totalPausedDuration: newTotalPausedDuration,
              pauseStartTime: null
            }
          }
        });
      } catch (error) {
        console.error('Error logging timer resume event:', error);
      }

      setPauseStartTime(null);
      setTotalPausedDuration(newTotalPausedDuration);

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
  }, [isSubTimerPaused, pauseStartTime, totalPausedDuration, saveTimerStateWithOverrides, lastSubstitutionTime, periodStartTime, periodDurationMinutes, currentPeriodNumber]);

  const startTimers = useCallback((periodNumber = 1, teamConfig = null, ownTeamName = null, opponentTeam = null, startingFormation = null, numPeriods = null, allPlayers = null) => {
    const now = Date.now();
    setPeriodStartTime(now);
    setLastSubstitutionTime(now);
    setSecondLastSubstitutionTime(null);
    setIsPeriodActive(true);
    setPauseStartTime(null);
    setTotalPausedDuration(0);
    
    try {
      // Log match start event only for period 1 (eliminates redundant MATCH_START + PERIOD_START)
      if (periodNumber === 1) {
        logEvent(EVENT_TYPES.MATCH_START, {
          timestamp: now,
          periodDurationMinutes,
          teamConfig,
          ownTeamName: ownTeamName || 'Djurgården',
          opponentTeam: opponentTeam || 'Opponent',
          numPeriods: numPeriods || 2, // Total number of periods planned for the match
          matchMetadata: {
            startTime: now,
            venue: null,
            weather: null,
            referee: null,
            plannedPeriods: numPeriods || 2,
            periodDurationMinutes
          }
        });
      } else {
        // Log period start event for periods > 1
        logEvent(EVENT_TYPES.PERIOD_START, {
          periodNumber,
          timestamp: now,
          periodDurationMinutes,
          startingFormation: startingFormation ? JSON.parse(JSON.stringify(startingFormation)) : null,
          teamConfig,
          periodMetadata: {
            startTime: now,
            plannedDurationMinutes: periodDurationMinutes,
            isFirstPeriod: false
          }
        });
      }
      
      // Log goalie assignment event at period start
      if (startingFormation && startingFormation.goalie) {
        // Find the goalie player to get their name
        let goalieName = null;
        if (allPlayers) {
          const goaliePlayer = allPlayers.find(p => p.id === startingFormation.goalie);
          goalieName = goaliePlayer ? goaliePlayer.name : null;
        }
        
        logEvent(EVENT_TYPES.GOALIE_ASSIGNMENT, {
          goalieId: startingFormation.goalie,
          goalieName: goalieName,
          eventType: 'period_start',
          matchTime: calculateMatchTime(now),
          timestamp: now,
          periodNumber: periodNumber,
          teamConfig: teamConfig,
          description: goalieName ? `${goalieName} is goalie` : `Goalie assigned for period ${periodNumber}`
        });
      }
      
      // Log intermission end if this is not the first period
      if (periodNumber > 1) {
        logEvent(EVENT_TYPES.INTERMISSION, {
          intermissionType: 'end',
          precedingPeriodNumber: periodNumber - 1,
          timestamp: now,
          matchTime: calculateMatchTime(now),
          periodMetadata: {
            endTime: now,
            previousPeriod: periodNumber - 1,
            startingPeriod: periodNumber
          }
        });
      }
    } catch (error) {
      console.error('Error logging period/match start events:', error);
    }
    
    // Save immediately with all new values
    saveTimerStateWithOverrides({
      periodStartTime: now,
      lastSubstitutionTime: now,
      secondLastSubstitutionTime: null,
      isPeriodActive: true,
      pauseStartTime: null,
      totalPausedDuration: 0
    });
  }, [saveTimerStateWithOverrides, periodDurationMinutes]);

  const stopTimers = useCallback((periodNumber = null, isMatchEnd = false, finalFormation = null, teamConfig = null) => {
    const now = Date.now();
    setIsPeriodActive(false);
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    try {
      // Log match end event if this is the final period (eliminates redundant PERIOD_END + MATCH_END)
      if (isMatchEnd) {
        logEvent(EVENT_TYPES.MATCH_END, {
          timestamp: now,
          finalPeriodNumber: periodNumber,
          matchDurationMs: periodStartTime ? now - periodStartTime : 0,
          teamConfig,
          matchMetadata: {
            endTime: now,
            endReason: 'normal_completion',
            wasCompleted: true,
            totalPeriods: periodNumber
          }
          // Note: No periodNumber passed to avoid grouping with periods
        });
      } else {
        // Log period end event for non-final periods
        if (periodNumber) {
          const periodDuration = periodStartTime ? now - periodStartTime : 0;
          logEvent(EVENT_TYPES.PERIOD_END, {
            periodNumber,
            timestamp: now,
            periodDurationMs: periodDuration,
            periodDurationMinutes: Math.floor(periodDuration / 60000),
            periodDurationSeconds: Math.floor(periodDuration / 1000),
            plannedDurationMinutes: periodDurationMinutes,
            endingFormation: finalFormation ? JSON.parse(JSON.stringify(finalFormation)) : null,
            teamConfig,
            periodMetadata: {
              endTime: now,
              startTime: periodStartTime,
              actualDurationMs: periodDuration,
              wasCompleted: true,
              endReason: 'normal_completion'
            }
          });
        }
      }
      
      // Log intermission start if this is not the final period
      if (!isMatchEnd && periodNumber) {
        logEvent(EVENT_TYPES.INTERMISSION, {
          intermissionType: 'start',
          followingPeriodNumber: periodNumber + 1,
          timestamp: now,
          matchTime: calculateMatchTime(now),
          periodMetadata: {
            startTime: now,
            endingPeriod: periodNumber,
            nextPeriod: periodNumber + 1
          }
        });
      }
    } catch (error) {
      console.error('Error logging period/match end events:', error);
    }
    
    // Save immediately with isPeriodActive: false
    saveTimerStateWithOverrides({
      isPeriodActive: false
    });
  }, [saveTimerStateWithOverrides, periodStartTime, periodDurationMinutes]);

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
    setIsPeriodActive,
  };
}