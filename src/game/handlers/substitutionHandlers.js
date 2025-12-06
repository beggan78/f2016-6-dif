import { animateStateChange } from '../animation/animationSupport';
import {
  calculateSubstitution,
  calculatePositionSwitch,
  calculatePlayerToggleInactive,
  calculateUndo,
  calculateSubstituteReorder,
  calculateRemovePlayerFromNextToGoOff,
  calculateSetPlayerAsNextToGoOff
} from '../logic/gameStateLogic';
import { findPlayerById, getOutfieldPlayers, hasActiveSubstitutes } from '../../utils/playerUtils';
import { getCurrentTimestamp } from '../../utils/timeUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { getModeDefinition, supportsInactiveUsers, getBottomSubstitutePosition } from '../../constants/gameModes';
import { logEvent, removeEvent, EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';
import { getSubstituteTargetPositions, getPositionDisplayName } from '../ui/positionUtils';
import { getPositionRole, getFieldPositions } from '../logic/positionUtils';
import { PLAYER_ROLES } from '../../constants/playerConstants';

export const createSubstitutionHandlers = (
  gameStateFactory,
  stateUpdaters,
  animationHooks,
  modalHandlers,
  teamConfig,
  getSubstitutionCount = () => 1
) => {
  // Helper to get mode definition - handles team config objects
  const getDefinition = (teamConfig, selectedFormation = null) => {
    // Handle null/undefined
    if (!teamConfig || typeof teamConfig !== 'object') {
      return null;
    }

    return getModeDefinition(teamConfig);
  };

  const getFormattedPlayerName = (player) => {
    if (!player) {
      return 'Unknown Player';
    }
    return formatPlayerName(player);
  };
  const {
    setFormation,
    setAllPlayers,
    setNextPlayerToSubOut,
    setNextPlayerIdToSubOut,
    setNextNextPlayerIdToSubOut,
    setRotationQueue,
    setShouldSubstituteNow,
    setSubstitutionOverride = () => {},
    clearSubstitutionOverride = () => {},
    setLastSubstitution,
    setLastSubstitutionTimestamp,
    resetSubTimer,
    handleUndoSubstitutionTimer,
    setSubstitutionCountOverride,
    clearSubstitutionCountOverride,
    setShouldResetSubTimerOnNextSub
  } = stateUpdaters;

  const {
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  } = animationHooks;

  const {
    closeFieldPlayerModal,
    closeSubstituteModal,
    removeFromNavigationStack,
    openFieldPlayerModal
  } = modalHandlers;

  const supportsInactive = supportsInactiveUsers(teamConfig);

  const applyImmediateSubstitutionOverride = () => {
    if (typeof setSubstitutionCountOverride === 'function') {
      setSubstitutionCountOverride(1);
    }
    if (typeof setShouldResetSubTimerOnNextSub === 'function') {
      setShouldResetSubTimerOnNextSub(false);
    }
  };

  const clearImmediateSubstitutionOverride = () => {
    if (typeof clearSubstitutionCountOverride === 'function') {
      clearSubstitutionCountOverride();
    }
    if (typeof setShouldResetSubTimerOnNextSub === 'function') {
      setShouldResetSubTimerOnNextSub(true);
    }
  };

  /**
   * Generate unique event ID for substitution tracking
   */
  const generateEventId = () => {
    const timestamp = getCurrentTimestamp();
    const random = Math.random().toString(36).substr(2, 9);
    return `sub_${timestamp}_${random}`;
  };

  /**
   * Get formation description for event logging
   */
  const getFormationDescription = (formation, teamConfig) => {
    // Generic formation normalizer for individual modes using MODE_DEFINITIONS
    const definition = getDefinition(teamConfig);
    if (!definition) return formation;

    const normalized = { goalie: formation.goalie };
      
      // Add field positions
      definition.fieldPositions.forEach(position => {
        normalized[position] = formation[position];
      });
      
      // Add substitute positions
      definition.substitutePositions.forEach(position => {
        // For 6-player mode, use 'substitute' as the key for substitute_1
        if (teamConfig?.squadSize === 6 && position === 'substitute_1') {
          normalized.substitute = formation[position];
        } else {
          normalized[position] = formation[position];
        }
      });

    return normalized;
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
    teamConfig,
    allPlayers,
    currentTime,
    periodNumber = 1,
    currentMatchId = null
  ) => {
    try {
      const eventId = generateEventId();

      const eventData = {
        eventId,
        playersOff: playersGoingOff,
        playersOn: playersComingOn,
        playersOffNames: getPlayerNames(playersGoingOff, allPlayers),
        playersOnNames: getPlayerNames(playersComingOn, allPlayers),
        teamConfig,
        beforeFormation: getFormationDescription(beforeFormation, teamConfig),
        afterFormation: getFormationDescription(afterFormation, teamConfig),
        periodNumber,
        matchTime: calculateMatchTime(currentTime),
        timestamp: currentTime,
        matchId: currentMatchId
      };

      // Always log as regular substitution event
      const substitutionEvent = logEvent(EVENT_TYPES.SUBSTITUTION, eventData);
      return substitutionEvent;
    } catch (error) {
      // Don't throw - substitution should continue even if logging fails
      return null;
    }
  };

  const handleSetNextSubstitution = (fieldPlayerModal) => {
    if (fieldPlayerModal.type === 'player') {
      // In multi-sub mode, use rotation queue logic
      const substitutionCount = getSubstitutionCount();
      if (substitutionCount > 1) {
        const gameState = gameStateFactory();
        const playerId = fieldPlayerModal.sourcePlayerId;

        if (playerId) {
          animateStateChange(
            gameState,
            (state) => calculateSetPlayerAsNextToGoOff(state, playerId, substitutionCount),
            (newGameState) => {
              setRotationQueue(newGameState.rotationQueue);
              setAllPlayers(newGameState.allPlayers);
            },
            setAnimationState,
            setHideNextOffIndicator,
            setRecentlySubstitutedPlayers
          );
        }
      } else {
        // Single-sub mode: use existing logic
        setNextPlayerToSubOut(fieldPlayerModal.target, false); // Manual user selection
      }
    }
    closeFieldPlayerModal();
  };

  const handleRemoveFromNextSubstitution = (fieldPlayerModal) => {
    if (fieldPlayerModal.type === 'player') {
      const substitutionCount = getSubstitutionCount();
      if (substitutionCount > 1) {
        const gameState = gameStateFactory();
        const playerId = fieldPlayerModal.sourcePlayerId;

        if (playerId) {
          animateStateChange(
            gameState,
            (state) => calculateRemovePlayerFromNextToGoOff(state, playerId, substitutionCount),
            (newGameState) => {
              setRotationQueue(newGameState.rotationQueue);
              setAllPlayers(newGameState.allPlayers);
            },
            setAnimationState,
            setHideNextOffIndicator,
            setRecentlySubstitutedPlayers
          );
        }
      }
    }
    closeFieldPlayerModal();
  };

  const handleSubstituteNow = (fieldPlayerModal) => {
    const gameState = gameStateFactory();
    clearSubstitutionOverride();

    // For individual mode, show substitute selection modal
    if (fieldPlayerModal.type === 'player') {
      const definition = getDefinition(teamConfig);
      if (!definition) {
        closeFieldPlayerModal();
        return;
      }

      // Get the field player info
      const fieldPlayerId = gameState.formation[fieldPlayerModal.target];
      const fieldPlayer = findPlayerById(gameState.allPlayers, fieldPlayerId);

      if (!fieldPlayer) {
        closeFieldPlayerModal();
        return;
      }

      // Get all active substitutes
      const substitutes = gameState.allPlayers.filter(p =>
        definition.substitutePositions.includes(p.stats?.currentPositionKey) &&
        !p.stats?.isInactive
      );

      // Special case: If there's only one active substitute, perform immediate substitution
      if (substitutes.length === 1) {
        const onlySubstituteId = substitutes[0].id;
        const substitutePosition = Object.keys(gameState.formation).find(
          pos => gameState.formation[pos] === onlySubstituteId
        );

        const firstSubstitutePosition = definition.substitutePositions[0];

        // If the only substitute is not already first, swap to first position
        if (substitutePosition !== firstSubstitutePosition) {
          const currentTime = getCurrentTimestamp();

          animateStateChange(
            gameState,
            (state) => {
              const newFormation = { ...state.formation };
              const firstSubstituteId = newFormation[firstSubstitutePosition];

              // Swap positions
              newFormation[firstSubstitutePosition] = onlySubstituteId;
              newFormation[substitutePosition] = firstSubstituteId;

              return {
                ...state,
                formation: newFormation,
                playersToHighlight: [onlySubstituteId, firstSubstituteId]
              };
            },
            (newGameState) => {
              setFormation(newGameState.formation);

              // Log the position swap
              try {
                const selectedPlayer = gameState.allPlayers.find(p => p.id === onlySubstituteId);
                const firstPlayer = gameState.allPlayers.find(p => p.id === gameState.formation[firstSubstitutePosition]);

                if (selectedPlayer && firstPlayer) {
                  logEvent(EVENT_TYPES.POSITION_CHANGE, {
                    type: 'immediate_substitute_reorder',
                    playerId: onlySubstituteId,
                    playerName: getFormattedPlayerName(selectedPlayer),
                    swapPlayerId: firstPlayer.id,
                    swapPlayerName: getFormattedPlayerName(firstPlayer),
                    fromPosition: substitutePosition,
                    toPosition: firstSubstitutePosition,
                    description: `${getFormattedPlayerName(selectedPlayer)} moved to next-in for immediate substitution`,
                    beforeFormation: getFormationDescription(gameState.formation, teamConfig),
                    afterFormation: getFormationDescription(newGameState.formation, teamConfig),
                    teamConfig,
                    matchTime: calculateMatchTime(currentTime),
                    timestamp: currentTime,
                    periodNumber: gameState.currentPeriodNumber || 1
                  });
              }
            } catch (error) {
              // Logging error should not prevent the swap
            }

            // Now set the field player as next to sub out and trigger immediate substitution
            setNextPlayerToSubOut(fieldPlayerModal.target, false);
            setSubstitutionOverride({ substitutionCount: 1, reason: 'immediate_field_player' });
            applyImmediateSubstitutionOverride();
            setShouldSubstituteNow(true);
          },
          setAnimationState,
          setHideNextOffIndicator,
          setRecentlySubstitutedPlayers
        );
      } else {
        // Only substitute is already first, just trigger the substitution
        setNextPlayerToSubOut(fieldPlayerModal.target, false);
        setSubstitutionOverride({ substitutionCount: 1, reason: 'immediate_field_player' });
        applyImmediateSubstitutionOverride();
        setShouldSubstituteNow(true);
      }

        closeFieldPlayerModal();
        return;
      }

      // Find the designated substitute for this field position
      // When a field player is next to sub off, there's a substitute designated to take their position.
      // That substitute should appear first in the selection list for "Substitute Now".
      const fieldPositions = getFieldPositions(teamConfig);
      const rotationQueue = gameState.rotationQueue || [];
      const currentSubstitutionCount = getSubstitutionCount();

      // Use getSubstituteTargetPositions to find which substitute is mapped to this field position
      // We use the current substitutionCount to get all relevant mappings
      const substituteTargetMapping = getSubstituteTargetPositions(
        rotationQueue,
        gameState.formation,
        fieldPositions,
        definition.substitutePositions,
        currentSubstitutionCount
      );

      // Find which substitute position maps to the selected field player's position
      const designatedSubstitutePosition = Object.keys(substituteTargetMapping).find(
        subPos => substituteTargetMapping[subPos] === fieldPlayerModal.target
      );

      const designatedSubstituteId = designatedSubstitutePosition
        ? gameState.formation[designatedSubstitutePosition]
        : null;

      // Sort substitutes with 3 tiers:
      // 1. Designated substitute (substitute set to replace this field player) - FIRST
      // 2. Other substitutes in rotation queue order - maintain queue sequence
      // 3. Substitutes not in queue - at the end
      const sortedSubstitutes = [...substitutes].sort((a, b) => {
        // Designated substitute always first
        if (a.id === designatedSubstituteId) return -1;
        if (b.id === designatedSubstituteId) return 1;

        // Then sort by rotation queue order
        const aIndex = rotationQueue.indexOf(a.id);
        const bIndex = rotationQueue.indexOf(b.id);

        // If both are in queue, sort by queue order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }

        // If only one is in queue, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // If neither in queue, maintain current order
        return 0;
      });

      // Close field player modal and open substitute selection modal
      closeFieldPlayerModal();

      // Use modalHandlers to open the substitute selection modal
      if (modalHandlers.openSubstituteSelectionModal) {
        modalHandlers.openSubstituteSelectionModal({
          fieldPlayerName: fieldPlayerModal.playerName,
          fieldPlayerId: fieldPlayerId,
          fieldPlayerPosition: fieldPlayerModal.target,
          availableSubstitutes: sortedSubstitutes
        });
      }
    }
  };

  const handleCancelFieldPlayerModal = () => {
    clearSubstitutionOverride();
    closeFieldPlayerModal();
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handleSetAsNextToGoIn = (substituteModal, formation) => {
    if (substituteModal.playerId) {
      const playerId = substituteModal.playerId;
      const gameState = gameStateFactory();
      
      // Get team mode configuration
      const definition = getDefinition(teamConfig);
      if (!definition || !definition.supportsNextNextIndicators) {
        closeSubstituteModal();
        return;
      }
      
      // Find current player position
      const currentPosition = Object.keys(formation).find(pos => formation[pos] === playerId);
      
      // Check if player can be set to go in next
      const canSetAsNext = definition.substitutePositions.includes(currentPosition) && 
                          currentPosition !== 'substitute_1' &&
                          !gameState.allPlayers.find(p => p.id === playerId)?.stats?.isInactive;
      
      if (canSetAsNext) {
        const currentTime = getCurrentTimestamp();
        const substitutionCount = getSubstitutionCount();

        // Use the new substitute reorder function
        animateStateChange(
          gameState,
          (state) => calculateSubstituteReorder(state, currentPosition, substitutionCount),
          (newGameState) => {
            // Apply the state changes
            setFormation(newGameState.formation);
            setAllPlayers(newGameState.allPlayers);
          },
          setAnimationState,
          setHideNextOffIndicator,
          setRecentlySubstitutedPlayers
        );
      }
    }
    closeSubstituteModal();
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handleInactivatePlayer = (substituteModal, allPlayers, formation) => {
    if (substituteModal.playerId && supportsInactive) {
      const currentTime = getCurrentTimestamp();
      const gameState = gameStateFactory();
      const playerBeingInactivated = findPlayerById(allPlayers, substituteModal.playerId);
      const bottomSubPosition = getBottomSubstitutePosition(teamConfig);
      const isBottomSubBeingInactivated = playerBeingInactivated?.stats.currentPositionKey === bottomSubPosition;
      
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
            logEvent(EVENT_TYPES.PLAYER_INACTIVATED, {
              playerId: substituteModal.playerId,
              periodNumber: gameState.currentPeriodNumber || 1
            });
          }
        } catch (error) {
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
                logEvent(EVENT_TYPES.PLAYER_INACTIVATED, {
                  playerId: substituteModal.playerId,
                  periodNumber: gameState.currentPeriodNumber || 1
                });
              }
            } catch (error) {
                }
          },
          setAnimationState,
          setHideNextOffIndicator,
          setRecentlySubstitutedPlayers
        );
      }
    } else if (substituteModal.playerId) {
      // Mode doesn't support inactive players, no action taken
    }
    closeSubstituteModal();
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handleActivatePlayer = (substituteModal) => {
    if (substituteModal.playerId && supportsInactive) {
      const currentTime = getCurrentTimestamp();
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
              logEvent(EVENT_TYPES.PLAYER_ACTIVATED, {
                playerId: substituteModal.playerId,
                periodNumber: gameState.currentPeriodNumber || 1
              });
            }
          } catch (error) {
          }
        },
        setAnimationState,
        setHideNextOffIndicator,
        setRecentlySubstitutedPlayers
      );
    } else if (substituteModal.playerId) {
      // Mode doesn't support inactive players, no action taken
    }
    closeSubstituteModal();
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handleCancelSubstituteModal = () => {
    closeSubstituteModal();
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handleSubstitutionWithHighlight = () => {
    const gameState = gameStateFactory();

    // Check if substitution is possible (at least one active substitute)
    if (!hasActiveSubstitutes(gameState.allPlayers, gameState.teamConfig)) {
      clearImmediateSubstitutionOverride();
      return;
    }
    

    // Capture before-state for undo functionality
    const substitutionTimestamp = getCurrentTimestamp();
    const beforeFormation = { ...gameState.formation };
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
          teamConfig,
          gameState.allPlayers,
          substitutionTimestamp,
          gameState.currentPeriodNumber || 1,
          gameState.currentMatchId
        );
        
        // Create lastSubstitution object for undo functionality
        const lastSubstitutionData = {
          timestamp: substitutionTimestamp,
          beforeFormation,
          beforeNextPlayer,
          beforeNextPlayerId,
          beforeNextNextPlayerId,
          playersComingOnOriginalStats,
          playersComingOnIds,
          playersGoingOffIds,
          teamConfig,
          subTimerSecondsAtSubstitution,
          eventId: substitutionEvent?.id || null // Store event ID for potential removal
        };
        
        
        // Store last substitution for undo
        setLastSubstitution(lastSubstitutionData);
        setLastSubstitutionTimestamp(substitutionTimestamp);
        
        // Reset substitution timer only when configured to do so
        if (gameState.shouldResetSubTimerOnNextSub !== false) {
          resetSubTimer();
        }
        clearImmediateSubstitutionOverride();
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
      // Show the position selection options for individual modes
      if (fieldPlayerModal.target && fieldPlayerModal.type === 'player') {
        const sourcePlayerId = gameState.formation[fieldPlayerModal.target];
        const goalieId = gameState.formation.goalie;
        
        if (sourcePlayerId) {
          // Extract IDs from selectedSquadPlayers for getOutfieldPlayers function
          const selectedSquadIds = gameState.selectedSquadPlayers.map(p => p.id);
          
          // Use utility function to get outfield players, then filter by status
          const definition = getDefinition(gameState.teamConfig);
          if (!definition) return true;

          const sourcePlayerRole = definition.positions[fieldPlayerModal.target]?.role;

          const availablePlayers = getOutfieldPlayers(
            gameState.allPlayers,
            selectedSquadIds,
            goalieId
          ).filter(player => {
            if (player.id === sourcePlayerId) return false;
            const fullPlayerData = gameState.allPlayers.find(p => p.id === player.id);
            if (!fullPlayerData) return false;
            const currentPositionKey = fullPlayerData.stats.currentPositionKey;
            
            // Exclude substitutes based on team mode using MODE_DEFINITIONS
            const definition = getDefinition(gameState.teamConfig);
            if (!definition) return true;
            
            // Use configuration-driven substitute exclusion
            return !definition.substitutePositions.includes(currentPositionKey);
          }).map(player => {
            const fullPlayerData = gameState.allPlayers.find(p => p.id === player.id);
            const role = definition.positions[fullPlayerData.stats.currentPositionKey]?.role;
            return { ...player, role };
          }).sort((a, b) => {
            const aHasSameRole = a.role === sourcePlayerRole;
            const bHasSameRole = b.role === sourcePlayerRole;
            if (aHasSameRole && !bHasSameRole) return 1;
            if (!aHasSameRole && bHasSameRole) return -1;
            return 0;
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
      const currentTime = getCurrentTimestamp();
      
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
                sourcePlayerName: getFormattedPlayerName(sourcePlayer),
                targetPlayerName: getFormattedPlayerName(targetPlayer),
                sourcePosition: sourcePlayer.stats.currentPositionKey,
                targetPosition: targetPlayer.stats.currentPositionKey,
                beforeFormation: getFormationDescription(gameState.formation, teamConfig),
                afterFormation: getFormationDescription(newGameState.formation, teamConfig),
                teamConfig,
                matchTime: calculateMatchTime(currentTime),
                timestamp: currentTime,
                periodNumber: gameState.currentPeriodNumber || 1
              });
            }
          } catch (error) {
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
      return;
    }

    const currentTime = getCurrentTimestamp();

    // Use the animation system for undo
    animateStateChange(
      gameStateFactory(),
      (gameState) => calculateUndo(gameState, lastSubstitution),
      (newGameState) => {
        // Apply the state changes
        setFormation(newGameState.formation);
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
            removeEvent(lastSubstitution.eventId);
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
            teamConfig: lastSubstitution.teamConfig,
            beforeFormation: getFormationDescription(newGameState.formation, lastSubstitution.teamConfig),
            afterFormation: getFormationDescription(lastSubstitution.beforeFormation, lastSubstitution.teamConfig),
            reason: 'user_initiated_undo',
            matchTime: calculateMatchTime(currentTime),
            periodNumber: newGameState.currentPeriodNumber || 1
          });
        } catch (error) {
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

  const handleSelectSubstituteForImmediate = (substituteSelectionModal, selectedSubstituteId) => {
    clearSubstitutionOverride();

    if (!substituteSelectionModal.fieldPlayerId || !selectedSubstituteId) {
      if (modalHandlers.closeSubstituteSelectionModal) {
        modalHandlers.closeSubstituteSelectionModal();
      }
      return;
    }

    const gameState = gameStateFactory();

    // Find the substitute's position in the formation
    const definition = getDefinition(teamConfig);
    if (!definition) {
      if (modalHandlers.closeSubstituteSelectionModal) {
        modalHandlers.closeSubstituteSelectionModal();
      }
      return;
    }

    const substitutePosition = Object.keys(gameState.formation).find(
      pos => gameState.formation[pos] === selectedSubstituteId
    );

    if (!substitutePosition) {
      if (modalHandlers.closeSubstituteSelectionModal) {
        modalHandlers.closeSubstituteSelectionModal();
      }
      return;
    }

    // If the selected substitute is not already about to come on, reorder substitutes
    // so the selected substitute becomes the next to come on
    const firstSubstitutePosition = definition.substitutePositions[0];
    if (substitutePosition !== firstSubstitutePosition) {
      // Swap the selected substitute with the first substitute
      const currentTime = getCurrentTimestamp();

      animateStateChange(
        gameState,
        (state) => {
          const newFormation = { ...state.formation };
          const firstSubstituteId = newFormation[firstSubstitutePosition];

          // Swap positions
          newFormation[firstSubstitutePosition] = selectedSubstituteId;
          newFormation[substitutePosition] = firstSubstituteId;

          return {
            ...state,
            formation: newFormation,
            playersToHighlight: [selectedSubstituteId, firstSubstituteId]
          };
        },
        (newGameState) => {
          setFormation(newGameState.formation);

          // Log the position swap
          try {
            const selectedPlayer = gameState.allPlayers.find(p => p.id === selectedSubstituteId);
            const firstPlayer = gameState.allPlayers.find(p => p.id === gameState.formation[firstSubstitutePosition]);

            if (selectedPlayer && firstPlayer) {
              logEvent(EVENT_TYPES.POSITION_CHANGE, {
                type: 'immediate_substitute_reorder',
                playerId: selectedSubstituteId,
                playerName: getFormattedPlayerName(selectedPlayer),
                swapPlayerId: firstPlayer.id,
                swapPlayerName: getFormattedPlayerName(firstPlayer),
                fromPosition: substitutePosition,
                toPosition: firstSubstitutePosition,
                description: `${getFormattedPlayerName(selectedPlayer)} moved to next-in for immediate substitution`,
                beforeFormation: getFormationDescription(gameState.formation, teamConfig),
                afterFormation: getFormationDescription(newGameState.formation, teamConfig),
                teamConfig,
                matchTime: calculateMatchTime(currentTime),
                timestamp: currentTime,
                periodNumber: gameState.currentPeriodNumber || 1
              });
            }
          } catch (error) {
            // Logging error should not prevent the swap
          }

          // Now set the field player as next to sub out and trigger immediate substitution
          setSubstitutionOverride({ substitutionCount: 1, reason: 'immediate_field_player' });
          setNextPlayerToSubOut(substituteSelectionModal.fieldPlayerPosition, false);
          applyImmediateSubstitutionOverride();
          setShouldSubstituteNow(true);
        },
        setAnimationState,
        setHideNextOffIndicator,
        setRecentlySubstitutedPlayers
      );
    } else {
      // Selected substitute is already next to come on, just trigger the substitution
      setSubstitutionOverride({ substitutionCount: 1, reason: 'immediate_field_player' });
      setNextPlayerToSubOut(substituteSelectionModal.fieldPlayerPosition, false);
      applyImmediateSubstitutionOverride();
      setShouldSubstituteNow(true);
    }

    // Close modal
    if (modalHandlers.closeSubstituteSelectionModal) {
      modalHandlers.closeSubstituteSelectionModal();
    }
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  const handleCancelSubstituteSelection = () => {
    clearSubstitutionOverride();
    if (modalHandlers.closeSubstituteSelectionModal) {
      modalHandlers.closeSubstituteSelectionModal();
    }
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
    clearImmediateSubstitutionOverride();
  };

  const handleChangeNextPosition = (substituteModal, targetPosition) => {
    if (!substituteModal.playerId) return;

    const gameState = gameStateFactory();
    const definition = getDefinition(teamConfig);

    // "show-options" means show the position selection UI
    if (targetPosition === 'show-options') {
      // Get available positions (all positions the substitutes are going to)
      const substitutePositions = definition?.substitutePositions || [];
      const currentPlayerPosition = Object.keys(gameState.formation).find(
        pos => gameState.formation[pos] === substituteModal.playerId
      );

      // Get the substitute target mapping to find which field positions are being taken
      const substituteTargetMapping = getSubstituteTargetPositions(
        gameState.rotationQueue,
        gameState.formation,
        definition.fieldPositions,
        substitutePositions,
        gameState.substitutionCount || 1
      );

      // Get available positions (exclude current player's position)
      const availablePositions = [];
      Object.entries(substituteTargetMapping).forEach(([subPos, fieldPos]) => {
        if (subPos !== currentPlayerPosition) {
          const label = getPositionDisplayName(
            fieldPos,
            null,
            teamConfig,
            substitutePositions
          );
          const role = getPositionRole(fieldPos);
          availablePositions.push({ value: subPos, label, role });
        }
      });

      // Sort positions: defenders first, midfielders second, attackers last
      availablePositions.sort((a, b) => {
        const roleOrder = {
          [PLAYER_ROLES.DEFENDER]: 1,
          [PLAYER_ROLES.MIDFIELDER]: 2,
          [PLAYER_ROLES.ATTACKER]: 3
        };
        const orderA = roleOrder[a.role] || 999;
        const orderB = roleOrder[b.role] || 999;
        return orderA - orderB;
      });

      // Update modal to show position selection
      modalHandlers.openSubstituteModal({
        ...modalHandlers.modals.substitute,
        showPositionSelection: true,
        availableNextPositions: availablePositions
      });
      return;
    }

    // null means go back to main menu
    if (targetPosition === null) {
      modalHandlers.openSubstituteModal({
        ...modalHandlers.modals.substitute,
        showPositionSelection: false,
        availableNextPositions: []
      });
      return;
    }

    // Otherwise, swap the positions
    const currentTime = getCurrentTimestamp();
    const currentPlayerPosition = Object.keys(gameState.formation).find(
      pos => gameState.formation[pos] === substituteModal.playerId
    );

    if (!currentPlayerPosition || !targetPosition) {
      closeSubstituteModal();
      if (removeFromNavigationStack) {
        removeFromNavigationStack();
      }
      return;
    }

    // Use animateStateChange to swap the positions
    animateStateChange(
      gameState,
      (state) => {
        const newFormation = { ...state.formation };
        const playerId1 = newFormation[currentPlayerPosition];
        const playerId2 = newFormation[targetPosition];

        // Swap the players
        newFormation[currentPlayerPosition] = playerId2;
        newFormation[targetPosition] = playerId1;

        return {
          ...state,
          formation: newFormation,
          playersToHighlight: [playerId1, playerId2]
        };
      },
      (newGameState) => {
        setFormation(newGameState.formation);

        // Log the position swap
        try {
          const player1 = gameState.allPlayers.find(p => p.id === substituteModal.playerId);
          const player2 = gameState.allPlayers.find(p => p.id === gameState.formation[targetPosition]);

          if (player1 && player2) {
            logEvent(EVENT_TYPES.POSITION_CHANGE, {
              type: 'substitute_position_swap',
              playerId: substituteModal.playerId,
              playerName: getFormattedPlayerName(player1),
              swapPlayerId: player2.id,
              swapPlayerName: getFormattedPlayerName(player2),
              fromPosition: currentPlayerPosition,
              toPosition: targetPosition,
              description: `${getFormattedPlayerName(player1)} and ${getFormattedPlayerName(player2)} swapped next-in positions`,
              beforeFormation: getFormationDescription(gameState.formation, teamConfig),
              afterFormation: getFormationDescription(newGameState.formation, teamConfig),
              teamConfig,
              matchTime: calculateMatchTime(currentTime),
              timestamp: currentTime,
              periodNumber: gameState.currentPeriodNumber || 1
            });
          }
        } catch (error) {
          // Logging error should not prevent swap
        }
      },
      setAnimationState,
      setHideNextOffIndicator,
      setRecentlySubstitutedPlayers
    );

    closeSubstituteModal();
    if (removeFromNavigationStack) {
      removeFromNavigationStack();
    }
  };

  return {
    handleSetNextSubstitution,
    handleRemoveFromNextSubstitution,
    handleSubstituteNow,
    handleCancelFieldPlayerModal,
    handleSetAsNextToGoIn,
    handleInactivatePlayer,
    handleActivatePlayer,
    handleCancelSubstituteModal,
    handleSubstitutionWithHighlight,
    handleChangePosition,
    handleChangeNextPosition,
    handleUndo,
    handleSelectSubstituteForImmediate,
    handleCancelSubstituteSelection
  };
};
