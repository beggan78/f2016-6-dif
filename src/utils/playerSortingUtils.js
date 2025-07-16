/**
 * Player Sorting Utilities
 * Provides relevance-based sorting for goal scorer attribution
 */

import { TEAM_MODES } from '../constants/playerConstants';
import { isIndividualMode } from '../constants/gameModes';

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
 * Get a player's current role from their stored data
 * @param {Object} player - Player object with stats
 * @returns {string} Role: 'ATTACKER', 'DEFENDER', 'GOALIE', or 'SUBSTITUTE'
 */
export const getPlayerCurrentRole = (player) => {
  if (!player?.stats?.currentRole) {
    return 'SUBSTITUTE';
  }

  // Map stored role values to the expected format
  const role = player.stats.currentRole;
  
  // Handle different possible role formats
  if (role === 'Goalie' || role === 'GOALIE') return 'GOALIE';
  if (role === 'Attacker' || role === 'ATTACKER') return 'ATTACKER';
  if (role === 'Defender' || role === 'DEFENDER') return 'DEFENDER';
  if (role === 'Substitute' || role === 'SUBSTITUTE') return 'SUBSTITUTE';
  
  // Default fallback
  return 'SUBSTITUTE';
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

  if (isIndividualMode(teamMode)) {
    if (formation.leftAttacker) attackers.push(formation.leftAttacker);
    if (formation.rightAttacker) attackers.push(formation.rightAttacker);
  } else if (teamMode === TEAM_MODES.PAIRS_7) {
    if (formation.leftPair?.attacker) attackers.push(formation.leftPair.attacker);
    if (formation.rightPair?.attacker) attackers.push(formation.rightPair.attacker);
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

  if (isIndividualMode(teamMode)) {
    if (formation.leftDefender) defenders.push(formation.leftDefender);
    if (formation.rightDefender) defenders.push(formation.rightDefender);
  } else if (teamMode === TEAM_MODES.PAIRS_7) {
    if (formation.leftPair?.defender) defenders.push(formation.leftPair.defender);
    if (formation.rightPair?.defender) defenders.push(formation.rightPair.defender);
  }

  return defenders;
};

/**
 * Sort players by goal scoring relevance
 * Prioritizes: Attackers → Defenders → Goalie → Substitutes
 * Within each category, maintains alphabetical order by name
 * 
 * @param {Array} players - Array of player objects to sort
 * @returns {Array} Sorted array of player objects
 */
export const sortPlayersByGoalScoringRelevance = (players) => {
  if (!Array.isArray(players) || players.length === 0) {
    return players;
  }

  // Create a copy to avoid mutating the original array
  const sortedPlayers = [...players];

  // Sort players by relevance and then by name within each category
  sortedPlayers.sort((playerA, playerB) => {
    const roleA = getPlayerCurrentRole(playerA);
    const roleB = getPlayerCurrentRole(playerB);

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
 * @param {Object} player - Player object with stats
 * @returns {string} Position display name (e.g., "Left Attacker", "Substitute")
 */
export const getPlayerPositionDisplay = (player) => {
  if (!player?.stats?.currentPairKey) {
    return 'Substitute';
  }

  const pairKey = player.stats.currentPairKey;
  
  // Map position keys to display names
  switch (pairKey) {
    case 'goalie':
      return 'Goalie';
    
    // Individual mode positions
    case 'leftDefender':
      return 'Left Defender';
    case 'rightDefender':
      return 'Right Defender';
    case 'leftAttacker':
      return 'Left Attacker';
    case 'rightAttacker':
      return 'Right Attacker';
    case 'substitute_1':
      return 'Substitute 1';
    case 'substitute_2':
      return 'Substitute 2';
    case 'substitute_3':
      return 'Substitute 3';
    case 'substitute':
      return 'Substitute';
    
    // Pairs mode positions - combine pair location with player role
    case 'leftPair':
      return player.stats.currentRole === 'Defender' ? 'Left Defender' : 'Left Attacker';
    case 'rightPair':
      return player.stats.currentRole === 'Defender' ? 'Right Defender' : 'Right Attacker';
    case 'subPair':
      return player.stats.currentRole === 'Defender' ? 'Sub Defender' : 'Sub Attacker';
    
    default:
      // Handle any unknown position keys
      if (pairKey.startsWith('substitute_')) {
        return 'Substitute';
      }
      return 'Substitute';
  }
};

/**
 * Check if a player is currently on the field (not substitute)
 * @param {Object} player - Player object with stats
 * @returns {boolean} True if player is on field, false if substitute/inactive
 */
export const isPlayerOnField = (player) => {
  if (!player?.stats?.currentStatus) {
    return false;
  }

  const status = player.stats.currentStatus;
  
  // Player is on field if they're not a substitute and not inactive
  return status === 'on_field' || status === 'goalie';
};

/**
 * Group players by their current role for display purposes
 * @param {Array} players - Array of player objects
 * @returns {Object} Object with arrays: { attackers, defenders, goalie, substitutes }
 */
export const groupPlayersByRole = (players) => {
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
    const role = getPlayerCurrentRole(player);
    
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