import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, NotificationModal } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { getMinimumPlayersForFormat } from '../../constants/teamConfiguration';
import { planUpcomingMatch } from '../../services/matchPlanningService';
import { useAutoSelectPreferences } from '../../hooks/useAutoSelectPreferences';
import { useAttendanceStats } from '../../hooks/useAttendanceStats';
import { usePlanProgress } from '../../hooks/usePlanProgress';
import { usePlanningDefaults } from '../../hooks/usePlanningDefaults';
import { useUnavailablePlayersByMatch } from '../../hooks/useUnavailablePlayersByMatch';
import { MatchCard } from './planMatches/MatchCard';
import { AutoSelectModal } from './planMatches/AutoSelectModal';
import { PlanMatchesToolbar } from './planMatches/PlanMatchesToolbar';
import { autoSelectMultipleMatches, autoSelectSingleMatch, buildSortedRoster } from '../../utils/autoSelectAlgorithms';

const DEBUG_ENABLED = process.env.NODE_ENV !== 'production';

export function PlanMatchesScreen({
  onNavigateBack,
  pushNavigationState,
  removeFromNavigationStack,
  matchesToPlan = []
}) {
  const { currentTeam, teamPlayers, loadTeamPreferences } = useTeam();
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '' });
  const [showAutoSelectModal, setShowAutoSelectModal] = useState(false);
  const [autoSelectMatchId, setAutoSelectMatchId] = useState(null);

  const { unavailablePlayersByMatch, setUnavailablePlayersByMatch } = useUnavailablePlayersByMatch(currentTeam?.id);
  const { autoSelectSettings, targetCounts, setAutoSelectSettings, setTargetCounts } = useAutoSelectPreferences(
    currentTeam?.id
  );
  const {
    matches,
    selectedPlayersByMatch,
    sortMetric,
    setSelectedPlayersByMatch,
    setSortMetric,
    setPlannedMatchIds,
    planningStatus,
    setPlanningStatus
  } = usePlanProgress({
    teamId: currentTeam?.id,
    matchesToPlan,
    debugEnabled: DEBUG_ENABLED
  });
  const autoSelectMatches = useMemo(() => {
    if (matches.length > 1) {
      return matches;
    }
    if (autoSelectMatchId) {
      return matches.filter(match => match.id === autoSelectMatchId);
    }
    return matches;
  }, [autoSelectMatchId, matches]);

  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date;
  }, []);

  const { attendanceStats, statsLoading, statsError } = useAttendanceStats(currentTeam?.id, startDate, endDate);
  const { defaults, defaultsError } = usePlanningDefaults(currentTeam?.id, loadTeamPreferences);

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
    if (matches.length === 0) return;

    if (DEBUG_ENABLED) {
      console.debug('[PlanMatchesScreen] ensure selectedPlayersByMatch', {
        matchesCount: matches.length
      });
    }

    setSelectedPlayersByMatch((prev) => {
      let didChange = false;
      const next = { ...prev };
      matches.forEach((match) => {
        if (!next[match.id]) {
          next[match.id] = [];
          didChange = true;
        }
      });
      return didChange ? next : prev;
    });
  }, [matches, setSelectedPlayersByMatch]);

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

    if (DEBUG_ENABLED) {
      console.debug('[PlanMatchesScreen] ensure targetCounts', {
        matchesCount: matches.length,
        rosterCount,
        defaultTarget
      });
    }

    setTargetCounts((prev) => {
      let didChange = false;
      const next = { ...prev };
      matches.forEach((match) => {
        if (typeof next[match.id] !== 'number') {
          next[match.id] = defaultTarget;
          didChange = true;
        }
      });
      return didChange ? next : prev;
    });
  }, [defaults, matches, rosterPlayers.length, setTargetCounts]);

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
    return buildSortedRoster(rosterWithStats, sortMetric);
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
  }, [getUnavailableSet, setSelectedPlayersByMatch]);

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
  }, [setSelectedPlayersByMatch, setUnavailablePlayersByMatch, unavailablePlayersByMatch]);

  const handleReorderSelectedPlayers = useCallback((matchId, newOrderedIds) => {
    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      [matchId]: newOrderedIds
    }));
  }, [setSelectedPlayersByMatch]);

  const updateTargetCount = (matchId, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const capped = rosterPlayers.length > 0 ? Math.min(rosterPlayers.length, safeValue) : safeValue;
    setTargetCounts((prev) => ({
      ...prev,
      [matchId]: capped
    }));
  };

  const runAutoSelectSingleMatch = useCallback((matchId, metric) => {
    const selected = autoSelectSingleMatch({
      rosterWithStats,
      metric,
      targetCount: targetCounts[matchId] || 0,
      unavailableIds: unavailablePlayersByMatch[matchId]
    });

    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      [matchId]: selected
    }));
  }, [rosterWithStats, targetCounts, unavailablePlayersByMatch, setSelectedPlayersByMatch]);

  const runAutoSelectMultipleMatches = useCallback((metric, ensureCoverage) => {
    const nextSelections = autoSelectMultipleMatches({
      rosterWithStats,
      metric,
      matches,
      targetCounts,
      unavailableByMatch: unavailablePlayersByMatch,
      ensureCoverage
    });

    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      ...nextSelections
    }));
  }, [matches, rosterWithStats, targetCounts, unavailablePlayersByMatch, setSelectedPlayersByMatch]);

  const isPlayerInMultipleMatches = useCallback((playerId) => {
    const matchesWithPlayer = matches.filter(match =>
      (selectedPlayersByMatch[match.id] || []).includes(playerId)
    );
    return matchesWithPlayer.length > 1;
  }, [matches, selectedPlayersByMatch]);

  const isPlayerSelectedInOtherMatch = useCallback((matchId, playerId) => {
    return matches.some(other =>
      other.id !== matchId && (selectedPlayersByMatch[other.id] || []).includes(playerId)
    );
  }, [matches, selectedPlayersByMatch]);

  const isPlayerSelectedAndOnlyAvailableHere = useCallback((matchId, playerId) => {
    // Only applies when planning 2+ matches
    if (matches.length < 2) {
      return false;
    }

    // Player must be selected for this match
    const selectedForCurrentMatch = (selectedPlayersByMatch[matchId] || []).includes(playerId);
    if (!selectedForCurrentMatch) {
      return false;
    }

    // Player must be unavailable in at least one other match
    return matches.some(other =>
      other.id !== matchId && (unavailablePlayersByMatch[other.id] || []).includes(playerId)
    );
  }, [matches, selectedPlayersByMatch, unavailablePlayersByMatch]);

  const handleAutoSelect = () => {
    setAutoSelectMatchId(null);
    setShowAutoSelectModal(true);
    if (pushNavigationState) {
      pushNavigationState(() => setShowAutoSelectModal(false), 'PlanMatches-AutoSelect');
    }
  };

  const handleAutoSelectConfirm = () => {
    setShowAutoSelectModal(false);
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
    if (matches.length > 1) {
      runAutoSelectMultipleMatches(autoSelectSettings.metric, autoSelectSettings.ensureCoverage);
      setAutoSelectMatchId(null);
      return;
    }

    const matchId = autoSelectMatchId || matches[0]?.id;
    if (matchId) {
      runAutoSelectSingleMatch(matchId, sortMetric);
    }
    setAutoSelectMatchId(null);
  };

  const handleAutoSelectCancel = () => {
    setShowAutoSelectModal(false);
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
    setAutoSelectMatchId(null);
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
      setPlannedMatchIds((prev) => {
        const matchId = String(match.id);
        if (prev.some((id) => String(id) === matchId)) {
          return prev;
        }
        return [...prev, matchId];
      });
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
    <div className="space-y-4 lg:space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-sky-300">Plan Matches</h1>
        </div>
        <Button onClick={onNavigateBack} variant="secondary" size="sm">
          Back
        </Button>
      </div>

      <PlanMatchesToolbar
        sortMetric={sortMetric}
        onSortChange={setSortMetric}
        statsLoading={statsLoading}
        statsError={statsError}
        defaultsError={defaultsError}
        onRecommend={handleAutoSelect}
      />

      <div className={`grid gap-4 ${matches.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {matches.map((match) => {
          const selectedIds = selectedPlayersByMatch[match.id] || [];
          const unavailableIds = unavailablePlayersByMatch[match.id] || [];

          return (
            <MatchCard
              key={match.id}
              match={match}
              roster={sortedRoster}
              rosterById={rosterById}
              selectedIds={selectedIds}
              unavailableIds={unavailableIds}
              planningStatus={planningStatus[match.id]}
              canPlan={Boolean(defaults)}
              onPlanMatch={() => handlePlanMatch(match)}
              onToggleSelect={(playerId) => togglePlayerSelection(match.id, playerId)}
              onToggleUnavailable={(playerId) => togglePlayerUnavailable(match.id, playerId)}
              formatSchedule={formatSchedule}
              isSelectedInOtherMatch={(playerId) => isPlayerSelectedInOtherMatch(match.id, playerId)}
              isSelectedAndOnlyAvailableHere={(playerId) => isPlayerSelectedAndOnlyAvailableHere(match.id, playerId)}
              isPlayerInMultipleMatches={isPlayerInMultipleMatches}
              onReorderSelectedPlayers={handleReorderSelectedPlayers}
            />
          );
        })}
      </div>

      <AutoSelectModal
        isOpen={showAutoSelectModal}
        matches={matches}
        autoSelectMatches={autoSelectMatches}
        rosterCount={rosterPlayers.length}
        targetCounts={targetCounts}
        autoSelectSettings={autoSelectSettings}
        onUpdateTargetCount={updateTargetCount}
        onUpdateSettings={setAutoSelectSettings}
        onCancel={handleAutoSelectCancel}
        onConfirm={handleAutoSelectConfirm}
        formatSchedule={formatSchedule}
      />

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ isOpen: false, title: '', message: '' })}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}
