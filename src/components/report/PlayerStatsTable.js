import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatTime, formatPlayerName } from '../../utils/formatUtils';
import { PLAYER_ROLES } from '../../constants/playerConstants';
import { EVENT_TYPES } from '../../utils/gameEventLogger';

/**
 * PlayerStatsTable - Displays player statistics in a sortable table format
 * 
 * @param {Object} props - Component props
 * @param {Array} props.players - Array of player objects with stats
 * @param {Object} props.formation - Formation data for starting role determination
 * @param {Array} props.matchEvents - Array of match events for goal counting
 * @param {Object} props.goalScorers - Object mapping event IDs to player IDs for goal attribution
 */
export function PlayerStatsTable({
  players = [],
  formation = {},
  matchEvents = [],
  goalScorers = {}
}) {
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Calculate goals scored for each player
  const playerGoals = useMemo(() => {
    const goals = {};
    
    // Count goals from match events
    matchEvents.forEach(event => {
      if ((event.type === EVENT_TYPES.GOAL_SCORED || event.type === EVENT_TYPES.GOAL_CONCEDED) && !event.undone) {
        // Check goalScorers mapping first, then fall back to event data
        const scorerId = goalScorers[event.id] || event.data?.scorerId;
        if (scorerId) {
          goals[scorerId] = (goals[scorerId] || 0) + 1;
        }
      }
    });
    
    return goals;
  }, [matchEvents, goalScorers]);
  // Define column configuration
  const columns = useMemo(() => {
    const showDefenderColumn = players.some(p => p.stats?.timeAsDefenderSeconds > 0);
    const showMidfielderColumn = players.some(p => p.stats?.timeAsMidfielderSeconds > 0);
    const showAttackerColumn = players.some(p => p.stats?.timeAsAttackerSeconds > 0);

    const allColumns = [
    {
      key: 'name',
      label: 'Player',
      sortable: true,
      className: 'text-left font-medium text-slate-100',
      render: (player) => formatPlayerName(player)
    },
    {
      key: 'startingRole',
      label: 'Starting Role',
      sortable: true,
      className: 'text-center text-slate-300',
      render: (player) => {
        // Use startedAtRole for specific role (defender/midfielder/attacker)
        // Fall back to startedMatchAs if startedAtRole not available
        const specificRole = player.stats?.startedAtRole;
        const genericRole = player.stats?.startedMatchAs;

        // Check specific role first
        if (specificRole === PLAYER_ROLES.GOALIE) return 'Goalie';
        if (specificRole === PLAYER_ROLES.DEFENDER) return 'Defender';
        if (specificRole === PLAYER_ROLES.MIDFIELDER) return 'Midfielder';
        if (specificRole === PLAYER_ROLES.ATTACKER) return 'Attacker';
        if (specificRole === PLAYER_ROLES.SUBSTITUTE) return 'Sub';

        // Fall back to generic role
        if (genericRole === PLAYER_ROLES.GOALIE) return 'Goalie';
        if (genericRole === PLAYER_ROLES.SUBSTITUTE) return 'Sub';
        if (genericRole === PLAYER_ROLES.FIELD_PLAYER) return 'Field';

        return '--'; // Player didn't start the match
      }
    },
    {
      key: 'timeOnField',
      label: 'Outfield',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats?.timeOnFieldSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsDefender',
      label: 'Defender',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats?.timeAsDefenderSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsMidfielder',
      label: 'Midfielder',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats?.timeAsMidfielderSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsAttacker',
      label: 'Attacker',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats?.timeAsAttackerSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsGoalie',
      label: 'Goalie',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats?.timeAsGoalieSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'timeAsSubstitute',
      label: 'Substitute',
      sortable: true,
      className: 'text-center text-slate-300 font-mono',
      render: (player) => {
        const time = player.stats?.timeAsSubSeconds || 0;
        return time > 0 ? formatTime(time) : '--';
      }
    },
    {
      key: 'goalsScored',
      label: 'Goals',
      sortable: true,
      className: 'text-center text-slate-300',
      render: (player) => {
        const goals = playerGoals[player.id] || 0;
        return goals > 0 ? goals : '--';
      }
    }
  ];

    // Filter out conditional columns based on whether any player has time in those roles
    return allColumns.filter(column => {
      if (column.key === 'timeAsDefender' && !showDefenderColumn) return false;
      if (column.key === 'timeAsMidfielder' && !showMidfielderColumn) return false;
      if (column.key === 'timeAsAttacker' && !showAttackerColumn) return false;
      return true;
    });
  }, [playerGoals, players, formatTime]);

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
        case 'startingRole':
          // Map role values to strings for alphabetical comparison
          const getRoleValue = (player) => {
            const specificRole = player.stats?.startedAtRole;
            const genericRole = player.stats?.startedMatchAs;

            // Check specific role first
            if (specificRole === PLAYER_ROLES.GOALIE) return 'Goalie';
            if (specificRole === PLAYER_ROLES.DEFENDER) return 'Defender';
            if (specificRole === PLAYER_ROLES.MIDFIELDER) return 'Midfielder';
            if (specificRole === PLAYER_ROLES.ATTACKER) return 'Attacker';
            if (specificRole === PLAYER_ROLES.SUBSTITUTE) return 'Sub';

            // Fall back to generic role
            if (genericRole === PLAYER_ROLES.GOALIE) return 'Goalie';
            if (genericRole === PLAYER_ROLES.SUBSTITUTE) return 'Sub';
            if (genericRole === PLAYER_ROLES.FIELD_PLAYER) return 'Field';

            return '--'; // Empty value sorts to end
          };
          aValue = getRoleValue(a);
          bValue = getRoleValue(b);
          break;
        case 'timeOnField':
          aValue = a.stats?.timeOnFieldSeconds || 0;
          bValue = b.stats?.timeOnFieldSeconds || 0;
          break;
        case 'timeAsAttacker':
          aValue = a.stats?.timeAsAttackerSeconds || 0;
          bValue = b.stats?.timeAsAttackerSeconds || 0;
          break;
        case 'timeAsDefender':
          aValue = a.stats?.timeAsDefenderSeconds || 0;
          bValue = b.stats?.timeAsDefenderSeconds || 0;
          break;
        case 'timeAsMidfielder':
          aValue = a.stats?.timeAsMidfielderSeconds || 0;
          bValue = b.stats?.timeAsMidfielderSeconds || 0;
          break;
        case 'timeAsGoalie':
          aValue = a.stats?.timeAsGoalieSeconds || 0;
          bValue = b.stats?.timeAsGoalieSeconds || 0;
          break;
        case 'timeAsSubstitute':
          aValue = a.stats?.timeAsSubSeconds || 0;
          bValue = b.stats?.timeAsSubSeconds || 0;
          break;
        case 'goalsScored':
          aValue = playerGoals[a.id] || 0;
          bValue = playerGoals[b.id] || 0;
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
  }, [players, sortBy, sortOrder, playerGoals]);

  useEffect(() => {
    const availableColumns = columns.map(c => c.key);
    if (!availableColumns.includes(sortBy)) {
      setSortBy('name');
      setSortOrder('asc');
    }
  }, [columns, sortBy]);

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
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="text-center py-8 text-slate-400">
          <p>No player statistics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-600">
        <thead className="bg-slate-800">
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-3 text-xs font-medium text-sky-200 tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''
                } ${
                  sortBy === column.key ? 'bg-slate-700' : ''
                } ${
                  index === 0 ? 'sticky left-0 z-10 bg-slate-800' : ''
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
          {sortedPlayers.map((player, rowIndex) => (
            <tr
              key={player.id}
              className={`${
                rowIndex % 2 === 0 ? 'bg-slate-700' : 'bg-slate-800'
              } hover:bg-slate-600 transition-colors`}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key}
                  className={`px-3 py-3 whitespace-nowrap text-sm ${column.className} ${
                    colIndex === 0 ? `sticky left-0 z-10 ${rowIndex % 2 === 0 ? 'bg-slate-700' : 'bg-slate-800'}` : ''
                  }`}
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
  );
}

// Memoize PlayerStatsTable to prevent unnecessary re-renders when props haven't changed
export default React.memo(PlayerStatsTable);
