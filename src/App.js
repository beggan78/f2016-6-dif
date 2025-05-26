import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ArrowUpCircle, ArrowDownCircle, Users, Settings, Shield, Zap, Clock, ListChecks, RotateCcw, Play, Square, CheckCircle2, XCircle, PlusCircle, Edit3 } from 'lucide-react';

const initialRoster = [
  "Alma", "Ebba", "Elise", "Filippa", "Fiona", "Ines", "Isabelle",
  "Julie", "Leonie", "Nicole", "Rebecka", "Sigrid", "Sophie", "Tyra"
];

const PLAYER_ROLES = {
  GOALIE: 'Goalie',
  DEFENDER: 'Defender',
  ATTACKER: 'Attacker',
  SUBSTITUTE: 'Substitute', // Used for initial status
  ON_FIELD: 'On Field' // Used for initial status
};

const PERIOD_OPTIONS = [1, 2, 3];
const DURATION_OPTIONS = [10, 15, 20, 25, 30];

// Helper to initialize player objects
const initializePlayers = (roster) => roster.map((name, index) => ({
  id: `p${index + 1}`,
  name,
  stats: {
    startedMatchAs: null, // 'Goalie', 'On Field', 'Substitute'
    periodsAsGoalie: 0,
    periodsAsDefender: 0,
    periodsAsAttacker: 0,
    timeOnFieldSeconds: 0, // Total outfield play time
    timeAsSubSeconds: 0,   // Total time as substitute
    timeAsGoalieSeconds: 0, // Total time as goalie
    // Temporary per-period tracking
    currentPeriodRole: null, // 'Goalie', 'Defender', 'Attacker'
    currentPeriodStatus: null, // 'on_field', 'substitute', 'goalie'
    lastStintStartTimeEpoch: 0, // For calculating duration of current stint
    currentPairKey: null, // 'leftPair', 'rightPair', 'subPair'
  }
}));


