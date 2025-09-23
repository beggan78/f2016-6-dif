import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { mockPlayerStats } from '../../data/mockStatisticsData';

export function PlayerStatsView() {
  const [sortField, setSortField] = useState('matchesPlayed');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedPlayers = () => {
    return [...mockPlayerStats].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="py-2 px-1 text-xs font-medium text-slate-300 cursor-pointer hover:text-sky-400 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const formatPercentage = (value) => `${value.toFixed(1)}%`;
  const formatTime = (minutes) => `${minutes.toFixed(1)}m`;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-sky-300">Player Statistics</h2>

      <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="py-3 px-2 text-left text-xs font-medium text-slate-300 sticky left-0 bg-slate-700 min-w-[140px]">
                  Player
                </th>
                <SortableHeader field="matchesPlayed">Matches</SortableHeader>
                <SortableHeader field="goalsScored">Goals</SortableHeader>
                <SortableHeader field="averageTimePerMatch">Avg Time</SortableHeader>
                <SortableHeader field="percentageStartedAsSubstitute">Sub Start %</SortableHeader>
                <SortableHeader field="percentageTimeAsDefender">Defender %</SortableHeader>
                <SortableHeader field="percentageTimeAsMidfielder">Midfield %</SortableHeader>
                <SortableHeader field="percentageTimeAsAttacker">Attacker %</SortableHeader>
                <SortableHeader field="percentageTimeAsGoalkeeper">GK %</SortableHeader>
                <SortableHeader field="matchesAsCaptain">Captain</SortableHeader>
                <SortableHeader field="fairPlayAwards">Fair Play</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {getSortedPlayers().map((player, index) => (
                <tr
                  key={player.id}
                  className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                    index % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30'
                  }`}
                >
                  <td className="py-2 px-2 text-sm font-medium text-white sticky left-0 bg-inherit min-w-[140px]">
                    {player.name}
                  </td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{player.matchesPlayed}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{player.goalsScored}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{formatTime(player.averageTimePerMatch)}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{formatPercentage(player.percentageStartedAsSubstitute)}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{formatPercentage(player.percentageTimeAsDefender)}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{formatPercentage(player.percentageTimeAsMidfielder)}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{formatPercentage(player.percentageTimeAsAttacker)}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{formatPercentage(player.percentageTimeAsGoalkeeper)}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{player.matchesAsCaptain}</td>
                  <td className="py-2 px-1 text-sm text-slate-200 text-center">{player.fairPlayAwards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-slate-400">
        <p><strong>Sub Start %:</strong> Percentage of matches where the player started as a substitute</p>
        <p><strong>Position %:</strong> Percentage of total playing time in each position</p>
        <p><strong>Captain:</strong> Number of matches as team captain</p>
        <p><strong>Fair Play:</strong> Number of Fair Play Awards received</p>
      </div>
    </div>
  );
}