/**
 * Pure game state logic functions
 * These functions take current state as input and return new state as output
 * They have no side effects and can be used for previews, undo calculations, etc.
 */

import { createSubstitutionManager } from './substitutionManager';
import { findPlayerById } from '../../utils/playerUtils';
import { PLAYER_ROLES, FORMATION_TYPES, PLAYER_STATUS } from '../../constants/playerConstants';
import { POSITION_KEYS } from '../../constants/positionConstants';
import { handleRoleChange } from './substitutionManager';
import { updatePlayerTimeStats } from '../time/stintManager';
import { createRotationQueue } from '../queue/rotationQueue';
import { createPlayerLookup } from '../../utils/playerUtils';
import { getPositionRole } from './positionUtils';

/**
 * Calculate the result of a substitution without modifying any state
 */
export const calculateSubstitution = (gameState) => {
  const {
    periodFormation,
    nextPhysicalPairToSubOut,
    nextPlayerIdToSubOut,
    allPlayers,
    rotationQueue,
    formationType,
    isSubTimerPaused = false
  } = gameState;

  const currentTimeEpoch = Date.now();
  const substitutionManager = createSubstitutionManager(formationType);
  
  const context = {
    periodFormation,
    nextPhysicalPairToSubOut,
    nextPlayerIdToSubOut,
    allPlayers,
    rotationQueue,
    currentTimeEpoch,
    isSubTimerPaused
  };

  try {
    const result = substitutionManager.executeSubstitution(context);
    
    const newGameState = {
      ...gameState,
      periodFormation: result.newFormation,
      allPlayers: result.updatedPlayers,
      nextPhysicalPairToSubOut: result.newNextPhysicalPairToSubOut || gameState.nextPhysicalPairToSubOut,
      rotationQueue: result.newRotationQueue || gameState.rotationQueue,
      nextPlayerIdToSubOut: result.newNextPlayerIdToSubOut !== undefined ? result.newNextPlayerIdToSubOut : gameState.nextPlayerIdToSubOut,
      nextNextPlayerIdToSubOut: result.newNextNextPlayerIdToSubOut !== undefined ? result.newNextNextPlayerIdToSubOut : gameState.nextNextPlayerIdToSubOut,
      nextPlayerToSubOut: result.newNextPlayerToSubOut || gameState.nextPlayerToSubOut,
      playersToHighlight: result.playersComingOnIds || [],
      lastSubstitutionTimestamp: currentTimeEpoch
    };

    return newGameState;
  } catch (error) {
    console.error('Substitution calculation failed:', error);
    return gameState; // Return unchanged state on error
  }
};

/**
 * Calculate the result of switching positions between two players
 */
