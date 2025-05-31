import React, { useState } from 'react';
import { ListChecks, PlusCircle, Copy } from 'lucide-react';
import { Button } from './UI';
import { PLAYER_ROLES, calculateRolePoints } from '../utils/gameLogic';

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
  clearTimerState
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const squadForStats = allPlayers.filter(p => p.stats.startedMatchAs !== null); // Show only players who were part of the game

  const formatPoints = (points) => {
    return points % 1 === 0 ? points.toString() : points.toFixed(1);
  };

  const copyStatsToClipboard = async () => {
    const statsText = generateStatsText();
    try {
      await navigator.clipboard.writeText(statsText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy stats to clipboard:', err);
    }
  };

  const generateStatsText = () => {
    let text = "Spelare\t\tStart\tM\tB\tA\tUtespelare\n";
    text += "------\t\t-------\t-\t-\t-\t----------\n";
    
    squadForStats.forEach(player => {
      const { goaliePoints, defenderPoints, attackerPoints } = calculateRolePoints(player);
      const startedAs = player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'M' :
                       player.stats.startedMatchAs === PLAYER_ROLES.ON_FIELD ? 'S' :
                       player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'A' : '-';
      
      text += `${player.name}\t\t${startedAs}\t${formatPoints(goaliePoints)}\t${formatPoints(defenderPoints)}\t${formatPoints(attackerPoints)}\t${formatTime(player.stats.timeOnFieldSeconds)}\n`;
    });
    
    return text;
  };

  const handleNewGame = () => {
    // Reset global state for a new game configuration and clear localStorage
    clearStoredState(); // Clear localStorage state
    clearTimerState(); // Clear timer localStorage state
    setAllPlayers(initializePlayers(initialRoster)); // Full reset of all player stats
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setGameLog([]);
    setView('config');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
        <ListChecks className="mr-2 h-6 w-6" />Game Finished - Statistics
      </h2>

      <div className="overflow-x-auto bg-slate-700 rounded-lg p-1">
        <table className="min-w-full divide-y divide-slate-600">
          <thead className="bg-slate-800">
            <tr>
              {['Player', 'Started', 'M', 'B', 'A', 'Field Time'].map(header => (
                <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-slate-700 divide-y divide-slate-600">
            {squadForStats.map(player => {
              const { goaliePoints, defenderPoints, attackerPoints } = calculateRolePoints(player);
              return (
                <tr key={player.id}>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{player.name}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
                    {player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'M' :
                        player.stats.startedMatchAs === PLAYER_ROLES.ON_FIELD ? 'S' :
                            player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'A' : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(goaliePoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(defenderPoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{formatPoints(attackerPoints)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeOnFieldSeconds)}</td>
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
          <li>• Remaining points split between defender (B) and attacker (A) based on time played</li>
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

      <Button onClick={handleNewGame} Icon={PlusCircle}>
        Start New Game Configuration
      </Button>
    </div>
  );
}