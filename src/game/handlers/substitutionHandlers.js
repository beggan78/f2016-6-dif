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
import { logEvent, removeEvent, EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';

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

  /**
   * Generate unique event ID for substitution tracking
   */
  const generateEventId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `sub_${timestamp}_${random}`;
  };

  /**
   * Get formation description for event logging
   */
  const getFormationDescription = (formation, teamMode) => {
    if (teamMode === TEAM_MODES.PAIRS_7) {
      return {
        leftPair: formation.leftPair,
        rightPair: formation.rightPair,
        subPair: formation.subPair,
        goalie: formation.goalie
      };
    } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
      return {
        leftDefender: formation.leftDefender,
        rightDefender: formation.rightDefender,
        leftAttacker: formation.leftAttacker,
        rightAttacker: formation.rightAttacker,
        substitute: formation.substitute,
        goalie: formation.goalie
      };
    } else if (teamMode === TEAM_MODES.INDIVIDUAL_7) {
      return {
        leftDefender7: formation.leftDefender7,
        rightDefender7: formation.rightDefender7,
        leftAttacker7: formation.leftAttacker7,
        rightAttacker7: formation.rightAttacker7,
        substitute7_1: formation.substitute7_1,
        substitute7_2: formation.substitute7_2,
        goalie: formation.goalie
      };
    }
    return formation;
  };

  /**
   * Get player names for event logging
   */
  const getPlayerNames = (playerIds, allPlayers) => {
    return playerIds.map(id => {
      const player = allPlayers.find(p => p.id === id);
      return player ? player.name : 'Unknown';
    }).filter(name => name !== 'Unknown');
  };


  /**
   * Log substitution event with comprehensive data
   */
  const logSubstitutionEvent = (
    playersGoingOff, 
    playersComingOn, 
    beforeFormation, 
    afterFormation, 
    teamMode, 
    allPlayers, 
    currentTime,
    periodNumber = 1
  ) => {
    try {
      const eventId = generateEventId();
      
      const eventData = {
        eventId,
        playersOff: playersGoingOff,
        playersOn: playersComingOn,
        playersOffNames: getPlayerNames(playersGoingOff, allPlayers),
        playersOnNames: getPlayerNames(playersComingOn, allPlayers),
        teamMode,
        beforeFormation: getFormationDescription(beforeFormation, teamMode),
        afterFormation: getFormationDescription(afterFormation, teamMode),
        periodNumber,
        matchTime: calculateMatchTime(currentTime),
        timestamp: currentTime
      };

      // Always log as regular substitution event
      const substitutionEvent = logEvent(EVENT_TYPES.SUBSTITUTION, eventData);
      console.log(`Substitution logged: ${playersGoingOff.join(', ')} off, ${playersComingOn.join(', ')} on`);
      return substitutionEvent;
    } catch (error) {
      console.error('Failed to log substitution event:', error);
      // Don't throw - substitution should continue even if logging fails
      return null;
    }
  };

  const handleSetNextSubstitution = (fieldPlayerModal) => {
    if (fieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(fieldPlayerModal.target);
    } else if (fieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(fieldPlayerModal.target, false); // Manual user selection
    }
    closeFieldPlayerModal();
  };

  const handleSubstituteNow = (fieldPlayerModal) => {
    // First set as next substitution
    if (fieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(fieldPlayerModal.target);
    } else if (fieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(fieldPlayerModal.target, false); // Manual user selection
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
        const currentTime = Date.now();
        const gameState = gameStateFactory();
        
        // Use the new animation system for substitute swap
        animateStateChange(
          gameState,
          (state) => calculateSubstituteSwap(state, substitute7_1Id, substitute7_2Id),
          (newGameState) => {
            // Apply the state changes
            setPeriodFormation(newGameState.periodFormation);
            setAllPlayers(newGameState.allPlayers);

            // Log substitute order change event
            try {
              const player1 = gameState.allPlayers.find(p => p.id === substitute7_1Id);
              const player2 = gameState.allPlayers.find(p => p.id === substitute7_2Id);
              
              if (player1 && player2) {
                logEvent(EVENT_TYPES.POSITION_CHANGE, {
                  type: 'substitute_order_swap',
                  player1Id: substitute7_1Id,
                  player2Id: substitute7_2Id,
                  player1Name: player1.name,
                  player2Name: player2.name,
                  description: `${player2.name} moved to next-to-go-in position`,
                  beforeFormation: getFormationDescription(gameState.periodFormation, teamMode),
                  afterFormation: getFormationDescription(newGameState.periodFormation, teamMode),
                  teamMode,
                  matchTime: calculateMatchTime(currentTime),
                  timestamp: currentTime,
                  periodNumber: gameState.currentPeriodNumber || 1
                });
              }
            } catch (error) {
              console.error('Failed to log substitute swap event:', error);
            }
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
      const currentTime = Date.now();
      const gameState = gameStateFactory();
      const playerBeingInactivated = findPlayerById(allPlayers, substituteModal.playerId);
      const isSubstitute7_2BeingInactivated = playerBeingInactivated?.stats.currentPairKey === 'substitute7_2';
      
      if (isSubstitute7_2BeingInactivated) {
        // No animation needed - substitute7_2 is already in the correct position for inactive players
        // Call togglePlayerInactive directly
        const newGameState = calculatePlayerToggleInactive(gameState, substituteModal.playerId);
        
        setPeriodFormation(newGameState.periodFormation);
        setAllPlayers(newGameState.allPlayers);
        setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
        setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
        if (newGameState.rotationQueue) {
          setRotationQueue(newGameState.rotationQueue);
        }

        // Log player inactivation event
        try {
          if (playerBeingInactivated) {
            logEvent(EVENT_TYPES.POSITION_CHANGE, {
              type: 'player_inactivated',
              playerId: substituteModal.playerId,
              playerName: playerBeingInactivated.name,
              previousStatus: 'active_substitute',
              newStatus: 'inactive',
              description: `${playerBeingInactivated.name} marked as inactive`,
              teamMode,
              matchTime: calculateMatchTime(currentTime),
              timestamp: currentTime,
              periodNumber: gameState.currentPeriodNumber || 1
            });
          }
        } catch (error) {
          console.error('Failed to log player inactivation event:', error);
        }
      } else {
        // Use animation system for substitute position swap during inactivation
        animateStateChange(
          gameState,
          (state) => calculatePlayerToggleInactive(state, substituteModal.playerId),
          (newGameState) => {
            // Apply the state changes
            setPeriodFormation(newGameState.periodFormation);
            setAllPlayers(newGameState.allPlayers);
            setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
            setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
            if (newGameState.rotationQueue) {
              setRotationQueue(newGameState.rotationQueue);
            }

            // Log player inactivation event with position swap
            try {
              if (playerBeingInactivated) {
                logEvent(EVENT_TYPES.POSITION_CHANGE, {
                  type: 'player_inactivated_with_swap',
                  playerId: substituteModal.playerId,
                  playerName: playerBeingInactivated.name,
                  previousStatus: 'active_substitute',
                  newStatus: 'inactive',
                  description: `${playerBeingInactivated.name} marked as inactive (with position swap)`,
                  beforeFormation: getFormationDescription(gameState.periodFormation, teamMode),
                  afterFormation: getFormationDescription(newGameState.periodFormation, teamMode),
                  teamMode,
                  matchTime: calculateMatchTime(currentTime),
                  timestamp: currentTime,
                  periodNumber: gameState.currentPeriodNumber || 1
                });
              }
            } catch (error) {
              console.error('Failed to log player inactivation event:', error);
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
      const currentTime = Date.now();
      const gameState = gameStateFactory();
      const playerBeingActivated = findPlayerById(gameState.allPlayers, substituteModal.playerId);
      
      // Use animation system for substitute position swap during activation
      animateStateChange(
        gameState,
        (state) => calculatePlayerToggleInactive(state, substituteModal.playerId),
        (newGameState) => {
          // Apply the state changes
          setPeriodFormation(newGameState.periodFormation);
          setAllPlayers(newGameState.allPlayers);
          setNextPlayerIdToSubOut(newGameState.nextPlayerIdToSubOut);
          setNextNextPlayerIdToSubOut(newGameState.nextNextPlayerIdToSubOut);
          if (newGameState.rotationQueue) {
            setRotationQueue(newGameState.rotationQueue);
          }

          // Log player activation event
          try {
            if (playerBeingActivated) {
              logEvent(EVENT_TYPES.POSITION_CHANGE, {
                type: 'player_activated',
                playerId: substituteModal.playerId,
                playerName: playerBeingActivated.name,
                previousStatus: 'inactive',
                newStatus: 'active_substitute',
                description: `${playerBeingActivated.name} reactivated`,
                beforeFormation: getFormationDescription(gameState.periodFormation, teamMode),
                afterFormation: getFormationDescription(newGameState.periodFormation, teamMode),
                teamMode,
                matchTime: calculateMatchTime(currentTime),
                timestamp: currentTime,
                periodNumber: gameState.currentPeriodNumber || 1
              });
            }
          } catch (error) {
            console.error('Failed to log player activation event:', error);
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
        
        // Get players going off and coming on from substitution manager result
        const substitutionResult = newGameState.substitutionResult || {};
        const playersGoingOffIds = substitutionResult.playersGoingOffIds || [];
        const playersComingOnIds = substitutionResult.playersComingOnIds || newGameState.playersToHighlight || [];
        const playersComingOnOriginalStats = playersComingOnIds.map(playerId => {
          const player = gameState.allPlayers.find(p => p.id === playerId);
          return player ? { id: player.id, stats: { ...player.stats } } : null;
        }).filter(Boolean);
        
        // Log substitution event with comprehensive data
        const substitutionEvent = logSubstitutionEvent(
          playersGoingOffIds,
          playersComingOnIds,
          beforeFormation,
          newGameState.periodFormation,
          teamMode,
          gameState.allPlayers,
          substitutionTimestamp,
          gameState.currentPeriodNumber || 1
        );
        
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
          subTimerSecondsAtSubstitution,
          eventId: substitutionEvent?.id || null // Store event ID for potential removal
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
      const currentTime = Date.now();
      
      animateStateChange(
        gameState,
        (state) => calculatePositionSwitch(state, fieldPlayerModal.sourcePlayerId, targetPlayerId),
        (newGameState) => {
          setPeriodFormation(newGameState.periodFormation);
          setAllPlayers(newGameState.allPlayers);

          // Log position change event
          try {
            const sourcePlayer = gameState.allPlayers.find(p => p.id === fieldPlayerModal.sourcePlayerId);
            const targetPlayer = gameState.allPlayers.find(p => p.id === targetPlayerId);
            
            if (sourcePlayer && targetPlayer) {
              logEvent(EVENT_TYPES.POSITION_CHANGE, {
                sourcePlayerId: fieldPlayerModal.sourcePlayerId,
                targetPlayerId: targetPlayerId,
                sourcePlayerName: sourcePlayer.name,
                targetPlayerName: targetPlayer.name,
                sourcePosition: sourcePlayer.stats.currentPairKey,
                targetPosition: targetPlayer.stats.currentPairKey,
                beforeFormation: getFormationDescription(gameState.periodFormation, teamMode),
                afterFormation: getFormationDescription(newGameState.periodFormation, teamMode),
                teamMode,
                matchTime: calculateMatchTime(currentTime),
                timestamp: currentTime,
                periodNumber: gameState.currentPeriodNumber || 1
              });
            }
          } catch (error) {
            console.error('Failed to log position change event:', error);
            // Don't throw - position switch should continue even if logging fails
          }
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

    const currentTime = Date.now();

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

        // Handle event logging for undo
        try {
          if (lastSubstitution.eventId) {
            // Remove the original substitution event from the timeline
            const removeSuccess = removeEvent(lastSubstitution.eventId);
            if (removeSuccess) {
              console.log(`Substitution event ${lastSubstitution.eventId} removed from timeline`);
            }
          }

          // Log the undo action itself
          logEvent(EVENT_TYPES.SUBSTITUTION_UNDONE, {
            originalEventId: lastSubstitution.eventId,
            originalTimestamp: lastSubstitution.timestamp,
            undoTimestamp: currentTime,
            timeSinceOriginal: currentTime - lastSubstitution.timestamp,
            playersGoingBackOn: lastSubstitution.playersGoingOffIds,
            playersComingBackOff: lastSubstitution.playersComingOnIds,
            playersGoingBackOnNames: getPlayerNames(lastSubstitution.playersGoingOffIds, newGameState.allPlayers),
            playersComingBackOffNames: getPlayerNames(lastSubstitution.playersComingOnIds, newGameState.allPlayers),
            teamMode: lastSubstitution.teamMode,
            beforeFormation: getFormationDescription(newGameState.periodFormation, lastSubstitution.teamMode),
            afterFormation: getFormationDescription(lastSubstitution.beforeFormation, lastSubstitution.teamMode),
            reason: 'user_initiated_undo',
            matchTime: calculateMatchTime(currentTime),
            periodNumber: newGameState.currentPeriodNumber || 1
          });
        } catch (error) {
          console.error('Failed to log undo event:', error);
          // Don't throw - undo should continue even if logging fails
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