export const calculatePositionSwitch = (gameState, player1Id, player2Id) => {
  const { allPlayers, periodFormation, formationType, isSubTimerPaused = false } = gameState;

  if (!player1Id || !player2Id || player1Id === player2Id) {
    console.warn('Invalid player IDs for position switch');
    return gameState;
  }

  const player1 = findPlayerById(allPlayers, player1Id);
  const player2 = findPlayerById(allPlayers, player2Id);
  
  if (!player1 || !player2) {
    console.warn('Players not found for position switch');
    return gameState;
  }

  // Don't allow switching with goalie
  if (player1.id === periodFormation.goalie || player2.id === periodFormation.goalie) {
    console.warn('Cannot switch positions with goalie');
    return gameState;
  }

  const player1Position = player1.stats.currentPairKey;
  const player2Position = player2.stats.currentPairKey;

  // Validate positions
  const validPositions = {
    [FORMATION_TYPES.PAIRS_7]: [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR, POSITION_KEYS.SUB_PAIR],
    [FORMATION_TYPES.INDIVIDUAL_6]: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER, POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER, POSITION_KEYS.SUBSTITUTE],
    [FORMATION_TYPES.INDIVIDUAL_7]: [POSITION_KEYS.LEFT_DEFENDER_7, POSITION_KEYS.RIGHT_DEFENDER_7, POSITION_KEYS.LEFT_ATTACKER_7, POSITION_KEYS.RIGHT_ATTACKER_7, POSITION_KEYS.SUBSTITUTE_7_1, POSITION_KEYS.SUBSTITUTE_7_2]
  };

  const currentValidPositions = validPositions[formationType] || [];
  if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
    console.warn('One or both players are not in valid positions for switching');
    return gameState;
  }

  // Create new formation with swapped positions
  const newFormation = { ...periodFormation };
  
  if (formationType === FORMATION_TYPES.PAIRS_7) {
    // Handle pairs formation
    if (player1Position === POSITION_KEYS.LEFT_PAIR) {
      if (periodFormation.leftPair.defender === player1Id) {
        newFormation.leftPair = { ...periodFormation.leftPair, defender: player2Id };
      } else if (periodFormation.leftPair.attacker === player1Id) {
        newFormation.leftPair = { ...periodFormation.leftPair, attacker: player2Id };
      }
    } else if (player1Position === POSITION_KEYS.RIGHT_PAIR) {
      if (periodFormation.rightPair.defender === player1Id) {
        newFormation.rightPair = { ...periodFormation.rightPair, defender: player2Id };
      } else if (periodFormation.rightPair.attacker === player1Id) {
        newFormation.rightPair = { ...periodFormation.rightPair, attacker: player2Id };
      }
    } else if (player1Position === POSITION_KEYS.SUB_PAIR) {
      if (periodFormation.subPair.defender === player1Id) {
        newFormation.subPair = { ...periodFormation.subPair, defender: player2Id };
      } else if (periodFormation.subPair.attacker === player1Id) {
        newFormation.subPair = { ...periodFormation.subPair, attacker: player2Id };
      }
    }

    if (player2Position === POSITION_KEYS.LEFT_PAIR) {
      if (periodFormation.leftPair.defender === player2Id) {
        newFormation.leftPair = { ...newFormation.leftPair, defender: player1Id };
      } else if (periodFormation.leftPair.attacker === player2Id) {
        newFormation.leftPair = { ...newFormation.leftPair, attacker: player1Id };
      }
    } else if (player2Position === POSITION_KEYS.RIGHT_PAIR) {
      if (periodFormation.rightPair.defender === player2Id) {
        newFormation.rightPair = { ...newFormation.rightPair, defender: player1Id };
      } else if (periodFormation.rightPair.attacker === player2Id) {
        newFormation.rightPair = { ...newFormation.rightPair, attacker: player1Id };
      }
    } else if (player2Position === POSITION_KEYS.SUB_PAIR) {
      if (periodFormation.subPair.defender === player2Id) {
        newFormation.subPair = { ...newFormation.subPair, defender: player1Id };
      } else if (periodFormation.subPair.attacker === player2Id) {
        newFormation.subPair = { ...newFormation.subPair, attacker: player1Id };
      }
    }
  } else {
    // Handle individual formations - simply swap the position assignments
    newFormation[player1Position] = player2Id;
    newFormation[player2Position] = player1Id;
  }

  // Update player stats with new positions and roles
  const currentTimeEpoch = Date.now();
  const newAllPlayers = allPlayers.map(p => {
    if (p.id === player1Id) {
      // Determine the new role for player1 based on their new position
      let newRole = p.stats.currentPeriodRole; // Default to current role
      
      if (formationType === FORMATION_TYPES.PAIRS_7) {
        // For pairs, player1 takes player2's role
        newRole = player2.stats.currentPeriodRole;
      } else {
        // For individual formations, use centralized role determination
        newRole = getPositionRole(player2Position) || newRole;
      }
      
      return { 
        ...p, 
        stats: {
          ...handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused),
          currentPairKey: player2Position
        }
      };
    }
    if (p.id === player2Id) {
      // Determine the new role for player2 based on their new position
      let newRole = p.stats.currentPeriodRole; // Default to current role
      
      if (formationType === FORMATION_TYPES.PAIRS_7) {
        // For pairs, player2 takes player1's role
        newRole = player1.stats.currentPeriodRole;
      } else {
        // For individual formations, use centralized role determination
        newRole = getPositionRole(player1Position) || newRole;
      }
      
      return { 
        ...p, 
        stats: {
          ...handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused),
          currentPairKey: player1Position
        }
      };
    }
    return p;
  });

  return {
    ...gameState,
    periodFormation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: [player1Id, player2Id]
  };
};

/**
 * Calculate the result of switching goalies
 */
