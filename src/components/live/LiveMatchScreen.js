import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Radio, Clock, AlertCircle } from 'lucide-react';
import { MatchSummaryHeader } from '../report/MatchSummaryHeader';
import { GameEventTimeline } from '../report/GameEventTimeline';
import { ReportSection } from '../report/ReportSection';

const EVENT_TYPE_MAPPING = {
  match_started: 'match_start',
  match_ended: 'match_end',
  period_started: 'period_start',
  period_ended: 'period_end',
  goal_scored: 'goal_scored',
  goal_conceded: 'goal_conceded',
  substitution_in: 'substitution',
  substitution_out: 'substitution',
  goalie_enters: 'goalie_assignment',
  goalie_exits: 'goalie_switch',
  goalie_switch: 'goalie_switch',
  position_switch: 'position_change',
  position_switch_group: 'position_change',
  player_inactivated: 'player_inactivated',
  player_activated: 'player_activated',
  player_reactivated: 'player_activated'
};

const mapDatabaseEventToUIType = dbEventType => EVENT_TYPE_MAPPING[dbEventType] || dbEventType;

const formatMatchTime = seconds => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * LiveMatchScreen - Real-time match event display for public viewing
 *
 * Accessible via /live/{matchId} route
 * Auto-refreshes every 60 seconds to fetch new events
 * Works for both authenticated and anonymous users
 *
 * @param {Object} props
 * @param {string} props.matchId - UUID of the match to display
 */
