import { FORMATIONS } from '../constants/teamConfiguration';
import { getFormationDefinition } from './formationConfigUtils';
import { PLAYER_ROLES } from '../constants/playerConstants';
import { roleToDatabase } from '../constants/roleConstants';

// Role constants for formation logic (database format for consistency)
const DB_DEFENDER = roleToDatabase(PLAYER_ROLES.DEFENDER);
const DB_ATTACKER = roleToDatabase(PLAYER_ROLES.ATTACKER);
const DB_MIDFIELDER = roleToDatabase(PLAYER_ROLES.MIDFIELDER);

// Helper to get mode definition - uses centralized formation utilities
const getDefinition = (teamConfig, selectedFormation = null) => {
  return getFormationDefinition(teamConfig, selectedFormation);
};

/**
 * Generates formation recommendations for period 3 in pair mode with role balance enforcement
 */
export const generateBalancedFormationForPeriod3 = (currentGoalieId, prevGoalieId, prevFormation, playerStats, squad) => {
  let outfielders = squad.filter(p => p.id !== currentGoalieId);
  
  // Get cumulative stats for all outfielders (excluding current goalie)
  const outfieldersWithStats = outfielders.map(p => {
    const pStats = playerStats.find(s => s.id === p.id);
    const defenderTime = (pStats?.stats.timeAsDefenderSeconds || 0) + 1; // Add 1 second to avoid division by zero
    const attackerTime = (pStats?.stats.timeAsAttackerSeconds || 0) + 1; // Add 1 second to avoid division by zero
    const timeRatio = defenderTime / attackerTime;
    
    return {
      ...p,
      defenderTime,
      attackerTime,
      timeRatio,
      totalOutfieldTime: pStats?.stats.timeOnFieldSeconds || 0,
      // Determine required role based on time balance
      requiredRole: timeRatio < 0.8 ? DB_DEFENDER : timeRatio > 1.25 ? DB_ATTACKER : null
    };
  });

  // Step 1: Role Balance Enforcement - identify players who must play specific roles
  const mustPlayDefender = outfieldersWithStats.filter(p => p.requiredRole === DB_DEFENDER);
  const mustPlayAttacker = outfieldersWithStats.filter(p => p.requiredRole === DB_ATTACKER);
  const flexiblePlayers = outfieldersWithStats.filter(p => p.requiredRole === null);

  // Step 2: Try to maintain pair integrity while respecting role requirements
  let finalPairs = [];
  let usedPlayerIds = new Set();

  // Helper function to check if a player can play a role
  const canPlayRole = (player, role) => {
    if (player.requiredRole === null) return true; // Flexible player
    return player.requiredRole === role;
  };

  // Try to maintain pairs from previous period with role swapping if possible
  if (prevFormation) {
    // Handle goalie change scenario first
    if (prevGoalieId && prevGoalieId !== currentGoalieId) {
      const exGoalie = outfieldersWithStats.find(p => p.id === prevGoalieId);
      const newGoaliePartner = findPlayerPartner(currentGoalieId, prevFormation, outfieldersWithStats);
      
      if (exGoalie && newGoaliePartner && !usedPlayerIds.has(exGoalie.id) && !usedPlayerIds.has(newGoaliePartner.id)) {
        // Determine roles for ex-goalie and orphaned partner
        const partnerPrevRole = getPlayerPreviousRole(newGoaliePartner.id, prevFormation);
        const newPartnerRole = partnerPrevRole === DB_DEFENDER ? DB_ATTACKER : DB_DEFENDER;
        const exGoalieRole = newPartnerRole === DB_DEFENDER ? DB_ATTACKER : DB_DEFENDER;
        
        // Check if this pairing respects role requirements
        if (canPlayRole(exGoalie, exGoalieRole) && canPlayRole(newGoaliePartner, newPartnerRole)) {
          const pair = newPartnerRole === DB_DEFENDER 
            ? { defender: newGoaliePartner.id, attacker: exGoalie.id }
            : { defender: exGoalie.id, attacker: newGoaliePartner.id };
          finalPairs.push(pair);
          usedPlayerIds.add(exGoalie.id);
          usedPlayerIds.add(newGoaliePartner.id);
        }
      }
    }

    // Try to preserve other pairs with role swapping
    const pairKeys = ['leftPair', 'rightPair', 'subPair'];
    for (const key of pairKeys) {
      const pair = prevFormation[key];
      if (!pair || usedPlayerIds.has(pair.defender) || usedPlayerIds.has(pair.attacker)) continue;
      
      const defender = outfieldersWithStats.find(p => p.id === pair.defender);
      const attacker = outfieldersWithStats.find(p => p.id === pair.attacker);
      
      if (defender && attacker) {
        // Try swapped roles first
        if (canPlayRole(defender, DB_ATTACKER) && canPlayRole(attacker, DB_DEFENDER)) {
          finalPairs.push({ defender: attacker.id, attacker: defender.id });
          usedPlayerIds.add(defender.id);
          usedPlayerIds.add(attacker.id);
        } else if (canPlayRole(defender, DB_DEFENDER) && canPlayRole(attacker, DB_ATTACKER)) {
          // Keep original roles if swapping doesn't work
          finalPairs.push({ defender: defender.id, attacker: attacker.id });
          usedPlayerIds.add(defender.id);
          usedPlayerIds.add(attacker.id);
        }
      }
    }
  }

  // Step 3: Handle remaining players who must play specific roles
  const remainingMustDefend = mustPlayDefender.filter(p => !usedPlayerIds.has(p.id));
  const remainingMustAttack = mustPlayAttacker.filter(p => !usedPlayerIds.has(p.id));
  const remainingFlexible = flexiblePlayers.filter(p => !usedPlayerIds.has(p.id));

  // Pair forced role players together
  while (remainingMustDefend.length > 0 && remainingMustAttack.length > 0) {
    const defender = remainingMustDefend.pop();
    const attacker = remainingMustAttack.pop();
    finalPairs.push({ defender: defender.id, attacker: attacker.id });
    usedPlayerIds.add(defender.id);
    usedPlayerIds.add(attacker.id);
  }

  // Pair remaining forced players with flexible players
  while (remainingMustDefend.length > 0 && remainingFlexible.length > 0) {
    const defender = remainingMustDefend.pop();
    const attacker = remainingFlexible.pop();
    finalPairs.push({ defender: defender.id, attacker: attacker.id });
    usedPlayerIds.add(defender.id);
    usedPlayerIds.add(attacker.id);
  }

  while (remainingMustAttack.length > 0 && remainingFlexible.length > 0) {
    const attacker = remainingMustAttack.pop();
    const defender = remainingFlexible.pop();
    finalPairs.push({ defender: defender.id, attacker: attacker.id });
    usedPlayerIds.add(defender.id);
    usedPlayerIds.add(attacker.id);
  }

  // Step 4: Handle remaining flexible players based on previous period roles
  const stillRemaining = outfieldersWithStats.filter(p => !usedPlayerIds.has(p.id));
  
  if (prevFormation) {
    stillRemaining.forEach(p => {
      const prevRole = getPlayerPreviousRole(p.id, prevFormation);
      p.recommendedRole = prevRole === DB_DEFENDER ? DB_ATTACKER : DB_DEFENDER;
    });
  }

  // Pair remaining flexible players
  while (stillRemaining.length >= 2) {
    const player1 = stillRemaining.shift();
    let player2 = null;
    
    if (player1.recommendedRole === DB_DEFENDER) {
      player2 = stillRemaining.find(p => p.recommendedRole === DB_ATTACKER) || stillRemaining[0];
      if (player2) {
        finalPairs.push({ defender: player1.id, attacker: player2.id });
      }
    } else {
      player2 = stillRemaining.find(p => p.recommendedRole === DB_DEFENDER) || stillRemaining[0];
      if (player2) {
        finalPairs.push({ defender: player2.id, attacker: player1.id });
      }
    }
    
    if (player2) {
      stillRemaining.splice(stillRemaining.indexOf(player2), 1);
    }
  }

  // Ensure we have exactly 3 pairs
  while (finalPairs.length < 3) {
    finalPairs.push({ defender: null, attacker: null });
  }
  if (finalPairs.length > 3) {
    finalPairs = finalPairs.slice(0, 3);
  }

  // Step 5: Determine substitute and first rotation recommendations
  return determineSubstituteRecommendations(finalPairs, outfieldersWithStats);
};

