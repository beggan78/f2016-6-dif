import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';
import { useTeam } from '../contexts/TeamContext';
import { VIEWS } from '../constants/viewConstants';
import { generateIndividualFormationRecommendation } from '../utils/formationGenerator';
import { getInitialFormationTemplate, initializePlayerRoleAndStatus, getValidPositions, getModeDefinition } from '../constants/gameModes';
import { createSubstitutionManager, handleRoleChange } from '../game/logic/substitutionManager';
import { updatePlayerTimeStats } from '../game/time/stintManager';
import { createMatch, formatMatchDataFromGameState, updateMatchToFinished, updateMatchToRunning, formatFinalStatsFromGameState, updateExistingMatch, upsertPlayerMatchStats, saveInitialMatchConfig, validateFinalStats } from '../services/matchStateManager';
import { saveMatchConfiguration as saveMatchConfigurationService } from '../services/matchConfigurationService';
import { createRotationQueue } from '../game/queue/rotationQueue';
import { getPositionRole } from '../game/logic/positionUtils';
import { createGamePersistenceManager } from '../utils/persistenceManager';
import { useMatchPersistence } from './useMatchPersistence';
import { createPlayerLookup, findPlayerById, getSelectedSquadPlayers, getOutfieldPlayers, createEmptyPlayerStats } from '../utils/playerUtils';
import { useLegacyMatchEvents as useMatchEvents } from './useMatchEvents';
import { useTeamConfig } from './useTeamConfig';
import { useMatchAudio } from './useMatchAudio';
import { usePlayerState } from './usePlayerState';
import { FORMATS, getMinimumPlayersForFormat, getMaximumPlayersForFormat } from '../constants/teamConfiguration';
import { usePreferences } from '../contexts/PreferencesContext';
import { DEFAULT_MATCH_TYPE } from '../constants/matchTypes';
import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';
import { STORAGE_KEYS } from '../constants/storageKeys';

// PersistenceManager for handling localStorage operations
const persistenceManager = createGamePersistenceManager(STORAGE_KEYS.GAME_STATE);

// Migration utilities no longer needed - working exclusively with teamConfig objects

/**
 * Check if a formation object has meaningful player assignments (non-null player IDs)
 * @param {Object} formation - The formation object to check
 * @returns {boolean} True if there are actual player assignments, false otherwise
 */
const hasPlayerAssignments = (formation, teamConfig) => {
  if (!formation || !teamConfig) return false;

  const modeDefinition = getModeDefinition(teamConfig);
  if (!modeDefinition) {
    return false;
  }

  return modeDefinition.positionOrder.some(positionKey => {
    const assignment = formation[positionKey];
    return Boolean(assignment);
  });
};

const findPlayerPositionKey = (playerId, formation, formationAwareTeamConfig) => {
  const modeDefinition = getModeDefinition(formationAwareTeamConfig);
  if (!modeDefinition) {
    return null;
  }

  const positions = ['goalie', ...modeDefinition.fieldPositions, ...modeDefinition.substitutePositions];
  for (const pos of positions) {
    if (formation[pos] === playerId) return pos;
  }
  return null;
};

const spreadFieldPlayersAcrossRoles = (fieldPlayers, formation, fieldPositions) => {
  if (!Array.isArray(fieldPlayers) || fieldPlayers.length === 0) {
    return fieldPlayers;
  }

  const roleLookup = fieldPositions.reduce((acc, positionKey) => {
    const playerId = formation[positionKey];
    if (playerId) {
      acc[playerId] = getPositionRole(positionKey);
    }
    return acc;
  }, {});

  const roleBuckets = {
    [PLAYER_ROLES.DEFENDER]: [],
    [PLAYER_ROLES.MIDFIELDER]: [],
    [PLAYER_ROLES.ATTACKER]: [],
    other: []
  };

  fieldPlayers.forEach(player => {
    const role = roleLookup[player.id];
    if (roleBuckets[role]) {
      roleBuckets[role].push(player);
    } else {
      roleBuckets.other.push(player);
    }
  });

  const prioritizedRoles = [PLAYER_ROLES.DEFENDER, PLAYER_ROLES.MIDFIELDER, PLAYER_ROLES.ATTACKER];
  const interleaved = [];
  let rolePointer = 0;

  while (prioritizedRoles.some(role => roleBuckets[role].length > 0)) {
    let added = false;

    for (let offset = 0; offset < prioritizedRoles.length; offset++) {
      const roleIndex = (rolePointer + offset) % prioritizedRoles.length;
      const roleKey = prioritizedRoles[roleIndex];

      if (roleBuckets[roleKey].length === 0) {
        continue;
      }

      interleaved.push(roleBuckets[roleKey].shift());
      rolePointer = (roleIndex + 1) % prioritizedRoles.length;
      added = true;
      break;
    }

    if (!added) {
      break;
    }
  }

  return [...interleaved, ...roleBuckets.other];
};

const normalizeView = (value) => {
  if (value === 'matchReport') {
    return VIEWS.STATS;
  }

  if (Object.values(VIEWS).includes(value)) {
    return value;
  }

  return VIEWS.CONFIG;
};

