import { FORMATIONS } from '../constants/teamConfiguration';
import { getFormationDefinition } from './formationConfigUtils';
import { PLAYER_ROLES } from '../constants/playerConstants';
import { roleToDatabase } from '../constants/roleConstants';

// Role constants for formation logic (database format for consistency)
const DB_DEFENDER = roleToDatabase(PLAYER_ROLES.DEFENDER);
const DB_ATTACKER = roleToDatabase(PLAYER_ROLES.ATTACKER);
const DB_MIDFIELDER = roleToDatabase(PLAYER_ROLES.MIDFIELDER);

const SIDE_LEFT = 'left';
const SIDE_RIGHT = 'right';

// Helper to get mode definition - uses centralized formation utilities
const getDefinition = (teamConfig, selectedFormation = null) => {
  return getFormationDefinition(teamConfig, selectedFormation);
};


const determinePreferredSideForPlayer = (playerId, squadLookup, previousFormation) => {
  const player = squadLookup.get(playerId);
  const preferredSide = player?.stats?.preferredSide;

  if (preferredSide === SIDE_LEFT || preferredSide === SIDE_RIGHT) {
    return preferredSide;
  }

  if (previousFormation) {
    if (
      previousFormation.leftDefender === playerId ||
      previousFormation.leftAttacker === playerId
    ) {
      return SIDE_LEFT;
    }

    if (
      previousFormation.rightDefender === playerId ||
      previousFormation.rightAttacker === playerId
    ) {
      return SIDE_RIGHT;
    }
  }

  return null;
};

const createSideCandidate = (playerId, side, statsLookup, squadLookup) => {
  const statsEntry = statsLookup.get(playerId);
  const squadEntry = squadLookup.get(playerId);

  const totalOutfieldTime =
    statsEntry?.stats?.timeOnFieldSeconds ??
    squadEntry?.stats?.timeOnFieldSeconds ??
    0;

  const isInactive = Boolean(
    statsEntry?.stats?.isInactive ?? squadEntry?.stats?.isInactive
  );

  return {
    id: playerId,
    side,
    totalTime: totalOutfieldTime,
    isInactive
  };
};

const assignSideGroup = ({ candidates, previousDefender, previousAttacker }) => {
  const available = [...candidates].sort((a, b) => a.totalTime - b.totalTime);

  const pickById = (playerId) => {
    if (!playerId) return null;
    const index = available.findIndex(candidate => candidate.id === playerId);
    if (index === -1) {
      return null;
    }
    return available.splice(index, 1)[0];
  };

  const pickBestCandidate = () => {
    const activeIndex = available.findIndex(candidate => !candidate.isInactive);
    if (activeIndex !== -1) {
      return available.splice(activeIndex, 1)[0];
    }
    return available.shift() || null;
  };

  let defenderCandidate = null;
  let attackerCandidate = null;

  const previousAttackerCandidate = pickById(previousAttacker);
  const previousDefenderCandidate = pickById(previousDefender);

  if (previousDefenderCandidate && previousAttackerCandidate) {
    defenderCandidate = previousAttackerCandidate;
    attackerCandidate = previousDefenderCandidate;
  } else if (previousAttackerCandidate) {
    defenderCandidate = previousAttackerCandidate;
    attackerCandidate = pickBestCandidate();
  } else if (previousDefenderCandidate) {
    attackerCandidate = previousDefenderCandidate;
    defenderCandidate = pickBestCandidate();
  } else {
    defenderCandidate = pickBestCandidate();
    attackerCandidate = pickBestCandidate();
  }

  if (!defenderCandidate && available.length) {
    defenderCandidate = pickBestCandidate();
  }

  if (!attackerCandidate && available.length) {
    attackerCandidate = pickBestCandidate();
  }

  return {
    defenderCandidate,
    attackerCandidate,
    remaining: available
  };
};

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
const generateIndividualFormationRecommendation = (
  currentGoalieId,
  playerStats,
  squad,
  teamConfig,
  selectedFormation = null,
  previousFormation = null
) => {
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

  let rotationQueueIds;
  let nextToRotateOff;

  if (canUsePairedRoleStrategy(teamConfig)) {
    const orderingStrategy =
      teamConfig?.pairedRoleStrategy === PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
        ? 'role_groups'
        : 'pair';

    rotationQueueIds = buildPairedRotationQueueFromFormation(formationResult, substitutePositions, { orderingStrategy });
    nextToRotateOff = rotationQueueIds[0] || null;
  } else {
    rotationQueueIds = rotationQueue.map(p => p.id);
    nextToRotateOff = fieldPlayersOrdered[0]?.id || null;
  }

  return {
    formation: formationResult,
    rotationQueue: rotationQueueIds,
    nextToRotateOff
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

// Export the individual formation function
export { generateIndividualFormationRecommendation };