/**
 * Helper function to find a player's partner in the previous formation
 */
function findPlayerPartner(playerId, prevFormation, outfielders) {
  const pairKeys = ['leftPair', 'rightPair', 'subPair'];
  for (const key of pairKeys) {
    const pair = prevFormation[key];
    if (pair.defender === playerId) {
      return outfielders.find(p => p.id === pair.attacker);
    }
    if (pair.attacker === playerId) {
      return outfielders.find(p => p.id === pair.defender);
    }
  }
  return null;
}

/**
 * Helper function to get a player's previous role
 */
function getPlayerPreviousRole(playerId, prevFormation) {
  const pairKeys = ['leftPair', 'rightPair', 'subPair'];
  for (const key of pairKeys) {
    const pair = prevFormation[key];
    if (pair.defender === playerId) return DB_DEFENDER;
    if (pair.attacker === playerId) return DB_ATTACKER;
  }
  return null;
}

/**
 * Helper function to determine substitute recommendations based on playing time
 */
function determineSubstituteRecommendations(finalPairs, outfieldersWithStats) {
  // Find the pair with the player who has the most total outfield time
  let recommendedSubPair = finalPairs[0];
  let maxTime = 0;
  
  for (const pair of finalPairs) {
    if (!pair.defender || !pair.attacker) continue;
    
    const defenderStats = outfieldersWithStats.find(p => p.id === pair.defender);
    const attackerStats = outfieldersWithStats.find(p => p.id === pair.attacker);
    
    if (defenderStats && attackerStats) {
      const pairMaxTime = Math.max(defenderStats.totalOutfieldTime, attackerStats.totalOutfieldTime);
      if (pairMaxTime > maxTime) {
        maxTime = pairMaxTime;
        recommendedSubPair = pair;
      }
    }
  }

  const nonSubPairs = finalPairs.filter(p => p !== recommendedSubPair);
  
  // Among non-substitute pairs, find the one with the player having most outfield time
  let firstToRotateOffPair = nonSubPairs[0];
  let maxNonSubTime = 0;
  
  for (const pair of nonSubPairs) {
    if (!pair.defender || !pair.attacker) continue;
    
    const defenderStats = outfieldersWithStats.find(p => p.id === pair.defender);
    const attackerStats = outfieldersWithStats.find(p => p.id === pair.attacker);
    
    if (defenderStats && attackerStats) {
      const pairMaxTime = Math.max(defenderStats.totalOutfieldTime, attackerStats.totalOutfieldTime);
      if (pairMaxTime > maxNonSubTime) {
        maxNonSubTime = pairMaxTime;
        firstToRotateOffPair = pair;
      }
    }
  }

  const firstToSubDesignation = firstToRotateOffPair === nonSubPairs[0] ? 'leftPair' : 'rightPair';

  return {
    recommendedLeft: nonSubPairs[0] || { defender: null, attacker: null },
    recommendedRight: nonSubPairs[1] || { defender: null, attacker: null },
    recommendedSubs: recommendedSubPair,
    firstToSubRec: firstToSubDesignation
  };
}

