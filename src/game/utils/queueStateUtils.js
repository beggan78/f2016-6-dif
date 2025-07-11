/**
 * Utilities for preserving rotation queue state during team mode switches
 */

/**
 * Analyzes the current pairs rotation state and determines priority order
 * @param {string} nextPhysicalPairToSubOut - Current pair next to substitute
 * @param {Object} formation - Current formation
 * @returns {Object} Analysis of pair rotation priorities
 */
export const analyzePairsRotationState = (nextPhysicalPairToSubOut, formation) => {
  const pairOrder = ['leftPair', 'rightPair', 'subPair'];
  const nextIndex = pairOrder.indexOf(nextPhysicalPairToSubOut);
  
  if (nextIndex === -1) {
    // Default to leftPair if invalid
    return {
      nextPair: 'leftPair',
      priorityOrder: ['leftPair', 'rightPair', 'subPair'],
      nextPairPlayers: [formation.leftPair?.defender, formation.leftPair?.attacker].filter(Boolean)
    };
  }
  
  // Create priority order starting from next pair
  const priorityOrder = [
    ...pairOrder.slice(nextIndex),
    ...pairOrder.slice(0, nextIndex)
  ];
  
  const nextPair = priorityOrder[0];
  const nextPairPlayers = [
    formation[nextPair]?.defender,
    formation[nextPair]?.attacker
  ].filter(Boolean);
  
  return {
    nextPair,
    priorityOrder,
    nextPairPlayers
  };
};

/**
 * Creates an individual rotation queue that preserves pairs rotation order
 * @param {Object} pairsAnalysis - Result from analyzePairsRotationState
 * @param {Object} formation - Current formation
 * @returns {Array} Individual rotation queue maintaining pair rotation order
 */
export const createIndividualQueueFromPairs = (pairsAnalysis, formation) => {
  const { priorityOrder } = pairsAnalysis;
  const queue = [];
  
  // Add players from each pair in priority order
  priorityOrder.forEach(pairKey => {
    const pair = formation[pairKey];
    if (pair?.defender) queue.push(pair.defender);
    if (pair?.attacker) queue.push(pair.attacker);
  });
  
  // Filter out nulls/undefineds
  const cleanQueue = queue.filter(Boolean);
  
  return {
    queue: cleanQueue,
    nextPlayerId: cleanQueue[0] || null,
    nextNextPlayerId: cleanQueue[1] || null
  };
};

/**
 * Analyzes individual rotation queue to determine pairs rotation state
 * @param {Array} rotationQueue - Current individual rotation queue
 * @param {Object} formation - Current formation
 * @returns {Object} Analysis of which pair should be next
 */
export const analyzePairsFromIndividualQueue = (rotationQueue, formation) => {
  if (!rotationQueue || rotationQueue.length === 0) {
    return {
      nextPair: 'leftPair',
      reasoning: 'default'
    };
  }
  
  const nextPlayerId = rotationQueue[0];
  const nextNextPlayerId = rotationQueue[1];
  
  // Check which pair contains the next player
  const pairs = [
    { key: 'leftPair', defender: formation.leftDefender, attacker: formation.leftAttacker },
    { key: 'rightPair', defender: formation.rightDefender, attacker: formation.rightAttacker },
    { key: 'subPair', defender: formation.substitute_1, attacker: formation.substitute_2 }
  ];
  
  // First check if next two players form a complete pair
  if (nextNextPlayerId) {
    for (const pair of pairs) {
      const pairPlayers = [pair.defender, pair.attacker].filter(Boolean);
      if (pairPlayers.length === 2 && 
          pairPlayers.includes(nextPlayerId) && 
          pairPlayers.includes(nextNextPlayerId)) {
        return {
          nextPair: pair.key,
          reasoning: 'next-two-players-match'
        };
      }
    }
  }
  
  // Then check if just the next player matches a pair
  for (const pair of pairs) {
    if (pair.defender === nextPlayerId || pair.attacker === nextPlayerId) {
      return {
        nextPair: pair.key,
        reasoning: 'next-player-match'
      };
    }
  }
  
  // Default fallback
  return {
    nextPair: 'leftPair',
    reasoning: 'fallback'
  };
};

/**
 * Creates a rotation queue that prioritizes players from a specific pair
 * @param {string} priorityPair - The pair to prioritize ('leftPair', 'rightPair', 'subPair')
 * @param {Object} formation - Current formation
 * @returns {Array} Rotation queue with priority pair first
 */
export const createPrioritizedRotationQueue = (priorityPair, formation) => {
  const allPairs = ['leftPair', 'rightPair', 'subPair'];
  const priorityIndex = allPairs.indexOf(priorityPair);
  
  // Create rotation order starting from priority pair
  const rotationOrder = [
    ...allPairs.slice(priorityIndex),
    ...allPairs.slice(0, priorityIndex)
  ];
  
  const queue = [];
  
  // Add players from each pair in rotation order
  for (const pairKey of rotationOrder) {
    const pair = formation[pairKey];
    if (pair?.defender) queue.push(pair.defender);
    if (pair?.attacker) queue.push(pair.attacker);
  }
  
  return queue.filter(Boolean);
};

/**
 * Converts individual positions to pair positions for queue analysis
 * @param {Object} formation - Current formation
 * @returns {Object} Pair-based formation structure
 */
export const convertToPairFormation = (formation) => {
  return {
    leftPair: {
      defender: formation.leftDefender,
      attacker: formation.leftAttacker
    },
    rightPair: {
      defender: formation.rightDefender,
      attacker: formation.rightAttacker
    },
    subPair: {
      defender: formation.substitute_1,
      attacker: formation.substitute_2
    },
    goalie: formation.goalie
  };
};