export function useGameState(navigateToView = null) {
  const { t } = useTranslation('game');
  // Get current team from context for database operations
  const { currentTeam, updateMatchActivityStatus, loadTeamPreferences } = useTeam();
  // Get preferences for various integrations
  const { audioPreferences } = usePreferences();

  // Audio and wake lock management - extracted to useMatchAudio hook
  const { requestWakeLock, releaseWakeLock, playAlertSounds } = useMatchAudio(audioPreferences);

  // Initialize state from PersistenceManager ONLY ONCE using lazy initializer
  const [initialState] = useState(() => {
    const loadedState = persistenceManager.loadState(); // Keep direct call for initial load
    return loadedState;
  });

  // Player state management - extracted to usePlayerState hook
  const playerStateHook = usePlayerState(initialState);
  const {
    allPlayers,
    selectedSquadIds,
    captainId,
    setAllPlayers,
    setSelectedSquadIds,
    setCaptainId,
    addTemporaryPlayer,
    setCaptain,
    clearCaptain,
    togglePlayerInactive,
    syncPlayersFromTeamRoster,
    updatePlayerRolesFromFormation
  } = playerStateHook;

  const [view, setViewState] = useState(() => normalizeView(initialState.view));
  const [numPeriods, setNumPeriods] = useState(initialState.numPeriods);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(initialState.periodDurationMinutes);
  const [periodGoalieIds, setPeriodGoalieIds] = useState(initialState.periodGoalieIds);
  // Team configuration - extracted to useTeamConfig hook
  const teamConfigHook = useTeamConfig(initialState);
  const {
    teamConfig,
    selectedFormation,
    setTeamConfig,
    setSelectedFormation,
    updateTeamConfig,
    updateFormationSelection,
    createTeamConfigFromSquadSize,
    getFormationAwareTeamConfig
  } = teamConfigHook;
  const [alertMinutes, setAlertMinutes] = useState(initialState.alertMinutes);

  const [currentPeriodNumber, setCurrentPeriodNumber] = useState(initialState.currentPeriodNumber);
  const [formation, setFormation] = useState(initialState.formation);
  const [nextPlayerToSubOut, setNextPlayerToSubOut] = useState(initialState.nextPlayerToSubOut);
  const [nextPlayerIdToSubOut, setNextPlayerIdToSubOut] = useState(initialState.nextPlayerIdToSubOut);
  const [rotationQueue, setRotationQueue] = useState(initialState.rotationQueue);
  const [gameLog, setGameLog] = useState(initialState.gameLog);
  const [opponentTeam, setOpponentTeam] = useState(initialState.opponentTeam || '');
  const [matchType, setMatchType] = useState(initialState.matchType || DEFAULT_MATCH_TYPE);
  const [venueType, setVenueType] = useState(initialState.venueType || DEFAULT_VENUE_TYPE);
  const [lastSubstitutionTimestamp, setLastSubstitutionTimestamp] = useState(initialState.lastSubstitutionTimestamp || null);

  const currentFormat = teamConfig?.format || FORMATS.FORMAT_5V5;
  const minimumPlayersForFormat = useMemo(() => getMinimumPlayersForFormat(currentFormat), [currentFormat]);
  const maximumPlayersForMatch = useMemo(() => getMaximumPlayersForFormat(currentFormat), [currentFormat]);

  // Match events and scoring - extracted to useMatchEvents hook
  const matchEventsHook = useMatchEvents(initialState);
  const {
    matchEvents,
    matchStartTime,
    goalScorers,
    eventSequenceNumber,
    lastEventBackup,
    ownScore,
    opponentScore,
    setMatchEvents,
    setMatchStartTime,
    setGoalScorers,
    setEventSequenceNumber,
    setLastEventBackup,
    addGoalScored,
    addGoalConceded,
    setScore,
    resetScore,
    clearAllMatchEvents,
    syncMatchDataFromEventLogger
  } = matchEventsHook;
  const setView = useCallback((nextView) => {
    setViewState(normalizeView(nextView));
  }, []);
  const [timerPauseStartTime, setTimerPauseStartTime] = useState(initialState.timerPauseStartTime || null);
  const [totalMatchPausedDuration, setTotalMatchPausedDuration] = useState(initialState.totalMatchPausedDuration || 0);
  // Match state management - track database match record lifecycle
  const [currentMatchId, setCurrentMatchId] = useState(initialState.currentMatchId || null);
  const [matchCreated, setMatchCreated] = useState(initialState.matchCreated || false);
  const [matchState, setMatchState] = useState(initialState.matchState || 'not_started');
  const [showMatchPersistenceError, setShowMatchPersistenceError] = useState(false);
  const [persistenceErrorMessage, setPersistenceErrorMessage] = useState('');
  const [isMatchPersistenceRetrying, setIsMatchPersistenceRetrying] = useState(false);
  const [matchPersistenceRetryAttempt, setMatchPersistenceRetryAttempt] = useState(0);
  const pendingMatchCompletionRef = useRef(null);
  // Configuration activity tracking - prevents accidental clearing during active configuration
  const [hasActiveConfiguration, setHasActiveConfiguration] = useState(initialState.hasActiveConfiguration || false);
  const [trackGoalScorer, setTrackGoalScorer] = useState(
    initialState.trackGoalScorer ?? true
  );

  useEffect(() => {
    if (updateMatchActivityStatus) {
      updateMatchActivityStatus(matchState);
    }
  }, [matchState, updateMatchActivityStatus]);

  useEffect(() => {
    let isMounted = true;

    const syncGoalTrackingPreference = async () => {
      if (!currentTeam?.id || !loadTeamPreferences) {
        return;
      }

      try {
        const preferences = await loadTeamPreferences(currentTeam.id);
        if (!isMounted) return;

        if (typeof preferences?.trackGoalScorer === 'boolean') {
          setTrackGoalScorer(preferences.trackGoalScorer);
        } else {
          setTrackGoalScorer(true);
        }
      } catch (error) {
        console.warn('Failed to load goal tracking preference:', error);
      }
    };

    syncGoalTrackingPreference();

    return () => {
      isMounted = false;
    };
  }, [currentTeam?.id, loadTeamPreferences, view]);

  // Initialize match persistence hook
  const gameState = {
    allPlayers, selectedSquadIds, numPeriods, periodGoalieIds,
    teamConfig, selectedFormation, periodDurationMinutes,
    opponentTeam, captainId, matchType, venueType, formation,
    currentMatchId, matchCreated, trackGoalScorer
  };
  
  const setters = {
    setCurrentMatchId, setMatchCreated, setAllPlayers
  };
  
  const teamContext = { currentTeam };
  
  const persistence = useMatchPersistence(gameState, setters, teamContext);


  // Sync player roles with formation changes
  useEffect(() => {
    const formationAwareTeamConfig = getFormationAwareTeamConfig();
    updatePlayerRolesFromFormation(formation, selectedSquadIds, formationAwareTeamConfig);
  }, [formation, teamConfig, selectedFormation, selectedSquadIds, getFormationAwareTeamConfig, updatePlayerRolesFromFormation]);



  // Save state to localStorage whenever it changes - NOTE: Critical for refresh persistence
  useEffect(() => {
    // Debounce auto-save to prevent infinite loops during rapid state changes
    const timeoutId = setTimeout(() => {
      
      const currentState = {
        view,
        // Player state from hook
        ...playerStateHook.getPlayerState(),
        numPeriods,
        periodDurationMinutes,
        periodGoalieIds,
        // Team configuration from hook
        ...teamConfigHook.getTeamConfigState(),
        alertMinutes,
        currentPeriodNumber,
        formation,
        nextPlayerToSubOut,
        nextPlayerIdToSubOut,
        rotationQueue,
        gameLog,
        opponentTeam,
        matchType,
        venueType,
        lastSubstitutionTimestamp,
        // Match event tracking state from hook
        ...matchEventsHook.getEventState(),
        timerPauseStartTime,
        totalMatchPausedDuration,
        captainId,
        // Match lifecycle state management
        currentMatchId,
        matchCreated,
        matchState,
        hasActiveConfiguration,
        trackGoalScorer,
      };

      // Use the persistence manager's saveGameState method
      persistenceManager.saveGameState(currentState);
    }, 100); // 100ms debounce to prevent rapid successive saves

    // Cleanup timeout on dependency change or unmount
    return () => clearTimeout(timeoutId);
  }, [playerStateHook, view, numPeriods, periodDurationMinutes, periodGoalieIds, teamConfigHook, alertMinutes, currentPeriodNumber, formation, nextPlayerToSubOut, nextPlayerIdToSubOut, rotationQueue, gameLog, opponentTeam, matchType, venueType, lastSubstitutionTimestamp, matchEventsHook, timerPauseStartTime, totalMatchPausedDuration, captainId, currentMatchId, matchCreated, matchState, hasActiveConfiguration, trackGoalScorer]);



  const preparePeriodWithGameLog = useCallback((periodNum, gameLogToUse, goalieIdOverride = null) => {
    const currentGoalieId = goalieIdOverride || periodGoalieIds[periodNum];

    // Initialize formation with template structure
    setFormation(getInitialFormationTemplate(teamConfig, currentGoalieId));

    // Recommendation logic for P2/P3
    if (periodNum > 1 && gameLogToUse.length > 0) {
      const lastPeriodLog = gameLogToUse[gameLogToUse.length - 1];
      const playersWithLastPeriodStats = lastPeriodLog.finalStatsSnapshotForAllPlayers;

      // Unified individual mode formation generation
      const result = generateIndividualFormationRecommendation(
        currentGoalieId,
        playersWithLastPeriodStats,
        selectedSquadIds.map(id => allPlayers.find(p => p.id === id)),
        teamConfig,
        selectedFormation,
        lastPeriodLog.formation
      );

      // Create formation using the template and result data
      const unifiedFormation = getInitialFormationTemplate(teamConfig, currentGoalieId);
      Object.assign(unifiedFormation, result.formation);

      setFormation(unifiedFormation);

      // Set next player to substitute off (player with most field time)
      setNextPlayerIdToSubOut(result.nextToRotateOff);

      // Find the position of the next player to substitute using formation-aware field positions only
      // Create formation-aware team config for position utilities
      const formationAwareTeamConfigForPos = getFormationAwareTeamConfig();

      const definition = getModeDefinition(formationAwareTeamConfigForPos);
      const fieldPositions = definition?.fieldPositions || [];
      const playerPosition = fieldPositions.find(pos => result.formation[pos] === result.nextToRotateOff);
      setNextPlayerToSubOut(playerPosition || fieldPositions[0]);

      // Set rotation queue
      setRotationQueue(result.rotationQueue);
    } else {
      // For P1, or if recommendations fail, reset formation (user fills manually)
      setFormation(getInitialFormationTemplate(teamConfig, currentGoalieId));

      // Initialize next player and rotation queue for individual modes in P1
      const definition = getModeDefinition(teamConfig);
      const fieldPositions = definition?.fieldPositions || [];
      setNextPlayerToSubOut(fieldPositions[0] || 'leftDefender');
      setRotationQueue([]);
    }
  }, [periodGoalieIds, selectedSquadIds, allPlayers, teamConfig, selectedFormation, getFormationAwareTeamConfig]);

  const preparePeriod = useCallback((periodNum) => {
    preparePeriodWithGameLog(periodNum, gameLog);
  }, [preparePeriodWithGameLog, gameLog]);

  const handleStartPeriodSetup = useCallback(async () => {
    if (selectedSquadIds.length < minimumPlayersForFormat || selectedSquadIds.length > maximumPlayersForMatch) {
      alert(t('validation.selectPlayersCount', { min: minimumPlayersForFormat, max: maximumPlayersForMatch }));
      return;
    }
    const goaliesAssigned = Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean);
    if (!goaliesAssigned) {
      alert(t('validation.assignGoaliePerPeriod'));
      return;
    }

    // Auto-backup disabled to prevent localStorage quota issues

    // Reset player stats for the new game for the selected squad
    const updatedPlayers = allPlayers.map(p => {
      const freshStats = createEmptyPlayerStats();

      if (selectedSquadIds.includes(p.id)) {
        return {
          ...p,
          stats: {
            ...freshStats,
            // Preserve captain designation for players taking part in the match
            isCaptain: p.stats?.isCaptain || false
          }
        };
      }

      // Non-squad players should not carry stale match participation state
      return {
        ...p,
        stats: {
          ...freshStats,
          isCaptain: false
        }
      };
    });

    setAllPlayers(updatedPlayers);

    // Manage pending match in database using consolidated service
    try {
      const result = await saveMatchConfigurationService({
        teamConfig,
        selectedFormation,
        numPeriods,
        periodDurationMinutes,
        opponentTeam,
        captainId,
        matchType,
        venueType,
        formation,
        periodGoalieIds,
        selectedSquadIds,
        allPlayers: updatedPlayers,
        currentTeam,
        currentMatchId,
        matchCreated,
        setCurrentMatchId,
        setMatchCreated
      });
      
      if (!result.success) {
        console.warn('⚠️ Failed to save match configuration:', result.error);
      }
    } catch (error) {
      console.error('❌ Error managing pending match:', error);
    }

    // Reset match state for new game setup
    setMatchState('not_started');
    setCurrentPeriodNumber(1);
    setGameLog([]); // Clear game log for new game
    
    // Preserve existing formation assignments before period preparation
    const currentFormationAssignments = { ...formation };
    
    preparePeriod(1);
    
    // Restore position assignments after period preparation (but preserve the goalie set by preparePeriod)
    // This ensures user's position assignments are retained when navigating between Configuration and Period Setup screens
    if (currentFormationAssignments && hasPlayerAssignments(currentFormationAssignments, getFormationAwareTeamConfig())) {
      const goalieFromPreparePeriod = formation.goalie; // Preserve goalie set by preparePeriod
      
      setFormation(prev => {
        const restoredFormation = {
          ...prev, // Start with the formation from preparePeriod
          ...currentFormationAssignments, // Restore user's position assignments
          goalie: goalieFromPreparePeriod || currentFormationAssignments.goalie // Use goalie from preparePeriod or fallback to saved one
        };
        
        
        return restoredFormation;
      });
    }
    
    setView(VIEWS.PERIOD_SETUP);
  }, [selectedSquadIds, numPeriods, periodGoalieIds, preparePeriod, allPlayers, currentTeam,
      teamConfig, selectedFormation, periodDurationMinutes, opponentTeam, captainId, matchType, venueType,
      formation, setCurrentMatchId, setAllPlayers, setMatchState,
      setCurrentPeriodNumber, setGameLog, setView, setFormation, currentMatchId, matchCreated,
      getFormationAwareTeamConfig, minimumPlayersForFormat, maximumPlayersForMatch, t]);

  const handleStartGame = () => {
    // Validate formation
    const formationAwareConfig = getFormationAwareTeamConfig();
    const modeDefinition = getModeDefinition(formationAwareConfig);

    if (!modeDefinition) {
      alert(t('validation.invalidFormation'));
      return;
    }

    const outfieldPositions = [...modeDefinition.fieldPositions, ...modeDefinition.substitutePositions];
    const assignedOutfielders = outfieldPositions
      .map(positionKey => formation[positionKey])
      .filter(Boolean);

    const expectedOutfieldCount = outfieldPositions.length;
    const uniqueAssignedCount = new Set(assignedOutfielders).size;

    if (uniqueAssignedCount !== expectedOutfieldCount || assignedOutfielders.length !== expectedOutfieldCount || !formation.goalie) {
      alert(t('validation.completeFormation', { count: expectedOutfieldCount }));
      return;
    }

    // VALIDATION: Ensure formation contains only selected players
    const formationPlayerIds = Object.values(formation).filter(id => typeof id === 'string');

    const nonSelectedInFormation = formationPlayerIds.filter(id => !selectedSquadIds.includes(id));
    if (nonSelectedInFormation.length > 0) {
      console.warn('⚠️  [handleStartGame] Non-selected players found in formation:', nonSelectedInFormation);
    }

    // Clear any leftover fair play awards from previous matches before starting a new one
    setAllPlayers(prevPlayers => prevPlayers.map(player => ({
      ...player,
      hasFairPlayAward: false
    })));
    
    // Save match configuration using shared function
    saveMatchConfiguration({ shouldNavigate: true })
      .then((result) => {
        if (!result.success) {
          console.warn('⚠️  Failed to save match configuration:', result.error);
          // Continue with game anyway - save is optional for navigation
        }
      })
      .catch((error) => {
        console.warn('⚠️  Exception during match configuration save:', error);
        // Continue with game anyway - save is optional for navigation
      });

    // Initialize rotation queue (Period 1 or when formation generator hasn't provided a queue)
    if (rotationQueue.length === 0) {
      const formationAwareTeamConfig = getFormationAwareTeamConfig();
      const definition = getModeDefinition(formationAwareTeamConfig);
      const fieldPositions = definition?.fieldPositions || [];
      const substitutePositions = definition?.substitutePositions || [];

      let initialQueue = [];
      let nextPlayerToRotateOff = null;

      const fieldPlayersInFormation = fieldPositions.map(pos => formation[pos]).filter(Boolean);
      const substitutePlayersInFormation = substitutePositions.map(pos => formation[pos]).filter(Boolean);

      const allOutfieldPlayers = [...fieldPlayersInFormation, ...substitutePlayersInFormation];
      const outfieldPlayersWithTime = allOutfieldPlayers.map(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        return {
          id: playerId,
          totalOutfieldTime: player?.stats?.timeOnFieldSeconds || 0
        };
      });

      const fieldPlayersSorted = outfieldPlayersWithTime
        .filter(p => fieldPlayersInFormation.includes(p.id))
        .sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);

      const substitutePlayersSorted = outfieldPlayersWithTime
        .filter(p => substitutePlayersInFormation.includes(p.id))
        .sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);

      const fieldPlayersWithRolesSpread = spreadFieldPlayersAcrossRoles(fieldPlayersSorted, formation, fieldPositions);

      initialQueue = [...fieldPlayersWithRolesSpread.map(p => p.id), ...substitutePlayersSorted.map(p => p.id)];
      nextPlayerToRotateOff = fieldPlayersWithRolesSpread[0]?.id || null;

      if (nextPlayerToRotateOff && initialQueue.length >= fieldPositions.length) {
        setNextPlayerIdToSubOut(nextPlayerToRotateOff);
        setRotationQueue(initialQueue);

        const nextPlayerPosition = fieldPositions.find(pos => formation[pos] === nextPlayerToRotateOff);
        if (nextPlayerPosition) {
          setNextPlayerToSubOut(nextPlayerPosition);
        }

      } else {
        console.warn('🔧 [handleStartGame] Could not initialize rotation queue - incomplete formation');
      }
    }

    // Set match state to pending (not running yet - user needs to click Start Match)
    setMatchState('pending');

    setView(VIEWS.GAME);
    
    // Sync match data after game starts (small delay to ensure events are logged)
    setTimeout(() => {
      syncMatchDataFromEventLogger();
    }, 100);
  };

  // New function to actually start the match when user clicks Start Match button
  const handleActualMatchStart = async () => {
    const formationAwareTeamConfig = getFormationAwareTeamConfig();
    const lockTimestamp = Date.now();

    const lockedPlayers = allPlayers.map(player => {
      if (!selectedSquadIds.includes(player.id)) {
        return player;
      }

      const { currentRole, currentStatus, currentPositionKey } = initializePlayerRoleAndStatus(
        player.id,
        formation,
        formationAwareTeamConfig
      );

      const stats = { ...player.stats };

      if (!stats.startLocked) {
        let newStartedMatchAs = stats.startedMatchAs;
        if (currentStatus === PLAYER_STATUS.GOALIE) newStartedMatchAs = PLAYER_ROLES.GOALIE;
        else if (currentStatus === PLAYER_STATUS.ON_FIELD) newStartedMatchAs = PLAYER_ROLES.FIELD_PLAYER;
        else if (currentStatus === PLAYER_STATUS.SUBSTITUTE) newStartedMatchAs = PLAYER_ROLES.SUBSTITUTE;

        stats.startedMatchAs = newStartedMatchAs;
        stats.startedAtPosition = currentPositionKey;
        stats.startedAtRole = currentRole || null;
      }

      stats.currentRole = currentRole;
      stats.currentStatus = currentStatus;
      stats.currentPositionKey = currentPositionKey;
      stats.lastStintStartTimeEpoch = lockTimestamp;
      stats.startLocked = true;

      return {
        ...player,
        stats
      };
    });

    setAllPlayers(lockedPlayers);

    if (currentMatchId) {
      try {
        await upsertPlayerMatchStats(currentMatchId, lockedPlayers, captainId, selectedSquadIds);
      } catch (error) {
        console.warn('⚠️  Failed to upsert player stats on match start:', error);
      }
    }

    // Update match state to running in database
    if (currentMatchId) {
      try {
        const result = await updateMatchToRunning(currentMatchId);
        if (!result.success) {
          console.warn('⚠️  Failed to update match to running:', result.error);
          // Continue anyway - local state is more important
        }
      } catch (error) {
        console.warn('⚠️  Exception while updating match to running:', error);
        // Continue anyway - local state is more important
      }
    }

    // Set local match state to running
    setMatchState('running');

    // Request wake lock (alert timer now handled by visual timer logic)
    requestWakeLock();
  };

  const handleSubstitution = (isSubTimerPaused = false) => {
    const currentTimeEpoch = Date.now();
    setLastSubstitutionTimestamp(currentTimeEpoch);

    // Request wake lock
    requestWakeLock();

    const substitutionManager = createSubstitutionManager(teamConfig);

    const context = {
      formation,
      nextPlayerIdToSubOut,
      allPlayers,
      rotationQueue,
      currentTimeEpoch,
      isSubTimerPaused
    };

    try {
      const result = substitutionManager.executeSubstitution(context);

      // Apply results to state
      setFormation(result.newFormation);
      setAllPlayers(result.updatedPlayers);

      if (result.newRotationQueue) {
        setRotationQueue(result.newRotationQueue);
      }
      if (result.newNextPlayerIdToSubOut !== undefined) {
        setNextPlayerIdToSubOut(result.newNextPlayerIdToSubOut);
      }
      if (result.newNextPlayerToSubOut) {
        setNextPlayerToSubOut(result.newNextPlayerToSubOut);
      }
    } catch (error) {
      console.error('Substitution failed:', error);
      // Handle error appropriately - could show a user-friendly message
    }
  };

  const getMatchPersistenceErrorDetails = useCallback((result, players) => {
    const details = [];

    if (result?.error) {
      details.push(result.error);
    }

    const failures = result?.playerStats?.failures;
    if (Array.isArray(failures) && failures.length > 0) {
      const names = failures
        .map(failure => findPlayerById(players, failure.playerId))
        .map(player => player?.displayName || player?.firstName || player?.lastName)
        .filter(Boolean);

      if (names.length > 0) {
        details.push(t('persistence.playerStatsFailed', { names: names.join(', ') }));
      } else {
        details.push(t('persistence.playerStatsFailedCount', { count: failures.length }));
      }
    }

    return details.join(' ');
  }, [t]);

  const buildMatchPersistenceErrorMessage = useCallback((result, players, prefix = null) => {
    const resolvedPrefix = prefix || t('persistence.failedToSaveMatch');
    const details = getMatchPersistenceErrorDetails(result, players);
    if (!details) {
      return `${resolvedPrefix}.`;
    }
    return `${resolvedPrefix}: ${details}`;
  }, [getMatchPersistenceErrorDetails, t]);

  const openMatchPersistenceError = useCallback((message, context) => {
    setPersistenceErrorMessage(message);
    setShowMatchPersistenceError(true);
    setIsMatchPersistenceRetrying(false);
    setMatchPersistenceRetryAttempt(0);
    if (context) {
      pendingMatchCompletionRef.current = context;
    }
  }, []);

  const clearMatchPersistenceError = useCallback(() => {
    setShowMatchPersistenceError(false);
    setPersistenceErrorMessage('');
    setIsMatchPersistenceRetrying(false);
    setMatchPersistenceRetryAttempt(0);
  }, []);

  const finalizeMatchCompletion = useCallback(() => {
    setMatchState('finished');
    setView(VIEWS.STATS);
  }, [setMatchState, setView]);

  const continueWithoutSavingMatch = useCallback(() => {
    clearMatchPersistenceError();
    pendingMatchCompletionRef.current = null;
    finalizeMatchCompletion();
  }, [clearMatchPersistenceError, finalizeMatchCompletion]);

  const buildMatchCompletionContext = useCallback((currentTimeEpoch, updatedPlayersWithFinalStats) => {
    return {
      matchId: currentMatchId,
      matchStartTime,
      matchEndTimeEpoch: currentTimeEpoch,
      updatedPlayers: updatedPlayersWithFinalStats,
      goalScorers,
      matchEvents,
      ownScore,
      opponentScore
    };
  }, [currentMatchId, matchStartTime, goalScorers, matchEvents, ownScore, opponentScore]);

  const resolveMatchCompletionPayload = useCallback((context) => {
    if (!context?.matchId) {
      return { error: t('persistence.cannotSaveNoMatchId') };
    }

    if (!Array.isArray(context.updatedPlayers) || context.updatedPlayers.length === 0) {
      return { error: t('persistence.cannotSaveNoPlayerData') };
    }

    let matchDurationSeconds = context.matchDurationSeconds;
    if (matchDurationSeconds === undefined || matchDurationSeconds === null) {
      const startTime = context.matchStartTime ?? matchStartTime;
      if (!startTime) {
        return { error: t('persistence.cannotSaveMissingStartTime') };
      }
      matchDurationSeconds = Math.floor((context.matchEndTimeEpoch - startTime) / 1000);
    }

    const finalStats = context.finalStats || formatFinalStatsFromGameState({
      ownScore: context.ownScore,
      opponentScore: context.opponentScore,
      allPlayers: context.updatedPlayers
    }, matchDurationSeconds);

    const validation = validateFinalStats(finalStats);
    if (!validation.valid) {
      return { error: t('persistence.cannotSaveIncompleteData', { fields: validation.missingFields.join(', ') }) };
    }

    const participatingPlayers = context.updatedPlayers.filter(player =>
      player.stats?.startedMatchAs || player.stats?.startedAtPosition
    );
    if (participatingPlayers.length === 0) {
      return { error: t('persistence.cannotSaveNoParticipants') };
    }

    return {
      payload: {
        ...context,
        finalStats,
        matchDurationSeconds
      }
    };
  }, [matchStartTime, t]);

  const persistMatchCompletion = useCallback(async (context) => {
    const { payload, error } = resolveMatchCompletionPayload(context);
    if (error) {
      openMatchPersistenceError(error, context);
      return { success: false, error };
    }

    const result = await updateMatchToFinished(
      payload.matchId,
      payload.finalStats,
      payload.updatedPlayers,
      payload.goalScorers,
      payload.matchEvents
    );

    if (!result.success) {
      const message = buildMatchPersistenceErrorMessage(result, payload.updatedPlayers);
      openMatchPersistenceError(message, payload);
      return result;
    }

    clearMatchPersistenceError();
    pendingMatchCompletionRef.current = null;
    finalizeMatchCompletion();
    return result;
  }, [resolveMatchCompletionPayload, openMatchPersistenceError, buildMatchPersistenceErrorMessage, clearMatchPersistenceError, finalizeMatchCompletion]);

  const retryMatchPersistence = useCallback(async (maxAttempts = 3) => {
    const pendingContext = pendingMatchCompletionRef.current;
    if (!pendingContext) {
      openMatchPersistenceError(t('persistence.cannotRetry'));
      return { success: false, error: 'No pending match data' };
    }

    const { payload, error } = resolveMatchCompletionPayload(pendingContext);
    if (error) {
      openMatchPersistenceError(error, pendingContext);
      return { success: false, error };
    }

    setIsMatchPersistenceRetrying(true);
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setMatchPersistenceRetryAttempt(attempt);
      setPersistenceErrorMessage(t('persistence.retrying', { attempt, maxAttempts }));

      lastResult = await updateMatchToFinished(
        payload.matchId,
        payload.finalStats,
        payload.updatedPlayers,
        payload.goalScorers,
        payload.matchEvents
      );

      if (lastResult.success) {
        setIsMatchPersistenceRetrying(false);
        clearMatchPersistenceError();
        pendingMatchCompletionRef.current = null;
        finalizeMatchCompletion();
        return lastResult;
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    setIsMatchPersistenceRetrying(false);
    const finalMessage = buildMatchPersistenceErrorMessage(
      lastResult,
      payload.updatedPlayers,
      t('persistence.failedAfterRetries', { maxAttempts })
    );
    openMatchPersistenceError(finalMessage, payload);
    return lastResult || { success: false, error: t('persistence.failedAfterRetries', { maxAttempts }) };
  }, [resolveMatchCompletionPayload, openMatchPersistenceError, clearMatchPersistenceError, buildMatchPersistenceErrorMessage, finalizeMatchCompletion, t]);

  const handleEndPeriod = async (isSubTimerPaused = false) => {
    // Auto-backup disabled to prevent localStorage quota issues
    const currentTimeEpoch = Date.now();
    const selectedSquadPlayers = getSelectedSquadPlayers(allPlayers, selectedSquadIds);
    const playerIdsInPeriod = selectedSquadPlayers.map(p => p.id);

    // Calculate updated stats
    const updatedPlayersWithFinalStats = allPlayers.map(p => {
      if (playerIdsInPeriod.includes(p.id)) {
        const stats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);

        // Update period role counts (based on final role of the period)
        // Players can change roles mid-period via manual swaps, but we count
        // the period based on their final role for formation recommendation purposes
        if (stats.currentRole === PLAYER_ROLES.GOALIE) stats.periodsAsGoalie += 1;
        else if (stats.currentRole === PLAYER_ROLES.DEFENDER) stats.periodsAsDefender += 1;
        else if (stats.currentRole === PLAYER_ROLES.ATTACKER) stats.periodsAsAttacker += 1;

        return { ...p, stats };
      }
      return p;
    });

    // Update player stats
    setAllPlayers(updatedPlayersWithFinalStats);

    // Calculate the updated gameLog first
    const currentPlayersSnapshot = updatedPlayersWithFinalStats
      .filter(p => selectedSquadIds.includes(p.id))
      .map(p => ({
        id: p.id,
        displayName: p.displayName || null,
        firstName: p.firstName || null,
        lastName: p.lastName || null,
        jerseyNumber: p.jerseyNumber || null,
        stats: JSON.parse(JSON.stringify(p.stats)) // Deep copy of stats for the log
      }));

    const newGameLogEntry = {
      periodNumber: currentPeriodNumber,
      formation: JSON.parse(JSON.stringify(formation)),
      finalStatsSnapshotForAllPlayers: currentPlayersSnapshot,
    };
    
    const updatedGameLog = [...gameLog, newGameLogEntry];

    setGameLog(updatedGameLog);

    if (currentPeriodNumber < numPeriods) {
      setCurrentPeriodNumber(prev => prev + 1);
      preparePeriodWithGameLog(currentPeriodNumber + 1, updatedGameLog);
      setView(VIEWS.PERIOD_SETUP);
    } else {
      // COMPLETE MATCH RECORD when last period ends
      // Release wake lock when game ends regardless of persistence outcome
      releaseWakeLock();

      const completionContext = buildMatchCompletionContext(currentTimeEpoch, updatedPlayersWithFinalStats);
      pendingMatchCompletionRef.current = completionContext;

      const matchDurationSeconds = matchStartTime
        ? Math.floor((currentTimeEpoch - matchStartTime) / 1000)
        : null;

      if (matchDurationSeconds !== null) {
        completionContext.matchDurationSeconds = matchDurationSeconds;
        completionContext.finalStats = formatFinalStatsFromGameState({
          ownScore,
          opponentScore,
          allPlayers: updatedPlayersWithFinalStats
        }, matchDurationSeconds);
      }

      const persistResult = await persistMatchCompletion(completionContext);
      if (!persistResult.success) {
        return;
      }
    }
  };

  // Add temporary player

  // Enhanced clear stored state with backup
  const clearStoredState = useCallback(() => {
    // Clear all match events using the hook
    const eventsCleared = clearAllMatchEvents();
    if (eventsCleared) {
      
      // Clear captain assignment
      clearCaptain();

      // Clear match lifecycle state to prevent ID reuse
      setCurrentMatchId(null);
      setMatchState('not_started');
      setMatchCreated(false);

      // Reset configuration activity tracking
      setHasActiveConfiguration(false);
      setVenueType(DEFAULT_VENUE_TYPE);
    } else {
      console.warn('Failed to clear game events');
    }
    
    // Clear the state
    const result = persistence.clearPersistedState();
    if (!result) {
      console.warn('Failed to clear game state');
    }

    return result;
  }, [persistence, clearAllMatchEvents, clearCaptain, setVenueType]);



  const setNextPlayerToSubOutWithRotation = useCallback((newPosition, isAutomaticUpdate = true) => {
    setNextPlayerToSubOut(newPosition);
    
    // Only auto-update player ID for manual user selection, not during automatic substitution calculations
    if (!isAutomaticUpdate && formation && formation[newPosition]) {
      const selectedPlayerId = formation[newPosition];
      const currentNextPlayerId = nextPlayerIdToSubOut;
      
      setNextPlayerIdToSubOut(selectedPlayerId);
      
      // Update rotation queue to reflect manual player selection
      if (selectedPlayerId !== currentNextPlayerId) {
        // Update rotation queue to put selected player first
        setRotationQueue(prev => {
          const queueManager = createRotationQueue(prev, createPlayerLookup(allPlayers));
          queueManager.initialize();
          
          // Move selected player to front of rotation queue
          queueManager.removePlayer(selectedPlayerId);
          queueManager.addPlayer(selectedPlayerId, 0); // Add to front
          
          return queueManager.toArray();
        });
      }
    }
  }, [formation, nextPlayerIdToSubOut, allPlayers]);


  // Helper function to get inactive players for animation purposes
  const getInactivePlayerPosition = useCallback((playerId) => {
    const player = findPlayerById(allPlayers, playerId);
    return player?.stats.currentPositionKey;
  }, [allPlayers]);

  // Function to switch positions between two outfield players
  const switchPlayerPositions = useCallback((player1Id, player2Id, isSubTimerPaused = false) => {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      console.warn('Invalid player IDs for position switch');
      return false;
    }

    const player1 = findPlayerById(allPlayers, player1Id);
    const player2 = findPlayerById(allPlayers, player2Id);
    
    if (!player1 || !player2) {
      console.warn('Players not found for position switch');
      return false;
    }

    // Don't allow switching with goalie
    if (player1.id === formation.goalie || player2.id === formation.goalie) {
      console.warn('Cannot switch positions with goalie');
      return false;
    }

    const player1Position = player1.stats.currentPositionKey;
    const player2Position = player2.stats.currentPositionKey;

    // Don't allow switching if either player is not currently on field or substitute
    const currentValidPositions = getValidPositions(teamConfig);
    if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
      console.warn('One or both players are not in valid positions for switching');
      return false;
    }

    // Update period formation by swapping positions
    setFormation(prev => {
      const newFormation = { ...prev };

      // Handle individual formations - simply swap the position assignments
      newFormation[player1Position] = player2Id;
      newFormation[player2Position] = player1Id;

      return newFormation;
    });

    // Update player stats to reflect new positions and handle role changes
    const currentTimeEpoch = Date.now();
    setAllPlayers(prev => prev.map(p => {
      if (p.id === player1Id) {
        // Determine the new role for player1 based on their new position
        const newRole = getPositionRole(player2Position) || p.stats.currentRole;

        return {
          ...p,
          stats: {
            ...handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused),
            currentPositionKey: player2Position
          }
        };
      }
      if (p.id === player2Id) {
        // Determine the new role for player2 based on their new position
        const newRole = getPositionRole(player1Position) || p.stats.currentRole;

        return {
          ...p,
          stats: {
            ...handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused),
            currentPositionKey: player1Position
          }
        };
      }
      return p;
    }));

    // The rotation queue order remains intact - no changes needed
    // Players keep their position in the queue, just their on-field positions change
    
    return true;
  }, [allPlayers, formation, teamConfig, setAllPlayers]);

  // Function to switch goalies
  const switchGoalie = useCallback((newGoalieId, isSubTimerPaused = false) => {
    if (!newGoalieId || newGoalieId === formation.goalie) {
      console.warn('Invalid new goalie ID or same as current goalie');
      return false;
    }

    const currentGoalie = findPlayerById(allPlayers, formation.goalie);
    const newGoalie = findPlayerById(allPlayers, newGoalieId);
    
    if (!currentGoalie || !newGoalie) {
      console.warn('Goalie not found for switch');
      return false;
    }

    // Don't allow switching with inactive player
    if (newGoalie.stats.isInactive) {
      console.warn('Cannot switch to inactive player as goalie');
      return false;
    }

    const newGoaliePosition = newGoalie.stats.currentPositionKey;

    // Update period formation
    setFormation(prev => {
      const newFormation = { ...prev };

      // Set new goalie
      newFormation.goalie = newGoalieId;

      // Place current goalie in the position of the new goalie
      newFormation[newGoaliePosition] = formation.goalie;

      return newFormation;
    });

    // Update player stats and handle role changes
    const currentTimeEpoch = Date.now();
    setAllPlayers(prev => prev.map(p => {
      if (p.id === formation.goalie) {
        // Current goalie becomes a field player
        // First calculate accumulated time for their goalie stint
        const updatedStats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);

        // Determine new role and status based on position they're moving to
        const newRole = getPositionRole(newGoaliePosition) || PLAYER_ROLES.DEFENDER; // Default to defender
        const newStatus = newGoaliePosition.includes('substitute') ? PLAYER_STATUS.SUBSTITUTE : PLAYER_STATUS.ON_FIELD;

        // Handle role change from goalie to new position
        const newStats = handleRoleChange(
          { ...p, stats: updatedStats },
          newRole,
          currentTimeEpoch,
          isSubTimerPaused
        );

        // Update status and position
        newStats.currentStatus = newStatus;
        newStats.currentPositionKey = newGoaliePosition;

        return { ...p, stats: newStats };
      } else if (p.id === newGoalieId) {
        // New goalie - calculate accumulated time for their field stint
        const updatedStats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);

        // Handle role change from field player to goalie
        const newStats = handleRoleChange(
          { ...p, stats: updatedStats },
          PLAYER_ROLES.GOALIE,
          currentTimeEpoch,
          isSubTimerPaused
        );

        // Update status and position
        newStats.currentStatus = PLAYER_STATUS.GOALIE;
        newStats.currentPositionKey = 'goalie';

        return { ...p, stats: newStats };
      }
      return p;
    }));

    // Update rotation queue - remove new goalie from queue and add old goalie
    setRotationQueue(prev => {
      const queueManager = createRotationQueue(prev, createPlayerLookup(allPlayers));
      queueManager.initialize(); // Separate active and inactive players
      
      // Remove new goalie from queue (they're now goalie, not in rotation)
      queueManager.removePlayer(newGoalieId);
      
      // Add old goalie to queue at the end (they're now in rotation)
      queueManager.addPlayer(formation.goalie, 'end');
      
      return queueManager.toArray();
    });

    return true;
  }, [allPlayers, formation, setAllPlayers, setFormation, setRotationQueue]);

  // Helper function to get all outfield players (excludes goalie)
  const getOutfieldPlayersForGame = useCallback(() => {
    return getOutfieldPlayers(allPlayers, selectedSquadIds, formation.goalie);
  }, [allPlayers, selectedSquadIds, formation.goalie]);


  // Captain management functions

  // Save Configuration handler for ConfigurationScreen - extracts database save logic without navigation
  const handleSaveConfiguration = useCallback(async () => {
    // Validation
    if (selectedSquadIds.length < minimumPlayersForFormat || selectedSquadIds.length > maximumPlayersForMatch) {
      return { success: false, error: t('validation.selectPlayersCount', { min: minimumPlayersForFormat, max: maximumPlayersForMatch }) };
    }
    // Skip save if no team context
    if (!currentTeam?.id) {
      return { success: false, error: t('validation.teamContextRequired') };
    }

    try {
      // Prepare updated players for CREATE flow - reset participation state for entire roster
      const updatedPlayers = allPlayers.map(p => {
        const freshStats = createEmptyPlayerStats();

        if (selectedSquadIds.includes(p.id)) {
          return {
            ...p,
            stats: {
              ...freshStats,
              isCaptain: p.stats?.isCaptain || false
            }
          };
        }

        return {
          ...p,
          stats: {
            ...freshStats,
            isCaptain: false
          }
        };
      });

      // Use consolidated service for database save logic
      const result = await saveMatchConfigurationService({
        teamConfig,
        selectedFormation,
        numPeriods,
        periodDurationMinutes,
        opponentTeam,
        captainId,
        matchType,
        venueType,
        formation,
        periodGoalieIds,
        selectedSquadIds,
        allPlayers: updatedPlayers,
        currentTeam,
        currentMatchId,
        matchCreated,
        setCurrentMatchId,
        setMatchCreated
      });

      return result.success
        ? { success: true, message: result.message, matchId: result.matchId }
        : { success: false, error: result.error };
        
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      return { success: false, error: t('persistence.failedToSaveConfigError', { error: error.message }) };
    }
  }, [selectedSquadIds, numPeriods, periodGoalieIds, currentTeam, teamConfig, selectedFormation,
      periodDurationMinutes, opponentTeam, captainId, matchType, venueType, currentMatchId, matchCreated,
      formation, allPlayers, minimumPlayersForFormat, maximumPlayersForMatch, t]);

  // Save Period Configuration handler for PeriodSetupScreen - extracts database save logic without navigation
  // Shared function for saving match configuration (used by both handleStartGame and handleSavePeriodConfiguration)
  const saveMatchConfiguration = useCallback(async (options = {}) => {
    const { shouldNavigate = false } = options;

    // Validation
    const formationAwareConfig = getFormationAwareTeamConfig();

    if (!formationAwareConfig) {
      return { success: false, error: t('validation.completeFormationAssignment') };
    }

    const modeDefinition = getModeDefinition(formationAwareConfig);
    if (!modeDefinition) {
      return { success: false, error: t('validation.completeFormationAssignment') };
    }

    const outfieldPositions = [...modeDefinition.fieldPositions, ...modeDefinition.substitutePositions];
    const assignedOutfielders = outfieldPositions
      .map(positionKey => formation[positionKey])
      .filter(Boolean);

    const expectedOutfieldCount = outfieldPositions.length;
    const uniqueAssignedCount = new Set(assignedOutfielders).size;

    if (
      assignedOutfielders.length !== expectedOutfieldCount ||
      uniqueAssignedCount !== expectedOutfieldCount ||
      !formation.goalie
    ) {
      const errorMessage = t('validation.assignAllPositions');
      if (shouldNavigate) {
        alert(errorMessage);
        return { success: false, error: errorMessage };
      }
      return { success: false, error: errorMessage };
    }

    // Skip save if no current match
    if (!currentMatchId) {
      return { success: false, error: t('validation.noActiveMatch') };
    }

    try {
      const currentTimeEpoch = Date.now();
      
      // Create formation-aware team config for role initialization
      const formationAwareTeamConfig = getFormationAwareTeamConfig();
      
      // Update player states (same logic as handleStartGame)
      const updatedPlayers = allPlayers.map(p => {
        if (selectedSquadIds.includes(p.id)) {
          const { currentRole, currentStatus, currentPositionKey } = initializePlayerRoleAndStatus(p.id, formation, formationAwareTeamConfig);
          const stats = { ...p.stats };
          
          // Set participation markers for database insertion (same logic as handleStartGame)
          if (!stats.startLocked) {
            let newStartedMatchAs = null;
            if (currentStatus === PLAYER_STATUS.GOALIE) newStartedMatchAs = PLAYER_ROLES.GOALIE;
            else if (currentStatus === PLAYER_STATUS.ON_FIELD) newStartedMatchAs = PLAYER_ROLES.FIELD_PLAYER;
            else if (currentStatus === PLAYER_STATUS.SUBSTITUTE) newStartedMatchAs = PLAYER_ROLES.SUBSTITUTE;
            
            stats.startedMatchAs = newStartedMatchAs;
            // Store the specific formation position for formation-aware role mapping
            stats.startedAtPosition = currentPositionKey;
            // Preserve the exact role at match start for accurate reporting
            stats.startedAtRole = currentRole || null;
            stats.startLocked = false;
          }

          return {
            ...p,
            stats: {
              ...stats,
              currentRole,
              currentStatus,
              currentPositionKey: findPlayerPositionKey(
                p.id,
                formation,
                formationAwareTeamConfig
              ),
              lastStintStartTimeEpoch: currentTimeEpoch
            }
          };
        }
        return p;
      });

      // Update players state
      setAllPlayers(updatedPlayers);

      // Prepare initial config for database save
      const initialConfig = {
        formation: formation,
        teamConfig: {
          format: formationAwareTeamConfig.format,
          formation: formationAwareTeamConfig.formation,
          squadSize: formationAwareTeamConfig.squadSize
        },
        matchConfig: {
          format: formationAwareTeamConfig.format,
          periods: numPeriods,
          captainId: captainId,
          matchType: matchType,
          venueType: venueType,
          opponentTeam: opponentTeam,
          periodDurationMinutes: periodDurationMinutes
        },
        periodGoalies: periodGoalieIds,
        squadSelection: selectedSquadIds
      };

      // Handle match creation or update (similar to handleStartGame)
      let matchUpdatePromise;
      
      if (currentPeriodNumber === 1 && currentTeam?.id) {
        // Format match data from current game state
        const matchData = formatMatchDataFromGameState({
          teamConfig: formationAwareTeamConfig,
          selectedFormation,
          periods: numPeriods,
          periodDurationMinutes,
          selectedSquadIds,
          allPlayers: updatedPlayers,
          opponentTeam,
          captainId,
          matchType,
          venueType
        }, currentTeam.id);

        if (currentMatchId && matchCreated) {
          // UPDATE FLOW: Match already exists, update it with formation data
          matchUpdatePromise = updateExistingMatch(currentMatchId, matchData)
            .then((updateResult) => {
              if (!updateResult.success) {
                console.warn('⚠️  Failed to update match record:', updateResult.error);
              }
              return updateResult;
            })
            .catch((error) => {
              console.warn('⚠️  Exception during match update:', error);
              return { success: false, error: error.message };
            });
        } else {
          // CREATE FLOW: No existing match, create new one
          setMatchCreated(true); // Prevent duplicate attempts
          
          matchUpdatePromise = createMatch(matchData, updatedPlayers, selectedSquadIds)
            .then((result) => {
              if (result.success) {
                setCurrentMatchId(result.matchId);
                return { success: true };
              } else {
                console.warn('⚠️  Failed to create match record:', result.error);
                return { success: false, error: result.error };
              }
            })
            .catch((error) => {
              console.warn('⚠️  Exception during match creation:', error);
              return { success: false, error: error.message };
            });
        }
      } else {
        // For non-first period, just update existing match
        matchUpdatePromise = updateExistingMatch(currentMatchId, formatMatchDataFromGameState({
          teamConfig: formationAwareTeamConfig,
          selectedFormation,
          periods: numPeriods,
          periodDurationMinutes,
          opponentTeam,
          captainId,
          matchType,
          venueType
        }, currentTeam?.id))
          .then((updateResult) => {
            if (!updateResult.success) {
              console.warn('⚠️  Failed to update match record:', updateResult.error);
            }
            return updateResult;
          })
          .catch((error) => {
            console.warn('⚠️  Exception during match update:', error);
            return { success: false, error: error.message };
          });
      }

      // Upsert player match stats with updated formation (non-blocking, same as handleStartGame)
      const statsUpdatePromise = upsertPlayerMatchStats(currentMatchId, updatedPlayers, captainId, selectedSquadIds)
        .then((upsertResult) => {
          if (!upsertResult.success) {
            console.warn('⚠️  Failed to update player match stats:', upsertResult.error);
          }
          return upsertResult;
        })
        .catch((error) => {
          console.warn('⚠️  Exception during player stats update:', error);
          return { success: false, error: error.message };
        });

      // Save initial configuration
      const initialConfigPromise = saveInitialMatchConfig(currentMatchId, initialConfig)
        .then((configResult) => {
          if (!configResult.success) {
            console.warn('⚠️  Failed to save initial config:', configResult.error);
          }
          return configResult;
        })
        .catch((error) => {
          console.warn('⚠️  Exception during initial config save:', error);
          return { success: false, error: error.message };
        });

      // Wait for all operations to complete using Promise.allSettled for better error isolation
      const [matchResult, statsResult, configResult] = await Promise.allSettled([matchUpdatePromise, statsUpdatePromise, initialConfigPromise]);
      
      // Extract results from settled promises, treating rejected promises as failed operations
      const matchRes = matchResult.status === 'fulfilled' ? matchResult.value : { success: false, error: matchResult.reason?.message || 'Match operation failed' };
      const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : { success: false, error: statsResult.reason?.message || 'Stats operation failed' };
      const configRes = configResult.status === 'fulfilled' ? configResult.value : { success: false, error: configResult.reason?.message || 'Config operation failed' };
      
      // Return success if any operation succeeded (following the original non-blocking pattern)
      const hasSuccess = matchRes.success || statsRes.success || configRes.success;
      const errors = [];
      if (!matchRes.success) errors.push('match update failed');
      if (!statsRes.success) errors.push('player stats update failed');
      if (!configRes.success) errors.push('initial config save failed');
      
      return {
        success: hasSuccess,
        message: hasSuccess
          ? (errors.length ? t('persistence.configSavedWithWarnings') : t('persistence.configSaved'))
          : t('persistence.failedToSaveConfig'),
        error: errors.length ? errors.join(', ') : undefined
      };
    } catch (error) {
      console.error('❌ Error saving match configuration:', error);
      return { success: false, error: t('persistence.failedToSaveConfigError', { error: error.message }) };
    }
  }, [formation, selectedFormation, currentMatchId, allPlayers, selectedSquadIds,
      numPeriods, periodDurationMinutes, opponentTeam, captainId, matchType, venueType, currentTeam?.id, periodGoalieIds,
      currentPeriodNumber, matchCreated, setMatchCreated, setCurrentMatchId, setAllPlayers, getFormationAwareTeamConfig, t]);

  const handleSavePeriodConfiguration = useCallback(async () => {
    return await saveMatchConfiguration({ shouldNavigate: false });
  }, [saveMatchConfiguration]);

  return {
    // State
    allPlayers,
    setAllPlayers,
    view,
    setView,
    selectedSquadIds,
    setSelectedSquadIds,
    numPeriods,
    setNumPeriods,
    periodDurationMinutes,
    setPeriodDurationMinutes,
    periodGoalieIds,
    setPeriodGoalieIds,
    teamConfig,
    setTeamConfig,
    selectedFormation,
    setSelectedFormation,
    alertMinutes,
    setAlertMinutes,
    currentPeriodNumber,
    setCurrentPeriodNumber,
    formation,
    setFormation,
    nextPlayerToSubOut,
    setNextPlayerToSubOut: setNextPlayerToSubOutWithRotation,
    nextPlayerIdToSubOut,
    setNextPlayerIdToSubOut,
    rotationQueue,
    setRotationQueue,
    gameLog,
    setGameLog,
    opponentTeam,
    setOpponentTeam,
    matchType,
    setMatchType,
    venueType,
    setVenueType,
    ownScore,
    opponentScore,
    lastSubstitutionTimestamp,
    setLastSubstitutionTimestamp,
    
    // NEW: Match event tracking state and setters
    matchEvents,
    setMatchEvents,
    matchStartTime,
    setMatchStartTime,
    goalScorers,
    setGoalScorers,
    eventSequenceNumber,
    setEventSequenceNumber,
    lastEventBackup,
    setLastEventBackup,
    timerPauseStartTime,
    setTimerPauseStartTime,
    totalMatchPausedDuration,
    setTotalMatchPausedDuration,
    captainId,
    setCaptainId,
    trackGoalScorer,
    setTrackGoalScorer,
    
    // Match lifecycle state
    currentMatchId,
    setCurrentMatchId,
    matchCreated,
    setMatchCreated,
    matchState,
    setMatchState,
    hasActiveConfiguration,
    setHasActiveConfiguration,
    showMatchPersistenceError,
    persistenceErrorMessage,
    isMatchPersistenceRetrying,
    matchPersistenceRetryAttempt,

    // Actions
    preparePeriod,
    preparePeriodWithGameLog,
    handleStartPeriodSetup,
    handleStartGame,
    handleActualMatchStart,
    handleSubstitution,
    handleEndPeriod,
    retryMatchPersistence,
    continueWithoutSavingMatch,
    addTemporaryPlayer,
    clearStoredState,
    togglePlayerInactive,
    getInactivePlayerPosition,
    switchPlayerPositions,
    switchGoalie,
    getOutfieldPlayers: getOutfieldPlayersForGame,
    addGoalScored,
    addGoalConceded,
    setScore,
    resetScore,
    setCaptain,
    
    // Audio alert function (called by visual timer logic)
    playAlertSounds,

    // Team Configuration Management
    updateTeamConfig,
    updateFormationSelection,
    createTeamConfigFromSquadSize,
    
    // Player Synchronization
    syncPlayersFromTeamRoster,

    // Configuration Save Actions
    handleSaveConfiguration,
    handleSavePeriodConfiguration,

  };
}
