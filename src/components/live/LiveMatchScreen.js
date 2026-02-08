import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, Clock, AlertCircle } from 'lucide-react';
import { MatchSummaryHeader } from '../report/MatchSummaryHeader';
import { GameEventTimeline } from '../report/GameEventTimeline';
import { ReportSection } from '../report/ReportSection';
import { EventToggleButton } from '../report/EventToggleButton';
import { ReportNavigation } from '../report/ReportNavigation';
import { useTeam } from '../../contexts/TeamContext';
import { findUpcomingMatchByOpponent } from '../../services/matchIntegrationService';
import { useMatchEvents } from '../../hooks/useMatchEvents';
import {
  buildPlayerNameMap,
  consolidateMatchEvents,
  EVENT_TYPE_MAPPING,
  mapDatabaseEventToUIType,
  parseEventTime
} from '../../utils/matchEventConsolidation';
import { extractMatchMetadata } from '../../utils/matchMetadataExtractor';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';

export { sortEventsByOrdinal } from '../../utils/matchEventConsolidation';

const formatMatchTime = seconds => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatLiveMatchMinuteDisplay = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "1'";
  const minute = Math.floor(seconds / 60) + 1;
  return `${Math.max(1, minute)}'`;
};

const buildEffectiveTimeSegments = (events = [], isLive = false, currentTimeMs = Date.now()) => {
  if (!Array.isArray(events) || events.length === 0) return [];

  const sortedEvents = [...events].sort((a, b) => {
    const timeA = parseEventTime(a);
    const timeB = parseEventTime(b);
    if (timeA !== null && timeB !== null && timeA !== timeB) {
      return timeA - timeB;
    }

    const ordinalA = typeof a?.ordinal === 'number' ? a.ordinal : 0;
    const ordinalB = typeof b?.ordinal === 'number' ? b.ordinal : 0;
    return ordinalA - ordinalB;
  });

  const segments = [];
  let currentPeriodStart = null;
  let lastEventTime = null;

  const closeSegment = (endTime) => {
    if (currentPeriodStart === null || !Number.isFinite(endTime)) return;
    if (endTime > currentPeriodStart) {
      segments.push({ start: currentPeriodStart, end: endTime });
    }
    currentPeriodStart = null;
  };

  sortedEvents.forEach(event => {
    const eventTime = parseEventTime(event);
    if (Number.isFinite(eventTime)) {
      lastEventTime = eventTime;
    } else {
      return;
    }

    if ((event.event_type === 'match_started' || event.event_type === 'period_started') && currentPeriodStart === null) {
      currentPeriodStart = eventTime;
      return;
    }

    if (event.event_type === 'period_ended' || event.event_type === 'match_ended') {
      closeSegment(eventTime);
    }
  });

  if (currentPeriodStart !== null) {
    const fallbackEnd = isLive ? currentTimeMs : lastEventTime;
    if (Number.isFinite(fallbackEnd) && fallbackEnd > currentPeriodStart) {
      segments.push({ start: currentPeriodStart, end: fallbackEnd });
    }
  }

  return segments;
};

export const createEffectiveTimeCalculator = (events = [], isLive = false, currentTimeMs = Date.now()) => {
  const segments = buildEffectiveTimeSegments(events, isLive, currentTimeMs);

  return (timestampMs) => {
    if (!Number.isFinite(timestampMs) || segments.length === 0) return null;

    let totalMs = 0;
    segments.forEach(({ start, end }) => {
      if (!Number.isFinite(start)) return;

      const segmentEnd = Number.isFinite(end)
        ? end
        : (isLive ? currentTimeMs : timestampMs);

      if (timestampMs <= start) return;
      const effectiveEnd = Math.min(timestampMs, segmentEnd);
      if (effectiveEnd > start) {
        totalMs += effectiveEnd - start;
      }
    });

    return Math.max(0, Math.floor(totalMs / 1000));
  };
};

/**
 * Calculate effective match duration (playing time only).
 * Sums active period time using start/end events and excludes intermissions.
 *
 * @param {Array} events - Raw match events from Supabase
 * @param {boolean} isLive - Whether the match is still in progress
 * @param {number} [currentTimeMs] - Override for "now" (primarily for tests)
 * @returns {number} Total active play time in seconds
 */
