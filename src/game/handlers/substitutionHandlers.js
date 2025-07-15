import { animateStateChange } from '../animation/animationSupport';
import { 
  calculateSubstitution, 
  calculatePositionSwitch,
  calculatePlayerToggleInactive,
  calculateUndo,
  calculatePairPositionSwap,
  calculateSubstituteReorder
} from '../logic/gameStateLogic';
import { findPlayerById, getOutfieldPlayers, hasActiveSubstitutes } from '../../utils/playerUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { TEAM_MODES } from '../../constants/playerConstants';
import { MODE_DEFINITIONS, supportsInactiveUsers, getBottomSubstitutePosition } from '../../constants/gameModes';
import { logEvent, removeEvent, EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';

export const createSubstitutionHandlers = (
  gameStateFactory,
  stateUpdaters,
  animationHooks,
  modalHandlers,
  teamMode
) => {
  const {
    setFormation,
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

  const isIndividualMode = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8].includes(teamMode);
  const supportsInactive = supportsInactiveUsers(teamMode);

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
    } else {
      // Generic formation normalizer for individual modes using MODE_DEFINITIONS
      const definition = MODE_DEFINITIONS[teamMode];
      if (!definition) return formation;
      
      const normalized = { goalie: formation.goalie };
      
      // Add field positions
      definition.fieldPositions.forEach(position => {
        normalized[position] = formation[position];
      });
      
      // Add substitute positions
      definition.substitutePositions.forEach(position => {
        // For INDIVIDUAL_6, use 'substitute' as the key for substitute_1
        if (teamMode === TEAM_MODES.INDIVIDUAL_6 && position === 'substitute_1') {
          normalized.substitute = formation[position];
        } else {
          normalized[position] = formation[position];
        }
      });
      
      return normalized;
    }
  };

  /**
   * Get player names for event logging
   */
  const getPlayerNames = (playerIds, allPlayers) => {
    return playerIds.map(id => {
      const player = allPlayers.find(p => p.id === id);
      return player ? formatPlayerName(player) : 'Unknown';
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

  const handleSetAsNextToGoIn = (substituteModal, formation) => {
    if (substituteModal.playerId && isIndividualMode) {
      const playerId = substituteModal.playerId;
      const gameState = gameStateFactory();
      
      // Get team mode configuration
      const definition = MODE_DEFINITIONS[teamMode];
      if (!definition || !definition.supportsNextNextIndicators) {
        console.warn('Team mode does not support next-to-go-in functionality');
        closeSubstituteModal();
        return;
      }
      
      // Find current player position
      const currentPosition = Object.keys(formation).find(pos => formation[pos] === playerId);
      
      // Check if player can be set as next to go in
      const canSetAsNext = definition.substitutePositions.includes(currentPosition) && 
                          currentPosition !== 'substitute_1' &&
                          !gameState.allPlayers.find(p => p.id === playerId)?.stats?.isInactive;
      
      if (canSetAsNext) {
        const currentTime = Date.now();
        
        // Use the new substitute reorder function
        animateStateChange(
          gameState,
          (state) => calculateSubstituteReorder(state, currentPosition),
          (newGameState) => {
            // Apply the state changes
            setFormation(newGameState.formation);
            setAllPlayers(newGameState.allPlayers);

            // Log substitute order change event
            try {
              const targetPlayer = gameState.allPlayers.find(p => p.id === playerId);
              
              if (targetPlayer) {
                logEvent(EVENT_TYPES.POSITION_CHANGE, {
                  type: 'substitute_order_reorder',
                  playerId: playerId,
                  playerName: targetPlayer.name,
                  fromPosition: currentPosition,
                  toPosition: 'substitute_1',
                  description: `${targetPlayer.name} moved to next-to-go-in position with cascading reorder`,
                  beforeFormation: getFormationDescription(gameState.formation, teamMode),
                  afterFormation: getFormationDescription(newGameState.formation, teamMode),
                  teamMode,
                  matchTime: calculateMatchTime(currentTime),
                  timestamp: currentTime,
                  periodNumber: gameState.currentPeriodNumber || 1
                });
              }
            } catch (error) {
              console.error('Failed to log substitute reorder event:', error);
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

  const handleInactivatePlayer = (substituteModal, allPlayers, formation) => {
    if (substituteModal.playerId && supportsInactive) {
      const currentTime = Date.now();
      const gameState = gameStateFactory();
      const playerBeingInactivated = findPlayerById(allPlayers, substituteModal.playerId);
      const bottomSubPosition = getBottomSubstitutePosition(teamMode);
      const isBottomSubBeingInactivated = playerBeingInactivated?.stats.currentPairKey === bottomSubPosition;
      
      if (isBottomSubBeingInactivated) {
        // No animation needed - player is already in the correct position for inactive players
        // Call togglePlayerInactive directly
        const newGameState = calculatePlayerToggleInactive(gameState, substituteModal.playerId);
        
        setFormation(newGameState.formation);
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
            setFormation(newGameState.formation);
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
                  beforeFormation: getFormationDescription(gameState.formation, teamMode),
                  afterFormation: getFormationDescription(newGameState.formation, teamMode),
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
      // Mode doesn't support inactive players, no action taken
      console.warn('Attempted to inactivate player in mode that does not support inactive players:', teamMode);
    }
    closeSubstituteModal();
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  };

  const handleActivatePlayer = (substituteModal) => {
    if (substituteModal.playerId && supportsInactive) {
      const currentTime = Date.now();
      const gameState = gameStateFactory();
      const playerBeingActivated = findPlayerById(gameState.allPlayers, substituteModal.playerId);
      
      // Use animation system for substitute position swap during activation
      animateStateChange(
        gameState,
        (state) => calculatePlayerToggleInactive(state, substituteModal.playerId),
        (newGameState) => {
          // Apply the state changes
          setFormation(newGameState.formation);
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
                beforeFormation: getFormationDescription(gameState.formation, teamMode),
                afterFormation: getFormationDescription(newGameState.formation, teamMode),
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
      // Mode doesn't support inactive players, no action taken
      console.warn('Attempted to activate player in mode that does not support inactive players:', teamMode);
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
    
    // Check if substitution is possible (at least one active substitute)
    if (!hasActiveSubstitutes(gameState.allPlayers, gameState.teamMode)) {
      console.warn('Cannot substitute: all substitutes are inactive');
      return;
    }
    
    // Capture before-state for undo functionality
    const substitutionTimestamp = Date.now();
    const beforeFormation = { ...gameState.formation };
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
        setFormation(newGameState.formation);
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
          newGameState.formation,
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
        const sourcePlayerId = gameState.formation[fieldPlayerModal.target];
        const goalieId = gameState.formation.goalie;
        
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
            
            // Exclude substitutes based on team mode using MODE_DEFINITIONS
            const definition = MODE_DEFINITIONS[gameState.teamMode];
            if (!definition) return true;
            
            // Use configuration-driven substitute exclusion
            return !definition.substitutePositions.includes(currentPairKey);
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
        console.log(`🔄 Swapping positions within ${fieldPlayerModal.target} pair`);
        
        const currentTime = Date.now();
        
        animateStateChange(
          gameStateFactory(),
          (state) => calculatePairPositionSwap(state, fieldPlayerModal.target),
          (newGameState) => {
            // Apply state updates
            setFormation(newGameState.formation);
            setAllPlayers(newGameState.allPlayers);
            
            // Log position change event
            const pairKey = fieldPlayerModal.target;
            const pair = newGameState.formation[pairKey];
            if (pair) {
              const defenderPlayer = findPlayerById(newGameState.allPlayers, pair.defender);
              const attackerPlayer = findPlayerById(newGameState.allPlayers, pair.attacker);
              
              logEvent(EVENT_TYPES.POSITION_CHANGE, {
                timestamp: currentTime,
                player1Id: pair.defender,
                player1Name: defenderPlayer?.name || 'Unknown',
                player2Id: pair.attacker,
                player2Name: attackerPlayer?.name || 'Unknown',
                pairKey: pairKey,
                description: `${defenderPlayer?.name || 'Unknown'} and ${attackerPlayer?.name || 'Unknown'} swapped positions within ${pairKey}`,
                teamMode: teamMode
              });
            }
          },
          setAnimationState,
          setHideNextOffIndicator,
          setRecentlySubstitutedPlayers
        );
        
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
          setFormation(newGameState.formation);
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
                beforeFormation: getFormationDescription(gameState.formation, teamMode),
                afterFormation: getFormationDescription(newGameState.formation, teamMode),
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
        setFormation(newGameState.formation);
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
            beforeFormation: getFormationDescription(newGameState.formation, lastSubstitution.teamMode),
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