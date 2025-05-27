export const generateBalancedFormationForPeriod3 = (currentGoalieId, prevGoalieId, prevFormation, playerStats, squad) => {
  let outfielders = squad.filter(p => p.id !== currentGoalieId);
  
  // Get cumulative stats for all outfielders (excluding current goalie)
  const outfieldersWithStats = outfielders.map(p => {
    const pStats = playerStats.find(s => s.id === p.id);
    return {
      ...p,
      periodsAsDefender: pStats?.stats.periodsAsDefender || 0,
      periodsAsAttacker: pStats?.stats.periodsAsAttacker || 0,
      periodsAsGoalie: pStats?.stats.periodsAsGoalie || 0,
      totalOutfieldTime: pStats?.stats.timeOnFieldSeconds || 0
    };
  });

  // Rule 1: Identify players who need position balancing
  const playersNeedingDefender = outfieldersWithStats.filter(p => 
    p.periodsAsGoalie < 2 && p.periodsAsDefender === 0 && p.periodsAsAttacker > 0
  );
  const playersNeedingAttacker = outfieldersWithStats.filter(p => 
    p.periodsAsGoalie < 2 && p.periodsAsAttacker === 0 && p.periodsAsDefender > 0
  );

  // Start with forced position assignments for Rule 1
  let forcedDefenders = [...playersNeedingDefender];
  let forcedAttackers = [...playersNeedingAttacker];
  
  // Remove forced players from general pool
  let remainingPlayers = outfieldersWithStats.filter(p => 
    !forcedDefenders.some(fd => fd.id === p.id) && 
    !forcedAttackers.some(fa => fa.id === p.id)
  );

  // Apply Rule 3: Previous period role swapping for remaining players
  if (prevFormation) {
    remainingPlayers.forEach(p => {
      // Find what role this player had in previous period
      let prevRole = null;
      if (prevFormation.leftPair.defender === p.id || prevFormation.rightPair.defender === p.id || prevFormation.subPair.defender === p.id) {
        prevRole = 'defender';
      } else if (prevFormation.leftPair.attacker === p.id || prevFormation.rightPair.attacker === p.id || prevFormation.subPair.attacker === p.id) {
        prevRole = 'attacker';
      }
      
      // Recommend opposite role for period 3
      if (prevRole === 'defender') {
        p.recommendedRole = 'attacker';
      } else if (prevRole === 'attacker') {
        p.recommendedRole = 'defender';
      } else {
        // For players who haven't played both positions, determine by Rule 1 fallback
        if (p.periodsAsDefender === 0 && p.periodsAsAttacker > 0) {
          p.recommendedRole = 'defender';
        } else if (p.periodsAsAttacker === 0 && p.periodsAsDefender > 0) {
          p.recommendedRole = 'attacker';
        } else if (p.periodsAsDefender > 0 && p.periodsAsAttacker > 0) {
          // Both positions played, use first period rule
          // Need to check what they played in period 1 - look at game log for period 1
          p.recommendedRole = 'defender'; // Default fallback
        }
      }
    });
  }

  // Try to form pairs respecting Rule 2 (keep pairs intact when possible)
  let finalPairs = [];
  let usedPlayerIds = new Set();

  // Add forced players to appropriate roles first
  while (forcedDefenders.length > 0 && forcedAttackers.length > 0) {
    const defender = forcedDefenders.pop();
    const attacker = forcedAttackers.pop();
    finalPairs.push({ defender: defender.id, attacker: attacker.id });
    usedPlayerIds.add(defender.id);
    usedPlayerIds.add(attacker.id);
  }

  // Handle remaining forced players by pairing with remaining players
  if (forcedDefenders.length > 0) {
    forcedDefenders.forEach(defender => {
      const availableAttacker = remainingPlayers.find(p => !usedPlayerIds.has(p.id));
      if (availableAttacker) {
        finalPairs.push({ defender: defender.id, attacker: availableAttacker.id });
        usedPlayerIds.add(defender.id);
        usedPlayerIds.add(availableAttacker.id);
      }
    });
  }

  if (forcedAttackers.length > 0) {
    forcedAttackers.forEach(attacker => {
      const availableDefender = remainingPlayers.find(p => !usedPlayerIds.has(p.id));
      if (availableDefender) {
        finalPairs.push({ defender: availableDefender.id, attacker: attacker.id });
        usedPlayerIds.add(availableDefender.id);
        usedPlayerIds.add(attacker.id);
      }
    });
  }

  // Pair remaining players based on recommended roles
  const unpairedPlayers = remainingPlayers.filter(p => !usedPlayerIds.has(p.id));
  
  while (unpairedPlayers.length >= 2) {
    const player1 = unpairedPlayers.shift();
    let player2 = null;
    
    // Try to find a complementary partner
    if (player1.recommendedRole === 'defender') {
      player2 = unpairedPlayers.find(p => p.recommendedRole === 'attacker') || unpairedPlayers[0];
      finalPairs.push({ defender: player1.id, attacker: player2.id });
    } else if (player1.recommendedRole === 'attacker') {
      player2 = unpairedPlayers.find(p => p.recommendedRole === 'defender') || unpairedPlayers[0];
      finalPairs.push({ defender: player2.id, attacker: player1.id });
    } else {
      player2 = unpairedPlayers[0];
      finalPairs.push({ defender: player1.id, attacker: player2.id });
    }
    
    if (player2) {
      unpairedPlayers.splice(unpairedPlayers.indexOf(player2), 1);
    }
  }

  // Ensure we have exactly 3 pairs
  while (finalPairs.length < 3) {
    finalPairs.push({ defender: null, attacker: null });
  }
  if (finalPairs.length > 3) {
    finalPairs = finalPairs.slice(0, 3);
  }

  // Determine substitute pair (player with most outfield time)
  const recommendedSubPair = finalPairs.find(pair => {
    if (!pair.defender || !pair.attacker) return false;
    const defenderStats = outfieldersWithStats.find(p => p.id === pair.defender);
    const attackerStats = outfieldersWithStats.find(p => p.id === pair.attacker);
    return defenderStats && attackerStats && 
           (defenderStats.totalOutfieldTime > 0 || attackerStats.totalOutfieldTime > 0);
  }) || finalPairs[0];

  const nonSubPairs = finalPairs.filter(p => p !== recommendedSubPair);
  
  // Determine first to rotate off (pair with player who has most outfield time among non-subs)
  const firstToRotateOffPair = nonSubPairs.find(pair => {
    if (!pair.defender || !pair.attacker) return false;
    const defenderStats = outfieldersWithStats.find(p => p.id === pair.defender);
    const attackerStats = outfieldersWithStats.find(p => p.id === pair.attacker);
    return defenderStats && attackerStats;
  }) || nonSubPairs[0];

  const firstToSubDesignation = firstToRotateOffPair === nonSubPairs[0] ? 'leftPair' : 'rightPair';

  return {
    recommendedLeft: nonSubPairs[0] || { defender: null, attacker: null },
    recommendedRight: nonSubPairs[1] || { defender: null, attacker: null },
    recommendedSubs: recommendedSubPair,
    firstToSubRec: firstToSubDesignation
  };
};

