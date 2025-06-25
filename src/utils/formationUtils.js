import { FORMATION_DEFINITIONS } from '../constants/formations';

/**
 * Cross-screen formation utilities
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 */

/**
 * Gets all positions for a formation including goalie
 */
export function getAllPositions(formationType) {
  const definition = FORMATION_DEFINITIONS[formationType];
  return definition ? definition.positionOrder : [];
}

/**
 * Gets formation definition for a formation type
 */
export function getFormationDefinition(formationType) {
  return FORMATION_DEFINITIONS[formationType] || null;
}