export function LiveMatchScreen({ matchId }) {
  const [events, setEvents] = useState([]);
  const [latestOrdinal, setLatestOrdinal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  // Extract match metadata from events
  const matchMetadata = useMemo(() => {
    if (!events || events.length === 0) return null;

    const matchStartEvent = events.find(e => e.event_type === 'match_started');
    const matchEndEvent = events.find(e => e.event_type === 'match_ended');
    const periodStartEvents = events.filter(e => e.event_type === 'period_started');
    const goalScoredEvents = events.filter(e => e.event_type === 'goal_scored');
    const goalConcededEvents = events.filter(e => e.event_type === 'goal_conceded');

    // Extract team names from match_started event data
    const ownTeamName = matchStartEvent?.data?.ownTeamName || 'Own Team';
    const opponentName = matchStartEvent?.data?.opponentTeamName
      || matchStartEvent?.data?.opponentTeam
      || matchStartEvent?.data?.opponentName
      || 'Opponent';

    // Calculate scores
    const ownScore = goalScoredEvents.length;
    const opponentScore = goalConcededEvents.length;

    // Determine current period
    const currentPeriod = periodStartEvents.length;

    // Calculate match start time from match_started event
    const matchStartTime = matchStartEvent ? new Date(matchStartEvent.created_at).getTime() : null;
    const matchEndTime = matchEndEvent ? new Date(matchEndEvent.created_at).getTime() : null;

    // Check if match is live (no match_ended event)
    const isLive = !matchEndEvent;

    const totalPeriods = matchStartEvent?.data?.totalPeriods
      || matchStartEvent?.data?.numPeriods
      || matchStartEvent?.data?.matchMetadata?.plannedPeriods
      || matchEndEvent?.data?.totalPeriods
      || currentPeriod;

    const periodDurationMinutes = matchStartEvent?.data?.periodDurationMinutes
      || matchEndEvent?.data?.matchMetadata?.plannedDurationMinutes
      || 15;

    const matchDurationSeconds = matchEndEvent?.data?.matchDurationSeconds
      || (matchStartTime && matchEndTime ? Math.max(0, Math.round((matchEndTime - matchStartTime) / 1000)) : 0);

    return {
      ownTeamName,
      opponentName,
      ownScore,
      opponentScore,
      currentPeriod,
      matchStartTime,
      matchEndTime,
      isLive,
      totalPeriods,
      periodDurationMinutes,
      matchDurationSeconds
    };
  }, [events]);

  // Calculate current minute of period
  const currentPeriodMinute = useMemo(() => {
    if (!events || events.length === 0 || !matchMetadata?.currentPeriod) return 0;

    // Find most recent period_started event
    const periodStartEvents = events
      .filter(e => e.event_type === 'period_started')
      .sort((a, b) => b.ordinal - a.ordinal);

    if (periodStartEvents.length === 0) return 0;

    const lastPeriodStart = periodStartEvents[0];
    const periodStartTime = new Date(lastPeriodStart.created_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - periodStartTime) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60) + 1; // First 60 seconds = minute 1

    return elapsedMinutes;
  }, [events, matchMetadata]);

  // Fetch events from Edge Function
  const fetchEvents = useCallback(async (since = null) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration for live match events');
      setError('Supabase configuration missing. Please check environment variables.');
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
        // Incremental update - append new events
        setEvents(prev => [...prev, ...(data.events || [])]);
      } else {
        // Initial load - replace all events
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
  }, [matchId, supabaseAnonKey, supabaseUrl]);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Only fetch if match is still live
      if (matchMetadata?.isLive) {
        fetchEvents(latestOrdinal);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchEvents, latestOrdinal, matchMetadata?.isLive]);

  const playerNameMap = useMemo(() => {
    const map = new Map();
    const addName = (id, name) => {
      if (!id || !name || map.has(id)) return;
      map.set(id, name);
    };

    events.forEach(event => {
      const data = event?.data || {};
      const primaryName = data.display_name || data.playerName || data.scorerName || data.goalieName || data.previousGoalieName;

      if (event.player_id) {
        addName(event.player_id, primaryName);
      }

      if (data.playerNameMap && typeof data.playerNameMap === 'object') {
        Object.entries(data.playerNameMap).forEach(([id, name]) => addName(id, name));
      }

      if (Array.isArray(data.playersOff)) {
        data.playersOff.forEach((id, index) => addName(id, data.playersOffNames?.[index] || primaryName));
      }

      if (Array.isArray(data.playersOn)) {
        data.playersOn.forEach((id, index) => addName(id, data.playersOnNames?.[index] || primaryName));
      }

      if (data.sourcePlayerId) addName(data.sourcePlayerId, data.sourcePlayerName);
      if (data.targetPlayerId) addName(data.targetPlayerId, data.targetPlayerName);
      if (data.swapPlayerId) addName(data.swapPlayerId, data.swapPlayerName);

      if (data.goalieId) addName(data.goalieId, data.goalieName || primaryName);
      if (data.previousGoalieId || data.oldGoalieId) {
        addName(data.previousGoalieId || data.oldGoalieId, data.previousGoalieName || primaryName);
      }
    });

    return map;
  }, [events]);

  const consolidatedEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    const substitutionGroups = new Map();
    const positionSwitchGroups = new Map();
    const mergedEvents = [];

    const getNameFromEvent = (event) => {
      const data = event?.data || {};
      return data.display_name || data.playerName || data.scorerName || data.goalieName || data.previousGoalieName || null;
    };

    const getSortValue = (event) => {
      if (typeof event?.ordinal === 'number') return event.ordinal;
      const createdTime = event?.created_at ? Date.parse(event.created_at) : null;
      return Number.isFinite(createdTime) ? createdTime : 0;
    };

    events.forEach(event => {
      const isSubIn = event.event_type === 'substitution_in';
      const isSubOut = event.event_type === 'substitution_out';
      const correlationId = event.correlation_id;
      const isPositionSwitch = event.event_type === 'position_switch';
      const isGoalieEnter = event.event_type === 'goalie_enters';
      const isGoalieExit = event.event_type === 'goalie_exits';

      if ((isSubIn || isSubOut) && correlationId) {
        let group = substitutionGroups.get(correlationId);
        if (!group) {
          group = {
            correlationId,
            created_at: event.created_at,
            occurred_at_seconds: event.occurred_at_seconds,
            ordinal: event.ordinal,
            period: event.period,
            data: event.data ? { ...event.data } : {},
            playersOn: [],
            playersOff: [],
            playersOnNames: [],
            playersOffNames: []
          };
          substitutionGroups.set(correlationId, group);
        }

        const playerId = event.player_id;
        const playerName = getNameFromEvent(event);

        if (isSubIn && playerId && !group.playersOn.includes(playerId)) {
          group.playersOn.push(playerId);
          if (playerName) {
            group.playersOnNames.push(playerName);
          }
        }

        if (isSubOut && playerId && !group.playersOff.includes(playerId)) {
          group.playersOff.push(playerId);
          if (playerName) {
            group.playersOffNames.push(playerName);
          }
        }

        if (event.created_at && (!group.created_at || Date.parse(event.created_at) < Date.parse(group.created_at))) {
          group.created_at = event.created_at;
        }

        if (typeof event.occurred_at_seconds === 'number' &&
          (group.occurred_at_seconds === undefined || event.occurred_at_seconds < group.occurred_at_seconds)) {
          group.occurred_at_seconds = event.occurred_at_seconds;
        }

        if (typeof event.ordinal === 'number') {
          group.ordinal = typeof group.ordinal === 'number' ? Math.min(group.ordinal, event.ordinal) : event.ordinal;
        }

        if (!group.period && event.period) {
          group.period = event.period;
        }

        return;
      }

      if (correlationId && (isPositionSwitch || isGoalieEnter || isGoalieExit)) {
        let group = positionSwitchGroups.get(correlationId);
        if (!group) {
          group = {
            correlationId,
            created_at: event.created_at,
            occurred_at_seconds: event.occurred_at_seconds,
            ordinal: event.ordinal,
            period: event.period,
            events: []
          };
          positionSwitchGroups.set(correlationId, group);
        }

        group.events.push(event);

        if (event.created_at && (!group.created_at || Date.parse(event.created_at) < Date.parse(group.created_at))) {
          group.created_at = event.created_at;
        }

        if (typeof event.occurred_at_seconds === 'number' &&
          (group.occurred_at_seconds === undefined || event.occurred_at_seconds < group.occurred_at_seconds)) {
          group.occurred_at_seconds = event.occurred_at_seconds;
        }

        if (typeof event.ordinal === 'number') {
          group.ordinal = typeof group.ordinal === 'number' ? Math.min(group.ordinal, event.ordinal) : event.ordinal;
        }

        if (!group.period && event.period) {
          group.period = event.period;
        }

        return;
      }

      mergedEvents.push(event);
    });

    substitutionGroups.forEach(group => {
      mergedEvents.push({
        id: group.correlationId ? `sub-${group.correlationId}` : undefined,
        event_type: 'substitution',
        correlation_id: group.correlationId,
        created_at: group.created_at,
        occurred_at_seconds: group.occurred_at_seconds,
        ordinal: group.ordinal,
        period: group.period,
        data: {
          ...group.data,
          playersOff: group.playersOff,
          playersOn: group.playersOn,
          ...(group.playersOffNames.length ? { playersOffNames: group.playersOffNames } : {}),
          ...(group.playersOnNames.length ? { playersOnNames: group.playersOnNames } : {})
        }
      });
    });

    const buildPositionSwitchEvent = (group) => {
      const changes = [];
      let goalieEnterEvent = null;
      let goalieExitEvent = null;

      group.events.forEach(ev => {
        if (ev.event_type === 'position_switch') {
          changes.push({
            playerId: ev.player_id,
            playerName: getNameFromEvent(ev),
            oldPosition: ev.data?.old_position || ev.data?.oldPosition || null,
            newPosition: ev.data?.new_position || ev.data?.newPosition || null
          });
        } else if (ev.event_type === 'goalie_enters') {
          goalieEnterEvent = ev;
        } else if (ev.event_type === 'goalie_exits') {
          goalieExitEvent = ev;
        }
      });

      const hasGoalieChange = Boolean(goalieExitEvent) ||
        changes.some(change => (change.oldPosition || '').toLowerCase() === 'goalie' || (change.newPosition || '').toLowerCase() === 'goalie');
      const hasAnyGoalieEvent = Boolean(goalieEnterEvent || goalieExitEvent) ||
        changes.some(change => (change.oldPosition || '').toLowerCase() === 'goalie' || (change.newPosition || '').toLowerCase() === 'goalie');

      const newGoalieId = goalieEnterEvent?.player_id ||
        changes.find(change => (change.newPosition || '').toLowerCase() === 'goalie')?.playerId ||
        null;
      const goalieFromOldPosition = changes.find(change => (change.oldPosition || '').toLowerCase() === 'goalie');
      const goalieFromNewPosition = changes.find(change => (change.newPosition || '').toLowerCase() === 'goalie');
      const oldGoalieId = goalieFromOldPosition?.playerId ||
        goalieExitEvent?.player_id ||
        null;

      const newGoalieName = goalieEnterEvent
        ? getNameFromEvent(goalieEnterEvent)
        : (goalieFromNewPosition ? goalieFromNewPosition.playerName : null);
      const oldGoalieName = goalieExitEvent
        ? getNameFromEvent(goalieExitEvent)
        : (goalieFromOldPosition ? goalieFromOldPosition.playerName : null);

      const oldGoalieNewPosition = goalieFromOldPosition?.newPosition || null;
      const newGoaliePreviousPosition = goalieFromNewPosition?.oldPosition || null;

      // If it's only a goalie enters event without any goalie position change info, treat as a simple goalie assignment
      if (!hasGoalieChange && !goalieExitEvent && !goalieFromOldPosition && hasAnyGoalieEvent && !changes.length) {
        return {
          id: group.correlationId ? `pos-${group.correlationId}` : undefined,
          event_type: 'goalie_enters',
          correlation_id: group.correlationId,
          created_at: group.created_at || new Date().toISOString(),
          occurred_at_seconds: typeof group.occurred_at_seconds === 'number' ? group.occurred_at_seconds : 0,
          ordinal: group.ordinal,
          period: group.period,
          data: {
            ...(goalieEnterEvent?.data || {}),
            goalieId: newGoalieId,
            goalieName: newGoalieName || (newGoalieId ? playerNameMap.get(newGoalieId) : null)
          }
        };
      }

      return {
        id: group.correlationId ? `pos-${group.correlationId}` : undefined,
        event_type: hasGoalieChange ? 'goalie_switch' : 'position_switch_group',
        correlation_id: group.correlationId,
        created_at: group.created_at || new Date().toISOString(),
        occurred_at_seconds: typeof group.occurred_at_seconds === 'number' ? group.occurred_at_seconds : 0,
        ordinal: group.ordinal,
        period: group.period,
        data: {
          positionChanges: changes,
          ...(oldGoalieId ? { oldGoalieId } : {}),
          ...(newGoalieId ? { newGoalieId } : {}),
          ...(oldGoalieName ? { oldGoalieName } : {}),
          ...(newGoalieName ? { newGoalieName } : {}),
          ...(oldGoalieNewPosition ? { oldGoalieNewPosition } : {}),
          ...(newGoaliePreviousPosition ? { newGoaliePreviousPosition } : {})
        }
      };
    };

    positionSwitchGroups.forEach(group => {
      mergedEvents.push(buildPositionSwitchEvent(group));
    });

    return mergedEvents.sort((a, b) => getSortValue(a) - getSortValue(b));
  }, [events, playerNameMap]);

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
    return consolidatedEvents.map(event => {
      const normalizedData = { ...(event.data || {}) };

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
        timestamp: new Date(event.created_at).getTime(),
        matchTime: formatMatchTime(event.occurred_at_seconds),
        periodNumber: event.period,
        data: {
          ...normalizedData,
          playerId: event.player_id,
          scorerId: event.player_id,
          ownScore: normalizedData.ownScore,
          opponentScore: normalizedData.opponentScore
        },
        playerId: event.player_id
      };
    });
  }, [consolidatedEvents, playerNameMap]);

  // Loading state
  if (isLoading && events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading match events...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400 mr-2" />
              <h2 className="text-xl font-bold text-red-300">Error Loading Match</h2>
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
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-slate-400 text-center">No match events found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl md:max-w-4xl lg:max-w-5xl">
        {/* Live Match Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {matchMetadata.isLive ? (
                <>
                  <Radio className="h-6 w-6 text-red-500 mr-2 animate-pulse" />
                  <h1 className="text-2xl font-bold text-sky-300">LIVE Match</h1>
                </>
              ) : (
                <>
                  <Clock className="h-6 w-6 text-slate-400 mr-2" />
                  <h1 className="text-2xl font-bold text-slate-300">Match Finished</h1>
                </>
              )}
            </div>

            {matchMetadata.isLive && matchMetadata.currentPeriod > 0 && (
              <div className="text-sm text-slate-400">
                Period {matchMetadata.currentPeriod} - {currentPeriodMinute}'
              </div>
            )}
          </div>

          {/* Last Update Indicator */}
          {lastUpdateTime && (
            <div className="text-xs text-slate-500">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Match Summary */}
        <div className="space-y-6">
          <ReportSection icon={Clock} title="Match Summary">
            <MatchSummaryHeader
              ownTeamName={matchMetadata.ownTeamName}
              opponentTeam={matchMetadata.opponentName}
              ownScore={matchMetadata.ownScore}
              opponentScore={matchMetadata.opponentScore}
              matchStartTime={matchMetadata.matchStartTime}
              totalPeriods={matchMetadata.totalPeriods || matchMetadata.currentPeriod}
              periodDurationMinutes={matchMetadata.periodDurationMinutes || 15}
              matchDuration={matchMetadata.matchDurationSeconds || 0}
            />
          </ReportSection>

          {/* Event Timeline */}
          <ReportSection icon={Clock} title="Game Events">
            <GameEventTimeline
              events={transformedEvents}
              ownTeamName={matchMetadata.ownTeamName}
              opponentTeam={matchMetadata.opponentName}
              matchStartTime={matchMetadata.matchStartTime}
              showSubstitutions={true}
              goalScorers={goalScorers}
              getPlayerName={getPlayerDisplayName}
              onGoalClick={null}
              selectedPlayerId={null}
              availablePlayers={[]}
              onPlayerFilterChange={null}
              debugMode={false}
            />
          </ReportSection>
        </div>
      </div>
    </div>
  );
}
