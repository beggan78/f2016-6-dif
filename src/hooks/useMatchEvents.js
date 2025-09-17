import { useState, useCallback, useEffect } from 'react';
import { initializeEventLogger, getMatchStartTime, getAllEvents, clearAllEvents, addEventListener } from '../utils/gameEventLogger';

/**
 * Hook for managing match events, scoring, and event logging
 *
 * Handles:
 * - Match events array and goal scorers tracking
 * - Score management (own score, opponent score)
 * - Integration with external event logger
 * - Event sequence numbering and backup
 *
 * @param {Object} initialState - Initial state from persistence
 * @returns {Object} Match events state and handlers
 */
export function useMatchEvents(initialState = {}) {
  // Event-related state
  const [matchEvents, setMatchEvents] = useState(initialState.matchEvents || []);
  const [matchStartTime, setMatchStartTime] = useState(initialState.matchStartTime || null);
  const [goalScorers, setGoalScorers] = useState(initialState.goalScorers || {}); // { eventId: playerId }
  const [eventSequenceNumber, setEventSequenceNumber] = useState(initialState.eventSequenceNumber || 0);
  const [lastEventBackup, setLastEventBackup] = useState(initialState.lastEventBackup || null);

  // Score state
  const [ownScore, setOwnScore] = useState(initialState.ownScore || 0); // Djurgården score
  const [opponentScore, setOpponentScore] = useState(initialState.opponentScore || 0); // Opponent score

  // Event logger synchronization
  const syncMatchDataFromEventLogger = useCallback(() => {
    const loggerStartTime = getMatchStartTime();
    const loggerEvents = getAllEvents();

    // Check if event logger has data but local state doesn't
    if (!loggerStartTime && loggerEvents.length === 0 && (matchStartTime || matchEvents.length > 0)) {
      // Event logger is empty but local state has data - initialize logger from local state
      initializeEventLogger(matchStartTime);
      return;
    }

    // Check if we need to sync from event logger
    const lengthChanged = loggerEvents.length !== matchEvents.length;
    let contentChanged = false;

    if (loggerEvents.length > 0 && matchEvents.length > 0) {
      contentChanged = JSON.stringify(loggerEvents) !== JSON.stringify(matchEvents);
    }

    if (lengthChanged || contentChanged || (!matchStartTime && loggerStartTime)) {
      // Sync from event logger
      if (loggerStartTime && loggerStartTime !== matchStartTime) {
        setMatchStartTime(loggerStartTime);
      }
      if (lengthChanged || contentChanged) {
        setMatchEvents([...loggerEvents]);
      }
    }
  }, [matchStartTime, matchEvents]);

  // Handle event logger changes
  const handleEventLoggerChange = useCallback(() => {
    syncMatchDataFromEventLogger();
  }, [syncMatchDataFromEventLogger]);

  // Initialize event logger and set up listener
  useEffect(() => {
    initializeEventLogger();
    const unsubscribe = addEventListener(handleEventLoggerChange);
    return unsubscribe;
  }, [handleEventLoggerChange]);

  // Score management functions
  const addGoalScored = useCallback(() => {
    setOwnScore(prev => prev + 1);
  }, []);

  const addGoalConceded = useCallback(() => {
    setOpponentScore(prev => prev + 1);
  }, []);

  const setScore = useCallback((own, opponent) => {
    setOwnScore(own);
    setOpponentScore(opponent);
  }, []);

  const resetScore = useCallback(() => {
    setOwnScore(0);
    setOpponentScore(0);
  }, []);

  // Clear all events and reset state
  const clearAllMatchEvents = useCallback(() => {
    const eventsCleared = clearAllEvents();
    setMatchEvents([]);
    setMatchStartTime(null);
    setGoalScorers({});
    setEventSequenceNumber(0);
    setLastEventBackup(null);
    return eventsCleared;
  }, []);

  return {
    // State
    matchEvents,
    matchStartTime,
    goalScorers,
    eventSequenceNumber,
    lastEventBackup,
    ownScore,
    opponentScore,

    // Setters (for external state management)
    setMatchEvents,
    setMatchStartTime,
    setGoalScorers,
    setEventSequenceNumber,
    setLastEventBackup,
    setOwnScore,
    setOpponentScore,

    // Actions
    addGoalScored,
    addGoalConceded,
    setScore,
    resetScore,
    clearAllMatchEvents,
    syncMatchDataFromEventLogger,

    // Computed values for persistence
    getEventState: () => ({
      matchEvents,
      matchStartTime,
      goalScorers,
      eventSequenceNumber,
      lastEventBackup,
      ownScore,
      opponentScore,
    }),
  };
}