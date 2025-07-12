import { MODE_DEFINITIONS, POSITION_ROLE_MAP } from '../../constants/gameModes';

/**
 * Core position utilities for game logic
 * Pure functions for position-to-role mapping and formation structure queries
 * Used throughout game logic for position validation and role determination
 */

/**
 * Maps position keys to player roles using table-driven lookup
 * Replaces string matching with fast table lookup
 */
export function getPositionRole(position) {
  return POSITION_ROLE_MAP[position] || null;
}

/**
 * Gets the list of outfield positions for a given team mode
 * Replaces FORMATION_POSITIONS from positionConstants
 */
export function getOutfieldPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder.filter(pos => pos !== 'goalie') : [];
}

/**
 * Gets the list of field positions (excludes substitutes) for a given team mode
 */
export function getFieldPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  const result = definition ? definition.fieldPositions : [];
  
  return result;
}

/**
 * Gets the list of substitute positions for a given team mode
 */
export function getSubstitutePositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  const result = definition ? definition.substitutePositions : [];
  
  return result;
}

/**
 * Checks if a position is a field position (not substitute or goalie)
 */
export function isFieldPosition(position, teamMode) {
  const fieldPositions = getFieldPositions(teamMode);
  return fieldPositions.includes(position);
}

/**
 * Checks if a position is a substitute position
 */
export function isSubstitutePosition(position, teamMode) {
  const substitutePositions = getSubstitutePositions(teamMode);
  return substitutePositions.includes(position);
}

/**
 * Gets the expected counts for a team mode
 * Replaces EXPECTED_PLAYER_COUNTS from playerConstants
 */
export function getExpectedCounts(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition ? definition.expectedCounts : { outfield: 0, onField: 0 };
}

/**
 * Gets the expected number of outfield players for a team mode
 * Maintains backward compatibility
 */
export function getExpectedOutfieldPlayerCount(teamMode) {
  const counts = getExpectedCounts(teamMode);
  return counts.outfield;
}