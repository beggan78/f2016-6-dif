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

const SNAP_THRESHOLD_PX = 18;
const COLUMN_SHIFT_PX = 12;
const DRAG_ACTIVATION_THRESHOLD = 6;

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
  const [dropIndicator, setDropIndicator] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const activePointerIdRef = useRef(null);
  const draggingColumnRef = useRef(null);
  const dragOverColumnRef = useRef(null);
  const dropIndicatorRef = useRef(null);
  const pointerMoveListenerRef = useRef(null);
  const pointerUpListenerRef = useRef(null);
  const pointerCancelListenerRef = useRef(null);
  const headerRowRef = useRef(null);
  const dragGhostRef = useRef(null);
  const dragGhostOffsetRef = useRef({ x: 0, y: 0 });
  const dragSessionRef = useRef(null);

  useEffect(() => {
    draggingColumnRef.current = draggingColumn;
  }, [draggingColumn]);

  useEffect(() => {
    dragOverColumnRef.current = dragOverColumn;
  }, [dragOverColumn]);

  useEffect(() => {
    dropIndicatorRef.current = dropIndicator;
  }, [dropIndicator]);

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

  const removeDragGhost = useCallback(() => {
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
  }, []);

  const updateDragGhostPosition = useCallback((clientX, clientY) => {
    const ghost = dragGhostRef.current;
    if (!ghost) {
      return;
    }

    const x = clientX - dragGhostOffsetRef.current.x;
    const y = clientY - dragGhostOffsetRef.current.y;
    ghost.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const createDragGhost = useCallback(
    (headerElement, columnLabel, clientX, clientY) => {
      removeDragGhost();

      if (!headerElement) {
        return;
      }

      const rect = headerElement.getBoundingClientRect();
      dragGhostOffsetRef.current = {
        x: Math.min(Math.max(clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(clientY - rect.top, 0), rect.height)
      };

      const ghost = document.createElement('div');
      ghost.textContent = columnLabel;
      ghost.style.position = 'fixed';
      ghost.style.top = '0';
      ghost.style.left = '0';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '9999';
      ghost.style.padding = '0.5rem 0.75rem';
      ghost.style.borderRadius = '0.5rem';
      ghost.style.border = '1px solid rgba(56, 189, 248, 0.6)';
      ghost.style.background = 'rgba(15, 23, 42, 0.95)';
      ghost.style.color = 'rgb(224, 242, 254)';
      ghost.style.fontSize = '0.75rem';
      ghost.style.fontWeight = '600';
      ghost.style.letterSpacing = '0.08em';
      ghost.style.textTransform = 'uppercase';
      ghost.style.boxShadow = '0 10px 25px rgba(14, 165, 233, 0.35)';
      ghost.style.opacity = '0.95';
      ghost.style.minWidth = `${Math.max(rect.width, 60)}px`;
      ghost.style.textAlign = 'center';
      ghost.style.transition = 'transform 0.08s ease-out';

      document.body.appendChild(ghost);
      dragGhostRef.current = ghost;
      updateDragGhostPosition(clientX, clientY);
    },
    [removeDragGhost, updateDragGhostPosition]
  );

  const startDragSession = useCallback(
    (event) => {
      const session = dragSessionRef.current;

      if (!session || session.started) {
        return false;
      }

      session.started = true;

      setDraggingColumn(session.columnKey);
      setIsReordering(true);
      setDragOverColumn(null);
      dragOverColumnRef.current = null;
      setDropIndicator(null);
      dropIndicatorRef.current = null;

      draggingColumnRef.current = session.columnKey;

      if (event.cancelable) {
        event.preventDefault();
      }
      createDragGhost(session.headerElement, session.columnLabel, event.clientX, event.clientY);

      return true;
    },
    [createDragGhost]
  );

  const determineDropPosition = useCallback((clientX, columnKey, rect) => {
    const currentIndicator = dropIndicatorRef.current;
    let transformOffset = 0;

    if (currentIndicator?.columnKey === columnKey) {
      transformOffset = currentIndicator.position === 'before'
        ? COLUMN_SHIFT_PX
        : currentIndicator.position === 'after'
        ? -COLUMN_SHIFT_PX
        : 0;
    }

    const effectiveLeft = rect.left - transformOffset;
    const effectiveRight = rect.right - transformOffset;
    const center = (effectiveLeft + effectiveRight) / 2;
    const threshold = Math.min(rect.width * 0.2, SNAP_THRESHOLD_PX);

    if (clientX <= center - threshold) {
      return 'before';
    }

    if (clientX >= center + threshold) {
      return 'after';
    }

    if (currentIndicator?.columnKey === columnKey) {
      return currentIndicator.position;
    }

    return clientX < center ? 'before' : 'after';
  }, []);

  const resolvePointerTarget = useCallback(
    (clientX) => {
      const headerRow = headerRowRef.current;
      if (!headerRow) {
        return null;
      }

      const headers = Array.from(headerRow.querySelectorAll('th[data-column-key]'));
      if (headers.length === 0) {
        return null;
      }

      for (let index = 0; index < headers.length; index += 1) {
        const headerElement = headers[index];
        const rect = headerElement.getBoundingClientRect();
        const columnKey = headerElement.getAttribute('data-column-key');
        const indicator = dropIndicatorRef.current;
        let transformOffset = 0;

        if (indicator?.columnKey === columnKey) {
          transformOffset = indicator.position === 'before'
            ? COLUMN_SHIFT_PX
            : indicator.position === 'after'
            ? -COLUMN_SHIFT_PX
            : 0;
        }

        const effectiveLeft = rect.left - transformOffset;
        const effectiveRight = rect.right - transformOffset;

        if (!columnKey) {
          continue;
        }

        if (columnKey === draggingColumnRef.current) {
          continue;
        }

        if (clientX < effectiveLeft) {
          return { columnKey, position: 'before' };
        }

        if (clientX >= effectiveLeft && clientX <= effectiveRight) {
          const position = determineDropPosition(clientX, columnKey, rect);
          return { columnKey, position };
        }
      }

      const lastHeader = headers[headers.length - 1];
      const lastKey = lastHeader.getAttribute('data-column-key');

      if (!lastKey) {
        return null;
      }

      return { columnKey: lastKey, position: 'after' };
    },
    [determineDropPosition]
  );

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
    dropIndicatorRef.current = null;
    removeDragGhost();
    dragSessionRef.current = null;
  }, [removeDragGhost]);

  const resetReorderState = useCallback(() => {
    setDraggingColumn(null);
    setDragOverColumn(null);
    setDropIndicator(null);
    setIsReordering(false);
    draggingColumnRef.current = null;
    dragOverColumnRef.current = null;
    dropIndicatorRef.current = null;
    dragSessionRef.current = null;
  }, []);

  const reorderColumns = useCallback(
    (sourceKey, targetKey, position = 'before') => {
      if (!sourceKey || !targetKey || sourceKey === targetKey) {
        resetReorderState();
        return;
      }

      setColumnOrder((prevOrder) => {
        const withoutSource = prevOrder.filter((key) => key !== sourceKey);
        const targetIndex = withoutSource.indexOf(targetKey);

        if (targetIndex === -1) {
          return mergeColumnOrder(prevOrder);
        }

        const insertionIndex = position === 'after' ? targetIndex + 1 : targetIndex;
        const nextOrder = [...withoutSource];
        nextOrder.splice(insertionIndex, 0, sourceKey);

        return mergeColumnOrder(nextOrder);
      });

      resetReorderState();
    },
    [mergeColumnOrder, resetReorderState]
  );

  useEffect(() => {
    return () => {
      cleanupPointerListeners();
    };
  }, [cleanupPointerListeners]);

  const handlePointerDown = (event, columnKey) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    cleanupPointerListeners();
    activePointerIdRef.current = event.pointerId;

    const columnDefinition = orderedColumns.find((column) => column.key === columnKey);

    dragSessionRef.current = {
      started: false,
      columnKey,
      columnLabel: columnDefinition?.label || columnKey,
      headerElement: event.currentTarget,
      pointerType: event.pointerType,
      startClientX: event.clientX,
      startClientY: event.clientY
    };

    const handleMove = (moveEvent) => {
      if (moveEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      const session = dragSessionRef.current;

      if (!session) {
        return;
      }

      if (!session.started) {
        if (session.pointerType === 'mouse') {
          const deltaX = Math.abs(moveEvent.clientX - session.startClientX);
          const deltaY = Math.abs(moveEvent.clientY - session.startClientY);

          if (Math.max(deltaX, deltaY) < DRAG_ACTIVATION_THRESHOLD) {
            return;
          }
        }

        const started = startDragSession(moveEvent);

        if (!started) {
          return;
        }
      }

      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      updateDragGhostPosition(moveEvent.clientX, moveEvent.clientY);

      const target = resolvePointerTarget(moveEvent.clientX);

      if (!target || target.columnKey === draggingColumnRef.current) {
        if (dragOverColumnRef.current !== null) {
          dragOverColumnRef.current = null;
          setDragOverColumn(null);
        }
        dropIndicatorRef.current = null;
        setDropIndicator(null);
        return;
      }

      const { columnKey: targetKey, position } = target;

      if (dragOverColumnRef.current !== targetKey) {
        dragOverColumnRef.current = targetKey;
        setDragOverColumn(targetKey);
      }

      if (
        dropIndicatorRef.current?.columnKey === targetKey &&
        dropIndicatorRef.current?.position === position
      ) {
        return;
      }

      dropIndicatorRef.current = { columnKey: targetKey, position };
      setDropIndicator({ columnKey: targetKey, position });
    };

    const handleEnd = (endEvent) => {
      if (endEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      const session = dragSessionRef.current;

      if (!session?.started) {
        cleanupPointerListeners();
        return;
      }

      if (endEvent.cancelable) {
        endEvent.preventDefault();
      }
      updateDragGhostPosition(endEvent.clientX, endEvent.clientY);

      const resolvedTarget = resolvePointerTarget(endEvent.clientX);
      const indicator = dropIndicatorRef.current;
      const finalTarget = resolvedTarget || indicator;
      const targetKey =
        finalTarget?.columnKey || dragOverColumnRef.current || draggingColumnRef.current;
      const position = finalTarget?.position || indicator?.position || 'before';

      reorderColumns(draggingColumnRef.current, targetKey, position);
      cleanupPointerListeners();
    };

    const handleCancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      const session = dragSessionRef.current;

      if (session?.started) {
        resetReorderState();
      }

      cleanupPointerListeners();
    };

    pointerMoveListenerRef.current = handleMove;
    pointerUpListenerRef.current = handleEnd;
    pointerCancelListenerRef.current = handleCancel;

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd, { passive: false });
    window.addEventListener('pointercancel', handleCancel, { passive: false });

    if (event.pointerType !== 'mouse') {
      startDragSession(event);
    }
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
              <tr ref={headerRowRef}>
                {orderedColumns.map((column) => {
                  const indicator =
                    dropIndicator?.columnKey === column.key ? dropIndicator.position : null;
                  const transformValue =
                    indicator === 'before'
                      ? `translateX(${COLUMN_SHIFT_PX}px)`
                      : indicator === 'after'
                      ? `translateX(-${COLUMN_SHIFT_PX}px)`
                      : undefined;
                  const headerStyle = {
                    transform: transformValue,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    boxShadow:
                      indicator && draggingColumn !== column.key
                        ? '0 0 0 2px rgba(56, 189, 248, 0.3)'
                        : undefined
                  };

                  return (
                    <th
                      key={column.key}
                      scope="col"
                      data-column-key={column.key}
                      className={`relative px-3 py-2 text-xs font-medium text-sky-200 tracking-wider select-none touch-none ${
                        column.sortable ? 'cursor-grab active:cursor-grabbing hover:bg-slate-700 transition-colors' : ''
                      } ${sortBy === column.key ? 'bg-slate-700' : ''} ${
                        draggingColumn === column.key ? 'opacity-60' : ''
                      } ${
                        dragOverColumn === column.key && draggingColumn !== column.key
                          ? 'ring-1 ring-sky-400 ring-inset'
                          : ''
                      }`}
                      style={headerStyle}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                      onPointerDown={(event) => handlePointerDown(event, column.key)}
                    >
                      <div className="relative flex w-full items-center justify-between">
                        {indicator && draggingColumn !== column.key && (
                          <span
                            className="pointer-events-none absolute top-1/2 h-8 w-1 rounded-full bg-sky-400/80 -translate-y-1/2"
                            style={{
                              left: indicator === 'before' ? '-0.4rem' : undefined,
                              right: indicator === 'after' ? '-0.4rem' : undefined,
                              boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)'
                            }}
                            aria-hidden="true"
                          />
                        )}
                        <span>{column.label}</span>
                        {column.sortable && renderSortIndicator(column.key)}
                      </div>
                    </th>
                  );
                })}
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
                  {orderedColumns.map((column) => {
                    const indicator =
                      dropIndicator?.columnKey === column.key ? dropIndicator.position : null;
                    const transformValue =
                      indicator === 'before'
                        ? `translateX(${COLUMN_SHIFT_PX}px)`
                        : indicator === 'after'
                        ? `translateX(-${COLUMN_SHIFT_PX}px)`
                        : undefined;
                    const cellStyle = {
                      transform: transformValue,
                      transition: 'transform 0.15s ease'
                    };

                    return (
                      <td
                        key={column.key}
                        className={`px-3 py-2 whitespace-nowrap text-sm ${column.className}`}
                        style={cellStyle}
                      >
                        {column.render(player)}
                      </td>
                    );
                  })}
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