export const calculateGoalieSwitch = (gameState, newGoalieId) => {
  const { allPlayers, periodFormation, formationType, isSubTimerPaused = false } = gameState;

  if (!newGoalieId || newGoalieId === periodFormation.goalie) {
    console.warn('Invalid new goalie ID or same as current goalie');
    return gameState;
  }

  const currentGoalie = findPlayerById(allPlayers, periodFormation.goalie);
  const newGoalie = findPlayerById(allPlayers, newGoalieId);
  
  if (!currentGoalie || !newGoalie) {
    console.warn('Goalie not found for switch');
    return gameState;
  }

  // Don't allow switching with inactive player
  if (newGoalie.stats.isInactive) {
    console.warn('Cannot switch to inactive player as goalie');
    return gameState;
  }

  const newGoaliePosition = newGoalie.stats.currentPairKey;

  // Create new formation
  const newFormation = { ...periodFormation };
  
  // Set new goalie
  newFormation.goalie = newGoalieId;
  
  // Place current goalie in the position of the new goalie
  if (formationType === FORMATION_TYPES.PAIRS_7) {
    // Handle pairs formation
    if (newGoaliePosition === POSITION_KEYS.LEFT_PAIR) {
      if (periodFormation.leftPair.defender === newGoalieId) {
        newFormation.leftPair = { ...periodFormation.leftPair, defender: periodFormation.goalie };
      } else if (periodFormation.leftPair.attacker === newGoalieId) {
        newFormation.leftPair = { ...periodFormation.leftPair, attacker: periodFormation.goalie };
      }
    } else if (newGoaliePosition === POSITION_KEYS.RIGHT_PAIR) {
      if (periodFormation.rightPair.defender === newGoalieId) {
        newFormation.rightPair = { ...periodFormation.rightPair, defender: periodFormation.goalie };
      } else if (periodFormation.rightPair.attacker === newGoalieId) {
        newFormation.rightPair = { ...periodFormation.rightPair, attacker: periodFormation.goalie };
      }
    } else if (newGoaliePosition === POSITION_KEYS.SUB_PAIR) {
      if (periodFormation.subPair.defender === newGoalieId) {
        newFormation.subPair = { ...periodFormation.subPair, defender: periodFormation.goalie };
      } else if (periodFormation.subPair.attacker === newGoalieId) {
        newFormation.subPair = { ...periodFormation.subPair, attacker: periodFormation.goalie };
      }
    }
  } else {
    // Handle individual formations (6-player and 7-player)
    newFormation[newGoaliePosition] = periodFormation.goalie;
  }

  // Update player stats and handle role changes
  const currentTimeEpoch = Date.now();
  const newAllPlayers = allPlayers.map(p => {
    if (p.id === periodFormation.goalie) {
      // Current goalie becomes a field player
      const updatedStats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);
      
      // Determine new role and status based on position they're moving to
      let newRole = PLAYER_ROLES.DEFENDER; // Default
      let newStatus = 'on_field'; // Default
      
      if (formationType === FORMATION_TYPES.PAIRS_7) {
        if (newGoaliePosition === POSITION_KEYS.LEFT_PAIR || newGoaliePosition === POSITION_KEYS.RIGHT_PAIR) {
          const pairData = periodFormation[newGoaliePosition];
          if (pairData) {
            if (pairData.defender === newGoalieId) {
              newRole = PLAYER_ROLES.DEFENDER;
            } else if (pairData.attacker === newGoalieId) {
              newRole = PLAYER_ROLES.ATTACKER;
            }
          }
          newStatus = PLAYER_STATUS.ON_FIELD;
        } else if (newGoaliePosition === POSITION_KEYS.SUB_PAIR) {
          const pairData = periodFormation[newGoaliePosition];
          if (pairData) {
            if (pairData.defender === newGoalieId) {
              newRole = PLAYER_ROLES.DEFENDER;
            } else if (pairData.attacker === newGoalieId) {
              newRole = PLAYER_ROLES.ATTACKER;
            }
          }
          newStatus = PLAYER_STATUS.SUBSTITUTE;
        }
      } else {
        // Individual formations - use centralized role determination
        newRole = getPositionRole(newGoaliePosition) || PLAYER_ROLES.DEFENDER; // Default to defender
        newStatus = newGoaliePosition.includes('substitute') ? PLAYER_STATUS.SUBSTITUTE : PLAYER_STATUS.ON_FIELD;
      }
      
      // Handle role change from goalie to new position
      const newStats = handleRoleChange(
        { ...p, stats: updatedStats },
        newRole,
        currentTimeEpoch,
        isSubTimerPaused
      );
      
      // Update status and position
      newStats.currentPeriodStatus = newStatus;
      newStats.currentPairKey = newGoaliePosition;
      
      return { ...p, stats: newStats };
    } else if (p.id === newGoalieId) {
      // New goalie - calculate accumulated time for their field stint
      const updatedStats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);
      
      // Handle role change from field player to goalie
      const newStats = handleRoleChange(
        { ...p, stats: updatedStats },
        PLAYER_ROLES.GOALIE,
        currentTimeEpoch,
        isSubTimerPaused
      );
      
      // Update status and position
      newStats.currentPeriodStatus = PLAYER_STATUS.GOALIE;
      newStats.currentPairKey = POSITION_KEYS.GOALIE;
      
      return { ...p, stats: newStats };
    }
    return p;
  });

  // Update rotation queue - remove new goalie from queue and add old goalie
  const queueManager = createRotationQueue(gameState.rotationQueue, createPlayerLookup(allPlayers));
  queueManager.initialize();
  
  // Remove new goalie from queue (they're now goalie, not in rotation)
  queueManager.removePlayer(newGoalieId);
  
  // Add old goalie to queue at the end (they're now in rotation)
  queueManager.addPlayer(periodFormation.goalie, 'end');

  return {
    ...gameState,
    periodFormation: newFormation,
    allPlayers: newAllPlayers,
    rotationQueue: queueManager.toArray(),
    playersToHighlight: [periodFormation.goalie, newGoalieId]
  };
};

