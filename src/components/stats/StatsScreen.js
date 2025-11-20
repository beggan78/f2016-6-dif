import React, { useState, useMemo } from 'react';
import { ListChecks, PlusCircle, FileText, Save } from 'lucide-react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { FeatureGate } from '../auth/FeatureGate';
import { formatPlayerName } from '../../utils/formatUtils';
import { hasPlayerParticipated } from '../../utils/playerUtils';
import { updateMatchToConfirmed } from '../../services/matchStateManager';
import { MatchSummaryHeader } from '../report/MatchSummaryHeader';
import { PlayerStatsTable } from '../report/PlayerStatsTable';

export function StatsScreen({
  allPlayers,
  formatTime,
  setView,
  setAllPlayers,
  setSelectedSquadIds,
  setPeriodGoalieIds,
  setGameLog,
  initializePlayers,
  initialRoster,
  clearStoredState,
  clearTimerState,
  ownScore,
  opponentScore,
  opponentTeam,
  resetScore,
  setOpponentTeam,
  navigateToMatchReport,
  // Additional props for match data persistence
  matchEvents = [],
  gameLog = [],
  currentMatchId,
  goalScorers = {},
  authModal,
  checkForActiveMatch,
  selectedSquadIds = [],
  onStartNewConfigurationSession = () => {},
  // New props for MatchSummaryHeader and PlayerStatsTable
  matchStartTime,
  periodDurationMinutes = 12,
  formation = {}
}) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fairPlayAwardPlayerId, setFairPlayAwardPlayerId] = useState(null);
  const { isAuthenticated } = useAuth();

  // Calculate match duration and total periods (same as MatchReportScreen)
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

  const participantSet = Array.isArray(selectedSquadIds) && selectedSquadIds.length > 0
    ? new Set(selectedSquadIds)
    : null;

  const squadForStats = allPlayers.filter(player => {
    if (participantSet && !participantSet.has(player.id)) {
      return false;
    }
    return hasPlayerParticipated(player);
  }); // Hide bench players who never stepped on the field
  

  // Fair Play Award styling constants
  const FAIR_PLAY_AWARD_STYLES = {
    container: "bg-gradient-to-r from-emerald-900/20 to-emerald-800/20 border border-emerald-500/40 shadow-emerald-500/20 shadow-lg rounded-lg p-4",
    header: "text-lg font-semibold text-emerald-200 flex items-center",
    dropdown: "w-full appearance-none bg-emerald-900/20 border border-emerald-500/60 text-emerald-100 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:shadow-emerald-300/50 focus:shadow-lg transition-colors",
    dropdownArrow: "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-400",
    confirmation: "mt-3 p-3 bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-400/50 shadow-emerald-400/30 shadow-lg rounded-lg",
    confirmationText: "text-emerald-200 font-medium flex items-center",
    confirmationBadge: "text-xs text-emerald-300/90 font-semibold"
  };

  // Helper functions
  const getSelectedPlayerName = (playerId, players) => {
    const player = players.find(p => p.id === playerId);
    return player ? formatPlayerName(player) : '';
  };

  const updatePlayersWithFairPlayAward = (players, awardPlayerId) => {
    if (!awardPlayerId) return players;
    
    return players.map(player => ({
      ...player,
      hasFairPlayAward: player.id === awardPlayerId
    }));
  };

  const handleFairPlayAwardChange = (event) => {
    const selectedPlayerId = event.target.value || null;
    setFairPlayAwardPlayerId(selectedPlayerId);
  };

  const handleSaveMatchHistory = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      if (!currentMatchId) {
        setSaveError('No match ID found. Please restart the match to enable saving.');
        console.error('❌ Cannot save match: currentMatchId is missing');
        return;
      }

      // Update player state with fair play award selection before saving
      if (fairPlayAwardPlayerId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🏆 Setting fair play award for player:', fairPlayAwardPlayerId);
        }
        
        setAllPlayers(prevPlayers => updatePlayersWithFairPlayAward(prevPlayers, fairPlayAwardPlayerId));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Confirming match in database:', currentMatchId, fairPlayAwardPlayerId ? 'with fair play award' : 'without fair play award');
      }
      
      const result = await updateMatchToConfirmed(currentMatchId, fairPlayAwardPlayerId);
      
      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Match confirmed successfully');
          if (fairPlayAwardPlayerId) {
            console.log('🏆 Fair play award updated in player stats');
          }
        }
        
        setSaveSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setSaveSuccess(false);
        setSaveError(result.error || 'Failed to confirm match');
        console.error('❌ Failed to confirm match:', result);
      }
    } catch (err) {
      console.error('❌ Exception while saving match:', err);
      setSaveError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleNewGame = async () => {
    console.log('📊 New Game from Stats Screen - calling checkForActiveMatch()');
    await checkForActiveMatch(() => {
      console.log('📊 New Game from Stats - executing callback (full reset)');
      // Reset global state for a new game configuration and clear localStorage
      clearStoredState(); // Clear localStorage state
      clearTimerState(); // Clear timer localStorage state
      setAllPlayers(initializePlayers(initialRoster)); // Full reset of all player stats
      setSelectedSquadIds([]);
      setPeriodGoalieIds({});
      setGameLog([]);
      resetScore(); // Clear score
      setOpponentTeam(''); // Clear opponent team name
      onStartNewConfigurationSession();
      setView('config');
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
          <ListChecks className="mr-2 h-6 w-6" />Game Finished - Statistics
        </h2>
      </div>

      {/* Match Summary */}
      <div className="p-4 bg-slate-700 rounded-lg">
        <MatchSummaryHeader
          ownTeamName="Djurgården"
          opponentTeam={opponentTeam || 'Opponent'}
          ownScore={ownScore}
          opponentScore={opponentScore}
          matchStartTime={matchStartTime}
          matchDuration={matchDuration}
          totalPeriods={totalPeriods}
          periodDurationMinutes={periodDurationMinutes}
        />
      </div>

      {/* Fair Play Award Selection */}
      <div className={FAIR_PLAY_AWARD_STYLES.container} data-testid="fair-play-award-section">
        <div className="flex items-center justify-between mb-3">
          <h3 className={FAIR_PLAY_AWARD_STYLES.header}>
            🏆 Fair Play Award
          </h3>
        </div>

        <div className="relative">
          <select
            value={fairPlayAwardPlayerId || ''}
            onChange={handleFairPlayAwardChange}
            className={FAIR_PLAY_AWARD_STYLES.dropdown}
            data-testid="fair-play-award-dropdown"
          >
            <option value="" className="bg-slate-800">Not awarded</option>
            {squadForStats.map(player => (
              <option key={player.id} value={player.id} className="bg-slate-800">
                {formatPlayerName(player)}
              </option>
            ))}
          </select>
          <div className={FAIR_PLAY_AWARD_STYLES.dropdownArrow}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Selection confirmation */}
        {fairPlayAwardPlayerId && (
          <div className={FAIR_PLAY_AWARD_STYLES.confirmation} data-testid="fair-play-confirmation">
            <div className="flex items-center justify-between">
              <span className={FAIR_PLAY_AWARD_STYLES.confirmationText}>
                ✨ {getSelectedPlayerName(fairPlayAwardPlayerId, squadForStats)}
              </span>
              <span className={FAIR_PLAY_AWARD_STYLES.confirmationBadge}>FAIR PLAY WINNER</span>
            </div>
          </div>
        )}
      </div>

      {/* Save Match to History - Protected */}
      {isAuthenticated ? (
        <div className="space-y-2">
          <div className="flex gap-3 items-center">
            <Button
              onClick={handleSaveMatchHistory}
              Icon={Save}
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Match to History'}
            </Button>
            {saveSuccess && (
              <span className="text-emerald-400 text-sm font-medium">
                ✓ Match saved successfully!
              </span>
            )}
          </div>

          {saveError && (
            <div className="p-2 bg-rose-900/20 border border-rose-600 rounded text-rose-200 text-sm">
              ❌ {saveError}
            </div>
          )}
        </div>
      ) : (
        <FeatureGate
          feature="match history"
          description="Save this match to your history and track your team's performance over time"
          compact
          authModal={authModal}
        >
          <Button Icon={Save} variant="primary" disabled>
            Save Match to History
          </Button>
        </FeatureGate>
      )}

      {/* Player Statistics */}
      <PlayerStatsTable
        players={squadForStats}
        formation={formation}
        matchEvents={matchEvents}
        goalScorers={goalScorers}
      />

      <Button onClick={navigateToMatchReport} Icon={FileText} variant="primary">
        View Match Log
      </Button>

      <Button onClick={handleNewGame} Icon={PlusCircle}>
        Start New Game
      </Button>

    </div>
  );
}
