/**
 * Pure game state logic functions
 * These functions take current state as input and return new state as output
 * They have no side effects and can be used for previews, undo calculations, etc.
 */

import { createSubstitutionManager } from './substitutionManager';
import { findPlayerById } from '../../utils/playerUtils';
import { PLAYER_ROLES, TEAM_MODES, PLAYER_STATUS } from '../../constants/playerConstants';
import { POSITION_KEYS } from '../../constants/positionConstants';
import { handleRoleChange } from './substitutionManager';
import { updatePlayerTimeStats } from '../time/stintManager';
import { createRotationQueue } from '../queue/rotationQueue';
import { createPlayerLookup } from '../../utils/playerUtils';
import { getPositionRole } from './positionUtils';
import { getValidPositions, supportsInactiveUsers, supportsNextNextIndicators } from '../../constants/gameModes';

/**
 * Calculate the result of a substitution without modifying any state
 */
export const calculateSubstitution = (gameState) => {
  const {
    formation,
    nextPhysicalPairToSubOut,
    nextPlayerIdToSubOut,
    allPlayers,
    rotationQueue,
    teamMode,
    isSubTimerPaused = false
  } = gameState;

  const currentTimeEpoch = Date.now();
  const substitutionManager = createSubstitutionManager(teamMode);
  
  const context = {
    formation,
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
      formation: result.newFormation,
      allPlayers: result.updatedPlayers,
      nextPhysicalPairToSubOut: result.newNextPhysicalPairToSubOut || gameState.nextPhysicalPairToSubOut,
      rotationQueue: result.newRotationQueue || gameState.rotationQueue,
      nextPlayerIdToSubOut: result.newNextPlayerIdToSubOut !== undefined ? result.newNextPlayerIdToSubOut : gameState.nextPlayerIdToSubOut,
      nextNextPlayerIdToSubOut: result.newNextNextPlayerIdToSubOut !== undefined ? result.newNextNextPlayerIdToSubOut : gameState.nextNextPlayerIdToSubOut,
      nextPlayerToSubOut: result.newNextPlayerToSubOut || gameState.nextPlayerToSubOut,
      playersToHighlight: result.playersComingOnIds || [],
      lastSubstitutionTimestamp: currentTimeEpoch,
      substitutionResult: result
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
  const { allPlayers, formation, teamMode, isSubTimerPaused = false } = gameState;

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
  if (player1.id === formation.goalie || player2.id === formation.goalie) {
    console.warn('Cannot switch positions with goalie');
    return gameState;
  }

  const player1Position = player1.stats.currentPairKey;
  const player2Position = player2.stats.currentPairKey;

  // Validate positions
  const currentValidPositions = getValidPositions(teamMode);
  if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
    console.warn('One or both players are not in valid positions for switching');
    return gameState;
  }

  // Create new formation with swapped positions
  const newFormation = { ...formation };
  
  if (teamMode === TEAM_MODES.PAIRS_7) {
    // Handle pairs formation
    if (player1Position === POSITION_KEYS.LEFT_PAIR) {
      if (formation.leftPair.defender === player1Id) {
        newFormation.leftPair = { ...formation.leftPair, defender: player2Id };
      } else if (formation.leftPair.attacker === player1Id) {
        newFormation.leftPair = { ...formation.leftPair, attacker: player2Id };
      }
    } else if (player1Position === POSITION_KEYS.RIGHT_PAIR) {
      if (formation.rightPair.defender === player1Id) {
        newFormation.rightPair = { ...formation.rightPair, defender: player2Id };
      } else if (formation.rightPair.attacker === player1Id) {
        newFormation.rightPair = { ...formation.rightPair, attacker: player2Id };
      }
    } else if (player1Position === POSITION_KEYS.SUB_PAIR) {
      if (formation.subPair.defender === player1Id) {
        newFormation.subPair = { ...formation.subPair, defender: player2Id };
      } else if (formation.subPair.attacker === player1Id) {
        newFormation.subPair = { ...formation.subPair, attacker: player2Id };
      }
    }

    if (player2Position === POSITION_KEYS.LEFT_PAIR) {
      if (formation.leftPair.defender === player2Id) {
        newFormation.leftPair = { ...newFormation.leftPair, defender: player1Id };
      } else if (formation.leftPair.attacker === player2Id) {
        newFormation.leftPair = { ...newFormation.leftPair, attacker: player1Id };
      }
    } else if (player2Position === POSITION_KEYS.RIGHT_PAIR) {
      if (formation.rightPair.defender === player2Id) {
        newFormation.rightPair = { ...newFormation.rightPair, defender: player1Id };
      } else if (formation.rightPair.attacker === player2Id) {
        newFormation.rightPair = { ...newFormation.rightPair, attacker: player1Id };
      }
    } else if (player2Position === POSITION_KEYS.SUB_PAIR) {
      if (formation.subPair.defender === player2Id) {
        newFormation.subPair = { ...newFormation.subPair, defender: player1Id };
      } else if (formation.subPair.attacker === player2Id) {
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
      let newRole = p.stats.currentRole; // Default to current role
      
      if (teamMode === TEAM_MODES.PAIRS_7) {
        // For pairs, player1 takes player2's role
        newRole = player2.stats.currentRole;
      } else {
        // For individual formations, use centralized role determination
        newRole = getPositionRole(player2Position) || newRole;
      }
      
      const playerWithRoleChange = handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused);
      return { 
        ...playerWithRoleChange, 
        stats: {
          ...playerWithRoleChange.stats,
          currentPairKey: player2Position
        }
      };
    }
    if (p.id === player2Id) {
      // Determine the new role for player2 based on their new position
      let newRole = p.stats.currentRole; // Default to current role
      
      if (teamMode === TEAM_MODES.PAIRS_7) {
        // For pairs, player2 takes player1's role
        newRole = player1.stats.currentRole;
      } else {
        // For individual formations, use centralized role determination
        newRole = getPositionRole(player1Position) || newRole;
      }
      
      const playerWithRoleChange = handleRoleChange(p, newRole, currentTimeEpoch, isSubTimerPaused);
      return { 
        ...playerWithRoleChange, 
        stats: {
          ...playerWithRoleChange.stats,
          currentPairKey: player1Position
        }
      };
    }
    return p;
  });

  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: [player1Id, player2Id]
  };
};

