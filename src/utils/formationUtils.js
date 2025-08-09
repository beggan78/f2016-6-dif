import { getAllPositions as getPositionsFromGameModes, getDefinition } from '../constants/gameModes';

/**
 * Cross-screen formation utilities
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 */

/**
 * Gets all positions for a formation including goalie
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of all position keys including goalie
 */
export function getAllPositions(teamConfig) {
  // Handle invalid inputs gracefully to match original behavior
  if (!teamConfig || typeof teamConfig !== 'object' || !teamConfig.mode) {
    return [];
  }
  
  try {
    return getPositionsFromGameModes(teamConfig.mode);
  } catch (error) {
    // Return empty array for any errors (invalid team modes, validation errors, etc.)
    return [];
  }
}

/**
 * Gets formation definition for a team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object|null} Mode definition object or null if invalid
 */
export function getModeDefinition(teamConfig) {
  if (!teamConfig || typeof teamConfig !== 'object' || !teamConfig.mode) {
    return null;
  }
  
  return getDefinition(teamConfig.mode);
}