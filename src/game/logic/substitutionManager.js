import { PLAYER_ROLES, TEAM_MODES } from '../../constants/playerConstants';
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
   */
  handlePairsSubstitution(context) {
    const { 
      periodFormation, 
      nextPhysicalPairToSubOut, 
      allPlayers, 
      currentTimeEpoch,
      isSubTimerPaused
    } = context;
    
    console.log(`🔧 DEBUG handlePairsSubstitution - Context received:`);
    console.log(`  ⏸️ isSubTimerPaused from context: ${isSubTimerPaused}`);
    console.log(`  💥 BUT this parameter is being IGNORED in substitution logic!`);

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
        console.log(`🟡 DEBUG PAIRS SUBSTITUTION - Player ${p.id} (${p.name}) going OFF:`);
        console.log(`  📊 BEFORE: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        console.log(`  ⏱️ Current stint start: ${p.stats.lastStintStartTimeEpoch}, current time: ${currentTimeEpoch}`);
        const stintDuration = p.stats.lastStintStartTimeEpoch ? Math.round((currentTimeEpoch - p.stats.lastStintStartTimeEpoch) / 1000) : 0;
        console.log(`  ⏰ Current stint duration: ${stintDuration}s`);
        
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        console.log(`  📊 AFTER ${isSubTimerPaused ? 'resetPlayerStintTimer' : 'updatePlayerTimeStats'}: timeOnField=${timeResult.stats.timeOnFieldSeconds}s, timeAsAttacker=${timeResult.stats.timeAsAttackerSeconds}s, timeAsDefender=${timeResult.stats.timeAsDefenderSeconds}s`);
        
        if (isSubTimerPaused) {
          console.log(`  ✅ CORRECT: ${stintDuration}s of paused time NOT added (no double counting)`);
        } else {
          console.log(`  ✅ FIXED: ${stintDuration}s of active time added to accumulated stats`);
        }
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentPeriodStatus: 'substitute',
            currentPairKey: pairToSubInKey
          }
        };
      }
      if (playersComingOnIds.includes(p.id)) {
        console.log(`🟢 DEBUG PAIRS SUBSTITUTION - Player ${p.id} (${p.name}) coming ON:`);
        console.log(`  📊 BEFORE: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        console.log(`  📊 AFTER ${isSubTimerPaused ? 'resetPlayerStintTimer' : 'updatePlayerTimeStats'}: timeOnField=${timeResult.stats.timeOnFieldSeconds}s, timeAsAttacker=${timeResult.stats.timeAsAttackerSeconds}s, timeAsDefender=${timeResult.stats.timeAsDefenderSeconds}s`);
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
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
      newNextPhysicalPairToSubOut: newNextPair,
      playersComingOnIds: playersComingOnIds
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
      isSubTimerPaused
    } = context;
    
    console.log(`🔧 DEBUG handleIndividualSubstitution - Context received:`);
    console.log(`  ⏸️ isSubTimerPaused from context: ${isSubTimerPaused}`);
    console.log(`  💥 BUT this parameter is being IGNORED in substitution logic!`);

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
        console.log(`🟡 DEBUG INDIVIDUAL_6 SUBSTITUTION - Player ${p.id} (${p.name}) going OFF:`);
        console.log(`  📊 BEFORE: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        console.log(`  ⏱️ Current stint start: ${p.stats.lastStintStartTimeEpoch}, current time: ${currentTimeEpoch}`);
        const stintDuration = p.stats.lastStintStartTimeEpoch ? Math.round((currentTimeEpoch - p.stats.lastStintStartTimeEpoch) / 1000) : 0;
        console.log(`  ⏰ Current stint duration: ${stintDuration}s`);
        
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        console.log(`  📊 AFTER ${isSubTimerPaused ? 'resetPlayerStintTimer' : 'updatePlayerTimeStats'}: timeOnField=${timeResult.stats.timeOnFieldSeconds}s, timeAsAttacker=${timeResult.stats.timeAsAttackerSeconds}s, timeAsDefender=${timeResult.stats.timeAsDefenderSeconds}s`);
        
        if (isSubTimerPaused) {
          console.log(`  ✅ CORRECT: ${stintDuration}s of paused time NOT added (no double counting)`);
        } else {
          console.log(`  ✅ FIXED: ${stintDuration}s of active time added to accumulated stats`);
        }
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentPeriodStatus: 'substitute',
            currentPairKey: 'substitute',
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      if (p.id === playerComingOnId) {
        console.log(`🟢 DEBUG INDIVIDUAL_6 SUBSTITUTION - Player ${p.id} (${p.name}) coming ON:`);
        console.log(`  📊 BEFORE: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        console.log(`  📊 AFTER ${isSubTimerPaused ? 'resetPlayerStintTimer' : 'updatePlayerTimeStats'}: timeOnField=${timeResult.stats.timeOnFieldSeconds}s, timeAsAttacker=${timeResult.stats.timeAsAttackerSeconds}s, timeAsDefender=${timeResult.stats.timeAsDefenderSeconds}s`);
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
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

    const fieldPositions = getFieldPositions(this.teamMode);
    const nextPlayerPosition = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    return {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextPlayerToSubOut: nextPlayerPosition || 'leftDefender',
      playersComingOnIds: [playerComingOnId]
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
      isSubTimerPaused
    } = context;
    
    console.log(`🔧 DEBUG handleIndividual7Substitution - Context received:`);
    console.log(`  ⏸️ isSubTimerPaused from context: ${isSubTimerPaused}`);
    console.log(`  💥 BUT this parameter is being IGNORED in substitution logic!`);

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
        console.log(`🟡 DEBUG INDIVIDUAL_7 SUBSTITUTION - Player ${p.id} (${p.name}) going OFF:`);
        console.log(`  📊 BEFORE: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        console.log(`  ⏱️ Current stint start: ${p.stats.lastStintStartTimeEpoch}, current time: ${currentTimeEpoch}`);
        const stintDuration = p.stats.lastStintStartTimeEpoch ? Math.round((currentTimeEpoch - p.stats.lastStintStartTimeEpoch) / 1000) : 0;
        console.log(`  ⏰ Current stint duration: ${stintDuration}s`);
        
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        console.log(`  📊 AFTER ${isSubTimerPaused ? 'resetPlayerStintTimer' : 'updatePlayerTimeStats'}: timeOnField=${timeResult.stats.timeOnFieldSeconds}s, timeAsAttacker=${timeResult.stats.timeAsAttackerSeconds}s, timeAsDefender=${timeResult.stats.timeAsDefenderSeconds}s`);
        
        if (isSubTimerPaused) {
          console.log(`  ✅ CORRECT: ${stintDuration}s of paused time NOT added (no double counting)`);
        } else {
          console.log(`  ✅ FIXED: ${stintDuration}s of active time added to accumulated stats`);
        }
        
        const newPairKey = isSubstitute7_2Inactive ? 'substitute7_1' : 'substitute7_2';
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentPeriodStatus: 'substitute',
            currentPairKey: newPairKey,
            currentPeriodRole: PLAYER_ROLES.SUBSTITUTE
          }
        };
      }
      if (p.id === playerComingOnId) {
        console.log(`🟢 DEBUG INDIVIDUAL_7 SUBSTITUTION - Player ${p.id} (${p.name}) coming ON:`);
        console.log(`  📊 BEFORE: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        
        // Use conditional time tracking based on timer pause state
        const timeResult = isSubTimerPaused 
          ? resetPlayerStintTimer(p, currentTimeEpoch)  // During pause: don't add time
          : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) }; // Normal: add time
        
        console.log(`  📊 AFTER ${isSubTimerPaused ? 'resetPlayerStintTimer' : 'updatePlayerTimeStats'}: timeOnField=${timeResult.stats.timeOnFieldSeconds}s, timeAsAttacker=${timeResult.stats.timeAsAttackerSeconds}s, timeAsDefender=${timeResult.stats.timeAsDefenderSeconds}s`);
        
        return {
          ...p,
          stats: {
            ...timeResult.stats,
            currentPeriodStatus: 'on_field',
            currentPairKey: playerToSubOutKey,
            currentPeriodRole: newRole
          }
        };
      }
      if (p.id === periodFormation.substitute7_2 && !isSubstitute7_2Inactive) {
        console.log(`🔄 DEBUG INDIVIDUAL_7 SUBSTITUTION - Player ${p.id} (${p.name}) moving from substitute7_2 to substitute7_1:`);
        console.log(`  📊 Stats unchanged: timeOnField=${p.stats.timeOnFieldSeconds}s, timeAsAttacker=${p.stats.timeAsAttackerSeconds}s, timeAsDefender=${p.stats.timeAsDefenderSeconds}s`);
        
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


    const fieldPositions = getFieldPositions(this.teamMode);
    const nextPlayerPosition = fieldPositions.find(pos => 
      newFormation[pos] === nextPlayerToSubOutId
    );

    return {
      newFormation,
      updatedPlayers,
      newRotationQueue: newRotationQueue,
      newNextPlayerIdToSubOut: nextPlayerToSubOutId,
      newNextNextPlayerIdToSubOut: nextNextPlayerIdToSubOut,
      newNextPlayerToSubOut: nextPlayerPosition || 'leftDefender7',
      playersComingOnIds: [playerComingOnId]
    };
  }

  /**
   * Main substitution handler - delegates to appropriate method based on team mode
   */
  executeSubstitution(context) {
    switch (this.teamMode) {
      case TEAM_MODES.PAIRS_7:
        return this.handlePairsSubstitution(context);
      case TEAM_MODES.INDIVIDUAL_6:
        return this.handleIndividualSubstitution(context);
      case TEAM_MODES.INDIVIDUAL_7:
        return this.handleIndividual7Substitution(context);
      default:
        throw new Error(`Unknown team mode: ${this.teamMode}`);
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