/**
 * Calculate the result of undoing a substitution
 */
export const calculateUndo = (gameState, lastSubstitution) => {
  if (!lastSubstitution) {
    console.warn('No substitution to undo');
    return gameState;
  }

  const currentTime = Date.now();
  const timeSinceSubstitution = Math.round((currentTime - lastSubstitution.timestamp) / 1000); // seconds

  // Restore formation and next player tracking
  const newFormation = lastSubstitution.beforeFormation;
  const newNextPhysicalPairToSubOut = lastSubstitution.beforeNextPair;
  const newNextPlayerToSubOut = lastSubstitution.beforeNextPlayer;
  const newNextPlayerIdToSubOut = lastSubstitution.beforeNextPlayerId;
  const newNextNextPlayerIdToSubOut = lastSubstitution.beforeNextNextPlayerId;

  // Calculate and restore player stats with time adjustments
  const newAllPlayers = gameState.allPlayers.map(player => {
    const wasComingOn = lastSubstitution.playersComingOnIds.includes(player.id);
    const wasGoingOff = lastSubstitution.playersGoingOffIds.includes(player.id);
    
    if (wasComingOn) {
      // Player came on during substitution - restore their original stats (before they came on)
      const originalStats = lastSubstitution.playersComingOnOriginalStats.find(p => p.id === player.id);
      if (originalStats) {
        return { ...player, stats: originalStats.stats };
      }
      return player;
    } else if (wasGoingOff) {
      // Player went off during substitution - they should get credit for the time they spent on bench
      const currentStats = { ...player.stats };
      
      // Add the bench time to their total field time
      currentStats.timeOnFieldSeconds += timeSinceSubstitution;
      
      // Add bench time to their role-specific counter based on what role they had when substituted
      if (currentStats.currentPeriodRole === 'Attacker') {
        currentStats.timeAsAttackerSeconds += timeSinceSubstitution;
      } else if (currentStats.currentPeriodRole === 'Defender') {
        currentStats.timeAsDefenderSeconds += timeSinceSubstitution;
      }

      // Update their status back to 'on_field' and reset stint timer
      currentStats.currentPeriodStatus = 'on_field';
      currentStats.lastStintStartTimeEpoch = currentTime;
      
      // Restore their field position from the before-substitution formation
      const beforeFormation = lastSubstitution.beforeFormation;
      
      // Find what position this player had before substitution
      let restoredPosition = null;
      if (lastSubstitution.formationType === 'PAIRS_7') {
        if (beforeFormation.leftPair?.defender === player.id) restoredPosition = 'leftPair';
        else if (beforeFormation.leftPair?.attacker === player.id) restoredPosition = 'leftPair';
        else if (beforeFormation.rightPair?.defender === player.id) restoredPosition = 'rightPair';
        else if (beforeFormation.rightPair?.attacker === player.id) restoredPosition = 'rightPair';
      } else if (lastSubstitution.formationType === 'INDIVIDUAL_6') {
        if (beforeFormation.leftDefender === player.id) restoredPosition = 'leftDefender';
        else if (beforeFormation.rightDefender === player.id) restoredPosition = 'rightDefender';
        else if (beforeFormation.leftAttacker === player.id) restoredPosition = 'leftAttacker';
        else if (beforeFormation.rightAttacker === player.id) restoredPosition = 'rightAttacker';
      } else if (lastSubstitution.formationType === 'INDIVIDUAL_7') {
        if (beforeFormation.leftDefender7 === player.id) restoredPosition = 'leftDefender';
        else if (beforeFormation.rightDefender7 === player.id) restoredPosition = 'rightDefender7';
        else if (beforeFormation.leftAttacker7 === player.id) restoredPosition = 'leftAttacker7';
        else if (beforeFormation.rightAttacker7 === player.id) restoredPosition = 'rightAttacker7';
      }
      
      if (restoredPosition) {
        currentStats.currentPairKey = restoredPosition;
      }

      return { ...player, stats: currentStats };
    } else {
      // Player wasn't involved in substitution - no changes needed
      return player;
    }
  });

  return {
    ...gameState,
    periodFormation: newFormation,
    nextPhysicalPairToSubOut: newNextPhysicalPairToSubOut,
    nextPlayerToSubOut: newNextPlayerToSubOut,
    nextPlayerIdToSubOut: newNextPlayerIdToSubOut,
    nextNextPlayerIdToSubOut: newNextNextPlayerIdToSubOut,
    allPlayers: newAllPlayers,
    playersToHighlight: lastSubstitution.playersGoingOffIds, // Highlight players going back on field
    lastSubstitutionTimestamp: null // Clear the undo data
  };
};

