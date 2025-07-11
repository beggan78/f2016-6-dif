/**
 * Player Sorting Utilities
 * Provides relevance-based sorting for goal scorer attribution
 */

import { TEAM_MODES } from '../constants/playerConstants';

/**
 * Position priority for goal scoring relevance
 * Lower numbers = higher priority (more likely to score)
 */
const GOAL_SCORING_PRIORITY = {
  ATTACKER: 1,
  DEFENDER: 2, 
  GOALIE: 3,
  SUBSTITUTE: 4
};

/**
 * Determine a player's current role based on their position in the formation
 * @param {string} playerId - Player ID to check
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7)
 * @returns {string} Role: 'ATTACKER', 'DEFENDER', 'GOALIE', or 'SUBSTITUTE'
 */
export const getPlayerCurrentRole = (playerId, formation, teamMode) => {
  if (!playerId || !formation) {
    return 'SUBSTITUTE';
  }

  // Check if player is goalie (same across all team modes)
  if (formation.goalie === playerId) {
    return 'GOALIE';
  }

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      // Check attacker positions
      if (formation.leftAttacker === playerId ||
          formation.rightAttacker === playerId) {
        return 'ATTACKER';
      }
      // Check defender positions
      if (formation.leftDefender === playerId ||
          formation.rightDefender === playerId) {
        return 'DEFENDER';
      }
      // Everyone else is substitute
      return 'SUBSTITUTE';

    case TEAM_MODES.INDIVIDUAL_7:
      // Check attacker positions
      if (formation.leftAttacker === playerId ||
          formation.rightAttacker === playerId) {
        return 'ATTACKER';
      }
      // Check defender positions
      if (formation.leftDefender === playerId ||
          formation.rightDefender === playerId) {
        return 'DEFENDER';
      }
      // Everyone else is substitute
      return 'SUBSTITUTE';

    case TEAM_MODES.PAIRS_7:
      // Check pairs for attackers
      if ((formation.leftPair?.attacker === playerId) ||
          (formation.rightPair?.attacker === playerId)) {
        return 'ATTACKER';
      }
      // Check pairs for defenders
      if ((formation.leftPair?.defender === playerId) ||
          (formation.rightPair?.defender === playerId)) {
        return 'DEFENDER';
      }
      // Everyone else is substitute (including subPair)
      return 'SUBSTITUTE';

    default:
      return 'SUBSTITUTE';
  }
};

/**
 * Get all players currently in attacker positions
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {Array} Array of player IDs in attacker positions
 */
export const getCurrentAttackers = (formation, teamMode) => {
  if (!formation) return [];

  const attackers = [];

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      if (formation.leftAttacker) attackers.push(formation.leftAttacker);
      if (formation.rightAttacker) attackers.push(formation.rightAttacker);
      break;

    case TEAM_MODES.INDIVIDUAL_7:
      if (formation.leftAttacker) attackers.push(formation.leftAttacker);
      if (formation.rightAttacker) attackers.push(formation.rightAttacker);
      break;

    case TEAM_MODES.PAIRS_7:
      if (formation.leftPair?.attacker) attackers.push(formation.leftPair.attacker);
      if (formation.rightPair?.attacker) attackers.push(formation.rightPair.attacker);
      break;

    default:
      break;
  }

  return attackers;
};

/**
 * Get all players currently in defender positions
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {Array} Array of player IDs in defender positions
 */
export const getCurrentDefenders = (formation, teamMode) => {
  if (!formation) return [];

  const defenders = [];

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      if (formation.leftDefender) defenders.push(formation.leftDefender);
      if (formation.rightDefender) defenders.push(formation.rightDefender);
      break;

    case TEAM_MODES.INDIVIDUAL_7:
      if (formation.leftDefender) defenders.push(formation.leftDefender);
      if (formation.rightDefender) defenders.push(formation.rightDefender);
      break;

    case TEAM_MODES.PAIRS_7:
      if (formation.leftPair?.defender) defenders.push(formation.leftPair.defender);
      if (formation.rightPair?.defender) defenders.push(formation.rightPair.defender);
      break;

    default:
      break;
  }

  return defenders;
};

