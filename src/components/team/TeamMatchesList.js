import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Share2, AlertCircle, Eye, Play, Trash2 } from 'lucide-react';
import { Button, NotificationModal } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { useRealtimeTeamMatches } from '../../hooks/useRealtimeTeamMatches';
import { useUpcomingTeamMatches } from '../../hooks/useUpcomingTeamMatches';
import { copyLiveMatchUrlToClipboard } from '../../utils/liveMatchLinkUtils';
import { VIEWS } from '../../constants/viewConstants';
import { discardPendingMatch } from '../../services/matchStateManager';

/**
 * Team Matches List Screen
 * Shows all active (pending/running) matches for the current team
 * Allows coaches to copy live match links or navigate to LiveMatchScreen
 */
export function TeamMatchesList({ onNavigateBack, onNavigateTo, pushNavigationState, removeFromNavigationStack }) {
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

  const handleCopyLink = async (matchId) => {
    setCopyingMatchId(matchId);

    try {
      const result = await copyLiveMatchUrlToClipboard(matchId);

      if (result.success) {
        setNotification({
          isOpen: true,
          title: 'Link Copied',
          message: 'Live match link copied to clipboard!'
        });
      } else {
        setNotification({
          isOpen: true,
          title: 'Live Match URL',
          message: result.url || 'Could not copy link'
        });
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Failed to copy link'
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
          title: 'Match Deleted',
          message: 'Pending match deleted.'
        });
        await refetchActiveMatches();
      } else {
        setNotification({
          isOpen: true,
          title: 'Error',
          message: result.error || 'Failed to delete pending match'
        });
      }
    } catch (err) {
      console.error('Failed to delete pending match:', err);
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete pending match'
      });
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleRetry = async () => {
    await Promise.all([refetchActiveMatches(), refetchUpcomingMatches()]);
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
    if (!timestamp) return 'No date';

    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date >= yesterday) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }

    return formatIsoDate(date);
  };

  const formatUpcomingMatchTime = (matchTime) => {
    if (!matchTime) return null;
    return matchTime.slice(0, 5);
  };

  const formatUpcomingSchedule = (matchDate, matchTime) => {
    if (!matchDate) return 'Date TBD';
    const trimmedTime = formatUpcomingMatchTime(matchTime);
    return trimmedTime ? `${matchDate} ${trimmedTime}` : matchDate;
  };

  const getStateBadge = (state) => {
    if (state === 'running') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-emerald-600 text-emerald-100 rounded-full">
          Running
        </span>
      );
    } else if (state === 'pending') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-sky-600 text-sky-100 rounded-full">
          Pending
        </span>
      );
    } else if (state === 'upcoming') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-amber-600 text-amber-100 rounded-full">
          Upcoming
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
          <h1 className="text-2xl font-bold text-sky-300">Team Matches</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>

        <div className="bg-slate-700 rounded-lg border border-slate-600 p-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full"></div>
            <span className="text-slate-300">Loading matches...</span>
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
          <h1 className="text-2xl font-bold text-sky-300">Team Matches</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>

        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-rose-200 font-medium">Failed to load matches</p>
              <p className="text-rose-300 text-sm mt-1">{errorMessage}</p>
              <Button onClick={handleRetry} variant="secondary" size="sm" className="mt-3">
                Try Again
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
          <h1 className="text-2xl font-bold text-sky-300">Team Matches</h1>
          <Button onClick={onNavigateBack} variant="secondary" size="sm">
            Back
          </Button>
        </div>

        <div className="bg-slate-700 rounded-lg border border-slate-600 p-8">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-50" />
            <p className="text-lg font-medium text-slate-300 mb-2">No Active Matches</p>
            <p className="text-sm text-slate-400">
              Your team has no pending or running matches at the moment.
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
        <h1 className="text-2xl font-bold text-sky-300">Team Matches</h1>
        <Button onClick={onNavigateBack} variant="secondary" size="sm">
          Back
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
                        vs {match.opponent}
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
                        onClick={() => handleResumeSetup(match.id)}
                        variant="accent"
                        size="sm"
                        Icon={Play}
                        className="w-full sm:w-auto"
                        disabled={isDeleting}
                      >
                        Resume Setup
                      </Button>
                    )}
                    <Button
                      onClick={() => handleOpenLive(match.id)}
                      variant="primary"
                      size="sm"
                      Icon={Eye}
                      className="w-full sm:w-auto"
                    >
                      Open Live
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(match.id)}
                      variant="secondary"
                      size="sm"
                      Icon={Share2}
                      disabled={copyingMatchId === match.id}
                      className="w-full sm:w-auto"
                    >
                      {copyingMatchId === match.id ? 'Copying...' : 'Copy Link'}
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
                        {isDeleting ? 'Deleting...' : 'Delete'}
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
            <h2 className="text-lg font-semibold text-slate-200">Upcoming Matches</h2>
            <p className="text-xs text-slate-400">
              Future matches from connected schedules. Not planned yet.
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
                      vs {match.opponent}
                    </h3>
                    {getStateBadge('upcoming')}
                  </div>
                  <p className="text-xs text-amber-200">Not planned yet</p>
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
                  <Button variant="accent" size="sm" className="w-full sm:w-auto">
                    Plan
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
