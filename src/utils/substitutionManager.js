/**
 * Unified Substitution Manager
 * 
 * This module provides a centralized, consistent way to handle player substitutions
 * across all formation types. It eliminates the complex state synchronization issues
 * by maintaining a single source of truth for substitution state.
 */

import { FORMATION_TYPES, PLAYER_ROLES } from './gameLogic';

/**
 * Player stats update information returned by substitution operations
 */
class PlayerStatsUpdate {
  constructor(playerId, newStatus, newRole, newPairKey, currentTimeEpoch) {
    this.playerId = playerId;
    this.newStatus = newStatus;
    this.newRole = newRole;
    this.newPairKey = newPairKey;
    this.currentTimeEpoch = currentTimeEpoch;
  }
}

/**
 * Unified substitution state structure
 */
class SubstitutionState {
  constructor({
    currentFormation = {},
    rotationQueue = [],
    goalieId = null,
    nextOffIndex = 0,
    inactivePlayerIds = [],
    formationType = FORMATION_TYPES.PAIRS_7
  }) {
    this.currentFormation = currentFormation;
    this.rotationQueue = rotationQueue;
    this.goalieId = goalieId;
    this.nextOffIndex = nextOffIndex;
    this.inactivePlayerIds = inactivePlayerIds;
    this.formationType = formationType;
  }

  // Create a new state with updates (immutable)
  update(updates) {
    return new SubstitutionState({
      ...this,
      ...updates
    });
  }

  // Get active players (excluding inactive ones)
  getActiveQueue() {
    return this.rotationQueue.filter(playerId => !this.inactivePlayerIds.includes(playerId));
  }

  // Validate state consistency
  isValid() {
    // Check if goalie exists in formation
    if (this.goalieId && this.currentFormation.goalie !== this.goalieId) {
      return false;
    }

    // Check if rotation queue contains valid players
    if (this.nextOffIndex >= this.rotationQueue.length) {
      return false;
    }

    // Formation-specific validation
    const handler = getFormationHandler(this.formationType);
    return handler.validateState(this);
  }
}

/**
 * Base class for formation-specific substitution handlers
 */
class BaseSubstitutionHandler {
  constructor(formationType) {
    this.formationType = formationType;
  }

  // Override in subclasses
  getNextPlayerToSubOut(state) {
    throw new Error('Must implement getNextPlayerToSubOut');
  }

  performSubstitution(state, currentTimeEpoch) {
    throw new Error('Must implement performSubstitution');
  }

  setNextPlayer(state, playerId) {
    throw new Error('Must implement setNextPlayer');
  }

  swapGoalie(state, oldGoalieId, newGoalieId) {
    throw new Error('Must implement swapGoalie');
  }

  togglePlayerInactive(state, playerId) {
    throw new Error('Must implement togglePlayerInactive');
  }

  validateState(state) {
    return true; // Override in subclasses if needed
  }

  // Helper method to get role from position
  getPositionRole(position) {
    if (position === 'leftDefender' || position === 'rightDefender' || 
        position === 'leftDefender7' || position === 'rightDefender7') {
      return PLAYER_ROLES.DEFENDER;
    } else if (position === 'leftAttacker' || position === 'rightAttacker' ||
               position === 'leftAttacker7' || position === 'rightAttacker7') {
      return PLAYER_ROLES.ATTACKER;
    } else if (position === 'substitute' || position === 'substitute7_1' || position === 'substitute7_2') {
      return PLAYER_ROLES.SUBSTITUTE;
    } else if (position === 'goalie') {
      return PLAYER_ROLES.GOALIE;
    }
    return null;
  }

  // Helper method to get player position in formation
  getPlayerPosition(formation, playerId) {
    for (const [position, id] of Object.entries(formation)) {
      if (position === 'goalie' && id === playerId) {
        return 'goalie';
      }
      if (typeof id === 'string' && id === playerId) {
        return position;
      }
      if (typeof id === 'object' && id !== null) {
        // Handle pair objects like leftPair: { defender: id, attacker: id }
        for (const [role, roleId] of Object.entries(id)) {
          if (roleId === playerId) {
            return `${position}.${role}`;
          }
        }
      }
    }
    return null;
  }
}

/**
 * 7-Player Pairs Mode Handler
 */
class PairsSubstitutionHandler extends BaseSubstitutionHandler {
  constructor() {
    super(FORMATION_TYPES.PAIRS_7);
  }

