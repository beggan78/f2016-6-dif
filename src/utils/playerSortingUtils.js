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
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7)
 * @returns {string} Role: 'ATTACKER', 'DEFENDER', 'GOALIE', or 'SUBSTITUTE'
 */
export const getPlayerCurrentRole = (playerId, periodFormation, teamMode) => {
  if (!playerId || !periodFormation) {
    return 'SUBSTITUTE';
  }

  // Check if player is goalie (same across all team modes)
  if (periodFormation.goalie === playerId) {
    return 'GOALIE';
  }

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      // Check attacker positions
      if (periodFormation.leftAttacker === playerId || 
          periodFormation.rightAttacker === playerId) {
        return 'ATTACKER';
      }
      // Check defender positions
      if (periodFormation.leftDefender === playerId || 
          periodFormation.rightDefender === playerId) {
        return 'DEFENDER';
      }
      // Everyone else is substitute
      return 'SUBSTITUTE';

    case TEAM_MODES.INDIVIDUAL_7:
      // Check attacker positions
      if (periodFormation.leftAttacker7 === playerId || 
          periodFormation.rightAttacker7 === playerId) {
        return 'ATTACKER';
      }
      // Check defender positions
      if (periodFormation.leftDefender7 === playerId || 
          periodFormation.rightDefender7 === playerId) {
        return 'DEFENDER';
      }
      // Everyone else is substitute
      return 'SUBSTITUTE';

    case TEAM_MODES.PAIRS_7:
      // Check pairs for attackers
      if ((periodFormation.leftPair?.attacker === playerId) ||
          (periodFormation.rightPair?.attacker === playerId)) {
        return 'ATTACKER';
      }
      // Check pairs for defenders
      if ((periodFormation.leftPair?.defender === playerId) ||
          (periodFormation.rightPair?.defender === playerId)) {
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
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {Array} Array of player IDs in attacker positions
 */
export const getCurrentAttackers = (periodFormation, teamMode) => {
  if (!periodFormation) return [];

  const attackers = [];

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      if (periodFormation.leftAttacker) attackers.push(periodFormation.leftAttacker);
      if (periodFormation.rightAttacker) attackers.push(periodFormation.rightAttacker);
      break;

    case TEAM_MODES.INDIVIDUAL_7:
      if (periodFormation.leftAttacker7) attackers.push(periodFormation.leftAttacker7);
      if (periodFormation.rightAttacker7) attackers.push(periodFormation.rightAttacker7);
      break;

    case TEAM_MODES.PAIRS_7:
      if (periodFormation.leftPair?.attacker) attackers.push(periodFormation.leftPair.attacker);
      if (periodFormation.rightPair?.attacker) attackers.push(periodFormation.rightPair.attacker);
      break;

    default:
      break;
  }

  return attackers;
};

/**
 * Get all players currently in defender positions
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {Array} Array of player IDs in defender positions
 */
export const getCurrentDefenders = (periodFormation, teamMode) => {
  if (!periodFormation) return [];

  const defenders = [];

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      if (periodFormation.leftDefender) defenders.push(periodFormation.leftDefender);
      if (periodFormation.rightDefender) defenders.push(periodFormation.rightDefender);
      break;

    case TEAM_MODES.INDIVIDUAL_7:
      if (periodFormation.leftDefender7) defenders.push(periodFormation.leftDefender7);
      if (periodFormation.rightDefender7) defenders.push(periodFormation.rightDefender7);
      break;

    case TEAM_MODES.PAIRS_7:
      if (periodFormation.leftPair?.defender) defenders.push(periodFormation.leftPair.defender);
      if (periodFormation.rightPair?.defender) defenders.push(periodFormation.rightPair.defender);
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
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7)
 * @returns {Array} Sorted array of player objects
 */
export const sortPlayersByGoalScoringRelevance = (players, periodFormation, teamMode) => {
  if (!Array.isArray(players) || players.length === 0) {
    return players;
  }

  // Create a copy to avoid mutating the original array
  const sortedPlayers = [...players];

  // Sort players by relevance and then by name within each category
  sortedPlayers.sort((playerA, playerB) => {
    const roleA = getPlayerCurrentRole(playerA.id, periodFormation, teamMode);
    const roleB = getPlayerCurrentRole(playerB.id, periodFormation, teamMode);

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
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {string} Position display name (e.g., "Left Attacker", "Substitute")
 */
export const getPlayerPositionDisplay = (playerId, periodFormation, teamMode) => {
  if (!playerId || !periodFormation) {
    return 'Substitute';
  }

  // Check if player is goalie
  if (periodFormation.goalie === playerId) {
    return 'Goalie';
  }

  switch (teamMode) {
    case TEAM_MODES.INDIVIDUAL_6:
      if (periodFormation.leftAttacker === playerId) return 'Left Attacker';
      if (periodFormation.rightAttacker === playerId) return 'Right Attacker';
      if (periodFormation.leftDefender === playerId) return 'Left Defender';
      if (periodFormation.rightDefender === playerId) return 'Right Defender';
      break;

    case TEAM_MODES.INDIVIDUAL_7:
      if (periodFormation.leftAttacker7 === playerId) return 'Left Attacker';
      if (periodFormation.rightAttacker7 === playerId) return 'Right Attacker';
      if (periodFormation.leftDefender7 === playerId) return 'Left Defender';
      if (periodFormation.rightDefender7 === playerId) return 'Right Defender';
      break;

    case TEAM_MODES.PAIRS_7:
      if (periodFormation.leftPair?.attacker === playerId) return 'Left Attacker';
      if (periodFormation.rightPair?.attacker === playerId) return 'Right Attacker';
      if (periodFormation.leftPair?.defender === playerId) return 'Left Defender';
      if (periodFormation.rightPair?.defender === playerId) return 'Right Defender';
      if (periodFormation.subPair?.attacker === playerId) return 'Sub Attacker';
      if (periodFormation.subPair?.defender === playerId) return 'Sub Defender';
      break;

    default:
      break;
  }

  return 'Substitute';
};

/**
 * Check if a player is currently on the field (not substitute)
 * @param {string} playerId - Player ID
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {boolean} True if player is on field, false if substitute/inactive
 */
export const isPlayerOnField = (playerId, periodFormation, teamMode) => {
  const role = getPlayerCurrentRole(playerId, periodFormation, teamMode);
  return role !== 'SUBSTITUTE';
};

/**
 * Group players by their current role for display purposes
 * @param {Array} players - Array of player objects
 * @param {Object} periodFormation - Current formation object
 * @param {string} teamMode - Current team mode
 * @returns {Object} Object with arrays: { attackers, defenders, goalie, substitutes }
 */
export const groupPlayersByRole = (players, periodFormation, teamMode) => {
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
    const role = getPlayerCurrentRole(player.id, periodFormation, teamMode);
    
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