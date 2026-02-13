import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Edit3, Filter, PlusCircle, Repeat, Trash2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, ConfirmationModal, MultiSelect, Select } from '../shared/UI';
import { IconButton } from '../shared/IconButton';
import { Alert } from '../shared/Alert';
import { Avatar } from '../shared/Avatar';
import { SectionHeader } from '../shared/SectionHeader';
import { PlayerLoanModal } from './PlayerLoanModal';
import { useBrowserBackIntercept } from '../../hooks/useBrowserBackIntercept';
import { useTeam } from '../../contexts/TeamContext';
import { deleteMatchLoans, getTeamLoans, recordPlayerLoans } from '../../services/playerLoanService';
import { TimeFilter } from '../statistics/TimeFilter';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { TIME_PRESETS } from '../../constants/timePresets';
import { BREAKPOINTS } from '../../constants/layoutConstants';
import { formatPlayerDisplayName } from '../../utils/playerUtils';

const buildPlayerLabel = (player) => {
  const name = formatPlayerDisplayName(player);
  return player?.jersey_number ? `#${player.jersey_number} ${name}` : name;
};

const parseLoanDate = (loanDate) => {
  if (!loanDate) return null;
  const parsed = new Date(`${loanDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isFutureLoan = (loanDate) => {
  const parsedLoanDate = parseLoanDate(loanDate);
  if (!parsedLoanDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsedLoanDate > today;
};

const getInitialTimeRange = (timeRangePersistence) => {
  const stored = timeRangePersistence.loadState();
  const presetId = stored?.presetId || 'all-time';

  if (presetId === 'custom') {
    const parseDate = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    return {
      start: parseDate(stored?.customStartDate),
      end: parseDate(stored?.customEndDate),
      presetId: 'custom'
    };
  }

  const preset = TIME_PRESETS.find(p => p.id === presetId);
  const range = preset ? preset.getValue() : { start: null, end: null };

  return {
    start: range.start,
    end: range.end,
    presetId: preset ? presetId : 'all-time'
  };
};

const groupLoansByMatch = (loans, rosterLookup, t) => {
  const matchMap = new Map();

  loans.forEach((loan) => {
    const receivingTeamName = loan.receiving_team_name || t('loansView.fallback.unknownTeam');
    const loanDate = loan.loan_date;
    const matchKey = `${receivingTeamName}|${loanDate}`;

    if (!matchMap.has(matchKey)) {
      matchMap.set(matchKey, {
        matchKey,
        receivingTeamName,
        loanDate,
        playerIds: [],
        players: [],
        loanIds: []
      });
    }

    const match = matchMap.get(matchKey);
    const playerSource = loan.player || rosterLookup.get(loan.player_id);
    const displayName = playerSource ? formatPlayerDisplayName(playerSource) : t('loansView.fallback.unknownPlayerDeleted');
    const jerseyNumber = playerSource?.jersey_number ?? null;
    const isDeleted = !playerSource;

    match.playerIds.push(loan.player_id);
    match.players.push({
      id: loan.player_id,
      displayName,
      jerseyNumber,
      isDeleted
    });
    match.loanIds.push(loan.id);
  });

  const matches = Array.from(matchMap.values());
  matches.forEach((match) => {
    match.players = [...match.players].sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  return matches.sort((a, b) => {
    const dateCompare = b.loanDate.localeCompare(a.loanDate);
    if (dateCompare !== 0) return dateCompare;
    return a.receivingTeamName.localeCompare(b.receivingTeamName);
  });
};

export default function PlayerLoansView({ currentTeam, canManageTeam }) {
  const { t } = useTranslation('team');
  const { getTeamRoster } = useTeam();
  const { pushNavigationState, removeFromNavigationStack } = useBrowserBackIntercept();
  const isBelowLgBreakpoint = useCallback(() => {
    return typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.LG;
  }, []);
  const [loans, setLoans] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [playerFilter, setPlayerFilter] = useState([]);
  const [receivingTeamFilter, setReceivingTeamFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(null);

  // Screen size detection and filter collapse state
  const [needsCollapse, setNeedsCollapse] = useState(() => {
    return isBelowLgBreakpoint();
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(() => {
    return isBelowLgBreakpoint();
  });

  // Create persistence manager
  const timeRangePersistence = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.PLAYER_LOANS_TIME_RANGE, {
      presetId: 'all-time',
      customStartDate: null,
      customEndDate: null
    }),
    []
  );

  // Initialize time range from persisted state
  const initialTimeRangeRef = useRef(null);
  if (!initialTimeRangeRef.current) {
    initialTimeRangeRef.current = getInitialTimeRange(timeRangePersistence);
  }
  const initialTimeRange = initialTimeRangeRef.current;

  const [timeRangeStart, setTimeRangeStart] = useState(initialTimeRange.start);
  const [timeRangeEnd, setTimeRangeEnd] = useState(initialTimeRange.end);
  const [selectedPresetId, setSelectedPresetId] = useState(initialTimeRange.presetId);

  const rosterLookup = useMemo(() => {
    return new Map(roster.map(player => [player.id, player]));
  }, [roster]);

  const fetchLoans = useCallback(async () => {
    if (!currentTeam?.id) {
      setLoans([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Convert Date objects to ISO date strings (YYYY-MM-DD)
    const formatDateForBackend = (date) => {
      if (!date) return null;
      return date.toISOString().slice(0, 10);
    };

    const result = await getTeamLoans(currentTeam.id, {
      startDate: formatDateForBackend(timeRangeStart),
      // CRITICAL: Only apply endDate for custom preset (future loans always visible otherwise)
      endDate: (selectedPresetId === 'custom' && timeRangeEnd)
        ? formatDateForBackend(timeRangeEnd)
        : null
    });

    if (result.success) {
      setLoans(result.loans || []);
    } else {
      setLoans([]);
      setError(result.error || t('loansView.messages.loadFailed'));
    }

    setLoading(false);
  }, [currentTeam?.id, timeRangeStart, timeRangeEnd, selectedPresetId, t]);

  const fetchRoster = useCallback(async () => {
    if (!currentTeam?.id) {
      setRoster([]);
      return;
    }

    try {
      const rosterData = await getTeamRoster(currentTeam.id);
      setRoster(rosterData || []);
    } catch (err) {
      console.error('Failed to load roster for loans:', err);
      setRoster([]);
      setError(t('loansView.messages.rosterLoadFailed'));
    }
  }, [currentTeam?.id, getTeamRoster, t]);

  const handleRetry = useCallback(() => {
    fetchLoans();
    fetchRoster();
  }, [fetchLoans, fetchRoster]);

  const handleTimeRangeChange = (startDate, endDate, presetId = 'all-time') => {
    const normalizeDate = (value) => {
      if (!value) return null;
      const parsed = value instanceof Date ? value : new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    setTimeRangeStart(normalizeDate(startDate));
    setTimeRangeEnd(normalizeDate(endDate));
    setSelectedPresetId(presetId);
  };

  useEffect(() => {
    if (selectedPresetId === 'custom') {
      timeRangePersistence.saveState({
        presetId: 'custom',
        customStartDate: timeRangeStart ? timeRangeStart.toISOString() : null,
        customEndDate: timeRangeEnd ? timeRangeEnd.toISOString() : null
      });
    } else {
      timeRangePersistence.saveState({
        presetId: selectedPresetId,
        customStartDate: null,
        customEndDate: null
      });
    }
  }, [timeRangeStart, timeRangeEnd, selectedPresetId, timeRangePersistence]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Detect screen size that requires filter collapsing
  useEffect(() => {
    const checkScreenSize = () => {
      const shouldCollapse = isBelowLgBreakpoint();

      setNeedsCollapse(prevNeedsCollapse => {
        if (prevNeedsCollapse !== shouldCollapse) {
          setIsFilterCollapsed(prevIsCollapsed => {
            // Auto-collapse when transitioning from wide to narrow
            if (shouldCollapse && !prevNeedsCollapse) {
              return true;
            } else if (!shouldCollapse) {
              return false;
            }
            return prevIsCollapsed;
          });
        }
        return shouldCollapse;
      });
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isBelowLgBreakpoint]);

  const playerOptions = useMemo(() => {
    return roster.map(player => ({
      value: player.id,
      label: buildPlayerLabel(player)
    }));
  }, [roster]);

  const receivingTeamOptions = useMemo(() => {
    const teams = new Set();
    loans.forEach(loan => {
      if (loan.receiving_team_name) {
        teams.add(loan.receiving_team_name);
      }
    });

    return Array.from(teams)
      .sort((a, b) => a.localeCompare(b))
      .map(teamName => ({
        value: teamName,
        label: teamName
      }));
  }, [loans]);

  const hasActiveFilters = useMemo(() => {
    return (
      playerFilter.length > 0 ||
      receivingTeamFilter.length > 0 ||
      statusFilter !== 'all' ||
      selectedPresetId !== 'all-time' ||
      Boolean(timeRangeStart) ||
      Boolean(timeRangeEnd)
    );
  }, [playerFilter, receivingTeamFilter, statusFilter, selectedPresetId, timeRangeStart, timeRangeEnd]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (statusFilter === 'future' && !isFutureLoan(loan.loan_date)) {
        return false;
      }
      if (statusFilter === 'past' && isFutureLoan(loan.loan_date)) {
        return false;
      }

      if (playerFilter.length > 0 && !playerFilter.includes(loan.player_id)) {
        return false;
      }

      if (
        receivingTeamFilter.length > 0 &&
        !receivingTeamFilter.includes(loan.receiving_team_name)
      ) {
        return false;
      }

      return true;
    });
  }, [loans, statusFilter, playerFilter, receivingTeamFilter]);

  const groupedMatches = useMemo(() => {
    return groupLoansByMatch(filteredLoans, rosterLookup, t);
  }, [filteredLoans, rosterLookup, t]);

  const modalPlayers = useMemo(() => {
    if (!editingMatch) {
      // Filter out temporary players (match_id IS NOT NULL)
      return roster.filter(player => !player.match_id);
    }

    // When editing, include standard roster players plus any players
    // from the existing loan that might have been deleted
    const standardRoster = roster.filter(player => !player.match_id);

    const existingPlayers = new Map(standardRoster.map(player => [player.id, player]));
    editingMatch.players.forEach(player => {
      if (!existingPlayers.has(player.id)) {
        existingPlayers.set(player.id, {
          id: player.id,
          display_name: player.displayName,
          jersey_number: player.jerseyNumber
        });
      }
    });

    return Array.from(existingPlayers.values());
  }, [editingMatch, roster]);

  const handleClearFilters = () => {
    setPlayerFilter([]);
    setReceivingTeamFilter([]);
    setStatusFilter('all');
    setTimeRangeStart(null);
    setTimeRangeEnd(null);
    setSelectedPresetId('all-time');
  };

  const handleOpenLoanModal = () => {
    setEditingMatch(null);
    setShowLoanModal(true);
    pushNavigationState(() => {
      setShowLoanModal(false);
      setEditingMatch(null);
    }, 'PlayerLoansView-LoanModal');
  };

  const handleCloseLoanModal = () => {
    setShowLoanModal(false);
    setEditingMatch(null);
    removeFromNavigationStack();
  };

  const handleEditMatch = (match) => {
    setEditingMatch(match);
    setShowLoanModal(true);
    pushNavigationState(() => {
      setShowLoanModal(false);
      setEditingMatch(null);
    }, 'PlayerLoansView-LoanModal');
  };

  const handleSaveLoanMatch = async ({ playerIds, receivingTeamName, loanDate }) => {
    if (!currentTeam?.id) {
      throw new Error('Team ID is required');
    }

    setError(null);

    if (editingMatch) {
      const deleteResult = await deleteMatchLoans({
        teamId: currentTeam.id,
        receivingTeamName: editingMatch.receivingTeamName,
        loanDate: editingMatch.loanDate
      });

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to update match');
      }
    }

    const createResult = await recordPlayerLoans(playerIds, {
      teamId: currentTeam.id,
      receivingTeamName,
      loanDate
    });

    if (!createResult.success) {
      throw new Error(createResult.error || 'Failed to record loan');
    }

    const successKey = editingMatch
      ? (playerIds.length === 1 ? 'loansView.messages.loanUpdatedSingle' : 'loansView.messages.loanUpdatedMultiple')
      : (playerIds.length === 1 ? 'loansView.messages.loanRecordedSingle' : 'loansView.messages.loanRecordedMultiple');
    setSuccessMessage(t(successKey, { count: playerIds.length }));

    await fetchLoans();
  };

  const handleDeleteMatchConfirm = (match) => {
    setDeletingMatch(match);
    pushNavigationState(() => setDeletingMatch(null), 'PlayerLoansView-DeleteMatch');
  };

  const handleDeleteMatch = async () => {
    if (!currentTeam?.id || !deletingMatch) return;

    const result = await deleteMatchLoans({
      teamId: currentTeam.id,
      receivingTeamName: deletingMatch.receivingTeamName,
      loanDate: deletingMatch.loanDate
    });

    if (result.success) {
      setSuccessMessage(t('loansView.messages.loanDeleted', { count: deletingMatch.players.length }));
      setDeletingMatch(null);
      removeFromNavigationStack();
      await fetchLoans();
      return;
    }

    setError(result.error || t('loansView.messages.deleteFailed'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title={t('loansView.header.title')} icon={Repeat} />
        {canManageTeam && (
        <Button onClick={handleOpenLoanModal} Icon={PlusCircle} size="sm">
          {t('loansView.header.newLoanButton')}
        </Button>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={`flex items-center gap-2 text-slate-200 ${needsCollapse ? 'cursor-pointer' : ''}`}
            onClick={() => needsCollapse && setIsFilterCollapsed(!isFilterCollapsed)}
          >
            <Filter className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold">{t('loansView.filters.title')}</span>
            {needsCollapse && (
              <button
                type="button"
                className="text-sky-400 hover:text-sky-300 transition-colors"
                aria-label={isFilterCollapsed ? t('loansView.filters.expandLabel') : t('loansView.filters.collapseLabel')}
              >
                {isFilterCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              {t('loansView.filters.clearButton')}
            </button>
          )}
        </div>

        {/* Filter content - collapsible when screen is narrow */}
        <div className={`${
          needsCollapse
            ? (isFilterCollapsed ? 'hidden' : 'block')
            : ''
        }`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                {t('loansView.filters.labels.players')}
              </label>
              <MultiSelect
                value={playerFilter}
                onChange={setPlayerFilter}
                options={playerOptions}
                placeholder={t('loansView.filters.placeholders.allPlayers')}
              />
            </div>
            <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              {t('loansView.filters.labels.teams')}
            </label>
              <MultiSelect
                value={receivingTeamFilter}
                onChange={setReceivingTeamFilter}
                options={receivingTeamOptions}
                placeholder={t('loansView.filters.placeholders.allTeams')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                {t('loansView.filters.labels.status')}
              </label>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: t('loansView.filters.statusOptions.all') },
                  { value: 'future', label: t('loansView.filters.statusOptions.upcoming') },
                  { value: 'past', label: t('loansView.filters.statusOptions.past') }
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                {t('loansView.filters.labels.timePeriod')}
              </label>
              <TimeFilter
                startDate={timeRangeStart}
                endDate={timeRangeEnd}
                selectedPresetId={selectedPresetId}
                onTimeRangeChange={handleTimeRangeChange}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button onClick={handleRetry} variant="secondary" size="sm">
              {t('loansView.messages.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">{successMessage}</Alert>
      )}

      {loading ? (
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">{t('loansView.emptyStates.loading')}</div>
        </div>
      ) : (
        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          <div className="space-y-3">
            {groupedMatches.map((match) => (
              <div
                key={match.matchKey}
                className="bg-slate-800 p-4 rounded-lg border border-slate-600 hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-slate-200 font-semibold truncate">
                        {match.receivingTeamName}
                      </div>
                      {isFutureLoan(match.loanDate) && (
                        <span className="bg-sky-900/50 border-sky-600 text-sky-200 px-2 py-1 rounded text-xs border">
                          {t('loansView.match.upcomingBadge')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {match.loanDate}
                    </div>
                  </div>

                  {canManageTeam && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditMatch(match)}
                        className="p-1 text-slate-400 hover:text-sky-400"
                        aria-label={t('loansView.match.editLabel')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <IconButton
                        onClick={() => handleDeleteMatchConfirm(match)}
                        icon={Trash2}
                        label={t('loansView.match.deleteLabel')}
                        variant="danger"
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-3 pt-3 border-t border-slate-600">
                  <div className="text-xs text-slate-400">
                    {t('loansView.match.playersLabel', { count: match.players.length })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {match.players.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                          player.isDeleted ? 'bg-slate-700/60' : 'bg-slate-700'
                        }`}
                      >
                        <Avatar size="sm">
                          {player.jerseyNumber ? (
                            <span className="font-semibold">
                              {player.jerseyNumber}
                            </span>
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                        </Avatar>
                        <span
                          className={`text-sm ${
                            player.isDeleted ? 'text-slate-400' : 'text-slate-200'
                          }`}
                        >
                          {player.displayName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {loans.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t('loansView.emptyStates.noLoans.title')}</p>
                <p className="text-sm mb-4">
                  {t('loansView.emptyStates.noLoans.description')}
                </p>
                {canManageTeam && (
                  <Button onClick={handleOpenLoanModal} Icon={PlusCircle}>
                    {t('loansView.emptyStates.noLoans.button')}
                  </Button>
                )}
              </div>
            )}

            {loans.length > 0 && groupedMatches.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t('loansView.emptyStates.noResults.title')}</p>
                <p className="text-sm mb-4">{t('loansView.emptyStates.noResults.description')}</p>
                {hasActiveFilters && (
                  <Button onClick={handleClearFilters} variant="secondary">
                    {t('loansView.emptyStates.noResults.button')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showLoanModal && (
        <PlayerLoanModal
          isOpen={showLoanModal}
          onClose={handleCloseLoanModal}
          onSave={handleSaveLoanMatch}
          players={modalPlayers}
          loan={editingMatch}
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(deletingMatch)}
        onCancel={() => {
          setDeletingMatch(null);
          removeFromNavigationStack();
        }}
        onConfirm={handleDeleteMatch}
        title={t('loansView.deleteConfirmation.title')}
        message={
          deletingMatch
            ? t('loansView.deleteConfirmation.message', {
                count: deletingMatch.players.length,
                teamName: deletingMatch.receivingTeamName,
                date: deletingMatch.loanDate
              })
            : ''
        }
        confirmText={t('loansView.deleteConfirmation.confirmButton')}
        cancelText={t('loansView.deleteConfirmation.cancelButton')}
      />
    </div>
  );
}