/**
 * Generates formation recommendations for individual modes (6, 7, or 8+ players)
 * For Period 1 (no stats), creates basic positional rotation queue
 * For Period 2+, creates time-based rotation queue
 * 
 * @param {string} currentGoalieId - ID of the current goalie
 * @param {Array} playerStats - Array of player stats
 * @param {Array} squad - Array of squad players
 * @param {Object} teamConfig - Team configuration object
 * @param {string} selectedFormation - Formation type (2-2, 1-2-1, etc.)
 * @returns {Object} Formation recommendation with formation, rotationQueue, and nextToRotateOff
 */
const generateIndividualFormationRecommendation = (currentGoalieId, playerStats, squad, teamConfig, selectedFormation = null) => {
  const modeDefinition = getDefinition(teamConfig, selectedFormation || teamConfig?.formation);
  if (!modeDefinition) {
    return {
      formation: { goalie: currentGoalieId },
      rotationQueue: [],
      nextToRotateOff: null
    };
  }

  const formationKey = selectedFormation || teamConfig?.formation || FORMATIONS.FORMATION_2_2;

  if (formationKey === FORMATIONS.FORMATION_1_2_1) {
    return generate121FormationRecommendation(currentGoalieId, playerStats, squad, teamConfig);
  }

  if (formationKey === FORMATIONS.FORMATION_2_2) {
    return generate22FormationRecommendation(currentGoalieId, playerStats, squad, teamConfig);
  }

  return generateFormationRecommendation(currentGoalieId, playerStats, squad, teamConfig, formationKey);
};