  getNextPlayerToSubOut(state) {
    // In pairs mode, we track which pair comes off, not individual players
    // The next pair alternates between leftPair and rightPair
    const activePairs = ['leftPair', 'rightPair'];
    const currentPair = activePairs[state.nextOffIndex % activePairs.length];
    
    // Return both players from the pair
    const pair = state.currentFormation[currentPair];
    return {
      type: 'pair',
      pairKey: currentPair,
      playerIds: [pair?.defender, pair?.attacker].filter(Boolean)
    };
  }

  getNextNextPlayerToSubOut(state) {
    // Not applicable for pairs mode
    return null;
  }

  performSubstitution(state, currentTimeEpoch) {
    const nextOff = this.getNextPlayerToSubOut(state);
    if (!nextOff || nextOff.playerIds.length === 0) {
      throw new Error('No valid pair to substitute');
    }

    const subPair = state.currentFormation.subPair;
    if (!subPair?.defender || !subPair?.attacker) {
      throw new Error('No substitute pair available');
    }

    // Create new formation with swapped pairs
    const newFormation = { ...state.currentFormation };
    newFormation[nextOff.pairKey] = { ...subPair };
    newFormation.subPair = {
      defender: state.currentFormation[nextOff.pairKey].defender,
      attacker: state.currentFormation[nextOff.pairKey].attacker
    };

    // Update next off index (alternate between pairs)
    const newNextOffIndex = (state.nextOffIndex + 1) % 2;

    // Create player stats updates
    const playerStatsUpdates = [
      // Players going off (to substitute)
      new PlayerStatsUpdate(nextOff.playerIds[0], 'substitute', PLAYER_ROLES.DEFENDER, 'subPair', currentTimeEpoch),
      new PlayerStatsUpdate(nextOff.playerIds[1], 'substitute', PLAYER_ROLES.ATTACKER, 'subPair', currentTimeEpoch),
      // Players coming on (to field)
      new PlayerStatsUpdate(subPair.defender, 'on_field', PLAYER_ROLES.DEFENDER, nextOff.pairKey, currentTimeEpoch),
      new PlayerStatsUpdate(subPair.attacker, 'on_field', PLAYER_ROLES.ATTACKER, nextOff.pairKey, currentTimeEpoch)
    ];

    const newState = state.update({
      currentFormation: newFormation,
      nextOffIndex: newNextOffIndex
    });

    return {
      newState,
      playerStatsUpdates
    };
  }

  setNextPlayer(state, pairKey) {
    const validPairs = ['leftPair', 'rightPair'];
    if (!validPairs.includes(pairKey)) {
      throw new Error(`Invalid pair key: ${pairKey}`);
    }

    const newNextOffIndex = pairKey === 'leftPair' ? 0 : 1;
    return state.update({ nextOffIndex: newNextOffIndex });
  }

  swapGoalie(state, oldGoalieId, newGoalieId) {
    // Find where the new goalie is positioned
    const newGoaliePosition = this.getPlayerPosition(state.currentFormation, newGoalieId);
    if (!newGoaliePosition || newGoaliePosition === 'goalie') {
      throw new Error('Invalid goalie swap: new goalie not found in formation');
    }

    // Parse position (e.g., "leftPair.defender" -> ["leftPair", "defender"])
    const [pairKey, role] = newGoaliePosition.split('.');

    // Create new formation
    const newFormation = { ...state.currentFormation };
    newFormation.goalie = newGoalieId;
    newFormation[pairKey] = {
      ...newFormation[pairKey],
      [role]: oldGoalieId
    };

    return state.update({
      currentFormation: newFormation,
      goalieId: newGoalieId
    });
  }
}

/**
 * 6-Player Individual Mode Handler
 */
class Individual6SubstitutionHandler extends BaseSubstitutionHandler {
  constructor() {
    super(FORMATION_TYPES.INDIVIDUAL_6);
  }

  getNextPlayerToSubOut(state) {
    const activeQueue = state.getActiveQueue();
    if (activeQueue.length === 0) {
      return null;
    }

    const nextPlayerId = activeQueue[state.nextOffIndex % activeQueue.length];
    const position = this.getPlayerPosition(state.currentFormation, nextPlayerId);

    return {
      type: 'individual',
      playerId: nextPlayerId,
      position: position
    };
  }

  getNextNextPlayerToSubOut(state) {
    // Not applicable for 6-player mode
    return null;
  }

