import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ArrowLeft, Search, Trophy, Target, Clock } from 'lucide-react';
import { Button, Input } from '../shared/UI';

/**
 * PlayerStatisticsTable - Displays comprehensive player statistics in a sortable table
 */
export function PlayerStatisticsTable({ onNavigateBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Mock player data - in real implementation this would come from database
  const mockPlayers = useMemo(() => [
    {
      id: 1,
      name: 'Erik Andersson',
      matchesPlayed: 20,
      goalsScored: 12,
      averageTimePerMatch: 35.2,
      timeAsDefender: 22.5,
      timeAsMidfielder: 31.0,
      timeAsAttacker: 38.5,
      timeAsGoalkeeper: 8.0,
      startedAsSubstitute: 15.0,
      captainMatches: 5,
      fairPlayAwards: 2
    },
    {
      id: 2,
      name: 'Sofia Lindqvist',
      matchesPlayed: 22,
      goalsScored: 8,
      averageTimePerMatch: 33.8,
      timeAsDefender: 28.2,
      timeAsMidfielder: 35.8,
      timeAsAttacker: 30.4,
      timeAsGoalkeeper: 5.6,
      startedAsSubstitute: 18.2,
      captainMatches: 8,
      fairPlayAwards: 4
    },
    {
      id: 3,
      name: 'Marcus Johnson',
      matchesPlayed: 18,
      goalsScored: 7,
      averageTimePerMatch: 38.1,
      timeAsDefender: 35.0,
      timeAsMidfielder: 25.6,
      timeAsAttacker: 34.8,
      timeAsGoalkeeper: 4.6,
      startedAsSubstitute: 11.1,
      captainMatches: 3,
      fairPlayAwards: 1
    },
    {
      id: 4,
      name: 'Lisa Chen',
      matchesPlayed: 24,
      goalsScored: 6,
      averageTimePerMatch: 31.4,
      timeAsDefender: 18.7,
      timeAsMidfielder: 41.2,
      timeAsAttacker: 32.1,
      timeAsGoalkeeper: 8.0,
      startedAsSubstitute: 25.0,
      captainMatches: 1,
      fairPlayAwards: 3
    },
    {
      id: 5,
      name: 'Oliver Nilsson',
      matchesPlayed: 19,
      goalsScored: 5,
      averageTimePerMatch: 29.3,
      timeAsDefender: 31.5,
      timeAsMidfielder: 28.9,
      timeAsAttacker: 25.2,
      timeAsGoalkeeper: 14.4,
      startedAsSubstitute: 31.6,
      captainMatches: 0,
      fairPlayAwards: 2
    },
    {
      id: 6,
      name: 'Emma Karlsson',
      matchesPlayed: 21,
      goalsScored: 4,
      averageTimePerMatch: 32.6,
      timeAsDefender: 24.8,
      timeAsMidfielder: 33.3,
      timeAsAttacker: 29.0,
      timeAsGoalkeeper: 12.9,
      startedAsSubstitute: 19.0,
      captainMatches: 2,
      fairPlayAwards: 5
    },
    {
      id: 7,
      name: 'Liam Pettersson',
      matchesPlayed: 16,
      goalsScored: 9,
      averageTimePerMatch: 36.8,
      timeAsDefender: 20.1,
      timeAsMidfielder: 22.4,
      timeAsAttacker: 45.6,
      timeAsGoalkeeper: 11.9,
      startedAsSubstitute: 12.5,
      captainMatches: 4,
      fairPlayAwards: 1
    },
    {
      id: 8,
      name: 'Astrid Svensson',
      matchesPlayed: 23,
      goalsScored: 3,
      averageTimePerMatch: 30.1,
      timeAsDefender: 42.3,
      timeAsMidfielder: 30.1,
      timeAsAttacker: 18.2,
      timeAsGoalkeeper: 9.4,
      startedAsSubstitute: 21.7,
      captainMatches: 6,
      fairPlayAwards: 3
    }
  ], []);

  const columns = [
    {
      key: 'name',
      label: 'Player',
      sortable: true,
      className: 'text-left font-medium text-slate-100 sticky left-0 bg-slate-700',
      render: (player) => player.name
    },
    {
      key: 'matchesPlayed',
      label: 'Matches',
      sortable: true,
      className: 'text-center text-slate-300',
      render: (player) => player.matchesPlayed
    },
    {
      key: 'goalsScored',
      label: 'Goals',
      sortable: true,
      className: 'text-center text-sky-400 font-medium',
      render: (player) => player.goalsScored
    },
    {
      key: 'averageTimePerMatch',
      label: 'Avg Time',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => `${player.averageTimePerMatch.toFixed(1)}m`
    },
    {
      key: 'timeAsDefender',
      label: '% Defender',
      sortable: true,
      className: 'text-center text-emerald-400',
      render: (player) => `${player.timeAsDefender.toFixed(1)}%`
    },
    {
      key: 'timeAsMidfielder',
      label: '% Midfielder',
      sortable: true,
      className: 'text-center text-yellow-400',
      render: (player) => `${player.timeAsMidfielder.toFixed(1)}%`
    },
    {
      key: 'timeAsAttacker',
      label: '% Attacker',
      sortable: true,
      className: 'text-center text-rose-400',
      render: (player) => `${player.timeAsAttacker.toFixed(1)}%`
    },
    {
      key: 'timeAsGoalkeeper',
      label: '% Goalkeeper',
      sortable: true,
      className: 'text-center text-purple-400',
      render: (player) => `${player.timeAsGoalkeeper.toFixed(1)}%`
    },
    {
      key: 'startedAsSubstitute',
      label: '% Started Sub',
      sortable: true,
      className: 'text-center text-orange-400',
      render: (player) => `${player.startedAsSubstitute.toFixed(1)}%`
    },
    {
      key: 'captainMatches',
      label: 'Captain',
      sortable: true,
      className: 'text-center text-amber-400',
      render: (player) => player.captainMatches
    },
    {
      key: 'fairPlayAwards',
      label: 'Fair Play',
      sortable: true,
      className: 'text-center text-cyan-400',
      render: (player) => player.fairPlayAwards
    }
  ];

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = mockPlayers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort players
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle string sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [searchTerm, sortBy, sortOrder, mockPlayers]);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortBy !== columnKey) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  // Calculate team statistics
  const teamStats = useMemo(() => {
    const totalMatches = Math.max(...filteredAndSortedPlayers.map(p => p.matchesPlayed));
    const totalGoals = filteredAndSortedPlayers.reduce((sum, p) => sum + p.goalsScored, 0);
    const averageTime = filteredAndSortedPlayers.reduce((sum, p) => sum + p.averageTimePerMatch, 0) / filteredAndSortedPlayers.length;
    const totalCaptainMatches = filteredAndSortedPlayers.reduce((sum, p) => sum + p.captainMatches, 0);
    const totalFairPlay = filteredAndSortedPlayers.reduce((sum, p) => sum + p.fairPlayAwards, 0);

    return {
      totalMatches,
      totalGoals,
      averageTime: averageTime.toFixed(1),
      totalCaptainMatches,
      totalFairPlay,
      playersCount: filteredAndSortedPlayers.length
    };
  }, [filteredAndSortedPlayers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onNavigateBack}
          variant="secondary"
          size="sm"
          Icon={ArrowLeft}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-sky-400">Player Statistics</h1>
          <p className="text-slate-400">Comprehensive player performance data</p>
        </div>
      </div>

      {/* Team Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <Trophy className="h-5 w-5 text-sky-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-slate-100">{teamStats.playersCount}</p>
          <p className="text-slate-400 text-xs">Players</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <Target className="h-5 w-5 text-sky-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-sky-400">{teamStats.totalGoals}</p>
          <p className="text-slate-400 text-xs">Total Goals</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-400">{teamStats.averageTime}m</p>
          <p className="text-slate-400 text-xs">Avg Time</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-amber-400">{teamStats.totalCaptainMatches}</p>
          <p className="text-slate-400 text-xs">Captain Apps</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-cyan-400">{teamStats.totalFairPlay}</p>
          <p className="text-slate-400 text-xs">Fair Play</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 text-center">
          <p className="text-lg font-bold text-slate-300">{teamStats.totalMatches}</p>
          <p className="text-slate-400 text-xs">Max Matches</p>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Search Player
            </label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by player name..."
            />
          </div>
          <div className="text-right text-sm text-slate-400 flex items-end">
            <p>Showing {filteredAndSortedPlayers.length} players</p>
          </div>
        </div>
      </div>

      {/* Statistics Table */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-600 border-b border-slate-500">
                {columns.map(column => (
                  <th
                    key={column.key}
                    className={`px-3 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-slate-500' : ''
                    } ${column.key === 'name' ? 'sticky left-0 bg-slate-600 z-10' : ''}`}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {column.label}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {filteredAndSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-400">
                    No players found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedPlayers.map((player, index) => (
                  <tr
                    key={player.id}
                    className={`hover:bg-slate-600 transition-colors ${
                      index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-750'
                    }`}
                  >
                    {columns.map(column => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 text-sm whitespace-nowrap ${column.className} ${
                          column.key === 'name' ? 'sticky left-0 z-10' : ''
                        }`}
                      >
                        {column.render(player)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Legend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-400">
          <div><span className="text-emerald-400">●</span> Defender: Time spent in defensive positions</div>
          <div><span className="text-yellow-400">●</span> Midfielder: Time spent in midfield positions</div>
          <div><span className="text-rose-400">●</span> Attacker: Time spent in attacking positions</div>
          <div><span className="text-purple-400">●</span> Goalkeeper: Time spent as goalkeeper</div>
          <div><span className="text-orange-400">●</span> Started Sub: Percentage of matches started as substitute</div>
          <div><span className="text-cyan-400">●</span> Fair Play: Number of fair play awards received</div>
        </div>
      </div>
    </div>
  );
}