/**
 * Generate formation recommendations for both 2-2 and 1-2-1 formations (consolidated logic)
 */
const generateFormationRecommendation = (currentGoalieId, playerStats, squad, teamConfig, formation) => {
  const outfielders = squad.filter(p => p.id !== currentGoalieId);
  
  // Get stats for all outfielders - include midfielder time for 1-2-1 formations
  const outfieldersWithStats = outfielders.map(p => {
    const pStats = playerStats.find(s => s.id === p.id);
    const defenderTime = pStats?.stats.timeAsDefenderSeconds || 0;
    const midfielderTime = pStats?.stats.timeAsMidfielderSeconds || 0;
    const attackerTime = pStats?.stats.timeAsAttackerSeconds || 0;
    const totalOutfieldTime = pStats?.stats.timeOnFieldSeconds || 0;
    
    const baseStats = {
      ...p,
      totalOutfieldTime,
      defenderTime,
      midfielderTime,
      attackerTime,
      isInactive: pStats?.stats.isInactive || false
    };

    // Add formation-specific stats
    if (formation === FORMATIONS.FORMATION_1_2_1) {
      return {
        ...baseStats,
        // Calculate role deficits for 1-2-1 balancing
        defenderDeficit: calculateRoleDeficit(defenderTime, midfielderTime, attackerTime, DB_DEFENDER),
        midfielderDeficit: calculateRoleDeficit(defenderTime, midfielderTime, attackerTime, DB_MIDFIELDER),
        attackerDeficit: calculateRoleDeficit(defenderTime, midfielderTime, attackerTime, DB_ATTACKER)
      };
    } else {
      return {
        ...baseStats,
        // Calculate surplus attacker time for 2-2 balancing
        surplusAttackerTime: attackerTime - defenderTime
      };
    }
  });

  // Separate active and inactive players
  const activePlayers = outfieldersWithStats.filter(p => !p.isInactive);
  const inactivePlayers = outfieldersWithStats.filter(p => p.isInactive);

  // Handle the case where there are no active substitutes (≤4 active players)
  if (activePlayers.length <= 4) {
    return handleLimitedPlayersFormation(currentGoalieId, activePlayers, inactivePlayers, teamConfig, formation);
  }

  // Create rotation queue for active players - Fixed: Ensure field players come first
  
  // Get mode configuration to determine positions
  const modeConfig = getDefinition(teamConfig, formation);
  
  // For formation recommendation, we don't have existing formation data
  // So we'll determine field vs substitute based on time (least time = field players)
  const sortedByTime = activePlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
  const fieldSlotCount = modeConfig?.fieldPositions?.length || 4;
  const currentFieldPlayers = sortedByTime.slice(0, fieldSlotCount);
  const currentSubstitutes = sortedByTime.slice(fieldSlotCount);
  
  
  // Sort field players by most time first (ready to rotate off)
  const fieldPlayersOrdered = currentFieldPlayers.sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);
  
  // Sort substitutes by least time first (ready to come on)
  const substitutesOrdered = currentSubstitutes.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
  
  // Build rotation queue: field players first (can rotate off), then substitutes
  const rotationQueue = [...fieldPlayersOrdered, ...substitutesOrdered];
  

  // Create formation based on type - Fixed: Use players with least time for field positions
  // We want the 4 players with the least total time to be on the field (for fairness)
  const playersForField = activePlayers
    .sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime)
    .slice(0, fieldSlotCount);
  
  
  let formationResult;

  if (formation === FORMATIONS.FORMATION_1_2_1) {
    const positionAssignments = assign121Positions(playersForField);
    formationResult = {
      goalie: currentGoalieId,
      defender: positionAssignments.defender?.id || null,
      left: positionAssignments.left?.id || null,
      right: positionAssignments.right?.id || null,
      attacker: positionAssignments.attacker?.id || null
    };
  } else if (formation === FORMATIONS.FORMATION_2_2) {
    const fieldPlayersByAttackerSurplus = [...playersForField].sort((a, b) => b.surplusAttackerTime - a.surplusAttackerTime);
    const defenders = fieldPlayersByAttackerSurplus.slice(0, 2);
    const attackers = fieldPlayersByAttackerSurplus.slice(2, 4);

    formationResult = {
      goalie: currentGoalieId,
      leftDefender: defenders[0]?.id || null,
      rightDefender: defenders[1]?.id || null,
      leftAttacker: attackers[0]?.id || null,
      rightAttacker: attackers[1]?.id || null
    };
  } else {
    formationResult = buildFormationForMode(currentGoalieId, modeConfig, playersForField, substitutesOrdered, inactivePlayers);
  }

  const substitutePositions = modeConfig?.substitutePositions || [];
  addSubstitutePositions(formationResult, substitutePositions, substitutesOrdered, inactivePlayers);

  // Ensure nextToRotateOff is always a field player (never a substitute)
  const nextToRotateOff = fieldPlayersOrdered[0]?.id || null;

  return {
    formation: formationResult,
    rotationQueue: rotationQueue.map(p => p.id),
    nextToRotateOff: nextToRotateOff
  };
};

