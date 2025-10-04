import { useState, useCallback, useEffect, useMemo } from 'react';
import { PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';
import { useTeam } from '../contexts/TeamContext';
import { VIEWS } from '../constants/viewConstants';
import { generateRecommendedFormation, generateIndividualFormationRecommendation } from '../utils/formationGenerator';
import { getInitialFormationTemplate, initializePlayerRoleAndStatus, getValidPositions, supportsNextNextIndicators, getModeDefinition } from '../constants/gameModes';
import { createSubstitutionManager, handleRoleChange } from '../game/logic/substitutionManager';
import { updatePlayerTimeStats } from '../game/time/stintManager';
import { createMatch, formatMatchDataFromGameState, updateMatchToFinished, updateMatchToRunning, formatFinalStatsFromGameState, updateExistingMatch, upsertPlayerMatchStats, saveInitialMatchConfig } from '../services/matchStateManager';
import { saveMatchConfiguration as saveMatchConfigurationService } from '../services/matchConfigurationService';
import { createRotationQueue } from '../game/queue/rotationQueue';
import { getPositionRole } from '../game/logic/positionUtils';
import { createGamePersistenceManager } from '../utils/persistenceManager';
import { useMatchPersistence } from './useMatchPersistence';
import { hasInactivePlayersInSquad, createPlayerLookup, findPlayerById, getSelectedSquadPlayers, getOutfieldPlayers, createEmptyPlayerStats } from '../utils/playerUtils';
import { useMatchEvents } from './useMatchEvents';
import { useTeamConfig } from './useTeamConfig';
import { useMatchAudio } from './useMatchAudio';
import { usePlayerState } from './usePlayerState';
import { createTeamConfig, FORMATS, getMinimumPlayersForFormat, GAME_CONSTANTS } from '../constants/teamConfiguration';
import { usePreferences } from '../contexts/PreferencesContext';
import { DEFAULT_MATCH_TYPE } from '../constants/matchTypes';
import { DEFAULT_VENUE_TYPE } from '../constants/matchVenues';

// PersistenceManager for handling localStorage operations
const persistenceManager = createGamePersistenceManager('dif-coach-game-state');

// Migration utilities no longer needed - working exclusively with teamConfig objects

/**
 * Unified utility function for handling nextNext player logic
 * Consolidates scattered nextNext conditionals into a single reusable pattern
 * @param {Object} teamConfig - The current team configuration
 * @param {Array} playerList - Array of players (rotation queue or other player array)
 * @param {Function} setNextNextPlayerIdToSubOut - Setter function for nextNext player
 * @param {number} targetIndex - Index to use for nextNext player (defaults to 1)
 */
const updateNextNextPlayerIfSupported = (teamConfig, playerList, setNextNextPlayerIdToSubOut, targetIndex = 1) => {
  if (supportsNextNextIndicators(teamConfig) && playerList.length >= (targetIndex + 1)) {
    setNextNextPlayerIdToSubOut(playerList[targetIndex]);
  } else {
    setNextNextPlayerIdToSubOut(null);
  }
};

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

    if (!assignment) {
      return false;
    }

    if (typeof assignment === 'object') {
      return Boolean(assignment.defender || assignment.attacker);
    }

    return true;
  });
};

const findPlayerPairKey = (playerId, formation, isPairsMode, formationAwareTeamConfig) => {
  if (!isPairsMode) {
    const modeDefinition = getModeDefinition(formationAwareTeamConfig);
    if (!modeDefinition) {
      return null;
    }

    const positions = ['goalie', ...modeDefinition.fieldPositions, ...modeDefinition.substitutePositions];
    for (const pos of positions) {
      if (formation[pos] === playerId) return pos;
    }
    return null;
  }

  const pairKeys = ['leftPair', 'rightPair', 'subPair'];
  for (const pairKey of pairKeys) {
    const pair = formation[pairKey];
    if (pair?.defender === playerId || pair?.attacker === playerId) {
      return pairKey;
    }
  }
  return null;
};