/**
 * Sort players by goal scoring relevance
 * Prioritizes: Attackers → Defenders → Goalie → Substitutes
 * Within each category, maintains alphabetical order by name
 * 
 * @param {Array} players - Array of player objects to sort
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7)
 * @returns {Array} Sorted array of player objects
 */
export const sortPlayersByGoalScoringRelevance = (players, formation, teamMode) => {
  if (!Array.isArray(players) || players.length === 0) {
    return players;
  }

  // Create a copy to avoid mutating the original array
  const sortedPlayers = [...players];

  // Sort players by relevance and then by name within each category
  sortedPlayers.sort((playerA, playerB) => {
    const roleA = getPlayerCurrentRole(playerA.id, formation, teamMode);
    const roleB = getPlayerCurrentRole(playerB.id, formation, teamMode);

    const priorityA = GOAL_SCORING_PRIORITY[roleA];
    const priorityB = GOAL_SCORING_PRIORITY[roleB];

    // Primary sort: by goal scoring priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Secondary sort: by player name (alphabetical)
    const nameA = playerA.name || '';
    const nameB = playerB.name || '';
    return nameA.localeCompare(nameB);
  });

  return sortedPlayers;
};

/**
 * Get position display name for a player
 * @param {string} playerId - Player ID
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {string} Position display name (e.g., "Left Attacker", "Substitute")
 */
export const getPlayerPositionDisplay = (playerId, formation, teamMode) => {
  if (!playerId || !formation) {
    return 'Substitute';
  }

  // Check if player is goalie
  if (formation.goalie === playerId) {
    return 'Goalie';
  }

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      if (formation.leftAttacker === playerId) return 'Left Attacker';
      if (formation.rightAttacker === playerId) return 'Right Attacker';
      if (formation.leftDefender === playerId) return 'Left Defender';
      if (formation.rightDefender === playerId) return 'Right Defender';
      break;

    case TEAM_MODES.INDIVIDUAL_7:
      if (formation.leftAttacker === playerId) return 'Left Attacker';
      if (formation.rightAttacker === playerId) return 'Right Attacker';
      if (formation.leftDefender === playerId) return 'Left Defender';
      if (formation.rightDefender === playerId) return 'Right Defender';
      break;

    case TEAM_MODES.PAIRS_7:
      if (formation.leftPair?.attacker === playerId) return 'Left Attacker';
      if (formation.rightPair?.attacker === playerId) return 'Right Attacker';
      if (formation.leftPair?.defender === playerId) return 'Left Defender';
      if (formation.rightPair?.defender === playerId) return 'Right Defender';
      if (formation.subPair?.attacker === playerId) return 'Sub Attacker';
      if (formation.subPair?.defender === playerId) return 'Sub Defender';
      break;

    default:
      break;
  }

  return 'Substitute';
};

/**
 * Check if a player is currently on the field (not substitute)
 * @param {string} playerId - Player ID
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {boolean} True if player is on field, false if substitute/inactive
 */
export const isPlayerOnField = (playerId, formation, teamMode) => {
  const role = getPlayerCurrentRole(playerId, formation, teamMode);
  return role !== 'SUBSTITUTE';
};

/**
 * Group players by their current role for display purposes
 * @param {Array} players - Array of player objects
 * @param {Object} formation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {Object} Object with arrays: { attackers, defenders, goalie, substitutes }
 */
export const groupPlayersByRole = (players, formation, teamMode) => {
  const groups = {
    attackers: [],
    defenders: [],
    goalie: [],
    substitutes: []
  };

  if (!Array.isArray(players)) {
    return groups;
  }

  players.forEach(player => {
    const role = getPlayerCurrentRole(player.id, formation, teamMode);
    
    switch (role) {
      case 'ATTACKER':
        groups.attackers.push(player);
        break;
      case 'DEFENDER':
        groups.defenders.push(player);
        break;
      case 'GOALIE':
        groups.goalie.push(player);
        break;
      default:
        groups.substitutes.push(player);
        break;
    }
  });

  return groups;
};