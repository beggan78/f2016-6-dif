import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, User, Award, Clock, Users, Target } from 'lucide-react';

// Mock data - replace with real data later
const mockPlayerStats = [
  {
    id: 1,
    name: 'Erik Andersson',
    matchesPlayed: 12,
    goalsScored: 8,
    averageTimePerMatch: 28.5, // minutes
    percentStartedAsSubstitute: 25,
    percentTimeAsDefender: 60,
    percentTimeAsMidfielder: 20,
    percentTimeAsAttacker: 15,
    percentTimeAsGoalkeeper: 5,
    matchesAsCaptain: 3,
    fairPlayAwards: 2
  },
  {
    id: 2,
    name: 'Liam Johansson',
    matchesPlayed: 15,
    goalsScored: 12,
    averageTimePerMatch: 32.1,
    percentStartedAsSubstitute: 13,
    percentTimeAsDefender: 20,
    percentTimeAsMidfielder: 25,
    percentTimeAsAttacker: 55,
    percentTimeAsGoalkeeper: 0,
    matchesAsCaptain: 5,
    fairPlayAwards: 3
  },
  {
    id: 3,
    name: 'Oliver Lindqvist',
    matchesPlayed: 14,
    goalsScored: 2,
    averageTimePerMatch: 29.8,
    percentStartedAsSubstitute: 21,
    percentTimeAsDefender: 75,
    percentTimeAsMidfielder: 15,
    percentTimeAsAttacker: 10,
    percentTimeAsGoalkeeper: 0,
    matchesAsCaptain: 1,
    fairPlayAwards: 4
  },
  {
    id: 4,
    name: 'William Karlsson',
    matchesPlayed: 13,
    goalsScored: 0,
    averageTimePerMatch: 30.2,
    percentStartedAsSubstitute: 8,
    percentTimeAsDefender: 5,
    percentTimeAsMidfielder: 0,
    percentTimeAsAttacker: 0,
    percentTimeAsGoalkeeper: 95,
    matchesAsCaptain: 0,
    fairPlayAwards: 1
  },
  {
    id: 5,
    name: 'Lucas Svensson',
    matchesPlayed: 11,
    goalsScored: 5,
    averageTimePerMatch: 25.7,
    percentStartedAsSubstitute: 36,
    percentTimeAsDefender: 30,
    percentTimeAsMidfielder: 40,
    percentTimeAsAttacker: 30,
    percentTimeAsGoalkeeper: 0,
    matchesAsCaptain: 2,
    fairPlayAwards: 1
  },
  {
    id: 6,
    name: 'Alexander Berg',
    matchesPlayed: 10,
    goalsScored: 3,
    averageTimePerMatch: 22.4,
    percentStartedAsSubstitute: 50,
    percentTimeAsDefender: 45,
    percentTimeAsMidfielder: 30,
    percentTimeAsAttacker: 25,
    percentTimeAsGoalkeeper: 0,
    matchesAsCaptain: 0,
    fairPlayAwards: 2
  }
];

const SORT_COLUMNS = {
  NAME: 'name',
  MATCHES: 'matchesPlayed',
  GOALS: 'goalsScored',
  AVG_TIME: 'averageTimePerMatch',
  SUB_START: 'percentStartedAsSubstitute',
  DEFENDER: 'percentTimeAsDefender',
  MIDFIELDER: 'percentTimeAsMidfielder',
  ATTACKER: 'percentTimeAsAttacker',
  GOALKEEPER: 'percentTimeAsGoalkeeper',
  CAPTAIN: 'matchesAsCaptain',
  FAIR_PLAY: 'fairPlayAwards'
};

