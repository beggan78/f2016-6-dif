import { useState, useCallback, useEffect } from 'react';
import { initializePlayers, initialRoster, PLAYER_ROLES, FORMATION_TYPES } from '../utils/gameLogic';
import { generateRecommendedFormation } from '../utils/formationGenerator';

// localStorage utilities - NOTE: Essential for preventing state loss on page refresh
const STORAGE_KEY = 'dif-coach-game-state';

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load game state from localStorage:', error);
    return null;
  }
};

const saveToStorage = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save game state to localStorage:', error);
  }
};

export function useGameState() {
  // Initialize state from localStorage or defaults
  const initializeState = () => {
    const saved = loadFromStorage();
    if (saved) {
      return {
        allPlayers: saved.allPlayers || initializePlayers(initialRoster),
        view: saved.view || 'config',
        selectedSquadIds: saved.selectedSquadIds || [],
        numPeriods: saved.numPeriods || 3,
        periodDurationMinutes: saved.periodDurationMinutes || 15,
        periodGoalieIds: saved.periodGoalieIds || {},
        formationType: saved.formationType || FORMATION_TYPES.PAIRS_7, // Default to pairs mode
        alertMinutes: saved.alertMinutes || 2,
        currentPeriodNumber: saved.currentPeriodNumber || 1,
        periodFormation: saved.periodFormation || {
          goalie: null,
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
          substitute7_1: null, // First substitute (next to go in)
          substitute7_2: null, // Second substitute (next-next to go in)
        },
        nextPhysicalPairToSubOut: saved.nextPhysicalPairToSubOut || 'leftPair',
        nextPlayerToSubOut: saved.nextPlayerToSubOut || 'leftDefender', // For 6-player mode (legacy)
        nextPlayerIdToSubOut: saved.nextPlayerIdToSubOut || null, // New: track actual player ID
        nextNextPlayerIdToSubOut: saved.nextNextPlayerIdToSubOut || null, // Track next-next player for 7-player individual mode
        rotationQueue: saved.rotationQueue || [], // Queue of player IDs for 6-player rotation
        gameLog: saved.gameLog || [],
      };
    }
    return {
      allPlayers: initializePlayers(initialRoster),
      view: 'config',
      selectedSquadIds: [],
      numPeriods: 3,
      periodDurationMinutes: 15,
      periodGoalieIds: {},
      formationType: FORMATION_TYPES.PAIRS_7, // Default to pairs mode
      alertMinutes: 2,
      currentPeriodNumber: 1,
      periodFormation: {
        goalie: null,
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null },
        // 6-player formation structure
        leftDefender: null,
        rightDefender: null,
        leftAttacker: null,
        rightAttacker: null,
        substitute: null,
      },
      nextPhysicalPairToSubOut: 'leftPair',
      nextPlayerToSubOut: 'leftDefender', // For 6-player mode (legacy)
      nextPlayerIdToSubOut: null, // New: track actual player ID
      nextNextPlayerIdToSubOut: null, // Track next-next player for 7-player individual mode
      rotationQueue: [], // Queue of player IDs for 6-player rotation
      gameLog: [],
    };
  };

  const initialState = initializeState();
  
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
    };
    saveToStorage(currentState);
  }, [allPlayers, view, selectedSquadIds, numPeriods, periodDurationMinutes, periodGoalieIds, formationType, alertMinutes, currentPeriodNumber, periodFormation, nextPhysicalPairToSubOut, nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, rotationQueue, gameLog]);

  // Player Stat Update Logic
  const updatePlayerTimeStats = useCallback((playerIds, newStatus, currentTimeEpoch) => {
    setAllPlayers(prevPlayers => prevPlayers.map(p => {
      if (playerIds.includes(p.id)) {
        const stats = { ...p.stats };
        const timeInPreviousStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

        if (stats.currentPeriodStatus === 'on_field') {
          stats.timeOnFieldSeconds += timeInPreviousStint;
          // Track role-specific time for new points system
          if (stats.currentPeriodRole === 'Defender') {
            stats.timeAsDefenderSeconds += timeInPreviousStint;
          } else if (stats.currentPeriodRole === 'Attacker') {
            stats.timeAsAttackerSeconds += timeInPreviousStint;
          }
        } else if (stats.currentPeriodStatus === 'substitute') {
          stats.timeAsSubSeconds += timeInPreviousStint;
        } else if (stats.currentPeriodStatus === 'goalie') {
          stats.timeAsGoalieSeconds += timeInPreviousStint;
        }

        return {
          ...p,
          stats: {
            ...stats,
            currentPeriodStatus: newStatus,
            lastStintStartTimeEpoch: currentTimeEpoch,
          }
        };
      }
      return p;
    }));
  }, []);

  // Helper function to determine role from position
  const getPositionRole = (position) => {
    if (position === 'leftDefender' || position === 'rightDefender' || 
        position === 'leftDefender7' || position === 'rightDefender7') {
      return PLAYER_ROLES.DEFENDER;
    } else if (position === 'leftAttacker' || position === 'rightAttacker' ||
               position === 'leftAttacker7' || position === 'rightAttacker7') {
      return PLAYER_ROLES.ATTACKER;
    } else if (position === 'substitute' || position === 'substitute7_1' || position === 'substitute7_2') {
      return PLAYER_ROLES.SUBSTITUTE;
    } else if (position === 'goalie') {
      return PLAYER_ROLES.GOALIE;
    }
    return null;
  };

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
        // 6-player individual formation generation - recommend player with most time as substitute
        const outfielders = selectedSquadIds.filter(id => id !== currentGoalieId);
        const outfieldersWithStats = outfielders.map(id => {
          const player = allPlayers.find(p => p.id === id);
          const stats = playersWithLastPeriodStats.find(s => s.id === id);
          return {
            id,
            name: player.name,
            totalOutfieldTime: stats?.stats.timeOnFieldSeconds || 0
          };
        }).sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);

        // Most time player becomes substitute, others fill positions
        const substituteId = outfieldersWithStats[0].id;
        const playingPlayers = outfieldersWithStats.slice(1);

        setPeriodFormation({
          goalie: currentGoalieId,
          leftPair: { defender: null, attacker: null },
          rightPair: { defender: null, attacker: null },
          subPair: { defender: null, attacker: null },
          // 6-player formation structure
          leftDefender: playingPlayers[0]?.id || null,
          rightDefender: playingPlayers[1]?.id || null,
          leftAttacker: playingPlayers[2]?.id || null,
          rightAttacker: playingPlayers[3]?.id || null,
          substitute: substituteId,
        });
        
        // Recommend first substitution for player with second most time
        const secondMostTimePlayer = outfieldersWithStats[1];
        const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
        const playerPosition = positions.find(pos => 
          (pos === 'leftDefender' && playingPlayers[0]?.id === secondMostTimePlayer.id) ||
          (pos === 'rightDefender' && playingPlayers[1]?.id === secondMostTimePlayer.id) ||
          (pos === 'leftAttacker' && playingPlayers[2]?.id === secondMostTimePlayer.id) ||
          (pos === 'rightAttacker' && playingPlayers[3]?.id === secondMostTimePlayer.id)
        );
        setNextPlayerToSubOut(playerPosition || 'leftDefender');
        setNextPlayerIdToSubOut(secondMostTimePlayer?.id || null);
        
        // Initialize rotation queue for 6-player mode with desired substitution order
        // Order players by position preference: Left Defender -> Left Attacker -> Right Defender -> Right Attacker -> Substitute
        const positionOrder = ['leftDefender', 'leftAttacker', 'rightDefender', 'rightAttacker', 'substitute'];
        const orderedQueue = positionOrder.map(pos => {
          if (pos === 'leftDefender') return playingPlayers[0]?.id;
          if (pos === 'leftAttacker') return playingPlayers[2]?.id;
          if (pos === 'rightDefender') return playingPlayers[1]?.id;
          if (pos === 'rightAttacker') return playingPlayers[3]?.id;
          if (pos === 'substitute') return substituteId;
          return null;
        }).filter(Boolean);
        setRotationQueue(orderedQueue);
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
        // 7-player individual formation generation - recommend player with most time as substitute
        const outfielders = selectedSquadIds.filter(id => id !== currentGoalieId);
        const outfieldersWithStats = outfielders.map(id => {
          const player = allPlayers.find(p => p.id === id);
          const stats = playersWithLastPeriodStats.find(s => s.id === id);
          return {
            id,
            name: player.name,
            totalOutfieldTime: stats?.stats.timeOnFieldSeconds || 0
          };
        }).sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);

        // Top 2 players with most time become substitutes, others fill positions
        const substitute1Id = outfieldersWithStats[0].id;
        const substitute2Id = outfieldersWithStats[1].id;
        const playingPlayers = outfieldersWithStats.slice(2);

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
          leftDefender7: playingPlayers[0]?.id || null,
          rightDefender7: playingPlayers[1]?.id || null,
          leftAttacker7: playingPlayers[2]?.id || null,
          rightAttacker7: playingPlayers[3]?.id || null,
          substitute7_1: substitute1Id,
          substitute7_2: substitute2Id,
        });
        
        // Recommend first substitution for player with third most time
        const thirdMostTimePlayer = outfieldersWithStats[2];
        const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'];
        const playerPosition = positions.find(pos => 
          (pos === 'leftDefender7' && playingPlayers[0]?.id === thirdMostTimePlayer.id) ||
          (pos === 'rightDefender7' && playingPlayers[1]?.id === thirdMostTimePlayer.id) ||
          (pos === 'leftAttacker7' && playingPlayers[2]?.id === thirdMostTimePlayer.id) ||
          (pos === 'rightAttacker7' && playingPlayers[3]?.id === thirdMostTimePlayer.id)
        );
        setNextPlayerToSubOut(playerPosition || 'leftDefender7');
        setNextPlayerIdToSubOut(thirdMostTimePlayer?.id || null);
        
        // Initialize rotation queue for 7-player individual mode
        const positionOrder = ['leftDefender7', 'leftAttacker7', 'rightDefender7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
        const orderedQueue = positionOrder.map(pos => {
          if (pos === 'leftDefender7') return playingPlayers[0]?.id;
          if (pos === 'leftAttacker7') return playingPlayers[2]?.id;
          if (pos === 'rightDefender7') return playingPlayers[1]?.id;
          if (pos === 'rightAttacker7') return playingPlayers[3]?.id;
          if (pos === 'substitute7_1') return substitute1Id;
          if (pos === 'substitute7_2') return substitute2Id;
          return null;
        }).filter(Boolean);
        setRotationQueue(orderedQueue);
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
      
      // Initialize next player for individual modes in P1
      if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
        setNextPlayerToSubOut('leftDefender');
      } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
        setNextPlayerToSubOut('leftDefender7');
      }
    }
  }, [periodGoalieIds, selectedSquadIds, allPlayers, formationType]);

  const preparePeriod = useCallback((periodNum) => {
    preparePeriodWithGameLog(periodNum, gameLog);
  }, [preparePeriodWithGameLog, gameLog]);

  const handleStartPeriodSetup = () => {
    if (selectedSquadIds.length !== 7 && selectedSquadIds.length !== 6) {
      alert("Please select exactly 6 or 7 players for the squad."); // Replace with modal
      return;
    }
    const goaliesAssigned = Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean);
    if (!goaliesAssigned) {
      alert("Please assign a goalie for each period."); // Replace with modal
      return;
    }

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
  };

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

    // Initialize nextPlayerIdToSubOut and rotation queue for individual modes
    if (formationType === FORMATION_TYPES.INDIVIDUAL_6 && nextPlayerToSubOut) {
      const initialPlayerToSubOut = periodFormation[nextPlayerToSubOut];
      setNextPlayerIdToSubOut(initialPlayerToSubOut);
      
      // Initialize rotation queue with desired substitution order: Left Defender -> Left Attacker -> Right Defender -> Right Attacker -> Substitute
      const outfieldPositions = ['leftDefender', 'leftAttacker', 'rightDefender', 'rightAttacker', 'substitute'];
      const initialQueue = outfieldPositions.map(pos => periodFormation[pos]).filter(Boolean);
      setRotationQueue(initialQueue);
    } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7 && nextPlayerToSubOut) {
      // Initialize for 7-player individual mode
      const initialPlayerToSubOut = periodFormation[nextPlayerToSubOut];
      
      // Initialize rotation queue with desired substitution order for 7-player individual mode
      const outfieldPositions = ['leftDefender7', 'leftAttacker7', 'rightDefender7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
      const initialQueue = outfieldPositions.map(pos => periodFormation[pos]).filter(Boolean);
      
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

    setView('game');
  };

  const handleSubstitution = () => {
    const currentTimeEpoch = Date.now();

    // Request wake lock and start alert timer
    requestWakeLock();
    startAlertTimer();

    if (formationType === FORMATION_TYPES.PAIRS_7) {
      // 7-player pairs substitution logic
      const pairToSubOutKey = nextPhysicalPairToSubOut;
      const pairToSubInKey = 'subPair';

      const pairGettingSubbed = periodFormation[pairToSubOutKey];
      const pairComingIn = periodFormation[pairToSubInKey];

      const playersGoingOffIds = [pairGettingSubbed.defender, pairGettingSubbed.attacker].filter(Boolean);
      const playersComingOnIds = [pairComingIn.defender, pairComingIn.attacker].filter(Boolean);

      updatePlayerTimeStats(playersGoingOffIds, 'substitute', currentTimeEpoch);
      updatePlayerTimeStats(playersComingOnIds, 'on_field', currentTimeEpoch);

      // Swap player IDs in formation
      setPeriodFormation(prev => {
        const newFormation = JSON.parse(JSON.stringify(prev)); // Deep copy
        newFormation[pairToSubOutKey].defender = pairComingIn.defender;
        newFormation[pairToSubOutKey].attacker = pairComingIn.attacker;
        newFormation[pairToSubInKey].defender = pairGettingSubbed.defender;
        newFormation[pairToSubInKey].attacker = pairGettingSubbed.attacker;
        return newFormation;
      });

      // Update player's currentPairKey
      setAllPlayers(prev => prev.map(p => {
        if (playersGoingOffIds.includes(p.id)) return {...p, stats: {...p.stats, currentPairKey: pairToSubInKey}};
        if (playersComingOnIds.includes(p.id)) return {...p, stats: {...p.stats, currentPairKey: pairToSubOutKey}};
        return p;
      }));

      setNextPhysicalPairToSubOut(pairToSubOutKey === 'leftPair' ? 'rightPair' : 'leftPair');
    } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
      // 6-player individual substitution logic (player-based round-robin)
      const playerGoingOffId = nextPlayerIdToSubOut;
      const playerComingOnId = periodFormation.substitute;
      
      // Find which position the outgoing player is currently in
      const playerToSubOutKey = Object.keys(periodFormation).find(key => 
        periodFormation[key] === playerGoingOffId && key !== 'substitute' && key !== 'goalie'
      );

      // Determine the new role for the player coming on
      const newRole = getPositionRole(playerToSubOutKey);
      
      // Update time stats and roles in one operation
      setAllPlayers(prev => prev.map(p => {
        if (p.id === playerGoingOffId) {
          const stats = { ...p.stats };
          const timeInPreviousStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

          if (stats.currentPeriodStatus === 'on_field') {
            stats.timeOnFieldSeconds += timeInPreviousStint;
            // Track role-specific time for new points system
            if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) {
              stats.timeAsDefenderSeconds += timeInPreviousStint;
            } else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) {
              stats.timeAsAttackerSeconds += timeInPreviousStint;
            }
          }

          return {...p, stats: {
            ...stats, 
            currentPairKey: 'substitute', 
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE,
            currentPeriodStatus: 'substitute',
            lastStintStartTimeEpoch: currentTimeEpoch
          }};
        }
        if (p.id === playerComingOnId) {
          const stats = { ...p.stats };
          const timeInPreviousStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

          if (stats.currentPeriodStatus === 'substitute') {
            stats.timeAsSubSeconds += timeInPreviousStint;
          }

          return {...p, stats: {
            ...stats,
            currentPairKey: playerToSubOutKey, 
            currentPeriodRole: newRole,
            currentPeriodStatus: 'on_field',
            lastStintStartTimeEpoch: currentTimeEpoch
          }};
        }
        return p;
      }));

      // Swap player IDs in formation
      setPeriodFormation(prev => {
        const newFormation = JSON.parse(JSON.stringify(prev));
        newFormation[playerToSubOutKey] = playerComingOnId;
        newFormation.substitute = playerGoingOffId;
        return newFormation;
      });

      // Update rotation queue after substitution
      const updatedQueue = [...rotationQueue];
      const currentPlayerIndex = updatedQueue.indexOf(playerGoingOffId);
      
      // Remove the player who just went off from current position
      updatedQueue.splice(currentPlayerIndex, 1);
      // Add them to the end of the queue
      updatedQueue.push(playerGoingOffId);
      
      // Next player is now at the front of the queue
      const nextPlayerToSubOutId = updatedQueue[0];
      
      setRotationQueue(updatedQueue);
      setNextPlayerIdToSubOut(nextPlayerToSubOutId);
      
      // Update legacy position tracking for compatibility
      const outfieldPositions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
      const nextPlayerPosition = outfieldPositions.find(pos => periodFormation[pos] === nextPlayerToSubOutId);
      setNextPlayerToSubOut(nextPlayerPosition || 'leftDefender');
    } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
      // 7-player individual substitution logic (player-based round-robin with dual substitutes)
      const playerGoingOffId = nextPlayerIdToSubOut;
      const playerComingOnId = periodFormation.substitute7_1; // First substitute comes in
      
      // CRITICAL SAFETY CHECK: substitute7_1 should NEVER be inactive when substituting
      const substitute7_1Player = allPlayers.find(p => p.id === playerComingOnId);
      if (substitute7_1Player?.stats.isInactive) {
        console.error('ERROR: substitute7_1 is inactive but was selected for substitution! This should never happen.');
        return; // Abort substitution to prevent invalid state
      }
      
      // Check if substitute7_2 is inactive - this is crucial for proper rotation
      const substitute7_2Player = allPlayers.find(p => p.id === periodFormation.substitute7_2);
      const isSubstitute7_2Inactive = substitute7_2Player?.stats.isInactive || false;
      
      // Find which position the outgoing player is currently in
      const playerToSubOutKey = Object.keys(periodFormation).find(key => 
        periodFormation[key] === playerGoingOffId && !key.includes('substitute') && key !== 'goalie'
      );

      // Determine the new role for the player coming on
      const newRole = getPositionRole(playerToSubOutKey);
      
      // Update time stats and roles based on whether substitute7_2 is inactive
      setAllPlayers(prev => prev.map(p => {
        if (p.id === playerGoingOffId) {
          const stats = { ...p.stats };
          const timeInPreviousStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

          if (stats.currentPeriodStatus === 'on_field') {
            stats.timeOnFieldSeconds += timeInPreviousStint;
            // Track role-specific time for new points system
            if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) {
              stats.timeAsDefenderSeconds += timeInPreviousStint;
            } else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) {
              stats.timeAsAttackerSeconds += timeInPreviousStint;
            }
          }

          // If substitute7_2 is inactive, outgoing player becomes substitute7_1 (next to go in)
          // If substitute7_2 is active, outgoing player goes to substitute7_2 as normal
          const newPairKey = isSubstitute7_2Inactive ? 'substitute7_1' : 'substitute7_2';
          
          return {...p, stats: {
            ...stats, 
            currentPairKey: newPairKey, 
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE,
            currentPeriodStatus: 'substitute',
            lastStintStartTimeEpoch: currentTimeEpoch
          }};
        }
        if (p.id === playerComingOnId) {
          const stats = { ...p.stats };
          const timeInPreviousStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

          if (stats.currentPeriodStatus === 'substitute') {
            stats.timeAsSubSeconds += timeInPreviousStint;
          }

          return {...p, stats: {
            ...stats,
            currentPairKey: playerToSubOutKey, 
            currentPeriodRole: newRole,
            currentPeriodStatus: 'on_field',
            lastStintStartTimeEpoch: currentTimeEpoch
          }};
        }
        // CRITICAL: Only move substitute7_2 to substitute7_1 if they are NOT inactive
        if (p.id === periodFormation.substitute7_2 && !isSubstitute7_2Inactive) {
          return {...p, stats: {...p.stats, currentPairKey: 'substitute7_1', currentPeriodRole: PLAYER_ROLES.SUBSTITUTE}};
        }
        // Inactive players never change position - they stay where they are
        return p;
      }));

      // Update formation based on whether substitute7_2 is inactive
      setPeriodFormation(prev => {
        const newFormation = JSON.parse(JSON.stringify(prev));
        newFormation[playerToSubOutKey] = playerComingOnId; // substitute7_1 takes the field position
        
        if (isSubstitute7_2Inactive) {
          // If substitute7_2 is inactive, they stay put and outgoing player becomes substitute7_1
          newFormation.substitute7_1 = playerGoingOffId;
          // substitute7_2 stays the same (inactive player doesn't move)
        } else {
          // Normal rotation: substitute7_2 moves to substitute7_1, outgoing player goes to substitute7_2
          newFormation.substitute7_1 = prev.substitute7_2; 
          newFormation.substitute7_2 = playerGoingOffId;
        }
        
        return newFormation;
      });

      // Update rotation queue after substitution - exclude inactive players from active rotation
      const updatedQueue = [...rotationQueue];
      const currentPlayerIndex = updatedQueue.indexOf(playerGoingOffId);
      
      // Remove the player who just went off from current position
      updatedQueue.splice(currentPlayerIndex, 1);
      // Add them to the end of the queue
      updatedQueue.push(playerGoingOffId);
      
      // Find next active player (skip inactive players) - this is critical
      const activeQueue = updatedQueue.filter(id => {
        const player = allPlayers.find(p => p.id === id);
        return player && !player.stats.isInactive;
      });
      
      const nextPlayerToSubOutId = activeQueue[0] || null;
      
      setRotationQueue(updatedQueue);
      setNextPlayerIdToSubOut(nextPlayerToSubOutId);
      
      // Set next-next player (second active player in queue) for 7-player individual mode
      if (activeQueue.length >= 2) {
        setNextNextPlayerIdToSubOut(activeQueue[1]);
      } else {
        setNextNextPlayerIdToSubOut(null);
      }
      
      // Update legacy position tracking for compatibility
      const outfieldPositions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'];
      const nextPlayerPosition = outfieldPositions.find(pos => periodFormation[pos] === nextPlayerToSubOutId);
      setNextPlayerToSubOut(nextPlayerPosition || 'leftDefender7');
    }
  };

  const handleEndPeriod = () => {
    const currentTimeEpoch = Date.now();
    const selectedSquadPlayers = allPlayers.filter(p => selectedSquadIds.includes(p.id));
    const playerIdsInPeriod = selectedSquadPlayers.map(p => p.id);

    // Calculate updated stats
    const updatedPlayersWithFinalStats = allPlayers.map(p => {
      if (playerIdsInPeriod.includes(p.id)) {
        const stats = { ...p.stats };
        const timeInFinalStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

        if (stats.currentPeriodStatus === 'on_field') {
          stats.timeOnFieldSeconds += timeInFinalStint;
          // Track role-specific time for new points system
          if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) {
            stats.timeAsDefenderSeconds += timeInFinalStint;
          } else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) {
            stats.timeAsAttackerSeconds += timeInFinalStint;
          }
        } else if (stats.currentPeriodStatus === 'substitute') {
          stats.timeAsSubSeconds += timeInFinalStint;
        } else if (stats.currentPeriodStatus === 'goalie') {
          stats.timeAsGoalieSeconds += timeInFinalStint;
        }

        // Update period role counts
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

  // Clear stored state - useful for starting fresh
  const clearStoredState = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored state:', error);
    }
  };

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
  }, [formationType, selectedSquadIds]);

  // Enhanced setters for manual selection - rotation logic already handles sequence correctly
  const setNextPhysicalPairToSubOutWithRotation = useCallback((newPairKey) => {
    console.log('Manually setting next pair to substitute:', newPairKey);
    setNextPhysicalPairToSubOut(newPairKey);
    // The existing rotation logic in handleSubstitution will continue from this selection
  }, []);

  const setNextPlayerToSubOutWithRotation = useCallback((newPosition) => {
    console.log('Manually setting next player to substitute:', newPosition);
    setNextPlayerToSubOut(newPosition);
    
    // For 6-player mode, reorder the rotation queue
    if (periodFormation && periodFormation[newPosition] && rotationQueue.length > 0) {
      const selectedPlayerId = periodFormation[newPosition];
      const originalNextPlayerId = nextPlayerIdToSubOut;
      
      console.log('Reordering queue - selected:', selectedPlayerId, 'was next:', originalNextPlayerId);
      
      // Reorder queue: remove selected player and insert before originally next player
      const newQueue = [...rotationQueue];
      const selectedIndex = newQueue.indexOf(selectedPlayerId);
      const originalNextIndex = newQueue.indexOf(originalNextPlayerId);
      
      if (selectedIndex !== -1 && originalNextIndex !== -1 && selectedIndex !== originalNextIndex) {
        // Remove selected player from current position
        newQueue.splice(selectedIndex, 1);
        
        // Find new position of originally next player (index may have shifted)
        const adjustedNextIndex = newQueue.indexOf(originalNextPlayerId);
        
        // Insert selected player before originally next player
        newQueue.splice(adjustedNextIndex, 0, selectedPlayerId);
        
        setRotationQueue(newQueue);
        console.log('New queue order:', newQueue);
      }
      
      setNextPlayerIdToSubOut(selectedPlayerId);
      console.log('Set next player ID to substitute:', selectedPlayerId);
    }
  }, [periodFormation, rotationQueue, nextPlayerIdToSubOut]);

  // Player inactivation/activation functions for 7-player individual mode
  const togglePlayerInactive = useCallback((playerId, animationCallback = null) => {
    if (formationType !== FORMATION_TYPES.INDIVIDUAL_7) return;

    const player = allPlayers.find(p => p.id === playerId);
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
      const otherSubstitute = allPlayers.find(p => p.id === otherSubstituteId);
      
      if (otherSubstitute?.stats.isInactive) {
        console.warn('Cannot inactivate player: would result in both substitutes being inactive');
        return; // Prevent both substitutes from being inactive
      }
    }

    // Call animation callback if provided (for UI animations)
    if (animationCallback) {
      animationCallback(!currentlyInactive, player.stats.currentPairKey);
    }

    // We'll update the inactive state along with position changes below to avoid race conditions

    // Update rotation queue and positions
    if (currentlyInactive) {
      // Player is being activated - they become the next player to go in (substitute7_1)
      const updatedQueue = rotationQueue.filter(id => id !== playerId);
      const newQueue = [playerId, ...updatedQueue];
      
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
        const activeQueue = newQueue.filter(id => {
          const queuePlayer = allPlayers.find(p => p.id === id);
          return queuePlayer && !queuePlayer.stats.isInactive && id !== playerId;
        });
        if (activeQueue.length >= 1) {
          setNextNextPlayerIdToSubOut(activeQueue[0]);
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
      
      setRotationQueue(newQueue);
    } else {
      // Player is being inactivated - remove from rotation queue
      const updatedQueue = rotationQueue.filter(id => id !== playerId);
      setRotationQueue(updatedQueue);
      
      // Update next player tracking if the inactivated player was next
      if (playerId === nextPlayerIdToSubOut && updatedQueue.length > 0) {
        const activePlayerIds = updatedQueue.filter(id => {
          const queuePlayer = allPlayers.find(p => p.id === id);
          return queuePlayer && !queuePlayer.stats.isInactive;
        });
        if (activePlayerIds.length > 0) {
          setNextPlayerIdToSubOut(activePlayerIds[0]);
          if (activePlayerIds.length >= 2) {
            setNextNextPlayerIdToSubOut(activePlayerIds[1]);
          }
        }
      } else if (playerId === nextNextPlayerIdToSubOut) {
        const activePlayerIds = updatedQueue.filter(id => {
          const queuePlayer = allPlayers.find(p => p.id === id);
          return queuePlayer && !queuePlayer.stats.isInactive;
        });
        if (activePlayerIds.length >= 2) {
          setNextNextPlayerIdToSubOut(activePlayerIds[1]);
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
  }, [formationType, allPlayers, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, periodFormation]);

  // Helper function to get inactive players for animation purposes
  const getInactivePlayerPosition = useCallback((playerId) => {
    const player = allPlayers.find(p => p.id === playerId);
    return player?.stats.currentPairKey;
  }, [allPlayers]);

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
    rotationQueue,
    setRotationQueue,
    gameLog,
    setGameLog,
    
    // Actions
    preparePeriod,
    preparePeriodWithGameLog,
    handleStartPeriodSetup,
    handleStartGame,
    handleSubstitution,
    handleEndPeriod,
    updatePlayerTimeStats,
    addTemporaryPlayer,
    clearStoredState,
    splitPairs,
    formPairs,
    togglePlayerInactive,
    getInactivePlayerPosition,
  };
}