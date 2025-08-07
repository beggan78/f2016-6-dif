/**
 * Basic position key constants - Raw string values only
 * Formation-specific logic moved to constants/gameModes.js
 */
export const POSITION_KEYS = {
  // Pairs formation
  LEFT_PAIR: 'leftPair',
  RIGHT_PAIR: 'rightPair', 
  SUB_PAIR: 'subPair',
  
  // Individual formations - 2-2 formation (unified naming for 6-player, 7-player, 8-player, 9-player, and 10-player)
  LEFT_DEFENDER: 'leftDefender',
  RIGHT_DEFENDER: 'rightDefender',
  LEFT_ATTACKER: 'leftAttacker', 
  RIGHT_ATTACKER: 'rightAttacker',
  
  // Individual formations - 1-2-1 formation positions
  DEFENDER: 'defender',           // Single center back
  LEFT: 'left',                   // Left midfielder
  RIGHT: 'right',                 // Right midfielder  
  ATTACKER: 'attacker',           // Single center forward
  
  // Substitute positions (shared across formations)
  SUBSTITUTE_1: 'substitute_1',
  SUBSTITUTE_2: 'substitute_2',
  SUBSTITUTE_3: 'substitute_3',
  SUBSTITUTE_4: 'substitute_4',
  SUBSTITUTE_5: 'substitute_5',
  
  // Common
  GOALIE: 'goalie'
};

/**
 * Position validation utilities
 */

/**
 * Get all pair position keys
 * @returns {string[]} Array of pair position keys
 */
export const getPairPositionKeys = () => [
  POSITION_KEYS.LEFT_PAIR,
  POSITION_KEYS.RIGHT_PAIR,
  POSITION_KEYS.SUB_PAIR
];

/**
 * Get all field position keys for 2-2 formation
 * @returns {string[]} Array of 2-2 field position keys
 */
export const getFieldPositionKeys22 = () => [
  POSITION_KEYS.LEFT_DEFENDER,
  POSITION_KEYS.RIGHT_DEFENDER,
  POSITION_KEYS.LEFT_ATTACKER,
  POSITION_KEYS.RIGHT_ATTACKER
];

/**
 * Get all field position keys for 1-2-1 formation
 * @returns {string[]} Array of 1-2-1 field position keys
 */
export const getFieldPositionKeys121 = () => [
  POSITION_KEYS.DEFENDER,
  POSITION_KEYS.LEFT,
  POSITION_KEYS.RIGHT,
  POSITION_KEYS.ATTACKER
];

/**
 * Get all substitute position keys
 * @returns {string[]} Array of substitute position keys
 */
export const getSubstitutePositionKeys = () => [
  POSITION_KEYS.SUBSTITUTE_1,
  POSITION_KEYS.SUBSTITUTE_2,
  POSITION_KEYS.SUBSTITUTE_3,
  POSITION_KEYS.SUBSTITUTE_4,
  POSITION_KEYS.SUBSTITUTE_5
];

/**
 * Check if position key is a pair position
 * @param {string} position - Position key to check
 * @returns {boolean} True if pair position, false otherwise
 */
export const isPairPosition = (position) => {
  return getPairPositionKeys().includes(position);
};

/**
 * Check if position key is a field position
 * @param {string} position - Position key to check
 * @returns {boolean} True if field position, false otherwise
 */
export const isFieldPosition = (position) => {
  return [...getFieldPositionKeys22(), ...getFieldPositionKeys121()].includes(position);
};

/**
 * Check if position key is a substitute position
 * @param {string} position - Position key to check
 * @returns {boolean} True if substitute position, false otherwise
 */
export const isSubstitutePosition = (position) => {
  return getSubstitutePositionKeys().includes(position);
};

/**
 * Check if position key is the goalie position
 * @param {string} position - Position key to check
 * @returns {boolean} True if goalie position, false otherwise
 */
export const isGoaliePosition = (position) => {
  return position === POSITION_KEYS.GOALIE;
};