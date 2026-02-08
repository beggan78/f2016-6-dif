import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { initializeEventLogger, getMatchStartTime, getAllEvents, clearAllEvents, addEventListener } from '../utils/gameEventLogger';

/**
 * Legacy match events hook used by game state for local event logging and scoring.
 *
 * @param {Object} initialState
 * @returns {Object} Match event state and handlers
 */
export function useLegacyMatchEvents(initialState = {}) {
  const [matchEvents, setMatchEvents] = useState(initialState.matchEvents || []);
  const [matchStartTime, setMatchStartTime] = useState(initialState.matchStartTime || null);
  const [goalScorers, setGoalScorers] = useState(initialState.goalScorers || {});
  const [eventSequenceNumber, setEventSequenceNumber] = useState(initialState.eventSequenceNumber || 0);
  const [lastEventBackup, setLastEventBackup] = useState(initialState.lastEventBackup || null);

  const [ownScore, setOwnScore] = useState(initialState.ownScore || 0);
  const [opponentScore, setOpponentScore] = useState(initialState.opponentScore || 0);

  const syncMatchDataFromEventLogger = useCallback(() => {
    const loggerStartTime = getMatchStartTime();
    const loggerEvents = getAllEvents();

    if (!loggerStartTime && loggerEvents.length === 0 && (matchStartTime || matchEvents.length > 0)) {
      initializeEventLogger(matchStartTime);
      return;
    }

    const lengthChanged = loggerEvents.length !== matchEvents.length;
    let contentChanged = false;

    if (loggerEvents.length > 0 && matchEvents.length > 0) {
      contentChanged = JSON.stringify(loggerEvents) !== JSON.stringify(matchEvents);
    }

    if (lengthChanged || contentChanged || (!matchStartTime && loggerStartTime)) {
      if (loggerStartTime && loggerStartTime !== matchStartTime) {
        setMatchStartTime(loggerStartTime);
      }
      if (lengthChanged || contentChanged) {
        setMatchEvents([...loggerEvents]);
      }
    }
  }, [matchEvents, matchStartTime]);

  const handleEventLoggerChange = useCallback(() => {
    syncMatchDataFromEventLogger();
  }, [syncMatchDataFromEventLogger]);

  useEffect(() => {
    initializeEventLogger();
    const unsubscribe = addEventListener(handleEventLoggerChange);
    return unsubscribe;
  }, [handleEventLoggerChange]);

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
    matchEvents,
    matchStartTime,
    goalScorers,
    eventSequenceNumber,
    lastEventBackup,
    ownScore,
    opponentScore,

    setMatchEvents,
    setMatchStartTime,
    setGoalScorers,
    setEventSequenceNumber,
    setLastEventBackup,
    setOwnScore,
    setOpponentScore,

    addGoalScored,
    addGoalConceded,
    setScore,
    resetScore,
    clearAllMatchEvents,
    syncMatchDataFromEventLogger,

    getEventState: () => ({
      matchEvents,
      matchStartTime,
      goalScorers,
      eventSequenceNumber,
      lastEventBackup,
      ownScore,
      opponentScore
    })
  };
}

/**
 * Live match events hook for public live match screen.
 *
 * @param {string} matchId
 * @param {Object} options
 * @param {boolean} [options.isLive=false]
 * @param {boolean} [options.pollingEnabled] - Override to control auto-refresh independent of isLive
 * @param {number} [options.refreshIntervalMs=60000]
 * @returns {Object} Live event state and helpers
 */
export function useMatchEvents(matchId, { isLive = false, pollingEnabled, refreshIntervalMs = 60000 } = {}) {
  const { t } = useTranslation('common');
  const [events, setEvents] = useState([]);
  const [latestOrdinal, setLatestOrdinal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const latestOrdinalRef = useRef(latestOrdinal);

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  const fetchEvents = useCallback(async (since = null) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration for live match events');
      setError(t('errors.supabaseConfigMissing'));
      setIsLoading(false);
      return;
    }

    try {
      const url = new URL(`${supabaseUrl}/functions/v1/get-live-match-events`);
      url.searchParams.set('match_id', matchId);

      if (since !== null) {
        url.searchParams.set('since_ordinal', since.toString());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch events');
      }

      const data = await response.json();

      if (since !== null) {
        setEvents(prev => [...prev, ...(data.events || [])]);
      } else {
        setEvents(data.events || []);
      }

      setLatestOrdinal(data.latest_ordinal || 0);
      setLastUpdateTime(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch match events:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, supabaseAnonKey, supabaseUrl, t]);

  useEffect(() => {
    setEvents([]);
    setLatestOrdinal(0);
    setError(null);
    setIsLoading(true);
    setLastUpdateTime(null);
  }, [matchId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    latestOrdinalRef.current = latestOrdinal;
  }, [latestOrdinal]);

  const shouldPoll = typeof pollingEnabled === 'boolean' ? pollingEnabled : isLive;

  useEffect(() => {
    if (!shouldPoll) return undefined;

    const interval = setInterval(() => {
      fetchEvents(latestOrdinalRef.current);
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [fetchEvents, shouldPoll, refreshIntervalMs]);

  return {
    events,
    isLoading,
    error,
    lastUpdateTime,
    latestOrdinal,
    refreshEvents: fetchEvents
  };
}

export const useLiveMatchEvents = useMatchEvents;
