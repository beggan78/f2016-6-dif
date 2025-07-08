import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatTime } from '../../utils/formatUtils';
import { PLAYER_ROLES } from '../../constants/playerConstants';

/**
 * PlayerStatsTable - Displays player statistics in a sortable table format
 * 
 * @param {Object} props - Component props
 * @param {Array} props.players - Array of player objects with stats
 * @param {string} props.teamMode - Team mode for context (PAIRS_7, INDIVIDUAL_6, etc.)
 */
export function PlayerStatsTable({
  players = [],
  teamMode
}) {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  // Define column configuration
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Player',
      sortable: true,
      className: 'text-left font-medium text-slate-100',
      render: (player) => player.name
    },
    {
      key: 'startingRole',
      label: 'Starting Role',
      sortable: false,
      className: 'text-center text-slate-300',
      render: (player) => {
        const role = player.stats.startedMatchAs;
        if (role === PLAYER_ROLES.GOALIE) return 'Goalie';
        if (role === PLAYER_ROLES.ON_FIELD) return 'Field';
        if (role === PLAYER_ROLES.SUBSTITUTE) return 'Sub';
        return '--';
      }
    },
    {
      key: 'timeOnField',
      label: 'Time on Field',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats.timeOnFieldSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsAttacker',
      label: 'Time as Attacker',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats.timeAsAttackerSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsDefender',
      label: 'Time as Defender',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats.timeAsDefenderSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsGoalie',
      label: 'Time as Goalie',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats.timeAsGoalieSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    }
  ], []);

  // Sort players based on current sort settings
  const sortedPlayers = useMemo(() => {
    if (!players.length) return [];

    const sorted = [...players].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'timeOnField':
          aValue = a.stats.timeOnFieldSeconds || 0;
          bValue = b.stats.timeOnFieldSeconds || 0;
          break;
        case 'timeAsAttacker':
          aValue = a.stats.timeAsAttackerSeconds || 0;
          bValue = b.stats.timeAsAttackerSeconds || 0;
          break;
        case 'timeAsDefender':
          aValue = a.stats.timeAsDefenderSeconds || 0;
          bValue = b.stats.timeAsDefenderSeconds || 0;
          break;
        case 'timeAsGoalie':
          aValue = a.stats.timeAsGoalieSeconds || 0;
          bValue = b.stats.timeAsGoalieSeconds || 0;
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }
      
      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [players, sortBy, sortOrder]);

  // Handle column header click for sorting
  const handleSort = (columnKey) => {
    const newOrder = sortBy === columnKey && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(columnKey);
    setSortOrder(newOrder);
  };

  // Render sort indicator
  const renderSortIndicator = (columnKey) => {
    if (sortBy !== columnKey) return null;
    
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-5 w-5 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-5 w-5 inline-block ml-1" />
    );
  };

  if (!sortedPlayers.length) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No player statistics available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-600">
        <thead className="bg-slate-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-3 text-xs font-medium text-sky-200 uppercase tracking-wider ${
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
        <tbody className="bg-slate-700 divide-y divide-slate-600">
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
                  className={`px-3 py-3 whitespace-nowrap text-sm ${column.className}`}
                >
                  {column.render(player)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}