import { MODE_DEFINITIONS } from '../constants/gameModes';

/**
 * Cross-screen formation utilities
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 */

/**
 * Gets all positions for a formation including goalie
 */
export function getAllPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder : [];
}

/**
 * Gets formation definition for a team mode
 */
export function getModeDefinition(teamMode) {
  return MODE_DEFINITIONS[teamMode] || null;
}