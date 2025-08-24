import { getModeDefinition } from '../../constants/gameModes';
import { PLAYER_ROLES } from '../../constants/playerConstants';

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
  // Simple position to role mapping
  if (!position) return null;
  
  if (position.includes('Defender') || position.includes('defender')) {
    return PLAYER_ROLES.DEFENDER;
  }
  if (position.includes('Attacker') || position.includes('attacker')) {
    return PLAYER_ROLES.ATTACKER;
  }
  // Handle midfielder positions (1-2-1 formation)
  if (position === 'left' || position === 'right') {
    return PLAYER_ROLES.MIDFIELDER;
  }
  if (position.includes('substitute') || position.includes('Substitute')) {
    return PLAYER_ROLES.SUBSTITUTE;
  }
  if (position === 'goalie') {
    return PLAYER_ROLES.GOALIE;
  }
  
  return null;
}

/**
 * Gets the list of outfield positions for a given team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of outfield position keys
 */
export function getOutfieldPositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.positionOrder.filter(pos => pos !== 'goalie') : [];
}

/**
 * Gets the list of field positions (excludes substitutes) for a given team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of field position keys
 */
export function getFieldPositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.fieldPositions : [];
}

/**
 * Gets the list of substitute positions for a given team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of substitute position keys
 */
export function getSubstitutePositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.substitutePositions : [];
}

/**
 * Checks if a position is a field position (not substitute or goalie)
 * @param {string} position - Position key to check
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if position is a field position
 */
export function isFieldPosition(position, teamConfig) {
  const fieldPositions = getFieldPositions(teamConfig);
  return fieldPositions.includes(position);
}

/**
 * Checks if a position is a substitute position
 * @param {string} position - Position key to check
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if position is a substitute position
 */
export function isSubstitutePosition(position, teamConfig) {
  const substitutePositions = getSubstitutePositions(teamConfig);
  return substitutePositions.includes(position);
}

/**
 * Gets the expected counts for a team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object} Expected counts object with outfield and onField properties
 */
export function getExpectedCounts(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.expectedCounts : { outfield: 0, onField: 0 };
}

/**
 * Gets the expected number of outfield players for a team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {number} Expected outfield player count
 */
export function getExpectedOutfieldPlayerCount(teamConfig) {
  const counts = getExpectedCounts(teamConfig);
  return counts.outfield;
}