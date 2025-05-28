import React from 'react';
import { ListChecks, PlusCircle } from 'lucide-react';
import { Button } from './UI';
import { PLAYER_ROLES } from '../utils/gameLogic';

export function StatsScreen({ 
  allPlayers, 
  formatTime, 
  setView, 
  setAllPlayers, 
  setSelectedSquadIds, 
  setPeriodGoalieIds, 
  setGameLog,
  initializePlayers,
  initialRoster
}) {
  const squadForStats = allPlayers.filter(p => p.stats.startedMatchAs !== null); // Show only players who were part of the game

  const handleNewGame = () => {
    // Reset global state for a new game configuration
    setAllPlayers(prev => initializePlayers(initialRoster)); // Full reset of all player stats
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setGameLog([]);
    setView('config');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
        <ListChecks className="mr-2 h-6 w-6" />Game Over - Statistics
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
            {squadForStats.map(player => (
              <tr key={player.id}>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{player.name}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
                  {player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'M' :
                      player.stats.startedMatchAs === PLAYER_ROLES.ON_FIELD ? 'S' :
                          player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'A' : '-'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{player.stats.periodsAsGoalie}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{player.stats.periodsAsDefender}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{player.stats.periodsAsAttacker}</td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeOnFieldSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleNewGame} Icon={PlusCircle}>
        Start New Game Configuration
      </Button>
    </div>
  );
}