export const generateRecommendedFormation = (currentPeriodNum, currentGoalieId, prevGoalieId, prevFormation, playerStats, squad) => {
  let outfielders = squad.filter(p => p.id !== currentGoalieId);
  let potentialPairs = [];

  // For period 3, apply position balancing rules
  if (currentPeriodNum === 3) {
    return generateBalancedFormationForPeriod3(currentGoalieId, prevGoalieId, prevFormation, playerStats, squad);
  }

  // 1. Handle goalie changes and pair integrity
  const exGoalie = prevGoalieId ? squad.find(p => p.id === prevGoalieId) : null;
  const newGoalieOriginalPartner = outfielders.find(p => {
    if (!prevFormation) return false;
    return (prevFormation.leftPair.defender === p.id && prevFormation.leftPair.attacker === currentGoalieId) ||
        (prevFormation.leftPair.attacker === p.id && prevFormation.leftPair.defender === currentGoalieId) ||
        (prevFormation.rightPair.defender === p.id && prevFormation.rightPair.attacker === currentGoalieId) ||
        (prevFormation.rightPair.attacker === p.id && prevFormation.rightPair.defender === currentGoalieId) ||
        (prevFormation.subPair.defender === p.id && prevFormation.subPair.attacker === currentGoalieId) ||
        (prevFormation.subPair.attacker === p.id && prevFormation.subPair.defender === currentGoalieId);
  });

  let remainingOutfielders = [...outfielders];

  if (exGoalie && newGoalieOriginalPartner && exGoalie.id !== newGoalieOriginalPartner.id) {
    potentialPairs.push({ defender: exGoalie.id, attacker: newGoalieOriginalPartner.id }); // Default roles, user can swap
    remainingOutfielders = remainingOutfielders.filter(p => p.id !== exGoalie.id && p.id !== newGoalieOriginalPartner.id);
  }

  // Try to keep other pairs from prevFormation, swapping D/A roles
  const prevPairsKeys = ['leftPair', 'rightPair', 'subPair'];
  for (const key of prevPairsKeys) {
    if (remainingOutfielders.length < 2 || !prevFormation || !prevFormation[key]) continue;
    const prevPair = prevFormation[key];
    if (prevPair.defender === currentGoalieId || prevPair.attacker === currentGoalieId ||
        prevPair.defender === prevGoalieId || prevPair.attacker === prevGoalieId) continue; // Involved goalie

    const p1 = remainingOutfielders.find(p => p.id === prevPair.defender);
    const p2 = remainingOutfielders.find(p => p.id === prevPair.attacker);

    if (p1 && p2) {
      potentialPairs.push({ defender: p2.id, attacker: p1.id }); // Swapped roles
      remainingOutfielders = remainingOutfielders.filter(p => p.id !== p1.id && p.id !== p2.id);
    }
  }

  // Form remaining pairs if any (should be 0 or 2)
  if (remainingOutfielders.length === 2) {
    potentialPairs.push({ defender: remainingOutfielders[0].id, attacker: remainingOutfielders[1].id });
  } else if (remainingOutfielders.length > 0) { // Fallback: just pair them up
    for(let i = 0; i < remainingOutfielders.length; i+=2) {
      if (remainingOutfielders[i+1]) {
        potentialPairs.push({ defender: remainingOutfielders[i].id, attacker: remainingOutfielders[i+1].id });
      }
    }
  }

  // Ensure 3 pairs. If not, fill with nulls (user must complete)
  while (potentialPairs.length < 3) {
    potentialPairs.push({ defender: null, attacker: null });
  }
  if (potentialPairs.length > 3) potentialPairs = potentialPairs.slice(0,3);

  // 2. Recommend substitute pair
  const outfieldersWithStats = outfielders.map(p => {
    const pStats = playerStats.find(s => s.id === p.id);
    return { ...p, totalOutfieldTime: pStats?.stats.timeOnFieldSeconds || 0 };
  }).sort((a, b) => b.totalOutfieldTime - a.totalOutfieldTime);

  let recommendedSubPair = { defender: null, attacker: null };
  if (outfieldersWithStats.length > 0) {
    const mostTimePlayer = outfieldersWithStats[0];
    recommendedSubPair = potentialPairs.find(pair => pair.defender === mostTimePlayer.id || pair.attacker === mostTimePlayer.id) || potentialPairs[0];
  } else {
    recommendedSubPair = potentialPairs[0];
  }

  // 3. Recommend first rotation off
  const nonSubPairs = potentialPairs.filter(p => p !== recommendedSubPair);
  let firstToSubPairRec = { defender: null, attacker: null };
  if (nonSubPairs.length > 0) {
    const playersInNonSubPairs = nonSubPairs.flatMap(p => [
      outfieldersWithStats.find(os => os.id === p.defender),
      outfieldersWithStats.find(os => os.id === p.attacker)
    ]).filter(Boolean).sort((a,b) => b.totalOutfieldTime - a.totalOutfieldTime);

    if (playersInNonSubPairs.length > 0) {
      const mostTimePlayerNonSub = playersInNonSubPairs[0];
      firstToSubPairRec = nonSubPairs.find(pair => pair.defender === mostTimePlayerNonSub.id || pair.attacker === mostTimePlayerNonSub.id) || nonSubPairs[0];
    } else {
      firstToSubPairRec = nonSubPairs[0] || potentialPairs.find(p => p !== recommendedSubPair) || potentialPairs[1]; // Fallback
    }
  } else {
    firstToSubPairRec = potentialPairs.find(p => p !== recommendedSubPair) || potentialPairs[1]; // Fallback
  }

  // Assign to Left, Right, Subs ensuring distinctness
  let finalLeft = { defender: null, attacker: null };
  let finalRight = { defender: null, attacker: null };
  let finalSubs = recommendedSubPair;
  let firstToSubDesignation = 'leftPair';

  const remainingPotentialPairs = potentialPairs.filter(p => p !== finalSubs);
  if (remainingPotentialPairs.length > 0) {
    if (firstToSubPairRec === remainingPotentialPairs[0] || (remainingPotentialPairs.length === 1 && firstToSubPairRec === remainingPotentialPairs[0])) {
      finalLeft = remainingPotentialPairs[0];
      firstToSubDesignation = 'leftPair';
      if (remainingPotentialPairs.length > 1) finalRight = remainingPotentialPairs[1];
      else finalRight = potentialPairs.find(p => p !== finalLeft && p !== finalSubs) || {defender: null, attacker: null}; // Fallback
    } else if (remainingPotentialPairs.length > 1 && firstToSubPairRec === remainingPotentialPairs[1]) {
      finalRight = remainingPotentialPairs[1];
      firstToSubDesignation = 'rightPair';
      finalLeft = remainingPotentialPairs[0];
    } else { // Fallback if firstToSubPairRec is somehow the sub pair or not found
      finalLeft = remainingPotentialPairs[0];
      firstToSubDesignation = 'leftPair';
      if (remainingPotentialPairs.length > 1) finalRight = remainingPotentialPairs[1];
      else finalRight = potentialPairs.find(p => p !== finalLeft && p !== finalSubs) || {defender: null, attacker: null};
    }
  }

  // Ensure all pairs are distinct objects, even if players are null
  const allAssignedPlayerIds = [
    finalLeft.defender, finalLeft.attacker,
    finalRight.defender, finalRight.attacker,
    finalSubs.defender, finalSubs.attacker
  ].filter(Boolean);
  const uniqueAssignedPlayerIds = new Set(allAssignedPlayerIds);

  if (allAssignedPlayerIds.length !== uniqueAssignedPlayerIds.size && outfielders.length === 6) {
    // This indicates a problem in pair formation logic, needs robust fixing or manual assignment
    console.error("Duplicate player assignment in recommended formation. User should verify.");
    // Fallback to empty pairs for user to fill if critical error
    const emptyPair = {defender: null, attacker: null};
    return { recommendedLeft: emptyPair, recommendedRight: emptyPair, recommendedSubs: emptyPair, firstToSubRec: 'leftPair' };
  }

  return {
    recommendedLeft: finalLeft,
    recommendedRight: finalRight,
    recommendedSubs: finalSubs,
    firstToSubRec: firstToSubDesignation
  };
};