/**
 * Calculate the result of toggling a player's inactive status
 */
export const calculatePlayerToggleInactive = (gameState, playerId) => {
  const { allPlayers, periodFormation, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, formationType } = gameState;

  if (formationType !== FORMATION_TYPES.INDIVIDUAL_7) {
    console.warn('Player inactivation only supported in 7-player individual mode');
    return gameState;
  }

  const player = findPlayerById(allPlayers, playerId);
  if (!player) {
    console.warn('Player not found for inactivation toggle');
    return gameState;
  }

  const currentlyInactive = player.stats.isInactive;
  const isSubstitute = player.stats.currentPairKey === POSITION_KEYS.SUBSTITUTE_7_1 || player.stats.currentPairKey === POSITION_KEYS.SUBSTITUTE_7_2;
  
  // Only allow inactivating/activating substitute players
  if (!isSubstitute) {
    console.warn('Only substitute players can be inactivated');
    return gameState;
  }

  // Safety check: Prevent having both substitutes inactive
  if (!currentlyInactive) { // Player is about to be inactivated
    const substitute7_1Id = periodFormation.substitute7_1;
    const substitute7_2Id = periodFormation.substitute7_2;
    const otherSubstituteId = playerId === substitute7_1Id ? substitute7_2Id : substitute7_1Id;
    const otherSubstitute = findPlayerById(allPlayers, otherSubstituteId);
    
    if (otherSubstitute?.stats.isInactive) {
      console.warn('Cannot inactivate player: would result in both substitutes being inactive');
      return gameState;
    }
  }

  let newFormation = { ...periodFormation };
  let newRotationQueue = [...rotationQueue];
  let newNextPlayerIdToSubOut = nextPlayerIdToSubOut;
  let newNextNextPlayerIdToSubOut = nextNextPlayerIdToSubOut;

  // Update player stats and manage positions
  let newAllPlayers = allPlayers.map(p => {
    if (p.id === playerId) {
      return { ...p, stats: { ...p.stats, isInactive: !currentlyInactive } };
    }
    return p;
  });

  // Update rotation queue and positions
  if (currentlyInactive) {
    // Player is being activated - they become the next player to go in (substitute7_1)
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize();
    queueManager.reactivatePlayer(playerId);
    
    // Get current substitute positions
    const currentSub7_1Id = periodFormation.substitute7_1;
    const currentSub7_2Id = periodFormation.substitute7_2;
    
    if (playerId === currentSub7_1Id) {
      // Reactivated player is already in substitute7_1 position - just activate them
      // nextPlayerIdToSubOut should remain pointing to the current active field player
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length >= 1) {
        newNextNextPlayerIdToSubOut = nextActivePlayers[0];
      }
    } else if (playerId === currentSub7_2Id) {
      // Reactivated player is in substitute7_2 - swap with substitute7_1
      newFormation = {
        ...newFormation,
        substitute7_1: playerId,
        substitute7_2: currentSub7_1Id
      };
      
      // Update positions in player data
      newAllPlayers = newAllPlayers.map(p => {
        if (p.id === playerId) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_7_1 } };
        }
        if (p.id === currentSub7_1Id) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_7_2 } };
        }
        return p;
      });
      
      newNextNextPlayerIdToSubOut = currentSub7_1Id;
    }
    
    newRotationQueue = queueManager.toArray();
  } else {
    // Player is being inactivated
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize();
    queueManager.deactivatePlayer(playerId);
    newRotationQueue = queueManager.toArray();
    
    // Update next player tracking if the inactivated player was next
    if (playerId === nextPlayerIdToSubOut && queueManager.activeSize() > 0) {
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length > 0) {
        newNextPlayerIdToSubOut = nextActivePlayers[0];
        if (nextActivePlayers.length >= 2) {
          newNextNextPlayerIdToSubOut = nextActivePlayers[1];
        }
      }
    } else if (playerId === nextNextPlayerIdToSubOut) {
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length >= 2) {
        newNextNextPlayerIdToSubOut = nextActivePlayers[1];
      }
    }
    
    // Move inactive player to substitute7_2 position if they were substitute7_1
    if (player.stats.currentPairKey === POSITION_KEYS.SUBSTITUTE_7_1 && periodFormation.substitute7_2) {
      const otherSubId = periodFormation.substitute7_2;
      
      newFormation = {
        ...newFormation,
        substitute7_1: otherSubId,
        substitute7_2: playerId
      };
      
      // Update positions in player data
      newAllPlayers = newAllPlayers.map(p => {
        if (p.id === playerId) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_7_2 } };
        }
        if (p.id === otherSubId) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_7_1 } };
        }
        return p;
      });
    }
  }

  return {
    ...gameState,
    periodFormation: newFormation,
    allPlayers: newAllPlayers,
    rotationQueue: newRotationQueue,
    nextPlayerIdToSubOut: newNextPlayerIdToSubOut,
    nextNextPlayerIdToSubOut: newNextNextPlayerIdToSubOut,
    playersToHighlight: [] // No special highlighting for activation/deactivation
  };
};

