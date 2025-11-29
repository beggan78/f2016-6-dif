/**
 * Utility functions for player-related operations
 */

import { PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';

export const createEmptyPlayerStats = () => ({
  startedMatchAs: null, // 'Goalie', 'On Field', 'Substitute'
  startedAtRole: null, // PLAYER_ROLES constant for the role at match start
  startedAtPosition: null, // Formation-specific position ('goalie', 'defender', 'left', 'right', 'attacker', etc.)
  startLocked: false,
  periodsAsGoalie: 0,
  periodsAsDefender: 0,
  periodsAsAttacker: 0,
  periodsAsMidfielder: 0,
  timeOnFieldSeconds: 0, // Total outfield play time
  timeAsSubSeconds: 0,   // Total time as substitute
  timeAsGoalieSeconds: 0, // Total time as goalie
  // Role-specific time tracking for new points system
  timeAsDefenderSeconds: 0, // Total time spent as defender
  timeAsAttackerSeconds: 0, // Total time spent as attacker
  timeAsMidfielderSeconds: 0, // Total time spent as midfielder (1-2-1 formation)
  // Temporary per-period tracking
  currentRole: null, // 'Goalie', 'Defender', 'Attacker'
  currentStatus: null, // 'on_field', 'substitute', 'goalie'
  lastStintStartTimeEpoch: 0, // For calculating duration of current stint
  currentPositionKey: null, // Formation slot key (e.g., 'leftDefender', 'substitute_1')
  isInactive: false, // For 7-player individual mode - temporarily removes player from rotation
  isCaptain: false, // Captain designation for the current game
  goals: 0,
  saves: 0,
  blocks: 0,
  cards: []
});

// Helper to initialize player objects
export const initializePlayers = (roster) => roster.map((rawName, index) => {
  const fallbackName = `Player ${index + 1}`;
  const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
  const [firstName, ...rest] = trimmedName.split(/\s+/).filter(Boolean);
  const displayName = trimmedName || fallbackName;
  const resolvedFirstName = firstName || displayName;
  const lastName = rest.length > 0 ? rest.join(' ') : null;

  return {
    id: `p${index + 1}`,
    displayName,
    firstName: resolvedFirstName,
    lastName,
    stats: createEmptyPlayerStats()
  };
});

/**
 * Reset match-start participation markers for a player.
 *
 * Clears the fields we derive database participation from so a player removed
 * from the active squad won't accidentally be treated as a starter the next time
 * we persist match data. Keeps cumulative stat counters intact.
 *
 * @param {Object} player - Player object to reset
 * @returns {Object} New player object with cleared match-start markers
 */
export const resetPlayerMatchStartState = (player) => {
  if (!player || !player.stats) {
    return player;
  }

  return {
    ...player,
    stats: {
      ...player.stats,
      startedMatchAs: null,
      startedAtRole: null,
      startedAtPosition: null,
      startLocked: false,
      currentRole: null,
      currentStatus: PLAYER_STATUS.SUBSTITUTE,
      currentPositionKey: null,
      lastStintStartTimeEpoch: null
    }
  };
};

/**
 * Reset players for a new match while keeping identity and inactive flags intact.
 *
 * Useful when abandoning a match but wanting to keep the same configuration prefilled.
 *
 * @param {Array} players - Players to reset
 * @returns {Array} New player objects with fresh stats
 */
export const resetPlayersForNewMatch = (players = []) => {
  if (!Array.isArray(players)) {
    return [];
  }

  return players.map((player) => ({
    ...player,
    stats: {
      ...createEmptyPlayerStats(),
      isInactive: player?.stats?.isInactive ?? false,
      isCaptain: player?.stats?.isCaptain ?? false
    }
  }));
};

/**
 * Checks if there are any inactive players in the selected squad
 * @param {Array} allPlayers - Array of all players
 * @param {Array} selectedSquadIds - Array of selected squad player IDs
 * @returns {boolean} True if there are inactive players in the squad, false otherwise
 */
export const hasInactivePlayersInSquad = (allPlayers, selectedSquadIds) => {
  if (!allPlayers || !selectedSquadIds) {
    return false;
  }
  return allPlayers.some(player => 
    selectedSquadIds.includes(player.id) && player.stats?.isInactive
  );
};

/**
 * Finds a player by ID
 * @param {Array} allPlayers - Array of all players
 * @param {string} playerId - Player ID to find
 * @returns {Object|undefined} Player object or undefined if not found
 */
export const findPlayerById = (allPlayers, playerId) => {
  if (!allPlayers || !Array.isArray(allPlayers)) {
    return undefined;
  }
  return allPlayers.find(p => p.id === playerId);
};

/**
 * Resolves a player's display name with a consistent fallback
 * @param {Object|null|undefined} player - Player object
 * @param {string} fallback - Fallback name when display name is unavailable
 * @returns {string} Player display name or fallback
 */
export const getPlayerDisplayName = (player, fallback = 'Unknown Player') => {
  return player?.displayName || fallback;
};

/**
 * Resolves a player's display name by ID using the provided roster
 * @param {Array} allPlayers - Array of all players
 * @param {string} playerId - Player ID to look up
 * @param {string} fallback - Fallback name when player not found
 * @returns {string} Player display name or fallback
 */
export const getPlayerDisplayNameById = (allPlayers, playerId, fallback = 'Unknown Player') => {
  const player = findPlayerById(allPlayers, playerId);
  return getPlayerDisplayName(player, fallback);
};

/**
 * Finds a player by ID with validation and error handling
 * Common pattern: findPlayerById + null check + optional error handling
 * @param {Array} allPlayers - Array of all players
 * @param {string} playerId - Player ID to find
 * @param {Object} options - Configuration options
 * @param {boolean} options.required - Whether player must exist (default: false)
 * @param {string} options.context - Context for error messages (default: 'operation')
 * @returns {Object|null} Player object or null if not found
 * @throws {Error} If required is true and player not found
 */
export const findPlayerByIdWithValidation = (allPlayers, playerId, options = {}) => {
  const { required = false, context = 'operation' } = options;
  
  if (!allPlayers || !Array.isArray(allPlayers)) {
    if (required) {
      throw new Error(`Invalid players array provided for ${context}`);
    }
    return null;
  }
  
  if (!playerId) {
    if (required) {
      throw new Error(`No player ID provided for ${context}`);
    }
    return null;
  }
  
  const player = findPlayerById(allPlayers, playerId);
  
  if (!player && required) {
    throw new Error(`Player with ID ${playerId} not found for ${context}`);
  }
  
  return player || null;
};

/**
 * Creates a player lookup function for use with rotation queues and other operations
 * Replaces repeated createPlayerLookup patterns throughout the codebase
 * @param {Array} allPlayers - Array of all players
 * @param {Object} options - Configuration options
 * @param {boolean} options.validateStats - Whether to validate player stats exist
 * @returns {Function} Function that takes player ID and returns player object
 */
export const createPlayerLookupFunction = (allPlayers, options = {}) => {
  const { validateStats = false } = options;
  
  return (playerId) => {
    const player = findPlayerById(allPlayers, playerId);
    
    if (validateStats && player && !player.stats) {
      console.warn(`Player ${playerId} found but missing stats object`);
      return null;
    }
    
    return player;
  };
};

/**
 * Gets a player's name by ID, with fallback, including captain designation
 * @param {Array} allPlayers - Array of all players
 * @param {string} playerId - Player ID to get name for
 * @param {string} fallback - Fallback name if player not found (default: 'N/A')
 * @returns {string} Player name with captain designation or fallback
 */
export const getPlayerName = (allPlayers, playerId, fallback = 'N/A') => {
  const player = findPlayerById(allPlayers, playerId);
  if (!player) {
    return fallback;
  }

  const playerName = player.displayName || player.firstName;
  if (!playerName) {
    return fallback;
  }

  const isCaptain = player.stats?.isCaptain;
  return isCaptain ? `${playerName} (C)` : playerName;
};

/**
 * Gets all players in the selected squad
 * @param {Array} allPlayers - Array of all players
 * @param {Array} selectedSquadIds - Array of selected squad player IDs
 * @returns {Array} Array of selected squad player objects
 */
export const getSelectedSquadPlayers = (allPlayers, selectedSquadIds) => {
  return allPlayers.filter(p => selectedSquadIds.includes(p.id));
};

/**
 * Gets all outfield players (excludes goalie) from selected squad
 * @param {Array} allPlayers - Array of all players
 * @param {Array} selectedSquadIds - Array of selected squad player IDs
 * @param {string} goalieId - Current goalie ID to exclude
 * @returns {Array} Array of outfield player objects
 */
export const getOutfieldPlayers = (allPlayers, selectedSquadIds, goalieId) => {
  return allPlayers.filter(p => 
    selectedSquadIds.includes(p.id) && p.id !== goalieId
  );
};

/**
 * Determine if a player actually participated in the match (took the field or played goalie)
 * @param {Object} player - Player object with stats
 * @returns {boolean} True when the player logged any on-field/goalie time or recorded match stats
 */
export const hasPlayerParticipated = (player) => {
  if (!player?.stats) {
    return false;
  }

  const {
    timeOnFieldSeconds = 0,
    timeAsGoalieSeconds = 0,
    timeAsDefenderSeconds = 0,
    timeAsAttackerSeconds = 0,
    timeAsMidfielderSeconds = 0,
    periodsAsGoalie = 0,
    periodsAsDefender = 0,
    periodsAsAttacker = 0,
    periodsAsMidfielder = 0,
    goals = 0,
    saves = 0,
    blocks = 0,
    cards = []
  } = player.stats;

  if (timeOnFieldSeconds > 0 || timeAsGoalieSeconds > 0) {
    return true;
  }

  if (timeAsDefenderSeconds > 0 || timeAsAttackerSeconds > 0 || timeAsMidfielderSeconds > 0) {
    return true;
  }

  if (periodsAsGoalie > 0 || periodsAsDefender > 0 || periodsAsAttacker > 0 || periodsAsMidfielder > 0) {
    return true;
  }

  if (goals > 0 || saves > 0 || blocks > 0) {
    return true;
  }

  if (Array.isArray(cards) && cards.length > 0) {
    return true;
  }

  // Treat players who started on the field or as goalie as participants even if duration tracking failed
  if (player.stats.startedMatchAs === PLAYER_ROLES.GOALIE || player.stats.startedMatchAs === PLAYER_ROLES.FIELD_PLAYER) {
    return true;
  }

  return false;
};

/**
 * Creates a player lookup function for use with rotation queue
 * @param {Array} allPlayers - Array of all players
 * @returns {Function} Function that takes player ID and returns player object
 */
export const createPlayerLookup = (allPlayers) => {
  return (id) => findPlayerById(allPlayers, id);
};

/**
 * Gets players by their current position/role
 * @param {Array} allPlayers - Array of all players
 * @param {Array} selectedSquadIds - Array of selected squad player IDs
 * @param {string} status - Player status to filter by ('on_field', 'substitute', 'goalie')
 * @returns {Array} Array of players with the specified status
 */
export const getPlayersByStatus = (allPlayers, selectedSquadIds, status) => {
  return allPlayers.filter(p => 
    selectedSquadIds.includes(p.id) && p.stats?.currentStatus === status
  );
};

/**
 * Checks if a player is currently inactive
 * @param {Array} allPlayers - Array of all players
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if player is inactive, false otherwise
 */
export const isPlayerInactive = (allPlayers, playerId) => {
  const player = findPlayerById(allPlayers, playerId);
  return player?.stats?.isInactive || false;
};

/**
 * Gets the current captain player
 * @param {Array} allPlayers - Array of all players
 * @returns {Object|null} Captain player object or null if no captain assigned
 */
export const getCaptainPlayer = (allPlayers) => {
  return allPlayers.find(player => player.stats?.isCaptain) || null;
};

/**
 * Checks if a player is the captain
 * @param {Array} allPlayers - Array of all players
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if player is captain, false otherwise
 */
export const isPlayerCaptain = (allPlayers, playerId) => {
  const player = findPlayerById(allPlayers, playerId);
  return player?.stats?.isCaptain || false;
};

/**
 * Sets a player as captain (removing captain status from previous captain)
 * @param {Array} allPlayers - Array of all players
 * @param {string} newCaptainId - Player ID to set as captain, or null to remove captain
 * @returns {Array} Updated players array with new captain assignment
 */
export const setCaptain = (allPlayers, newCaptainId) => {
  return allPlayers.map(player => ({
    ...player,
    stats: {
      ...player.stats,
      isCaptain: player.id === newCaptainId
    }
  }));
};

/**
 * Check if there are any active substitutes for a team config
 * @param {Array} allPlayers - Array of all players
 * @param {Object} teamConfig - Current team configuration object
 * @returns {boolean} True if at least one substitute is active (not inactive)
 */
export const hasActiveSubstitutes = (allPlayers, teamConfig) => {
  // Guard against undefined/null allPlayers
  if (!allPlayers || !Array.isArray(allPlayers)) {
    return false;
  }

  // Import inside function to avoid circular dependency issues
  const gameModes = require('../constants/gameModes');
  
  // Use the modern getModeDefinition helper that handles both legacy strings and config objects
  const modeDefinition = gameModes.getModeDefinition ? gameModes.getModeDefinition(teamConfig) : null;
  if (!modeDefinition) {
    return false;
  }
  
  const substitutePositions = modeDefinition.substitutePositions || [];

  if (!substitutePositions.length) {
    return false;
  }
  
  // Find players in substitute positions
  const substitutePlayers = allPlayers.filter(player => 
    substitutePositions.includes(player.stats?.currentPositionKey)
  );


  // Check if at least one substitute is not inactive
  const hasActive = substitutePlayers.some(player => !player.stats?.isInactive);
  
  return hasActive;
};
