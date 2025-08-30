import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Clock, Users, Trophy, Settings } from 'lucide-react';
import { TEAM_CONFIG } from '../../constants/teamConstants';

// Placeholder imports - these components will be created next
import { MatchSummaryHeader } from './MatchSummaryHeader';
import { PlayerStatsTable } from './PlayerStatsTable';
import { GameEventTimeline } from './GameEventTimeline';
import { ReportControls } from './ReportControls';
import { ReportSection } from './ReportSection';
import { EventToggleButton } from './EventToggleButton';
import { ReportNavigation } from './ReportNavigation';

/**
 * MatchReportScreen - Comprehensive post-match report component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.matchEvents - Array of events from gameEventLogger
 * @param {number} props.matchStartTime - Match start timestamp
 * @param {Array} props.allPlayers - Player data with stats
 * @param {Array} props.gameLog - Period-by-period data
 * @param {number} props.ownScore - Final own team score
 * @param {number} props.opponentScore - Final opponent team score
 * @param {number} props.periodDurationMinutes - Duration of each period
 * @param {string} props.ownTeamName - Own team name (defaults to "Djurgården")
 * @param {string} props.opponentTeam - Opponent team name
 * @param {Function} props.onNavigateToStats - Navigation callback to stats screen
 * @param {Function} props.onNavigateBack - Navigation callback for general back navigation
 * @param {Function} props.navigateToMatchReport - Internal navigation callback
 * @param {Object} props.goalScorers - Object mapping event IDs to player IDs for goal attribution
 * @param {Function} props.onGoalClick - Callback for when goal events are clicked for editing
 * @param {Object} props.formation - Current period formation for starting role determination
 * @param {boolean} props.debugMode - Whether debug mode is active (shows SUBSTITUTION_UNDONE events)
 */
export function MatchReportScreen({
  matchEvents = [],
  matchStartTime,
  allPlayers = [],
  gameLog = [],
  ownScore = 0,
  opponentScore = 0,
  periodDurationMinutes = 12,
  ownTeamName = TEAM_CONFIG.OWN_TEAM_NAME || "Djurgården",
  opponentTeam = "Opponent",
  goalScorers = {},
  onNavigateToStats,
  onNavigateBack,
  navigateToMatchReport,
  onGoalClick,
  formation = {},
  debugMode = false
}) {
  // Local state for UI controls
  const [showSubstitutionEvents, setShowSubstitutionEvents] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Memoized calculations
  const matchDuration = useMemo(() => {
    if (!matchStartTime) {
      return 0;
    }
    
    const endTime = matchEvents && matchEvents.length > 0 
      ? Math.max(...matchEvents.map(e => e.timestamp)) 
      : Date.now();
    
    const duration = Math.floor((endTime - matchStartTime) / 1000);
    
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


  // Helper function to get player name by ID with captain designation
  const getPlayerName = useCallback((playerId) => {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return null;
    return player.stats?.isCaptain ? `${player.name} (C)` : player.name;
  }, [allPlayers]);

  // Handler for player filter changes
  const handlePlayerFilterChange = useCallback((playerId) => {
    setSelectedPlayerId(playerId);
    // Auto-enable substitutions when a specific player is selected
    if (playerId) {
      setShowSubstitutionEvents(true);
    }
  }, []);

  // Error handling for missing data
  if (!allPlayers || allPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl md:max-w-4xl lg:max-w-5xl">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-sky-400 mr-2" />
              <h1 className="text-2xl font-bold text-sky-300">Match Report</h1>
            </div>
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No match data available</p>
              <ReportNavigation 
                onNavigateToStats={onNavigateToStats}
                onNavigateBack={onNavigateBack}
                className="justify-center"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl md:max-w-4xl lg:max-w-5xl">
        {/* Main Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-sky-400 mr-2" />
            <h1 className="text-2xl font-bold text-sky-300">Match Report</h1>
          </div>
          
          {/* Navigation Controls */}
          <ReportNavigation 
            onNavigateToStats={onNavigateToStats}
            onNavigateBack={onNavigateBack}
          />
        </div>

        {/* Report Content */}
        <div className="space-y-6">
          {/* Match Summary Section */}
          <ReportSection icon={Trophy} title="Match Summary">
            <MatchSummaryHeader
              ownTeamName={ownTeamName}
              opponentTeam={opponentTeam}
              ownScore={ownScore}
              opponentScore={opponentScore}
              matchDuration={matchDuration}
              totalPeriods={totalPeriods}
              periodDurationMinutes={periodDurationMinutes}
              matchStartTime={matchStartTime}
            />
          </ReportSection>

          {/* Player Statistics Section */}
          <ReportSection icon={Users} title="Player Statistics">
            <PlayerStatsTable
              players={squadPlayers}
              formation={formation}
              matchEvents={matchEvents}
              goalScorers={goalScorers}
            />
          </ReportSection>

          {/* Game Events Timeline Section */}
          <ReportSection 
            icon={Clock} 
            title="Game Events"
            headerExtra={
              <EventToggleButton
                isVisible={showSubstitutionEvents}
                onToggle={() => setShowSubstitutionEvents(!showSubstitutionEvents)}
              />
            }
          >
            <GameEventTimeline
              events={filteredEvents}
              ownTeamName={ownTeamName}
              opponentTeam={opponentTeam}
              matchStartTime={matchStartTime}
              showSubstitutions={showSubstitutionEvents}
              goalScorers={goalScorers}
              getPlayerName={getPlayerName}
              onGoalClick={onGoalClick}
              selectedPlayerId={selectedPlayerId}
              availablePlayers={squadPlayers}
              onPlayerFilterChange={handlePlayerFilterChange}
              debugMode={debugMode}
            />
          </ReportSection>

          {/* Report Controls Section */}
          <ReportSection icon={Settings} title="Report Actions">
            <ReportControls
              matchEvents={matchEvents}
              allPlayers={allPlayers}
              gameLog={gameLog}
              ownScore={ownScore}
              opponentScore={opponentScore}
              ownTeamName={ownTeamName}
              opponentTeam={opponentTeam}
              matchStartTime={matchStartTime}
              periodDurationMinutes={periodDurationMinutes}
              onNavigateToStats={onNavigateToStats}
            />
          </ReportSection>
        </div>
      </div>
    </div>
  );
}