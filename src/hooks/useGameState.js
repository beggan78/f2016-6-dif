import { useState, useCallback } from 'react';
import { initializePlayers, initialRoster, PLAYER_ROLES } from '../utils/gameLogic';
import { generateRecommendedFormation } from '../utils/formationGenerator';

export function useGameState() {
  const [allPlayers, setAllPlayers] = useState(() => initializePlayers(initialRoster));
  const [view, setView] = useState('config'); // 'config', 'periodSetup', 'game', 'stats'

  // Game Settings
  const [selectedSquadIds, setSelectedSquadIds] = useState([]);
  const [numPeriods, setNumPeriods] = useState(3);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState(15);
  const [periodGoalieIds, setPeriodGoalieIds] = useState({}); // {1: playerId, 2: playerId, ...}

  // Period State
  const [currentPeriodNumber, setCurrentPeriodNumber] = useState(1);
  const [periodFormation, setPeriodFormation] = useState({ // Player IDs
    goalie: null,
    leftPair: { defender: null, attacker: null },
    rightPair: { defender: null, attacker: null },
    subPair: { defender: null, attacker: null },
  });
  const [nextPhysicalPairToSubOut, setNextPhysicalPairToSubOut] = useState('leftPair'); // 'leftPair' or 'rightPair'

  // Game Log for stats and recommendations
  const [gameLog, setGameLog] = useState([]); // [{ periodNumber, formation, finalStatsSnapshotForAllPlayers }]

  // Player Stat Update Logic
  const updatePlayerTimeStats = useCallback((playerIds, newStatus, currentTimeEpoch) => {
    setAllPlayers(prevPlayers => prevPlayers.map(p => {
      if (playerIds.includes(p.id)) {
        const stats = { ...p.stats };
        const timeInPreviousStint = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);

        if (stats.currentPeriodStatus === 'on_field') {
          stats.timeOnFieldSeconds += timeInPreviousStint;
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

  const preparePeriodWithGameLog = useCallback((periodNum, gameLogToUse) => {
    const currentGoalieId = periodGoalieIds[periodNum];

    setPeriodFormation(prev => ({
      ...prev,
      goalie: currentGoalieId,
      leftPair: { defender: null, attacker: null },
      rightPair: { defender: null, attacker: null },
      subPair: { defender: null, attacker: null },
    }));

    // Recommendation logic for P2/P3
    if (periodNum > 1 && gameLogToUse.length > 0) {
      const lastPeriodLog = gameLogToUse[gameLogToUse.length - 1];
      const playersWithLastPeriodStats = lastPeriodLog.finalStatsSnapshotForAllPlayers;


      // Auto-generate pairs and roles based on recommendations
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
      });
      setNextPhysicalPairToSubOut(firstToSubRec); // 'leftPair' or 'rightPair'

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
    if (selectedSquadIds.length !== 7) {
      alert("Please select exactly 7 players for the squad."); // Replace with modal
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
    // Validate formation
    const allOutfieldersInFormation = [
      periodFormation.leftPair.defender, periodFormation.leftPair.attacker,
      periodFormation.rightPair.defender, periodFormation.rightPair.attacker,
      periodFormation.subPair.defender, periodFormation.subPair.attacker,
    ].filter(Boolean);

    if (new Set(allOutfieldersInFormation).size !== 6 || !periodFormation.goalie) {
      alert("Please complete the team formation with 1 goalie and 6 unique outfield players in pairs."); // Replace with modal
      return;
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
      } else if (p.id === periodFormation.leftPair.defender) {
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

    setView('game');
  };

  const handleSubstitution = () => {
    const pairToSubOutKey = nextPhysicalPairToSubOut;
    const pairToSubInKey = 'subPair';

    const pairGettingSubbed = periodFormation[pairToSubOutKey];
    const pairComingIn = periodFormation[pairToSubInKey];

    const playersGoingOffIds = [pairGettingSubbed.defender, pairGettingSubbed.attacker].filter(Boolean);
    const playersComingOnIds = [pairComingIn.defender, pairComingIn.attacker].filter(Boolean);

    const currentTimeEpoch = Date.now();
    updatePlayerTimeStats(playersGoingOffIds, 'substitute', currentTimeEpoch);
    updatePlayerTimeStats(playersComingOnIds, 'on_field', currentTimeEpoch);

    // Swap player IDs in formation
    setPeriodFormation(prev => {
      const newFormation = JSON.parse(JSON.stringify(prev)); // Deep copy
      // The players from subPair take the roles of the pair they replace on field
      // The players from on-field pair become the new subPair, keeping their D/A assignment
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
    setNextPhysicalPairToSubOut,
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
  };
}