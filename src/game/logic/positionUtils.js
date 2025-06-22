import { PLAYER_ROLES, FORMATION_TYPES, EXPECTED_PLAYER_COUNTS } from '../../constants/playerConstants';
import { POSITION_KEYS, FORMATION_POSITIONS } from '../../constants/positionConstants';

/**
 * Shared utilities for position and role management across formation types
 */

/**
 * Maps position keys to player roles
 */
export function getPositionRole(position) {
  if (position?.includes('Defender') || position?.includes('defender')) {
    return PLAYER_ROLES.DEFENDER;
  } else if (position?.includes('Attacker') || position?.includes('attacker')) {
    return PLAYER_ROLES.ATTACKER;
  } else if (position?.includes('substitute')) {
    return PLAYER_ROLES.SUBSTITUTE;
  } else if (position === POSITION_KEYS.GOALIE) {
    return PLAYER_ROLES.GOALIE;
  }
  return null;
}

/**
 * Gets the list of outfield positions for a given formation type
 */
export function getOutfieldPositions(formationType) {
  return FORMATION_POSITIONS[formationType] || [];
}

/**
 * Gets the list of field positions (excludes substitutes) for a given formation type
 */
export function getFieldPositions(formationType) {
  switch (formationType) {
    case FORMATION_TYPES.INDIVIDUAL_6:
      return [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER, POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER];
    case FORMATION_TYPES.INDIVIDUAL_7:
      return [POSITION_KEYS.LEFT_DEFENDER_7, POSITION_KEYS.RIGHT_DEFENDER_7, POSITION_KEYS.LEFT_ATTACKER_7, POSITION_KEYS.RIGHT_ATTACKER_7];
    case FORMATION_TYPES.PAIRS_7:
      return [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR];
    default:
      return [];
  }
}

/**
 * Gets the list of substitute positions for a given formation type
 */
export function getSubstitutePositions(formationType) {
  switch (formationType) {
    case FORMATION_TYPES.INDIVIDUAL_6:
      return [POSITION_KEYS.SUBSTITUTE];
    case FORMATION_TYPES.INDIVIDUAL_7:
      return [POSITION_KEYS.SUBSTITUTE_7_1, POSITION_KEYS.SUBSTITUTE_7_2];
    case FORMATION_TYPES.PAIRS_7:
      return [POSITION_KEYS.SUB_PAIR];
    default:
      return [];
  }
}

/**
 * Checks if a position is a field position (not substitute or goalie)
 */
export function isFieldPosition(position, formationType) {
  const fieldPositions = getFieldPositions(formationType);
  
  if (formationType === FORMATION_TYPES.PAIRS_7) {
    // For pairs, check if the position is one of the playing pairs
    return fieldPositions.includes(position);
  } else {
    // For individual modes, check if the position is in field positions
    return fieldPositions.includes(position);
  }
}

/**
 * Checks if a position is a substitute position
 */
export function isSubstitutePosition(position, formationType) {
  const substitutePositions = getSubstitutePositions(formationType);
  return substitutePositions.includes(position);
}

/**
 * Gets the expected number of outfield players for a formation type
 */
export function getExpectedOutfieldPlayerCount(formationType) {
  const counts = EXPECTED_PLAYER_COUNTS[formationType];
  return counts ? counts.outfield : 0;
}