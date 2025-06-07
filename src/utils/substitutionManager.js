import { PLAYER_ROLES, FORMATION_TYPES } from './gameLogic';
import { createRotationQueue } from './rotationQueue';

/**
 * Calculates updated time stats for a player based on their current status and role
 * This is shared logic used by both substitutions and period end calculations
 */
export function calculatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused = false) {
  const stats = { ...player.stats };
  
  // If timer is paused, don't calculate any time progression
  if (isSubTimerPaused) {
    return {
      ...stats
      // Don't update lastStintStartTimeEpoch when paused
    };
  }
  
  // Only calculate time if lastStintStartTimeEpoch is properly set (not 0)
  const timeInPreviousStint = (stats.lastStintStartTimeEpoch && stats.lastStintStartTimeEpoch > 0) 
    ? Math.round((currentTimeEpoch - stats.lastStintStartTimeEpoch) / 1000) 
    : 0;

  if (stats.currentPeriodStatus === 'on_field') {
    stats.timeOnFieldSeconds += timeInPreviousStint;
    if (stats.currentPeriodRole === PLAYER_ROLES.DEFENDER) {
      stats.timeAsDefenderSeconds += timeInPreviousStint;
    } else if (stats.currentPeriodRole === PLAYER_ROLES.ATTACKER) {
      stats.timeAsAttackerSeconds += timeInPreviousStint;
    }
  } else if (stats.currentPeriodStatus === 'substitute') {
    stats.timeAsSubSeconds += timeInPreviousStint;
  } else if (stats.currentPeriodStatus === 'goalie') {
    stats.timeAsGoalieSeconds += timeInPreviousStint;
  }

  return {
    ...stats,
    lastStintStartTimeEpoch: currentTimeEpoch
  };
}

/**
 * Manages substitution logic for different formation types
 */
export class SubstitutionManager {
  constructor(formationType) {
    this.formationType = formationType;
  }

  /**
   * Calculates time stats for players during substitution
   */
  calculateTimeStats(player, currentTimeEpoch, isSubTimerPaused = false) {
    return calculatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);
  }

  /**
   * Gets role from position key
   */
  getPositionRole(position) {
    if (position?.includes('Defender') || position?.includes('defender')) {
      return PLAYER_ROLES.DEFENDER;
    } else if (position?.includes('Attacker') || position?.includes('attacker')) {
      return PLAYER_ROLES.ATTACKER;
    } else if (position?.includes('substitute')) {
      return PLAYER_ROLES.SUBSTITUTE;
    } else if (position === 'goalie') {
      return PLAYER_ROLES.GOALIE;
    }
    return null;
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
            ...this.calculateTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'substitute',
            currentPairKey: pairToSubInKey
          }
        };
      }
      if (playersComingOnIds.includes(p.id)) {
        return {
          ...p,
          stats: {
            ...this.calculateTimeStats(p, currentTimeEpoch, isSubTimerPaused),
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
    const queueManager = createRotationQueue(rotationQueue, (id) => allPlayers.find(p => p.id === id));
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
            ...this.calculateTimeStats(p, currentTimeEpoch, isSubTimerPaused),
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
            ...this.calculateTimeStats(p, currentTimeEpoch, isSubTimerPaused),
            currentPeriodStatus: 'on_field',
            currentPairKey: playerToSubOutKey,
            currentPeriodRole: newRole
          }
        };
      }
      return p;
    });

    // Update rotation queue using the queue manager
    queueManager.rotatePlayer(playerGoingOffId);
    const nextPlayerToSubOutId = queueManager.getNextActivePlayer();
    
    const outfieldPositions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
    const nextPlayerPosition = outfieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    return {
      newFormation,
      updatedPlayers,
      newRotationQueue: queueManager.toArray(),
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
    const queueManager = createRotationQueue(rotationQueue, (id) => allPlayers.find(p => p.id === id));
    queueManager.initialize(); // Separate active and inactive players

    // Safety check for inactive substitute
    const substitute7_1Player = allPlayers.find(p => p.id === playerComingOnId);
    if (substitute7_1Player?.stats.isInactive) {
      throw new Error('substitute7_1 is inactive but was selected for substitution');
    }

    // Check if substitute7_2 is inactive
    const substitute7_2Player = allPlayers.find(p => p.id === periodFormation.substitute7_2);
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
            ...this.calculateTimeStats(p, currentTimeEpoch, isSubTimerPaused),
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
            ...this.calculateTimeStats(p, currentTimeEpoch, isSubTimerPaused),
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

    // Update rotation queue using the queue manager
    queueManager.rotatePlayer(playerGoingOffId);
    const nextActivePlayer = queueManager.getNextActivePlayer();
    const nextTwoActivePlayers = queueManager.getNextActivePlayer(2);
    const nextPlayerToSubOutId = nextActivePlayer;
    const nextNextPlayerIdToSubOut = nextTwoActivePlayers[1] || null;

    const outfieldPositions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'];
    const nextPlayerPosition = outfieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    return {
      newFormation,
      updatedPlayers,
      newRotationQueue: queueManager.toArray(),
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
  const updatedStats = calculatePlayerTimeStats(player, currentTimeEpoch, isSubTimerPaused);
  
  // Update the role and reset the stint timer (only if not paused)
  return {
    ...updatedStats,
    currentPeriodRole: newRole,
    lastStintStartTimeEpoch: isSubTimerPaused ? updatedStats.lastStintStartTimeEpoch : currentTimeEpoch
  };
}

/**
 * Factory function to create substitution manager
 */
export function createSubstitutionManager(formationType) {
  return new SubstitutionManager(formationType);
}