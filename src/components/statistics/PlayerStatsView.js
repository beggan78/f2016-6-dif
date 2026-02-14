import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User, Award, Clock, Users, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTeam } from '../../contexts/TeamContext';
import { getFinishedMatches, getPlayerStats } from '../../services/matchStateManager';
import { getTeamLoans, getDefaultLoanMatchWeight } from '../../services/playerLoanService';
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
import { Alert } from '../shared/Alert';

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
  FAIR_PLAY: 'fairPlayAwards',
  LOAN_MATCHES: 'loanMatches'
};

export function PlayerStatsView({ startDate, endDate }) {
  const { t } = useTranslation('statistics');
  const { currentTeam, loadTeamPreferences } = useTeam();
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchesError, setMatchesError] = useState(null);
  const [loanWeight, setLoanWeight] = useState(getDefaultLoanMatchWeight());
  const [loanMap, setLoanMap] = useState(new Map());
  const [loanError, setLoanError] = useState(null);
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

  const formatMatchCount = useCallback((value) => {
    if (!Number.isFinite(value)) return '0';
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  }, []);

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
        setMatchesError(result.error || t('playerStats.failedToLoadMatches'));
        setMatches([]);
      }

      setMatchesLoading(false);
    }

    fetchMatches();
  }, [currentTeam?.id, startDate, endDate, t]);

  // Fetch loan data and loan weight preference
  useEffect(() => {
    async function fetchLoanData() {
      if (!currentTeam?.id) {
        setLoanMap(new Map());
        setLoanWeight(getDefaultLoanMatchWeight());
        setLoanError(null);
        return;
      }

      setLoanError(null);

      try {
        const [loanResult, prefResult] = await Promise.all([
          getTeamLoans(currentTeam.id, { startDate, endDate }),
          loadTeamPreferences ? loadTeamPreferences(currentTeam.id) : Promise.resolve({})
        ]);

        if (loanResult.success) {
          const nextMap = new Map();
          (loanResult.loans || []).forEach((loan) => {
            if (!loan?.player_id) return;
            const existing = nextMap.get(loan.player_id) || [];
            existing.push(loan);
            nextMap.set(loan.player_id, existing);
          });
          setLoanMap(nextMap);
        } else {
          setLoanMap(new Map());
          setLoanError(loanResult.error || t('playerStats.failedToLoadLoanMatches'));
        }

        const weightValue = prefResult?.loanMatchWeight;
        const parsedWeight = typeof weightValue === 'number' ? weightValue : parseFloat(weightValue);
        setLoanWeight(Number.isNaN(parsedWeight) ? getDefaultLoanMatchWeight() : parsedWeight);
      } catch (err) {
        console.error('Failed to load loan data:', err);
        setLoanMap(new Map());
        setLoanError(t('playerStats.failedToLoadLoanMatches'));
        setLoanWeight(getDefaultLoanMatchWeight());
      }
    }

    fetchLoanData();
  }, [currentTeam?.id, startDate, endDate, loadTeamPreferences, t]);

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
        setError(result.error || t('playerStats.errorDetails'));
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
    formatFilter,
    t
  ]);

  const enhancedPlayers = useMemo(() => {
    const weight = Number.isFinite(loanWeight) ? loanWeight : getDefaultLoanMatchWeight();
    const playersById = new Map(players.map(player => [player.id, player]));
    const supplementalPlayers = [];

    loanMap.forEach((loans, playerId) => {
      if (playersById.has(playerId)) return;
      const loanPlayer = loans.find((loan) => loan?.player)?.player;
      const displayName = loanPlayer?.display_name || loanPlayer?.first_name || t('playerStats.unnamedPlayer');

      supplementalPlayers.push({
        id: playerId,
        displayName,
        matchesPlayed: 0,
        goalsScored: 0,
        totalFieldTimeSeconds: 0,
        averageTimePerMatch: 0,
        percentStartedAsSubstitute: 0,
        percentTimeAsDefender: 0,
        percentTimeAsMidfielder: 0,
        percentTimeAsAttacker: 0,
        percentTimeAsGoalkeeper: 0,
        matchesAsCaptain: 0,
        fairPlayAwards: 0
      });
    });

    return [...players, ...supplementalPlayers].map((player) => {
      const loans = loanMap.get(player.id) || [];
      const loanMatches = loans.length;
      const weightedLoanMatches = loanMatches * weight;
      const totalWeightedMatches = player.matchesPlayed + weightedLoanMatches;

      return {
        ...player,
        regularMatches: player.matchesPlayed,
        loanMatches,
        weightedLoanMatches,
        matchesPlayed: totalWeightedMatches,
        loanWeight: weight
      };
    });
  }, [players, loanMap, loanWeight, t]);

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
        label: t('playerStats.columns.player'),
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
        label: t('playerStats.columns.matches'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <div className="flex flex-col items-center">
            <span className="text-slate-300 font-mono">{formatMatchCount(player.matchesPlayed)}</span>
            {player.loanMatches > 0 && (
              <span className="text-xs text-slate-400">
                {player.regularMatches} + {formatMatchCount(player.weightedLoanMatches)}
              </span>
            )}
          </div>
        )
      },
      {
        key: SORT_COLUMNS.LOAN_MATCHES,
        label: t('playerStats.columns.loanMatches'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">
            {player.loanMatches > 0 ? player.loanMatches : '-'}
          </span>
        )
      },
      {
        key: SORT_COLUMNS.GOALS,
        label: t('playerStats.columns.goals'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.goalsScored}</span>
        )
      },
      {
        key: SORT_COLUMNS.AVG_TIME,
        label: t('playerStats.columns.avgTime'),
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
        label: t('playerStats.columns.outfieldTime'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{formatSecondsAsTime(player.totalFieldTimeSeconds)}</span>
        )
      },
      {
        key: SORT_COLUMNS.SUB_START,
        label: t('playerStats.columns.startedAsSub'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.percentStartedAsSubstitute}%</span>
        )
      },
      {
        key: SORT_COLUMNS.DEFENDER,
        label: t('playerStats.columns.defender'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.percentTimeAsDefender}%</span>
        )
      },
      {
        key: SORT_COLUMNS.MIDFIELDER,
        label: t('playerStats.columns.midfielder'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.percentTimeAsMidfielder}%</span>
        )
      },
      {
        key: SORT_COLUMNS.ATTACKER,
        label: t('playerStats.columns.attacker'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.percentTimeAsAttacker}%</span>
        )
      },
      {
        key: SORT_COLUMNS.GOALKEEPER,
        label: t('playerStats.columns.goalkeeper'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.percentTimeAsGoalkeeper}%</span>
        )
      },
      {
        key: SORT_COLUMNS.CAPTAIN,
        label: t('playerStats.columns.captain'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.matchesAsCaptain}</span>
        )
      },
      {
        key: SORT_COLUMNS.FAIR_PLAY,
        label: t('playerStats.columns.fairPlay'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.fairPlayAwards}</span>
        )
      }
    ],
    [formatMatchCount, t]
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
  } = useTableSort(enhancedPlayers, SORT_COLUMNS.NAME, 'asc', dragDropHandlers.isReordering);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (enhancedPlayers.length === 0) {
      return {
        totalPlayers: 0,
        averageFieldTime: 0,
        averageGoalsPerPlayer: 0,
        totalGoals: 0,
        topScorer: null
      };
    }

    const totalPlayers = enhancedPlayers.length;
    const totalFieldTime = enhancedPlayers.reduce((sum, player) => sum + player.averageTimePerMatch, 0);
    const averageFieldTime = totalFieldTime / totalPlayers;
    const totalGoals = enhancedPlayers.reduce((sum, player) => sum + player.goalsScored, 0);
    const averageGoalsPerPlayer = totalGoals / totalPlayers;
    const topScorer = enhancedPlayers.reduce((top, player) =>
      player.goalsScored > top.goalsScored ? player : top
    );

    return {
      totalPlayers,
      averageFieldTime,
      averageGoalsPerPlayer,
      totalGoals,
      topScorer
    };
  }, [enhancedPlayers]);

  // Show loading state
  if (loading) {
    return <StatsLoadingState message={t('playerStats.loading')} />;
  }

  // Show error state
  if (error) {
    return <StatsErrorState title={t('playerStats.error')} message={error} />;
  }

  const hasPlayerData = sortedPlayers.length > 0;
  const noMatchesAvailable = !matchesLoading && matches.length === 0 && loanMap.size === 0;
  const noMatchesForFilters = !matchesLoading && matches.length > 0 && filteredMatches.length === 0 && loanMap.size === 0;

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
        <Alert variant="warning">{matchesError}</Alert>
      )}

      {loanError && (
        <Alert variant="warning">{loanError}</Alert>
      )}

      {noMatchesAvailable && (
        <StatsEmptyState
          title={t('playerStats.noMatchesAvailable')}
          message={t('playerStats.addMatchesOrAdjust')}
        />
      )}

      {!noMatchesAvailable && noMatchesForFilters && (
        <StatsEmptyState
          title={t('playerStats.noMatchesFiltered')}
          message={t('playerStats.adjustFilters')}
        />
      )}

      {!noMatchesAvailable && !noMatchesForFilters && !hasPlayerData && !matchesLoading && (
        <StatsEmptyState
          title={t('playerStats.noStatsRecorded')}
        />
      )}

      {hasPlayerData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              title={t('playerStats.totalPlayers')}
              value={summaryStats.totalPlayers}
              subtitle={t('playerStats.activePlayers')}
            />

            <StatCard
              icon={Clock}
              title={t('playerStats.avgPlayingTime')}
              value={formatMinutesAsTime(summaryStats.averageFieldTime)}
              subtitle={t('playerStats.perMatch')}
            />

            <StatCard
              icon={Target}
              title={t('playerStats.avgGoals')}
              value={summaryStats.averageGoalsPerPlayer.toFixed(1)}
              subtitle={`${t('playerStats.totalGoalsLabel')} ${summaryStats.totalGoals}`}
            />

            <StatCard
              icon={Award}
              title={t('playerStats.topScorer')}
              value={summaryStats.topScorer ? summaryStats.topScorer.displayName : '-'}
              subtitle={summaryStats.topScorer ? `${summaryStats.topScorer.goalsScored} ${t('playerStats.goals')}` : t('playerStats.noData')}
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
            headerTitle={t('playerStats.title')}
            headerSubtitle={t('playerStats.tableSubtitle', { weight: formatMatchCount(loanWeight) })}
            idKey="id"
          />
        </>
      )}
    </div>
  );
}
