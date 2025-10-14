import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, User, Award, Clock, Users, Target } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { getConfirmedMatches, getPlayerStats } from '../../services/matchStateManager';
import { formatMinutesAsTime, formatSecondsAsTime } from '../../utils/formatUtils';
import { MatchFiltersPanel } from './MatchFiltersPanel';
import { useStatsFilters } from '../../hooks/useStatsFilters';
import { filterMatchesByCriteria } from '../../utils/matchFilterUtils';
import { PersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const SORT_COLUMNS = {
  NAME: 'name',
  MATCHES: 'matchesPlayed',
  GOALS: 'goalsScored',
  AVG_TIME: 'averageTimePerMatch',
  TOTAL_TIME: 'totalFieldTimeSeconds',
  SUB_START: 'percentStartedAsSubstitute',
  DEFENDER: 'percentTimeAsDefender',
  MIDFIELDER: 'percentTimeAsMidfielder',
  ATTACKER: 'percentTimeAsAttacker',
  GOALKEEPER: 'percentTimeAsGoalkeeper',
  CAPTAIN: 'matchesAsCaptain',
  FAIR_PLAY: 'fairPlayAwards'
};

export function PlayerStatsView({ startDate, endDate }) {
  const { currentTeam } = useTeam();
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchesError, setMatchesError] = useState(null);
  const [sortBy, setSortBy] = useState(SORT_COLUMNS.NAME);
  const [sortOrder, setSortOrder] = useState('asc');
  const {
    typeFilter,
    outcomeFilter,
    venueFilter,
    opponentFilter,
    playerFilter,
    formatFilter,
    setTypeFilter,
    setOutcomeFilter,
    setVenueFilter,
    setOpponentFilter,
    setPlayerFilter,
    setFormatFilter,
    clearFilters
  } = useStatsFilters();

  // Fetch matches for populating filter options
  useEffect(() => {
    async function fetchMatches() {
      if (!currentTeam?.id) {
        setMatches([]);
        setMatchesError(null);
        setMatchesLoading(false);
        return;
      }

      setMatchesLoading(true);
      setMatchesError(null);

      const result = await getConfirmedMatches(currentTeam.id, startDate, endDate);

      if (result.success) {
        setMatches(result.matches || []);
      } else {
        setMatchesError(result.error || 'Failed to load matches');
        setMatches([]);
      }

      setMatchesLoading(false);
    }

    fetchMatches();
  }, [currentTeam?.id, startDate, endDate]);

  // Fetch player stats from database
  useEffect(() => {
    async function fetchPlayerStats() {
      if (!currentTeam?.id) {
        setPlayers([]);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getPlayerStats(currentTeam.id, startDate, endDate, {
        typeFilter,
        outcomeFilter,
        venueFilter,
        opponentFilter,
        playerFilter,
        formatFilter
      });

      if (result.success) {
        setPlayers(result.players || []);
      } else {
        setError(result.error || 'Failed to load player statistics');
        setPlayers([]);
      }

      setLoading(false);
    }

    fetchPlayerStats();
  }, [
    currentTeam?.id,
    startDate,
    endDate,
    typeFilter,
    outcomeFilter,
    venueFilter,
    opponentFilter,
    playerFilter,
    formatFilter
  ]);

  const filteredMatches = useMemo(() => {
    return filterMatchesByCriteria(matches, {
      typeFilter,
      outcomeFilter,
      venueFilter,
      opponentFilter,
      playerFilter,
      formatFilter,
      startDate,
      endDate
    });
  }, [
    matches,
    typeFilter,
    outcomeFilter,
    venueFilter,
    opponentFilter,
    playerFilter,
    formatFilter,
    startDate,
    endDate
  ]);

  const clearAllFilters = clearFilters;

  const baseColumns = useMemo(
    () => [
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
            <span className="text-slate-300 font-mono">{formatMinutesAsTime(player.averageTimePerMatch)}</span>
          </div>
        )
      },
      {
        key: SORT_COLUMNS.TOTAL_TIME,
        label: 'Total Time',
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{formatSecondsAsTime(player.totalFieldTimeSeconds)}</span>
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
    ],
    []
  );

  const defaultColumnOrder = useMemo(
    () => baseColumns.map((column) => column.key),
    [baseColumns]
  );

  const columnOrderManager = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return new PersistenceManager(STORAGE_KEYS.STATISTICS_PLAYER_COLUMN_ORDER, {
      order: defaultColumnOrder
    });
  }, [defaultColumnOrder]);

  const mergeColumnOrder = useCallback((order) => {
    const sanitizedOrder = Array.isArray(order)
      ? order.filter((key) => defaultColumnOrder.includes(key))
      : [];
    const missingKeys = defaultColumnOrder.filter((key) => !sanitizedOrder.includes(key));
    return [...sanitizedOrder, ...missingKeys];
  }, [defaultColumnOrder]);

  const [columnOrder, setColumnOrder] = useState(() => {
    if (!columnOrderManager) {
      return [...defaultColumnOrder];
    }

    const savedState = columnOrderManager.loadState();
    return mergeColumnOrder(savedState?.order);
  });
  const [draggingColumn, setDraggingColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const activePointerIdRef = useRef(null);
  const draggingColumnRef = useRef(null);
  const dragOverColumnRef = useRef(null);
  const pointerMoveListenerRef = useRef(null);
  const pointerUpListenerRef = useRef(null);
  const pointerCancelListenerRef = useRef(null);

  useEffect(() => {
    draggingColumnRef.current = draggingColumn;
  }, [draggingColumn]);

  useEffect(() => {
    dragOverColumnRef.current = dragOverColumn;
  }, [dragOverColumn]);

  useEffect(() => {
    if (!columnOrderManager) {
      return;
    }

    columnOrderManager.saveState({ order: columnOrder });
  }, [columnOrderManager, columnOrder]);

  const orderedColumns = useMemo(() => {
    const columnMap = new Map(baseColumns.map((column) => [column.key, column]));
    return columnOrder.map((key) => columnMap.get(key)).filter(Boolean);
  }, [baseColumns, columnOrder]);

  const cleanupPointerListeners = useCallback(() => {
    if (pointerMoveListenerRef.current) {
      window.removeEventListener('pointermove', pointerMoveListenerRef.current);
      pointerMoveListenerRef.current = null;
    }

    if (pointerUpListenerRef.current) {
      window.removeEventListener('pointerup', pointerUpListenerRef.current);
      pointerUpListenerRef.current = null;
    }

    if (pointerCancelListenerRef.current) {
      window.removeEventListener('pointercancel', pointerCancelListenerRef.current);
      pointerCancelListenerRef.current = null;
    }

    activePointerIdRef.current = null;
    draggingColumnRef.current = null;
    dragOverColumnRef.current = null;
  }, []);

  const resetReorderState = useCallback(() => {
    setDraggingColumn(null);
    setDragOverColumn(null);
    setIsReordering(false);
    draggingColumnRef.current = null;
    dragOverColumnRef.current = null;
  }, []);

  const reorderColumns = useCallback(
    (sourceKey, targetKey) => {
      if (!sourceKey || !targetKey || sourceKey === targetKey) {
        resetReorderState();
        return;
      }

      setColumnOrder((prevOrder) => {
        const nextOrder = [...prevOrder];
        const sourceIndex = nextOrder.indexOf(sourceKey);
        const targetIndex = nextOrder.indexOf(targetKey);

        if (sourceIndex === -1 || targetIndex === -1) {
          return mergeColumnOrder(nextOrder);
        }

        nextOrder.splice(sourceIndex, 1);
        nextOrder.splice(targetIndex, 0, sourceKey);

        return mergeColumnOrder(nextOrder);
      });

      resetReorderState();
    },
    [mergeColumnOrder, resetReorderState]
  );

  const handleDragStart = (event, columnKey) => {
    setDraggingColumn(columnKey);
    draggingColumnRef.current = columnKey;
    setIsReordering(true);
    setDragOverColumn(null);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', columnKey);
    }
  };

  const handleDragOver = (event, columnKey) => {
    event.preventDefault();
    if (draggingColumn === null || draggingColumn === columnKey) {
      return;
    }

    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    if (dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = (columnKey) => {
    if (dragOverColumn === columnKey) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (event, columnKey) => {
    event.preventDefault();

    if (draggingColumn === null || draggingColumn === columnKey) {
      resetReorderState();
      return;
    }

    reorderColumns(draggingColumn, columnKey);
  };

  const handleDragEnd = () => {
    resetReorderState();
  };

  useEffect(() => {
    return () => {
      cleanupPointerListeners();
    };
  }, [cleanupPointerListeners]);

  const handlePointerDown = (event, columnKey) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }

    event.preventDefault();
    cleanupPointerListeners();
    activePointerIdRef.current = event.pointerId;
    draggingColumnRef.current = columnKey;
    dragOverColumnRef.current = columnKey;
    setDraggingColumn(columnKey);
    setDragOverColumn(columnKey);
    setIsReordering(true);

    const handleMove = (moveEvent) => {
      if (moveEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      moveEvent.preventDefault();
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const header = element?.closest?.('th[data-column-key]');

      if (!header) {
        return;
      }

      const targetKey = header.getAttribute('data-column-key');

      if (!targetKey || targetKey === dragOverColumnRef.current) {
        return;
      }

      dragOverColumnRef.current = targetKey;
      setDragOverColumn((current) => {
        if (current === targetKey) {
          return current;
        }
        return targetKey;
      });
    };

    const handleEnd = (endEvent) => {
      if (endEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      endEvent.preventDefault();
      const element = document.elementFromPoint(endEvent.clientX, endEvent.clientY);
      const header = element?.closest?.('th[data-column-key]');
      const targetKey =
        header?.getAttribute('data-column-key') ||
        dragOverColumnRef.current ||
        draggingColumnRef.current;

      reorderColumns(draggingColumnRef.current, targetKey);
      cleanupPointerListeners();
    };

    const handleCancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      resetReorderState();
      cleanupPointerListeners();
    };

    pointerMoveListenerRef.current = handleMove;
    pointerUpListenerRef.current = handleEnd;
    pointerCancelListenerRef.current = handleCancel;

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd, { passive: false });
    window.addEventListener('pointercancel', handleCancel, { passive: false });
  };

  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
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
  }, [players, sortBy, sortOrder]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (players.length === 0) {
      return {
        totalPlayers: 0,
        averageFieldTime: 0,
        averageGoalsPerPlayer: 0,
        totalGoals: 0,
        topScorer: null
      };
    }

    const totalPlayers = players.length;

    // Calculate average field time across all players
    const totalFieldTime = players.reduce((sum, player) => sum + player.averageTimePerMatch, 0);
    const averageFieldTime = totalFieldTime / totalPlayers;

    // Calculate average goals per player
    const totalGoals = players.reduce((sum, player) => sum + player.goalsScored, 0);
    const averageGoalsPerPlayer = totalGoals / totalPlayers;

    // Find top scorer
    const topScorer = players.reduce((top, player) =>
      player.goalsScored > top.goalsScored ? player : top
    );

    return {
      totalPlayers,
      averageFieldTime,
      averageGoalsPerPlayer,
      totalGoals,
      topScorer
    };
  }, [players]);

  const handleSort = (columnKey) => {
    if (isReordering) {
      return;
    }

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

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">Loading player statistics...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-red-400 mb-2">Error loading player statistics</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const hasPlayerData = sortedPlayers.length > 0;
  const noMatchesAvailable = !matchesLoading && matches.length === 0;
  const noMatchesForFilters = !matchesLoading && matches.length > 0 && filteredMatches.length === 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MatchFiltersPanel
        matches={matches}
        typeFilter={typeFilter}
        outcomeFilter={outcomeFilter}
        venueFilter={venueFilter}
        opponentFilter={opponentFilter}
        playerFilter={playerFilter}
        formatFilter={formatFilter}
        showPlayerFilter={false}
        onTypeFilterChange={setTypeFilter}
        onOutcomeFilterChange={setOutcomeFilter}
        onVenueFilterChange={setVenueFilter}
        onOpponentFilterChange={setOpponentFilter}
        onPlayerFilterChange={setPlayerFilter}
        onFormatFilterChange={setFormatFilter}
        onClearAllFilters={clearAllFilters}
      />

      {matchesError && (
        <div className="bg-amber-900/40 border border-amber-600/50 text-amber-200 text-sm rounded-lg p-4">
          {matchesError}
        </div>
      )}

      {noMatchesAvailable && (
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">No player statistics available</div>
          <p className="text-slate-500 text-sm mt-2">Add matches or adjust the selected time range.</p>
        </div>
      )}

      {!noMatchesAvailable && noMatchesForFilters && (
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">No matches found with the selected filters</div>
          <p className="text-slate-500 text-sm mt-2">Try adjusting the filter criteria.</p>
        </div>
      )}

      {!noMatchesAvailable && !noMatchesForFilters && !hasPlayerData && !matchesLoading && (
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">No player statistics recorded for the selected filters</div>
        </div>
      )}

      {hasPlayerData && (
        <>
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
          value={formatMinutesAsTime(summaryStats.averageFieldTime)}
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
          value={summaryStats.topScorer ? summaryStats.topScorer.name : '-'}
          subtitle={summaryStats.topScorer ? `${summaryStats.topScorer.goalsScored} goals` : 'No data'}
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
            Click column headers to sort or drag to reorder. Statistics are calculated across all matches.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-800">
              <tr>
                {orderedColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    draggable
                    data-column-key={column.key}
                    className={`px-3 py-2 text-xs font-medium text-sky-200 tracking-wider select-none touch-none ${
                      column.sortable ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''
                    } ${sortBy === column.key ? 'bg-slate-700' : ''} ${
                      draggingColumn === column.key ? 'opacity-60' : ''
                    } ${
                      dragOverColumn === column.key && draggingColumn !== column.key
                        ? 'ring-1 ring-sky-400 ring-inset'
                        : ''
                    }`}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                    onDragStart={(event) => handleDragStart(event, column.key)}
                    onDragOver={(event) => handleDragOver(event, column.key)}
                    onDragLeave={() => handleDragLeave(column.key)}
                    onDrop={(event) => handleDrop(event, column.key)}
                    onDragEnd={handleDragEnd}
                    onPointerDown={(event) => handlePointerDown(event, column.key)}
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
                  {orderedColumns.map((column) => (
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
        </>
      )}
    </div>
  );
}
