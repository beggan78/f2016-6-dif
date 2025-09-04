/**
 * Substitution configuration formatting utilities
 * for consistent display of substitution types and modes
 */

import { SUBSTITUTION_TYPES, PAIR_ROLE_ROTATION_TYPES } from '../constants/teamConfiguration';
import { UI_DEFAULTS } from '../constants/matchDefaults';

/**
 * Substitution config display mapping for cleaner lookup
 */
const SUBSTITUTION_DISPLAY_MAP = {
  [SUBSTITUTION_TYPES.INDIVIDUAL]: 'Individual',
  [SUBSTITUTION_TYPES.PAIRS]: {
    [PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD]: 'Pairs (Keep)',
    [PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION]: 'Pairs (Swap)'
  }
};

/**
 * Formats substitution configuration for user display
 * @param {object} config - Substitution config from database
 * @returns {string} User-friendly substitution description
 */
export const formatSubstitutionConfig = (config) => {
  // Handle missing or empty config
  if (!config || !config.type) {
    return UI_DEFAULTS.DEFAULT_SUBSTITUTION_LABEL;
  }

  const { type, pairRoleRotation } = config;

  // Handle individual substitution
  if (type === SUBSTITUTION_TYPES.INDIVIDUAL) {
    return SUBSTITUTION_DISPLAY_MAP[SUBSTITUTION_TYPES.INDIVIDUAL];
  }

  // Handle pairs substitution
  if (type === SUBSTITUTION_TYPES.PAIRS) {
    const pairsMap = SUBSTITUTION_DISPLAY_MAP[SUBSTITUTION_TYPES.PAIRS];
    const rotation = pairRoleRotation || PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD;
    return pairsMap[rotation] || 'Pairs (Keep)'; // Default to "Keep" if unknown rotation
  }

  // Fallback for unknown types
  return UI_DEFAULTS.DEFAULT_SUBSTITUTION_LABEL;
};

/**
 * Gets detailed substitution configuration info for tooltips or expanded display
 * @param {object} config - Substitution config from database
 * @returns {{type: string, display: string, description: string}} Detailed config info
 */
export const getSubstitutionInfo = (config) => {
  const display = formatSubstitutionConfig(config);
  
  if (!config || !config.type) {
    return {
      type: SUBSTITUTION_TYPES.INDIVIDUAL,
      display,
      description: 'Players substitute individually based on playing time'
    };
  }

  const { type, pairRoleRotation } = config;

  if (type === SUBSTITUTION_TYPES.INDIVIDUAL) {
    return {
      type: SUBSTITUTION_TYPES.INDIVIDUAL,
      display,
      description: 'Players substitute individually based on playing time'
    };
  }

  if (type === SUBSTITUTION_TYPES.PAIRS) {
    const isSwapMode = pairRoleRotation === PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION;
    
    return {
      type: SUBSTITUTION_TYPES.PAIRS,
      display,
      description: isSwapMode 
        ? 'Pairs substitute together, swapping defender/attacker roles each rotation'
        : 'Pairs substitute together, maintaining roles throughout the period'
    };
  }

  // Fallback for unknown types
  return {
    type: 'unknown',
    display,
    description: 'Substitution configuration not recognized'
  };
};

/**
 * Validates if substitution configuration is complete and valid
 * @param {object} config - Substitution config to validate
 * @returns {{isValid: boolean, issues: string[]}} Validation result
 */
export const validateSubstitutionConfig = (config) => {
  const issues = [];

  if (!config) {
    return { isValid: true, issues: [] }; // Empty config is valid (defaults to individual)
  }

  if (typeof config !== 'object') {
    return { isValid: false, issues: ['Substitution config must be an object'] };
  }

  const { type, pairRoleRotation } = config;

  // Validate substitution type
  if (type && !Object.values(SUBSTITUTION_TYPES).includes(type)) {
    issues.push(`Invalid substitution type: ${type}`);
  }

  // Validate pair role rotation if pairs mode
  if (type === SUBSTITUTION_TYPES.PAIRS) {
    if (pairRoleRotation && !Object.values(PAIR_ROLE_ROTATION_TYPES).includes(pairRoleRotation)) {
      issues.push(`Invalid pair role rotation: ${pairRoleRotation}`);
    }
  }

  // Check for unexpected fields (not critical, just log)
  if (process.env.NODE_ENV === 'development') {
    const expectedFields = ['type', 'pairRoleRotation'];
    const unexpectedFields = Object.keys(config).filter(key => !expectedFields.includes(key));
    
    if (unexpectedFields.length > 0) {
      console.warn('Unexpected fields in substitution config:', unexpectedFields);
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};