const buildFormationForMode = (currentGoalieId, modeDefinition, playersForField, substitutesOrdered, inactivePlayers) => {
  const formation = { goalie: currentGoalieId };
  const remainingPlayers = [...playersForField];

  const defenderPositions = (modeDefinition.fieldPositions || []).filter(position => position.toLowerCase().includes('defender'));
  const midfielderPositions = (modeDefinition.fieldPositions || []).filter(position => position.toLowerCase().includes('mid'));
  const attackerPositions = (modeDefinition.fieldPositions || []).filter(position => position.toLowerCase().includes('attack') || position === 'attacker');

  const assignRolePositions = (positions, role) => {
    positions.forEach(position => {
      remainingPlayers.sort((a, b) => getRoleTimeByKey(a, role) - getRoleTimeByKey(b, role));
      const player = remainingPlayers.shift();
      formation[position] = player?.id || null;
    });
  };

  assignRolePositions(defenderPositions, 'defender');
  assignRolePositions(midfielderPositions, 'midfielder');
  assignRolePositions(attackerPositions, 'attacker');

  const unfilledPositions = (modeDefinition.fieldPositions || []).filter(position => formation[position] === undefined);
  if (unfilledPositions.length > 0 && remainingPlayers.length > 0) {
    remainingPlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
    unfilledPositions.forEach((position, index) => {
      formation[position] = remainingPlayers[index]?.id || null;
    });
  }

  const substitutePositions = modeDefinition.substitutePositions || [];
  addSubstitutePositions(formation, substitutePositions, substitutesOrdered, inactivePlayers);

  return formation;
};

const getRoleTimeByKey = (player, role) => {
  switch (role) {
    case 'defender':
      return player.defenderTime ?? 0;
    case 'midfielder':
      return player.midfielderTime ?? 0;
    case 'attacker':
      return player.attackerTime ?? 0;
    default:
      return player.totalOutfieldTime ?? 0;
  }
};

/**
 * Handle formation when there are ≤4 active players (consolidated for both formations)
 */
