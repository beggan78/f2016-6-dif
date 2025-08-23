/**
 * Player Sorting Utilities
 * Provides relevance-based sorting for goal scorer attribution
 */

import { PLAYER_ROLES } from '../constants/playerConstants';
import { normalizeRole, getRolePriority } from '../constants/roleConstants';
// import { isIndividualMode } from '../constants/gameModes';

/**
 * Get a player's current role from their stored data
 * @param {Object} player - Player object with stats
 * @returns {string} Role constant from PLAYER_ROLES
 */
export const getPlayerCurrentRole = (player) => {
  if (!player?.stats) {
    return PLAYER_ROLES.SUBSTITUTE;
  }

  const { currentRole, currentStatus } = player.stats;

  // Prioritize currentRole if available and not 'On Field'
  if (currentRole && currentRole !== 'On Field') {
    return normalizeRole(currentRole);
  }

  // Fallback for on-field players where role is in currentStatus
  if (currentStatus) {
    return normalizeRole(currentStatus);
  }
  
  return PLAYER_ROLES.SUBSTITUTE;
};

/**
 * Get all players currently in attacker positions
 * @param {Object} formation - Current formation object
 * @param {Object} teamConfig - Team configuration object
 * @returns {Array} Array of player IDs in attacker positions
 */
export const getCurrentAttackers = (formation, teamConfig) => {
  if (!formation) return [];

  const attackers = [];

  if (teamConfig?.substitutionType === 'individual') {
    if (formation.leftAttacker) attackers.push(formation.leftAttacker);
    if (formation.rightAttacker) attackers.push(formation.rightAttacker);
    if (formation.attacker) attackers.push(formation.attacker); // For 1-2-1 formation
  } else if (teamConfig?.substitutionType === 'pairs') {
    if (formation.leftPair?.attacker) attackers.push(formation.leftPair.attacker);
    if (formation.rightPair?.attacker) attackers.push(formation.rightPair.attacker);
  }

  return attackers;
};

/**
 * Get all players currently in defender positions
 * @param {Object} formation - Current formation object
 * @param {Object} teamConfig - Team configuration object
 * @returns {Array} Array of player IDs in defender positions
 */
export const getCurrentDefenders = (formation, teamConfig) => {
  if (!formation) return [];

  const defenders = [];

  if (teamConfig?.substitutionType === 'individual') {
    if (formation.leftDefender) defenders.push(formation.leftDefender);
    if (formation.rightDefender) defenders.push(formation.rightDefender);
    if (formation.defender) defenders.push(formation.defender); // For 1-2-1 formation
  } else if (teamConfig?.substitutionType === 'pairs') {
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

  // DEBUG: Log initial player order
  console.log(`🔄 [SORT] Initial player order:`, sortedPlayers.map(p => `${p.name}(${getPlayerCurrentRole(p)})`).join(', '));

  // Sort players by relevance and then by name within each category
  sortedPlayers.sort((playerA, playerB) => {
    const roleA = getPlayerCurrentRole(playerA);
    const roleB = getPlayerCurrentRole(playerB);

    const priorityA = getRolePriority(roleA);
    const priorityB = getRolePriority(roleB);

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
      return normalizeRole(player.stats.currentRole) === PLAYER_ROLES.DEFENDER ? 'Left Defender' : 'Left Attacker';
    case 'rightPair':
      return normalizeRole(player.stats.currentRole) === PLAYER_ROLES.DEFENDER ? 'Right Defender' : 'Right Attacker';
    case 'subPair':
      return normalizeRole(player.stats.currentRole) === PLAYER_ROLES.DEFENDER ? 'Sub Defender' : 'Sub Attacker';
    
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
      case PLAYER_ROLES.ATTACKER:
        groups.attackers.push(player);
        break;
      case PLAYER_ROLES.DEFENDER:
        groups.defenders.push(player);
        break;
      case PLAYER_ROLES.GOALIE:
        groups.goalie.push(player);
        break;
      default:
        groups.substitutes.push(player);
        break;
    }
  });

  return groups;
};