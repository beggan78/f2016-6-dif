/**
 * Utility functions for player-related operations
 */

// Helper to initialize player objects
export const initializePlayers = (roster) => roster.map((name, index) => ({
  id: `p${index + 1}`,
  name,
  stats: {
    startedMatchAs: null, // 'Goalie', 'On Field', 'Substitute'
    periodsAsGoalie: 0,
    periodsAsDefender: 0,
    periodsAsAttacker: 0,
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
    currentPairKey: null, // 'leftPair', 'rightPair', 'subPair'
    isInactive: false, // For 7-player individual mode - temporarily removes player from rotation
    isCaptain: false, // Captain designation for the current game
  }
}));

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
  return allPlayers.find(p => p.id === playerId);
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
  
  const isCaptain = player.stats?.isCaptain;
  return isCaptain ? `${player.name} (C)` : player.name;
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
 * Check if there are any active substitutes for a team mode
 * @param {Array} allPlayers - Array of all players
 * @param {string} teamMode - Current team mode
 * @returns {boolean} True if at least one substitute is active (not inactive)
 */
export const hasActiveSubstitutes = (allPlayers, teamMode) => {
  // Guard against undefined/null allPlayers
  if (!allPlayers || !Array.isArray(allPlayers)) {
    return false;
  }

  // Import inside function to avoid circular dependency issues
  const gameModes = require('../constants/gameModes');
  const MODE_DEFINITIONS = gameModes.MODE_DEFINITIONS;
  
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition?.substitutePositions?.length) {
    return false;
  }
  
  // Find players in substitute positions
  const substitutePlayers = allPlayers.filter(player => 
    definition.substitutePositions.includes(player.stats?.currentPairKey)
  );
  
  // Check if at least one substitute is not inactive
  return substitutePlayers.some(player => !player.stats?.isInactive);
};