  performSubstitution(state, currentTimeEpoch) {
    const nextOff = this.getNextPlayerToSubOut(state);
    if (!nextOff) {
      throw new Error('No valid player to substitute');
    }

    const substituteId = state.currentFormation.substitute;
    if (!substituteId) {
      throw new Error('No substitute available');
    }

    // Create new formation with swapped positions
    const newFormation = { ...state.currentFormation };
    newFormation[nextOff.position] = substituteId;
    newFormation.substitute = nextOff.playerId;

    // Update rotation queue - move substituted player to end
    const newQueue = [...state.rotationQueue];
    const playerIndex = newQueue.indexOf(nextOff.playerId);
    if (playerIndex !== -1) {
      newQueue.splice(playerIndex, 1);
      newQueue.push(nextOff.playerId);
    }

    // Create player stats updates
    const newRole = this.getPositionRole(nextOff.position);
    const playerStatsUpdates = [
      // Player going off (to substitute)
      new PlayerStatsUpdate(nextOff.playerId, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute', currentTimeEpoch),
      // Player coming on (to field)
      new PlayerStatsUpdate(substituteId, 'on_field', newRole, nextOff.position, currentTimeEpoch)
    ];

    const newState = state.update({
      currentFormation: newFormation,
      rotationQueue: newQueue,
      nextOffIndex: 0 // Next player is always first in updated queue
    });

    return {
      newState,
      playerStatsUpdates
    };
  }

  setNextPlayer(state, playerId) {
    const playerIndex = state.rotationQueue.indexOf(playerId);
    if (playerIndex === -1) {
      throw new Error(`Player ${playerId} not found in rotation queue`);
    }

    // Reorder queue to put selected player first
    const newQueue = [...state.rotationQueue];
    const [selectedPlayer] = newQueue.splice(playerIndex, 1);
    newQueue.unshift(selectedPlayer);

    return state.update({
      rotationQueue: newQueue,
      nextOffIndex: 0
    });
  }

  swapGoalie(state, oldGoalieId, newGoalieId) {
    // Find where the new goalie is positioned
    const newGoaliePosition = this.getPlayerPosition(state.currentFormation, newGoalieId);
    if (!newGoaliePosition || newGoaliePosition === 'goalie') {
      throw new Error('Invalid goalie swap: new goalie not found in formation');
    }

    // Create new formation
    const newFormation = { ...state.currentFormation };
    newFormation.goalie = newGoalieId;
    newFormation[newGoaliePosition] = oldGoalieId;

    // Update rotation queue - replace new goalie with old goalie in same position
    const newQueue = [...state.rotationQueue];
    const goalieIndex = newQueue.indexOf(newGoalieId);
    if (goalieIndex !== -1) {
      newQueue[goalieIndex] = oldGoalieId;
    }

    return state.update({
      currentFormation: newFormation,
      rotationQueue: newQueue,
      goalieId: newGoalieId
    });
  }
}

/**
 * 7-Player Individual Mode Handler (Most Complex)
 */
class Individual7SubstitutionHandler extends BaseSubstitutionHandler {
  constructor() {
    super(FORMATION_TYPES.INDIVIDUAL_7);
  }

  getNextPlayerToSubOut(state) {
    const activeQueue = state.getActiveQueue();
    if (activeQueue.length === 0) {
      return null;
    }

    // Find first active player on field (not substitute)
    for (const playerId of activeQueue) {
      const position = this.getPlayerPosition(state.currentFormation, playerId);
      if (position && !position.includes('substitute')) {
        return {
          type: 'individual',
          playerId: playerId,
          position: position
        };
      }
    }

    return null;
  }

  getNextNextPlayerToSubOut(state) {
    const activeQueue = state.getActiveQueue();
    if (activeQueue.length < 2) {
      return null;
    }

    // Find second active player on field (not substitute)
    let count = 0;
    for (const playerId of activeQueue) {
      const position = this.getPlayerPosition(state.currentFormation, playerId);
      if (position && !position.includes('substitute')) {
        count++;
        if (count === 2) {
          return {
            type: 'individual',
            playerId: playerId,
            position: position
          };
        }
      }
    }

    return null;
  }

