import { FORMATIONS } from '../constants/teamConfiguration';
import { getFormationDefinition } from './formationConfigUtils';

// Helper to get mode definition - uses centralized formation utilities
const getDefinition = (teamModeOrConfig, selectedFormation = null) => {
  return getFormationDefinition(teamModeOrConfig, selectedFormation);
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
      requiredRole: timeRatio < 0.8 ? 'defender' : timeRatio > 1.25 ? 'attacker' : null
    };
  });

  // Step 1: Role Balance Enforcement - identify players who must play specific roles
  const mustPlayDefender = outfieldersWithStats.filter(p => p.requiredRole === 'defender');
  const mustPlayAttacker = outfieldersWithStats.filter(p => p.requiredRole === 'attacker');
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
        const newPartnerRole = partnerPrevRole === 'defender' ? 'attacker' : 'defender';
        const exGoalieRole = newPartnerRole === 'defender' ? 'attacker' : 'defender';
        
        // Check if this pairing respects role requirements
        if (canPlayRole(exGoalie, exGoalieRole) && canPlayRole(newGoaliePartner, newPartnerRole)) {
          const pair = newPartnerRole === 'defender' 
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
        if (canPlayRole(defender, 'attacker') && canPlayRole(attacker, 'defender')) {
          finalPairs.push({ defender: attacker.id, attacker: defender.id });
          usedPlayerIds.add(defender.id);
          usedPlayerIds.add(attacker.id);
        } else if (canPlayRole(defender, 'defender') && canPlayRole(attacker, 'attacker')) {
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
      p.recommendedRole = prevRole === 'defender' ? 'attacker' : 'defender';
    });
  }

  // Pair remaining flexible players
  while (stillRemaining.length >= 2) {
    const player1 = stillRemaining.shift();
    let player2 = null;
    
    if (player1.recommendedRole === 'defender') {
      player2 = stillRemaining.find(p => p.recommendedRole === 'attacker') || stillRemaining[0];
      if (player2) {
        finalPairs.push({ defender: player1.id, attacker: player2.id });
      }
    } else {
      player2 = stillRemaining.find(p => p.recommendedRole === 'defender') || stillRemaining[0];
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
    if (pair.defender === playerId) return 'defender';
    if (pair.attacker === playerId) return 'attacker';
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
 * @param {string|Object} teamMode - Team mode string or team config object
 * @param {string} selectedFormation - Formation type (2-2, 1-2-1, etc.)
 * @returns {Object} Formation recommendation with formation, rotationQueue, and nextToRotateOff
 */
const generateIndividualFormationRecommendation = (currentGoalieId, playerStats, squad, teamMode, selectedFormation = null) => {
  // Extract formation from team config or direct parameter
  const formation = selectedFormation || 
    (typeof teamMode === 'object' ? teamMode.formation : null) ||
    FORMATIONS.FORMATION_2_2; // Default to 2-2 formation
  
  // Route to appropriate algorithm based on formation type
  if (formation === FORMATIONS.FORMATION_1_2_1) {
    return generate121FormationRecommendation(currentGoalieId, playerStats, squad, teamMode);
  }
  
  // Default to existing 2-2 algorithm
  return generate22FormationRecommendation(currentGoalieId, playerStats, squad, teamMode);
};

/**
 * Generate formation recommendations for both 2-2 and 1-2-1 formations (consolidated logic)
 */
const generateFormationRecommendation = (currentGoalieId, playerStats, squad, teamMode, formation) => {
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
        defenderDeficit: calculateRoleDeficit(defenderTime, midfielderTime, attackerTime, 'defender'),
        midfielderDeficit: calculateRoleDeficit(defenderTime, midfielderTime, attackerTime, 'midfielder'),
        attackerDeficit: calculateRoleDeficit(defenderTime, midfielderTime, attackerTime, 'attacker')
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
    return handleLimitedPlayersFormation(currentGoalieId, activePlayers, inactivePlayers, teamMode, formation);
  }

  // Create rotation queue for active players - Fixed: Ensure field players come first
  
  // Get mode configuration to determine positions
  const modeConfig = getDefinition(teamMode, formation);
  
  // For formation recommendation, we don't have existing formation data
  // So we'll determine field vs substitute based on time (least time = field players)
  const sortedByTime = activePlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
  const currentFieldPlayers = sortedByTime.slice(0, 4); // 4 field players
  const currentSubstitutes = sortedByTime.slice(4); // Remaining are substitutes
  
  
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
    .slice(0, 4);
  
  
  let formationResult;

  if (formation === FORMATIONS.FORMATION_1_2_1) {
    // Assign 1-2-1 positions based on role deficits
    const positionAssignments = assign121Positions(playersForField);
    formationResult = {
      goalie: currentGoalieId,
      defender: positionAssignments.defender?.id || null,
      left: positionAssignments.left?.id || null,
      right: positionAssignments.right?.id || null,
      attacker: positionAssignments.attacker?.id || null
    };
  } else {
    // Assign 2-2 positions based on surplus attacker time
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
  }

  // Add substitute positions dynamically based on mode configuration
  const substitutePositions = modeConfig?.substitutePositions || [];
  const activeSubstitutes = rotationQueue.slice(4);

  addSubstitutePositions(formationResult, substitutePositions, activeSubstitutes, inactivePlayers, rotationQueue);

  // Ensure nextToRotateOff is always a field player (never a substitute)
  const nextToRotateOff = fieldPlayersOrdered[0]?.id || null;

  return {
    formation: formationResult,
    rotationQueue: rotationQueue.map(p => p.id),
    nextToRotateOff: nextToRotateOff
  };
};

/**
 * Handle formation when there are ≤4 active players (consolidated for both formations)
 */
const handleLimitedPlayersFormation = (currentGoalieId, activePlayers, inactivePlayers, teamMode, formation) => {
  const availableActivePlayers = activePlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);
  
  let formationResult = { goalie: currentGoalieId };
  
  // Get mode configuration to determine positions
  const modeConfig = getDefinition(teamMode, formation);
  const fieldPositions = modeConfig?.fieldPositions || [];
  const substitutePositions = modeConfig?.substitutePositions || [];
  
  // Assign field positions based on formation type
  if (availableActivePlayers.length >= 4) {
    if (formation === FORMATIONS.FORMATION_1_2_1) {
      const fieldAssignments = assign121Positions(availableActivePlayers.slice(0, 4));
      formationResult.defender = fieldAssignments.defender?.id || null;
      formationResult.left = fieldAssignments.left?.id || null;
      formationResult.right = fieldAssignments.right?.id || null;
      formationResult.attacker = fieldAssignments.attacker?.id || null;
    } else {
      // 2-2 formation
      const fieldPlayersByAttackerSurplus = [...availableActivePlayers.slice(0, 4)]
        .sort((a, b) => b.surplusAttackerTime - a.surplusAttackerTime);
      const defenders = fieldPlayersByAttackerSurplus.slice(0, 2);
      const attackers = fieldPlayersByAttackerSurplus.slice(2, 4);
      
      formationResult.leftDefender = defenders[0]?.id || null;
      formationResult.rightDefender = defenders[1]?.id || null;
      formationResult.leftAttacker = attackers[0]?.id || null;
      formationResult.rightAttacker = attackers[1]?.id || null;
    }
  } else {
    // Less than 4 active players - assign what we can using field positions
    fieldPositions.forEach((position, index) => {
      formationResult[position] = availableActivePlayers[index]?.id || null;
    });
  }
  
  // Set all substitute positions to null initially
  substitutePositions.forEach(position => {
    formationResult[position] = null;
  });
  
  // Assign inactive players to available substitute positions
  assignInactivePlayersToSubstitutes(formationResult, substitutePositions, inactivePlayers);
  
  return {
    formation: formationResult,
    rotationQueue: [],
    nextToRotateOff: null
  };
};

