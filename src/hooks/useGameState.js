import { useState, useCallback, useEffect } from 'react';
import { initializePlayers, initialRoster, PLAYER_ROLES, FORMATION_TYPES } from '../utils/gameLogic';
import { generateRecommendedFormation, generateIndividualFormationRecommendation } from '../utils/formationGenerator';
import { createSubstitutionManager, calculatePlayerTimeStats, handleRoleChange } from '../utils/substitutionManager';
import { createRotationQueue } from '../utils/rotationQueue';
import { createGamePersistenceManager } from '../utils/persistenceManager';
import { hasInactivePlayersInSquad, createPlayerLookup, findPlayerById, getSelectedSquadPlayers, getOutfieldPlayers } from '../utils/playerUtils';

// PersistenceManager for handling localStorage operations
const persistenceManager = createGamePersistenceManager('dif-coach-game-state');

export function useGameState() {
  // Initialize state from PersistenceManager
  const initialState = persistenceManager.loadState();
  
  // Ensure allPlayers is initialized if not present
  if (!initialState.allPlayers || initialState.allPlayers.length === 0) {
    initialState.allPlayers = initializePlayers(initialRoster);
  }
  
  const [allPlayers, setAllPlayers] = useState(initialState.allPlayers);
  const [view, setView] = useState(initialState.view);
  const [selectedSquadIds, setSelectedSquadIds] = useState(initialState.selectedSquadIds);
  const [numPeriods, setNumPeriods] = useState(initialState.numPeriods);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(initialState.periodDurationMinutes);
  const [periodGoalieIds, setPeriodGoalieIds] = useState(initialState.periodGoalieIds);
  const [formationType, setFormationType] = useState(initialState.formationType);
  const [alertMinutes, setAlertMinutes] = useState(initialState.alertMinutes);
  const [currentPeriodNumber, setCurrentPeriodNumber] = useState(initialState.currentPeriodNumber);
  const [periodFormation, setPeriodFormation] = useState(initialState.periodFormation);
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

  // Wake lock and alert management
  const [wakeLock, setWakeLock] = useState(null);
  const [alertTimer, setAlertTimer] = useState(null);

  // Wake lock helper functions
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLock) {
      try {
        const newWakeLock = await navigator.wakeLock.request('screen');
        setWakeLock(newWakeLock);
        console.log('Wake lock acquired');
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
        console.log('Wake lock released');
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
        console.log('Substitution alert triggered');
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
      formationType,
      alertMinutes,
      currentPeriodNumber,
      periodFormation,
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
    };
    
    // Use the persistence manager's saveGameState method
    persistenceManager.saveGameState(currentState);
  }, [allPlayers, view, selectedSquadIds, numPeriods, periodDurationMinutes, periodGoalieIds, formationType, alertMinutes, currentPeriodNumber, periodFormation, nextPhysicalPairToSubOut, nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, rotationQueue, gameLog, opponentTeamName, homeScore, awayScore, lastSubstitutionTimestamp]);



  const preparePeriodWithGameLog = useCallback((periodNum, gameLogToUse) => {
    const currentGoalieId = periodGoalieIds[periodNum];

    setPeriodFormation(prev => ({
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
      if (formationType === FORMATION_TYPES.PAIRS_7) {
        // 7-player pairs formation generation
        const { recommendedLeft, recommendedRight, recommendedSubs, firstToSubRec } = generateRecommendedFormation(
            periodNum,
            currentGoalieId,
            periodGoalieIds[periodNum - 1] || null, // Previous goalie
            lastPeriodLog.formation, // Previous period's formation
            playersWithLastPeriodStats,
            selectedSquadIds.map(id => allPlayers.find(p=>p.id === id)) // Pass full player objects
        );

        setPeriodFormation({
          goalie: currentGoalieId,
          leftPair: recommendedLeft,
          rightPair: recommendedRight,
          subPair: recommendedSubs,
          // 6-player formation structure
          leftDefender: null,
          rightDefender: null,
          leftAttacker: null,
          rightAttacker: null,
          substitute: null,
          // 7-player individual formation structure
          leftDefender7: null,
          rightDefender7: null,
          leftAttacker7: null,
          rightAttacker7: null,
          substitute7_1: null, // First substitute (next to go in)
          substitute7_2: null, // Second substitute (next-next to go in)
        });
        setNextPhysicalPairToSubOut(firstToSubRec); // 'leftPair' or 'rightPair'
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
        // 6-player individual formation generation using new logic
        const result = generateIndividualFormationRecommendation(
          currentGoalieId,
          playersWithLastPeriodStats,
          selectedSquadIds.map(id => allPlayers.find(p => p.id === id)),
          'INDIVIDUAL_6'
        );

        setPeriodFormation({
          goalie: currentGoalieId,
          leftPair: { defender: null, attacker: null },
          rightPair: { defender: null, attacker: null },
          subPair: { defender: null, attacker: null },
          // 6-player formation structure
          leftDefender: result.formation.leftDefender,
          rightDefender: result.formation.rightDefender,
          leftAttacker: result.formation.leftAttacker,
          rightAttacker: result.formation.rightAttacker,
          substitute: result.formation.substitute,
          // 7-player individual formation structure
          leftDefender7: null,
          rightDefender7: null,
          leftAttacker7: null,
          rightAttacker7: null,
          substitute7_1: null,
          substitute7_2: null,
        });
        
        // Set next player to substitute off (player with most field time)
        setNextPlayerIdToSubOut(result.nextToRotateOff);
        
        // Find the position of the next player to substitute
        const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
        const playerPosition = positions.find(pos => result.formation[pos] === result.nextToRotateOff);
        setNextPlayerToSubOut(playerPosition || 'leftDefender');
        
        // Set rotation queue
        console.log('🔄 Period Start - Initial rotation queue for INDIVIDUAL_6:', result.rotationQueue);
        setRotationQueue(result.rotationQueue);
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
        // 7-player individual formation generation using new logic
        const result = generateIndividualFormationRecommendation(
          currentGoalieId,
          playersWithLastPeriodStats,
          selectedSquadIds.map(id => allPlayers.find(p => p.id === id)),
          'INDIVIDUAL_7'
        );

        setPeriodFormation({
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
          // 7-player individual formation structure
          leftDefender7: result.formation.leftDefender7,
          rightDefender7: result.formation.rightDefender7,
          leftAttacker7: result.formation.leftAttacker7,
          rightAttacker7: result.formation.rightAttacker7,
          substitute7_1: result.formation.substitute7_1,
          substitute7_2: result.formation.substitute7_2,
        });
        
        // Set next player to substitute off (player with most field time)
        setNextPlayerIdToSubOut(result.nextToRotateOff);
        
        // Find the position of the next player to substitute
        const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'];
        const playerPosition = positions.find(pos => result.formation[pos] === result.nextToRotateOff);
        setNextPlayerToSubOut(playerPosition || 'leftDefender7');
        
        // Set rotation queue
        console.log('🔄 Period Start - Initial rotation queue for INDIVIDUAL_7:', result.rotationQueue);
        setRotationQueue(result.rotationQueue);
        
        // Set next-next player (second in rotation queue)
        if (result.rotationQueue.length >= 2) {
          setNextNextPlayerIdToSubOut(result.rotationQueue[1]);
        }
      }

    } else {
      // For P1, or if recommendations fail, reset formation (user fills manually)
      setPeriodFormation({
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
        // 7-player individual formation structure
        leftDefender7: null,
        rightDefender7: null,
        leftAttacker7: null,
        rightAttacker7: null,
        substitute7_1: null,
        substitute7_2: null,
      });
      setNextPhysicalPairToSubOut('leftPair');
      
      // Initialize next player and rotation queue for individual modes in P1
      if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
        setNextPlayerToSubOut('leftDefender');
        // Initialize basic rotation queue for Period 1 (will be filled when game starts)
        setRotationQueue([]);
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
        setNextPlayerToSubOut('leftDefender7');
        // Initialize basic rotation queue for Period 1 (will be filled when game starts)
        setRotationQueue([]);
      }
    }
  }, [periodGoalieIds, selectedSquadIds, allPlayers, formationType]);

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
    setView('periodSetup');
  }, [selectedSquadIds, numPeriods, periodGoalieIds, preparePeriod]);

  const handleStartGame = () => {
    // Validate formation based on formation type
    
    if (formationType === FORMATION_TYPES.PAIRS_7) {
      // 7-player pairs validation
      const allOutfieldersInFormation = [
        periodFormation.leftPair.defender, periodFormation.leftPair.attacker,
        periodFormation.rightPair.defender, periodFormation.rightPair.attacker,
        periodFormation.subPair.defender, periodFormation.subPair.attacker,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 6 || !periodFormation.goalie) {
        alert("Please complete the team formation with 1 goalie and 6 unique outfield players in pairs."); // Replace with modal
        return;
      }
    } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
      // 6-player individual validation
      const allOutfieldersInFormation = [
        periodFormation.leftDefender, periodFormation.rightDefender,
        periodFormation.leftAttacker, periodFormation.rightAttacker,
        periodFormation.substitute,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 5 || !periodFormation.goalie) {
        alert("Please complete the team formation with 1 goalie and 5 unique outfield players."); // Replace with modal
        return;
      }
    } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
      // 7-player individual validation
      const allOutfieldersInFormation = [
        periodFormation.leftDefender7, periodFormation.rightDefender7,
        periodFormation.leftAttacker7, periodFormation.rightAttacker7,
        periodFormation.substitute7_1, periodFormation.substitute7_2,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 6 || !periodFormation.goalie) {
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

      if (p.id === periodFormation.goalie) {
        role = PLAYER_ROLES.GOALIE;
        status = 'goalie';
      } else if (formationType === FORMATION_TYPES.PAIRS_7) {
        // 7-player pairs logic
        if (p.id === periodFormation.leftPair.defender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'leftPair';
        } else if (p.id === periodFormation.leftPair.attacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'leftPair';
        } else if (p.id === periodFormation.rightPair.defender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'rightPair';
        } else if (p.id === periodFormation.rightPair.attacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'rightPair';
        } else if (p.id === periodFormation.subPair.defender) {
          role = PLAYER_ROLES.DEFENDER; status = 'substitute'; pairKey = 'subPair';
        } else if (p.id === periodFormation.subPair.attacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'substitute'; pairKey = 'subPair';
        }
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
        // 6-player individual logic
        if (p.id === periodFormation.leftDefender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'leftDefender';
        } else if (p.id === periodFormation.rightDefender) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'rightDefender';
        } else if (p.id === periodFormation.leftAttacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'leftAttacker';
        } else if (p.id === periodFormation.rightAttacker) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'rightAttacker';
        } else if (p.id === periodFormation.substitute) {
          role = PLAYER_ROLES.SUBSTITUTE; status = 'substitute'; pairKey = 'substitute';
        }
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
        // 7-player individual logic
        if (p.id === periodFormation.leftDefender7) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'leftDefender7';
        } else if (p.id === periodFormation.rightDefender7) {
          role = PLAYER_ROLES.DEFENDER; status = 'on_field'; pairKey = 'rightDefender7';
        } else if (p.id === periodFormation.leftAttacker7) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'leftAttacker7';
        } else if (p.id === periodFormation.rightAttacker7) {
          role = PLAYER_ROLES.ATTACKER; status = 'on_field'; pairKey = 'rightAttacker7';
        } else if (p.id === periodFormation.substitute7_1) {
          role = PLAYER_ROLES.SUBSTITUTE; status = 'substitute'; pairKey = 'substitute7_1';
        } else if (p.id === periodFormation.substitute7_2) {
          role = PLAYER_ROLES.SUBSTITUTE; status = 'substitute'; pairKey = 'substitute7_2';
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
            currentPeriodRole: role,
            currentPeriodStatus: status,
            lastStintStartTimeEpoch: currentTimeEpoch,
            currentPairKey: pairKey,
          }
        };
      }
      return p;
    }));

    // Initialize rotation queue for individual modes only if not already set by formation generator
    // For Period 1 or when formation generator hasn't provided a queue
    if (formationType === FORMATION_TYPES.INDIVIDUAL_6 && nextPlayerToSubOut && rotationQueue.length === 0) {
      const initialPlayerToSubOut = periodFormation[nextPlayerToSubOut];
      setNextPlayerIdToSubOut(initialPlayerToSubOut);
      
      // Fallback: Initialize rotation queue with basic positional order for Period 1
      const outfieldPositions = ['leftDefender', 'leftAttacker', 'rightDefender', 'rightAttacker', 'substitute'];
      const initialQueue = outfieldPositions.map(pos => periodFormation[pos]).filter(Boolean);
      console.log('🎮 Game Start - Fallback initialization for INDIVIDUAL_6 (Period 1):', initialQueue);
      setRotationQueue(initialQueue);
    } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7 && nextPlayerToSubOut && rotationQueue.length === 0) {
      // Fallback: Initialize for 7-player individual mode only if formation generator hasn't set it
      const initialPlayerToSubOut = periodFormation[nextPlayerToSubOut];
      
      // Basic positional order for Period 1
      const outfieldPositions = ['leftDefender7', 'leftAttacker7', 'rightDefender7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
      const initialQueue = outfieldPositions.map(pos => periodFormation[pos]).filter(Boolean);
      
      // Only set values if we have a complete formation
      if (initialPlayerToSubOut && initialQueue.length === 6) {
        setNextPlayerIdToSubOut(initialPlayerToSubOut);
        console.log('🎮 Game Start - Fallback initialization for INDIVIDUAL_7 (Period 1):', initialQueue);
        setRotationQueue(initialQueue);
        
        // Set next-next player (second in queue) for 7-player individual mode
        if (initialQueue.length >= 2) {
          setNextNextPlayerIdToSubOut(initialQueue[1]);
        }
      }
    }

    setView('game');
  };

  const handleSubstitution = (isSubTimerPaused = false) => {
    const currentTimeEpoch = Date.now();
    setLastSubstitutionTimestamp(currentTimeEpoch);

    // Request wake lock and start alert timer
    requestWakeLock();
    startAlertTimer();

    const substitutionManager = createSubstitutionManager(formationType);
    
    const context = {
      periodFormation,
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
      setPeriodFormation(result.newFormation);
      setAllPlayers(result.updatedPlayers);
      
      if (result.newNextPhysicalPairToSubOut) {
        setNextPhysicalPairToSubOut(result.newNextPhysicalPairToSubOut);
      }
      if (result.newRotationQueue) {
        console.log('🔄 After Substitution - New rotation queue:', result.newRotationQueue);
        console.log('🔄 Next player to substitute out (ID):', result.newNextPlayerIdToSubOut);
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
        const stats = calculatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);

        // Update period role counts (based on final role of the period)
        // Note: With pair swapping, players can change roles mid-period, but we count
        // the period based on their final role for formation recommendation purposes
        if (stats.currentPeriodRole === PLAYER_ROLES.GOALIE) stats.periodsAsGoalie += 1;
        else if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) stats.periodsAsDefender += 1;
        else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) stats.periodsAsAttacker += 1;

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
      formation: JSON.parse(JSON.stringify(periodFormation)),
      finalStatsSnapshotForAllPlayers: currentPlayersSnapshot,
    };
    
    const updatedGameLog = [...gameLog, newGameLogEntry];

    setGameLog(updatedGameLog);

    if (currentPeriodNumber < numPeriods) {
      setCurrentPeriodNumber(prev => prev + 1);
      preparePeriodWithGameLog(currentPeriodNumber + 1, updatedGameLog);
      setView('periodSetup');
    } else {
      // Release wake lock when game ends
      clearAlertTimer();
      releaseWakeLock();
      setView('stats');
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
    // Create backup before clearing
    const backupKey = persistenceManager.createBackup();
    if (backupKey) {
      console.log('Created backup before clearing:', backupKey);
    }
    
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
      console.log('Manual backup created:', backupKey);
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

  // Formation type switching functions
  const splitPairs = useCallback(() => {
    if (formationType !== FORMATION_TYPES.PAIRS_7) return;
    
    setPeriodFormation(prev => {
      const newFormation = {
        goalie: prev.goalie,
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null },
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute: null,
        leftDefender7: prev.leftPair.defender,
        rightDefender7: prev.rightPair.defender,
        leftAttacker7: prev.leftPair.attacker,
        rightAttacker7: prev.rightPair.attacker,
        substitute7_1: prev.subPair.defender,
        substitute7_2: prev.subPair.attacker,
      };
      return newFormation;
    });

    // Update player stats - change currentPairKey to individual positions
    setAllPlayers(prev => prev.map(p => {
      if (!selectedSquadIds.includes(p.id)) return p;
      
      const stats = { ...p.stats };
      
      // Map pair keys to individual keys
      if (stats.currentPairKey === 'leftPair') {
        if (p.id === periodFormation.leftPair.defender) {
          stats.currentPairKey = 'leftDefender7';
        } else if (p.id === periodFormation.leftPair.attacker) {
          stats.currentPairKey = 'leftAttacker7';
        }
      } else if (stats.currentPairKey === 'rightPair') {
        if (p.id === periodFormation.rightPair.defender) {
          stats.currentPairKey = 'rightDefender7';
        } else if (p.id === periodFormation.rightPair.attacker) {
          stats.currentPairKey = 'rightAttacker7';
        }
      } else if (stats.currentPairKey === 'subPair') {
        if (p.id === periodFormation.subPair.defender) {
          stats.currentPairKey = 'substitute7_1';
        } else if (p.id === periodFormation.subPair.attacker) {
          stats.currentPairKey = 'substitute7_2';
        }
      }
      
      return { ...p, stats };
    }));

    // Update formation type
    setFormationType(FORMATION_TYPES.INDIVIDUAL_7);
    
    // Update next player tracking for individual mode
    const firstSubId = periodFormation.substitute7_1 || periodFormation.subPair.defender;
    const secondSubId = periodFormation.substitute7_2 || periodFormation.subPair.attacker;
    
    // Set up rotation queue for 7-player individual mode
    const positions = ['leftDefender7', 'leftAttacker7', 'rightDefender7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
    const currentQueue = positions.map(pos => {
      if (pos === 'leftDefender7') return periodFormation.leftPair?.defender;
      if (pos === 'leftAttacker7') return periodFormation.leftPair?.attacker;
      if (pos === 'rightDefender7') return periodFormation.rightPair?.defender;
      if (pos === 'rightAttacker7') return periodFormation.rightPair?.attacker;
      if (pos === 'substitute7_1') return firstSubId;
      if (pos === 'substitute7_2') return secondSubId;
      return null;
    }).filter(Boolean);
    
    setRotationQueue(currentQueue);
    setNextPlayerIdToSubOut(currentQueue[0] || null);
    setNextNextPlayerIdToSubOut(currentQueue[1] || null);
    setNextPlayerToSubOut('leftDefender7');
  }, [formationType, selectedSquadIds, periodFormation.leftPair, periodFormation.rightPair, periodFormation.subPair, periodFormation.substitute7_1, periodFormation.substitute7_2]);

  const formPairs = useCallback(() => {
    if (formationType !== FORMATION_TYPES.INDIVIDUAL_7) return;
    
    // Check for inactive players in the selected squad
    if (hasInactivePlayersInSquad(allPlayers, selectedSquadIds)) {
      alert('Cannot form pairs while there are inactive players. Please activate all players first.');
      return;
    }
    
    setPeriodFormation(prev => {
      const newFormation = {
        goalie: prev.goalie,
        leftPair: { 
          defender: prev.leftDefender7, 
          attacker: prev.leftAttacker7 
        },
        rightPair: { 
          defender: prev.rightDefender7, 
          attacker: prev.rightAttacker7 
        },
        subPair: { 
          defender: prev.substitute7_1, 
          attacker: prev.substitute7_2 
        },
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute: null,
        leftDefender7: null,
        rightDefender7: null,
        leftAttacker7: null,
        rightAttacker7: null,
        substitute7_1: null,
        substitute7_2: null,
      };
      return newFormation;
    });

    // Update player stats - change currentPairKey to pair keys
    setAllPlayers(prev => prev.map(p => {
      if (!selectedSquadIds.includes(p.id)) return p;
      
      const stats = { ...p.stats };
      
      // Map individual keys to pair keys
      if (stats.currentPairKey === 'leftDefender7' || stats.currentPairKey === 'leftAttacker7') {
        stats.currentPairKey = 'leftPair';
      } else if (stats.currentPairKey === 'rightDefender7' || stats.currentPairKey === 'rightAttacker7') {
        stats.currentPairKey = 'rightPair';
      } else if (stats.currentPairKey === 'substitute7_1' || stats.currentPairKey === 'substitute7_2') {
        stats.currentPairKey = 'subPair';
      }
      
      return { ...p, stats };
    }));

    // Update formation type
    setFormationType(FORMATION_TYPES.PAIRS_7);
    
    // Update next pair tracking for pairs mode
    setNextPhysicalPairToSubOut('leftPair');
    setRotationQueue([]);
    setNextPlayerIdToSubOut(null);
    setNextNextPlayerIdToSubOut(null);
    setNextPlayerToSubOut(null);
  }, [formationType, selectedSquadIds, allPlayers]);

  // Enhanced setters for manual selection - rotation logic already handles sequence correctly
  const setNextPhysicalPairToSubOutWithRotation = useCallback((newPairKey) => {
    console.log('Manually setting next pair to substitute:', newPairKey);
    setNextPhysicalPairToSubOut(newPairKey);
    // The existing rotation logic in handleSubstitution will continue from this selection
  }, []);

  const setNextPlayerToSubOutWithRotation = useCallback((newPosition) => {
    console.log('Manually setting next player to substitute:', newPosition);
    setNextPlayerToSubOut(newPosition);
    
    // Update next player tracking only (do NOT reorder rotation queue to maintain round-robin)
    if (periodFormation && periodFormation[newPosition]) {
      const selectedPlayerId = periodFormation[newPosition];
      setNextPlayerIdToSubOut(selectedPlayerId);
      console.log('Set next player ID to substitute:', selectedPlayerId);
      console.log('Note: Rotation queue order preserved for round-robin rotation');
    }
  }, [periodFormation]);

  // Player inactivation/activation functions for 7-player individual mode
  const togglePlayerInactive = useCallback((playerId, animationCallback = null, delayMs = 0) => {
    if (formationType !== FORMATION_TYPES.INDIVIDUAL_7) return;

    const player = findPlayerById(allPlayers, playerId);
    if (!player) return;

    const currentlyInactive = player.stats.isInactive;
    const isSubstitute = player.stats.currentPairKey === 'substitute7_1' || player.stats.currentPairKey === 'substitute7_2';
    
    // Only allow inactivating/activating substitute players
    if (!isSubstitute) return;

    // CRITICAL SAFETY CHECK: Prevent having both substitutes inactive
    if (!currentlyInactive) { // Player is about to be inactivated
      const substitute7_1Id = periodFormation.substitute7_1;
      const substitute7_2Id = periodFormation.substitute7_2;
      const otherSubstituteId = playerId === substitute7_1Id ? substitute7_2Id : substitute7_1Id;
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
        // Player is being activated - they become the next player to go in (substitute7_1)
        const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
        queueManager.initialize(); // Separate active and inactive players
        queueManager.reactivatePlayer(playerId);
        
        // Get current substitute positions
        const currentSub7_1Id = periodFormation.substitute7_1;
        const currentSub7_2Id = periodFormation.substitute7_2;
        
        // The reactivated player should become substitute7_1 (next to go in)
        // The current substitute7_1 (if active) should move to substitute7_2
        // If the reactivated player was substitute7_2, swap with substitute7_1
        
        if (playerId === currentSub7_1Id) {
          // Reactivated player is already in substitute7_1 position - just activate them
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, isInactive: false } };
            }
            return p;
          }));
          
          // nextPlayerIdToSubOut should remain pointing to the current active field player
          // Find the next active player for substitute7_2 position
          const nextActivePlayers = queueManager.getNextActivePlayer(2);
          if (nextActivePlayers.length >= 1) {
            setNextNextPlayerIdToSubOut(nextActivePlayers[0]);
          }
          // Don't change nextPlayerIdToSubOut - it should still point to the field player
        } else if (playerId === currentSub7_2Id) {
          // Reactivated player is in substitute7_2 - swap with substitute7_1
          setPeriodFormation(prev => ({
            ...prev,
            substitute7_1: playerId,
            substitute7_2: currentSub7_1Id
          }));
          
          // Update player positions and inactive state in one operation
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute7_1', isInactive: false } };
            }
            if (p.id === currentSub7_1Id) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute7_2' } };
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
        
        // Move inactive player to substitute7_2 position if they were substitute7_1
        if (player.stats.currentPairKey === 'substitute7_1' && periodFormation.substitute7_2) {
          // Swap positions - substitute7_2 becomes substitute7_1, inactive player goes to substitute7_2
          const otherSubId = periodFormation.substitute7_2;
          
          setPeriodFormation(prev => ({
            ...prev,
            substitute7_1: otherSubId,
            substitute7_2: playerId
          }));
          
          setAllPlayers(prev => prev.map(p => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute7_2', isInactive: true } };
            }
            if (p.id === otherSubId) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute7_1' } };
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
  }, [formationType, allPlayers, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, periodFormation]);

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
    if (player1.id === periodFormation.goalie || player2.id === periodFormation.goalie) {
      console.warn('Cannot switch positions with goalie');
      return false;
    }

    const player1Position = player1.stats.currentPairKey;
    const player2Position = player2.stats.currentPairKey;

    // Don't allow switching if either player is not currently on field or substitute
    const validPositions = {
      [FORMATION_TYPES.PAIRS_7]: ['leftPair', 'rightPair', 'subPair'],
      [FORMATION_TYPES.INDIVIDUAL_6]: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'],
      [FORMATION_TYPES.INDIVIDUAL_7]: ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2']
    };

    const currentValidPositions = validPositions[formationType] || [];
    if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
      console.warn('One or both players are not in valid positions for switching');
      return false;
    }

    // Update period formation by swapping positions
    setPeriodFormation(prev => {
      const newFormation = { ...prev };
      
      if (formationType === FORMATION_TYPES.PAIRS_7) {
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
        let newRole = p.stats.currentPeriodRole; // Default to current role
        
        if (formationType === FORMATION_TYPES.PAIRS_7) {
          // For pairs, we need to determine the new role based on what position they took in the new pair
          // Since this is a position switch, player1 takes player2's role and vice versa
          newRole = player2.stats.currentPeriodRole;
        } else {
          // For individual formations, determine role from position name
          if (player2Position?.includes('Defender') || player2Position?.includes('defender')) {
            newRole = PLAYER_ROLES.DEFENDER;
          } else if (player2Position?.includes('Attacker') || player2Position?.includes('attacker')) {
            newRole = PLAYER_ROLES.ATTACKER;
          } else if (player2Position?.includes('substitute')) {
            newRole = PLAYER_ROLES.SUBSTITUTE;
          }
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
        let newRole = p.stats.currentPeriodRole; // Default to current role
        
        if (formationType === FORMATION_TYPES.PAIRS_7) {
          // For pairs, player2 takes player1's role
          newRole = player1.stats.currentPeriodRole;
        } else {
          // For individual formations, determine role from position name
          if (player1Position?.includes('Defender') || player1Position?.includes('defender')) {
            newRole = PLAYER_ROLES.DEFENDER;
          } else if (player1Position?.includes('Attacker') || player1Position?.includes('attacker')) {
            newRole = PLAYER_ROLES.ATTACKER;
          } else if (player1Position?.includes('substitute')) {
            newRole = PLAYER_ROLES.SUBSTITUTE;
          }
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
    
    console.log(`Successfully switched positions: ${player1.name} (${player1Position}) <-> ${player2.name} (${player2Position})`);
    return true;
  }, [allPlayers, periodFormation, formationType]);

  // Function to switch goalies
  const switchGoalie = useCallback((newGoalieId, isSubTimerPaused = false) => {
    if (!newGoalieId || newGoalieId === periodFormation.goalie) {
      console.warn('Invalid new goalie ID or same as current goalie');
      return false;
    }

    const currentGoalie = findPlayerById(allPlayers, periodFormation.goalie);
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
    setPeriodFormation(prev => {
      const newFormation = { ...prev };
      
      // Set new goalie
      newFormation.goalie = newGoalieId;
      
      // Place current goalie in the position of the new goalie
      if (formationType === FORMATION_TYPES.PAIRS_7) {
        // Handle pairs formation
        if (newGoaliePosition === 'leftPair') {
          if (prev.leftPair.defender === newGoalieId) {
            newFormation.leftPair = { ...prev.leftPair, defender: periodFormation.goalie };
          } else if (prev.leftPair.attacker === newGoalieId) {
            newFormation.leftPair = { ...prev.leftPair, attacker: periodFormation.goalie };
          }
        } else if (newGoaliePosition === 'rightPair') {
          if (prev.rightPair.defender === newGoalieId) {
            newFormation.rightPair = { ...prev.rightPair, defender: periodFormation.goalie };
          } else if (prev.rightPair.attacker === newGoalieId) {
            newFormation.rightPair = { ...prev.rightPair, attacker: periodFormation.goalie };
          }
        } else if (newGoaliePosition === 'subPair') {
          if (prev.subPair.defender === newGoalieId) {
            newFormation.subPair = { ...prev.subPair, defender: periodFormation.goalie };
          } else if (prev.subPair.attacker === newGoalieId) {
            newFormation.subPair = { ...prev.subPair, attacker: periodFormation.goalie };
          }
        }
      } else {
        // Handle individual formations (6-player and 7-player)
        newFormation[newGoaliePosition] = periodFormation.goalie;
      }
      
      return newFormation;
    });

    // Update player stats and handle role changes
    const currentTimeEpoch = Date.now();
    setAllPlayers(prev => prev.map(p => {
      if (p.id === periodFormation.goalie) {
        // Current goalie becomes a field player
        // First calculate accumulated time for their goalie stint
        const updatedStats = calculatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);
        
        // Determine new role and status based on position they're moving to
        let newRole = PLAYER_ROLES.DEFENDER; // Default
        let newStatus = 'on_field'; // Default
        
        if (formationType === FORMATION_TYPES.PAIRS_7) {
          if (newGoaliePosition === 'leftPair' || newGoaliePosition === 'rightPair') {
            // Field positions
            const pairData = periodFormation[newGoaliePosition];
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
            const pairData = periodFormation[newGoaliePosition];
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
          // Individual formations
          if (newGoaliePosition.includes('substitute')) {
            // Substitute positions
            newRole = PLAYER_ROLES.SUBSTITUTE;
            newStatus = 'substitute';
          } else if (newGoaliePosition.includes('Defender') || newGoaliePosition.includes('defender')) {
            newRole = PLAYER_ROLES.DEFENDER;
            newStatus = 'on_field';
          } else if (newGoaliePosition.includes('Attacker') || newGoaliePosition.includes('attacker')) {
            newRole = PLAYER_ROLES.ATTACKER;
            newStatus = 'on_field';
          }
        }
        
        // Handle role change from goalie to new position
        const newStats = handleRoleChange(
          { ...p, stats: updatedStats },
          newRole,
          currentTimeEpoch,
          isSubTimerPaused
        );
        
        // Update status and position
        newStats.currentPeriodStatus = newStatus;
        newStats.currentPairKey = newGoaliePosition;
        
        return { ...p, stats: newStats };
      } else if (p.id === newGoalieId) {
        // New goalie - calculate accumulated time for their field stint
        const updatedStats = calculatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);
        
        // Handle role change from field player to goalie
        const newStats = handleRoleChange(
          { ...p, stats: updatedStats },
          PLAYER_ROLES.GOALIE,
          currentTimeEpoch,
          isSubTimerPaused
        );
        
        // Update status and position
        newStats.currentPeriodStatus = 'goalie';
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
      queueManager.addPlayer(periodFormation.goalie, 'end');
      
      return queueManager.toArray();
    });

    console.log(`Successfully switched goalie: ${currentGoalie.name} -> ${newGoalie.name}`);
    return true;
  }, [allPlayers, periodFormation, formationType, setAllPlayers, setPeriodFormation, setRotationQueue]);

  // Helper function to get all outfield players (excludes goalie)
  const getOutfieldPlayersForGame = useCallback(() => {
    return getOutfieldPlayers(allPlayers, selectedSquadIds, periodFormation.goalie);
  }, [allPlayers, selectedSquadIds, periodFormation.goalie]);

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
    formationType,
    setFormationType,
    alertMinutes,
    setAlertMinutes,
    currentPeriodNumber,
    setCurrentPeriodNumber,
    periodFormation,
    setPeriodFormation,
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
    
    // Enhanced persistence actions
    createManualBackup,
    listAvailableBackups,
    restoreFromBackup,
    getStorageInfo,
  };
}