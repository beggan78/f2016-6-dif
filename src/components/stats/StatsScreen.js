import React, { useState, useEffect } from 'react';
import { ListChecks, PlusCircle, Copy, FileText, Save, History } from 'lucide-react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { FeatureGate } from '../auth/FeatureGate';
import { PLAYER_ROLES } from '../../constants/playerConstants';
import { calculateRolePoints } from '../../utils/rolePointUtils';
import { formatPoints, generateStatsText, formatPlayerName } from '../../utils/formatUtils';
import { dataSyncManager } from '../../utils/DataSyncManager';

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
  authModal
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const squadForStats = allPlayers.filter(p => p.stats.startedMatchAs !== null); // Show only players who were part of the game

  // Update DataSyncManager when user changes
  useEffect(() => {
    if (user?.id) {
      dataSyncManager.setUserId(user.id);
    } else {
      dataSyncManager.setUserId(null);
    }
  }, [user]);


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
      // Prepare match data for saving
      const matchData = {
        players: squadForStats,
        ownScore: ownScore || 0,
        opponentScore: opponentScore || 0,
        opponentTeam: opponentTeam || 'Opponent',
        teamMode: teamMode || 'individual_6',
        numPeriods: numPeriods || 3,
        periodDurationMinutes: periodDurationMinutes || 15,
        captainId: captainId || null,
        matchEvents: matchEvents || [],
        gameLog: gameLog || [],
        matchDate: new Date().toISOString(),
        // Additional metadata
        totalPlayers: squadForStats.length,
        matchDuration: (numPeriods || 3) * (periodDurationMinutes || 15),
        result: ownScore > opponentScore ? 'win' : ownScore < opponentScore ? 'loss' : 'draw'
      };

      console.log('Saving match data:', matchData);
      
      const result = await dataSyncManager.saveMatch(matchData);
      
      if (result.success) {
        setSaveSuccess(true);
        console.log('Match saved successfully:', result);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setSaveError(result.error || 'Failed to save match');
        console.error('Failed to save match:', result);
      }
    } catch (err) {
      console.error('Exception while saving match:', err);
      setSaveError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleViewMatchHistory = () => {
    // TODO: Navigate to match history view
    console.log('Navigating to match history...');
  };


  const handleNewGame = () => {
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
                        player.stats.startedMatchAs === PLAYER_ROLES.ON_FIELD ? 'S' :
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
        Start New Game Configuration
      </Button>
    </div>
  );
}