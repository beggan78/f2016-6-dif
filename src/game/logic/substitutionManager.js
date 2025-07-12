import { PLAYER_ROLES, TEAM_MODES } from '../../constants/playerConstants';
import { MODE_DEFINITIONS } from '../../constants/gameModes';
import { createRotationQueue } from '../queue/rotationQueue';
import { createPlayerLookup, findPlayerById } from '../../utils/playerUtils';
import { getPositionRole, getFieldPositions } from './positionUtils';
import { updatePlayerTimeStats, startNewStint, resetPlayerStintTimer } from '../time/stintManager';


/**
 * Manages substitution logic for different team modes
 */
export class SubstitutionManager {
  constructor(teamMode) {
    this.teamMode = teamMode;
  }



  /**
   * Gets role from position key (delegates to shared utility)
   */
  getPositionRole(position) {
    return getPositionRole(position);
  }

  /**
   * Handles pairs substitution (7-player pairs mode)
   * 
   * Uses conditional time tracking based on timer pause state:
   * - Normal substitution (timer not paused): Accumulates time using updatePlayerTimeStats()
   * - Pause substitution (timer paused): Preserves time using resetPlayerStintTimer()
   * 
   * @param {Object} context - Substitution context
   * @param {Object} context.formation - Current formation
   * @param {string} context.nextPhysicalPairToSubOut - Pair to substitute out
   * @param {Array} context.allPlayers - All player objects
   * @param {number} context.currentTimeEpoch - Current time
   * @param {boolean} context.isSubTimerPaused - Whether timer is paused
   * @returns {Object} Substitution result with updated formation and players
   */
  handlePairsSubstitution(context) {
    const { 
      formation,
      nextPhysicalPairToSubOut, 
      allPlayers, 
      currentTimeEpoch,
      isSubTimerPaused
    } = context;

    const pairToSubOutKey = nextPhysicalPairToSubOut;
    const pairToSubInKey = 'subPair';

    const pairGettingSubbed = formation[pairToSubOutKey];
    const pairComingIn = formation[pairToSubInKey];

    const playersGoingOffIds = [pairGettingSubbed.defender, pairGettingSubbed.attacker].filter(Boolean);
    const playersComingOnIds = [pairComingIn.defender, pairComingIn.attacker].filter(Boolean);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(formation));
    newFormation[pairToSubOutKey].defender = pairComingIn.defender;
    newFormation[pairToSubOutKey].attacker = pairComingIn.attacker;
    newFormation[pairToSubInKey].defender = pairGettingSubbed.defender;
    newFormation[pairToSubInKey].attacker = pairGettingSubbed.attacker;

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (playersGoingOffIds.includes(p.id)) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'substitute',
            currentPairKey: pairToSubInKey
          }
        };
      }
      if (playersComingOnIds.includes(p.id)) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'on_field',
            currentPairKey: pairToSubOutKey
          }
        };
      }
      return p;
    });

    const newNextPair = pairToSubOutKey === 'leftPair' ? 'rightPair' : 'leftPair';

    return {
      newFormation,
      updatedPlayers,
      newNextPhysicalPairToSubOut: newNextPair,
      playersComingOnIds: playersComingOnIds,
      playersGoingOffIds: playersGoingOffIds
    };
  }


  /**
   * Unified individual mode substitution handler for both 6-player and 7-player modes
   * 
   * Uses mode configuration to drive behavior differences:
   * - substitutePositions array for filtering positions
   * - supportsInactiveUsers flag for validation
   * - substituteRotationPattern for substitute management
   * 
   * @param {Object} context - Substitution context
   * @param {Object} context.formation - Current formation
   * @param {string} context.nextPlayerIdToSubOut - Player ID to substitute out
   * @param {Array} context.allPlayers - All player objects
   * @param {Array} context.rotationQueue - Current rotation queue
   * @param {number} context.currentTimeEpoch - Current time
   * @param {boolean} context.isSubTimerPaused - Whether timer is paused
   * @returns {Object} Substitution result with updated formation, players, and queue
   */
  handleIndividualModeSubstitution(context) {
    const {
      formation,
      nextPlayerIdToSubOut,
      allPlayers,
      rotationQueue,
      currentTimeEpoch,
      isSubTimerPaused
    } = context;

    const modeConfig = MODE_DEFINITIONS[this.teamMode];
    const { substitutePositions, supportsInactiveUsers, substituteRotationPattern } = modeConfig;

    const playerGoingOffId = nextPlayerIdToSubOut;
    const playerComingOnId = formation.substitute_1;

    // Create rotation queue helper
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize(); // Separate active and inactive players

    // Safety check for inactive substitute (7-player mode only)
    if (supportsInactiveUsers) {
      const substitute_1Player = findPlayerById(allPlayers, playerComingOnId);
      if (substitute_1Player?.stats.isInactive) {
        throw new Error('substitute_1 is inactive but was selected for substitution');
      }
    }

    // Find position of outgoing player - use substitutePositions for filtering
    const playerToSubOutKey = Object.keys(formation).find(key =>
      formation[key] === playerGoingOffId && 
      !substitutePositions.includes(key) && 
      key !== 'goalie'
    );

    const newRole = this.getPositionRole(playerToSubOutKey);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(formation));
    newFormation[playerToSubOutKey] = playerComingOnId;

    // Handle substitute rotation based on pattern
    if (substituteRotationPattern === 'simple') {
      // 6-player: Simple swap
      newFormation.substitute_1 = playerGoingOffId;
    } else if (substituteRotationPattern === 'carousel') {
      // 7-player: Carousel rotation with inactive player handling
      const substitute_2Player = findPlayerById(allPlayers, formation.substitute_2);
      const isSubstitute_2Inactive = substitute_2Player?.stats.isInactive || false;
      
      if (isSubstitute_2Inactive) {
        newFormation.substitute_1 = playerGoingOffId;
      } else {
        newFormation.substitute_1 = formation.substitute_2;
        newFormation.substitute_2 = playerGoingOffId;
      }
    }

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (p.id === playerGoingOffId) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        // Determine new substitute position
        const newPairKey = substituteRotationPattern === 'carousel' && 
                          findPlayerById(allPlayers, formation.substitute_2)?.stats.isInactive === false
                          ? 'substitute_2' : 'substitute_1';
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'substitute',
            currentPairKey: newPairKey,
            currentRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      if (p.id === playerComingOnId) {
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentStatus: 'on_field',
            currentPairKey: playerToSubOutKey,
            currentRole: newRole
          }
        };
      }
      // Handle substitute_2 position change in carousel mode
      if (substituteRotationPattern === 'carousel' && p.id === formation.substitute_2 && 
          !findPlayerById(allPlayers, formation.substitute_2)?.stats.isInactive) {
        return {
          ...p,
          stats: {
            ...p.stats,
            currentPairKey: 'substitute_1',
            currentRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      return p;
    });

    // For individual modes, just rotate the current queue (no rebuilding during gameplay)
    const rotationQueueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    rotationQueueManager.initialize(); // Separate active and inactive players
    
    // Move the substituted player to the end of the queue
    rotationQueueManager.rotatePlayer(playerGoingOffId);
    const newRotationQueue = rotationQueueManager.toArray();
    const nextPlayerToSubOutId = newRotationQueue[0];

    const fieldPositions = getFieldPositions(this.teamMode);
    const nextPlayerPosition = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    // Build return object with mode-specific fields
    const result = {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextPlayerToSubOut: nextPlayerPosition || 'leftDefender',
      playersComingOnIds: [playerComingOnId],
      playersGoingOffIds: [playerGoingOffId]
    };

    // Add 7-player specific field
    if (substituteRotationPattern === 'carousel') {
      result.newNextNextPlayerIdToSubOut = newRotationQueue[1] || null;
    }

    return result;
  }

  /**
   * Main substitution handler - delegates to appropriate method based on team mode
   */
  executeSubstitution(context) {
    switch (this.teamMode) {
      case TEAM_MODES.PAIRS_7:
        return this.handlePairsSubstitution(context);
      case TEAM_MODES.INDIVIDUAL_6:
      case TEAM_MODES.INDIVIDUAL_7:
        return this.handleIndividualModeSubstitution(context);
      default:
        throw new Error(`Unknown team mode: ${this.teamMode}`);
    }
  }
}

