import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, RotateCcw, Square, Clock, Pause, Play, Undo2 } from 'lucide-react';
import { Button, FieldPlayerModal, SubstitutePlayerModal, GoalieModal, ScoreEditModal, ConfirmationModal } from '../shared/UI';
import { FORMATION_TYPES } from '../../constants/playerConstants';
import { formatTimeDifference } from '../../utils/formatUtils';
import { animateStateChange, getPlayerAnimationProps } from '../../game/animation/animationSupport';
import { getPlayerName, findPlayerById } from '../../utils/playerUtils';
import { 
  calculateSubstitution, 
  calculatePositionSwitch, 
  calculateGoalieSwitch, 
  calculateUndo,
  calculatePlayerToggleInactive,
  calculateSubstituteSwap
} from '../../game/logic/gameStateLogic';
import { handlePauseResumeTime } from '../../game/time/stintManager';
import { calculateCurrentStintDuration } from '../../game/time/timeCalculator';

// Animation timing constants are now imported from animationSupport

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
  resetSubTimer, 
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
  setLastSubstitutionTimestamp,
  getOutfieldPlayers,
  pushModalState,
  removeModalFromStack,
  homeScore,
  awayScore,
  opponentTeamName,
  addHomeGoal,
  addAwayGoal,
  setScore,
  rotationQueue,
  setRotationQueue
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
      
      return handlePauseResumeTime(player, currentTimeEpoch, isPausing);
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
  
  // Helper to create game state object for pure logic functions
  const createGameState = React.useCallback(() => ({
    periodFormation,
    allPlayers,
    formationType,
    nextPhysicalPairToSubOut,
    nextPlayerIdToSubOut,
    nextNextPlayerIdToSubOut,
    nextPlayerToSubOut,
    rotationQueue,
    isSubTimerPaused
  }), [periodFormation, allPlayers, formationType, nextPhysicalPairToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, nextPlayerToSubOut, rotationQueue, isSubTimerPaused]);

  // New substitution handler using the unified animation system
  const handleSubstitutionWithHighlight = React.useCallback(() => {
    const substitutionTimestamp = Date.now();
    
    // Store state before substitution for undo functionality
    const beforeFormation = JSON.parse(JSON.stringify(periodFormation));
    const beforeNextPair = nextPhysicalPairToSubOut;
    const beforeNextPlayer = nextPlayerToSubOut;
    const beforeNextPlayerId = nextPlayerIdToSubOut;
    const beforeNextNextPlayerId = nextNextPlayerIdToSubOut;
    const subTimerSecondsAtSubstitution = subTimerSeconds;
    
    
    // Store original stats for players coming on
    let playersComingOnIds = [];
    if (isPairsMode) {
      const pairComingIn = periodFormation.subPair;
      playersComingOnIds = [pairComingIn?.defender, pairComingIn?.attacker].filter(Boolean);
    } else if (isIndividual6Mode) {
      playersComingOnIds = [periodFormation.substitute].filter(Boolean);
    } else if (isIndividual7Mode) {
      playersComingOnIds = [periodFormation.substitute7_1].filter(Boolean);
    }
    
    const playersComingOnOriginalStats = playersComingOnIds.map(playerId => {
      const player = allPlayers.find(p => p.id === playerId);
      return {
        id: playerId,
        name: player?.name,
        stats: JSON.parse(JSON.stringify(player?.stats))
      };
    });

    // Use the new animation system
    animateStateChange(
      createGameState(),
      calculateSubstitution,
      (newGameState) => {
        // Apply the state changes
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
        if (newGameState.nextPhysicalPairToSubOut) {
          setNextPhysicalPairToSubOut(newGameState.nextPhysicalPairToSubOut);
        }
        if (newGameState.nextPlayerIdToSubOut !== undefined) {
          setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        }
        if (newGameState.nextNextPlayerIdToSubOut !== undefined) {
          setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        }
        if (newGameState.nextPlayerToSubOut) {
          setNextPlayerToSubOut(newGameState.nextPlayerToSubOut, true); // isAutomaticUpdate = true
        }
        // Update rotation queue if it was modified
        if (newGameState.rotationQueue) {
          setRotationQueue(newGameState.rotationQueue);
        }

        // Store undo data
        setLastSubstitution({
          timestamp: substitutionTimestamp,
          beforeFormation,
          beforeNextPair,
          beforeNextPlayer,
          beforeNextPlayerId,
          beforeNextNextPlayerId,
          playersComingOnOriginalStats,
          playersComingOnIds: newGameState.playersToHighlight || [],
          playersGoingOffIds: [nextPlayerIdToSubOut].filter(Boolean),
          formationType,
          subTimerSecondsAtSubstitution
        });

        // Update last substitution timestamp for undo functionality
        setLastSubstitutionTimestamp(substitutionTimestamp);

        // Reset substitution timer after successful substitution
        resetSubTimer();
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  }, [createGameState, setPeriodFormation, setAllPlayers, setNextPhysicalPairToSubOut, setNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut, setNextPlayerToSubOut, setRotationQueue, setAnimationState, setHideNextOffIndicator, setRecentlySubstitutedPlayers, periodFormation, nextPhysicalPairToSubOut, nextPlayerToSubOut, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, subTimerSeconds, allPlayers, formationType, isPairsMode, isIndividual6Mode, isIndividual7Mode, resetSubTimer, setLastSubstitutionTimestamp]);

  // New undo substitution handler using the unified animation system
  const handleUndoSubstitution = React.useCallback(() => {
    if (!lastSubstitution) {
      console.warn('No substitution to undo');
      return;
    }


    // Use the new animation system
    animateStateChange(
      createGameState(),
      (gameState) => calculateUndo(gameState, lastSubstitution),
      (newGameState) => {
        // Apply the state changes
        setPeriodFormation(newGameState.periodFormation);
        setNextPhysicalPairToSubOut(newGameState.nextPhysicalPairToSubOut);
        setNextPlayerToSubOut(newGameState.nextPlayerToSubOut);
        setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        setAllPlayers(newGameState.allPlayers);

        // Restore substitution timer
        if (handleUndoSubstitutionTimer && lastSubstitution.subTimerSecondsAtSubstitution !== undefined) {
          handleUndoSubstitutionTimer(lastSubstitution.subTimerSecondsAtSubstitution);
        }

        // Clear the undo data since we've used it
        setLastSubstitution(null);
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  }, [lastSubstitution, createGameState, setPeriodFormation, setNextPhysicalPairToSubOut, setNextPlayerToSubOut, setNextPlayerIdToSubOut, setNextNextPlayerIdToSubOut, setAllPlayers, handleUndoSubstitutionTimer, setAnimationState, setHideNextOffIndicator, setRecentlySubstitutedPlayers]);

  // New position switch handler using the unified animation system
  const handlePositionSwitchWithAnimation = React.useCallback((player1Id, player2Id) => {
    // Use the new animation system
    animateStateChange(
      createGameState(),
      (gameState) => calculatePositionSwitch(gameState, player1Id, player2Id),
      (newGameState) => {
        // Apply the state changes
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
        
        const player1Name = getPlayerNameById(player1Id);
        const player2Name = getPlayerNameById(player2Id);
        console.log(`Successfully switched positions between ${player1Name} and ${player2Name}`);
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  }, [createGameState, setPeriodFormation, setAllPlayers, getPlayerNameById, setAnimationState, setHideNextOffIndicator, setRecentlySubstitutedPlayers]);

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
    
    // Calculate current stint time using time module
    let currentStintTime = 0;
    if (stats.currentPeriodStatus === 'on_field') {
      currentStintTime = calculateCurrentStintDuration(stats.lastStintStartTimeEpoch, Date.now());
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
        // Use the new animation system for substitute swap
        animateStateChange(
          createGameState(),
          (gameState) => calculateSubstituteSwap(gameState, substitute7_1Id, substitute7_2Id),
          (newGameState) => {
            // Apply the state changes
            setPeriodFormation(newGameState.periodFormation);
            setAllPlayers(newGameState.allPlayers);
          },
          setAnimationState,
          setHideNextOffIndicator,
          setRecentlySubstitutedPlayers
        );
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
        // Use animation system for substitute position swap during inactivation
        animateStateChange(
          createGameState(),
          (gameState) => calculatePlayerToggleInactive(gameState, substituteModal.playerId),
          (newGameState) => {
            // Apply the state changes
            setPeriodFormation(newGameState.periodFormation);
            setAllPlayers(newGameState.allPlayers);
            setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
            setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
            if (newGameState.rotationQueue) {
              setRotationQueue(newGameState.rotationQueue);
            }
          },
          setAnimationState,
          setHideNextOffIndicator,
          setRecentlySubstitutedPlayers
        );
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
      // Use animation system for substitute position swap during activation
      animateStateChange(
        createGameState(),
        (gameState) => calculatePlayerToggleInactive(gameState, substituteModal.playerId),
        (newGameState) => {
          // Apply the state changes
          setPeriodFormation(newGameState.periodFormation);
          setAllPlayers(newGameState.allPlayers);
          setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
          setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
          if (newGameState.rotationQueue) {
            setRotationQueue(newGameState.rotationQueue);
          }
        },
        setAnimationState,
        setHideNextOffIndicator,
        setRecentlySubstitutedPlayers
      );
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
    // Close modal immediately
    closeGoalieModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
    
    // Use the new animation system
    animateStateChange(
      createGameState(),
      (gameState) => calculateGoalieSwitch(gameState, newGoalieId),
      (newGameState) => {
        // Apply the state changes
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
        
        const formerGoalieId = periodFormation.goalie;
        const oldGoalieName = getPlayerNameById(formerGoalieId);
        const newGoalieName = getPlayerNameById(newGoalieId);
        console.log(`Successfully switched goalie: ${oldGoalieName} -> ${newGoalieName}`);
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
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

  // Old goalie animation helper removed - now using unified animation system

  const renderPair = (pairKey, pairName, renderIndex) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;
    const isNextOff = pairKey === nextPhysicalPairToSubOut && pairKey !== 'subPair';
    const isNextOn = pairKey === 'subPair';
    const canBeSelected = pairKey === 'leftPair' || pairKey === 'rightPair' || pairKey === 'subPair';

    // Check if any player in this pair was recently substituted
    const hasRecentlySubstitutedPlayer = (pairData.defender && recentlySubstitutedPlayers.has(pairData.defender)) ||
                                        (pairData.attacker && recentlySubstitutedPlayers.has(pairData.attacker));

    // New unified animation logic
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    // Check for animations on both players in the pair
    const pairDefenderId = pairData.defender;
    const pairAttackerId = pairData.attacker;
    
    const defenderAnimationProps = pairDefenderId ? getPlayerAnimationProps(pairDefenderId, animationState) : null;
    const attackerAnimationProps = pairAttackerId ? getPlayerAnimationProps(pairAttackerId, animationState) : null;
    
    // Use defender animation if available, otherwise attacker animation
    const animationProps = defenderAnimationProps || attackerAnimationProps;
    if (animationProps) {
      animationClass = animationProps.animationClass;
      zIndexClass = animationProps.zIndexClass;
      styleProps = animationProps.styleProps;
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

    // New unified animation logic
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    // Get animation properties for this specific player
    const animationProps = getPlayerAnimationProps(playerId, animationState);
    if (animationProps) {
      animationClass = animationProps.animationClass;
      zIndexClass = animationProps.zIndexClass;
      styleProps = animationProps.styleProps;
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

    // New unified animation logic
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    // Get animation properties for this specific player
    const animationProps = getPlayerAnimationProps(playerId, animationState);
    if (animationProps) {
      animationClass = animationProps.animationClass;
      zIndexClass = animationProps.zIndexClass;
      styleProps = animationProps.styleProps;
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
        className={(() => {
          // Get animation properties for the current goalie
          const goalieAnimationProps = getPlayerAnimationProps(periodFormation.goalie, animationState);
          const animationClass = goalieAnimationProps?.animationClass || '';
          const zIndexClass = goalieAnimationProps?.zIndexClass || '';
          return `p-2 bg-slate-700 rounded-lg cursor-pointer select-none hover:bg-slate-600 transition-colors duration-150 ${animationClass} ${zIndexClass}`;
        })()}
        style={(() => {
          const goalieAnimationProps = getPlayerAnimationProps(periodFormation.goalie, animationState);
          return goalieAnimationProps?.styleProps || {};
        })()}
        {...goalieEvents}
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