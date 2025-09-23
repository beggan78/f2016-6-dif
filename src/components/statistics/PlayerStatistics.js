import React, { useState } from 'react';
import { Search, Target, Clock, Shield, Zap, Trophy, Award } from 'lucide-react';
import { mockPlayers, formatPlayTime, calculatePercentage } from '../../data/mockStatisticsData';

export function PlayerStatistics() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('matchesPlayed');
  const [sortDirection, setSortDirection] = useState('desc');

  const filteredAndSortedPlayers = mockPlayers
    .filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.jerseyNumber.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Special handling for calculated values
      if (sortBy === 'avgPlayTime') {
        aValue = a.totalPlayTime / a.matchesPlayed;
        bValue = b.totalPlayTime / b.matchesPlayed;
      } else if (sortBy === 'defenderPercent') {
        aValue = calculatePercentage(a.defenderTime, a.totalPlayTime);
        bValue = calculatePercentage(b.defenderTime, b.totalPlayTime);
      } else if (sortBy === 'midfielderPercent') {
        aValue = calculatePercentage(a.midfielderTime, a.totalPlayTime);
        bValue = calculatePercentage(b.midfielderTime, b.totalPlayTime);
      } else if (sortBy === 'attackerPercent') {
        aValue = calculatePercentage(a.attackerTime, a.totalPlayTime);
        bValue = calculatePercentage(b.attackerTime, b.totalPlayTime);
      } else if (sortBy === 'goaliePercent') {
        aValue = calculatePercentage(a.goalieTime, a.totalPlayTime);
        bValue = calculatePercentage(b.goalieTime, b.totalPlayTime);
      } else if (sortBy === 'subPercent') {
        aValue = calculatePercentage(a.startsAsSubstitute, a.matchesPlayed);
        bValue = calculatePercentage(b.startsAsSubstitute, b.matchesPlayed);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const SortButton = ({ field, children, className = '' }) => (
    <button
      onClick={() => handleSort(field)}
      className={`text-left font-medium text-slate-200 hover:text-sky-400 transition-colors ${className}`}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          <span className="text-sky-400">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Player Statistics</h2>
          <p className="text-slate-400 mt-1">
            Individual performance metrics for all players
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search player..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortButton field="name">Player</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="matchesPlayed">#</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="goalsScored">
                    <Target className="w-4 h-4 inline" />
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="avgPlayTime">
                    <Clock className="w-4 h-4 inline" />
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="defenderPercent">DEF%</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="midfielderPercent">MID%</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="attackerPercent">ATT%</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="goaliePercent">GK%</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="subPercent">SUB%</SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="captainCount">
                    <Trophy className="w-4 h-4 inline" />
                  </SortButton>
                </th>
                <th className="px-3 py-3 text-center">
                  <SortButton field="fairPlayAwards">
                    <Award className="w-4 h-4 inline" />
                  </SortButton>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredAndSortedPlayers.map((player) => {
                const avgPlayTime = player.totalPlayTime / player.matchesPlayed;
                const defenderPercent = calculatePercentage(player.defenderTime, player.totalPlayTime);
                const midfielderPercent = calculatePercentage(player.midfielderTime, player.totalPlayTime);
                const attackerPercent = calculatePercentage(player.attackerTime, player.totalPlayTime);
                const goaliePercent = calculatePercentage(player.goalieTime, player.totalPlayTime);
                const subPercent = calculatePercentage(player.startsAsSubstitute, player.matchesPlayed);

                return (
                  <tr key={player.id} className="hover:bg-slate-700 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-medium">
                            {player.jerseyNumber}
                          </span>
                        </div>
                        <span className="font-medium text-slate-200 truncate">
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-200 font-medium">
                      {player.matchesPlayed}
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-400 font-medium">
                      {player.goalsScored}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-200 text-sm">
                      {formatPlayTime(avgPlayTime)}
                    </td>
                    <td className="px-3 py-2 text-center text-blue-400 font-medium">
                      {defenderPercent}%
                    </td>
                    <td className="px-3 py-2 text-center text-purple-400 font-medium">
                      {midfielderPercent}%
                    </td>
                    <td className="px-3 py-2 text-center text-red-400 font-medium">
                      {attackerPercent}%
                    </td>
                    <td className="px-3 py-2 text-center text-yellow-400 font-medium">
                      {goaliePercent}%
                    </td>
                    <td className="px-3 py-2 text-center text-orange-400 font-medium">
                      {subPercent}%
                    </td>
                    <td className="px-3 py-2 text-center text-amber-400 font-medium">
                      {player.captainCount}
                    </td>
                    <td className="px-3 py-2 text-center text-green-400 font-medium">
                      {player.fairPlayAwards}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredAndSortedPlayers.map((player) => {
          const avgPlayTime = player.totalPlayTime / player.matchesPlayed;
          const defenderPercent = calculatePercentage(player.defenderTime, player.totalPlayTime);
          const midfielderPercent = calculatePercentage(player.midfielderTime, player.totalPlayTime);
          const attackerPercent = calculatePercentage(player.attackerTime, player.totalPlayTime);
          const goaliePercent = calculatePercentage(player.goalieTime, player.totalPlayTime);
          const subPercent = calculatePercentage(player.startsAsSubstitute, player.matchesPlayed);

          return (
            <div key={player.id} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              {/* Player Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {player.jerseyNumber}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-200">{player.name}</h3>
                  <p className="text-sm text-slate-400">
                    {player.matchesPlayed} matches • {player.goalsScored} goals
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">Avg Play Time</span>
                  </div>
                  <div className="text-sm font-medium text-slate-200">
                    {formatPlayTime(avgPlayTime)}
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-slate-400">Defender</span>
                  </div>
                  <div className="text-sm font-medium text-blue-400">
                    {defenderPercent}%
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-slate-400">Midfielder</span>
                  </div>
                  <div className="text-sm font-medium text-purple-400">
                    {midfielderPercent}%
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <Target className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-slate-400">Attacker</span>
                  </div>
                  <div className="text-sm font-medium text-red-400">
                    {attackerPercent}%
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="text-xs text-slate-400">Goalie</span>
                  </div>
                  <div className="text-sm font-medium text-yellow-400">
                    {goaliePercent}%
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="text-xs text-slate-400">Started Sub</span>
                  </div>
                  <div className="text-sm font-medium text-orange-400">
                    {subPercent}%
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-slate-400">Captain</span>
                  </div>
                  <div className="text-sm font-medium text-amber-400">
                    {player.captainCount}
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-2">
                  <div className="flex items-center space-x-1 mb-1">
                    <Award className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-slate-400">Fair Play</span>
                  </div>
                  <div className="text-sm font-medium text-green-400">
                    {player.fairPlayAwards}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAndSortedPlayers.length === 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-200 mb-2">No players found</h3>
          <p className="text-slate-400">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  );
}