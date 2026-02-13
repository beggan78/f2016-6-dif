import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, NotificationModal } from '../shared/UI';
import { Card } from '../shared/Card';
import { useTeam } from '../../contexts/TeamContext';
import { useTranslation } from 'react-i18next';
import { getMinimumPlayersForFormat } from '../../constants/teamConfiguration';
import { planUpcomingMatch } from '../../services/matchPlanningService';
import { getSquadSelectionsForMatches } from '../../services/matchStateManager';
import { useAutoSelectPreferences } from '../../hooks/useAutoSelectPreferences';
import { useAttendanceStats } from '../../hooks/useAttendanceStats';
import { usePlanProgress } from '../../hooks/usePlanProgress';
import { usePlanningDefaults } from '../../hooks/usePlanningDefaults';
import { useUnavailablePlayersByMatch } from '../../hooks/useUnavailablePlayersByMatch';
import { useProviderAvailability } from '../../hooks/useProviderAvailability';
import { useCrossMatchDrag } from '../../hooks/useCrossMatchDrag';
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
  const { t } = useTranslation('team');
  const { currentTeam, teamPlayers, loadTeamPreferences } = useTeam();
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '' });
  const [showAutoSelectModal, setShowAutoSelectModal] = useState(false);
  const [autoSelectMatchId, setAutoSelectMatchId] = useState(null);

  const {
    unavailablePlayersByMatch,
    providerAvailableOverridesByMatch,
    setUnavailablePlayersByMatch,
    setProviderAvailableOverridesByMatch
  } = useUnavailablePlayersByMatch(currentTeam?.id);
  const { autoSelectSettings, targetCounts, lastSquadSize, setAutoSelectSettings, setTargetCounts, setLastSquadSize } = useAutoSelectPreferences(
    currentTeam?.id
  );
  const {
    matches,
    selectedPlayersByMatch,
    sortMetric,
    inviteSeededMatchIds,
    setSelectedPlayersByMatch,
    setSortMetric,
    setPlannedMatchIds,
    setInviteSeededMatchIds,
    planningStatus,
    setPlanningStatus
  } = usePlanProgress({
    teamId: currentTeam?.id,
    matchesToPlan,
    debugEnabled: DEBUG_ENABLED
  });
  // Track which pending match IDs have been fetched for saved squad selections
  const fetchedPendingSelectionRef = useRef(new Set());

  // Reset tracked IDs when team changes
  useEffect(() => {
    fetchedPendingSelectionRef.current = new Set();
  }, [currentTeam?.id]);

  // Seed selectedPlayersByMatch from saved initial_config.squadSelection for pending matches
  useEffect(() => {
    let isActive = true;

    const pendingMatchIds = matches
      .filter(m => m.state === 'pending')
      .map(m => m.id)
      .filter(id => !fetchedPendingSelectionRef.current.has(id));

    if (pendingMatchIds.length === 0) return;

    // Mark as fetched immediately to prevent duplicate requests
    pendingMatchIds.forEach(id => fetchedPendingSelectionRef.current.add(id));

    getSquadSelectionsForMatches(pendingMatchIds).then(result => {
      if (!isActive) return;
      if (!result.success || !result.selections) return;

      const fetchedSelections = result.selections;
      if (Object.keys(fetchedSelections).length === 0) return;

      setSelectedPlayersByMatch(prev => {
        let didChange = false;
        const next = { ...prev };
        Object.entries(fetchedSelections).forEach(([matchId, playerIds]) => {
          if (!next[matchId] || next[matchId].length === 0) {
            next[matchId] = playerIds;
            didChange = true;
          }
        });
        return didChange ? next : prev;
      });
    });

    return () => { isActive = false; };
  }, [matches, setSelectedPlayersByMatch]);

  const autoSelectMatches = useMemo(() => {
    if (matches.length > 1) {
      return matches;
    }
    if (autoSelectMatchId) {
      return matches.filter(match => match.id === autoSelectMatchId);
    }
    return matches;
  }, [autoSelectMatchId, matches]);
  const { providerUnavailableByMatch, providerResponseByMatch, providerInvitedByMatch, providerAvailabilityLoading } = useProviderAvailability(matches);
  const mergedUnavailableByMatch = useMemo(() => {
    const merged = {};
    const allMatchIds = new Set([
      ...Object.keys(unavailablePlayersByMatch || {}),
      ...Object.keys(providerAvailableOverridesByMatch || {}),
      ...Object.keys(providerUnavailableByMatch || {}),
      ...matches.map((match) => String(match.id))
    ]);

    allMatchIds.forEach((matchId) => {
      const manualIds = unavailablePlayersByMatch[matchId] || [];
      const providerIds = providerUnavailableByMatch[matchId] || [];
      const providerOverrideSet = new Set(providerAvailableOverridesByMatch[matchId] || []);
      const effectiveProviderIds = providerIds.filter((playerId) => !providerOverrideSet.has(playerId));
      const uniqueIds = Array.from(new Set([...manualIds, ...effectiveProviderIds]));
      if (uniqueIds.length > 0) {
        merged[matchId] = uniqueIds;
      }
    });

    return merged;
  }, [matches, providerAvailableOverridesByMatch, providerUnavailableByMatch, unavailablePlayersByMatch]);

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

  // Track seeded match IDs locally to avoid re-triggering the effect
  const inviteSeededRef = useRef(new Set(inviteSeededMatchIds.map(String)));

  // Sync ref when persisted state loads (e.g., from a prior session)
  useEffect(() => {
    inviteSeededMatchIds.forEach((id) => inviteSeededRef.current.add(String(id)));
  }, [inviteSeededMatchIds]);

  // Auto-select invited players for matches that haven't been seeded yet
  useEffect(() => {
    if (providerAvailabilityLoading) return;
    if (matches.length === 0) return;

    const unseededMatchIds = matches
      .map((m) => String(m.id))
      .filter((id) => !inviteSeededRef.current.has(id));

    if (unseededMatchIds.length === 0) return;

    // Mark all unseeded matches as seeded in both ref and persisted state
    unseededMatchIds.forEach((id) => inviteSeededRef.current.add(id));
    setInviteSeededMatchIds((prev) => [...prev, ...unseededMatchIds]);

    // Build map of invited player IDs per unseeded match
    const invitedByUnseeded = {};
    unseededMatchIds.forEach((matchId) => {
      const invited = providerInvitedByMatch[matchId];
      if (invited && invited.length > 0) {
        const unavailableSet = new Set(mergedUnavailableByMatch[matchId] || []);
        const available = invited.filter((id) => !unavailableSet.has(id));
        if (available.length > 0) {
          invitedByUnseeded[matchId] = available;
        }
      }
    });

    if (Object.keys(invitedByUnseeded).length === 0) return;

    setSelectedPlayersByMatch((prev) => {
      let didChange = false;
      const next = { ...prev };
      Object.entries(invitedByUnseeded).forEach(([matchId, playerIds]) => {
        const current = next[matchId] || [];
        if (current.length === 0) {
          next[matchId] = playerIds;
          didChange = true;
        }
      });
      return didChange ? next : prev;
    });
  }, [
    providerAvailabilityLoading,
    matches,
    providerInvitedByMatch,
    mergedUnavailableByMatch,
    setInviteSeededMatchIds,
    setSelectedPlayersByMatch
  ]);

  const rosterPlayers = useMemo(() => {
    return (teamPlayers || [])
      .filter(player => player.on_roster !== false)
      .map(player => ({
        id: player.id,
        displayName: player.display_name || player.first_name || t('planMatches.unknownPlayer'),
        firstName: player.first_name || null,
        lastName: player.last_name || null,
        jerseyNumber: player.jersey_number
      }));
  }, [teamPlayers, t]);

  useEffect(() => {
    if (!defaults || matches.length === 0) return;

    const minimumPlayers = Math.max(0, getMinimumPlayersForFormat(defaults.format));
    const rosterCount = rosterPlayers.length;
    const defaultTarget = rosterCount > 0
      ? (typeof lastSquadSize === 'number' && lastSquadSize > 0
        ? Math.min(rosterCount, lastSquadSize)
        : Math.min(rosterCount, minimumPlayers + 2))
      : 0;

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
  }, [defaults, matches, rosterPlayers.length, lastSquadSize, setTargetCounts]);

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
    if (!matchDate) return t('teamMatches.timestamps.dateTbd');
    if (!matchTime) return matchDate;
    const trimmed = matchTime.slice(0, 5);
    return `${matchDate} ${trimmed}`;
  };

  const getUnavailableSet = useCallback((matchId) => new Set(mergedUnavailableByMatch[matchId] || []), [mergedUnavailableByMatch]);

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
    const providerUnavailableSet = new Set(providerUnavailableByMatch[matchId] || []);
    const providerOverrideSet = new Set(providerAvailableOverridesByMatch[matchId] || []);

    if (providerUnavailableSet.has(playerId)) {
      const isOverrideActive = providerOverrideSet.has(playerId);

      setProviderAvailableOverridesByMatch((prev) => {
        const current = new Set(prev[matchId] || []);
        if (isOverrideActive) {
          current.delete(playerId);
        } else {
          current.add(playerId);
        }
        return {
          ...prev,
          [matchId]: Array.from(current)
        };
      });

      if (!isOverrideActive) {
        setUnavailablePlayersByMatch((prev) => {
          const current = new Set(prev[matchId] || []);
          if (!current.has(playerId)) {
            return prev;
          }
          current.delete(playerId);
          return {
            ...prev,
            [matchId]: Array.from(current)
          };
        });
      }

      if (isOverrideActive) {
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

      return;
    }

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
  }, [
    providerAvailableOverridesByMatch,
    providerUnavailableByMatch,
    setProviderAvailableOverridesByMatch,
    setSelectedPlayersByMatch,
    setUnavailablePlayersByMatch,
    unavailablePlayersByMatch
  ]);

  const handleReorderSelectedPlayers = useCallback((matchId, newOrderedIds) => {
    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      [matchId]: newOrderedIds
    }));
  }, [setSelectedPlayersByMatch]);

  const handleSwapPlayers = useCallback((sourceMatchId, sourcePlayerId, targetMatchId, targetPlayerId) => {
    setSelectedPlayersByMatch(prev => {
      const sourceList = [...(prev[sourceMatchId] || [])];
      const targetList = [...(prev[targetMatchId] || [])];
      const si = sourceList.indexOf(sourcePlayerId);
      const ti = targetList.indexOf(targetPlayerId);
      if (si === -1 || ti === -1) return prev;
      sourceList[si] = targetPlayerId;
      targetList[ti] = sourcePlayerId;
      return { ...prev, [sourceMatchId]: sourceList, [targetMatchId]: targetList };
    });
  }, [setSelectedPlayersByMatch]);

  const { registerContainer, handleDragMove, handleDragEnd, crossMatchState, swapAnimation, slideInAnimation } = useCrossMatchDrag({
    selectedPlayersByMatch,
    unavailablePlayersByMatch: mergedUnavailableByMatch,
    onSwapPlayers: handleSwapPlayers
  });

  const updateTargetCount = (matchId, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const capped = rosterPlayers.length > 0 ? Math.min(rosterPlayers.length, safeValue) : safeValue;
    setTargetCounts((prev) => ({
      ...prev,
      [matchId]: capped
    }));
    setLastSquadSize(capped);
  };

  const runAutoSelectSingleMatch = useCallback((matchId, metric) => {
    const selected = autoSelectSingleMatch({
      rosterWithStats,
      metric,
      targetCount: targetCounts[matchId] || 0,
      unavailableIds: mergedUnavailableByMatch[matchId]
    });

    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      [matchId]: selected
    }));
  }, [mergedUnavailableByMatch, rosterWithStats, targetCounts, setSelectedPlayersByMatch]);

  const runAutoSelectMultipleMatches = useCallback((metric, ensureCoverage) => {
    const nextSelections = autoSelectMultipleMatches({
      rosterWithStats,
      metric,
      matches,
      targetCounts,
      unavailableByMatch: mergedUnavailableByMatch,
      ensureCoverage
    });

    setSelectedPlayersByMatch((prev) => ({
      ...prev,
      ...nextSelections
    }));
  }, [matches, mergedUnavailableByMatch, rosterWithStats, targetCounts, setSelectedPlayersByMatch]);

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
      other.id !== matchId && (mergedUnavailableByMatch[other.id] || []).includes(playerId)
    );
  }, [matches, mergedUnavailableByMatch, selectedPlayersByMatch]);

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
        title: t('planMatches.notifications.noPlayersTitle'),
        message: t('planMatches.notifications.noPlayersMessage')
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
        title: t('planMatches.notifications.matchPlanned'),
        message: result.warning || t('planMatches.notifications.pendingCreated')
      });
    } else {
      setPlanningStatus((prev) => ({
        ...prev,
        [match.id]: 'error'
      }));
      setNotification({
        isOpen: true,
        title: t('planMatches.notifications.planningFailed'),
        message: result.error || t('planMatches.notifications.planningFailedMessage')
      });
    }
  };

  if (!currentTeam?.id) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">{t('planMatches.title')}</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            {t('planMatches.back')}
          </Button>
        </div>
        <Card padding="lg" className="text-slate-300 text-sm">
          {t('planMatches.teamRequired')}
        </Card>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">{t('planMatches.title')}</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            {t('planMatches.back')}
          </Button>
        </div>
        <Card padding="lg" className="text-slate-300 text-sm">
          {t('planMatches.noMatches')}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-sky-300">{t('planMatches.title')}</h1>
        </div>
        <Button onClick={onNavigateBack} variant="secondary" size="sm">
          {t('planMatches.back')}
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
          const unavailableIds = mergedUnavailableByMatch[match.id] || [];
          const providerUnavailableIds = providerUnavailableByMatch[match.id] || [];
          const matchResponses = providerResponseByMatch[match.id] || null;
          const invitationsSent = matchResponses && selectedIds.some(
            (playerId) => matchResponses[playerId] === 'accepted'
          );
          const playerResponses = invitationsSent ? matchResponses : null;

          return (
            <MatchCard
              key={match.id}
              match={match}
              matchId={match.id}
              matchCount={matches.length}
              roster={sortedRoster}
              rosterById={rosterById}
              selectedIds={selectedIds}
              unavailableIds={unavailableIds}
              providerUnavailableIds={providerUnavailableIds}
              playerResponses={playerResponses}
              sortMetric={sortMetric}
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
              registerContainer={registerContainer}
              onCrossDragMove={handleDragMove}
              onCrossDragEnd={handleDragEnd}
              crossMatchState={crossMatchState}
              swapAnimation={swapAnimation}
              slideInAnimation={slideInAnimation}
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
