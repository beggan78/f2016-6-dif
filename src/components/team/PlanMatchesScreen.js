import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Percent, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Button, Input, NotificationModal } from '../shared/UI';
import { Tooltip } from '../shared';
import { useTeam } from '../../contexts/TeamContext';
import { getAttendanceStats } from '../../services/connectorService';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { getMinimumPlayersForFormat } from '../../constants/teamConfiguration';
import { getMostRecentFinishedMatch, planUpcomingMatch, resolveMatchPlanningDefaults } from '../../services/matchPlanningService';

const AUTO_SELECT_STRATEGY = {
  PRACTICES: 'practices',
  ATTENDANCE: 'attendance'
};
const PRACTICES_TOOLTIP = 'Practices per match';

export function PlanMatchesScreen({
  onNavigateBack,
  pushNavigationState,
  removeFromNavigationStack,
  matchesToPlan = []
}) {
  const { currentTeam, teamPlayers, loadTeamPreferences } = useTeam();
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [defaultsError, setDefaultsError] = useState(null);
  const [sortMetric, setSortMetric] = useState(AUTO_SELECT_STRATEGY.PRACTICES);
  const [selectedPlayersByMatch, setSelectedPlayersByMatch] = useState({});
  const [unavailablePlayersByMatch, setUnavailablePlayersByMatch] = useState({});
  const [targetCounts, setTargetCounts] = useState({});
  const [planningStatus, setPlanningStatus] = useState({});
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '' });
  const [showAutoSelectModal, setShowAutoSelectModal] = useState(false);
  const [autoSelectSettings, setAutoSelectSettings] = useState({
    ensureCoverage: false,
    metric: AUTO_SELECT_STRATEGY.PRACTICES
  });
  const [matches, setMatches] = useState(() => (Array.isArray(matchesToPlan) ? matchesToPlan : []));

  useEffect(() => {
    if (Array.isArray(matchesToPlan) && matchesToPlan.length > 0) {
      setMatches(matchesToPlan);
    }
  }, [matchesToPlan]);

  const matchIndexById = useMemo(() => {
    const map = new Map();
    matches.forEach((match, index) => {
      map.set(match.id, index + 1);
    });
    return map;
  }, [matches]);

  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date;
  }, []);

  const unavailableManager = useMemo(() => createPersistenceManager(
    STORAGE_KEYS.PLAN_MATCH_UNAVAILABLE_PLAYERS,
    { teamId: null, matches: {} }
  ), []);

  useEffect(() => {
    if (pushNavigationState) {
      pushNavigationState(() => {
        onNavigateBack();
      });
    }

    return () => {
      if (removeFromNavigationStack) {
        removeFromNavigationStack();
      }
    };
  }, [pushNavigationState, removeFromNavigationStack, onNavigateBack]);

  useEffect(() => {
    if (!currentTeam?.id) {
      setUnavailablePlayersByMatch({});
      return;
    }

    const stored = unavailableManager.loadState();
    if (stored?.teamId === currentTeam.id) {
      setUnavailablePlayersByMatch(stored.matches || {});
    } else {
      setUnavailablePlayersByMatch({});
    }
  }, [currentTeam?.id, unavailableManager]);

  useEffect(() => {
    if (!currentTeam?.id) return;
    unavailableManager.saveState({
      teamId: currentTeam.id,
      matches: unavailablePlayersByMatch
    });
  }, [currentTeam?.id, unavailableManager, unavailablePlayersByMatch]);

  useEffect(() => {
    if (!currentTeam?.id) {
      setAttendanceStats([]);
      return;
    }

    let isActive = true;
    setStatsLoading(true);
    setStatsError(null);

    getAttendanceStats(currentTeam.id, startDate, endDate)
      .then((data) => {
        if (!isActive) return;
        setAttendanceStats(data || []);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Failed to load attendance stats:', error);
        setStatsError(error.message || 'Failed to load attendance stats');
      })
      .finally(() => {
        if (!isActive) return;
        setStatsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentTeam?.id, startDate, endDate]);

  useEffect(() => {
    let isActive = true;
    if (!currentTeam?.id || !loadTeamPreferences) {
      setDefaults(null);
      return;
    }

    setDefaultsError(null);

    const loadDefaults = async () => {
      let preferences = {};
      let recentMatch = null;

      try {
        preferences = await loadTeamPreferences(currentTeam.id);
      } catch (error) {
        console.error('Failed to load team preferences:', error);
        setDefaultsError('Failed to load match defaults.');
      }

      try {
        recentMatch = await getMostRecentFinishedMatch(currentTeam.id);
      } catch (error) {
        console.error('Failed to load recent match:', error);
        setDefaultsError('Failed to load match defaults.');
      }

      if (!isActive) return;
      setDefaults(resolveMatchPlanningDefaults(preferences, recentMatch));
    };

    loadDefaults();

    return () => {
      isActive = false;
    };
  }, [currentTeam?.id, loadTeamPreferences]);

  useEffect(() => {
    if (matches.length === 0) return;

    setSelectedPlayersByMatch((prev) => {
      const next = { ...prev };
      matches.forEach((match) => {
        if (!next[match.id]) {
          next[match.id] = [];
        }
      });
      return next;
    });
  }, [matches]);

  const rosterPlayers = useMemo(() => {
    return (teamPlayers || [])
      .filter(player => player.on_roster !== false)
      .map(player => ({
        id: player.id,
        displayName: player.display_name || player.first_name || 'Unknown Player',
        firstName: player.first_name || null,
        lastName: player.last_name || null,
        jerseyNumber: player.jersey_number
      }));
  }, [teamPlayers]);

  useEffect(() => {
    if (!defaults || matches.length === 0) return;

    const minimumPlayers = Math.max(0, getMinimumPlayersForFormat(defaults.format));
    const rosterCount = rosterPlayers.length;
    const defaultTarget = rosterCount > 0 ? Math.min(rosterCount, minimumPlayers) : 0;

    setTargetCounts((prev) => {
      const next = { ...prev };
      matches.forEach((match) => {
        if (typeof next[match.id] !== 'number') {
          next[match.id] = defaultTarget;
        }
      });
      return next;
    });
  }, [defaults, matches, rosterPlayers.length]);

  const statsByPlayerId = useMemo(() => {
    const map = new Map();
    attendanceStats.forEach((stat) => {
      map.set(stat.playerId, stat);
    });
    return map;
  }, [attendanceStats]);

  const rosterWithStats = useMemo(() => {
    return rosterPlayers.map(player => {
      const stats = statsByPlayerId.get(player.id);
      return {
        ...player,
        practicesPerMatch: stats?.practicesPerMatch ?? 0,
        attendanceRate: stats?.attendanceRate ?? 0
      };
    });
  }, [rosterPlayers, statsByPlayerId]);

  const rosterById = useMemo(() => {
    const map = new Map();
    rosterWithStats.forEach(player => {
      map.set(player.id, player);
    });
    return map;
  }, [rosterWithStats]);

  const sortedRoster = useMemo(() => {
    const metricKey = sortMetric === AUTO_SELECT_STRATEGY.ATTENDANCE
      ? 'attendanceRate'
      : 'practicesPerMatch';

    return [...rosterWithStats].sort((a, b) => {
      const diff = (b[metricKey] || 0) - (a[metricKey] || 0);
      if (diff !== 0) return diff;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [rosterWithStats, sortMetric]);

  const formatSchedule = (matchDate, matchTime) => {
    if (!matchDate) return 'Date TBD';
    if (!matchTime) return matchDate;
    const trimmed = matchTime.slice(0, 5);
    return `${matchDate} ${trimmed}`;
  };

  const getUnavailableSet = useCallback((matchId) => new Set(unavailablePlayersByMatch[matchId] || []), [unavailablePlayersByMatch]);

  const togglePlayerSelection = useCallback((matchId, playerId) => {
    const unavailableSet = getUnavailableSet(matchId);
    if (unavailableSet.has(playerId)) {
      return;
    }

    setSelectedPlayersByMatch((prev) => {
      const current = new Set(prev[matchId] || []);
      if (current.has(playerId)) {
        current.delete(playerId);
      } else {
        current.add(playerId);
      }
      return {
        ...prev,
        [matchId]: Array.from(current)
      };
    });
  }, [getUnavailableSet]);

  const togglePlayerUnavailable = useCallback((matchId, playerId) => {
    const wasUnavailable = (unavailablePlayersByMatch[matchId] || []).includes(playerId);

    setUnavailablePlayersByMatch((prev) => {
      const current = new Set(prev[matchId] || []);
      if (current.has(playerId)) {
        current.delete(playerId);
      } else {
        current.add(playerId);
      }
      return {
        ...prev,
        [matchId]: Array.from(current)
      };
    });

    if (!wasUnavailable) {
      setSelectedPlayersByMatch((prev) => {
        const current = new Set(prev[matchId] || []);
        if (current.has(playerId)) {
          current.delete(playerId);
          return {
            ...prev,
            [matchId]: Array.from(current)
          };
        }
        return prev;
      });
    }
  }, [unavailablePlayersByMatch]);

  const updateTargetCount = (matchId, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const capped = rosterPlayers.length > 0 ? Math.min(rosterPlayers.length, safeValue) : safeValue;
    setTargetCounts((prev) => ({
      ...prev,
      [matchId]: capped
    }));
  };

  const buildSortedRoster = useCallback((metric) => {
    const metricKey = metric === AUTO_SELECT_STRATEGY.ATTENDANCE
      ? 'attendanceRate'
      : 'practicesPerMatch';

    return [...rosterWithStats].sort((a, b) => {
      const diff = (b[metricKey] || 0) - (a[metricKey] || 0);
      if (diff !== 0) return diff;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [rosterWithStats]);

  const autoSelectSingleMatch = useCallback((matchId, metric) => {
    const target = targetCounts[matchId] || 0;
    const unavailableSet = getUnavailableSet(matchId);
    const sorted = buildSortedRoster(metric);
    const selected = sorted
      .filter(player => !unavailableSet.has(player.id))
      .slice(0, target)
      .map(player => player.id);

    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      [matchId]: selected
    }));
  }, [buildSortedRoster, getUnavailableSet, targetCounts]);

  const autoSelectMultipleMatches = useCallback((metric, ensureCoverage) => {
    const sorted = buildSortedRoster(metric);
    const matchIds = matches.map(match => match.id);
    const targets = matchIds.reduce((acc, id) => {
      acc[id] = targetCounts[id] || 0;
      return acc;
    }, {});

    const totalSlots = matchIds.reduce((sum, id) => sum + targets[id], 0);
    const canCoverAll = ensureCoverage && totalSlots >= sorted.length;
    const nextSelections = matchIds.reduce((acc, id) => {
      acc[id] = [];
      return acc;
    }, {});

    if (canCoverAll) {
      sorted.forEach((player) => {
        const availableMatches = matchIds.filter((id) => {
          if (nextSelections[id].length >= targets[id]) return false;
          return !getUnavailableSet(id).has(player.id);
        });

        if (availableMatches.length === 0) {
          return;
        }

        availableMatches.sort((a, b) => nextSelections[a].length - nextSelections[b].length);
        nextSelections[availableMatches[0]].push(player.id);
      });
    }

    matchIds.forEach((matchId) => {
      const target = targets[matchId];
      const unavailableSet = getUnavailableSet(matchId);

      sorted.forEach((player) => {
        if (nextSelections[matchId].length >= target) return;
        if (unavailableSet.has(player.id)) return;
        if (nextSelections[matchId].includes(player.id)) return;
        nextSelections[matchId].push(player.id);
      });
    });

    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      ...nextSelections
    }));
  }, [buildSortedRoster, getUnavailableSet, matches, targetCounts]);

  const handleAutoSelect = (matchId) => {
    if (matches.length > 1) {
      setAutoSelectSettings({
        ensureCoverage: false,
        metric: AUTO_SELECT_STRATEGY.PRACTICES
      });
      setShowAutoSelectModal(true);
      if (pushNavigationState) {
        pushNavigationState(() => setShowAutoSelectModal(false), 'PlanMatches-AutoSelect');
      }
      return;
    }

    autoSelectSingleMatch(matchId, sortMetric);
  };

  const handleAutoSelectConfirm = () => {
    setShowAutoSelectModal(false);
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
    autoSelectMultipleMatches(autoSelectSettings.metric, autoSelectSettings.ensureCoverage);
  };

  const handleAutoSelectCancel = () => {
    setShowAutoSelectModal(false);
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handlePlanMatch = async (match) => {
    if (!currentTeam?.id || !defaults) {
      return;
    }

    const selectedIds = selectedPlayersByMatch[match.id] || [];
    if (selectedIds.length === 0) {
      setNotification({
        isOpen: true,
        title: 'No players selected',
        message: 'Select players before planning this match.'
      });
      return;
    }

    setPlanningStatus((prev) => ({
      ...prev,
      [match.id]: 'loading'
    }));

    const result = await planUpcomingMatch({
      teamId: currentTeam.id,
      teamName: currentTeam.club?.name || currentTeam.name || null,
      upcomingMatch: match,
      selectedSquadIds: selectedIds,
      rosterPlayers: teamPlayers,
      defaults
    });

    if (result.success) {
      setPlanningStatus((prev) => ({
        ...prev,
        [match.id]: 'done'
      }));
      setNotification({
        isOpen: true,
        title: 'Match planned',
        message: result.warning || 'Pending match created.'
      });
    } else {
      setPlanningStatus((prev) => ({
        ...prev,
        [match.id]: 'error'
      }));
      setNotification({
        isOpen: true,
        title: 'Planning failed',
        message: result.error || 'Failed to plan match.'
      });
    }
  };

  if (!currentTeam?.id) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">Plan Matches</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>
        <div className="bg-slate-700 rounded-lg border border-slate-600 p-6 text-slate-300 text-sm">
          Team context required.
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">Plan Matches</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>
        <div className="bg-slate-700 rounded-lg border border-slate-600 p-6 text-slate-300 text-sm">
          No matches selected.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-sky-300">Plan Matches</h1>
          <span className="text-xs uppercase tracking-wide text-slate-400">6M</span>
        </div>
        <Button onClick={onNavigateBack} variant="secondary" size="sm">
          Back
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800/80 p-1">
          <button
            type="button"
            onClick={() => setSortMetric(AUTO_SELECT_STRATEGY.PRACTICES)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
              sortMetric === AUTO_SELECT_STRATEGY.PRACTICES
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-slate-100'
            }`}
            title="Sort by practices per match"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            P/M
          </button>
          <button
            type="button"
            onClick={() => setSortMetric(AUTO_SELECT_STRATEGY.ATTENDANCE)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
              sortMetric === AUTO_SELECT_STRATEGY.ATTENDANCE
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-slate-100'
            }`}
            title="Sort by attendance percentage"
          >
            <Percent className="h-3.5 w-3.5" />
            %
          </button>
        </div>
        {statsLoading && (
          <span className="text-xs text-slate-400">Stats...</span>
        )}
        {statsError && (
          <span className="text-xs text-rose-300">{statsError}</span>
        )}
        {defaultsError && (
          <span className="text-xs text-rose-300">{defaultsError}</span>
        )}
      </div>

      <div className={`grid gap-4 ${matches.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {matches.map((match) => {
          const selectedIds = selectedPlayersByMatch[match.id] || [];
          const selectedSet = new Set(selectedIds);
          const unavailableSet = getUnavailableSet(match.id);
          const plannedState = planningStatus[match.id];
          const isPlanning = plannedState === 'loading';
          const isPlanned = plannedState === 'done';
          const target = targetCounts[match.id] || 0;
          const displayRoster = [
            ...sortedRoster.filter((player) => !unavailableSet.has(player.id)),
            ...sortedRoster.filter((player) => unavailableSet.has(player.id))
          ];

          return (
            <div
              key={match.id}
              className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-200">
                    {matchIndexById.get(match.id)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{match.opponent}</div>
                    <div className="text-xs text-slate-400">{formatSchedule(match.matchDate, match.matchTime)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-slate-300">
                    <Users className="h-3.5 w-3.5" />
                    <span>{selectedIds.length}/{target}</span>
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      min="0"
                      max={rosterPlayers.length}
                      value={targetCounts[match.id] ?? ''}
                      onChange={(event) => updateTargetCount(match.id, event.target.value)}
                      className="text-xs py-1 px-2"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAutoSelect(match.id)}
                    disabled={isPlanning}
                    className="px-2"
                    Icon={Sparkles}
                  >
                    Auto
                  </Button>
                  <Button
                    size="sm"
                    variant={isPlanned ? 'secondary' : 'accent'}
                    onClick={() => handlePlanMatch(match)}
                    disabled={isPlanning || isPlanned || !defaults}
                    className="px-2"
                  >
                    {isPlanning ? 'Planning...' : isPlanned ? 'Planned' : 'Plan'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Roster</span>
                    <span>{rosterPlayers.length}</span>
                  </div>
                  <div className="space-y-1 pr-1">
                    {displayRoster.map((player) => {
                      const isUnavailable = unavailableSet.has(player.id);
                      const isSelected = selectedSet.has(player.id);
                      const otherMatches = matches
                        .filter(other => other.id !== match.id)
                        .filter(other => (selectedPlayersByMatch[other.id] || []).includes(player.id))
                        .map(other => matchIndexById.get(other.id))
                        .filter(Boolean);

                      return (
                        <div
                          key={player.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePlayerSelection(match.id, player.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              togglePlayerSelection(match.id, player.id);
                            }
                          }}
                          className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs transition-colors ${
                            isUnavailable
                              ? 'border-rose-500/40 bg-rose-900/20 text-rose-200 opacity-70 cursor-not-allowed'
                              : isSelected
                                ? 'border-emerald-500/60 bg-emerald-900/20 text-emerald-100 cursor-pointer'
                                : otherMatches.length > 0
                                  ? 'border-amber-500/40 bg-amber-900/10 text-amber-100 cursor-pointer'
                                  : 'border-slate-700 bg-slate-900/30 text-slate-200 hover:border-slate-500 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isUnavailable && <Ban className="h-3.5 w-3.5 text-rose-300" />}
                            <span className="truncate">{player.displayName}</span>
                            {player.jerseyNumber && (
                              <span className="text-[10px] text-slate-400">#{player.jerseyNumber}</span>
                            )}
                            {otherMatches.length > 0 && (
                              <div className="flex items-center gap-1">
                                {otherMatches.map((badge) => (
                                  <span
                                    key={`${player.id}-m-${badge}`}
                                    className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/30 text-[10px] text-amber-100"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                            <Tooltip content={PRACTICES_TOOLTIP} position="top" trigger="hover" className="inline-flex">
                              <span>{player.practicesPerMatch.toFixed(2)}</span>
                            </Tooltip>
                            <span>{player.attendanceRate.toFixed(1)}%</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePlayerUnavailable(match.id, player.id);
                              }}
                              className={`rounded p-1 ${
                                isUnavailable
                                  ? 'text-rose-200 hover:text-rose-100'
                                  : 'text-slate-400 hover:text-rose-200'
                              }`}
                              title={isUnavailable ? 'Mark available' : 'Mark unavailable'}
                              aria-label={isUnavailable ? 'Mark available' : 'Mark unavailable'}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {sortedRoster.length === 0 && (
                      <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
                        No roster players.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Selected</span>
                    <span>{selectedIds.length}</span>
                  </div>
                  <div className="space-y-1 pr-1">
                    {selectedIds.map((playerId) => {
                      const player = rosterById.get(playerId);
                      if (!player) return null;

                      return (
                        <div
                          key={player.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePlayerSelection(match.id, player.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              togglePlayerSelection(match.id, player.id);
                            }
                          }}
                          className="flex items-center justify-between gap-2 rounded border border-emerald-500/60 bg-emerald-900/20 px-2 py-1 text-xs text-emerald-100 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{player.displayName}</span>
                            {player.jerseyNumber && (
                              <span className="text-[10px] text-emerald-200/70">#{player.jerseyNumber}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-100/80">
                            <Tooltip content={PRACTICES_TOOLTIP} position="top" trigger="hover" className="inline-flex">
                              <span>{player.practicesPerMatch.toFixed(2)}</span>
                            </Tooltip>
                            <span>{player.attendanceRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {selectedIds.length === 0 && (
                      <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
                        Empty.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAutoSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-select-title"
          >
            <div className="p-4 border-b border-slate-600">
              <h3 id="auto-select-title" className="text-lg font-semibold text-sky-300">
                Auto Select
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={autoSelectSettings.ensureCoverage}
                  onChange={(event) => setAutoSelectSettings((prev) => ({
                    ...prev,
                    ensureCoverage: event.target.checked
                  }))}
                  className="h-4 w-4 rounded border-slate-500 text-sky-500 focus:ring-sky-500"
                />
                Each player plays at least one match?
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="radio"
                    name="auto-select-strategy"
                    checked={autoSelectSettings.metric === AUTO_SELECT_STRATEGY.PRACTICES}
                    onChange={() => setAutoSelectSettings((prev) => ({
                      ...prev,
                      metric: AUTO_SELECT_STRATEGY.PRACTICES
                    }))}
                    className="h-4 w-4 border-slate-500 text-sky-500 focus:ring-sky-500"
                  />
                  Prioritize practices/match score
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="radio"
                    name="auto-select-strategy"
                    checked={autoSelectSettings.metric === AUTO_SELECT_STRATEGY.ATTENDANCE}
                    onChange={() => setAutoSelectSettings((prev) => ({
                      ...prev,
                      metric: AUTO_SELECT_STRATEGY.ATTENDANCE
                    }))}
                    className="h-4 w-4 border-slate-500 text-sky-500 focus:ring-sky-500"
                  />
                  Prioritize attendance %
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-slate-600 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="secondary" onClick={handleAutoSelectCancel}>
                Cancel
              </Button>
              <Button variant="accent" onClick={handleAutoSelectConfirm}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ isOpen: false, title: '', message: '' })}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}
