import React, { useState } from 'react';
import { ListChecks, PlusCircle, Copy, FileText, Save, History } from 'lucide-react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { FeatureGate } from '../auth/FeatureGate';
import { PLAYER_ROLES } from '../../constants/playerConstants';
import { calculateRolePoints } from '../../utils/rolePointUtils';
import { formatPoints, generateStatsText, formatPlayerName } from '../../utils/formatUtils';
import { updateMatchToConfirmed, insertPlayerMatchStats } from '../../services/matchStateManager';

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
  teamMode,
  numPeriods,
  periodDurationMinutes,
  captainId,
  matchEvents,
  gameLog,
  currentMatchId,
  goalScorers,
  authModal,
  checkForActiveMatch
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fairPlayAwardPlayerId, setFairPlayAwardPlayerId] = useState(null);
  const { isAuthenticated } = useAuth();
  const squadForStats = allPlayers.filter(p => p.stats.startedMatchAs !== null); // Show only players who were part of the game
  

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

  const copyStatsToClipboard = async () => {
    const statsText = generateStatsText(squadForStats, ownScore, opponentScore, opponentTeam);
    try {
      await navigator.clipboard.writeText(statsText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy stats to clipboard:', err);
    }
  };

  const handleSaveMatchHistory = async () => {
    setSaving(true);
    setSaveError(null);
    
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
        }
        
        // Insert player match statistics (with updated fair play award status)
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Inserting player match statistics...');
        }
        
        // Use the updated allPlayers state that includes the fair play award
        const updatedPlayers = updatePlayersWithFairPlayAward(allPlayers, fairPlayAwardPlayerId);
          
        const playerStatsResult = await insertPlayerMatchStats(currentMatchId, updatedPlayers, goalScorers, matchEvents);
        
        if (playerStatsResult.success) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Player stats inserted: ${playerStatsResult.inserted} players`);
          }
          setSaveSuccess(true);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);
        } else {
          console.warn('⚠️  Match confirmed but failed to save player stats:', playerStatsResult.error);
          // Still show success since match was confirmed, but log the player stats issue
          setSaveSuccess(true);
          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);
        }
      } else {
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

  const handleViewMatchHistory = () => {
    // TODO: Navigate to match history view
    if (process.env.NODE_ENV === 'development') {
      console.log('Navigating to match history...');
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
      setView('config');
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
        <ListChecks className="mr-2 h-6 w-6" />Game Finished - Statistics
      </h2>

      {/* Final Score Display */}
      <div className="p-4 bg-slate-700 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-sky-200 mb-3">Final Score</h3>
        <div className="flex items-center justify-center space-x-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-sky-400">{ownScore}</div>
            <div className="text-sm text-slate-300 font-semibold">Djurgården</div>
          </div>
          <div className="text-2xl font-mono font-bold text-slate-400">-</div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-400">{opponentScore}</div>
            <div className="text-sm text-slate-300 font-semibold">{opponentTeam || 'Opponent'}</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-700 rounded-lg p-1">
        <table className="min-w-full divide-y divide-slate-600">
          <thead className="bg-slate-800">
            <tr>
              {['Spelare', 'Start', 'M', 'B', 'Mit', 'A', 'Ute', 'Back', 'Mid', 'Fw', 'Mv'].map(header => (
                <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-slate-700 divide-y divide-slate-600">
            {squadForStats.map(player => {
              const { goaliePoints, defenderPoints, midfielderPoints, attackerPoints } = calculateRolePoints(player);
              return (
                <tr key={player.id}>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{formatPlayerName(player)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
                    {player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'M' :
                        player.stats.startedMatchAs === PLAYER_ROLES.FIELD_PLAYER ? 'S' :
                            player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'A' : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(goaliePoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(defenderPoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(midfielderPoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(attackerPoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeOnFieldSeconds)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeAsDefenderSeconds)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeAsMidfielderSeconds || 0)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeAsAttackerSeconds)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeAsGoalieSeconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-slate-400 bg-slate-800 p-3 rounded-lg">
        <p className="font-medium text-sky-200 mb-2">Points System:</p>
        <ul className="space-y-1">
          <li>• Each player gets exactly 3 points total</li>
          <li>• 1 point per period as goalie (M)</li>
          <li>• Remaining points split between defender (B), midfielder (Mit), and attacker (A) based on time played</li>
          <li>• Points awarded in 0.5 increments</li>
        </ul>
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

      <div className="flex gap-3 items-center">
        <Button onClick={copyStatsToClipboard} Icon={Copy}>
          Copy Statistics
        </Button>
        {copySuccess && (
          <span className="text-green-400 text-sm font-medium">
            ✓ Statistics copied to clipboard!
          </span>
        )}
      </div>

      {/* Match History Features - Protected */}
      <div className="space-y-4">
        {isAuthenticated ? (
          <div className="space-y-3">
            {/* Save Match Button for Authenticated Users */}
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

            {/* View Match History Button */}
            <Button 
              onClick={handleViewMatchHistory} 
              Icon={History}
              variant="secondary"
            >
              View Match History
            </Button>
          </div>
        ) : (
          /* Authentication Gate for Anonymous Users */
          <FeatureGate
            feature="match history"
            description="Save this match to your history and track your team's performance over time"
            compact
            authModal={authModal}
          >
            <div className="space-y-3">
              <Button Icon={Save} variant="primary" disabled>
                Save Match to History
              </Button>
              <Button Icon={History} variant="secondary" disabled>
                View Match History
              </Button>
            </div>
          </FeatureGate>
        )}
      </div>

      <Button onClick={navigateToMatchReport} Icon={FileText} variant="primary">
        View Match Report
      </Button>

      <Button onClick={handleNewGame} Icon={PlusCircle}>
        Start New Game
      </Button>

    </div>
  );
}