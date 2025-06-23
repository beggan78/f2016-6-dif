import { PLAYER_ROLES, FORMATION_TYPES } from '../../constants/playerConstants';
import { createRotationQueue } from '../queue/rotationQueue';
import { createPlayerLookup, findPlayerById } from '../../utils/playerUtils';
import { getPositionRole, getFieldPositions } from '../../utils/formationUtils';
import { updatePlayerTimeStats, startNewStint } from '../time/stintManager';


/**
 * Manages substitution logic for different formation types
 */
export class SubstitutionManager {
  constructor(formationType) {
    this.formationType = formationType;
  }



  /**
   * Gets role from position key (delegates to shared utility)
   */
  getPositionRole(position) {
    return getPositionRole(position);
  }

  /**
   * Handles pairs substitution (7-player pairs mode)
   */
  handlePairsSubstitution(context) {
    const { 
      periodFormation, 
      nextPhysicalPairToSubOut, 
      allPlayers, 
      currentTimeEpoch,
      isSubTimerPaused = false
    } = context;

    const pairToSubOutKey = nextPhysicalPairToSubOut;
    const pairToSubInKey = 'subPair';

    const pairGettingSubbed = periodFormation[pairToSubOutKey];
    const pairComingIn = periodFormation[pairToSubInKey];

    const playersGoingOffIds = [pairGettingSubbed.defender, pairGettingSubbed.attacker].filter(Boolean);
    const playersComingOnIds = [pairComingIn.defender, pairComingIn.attacker].filter(Boolean);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(periodFormation));
    newFormation[pairToSubOutKey].defender = pairComingIn.defender;
    newFormation[pairToSubOutKey].attacker = pairComingIn.attacker;
    newFormation[pairToSubInKey].defender = pairGettingSubbed.defender;
    newFormation[pairToSubInKey].attacker = pairGettingSubbed.attacker;

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (playersGoingOffIds.includes(p.id)) {
        return {
          ...p,
          stats: {
            ...updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'substitute',
            currentPairKey: pairToSubInKey
          }
        };
      }
      if (playersComingOnIds.includes(p.id)) {
        return {
          ...p,
          stats: {
            ...updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'on_field',
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
      newNextPhysicalPairToSubOut: newNextPair
    };
  }

  /**
   * Handles individual substitution (6-player mode)
   */
  handleIndividualSubstitution(context) {
    const {
      periodFormation,
      nextPlayerIdToSubOut,
      allPlayers,
      rotationQueue,
      currentTimeEpoch,
      isSubTimerPaused = false
    } = context;

    const playerGoingOffId = nextPlayerIdToSubOut;
    const playerComingOnId = periodFormation.substitute;

    // Create rotation queue helper
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize(); // Separate active and inactive players

    // Find position of outgoing player
    const playerToSubOutKey = Object.keys(periodFormation).find(key => 
      periodFormation[key] === playerGoingOffId && key !== 'substitute' && key !== 'goalie'
    );

    const newRole = this.getPositionRole(playerToSubOutKey);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(periodFormation));
    newFormation[playerToSubOutKey] = playerComingOnId;
    newFormation.substitute = playerGoingOffId;

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (p.id === playerGoingOffId) {
        return {
          ...p,
          stats: {
            ...updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'substitute',
            currentPairKey: 'substitute',
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      if (p.id === playerComingOnId) {
        return {
          ...p,
          stats: {
            ...updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'on_field',
            currentPairKey: playerToSubOutKey,
            currentPeriodRole: newRole
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
    
    console.log('🔄 INDIVIDUAL_6 Substitution - Rotated queue:', newRotationQueue);
    console.log('🔄 INDIVIDUAL_6 Substitution - Next player to sub out:', nextPlayerToSubOutId);
    
    const fieldPositions = getFieldPositions(this.formationType);
    const nextPlayerPosition = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    return {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextPlayerToSubOut: nextPlayerPosition || 'leftDefender'
    };
  }

  /**
   * Handles 7-player individual substitution with inactive player support
   */
  handleIndividual7Substitution(context) {
    const {
      periodFormation,
      nextPlayerIdToSubOut,
      allPlayers,
      rotationQueue,
      currentTimeEpoch,
      isSubTimerPaused = false
    } = context;

    const playerGoingOffId = nextPlayerIdToSubOut;
    const playerComingOnId = periodFormation.substitute7_1;

    // Create rotation queue helper
    const queueManager = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    queueManager.initialize(); // Separate active and inactive players

    // Safety check for inactive substitute
    const substitute7_1Player = findPlayerById(allPlayers, playerComingOnId);
    if (substitute7_1Player?.stats.isInactive) {
      throw new Error('substitute7_1 is inactive but was selected for substitution');
    }

    // Check if substitute7_2 is inactive
    const substitute7_2Player = findPlayerById(allPlayers, periodFormation.substitute7_2);
    const isSubstitute7_2Inactive = substitute7_2Player?.stats.isInactive || false;

    // Find position of outgoing player
    const playerToSubOutKey = Object.keys(periodFormation).find(key => 
      periodFormation[key] === playerGoingOffId && !key.includes('substitute') && key !== 'goalie'
    );

    const newRole = this.getPositionRole(playerToSubOutKey);

    // Calculate new formation
    const newFormation = JSON.parse(JSON.stringify(periodFormation));
    newFormation[playerToSubOutKey] = playerComingOnId;

    if (isSubstitute7_2Inactive) {
      newFormation.substitute7_1 = playerGoingOffId;
    } else {
      newFormation.substitute7_1 = periodFormation.substitute7_2;
      newFormation.substitute7_2 = playerGoingOffId;
    }

    // Calculate updated players
    const updatedPlayers = allPlayers.map(p => {
      if (p.id === playerGoingOffId) {
        const newPairKey = isSubstitute7_2Inactive ? 'substitute7_1' : 'substitute7_2';
        return {
          ...p,
          stats: {
            ...updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'substitute',
            currentPairKey: newPairKey,
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      if (p.id === playerComingOnId) {
        return {
          ...p,
          stats: {
            ...updatePlayerTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'on_field',
            currentPairKey: playerToSubOutKey,
            currentPeriodRole: newRole
          }
        };
      }
      if (p.id === periodFormation.substitute7_2 && !isSubstitute7_2Inactive) {
        return {
          ...p,
          stats: {
            ...p.stats,
            currentPairKey: 'substitute7_1',
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      return p;
    });

    // For individual modes, just rotate the current queue (no rebuilding during gameplay)
    const rotationQueueManager7 = createRotationQueue(rotationQueue, createPlayerLookup(allPlayers));
    rotationQueueManager7.initialize(); // Separate active and inactive players
    
    // Move the substituted player to the end of the queue
    rotationQueueManager7.rotatePlayer(playerGoingOffId);
    const newRotationQueue = rotationQueueManager7.toArray();
    const nextPlayerToSubOutId = newRotationQueue[0];
    const nextNextPlayerIdToSubOut = newRotationQueue[1] || null;


    const fieldPositions = getFieldPositions(this.formationType);
    const nextPlayerPosition = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    return {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextNextPlayerIdToSubOut: nextNextPlayerIdToSubOut,
      newNextPlayerToSubOut: nextPlayerPosition || 'leftDefender7'
    };
  }

  /**
   * Main substitution handler - delegates to appropriate method based on formation type
   */
  executeSubstitution(context) {
    switch (this.formationType) {
      case FORMATION_TYPES.PAIRS_7:
        return this.handlePairsSubstitution(context);
      case FORMATION_TYPES.INDIVIDUAL_6:
        return this.handleIndividualSubstitution(context);
      case FORMATION_TYPES.INDIVIDUAL_7:
        return this.handleIndividual7Substitution(context);
      default:
        throw new Error(`Unknown formation type: ${this.formationType}`);
    }
  }
}

/**
 * Handles role changes within a period (like pair swaps)
 * This calculates time for the previous role and updates the player's current role
 */
export function handleRoleChange(player, newRole, currentTimeEpoch, isSubTimerPaused = false) {
  // First calculate stats for the time spent in the previous role
  const updatedStats = updatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);
  
  // Create updated player with new role
  const playerWithUpdatedStats = {
    ...player,
    stats: {
      ...updatedStats,
      currentPeriodRole: newRole
    }
  };
  
  // Start new stint if timer is not paused
  if (!isSubTimerPaused) {
    return startNewStint(playerWithUpdatedStats, currentTimeEpoch);
  }
  
  return playerWithUpdatedStats;
}

/**
 * Factory function to create substitution manager
 */
export function createSubstitutionManager(formationType) {
  return new SubstitutionManager(formationType);
}