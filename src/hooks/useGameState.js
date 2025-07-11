import { useState, useCallback, useEffect } from 'react';
import { initializePlayers } from '../utils/playerUtils';
import { initialRoster } from '../constants/defaultData';
import { PLAYER_ROLES, TEAM_MODES } from '../constants/playerConstants';
import { VIEWS } from '../constants/viewConstants';
import { generateRecommendedFormation, generateIndividualFormationRecommendation } from '../utils/formationGenerator';
import { createSubstitutionManager, handleRoleChange } from '../game/logic/substitutionManager';
import { updatePlayerTimeStats } from '../game/time/stintManager';
import { createRotationQueue } from '../game/queue/rotationQueue';
import { getPositionRole } from '../game/logic/positionUtils';
import { createGamePersistenceManager } from '../utils/persistenceManager';
import { hasInactivePlayersInSquad, createPlayerLookup, findPlayerById, getSelectedSquadPlayers, getOutfieldPlayers } from '../utils/playerUtils';
import { initializeEventLogger, getMatchStartTime, getAllEvents, clearAllEvents } from '../utils/gameEventLogger';

// PersistenceManager for handling localStorage operations
const persistenceManager = createGamePersistenceManager('dif-coach-game-state');

export function useGameState() {
  // Initialize state from PersistenceManager
  const initialState = persistenceManager.loadState();
  
  // Ensure allPlayers is initialized if not present
  if (!initialState.allPlayers || initialState.allPlayers.length === 0) {
    initialState.allPlayers = initializePlayers(initialRoster);
  }
  
  // Initialize event logger on hook initialization
  useEffect(() => {
    initializeEventLogger();
  }, []);
  
  const [allPlayers, setAllPlayers] = useState(initialState.allPlayers);
  const [view, setView] = useState(initialState.view);
  const [selectedSquadIds, setSelectedSquadIds] = useState(initialState.selectedSquadIds);
  const [numPeriods, setNumPeriods] = useState(initialState.numPeriods);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(initialState.periodDurationMinutes);
  const [periodGoalieIds, setPeriodGoalieIds] = useState(initialState.periodGoalieIds);
  const [teamMode, setTeamMode] = useState(initialState.teamMode);
  const [alertMinutes, setAlertMinutes] = useState(initialState.alertMinutes);
  const [currentPeriodNumber, setCurrentPeriodNumber] = useState(initialState.currentPeriodNumber);
  const [formation, setFormation] = useState(initialState.formation);
  const [nextPhysicalPairToSubOut, setNextPhysicalPairToSubOut] = useState(initialState.nextPhysicalPairToSubOut);
  const [nextPlayerToSubOut, setNextPlayerToSubOut] = useState(initialState.nextPlayerToSubOut);
  const [nextPlayerIdToSubOut, setNextPlayerIdToSubOut] = useState(initialState.nextPlayerIdToSubOut);
  const [nextNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut] = useState(initialState.nextNextPlayerIdToSubOut);
  const [rotationQueue, setRotationQueue] = useState(initialState.rotationQueue);
  const [gameLog, setGameLog] = useState(initialState.gameLog);
  const [opponentTeamName, setOpponentTeamName] = useState(initialState.opponentTeamName || '');
  const [homeScore, setHomeScore] = useState(initialState.homeScore || 0); // Djurgården score
  const [awayScore, setAwayScore] = useState(initialState.awayScore || 0); // Opponent score
  const [lastSubstitutionTimestamp, setLastSubstitutionTimestamp] = useState(initialState.lastSubstitutionTimestamp || null);

  // Match event tracking state - NEW for match report feature
  const [matchEvents, setMatchEvents] = useState(initialState.matchEvents || []);
  const [matchStartTime, setMatchStartTime] = useState(initialState.matchStartTime || null);
  const [goalScorers, setGoalScorers] = useState(initialState.goalScorers || {}); // { eventId: playerId }
  const [eventSequenceNumber, setEventSequenceNumber] = useState(initialState.eventSequenceNumber || 0);
  const [lastEventBackup, setLastEventBackup] = useState(initialState.lastEventBackup || null);
  const [timerPauseStartTime, setTimerPauseStartTime] = useState(initialState.timerPauseStartTime || null);
  const [totalMatchPausedDuration, setTotalMatchPausedDuration] = useState(initialState.totalMatchPausedDuration || 0);
  const [captainId, setCaptainId] = useState(initialState.captainId || null);

  // Function to sync match data from gameEventLogger
  const syncMatchDataFromEventLogger = useCallback(() => {
    const loggerStartTime = getMatchStartTime();
    const loggerEvents = getAllEvents();
    
    console.log('[DEBUG] Syncing match data from event logger:', {
      loggerStartTime,
      eventsCount: loggerEvents.length,
      currentStateStartTime: matchStartTime,
      currentStateEventsCount: matchEvents.length
    });
    
    // Special case: If logger has been cleared (no events and no start time), clear local state too
    if (!loggerStartTime && loggerEvents.length === 0 && (matchStartTime || matchEvents.length > 0)) {
      console.log('[DEBUG] Event logger appears to be cleared, clearing local state');
      setMatchStartTime(null);
      setMatchEvents([]);
      setGoalScorers({});
      return;
    }
    
    if (loggerStartTime && loggerStartTime !== matchStartTime) {
      console.log('[DEBUG] Setting matchStartTime from event logger:', loggerStartTime);
      setMatchStartTime(loggerStartTime);
    }
    
    if (loggerEvents.length !== matchEvents.length) {
      console.log('[DEBUG] Setting matchEvents from event logger:', loggerEvents.length, 'events');
      setMatchEvents(loggerEvents);
    }
  }, [matchStartTime, matchEvents]);

  // Periodic sync to ensure data consistency
  useEffect(() => {
    const interval = setInterval(() => {
      syncMatchDataFromEventLogger();
    }, 5000); // Sync every 5 seconds

    return () => clearInterval(interval);
  }, [syncMatchDataFromEventLogger]);

  // Wake lock and alert management
  const [wakeLock, setWakeLock] = useState(null);
  const [alertTimer, setAlertTimer] = useState(null);

  // Wake lock helper functions
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLock) {
      try {
        const newWakeLock = await navigator.wakeLock.request('screen');
        setWakeLock(newWakeLock);
      } catch (err) {
        console.warn('Wake lock request failed:', err);
      }
    }
  }, [wakeLock]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
      } catch (err) {
        console.warn('Wake lock release failed:', err);
      }
    }
  }, [wakeLock]);

  // Alert timer helper functions
  const clearAlertTimer = useCallback(() => {
    if (alertTimer) {
      clearTimeout(alertTimer);
      setAlertTimer(null);
    }
  }, [alertTimer]);

  const startAlertTimer = useCallback(() => {
    if (alertMinutes > 0) {
      clearAlertTimer();
      const timeoutMs = alertMinutes * 60 * 1000;
      const newTimer = setTimeout(() => {
        if ('vibrate' in navigator) {
          navigator.vibrate([1000, 200, 1000]);
        }
      }, timeoutMs);
      setAlertTimer(newTimer);
    }
  }, [alertMinutes, clearAlertTimer]);

  // Save state to localStorage whenever it changes - NOTE: Critical for refresh persistence
  useEffect(() => {
    const currentState = {
      allPlayers,
      view,
      selectedSquadIds,
      numPeriods,
      periodDurationMinutes,
      periodGoalieIds,
      teamMode,
      alertMinutes,
      currentPeriodNumber,
      formation,
      nextPhysicalPairToSubOut,
      nextPlayerToSubOut,
      nextPlayerIdToSubOut,
      nextNextPlayerIdToSubOut,
      rotationQueue,
      gameLog,
      opponentTeamName,
      homeScore,
      awayScore,
      lastSubstitutionTimestamp,
      // NEW: Match event tracking state
      matchEvents,
      matchStartTime,
      goalScorers,
      eventSequenceNumber,
      lastEventBackup,
      timerPauseStartTime,
      totalMatchPausedDuration,
      captainId,
    };
    
    // Use the persistence manager's saveGameState method
    persistenceManager.saveGameState(currentState);
  }, [allPlayers, view, selectedSquadIds, numPeriods, periodDurationMinutes, periodGoalieIds, teamMode, alertMinutes, currentPeriodNumber, formation, nextPhysicalPairToSubOut, nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, rotationQueue, gameLog, opponentTeamName, homeScore, awayScore, lastSubstitutionTimestamp, matchEvents, matchStartTime, goalScorers, eventSequenceNumber, lastEventBackup, timerPauseStartTime, totalMatchPausedDuration, captainId]);



  const preparePeriodWithGameLog = useCallback((periodNum, gameLogToUse) => {
    const currentGoalieId = periodGoalieIds[periodNum];

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
      if (teamMode === TEAM_MODES.PAIRS_7) {
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
        
        // DEBUG: Log pairs formation
        console.log('[DEBUG] useGameState - Setting PAIRS formation:', pairsFormation);
        
        setFormation(pairsFormation);
        setNextPhysicalPairToSubOut(firstToSubRec); // 'leftPair' or 'rightPair'
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        // 6-player individual formation generation using new logic
        const result = generateIndividualFormationRecommendation(
          currentGoalieId,
          playersWithLastPeriodStats,
          selectedSquadIds.map(id => allPlayers.find(p => p.id === id)),
          'INDIVIDUAL_6'
        );

        // DEBUG: Log INDIVIDUAL_6 formation generation result
        console.log('[DEBUG] useGameState - INDIVIDUAL_6 formation result:', result);
        
        const individual6Formation = {
          goalie: currentGoalieId,
          leftDefender: result.formation.leftDefender,
          rightDefender: result.formation.rightDefender,
          leftAttacker: result.formation.leftAttacker,
          rightAttacker: result.formation.rightAttacker,
          substitute_1: result.formation.substitute_1,
        };
        
        console.log('[DEBUG] useGameState - Setting INDIVIDUAL_6 formation:', individual6Formation);
        
        setFormation(individual6Formation);
        
        // Set next player to substitute off (player with most field time)
        setNextPlayerIdToSubOut(result.nextToRotateOff);
        
        // Find the position of the next player to substitute
        const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
        const playerPosition = positions.find(pos => result.formation[pos] === result.nextToRotateOff);
        setNextPlayerToSubOut(playerPosition || 'leftDefender');
        
        // Set rotation queue
        setRotationQueue(result.rotationQueue);
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_7) {
        // 7-player individual formation generation using new logic
        const result = generateIndividualFormationRecommendation(
          currentGoalieId,
          playersWithLastPeriodStats,
          selectedSquadIds.map(id => allPlayers.find(p => p.id === id)),
          'INDIVIDUAL_7'
        );

        // DEBUG: Log INDIVIDUAL_7 formation generation result
        console.log('[DEBUG] useGameState - INDIVIDUAL_7 formation result:', result);
        
        const individual7Formation = {
          goalie: currentGoalieId,
          leftDefender: result.formation.leftDefender,
          rightDefender: result.formation.rightDefender,
          leftAttacker: result.formation.leftAttacker,
          rightAttacker: result.formation.rightAttacker,
          substitute_1: result.formation.substitute_1,
          substitute_2: result.formation.substitute_2,
        };
        
        console.log('[DEBUG] useGameState - Setting INDIVIDUAL_7 formation:', individual7Formation);
        
        setFormation(individual7Formation);
        
        // Set next player to substitute off (player with most field time)
        setNextPlayerIdToSubOut(result.nextToRotateOff);
        
        // Find the position of the next player to substitute
        const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
        const playerPosition = positions.find(pos => result.formation[pos] === result.nextToRotateOff);
        setNextPlayerToSubOut(playerPosition || 'leftDefender');
        
        // Set rotation queue
        setRotationQueue(result.rotationQueue);
        
        // Set next-next player (second in rotation queue)
        if (result.rotationQueue.length >= 2) {
          setNextNextPlayerIdToSubOut(result.rotationQueue[1]);
        }
      }

    } else {
      // For P1, or if recommendations fail, reset formation (user fills manually)
      if (teamMode === TEAM_MODES.PAIRS_7) {
        setFormation({
          goalie: currentGoalieId,
          leftPair: { defender: null, attacker: null },
          rightPair: { defender: null, attacker: null },
          subPair: { defender: null, attacker: null },
        });
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        setFormation({
          goalie: currentGoalieId,
          leftDefender: null,
          rightDefender: null,
          leftAttacker: null,
          rightAttacker: null,
          substitute_1: null,
        });
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_7) {
        setFormation({
          goalie: currentGoalieId,
          leftDefender: null,
          rightDefender: null,
          leftAttacker: null,
          rightAttacker: null,
          substitute_1: null,
          substitute_2: null,
        });
      }
      setNextPhysicalPairToSubOut('leftPair');
      
      // Initialize next player and rotation queue for individual modes in P1
      if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        setNextPlayerToSubOut('leftDefender');
        // Initialize basic rotation queue for Period 1 (will be filled when game starts)
        setRotationQueue([]);
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_7) {
        setNextPlayerToSubOut('leftDefender');
        // Initialize basic rotation queue for Period 1 (will be filled when game starts)
        setRotationQueue([]);
      }
    }
  }, [periodGoalieIds, selectedSquadIds, allPlayers, teamMode]);

  const preparePeriod = useCallback((periodNum) => {
    preparePeriodWithGameLog(periodNum, gameLog);
  }, [preparePeriodWithGameLog, gameLog]);

  const handleStartPeriodSetup = useCallback(() => {
    if (selectedSquadIds.length !== 7 && selectedSquadIds.length !== 6) {
      alert("Please select exactly 6 or 7 players for the squad."); // Replace with modal
      return;
    }
    const goaliesAssigned = Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean);
    if (!goaliesAssigned) {
      alert("Please assign a goalie for each period."); // Replace with modal
      return;
    }

    // Create auto-backup before starting game
    persistenceManager.autoBackup();

    // Reset player stats for the new game for the selected squad
    setAllPlayers(prev => prev.map(p => {
      if (selectedSquadIds.includes(p.id)) {
        return {
          ...p,
          stats: initializePlayers([p.name])[0].stats // Reset stats
        };
      }
      return p;
    }));

    setCurrentPeriodNumber(1);
    setGameLog([]); // Clear game log for new game
    preparePeriod(1);
    setView(VIEWS.PERIOD_SETUP);
  }, [selectedSquadIds, numPeriods, periodGoalieIds, preparePeriod]);

  const handleStartGame = () => {
    // Validate formation based on team mode
    
    if (teamMode === TEAM_MODES.PAIRS_7) {
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
    } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
      // 6-player individual validation
      const allOutfieldersInFormation = [
        formation.leftDefender, formation.rightDefender,
        formation.leftAttacker, formation.rightAttacker,
        formation.substitute,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 5 || !formation.goalie) {
        alert("Please complete the team formation with 1 goalie and 5 unique outfield players."); // Replace with modal
        return;
      }
    } else if (teamMode === TEAM_MODES.INDIVIDUAL_7) {
      // 7-player individual validation
      const allOutfieldersInFormation = [
        formation.leftDefender, formation.rightDefender,
        formation.leftAttacker, formation.rightAttacker,
        formation.substitute_1, formation.substitute_2,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 6 || !formation.goalie) {
        alert("Please complete the team formation with 1 goalie and 6 unique outfield players."); // Replace with modal
        return;
      }
    }

    const currentTimeEpoch = Date.now();
    // Initialize player statuses and roles for the period
    setAllPlayers(prevPlayers => prevPlayers.map(p => {
      let role = null;
      let status = null;
      let pairKey = null;

      if (p.id === formation.goalie) {
        role = PLAYER_ROLES.GOALIE;
        status = 'goalie';
      } else if (teamMode === TEAM_MODES.PAIRS_7) {
        // 7-player pairs logic
        if (p.id === formation.leftPair.defender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'leftPair';
        } else if (p.id === formation.leftPair.attacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'leftPair';
        } else if (p.id === formation.rightPair.defender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'rightPair';
        } else if (p.id === formation.rightPair.attacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'rightPair';
        } else if (p.id === formation.subPair.defender) {
          role = PLAYER_ROLES.DEFENDER; status = 'substitute'; pairKey = 'subPair';
        } else if (p.id === formation.subPair.attacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'substitute'; pairKey = 'subPair';
        }
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        // 6-player individual logic
        if (p.id === formation.leftDefender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'leftDefender';
        } else if (p.id === formation.rightDefender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'rightDefender';
        } else if (p.id === formation.leftAttacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'leftAttacker';
        } else if (p.id === formation.rightAttacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'rightAttacker';
        } else if (p.id === formation.substitute) {
          role = PLAYER_ROLES.SUBSTITUTE; status = 'substitute'; pairKey = 'substitute';
        }
      } else if (teamMode === TEAM_MODES.INDIVIDUAL_7) {
        // 7-player individual logic
        if (p.id === formation.leftDefender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'leftDefender';
        } else if (p.id === formation.rightDefender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'rightDefender';
        } else if (p.id === formation.leftAttacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'leftAttacker';
        } else if (p.id === formation.rightAttacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'rightAttacker';
        } else if (p.id === formation.substitute_1) {
          role = PLAYER_ROLES.SUBSTITUTE; status = 'substitute'; pairKey = 'substitute_1';
        } else if (p.id === formation.substitute_2) {
          role = PLAYER_ROLES.SUBSTITUTE; status = 'substitute'; pairKey = 'substitute_2';
        }
      }

      if (selectedSquadIds.includes(p.id)) {
        const initialStats = { ...p.stats };
        if (currentPeriodNumber === 1 && !initialStats.startedMatchAs) {
          if (status === 'goalie') initialStats.startedMatchAs = PLAYER_ROLES.GOALIE;
          else if (status === 'on_field') initialStats.startedMatchAs = PLAYER_ROLES.ON_FIELD;
          else if (status === 'substitute') initialStats.startedMatchAs = PLAYER_ROLES.SUBSTITUTE;
        }
        return {
          ...p,
          stats: {
            ...initialStats,
            currentRole: role,
            currentStatus: status,
            lastStintStartTimeEpoch: currentTimeEpoch,
            currentPairKey: pairKey,
          }
        };
      }
      return p;
    }));

    // Initialize rotation queue for individual modes only if not already set by formation generator
    // For Period 1 or when formation generator hasn't provided a queue
    if (teamMode === TEAM_MODES.INDIVIDUAL_6 && nextPlayerToSubOut && rotationQueue.length === 0) {
      const initialPlayerToSubOut = formation[nextPlayerToSubOut];
      setNextPlayerIdToSubOut(initialPlayerToSubOut);
      
      // Fallback: Initialize rotation queue with basic positional order for Period 1
      const outfieldPositions = ['leftDefender', 'leftAttacker', 'rightDefender', 'rightAttacker', 'substitute_1'];
      const initialQueue = outfieldPositions.map(pos => formation[pos]).filter(Boolean);
      setRotationQueue(initialQueue);
    } else if (teamMode === TEAM_MODES.INDIVIDUAL_7 && nextPlayerToSubOut && rotationQueue.length === 0) {
      // Fallback: Initialize for 7-player individual mode only if formation generator hasn't set it
      const initialPlayerToSubOut = formation[nextPlayerToSubOut];
      
      // Basic positional order for Period 1
      const outfieldPositions = ['leftDefender', 'leftAttacker', 'rightDefender', 'rightAttacker', 'substitute_1', 'substitute_2'];
      const initialQueue = outfieldPositions.map(pos => formation[pos]).filter(Boolean);
      
      // Only set values if we have a complete formation
      if (initialPlayerToSubOut && initialQueue.length === 6) {
        setNextPlayerIdToSubOut(initialPlayerToSubOut);
        setRotationQueue(initialQueue);
        
        // Set next-next player (second in queue) for 7-player individual mode
        if (initialQueue.length >= 2) {
          setNextNextPlayerIdToSubOut(initialQueue[1]);
        }
      }
    }

    setView(VIEWS.GAME);
    
    // Sync match data after game starts (small delay to ensure events are logged)
    setTimeout(() => {
      syncMatchDataFromEventLogger();
    }, 100);
  };

  const handleSubstitution = (isSubTimerPaused = false) => {
    const currentTimeEpoch = Date.now();
    setLastSubstitutionTimestamp(currentTimeEpoch);

    // Request wake lock and start alert timer
    requestWakeLock();
    startAlertTimer();

    const substitutionManager = createSubstitutionManager(teamMode);
    
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
    // Create auto-backup before ending period
    persistenceManager.autoBackup();
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
    const currentPlayersSnapshot = updatedPlayersWithFinalStats.map(p => ({
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
      // Release wake lock when game ends
      clearAlertTimer();
      releaseWakeLock();
      setView(VIEWS.STATS);
    }
  };

  // Add temporary player
  const addTemporaryPlayer = useCallback((playerName) => {
    const newPlayerId = `temp_${Date.now()}`;
    const newPlayer = {
      id: newPlayerId,
      name: playerName,
      stats: initializePlayers([playerName])[0].stats
    };
    
    setAllPlayers(prev => [...prev, newPlayer]);
    setSelectedSquadIds(prev => [...prev, newPlayerId]);
  }, []);

  // Enhanced clear stored state with backup
  const clearStoredState = useCallback(() => {
    // Clear all game events from event logger
    console.log('[DEBUG] useGameState.clearStoredState - Clearing all game events');
    const eventsCleared = clearAllEvents();
    if (eventsCleared) {
      console.log('[DEBUG] Game events cleared successfully');
      
      // Reset local match state variables
      setMatchEvents([]);
      setMatchStartTime(null);
      setGoalScorers({});
      setEventSequenceNumber(0);
      setLastEventBackup(null);
      console.log('[DEBUG] Local match state variables reset');
    } else {
      console.warn('[DEBUG] Failed to clear game events');
    }
    
    // Create backup before clearing
    persistenceManager.createBackup();
    // Clear the state
    const result = persistenceManager.clearState();
    if (result) {
      console.log('Game state cleared successfully');
    } else {
      console.warn('Failed to clear game state');
    }
    
    return result;
  }, []);

  // Enhanced backup management
  const createManualBackup = useCallback(() => {
    const backupKey = persistenceManager.createBackup();
    if (backupKey) {
      // Clean up old backups, keep 5 most recent
      persistenceManager.cleanupBackups(5);
    }
    return backupKey;
  }, []);

  const listAvailableBackups = useCallback(() => {
    return persistenceManager.listBackups();
  }, []);

  const restoreFromBackup = useCallback((backupKey) => {
    const result = persistenceManager.restoreFromBackup(backupKey);
    if (result) {
      // Reload the page to refresh all state
      window.location.reload();
    }
    return result;
  }, []);

  const getStorageInfo = useCallback(() => {
    return persistenceManager.getStorageInfo();
  }, []);

  // Team mode switching functions
  const splitPairs = useCallback(() => {
    if (teamMode !== TEAM_MODES.PAIRS_7) return;
    
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

    // Update team mode
    setTeamMode(TEAM_MODES.INDIVIDUAL_7);
    
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
  }, [teamMode, selectedSquadIds, formation, nextPhysicalPairToSubOut]);

  const formPairs = useCallback(() => {
    if (teamMode !== TEAM_MODES.INDIVIDUAL_7) return;
    
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

    // Update team mode
    setTeamMode(TEAM_MODES.PAIRS_7);
    
    // Set the next pair to rotate based on individual queue analysis
    setNextPhysicalPairToSubOut(pairsAnalysis.nextPair);
    setRotationQueue([]);
    setNextPlayerIdToSubOut(null);
    setNextNextPlayerIdToSubOut(null);
    setNextPlayerToSubOut(null);
  }, [teamMode, selectedSquadIds, allPlayers, rotationQueue, formation]);

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
      
      // For 7-player individual mode, update rotation queue and next-next tracking
      if (teamMode === TEAM_MODES.INDIVIDUAL_7 && selectedPlayerId !== currentNextPlayerId) {
        // Update rotation queue to put selected player first
        setRotationQueue(prev => {
          const queueManager = createRotationQueue(prev, createPlayerLookup(allPlayers));
          queueManager.initialize();
          
          // Move selected player to front of rotation queue
          queueManager.removePlayer(selectedPlayerId);
          queueManager.addPlayer(selectedPlayerId, 0); // Add to front
          
          const updatedQueue = queueManager.toArray();
          
          // Update next-next tracking to reflect new queue order
          if (updatedQueue.length >= 2) {
            setNextNextPlayerIdToSubOut(updatedQueue[1]); // Second in queue
          } else {
            setNextNextPlayerIdToSubOut(null);
          }
          
          return updatedQueue;
        });
      }
    }
  }, [formation, teamMode, nextPlayerIdToSubOut, allPlayers]);

  // Player inactivation/activation functions for 7-player individual mode
  const togglePlayerInactive = useCallback((playerId, animationCallback = null, delayMs = 0) => {
    if (teamMode !== TEAM_MODES.INDIVIDUAL_7) return;

    const player = findPlayerById(allPlayers, playerId);
    if (!player) return;

    const currentlyInactive = player.stats.isInactive;
    const isSubstitute = player.stats.currentPairKey === 'substitute_1' || player.stats.currentPairKey === 'substitute_2';
    
    // Only allow inactivating/activating substitute players
    if (!isSubstitute) return;

    // CRITICAL SAFETY CHECK: Prevent having both substitutes inactive
    if (!currentlyInactive) { // Player is about to be inactivated
      const substitute_1Id = formation.substitute_1;
      const substitute_2Id = formation.substitute_2;
      const otherSubstituteId = playerId === substitute_1Id ? substitute_2Id : substitute_1Id;
      const otherSubstitute = findPlayerById(allPlayers, otherSubstituteId);
      
      if (otherSubstitute?.stats.isInactive) {
        console.warn('Cannot inactivate player: would result in both substitutes being inactive');
        return; // Prevent both substitutes from being inactive
      }
    }

    // Call animation callback if provided (for UI animations)
    if (animationCallback) {
      animationCallback(!currentlyInactive, player.stats.currentPairKey);
    }

    // Function to perform the actual state changes
    const performStateChanges = () => {
      // Update rotation queue and positions
      if (currentlyInactive) {
        // Player is being activated - they become the next player to go in (substitute_1)
        const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
        queueManager.initialize(); // Separate active and inactive players
        queueManager.reactivatePlayer(playerId);
        
        // Get current substitute positions
        const currentSub7_1Id = formation.substitute_1;
        const currentSub7_2Id = formation.substitute_2;
        
        // The reactivated player should become substitute_1 (next to go in)
        // The current substitute_1 (if active) should move to substitute_2
        // If the reactivated player was substitute_2, swap with substitute_1
        
        if (playerId === currentSub7_1Id) {
          // Reactivated player is already in substitute_1 position - just activate them
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, isInactive: false } };
            }
            return p;
          }));
          
          // nextPlayerIdToSubOut should remain pointing to the current active field player
          // Find the next active player for substitute_2 position
          const nextActivePlayers = queueManager.getNextActivePlayer(2);
          if (nextActivePlayers.length >= 1) {
            setNextNextPlayerIdToSubOut(nextActivePlayers[0]);
          }
          // Don't change nextPlayerIdToSubOut - it should still point to the field player
        } else if (playerId === currentSub7_2Id) {
          // Reactivated player is in substitute_2 - swap with substitute_1
          setFormation(prev => ({
            ...prev,
            substitute_1: playerId,
            substitute_2: currentSub7_1Id
          }));
          
          // Update player positions and inactive state in one operation
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1', isInactive: false } };
            }
            if (p.id === currentSub7_1Id) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2' } };
            }
            return p;
          }));
          
          // nextPlayerIdToSubOut should still point to the current field player who's next to come off
          setNextNextPlayerIdToSubOut(currentSub7_1Id);
          // Don't change nextPlayerIdToSubOut - it should still point to the field player
        }
        
        setRotationQueue(queueManager.toArray());
      } else {
        // Player is being inactivated - use queue manager
        const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
        queueManager.initialize(); // Separate active and inactive players
        queueManager.deactivatePlayer(playerId);
        setRotationQueue(queueManager.toArray());
        
        // Update next player tracking if the inactivated player was next
        if (playerId === nextPlayerIdToSubOut && queueManager.activeSize() > 0) {
          const nextActivePlayers = queueManager.getNextActivePlayer(2);
          if (nextActivePlayers.length > 0) {
            setNextPlayerIdToSubOut(nextActivePlayers[0]);
            if (nextActivePlayers.length >= 2) {
              setNextNextPlayerIdToSubOut(nextActivePlayers[1]);
            }
          }
        } else if (playerId === nextNextPlayerIdToSubOut) {
          const nextActivePlayers = queueManager.getNextActivePlayer(2);
          if (nextActivePlayers.length >= 2) {
            setNextNextPlayerIdToSubOut(nextActivePlayers[1]);
          }
        }
        
        // Move inactive player to substitute_2 position if they were substitute_1
        if (player.stats.currentPairKey === 'substitute_1' && formation.substitute_2) {
          // Swap positions - substitute_2 becomes substitute_1, inactive player goes to substitute_2
          const otherSubId = formation.substitute_2;
          
          setFormation(prev => ({
            ...prev,
            substitute_1: otherSubId,
            substitute_2: playerId
          }));
          
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_2', isInactive: true } };
            }
            if (p.id === otherSubId) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
            }
            return p;
          }));
        } else {
          // Just mark player as inactive without changing position
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, isInactive: true } };
            }
            return p;
          }));
        }
      }
    };
    
    // Execute state changes immediately or with delay
    if (delayMs > 0) {
      setTimeout(performStateChanges, delayMs);
    } else {
      performStateChanges();
    }
  }, [teamMode, allPlayers, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, formation]);

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
    const validPositions = {
      [TEAM_MODES.PAIRS_7]: ['leftPair', 'rightPair', 'subPair'],
      [TEAM_MODES.INDIVIDUAL_6]: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute_1'],
      [TEAM_MODES.INDIVIDUAL_7]: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute_1', 'substitute_2']
    };

    const currentValidPositions = validPositions[teamMode] || [];
    if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
      console.warn('One or both players are not in valid positions for switching');
      return false;
    }

    // Update period formation by swapping positions
    setFormation(prev => {
      const newFormation = { ...prev };
      
      if (teamMode === TEAM_MODES.PAIRS_7) {
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
        
        if (teamMode === TEAM_MODES.PAIRS_7) {
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
        
        if (teamMode === TEAM_MODES.PAIRS_7) {
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
  }, [allPlayers, formation, teamMode]);

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
      if (teamMode === TEAM_MODES.PAIRS_7) {
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
        let newStatus = 'on_field'; // Default
        
        if (teamMode === TEAM_MODES.PAIRS_7) {
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
            newStatus = 'on_field';
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
            newStatus = 'substitute';
          }
        } else {
          // Individual formations - use centralized role determination
          newRole = getPositionRole(newGoaliePosition) || PLAYER_ROLES.DEFENDER; // Default to defender
          newStatus = newGoaliePosition.includes('substitute') ? 'substitute' : 'on_field';
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
        newStats.currentStatus = 'goalie';
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
  }, [allPlayers, formation, teamMode, setAllPlayers, setFormation, setRotationQueue]);

  // Helper function to get all outfield players (excludes goalie)
  const getOutfieldPlayersForGame = useCallback(() => {
    return getOutfieldPlayers(allPlayers, selectedSquadIds, formation.goalie);
  }, [allPlayers, selectedSquadIds, formation.goalie]);

  // Score management functions
  const addHomeGoal = useCallback(() => {
    setHomeScore(prev => prev + 1);
  }, []);

  const addAwayGoal = useCallback(() => {
    setAwayScore(prev => prev + 1);
  }, []);

  const setScore = useCallback((home, away) => {
    setHomeScore(home);
    setAwayScore(away);
  }, []);

  const resetScore = useCallback(() => {
    setHomeScore(0);
    setAwayScore(0);
  }, []);

  // Navigation to match report
  const navigateToMatchReport = useCallback(() => {
    // Sync match data before showing report
    syncMatchDataFromEventLogger();
    setView(VIEWS.MATCH_REPORT);
  }, [syncMatchDataFromEventLogger]);

  // Captain management functions
  const setCaptain = useCallback((newCaptainId) => {
    console.log('[DEBUG] setCaptain called with:', {
      newCaptainId,
      previousCaptainId: captainId
    });
    
    // Update captainId state
    setCaptainId(newCaptainId);
    
    // Update player stats to reflect captain assignment
    setAllPlayers(prev => {
      const updatedPlayers = prev.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          isCaptain: player.id === newCaptainId
        }
      }));
      
      const captain = updatedPlayers.find(p => p.stats.isCaptain);
      console.log('[DEBUG] Captain assignment completed:', {
        captainId: newCaptainId,
        captainName: captain ? captain.name : 'None',
        captainPlayerData: captain ? { id: captain.id, name: captain.name, isCaptain: captain.stats.isCaptain } : null
      });
      
      return updatedPlayers;
    });
  }, [captainId]);

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
    teamMode,
    setTeamMode,
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
    opponentTeamName,
    setOpponentTeamName,
    homeScore,
    awayScore,
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
    
    // Actions
    preparePeriod,
    preparePeriodWithGameLog,
    handleStartPeriodSetup,
    handleStartGame,
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
    addHomeGoal,
    addAwayGoal,
    setScore,
    resetScore,
    navigateToMatchReport,
    setCaptain,
    
    // Enhanced persistence actions
    createManualBackup,
    listAvailableBackups,
    restoreFromBackup,
    getStorageInfo,
  };
}