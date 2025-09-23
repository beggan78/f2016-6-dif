import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { mockPlayerStats } from './mockData';

const SORT_FIELDS = {
  NAME: 'name',
  MATCHES: 'matchesPlayed',
  GOALS: 'goalsScored',
  AVG_TIME: 'averageTimePerMatch',
  SUB_START: 'percentageStartedAsSubstitute',
  CAPTAIN: 'matchesAsCaptain',
  FAIR_PLAY: 'fairPlayAwards'
};

export function PlayerStatsView() {
  const [sortField, setSortField] = useState(SORT_FIELDS.MATCHES);
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPlayers = [...mockPlayerStats].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'name') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const formatPercentage = (value) => `${Math.round(value)}%`;
  const formatTime = (minutes) => `${Math.round(minutes * 10) / 10}m`;

  const SortableHeader = ({ field, children, className = "" }) => (
    <th
      className={`py-2 px-2 text-xs font-medium text-slate-200 cursor-pointer hover:bg-slate-400 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Player Statistics</h3>
        <p className="text-sm text-slate-400 mb-4">
          Click column headers to sort. Data shows statistics across all matches played.
        </p>

        <div className="bg-slate-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-500">
                  <SortableHeader field={SORT_FIELDS.NAME} className="text-left min-w-[120px]">
                    Player
                  </SortableHeader>
                  <SortableHeader field={SORT_FIELDS.MATCHES} className="text-center">
                    Matches
                  </SortableHeader>
                  <SortableHeader field={SORT_FIELDS.GOALS} className="text-center">
                    Goals
                  </SortableHeader>
                  <SortableHeader field={SORT_FIELDS.AVG_TIME} className="text-center">
                    Avg Time
                  </SortableHeader>
                  <SortableHeader field={SORT_FIELDS.SUB_START} className="text-center">
                    Sub Start %
                  </SortableHeader>
                  <th className="py-2 px-2 text-xs font-medium text-slate-200 text-center">Position Time %</th>
                  <SortableHeader field={SORT_FIELDS.CAPTAIN} className="text-center">
                    Captain
                  </SortableHeader>
                  <SortableHeader field={SORT_FIELDS.FAIR_PLAY} className="text-center">
                    Fair Play
                  </SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500">
                {sortedPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-slate-500/50 transition-colors">
                    <td className="py-2 px-2 text-sm text-slate-200 font-medium">
                      {player.name}
                    </td>
                    <td className="py-2 px-2 text-sm text-center text-slate-300">
                      {player.matchesPlayed}
                    </td>
                    <td className="py-2 px-2 text-sm text-center text-slate-300">
                      {player.goalsScored}
                    </td>
                    <td className="py-2 px-2 text-sm text-center text-slate-300">
                      {formatTime(player.averageTimePerMatch)}
                    </td>
                    <td className="py-2 px-2 text-sm text-center text-slate-300">
                      {formatPercentage(player.percentageStartedAsSubstitute)}
                    </td>
                    <td className="py-2 px-2 text-xs text-center text-slate-300">
                      <div className="space-y-0.5">
                        {player.percentageTimeAsGoalkeeper > 0 && (
                          <div className="flex justify-between">
                            <span className="text-purple-300">GK:</span>
                            <span>{formatPercentage(player.percentageTimeAsGoalkeeper)}</span>
                          </div>
                        )}
                        {player.percentageTimeAsDefender > 0 && (
                          <div className="flex justify-between">
                            <span className="text-blue-300">DEF:</span>
                            <span>{formatPercentage(player.percentageTimeAsDefender)}</span>
                          </div>
                        )}
                        {player.percentageTimeAsMidfielder > 0 && (
                          <div className="flex justify-between">
                            <span className="text-green-300">MID:</span>
                            <span>{formatPercentage(player.percentageTimeAsMidfielder)}</span>
                          </div>
                        )}
                        {player.percentageTimeAsAttacker > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-300">ATT:</span>
                            <span>{formatPercentage(player.percentageTimeAsAttacker)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-sm text-center text-slate-300">
                      {player.matchesAsCaptain}
                    </td>
                    <td className="py-2 px-2 text-sm text-center text-slate-300">
                      {player.fairPlayAwards}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-slate-600 rounded-lg">
          <h4 className="text-sm font-medium text-slate-200 mb-2">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300">
            <div className="flex items-center space-x-1">
              <span className="text-purple-300">GK:</span>
              <span>Goalkeeper</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-blue-300">DEF:</span>
              <span>Defender</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-green-300">MID:</span>
              <span>Midfielder</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-red-300">ATT:</span>
              <span>Attacker</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <strong>Sub Start %:</strong> Percentage of matches where the player started as a substitute
          </div>
        </div>
      </div>
    </div>
  );
}