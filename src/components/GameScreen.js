import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, RotateCcw, Square, Clock, Pause, Play, Undo2 } from 'lucide-react';
import { Button, FieldPlayerModal, SubstitutePlayerModal, GoalieModal, ScoreEditModal, ConfirmationModal } from './UI';
import { FORMATION_TYPES } from '../utils/gameLogic';
import { formatTimeDifference } from '../utils/formatUtils';
import { createAnimationCalculator } from '../utils/animationSupport';
import { getPlayerName, findPlayerById } from '../utils/playerUtils';

// Animation timing constants
const ANIMATION_DURATION = 1000; // 1 second for position transitions
const GLOW_DURATION = 900; // 0.9 seconds for post-animation glow effect

export function GameScreen({ 
  currentPeriodNumber, 
  periodFormation, 
  setPeriodFormation,
  allPlayers, 
  setAllPlayers,
  matchTimerSeconds, 
  subTimerSeconds, 
  isSubTimerPaused,
  pauseSubTimer,
  resumeSubTimer,
  formatTime, 
  handleSubstitution, 
  handleUndoSubstitution: handleUndoSubstitutionTimer,
  handleEndPeriod, 
  nextPhysicalPairToSubOut,
  nextPlayerToSubOut,
  nextPlayerIdToSubOut,
  nextNextPlayerIdToSubOut,
  setNextNextPlayerIdToSubOut,
  selectedSquadPlayers,
  setNextPhysicalPairToSubOut,
  setNextPlayerToSubOut,
  setNextPlayerIdToSubOut,
  formationType,
  alertMinutes,
  togglePlayerInactive,
  switchPlayerPositions,
  switchGoalie,
  getOutfieldPlayers,
  pushModalState,
  removeModalFromStack,
  homeScore,
  awayScore,
  opponentTeamName,
  addHomeGoal,
  addAwayGoal,
  setScore
}) {
  const getPlayerNameById = React.useCallback((id) => getPlayerName(allPlayers, id), [allPlayers]);
  
  // Helper functions for The modal can modal management with browser back intercept
  const openFieldPlayerModal = React.useCallback((modalData) => {
    setFieldPlayerModal(modalData);
    if (pushModalState) {
      pushModalState(() => {
        setFieldPlayerModal({ 
          isOpen: false, 
          type: null, 
          target: null, 
          playerName: '', 
          sourcePlayerId: null, 
          availablePlayers: [], 
          showPositionOptions: false
        });
      });
    }
  }, [pushModalState]);

  const closeFieldPlayerModal = React.useCallback(() => {
    setFieldPlayerModal({ 
      isOpen: false, 
      type: null, 
      target: null, 
      playerName: '', 
      sourcePlayerId: null, 
      availablePlayers: [], 
      showPositionOptions: false
    });
  }, []);

  const openSubstituteModal = React.useCallback((modalData) => {
    setSubstituteModal(modalData);
    if (pushModalState) {
      pushModalState(() => {
        setSubstituteModal({ isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false, canSetAsNextToGoIn: false });
      });
    }
  }, [pushModalState]);

  const closeSubstituteModal = React.useCallback(() => {
    setSubstituteModal({ isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false, canSetAsNextToGoIn: false });
  }, []);

  const openGoalieModal = React.useCallback((modalData) => {
    setGoalieModal(modalData);
    if (pushModalState) {
      pushModalState(() => {
        setGoalieModal({ isOpen: false, currentGoalieName: '', availablePlayers: [] });
      });
    }
  }, [pushModalState]);

  const closeGoalieModal = React.useCallback(() => {
    setGoalieModal({ isOpen: false, currentGoalieName: '', availablePlayers: [] });
  }, []);

  
  // Function to update player stats when pausing/resuming
  const updatePlayerStatsForPause = React.useCallback((currentTimeEpoch, isPausing) => {
    setAllPlayers(prev => prev.map(player => {
      if (!selectedSquadPlayers.find(p => p.id === player.id)) {
        return player; // Not in selected squad, don't update
      }
      
      const stats = { ...player.stats };
      
      if (isPausing) {
        // When pausing: calculate and store accumulated time, but don't reset stint timer
        if (stats.lastStintStartTimeEpoch && stats.currentPeriodStatus === 'on_field') {
          const currentStintTime = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);
          
          // Accumulate the time into the appropriate buckets
          stats.timeOnFieldSeconds += currentStintTime;
          if (stats.currentPeriodRole === 'Attacker') {
            stats.timeAsAttackerSeconds += currentStintTime;
          } else if (stats.currentPeriodRole === 'Defender') {
            stats.timeAsDefenderSeconds += currentStintTime;
          }
        } else if (stats.lastStintStartTimeEpoch && stats.currentPeriodStatus === 'substitute') {
          const currentStintTime = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);
          stats.timeAsSubSeconds += currentStintTime;
        } else if (stats.lastStintStartTimeEpoch && stats.currentPeriodStatus === 'goalie') {
          const currentStintTime = Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000);
          stats.timeAsGoalieSeconds += currentStintTime;
        }
      } else {
        // When resuming: reset stint start time for all active players
        if (stats.currentPeriodStatus === 'on_field' || stats.currentPeriodStatus === 'substitute' || stats.currentPeriodStatus === 'goalie') {
          stats.lastStintStartTimeEpoch = currentTimeEpoch;
        }
      }
      
      return { ...player, stats };
    }));
  }, [selectedSquadPlayers, setAllPlayers]);
  
  // Determine which formation mode we're using
  const isPairsMode = formationType === FORMATION_TYPES.PAIRS_7;
  const isIndividual6Mode = formationType === FORMATION_TYPES.INDIVIDUAL_6;
  const isIndividual7Mode = formationType === FORMATION_TYPES.INDIVIDUAL_7;
  
  // State for field player modal
  const [fieldPlayerModal, setFieldPlayerModal] = React.useState({
    isOpen: false,
    type: null, // 'pair' or 'player'
    target: null, // pairKey or position
    playerName: '',
    sourcePlayerId: null,
    availablePlayers: [],
    showPositionOptions: false
  });
  
  // State for substitute player modal (7-player individual mode only)
  const [substituteModal, setSubstituteModal] = React.useState({
    isOpen: false,
    playerId: null,
    playerName: '',
    isCurrentlyInactive: false,
    canSetAsNextToGoIn: false
  });
  
  // State for goalie replacement modal
  const [goalieModal, setGoalieModal] = React.useState({
    isOpen: false,
    currentGoalieName: '',
    availablePlayers: []
  });
  
  // State for score editing modal
  const [scoreEditModal, setScoreEditModal] = React.useState({
    isOpen: false
  });
  
  // State for undo substitution confirmation modal
  const [undoConfirmModal, setUndoConfirmModal] = React.useState({
    isOpen: false
  });
  
  // State to track if we should substitute immediately after setting next sub
  const [shouldSubstituteNow, setShouldSubstituteNow] = React.useState(false);
  
  // State to track recently substituted players for visual effect
  const [recentlySubstitutedPlayers, setRecentlySubstitutedPlayers] = React.useState(new Set());
  
  // State to track if we should hide the "next off" indicator during glow effect
  const [hideNextOffIndicator, setHideNextOffIndicator] = React.useState(false);
  
  // State to track the last substitution for undo functionality
  const [lastSubstitution, setLastSubstitution] = React.useState(null);
  
  // Unified animation state management
  const [animationState, setAnimationState] = React.useState({
    type: 'none', // 'none', 'substitution', 'goalie', 'position-switch'
    phase: 'idle', // 'idle', 'switching', 'completing'
    data: {} // Animation-specific data
  });
  
  // Create animation calculator instance
  const animationCalculator = React.useMemo(() => {
    return createAnimationCalculator(
      isPairsMode,
      isIndividual6Mode,
      isIndividual7Mode,
      nextPhysicalPairToSubOut,
      nextPlayerIdToSubOut,
      periodFormation,
      allPlayers
    );
  }, [isPairsMode, isIndividual6Mode, isIndividual7Mode, nextPhysicalPairToSubOut, nextPlayerIdToSubOut, periodFormation, allPlayers]);

  // Enhanced substitution handler with animation and highlighting
  const handleSubstitutionWithHighlight = React.useCallback(() => {
    const substitutionTimestamp = Date.now();
    let playersComingOnIds = [];
    let playersGoingOffIds = [];
    
    if (isPairsMode) {
      // 7-player pairs logic - get players coming from sub pair and going off
      const pairComingIn = periodFormation.subPair;
      const pairGoingOff = periodFormation[nextPhysicalPairToSubOut];
      playersComingOnIds = [pairComingIn?.defender, pairComingIn?.attacker].filter(Boolean);
      playersGoingOffIds = [pairGoingOff?.defender, pairGoingOff?.attacker].filter(Boolean);
    } else if (isIndividual6Mode) {
      // 6-player logic - get player coming from substitute position and going off
      playersComingOnIds = [periodFormation.substitute].filter(Boolean);
      playersGoingOffIds = [nextPlayerIdToSubOut].filter(Boolean);
    } else if (isIndividual7Mode) {
      // 7-player individual logic - get player coming from first substitute position and going off
      playersComingOnIds = [periodFormation.substitute7_1].filter(Boolean);
      playersGoingOffIds = [nextPlayerIdToSubOut].filter(Boolean);
    }
    
    // Store state before substitution for undo functionality
    const beforeFormation = JSON.parse(JSON.stringify(periodFormation));
    const beforeNextPair = nextPhysicalPairToSubOut;
    const beforeNextPlayer = nextPlayerToSubOut;
    const beforeNextPlayerId = nextPlayerIdToSubOut;
    const beforeNextNextPlayerId = nextNextPlayerIdToSubOut;
    const subTimerSecondsAtSubstitution = subTimerSeconds;
    
    // Store original stats for players coming on (they should return to these exact stats)
    const playersComingOnOriginalStats = playersComingOnIds.map(playerId => {
      const player = allPlayers.find(p => p.id === playerId);
      return {
        id: playerId,
        name: player?.name,
        stats: JSON.parse(JSON.stringify(player?.stats))
      };
    });
    
    // Calculate animation distances using the new abstraction
    let distances;
    if (isIndividual7Mode) {
      distances = animationCalculator.calculate7PlayerDistances();
    } else {
      distances = animationCalculator.calculateSubstitutionDistances();
    }
    // Start the animation sequence
    setAnimationState({
      type: 'substitution',
      phase: 'switching', 
      data: distances
    });
    setHideNextOffIndicator(true);
    
    // After animation completes, perform substitution and start glow
    setTimeout(() => {
      // Perform the actual substitution
      handleSubstitution();
      
      // Store undo data after substitution is complete
      setLastSubstitution({
        timestamp: substitutionTimestamp,
        beforeFormation,
        beforeNextPair,
        beforeNextPlayer, 
        beforeNextPlayerId,
        beforeNextNextPlayerId,
        playersComingOnOriginalStats, // Original stats for players who came on
        playersComingOnIds,
        playersGoingOffIds,
        formationType,
        subTimerSecondsAtSubstitution
      });
      
      // Set the players who are coming on field for highlighting
      setRecentlySubstitutedPlayers(new Set(playersComingOnIds));
      
      // End animation
      setAnimationState(prev => ({
        ...prev,
        phase: 'completing'
      }));
      
      // After glow effect completes, reset everything
      setTimeout(() => {
        setAnimationState({
          type: 'none',
          phase: 'idle',
          data: {}
        });
        setHideNextOffIndicator(false);
        setRecentlySubstitutedPlayers(new Set());
      }, GLOW_DURATION);
    }, ANIMATION_DURATION);
  }, [handleSubstitution, periodFormation, isPairsMode, isIndividual6Mode, isIndividual7Mode, animationCalculator, allPlayers, formationType, nextNextPlayerIdToSubOut, nextPhysicalPairToSubOut, nextPlayerIdToSubOut, nextPlayerToSubOut, subTimerSeconds]);

  // Undo substitution handler with animation and time calculations
  const handleUndoSubstitution = React.useCallback(() => {
    if (!lastSubstitution) {
      console.warn('No substitution to undo');
      return;
    }

    const currentTime = Date.now();
    const timeSinceSubstitution = Math.round((currentTime - lastSubstitution.timestamp) / 1000); // seconds

    // Calculate animation distances for the reverse substitution
    let distances;
    if (lastSubstitution.formationType === 'INDIVIDUAL_7') {
      distances = animationCalculator.calculate7PlayerDistances();
    } else {
      distances = animationCalculator.calculateSubstitutionDistances();
    }

    // Reverse the animation directions by flipping the distances
    const reverseDistances = {
      nextOffToSub: -distances.subToNextOff,
      subToNextOff: -distances.nextOffToSub,
      sub1ToField: -distances.sub1ToField,
      fieldToSub2: -distances.fieldToSub2,
      sub2ToSub1: -distances.sub2ToSub1
    };

    // Start reverse animation
    setAnimationState({
      type: 'substitution',
      phase: 'switching',
      data: reverseDistances
    });
    setHideNextOffIndicator(true);

    // After animation completes, revert the substitution
    setTimeout(() => {
      // Restore formation
      setPeriodFormation(lastSubstitution.beforeFormation);
      setNextPhysicalPairToSubOut(lastSubstitution.beforeNextPair);
      setNextPlayerToSubOut(lastSubstitution.beforeNextPlayer);
      setNextPlayerIdToSubOut(lastSubstitution.beforeNextPlayerId);
      setNextNextPlayerIdToSubOut(lastSubstitution.beforeNextNextPlayerId);

      // Calculate and restore player stats with time adjustments
      console.log(`=== UNDO CALCULATIONS (${timeSinceSubstitution}s since substitution) ===`);
      setAllPlayers(prev => prev.map(player => {
        const wasComingOn = lastSubstitution.playersComingOnIds.includes(player.id);
        const wasGoingOff = lastSubstitution.playersGoingOffIds.includes(player.id);
        
        const playerName = player.name;

        if (wasComingOn) {
          // Player came on during substitution - restore their original stats (before they came on)
          const originalStats = lastSubstitution.playersComingOnOriginalStats.find(p => p.id === player.id);
          if (originalStats) {
            console.log(`${playerName} (CAME ON): Restoring original stats`);
            console.log(`  - Original stats: ${originalStats.stats.timeOnFieldSeconds}s field, ${originalStats.stats.timeAsAttackerSeconds}s att, ${originalStats.stats.timeAsDefenderSeconds}s def`);
            console.log(`  - Restored status: ${originalStats.stats.currentPeriodStatus}, position: ${originalStats.stats.currentPairKey}`);
            return { ...player, stats: originalStats.stats };
          }
          return player;
        } else if (wasGoingOff) {
          // Player went off during substitution - they should get credit for the time they spent on bench
          // We need to calculate their current accumulated stats (which includes their stint before substitution)
          // and add the bench time
          const currentStats = { ...player.stats };
          
          console.log(`${playerName} (WENT OFF):`);
          console.log(`  - Current stats (with their stint): ${currentStats.timeOnFieldSeconds}s field, ${currentStats.timeAsAttackerSeconds}s att, ${currentStats.timeAsDefenderSeconds}s def`);
          console.log(`  - Role when substituted: ${currentStats.currentPeriodRole}`);
          console.log(`  - Adding ${timeSinceSubstitution}s bench time to field time`);
          
          // Add the bench time to their total field time
          currentStats.timeOnFieldSeconds += timeSinceSubstitution;
          
          // Add bench time to their role-specific counter based on what role they had when substituted
          if (currentStats.currentPeriodRole === 'Attacker') {
            currentStats.timeAsAttackerSeconds += timeSinceSubstitution;
            console.log(`  - Adding ${timeSinceSubstitution}s to attacker time`);
          } else if (currentStats.currentPeriodRole === 'Defender') {
            currentStats.timeAsDefenderSeconds += timeSinceSubstitution;
            console.log(`  - Adding ${timeSinceSubstitution}s to defender time`);
          }

          // CRITICAL: Update their status back to 'on_field' and reset stint timer
          currentStats.currentPeriodStatus = 'on_field';
          currentStats.lastStintStartTimeEpoch = currentTime;
          
          // Restore their field position from the before-substitution formation
          const beforeFormation = lastSubstitution.beforeFormation;
          
          // Find what position this player had before substitution
          let restoredPosition = null;
          if (formationType === 'PAIRS_7') {
            if (beforeFormation.leftPair?.defender === player.id) restoredPosition = 'leftPair';
            else if (beforeFormation.leftPair?.attacker === player.id) restoredPosition = 'leftPair';
            else if (beforeFormation.rightPair?.defender === player.id) restoredPosition = 'rightPair';
            else if (beforeFormation.rightPair?.attacker === player.id) restoredPosition = 'rightPair';
          } else if (formationType === 'INDIVIDUAL_6') {
            if (beforeFormation.leftDefender === player.id) restoredPosition = 'leftDefender';
            else if (beforeFormation.rightDefender === player.id) restoredPosition = 'rightDefender';
            else if (beforeFormation.leftAttacker === player.id) restoredPosition = 'leftAttacker';
            else if (beforeFormation.rightAttacker === player.id) restoredPosition = 'rightAttacker';
          } else if (formationType === 'INDIVIDUAL_7') {
            if (beforeFormation.leftDefender7 === player.id) restoredPosition = 'leftDefender7';
            else if (beforeFormation.rightDefender7 === player.id) restoredPosition = 'rightDefender7';
            else if (beforeFormation.leftAttacker7 === player.id) restoredPosition = 'leftAttacker7';
            else if (beforeFormation.rightAttacker7 === player.id) restoredPosition = 'rightAttacker7';
          }
          
          if (restoredPosition) {
            currentStats.currentPairKey = restoredPosition;
            console.log(`  - Restored position: ${restoredPosition}`);
          }

          console.log(`  - Final stats: ${currentStats.timeOnFieldSeconds}s field, ${currentStats.timeAsAttackerSeconds}s att, ${currentStats.timeAsDefenderSeconds}s def`);
          return { ...player, stats: currentStats };
        } else {
          // Player wasn't involved in substitution - no changes needed
          console.log(`${playerName} (NOT INVOLVED): No changes`);
          return player;
        }
      }));

      // Set players who are going back on field for highlighting (reverse of original)
      setRecentlySubstitutedPlayers(new Set(lastSubstitution.playersGoingOffIds));

      // End animation
      setAnimationState(prev => ({
        ...prev,
        phase: 'completing'
      }));

      // Restore substitution timer
      if (handleUndoSubstitutionTimer && lastSubstitution.subTimerSecondsAtSubstitution !== undefined) {
        handleUndoSubstitutionTimer(lastSubstitution.subTimerSecondsAtSubstitution);
      }

      // Clear the undo data since we've used it
      setLastSubstitution(null);

      // After glow effect completes, reset everything
      setTimeout(() => {
        setAnimationState({
          type: 'none',
          phase: 'idle',
          data: {}
        });
        setHideNextOffIndicator(false);
        setRecentlySubstitutedPlayers(new Set());
      }, GLOW_DURATION);
    }, ANIMATION_DURATION);
  }, [lastSubstitution, animationCalculator, setPeriodFormation, setNextPhysicalPairToSubOut, setNextPlayerToSubOut, setNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut, setAllPlayers, formationType, handleUndoSubstitutionTimer]);

  // Enhanced position switch handler with animation
  const handlePositionSwitchWithAnimation = React.useCallback((player1Id, player2Id) => {
    // Calculate animation distances using the new abstraction
    const distances = animationCalculator.calculatePositionSwitchDistances(player1Id, player2Id);
    
    // Set up animation state with custom distances for the two players
    const positionSwitchData = {
      positionSwitch: true,
      player1Id: player1Id,
      player2Id: player2Id,
      player1Distance: distances.player1Distance,
      player2Distance: distances.player2Distance,
      // Keep these for backwards compatibility
      nextOffToSub: 0,
      subToNextOff: 0
    };
    
    // Start the animation sequence
    setAnimationState({
      type: 'position-switch',
      phase: 'switching',
      data: positionSwitchData
    });
    setHideNextOffIndicator(true);
    
    // After animation completes, perform position switch and start glow
    setTimeout(() => {
      // Perform the actual position switch
      const success = switchPlayerPositions(player1Id, player2Id, isSubTimerPaused);
      if (success) {
        // Set both players for highlighting
        setRecentlySubstitutedPlayers(new Set([player1Id, player2Id]));
        
        const player1Name = getPlayerNameById(player1Id);
        const player2Name = getPlayerNameById(player2Id);
        console.log(`Successfully switched positions between ${player1Name} and ${player2Name}`);
      } else {
        console.warn('Position switch failed');
      }
      
      // End animation
      setAnimationState(prev => ({
        ...prev,
        phase: 'completing'
      }));
      
      // After glow effect completes, reset everything
      setTimeout(() => {
        setAnimationState({
          type: 'none',
          phase: 'idle',
          data: {}
        });
        setHideNextOffIndicator(false);
        setRecentlySubstitutedPlayers(new Set());
      }, GLOW_DURATION);
    }, ANIMATION_DURATION);
  }, [animationCalculator, switchPlayerPositions, getPlayerNameById, isSubTimerPaused]);

  // Effect to trigger substitution after state update
  React.useEffect(() => {
    if (shouldSubstituteNow) {
      handleSubstitutionWithHighlight();
      setShouldSubstituteNow(false);
    }
  }, [shouldSubstituteNow, nextPhysicalPairToSubOut, nextPlayerToSubOut, handleSubstitutionWithHighlight]);

  // Clear undo data when period changes
  React.useEffect(() => {
    setLastSubstitution(null);
  }, [currentPeriodNumber]);


  // Note: Timeout logic is now handled in handleSubstitutionWithHighlight

  // Calculate player time statistics
  const getPlayerTimeStats = React.useCallback((playerId) => {
    const player = findPlayerById(allPlayers, playerId);
    if (!player) return { totalOutfieldTime: 0, attackDefenderDiff: 0 };
    
    const stats = player.stats;
    
    // When timer is paused, only use the stored stats without calculating current stint
    if (isSubTimerPaused) {
      return { 
        totalOutfieldTime: stats.timeOnFieldSeconds, 
        attackDefenderDiff: stats.timeAsAttackerSeconds - stats.timeAsDefenderSeconds 
      };
    }
    
    const currentTime = Date.now();
    
    // Calculate current stint time if player is active and timer is not paused
    let currentStintTime = 0;
    if (stats.lastStintStartTimeEpoch && stats.currentPeriodStatus === 'on_field') {
      currentStintTime = Math.round((currentTime - stats.lastStintStartTimeEpoch) / 1000);
    }
    
    // Total outfield time includes completed time plus current stint if on field
    const totalOutfieldTime = stats.timeOnFieldSeconds + currentStintTime;
    
    // Calculate attacker-defender difference with current stint
    let attackerTime = stats.timeAsAttackerSeconds;
    let defenderTime = stats.timeAsDefenderSeconds;
    
    if (stats.currentPeriodStatus === 'on_field' && stats.currentPeriodRole) {
      if (stats.currentPeriodRole === 'Attacker') {
        attackerTime += currentStintTime;
      } else if (stats.currentPeriodRole === 'Defender') {
        defenderTime += currentStintTime;
      }
    }
    
    const attackDefenderDiff = attackerTime - defenderTime;
    
    return { totalOutfieldTime, attackDefenderDiff };
  }, [allPlayers, isSubTimerPaused]);


  // Click and hold logic for changing next substitution target
  const handlePairLongPress = (pairKey) => {
    if (pairKey === 'leftPair' || pairKey === 'rightPair' || pairKey === 'subPair') {
      const pairData = periodFormation[pairKey];
      const defenderName = getPlayerNameById(pairData?.defender);
      const attackerName = getPlayerNameById(pairData?.attacker);
      openFieldPlayerModal({
        isOpen: true,
        type: 'pair',
        target: pairKey,
        playerName: `${defenderName} & ${attackerName}`,
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    }
  };

  const handlePlayerLongPress = (position) => {
    const fieldPositions = [
      'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', // 6-player mode
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7' // 7-player individual mode
    ];
    const substitutePositions = ['substitute']; // 6-player mode only
    
    if (fieldPositions.includes(position)) {
      const playerId = periodFormation[position];
      const playerName = getPlayerNameById(playerId);
      
      openFieldPlayerModal({
        isOpen: true,
        type: 'player',
        target: position,
        playerName: playerName,
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    } else if (substitutePositions.includes(position)) {
      // Handle 6-player substitute (no special options needed)
      const playerId = periodFormation[position];
      const playerName = getPlayerNameById(playerId);
      
      openFieldPlayerModal({
        isOpen: true,
        type: 'player',
        target: position,
        playerName: playerName,
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    }
  };

  const handleSubstituteLongPress = (position) => {
    // Only for 7-player individual mode substitute players
    if (!isIndividual7Mode || (position !== 'substitute7_1' && position !== 'substitute7_2')) return;
    
    const playerId = periodFormation[position];
    const playerName = getPlayerNameById(playerId);
    const player = findPlayerById(allPlayers, playerId);
    const isCurrentlyInactive = player?.stats.isInactive || false;
    
    // Determine if player can be set as next to go in
    const isNextToGoIn = playerId === nextPlayerIdToSubOut;
    const canSetAsNextToGoIn = position === 'substitute7_2' && !isNextToGoIn && !isCurrentlyInactive;
    
    openSubstituteModal({
      isOpen: true,
      playerId: playerId,
      playerName: playerName,
      isCurrentlyInactive: isCurrentlyInactive,
      canSetAsNextToGoIn: canSetAsNextToGoIn
    });
  };

  // Handle field player modal actions
  const handleSetNextSubstitution = () => {
    if (fieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(fieldPlayerModal.target);
    } else if (fieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(fieldPlayerModal.target);
    }
    closeFieldPlayerModal();
  };

  const handleSubstituteNow = () => {
    // First set as next substitution
    if (fieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(fieldPlayerModal.target);
    } else if (fieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(fieldPlayerModal.target);
    }
    // Set flag to trigger substitution after state update
    setShouldSubstituteNow(true);
    closeFieldPlayerModal();
  };

  const handleCancelFieldPlayerModal = () => {
    closeFieldPlayerModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  // Handle substitute modal actions
  const handleSetAsNextToGoIn = () => {
    if (substituteModal.playerId && isIndividual7Mode) {
      const playerId = substituteModal.playerId;
      
      // Find current positions
      const substitute7_1Id = periodFormation.substitute7_1;
      const substitute7_2Id = periodFormation.substitute7_2;
      
      // Only proceed if the player is substitute7_2 (next-next to go in)
      if (playerId === substitute7_2Id) {
        // Calculate animation distances for substitute swap
        const distances = animationCalculator.calculate7PlayerDistances();
        
        // Calculate proper distances between substitute positions
        const sub1Index = animationCalculator.getPositionIndex('substitute7_1', 'individual7');
        const sub2Index = animationCalculator.getPositionIndex('substitute7_2', 'individual7');
        const substituteSwapDistance = animationCalculator.calculateDistance(sub1Index, sub2Index, 'individual');
        
        // Set animation to be a substitute swap (sub1ToField = 0 indicates substitute swap)
        const nextToGoInSwapDistances = {
          ...distances,
          sub1ToField: 0, // This signals it's a substitute swap animation
          fieldToSub2: substituteSwapDistance, // sub1 moves down to sub2 position
          sub2ToSub1: -substituteSwapDistance // sub2 moves up to sub1 position
        };
        
        setAnimationState({
          type: 'substitution',
          phase: 'switching',
          data: nextToGoInSwapDistances
        });
        
        // Delay the actual state change until animation completes
        setTimeout(() => {
          // Swap substitute positions
          setPeriodFormation(prev => ({
            ...prev,
            substitute7_1: substitute7_2Id,
            substitute7_2: substitute7_1Id
          }));
          
          // Update player positions
          setAllPlayers(prev => prev.map(p => {
            if (p.id === substitute7_1Id) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute7_2' } };
            }
            if (p.id === substitute7_2Id) {
              return { ...p, stats: { ...p.stats, currentPairKey: 'substitute7_1' } };
            }
            return p;
          }));
          
          // Update next player tracking
          // After the swap: substitute7_2Id is now in substitute7_1 position (next to go in)
          // substitute7_1Id is now in substitute7_2 position (next-next to go in)
          // No need to change nextNextPlayerIdToSubOut - it should still point to the field player
          // who is second in the rotation queue, not to substitute players
          // nextPlayerIdToSubOut should remain pointing to the current field player
          
          // Animation complete callback
          setAnimationState({
            type: 'none',
            phase: 'idle',
            data: {}
          });
        }, ANIMATION_DURATION); // Wait for animation to complete (200ms start delay + 400ms animation)
      }
    }
    closeSubstituteModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  const handleInactivatePlayer = () => {
    if (substituteModal.playerId && isIndividual7Mode) {
      // Check if substitute7_2 is being inactivated
      const playerBeingInactivated = findPlayerById(allPlayers, substituteModal.playerId);
      const isSubstitute7_2BeingInactivated = playerBeingInactivated?.stats.currentPairKey === 'substitute7_2';
      
      if (isSubstitute7_2BeingInactivated) {
        // No animation needed - substitute7_2 is already in the correct position for inactive players
        togglePlayerInactive(substituteModal.playerId);
      } else {
        // Calculate animation distances for inactive player swap (substitute7_1 being inactivated)
        const distances = animationCalculator.calculate7PlayerDistances();
        
        // Calculate proper distances between substitute positions
        const sub1Index = animationCalculator.getPositionIndex('substitute7_1', 'individual7');
        const sub2Index = animationCalculator.getPositionIndex('substitute7_2', 'individual7');
        const substituteSwapDistance = animationCalculator.calculateDistance(sub1Index, sub2Index, 'individual');
        
        // Set animation to be a substitute swap (sub1ToField = 0 indicates substitute swap)
        const inactiveSwapDistances = {
          ...distances,
          sub1ToField: 0, // This signals it's a substitute swap animation
          fieldToSub2: substituteSwapDistance, // sub1 moves down to sub2 position
          sub2ToSub1: -substituteSwapDistance // sub2 moves up to sub1 position
        };
        
        setAnimationState({
          type: 'substitution',
          phase: 'switching',
          data: inactiveSwapDistances
        });
        
        // Delay the actual state change until animation completes
        setTimeout(() => {
          togglePlayerInactive(substituteModal.playerId, () => {
            // Animation complete callback
            setAnimationState({
              type: 'none',
              phase: 'idle',
              data: {}
            });
          }, 0);
        }, ANIMATION_DURATION); // Wait for animation to complete (200ms start delay + 400ms animation)
      }
    } else if (substituteModal.playerId) {
      // Non-7-player mode, no animation needed
      togglePlayerInactive(substituteModal.playerId);
    }
    closeSubstituteModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  const handleActivatePlayer = () => {
    if (substituteModal.playerId && isIndividual7Mode) {
      // Calculate animation distances for reactivation player swap
      const distances = animationCalculator.calculate7PlayerDistances();
      
      // Calculate proper distances between substitute positions
      const sub1Index = animationCalculator.getPositionIndex('substitute7_1', 'individual7');
      const sub2Index = animationCalculator.getPositionIndex('substitute7_2', 'individual7');
      const substituteSwapDistance = animationCalculator.calculateDistance(sub1Index, sub2Index, 'individual');
      
      // Set animation to be a substitute swap (sub1ToField = 0 indicates substitute swap)
      const reactivationSwapDistances = {
        ...distances,
        sub1ToField: 0, // This signals it's a substitute swap animation
        fieldToSub2: substituteSwapDistance, // sub1 moves down to sub2 position
        sub2ToSub1: -substituteSwapDistance // sub2 moves up to sub1 position
      };
      
      setAnimationState({
        type: 'substitution',
        phase: 'switching',
        data: reactivationSwapDistances
      });
      
      // Delay the actual state change until animation completes
      setTimeout(() => {
        togglePlayerInactive(substituteModal.playerId, () => {
          // Animation complete callback
          setAnimationState({
            type: 'none',
            phase: 'idle',
            data: {}
          });
        }, 0);
      }, 600); // Wait for animation to complete (200ms start delay + 400ms animation)
    } else if (substituteModal.playerId) {
      // Non-7-player mode, no animation needed
      togglePlayerInactive(substituteModal.playerId);
    }
    closeSubstituteModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  const handleCancelSubstituteModal = () => {
    closeSubstituteModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };


  // Handle goalie replacement modal actions
  const handleGoalieLongPress = () => {
    const currentGoalieName = getPlayerNameById(periodFormation.goalie);
    
    // Get all active players currently playing (from selected squad)
    const activePlayingPlayers = selectedSquadPlayers.map(player => ({
      id: player.id,
      name: player.name,
      isInactive: player.stats.isInactive || false
    })).filter(player => player.id !== periodFormation.goalie); // Exclude current goalie
    
    openGoalieModal({
      isOpen: true,
      currentGoalieName: currentGoalieName,
      availablePlayers: activePlayingPlayers
    });
  };

  const handleSelectNewGoalie = (newGoalieId) => {
    // Capture the current goalie ID before the switch
    const formerGoalieId = periodFormation.goalie;
    
    // Calculate animation distances for goalie replacement
    const animationData = animationCalculator.calculateGoalieReplacementDistances(newGoalieId);
    
    // Start goalie animation sequence
    setAnimationState({
      type: 'goalie',
      phase: 'switching',
      data: animationData
    });
    
    // Close modal immediately to show animation
    closeGoalieModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
    
    // After animation completes, perform the actual goalie switch
    setTimeout(() => {
      const success = switchGoalie(newGoalieId, isSubTimerPaused);
      
      if (success) {
        // Add both players to the glow effect - former goalie and new goalie
        setRecentlySubstitutedPlayers(new Set([formerGoalieId, newGoalieId]));
        
        const oldGoalieName = getPlayerNameById(formerGoalieId);
        const newGoalieName = getPlayerNameById(newGoalieId);
        console.log(`Successfully switched goalie: ${oldGoalieName} -> ${newGoalieName}`);
      } else {
        console.warn('Goalie switch failed');
      }
      
      setAnimationState(prev => ({
        ...prev,
        phase: 'completing'
      }));
      
      // After glow effect completes, reset everything
      setTimeout(() => {
        setAnimationState({
          type: 'none',
          phase: 'idle',
          data: {}
        });
        setRecentlySubstitutedPlayers(new Set());
      }, GLOW_DURATION);
    }, ANIMATION_DURATION);
  };

  const handleCancelGoalieModal = () => {
    closeGoalieModal();
  };

  // Handle score editing modal actions
  const handleScoreLongPress = () => {
    setScoreEditModal({ isOpen: true });
    // Add modal to browser back button handling
    if (pushModalState) {
      pushModalState(() => {
        setScoreEditModal({ isOpen: false });
      });
    }
  };

  const handleScoreEditSave = (newHomeScore, newAwayScore) => {
    setScore(newHomeScore, newAwayScore);
    setScoreEditModal({ isOpen: false });
  };

  const handleScoreEditCancel = () => {
    setScoreEditModal({ isOpen: false });
  };

  // Handle undo substitution confirmation modal actions
  const handleUndoSubstitutionClick = () => {
    if (!lastSubstitution) return;
    
    setUndoConfirmModal({ isOpen: true });
    // Add modal to browser back button handling
    if (pushModalState) {
      pushModalState(() => {
        setUndoConfirmModal({ isOpen: false });
      });
    }
  };

  const handleConfirmUndoSubstitution = () => {
    setUndoConfirmModal({ isOpen: false });
    if (removeModalFromStack) {
      removeModalFromStack();
    }
    handleUndoSubstitution();
  };

  const handleCancelUndoSubstitution = () => {
    setUndoConfirmModal({ isOpen: false });
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  // Function to swap attacker and defender within a pair
  const handleSwapPairPositions = (pairKey) => {
    if (!isPairsMode) return;
    
    const pairData = periodFormation[pairKey];
    if (!pairData || !pairData.defender || !pairData.attacker) return;
    
    const defenderName = getPlayerNameById(pairData.defender);
    const attackerName = getPlayerNameById(pairData.attacker);
    
    // Use the existing switchPlayerPositions function to handle the swap
    // This will properly handle time tracking and role changes
    const success = switchPlayerPositions(pairData.defender, pairData.attacker, isSubTimerPaused);
    
    if (success) {
      console.log(`Swapped positions in ${pairKey}: ${defenderName} (D->A) <-> ${attackerName} (A->D)`);
    } else {
      console.warn(`Failed to swap positions in ${pairKey}`);
    }
  };

  // Handle position change actions
  const handleChangePosition = (action) => {
    if (action === 'show-options') {
      // Show the position selection options
      if (fieldPlayerModal.target && fieldPlayerModal.type === 'player') {
        const sourcePlayerId = periodFormation[fieldPlayerModal.target];
        
        if (sourcePlayerId) {
          // Get only field players (exclude substitutes) except the source player
          const availablePlayers = getOutfieldPlayers().filter(p => {
            if (p.id === sourcePlayerId) return false;
            
            // Only include players currently on the field (not substitutes)
            const player = allPlayers.find(pl => pl.id === p.id);
            if (!player) return false;
            
            const currentPairKey = player.stats.currentPairKey;
            
            // Exclude substitutes based on formation type
            if (formationType === FORMATION_TYPES.PAIRS_7) {
              return currentPairKey !== 'subPair';
            } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
              return currentPairKey !== 'substitute';
            } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
              return currentPairKey !== 'substitute7_1' && currentPairKey !== 'substitute7_2';
            }
            
            return true;
          });
          
          setFieldPlayerModal(prev => ({
            ...prev,
            sourcePlayerId: sourcePlayerId,
            availablePlayers: availablePlayers,
            showPositionOptions: true
          }));
        }
      } else if (fieldPlayerModal.type === 'pair') {
        // For pairs formation, position change between pairs is not supported, but swapping within pair is
        alert('Position change between pairs is not supported. Use the "Swap positions" option to swap attacker and defender within this pair.');
        handleCancelFieldPlayerModal();
      }
    } else if (action === 'swap-pair-positions') {
      // Swap attacker and defender within the pair
      if (fieldPlayerModal.target && fieldPlayerModal.type === 'pair') {
        handleSwapPairPositions(fieldPlayerModal.target);
        handleCancelFieldPlayerModal();
      }
    } else if (action === null) {
      // Go back to main options
      setFieldPlayerModal(prev => ({
        ...prev,
        showPositionOptions: false,
        availablePlayers: [],
        sourcePlayerId: null
      }));
    } else {
      // action is a player ID - perform the animated position switch
      const targetPlayerId = action;
      if (fieldPlayerModal.sourcePlayerId && targetPlayerId) {
        // Close the modal first
        handleCancelFieldPlayerModal();
        
        // Perform the animated position switch
        handlePositionSwitchWithAnimation(fieldPlayerModal.sourcePlayerId, targetPlayerId);
      } else {
        // Close the modal if something went wrong
        handleCancelFieldPlayerModal();
      }
    }
  };

  // Hook for handling long press with scroll detection
  const useLongPressWithScrollDetection = (callback, ms = 1000) => {
    const [startLongPress, setStartLongPress] = React.useState(false);
    const callbackRef = React.useRef(callback);
    const initialTouchPos = React.useRef({ x: 0, y: 0 });
    const hasScrolled = React.useRef(false);
    const timerId = React.useRef(null);

    // Update callback ref when callback changes
    React.useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    const startPress = (clientX, clientY) => {
      initialTouchPos.current = { x: clientX, y: clientY };
      hasScrolled.current = false;
      setStartLongPress(true);
      
      timerId.current = setTimeout(() => {
        if (!hasScrolled.current) {
          callbackRef.current();
        }
      }, ms);
    };

    const endPress = () => {
      setStartLongPress(false);
      if (timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
    };

    const handleMove = React.useCallback((clientX, clientY) => {
      if (startLongPress) {
        const moveThreshold = 10; // pixels
        const deltaX = Math.abs(clientX - initialTouchPos.current.x);
        const deltaY = Math.abs(clientY - initialTouchPos.current.y);
        
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
          hasScrolled.current = true;
          endPress();
        }
      }
    }, [startLongPress]);

    const handleTouchMove = React.useCallback((e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    }, [handleMove]);

    const handleMouseMove = React.useCallback((e) => {
      handleMove(e.clientX, e.clientY);
    }, [handleMove]);

    React.useEffect(() => {
      if (startLongPress) {
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('mousemove', handleMouseMove);
        
        return () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('mousemove', handleMouseMove);
        };
      }
    }, [startLongPress, handleTouchMove, handleMouseMove]);

    React.useEffect(() => {
      return () => {
        if (timerId.current) {
          clearTimeout(timerId.current);
        }
      };
    }, []);

    return {
      onMouseDown: (e) => startPress(e.clientX, e.clientY),
      onMouseUp: endPress,
      onMouseLeave: endPress,
      onTouchStart: (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          startPress(touch.clientX, touch.clientY);
        }
      },
      onTouchEnd: endPress,
    };
  };

  // Create long press handlers for each pair and individual position
  const leftPairEvents = useLongPressWithScrollDetection(() => handlePairLongPress('leftPair'));
  const rightPairEvents = useLongPressWithScrollDetection(() => handlePairLongPress('rightPair'));
  const subPairEvents = useLongPressWithScrollDetection(() => handlePairLongPress('subPair'));
  
  // 6-player individual mode events
  const leftDefenderEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftDefender'));
  const rightDefenderEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightDefender'));
  const leftAttackerEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftAttacker'));
  const rightAttackerEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightAttacker'));
  
  // 7-player individual mode events
  const leftDefender7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftDefender7'));
  const rightDefender7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightDefender7'));
  const leftAttacker7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftAttacker7'));
  const rightAttacker7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightAttacker7'));
  
  // 7-player individual mode substitute events
  const substitute7_1Events = useLongPressWithScrollDetection(() => handleSubstituteLongPress('substitute7_1'));
  const substitute7_2Events = useLongPressWithScrollDetection(() => handleSubstituteLongPress('substitute7_2'));
  
  // Goalie long-press event
  const goalieEvents = useLongPressWithScrollDetection(() => handleGoalieLongPress());
  
  // Score long-press event
  const scoreEvents = useLongPressWithScrollDetection(() => handleScoreLongPress());

  // Centralized goalie animation logic helper
  const getGoalieAnimationProps = (playerId) => {
    if (animationState.type !== 'goalie' || animationState.phase !== 'switching' || playerId !== animationState.data.newGoalieId) {
      return null;
    }
    
    return {
      animationClass: 'animate-dynamic-up',
      zIndexClass: 'z-30', // Highest z-index for replacement goalie moving up
      styleProps: {
        '--move-distance': `${animationState.data.fieldToGoalie}px`
      }
    };
  };

  const renderPair = (pairKey, pairName, renderIndex) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;
    const isNextOff = pairKey === nextPhysicalPairToSubOut && pairKey !== 'subPair';
    const isNextOn = pairKey === 'subPair';
    const canBeSelected = pairKey === 'leftPair' || pairKey === 'rightPair' || pairKey === 'subPair';

    // Check if any player in this pair was recently substituted
    const hasRecentlySubstitutedPlayer = (pairData.defender && recentlySubstitutedPlayers.has(pairData.defender)) ||
                                        (pairData.attacker && recentlySubstitutedPlayers.has(pairData.attacker));

    // Animation logic for switching positions
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    if (animationState.phase === 'switching') {
      // Check if this is a position switch animation
      if (animationState.type === 'position-switch' && animationState.data.positionSwitch) {
        const pairDefenderId = pairData.defender;
        const pairAttackerId = pairData.attacker;
        
        if (pairDefenderId === animationState.data.player1Id) {
          animationClass = animationState.data.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player1Distance}px`
          };
        } else if (pairAttackerId === animationState.data.player1Id) {
          animationClass = animationState.data.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player1Distance}px`
          };
        } else if (pairDefenderId === animationState.data.player2Id) {
          animationClass = animationState.data.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player2Distance}px`
          };
        } else if (pairAttackerId === animationState.data.player2Id) {
          animationClass = animationState.data.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player2Distance}px`
          };
        }
      } else if (animationState.type === 'substitution') {
        // Normal substitution animation
        if (isNextOff) {
          animationClass = 'animate-dynamic-down';
          zIndexClass = 'z-10'; // Lower z-index when going down
          styleProps = {
            '--move-distance': `${animationState.data.nextOffToSub}px`
          };
        } else if (isNextOn) {
          animationClass = 'animate-dynamic-up';
          zIndexClass = 'z-20'; // Higher z-index when coming up
          styleProps = {
            '--move-distance': `${animationState.data.subToNextOff}px`
          };
        }
      }
    }
    
    // Handle goalie replacement animation for pairs
    const pairDefenderId = pairData.defender;
    const pairAttackerId = pairData.attacker;
    const goalieAnimationProps = getGoalieAnimationProps(pairDefenderId) || getGoalieAnimationProps(pairAttackerId);
    if (goalieAnimationProps) {
      animationClass = goalieAnimationProps.animationClass;
      zIndexClass = goalieAnimationProps.zIndexClass;
      styleProps = goalieAnimationProps.styleProps;
    }

    let bgColor = 'bg-slate-700'; // Default for subs or if logic is off
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (pairKey === 'leftPair' || pairKey === 'rightPair') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff && !hideNextOffIndicator) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn && !hideNextOffIndicator) {
      borderColor = 'border-emerald-500';
    }

    // Add glow effect for recently substituted players
    if (hasRecentlySubstitutedPlayer) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (pairKey === 'leftPair') longPressEvents = leftPairEvents;
    else if (pairKey === 'rightPair') longPressEvents = rightPairEvents;
    else if (pairKey === 'subPair') longPressEvents = subPairEvents;

    return (
      <div 
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {pairName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <div><Shield className="inline h-3 w-3 mr-1" /> D: {getPlayerNameById(pairData.defender)}</div>
            {pairData.defender && (() => {
              const stats = getPlayerTimeStats(pairData.defender);
              return (
                <div className="text-right text-xs">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-4"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center justify-between">
            <div><Sword className="inline h-3 w-3 mr-1" /> A: {getPlayerNameById(pairData.attacker)}</div>
            {pairData.attacker && (() => {
              const stats = getPlayerTimeStats(pairData.attacker);
              return (
                <div className="text-right text-xs">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-4"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
      </div>
    );
  };

  const renderIndividualPosition = (position, positionName, icon, renderIndex) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const isNextOff = playerId === nextPlayerIdToSubOut;
    const isNextOn = position === 'substitute' || position === 'substitute7_1';
    const canBeSelected = [
      'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', // 6-player mode
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7' // 7-player individual mode
    ].includes(position);

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Animation logic for switching positions
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    if (animationState.phase === 'switching') {
      // Check if this is a position switch animation
      if (animationState.type === 'position-switch' && animationState.data.positionSwitch) {
        if (playerId === animationState.data.player1Id) {
          animationClass = animationState.data.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player1Distance}px`
          };
        } else if (playerId === animationState.data.player2Id) {
          animationClass = animationState.data.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player2Distance}px`
          };
        }
      } else if (animationState.type === 'substitution') {
        // Normal substitution animation
        if (isNextOff) {
          animationClass = 'animate-dynamic-down';
          zIndexClass = 'z-10'; // Lower z-index when going down
          styleProps = {
            '--move-distance': `${animationState.data.nextOffToSub}px`
          };
        } else if (isNextOn) {
          animationClass = 'animate-dynamic-up';
          zIndexClass = 'z-20'; // Higher z-index when coming up
          styleProps = {
            '--move-distance': `${animationState.data.subToNextOff}px`
          };
        }
      }
    }
    
    // Handle goalie replacement animation
    const goalieAnimationProps = getGoalieAnimationProps(playerId);
    if (goalieAnimationProps) {
      animationClass = goalieAnimationProps.animationClass;
      zIndexClass = goalieAnimationProps.zIndexClass;
      styleProps = goalieAnimationProps.styleProps;
    }

    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (position !== 'substitute') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff && !hideNextOffIndicator) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn && !hideNextOffIndicator) {
      borderColor = 'border-emerald-500';
    }

    // Add glow effect for recently substituted players
    if (isRecentlySubstituted) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (position === 'leftDefender') longPressEvents = leftDefenderEvents;
    else if (position === 'rightDefender') longPressEvents = rightDefenderEvents;
    else if (position === 'leftAttacker') longPressEvents = leftAttackerEvents;
    else if (position === 'rightAttacker') longPressEvents = rightAttackerEvents;
    else if (position === 'leftDefender7') longPressEvents = leftDefender7Events;
    else if (position === 'rightDefender7') longPressEvents = rightDefender7Events;
    else if (position === 'leftAttacker7') longPressEvents = leftAttacker7Events;
    else if (position === 'rightAttacker7') longPressEvents = rightAttacker7Events;

    return (
      <div 
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerNameById(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-xs">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
      </div>
    );
  };

  // Special render function for 7-player individual mode with dual substitution indicators
  const renderIndividual7Position = (position, positionName, icon, renderIndex, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const player = findPlayerById(allPlayers, playerId);
    const isInactive = player?.stats.isInactive || false;
    const isSubstitute = position.includes('substitute');
    
    const isNextOff = playerId === nextPlayerIdToSubOut && !position.includes('substitute');
    const isNextNextOff = playerId === nextNextPlayerIdToSubOut && !position.includes('substitute');
    const isNextOn = position === 'substitute7_1' && !isInactive;
    const isNextNextOn = position === 'substitute7_2' && !isInactive;
    const canBeSelected = [
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'
    ].includes(position);

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Animation logic for switching positions
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    if (animationState.phase === 'switching') {
      // Check if this is a position switch animation
      if (animationState.type === 'position-switch' && animationState.data.positionSwitch) {
        if (playerId === animationState.data.player1Id) {
          animationClass = animationState.data.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player1Distance}px`
          };
        } else if (playerId === animationState.data.player2Id) {
          animationClass = animationState.data.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationState.data.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.player2Distance}px`
          };
        }
      } else if (animationState.type === 'substitution' && isIndividual7Mode) {
        // Check if this is a reactivation/inactivation animation (only substitute positions move)
        const isSubstituteSwapAnimation = animationState.data.sub1ToField === 0;
        
        if (isSubstituteSwapAnimation) {
          // Reactivation or inactivation animation: only substitute positions swap
          // For inactivation: the player being inactivated moves, but becomes inactive after animation
          // For reactivation: only active players move
          if (position === 'substitute7_1') {
            // substitute7_1 moves down to substitute7_2 position
            // This happens during both inactivation (player becomes inactive) and reactivation (active player moves down)
            animationClass = 'animate-dynamic-down';
            zIndexClass = 'z-10';
            styleProps = {
              '--move-distance': `${animationState.data.fieldToSub2}px`
            };
          } else if (position === 'substitute7_2' && (!isInactive || (isInactive && animationState.data.sub2ToSub1 !== 0))) {
            // substitute7_2 moves up to substitute7_1 position
            // Normal case: only if not inactive
            // Special case: if inactive but sub2ToSub1 distance is set, this is a reactivation animation where the inactive player should move
            animationClass = 'animate-dynamic-up';
            zIndexClass = 'z-20';
            styleProps = {
              '--move-distance': `${animationState.data.sub2ToSub1}px`
            };
          }
          // If player is inactive, they get no animation (stay completely still)
        } else {
          // Normal substitution animation
          // CRITICAL: Inactive players never move during animations
          
          // Check if substitute7_2 is inactive to determine where field player should go
          const substitute7_2Player = findPlayerById(allPlayers, periodFormation.substitute7_2);
          const isSubstitute7_2Inactive = substitute7_2Player?.stats.isInactive || false;
          
          if (isNextOff && !isInactive) {
            // Field player going off - destination depends on whether substitute7_2 is inactive
            animationClass = 'animate-dynamic-down';
            zIndexClass = 'z-10';
            if (isSubstitute7_2Inactive) {
              // If substitute7_2 is inactive, field player goes to substitute7_1 position
              // Use negative sub1ToField distance (field to sub1 instead of sub1 to field)
              styleProps = {
                '--move-distance': `${-animationState.data.sub1ToField}px`
              };
            } else {
              // Normal case: field player goes to substitute7_2 position
              styleProps = {
                '--move-distance': `${animationState.data.fieldToSub2}px`
              };
            }
          } else if (position === 'substitute7_1' && !isInactive) {
            // substitute7_1 moves up to field position (only if not inactive)
            animationClass = 'animate-dynamic-up';
            zIndexClass = 'z-20';
            styleProps = {
              '--move-distance': `${animationState.data.sub1ToField}px`
            };
          } else if (position === 'substitute7_2' && !isInactive) {
            // substitute7_2 moves up to substitute7_1 position (only if not inactive)
            animationClass = 'animate-dynamic-up';
            zIndexClass = 'z-15';
            styleProps = {
              '--move-distance': `${animationState.data.sub2ToSub1}px`
            };
          }
          // If player is inactive, they get no animation (stay completely still)
        }
      } else if (animationState.type === 'substitution') {
        // Original logic for other modes
        if (isNextOff) {
          animationClass = 'animate-dynamic-down';
          zIndexClass = 'z-10';
          styleProps = {
            '--move-distance': `${animationState.data.nextOffToSub}px`
          };
        } else if (isNextOn) {
          animationClass = 'animate-dynamic-up';
          zIndexClass = 'z-20';
          styleProps = {
            '--move-distance': `${animationState.data.subToNextOff}px`
          };
        }
      }
    }
    
    // Handle goalie replacement animation for 7-player individual mode
    const goalieAnimationProps = getGoalieAnimationProps(playerId);
    if (goalieAnimationProps) {
      animationClass = goalieAnimationProps.animationClass;
      zIndexClass = goalieAnimationProps.zIndexClass;
      styleProps = goalieAnimationProps.styleProps;
    }

    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (!position.includes('substitute')) { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    // Visual styling for inactive players
    if (isInactive) {
      bgColor = 'bg-slate-800'; // Darker background for inactive
      textColor = 'text-slate-500'; // Dimmed text for inactive
      borderColor = 'border-slate-600'; // Subtle border for inactive
    } else {
      // Visual indicators for next and next-next (only for active players)
      if (isNextOff && !hideNextOffIndicator) {
        borderColor = 'border-rose-500';
      } else if (isNextNextOff && !hideNextOffIndicator) {
        borderColor = 'border-rose-200'; // More dimmed red for next-next off
      }
      
      if (isNextOn && !hideNextOffIndicator) {
        borderColor = 'border-emerald-500';
      } else if (isNextNextOn && !hideNextOffIndicator) {
        borderColor = 'border-emerald-200'; // More dimmed green for next-next on
      }
    }

    // Add glow effect for recently substituted players
    if (isRecentlySubstituted && !isInactive) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (position === 'leftDefender7') longPressEvents = leftDefender7Events;
    else if (position === 'rightDefender7') longPressEvents = rightDefender7Events;
    else if (position === 'leftAttacker7') longPressEvents = leftAttacker7Events;
    else if (position === 'rightAttacker7') longPressEvents = rightAttacker7Events;
    else if (position === 'substitute7_1') longPressEvents = substitute7_1Events;
    else if (position === 'substitute7_2') longPressEvents = substitute7_2Events;

    return (
      <div 
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected || isSubstitute ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionName} {isInactive && <span className="text-xs text-slate-600">(Inactive)</span>}
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) - only show for active players */}
            {!isInactive && isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {!isInactive && isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
            {/* Secondary indicators (very dimmed) - only show for active players */}
            {!isInactive && isNextNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-4 w-4 text-rose-200 opacity-40 inline-block" />}
            {!isInactive && isNextNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-4 w-4 text-emerald-200 opacity-40 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerNameById(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-xs">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
        {isSubstitute && (
          <p className="text-xs text-slate-400 mt-0.5">Hold to {isInactive ? 'activate' : 'inactivate'}</p>
        )}
      </div>
    );
  };

  // Function to abbreviate team names when they don't fit
  const abbreviateTeamName = (teamName) => {
    if (!teamName) return teamName;
    return teamName.substring(0, 3) + '.';
  };

  // State for managing team name abbreviation
  const [shouldAbbreviate, setShouldAbbreviate] = React.useState(false);
  const scoreRowRef = React.useRef(null);
  
  const homeTeamName = "Djurgården";
  const awayTeamName = opponentTeamName || 'Opponent';
  
  const displayHomeTeam = shouldAbbreviate ? abbreviateTeamName(homeTeamName) : homeTeamName;
  const displayAwayTeam = shouldAbbreviate ? abbreviateTeamName(awayTeamName) : awayTeamName;

  // Effect to check if abbreviation is needed based on actual rendered width
  React.useEffect(() => {
    const checkWidth = () => {
      if (!scoreRowRef.current) return;
      
      const container = scoreRowRef.current;
      const containerWidth = container.offsetWidth;
      
      // Test with full names to see if they fit
      const homeTeamFull = "Djurgården";
      const awayTeamFull = opponentTeamName || 'Opponent';
      
      // Create a temporary invisible element to measure full names
      const testDiv = document.createElement('div');
      testDiv.style.position = 'absolute';
      testDiv.style.visibility = 'hidden';
      testDiv.style.whiteSpace = 'nowrap';
      testDiv.className = container.className;
      
      // Create test content with full names
      testDiv.innerHTML = `
        <button class="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-md text-white font-semibold transition-colors">
          ${homeTeamFull}
        </button>
        <div class="text-2xl font-mono font-bold text-sky-200 cursor-pointer select-none px-1.5 py-2 rounded-md hover:bg-slate-600 transition-colors whitespace-nowrap flex-shrink-0">
          ${homeScore} - ${awayScore}
        </div>
        <button class="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-md text-white font-semibold transition-colors">
          ${awayTeamFull}
        </button>
      `;
      
      // Temporarily add to DOM to measure
      container.parentElement.appendChild(testDiv);
      const testWidth = testDiv.scrollWidth;
      container.parentElement.removeChild(testDiv);
      
      // Decide whether to abbreviate based on test measurement
      const needsAbbreviation = testWidth > containerWidth;
      
      if (needsAbbreviation && !shouldAbbreviate) {
        setShouldAbbreviate(true);
      } else if (!needsAbbreviation && shouldAbbreviate) {
        setShouldAbbreviate(false);
      }
    };

    // Check on mount and when dependencies change
    checkWidth();
    
    // Add resize listener
    window.addEventListener('resize', checkWidth);
    
    return () => {
      window.removeEventListener('resize', checkWidth);
    };
  }, [homeScore, awayScore, opponentTeamName, shouldAbbreviate]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber}</h2>

      {/* Timers */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-2 bg-slate-700 rounded-lg">
          <p className="text-xs text-sky-200 mb-0.5">Match Clock</p>
          <p className={`text-2xl font-mono ${matchTimerSeconds < 0 ? 'text-red-400' : 'text-sky-400'}`}>
            {matchTimerSeconds < 0 ? '+' : ''}{formatTime(Math.abs(matchTimerSeconds))}
          </p>
        </div>
        <div className="p-2 bg-slate-700 rounded-lg relative">
          <p className="text-xs text-sky-200 mb-0.5">Substitution Timer</p>
          <div className="relative flex items-center justify-center">
            <p className={`text-2xl font-mono ${alertMinutes > 0 && subTimerSeconds >= alertMinutes * 60 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatTime(subTimerSeconds)}
            </p>
            <button
              onClick={isSubTimerPaused ? () => resumeSubTimer(updatePlayerStatsForPause) : () => pauseSubTimer(updatePlayerStatsForPause)}
              className="absolute right-0 p-1 hover:bg-slate-600 rounded-full transition-colors duration-150 flex-shrink-0"
              title={isSubTimerPaused ? "Resume substitution timer" : "Pause substitution timer"}
            >
              {isSubTimerPaused ? (
                <Play className="h-5 w-5 text-emerald-400" />
              ) : (
                <Pause className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="p-2 bg-slate-700 rounded-lg text-center">
        <div ref={scoreRowRef} className="flex items-center justify-center space-x-2.5">
          <button
            onClick={addHomeGoal}
            className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-md text-white font-semibold transition-colors"
          >
            {displayHomeTeam}
          </button>
          <div 
            className="text-2xl font-mono font-bold text-sky-200 cursor-pointer select-none px-1.5 py-2 rounded-md hover:bg-slate-600 transition-colors whitespace-nowrap flex-shrink-0"
            {...scoreEvents}
          >
            {homeScore} - {awayScore}
          </div>
          <button
            onClick={addAwayGoal}
            className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-md text-white font-semibold transition-colors"
          >
            {displayAwayTeam}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Tap team name to add goal • Hold score to edit</p>
      </div>

      {/* Field & Subs Visualization */}
      <div 
        className="p-2 bg-slate-700 rounded-lg cursor-pointer select-none hover:bg-slate-600 transition-colors duration-150"
        {...goalieEvents}
        style={(() => {
          // Calculate goalie animation style
          if (animationState.type === 'goalie' && animationState.phase === 'switching' && animationState.data.goalieToField !== 0) {
            return {
              transform: `translateY(${animationState.data.goalieToField}px)`,
              transition: 'transform 1s ease-in-out',
              zIndex: 20, // Medium z-index for old goalie moving down
              position: 'relative'
            };
          }
          return {};
        })()}
      >
        <p className="text-center my-1 text-sky-200">
          Goalie: <span className="font-semibold">{getPlayerNameById(periodFormation.goalie)}</span>
        </p>
        <p className="text-xs text-slate-400 text-center">Hold to replace goalie</p>
      </div>
      
      {isPairsMode && (
        <div className="space-y-2">
          {renderPair('leftPair', 'Left', 0)}
          {renderPair('rightPair', 'Right', 1)}
          {renderPair('subPair', 'Substitutes', 2)}
        </div>
      )}

      {isIndividual6Mode && (
        <div className="space-y-2">
          {renderIndividualPosition('leftDefender', 'Left Defender', <Shield className="inline h-3 w-3 mr-1" />, 0)}
          {renderIndividualPosition('rightDefender', 'Right Defender', <Shield className="inline h-3 w-3 mr-1" />, 1)}
          {renderIndividualPosition('leftAttacker', 'Left Attacker', <Sword className="inline h-3 w-3 mr-1" />, 2)}
          {renderIndividualPosition('rightAttacker', 'Right Attacker', <Sword className="inline h-3 w-3 mr-1" />, 3)}
          {renderIndividualPosition('substitute', 'Substitute', <RotateCcw className="inline h-3 w-3 mr-1" />, 4)}
        </div>
      )}

      {isIndividual7Mode && (
        <div className="space-y-2">
          {renderIndividual7Position('leftDefender7', 'Left Defender', <Shield className="inline h-3 w-3 mr-1" />, 0, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('rightDefender7', 'Right Defender', <Shield className="inline h-3 w-3 mr-1" />, 1, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('leftAttacker7', 'Left Attacker', <Sword className="inline h-3 w-3 mr-1" />, 2, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('rightAttacker7', 'Right Attacker', <Sword className="inline h-3 w-3 mr-1" />, 3, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('substitute7_1', (() => {
            const player = findPlayerById(allPlayers, periodFormation.substitute7_1);
            return player?.stats.isInactive ? 'Inactive' : 'Substitute';
          })(), <RotateCcw className="inline h-3 w-3 mr-1" />, 4, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('substitute7_2', (() => {
            const player = findPlayerById(allPlayers, periodFormation.substitute7_2);
            return player?.stats.isInactive ? 'Inactive' : 'Substitute';
          })(), <RotateCcw className="inline h-3 w-3 mr-1" />, 5, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-4">
        {/* Top row: SUB NOW with undo button */}
        <div className="flex gap-2">
          <Button onClick={handleSubstitutionWithHighlight} Icon={RotateCcw} className="flex-1">
            SUB NOW
          </Button>
          <button
            onClick={handleUndoSubstitutionClick}
            disabled={!lastSubstitution}
            className={`w-12 h-12 rounded-md flex items-center justify-center transition-all duration-200 ${
              lastSubstitution 
                ? 'bg-slate-600 hover:bg-slate-500 text-slate-100 shadow-md cursor-pointer' 
                : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title={lastSubstitution ? "Undo last substitution" : "No substitution to undo"}
          >
            <Undo2 className="h-5 w-5" />
          </button>
        </div>
        
        {/* Bottom row: End Period */}
        <Button onClick={handleEndPeriod} Icon={Square} variant="danger" className="w-full">
          End Period
        </Button>
      </div>

      {/* Field Player Modal */}
      <FieldPlayerModal
        isOpen={fieldPlayerModal.isOpen}
        onSetNext={handleSetNextSubstitution}
        onSubNow={handleSubstituteNow}
        onCancel={handleCancelFieldPlayerModal}
        onChangePosition={handleChangePosition}
        playerName={fieldPlayerModal.playerName}
        availablePlayers={fieldPlayerModal.availablePlayers}
        showPositionChange={!isPairsMode && fieldPlayerModal.type === 'player'}
        showPositionOptions={fieldPlayerModal.showPositionOptions}
        showSwapPositions={isPairsMode && fieldPlayerModal.type === 'pair'}
        showSubstitutionOptions={
          fieldPlayerModal.type === 'player' || 
          (fieldPlayerModal.type === 'pair' && fieldPlayerModal.target !== 'subPair')
        }
      />

      {/* Substitute Player Modal */}
      <SubstitutePlayerModal
        isOpen={substituteModal.isOpen}
        onInactivate={handleInactivatePlayer}
        onActivate={handleActivatePlayer}
        onCancel={handleCancelSubstituteModal}
        onSetAsNextToGoIn={handleSetAsNextToGoIn}
        playerName={substituteModal.playerName}
        isCurrentlyInactive={substituteModal.isCurrentlyInactive}
        canSetAsNextToGoIn={substituteModal.canSetAsNextToGoIn}
      />

      {/* Goalie Replacement Modal */}
      <GoalieModal
        isOpen={goalieModal.isOpen}
        onCancel={handleCancelGoalieModal}
        onSelectGoalie={handleSelectNewGoalie}
        currentGoalieName={goalieModal.currentGoalieName}
        availablePlayers={goalieModal.availablePlayers}
      />

      {/* Score Edit Modal */}
      <ScoreEditModal
        isOpen={scoreEditModal.isOpen}
        onCancel={handleScoreEditCancel}
        onSave={handleScoreEditSave}
        homeScore={homeScore}
        awayScore={awayScore}
        homeTeamName="Djurgården"
        awayTeamName={opponentTeamName || 'Opponent'}
      />
      
      {/* Undo Substitution Confirmation Modal */}
      <ConfirmationModal
        isOpen={undoConfirmModal.isOpen}
        onConfirm={handleConfirmUndoSubstitution}
        onCancel={handleCancelUndoSubstitution}
        title="Undo Substitution?"
        message="Are you sure you want to undo the last substitution? This will restore the previous formation and player positions."
        confirmText="Yes, undo substitution"
        cancelText="Cancel"
      />
    </div>
  );
}