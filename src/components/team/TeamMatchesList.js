import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Share2, AlertCircle, Eye, Play, Trash2 } from 'lucide-react';
import { Button, NotificationModal } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { useTranslation } from 'react-i18next';
import { useRealtimeTeamMatches } from '../../hooks/useRealtimeTeamMatches';
import { useUpcomingTeamMatches } from '../../hooks/useUpcomingTeamMatches';
import { copyLiveMatchUrlToClipboard } from '../../utils/liveMatchLinkUtils';
import { VIEWS } from '../../constants/viewConstants';
import { discardPendingMatch } from '../../services/matchStateManager';

/**
 * Team Matches List Screen
 * Shows active matches (pending/running) and upcoming matches from connected providers
 * Allows coaches to copy live match links, resume setup, or navigate to LiveMatchScreen
 */
export function TeamMatchesList({ onNavigateBack, onNavigateTo, pushNavigationState, removeFromNavigationStack }) {
  const { t } = useTranslation('team');
  const { currentTeam } = useTeam();
  const {
    matches: activeMatches,
    loading: activeMatchesLoading,
    error: activeMatchesError,
    refetch: refetchActiveMatches
  } = useRealtimeTeamMatches(currentTeam?.id);
  const {
    matches: upcomingMatches,
    loading: upcomingMatchesLoading,
    error: upcomingMatchesError,
    refetch: refetchUpcomingMatches
  } = useUpcomingTeamMatches(currentTeam?.id);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '' });
  const [copyingMatchId, setCopyingMatchId] = useState(null);
  const [deletingMatchId, setDeletingMatchId] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planSelectionIds, setPlanSelectionIds] = useState([]);
  const pendingMatches = activeMatches.filter(match => match.state === 'pending');
  const plannableMatches = [...upcomingMatches, ...pendingMatches];

  const handleCopyLink = async (matchId) => {
    setCopyingMatchId(matchId);

    try {
      const result = await copyLiveMatchUrlToClipboard(matchId);

      if (result.success) {
        setNotification({
          isOpen: true,
          title: t('teamMatches.notifications.linkCopied'),
          message: t('teamMatches.notifications.linkCopiedMessage')
        });
      } else {
        setNotification({
          isOpen: true,
          title: t('teamMatches.notifications.liveMatchUrl'),
          message: result.url || t('teamMatches.notifications.couldNotCopy')
        });
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      setNotification({
        isOpen: true,
        title: t('teamMatches.notifications.error'),
        message: t('teamMatches.error.copyFailed')
      });
    } finally {
      setCopyingMatchId(null);
    }
  };

  const handleOpenLive = (matchId) => {
    // Navigate with data instead of imperative setters
    onNavigateTo(VIEWS.LIVE_MATCH, {
      matchId,
      entryPoint: VIEWS.TEAM_MATCHES
    });
  };

  const handleResumeSetup = (matchId) => {
    onNavigateTo(VIEWS.CONFIG, {
      resumeMatchId: matchId
    });
  };

  const handleDeletePendingMatch = async (matchId) => {
    if (deletingMatchId) return;

    setDeletingMatchId(matchId);

    try {
      const result = await discardPendingMatch(matchId);

      if (result.success) {
        setNotification({
          isOpen: true,
          title: t('teamMatches.notifications.matchDeleted'),
          message: t('teamMatches.notifications.matchDeletedMessage')
        });
        await refetchActiveMatches();
      } else {
        setNotification({
          isOpen: true,
          title: t('teamMatches.notifications.error'),
          message: result.error || t('teamMatches.error.deleteFailed')
        });
      }
    } catch (err) {
      console.error('Failed to delete pending match:', err);
      setNotification({
        isOpen: true,
        title: t('teamMatches.notifications.error'),
        message: t('teamMatches.error.deleteFailed')
      });
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleRetry = async () => {
    await Promise.all([refetchActiveMatches(), refetchUpcomingMatches()]);
  };

  const openPlanModal = (matchId) => {
    setPlanSelectionIds([matchId]);
    setShowPlanModal(true);
    if (pushNavigationState) {
      pushNavigationState(() => setShowPlanModal(false), 'TeamMatchesList-PlanModal');
    }
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handlePlanMatch = (match) => {
    if (plannableMatches.length <= 1) {
      onNavigateTo(VIEWS.PLAN_MATCHES, {
        matchesToPlan: [match]
      });
      return;
    }

    openPlanModal(match.id);
  };

  const togglePlannedMatchSelection = (matchId) => {
    setPlanSelectionIds((prev) => {
      if (prev.includes(matchId)) {
        return prev.filter(id => id !== matchId);
      }
      return [...prev, matchId];
    });
  };

  const confirmPlanSelection = () => {
    const selectedMatches = plannableMatches.filter(match => planSelectionIds.includes(match.id));
    if (selectedMatches.length === 0) {
      return;
    }

    closePlanModal();
    onNavigateTo(VIEWS.PLAN_MATCHES, {
      matchesToPlan: selectedMatches
    });
  };

  // Register browser back handler
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

  const formatIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return t('teamMatches.timestamps.noDate');

    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) {
      return t('teamMatches.timestamps.today', { time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) });
    } else if (date >= yesterday) {
      return t('teamMatches.timestamps.yesterday', { time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) });
    }

    return formatIsoDate(date);
  };

  const formatUpcomingMatchTime = (matchTime) => {
    if (!matchTime) return null;
    return matchTime.slice(0, 5);
  };

  const formatUpcomingSchedule = (matchDate, matchTime) => {
    if (!matchDate) return t('teamMatches.timestamps.dateTbd');
    const trimmedTime = formatUpcomingMatchTime(matchTime);
    return trimmedTime ? `${matchDate} ${trimmedTime}` : matchDate;
  };

  const getStateBadge = (state) => {
    if (state === 'running') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-emerald-600 text-emerald-100 rounded-full">
          {t('teamMatches.states.running')}
        </span>
      );
    } else if (state === 'pending') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-sky-600 text-sky-100 rounded-full">
          {t('teamMatches.states.pending')}
        </span>
      );
    } else if (state === 'upcoming') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-amber-600 text-amber-100 rounded-full">
          {t('teamMatches.states.upcoming')}
        </span>
      );
    }
    return null;
  };

  const hasActiveMatches = activeMatches.length > 0;
  const hasUpcomingMatches = upcomingMatches.length > 0;
  const isLoading = (activeMatchesLoading || upcomingMatchesLoading) && !hasActiveMatches && !hasUpcomingMatches;
  const errorMessage = activeMatchesError || upcomingMatchesError;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">{t('teamMatches.title')}</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            {t('teamMatches.back')}
          </Button>
        </div>

        <div className="bg-slate-700 rounded-lg border border-slate-600 p-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full"></div>
            <span className="text-slate-300">{t('teamMatches.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage && !hasActiveMatches && !hasUpcomingMatches) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">{t('teamMatches.title')}</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            {t('teamMatches.back')}
          </Button>
        </div>

        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-rose-200 font-medium">{t('teamMatches.error.loadFailed')}</p>
              <p className="text-rose-300 text-sm mt-1">{errorMessage}</p>
              <Button onClick={handleRetry} variant="secondary" size="sm" className="mt-3">
                {t('teamMatches.error.tryAgain')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasActiveMatches && !hasUpcomingMatches) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">{t('teamMatches.title')}</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            {t('teamMatches.back')}
          </Button>
        </div>

        <div className="bg-slate-700 rounded-lg border border-slate-600 p-8">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-50" />
            <p className="text-lg font-medium text-slate-300 mb-2">{t('teamMatches.empty.title')}</p>
            <p className="text-sm text-slate-400">
              {t('teamMatches.empty.description')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Matches list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-300">{t('teamMatches.title')}</h1>
        <Button onClick={onNavigateBack} variant="secondary" size="sm">
          {t('teamMatches.back')}
        </Button>
      </div>

      {hasActiveMatches && (
        <div className="space-y-3">
          {activeMatches.map((match) => {
            const isPending = match.state === 'pending';
            const isDeleting = deletingMatchId === match.id;

            return (
              <div
                key={match.id}
                className="bg-slate-700 rounded-lg border border-slate-600 p-4 hover:bg-slate-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                        {match.opponent}
                      </h3>
                      {getStateBadge(match.state)}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 flex-wrap">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimestamp(match.createdAt)}</span>
                      </div>
                      {match.type && (
                        <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs">
                          {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                        </span>
                      )}
                      {match.venueType && (
                        <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs">
                          {match.venueType.charAt(0).toUpperCase() + match.venueType.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    {isPending && (
                      <Button
                        onClick={() => handlePlanMatch(match)}
                        variant="accent"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={isDeleting}
                      >
                        {t('teamMatches.buttons.plan')}
                      </Button>
                    )}
                    {isPending && (
                      <Button
                        onClick={() => handleResumeSetup(match.id)}
                        variant="accent"
                        size="sm"
                        Icon={Play}
                        className="w-full sm:w-auto"
                        disabled={isDeleting}
                      >
                        {t('teamMatches.buttons.resumeSetup')}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleOpenLive(match.id)}
                      variant="primary"
                      size="sm"
                      Icon={Eye}
                      className="w-full sm:w-auto"
                    >
                      {t('teamMatches.buttons.openLive')}
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(match.id)}
                      variant="secondary"
                      size="sm"
                      Icon={Share2}
                      disabled={copyingMatchId === match.id}
                      className="w-full sm:w-auto"
                    >
                      {copyingMatchId === match.id ? t('teamMatches.buttons.copying') : t('teamMatches.buttons.copyLink')}
                    </Button>
                    {isPending && (
                      <Button
                        onClick={() => handleDeletePendingMatch(match.id)}
                        variant="danger"
                        size="sm"
                        Icon={isDeleting ? undefined : Trash2}
                        disabled={isDeleting}
                        className="w-full sm:w-auto"
                      >
                        {isDeleting ? t('teamMatches.buttons.deleting') : t('teamMatches.buttons.delete')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasUpcomingMatches && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-200">{t('teamMatches.upcoming.title')}</h2>
            <p className="text-xs text-slate-400">
              {t('teamMatches.upcoming.description')}
            </p>
          </div>
          {upcomingMatches.map((match) => (
            <div
              key={match.id}
              className="bg-slate-700 rounded-lg border border-amber-500/40 p-4 hover:bg-slate-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-100">
                      {match.opponent}
                    </h3>
                    {getStateBadge('upcoming')}
                  </div>
                  <p className="text-xs text-amber-200">{t('teamMatches.upcoming.notPlanned')}</p>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 flex-wrap">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatUpcomingSchedule(match.matchDate, match.matchTime)}</span>
                    </div>
                    {match.venue && (
                      <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded text-xs">
                        {match.venue}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="accent"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handlePlanMatch(match)}
                  >
                    {t('teamMatches.buttons.plan')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className="bg-slate-800 rounded-lg shadow-xl max-w-lg w-full border border-slate-600"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-matches-title"
          >
            <div className="p-4 border-b border-slate-600">
              <h3 id="plan-matches-title" className="text-lg font-semibold text-sky-300">
                {t('teamMatches.planModal.title')}
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {plannableMatches.map((match) => {
                const isSelected = planSelectionIds.includes(match.id);
                const scheduleLabel = formatUpcomingSchedule(match.matchDate, match.matchTime);
                const stateLabel = match.state === 'pending'
                  ? t('teamMatches.states.pending')
                  : t('teamMatches.states.upcoming');
                return (
                  <label
                    key={match.id}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-sky-500 bg-sky-900/30 text-sky-100'
                        : 'border-slate-600 bg-slate-700/40 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePlannedMatchSelection(match.id)}
                        className="h-4 w-4 rounded border-slate-500 text-sky-500 focus:ring-sky-500"
                        aria-label={`Select ${match.opponent}`}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{match.opponent}</div>
                        <div className="text-xs text-slate-400">
                          {stateLabel} - {scheduleLabel}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-600 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="secondary" onClick={closePlanModal}>
                {t('teamMatches.planModal.cancel')}
              </Button>
              <Button
                variant="accent"
                onClick={confirmPlanSelection}
                disabled={planSelectionIds.length === 0}
              >
                {t('teamMatches.planModal.planSelected')}
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
