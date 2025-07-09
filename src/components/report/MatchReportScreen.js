import React, { useState, useMemo, useCallback } from 'react';
import { FileText, BarChart3, Clock, Users, Trophy, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '../shared/UI';
import { TEAM_CONFIG } from '../../constants/teamConstants';
import { TEAM_MODES } from '../../constants/playerConstants';

// Placeholder imports - these components will be created next
import { MatchSummaryHeader } from './MatchSummaryHeader';
import { PlayerStatsTable } from './PlayerStatsTable';
import { GameEventTimeline } from './GameEventTimeline';
import { ReportControls } from './ReportControls';

/**
 * MatchReportScreen - Comprehensive post-match report component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.matchEvents - Array of events from gameEventLogger
 * @param {number} props.matchStartTime - Match start timestamp
 * @param {Array} props.allPlayers - Player data with stats
 * @param {Array} props.gameLog - Period-by-period data
 * @param {number} props.homeScore - Final home team score
 * @param {number} props.awayScore - Final away team score
 * @param {number} props.periodDurationMinutes - Duration of each period
 * @param {string} props.teamMode - Team mode (PAIRS_7, INDIVIDUAL_6, etc.)
 * @param {string} props.homeTeamName - Home team name (defaults to "Djurgården")
 * @param {string} props.awayTeamName - Away team name
 * @param {Function} props.onNavigateToStats - Navigation callback to stats screen
 * @param {Function} props.onBackToGame - Navigation callback to game screen
 * @param {Function} props.navigateToMatchReport - Internal navigation callback
 * @param {Object} props.goalScorers - Object mapping event IDs to player IDs for goal attribution
 * @param {Function} props.onGoalClick - Callback for when goal events are clicked for editing
 */
export function MatchReportScreen({
  matchEvents = [],
  matchStartTime,
  allPlayers = [],
  gameLog = [],
  homeScore = 0,
  awayScore = 0,
  periodDurationMinutes = 12,
  teamMode = TEAM_MODES.PAIRS_7,
  homeTeamName = TEAM_CONFIG.HOME_TEAM_NAME || "Djurgården",
  awayTeamName = "Opponent",
  goalScorers = {},
  onNavigateToStats,
  onBackToGame,
  navigateToMatchReport,
  onGoalClick
}) {
  // Local state for UI controls
  const [showSubstitutionEvents, setShowSubstitutionEvents] = useState(false);

  // Memoized calculations
  const matchDuration = useMemo(() => {
    console.log('[DEBUG] MatchReportScreen - Calculating match duration:', {
      matchStartTime,
      matchEventsLength: matchEvents ? matchEvents.length : 0,
      matchEvents: matchEvents ? matchEvents.slice(0, 3) : [] // Log first 3 events for debugging
    });
    
    if (!matchStartTime) {
      console.log('[DEBUG] MatchReportScreen - No matchStartTime, returning 0');
      return 0;
    }
    
    const endTime = matchEvents && matchEvents.length > 0 
      ? Math.max(...matchEvents.map(e => e.timestamp)) 
      : Date.now();
    
    const duration = Math.floor((endTime - matchStartTime) / 1000);
    
    console.log('[DEBUG] MatchReportScreen - Calculated duration:', {
      endTime,
      matchStartTime,
      durationSeconds: duration
    });
    
    return duration;
  }, [matchEvents, matchStartTime]);

  const totalPeriods = useMemo(() => {
    return gameLog.length;
  }, [gameLog]);

  const squadPlayers = useMemo(() => {
    if (!allPlayers) return [];
    return allPlayers.filter(p => p.stats.startedMatchAs !== null);
  }, [allPlayers]);

  const filteredEvents = useMemo(() => {
    if (!matchEvents) return [];
    
    let filtered = matchEvents;
    
    // Filter substitution events if toggle is off
    if (!showSubstitutionEvents) {
      filtered = filtered.filter(event => 
        event.type !== 'substitution' && 
        event.type !== 'position_change' &&
        event.type !== 'goalie_change'
      );
    }
    
    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }, [matchEvents, showSubstitutionEvents]);


  // Helper function to get player name by ID
  const getPlayerName = useCallback((playerId) => {
    const player = allPlayers.find(p => p.id === playerId);
    return player ? player.name : null;
  }, [allPlayers]);

  // Error handling for missing data
  if (!allPlayers || allPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-sky-400 mr-2" />
              <h1 className="text-2xl font-bold text-sky-300">Match Report</h1>
            </div>
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No match data available</p>
              <Button onClick={onNavigateToStats} variant="secondary" Icon={BarChart3}>
                View Stats
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Main Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-sky-400 mr-2" />
            <h1 className="text-2xl font-bold text-sky-300">Match Report</h1>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            {onNavigateToStats && (
              <Button 
                onClick={onNavigateToStats} 
                variant="secondary" 
                Icon={BarChart3}
                size="sm"
              >
                View Stats
              </Button>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="space-y-6">
          {/* Match Summary Section */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <Trophy className="h-5 w-5 text-sky-400 mr-2" />
              <h2 className="text-xl font-semibold text-sky-300">Match Summary</h2>
            </div>
            
            <MatchSummaryHeader
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeScore={homeScore}
              awayScore={awayScore}
              matchDuration={matchDuration}
              totalPeriods={totalPeriods}
              periodDurationMinutes={periodDurationMinutes}
              teamMode={teamMode}
              matchStartTime={matchStartTime}
            />
          </section>

          {/* Player Statistics Section */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <Users className="h-5 w-5 text-sky-400 mr-2" />
              <h2 className="text-xl font-semibold text-sky-300">Player Statistics</h2>
            </div>
            
            <PlayerStatsTable
              players={squadPlayers}
              teamMode={teamMode}
            />
          </section>

          {/* Game Events Timeline Section */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-sky-400 mr-2" />
                <h2 className="text-xl font-semibold text-sky-300">Game Events</h2>
              </div>
              <button
                onClick={() => setShowSubstitutionEvents(!showSubstitutionEvents)}
                className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors ${
                  showSubstitutionEvents 
                    ? 'bg-sky-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {showSubstitutionEvents ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Substitutions</span>
              </button>
            </div>
            
            <GameEventTimeline
              events={filteredEvents}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              matchStartTime={matchStartTime}
              showSubstitutions={showSubstitutionEvents}
              goalScorers={goalScorers}
              getPlayerName={getPlayerName}
              onGoalClick={onGoalClick}
            />
          </section>

          {/* Report Controls Section */}
          <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 text-sky-400 mr-2" />
              <h2 className="text-xl font-semibold text-sky-300">Report Actions</h2>
            </div>
            
            <ReportControls
              matchEvents={matchEvents}
              allPlayers={allPlayers}
              gameLog={gameLog}
              homeScore={homeScore}
              awayScore={awayScore}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              matchStartTime={matchStartTime}
              periodDurationMinutes={periodDurationMinutes}
              teamMode={teamMode}
              onNavigateToStats={onNavigateToStats}
            />
          </section>
        </div>
      </div>
    </div>
  );
}