/**
 * Calculate the result of swapping substitute positions (7-player mode)
 */
export const calculateSubstituteSwap = (gameState, substitute7_1Id, substitute7_2Id) => {
  const { allPlayers, periodFormation, formationType } = gameState;
  
  if (formationType !== FORMATION_TYPES.INDIVIDUAL_7) {
    console.warn('Substitute swap only supported in 7-player individual mode');
    return gameState;
  }
  
  if (!substitute7_1Id || !substitute7_2Id) {
    console.warn('Invalid substitute IDs for swap');
    return gameState;
  }
  
  // Create new formation with swapped substitute positions
  const newFormation = {
    ...periodFormation,
    substitute7_1: substitute7_2Id,
    substitute7_2: substitute7_1Id
  };
  
  // Update player positions in their stats
  const newAllPlayers = allPlayers.map(p => {
    if (p.id === substitute7_1Id) {
      return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_7_2 } };
    }
    if (p.id === substitute7_2Id) {
      return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_7_1 } };
    }
    return p;
  });
  
  return {
    ...gameState,
    periodFormation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: [substitute7_1Id, substitute7_2Id]
  };
};

/**
 * Calculate the result of setting next substitution target
 */
export const calculateNextSubstitutionTarget = (gameState, target, targetType) => {
  // This is a simple state update with no complex logic
  if (targetType === 'pair') {
    return {
      ...gameState,
      nextPhysicalPairToSubOut: target
    };
  } else if (targetType === 'player') {
    const newNextPlayerIdToSubOut = gameState.periodFormation[target];
    return {
      ...gameState,
      nextPlayerToSubOut: target,
      nextPlayerIdToSubOut: newNextPlayerIdToSubOut
    };
  }
  
  return gameState;
};