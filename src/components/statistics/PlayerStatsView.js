import React, { useState, useMemo, useEffect } from 'react';
import { User, Award, Clock, Users, Target } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { getFinishedMatches, getPlayerStats } from '../../services/matchStateManager';
import { formatMinutesAsTime, formatSecondsAsTime } from '../../utils/formatUtils';
import { MatchFiltersPanel } from './MatchFiltersPanel';
import { useStatsFilters } from '../../hooks/useStatsFilters';
import { filterMatchesByCriteria } from '../../utils/matchFilterUtils';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnOrderPersistence } from '../../hooks/useColumnOrderPersistence';
import { StatCard } from './shared/StatCard';
import { StatsLoadingState } from './shared/StatsLoadingState';
import { StatsErrorState } from './shared/StatsErrorState';
import { StatsEmptyState } from './shared/StatsEmptyState';
import { SortableStatsTable } from './shared/SortableStatsTable';

const SORT_COLUMNS = {
  NAME: 'displayName',
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

      const result = await getFinishedMatches(currentTeam.id, startDate, endDate);

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

  // Define table columns
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
            <span className="text-slate-100">{player.displayName}</span>
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
        label: 'Outfield Time',
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

  // Use column order persistence hook
  const dragDropHandlers = useColumnOrderPersistence(
    baseColumns,
    STORAGE_KEYS.STATISTICS_PLAYER_COLUMN_ORDER
  );

  // Use table sort hook
  const {
    sortedData: sortedPlayers,
    sortBy,
    handleSort,
    renderSortIndicator
  } = useTableSort(players, SORT_COLUMNS.NAME, 'asc', dragDropHandlers.isReordering);

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
    const totalFieldTime = players.reduce((sum, player) => sum + player.averageTimePerMatch, 0);
    const averageFieldTime = totalFieldTime / totalPlayers;
    const totalGoals = players.reduce((sum, player) => sum + player.goalsScored, 0);
    const averageGoalsPerPlayer = totalGoals / totalPlayers;
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

  // Show loading state
  if (loading) {
    return <StatsLoadingState message="Loading player statistics..." />;
  }

  // Show error state
  if (error) {
    return <StatsErrorState title="Error loading player statistics" message={error} />;
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
        <StatsEmptyState
          title="No player statistics available"
          message="Add matches or adjust the selected time range."
        />
      )}

      {!noMatchesAvailable && noMatchesForFilters && (
        <StatsEmptyState
          title="No matches found with the selected filters"
          message="Try adjusting the filter criteria."
        />
      )}

      {!noMatchesAvailable && !noMatchesForFilters && !hasPlayerData && !matchesLoading && (
        <StatsEmptyState
          title="No player statistics recorded for the selected filters"
        />
      )}

      {hasPlayerData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              title="Total Players"
              value={summaryStats.totalPlayers}
              subtitle="Active players"
            />

            <StatCard
              icon={Clock}
              title="Avg. Playing Time"
              value={formatMinutesAsTime(summaryStats.averageFieldTime)}
              subtitle="Per match"
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
              value={summaryStats.topScorer ? summaryStats.topScorer.displayName : '-'}
              subtitle={summaryStats.topScorer ? `${summaryStats.topScorer.goalsScored} goals` : 'No data'}
            />
          </div>

          {/* Player Stats Table */}
          <SortableStatsTable
            data={sortedPlayers}
            orderedColumns={dragDropHandlers.orderedColumns}
            sortBy={sortBy}
            dragDropHandlers={dragDropHandlers}
            onSort={handleSort}
            renderSortIndicator={renderSortIndicator}
            headerIcon={Users}
            headerTitle="Player Statistics"
            headerSubtitle="Click column headers to sort or drag to reorder. Statistics are calculated across all matches."
            idKey="id"
          />
        </>
      )}
    </div>
  );
}
