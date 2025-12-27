import { PLAYER_ROLES } from '../../constants/playerConstants.js';
import { getModeDefinition } from '../../constants/gameModes.js';

/**
 * Position Recommendations System
 *
 * Generates pre-match position recommendations based on historical role distribution
 * to ensure fair rotation of player roles over time.
 *
 * Algorithm:
 * 1. Calculate target percentages for each role based on formation
 * 2. Calculate role deficits for each player (target - actual)
 * 3. Assign positions using greedy algorithm prioritizing highest deficits
 *
 * Active when: alternateRoles team preference is true (default)
 * Shows: Period 1 only, after substitute recommendations are handled
 */

/**
 * Shuffle array in place using Fisher-Yates algorithm
 * Used for random tiebreaking when players have equal deficits
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (mutated in place)
 */
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Calculate target percentages for each role based on formation
 * Target is the ideal distribution if all players rotated fairly
 *
 * @param {Object} teamConfig - Team configuration {format, formation, squadSize}
 * @returns {Object} Target percentages by role {defender: 50, attacker: 50, midfielder: 0}
 */
export const calculateTargetPercentages = (teamConfig) => {
  const modeDefinition = getModeDefinition(teamConfig);
  if (!modeDefinition || !modeDefinition.positions || !modeDefinition.fieldPositions) {
    return { defender: 0, midfielder: 0, attacker: 0 };
  }

  // Count roles from field positions
  const roleCounts = {
    [PLAYER_ROLES.DEFENDER]: 0,
    [PLAYER_ROLES.MIDFIELDER]: 0,
    [PLAYER_ROLES.ATTACKER]: 0
  };

  modeDefinition.fieldPositions.forEach(position => {
    const positionInfo = modeDefinition.positions[position];
    const role = positionInfo?.role || positionInfo;
    if (roleCounts.hasOwnProperty(role)) {
      roleCounts[role]++;
    }
  });

  const totalFieldPlayers = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);

  if (totalFieldPlayers === 0) {
    return { defender: 0, midfielder: 0, attacker: 0 };
  }

  return {
    defender: ((roleCounts[PLAYER_ROLES.DEFENDER] || 0) / totalFieldPlayers) * 100,
    midfielder: ((roleCounts[PLAYER_ROLES.MIDFIELDER] || 0) / totalFieldPlayers) * 100,
    attacker: ((roleCounts[PLAYER_ROLES.ATTACKER] || 0) / totalFieldPlayers) * 100
  };
};

/**
 * Calculate role deficits for all players
 * Deficit = target percentage - actual percentage (positive means player needs more time in this role)
 *
 * @param {Array} playerStats - Array of player stats from getPlayerStats()
 * @param {Object} targetPercentages - Target percentages by role
 * @param {Array} excludePlayerIds - Player IDs to exclude (goalie, substitutes)
 * @returns {Array} Players with deficit scores [{id, displayName, deficits: {defender, midfielder, attacker}}]
 */
export const calculateRoleDeficits = (playerStats, targetPercentages, excludePlayerIds = []) => {
  const excludeSet = new Set(excludePlayerIds);

  return playerStats
    .filter(player => !excludeSet.has(player.id))
    .map(player => {
      const defenderPercent = player.percentTimeAsDefender || 0;
      const midfielderPercent = player.percentTimeAsMidfielder || 0;
      const attackerPercent = player.percentTimeAsAttacker || 0;

      // Special case: new players with no history (0% in all roles)
      // They get equal deficit = target percentage for fair distribution
      const hasHistory = defenderPercent > 0 || midfielderPercent > 0 || attackerPercent > 0;

      return {
        id: player.id,
        displayName: player.displayName,
        deficits: {
          defender: targetPercentages.defender - defenderPercent,
          midfielder: targetPercentages.midfielder - midfielderPercent,
          attacker: targetPercentages.attacker - attackerPercent
        },
        percentages: {
          defender: defenderPercent,
          midfielder: midfielderPercent,
          attacker: attackerPercent
        },
        hasHistory
      };
    });
};

/**
 * Map PLAYER_ROLES constant to deficit key
 * @param {string} role - PLAYER_ROLES value (e.g., 'DEFENDER')
 * @returns {string} Deficit key (e.g., 'defender')
 */
const roleToDeficitKey = (role) => {
  const mapping = {
    [PLAYER_ROLES.DEFENDER]: 'defender',
    [PLAYER_ROLES.MIDFIELDER]: 'midfielder',
    [PLAYER_ROLES.ATTACKER]: 'attacker'
  };
  return mapping[role] || role.toLowerCase();
};

/**
 * Assign positions by role using greedy algorithm
 * For each role group, assigns players with highest deficit for that role
 *
 * @param {Array} playersWithDeficits - Players with calculated deficits
 * @param {Object} modeDefinition - Formation mode definition
 * @returns {Object} Position assignments {leftDefender: playerId, ...}
 */
