import { FORMATION_DEFINITIONS } from '../constants/formations';

/**
 * Cross-screen formation utilities
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 */

/**
 * Gets all positions for a formation including goalie
 */
export function getAllPositions(teamMode) {
  const definition = FORMATION_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder : [];
}

/**
 * Gets formation definition for a formation type
 */
export function getFormationDefinition(teamMode) {
  return FORMATION_DEFINITIONS[teamMode] || null;
}