  performSubstitution(state, currentTimeEpoch) {
    const nextOff = this.getNextPlayerToSubOut(state);
    if (!nextOff) {
      throw new Error('No valid player to substitute');
    }

    const substitute1Id = state.currentFormation.substitute7_1;
    const substitute2Id = state.currentFormation.substitute7_2;
    
    // Check if substitute1 is inactive
    const isSubstitute1Inactive = state.inactivePlayerIds.includes(substitute1Id);
    const nextSubstituteId = isSubstitute1Inactive ? substitute2Id : substitute1Id;

    if (!nextSubstituteId) {
      throw new Error('No active substitute available');
    }

    // Create new formation
    const newFormation = { ...state.currentFormation };
    newFormation[nextOff.position] = nextSubstituteId;

    // Create player stats updates
    const newRole = this.getPositionRole(nextOff.position);
    const playerStatsUpdates = [];

    if (isSubstitute1Inactive) {
      // If substitute1 was inactive, substitute2 goes to field, player goes to substitute2
      newFormation.substitute7_2 = nextOff.playerId;
      
      playerStatsUpdates.push(
        new PlayerStatsUpdate(nextOff.playerId, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_2', currentTimeEpoch),
        new PlayerStatsUpdate(substitute2Id, 'on_field', newRole, nextOff.position, currentTimeEpoch)
      );
    } else {
      // Normal case: substitute1 goes to field, substitute2 moves to substitute1, player goes to substitute2
      newFormation.substitute7_1 = substitute2Id;
      newFormation.substitute7_2 = nextOff.playerId;
      
      playerStatsUpdates.push(
        new PlayerStatsUpdate(nextOff.playerId, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_2', currentTimeEpoch),
        new PlayerStatsUpdate(substitute1Id, 'on_field', newRole, nextOff.position, currentTimeEpoch),
        new PlayerStatsUpdate(substitute2Id, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_1', currentTimeEpoch)
      );
    }

    // Update rotation queue - move substituted player to end of active queue
    const newQueue = [...state.rotationQueue];
    const playerIndex = newQueue.indexOf(nextOff.playerId);
    if (playerIndex !== -1) {
      newQueue.splice(playerIndex, 1);
      newQueue.push(nextOff.playerId);
    }

    const newState = state.update({
      currentFormation: newFormation,
      rotationQueue: newQueue
    });

    return {
      newState,
      playerStatsUpdates
    };
  }

  setNextPlayer(state, playerId) {
    const playerIndex = state.rotationQueue.indexOf(playerId);
    if (playerIndex === -1) {
      throw new Error(`Player ${playerId} not found in rotation queue`);
    }

    // Reorder queue to put selected player first among active players
    const newQueue = [...state.rotationQueue];
    const [selectedPlayer] = newQueue.splice(playerIndex, 1);
    
    // Find first position to insert (after any inactive players at start)
    let insertIndex = 0;
    while (insertIndex < newQueue.length && state.inactivePlayerIds.includes(newQueue[insertIndex])) {
      insertIndex++;
    }
    
    newQueue.splice(insertIndex, 0, selectedPlayer);

    return state.update({
      rotationQueue: newQueue
    });
  }

  togglePlayerInactive(state, playerId) {
    const isCurrentlyInactive = state.inactivePlayerIds.includes(playerId);
    const newInactivePlayerIds = isCurrentlyInactive
      ? state.inactivePlayerIds.filter(id => id !== playerId)
      : [...state.inactivePlayerIds, playerId];

    // Validate that we don't make both substitutes inactive
    const substitute1Id = state.currentFormation.substitute7_1;
    const substitute2Id = state.currentFormation.substitute7_2;
    
    if (!isCurrentlyInactive && // Making player inactive
        newInactivePlayerIds.includes(substitute1Id) && 
        newInactivePlayerIds.includes(substitute2Id)) {
      throw new Error('Cannot make both substitutes inactive');
    }

    // Handle position swapping for substitute changes
    let newFormation = { ...state.currentFormation };
    const playerStatsUpdates = [];
    
    if (playerId === substitute1Id && !isCurrentlyInactive) {
      // Making substitute1 inactive - substitute2 moves to substitute1
      newFormation.substitute7_1 = substitute2Id;
      newFormation.substitute7_2 = playerId;
      
      playerStatsUpdates.push(
        new PlayerStatsUpdate(playerId, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_2', Date.now()),
        new PlayerStatsUpdate(substitute2Id, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_1', Date.now())
      );
    } else if (playerId === substitute2Id && isCurrentlyInactive) {
      // Reactivating substitute2 - they move to substitute1, current substitute1 moves to substitute2
      newFormation.substitute7_1 = playerId;
      newFormation.substitute7_2 = substitute1Id;
      
      playerStatsUpdates.push(
        new PlayerStatsUpdate(playerId, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_1', Date.now()),
        new PlayerStatsUpdate(substitute1Id, 'substitute', PLAYER_ROLES.SUBSTITUTE, 'substitute7_2', Date.now())
      );
    }

    const newState = state.update({
      inactivePlayerIds: newInactivePlayerIds,
      currentFormation: newFormation
    });

    return {
      newState,
      playerStatsUpdates
    };
  }

  swapGoalie(state, oldGoalieId, newGoalieId) {
    // Find where the new goalie is positioned
    const newGoaliePosition = this.getPlayerPosition(state.currentFormation, newGoalieId);
    if (!newGoaliePosition || newGoaliePosition === 'goalie') {
      throw new Error('Invalid goalie swap: new goalie not found in formation');
    }

    // Create new formation
    const newFormation = { ...state.currentFormation };
    newFormation.goalie = newGoalieId;
    newFormation[newGoaliePosition] = oldGoalieId;

    // Update rotation queue - replace new goalie with old goalie in same position
    const newQueue = [...state.rotationQueue];
    const goalieIndex = newQueue.indexOf(newGoalieId);
    if (goalieIndex !== -1) {
      newQueue[goalieIndex] = oldGoalieId;
    }

    return state.update({
      currentFormation: newFormation,
      rotationQueue: newQueue,
      goalieId: newGoalieId
    });
  }
}

/**
 * Factory function to get the appropriate handler for a formation type
 */
function getFormationHandler(formationType) {
  switch (formationType) {
    case FORMATION_TYPES.PAIRS_7:
      return new PairsSubstitutionHandler();
    case FORMATION_TYPES.INDIVIDUAL_6:
      return new Individual6SubstitutionHandler();
    case FORMATION_TYPES.INDIVIDUAL_7:
      return new Individual7SubstitutionHandler();
    default:
      throw new Error(`Unknown formation type: ${formationType}`);
  }
}

/**
 * Main Substitution Manager Class
 * Provides a unified interface for all substitution operations
 */
export class SubstitutionManager {
  constructor(initialState) {
    this.state = new SubstitutionState(initialState);
    this.handler = getFormationHandler(this.state.formationType);
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Update state and refresh handler if formation type changed
  setState(newState) {
    this.state = new SubstitutionState(newState);
    if (this.handler.formationType !== this.state.formationType) {
      this.handler = getFormationHandler(this.state.formationType);
    }
  }

  // Formation-agnostic interface methods
  getNextPlayerToSubOut() {
    return this.handler.getNextPlayerToSubOut(this.state);
  }

  getNextNextPlayerToSubOut() {
    return this.handler.getNextNextPlayerToSubOut(this.state);
  }

  performSubstitution(currentTimeEpoch = Date.now()) {
    const result = this.handler.performSubstitution(this.state, currentTimeEpoch);
    this.setState(result.newState);
    return {
      newState: result.newState,
      playerStatsUpdates: result.playerStatsUpdates
    };
  }

  setNextPlayer(playerId) {
    const newState = this.handler.setNextPlayer(this.state, playerId);
    this.setState(newState);
    return newState;
  }

  swapGoalie(oldGoalieId, newGoalieId) {
    const newState = this.handler.swapGoalie(this.state, oldGoalieId, newGoalieId);
    this.setState(newState);
    return newState;
  }

  togglePlayerInactive(playerId) {
    if (this.handler.togglePlayerInactive) {
      const result = this.handler.togglePlayerInactive(this.state, playerId);
      this.setState(result.newState);
      return {
        newState: result.newState,
        playerStatsUpdates: result.playerStatsUpdates
      };
    }
    throw new Error('Inactive player toggle not supported for this formation type');
  }

  // Validation
  isValid() {
    return this.state.isValid();
  }

  // Export state for persistence
  toJSON() {
    return {
      currentFormation: this.state.currentFormation,
      rotationQueue: this.state.rotationQueue,
      goalieId: this.state.goalieId,
      nextOffIndex: this.state.nextOffIndex,
      inactivePlayerIds: this.state.inactivePlayerIds,
      formationType: this.state.formationType
    };
  }

  // Import state from persistence
  static fromJSON(json) {
    return new SubstitutionManager(json);
  }
}

export { SubstitutionState, getFormationHandler, PlayerStatsUpdate };