/**
 * Calculate the result of switching goalies
 */
export const calculateGoalieSwitch = (gameState, newGoalieId) => {
  const { allPlayers, formation, teamMode, isSubTimerPaused = false } = gameState;
  

  if (!newGoalieId || newGoalieId === formation.goalie) {
    console.warn('Invalid new goalie ID or same as current goalie');
    return gameState;
  }

  const currentGoalie = findPlayerById(allPlayers, formation.goalie);
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
  const newFormation = { ...formation };
  
  // Set new goalie
  newFormation.goalie = newGoalieId;
  
  // Place current goalie in the position of the new goalie
  if (teamMode === TEAM_MODES.PAIRS_7) {
    // Handle pairs formation
    if (newGoaliePosition === POSITION_KEYS.LEFT_PAIR) {
      if (formation.leftPair.defender === newGoalieId) {
        newFormation.leftPair = { ...formation.leftPair, defender: formation.goalie };
      } else if (formation.leftPair.attacker === newGoalieId) {
        newFormation.leftPair = { ...formation.leftPair, attacker: formation.goalie };
      }
    } else if (newGoaliePosition === POSITION_KEYS.RIGHT_PAIR) {
      if (formation.rightPair.defender === newGoalieId) {
        newFormation.rightPair = { ...formation.rightPair, defender: formation.goalie };
      } else if (formation.rightPair.attacker === newGoalieId) {
        newFormation.rightPair = { ...formation.rightPair, attacker: formation.goalie };
      }
    } else if (newGoaliePosition === POSITION_KEYS.SUB_PAIR) {
      if (formation.subPair.defender === newGoalieId) {
        newFormation.subPair = { ...formation.subPair, defender: formation.goalie };
      } else if (formation.subPair.attacker === newGoalieId) {
        newFormation.subPair = { ...formation.subPair, attacker: formation.goalie };
      }
    }
  } else {
    // Handle individual formations (6-player and 7-player)
    newFormation[newGoaliePosition] = formation.goalie;
  }

  // Update player stats and handle role changes
  const currentTimeEpoch = Date.now();
  const newAllPlayers = allPlayers.map(p => {
    if (p.id === formation.goalie) {
      // Current goalie becomes a field player
      const updatedStats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);
      
      // Determine new role and status based on position they're moving to
      let newRole = PLAYER_ROLES.DEFENDER; // Default
      let newStatus = 'on_field'; // Default
      
      if (teamMode === TEAM_MODES.PAIRS_7) {
        if (newGoaliePosition === POSITION_KEYS.LEFT_PAIR || newGoaliePosition === POSITION_KEYS.RIGHT_PAIR) {
          const pairData = formation[newGoaliePosition];
          if (pairData) {
            if (pairData.defender === newGoalieId) {
              newRole = PLAYER_ROLES.DEFENDER;
            } else if (pairData.attacker === newGoalieId) {
              newRole = PLAYER_ROLES.ATTACKER;
            }
          }
          newStatus = PLAYER_STATUS.ON_FIELD;
        } else if (newGoaliePosition === POSITION_KEYS.SUB_PAIR) {
          const pairData = formation[newGoaliePosition];
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
        newStatus = (newGoaliePosition && newGoaliePosition.includes('substitute_1')) ? PLAYER_STATUS.SUBSTITUTE : PLAYER_STATUS.ON_FIELD;
      }
      
      // Handle role change from goalie to new position
      const playerWithNewRole = handleRoleChange(
        { ...p, stats: updatedStats },
        newRole,
        currentTimeEpoch,
        isSubTimerPaused
      );
      
      // Update status and position while preserving the properly initialized stats from handleRoleChange
      const finalStats = {
        ...playerWithNewRole.stats,
        currentStatus: newStatus,
        currentPairKey: newGoaliePosition
      };
      
      return { ...p, stats: finalStats };
    } else if (p.id === newGoalieId) {
      // New goalie - calculate accumulated time for their field stint
      const updatedStats = updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused);
      
      // Handle role change from field player to goalie
      const playerWithNewRole = handleRoleChange(
        { ...p, stats: updatedStats },
        PLAYER_ROLES.GOALIE,
        currentTimeEpoch,
        isSubTimerPaused
      );
      
      // Update status and position while preserving the properly initialized stats from handleRoleChange
      const finalStats = {
        ...playerWithNewRole.stats,
        currentStatus: PLAYER_STATUS.GOALIE,
        currentPairKey: POSITION_KEYS.GOALIE
      };
      
      return { ...p, stats: finalStats };
    }
    return p;
  });

  // Update rotation queue - remove new goalie from queue and add old goalie
  const queueManager = createRotationQueue(gameState.rotationQueue, createPlayerLookup(allPlayers));
  queueManager.initialize();
  
  // Get new goalie's position BEFORE removing them
  const newGoalieQueuePosition = queueManager.getPosition(newGoalieId);

  // Remove new goalie from queue (they're now goalie, not in rotation)
  queueManager.removePlayer(newGoalieId);
  
  // Former goalie takes new goalie's exact queue position (maintains fair rotation)
  if (newGoalieQueuePosition >= 0) {
    queueManager.addPlayer(formation.goalie, newGoalieQueuePosition);
  } else {
    // Fallback: if new goalie wasn't in queue, add to end
    queueManager.addPlayer(formation.goalie, 'end');
  }

  // Recalculate next player tracking if the new goalie was next to come off
  let newNextPlayerIdToSubOut = gameState.nextPlayerIdToSubOut;
  let newNextNextPlayerIdToSubOut = gameState.nextNextPlayerIdToSubOut;
  
  if (newGoalieId === gameState.nextPlayerIdToSubOut) {
    // New goalie was next to come off, so update tracking to next player in queue
    const updatedQueue = queueManager.toArray();
    newNextPlayerIdToSubOut = updatedQueue[0] || null;
    
    // For modes with next-next tracking, also update next-next tracking
    if (supportsNextNextIndicators(teamMode) && updatedQueue.length >= 2) {
      newNextNextPlayerIdToSubOut = updatedQueue[1];
    }
  } else if (newGoalieId === gameState.nextNextPlayerIdToSubOut && supportsNextNextIndicators(teamMode)) {
    // New goalie was next-next to come off in 7-player mode
    const updatedQueue = queueManager.toArray();
    if (updatedQueue.length >= 2) {
      newNextNextPlayerIdToSubOut = updatedQueue[1];
    } else {
      newNextNextPlayerIdToSubOut = null;
    }
  }

  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newAllPlayers,
    rotationQueue: queueManager.toArray(),
    nextPlayerIdToSubOut: newNextPlayerIdToSubOut,
    nextNextPlayerIdToSubOut: newNextNextPlayerIdToSubOut,
    playersToHighlight: [formation.goalie, newGoalieId]
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
      if (currentStats.currentRole === 'Attacker') {
        currentStats.timeAsAttackerSeconds += timeSinceSubstitution;
      } else if (currentStats.currentRole === 'Defender') {
        currentStats.timeAsDefenderSeconds += timeSinceSubstitution;
      }

      // Update their status back to 'on_field' and reset stint timer
      currentStats.currentStatus = 'on_field';
      currentStats.lastStintStartTimeEpoch = currentTime;
      
      // Restore their field position from the before-substitution formation
      const beforeFormation = lastSubstitution.beforeFormation;
      
      // Find what position this player had before substitution
      let restoredPosition = null;
      if (lastSubstitution.teamMode === 'PAIRS_7') {
        if (beforeFormation.leftPair?.defender === player.id) restoredPosition = 'leftPair';
        else if (beforeFormation.leftPair?.attacker === player.id) restoredPosition = 'leftPair';
        else if (beforeFormation.rightPair?.defender === player.id) restoredPosition = 'rightPair';
        else if (beforeFormation.rightPair?.attacker === player.id) restoredPosition = 'rightPair';
      } else if (lastSubstitution.teamMode === TEAM_MODES.INDIVIDUAL_6) {
        if (beforeFormation.leftDefender === player.id) restoredPosition = 'leftDefender';
        else if (beforeFormation.rightDefender === player.id) restoredPosition = 'rightDefender';
        else if (beforeFormation.leftAttacker === player.id) restoredPosition = 'leftAttacker';
        else if (beforeFormation.rightAttacker === player.id) restoredPosition = 'rightAttacker';
      } else if (lastSubstitution.teamMode === TEAM_MODES.INDIVIDUAL_7) {
        if (beforeFormation.leftDefender === player.id) restoredPosition = 'leftDefender';
        else if (beforeFormation.rightDefender === player.id) restoredPosition = 'rightDefender';
        else if (beforeFormation.leftAttacker === player.id) restoredPosition = 'leftAttacker';
        else if (beforeFormation.rightAttacker === player.id) restoredPosition = 'rightAttacker';
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
    formation: newFormation,
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
  const { allPlayers, formation, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, teamMode } = gameState;

  if (!supportsInactiveUsers(teamMode)) {
    console.warn('Player inactivation only supported in modes with inactive user support');
    return gameState;
  }

  const player = findPlayerById(allPlayers, playerId);
  if (!player) {
    console.warn('Player not found for inactivation toggle');
    return gameState;
  }

  const currentlyInactive = player.stats.isInactive;
  const isSubstitute = player.stats.currentPairKey === POSITION_KEYS.SUBSTITUTE_1 || player.stats.currentPairKey === POSITION_KEYS.SUBSTITUTE_2;
  
  // Only allow inactivating/activating substitute players
  if (!isSubstitute) {
    console.warn('Only substitute players can be inactivated');
    return gameState;
  }

  // Safety check: Prevent having both substitutes inactive
  if (!currentlyInactive) { // Player is about to be inactivated
    const substitute_1Id = formation.substitute_1;
    const substitute_2Id = formation.substitute_2;
    const otherSubstituteId = playerId === substitute_1Id ? substitute_2Id : substitute_1Id;
    const otherSubstitute = findPlayerById(allPlayers, otherSubstituteId);
    
    if (otherSubstitute?.stats.isInactive) {
      console.warn('Cannot inactivate player: would result in both substitutes being inactive');
      return gameState;
    }
  }

  let newFormation = { ...formation };
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
    // Player is being activated - they become the next player to go in (substitute_1)
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize();
    queueManager.reactivatePlayer(playerId);
    
    // Get current substitute positions
    const currentSub_1Id = formation.substitute_1;
    const currentSub_2Id = formation.substitute_2;
    
    if (playerId === currentSub_1Id) {
      // Reactivated player is already in substitute_1 position - just activate them
      // nextPlayerIdToSubOut should remain pointing to the current active field player
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length >= 1) {
        newNextNextPlayerIdToSubOut = nextActivePlayers[0];
      }
    } else if (playerId === currentSub_2Id) {
      // Reactivated player is in substitute_2 - swap with substitute_1
      newFormation = {
        ...newFormation,
        substitute_1: playerId,
        substitute_2: currentSub_1Id
      };
      
      // Update positions in player data
      newAllPlayers = newAllPlayers.map(p => {
        if (p.id === playerId) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_1 } };
        }
        if (p.id === currentSub_1Id) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_2 } };
        }
        return p;
      });
      
      newNextNextPlayerIdToSubOut = currentSub_1Id;
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
    
    // Move inactive player to substitute_2 position if they were substitute_1
    if (player.stats.currentPairKey === POSITION_KEYS.SUBSTITUTE_1 && formation.substitute_2) {
      const otherSubId = formation.substitute_2;
      
      newFormation = {
        ...newFormation,
        substitute_1: otherSubId,
        substitute_2: playerId
      };
      
      // Update positions in player data
      newAllPlayers = newAllPlayers.map(p => {
        if (p.id === playerId) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_2 } };
        }
        if (p.id === otherSubId) {
          return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_1 } };
        }
        return p;
      });
    }
  }

  return {
    ...gameState,
    formation: newFormation,
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
export const calculateSubstituteSwap = (gameState, substitute_1Id, substitute_2Id) => {
  const { allPlayers, formation, teamMode } = gameState;
  
  if (!supportsNextNextIndicators(teamMode)) {
    console.warn('Substitute swap only supported in modes with multiple substitute support');
    return gameState;
  }
  
  if (!substitute_1Id || !substitute_2Id) {
    console.warn('Invalid substitute IDs for swap');
    return gameState;
  }
  
  // Create new formation with swapped substitute positions
  const newFormation = {
    ...formation,
    substitute_1: substitute_2Id,
    substitute_2: substitute_1Id
  };
  
  // Update player positions in their stats
  const newAllPlayers = allPlayers.map(p => {
    if (p.id === substitute_1Id) {
      return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_2 } };
    }
    if (p.id === substitute_2Id) {
      return { ...p, stats: { ...p.stats, currentPairKey: POSITION_KEYS.SUBSTITUTE_1 } };
    }
    return p;
  });
  
  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: [substitute_1Id, substitute_2Id]
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
    const newNextPlayerIdToSubOut = gameState.formation[target];
    return {
      ...gameState,
      nextPlayerToSubOut: target,
      nextPlayerIdToSubOut: newNextPlayerIdToSubOut
    };
  }
  
  return gameState;
};