export function useGameState(navigateToView = null) {
  // Get current team from context for database operations
  const { currentTeam, updateMatchActivityStatus } = useTeam();
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

  const [view, setView] = useState(initialState.view);
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
  const [nextPhysicalPairToSubOut, setNextPhysicalPairToSubOut] = useState(initialState.nextPhysicalPairToSubOut);
  const [nextPlayerToSubOut, setNextPlayerToSubOut] = useState(initialState.nextPlayerToSubOut);
  const [nextPlayerIdToSubOut, setNextPlayerIdToSubOut] = useState(initialState.nextPlayerIdToSubOut);
  const [nextNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut] = useState(initialState.nextNextPlayerIdToSubOut);
  const [rotationQueue, setRotationQueue] = useState(initialState.rotationQueue);
  const [gameLog, setGameLog] = useState(initialState.gameLog);
  const [opponentTeam, setOpponentTeam] = useState(initialState.opponentTeam || '');
  const [matchType, setMatchType] = useState(initialState.matchType || DEFAULT_MATCH_TYPE);
  const [venueType, setVenueType] = useState(initialState.venueType || DEFAULT_VENUE_TYPE);
  const [lastSubstitutionTimestamp, setLastSubstitutionTimestamp] = useState(initialState.lastSubstitutionTimestamp || null);

  const currentFormat = teamConfig?.format || FORMATS.FORMAT_5V5;
  const minimumPlayersForFormat = useMemo(() => getMinimumPlayersForFormat(currentFormat), [currentFormat]);
  const maximumPlayersForMatch = GAME_CONSTANTS.MAX_SQUAD_SIZE;

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
  const [timerPauseStartTime, setTimerPauseStartTime] = useState(initialState.timerPauseStartTime || null);
  const [totalMatchPausedDuration, setTotalMatchPausedDuration] = useState(initialState.totalMatchPausedDuration || 0);
  // Match state management - track database match record lifecycle
  const [currentMatchId, setCurrentMatchId] = useState(initialState.currentMatchId || null);
  const [matchCreated, setMatchCreated] = useState(initialState.matchCreated || false);
  const [matchState, setMatchState] = useState(initialState.matchState || 'not_started');
  // Configuration activity tracking - prevents accidental clearing during active configuration
  const [hasActiveConfiguration, setHasActiveConfiguration] = useState(initialState.hasActiveConfiguration || false);

  useEffect(() => {
    if (updateMatchActivityStatus) {
      updateMatchActivityStatus(matchState);
    }
  }, [matchState, updateMatchActivityStatus]);

  // Initialize match persistence hook
  const gameState = {
    allPlayers, selectedSquadIds, numPeriods, periodGoalieIds,
    teamConfig, selectedFormation, periodDurationMinutes,
    opponentTeam, captainId, matchType, venueType, formation,
    currentMatchId, matchCreated
  };
  
  const setters = {
    setCurrentMatchId, setMatchCreated, setAllPlayers
  };
  
  const teamContext = { currentTeam };
  
  const persistence = useMatchPersistence(gameState, setters, teamContext);


  // Sync player roles with formation changes (fixes PAIRS_7 Goal Scorer modal sorting)
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
        nextPhysicalPairToSubOut,
        nextPlayerToSubOut,
        nextPlayerIdToSubOut,
        nextNextPlayerIdToSubOut,
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
      };
      
      // Use the persistence manager's saveGameState method
      persistenceManager.saveGameState(currentState);
    }, 100); // 100ms debounce to prevent rapid successive saves

    // Cleanup timeout on dependency change or unmount
    return () => clearTimeout(timeoutId);
  }, [playerStateHook, view, numPeriods, periodDurationMinutes, periodGoalieIds, teamConfigHook, alertMinutes, currentPeriodNumber, formation, nextPhysicalPairToSubOut, nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, rotationQueue, gameLog, opponentTeam, matchType, venueType, lastSubstitutionTimestamp, matchEventsHook, timerPauseStartTime, totalMatchPausedDuration, captainId, currentMatchId, matchCreated, matchState, hasActiveConfiguration]);



  const preparePeriodWithGameLog = useCallback((periodNum, gameLogToUse, goalieIdOverride = null) => {
    const currentGoalieId = goalieIdOverride || periodGoalieIds[periodNum];

    setFormation(prev => ({
      ...prev,
      goalie: currentGoalieId,
      leftPair: { defender: null, attacker: null },
      rightPair: { defender: null, attacker: null },
      subPair: { defender: null, attacker: null },
      // 6-player formation structure
      leftDefender: null,
      rightDefender: null,
      leftAttacker: null,
      rightAttacker: null,
      substitute: null,
    }));

    // Recommendation logic for P2/P3
    if (periodNum > 1 && gameLogToUse.length > 0) {
      const lastPeriodLog = gameLogToUse[gameLogToUse.length - 1];
      const playersWithLastPeriodStats = lastPeriodLog.finalStatsSnapshotForAllPlayers;
      if (teamConfig.substitutionType === 'pairs') {
        // 7-player pairs formation generation
        const { recommendedLeft, recommendedRight, recommendedSubs, firstToSubRec } = generateRecommendedFormation(
            periodNum,
            currentGoalieId,
            periodGoalieIds[periodNum - 1] || null, // Previous goalie
            lastPeriodLog.formation, // Previous period's formation
            playersWithLastPeriodStats,
            selectedSquadIds.map(id => allPlayers.find(p=>p.id === id)) // Pass full player objects
        );

        const pairsFormation = {
          goalie: currentGoalieId,
          leftPair: recommendedLeft,
          rightPair: recommendedRight,
          subPair: recommendedSubs,
        };
        
        setFormation(pairsFormation);
        setNextPhysicalPairToSubOut(firstToSubRec); // 'leftPair' or 'rightPair'
      } else if (teamConfig.substitutionType === 'individual') {
        // Unified individual mode formation generation
        const result = generateIndividualFormationRecommendation(
          currentGoalieId,
          playersWithLastPeriodStats,
          selectedSquadIds.map(id => allPlayers.find(p => p.id === id)),
          teamConfig,
          selectedFormation
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
        
        // Set next-next player using unified logic
        updateNextNextPlayerIfSupported(teamConfig, result.rotationQueue, setNextNextPlayerIdToSubOut);
      }

    } else {
      // For P1, or if recommendations fail, reset formation (user fills manually)
      if (teamConfig.substitutionType === 'pairs') {
        setFormation({
          goalie: currentGoalieId,
          leftPair: { defender: null, attacker: null },
          rightPair: { defender: null, attacker: null },
          subPair: { defender: null, attacker: null },
        });
      } else if (teamConfig.substitutionType === 'individual') {
        // Use unified formation template for individual modes
        setFormation(getInitialFormationTemplate(teamConfig, currentGoalieId));
      }
      setNextPhysicalPairToSubOut('leftPair');
      
      // Initialize next player and rotation queue for individual modes in P1
      if (teamConfig.substitutionType === 'individual') {
        setNextPlayerToSubOut('leftDefender');
        // Initialize basic rotation queue for Period 1 (will be filled when game starts)
        setRotationQueue([]);
      }
    }
  }, [periodGoalieIds, selectedSquadIds, allPlayers, teamConfig, selectedFormation, getFormationAwareTeamConfig]);

  const preparePeriod = useCallback((periodNum) => {
    preparePeriodWithGameLog(periodNum, gameLog);
  }, [preparePeriodWithGameLog, gameLog]);

  const handleStartPeriodSetup = useCallback(async () => {
    if (selectedSquadIds.length < minimumPlayersForFormat || selectedSquadIds.length > maximumPlayersForMatch) {
      alert(`Please select between ${minimumPlayersForFormat} and ${maximumPlayersForMatch} players for the squad.`); // Replace with modal
      return;
    }
    const goaliesAssigned = Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean);
    if (!goaliesAssigned) {
      alert("Please assign a goalie for each period."); // Replace with modal
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
      getFormationAwareTeamConfig, minimumPlayersForFormat, maximumPlayersForMatch]);

  const handleStartGame = () => {
    // Validate formation based on team mode
    
    if (teamConfig.substitutionType === 'pairs') {
      // 7-player pairs validation
      const allOutfieldersInFormation = [
        formation.leftPair.defender, formation.leftPair.attacker,
        formation.rightPair.defender, formation.rightPair.attacker,
        formation.subPair.defender, formation.subPair.attacker,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 6 || !formation.goalie) {
        alert("Please complete the team formation with 1 goalie and 6 unique outfield players in pairs."); // Replace with modal
        return;
      }
    } else if (teamConfig.substitutionType === 'individual') {
      const formationAwareConfig = getFormationAwareTeamConfig();
      const modeDefinition = getModeDefinition(formationAwareConfig);

      if (!modeDefinition) {
        alert('Invalid formation detected. Please ensure all positions are properly assigned.');
        return;
      }

      const outfieldPositions = [...modeDefinition.fieldPositions, ...modeDefinition.substitutePositions];
      const assignedOutfielders = outfieldPositions
        .map(positionKey => formation[positionKey])
        .filter(Boolean);

      const expectedOutfieldCount = outfieldPositions.length;
      const uniqueAssignedCount = new Set(assignedOutfielders).size;

      if (uniqueAssignedCount !== expectedOutfieldCount || assignedOutfielders.length !== expectedOutfieldCount || !formation.goalie) {
        alert(`Please complete the team formation with 1 goalie and ${expectedOutfieldCount} unique outfield players.`);
        return;
      }
    }

    // VALIDATION: Ensure formation contains only selected players
    const formationPlayerIds = [];
    Object.entries(formation).forEach(([position, value]) => {
      if (value && typeof value === 'string') {
        formationPlayerIds.push(value);
      } else if (value && typeof value === 'object') {
        // Handle pairs format
        if (value.defender) formationPlayerIds.push(value.defender);
        if (value.attacker) formationPlayerIds.push(value.attacker);
      }
    });
    
    const nonSelectedInFormation = formationPlayerIds.filter(id => !selectedSquadIds.includes(id));
    if (nonSelectedInFormation.length > 0) {
      console.warn('⚠️  [handleStartGame] Non-selected players found in formation:', nonSelectedInFormation);
    }
    
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

    // Initialize rotation queue for individual modes only if not already set by formation generator
    // For Period 1 or when formation generator hasn't provided a queue
    if ((teamConfig.substitutionType === 'individual') && rotationQueue.length === 0) {
      
      // Get field positions with formation awareness
      const formationAwareTeamConfig = getFormationAwareTeamConfig();
      
      const definition = getModeDefinition(formationAwareTeamConfig);
      const fieldPositions = definition?.fieldPositions || [];
      const substitutePositions = definition?.substitutePositions || [];
      
      
      // Get all outfield players from formation
      const fieldPlayersInFormation = fieldPositions.map(pos => formation[pos]).filter(Boolean);
      const substitutePlayersInFormation = substitutePositions.map(pos => formation[pos]).filter(Boolean);
      
      // Build proper rotation queue: field players first (ordered by time), then substitutes
      const allOutfieldPlayers = [...fieldPlayersInFormation, ...substitutePlayersInFormation];
      const outfieldPlayersWithTime = allOutfieldPlayers.map(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        return {
          id: playerId,
          totalOutfieldTime: player?.stats?.timeOnFieldSeconds || 0
        };
      });
      
      // Sort field players by most time first (ready to rotate off)
      const fieldPlayersSorted = outfieldPlayersWithTime
        .filter(p => fieldPlayersInFormation.includes(p.id))
        .sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);
      
      // Sort substitutes by least time first (ready to come on)
      const substitutePlayersSorted = outfieldPlayersWithTime
        .filter(p => substitutePlayersInFormation.includes(p.id))
        .sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
      
      // Create rotation queue: field players first, then substitutes
      const initialQueue = [...fieldPlayersSorted.map(p => p.id), ...substitutePlayersSorted.map(p => p.id)];
      
      // The first field player (most time) is next to rotate off
      const nextPlayerToRotateOff = fieldPlayersSorted[0]?.id || null;
      
      
      // Only set values if we have a complete formation
      if (nextPlayerToRotateOff && initialQueue.length >= fieldPositions.length) {
        setNextPlayerIdToSubOut(nextPlayerToRotateOff);
        setRotationQueue(initialQueue);
        
        // Update nextPlayerToSubOut to match the position of the nextPlayerIdToSubOut
        const nextPlayerPosition = fieldPositions.find(pos => formation[pos] === nextPlayerToRotateOff);
        if (nextPlayerPosition) {
          setNextPlayerToSubOut(nextPlayerPosition);
        }
        
        // Set next-next player using unified logic
        updateNextNextPlayerIfSupported(teamConfig, initialQueue, setNextNextPlayerIdToSubOut);
        
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

      const { currentRole, currentStatus, currentPairKey } = initializePlayerRoleAndStatus(
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
        stats.startedAtPosition = currentPairKey;
        stats.startedAtRole = currentRole || null;
      }

      stats.currentRole = currentRole;
      stats.currentStatus = currentStatus;
      stats.currentPairKey = currentPairKey;
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
      nextPhysicalPairToSubOut,
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
      
      if (result.newNextPhysicalPairToSubOut) {
        setNextPhysicalPairToSubOut(result.newNextPhysicalPairToSubOut);
      }
      if (result.newRotationQueue) {
        setRotationQueue(result.newRotationQueue);
      }
      if (result.newNextPlayerIdToSubOut !== undefined) {
        setNextPlayerIdToSubOut(result.newNextPlayerIdToSubOut);
      }
      if (result.newNextNextPlayerIdToSubOut !== undefined) {
        setNextNextPlayerIdToSubOut(result.newNextNextPlayerIdToSubOut);
      }
      if (result.newNextPlayerToSubOut) {
        setNextPlayerToSubOut(result.newNextPlayerToSubOut);
      }
    } catch (error) {
      console.error('Substitution failed:', error);
      // Handle error appropriately - could show a user-friendly message
    }
  };

  const handleEndPeriod = (isSubTimerPaused = false) => {
    // Auto-backup disabled to prevent localStorage quota issues
    const currentTimeEpoch = Date.now();
    const selectedSquadPlayers = getSelectedSquadPlayers(allPlayers, selectedSquadIds);
    const playerIdsInPeriod = selectedSquadPlayers.map(p => p.id);

    // Calculate updated stats
    const updatedPlayersWithFinalStats = allPlayers.map(p => {
      if (playerIdsInPeriod.includes(p.id)) {
        const stats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);

        // Update period role counts (based on final role of the period)
        // Note: With pair swapping, players can change roles mid-period, but we count
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
      name: p.name,
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
      if (currentMatchId && matchStartTime) {
        // Calculate total match duration
        const matchDurationSeconds = Math.floor((currentTimeEpoch - matchStartTime) / 1000);
        
        // Format final stats for database
        const finalStats = formatFinalStatsFromGameState({
          ownScore,
          opponentScore,
          allPlayers: updatedPlayersWithFinalStats
        }, matchDurationSeconds);

        // Update match to finished state and save player stats in background (non-blocking)
        updateMatchToFinished(currentMatchId, finalStats, updatedPlayersWithFinalStats, goalScorers, matchEvents)
          .then((result) => {
            if (!result.success) {
              console.warn('⚠️  Failed to update match to finished:', result.error);
            }
          })
          .catch((error) => {
            console.warn('⚠️  Exception during match completion:', error);
          });
      } else if (currentMatchId && !matchStartTime) {
        console.warn('⚠️  Cannot complete match: missing match start time');
      }
      
      // Set match state to finished when last period ends
      setMatchState('finished');

      // Release wake lock when game ends
      releaseWakeLock();
      setView(VIEWS.STATS);
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


  // Team mode switching functions
  const splitPairs = useCallback(() => {
    if (teamConfig?.substitutionType !== 'pairs') return;
    
    // Import queue state utilities
    const { analyzePairsRotationState, createIndividualQueueFromPairs } = require('../game/utils/queueStateUtils');
    
    // Analyze current pairs rotation state to preserve order
    const pairsAnalysis = analyzePairsRotationState(nextPhysicalPairToSubOut, formation);
    
    setFormation(prev => {
      const newFormation = {
        goalie: prev.goalie,
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null },
        leftDefender: prev.leftPair.defender,
        rightDefender: prev.rightPair.defender,
        leftAttacker: prev.leftPair.attacker,
        rightAttacker: prev.rightPair.attacker,
        substitute_1: prev.subPair.defender,
        substitute_2: prev.subPair.attacker,
      };
      return newFormation;
    });

    // Update player stats - change currentPairKey to individual positions
    setAllPlayers(prev => prev.map(p => {
      if (!selectedSquadIds.includes(p.id)) return p;
      
      const stats = { ...p.stats };
      
      // Map pair keys to individual keys
      if (stats.currentPairKey === 'leftPair') {
        if (p.id === formation.leftPair.defender) {
          stats.currentPairKey = 'leftDefender';
        } else if (p.id === formation.leftPair.attacker) {
          stats.currentPairKey = 'leftAttacker';
        }
      } else if (stats.currentPairKey === 'rightPair') {
        if (p.id === formation.rightPair.defender) {
          stats.currentPairKey = 'rightDefender';
        } else if (p.id === formation.rightPair.attacker) {
          stats.currentPairKey = 'rightAttacker';
        }
      } else if (stats.currentPairKey === 'subPair') {
        if (p.id === formation.subPair.defender) {
          stats.currentPairKey = 'substitute_1';
        } else if (p.id === formation.subPair.attacker) {
          stats.currentPairKey = 'substitute_2';
        }
      }
      
      return { ...p, stats };
    }));

    // Update team config to individual mode
    const newTeamConfig = createTeamConfig(teamConfig?.format || FORMATS.FORMAT_5V5, 7, selectedFormation, 'individual');
    updateTeamConfig(newTeamConfig);
    
    // Create individual rotation queue that preserves pairs rotation order
    const individualQueue = createIndividualQueueFromPairs(pairsAnalysis, {
      leftPair: formation.leftPair,
      rightPair: formation.rightPair,
      subPair: formation.subPair
    });
    
    setRotationQueue(individualQueue.queue);
    setNextPlayerIdToSubOut(individualQueue.nextPlayerId);
    setNextNextPlayerIdToSubOut(individualQueue.nextNextPlayerId);
    setNextPlayerToSubOut('leftDefender');
  }, [teamConfig, selectedSquadIds, formation, nextPhysicalPairToSubOut, selectedFormation, updateTeamConfig, setAllPlayers]);

  const formPairs = useCallback(() => {
    if (teamConfig?.substitutionType !== 'individual' || teamConfig?.squadSize !== 7) return;
    
    // Check for inactive players in the selected squad
    if (hasInactivePlayersInSquad(allPlayers, selectedSquadIds)) {
      alert('Cannot form pairs while there are inactive players. Please activate all players first.');
      return;
    }
    
    // Import queue state utilities
    const { analyzePairsFromIndividualQueue } = require('../game/utils/queueStateUtils');
    
    // Analyze current individual rotation queue to determine pairs rotation
    const pairsAnalysis = analyzePairsFromIndividualQueue(rotationQueue, formation);
    
    setFormation(prev => {
      const newFormation = {
        goalie: prev.goalie,
        leftPair: { 
          defender: prev.leftDefender,
          attacker: prev.leftAttacker
        },
        rightPair: { 
          defender: prev.rightDefender,
          attacker: prev.rightAttacker
        },
        subPair: { 
          defender: prev.substitute_1,
          attacker: prev.substitute_2
        },
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute_1: null,
        substitute_2: null,
      };
      return newFormation;
    });

    // Update player stats - change currentPairKey to pair keys
    setAllPlayers(prev => prev.map(p => {
      if (!selectedSquadIds.includes(p.id)) return p;
      
      const stats = { ...p.stats };
      
      // Map individual keys to pair keys
      if (stats.currentPairKey === 'leftDefender' || stats.currentPairKey === 'leftAttacker') {
        stats.currentPairKey = 'leftPair';
      } else if (stats.currentPairKey === 'rightDefender' || stats.currentPairKey === 'rightAttacker') {
        stats.currentPairKey = 'rightPair';
      } else if (stats.currentPairKey === 'substitute_1' || stats.currentPairKey === 'substitute_2') {
        stats.currentPairKey = 'subPair';
      }
      
      return { ...p, stats };
    }));

    // Update team config to pairs mode
    const newTeamConfig = createTeamConfig(teamConfig?.format || FORMATS.FORMAT_5V5, 7, selectedFormation, 'pairs');
    updateTeamConfig(newTeamConfig);
    
    // Set the next pair to rotate based on individual queue analysis
    setNextPhysicalPairToSubOut(pairsAnalysis.nextPair);
    setRotationQueue([]);
    setNextPlayerIdToSubOut(null);
    setNextNextPlayerIdToSubOut(null);
    setNextPlayerToSubOut(null);
  }, [teamConfig, selectedSquadIds, allPlayers, rotationQueue, formation, selectedFormation, updateTeamConfig, setAllPlayers]);

  // Enhanced setters for manual selection - rotation logic already handles sequence correctly
  const setNextPhysicalPairToSubOutWithRotation = useCallback((newPairKey) => {
    setNextPhysicalPairToSubOut(newPairKey);
    // The existing rotation logic in handleSubstitution will continue from this selection
  }, []);

  const setNextPlayerToSubOutWithRotation = useCallback((newPosition, isAutomaticUpdate = true) => {
    setNextPlayerToSubOut(newPosition);
    
    // Only auto-update player ID for manual user selection, not during automatic substitution calculations
    if (!isAutomaticUpdate && formation && formation[newPosition]) {
      const selectedPlayerId = formation[newPosition];
      const currentNextPlayerId = nextPlayerIdToSubOut;
      
      setNextPlayerIdToSubOut(selectedPlayerId);
      
      // For modes that support next-next indicators, update rotation queue and next-next tracking
      if (supportsNextNextIndicators(teamConfig) && selectedPlayerId !== currentNextPlayerId) {
        // Update rotation queue to put selected player first
        setRotationQueue(prev => {
          const queueManager = createRotationQueue(prev, createPlayerLookup(allPlayers));
          queueManager.initialize();
          
          // Move selected player to front of rotation queue
          queueManager.removePlayer(selectedPlayerId);
          queueManager.addPlayer(selectedPlayerId, 0); // Add to front
          
          const updatedQueue = queueManager.toArray();
          
          // Update next-next tracking to reflect new queue order using unified logic
          updateNextNextPlayerIfSupported(teamConfig, updatedQueue, setNextNextPlayerIdToSubOut);
          
          return updatedQueue;
        });
      }
    }
  }, [formation, teamConfig, nextPlayerIdToSubOut, allPlayers]);


  // Helper function to get inactive players for animation purposes
  const getInactivePlayerPosition = useCallback((playerId) => {
    const player = findPlayerById(allPlayers, playerId);
    return player?.stats.currentPairKey;
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

    const player1Position = player1.stats.currentPairKey;
    const player2Position = player2.stats.currentPairKey;

    // Don't allow switching if either player is not currently on field or substitute
    const currentValidPositions = getValidPositions(teamConfig);
    if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
      console.warn('One or both players are not in valid positions for switching');
      return false;
    }

    // Update period formation by swapping positions
    setFormation(prev => {
      const newFormation = { ...prev };
      
      if (teamConfig.substitutionType === 'pairs') {
        // Handle pairs formation
        if (player1Position === 'leftPair') {
          if (prev.leftPair.defender === player1Id) {
            newFormation.leftPair = { ...prev.leftPair, defender: player2Id };
          } else if (prev.leftPair.attacker === player1Id) {
            newFormation.leftPair = { ...prev.leftPair, attacker: player2Id };
          }
        } else if (player1Position === 'rightPair') {
          if (prev.rightPair.defender === player1Id) {
            newFormation.rightPair = { ...prev.rightPair, defender: player2Id };
          } else if (prev.rightPair.attacker === player1Id) {
            newFormation.rightPair = { ...prev.rightPair, attacker: player2Id };
          }
        } else if (player1Position === 'subPair') {
          if (prev.subPair.defender === player1Id) {
            newFormation.subPair = { ...prev.subPair, defender: player2Id };
          } else if (prev.subPair.attacker === player1Id) {
            newFormation.subPair = { ...prev.subPair, attacker: player2Id };
          }
        }

        if (player2Position === 'leftPair') {
          if (prev.leftPair.defender === player2Id) {
            newFormation.leftPair = { ...newFormation.leftPair, defender: player1Id };
          } else if (prev.leftPair.attacker === player2Id) {
            newFormation.leftPair = { ...newFormation.leftPair, attacker: player1Id };
          }
        } else if (player2Position === 'rightPair') {
          if (prev.rightPair.defender === player2Id) {
            newFormation.rightPair = { ...newFormation.rightPair, defender: player1Id };
          } else if (prev.rightPair.attacker === player2Id) {
            newFormation.rightPair = { ...newFormation.rightPair, attacker: player1Id };
          }
        } else if (player2Position === 'subPair') {
          if (prev.subPair.defender === player2Id) {
            newFormation.subPair = { ...newFormation.subPair, defender: player1Id };
          } else if (prev.subPair.attacker === player2Id) {
            newFormation.subPair = { ...newFormation.subPair, attacker: player1Id };
          }
        }
      } else {
        // Handle individual formations (6-player and 7-player)
        // Simply swap the position assignments
        newFormation[player1Position] = player2Id;
        newFormation[player2Position] = player1Id;
      }
      
      return newFormation;
    });

    // Update player stats to reflect new positions and handle role changes
    const currentTimeEpoch = Date.now();
    setAllPlayers(prev => prev.map(p => {
      if (p.id === player1Id) {
        // Determine the new role for player1 based on their new position
        let newRole = p.stats.currentRole; // Default to current role
        
        if (teamConfig.substitutionType === 'pairs') {
          // For pairs, we need to determine the new role based on what position they took in the new pair
          // Since this is a position switch, player1 takes player2's role and vice versa
          newRole = player2.stats.currentRole;
        } else {
          // For individual formations, use centralized role determination
          newRole = getPositionRole(player2Position) || newRole;
        }
        
        return { 
          ...p, 
          stats: {
            ...handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused),
            currentPairKey: player2Position
          }
        };
      }
      if (p.id === player2Id) {
        // Determine the new role for player2 based on their new position
        let newRole = p.stats.currentRole; // Default to current role
        
        if (teamConfig.substitutionType === 'pairs') {
          // For pairs, player2 takes player1's role
          newRole = player1.stats.currentRole;
        } else {
          // For individual formations, use centralized role determination
          newRole = getPositionRole(player1Position) || newRole;
        }
        
        return { 
          ...p, 
          stats: {
            ...handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused),
            currentPairKey: player1Position
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

    const newGoaliePosition = newGoalie.stats.currentPairKey;

    // Update period formation
    setFormation(prev => {
      const newFormation = { ...prev };
      
      // Set new goalie
      newFormation.goalie = newGoalieId;
      
      // Place current goalie in the position of the new goalie
      if (teamConfig.substitutionType === 'pairs') {
        // Handle pairs formation
        if (newGoaliePosition === 'leftPair') {
          if (prev.leftPair.defender === newGoalieId) {
            newFormation.leftPair = { ...prev.leftPair, defender: formation.goalie };
          } else if (prev.leftPair.attacker === newGoalieId) {
            newFormation.leftPair = { ...prev.leftPair, attacker: formation.goalie };
          }
        } else if (newGoaliePosition === 'rightPair') {
          if (prev.rightPair.defender === newGoalieId) {
            newFormation.rightPair = { ...prev.rightPair, defender: formation.goalie };
          } else if (prev.rightPair.attacker === newGoalieId) {
            newFormation.rightPair = { ...prev.rightPair, attacker: formation.goalie };
          }
        } else if (newGoaliePosition === 'subPair') {
          if (prev.subPair.defender === newGoalieId) {
            newFormation.subPair = { ...prev.subPair, defender: formation.goalie };
          } else if (prev.subPair.attacker === newGoalieId) {
            newFormation.subPair = { ...prev.subPair, attacker: formation.goalie };
          }
        }
      } else {
        // Handle individual formations (6-player and 7-player)
        newFormation[newGoaliePosition] = formation.goalie;
      }
      
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
        let newRole = PLAYER_ROLES.DEFENDER; // Default
        let newStatus = PLAYER_STATUS.ON_FIELD; // Default
        
        if (teamConfig.substitutionType === 'pairs') {
          if (newGoaliePosition === 'leftPair' || newGoaliePosition === 'rightPair') {
            // Field positions
            const pairData = formation[newGoaliePosition];
            if (pairData) {
              if (pairData.defender === newGoalieId) {
                newRole = PLAYER_ROLES.DEFENDER;
              } else if (pairData.attacker === newGoalieId) {
                newRole = PLAYER_ROLES.ATTACKER;
              }
            }
            newStatus = PLAYER_STATUS.ON_FIELD;
          } else if (newGoaliePosition === 'subPair') {
            // Substitute position
            const pairData = formation[newGoaliePosition];
            if (pairData) {
              if (pairData.defender === newGoalieId) {
                newRole = PLAYER_ROLES.DEFENDER;
              } else if (pairData.attacker === newGoalieId) {
                newRole = PLAYER_ROLES.ATTACKER;
              }
            }
            newStatus = PLAYER_STATUS.SUBSTITUTE;
          }
        } else {
          // Individual formations - use centralized role determination
          newRole = getPositionRole(newGoaliePosition) || PLAYER_ROLES.DEFENDER; // Default to defender
          newStatus = newGoaliePosition.includes('substitute') ? PLAYER_STATUS.SUBSTITUTE : PLAYER_STATUS.ON_FIELD;
        }
        
        // Handle role change from goalie to new position
        const newStats = handleRoleChange(
          { ...p, stats: updatedStats },
          newRole,
          currentTimeEpoch,
          isSubTimerPaused
        );
        
        // Update status and position
        newStats.currentStatus = newStatus;
        newStats.currentPairKey = newGoaliePosition;
        
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
        newStats.currentPairKey = 'goalie';
        
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
  }, [allPlayers, formation, teamConfig, setAllPlayers, setFormation, setRotationQueue]);

  // Helper function to get all outfield players (excludes goalie)
  const getOutfieldPlayersForGame = useCallback(() => {
    return getOutfieldPlayers(allPlayers, selectedSquadIds, formation.goalie);
  }, [allPlayers, selectedSquadIds, formation.goalie]);


  // Navigation to match report
  const navigateToMatchReport = useCallback(() => {
    // Sync match data before showing report
    syncMatchDataFromEventLogger();
    
    // Use navigation system if available, otherwise fall back to direct setView
    if (navigateToView) {
      const success = navigateToView(VIEWS.MATCH_REPORT);
      
      // If navigation system failed or returned false, use direct setView as fallback
      if (!success) {
        setView(VIEWS.MATCH_REPORT);
      }
    } else {
      setView(VIEWS.MATCH_REPORT);
    }
  }, [syncMatchDataFromEventLogger, navigateToView]);

  // Captain management functions

  // Save Configuration handler for ConfigurationScreen - extracts database save logic without navigation
  const handleSaveConfiguration = useCallback(async () => {
    // Validation
    if (selectedSquadIds.length < minimumPlayersForFormat || selectedSquadIds.length > maximumPlayersForMatch) {
      return { success: false, error: `Please select between ${minimumPlayersForFormat} and ${maximumPlayersForMatch} players for the squad.` };
    }
    // Skip save if no team context
    if (!currentTeam?.id) {
      return { success: false, error: "Team context required for saving configuration." };
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
        ? { success: true, message: result.message }
        : { success: false, error: result.error };
        
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      return { success: false, error: 'Failed to save configuration: ' + error.message };
    }
  }, [selectedSquadIds, numPeriods, periodGoalieIds, currentTeam, teamConfig, selectedFormation, 
      periodDurationMinutes, opponentTeam, captainId, matchType, venueType, currentMatchId, matchCreated,
      formation, allPlayers, minimumPlayersForFormat, maximumPlayersForMatch]);

  // Save Period Configuration handler for PeriodSetupScreen - extracts database save logic without navigation
  // Shared function for saving match configuration (used by both handleStartGame and handleSavePeriodConfiguration)
  const saveMatchConfiguration = useCallback(async (options = {}) => {
    const { shouldNavigate = false } = options;
    
    // Validation based on team mode (same as handleStartGame)
    const formationAwareConfig = getFormationAwareTeamConfig();

    if (teamConfig.substitutionType === 'pairs') {
      const allOutfieldersInFormation = [
        formation.leftPair.defender, formation.leftPair.attacker,
        formation.rightPair.defender, formation.rightPair.attacker,
        formation.subPair.defender, formation.subPair.attacker,
      ].filter(Boolean);
      if (new Set(allOutfieldersInFormation).size !== 6 || !formation.goalie) {
        const errorMessage = "Please complete the team formation with 1 goalie and 6 unique outfield players in pairs.";
        if (shouldNavigate) {
          alert(errorMessage);
          return { success: false, error: errorMessage };
        }
        return { success: false, error: errorMessage };
      }
    } else if (teamConfig.substitutionType === 'individual') {
      if (!formationAwareConfig) {
        return { success: false, error: "Please complete the formation assignment." };
      }

      const modeDefinition = getModeDefinition(formationAwareConfig);
      if (!modeDefinition) {
        return { success: false, error: "Please complete the formation assignment." };
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
        const errorMessage = "Please assign all positions including goalie.";
        if (shouldNavigate) {
          alert(errorMessage);
          return { success: false, error: errorMessage };
        }
        return { success: false, error: errorMessage };
      }
    }

    // Skip save if no current match
    if (!currentMatchId) {
      return { success: false, error: "No active match to save." };
    }

    try {
      const currentTimeEpoch = Date.now();
      
      // Create formation-aware team config for role initialization
      const formationAwareTeamConfig = getFormationAwareTeamConfig();
      
      // Update player states (same logic as handleStartGame)
      const updatedPlayers = allPlayers.map(p => {
        if (selectedSquadIds.includes(p.id)) {
          const { currentRole, currentStatus, currentPairKey } = initializePlayerRoleAndStatus(p.id, formation, formationAwareTeamConfig);
          const stats = { ...p.stats };
          
          // Set participation markers for database insertion (same logic as handleStartGame)
          if (!stats.startLocked) {
            let newStartedMatchAs = null;
            if (currentStatus === PLAYER_STATUS.GOALIE) newStartedMatchAs = PLAYER_ROLES.GOALIE;
            else if (currentStatus === PLAYER_STATUS.ON_FIELD) newStartedMatchAs = PLAYER_ROLES.FIELD_PLAYER;
            else if (currentStatus === PLAYER_STATUS.SUBSTITUTE) newStartedMatchAs = PLAYER_ROLES.SUBSTITUTE;
            
            stats.startedMatchAs = newStartedMatchAs;
            // Store the specific formation position for formation-aware role mapping
            stats.startedAtPosition = currentPairKey;
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
              currentPairKey: findPlayerPairKey(
                p.id,
                formation,
                teamConfig.substitutionType === 'pairs',
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
          squadSize: formationAwareTeamConfig.squadSize,
          substitutionType: formationAwareTeamConfig.substitutionType,
          pairRoleRotation: formationAwareTeamConfig.pairRoleRotation || "keep_throughout_period"
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
          ? `Configuration saved${errors.length ? ' (with warnings)' : ''}`
          : 'Failed to save configuration',
        error: errors.length ? errors.join(', ') : undefined
      };
    } catch (error) {
      console.error('❌ Error saving match configuration:', error);
      return { success: false, error: 'Failed to save configuration: ' + error.message };
    }
  }, [formation, teamConfig, selectedFormation, currentMatchId, allPlayers, selectedSquadIds,
      numPeriods, periodDurationMinutes, opponentTeam, captainId, matchType, venueType, currentTeam?.id, periodGoalieIds,
      currentPeriodNumber, matchCreated, setMatchCreated, setCurrentMatchId, setAllPlayers, getFormationAwareTeamConfig]);

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
    nextPhysicalPairToSubOut,
    setNextPhysicalPairToSubOut: setNextPhysicalPairToSubOutWithRotation,
    nextPlayerToSubOut,
    setNextPlayerToSubOut: setNextPlayerToSubOutWithRotation,
    nextPlayerIdToSubOut,
    setNextPlayerIdToSubOut,
    nextNextPlayerIdToSubOut,
    setNextNextPlayerIdToSubOut,
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
    
    // Match lifecycle state
    currentMatchId,
    setCurrentMatchId,
    matchCreated,
    setMatchCreated,
    matchState,
    setMatchState,
    hasActiveConfiguration,
    setHasActiveConfiguration,

    // Actions
    preparePeriod,
    preparePeriodWithGameLog,
    handleStartPeriodSetup,
    handleStartGame,
    handleActualMatchStart,
    handleSubstitution,
    handleEndPeriod,
    addTemporaryPlayer,
    clearStoredState,
    splitPairs,
    formPairs,
    togglePlayerInactive,
    getInactivePlayerPosition,
    switchPlayerPositions,
    switchGoalie,
    getOutfieldPlayers: getOutfieldPlayersForGame,
    addGoalScored,
    addGoalConceded,
    setScore,
    resetScore,
    navigateToMatchReport,
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
