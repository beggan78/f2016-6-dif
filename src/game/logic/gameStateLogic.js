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
import { getValidPositions, supportsInactiveUsers, supportsNextNextIndicators, getBottomSubstitutePosition, getModeDefinition, isIndividualMode } from '../../constants/gameModes';

/**
 * Helper to get mode definition from either legacy string or team config object
 */
const getDefinitionForGameLogic = (teamModeOrConfig, selectedFormation = null) => {
  if (typeof teamModeOrConfig === 'string') {
    // Convert legacy team mode strings to team config objects
    const legacyMappings = {
      [TEAM_MODES.PAIRS_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
      [TEAM_MODES.INDIVIDUAL_5]: { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
      [TEAM_MODES.INDIVIDUAL_6]: { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
      [TEAM_MODES.INDIVIDUAL_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
      [TEAM_MODES.INDIVIDUAL_8]: { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
      [TEAM_MODES.INDIVIDUAL_9]: { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
      [TEAM_MODES.INDIVIDUAL_10]: { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
    };
    
    const teamConfig = legacyMappings[teamModeOrConfig];
    if (!teamConfig) {
      throw new Error(`Unknown legacy team mode: ${teamModeOrConfig}`);
    }
    
    // Override formation if selectedFormation is provided
    const formationAwareConfig = selectedFormation 
      ? { ...teamConfig, formation: selectedFormation }
      : teamConfig;
    
    return getModeDefinition(formationAwareConfig);
  }
  
  return getModeDefinition(teamModeOrConfig);
};

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
    selectedFormation,
    isSubTimerPaused = false
  } = gameState;

  console.log('🟢 [GameStateLogic] calculateSubstitution called with:', {
    teamMode,
    selectedFormation,
    nextPlayerIdToSubOut,
    rotationQueue: rotationQueue?.slice(),
    formationKeys: Object.keys(formation),
    isSubTimerPaused
  });

  const currentTimeEpoch = Date.now();
  const substitutionManager = createSubstitutionManager(teamMode, selectedFormation);
  
  console.log('🟢 [GameStateLogic] Created substitution manager for:', {
    teamMode,
    selectedFormation
  });
  
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
    console.log('🟢 [GameStateLogic] Calling substitutionManager.executeSubstitution...');
    const result = substitutionManager.executeSubstitution(context);
    
    console.log('🟢 [GameStateLogic] SubstitutionManager returned result:', {
      newNextPlayerIdToSubOut: result.newNextPlayerIdToSubOut,
      newNextPlayerToSubOut: result.newNextPlayerToSubOut,
      newNextNextPlayerIdToSubOut: result.newNextNextPlayerIdToSubOut,
      newRotationQueue: result.newRotationQueue?.slice(),
      playersComingOnIds: result.playersComingOnIds,
      playersGoingOffIds: result.playersGoingOffIds,
      hasNewFormation: !!result.newFormation,
      hasUpdatedPlayers: !!result.updatedPlayers
    });
    
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

    console.log('🟢 [GameStateLogic] Final new game state:', {
      nextPlayerIdToSubOut: newGameState.nextPlayerIdToSubOut,
      nextPlayerToSubOut: newGameState.nextPlayerToSubOut,
      nextNextPlayerIdToSubOut: newGameState.nextNextPlayerIdToSubOut,
      rotationQueue: newGameState.rotationQueue?.slice(),
      playersToHighlight: newGameState.playersToHighlight
    });

    return newGameState;
  } catch (error) {
    console.error('❌ [GameStateLogic] Error during substitution calculation:', error);
    return gameState; // Return unchanged state on error
  }
};

/**
 * Calculate the result of switching positions between two players
 */
export const calculatePositionSwitch = (gameState, player1Id, player2Id) => {
  const { allPlayers, formation, teamMode, isSubTimerPaused = false } = gameState;

  if (!player1Id || !player2Id || player1Id === player2Id) {
    return gameState;
  }

  const player1 = findPlayerById(allPlayers, player1Id);
  const player2 = findPlayerById(allPlayers, player2Id);
  
  if (!player1 || !player2) {
    return gameState;
  }

  // Don't allow switching with goalie
  if (player1.id === formation.goalie || player2.id === formation.goalie) {
    return gameState;
  }

  const player1Position = player1.stats.currentPairKey;
  const player2Position = player2.stats.currentPairKey;

  // Validate positions
  const currentValidPositions = getValidPositions(teamMode);
  if (!currentValidPositions.includes(player1Position) || !currentValidPositions.includes(player2Position)) {
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
 * Calculate the result of swapping defender and attacker positions within a pair (PAIRS_7 mode)
 */
export const calculatePairPositionSwap = (gameState, pairKey) => {
  const { allPlayers, formation, teamMode, isSubTimerPaused = false } = gameState;
  
  if (teamMode !== TEAM_MODES.PAIRS_7) {
    return gameState;
  }
  
  if (!pairKey || !['leftPair', 'rightPair', 'subPair'].includes(pairKey)) {
    return gameState;
  }
  
  const pair = formation[pairKey];
  if (!pair || !pair.defender || !pair.attacker) {
    return gameState;
  }
  
  
  // Create new formation with swapped positions
  const newFormation = {
    ...formation,
    [pairKey]: {
      defender: pair.attacker,  // Old attacker becomes defender
      attacker: pair.defender   // Old defender becomes attacker
    }
  };
  
  // Update player roles and stats with proper time tracking
  const currentTimeEpoch = Date.now();
  const newAllPlayers = allPlayers.map(player => {
    if (player.id === pair.defender || player.id === pair.attacker) {
      // Determine new role based on new position
      let newRole;
      if (pairKey === 'subPair') {
        // Substitute pair players always remain substitutes
        newRole = PLAYER_ROLES.SUBSTITUTE;
      } else {
        // Field pair players swap between defender and attacker
        newRole = player.id === pair.defender ? PLAYER_ROLES.ATTACKER : PLAYER_ROLES.DEFENDER;
      }
      
      
      // Use handleRoleChange to properly manage time tracking and role transitions
      const playerWithRoleChange = handleRoleChange(
        player,
        newRole,
        currentTimeEpoch,
        isSubTimerPaused
      );
      
      // Maintain current status and pair key (handleRoleChange doesn't change these)
      return {
        ...playerWithRoleChange,
        stats: {
          ...playerWithRoleChange.stats,
          currentStatus: player.stats.currentStatus,
          currentPairKey: player.stats.currentPairKey
        }
      };
    }
    return player;
  });
  
  
  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: [pair.defender, pair.attacker]
  };
};

/**
 * Calculate the result of switching goalies
 */
export const calculateGoalieSwitch = (gameState, newGoalieId) => {
  const { allPlayers, formation, teamMode, isSubTimerPaused = false } = gameState;
  

  if (!newGoalieId || newGoalieId === formation.goalie) {
    return gameState;
  }

  const currentGoalie = findPlayerById(allPlayers, formation.goalie);
  const newGoalie = findPlayerById(allPlayers, newGoalieId);
  
  if (!currentGoalie || !newGoalie) {
    return gameState;
  }

  // Don't allow switching with inactive player
  if (newGoalie.stats.isInactive) {
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
      } else if (isIndividualMode(lastSubstitution.teamMode)) {
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
 * Creates a reactivation cascade mapping for moving a reactivated player to substitute_1
 * and shifting all other active substitutes down one position
 * 
 * @param {string} reactivatedPlayerId - Player being reactivated 
 * @param {Array<string>} substitutePositions - Array of substitute position keys
 * @param {Object} formation - Current formation
 * @param {Array} allPlayers - Array of all player objects
 * @returns {Object} Mapping of player moves and formation updates
 */
const createReactivationCascade = (reactivatedPlayerId, substitutePositions, formation, allPlayers) => {
  const cascade = { formation: {}, players: {} };
  
  // Collect all players currently in substitute positions with their status
  const substitutePlayersInfo = [];
  substitutePositions.forEach(position => {
    const playerId = formation[position];
    if (playerId) {
      const player = allPlayers.find(p => p.id === playerId);
      substitutePlayersInfo.push({
        playerId,
        position,
        isActive: player && !player.stats.isInactive,
        isReactivatedPlayer: playerId === reactivatedPlayerId
      });
    }
  });
  
  // Separate active players (excluding reactivated) and inactive players
  const activeSubstitutes = substitutePlayersInfo.filter(p => p.isActive && !p.isReactivatedPlayer);
  const inactiveSubstitutes = substitutePlayersInfo.filter(p => !p.isActive && !p.isReactivatedPlayer);
  
  // Reactivated player goes to substitute_1
  cascade.formation[substitutePositions[0]] = reactivatedPlayerId;
  cascade.players[reactivatedPlayerId] = {
    currentPairKey: substitutePositions[0],
    isInactive: false
  };
  
  // All active substitutes shift down one position
  for (let i = 0; i < activeSubstitutes.length; i++) {
    const { playerId } = activeSubstitutes[i];
    const newPosition = substitutePositions[i + 1];
    
    if (newPosition) {
      cascade.formation[newPosition] = playerId;
      cascade.players[playerId] = {
        currentPairKey: newPosition,
        isInactive: false  // Explicitly preserve active status
      };
    }
  }
  
  // Fill remaining positions with inactive players (they stay inactive but may move positions)
  const remainingPositionIndex = activeSubstitutes.length + 1; // +1 because reactivated player took substitute_1
  for (let i = 0; i < inactiveSubstitutes.length; i++) {
    const { playerId } = inactiveSubstitutes[i];
    const newPosition = substitutePositions[remainingPositionIndex + i];
    
    if (newPosition) {
      cascade.formation[newPosition] = playerId;
      cascade.players[playerId] = {
        currentPairKey: newPosition,
        isInactive: true  // Explicitly preserve inactive status
      };
    }
  }
  
  return cascade;
};

/**
 * Calculate the result of toggling a player's inactive status (all individual modes)
 */
export const calculatePlayerToggleInactive = (gameState, playerId) => {
  const { allPlayers, formation, rotationQueue, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, teamMode, selectedFormation } = gameState;

  if (!supportsInactiveUsers(teamMode)) {
    return gameState;
  }

  const player = findPlayerById(allPlayers, playerId);
  if (!player) {
    return gameState;
  }

  const definition = getDefinitionForGameLogic(teamMode, selectedFormation);
  if (!definition) {
    return gameState;
  }

  const currentlyInactive = player.stats.isInactive;
  
  // Check if player is a substitute using configuration-driven approach
  const isSubstitute = definition.substitutePositions.includes(player.stats.currentPairKey);
  
  // Only allow inactivating/activating substitute players
  if (!isSubstitute) {
    return gameState;
  }

  // No additional validation needed - SUB NOW button handles "all inactive" scenario

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
    // DEBUG: Log initial state before reactivation
    
    // Player is being reactivated - they become substitute_1 and all others cascade down
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize();
    queueManager.reactivatePlayer(playerId);
    newRotationQueue = queueManager.toArray();
    
    
    // Apply reactivation cascade to formation and player positions
    const cascade = createReactivationCascade(playerId, definition.substitutePositions, formation, newAllPlayers);
    
    // Update formation with cascade results
    Object.entries(cascade.formation).forEach(([position, playerIdForPosition]) => {
      newFormation[position] = playerIdForPosition;
    });
    
    // Update player positions with cascade results
    newAllPlayers = newAllPlayers.map(p => {
      if (cascade.players[p.id]) {
        return {
          ...p,
          stats: {
            ...p.stats,
            ...cascade.players[p.id]
          }
        };
      }
      return p;
    });
    
    // DEBUG: Log reactivation state changes
    
    // ✅ FIXED: Reactivated player should be "next to go ON", not "next to come OFF"
    // The nextPlayerIdToSubOut should point to the first field player in the rotation queue
    // The reactivated player is now substitute_1 (next to go on) via the cascade logic
    
    // Set nextPlayerIdToSubOut to the first player in the rotation queue (should be a field player)
    const nextActivePlayers = queueManager.getNextActivePlayer(2);
    if (nextActivePlayers.length > 0) {
      newNextPlayerIdToSubOut = nextActivePlayers[0];
    } else {
      // Keep the original value if queue is empty (shouldn't happen)
      newNextPlayerIdToSubOut = nextPlayerIdToSubOut;
    }
    
    if (supportsNextNextIndicators(teamMode)) {
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length >= 2) {
        newNextNextPlayerIdToSubOut = nextActivePlayers[1];
      }
    }
  } else {
    // Player is being inactivated - move to bottom substitute position if possible
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize();
    queueManager.deactivatePlayer(playerId);
    newRotationQueue = queueManager.toArray();
    
    // Update next player tracking if the inactivated player was next
    if (playerId === nextPlayerIdToSubOut && queueManager.activeSize() > 0) {
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length > 0) {
        newNextPlayerIdToSubOut = nextActivePlayers[0];
        if (supportsNextNextIndicators(teamMode) && nextActivePlayers.length >= 2) {
          newNextNextPlayerIdToSubOut = nextActivePlayers[1];
        }
      }
    } else if (supportsNextNextIndicators(teamMode) && playerId === nextNextPlayerIdToSubOut) {
      const nextActivePlayers = queueManager.getNextActivePlayer(2);
      if (nextActivePlayers.length >= 2) {
        newNextNextPlayerIdToSubOut = nextActivePlayers[1];
      }
    }
    
    // Cascading inactivation: Move inactive player to bottom and shift others up
    const bottomSubPosition = getBottomSubstitutePosition(teamMode);
    const currentPosition = player.stats.currentPairKey;
    
    if (bottomSubPosition && currentPosition !== bottomSubPosition) {
      const substitutePositions = definition.substitutePositions;
      const currentIndex = substitutePositions.indexOf(currentPosition);
      const bottomIndex = substitutePositions.indexOf(bottomSubPosition);
      
      // All players from current position to bottom need to shift up one position
      for (let i = currentIndex + 1; i <= bottomIndex; i++) {
        const position = substitutePositions[i];
        const playerIdToMove = formation[position];
        if (playerIdToMove) {
          const targetPosition = substitutePositions[i - 1];
          newFormation[targetPosition] = playerIdToMove;
          
          // Update player's position key
          newAllPlayers = newAllPlayers.map(p => {
            if (p.id === playerIdToMove) {
              return { ...p, stats: { ...p.stats, currentPairKey: targetPosition } };
            }
            return p;
          });
        }
      }
      
      // Move inactive player to bottom position
      newFormation[bottomSubPosition] = playerId;
      newAllPlayers = newAllPlayers.map(p => {
        if (p.id === playerId) {
          return { ...p, stats: { ...p.stats, currentPairKey: bottomSubPosition } };
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
 * Calculate the result of swapping any two substitute positions
 */
export const calculateGeneralSubstituteSwap = (gameState, fromPosition, toPosition) => {
  const { allPlayers, formation, teamMode, selectedFormation } = gameState;
  
  if (!supportsNextNextIndicators(teamMode)) {
    return gameState;
  }
  
  const definition = getDefinitionForGameLogic(teamMode, selectedFormation);
  if (!definition || !definition.substitutePositions.includes(fromPosition) || !definition.substitutePositions.includes(toPosition)) {
    return gameState;
  }
  
  const fromPlayerId = formation[fromPosition];
  const toPlayerId = formation[toPosition];
  
  if (!fromPlayerId || !toPlayerId) {
    return gameState;
  }
  
  // Create new formation with swapped substitute positions
  const newFormation = {
    ...formation,
    [fromPosition]: toPlayerId,
    [toPosition]: fromPlayerId
  };
  
  // Update player positions in their stats
  const newAllPlayers = allPlayers.map(p => {
    if (p.id === fromPlayerId) {
      return { ...p, stats: { ...p.stats, currentPairKey: toPosition } };
    }
    if (p.id === toPlayerId) {
      return { ...p, stats: { ...p.stats, currentPairKey: fromPosition } };
    }
    return p;
  });
  
  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: [fromPlayerId, toPlayerId]
  };
};

/**
 * Calculate the result of swapping substitute positions (7-player mode)
 * @deprecated Use calculateGeneralSubstituteSwap instead
 */
export const calculateSubstituteSwap = (gameState, substitute_1Id, substitute_2Id) => {
  const { allPlayers, formation, teamMode } = gameState;
  
  if (!supportsNextNextIndicators(teamMode)) {
    return gameState;
  }
  
  if (!substitute_1Id || !substitute_2Id) {
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
 * Calculate the result of reordering substitutes when setting a player as next to go in
 * The target player moves to substitute_1, all players ahead of them move down one position
 */
export const calculateSubstituteReorder = (gameState, targetPosition) => {
  const { allPlayers, formation, teamMode, selectedFormation } = gameState;
  
  if (!supportsNextNextIndicators(teamMode)) {
    return gameState;
  }
  
  const definition = getDefinitionForGameLogic(teamMode, selectedFormation);
  if (!definition || !definition.substitutePositions.includes(targetPosition)) {
    return gameState;
  }
  
  // Cannot reorder substitute_1 (already next to go in)
  if (targetPosition === 'substitute_1') {
    return gameState;
  }
  
  const targetPlayerId = formation[targetPosition];
  if (!targetPlayerId) {
    return gameState;
  }
  
  const substitutePositions = definition.substitutePositions;
  const targetIndex = substitutePositions.indexOf(targetPosition);
  
  if (targetIndex === -1) {
    return gameState;
  }
  
  // Create new formation with reordered positions
  const newFormation = { ...formation };
  
  // Store the players who need to be shifted
  const playersToShift = [];
  for (let i = 0; i < targetIndex; i++) {
    const position = substitutePositions[i];
    const playerId = formation[position];
    if (playerId) {
      playersToShift.push({ playerId, currentPosition: position });
    }
  }
  
  // Move target player to substitute_1
  newFormation.substitute_1 = targetPlayerId;
  
  // Shift all players who were ahead of target down one position
  for (let i = 0; i < playersToShift.length; i++) {
    const nextPosition = substitutePositions[i + 1];
    newFormation[nextPosition] = playersToShift[i].playerId;
  }
  
  // Update player stats with new positions
  const newAllPlayers = allPlayers.map(p => {
    // Target player moves to substitute_1
    if (p.id === targetPlayerId) {
      return { ...p, stats: { ...p.stats, currentPairKey: 'substitute_1' } };
    }
    
    // Update shifted players
    const shiftedPlayer = playersToShift.find(shifted => shifted.playerId === p.id);
    if (shiftedPlayer) {
      const currentIndex = substitutePositions.indexOf(shiftedPlayer.currentPosition);
      const newPosition = substitutePositions[currentIndex + 1];
      return { ...p, stats: { ...p.stats, currentPairKey: newPosition } };
    }
    
    return p;
  });
  
  // Create list of all affected players for highlighting
  const affectedPlayers = [targetPlayerId, ...playersToShift.map(p => p.playerId)];
  
  return {
    ...gameState,
    formation: newFormation,
    allPlayers: newAllPlayers,
    playersToHighlight: affectedPlayers
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