const handleLimitedPlayersFormation = (currentGoalieId, activePlayers, inactivePlayers, teamConfig, formation) => {
  const availableActivePlayers = activePlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
  const modeConfig = getDefinition(teamConfig, formation);
  const fieldPositions = modeConfig?.fieldPositions || [];
  const substitutePositions = modeConfig?.substitutePositions || [];

  const formationResult = { goalie: currentGoalieId };

  fieldPositions.forEach((position, index) => {
    formationResult[position] = availableActivePlayers[index]?.id || null;
  });

  const remainingActive = availableActivePlayers.slice(fieldPositions.length);
  addSubstitutePositions(formationResult, substitutePositions, remainingActive, inactivePlayers);
  
  return {
    formation: formationResult,
    rotationQueue: [],
    nextToRotateOff: null
  };
};

/**
 * Add substitute positions to formation (consolidated logic)
 */
const addSubstitutePositions = (formation, substitutePositions, activeSubstitutes, inactivePlayers) => {
  const activeIds = activeSubstitutes.map(player => player.id);
  const inactiveIds = inactivePlayers.map(player => player.id);

  substitutePositions.forEach((positionKey, index) => {
    if (index < activeIds.length) {
      formation[positionKey] = activeIds[index] || null;
    } else {
      const inactiveIndex = index - activeIds.length;
      formation[positionKey] = inactiveIds[inactiveIndex] || null;
    }
  });
};

/**
 * Generate formation recommendations for 2-2 formation (wrapper)
 */
const generate22FormationRecommendation = (currentGoalieId, playerStats, squad, teamConfig) => {
  return generateFormationRecommendation(currentGoalieId, playerStats, squad, teamConfig, FORMATIONS.FORMATION_2_2);
};

/**
 * Generate formation recommendations for 1-2-1 formation (wrapper)
 */
const generate121FormationRecommendation = (currentGoalieId, playerStats, squad, teamConfig) => {
  return generateFormationRecommendation(currentGoalieId, playerStats, squad, teamConfig, FORMATIONS.FORMATION_1_2_1);
};

/**
 * Calculate role deficit for time balancing in 1-2-1 formation
 */
const calculateRoleDeficit = (defenderTime, midfielderTime, attackerTime, role) => {
  const totalOutfieldTime = defenderTime + midfielderTime + attackerTime;
  
  if (totalOutfieldTime === 0) return 0;
  
  const expectedRoleTime = totalOutfieldTime / 3; // Equal distribution across 3 roles
  let currentRoleTime;
  
  switch (role) {
    case DB_DEFENDER:
      currentRoleTime = defenderTime;
      break;
    case DB_MIDFIELDER:
      currentRoleTime = midfielderTime;
      break;
    case DB_ATTACKER:
      currentRoleTime = attackerTime;
      break;
    default:
      return 0;
  }
  
  return Math.max(0, expectedRoleTime - currentRoleTime);
};

/**
 * Assign 1-2-1 positions ensuring no conflicts
 */
const assign121Positions = (fieldPlayers) => {
  // Sort candidates by role deficits
  const defenderCandidates = [...fieldPlayers].sort((a, b) => b.defenderDeficit - a.defenderDeficit);
  const midfielderCandidates = [...fieldPlayers].sort((a, b) => b.midfielderDeficit - a.midfielderDeficit);
  const attackerCandidates = [...fieldPlayers].sort((a, b) => b.attackerDeficit - a.attackerDeficit);
  
  const assignments = {};
  const usedPlayers = new Set();
  
  // Assign defender first (highest deficit)
  const defender = defenderCandidates.find(p => !usedPlayers.has(p.id));
  if (defender) {
    assignments.defender = defender;
    usedPlayers.add(defender.id);
  }
  
  // Assign attacker second (highest deficit among remaining)
  const attacker = attackerCandidates.find(p => !usedPlayers.has(p.id));
  if (attacker) {
    assignments.attacker = attacker;
    usedPlayers.add(attacker.id);
  }
  
  // Assign midfielders (highest deficits among remaining)
  const midfielders = midfielderCandidates.filter(p => !usedPlayers.has(p.id)).slice(0, 2);
  assignments.left = midfielders[0] || null;
  assignments.right = midfielders[1] || null;
  
  // Fill any missing positions with remaining players
  const remainingPlayers = fieldPlayers.filter(p => !usedPlayers.has(p.id));
  if (!assignments.left && remainingPlayers.length > 0) {
    assignments.left = remainingPlayers.shift();
  }
  if (!assignments.right && remainingPlayers.length > 0) {
    assignments.right = remainingPlayers.shift();
  }
  
  return assignments;
};