export function calculateEffectiveMatchDurationSeconds(events = [], isLive = false, currentTimeMs = Date.now()) {
  const segments = buildEffectiveTimeSegments(events, isLive, currentTimeMs);
  if (!segments.length) return 0;

  const totalMs = segments.reduce((sum, segment) => {
    if (!Number.isFinite(segment?.start) || !Number.isFinite(segment?.end)) return sum;
    return sum + Math.max(0, segment.end - segment.start);
  }, 0);

  return Math.max(0, Math.floor(totalMs / 1000));
}

// Preference store for finished matches (oldest first by default)
const finishedTimelinePrefsManager = createPersistenceManager(
  STORAGE_KEYS.TIMELINE_PREFERENCES,
  { sortOrder: 'asc', showSubstitutions: true }
);

// Preference store for live/pending matches (newest first by default)
const liveTimelinePrefsManager = createPersistenceManager(
  STORAGE_KEYS.TIMELINE_PREFERENCES_LIVE,
  { sortOrder: 'desc', showSubstitutions: true }
);

/**
 * LiveMatchScreen - Real-time match event display for public viewing
 *
 * Accessible via /live/{matchId} route
 * Auto-refreshes every 30 seconds while live, every 5 minutes after the final whistle
 * Works for both authenticated and anonymous users
 *
 * @param {Object} props
 * @param {string} props.matchId - UUID of the match to display
 */
