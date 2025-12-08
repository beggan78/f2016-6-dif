import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Radio, Clock, AlertCircle } from 'lucide-react';
import { MatchSummaryHeader } from '../report/MatchSummaryHeader';
import { GameEventTimeline } from '../report/GameEventTimeline';
import { ReportSection } from '../report/ReportSection';

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
    const opponentName = matchStartEvent?.data?.opponentName || 'Opponent';

    // Calculate scores
    const ownScore = goalScoredEvents.length;
    const opponentScore = goalConcededEvents.length;

    // Determine current period
    const currentPeriod = periodStartEvents.length;

    // Calculate match start time from match_started event
    const matchStartTime = matchStartEvent ? new Date(matchStartEvent.created_at).getTime() : null;

    // Check if match is live (no match_ended event)
    const isLive = !matchEndEvent;

    return {
      ownTeamName,
      opponentName,
      ownScore,
      opponentScore,
      currentPeriod,
      matchStartTime,
      isLive
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
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const url = new URL(`${supabaseUrl}/functions/v1/get-live-match-events`);
      url.searchParams.set('match_id', matchId);

      if (since !== null) {
        url.searchParams.set('since_ordinal', since.toString());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
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
  }, [matchId]);

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

  // Transform database events to UI format for GameEventTimeline
  const transformedEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      type: mapDatabaseEventToUIType(event.event_type),
      timestamp: new Date(event.created_at).getTime(),
      matchTime: formatMatchTime(event.occurred_at_seconds),
      periodNumber: event.period,
      data: {
        ...(event.data || {}),
        playerId: event.player_id,
        scorerId: event.player_id,
        ownScore: event.data?.ownScore,
        opponentScore: event.data?.opponentScore
      },
      playerId: event.player_id
    }));
  }, [events]);

  // Map database event types to UI event types
  const mapDatabaseEventToUIType = (dbEventType) => {
    const mapping = {
      'match_started': 'match_start',
      'match_ended': 'match_end',
      'period_started': 'period_start',
      'period_ended': 'period_end',
      'goal_scored': 'goal_scored',
      'goal_conceded': 'goal_conceded',
      'substitution_in': 'substitution',
      'substitution_out': 'substitution',
      'goalie_enters': 'goalie_assignment',
      'goalie_exits': 'goalie_switch',
      'position_switch': 'position_change',
      'player_inactivated': 'player_inactivated',
      'player_activated': 'player_activated'
    };

    return mapping[dbEventType] || dbEventType;
  };

  // Format match time from seconds to MM:SS
  const formatMatchTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
              totalPeriods={matchMetadata.currentPeriod}
              periodDurationMinutes={15} // Default, could be extracted from config if available
              matchDuration={0} // Not calculated for live view
            />
          </ReportSection>

          {/* Event Timeline */}
          <ReportSection icon={Clock} title="Match Events">
            <GameEventTimeline
              events={transformedEvents}
              ownTeamName={matchMetadata.ownTeamName}
              opponentTeam={matchMetadata.opponentName}
              matchStartTime={matchMetadata.matchStartTime}
              showSubstitutions={true}
              goalScorers={{}}
              getPlayerName={() => null} // No player names in public view
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
