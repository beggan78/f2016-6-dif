import React, { useState } from 'react';
import { Users, Clock, Target, Star, Award } from 'lucide-react';

// Mock player data - replace with actual database queries
const mockPlayerStats = [
  {
    id: 1,
    name: 'Emma Andersson',
    matchesPlayed: 22,
    goalsScored: 8,
    averageTimePerMatch: 42, // minutes
    defenderPercentage: 35,
    midfielderPercentage: 25,
    attackerPercentage: 30,
    goaliePercentage: 10,
    substituteStartPercentage: 15,
    captainMatches: 5,
    fairPlayAwards: 2
  },
  {
    id: 2,
    name: 'Lucas Eriksson',
    matchesPlayed: 24,
    goalsScored: 12,
    averageTimePerMatch: 38,
    defenderPercentage: 20,
    midfielderPercentage: 40,
    attackerPercentage: 35,
    goaliePercentage: 5,
    substituteStartPercentage: 25,
    captainMatches: 3,
    fairPlayAwards: 1
  },
  {
    id: 3,
    name: 'Sofia Karlsson',
    matchesPlayed: 20,
    goalsScored: 15,
    averageTimePerMatch: 45,
    defenderPercentage: 15,
    midfielderPercentage: 30,
    attackerPercentage: 50,
    goaliePercentage: 5,
    substituteStartPercentage: 10,
    captainMatches: 8,
    fairPlayAwards: 3
  },
  {
    id: 4,
    name: 'Oliver Johansson',
    matchesPlayed: 23,
    goalsScored: 2,
    averageTimePerMatch: 35,
    defenderPercentage: 60,
    midfielderPercentage: 20,
    attackerPercentage: 15,
    goaliePercentage: 5,
    substituteStartPercentage: 30,
    captainMatches: 1,
    fairPlayAwards: 4
  },
  {
    id: 5,
    name: 'Maja Lindqvist',
    matchesPlayed: 21,
    goalsScored: 0,
    averageTimePerMatch: 40,
    defenderPercentage: 25,
    midfielderPercentage: 20,
    attackerPercentage: 15,
    goaliePercentage: 40,
    substituteStartPercentage: 20,
    captainMatches: 2,
    fairPlayAwards: 1
  },
  {
    id: 6,
    name: 'Filip Gustafsson',
    matchesPlayed: 19,
    goalsScored: 6,
    averageTimePerMatch: 36,
    defenderPercentage: 45,
    midfielderPercentage: 35,
    attackerPercentage: 15,
    goaliePercentage: 5,
    substituteStartPercentage: 35,
    captainMatches: 0,
    fairPlayAwards: 2
  }
];

const SORT_OPTIONS = {
  NAME: 'name',
  MATCHES: 'matchesPlayed',
  GOALS: 'goalsScored',
  TIME: 'averageTimePerMatch',
  CAPTAIN: 'captainMatches',
  FAIR_PLAY: 'fairPlayAwards'
};

export function PlayerStatistics({ dateRange }) {
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.MATCHES);
  const [sortOrder, setSortOrder] = useState('desc');

  const sortedPlayers = [...mockPlayerStats].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === SORT_OPTIONS.NAME) {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  const getPositionColor = (percentage) => {
    if (percentage >= 40) return 'text-emerald-400';
    if (percentage >= 25) return 'text-yellow-400';
    if (percentage >= 15) return 'text-orange-400';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-sky-300 mb-2">Player Statistics</h2>
          <p className="text-slate-400">
            {dateRange.start ? `From ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}` : 'All time player performance'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-slate-400" />
          <span className="text-slate-300">{mockPlayerStats.length} Players</span>
        </div>
      </div>

      {/* Statistics Table */}
      <div className="bg-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort(SORT_OPTIONS.NAME)}
                >
                  Player {getSortIcon(SORT_OPTIONS.NAME)}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort(SORT_OPTIONS.MATCHES)}
                >
                  Matches {getSortIcon(SORT_OPTIONS.MATCHES)}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort(SORT_OPTIONS.GOALS)}
                >
                  Goals {getSortIcon(SORT_OPTIONS.GOALS)}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort(SORT_OPTIONS.TIME)}
                >
                  Avg Time {getSortIcon(SORT_OPTIONS.TIME)}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Position Distribution
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">
                  Sub Start %
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort(SORT_OPTIONS.CAPTAIN)}
                >
                  Captain {getSortIcon(SORT_OPTIONS.CAPTAIN)}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider cursor-pointer hover:bg-slate-700"
                  onClick={() => handleSort(SORT_OPTIONS.FAIR_PLAY)}
                >
                  Fair Play {getSortIcon(SORT_OPTIONS.FAIR_PLAY)}
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-700 divide-y divide-slate-600">
              {sortedPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-slate-600 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-slate-100">{player.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {player.matchesPlayed}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{player.goalsScored}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{player.averageTimePerMatch}m</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">D:</span>
                        <span className={getPositionColor(player.defenderPercentage)}>{player.defenderPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">M:</span>
                        <span className={getPositionColor(player.midfielderPercentage)}>{player.midfielderPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">A:</span>
                        <span className={getPositionColor(player.attackerPercentage)}>{player.attackerPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">G:</span>
                        <span className={getPositionColor(player.goaliePercentage)}>{player.goaliePercentage}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {player.substituteStartPercentage}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-slate-300">{player.captainMatches}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Award className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-slate-300">{player.fairPlayAwards}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-sky-400" />
            <div>
              <p className="text-slate-400 text-sm">Total Goals</p>
              <p className="text-xl font-bold text-sky-400">
                {mockPlayerStats.reduce((sum, player) => sum + player.goalsScored, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-slate-400 text-sm">Avg Playing Time</p>
              <p className="text-xl font-bold text-emerald-400">
                {Math.round(mockPlayerStats.reduce((sum, player) => sum + player.averageTimePerMatch, 0) / mockPlayerStats.length)}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-slate-400 text-sm">Captain Instances</p>
              <p className="text-xl font-bold text-amber-400">
                {mockPlayerStats.reduce((sum, player) => sum + player.captainMatches, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-slate-400 text-sm">Fair Play Awards</p>
              <p className="text-xl font-bold text-emerald-400">
                {mockPlayerStats.reduce((sum, player) => sum + player.fairPlayAwards, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-sky-300 mb-2">Position Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400">
          <div>D = Defender</div>
          <div>M = Midfielder</div>
          <div>A = Attacker</div>
          <div>G = Goalkeeper</div>
        </div>
      </div>
    </div>
  );
}