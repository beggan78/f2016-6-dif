import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Calendar, TrendingUp, Users as UsersIcon, Award } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { getAttendanceStats, getTeamConnectors } from '../../services/connectorService';
import { getTeamLoans } from '../../services/playerLoanService';
import { Button } from '../shared/UI';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { VIEWS } from '../../constants/viewConstants';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnOrderPersistence } from '../../hooks/useColumnOrderPersistence';
import { StatCard } from './shared/StatCard';
import { StatsLoadingState } from './shared/StatsLoadingState';
import { StatsErrorState } from './shared/StatsErrorState';
import { StatsEmptyState } from './shared/StatsEmptyState';
import { SortableStatsTable } from './shared/SortableStatsTable';

const SORT_COLUMNS = {
  NAME: 'playerName',
  PRACTICES_PER_MATCH: 'practicesPerMatch',
  ATTENDANCE: 'totalAttendance',
  RATE: 'attendanceRate',
  MATCHES: 'matchesPlayed',
  LOAN_MATCHES: 'loanMatches'
};

const teamManagementTabCacheManager = createPersistenceManager(
  STORAGE_KEYS.TEAM_MANAGEMENT_ACTIVE_TAB,
  { tab: 'overview' }
);

export function AttendanceStatsView({ startDate, endDate, onNavigateTo }) {
  const { t } = useTranslation('statistics');
  const { currentTeam } = useTeam();
  const [attendanceData, setAttendanceData] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loanMap, setLoanMap] = useState(new Map());
  const [loanError, setLoanError] = useState(null);

  // Fetch connectors to check if team has any connected
  useEffect(() => {
    async function fetchConnectors() {
      if (!currentTeam?.id) {
        setConnectors([]);
        setConnectorsLoading(false);
        return;
      }

      setConnectorsLoading(true);

      try {
        const result = await getTeamConnectors(currentTeam.id);
        setConnectors(result || []);
      } catch (err) {
        console.error('Error fetching connectors:', err);
        setConnectors([]);
      }

      setConnectorsLoading(false);
    }

    fetchConnectors();
  }, [currentTeam?.id]);

  // Fetch attendance stats from database
  useEffect(() => {
    async function fetchAttendanceStats() {
      if (!currentTeam?.id) {
        setAttendanceData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getAttendanceStats(currentTeam.id, startDate, endDate);
        setAttendanceData(result || []);
      } catch (err) {
        console.error('Error fetching attendance stats:', err);
        setError(err.message || 'Failed to load attendance statistics');
        setAttendanceData([]);
      }

      setLoading(false);
    }

    fetchAttendanceStats();
  }, [currentTeam?.id, startDate, endDate]);

  // Fetch loan data for the date range
  useEffect(() => {
    async function fetchLoanData() {
      if (!currentTeam?.id) {
        setLoanMap(new Map());
        setLoanError(null);
        return;
      }

      setLoanError(null);

      try {
        const loanResult = await getTeamLoans(currentTeam.id, { startDate, endDate });

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
          setLoanError(loanResult.error || 'Failed to load loan matches');
        }
      } catch (err) {
        console.error('Failed to load loan data:', err);
        setLoanMap(new Map());
        setLoanError('Failed to load loan matches');
      }
    }

    fetchLoanData();
  }, [currentTeam?.id, startDate, endDate]);

  // Enhance attendance data with loan counts
  const enhancedAttendanceData = useMemo(() => {
    return attendanceData.map((player) => {
      const loans = loanMap.get(player.playerId) || [];
      const loanMatches = loans.length;

      return {
        ...player,
        loanMatches
      };
    });
  }, [attendanceData, loanMap]);

  // Define table columns
  const baseColumns = useMemo(
    () => [
      {
        key: SORT_COLUMNS.NAME,
        label: t('attendanceStats.table.player'),
        sortable: true,
        className: 'text-left font-medium',
        render: (player) => (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-slate-100">{player.playerName}</span>
          </div>
        )
      },
      {
        key: SORT_COLUMNS.PRACTICES_PER_MATCH,
        label: t('attendanceStats.table.practicesPerMatch'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">
            {player.practicesPerMatch.toFixed(2)}
          </span>
        )
      },
      {
        key: SORT_COLUMNS.ATTENDANCE,
        label: t('attendanceStats.table.practicesAttended'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.totalAttendance}</span>
        )
      },
      {
        key: SORT_COLUMNS.RATE,
        label: t('attendanceStats.table.attendanceRate'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.attendanceRate}%</span>
        )
      },
      {
        key: SORT_COLUMNS.MATCHES,
        label: t('attendanceStats.table.matchesPlayed'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">{player.matchesPlayed}</span>
        )
      },
      {
        key: SORT_COLUMNS.LOAN_MATCHES,
        label: t('attendanceStats.table.matchesLoaned'),
        sortable: true,
        className: 'text-center',
        render: (player) => (
          <span className="text-slate-300 font-mono">
            {player.loanMatches > 0 ? player.loanMatches : '-'}
          </span>
        )
      }
    ],
    [t]
  );

  // Use column order persistence hook
  const dragDropHandlers = useColumnOrderPersistence(
    baseColumns,
    STORAGE_KEYS.STATISTICS_ATTENDANCE_COLUMN_ORDER
  );

  // Use table sort hook
  const {
    sortedData,
    sortBy,
    handleSort,
    renderSortIndicator
  } = useTableSort(enhancedAttendanceData, SORT_COLUMNS.NAME, 'asc', dragDropHandlers.isReordering);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (attendanceData.length === 0) {
      return {
        totalPlayers: 0,
        totalPractices: 0,
        averageAttendanceRate: 0,
        topAttendee: null
      };
    }

    const totalPlayers = attendanceData.length;
    const maxPractices = Math.max(...attendanceData.map(p => p.totalPractices), 0);
    const averageRate = attendanceData.reduce((sum, player) => sum + player.attendanceRate, 0) / totalPlayers;

    // Find player with highest absolute attendance count
    // If tie in count, use attendance rate as tiebreaker
    const topAttendee = attendanceData.reduce((top, player) => {
      if (!top) return player;

      // Primary: highest absolute attendance count
      if (player.totalAttendance > top.totalAttendance) return player;
      if (player.totalAttendance < top.totalAttendance) return top;

      // Tiebreaker: highest percentage
      if (player.attendanceRate > top.attendanceRate) return player;
      return top;
    }, null);

    return {
      totalPlayers,
      totalPractices: maxPractices,
      averageAttendanceRate: Math.round(averageRate * 10) / 10,
      topAttendee: topAttendee ? {
        playerName: topAttendee.playerName,
        attendanceRate: topAttendee.attendanceRate,
        totalAttendance: topAttendee.totalAttendance
      } : null
    };
  }, [attendanceData]);

  const handleConnectNow = () => {
    teamManagementTabCacheManager.saveState({ tab: 'connectors' });
    if (typeof onNavigateTo === 'function') {
      onNavigateTo(VIEWS.TEAM_MANAGEMENT);
    }
  };

  // Show loading state
  if (loading || connectorsLoading) {
    return <StatsLoadingState message={t('attendanceStats.loading')} />;
  }

  // Show error state
  if (error) {
    return <StatsErrorState title={t('attendanceStats.error')} message={error} />;
  }

  // Check if team has any connected connectors
  const hasConnectedProvider = connectors.some(c => c.status === 'connected');

  // Show empty state if no connectors
  if (!hasConnectedProvider) {
    return (
      <StatsEmptyState
        icon={Calendar}
        title={t('attendanceStats.noConnector.title')}
        message={
          <>
            <p className="text-slate-400 text-sm mb-4">
              {t('attendanceStats.noConnector.description')}
            </p>
            <ul className="text-slate-400 text-sm mb-6 space-y-1">
              <li>{t('attendanceStats.noConnector.platforms.sportadmin')}</li>
              <li>{t('attendanceStats.noConnector.platforms.svenskalag')}</li>
              <li>{t('attendanceStats.noConnector.platforms.myclub')}</li>
            </ul>
          </>
        }
        actions={
          <Button onClick={handleConnectNow}>
            {t('attendanceStats.noConnector.connectButton')}
          </Button>
        }
      />
    );
  }

  const hasAttendanceData = sortedData.length > 0;

  return (
    <div className="space-y-6">
      {loanError && (
        <div className="bg-amber-900/40 border border-amber-600/50 text-amber-200 text-sm rounded-lg p-4 mb-4">
          {loanError}
        </div>
      )}

      {!hasAttendanceData && (
        <StatsEmptyState
          title={t('attendanceStats.noDataTimeRange')}
          message={t('attendanceStats.adjustTimeFilter')}
        />
      )}

      {hasAttendanceData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={UsersIcon}
              title={t('attendanceStats.totalPlayers')}
              value={summaryStats.totalPlayers}
              subtitle={t('attendanceStats.trackedPlayers')}
            />

            <StatCard
              icon={Calendar}
              title={t('attendanceStats.totalPractices')}
              value={summaryStats.totalPractices}
              subtitle={t('attendanceStats.inSelectedPeriod')}
            />

            <StatCard
              icon={TrendingUp}
              title={t('attendanceStats.avgAttendanceRate')}
              value={`${summaryStats.averageAttendanceRate}%`}
              subtitle={t('attendanceStats.acrossAllPlayers')}
            />

            <StatCard
              icon={Award}
              title={t('attendanceStats.topAttendee')}
              value={summaryStats.topAttendee
                ? summaryStats.topAttendee.playerName
                : 'N/A'
              }
              subtitle={summaryStats.topAttendee
                ? `${summaryStats.topAttendee.attendanceRate}%`
                : 'No data'
              }
            />
          </div>

          {/* Attendance Stats Table */}
          <SortableStatsTable
            data={sortedData}
            orderedColumns={dragDropHandlers.orderedColumns}
            sortBy={sortBy}
            dragDropHandlers={dragDropHandlers}
            onSort={handleSort}
            renderSortIndicator={renderSortIndicator}
            headerIcon={Calendar}
            headerTitle={t('attendanceStats.title')}
            headerSubtitle={t('attendanceStats.table.sortInstruction')}
            idKey="playerId"
          />
        </>
      )}
    </div>
  );
}
