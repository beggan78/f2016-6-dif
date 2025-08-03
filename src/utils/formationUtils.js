import { getAllPositions as getPositionsFromGameModes, getDefinition } from '../constants/gameModes';

/**
 * Cross-screen formation utilities
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 */

/**
 * Gets all positions for a formation including goalie
 * @param {string} teamMode - Legacy team mode string
 * @returns {string[]} Array of all position keys including goalie
 */
export function getAllPositions(teamMode) {
  // Handle invalid inputs gracefully to match original behavior
  if (!teamMode || typeof teamMode !== 'string') {
    return [];
  }
  
  try {
    return getPositionsFromGameModes(teamMode);
  } catch (error) {
    // Return empty array for any errors (invalid team modes, validation errors, etc.)
    return [];
  }
}

/**
 * Gets formation definition for a team mode
 * @param {string} teamMode - Legacy team mode string  
 * @returns {Object|null} Mode definition object or null if invalid
 */
export function getModeDefinition(teamMode) {
  if (!teamMode || typeof teamMode !== 'string') {
    return null;
  }
  
  return getDefinition(teamMode);
}