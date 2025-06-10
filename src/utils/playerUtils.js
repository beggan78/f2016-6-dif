/**
 * Utility functions for player-related operations
 */

/**
 * Checks if there are any inactive players in the selected squad
 * @param {Array} allPlayers - Array of all players
 * @param {Array} selectedSquadIds - Array of selected squad player IDs
 * @returns {boolean} True if there are inactive players in the squad, false otherwise
 */
export const hasInactivePlayersInSquad = (allPlayers, selectedSquadIds) => {
  return allPlayers && selectedSquadIds && 
    allPlayers.some(player => 
      selectedSquadIds.includes(player.id) && player.stats?.isInactive
    );
};