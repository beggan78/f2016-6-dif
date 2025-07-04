import { animateStateChange } from '../animation/animationSupport';
import { 
  calculateSubstitution, 
  calculatePositionSwitch,
  calculatePlayerToggleInactive,
  calculateSubstituteSwap,
  calculateUndo
} from '../logic/gameStateLogic';
import { findPlayerById, getOutfieldPlayers } from '../../utils/playerUtils';
import { TEAM_MODES } from '../../constants/playerConstants';

export const createSubstitutionHandlers = (
  gameStateFactory,
  stateUpdaters,
  animationHooks,
  modalHandlers,
  teamMode
) => {
  const {
    setPeriodFormation,
    setAllPlayers,
    setNextPhysicalPairToSubOut,
    setNextPlayerToSubOut,
    setNextPlayerIdToSubOut,
    setNextNextPlayerIdToSubOut,
    setRotationQueue,
    setShouldSubstituteNow,
    setLastSubstitution,
    setLastSubstitutionTimestamp,
    resetSubTimer,
    handleUndoSubstitutionTimer
  } = stateUpdaters;

  const {
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  } = animationHooks;

  const {
    closeFieldPlayerModal,
    closeSubstituteModal,
    removeModalFromStack,
    openFieldPlayerModal
  } = modalHandlers;

  const isIndividual7Mode = teamMode === TEAM_MODES.INDIVIDUAL_7;

  const handleSetNextSubstitution = (fieldPlayerModal) => {
    if (fieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(fieldPlayerModal.target);
    } else if (fieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(fieldPlayerModal.target);
    }
    closeFieldPlayerModal();
  };

  const handleSubstituteNow = (fieldPlayerModal) => {
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

  const handleSetAsNextToGoIn = (substituteModal, periodFormation) => {
    if (substituteModal.playerId && isIndividual7Mode) {
      const playerId = substituteModal.playerId;
      
      // Find current positions
      const substitute7_1Id = periodFormation.substitute7_1;
      const substitute7_2Id = periodFormation.substitute7_2;
      
      // Only proceed if the player is substitute7_2 (next-next to go in)
      if (playerId === substitute7_2Id) {
        // Use the new animation system for substitute swap
        animateStateChange(
          gameStateFactory(),
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

  const handleInactivatePlayer = (substituteModal, allPlayers, periodFormation) => {
    if (substituteModal.playerId && isIndividual7Mode) {
      // Check if substitute7_2 is being inactivated
      const playerBeingInactivated = findPlayerById(allPlayers, substituteModal.playerId);
      const isSubstitute7_2BeingInactivated = playerBeingInactivated?.stats.currentPairKey === 'substitute7_2';
      
      if (isSubstitute7_2BeingInactivated) {
        // No animation needed - substitute7_2 is already in the correct position for inactive players
        // Call togglePlayerInactive directly
        const gameState = gameStateFactory();
        const newGameState = calculatePlayerToggleInactive(gameState, substituteModal.playerId);
        
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
        setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        if (newGameState.rotationQueue) {
          setRotationQueue(newGameState.rotationQueue);
        }
      } else {
        // Use animation system for substitute position swap during inactivation
        animateStateChange(
          gameStateFactory(),
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
      const gameState = gameStateFactory();
      const newGameState = calculatePlayerToggleInactive(gameState, substituteModal.playerId);
      
      setPeriodFormation(newGameState.periodFormation);
      setAllPlayers(newGameState.allPlayers);
      setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
      setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
      if (newGameState.rotationQueue) {
        setRotationQueue(newGameState.rotationQueue);
      }
    }
    closeSubstituteModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  const handleActivatePlayer = (substituteModal) => {
    if (substituteModal.playerId && isIndividual7Mode) {
      // Use animation system for substitute position swap during activation
      animateStateChange(
        gameStateFactory(),
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
      const gameState = gameStateFactory();
      const newGameState = calculatePlayerToggleInactive(gameState, substituteModal.playerId);
      
      setPeriodFormation(newGameState.periodFormation);
      setAllPlayers(newGameState.allPlayers);
      setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
      setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
      if (newGameState.rotationQueue) {
        setRotationQueue(newGameState.rotationQueue);
      }
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

  const handleSubstitutionWithHighlight = () => {
    const gameState = gameStateFactory();
    
    // Capture before-state for undo functionality
    const substitutionTimestamp = Date.now();
    const beforeFormation = { ...gameState.periodFormation };
    const beforeNextPair = gameState.nextPhysicalPairToSubOut;
    const beforeNextPlayer = gameState.nextPlayerToSubOut;
    const beforeNextPlayerId = gameState.nextPlayerIdToSubOut;
    const beforeNextNextPlayerId = gameState.nextNextPlayerIdToSubOut;
    const subTimerSecondsAtSubstitution = gameState.subTimerSeconds;
    
    // Use the new animation system for substitution
    animateStateChange(
      gameState,
      calculateSubstitution,
      (newGameState) => {
        // Apply the state changes
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
        setNextPhysicalPairToSubOut(newGameState.nextPhysicalPairToSubOut);
        setNextPlayerToSubOut(newGameState.nextPlayerToSubOut);
        setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        if (newGameState.rotationQueue) {
          setRotationQueue(newGameState.rotationQueue);
        }
        
        // Get players going off for undo data
        const playersGoingOffIds = [beforeNextPlayerId].filter(Boolean);
        
        // Get players coming on and their original stats for undo
        const playersComingOnIds = newGameState.playersToHighlight || [];
        const playersComingOnOriginalStats = playersComingOnIds.map(playerId => {
          const player = gameState.allPlayers.find(p => p.id === playerId);
          return player ? { id: player.id, stats: { ...player.stats } } : null;
        }).filter(Boolean);
        
        // Create lastSubstitution object for undo functionality
        const lastSubstitutionData = {
          timestamp: substitutionTimestamp,
          beforeFormation,
          beforeNextPair,
          beforeNextPlayer,
          beforeNextPlayerId,
          beforeNextNextPlayerId,
          playersComingOnOriginalStats,
          playersComingOnIds,
          playersGoingOffIds,
          teamMode,
          subTimerSecondsAtSubstitution
        };
        
        
        // Store last substitution for undo
        setLastSubstitution(lastSubstitutionData);
        setLastSubstitutionTimestamp(substitutionTimestamp);
        
        // Reset substitution timer after successful substitution
        resetSubTimer();
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  };

  const handleChangePosition = (action) => {
    const gameState = gameStateFactory();
    const { fieldPlayerModal } = gameState;
    
    if (action === 'show-options') {
      // Check if this is pairs mode - position change not supported
      if (gameState.teamMode === TEAM_MODES.PAIRS_7) {
        alert('Position change between pairs is not supported. Use the "Swap positions" option to swap attacker and defender within this pair.');
        closeFieldPlayerModal();
        return;
      }
      
      // Show the position selection options for individual modes
      if (fieldPlayerModal.target && fieldPlayerModal.type === 'player') {
        const sourcePlayerId = gameState.periodFormation[fieldPlayerModal.target];
        const goalieId = gameState.periodFormation.goalie;
        
        if (sourcePlayerId) {
          // Extract IDs from selectedSquadPlayers for getOutfieldPlayers function
          const selectedSquadIds = gameState.selectedSquadPlayers.map(p => p.id);
          
          // Use utility function to get outfield players, then filter by status
          const availablePlayers = getOutfieldPlayers(
            gameState.allPlayers, 
            selectedSquadIds, 
            goalieId
          ).filter(player => {
            // Exclude the source player
            if (player.id === sourcePlayerId) return false;
            
            // Find full player data for status checking
            const fullPlayerData = gameState.allPlayers.find(p => p.id === player.id);
            if (!fullPlayerData) return false;
            
            const currentPairKey = fullPlayerData.stats.currentPairKey;
            
            // Exclude substitutes based on team mode
            if (gameState.teamMode === TEAM_MODES.PAIRS_7) {
              return currentPairKey !== 'subPair';
            } else if (gameState.teamMode === TEAM_MODES.INDIVIDUAL_6) {
              return currentPairKey !== 'substitute';
            } else if (gameState.teamMode === TEAM_MODES.INDIVIDUAL_7) {
              return currentPairKey !== 'substitute7_1' && currentPairKey !== 'substitute7_2';
            }
            
            return true;
          });
          
          // Update modal state to show position options
          openFieldPlayerModal({
            type: 'player',
            target: fieldPlayerModal.target,
            playerName: fieldPlayerModal.playerName,
            sourcePlayerId: sourcePlayerId,
            availablePlayers: availablePlayers,
            showPositionOptions: true
          });
        }
      }
    } else if (action === 'swap-pair-positions') {
      // Handle pair position swapping (for pairs mode)
      if (fieldPlayerModal.target && fieldPlayerModal.type === 'pair') {
        // This would handle swapping attacker and defender within a pair
        // Implementation depends on pair swapping logic
        closeFieldPlayerModal();
      }
    } else if (action === null) {
      // Go back to main options
      const gameState = gameStateFactory();
      const { fieldPlayerModal } = gameState;
      
      openFieldPlayerModal({
        type: fieldPlayerModal.type,
        target: fieldPlayerModal.target,
        playerName: fieldPlayerModal.playerName,
        sourcePlayerId: fieldPlayerModal.sourcePlayerId,
        availablePlayers: [],
        showPositionOptions: false
      });
    } else if (typeof action === 'string' && fieldPlayerModal.sourcePlayerId) {
      // action is a player ID - perform the animated position switch
      const targetPlayerId = action;
      
      animateStateChange(
        gameState,
        (state) => calculatePositionSwitch(state, fieldPlayerModal.sourcePlayerId, targetPlayerId),
        (newGameState) => {
          setPeriodFormation(newGameState.periodFormation);
          setAllPlayers(newGameState.allPlayers);
        },
        setAnimationState,
        setHideNextOffIndicator,
        setRecentlySubstitutedPlayers
      );
      closeFieldPlayerModal();
    } else {
      // Close modal if something unexpected happened
      closeFieldPlayerModal();
    }
  };

  const handleUndo = (lastSubstitution) => {
    if (!lastSubstitution) {
      console.warn('No substitution to undo');
      return;
    }


    // Use the animation system for undo
    animateStateChange(
      gameStateFactory(),
      (gameState) => calculateUndo(gameState, lastSubstitution),
      (newGameState) => {
        // Apply the state changes
        setPeriodFormation(newGameState.periodFormation);
        setNextPhysicalPairToSubOut(newGameState.nextPhysicalPairToSubOut);
        setNextPlayerToSubOut(newGameState.nextPlayerToSubOut);
        setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        setAllPlayers(newGameState.allPlayers);
        if (newGameState.rotationQueue) {
          setRotationQueue(newGameState.rotationQueue);
        }

        // Restore substitution timer with the saved value
        if (handleUndoSubstitutionTimer && lastSubstitution.subTimerSecondsAtSubstitution !== undefined) {
          // Pass both the timer value and the timestamp from the substitution being undone
          handleUndoSubstitutionTimer(lastSubstitution.subTimerSecondsAtSubstitution, lastSubstitution.timestamp);
        }
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );
  };

  return {
    handleSetNextSubstitution,
    handleSubstituteNow,
    handleCancelFieldPlayerModal,
    handleSetAsNextToGoIn,
    handleInactivatePlayer,
    handleActivatePlayer,
    handleCancelSubstituteModal,
    handleSubstitutionWithHighlight,
    handleChangePosition,
    handleUndo
  };
};