export function LiveMatchScreen({ matchId, showBackButton = false, onNavigateBack = null }) {
  const { t } = useTranslation('live');
  const { currentTeam } = useTeam();
  const [upcomingMatch, setUpcomingMatch] = useState(null);
  const [pollingConfig, setPollingConfig] = useState({ enabled: false, intervalMs: 60000 });

  // Lock match status at first meaningful data load so sort order never flips mid-session
  const isFinishedRef = useRef(null); // null = not yet determined

  // Pick the correct preference manager based on locked match status
  const getPrefsManager = useCallback(() => {
    return isFinishedRef.current ? finishedTimelinePrefsManager : liveTimelinePrefsManager;
  }, []);

  const [showSubstitutionEvents, setShowSubstitutionEvents] = useState(() => {
    // Before we know match status, default to live prefs (will be corrected once status is determined)
    const preferences = liveTimelinePrefsManager.loadState();
    return preferences.showSubstitutions ?? true;  // Default ON
  });

  const [timelineSortOrder, setTimelineSortOrder] = useState(null); // null until match status determined

  const {
    events,
    isLoading,
    error,
    lastUpdateTime
  } = useMatchEvents(matchId, {
    pollingEnabled: pollingConfig.enabled,
    refreshIntervalMs: pollingConfig.intervalMs
  });

  const renderBackNavigation = useCallback(() => {
    if (!showBackButton || !onNavigateBack) {
      return null;
    }

    return (
      <div className="mb-4">
        <ReportNavigation onNavigateBack={onNavigateBack} />
      </div>
    );
  }, [onNavigateBack, showBackButton]);

  const matchMetadata = useMemo(() => extractMatchMetadata(events), [events]);
  const matchHasFinished = Boolean(matchMetadata?.matchHasStarted && !matchMetadata?.isLive);

  // Lock match status once we have first meaningful data, then load correct sort preference
  useEffect(() => {
    if (isFinishedRef.current !== null) return; // already locked
    if (!matchMetadata) return; // no data yet

    // Lock: finished if match has started and is no longer live
    isFinishedRef.current = Boolean(matchMetadata.matchHasStarted && !matchMetadata.isLive);

    // Load sort order from the correct preference store
    const prefs = isFinishedRef.current
      ? finishedTimelinePrefsManager.loadState()
      : liveTimelinePrefsManager.loadState();
    setTimelineSortOrder(prefs.sortOrder);

    // Also reload showSubstitutions from correct store
    setShowSubstitutionEvents(prefs.showSubstitutions ?? true);
  }, [matchMetadata]);

  // Handle sort order changes from the timeline component
  const handleSortOrderChange = useCallback((newSortOrder) => {
    setTimelineSortOrder(newSortOrder);
    const manager = getPrefsManager();
    manager.saveState({
      ...manager.loadState(),
      sortOrder: newSortOrder
    });
  }, [getPrefsManager]);

  useEffect(() => {
    const isLive = Boolean(matchMetadata?.isLive);
    const nextIntervalMs = isLive ? 30000 : (matchHasFinished ? 300000 : 60000);
    const nextConfig = {
      enabled: isLive || matchHasFinished,
      intervalMs: nextIntervalMs
    };

    setPollingConfig(prev => {
      if (prev.enabled === nextConfig.enabled && prev.intervalMs === nextConfig.intervalMs) {
        return prev;
      }
      return nextConfig;
    });
  }, [matchMetadata?.isLive, matchHasFinished]);

  useEffect(() => {
    const manager = getPrefsManager();
    manager.saveState({
      ...manager.loadState(),
      showSubstitutions: showSubstitutionEvents
    });
  }, [showSubstitutionEvents, getPrefsManager]);

  const effectiveMatchDurationSeconds = useMemo(() => {
    return calculateEffectiveMatchDurationSeconds(events, matchMetadata?.isLive);
  }, [events, matchMetadata?.isLive]);

  const effectiveTimeCalculator = useMemo(() => {
    return createEffectiveTimeCalculator(events, matchMetadata?.isLive);
  }, [events, matchMetadata?.isLive]);

  const liveMatchMinuteDisplay = useMemo(() => {
    if (!matchMetadata?.isLive) return null;
    return formatLiveMatchMinuteDisplay(effectiveMatchDurationSeconds);
  }, [effectiveMatchDurationSeconds, matchMetadata?.isLive]);

  // Calculate scheduled start time from upcoming match
  const scheduledStartTime = useMemo(() => {
    if (!upcomingMatch || matchMetadata?.matchHasStarted) return null;

    // Combine match_date and match_time
    if (upcomingMatch.match_date && upcomingMatch.match_time) {
      return {
        date: upcomingMatch.match_date,
        time: upcomingMatch.match_time,
        venue: upcomingMatch.venue
      };
    }

    return null;
  }, [upcomingMatch, matchMetadata?.matchHasStarted]);

  // Calculate current minute of period
  const currentPeriodMinute = useMemo(() => {
    if (!events || events.length === 0 || !matchMetadata?.currentPeriod) return 0;

    // Find most recent period_started event
    const periodStartEvents = events
      .filter(e => e.event_type === 'period_started')
      .sort((a, b) => (b.ordinal || 0) - (a.ordinal || 0));

    if (periodStartEvents.length === 0) return 0;

    const lastPeriodStart = periodStartEvents[0];
    const periodStartTime = new Date(lastPeriodStart.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - periodStartTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60) + 1; // First 60 seconds = minute 1

    return elapsedMinutes;
  }, [events, matchMetadata?.currentPeriod]);

  // Fetch upcoming match data when match hasn't started
  useEffect(() => {
    // Only fetch if match hasn't started and we have opponent name
    if (!matchMetadata?.matchHasStarted && matchMetadata?.opponentName && currentTeam?.id) {
      findUpcomingMatchByOpponent(currentTeam.id, matchMetadata.opponentName)
        .then(match => setUpcomingMatch(match))
        .catch(error => console.error('Failed to fetch upcoming match:', error));
    }
  }, [matchMetadata?.matchHasStarted, matchMetadata?.opponentName, currentTeam?.id]);

  const playerNameMap = useMemo(() => buildPlayerNameMap(events), [events]);

  const consolidatedEvents = useMemo(
    () => consolidateMatchEvents(events, { playerNameMap }),
    [events, playerNameMap]
  );

  const goalScorers = useMemo(() => {
    const map = {};
    events.forEach(event => {
      if ((event.event_type === 'goal_scored' || event.event_type === 'goal_conceded') && event.player_id) {
        map[event.id] = event.player_id;
      }
    });
    return map;
  }, [events]);

  const getPlayerDisplayName = useCallback((playerId) => {
    if (!playerId) return null;
    return playerNameMap.get(playerId) || null;
  }, [playerNameMap]);

  // Transform database events to UI format for GameEventTimeline
  const transformedEvents = useMemo(() => {
    // Filter out events with unmapped/unknown event types (like match_created)
    const mappableEvents = consolidatedEvents.filter(event =>
      Object.prototype.hasOwnProperty.call(EVENT_TYPE_MAPPING, event.event_type)
    );

    return mappableEvents.map(event => {
      const normalizedData = { ...(event.data || {}) };
      const eventTimestamp = parseEventTime(event);
      const effectiveSeconds = effectiveTimeCalculator(eventTimestamp);
      const occurredSeconds = Number.isFinite(effectiveSeconds)
        ? effectiveSeconds
        : (Number.isFinite(event.occurred_at_seconds) ? event.occurred_at_seconds : null);

      if (event.event_type === 'substitution') {
        normalizedData.playersOff = Array.isArray(normalizedData.playersOff) ? normalizedData.playersOff : [];
        normalizedData.playersOn = Array.isArray(normalizedData.playersOn) ? normalizedData.playersOn : [];

        if (!normalizedData.playersOffNames && normalizedData.playersOff.length > 0) {
          normalizedData.playersOffNames = normalizedData.playersOff
            .map(id => playerNameMap.get(id))
            .filter(Boolean);
        }

        if (!normalizedData.playersOnNames && normalizedData.playersOn.length > 0) {
          normalizedData.playersOnNames = normalizedData.playersOn
            .map(id => playerNameMap.get(id))
            .filter(Boolean);
        }
      }

      if (event.event_type === 'goalie_enters') {
        normalizedData.goalieId = normalizedData.goalieId || event.player_id;
        normalizedData.goalieName = normalizedData.goalieName
          || normalizedData.display_name
          || (event.player_id ? playerNameMap.get(event.player_id) : null);
      }

      if (event.event_type === 'position_switch') {
        if (!normalizedData.display_name && event.player_id) {
          const name = playerNameMap.get(event.player_id);
          if (name) {
            normalizedData.display_name = name;
          }
        }
        if (!normalizedData.player1Id && event.player_id) {
          normalizedData.player1Id = event.player_id;
        }
      }

      if (event.event_type === 'substitution_out' && event.player_id) {
        normalizedData.playersOff = normalizedData.playersOff || [event.player_id];
        if (!normalizedData.playersOffNames) {
          const name = playerNameMap.get(event.player_id);
          if (name) {
            normalizedData.playersOffNames = [name];
          }
        }
      }

      if (event.event_type === 'substitution_in' && event.player_id) {
        normalizedData.playersOn = normalizedData.playersOn || [event.player_id];
        if (!normalizedData.playersOnNames) {
          const name = playerNameMap.get(event.player_id);
          if (name) {
            normalizedData.playersOnNames = [name];
          }
        }
      }

      if (Array.isArray(normalizedData.positionChanges)) {
        normalizedData.positionChanges = normalizedData.positionChanges.map(change => {
          const playerName = change.playerName || (change.playerId ? playerNameMap.get(change.playerId) : null);
          return {
            ...change,
            playerName
          };
        });
      }

      if (event.event_type === 'goalie_switch') {
        if (!normalizedData.oldGoalieName && normalizedData.oldGoalieId) {
          const name = playerNameMap.get(normalizedData.oldGoalieId);
          if (name) normalizedData.oldGoalieName = name;
        }
        if (!normalizedData.newGoalieName && normalizedData.newGoalieId) {
          const name = playerNameMap.get(normalizedData.newGoalieId);
          if (name) normalizedData.newGoalieName = name;
        }
        if (!normalizedData.oldGoalieNewPosition && Array.isArray(normalizedData.positionChanges)) {
          const oldGoalieChange = normalizedData.positionChanges.find(change => (change.oldPosition || '').toLowerCase() === 'goalie');
          if (oldGoalieChange?.newPosition) {
            normalizedData.oldGoalieNewPosition = oldGoalieChange.newPosition;
          }
        }
        if (!normalizedData.newGoaliePreviousPosition && Array.isArray(normalizedData.positionChanges)) {
          const newGoalieChange = normalizedData.positionChanges.find(change => (change.newPosition || '').toLowerCase() === 'goalie');
          if (newGoalieChange?.oldPosition) {
            normalizedData.newGoaliePreviousPosition = newGoalieChange.oldPosition;
          }
        }
      }

      const displayName = normalizedData.display_name || (event.player_id ? playerNameMap.get(event.player_id) : null);
      if (displayName && !normalizedData.display_name) {
        normalizedData.display_name = displayName;
      }

      return {
        id: event.id,
        type: mapDatabaseEventToUIType(event.event_type),
        ordinal: typeof event.ordinal === 'number' ? event.ordinal : null,
        timestamp: eventTimestamp,
        occurredAtSeconds: occurredSeconds,
        matchTime: Number.isFinite(occurredSeconds) ? formatMatchTime(occurredSeconds) : '00:00',
        periodNumber: event.period,
        data: {
          ...normalizedData,
          playerId: event.player_id,
          scorerId: event.player_id,
          ownScore: normalizedData.ownScore,
          opponentScore: normalizedData.opponentScore
        },
        playerId: event.player_id,
        __sourceIndex: event.__sourceIndex
      };
    });
  }, [consolidatedEvents, playerNameMap, effectiveTimeCalculator]);

  const filteredEvents = useMemo(() => {
    if (!showSubstitutionEvents) {
      return transformedEvents.filter(event => {
        const type = event.type;

        // Always show match/period/goal/award events
        if (
          type === 'match_start' ||
          type === 'match_end' ||
          type === 'period_start' ||
          type === 'period_end' ||
          type === 'goal_scored' ||
          type === 'goal_conceded' ||
          type === 'fair_play_award'
        ) {
          return true;
        }

        // Hide substitution-related events
        if (
          type === 'substitution' ||
          type === 'goalie_assignment' ||
          type === 'goalie_switch' ||
          type === 'position_change' ||
          type === 'player_inactivated' ||
          type === 'player_activated'
        ) {
          return false;
        }

        // Show all other events (if any)
        return true;
      });
    }

    return transformedEvents;
  }, [transformedEvents, showSubstitutionEvents]);

  // Loading state
  if (isLoading && events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {renderBackNavigation()}
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4"></div>
            <p className="text-slate-400">{t('info.loadingEvents')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {renderBackNavigation()}
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400 mr-2" />
              <h2 className="text-xl font-bold text-red-300">{t('info.errorLoadingMatch')}</h2>
            </div>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No events state
  if (!matchMetadata) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {renderBackNavigation()}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-slate-400 text-center">{t('info.noEventsFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl md:max-w-4xl lg:max-w-5xl">
        {renderBackNavigation()}
        {/* Live Match Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {!matchMetadata.matchHasStarted ? (
                <>
                  <Clock className="h-6 w-6 text-slate-400 mr-2" />
                  <h1 className="text-2xl font-bold text-slate-300">{t('status.matchNotStarted')}</h1>
                </>
              ) : matchMetadata.isLive ? (
                <>
                  <Radio className="h-6 w-6 text-red-500 mr-2 animate-pulse" />
                  <h1 className="text-2xl font-bold text-sky-300">{t('status.liveMatch')}</h1>
                </>
              ) : (
                <>
                  <Clock className="h-6 w-6 text-slate-400 mr-2" />
                  <h1 className="text-2xl font-bold text-slate-300">{t('status.matchFinished')}</h1>
                </>
              )}
            </div>

            {matchMetadata.isLive && matchMetadata.matchHasStarted && matchMetadata.currentPeriod > 0 && (
              <div className="text-sm text-slate-400">
                {t('info.periodWithMinute', { period: matchMetadata.currentPeriod, minute: currentPeriodMinute })}
              </div>
            )}
          </div>

          {/* Last Update Indicator */}
          {lastUpdateTime && (
            <div className="text-xs text-slate-500">
              {t('info.lastUpdated', { time: lastUpdateTime.toLocaleTimeString() })}
            </div>
          )}
        </div>

        {/* Match Summary */}
        <div className="space-y-6">
          <ReportSection icon={Clock} title={t('info.matchSummary')}>
            <MatchSummaryHeader
              ownTeamName={matchMetadata.ownTeamName}
              opponentTeam={matchMetadata.opponentName}
              ownScore={matchMetadata.ownScore}
              opponentScore={matchMetadata.opponentScore}
              matchStartTime={matchMetadata.matchStartTime}
              scheduledStartTime={scheduledStartTime}
              totalPeriods={matchMetadata.totalPeriods || matchMetadata.currentPeriod}
              periodDurationMinutes={matchMetadata.periodDurationMinutes || 15}
              matchDuration={matchMetadata.isLive ? matchMetadata.matchDurationSeconds || 0 : effectiveMatchDurationSeconds}
              matchDurationDisplay={liveMatchMinuteDisplay}
              matchHasStarted={matchMetadata.matchHasStarted}
              matchHasFinished={matchHasFinished}
            />
          </ReportSection>

          {/* Event Timeline */}
          <ReportSection
            icon={Clock}
            title={t('info.gameEvents')}
            headerExtra={
              <EventToggleButton
                isVisible={showSubstitutionEvents}
                onToggle={() => setShowSubstitutionEvents(!showSubstitutionEvents)}
                label={t('info.substitutions')}
              />
            }
          >
            <GameEventTimeline
              events={filteredEvents}
              ownTeamName={matchMetadata.ownTeamName}
              opponentTeam={matchMetadata.opponentName}
              matchStartTime={matchMetadata.matchStartTime}
              showSubstitutions={showSubstitutionEvents}
              goalScorers={goalScorers}
              getPlayerName={getPlayerDisplayName}
              onGoalClick={null}
              selectedPlayerId={null}
              availablePlayers={[]}
              onPlayerFilterChange={null}
              debugMode={false}
              initialSortOrder={timelineSortOrder}
              onSortOrderChange={handleSortOrderChange}
            />
          </ReportSection>
        </div>
      </div>
    </div>
  );
}