// Main App Component
function App() {
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

  // Timers
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(periodDurationMinutes * 60);
  const [subTimerSeconds, setSubTimerSeconds] = useState(0);
  const [isPeriodActive, setIsPeriodActive] = useState(false);
  const [matchTimerIntervalId, setMatchTimerIntervalId] = useState(null);
  const [subTimerIntervalId, setSubTimerIntervalId] = useState(null);

  // Game Log for stats and recommendations
  const [gameLog, setGameLog] = useState([]); // [{ periodNumber, formation, finalStatsSnapshotForAllPlayers }]

  const selectedSquadPlayers = useMemo(() => {
    return allPlayers.filter(p => selectedSquadIds.includes(p.id));
  }, [allPlayers, selectedSquadIds]);

  const availableForPairing = useMemo(() => {
    if (!periodFormation.goalie) return [];
    return selectedSquadPlayers.filter(p => p.id !== periodFormation.goalie);
  }, [selectedSquadPlayers, periodFormation.goalie]);


  // --- Player Stat Update Logic ---
  const updatePlayerTimeStats = useCallback((playerIds, newStatus, currentTimeEpoch) => {
    setAllPlayers(prevPlayers => prevPlayers.map(p => {
      if (playerIds.includes(p.id)) {
        const stats = { ...p.stats };
        const timeInPreviousStint = currentTimeEpoch - stats.lastStintStartTimeEpoch;

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


  // --- Timer Effects ---
  useEffect(() => {
    if (isPeriodActive) {
      const mInterval = setInterval(() => {
        setMatchTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(mInterval);
            // Optionally auto-end period or alert, but prompt says manual end
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setMatchTimerIntervalId(mInterval);

      const sInterval = setInterval(() => {
        setSubTimerSeconds(prev => prev + 1);
      }, 1000);
      setSubTimerIntervalId(sInterval);
    } else {
      if (matchTimerIntervalId) clearInterval(matchTimerIntervalId);
      if (subTimerIntervalId) clearInterval(subTimerIntervalId);
    }
    return () => {
      if (matchTimerIntervalId) clearInterval(matchTimerIntervalId);
      if (subTimerIntervalId) clearInterval(subTimerIntervalId);
    };
  }, [isPeriodActive]);


  // --- Navigation and Setup Logic ---
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

  const preparePeriod = useCallback((periodNum) => {
    const currentGoalieId = periodGoalieIds[periodNum];
    setPeriodFormation(prev => ({
      ...prev,
      goalie: currentGoalieId,
      leftPair: { defender: null, attacker: null },
      rightPair: { defender: null, attacker: null },
      subPair: { defender: null, attacker: null },
    }));

    // Recommendation logic for P2/P3
    if (periodNum > 1 && gameLog.length > 0) {
      const lastPeriodLog = gameLog[gameLog.length - 1];
      const playersWithLastPeriodStats = lastPeriodLog.finalStatsSnapshotForAllPlayers;
      const outfielders = selectedSquadPlayers.filter(p => p.id !== currentGoalieId);

      // Sort outfielders by timeOnFieldSeconds from previous periods
      const sortedOutfielders = [...outfielders].sort((a, b) => {
        const statA = playersWithLastPeriodStats.find(s => s.id === a.id)?.stats.timeOnFieldSeconds || 0;
        const statB = playersWithLastPeriodStats.find(s => s.id === b.id)?.stats.timeOnFieldSeconds || 0;
        return statB - statA; // Descending
      });

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

    setMatchTimerSeconds(periodDurationMinutes * 60);
    setSubTimerSeconds(0);
  }, [periodGoalieIds, periodDurationMinutes, selectedSquadPlayers, gameLog, allPlayers, selectedSquadIds]);


  const generateRecommendedFormation = (currentPeriodNum, currentGoalieId, prevGoalieId, prevFormation, playerStats, squad) => {
    let outfielders = squad.filter(p => p.id !== currentGoalieId);
    let potentialPairs = [];

    // 1. Handle goalie changes and pair integrity
    const exGoalie = prevGoalieId ? squad.find(p => p.id === prevGoalieId) : null;
    const newGoalieOriginalPartner = outfielders.find(p => {
      if (!prevFormation) return false;
      return (prevFormation.leftPair.defender === p.id && prevFormation.leftPair.attacker === currentGoalieId) ||
          (prevFormation.leftPair.attacker === p.id && prevFormation.leftPair.defender === currentGoalieId) ||
          (prevFormation.rightPair.defender === p.id && prevFormation.rightPair.attacker === currentGoalieId) ||
          (prevFormation.rightPair.attacker === p.id && prevFormation.rightPair.defender === currentGoalieId) ||
          (prevFormation.subPair.defender === p.id && prevFormation.subPair.attacker === currentGoalieId) ||
          (prevFormation.subPair.attacker === p.id && prevFormation.subPair.defender === currentGoalieId);
    });

    let remainingOutfielders = [...outfielders];

    if (exGoalie && newGoalieOriginalPartner && exGoalie.id !== newGoalieOriginalPartner.id) {
      potentialPairs.push({ defender: exGoalie.id, attacker: newGoalieOriginalPartner.id }); // Default roles, user can swap
      remainingOutfielders = remainingOutfielders.filter(p => p.id !== exGoalie.id && p.id !== newGoalieOriginalPartner.id);
    }

    // Try to keep other pairs from prevFormation, swapping D/A roles
    const prevPairsKeys = ['leftPair', 'rightPair', 'subPair'];
    for (const key of prevPairsKeys) {
      if (remainingOutfielders.length < 2 || !prevFormation || !prevFormation[key]) continue;
      const prevPair = prevFormation[key];
      if (prevPair.defender === currentGoalieId || prevPair.attacker === currentGoalieId ||
          prevPair.defender === prevGoalieId || prevPair.attacker === prevGoalieId) continue; // Involved goalie

      const p1 = remainingOutfielders.find(p => p.id === prevPair.defender);
      const p2 = remainingOutfielders.find(p => p.id === prevPair.attacker);

      if (p1 && p2) {
        potentialPairs.push({ defender: p2.id, attacker: p1.id }); // Swapped roles
        remainingOutfielders = remainingOutfielders.filter(p => p.id !== p1.id && p.id !== p2.id);
      }
    }

    // Form remaining pairs if any (should be 0 or 2)
    if (remainingOutfielders.length === 2) {
      potentialPairs.push({ defender: remainingOutfielders[0].id, attacker: remainingOutfielders[1].id });
    } else if (remainingOutfielders.length > 0) { // Fallback: just pair them up
      for(let i = 0; i < remainingOutfielders.length; i+=2) {
        if (remainingOutfielders[i+1]) {
          potentialPairs.push({ defender: remainingOutfielders[i].id, attacker: remainingOutfielders[i+1].id });
        }
      }
    }

    // Ensure 3 pairs. If not, fill with nulls (user must complete)
    while (potentialPairs.length < 3) {
      potentialPairs.push({ defender: null, attacker: null });
    }
    if (potentialPairs.length > 3) potentialPairs = potentialPairs.slice(0,3);


    // 2. Recommend substitute pair
    const outfieldersWithStats = outfielders.map(p => {
      const pStats = playerStats.find(s => s.id === p.id);
      return { ...p, totalOutfieldTime: pStats?.stats.timeOnFieldSeconds || 0 };
    }).sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);

    let recommendedSubPair = { defender: null, attacker: null };
    if (outfieldersWithStats.length > 0) {
      const mostTimePlayer = outfieldersWithStats[0];
      recommendedSubPair = potentialPairs.find(pair => pair.defender === mostTimePlayer.id || pair.attacker === mostTimePlayer.id) || potentialPairs[0];
    } else {
      recommendedSubPair = potentialPairs[0];
    }

    // 3. Recommend first rotation off
    const nonSubPairs = potentialPairs.filter(p => p !== recommendedSubPair);
    let firstToSubPairRec = { defender: null, attacker: null };
    if (nonSubPairs.length > 0) {
      const playersInNonSubPairs = nonSubPairs.flatMap(p => [
        outfieldersWithStats.find(os => os.id === p.defender),
        outfieldersWithStats.find(os => os.id === p.attacker)
      ]).filter(Boolean).sort((a,b) => b.totalOutfieldTime - a.totalOutfieldTime);

      if (playersInNonSubPairs.length > 0) {
        const mostTimePlayerNonSub = playersInNonSubPairs[0];
        firstToSubPairRec = nonSubPairs.find(pair => pair.defender === mostTimePlayerNonSub.id || pair.attacker === mostTimePlayerNonSub.id) || nonSubPairs[0];
      } else {
        firstToSubPairRec = nonSubPairs[0] || potentialPairs.find(p => p !== recommendedSubPair) || potentialPairs[1]; // Fallback
      }
    } else {
      firstToSubPairRec = potentialPairs.find(p => p !== recommendedSubPair) || potentialPairs[1]; // Fallback
    }


    // Assign to Left, Right, Subs ensuring distinctness
    let finalLeft = { defender: null, attacker: null };
    let finalRight = { defender: null, attacker: null };
    let finalSubs = recommendedSubPair;
    let firstToSubDesignation = 'leftPair';

    const remainingPotentialPairs = potentialPairs.filter(p => p !== finalSubs);
    if (remainingPotentialPairs.length > 0) {
      if (firstToSubPairRec === remainingPotentialPairs[0] || (remainingPotentialPairs.length === 1 && firstToSubPairRec === remainingPotentialPairs[0])) {
        finalLeft = remainingPotentialPairs[0];
        firstToSubDesignation = 'leftPair';
        if (remainingPotentialPairs.length > 1) finalRight = remainingPotentialPairs[1];
        else finalRight = potentialPairs.find(p => p !== finalLeft && p !== finalSubs) || {defender: null, attacker: null}; // Fallback
      } else if (remainingPotentialPairs.length > 1 && firstToSubPairRec === remainingPotentialPairs[1]) {
        finalRight = remainingPotentialPairs[1];
        firstToSubDesignation = 'rightPair';
        finalLeft = remainingPotentialPairs[0];
      } else { // Fallback if firstToSubPairRec is somehow the sub pair or not found
        finalLeft = remainingPotentialPairs[0];
        firstToSubDesignation = 'leftPair';
        if (remainingPotentialPairs.length > 1) finalRight = remainingPotentialPairs[1];
        else finalRight = potentialPairs.find(p => p !== finalLeft && p !== finalSubs) || {defender: null, attacker: null};
      }
    }

    // Ensure all pairs are distinct objects, even if players are null
    const allAssignedPlayerIds = [
      finalLeft.defender, finalLeft.attacker,
      finalRight.defender, finalRight.attacker,
      finalSubs.defender, finalSubs.attacker
    ].filter(Boolean);
    const uniqueAssignedPlayerIds = new Set(allAssignedPlayerIds);

    if (allAssignedPlayerIds.length !== uniqueAssignedPlayerIds.size && outfielders.length === 6) {
      // This indicates a problem in pair formation logic, needs robust fixing or manual assignment
      console.error("Duplicate player assignment in recommended formation. User should verify.");
      // Fallback to empty pairs for user to fill if critical error
      const emptyPair = {defender: null, attacker: null};
      return { recommendedLeft: emptyPair, recommendedRight: emptyPair, recommendedSubs: emptyPair, firstToSubRec: 'leftPair' };
    }


    return {
      recommendedLeft: finalLeft,
      recommendedRight: finalRight,
      recommendedSubs: finalSubs,
      firstToSubRec: firstToSubDesignation
    };
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

    setIsPeriodActive(true);
    setView('game');
  };

  const handleSubstitution = () => {
    if (!isPeriodActive) return;

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
    setSubTimerSeconds(0);
  };

  const handleEndPeriod = () => {
    setIsPeriodActive(false); // Stops timers via useEffect

    const currentTimeEpoch = Date.now();
    const playerIdsInPeriod = selectedSquadPlayers.map(p => p.id);
    // Final time update for all players in the period
    setAllPlayers(prevPlayers => prevPlayers.map(p => {
      if (playerIdsInPeriod.includes(p.id)) {
        const stats = { ...p.stats };
        const timeInFinalStint = currentTimeEpoch - stats.lastStintStartTimeEpoch;

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
    }));

    // Log period data (important: use a snapshot of allPlayers for this log entry)
    setGameLog(prevLog => {
      const currentPlayersSnapshot = allPlayers.map(p => ({
        id: p.id,
        name: p.name,
        stats: JSON.parse(JSON.stringify(p.stats)) // Deep copy of stats for the log
      }));
      return [
        ...prevLog,
        {
          periodNumber: currentPeriodNumber,
          formation: JSON.parse(JSON.stringify(periodFormation)),
          finalStatsSnapshotForAllPlayers: currentPlayersSnapshot,
        }
      ];
    });


    if (currentPeriodNumber < numPeriods) {
      setCurrentPeriodNumber(prev => prev + 1);
      preparePeriod(currentPeriodNumber + 1);
      setView('periodSetup');
    } else {
      setView('stats');
    }
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Render logic
  const renderView = () => {
    switch (view) {
      case 'config':
        return <ConfigurationScreen {...{ allPlayers, selectedSquadIds, setSelectedSquadIds, numPeriods, setNumPeriods, periodDurationMinutes, setPeriodDurationMinutes, periodGoalieIds, setPeriodGoalieIds, handleStartPeriodSetup, selectedSquadPlayers }} />;
      case 'periodSetup':
        return <PeriodSetupScreen {...{ currentPeriodNumber, periodFormation, setPeriodFormation, availableForPairing, allPlayers, handleStartGame, gameLog, selectedSquadPlayers, periodGoalieIds, setPeriodGoalieIds, numPeriods }} />;
      case 'game':
        return <GameScreen {...{ currentPeriodNumber, periodFormation, allPlayers, matchTimerSeconds, subTimerSeconds, formatTime, handleSubstitution, handleEndPeriod, nextPhysicalPairToSubOut }} />;
      case 'stats':
        return <StatsScreen {...{ allPlayers: gameLog[gameLog.length-1]?.finalStatsSnapshotForAllPlayers || selectedSquadPlayers, formatTime, setView, setAllPlayers, setSelectedSquadIds, setPeriodGoalieIds, setGameLog }} />;
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans">
        <header className="w-full max-w-2xl text-center mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">DIF F2016-6 Game App</h1>
        </header>
        <main className="w-full max-w-2xl bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl">
          {renderView()}
        </main>
        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Coach App. Streamlined for your success.</p>
        </footer>
      </div>
  );
}


// --- ConfigurationScreen ---
function ConfigurationScreen({ allPlayers, selectedSquadIds, setSelectedSquadIds, numPeriods, setNumPeriods, periodDurationMinutes, setPeriodDurationMinutes, periodGoalieIds, setPeriodGoalieIds, handleStartPeriodSetup, selectedSquadPlayers }) {
  const togglePlayerSelection = (playerId) => {
    setSelectedSquadIds(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const handleGoalieChange = (period, playerId) => {
    setPeriodGoalieIds(prev => ({ ...prev, [period]: playerId }));
  };

  return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-sky-300 flex items-center"><Settings className="mr-2 h-6 w-6" />Game & Squad Configuration</h2>

        {/* Squad Selection */}
        <div className="p-4 bg-slate-700 rounded-md">
          <h3 className="text-lg font-medium text-sky-200 mb-2">Select Squad ({selectedSquadIds.length}/7 Players)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allPlayers.map(player => (
                <label key={player.id} className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
                  <input
                      type="checkbox"
                      checked={selectedSquadIds.includes(player.id)}
                      onChange={() => togglePlayerSelection(player.id)}
                      className="form-checkbox h-5 w-5 text-sky-500 bg-slate-800 border-slate-500 rounded focus:ring-sky-400"
                      disabled={selectedSquadIds.length >= 7 && !selectedSquadIds.includes(player.id)}
                  />
                  <span>{player.name}</span>
                </label>
            ))}
          </div>
        </div>

        {/* Game Settings */}
        <div className="p-4 bg-slate-700 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="numPeriods" className="block text-sm font-medium text-sky-200 mb-1">Number of Periods</label>
            <Select value={numPeriods} onChange={e => setNumPeriods(Number(e.target.value))} options={PERIOD_OPTIONS} id="numPeriods" />
          </div>
          <div>
            <label htmlFor="periodDuration" className="block text-sm font-medium text-sky-200 mb-1">Period Duration (minutes)</label>
            <Select value={periodDurationMinutes} onChange={e => setPeriodDurationMinutes(Number(e.target.value))} options={DURATION_OPTIONS} id="periodDuration" />
          </div>
        </div>

        {/* Goalie Assignment */}
        {selectedSquadIds.length === 7 && (
            <div className="p-4 bg-slate-700 rounded-md">
              <h3 className="text-lg font-medium text-sky-200 mb-2">Assign Goalies</h3>
              <div className="space-y-3">
                {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => (
                    <div key={period}>
                      <label htmlFor={`goalie_p${period}`} className="block text-sm font-medium text-sky-200 mb-1">Period {period} Goalie</label>
                      <Select
                          id={`goalie_p${period}`}
                          value={periodGoalieIds[period] || ""}
                          onChange={e => handleGoalieChange(period, e.target.value)}
                          options={selectedSquadPlayers.map(p => ({ value: p.id, label: p.name }))}
                          placeholder="Select Goalie"
                      />
                    </div>
                ))}
              </div>
            </div>
        )}

        <Button onClick={handleStartPeriodSetup} disabled={selectedSquadIds.length !== 7 || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)} Icon={Play}>
          Proceed to Period Setup
        </Button>
      </div>
  );
}

// --- PeriodSetupScreen ---
function PeriodSetupScreen({ currentPeriodNumber, periodFormation, setPeriodFormation, availableForPairing, allPlayers, handleStartGame, gameLog, selectedSquadPlayers, periodGoalieIds, setPeriodGoalieIds, numPeriods }) {
  const goalieForPeriod = allPlayers.find(p => p.id === periodFormation.goalie);

  const handlePlayerAssignment = (pairKey, role, playerId) => {
    // Ensure player is not already assigned elsewhere in this period's outfield formation
    const otherAssignments = [];
    ['leftPair', 'rightPair', 'subPair'].forEach(pk => {
      if (pk !== pairKey) {
        if (periodFormation[pk]?.defender) otherAssignments.push(periodFormation[pk].defender);
        if (periodFormation[pk]?.attacker) otherAssignments.push(periodFormation[pk].attacker);
      } else { // current pair, different role
        if (role === 'defender' && periodFormation[pk]?.attacker) otherAssignments.push(periodFormation[pk].attacker);
        if (role === 'attacker' && periodFormation[pk]?.defender) otherAssignments.push(periodFormation[pk].defender);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      alert(`${allPlayers.find(p=>p.id === playerId)?.name || 'Player'} is already assigned. Choose a different player.`);
      return; // Don't update if player is already assigned
    }

    setPeriodFormation(prev => ({
      ...prev,
      [pairKey]: { ...prev[pairKey], [role]: playerId }
    }));
  };

  const getAvailableForSelect = (currentPairKey, currentRole) => {
    const assignedElsewhereIds = new Set();
    ['leftPair', 'rightPair', 'subPair'].forEach(pk => {
      const pair = periodFormation[pk];
      if (pair) {
        if (pk !== currentPairKey || (pk === currentPairKey && currentRole !== 'defender')) {
          if (pair.defender) assignedElsewhereIds.add(pair.defender);
        }
        if (pk !== currentPairKey || (pk === currentPairKey && currentRole !== 'attacker')) {
          if (pair.attacker) assignedElsewhereIds.add(pair.attacker);
        }
      }
    });
    return availableForPairing.filter(p => !assignedElsewhereIds.has(p.id));
  };

  const handleGoalieChangeForCurrentPeriod = (playerId) => {
    setPeriodGoalieIds(prev => ({ ...prev, [currentPeriodNumber]: playerId }));
    // Also update the periodFormation.goalie immediately
    setPeriodFormation(prev => ({
      ...prev,
      goalie: playerId,
      // Potentially clear pairs if new goalie was in one, or let user resolve
      // For simplicity, just update goalie. User must re-evaluate pairs.
    }));
  };

  const isFormationComplete = () => {
    const outfielders = [
      periodFormation.leftPair.defender, periodFormation.leftPair.attacker,
      periodFormation.rightPair.defender, periodFormation.rightPair.attacker,
      periodFormation.subPair.defender, periodFormation.subPair.attacker
    ].filter(Boolean);
    return periodFormation.goalie && outfielders.length === 6 && new Set(outfielders).size === 6;
  };

  return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-sky-300 flex items-center"><Users className="mr-2 h-6 w-6" />Period {currentPeriodNumber} Team Selection</h2>

        <div className="p-4 bg-slate-700 rounded-md">
          <h3 className="text-lg font-medium text-sky-200 mb-2">Goalie for Period {currentPeriodNumber}</h3>
          {goalieForPeriod ? (
              <div className="flex items-center justify-between p-2 bg-sky-600 rounded-md">
                <span className="text-white">{goalieForPeriod.name}</span>
                <Button onClick={() => handleGoalieChangeForCurrentPeriod(null)} size="sm" variant="secondary" Icon={Edit3}>Change</Button>
              </div>
          ) : (
              <Select
                  value={periodFormation.goalie || ""}
                  onChange={e => handleGoalieChangeForCurrentPeriod(e.target.value)}
                  options={selectedSquadPlayers.map(p => ({ value: p.id, label: p.name }))}
                  placeholder="Select Goalie for this Period"
              />
          )}
        </div>

        {periodFormation.goalie && (
            <>
              <PairSelectionCard
                  title="Left Pair (On Field)"
                  pairKey="leftPair"
                  pair={periodFormation.leftPair}
                  onPlayerAssign={handlePlayerAssignment}
                  getAvailableOptions={getAvailableForSelect}
                  allPlayers={allPlayers}
              />
              <PairSelectionCard
                  title="Right Pair (On Field)"
                  pairKey="rightPair"
                  pair={periodFormation.rightPair}
                  onPlayerAssign={handlePlayerAssignment}
                  getAvailableOptions={getAvailableForSelect}
                  allPlayers={allPlayers}
              />
              <PairSelectionCard
                  title="Substitute Pair"
                  pairKey="subPair"
                  pair={periodFormation.subPair}
                  onPlayerAssign={handlePlayerAssignment}
                  getAvailableOptions={getAvailableForSelect}
                  allPlayers={allPlayers}
              />
            </>
        )}

        <Button onClick={handleStartGame} disabled={!isFormationComplete()} Icon={Play}>
          Start Period {currentPeriodNumber}
        </Button>
      </div>
  );
}

function PairSelectionCard({ title, pairKey, pair, onPlayerAssign, getAvailableOptions, allPlayers }) {
  const defenderOptions = getAvailableOptions(pairKey, 'defender');
  const attackerOptions = getAvailableOptions(pairKey, 'attacker');

  return (
      <div className="p-4 bg-slate-700 rounded-md space-y-3">
        <h3 className="text-lg font-medium text-sky-200">{title}</h3>
        <div>
          <label className="block text-sm font-medium text-sky-200 mb-1">Defender</label>
          <Select
              value={pair.defender || ""}
              onChange={e => onPlayerAssign(pairKey, 'defender', e.target.value)}
              options={defenderOptions.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Select Defender"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-sky-200 mb-1">Attacker</label>
          <Select
              value={pair.attacker || ""}
              onChange={e => onPlayerAssign(pairKey, 'attacker', e.target.value)}
              options={attackerOptions.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Select Attacker"
          />
        </div>
      </div>
  );
}


// --- GameScreen ---
function GameScreen({ currentPeriodNumber, periodFormation, allPlayers, matchTimerSeconds, subTimerSeconds, formatTime, handleSubstitution, handleEndPeriod, nextPhysicalPairToSubOut }) {
  const getPlayerName = (id) => allPlayers.find(p => p.id === id)?.name || 'N/A';

  const renderPair = (pairKey, pairName) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;
    const isNextOff = pairKey === nextPhysicalPairToSubOut && pairKey !== 'subPair';
    const isNextOn = pairKey === 'subPair';

    let bgColor = 'bg-slate-700'; // Default for subs or if logic is off
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';

    if (pairKey === 'leftPair' || pairKey === 'rightPair') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn) {
      borderColor = 'border-emerald-500';
    }

    return (
        <div className={`p-4 rounded-lg shadow-md transition-all border-2 ${borderColor} ${bgColor} ${textColor}`}>
          <h3 className="text-lg font-semibold mb-2 flex items-center justify-between">
            {pairName}
            <div>
              {isNextOff && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
              {isNextOn && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
            </div>
          </h3>
          <p><Shield className="inline h-4 w-4 mr-1" /> D: {getPlayerName(pairData.defender)}</p>
          <p><Zap className="inline h-4 w-4 mr-1" /> A: {getPlayerName(pairData.attacker)}</p>
        </div>
    );
  };

  return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber} In Progress</h2>

        {/* Timers */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-slate-700 rounded-lg">
            <p className="text-sm text-sky-200 mb-1">Match Clock</p>
            <p className="text-4xl font-mono text-sky-400">{formatTime(matchTimerSeconds)}</p>
          </div>
          <div className="p-4 bg-slate-700 rounded-lg">
            <p className="text-sm text-sky-200 mb-1">Substitution Timer</p>
            <p className="text-4xl font-mono text-emerald-400">{formatTime(subTimerSeconds)}</p>
          </div>
        </div>

        {/* Field & Subs Visualization */}
        <div className="p-1 bg-slate-700 rounded-lg">
          <p className="text-center my-2 text-sky-200">Goalie: <span className="font-semibold">{getPlayerName(periodFormation.goalie)}</span></p>
        </div>
        <div className="space-y-4">
          {renderPair('leftPair', 'Left Pair (Field)')}
          {renderPair('rightPair', 'Right Pair (Field)')}
          {renderPair('subPair', 'Substitutes')}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <Button onClick={handleSubstitution} Icon={RotateCcw} className="flex-1">
            SUB NOW
          </Button>
          <Button onClick={handleEndPeriod} Icon={Square} variant="danger" className="flex-1">
            End Period
          </Button>
        </div>
      </div>
  );
}

// --- StatsScreen ---
function StatsScreen({ allPlayers, formatTime, setView, setAllPlayers, setSelectedSquadIds, setPeriodGoalieIds, setGameLog }) {
  const squadForStats = allPlayers.filter(p => p.stats.startedMatchAs !== null); // Show only players who were part of the game

  const handleNewGame = () => {
    // Reset global state for a new game configuration
    setAllPlayers(prev => initializePlayers(initialRoster)); // Full reset of all player stats
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setGameLog([]);
    setView('config');
  };
  return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-sky-300 flex items-center"><ListChecks className="mr-2 h-6 w-6" />Game Over - Statistics</h2>

        <div className="overflow-x-auto bg-slate-700 rounded-lg p-1">
          <table className="min-w-full divide-y divide-slate-600">
            <thead className="bg-slate-800">
            <tr>
              {['Player', 'Started', 'G', 'D', 'A', 'Field Time', 'Sub Time', 'Goalie Time'].map(header => (
                  <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-medium text-sky-200 uppercase tracking-wider">
                    {header}
                  </th>
              ))}
            </tr>
            </thead>
            <tbody className="bg-slate-700 divide-y divide-slate-600">
            {squadForStats.map(player => (
                <tr key={player.id}>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-100">{player.name}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">
                    {player.stats.startedMatchAs === PLAYER_ROLES.GOALIE ? 'G' :
                        player.stats.startedMatchAs === PLAYER_ROLES.ON_FIELD ? 'F' :
                            player.stats.startedMatchAs === PLAYER_ROLES.SUBSTITUTE ? 'S' : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{player.stats.periodsAsGoalie}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{player.stats.periodsAsDefender}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300">{player.stats.periodsAsAttacker}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeOnFieldSeconds)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeAsSubSeconds)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-300 font-mono">{formatTime(player.stats.timeAsGoalieSeconds)}</td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        <Button onClick={handleNewGame} Icon={PlusCircle}>
          Start New Game Configuration
        </Button>
      </div>
  );
}


// --- UI Helper Components ---
function Select({ value, onChange, options, placeholder, id, disabled }) {
  return (
      <div className="relative">
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full appearance-none bg-slate-600 border border-slate-500 text-slate-100 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
              typeof opt === 'object' ?
                  <option key={opt.value} value={opt.value}>{opt.label}</option> :
                  <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <ChevronDown size={18} />
        </div>
      </div>
  );
}

function Button({ onClick, children, Icon, variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const baseStyle = "font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-150 ease-in-out flex items-center justify-center space-x-2";

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variantStyles = {
    primary: `bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-600 hover:bg-slate-500 text-sky-100 focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };

  return (
      <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      >
        {Icon && <Icon className={`h-4 w-4 ${size === 'lg' ? 'h-5 w-5' : ''}`} />}
        <span>{children}</span>
      </button>
  );
}

export default App;