/**
 * Handles role changes within a period (like pair swaps)
 * This calculates time for the previous role and updates the player's current role
 * 
 * Uses conditional time tracking:
 * - Normal operation (timer not paused): Accumulates time using updatePlayerTimeStats()
 * - Pause operation (timer paused): Preserves time without accumulation
 * 
 * @param {Object} player - Player object with stats
 * @param {string} newRole - New role for the player
 * @param {number} currentTimeEpoch - Current time in milliseconds
 * @param {boolean} isSubTimerPaused - Whether the substitution timer is paused
 * @returns {Object} Updated player object with new role and time tracking
 */
export function handleRoleChange(player, newRole, currentTimeEpoch, isSubTimerPaused = false) {
  // First calculate stats for the time spent in the previous role
  const updatedStats = updatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);
  
  // Create updated player with new role
  const playerWithUpdatedStats = {
    ...player,
    stats: {
      ...updatedStats,
      currentRole: newRole
    }
  };
  
  // Start new stint if timer is not paused
  if (!isSubTimerPaused) {
    const playerWithNewStint = startNewStint(playerWithUpdatedStats, currentTimeEpoch);
    return playerWithNewStint;
  }
  
  return playerWithUpdatedStats;
}

/**
 * Factory function to create substitution manager
 */
export function createSubstitutionManager(teamMode) {
  return new SubstitutionManager(teamMode);
}