export function PlayerStatsView({ startDate, endDate }) {
  const [sortBy, setSortBy] = useState(SORT_COLUMNS.NAME);
  const [sortOrder, setSortOrder] = useState('asc');

  // Note: Time filtering for player stats would require filtering based on
  // match participation dates. With mock data, we'll show all player stats.
  // In a real implementation, this would filter players' stats based on
  // matches played within the selected time range.

  const columns = [
    {
      key: SORT_COLUMNS.NAME,
      label: 'Player',
      sortable: true,
      className: 'text-left font-medium',
      render: (player) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-slate-100">{player.name}</span>
        </div>
      )
    },
    {
      key: SORT_COLUMNS.MATCHES,
      label: 'Matches',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.matchesPlayed}</span>
      )
    },
    {
      key: SORT_COLUMNS.GOALS,
      label: 'Goals',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.goalsScored}</span>
      )
    },
    {
      key: SORT_COLUMNS.AVG_TIME,
      label: 'Avg Time',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <div className="flex items-center justify-center space-x-1">
          <span className="text-slate-300 font-mono">{player.averageTimePerMatch.toFixed(1)}min</span>
        </div>
      )
    },
    {
      key: SORT_COLUMNS.SUB_START,
      label: 'Started as Sub',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.percentStartedAsSubstitute}%</span>
      )
    },
    {
      key: SORT_COLUMNS.DEFENDER,
      label: 'Defender',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.percentTimeAsDefender}%</span>
      )
    },
    {
      key: SORT_COLUMNS.MIDFIELDER,
      label: 'Midfielder',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.percentTimeAsMidfielder}%</span>
      )
    },
    {
      key: SORT_COLUMNS.ATTACKER,
      label: 'Attacker',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.percentTimeAsAttacker}%</span>
      )
    },
    {
      key: SORT_COLUMNS.GOALKEEPER,
      label: 'Goalkeeper',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.percentTimeAsGoalkeeper}%</span>
      )
    },
    {
      key: SORT_COLUMNS.CAPTAIN,
      label: 'Captain',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.matchesAsCaptain}</span>
      )
    },
    {
      key: SORT_COLUMNS.FAIR_PLAY,
      label: 'Fair Play',
      sortable: true,
      className: 'text-center',
      render: (player) => (
        <span className="text-slate-300 font-mono">{player.fairPlayAwards}</span>
      )
    }
  ];

  const sortedPlayers = useMemo(() => {
    const sorted = [...mockPlayerStats].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [sortBy, sortOrder]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalPlayers = mockPlayerStats.length;

    // Calculate average field time across all players
    const totalFieldTime = mockPlayerStats.reduce((sum, player) => sum + player.averageTimePerMatch, 0);
    const averageFieldTime = totalFieldTime / totalPlayers;

    // Calculate average goals per player
    const totalGoals = mockPlayerStats.reduce((sum, player) => sum + player.goalsScored, 0);
    const averageGoalsPerPlayer = totalGoals / totalPlayers;

    // Find top scorer
    const topScorer = mockPlayerStats.reduce((top, player) =>
      player.goalsScored > top.goalsScored ? player : top
    );

    return {
      totalPlayers,
      averageFieldTime,
      averageGoalsPerPlayer,
      totalGoals,
      topScorer
    };
  }, []);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('desc'); // Default to desc for numeric columns
    }
  };

  const renderSortIndicator = (columnKey) => {
    if (sortBy !== columnKey) return null;

    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline-block ml-1" />
    );
  };

  const StatCard = ({ icon: Icon, title, value, subtitle }) => (
    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg">
            <Icon className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-slate-100 text-xl font-semibold">{value}</p>
            {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Players"
          value={summaryStats.totalPlayers}
          subtitle={`Active players`}
        />

        <StatCard
          icon={Clock}
          title="Avg. Playing Time"
          value={`${summaryStats.averageFieldTime.toFixed(1)}min`}
          subtitle={`Per match`}
        />

        <StatCard
          icon={Target}
          title="Average goals"
          value={summaryStats.averageGoalsPerPlayer.toFixed(1)}
          subtitle={`Total goals: ${summaryStats.totalGoals}`}
        />

        <StatCard
          icon={Award}
          title="Top Scorer"
          value={summaryStats.topScorer.name}
          subtitle={`${summaryStats.topScorer.goalsScored} goals`}
        />
      </div>

      {/* Player Stats Table */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-400 flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Player Statistics</span>
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Click column headers to sort. Statistics are calculated across all matches.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-3 py-2 text-xs font-medium text-sky-200 tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''
                    } ${
                      sortBy === column.key ? 'bg-slate-700' : ''
                    }`}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      {column.sortable && renderSortIndicator(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600">
              {sortedPlayers.map((player, index) => (
                <tr
                  key={player.id}
                  className={`${
                    index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-800'
                  } hover:bg-slate-600 transition-colors`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 whitespace-nowrap text-sm ${column.className}`}
                    >
                      {column.render(player)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}