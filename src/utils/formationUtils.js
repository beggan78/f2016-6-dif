import { FORMATION_DEFINITIONS, POSITION_ROLE_MAP } from '../constants/formations';

/**
 * Formation utilities using single source of truth from formations.js
 * Moved from game/logic/positionUtils.js to utils/ since used across multiple screens
 */

/**
 * Maps position keys to player roles using table-driven lookup
 * Replaces string matching with fast table lookup
 */
export function getPositionRole(position) {
  return POSITION_ROLE_MAP[position] || null;
}

/**
 * Gets the list of outfield positions for a given formation type
 * Replaces FORMATION_POSITIONS from positionConstants
 */
export function getOutfieldPositions(formationType) {
  const definition = FORMATION_DEFINITIONS[formationType];
  return definition ? definition.positionOrder.filter(pos => pos !== 'goalie') : [];
}

/**
 * Gets the list of field positions (excludes substitutes) for a given formation type
 */
export function getFieldPositions(formationType) {
  const definition = FORMATION_DEFINITIONS[formationType];
  return definition ? definition.fieldPositions : [];
}

/**
 * Gets the list of substitute positions for a given formation type
 */
export function getSubstitutePositions(formationType) {
  const definition = FORMATION_DEFINITIONS[formationType];
  return definition ? definition.substitutePositions : [];
}

/**
 * Checks if a position is a field position (not substitute or goalie)
 */
export function isFieldPosition(position, formationType) {
  const fieldPositions = getFieldPositions(formationType);
  return fieldPositions.includes(position);
}

/**
 * Checks if a position is a substitute position
 */
export function isSubstitutePosition(position, formationType) {
  const substitutePositions = getSubstitutePositions(formationType);
  return substitutePositions.includes(position);
}

/**
 * Gets the expected counts for a formation type
 * Replaces EXPECTED_PLAYER_COUNTS from playerConstants
 */
export function getExpectedCounts(formationType) {
  const definition = FORMATION_DEFINITIONS[formationType];
  return definition ? definition.expectedCounts : { outfield: 0, onField: 0 };
}

/**
 * Gets the expected number of outfield players for a formation type
 * Maintains backward compatibility
 */
export function getExpectedOutfieldPlayerCount(formationType) {
  const counts = getExpectedCounts(formationType);
  return counts.outfield;
}

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