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
 */
const generateIndividualFormationRecommendation = (currentGoalieId, playerStats, squad, teamMode) => {
  const outfielders = squad.filter(p => p.id !== currentGoalieId);
  
  // Get stats for all outfielders
  const outfieldersWithStats = outfielders.map(p => {
    const pStats = playerStats.find(s => s.id === p.id);
    const defenderTime = pStats?.stats.timeAsDefenderSeconds || 0;
    const attackerTime = pStats?.stats.timeAsAttackerSeconds || 0;
    
    return {
      ...p,
      totalOutfieldTime: pStats?.stats.timeOnFieldSeconds || 0,
      defenderTime,
      attackerTime,
      surplusAttackerTime: attackerTime - defenderTime, // Positive means more attacker time
      isInactive: pStats?.stats.isInactive || false
    };
  });

  // Separate active and inactive players
  const activePlayers = outfieldersWithStats.filter(p => !p.isInactive);
  const inactivePlayers = outfieldersWithStats.filter(p => p.isInactive);

  // Create rotation queue for active players
  // Sort by accumulated field time (ascending - least time first)
  const sortedByTime = activePlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);

  // Get the 4 players with least accumulated field time (they will be on field)
  const leastTimePlayers = sortedByTime.slice(0, 4);
  // Get remaining players (they will be substitutes, ordered by most time at end)
  const remainingPlayers = sortedByTime.slice(4);

  // For the first 4 positions (indices 0-3): order by MOST time first within this group
  // Index 0 = most time among the 4 least-time players (rotates off first)
  // Index 3 = least time among the 4 least-time players (stays on field longest)
  const fieldPlayersOrdered = leastTimePlayers.sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);

  // For remaining players: order by MOST time at the end
  const substitutesOrdered = remainingPlayers.sort((a, b) => a.totalOutfieldTime - b.totalOutfieldTime);

  // Combine into final rotation queue
  const rotationQueue = [...fieldPlayersOrdered, ...substitutesOrdered];

  // Field players are the first 4 in rotation queue (indices 0-3)
  const fieldPlayers = rotationQueue.slice(0, 4);
  
  // Among field players, assign roles based on surplus attacker time
  // Sort by surplus attacker time (descending - most surplus attacker time first)
  // Players with most surplus attacker time should be defenders to balance
  const fieldPlayersByAttackerSurplus = [...fieldPlayers].sort((a, b) => b.surplusAttackerTime - a.surplusAttackerTime);
  
  const defenders = fieldPlayersByAttackerSurplus.slice(0, 2); // Top 2 with most surplus attacker time
  const attackers = fieldPlayersByAttackerSurplus.slice(2, 4); // Bottom 2

  // Create formation object based on formation type
  let formation = {
    goalie: currentGoalieId
  };

  if (teamMode === 'INDIVIDUAL_6') {
    formation = {
      ...formation,
      leftDefender: defenders[0]?.id || null,
      rightDefender: defenders[1]?.id || null,
      leftAttacker: attackers[0]?.id || null,
      rightAttacker: attackers[1]?.id || null,
      substitute: rotationQueue[4]?.id || null // 5th player in rotation queue
    };
  } else if (teamMode === 'INDIVIDUAL_7') {
    // For 7-player mode, inactive player goes to substitute7_2, active substitutes fill remaining positions
    const activeSubstitutes = rotationQueue.slice(4); // Players beyond the first 4
    
    formation = {
      ...formation,
      leftDefender7: defenders[0]?.id || null,
      rightDefender7: defenders[1]?.id || null,
      leftAttacker7: attackers[0]?.id || null,
      rightAttacker7: attackers[1]?.id || null,
      substitute7_1: activeSubstitutes[0]?.id || null, // 5th player in rotation queue
      substitute7_2: inactivePlayers[0]?.id || activeSubstitutes[1]?.id || null // Inactive player or 6th in queue
    };
  } else if (teamMode === 'INDIVIDUAL_8') {
    // For future 8-player mode support
    const activeSubstitutes = rotationQueue.slice(4);
    
    formation = {
      ...formation,
      leftDefender8: defenders[0]?.id || null,
      rightDefender8: defenders[1]?.id || null,
      leftAttacker8: attackers[0]?.id || null,
      rightAttacker8: attackers[1]?.id || null,
      substitute8_1: activeSubstitutes[0]?.id || null, // 5th player
      substitute8_2: activeSubstitutes[1]?.id || null, // 6th player
      substitute8_3: inactivePlayers[0]?.id || activeSubstitutes[2]?.id || null // Inactive or 7th player
    };
  }

  return {
    formation,
    rotationQueue: rotationQueue.map(p => p.id),
    nextToRotateOff: rotationQueue[0]?.id || null // Player with most field time rotates off first
  };
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