/**
 * Generates formation recommendations for periods 2+ in pair mode
 */
export const generateRecommendedFormation = (currentPeriodNum, currentGoalieId, prevGoalieId, prevFormation, playerStats, squad) => {
  // For period 3, apply position balancing rules
  if (currentPeriodNum === 3) {
    return generateBalancedFormationForPeriod3(currentGoalieId, prevGoalieId, prevFormation, playerStats, squad);
  }

  // Period 2 logic: Maintain pair integrity with role swapping
  let outfielders = squad.filter(p => p.id !== currentGoalieId);
  let potentialPairs = [];
  let usedPlayerIds = new Set();

  // Step 1: Handle goalie change and pair the ex-goalie with the orphaned partner
  if (prevGoalieId && prevGoalieId !== currentGoalieId && prevFormation) {
    const exGoalie = outfielders.find(p => p.id === prevGoalieId);
    const newGoaliePartner = findPlayerPartner(currentGoalieId, prevFormation, outfielders);
    
    if (exGoalie && newGoaliePartner && exGoalie.id !== newGoaliePartner.id) {
      // The orphaned partner changes role, ex-goalie takes the vacant role
      const partnerPrevRole = getPlayerPreviousRole(newGoaliePartner.id, prevFormation);
      const newPartnerRole = partnerPrevRole === DB_DEFENDER ? DB_ATTACKER : DB_DEFENDER;
      
      const pair = newPartnerRole === DB_DEFENDER 
        ? { defender: newGoaliePartner.id, attacker: exGoalie.id }
        : { defender: exGoalie.id, attacker: newGoaliePartner.id };
      
      potentialPairs.push(pair);
      usedPlayerIds.add(exGoalie.id);
      usedPlayerIds.add(newGoaliePartner.id);
    }
  }

  // Step 2: Preserve other pairs with swapped defender/attacker roles
  if (prevFormation) {
    const pairKeys = ['leftPair', 'rightPair', 'subPair'];
    for (const key of pairKeys) {
      const pair = prevFormation[key];
      if (!pair || usedPlayerIds.has(pair.defender) || usedPlayerIds.has(pair.attacker)) continue;
      
      const defender = outfielders.find(p => p.id === pair.defender);
      const attacker = outfielders.find(p => p.id === pair.attacker);
      
      if (defender && attacker) {
        // Swap roles for position balance
        potentialPairs.push({ defender: attacker.id, attacker: defender.id });
        usedPlayerIds.add(defender.id);
        usedPlayerIds.add(attacker.id);
      }
    }
  }

  // Step 3: Handle any remaining players (shouldn't happen in normal 7-player scenario)
  const remainingPlayers = outfielders.filter(p => !usedPlayerIds.has(p.id));
  for (let i = 0; i < remainingPlayers.length; i += 2) {
    if (remainingPlayers[i + 1]) {
      potentialPairs.push({ 
        defender: remainingPlayers[i].id, 
        attacker: remainingPlayers[i + 1].id 
      });
    }
  }

  // Ensure exactly 3 pairs
  while (potentialPairs.length < 3) {
    potentialPairs.push({ defender: null, attacker: null });
  }
  if (potentialPairs.length > 3) {
    potentialPairs = potentialPairs.slice(0, 3);
  }

  // Step 4: Determine substitute and rotation recommendations
  const outfieldersWithStats = outfielders.map(p => {
    const pStats = playerStats.find(s => s.id === p.id);
    return { 
      ...p, 
      totalOutfieldTime: pStats?.stats.timeOnFieldSeconds || 0 
    };
  });

  return determineSubstituteRecommendations(potentialPairs, outfieldersWithStats);
};

// Export the individual formation function
export { generateIndividualFormationRecommendation };