export const assignPositionsByRole = (playersWithDeficits, modeDefinition) => {
  if (!modeDefinition || !modeDefinition.positions || !modeDefinition.fieldPositions) {
    return {};
  }

  const assignments = {};
  const assignedPlayerIds = new Set();

  // Group positions by role
  const positionsByRole = {
    [PLAYER_ROLES.DEFENDER]: [],
    [PLAYER_ROLES.MIDFIELDER]: [],
    [PLAYER_ROLES.ATTACKER]: []
  };

  modeDefinition.fieldPositions.forEach(position => {
    const positionInfo = modeDefinition.positions[position];
    const role = positionInfo?.role || positionInfo;
    if (role && positionsByRole[role]) {
      positionsByRole[role].push(position);
    }
  });

  // Assign for each role in order: Defender → Midfielder → Attacker
  const roleOrder = [PLAYER_ROLES.DEFENDER, PLAYER_ROLES.MIDFIELDER, PLAYER_ROLES.ATTACKER];

  roleOrder.forEach(role => {
    const positions = positionsByRole[role];
    if (!positions || positions.length === 0) return;

    // Get unassigned players
    const availablePlayers = playersWithDeficits.filter(p => !assignedPlayerIds.has(p.id));
    if (availablePlayers.length === 0) return;

    const deficitKey = roleToDeficitKey(role);

    // Sort by deficit for this role (descending - highest deficit first)
    const sortedPlayers = [...availablePlayers].sort((a, b) => {
      const deficitA = a.deficits[deficitKey] || 0;
      const deficitB = b.deficits[deficitKey] || 0;
      return deficitB - deficitA;
    });

    // Group players by deficit to handle ties
    const deficitGroups = [];
    let currentGroup = [];
    let currentDeficit = null;

    sortedPlayers.forEach(player => {
      const deficit = player.deficits[role.toLowerCase()] || 0;
      const roundedDeficit = Math.round(deficit * 100) / 100; // Round to 2 decimals for comparison

      if (currentDeficit === null || Math.abs(roundedDeficit - currentDeficit) < 0.01) {
        currentGroup.push(player);
        currentDeficit = roundedDeficit;
      } else {
        if (currentGroup.length > 0) {
          deficitGroups.push(currentGroup);
        }
        currentGroup = [player];
        currentDeficit = roundedDeficit;
      }
    });

    if (currentGroup.length > 0) {
      deficitGroups.push(currentGroup);
    }

    // Assign positions, shuffling within each deficit group
    let positionIndex = 0;
    for (const group of deficitGroups) {
      if (positionIndex >= positions.length) break;

      // Shuffle group for random tiebreaking
      const shuffledGroup = shuffleArray([...group]);

      for (const player of shuffledGroup) {
        if (positionIndex >= positions.length) break;

        assignments[positions[positionIndex]] = player.id;
        assignedPlayerIds.add(player.id);
        positionIndex++;
      }
    }
  });

  return assignments;
};

/**
 * Calculate position recommendations for Period 1 based on historical role distribution
 *
 * @param {Array} playerStats - Player stats from getPlayerStats() (6-month window)
 * @param {Object} formation - Current formation object {goalie, substitute_1, ...}
 * @param {Object} teamConfig - Team configuration {format, formation, squadSize}
 * @param {string} goalieId - Current goalie player ID
 * @param {Array} substitutePlayerIds - Already assigned substitute player IDs
 * @returns {Object|null} Recommendations or null if insufficient data
 *   {
 *     recommendations: {position: {playerId, reason}},
 *     metadata: {playersConsidered, targetPercentages}
 *   }
 */
export const calculatePositionRecommendations = (
  playerStats,
  formation,
  teamConfig,
  goalieId,
  substitutePlayerIds = []
) => {
  if (!playerStats || !Array.isArray(playerStats) || playerStats.length === 0) {
    return null;
  }

  if (!teamConfig) {
    return null;
  }

  const modeDefinition = getModeDefinition(teamConfig);
  if (!modeDefinition) {
    return null;
  }

  // Calculate target percentages for this formation
  const targetPercentages = calculateTargetPercentages(teamConfig);

  // Build exclusion list: goalie + substitutes
  const excludePlayerIds = [
    goalieId,
    ...substitutePlayerIds
  ].filter(Boolean);

  // Calculate deficits for all available players
  const playersWithDeficits = calculateRoleDeficits(playerStats, targetPercentages, excludePlayerIds);

  if (playersWithDeficits.length === 0) {
    return null;
  }

  // Assign positions using greedy algorithm
  const positionAssignments = assignPositionsByRole(playersWithDeficits, modeDefinition);

  // Build recommendations object with reasons
  const recommendations = {};
  Object.entries(positionAssignments).forEach(([position, playerId]) => {
    const player = playersWithDeficits.find(p => p.id === playerId);
    if (!player) return;

    const positionInfo = modeDefinition.positions[position];
    const role = positionInfo?.role || positionInfo;
    const roleKey = roleToDeficitKey(role);
    const percentage = player.percentages[roleKey] || 0;

    let reason;
    if (!player.hasHistory) {
      reason = 'No match history';
    } else {
      reason = `${percentage.toFixed(1)}% ${roleKey} time`;
    }

    recommendations[position] = {
      playerId,
      reason
    };
  });

  return {
    recommendations,
    metadata: {
      playersConsidered: playersWithDeficits.length,
      targetPercentages
    }
  };
};
