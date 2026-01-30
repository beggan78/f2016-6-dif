import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Edit3, Filter, PlusCircle, Repeat, Trash2, User } from 'lucide-react';
import { Button, ConfirmationModal, Input, MultiSelect, Select } from '../shared/UI';
import { PlayerLoanModal } from './PlayerLoanModal';
import { useBrowserBackIntercept } from '../../hooks/useBrowserBackIntercept';
import { useTeam } from '../../contexts/TeamContext';
import { deleteMatchLoans, getTeamLoans, recordPlayerLoans } from '../../services/playerLoanService';

const formatRosterName = (player) => {
  if (!player) return 'Unknown Player';
  if (player.display_name) return player.display_name;
  if (player.first_name || player.last_name) {
    return `${player.first_name || ''}${player.last_name ? ` ${player.last_name}` : ''}`.trim();
  }
  return 'Unknown Player';
};

const buildPlayerLabel = (player) => {
  const name = formatRosterName(player);
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

const groupLoansByMatch = (loans, rosterLookup) => {
  const matchMap = new Map();

  loans.forEach((loan) => {
    const receivingTeamName = loan.receiving_team_name || 'Unknown Team';
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
    const displayName = playerSource ? formatRosterName(playerSource) : 'Unknown Player (deleted)';
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
  const { getTeamRoster } = useTeam();
  const { pushNavigationState, removeFromNavigationStack } = useBrowserBackIntercept();
  const [loans, setLoans] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [playerFilter, setPlayerFilter] = useState([]);
  const [receivingTeamFilter, setReceivingTeamFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(null);

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

    const result = await getTeamLoans(currentTeam.id, {
      startDate: startDate || null,
      endDate: endDate || null
    });

    if (result.success) {
      setLoans(result.loans || []);
    } else {
      setLoans([]);
      setError(result.error || 'Failed to load player loans');
    }

    setLoading(false);
  }, [currentTeam?.id, startDate, endDate]);

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
    }
  }, [currentTeam?.id, getTeamRoster]);

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
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [playerFilter, receivingTeamFilter, statusFilter, startDate, endDate]);

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
    return groupLoansByMatch(filteredLoans, rosterLookup);
  }, [filteredLoans, rosterLookup]);

  const modalPlayers = useMemo(() => {
    if (!editingMatch) {
      return roster;
    }

    const existingPlayers = new Map(roster.map(player => [player.id, player]));
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
    setStartDate('');
    setEndDate('');
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
      throw new Error(createResult.error || 'Failed to record loan match');
    }

    const successSuffix = playerIds.length === 1 ? 'player' : 'players';
    const successVerb = editingMatch ? 'updated' : 'recorded';
    setSuccessMessage(`Loan match ${successVerb} for ${playerIds.length} ${successSuffix}.`);

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
      setSuccessMessage(`Removed ${deletingMatch.players.length} player(s) from loan match.`);
      setDeletingMatch(null);
      removeFromNavigationStack();
      await fetchLoans();
      return;
    }

    setError(result.error || 'Failed to delete loan match');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <Repeat className="h-5 w-5 text-sky-400" />
          <h3 className="text-lg font-semibold text-sky-300">Player Loans</h3>
        </div>
        {canManageTeam && (
          <Button onClick={handleOpenLoanModal} Icon={PlusCircle} size="sm">
            Record Loan Match
          </Button>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-600 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-200">
            <Filter className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold">Filters</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Players
            </label>
            <MultiSelect
              value={playerFilter}
              onChange={setPlayerFilter}
              options={playerOptions}
              placeholder="All players"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Receiving Teams
            </label>
            <MultiSelect
              value={receivingTeamFilter}
              onChange={setReceivingTeamFilter}
              options={receivingTeamOptions}
              placeholder="All teams"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Status
            </label>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'future', label: 'Upcoming' },
                { value: 'past', label: 'Past' }
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3 flex items-center justify-between gap-4">
          <p className="text-rose-200 text-sm">{error}</p>
          <Button onClick={fetchLoans} variant="secondary" size="sm">
            Retry
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
          <p className="text-emerald-200 text-sm">{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-700 p-8 rounded-lg border border-slate-600 text-center">
          <div className="text-slate-400">Loading loan matches...</div>
        </div>
      ) : (
        <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
          {loans.length > 0 && (
            <p className="text-slate-400 text-sm mb-4">
              {groupedMatches.length} loan match{groupedMatches.length !== 1 ? 'es' : ''} found.
            </p>
          )}
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
                        vs {match.receivingTeamName}
                      </div>
                      <span
                        className={
                          isFutureLoan(match.loanDate)
                            ? 'bg-sky-900/50 border-sky-600 text-sky-200 px-2 py-1 rounded text-xs border'
                            : 'bg-slate-700 border-slate-600 text-slate-300 px-2 py-1 rounded text-xs border'
                        }
                      >
                        {isFutureLoan(match.loanDate) ? 'Upcoming' : 'Past'}
                      </span>
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
                        aria-label="Edit match"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMatchConfirm(match)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        aria-label="Delete match"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-3 pt-3 border-t border-slate-600">
                  <div className="text-xs text-slate-400">
                    Players ({match.players.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {match.players.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                          player.isDeleted ? 'bg-slate-700/60' : 'bg-slate-700'
                        }`}
                      >
                        <div className="w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center shrink-0">
                          {player.jerseyNumber ? (
                            <span className="text-white text-xs font-semibold">
                              {player.jerseyNumber}
                            </span>
                          ) : (
                            <User className="w-3 h-3 text-white" />
                          )}
                        </div>
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
                <p className="text-lg font-medium mb-2">No loan matches recorded yet</p>
                <p className="text-sm mb-4">
                  Track when your players appear for other teams.
                </p>
                {canManageTeam && (
                  <Button onClick={handleOpenLoanModal} Icon={PlusCircle}>
                    Record First Match
                  </Button>
                )}
              </div>
            )}

            {loans.length > 0 && groupedMatches.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No loans found</p>
                <p className="text-sm mb-4">Try adjusting your filters.</p>
                {hasActiveFilters && (
                  <Button onClick={handleClearFilters} variant="secondary">
                    Clear Filters
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
        title="Delete loan match"
        message={
          deletingMatch
            ? `Remove ${deletingMatch.players.length} player(s) from the loan match vs ${deletingMatch.receivingTeamName} on ${deletingMatch.loanDate}?`
            : ''
        }
        confirmText="Delete Match"
        cancelText="Cancel"
      />
    </div>
  );
}
