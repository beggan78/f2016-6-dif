import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks, PlusCircle, FileText } from 'lucide-react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { formatPlayerName } from '../../utils/formatUtils';
import { scrollToTopSmooth } from '../../utils/scrollUtils';
import { hasPlayerParticipated } from '../../utils/playerUtils';
import { updateFinishedMatchMetadata, getPlayerStats } from '../../services/matchStateManager';
import { MatchSummaryHeader } from '../report/MatchSummaryHeader';
import { PlayerStatsTable } from '../report/PlayerStatsTable';
import { TEAM_CONFIG } from '../../constants/teamConstants';
import { FAIR_PLAY_AWARD_OPTIONS } from '../../types/preferences';
import { MATCH_TYPES } from '../../constants/matchTypes';
import { VIEWS } from '../../constants/viewConstants';

export function GameFinishedScreen({
  allPlayers,
  setView,
  setAllPlayers,
  setSelectedSquadIds,
  setPeriodGoalieIds,
  setGameLog,
  initializePlayers,
  initialRoster,
  clearStoredState,
  clearTimerState,
  ownScore,
  opponentScore,
  opponentTeam,
  resetScore,
  setOpponentTeam,
  onNavigateTo,
  onNavigateBack,
  pushNavigationState,
  removeFromNavigationStack,
  // Additional props for match data persistence
  matchEvents = [],
  gameLog = [],
  currentMatchId,
  goalScorers = {},
  showSuccessMessage = () => {},
  checkForActiveMatch,
  handleRestartMatch,
  selectedSquadIds = [],
  onStartNewConfigurationSession = () => {},
  // New props for MatchSummaryHeader and PlayerStatsTable
  matchStartTime,
  periodDurationMinutes = 12,
  formation = {},
  ownTeamName = TEAM_CONFIG.OWN_TEAM_NAME,
  matchType = null
}) {
  const [saveError, setSaveError] = useState(null);
  const [savingFairPlayAward, setSavingFairPlayAward] = useState(false);
  const [fairPlayAwardPlayerId, setFairPlayAwardPlayerId] = useState(null);
  const [fairPlayAwardPreference, setFairPlayAwardPreference] = useState(FAIR_PLAY_AWARD_OPTIONS.NONE);
  const [fairPlayAwardCounts, setFairPlayAwardCounts] = useState({});
  const { isAuthenticated } = useAuth();
  const { currentTeam, loadTeamPreferences } = useTeam();
  const saveRequestIdRef = useRef(0);

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

  useEffect(() => {
    scrollToTopSmooth();
  }, []);

  // Calculate match duration and total periods (shared with report components)
  const matchDuration = useMemo(() => {
    if (!matchStartTime) {
      return 0;
    }

    const endTime = matchEvents && matchEvents.length > 0
      ? Math.max(...matchEvents.map(e => e.timestamp))
      : Date.now();

    const duration = Math.floor((endTime - matchStartTime) / 1000);

    return duration;
  }, [matchEvents, matchStartTime]);

  const totalPeriods = useMemo(() => {
    return gameLog.length;
  }, [gameLog]);

  const participantSet = useMemo(() => {
    if (Array.isArray(selectedSquadIds) && selectedSquadIds.length > 0) {
      return new Set(selectedSquadIds);
    }
    return null;
  }, [selectedSquadIds]);

  const squadForStats = useMemo(() => {
    return allPlayers.filter(player => {
      if (participantSet && !participantSet.has(player.id)) {
        return false;
      }
      return hasPlayerParticipated(player);
    });
  }, [allPlayers, participantSet]); // Hide bench players who never stepped on the field
  

  // Fair Play Award styling constants
  const FAIR_PLAY_AWARD_STYLES = {
    container: "bg-gradient-to-r from-emerald-900/20 to-emerald-800/20 border border-emerald-500/40 shadow-emerald-500/20 shadow-lg rounded-lg p-4",
    header: "text-lg font-semibold text-emerald-200 flex items-center",
    dropdown: "w-full appearance-none bg-emerald-900/20 border border-emerald-500/60 text-emerald-100 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:shadow-emerald-300/50 focus:shadow-lg transition-colors",
    dropdownArrow: "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-emerald-400",
    confirmation: "mt-3 p-3 bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-400/50 shadow-emerald-400/30 shadow-lg rounded-lg",
    confirmationText: "text-emerald-200 font-medium flex items-center",
    confirmationBadge: "text-xs text-emerald-300/90 font-semibold"
  };

  // Helper functions
  const getSelectedPlayerName = useCallback((playerId, players) => {
    const player = players.find(p => p.id === playerId);
    return player ? formatPlayerName(player) : '';
  }, []);

  const normalizeFairPlayPreference = (value) => {
    if (Object.values(FAIR_PLAY_AWARD_OPTIONS).includes(value)) return value;
    return FAIR_PLAY_AWARD_OPTIONS.NONE;
  };

  // Load team preference for showing the fair play award block
  useEffect(() => {
    let isMounted = true;

    const fetchFairPlayPreference = async () => {
      if (!currentTeam?.id || !loadTeamPreferences) {
        setFairPlayAwardPreference(FAIR_PLAY_AWARD_OPTIONS.NONE);
        return;
      }

      try {
        const preferences = await loadTeamPreferences(currentTeam.id);
        if (!isMounted) return;

        const preferenceValue = normalizeFairPlayPreference(preferences?.fairPlayAward);
        setFairPlayAwardPreference(preferenceValue);
      } catch (error) {
        console.warn('Failed to load fair play award preference:', error);
        if (isMounted) {
          setFairPlayAwardPreference(FAIR_PLAY_AWARD_OPTIONS.NONE);
        }
      }
    };

    fetchFairPlayPreference();

    return () => {
      isMounted = false;
    };
  }, [currentTeam?.id, loadTeamPreferences]);

  const shouldShowFairPlayAward = useMemo(() => {
    switch (fairPlayAwardPreference) {
      case FAIR_PLAY_AWARD_OPTIONS.ALL_GAMES:
        return true;
      case FAIR_PLAY_AWARD_OPTIONS.LEAGUE_ONLY:
        return matchType === MATCH_TYPES.LEAGUE;
      case FAIR_PLAY_AWARD_OPTIONS.COMPETITIVE:
        return [MATCH_TYPES.LEAGUE, MATCH_TYPES.CUP, MATCH_TYPES.TOURNAMENT].includes(matchType);
      default:
        return false;
    }
  }, [fairPlayAwardPreference, matchType]);

  useEffect(() => {
    if (!shouldShowFairPlayAward && fairPlayAwardPlayerId) {
      setFairPlayAwardPlayerId(null);
    }
  }, [shouldShowFairPlayAward, fairPlayAwardPlayerId]);

  useEffect(() => {
    if (!shouldShowFairPlayAward) {
      return;
    }

    const existingAwardPlayerId = squadForStats.find(player => player.hasFairPlayAward)?.id || null;

    setFairPlayAwardPlayerId(prevId => {
      if (prevId === existingAwardPlayerId) {
        return prevId;
      }
      return existingAwardPlayerId;
    });
  }, [shouldShowFairPlayAward, squadForStats]);

  // Load historical fair play award counts (last 6 months) for sorting/labels
  useEffect(() => {
    let isActive = true;

    const fetchFairPlayHistory = async () => {
      if (!shouldShowFairPlayAward || !isAuthenticated || !currentTeam?.id) {
        if (isActive) {
          setFairPlayAwardCounts({});
        }
        return;
      }

      try {
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const result = await getPlayerStats(currentTeam.id, sixMonthsAgo, now);
        if (!isActive) return;

        if (result?.success && Array.isArray(result.players)) {
          const counts = {};
          result.players.forEach((player) => {
            counts[player.id] = player.fairPlayAwards || 0;
          });
          setFairPlayAwardCounts(counts);
        } else {
          if (result?.error) {
            console.error('Failed to load fair play award history:', result.error);
          }
          setFairPlayAwardCounts({});
        }
      } catch (error) {
        if (isActive) {
          setFairPlayAwardCounts({});
        }
        console.error('Fair play award history load error:', error);
      }
    };

    fetchFairPlayHistory();

    return () => {
      isActive = false;
    };
  }, [currentTeam?.id, isAuthenticated, shouldShowFairPlayAward]);

  const updatePlayersWithFairPlayAward = (players, awardPlayerId) => {
    const awardId = awardPlayerId || null;

    return players.map(player => ({
      ...player,
      hasFairPlayAward: Boolean(awardId && player.id === awardId)
    }));
  };

  const persistFairPlayAwardSelection = useCallback(async (selectedPlayerId) => {
    const selectedPlayerName = selectedPlayerId ? getSelectedPlayerName(selectedPlayerId, squadForStats) : null;
    if (!shouldShowFairPlayAward) {
      return;
    }

    if (!currentMatchId) {
      setSaveError('No match ID found. Please restart the match to enable saving.');
      return;
    }

    if (!isAuthenticated) {
      setSaveError('Please sign in to save match updates.');
      return;
    }

    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;

    setSaveError(null);
    setSavingFairPlayAward(true);

    setAllPlayers(prevPlayers => updatePlayersWithFairPlayAward(prevPlayers, selectedPlayerId));

    try {
      const result = await updateFinishedMatchMetadata(currentMatchId, {
        fairPlayAwardId: selectedPlayerId ?? null,
        fairPlayAwardName: selectedPlayerName
      });

      // Ignore outdated responses if another save started after this one
      if (saveRequestIdRef.current !== requestId) {
        return;
      }

      if (result.success) {
        showSuccessMessage('Match saved to history');
      } else {
        setSaveError(result.error || 'Failed to save match updates');
      }
    } catch (error) {
      if (saveRequestIdRef.current === requestId) {
        setSaveError(error.message || 'Failed to save match updates');
      }
    } finally {
      if (saveRequestIdRef.current === requestId) {
        setSavingFairPlayAward(false);
      }
    }
  }, [currentMatchId, getSelectedPlayerName, isAuthenticated, setAllPlayers, shouldShowFairPlayAward, showSuccessMessage, squadForStats]);

  const handleFairPlayAwardChange = useCallback((event) => {
    const selectedPlayerId = event.target.value || null;
    setFairPlayAwardPlayerId(selectedPlayerId);
    persistFairPlayAwardSelection(selectedPlayerId);
  }, [persistFairPlayAwardSelection]);

  const fairPlayDropdownOptions = useMemo(() => {
    return [...squadForStats]
      .map((player) => {
        const awardsCount = fairPlayAwardCounts[player.id] ?? 0;
        const playerName = formatPlayerName(player);
        return {
          id: player.id,
          awardsCount,
          label: `${playerName} (${awardsCount})`
        };
      })
      .sort((a, b) => {
        if (a.awardsCount !== b.awardsCount) {
          return a.awardsCount - b.awardsCount;
        }
        return a.label.localeCompare(b.label);
      });
  }, [fairPlayAwardCounts, squadForStats]);

  const handleViewLiveMatch = () => {
    if (!currentMatchId) {
      console.warn('No match ID available for live match navigation');
      return;
    }
    onNavigateTo(VIEWS.LIVE_MATCH, {
      matchId: currentMatchId,
      entryPoint: VIEWS.STATS
    });
  };

  const handleNewGame = async () => {
    console.log('📊 New Game from Stats Screen - calling checkForActiveMatch()');
    await checkForActiveMatch(() => {
      console.log('📊 New Game from Stats - delegating to handleRestartMatch');
      // Delegate to the main reset function to ensure consistent state clearing
      // This ensures formation and all other state is properly reset
      handleRestartMatch({ preserveConfiguration: false });
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
          <ListChecks className="mr-2 h-6 w-6" />
          Game Finished - Statistics
        </h2>
      </div>

      {/* Match Summary */}
      <div className="p-4 bg-slate-700 rounded-lg">
        <MatchSummaryHeader
          ownTeamName={ownTeamName}
          opponentTeam={opponentTeam || 'Opponent'}
          ownScore={ownScore}
          opponentScore={opponentScore}
          matchStartTime={matchStartTime}
          matchDuration={matchDuration}
          totalPeriods={totalPeriods}
          periodDurationMinutes={periodDurationMinutes}
        />
      </div>

      {/* Fair Play Award Selection */}
      {shouldShowFairPlayAward && (
        <div className={FAIR_PLAY_AWARD_STYLES.container} data-testid="fair-play-award-section">
          <div className="flex items-center justify-between mb-3">
            <h3 className={FAIR_PLAY_AWARD_STYLES.header}>
              🏆 Fair Play Award
            </h3>
          </div>

          <div className="relative">
            <select
              value={fairPlayAwardPlayerId || ''}
              onChange={handleFairPlayAwardChange}
              className={FAIR_PLAY_AWARD_STYLES.dropdown}
              data-testid="fair-play-award-dropdown"
            >
              <option value="" className="bg-slate-800">Not awarded</option>
              {fairPlayDropdownOptions.map(option => (
                <option key={option.id} value={option.id} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
            <div className={FAIR_PLAY_AWARD_STYLES.dropdownArrow}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Selection confirmation */}
          {fairPlayAwardPlayerId && (
            <div className={FAIR_PLAY_AWARD_STYLES.confirmation} data-testid="fair-play-confirmation">
              <div className="flex items-center justify-between">
                <span className={FAIR_PLAY_AWARD_STYLES.confirmationText}>
                  ✨ {getSelectedPlayerName(fairPlayAwardPlayerId, squadForStats)}
                </span>
                <span className={FAIR_PLAY_AWARD_STYLES.confirmationBadge}>FAIR PLAY WINNER</span>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-slate-300">
            {savingFairPlayAward ? 'Saving selection...' : 'Selection saves automatically'}
          </div>

          {saveError && (
            <div className="mt-3 p-2 bg-rose-900/20 border border-rose-600 rounded text-rose-200 text-sm">
              ❌ {saveError}
            </div>
          )}
        </div>
      )}

      {/* Player Statistics */}
      <PlayerStatsTable
        players={squadForStats}
        formation={formation}
        matchEvents={matchEvents}
        goalScorers={goalScorers}
      />

      <Button onClick={handleViewLiveMatch} Icon={FileText} variant="primary">
        View Match Report
      </Button>

      <Button onClick={handleNewGame} Icon={PlusCircle}>
        Start New Game
      </Button>

    </div>
  );
}