/**
 * Add substitute positions to formation (consolidated logic)
 */
const addSubstitutePositions = (formation, substitutePositions, activeSubstitutes, inactivePlayers, rotationQueue) => {
  substitutePositions.forEach((positionKey, index) => {
    if (substitutePositions.length === 1) {
      formation[positionKey] = rotationQueue[4]?.id || null;
    } else if (substitutePositions.length >= 2) {
      const bottomPositionsForInactive = Math.min(inactivePlayers.length, substitutePositions.length);
      const isBottomPosition = index >= substitutePositions.length - bottomPositionsForInactive;
      
      if (isBottomPosition && inactivePlayers.length > 0) {
        const inactivePlayerIndex = index - (substitutePositions.length - inactivePlayers.length);
        formation[positionKey] = inactivePlayers[inactivePlayerIndex]?.id || null;
      } else {
        formation[positionKey] = activeSubstitutes[index]?.id || null;
      }
    }
  });
};

/**
 * Assign inactive players to substitute positions (consolidated logic)
 */
const assignInactivePlayersToSubstitutes = (formation, substitutePositions, inactivePlayers) => {
  if (inactivePlayers.length > 0 && substitutePositions.length > 0) {
    const availableSubPositions = [...substitutePositions].reverse();
    
    inactivePlayers.forEach((inactivePlayer, index) => {
      if (index < availableSubPositions.length) {
        formation[availableSubPositions[index]] = inactivePlayer.id;
      }
    });
  }
};

/**
 * Generate formation recommendations for 2-2 formation (wrapper)
 */
const generate22FormationRecommendation = (currentGoalieId, playerStats, squad, teamMode) => {
  return generateFormationRecommendation(currentGoalieId, playerStats, squad, teamMode, FORMATIONS.FORMATION_2_2);
};

/**
 * Generate formation recommendations for 1-2-1 formation (wrapper)
 */
const generate121FormationRecommendation = (currentGoalieId, playerStats, squad, teamMode) => {
  return generateFormationRecommendation(currentGoalieId, playerStats, squad, teamMode, FORMATIONS.FORMATION_1_2_1);
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
    case 'defender':
      currentRoleTime = defenderTime;
      break;
    case 'midfielder':
      currentRoleTime = midfielderTime;
      break;
    case 'attacker':
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
      const newPartnerRole = partnerPrevRole === 'defender' ? 'attacker' : 'defender';
      
      const pair = newPartnerRole === 'defender' 
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