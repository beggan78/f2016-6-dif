import { PLAYER_ROLES, FORMATION_TYPES } from '../game/logic/gameLogic';

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
  } else if (position === 'goalie') {
    return PLAYER_ROLES.GOALIE;
  }
  return null;
}

/**
 * Gets the list of outfield positions for a given formation type
 */
export function getOutfieldPositions(formationType) {
  switch (formationType) {
    case FORMATION_TYPES.INDIVIDUAL_6:
      return ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'];
    case FORMATION_TYPES.INDIVIDUAL_7:
      return ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
    case FORMATION_TYPES.PAIRS_7:
      return ['leftPair', 'rightPair', 'subPair'];
    default:
      return [];
  }
}

/**
 * Gets the list of field positions (excludes substitutes) for a given formation type
 */
export function getFieldPositions(formationType) {
  switch (formationType) {
    case FORMATION_TYPES.INDIVIDUAL_6:
      return ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
    case FORMATION_TYPES.INDIVIDUAL_7:
      return ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'];
    case FORMATION_TYPES.PAIRS_7:
      return ['leftPair', 'rightPair'];
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
      return ['substitute'];
    case FORMATION_TYPES.INDIVIDUAL_7:
      return ['substitute7_1', 'substitute7_2'];
    case FORMATION_TYPES.PAIRS_7:
      return ['subPair'];
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
  switch (formationType) {
    case FORMATION_TYPES.INDIVIDUAL_6:
      return 5; // 4 on field + 1 substitute
    case FORMATION_TYPES.INDIVIDUAL_7:
      return 6; // 4 on field + 2 substitutes
    case FORMATION_TYPES.PAIRS_7:
      return 6; // 2 pairs on field + 1 pair substitute
    default:
      return 0;
  }
}