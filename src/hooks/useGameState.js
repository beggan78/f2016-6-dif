import { useState, useCallback, useEffect } from 'react';
import { initializePlayers, initialRoster, PLAYER_ROLES } from '../utils/gameLogic';
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
        },
        nextPhysicalPairToSubOut: saved.nextPhysicalPairToSubOut || 'leftPair',
        nextPlayerToSubOut: saved.nextPlayerToSubOut || 'leftDefender', // For 6-player mode (legacy)
        nextPlayerIdToSubOut: saved.nextPlayerIdToSubOut || null, // New: track actual player ID
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
  const [currentPeriodNumber, setCurrentPeriodNumber] = useState(initialState.currentPeriodNumber);
  const [periodFormation, setPeriodFormation] = useState(initialState.periodFormation);
  const [nextPhysicalPairToSubOut, setNextPhysicalPairToSubOut] = useState(initialState.nextPhysicalPairToSubOut);
  const [nextPlayerToSubOut, setNextPlayerToSubOut] = useState(initialState.nextPlayerToSubOut);
  const [nextPlayerIdToSubOut, setNextPlayerIdToSubOut] = useState(initialState.nextPlayerIdToSubOut);
  const [rotationQueue, setRotationQueue] = useState(initialState.rotationQueue);
  const [gameLog, setGameLog] = useState(initialState.gameLog);

  // Save state to localStorage whenever it changes - NOTE: Critical for refresh persistence
  useEffect(() => {
    const currentState = {
      allPlayers,
      view,
      selectedSquadIds,
      numPeriods,
      periodDurationMinutes,
      periodGoalieIds,
      currentPeriodNumber,
      periodFormation,
      nextPhysicalPairToSubOut,
      nextPlayerToSubOut,
      nextPlayerIdToSubOut,
      rotationQueue,
      gameLog,
    };
    saveToStorage(currentState);
  }, [allPlayers, view, selectedSquadIds, numPeriods, periodDurationMinutes, periodGoalieIds, currentPeriodNumber, periodFormation, nextPhysicalPairToSubOut, nextPlayerToSubOut, nextPlayerIdToSubOut, rotationQueue, gameLog]);

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
    if (position === 'leftDefender' || position === 'rightDefender') {
      return PLAYER_ROLES.DEFENDER;
    } else if (position === 'leftAttacker' || position === 'rightAttacker') {
      return PLAYER_ROLES.ATTACKER;
    } else if (position === 'substitute') {
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
      const teamSize = selectedSquadIds.length;

      if (teamSize === 7) {
        // 7-player formation generation
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
        });
        setNextPhysicalPairToSubOut(firstToSubRec); // 'leftPair' or 'rightPair'
      } else if (teamSize === 6) {
        // 6-player formation generation - recommend player with most time as substitute
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
        
        // Initialize rotation queue for 6-player mode
        const initialQueue = outfieldersWithStats.map(p => p.id);
        setRotationQueue(initialQueue);
      }

    } else {
      // For P1, or if recommendations fail, reset pairs (user fills manually)
      setPeriodFormation({
        goalie: currentGoalieId,
        leftPair: { defender: null, attacker: null },
        rightPair: { defender: null, attacker: null },
        subPair: { defender: null, attacker: null },
      });
      setNextPhysicalPairToSubOut('leftPair');
    }
  }, [periodGoalieIds, selectedSquadIds, allPlayers]);

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
    // Validate formation based on team size
    const teamSize = selectedSquadIds.length;
    
    if (teamSize === 7) {
      // 7-player validation (pairs)
      const allOutfieldersInFormation = [
        periodFormation.leftPair.defender, periodFormation.leftPair.attacker,
        periodFormation.rightPair.defender, periodFormation.rightPair.attacker,
        periodFormation.subPair.defender, periodFormation.subPair.attacker,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 6 || !periodFormation.goalie) {
        alert("Please complete the team formation with 1 goalie and 6 unique outfield players in pairs."); // Replace with modal
        return;
      }
    } else if (teamSize === 6) {
      // 6-player validation (individual positions)
      const allOutfieldersInFormation = [
        periodFormation.leftDefender, periodFormation.rightDefender,
        periodFormation.leftAttacker, periodFormation.rightAttacker,
        periodFormation.substitute,
      ].filter(Boolean);

      if (new Set(allOutfieldersInFormation).size !== 5 || !periodFormation.goalie) {
        alert("Please complete the team formation with 1 goalie and 5 unique outfield players."); // Replace with modal
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
      } else if (teamSize === 7) {
        // 7-player logic (pairs)
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
      } else if (teamSize === 6) {
        // 6-player logic (individual positions)
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

    // Initialize nextPlayerIdToSubOut and rotation queue for 6-player mode
    if (teamSize === 6 && nextPlayerToSubOut) {
      const initialPlayerToSubOut = periodFormation[nextPlayerToSubOut];
      setNextPlayerIdToSubOut(initialPlayerToSubOut);
      
      // Initialize rotation queue with all outfield players
      const outfieldPositions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'];
      const initialQueue = outfieldPositions.map(pos => periodFormation[pos]).filter(Boolean);
      setRotationQueue(initialQueue);
    }

    setView('game');
  };

  const handleSubstitution = () => {
    const currentTimeEpoch = Date.now();
    const teamSize = selectedSquadIds.length;

    if (teamSize === 7) {
      // 7-player substitution logic (pairs)
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
    } else if (teamSize === 6) {
      // 6-player substitution logic (player-based round-robin)
      const playerGoingOffId = nextPlayerIdToSubOut;
      const playerComingOnId = periodFormation.substitute;
      
      // Find which position the outgoing player is currently in
      const playerToSubOutKey = Object.keys(periodFormation).find(key => 
        periodFormation[key] === playerGoingOffId && key !== 'substitute' && key !== 'goalie'
      );

      updatePlayerTimeStats([playerGoingOffId], 'substitute', currentTimeEpoch);
      updatePlayerTimeStats([playerComingOnId], 'on_field', currentTimeEpoch);

      // Swap player IDs in formation
      setPeriodFormation(prev => {
        const newFormation = JSON.parse(JSON.stringify(prev));
        newFormation[playerToSubOutKey] = playerComingOnId;
        newFormation.substitute = playerGoingOffId;
        return newFormation;
      });

      // Update player's currentPairKey and currentPeriodRole
      setAllPlayers(prev => prev.map(p => {
        if (p.id === playerGoingOffId) {
          return {...p, stats: {...p.stats, currentPairKey: 'substitute', currentPeriodRole: PLAYER_ROLES.SUBSTITUTE}};
        }
        if (p.id === playerComingOnId) {
          const newRole = getPositionRole(playerToSubOutKey);
          return {...p, stats: {...p.stats, currentPairKey: playerToSubOutKey, currentPeriodRole: newRole}};
        }
        return p;
      }));

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
  };
}