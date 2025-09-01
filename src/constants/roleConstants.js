/**
 * Centralized Role Value Management System
 * 
 * This module provides a single source of truth for player role values and handles
 * conversions between different formats (constants, database, display) to prevent
 * case sensitivity bugs throughout the application.
 */

import { PLAYER_ROLES } from './playerConstants';

/**
 * Database role values (lowercase) - used for Supabase database operations
 */
export const DB_ROLE_VALUES = {
  [PLAYER_ROLES.GOALIE]: 'goalie',
  [PLAYER_ROLES.DEFENDER]: 'defender', 
  [PLAYER_ROLES.ATTACKER]: 'attacker',
  [PLAYER_ROLES.MIDFIELDER]: 'midfielder',
  [PLAYER_ROLES.SUBSTITUTE]: 'substitute',
  [PLAYER_ROLES.FIELD_PLAYER]: 'defender', // Default mapping for generic field players
  [PLAYER_ROLES.UNKNOWN]: 'unknown' // Used when position mapping fails
};

/**
 * Display role values (title case) - used for UI display
 */
export const DISPLAY_ROLE_VALUES = {
  [PLAYER_ROLES.GOALIE]: 'Goalie',
  [PLAYER_ROLES.DEFENDER]: 'Defender',
  [PLAYER_ROLES.ATTACKER]: 'Attacker', 
  [PLAYER_ROLES.MIDFIELDER]: 'Midfielder',
  [PLAYER_ROLES.SUBSTITUTE]: 'Substitute',
  [PLAYER_ROLES.FIELD_PLAYER]: 'Field',
  [PLAYER_ROLES.UNKNOWN]: 'Unknown'
};

/**
 * Reverse mapping from database values to PLAYER_ROLES constants
 */
export const DB_TO_ROLE_MAP = {
  'goalie': PLAYER_ROLES.GOALIE,
  'defender': PLAYER_ROLES.DEFENDER,
  'attacker': PLAYER_ROLES.ATTACKER,
  'midfielder': PLAYER_ROLES.MIDFIELDER,
  'substitute': PLAYER_ROLES.SUBSTITUTE,
  'unknown': PLAYER_ROLES.UNKNOWN
};

/**
 * Reverse mapping from display values to PLAYER_ROLES constants
 */
export const DISPLAY_TO_ROLE_MAP = {
  'Goalie': PLAYER_ROLES.GOALIE,
  'Defender': PLAYER_ROLES.DEFENDER,
  'Attacker': PLAYER_ROLES.ATTACKER,
  'Midfielder': PLAYER_ROLES.MIDFIELDER,
  'Substitute': PLAYER_ROLES.SUBSTITUTE,
  'Field': PLAYER_ROLES.FIELD_PLAYER,
  'Unknown': PLAYER_ROLES.UNKNOWN
};

/**
 * Goal scoring priority mapping using PLAYER_ROLES constants
 * Lower numbers = higher priority (more likely to score)
 */
export const GOAL_SCORING_PRIORITY = {
  [PLAYER_ROLES.ATTACKER]: 1,
  [PLAYER_ROLES.MIDFIELDER]: 2,
  [PLAYER_ROLES.DEFENDER]: 3,
  [PLAYER_ROLES.GOALIE]: 4,
  [PLAYER_ROLES.SUBSTITUTE]: 5,
  [PLAYER_ROLES.UNKNOWN]: 5 // Same as substitute priority for unknown roles
};

/**
 * Convert PLAYER_ROLES constant to database format
 * @param {string} role - PLAYER_ROLES constant
 * @returns {string} Database role value (lowercase)
 */
export function roleToDatabase(role) {
  if (!role) {
    console.warn('roleToDatabase: No role provided, defaulting to unknown');
    return DB_ROLE_VALUES[PLAYER_ROLES.UNKNOWN];
  }
  
  const dbValue = DB_ROLE_VALUES[role];
  if (!dbValue) {
    console.warn(`roleToDatabase: Unknown role "${role}", defaulting to unknown`);
    return DB_ROLE_VALUES[PLAYER_ROLES.UNKNOWN];
  }
  
  return dbValue;
}

/**
 * Convert database format to PLAYER_ROLES constant
 * @param {string} dbRole - Database role value (lowercase)
 * @returns {string} PLAYER_ROLES constant
 */
export function roleFromDatabase(dbRole) {
  if (!dbRole) {
    console.warn('roleFromDatabase: No role provided, defaulting to UNKNOWN');
    return PLAYER_ROLES.UNKNOWN;
  }
  
  const role = DB_TO_ROLE_MAP[dbRole.toLowerCase()];
  if (!role) {
    console.warn(`roleFromDatabase: Unknown database role "${dbRole}", defaulting to UNKNOWN`);
    return PLAYER_ROLES.UNKNOWN;
  }
  
  return role;
}

/**
 * Convert PLAYER_ROLES constant to display format
 * @param {string} role - PLAYER_ROLES constant
 * @returns {string} Display role value (title case)
 */
export function roleToDisplay(role) {
  if (!role) {
    console.warn('roleToDisplay: No role provided, defaulting to Unknown');
    return DISPLAY_ROLE_VALUES[PLAYER_ROLES.UNKNOWN];
  }
  
  const displayValue = DISPLAY_ROLE_VALUES[role];
  if (!displayValue) {
    console.warn(`roleToDisplay: Unknown role "${role}", defaulting to Unknown`);
    return DISPLAY_ROLE_VALUES[PLAYER_ROLES.UNKNOWN];
  }
  
  return displayValue;
}

/**
 * Convert display format to PLAYER_ROLES constant
 * @param {string} displayRole - Display role value (title case)
 * @returns {string} PLAYER_ROLES constant
 */
export function roleFromDisplay(displayRole) {
  if (!displayRole) {
    console.warn('roleFromDisplay: No role provided, defaulting to UNKNOWN');
    return PLAYER_ROLES.UNKNOWN;
  }
  
  const role = DISPLAY_TO_ROLE_MAP[displayRole];
  if (!role) {
    console.warn(`roleFromDisplay: Unknown display role "${displayRole}", defaulting to UNKNOWN`);
    return PLAYER_ROLES.UNKNOWN;
  }
  
  return role;
}

/**
 * Normalize any role format to PLAYER_ROLES constant
 * Handles uppercase, lowercase, title case, and mixed case inputs
 * @param {string} anyRole - Role value in any format
 * @returns {string} PLAYER_ROLES constant
 */
export function normalizeRole(anyRole) {
  if (!anyRole) {
    return PLAYER_ROLES.UNKNOWN;
  }
  
  const roleStr = String(anyRole).trim();
  
  // Check if already a PLAYER_ROLES constant
  if (Object.values(PLAYER_ROLES).includes(roleStr)) {
    return roleStr;
  }
  
  // Try database format (lowercase)
  const fromDb = DB_TO_ROLE_MAP[roleStr.toLowerCase()];
  if (fromDb) {
    return fromDb;
  }
  
  // Try display format (title case)
  const fromDisplay = DISPLAY_TO_ROLE_MAP[roleStr];
  if (fromDisplay) {
    return fromDisplay;
  }
  
  // Try uppercase conversion (handles mixed case)
  const upperRole = roleStr.toUpperCase();
  if (Object.values(PLAYER_ROLES).includes(upperRole)) {
    return upperRole;
  }
  
  console.warn(`normalizeRole: Could not normalize role "${anyRole}", defaulting to UNKNOWN`);
  return PLAYER_ROLES.UNKNOWN;
}

/**
 * Validate that a value is a valid PLAYER_ROLES constant
 * @param {string} role - Role value to validate
 * @returns {boolean} True if valid PLAYER_ROLES constant
 */
export function isValidRole(role) {
  return Boolean(role && Object.values(PLAYER_ROLES).includes(role));
}

/**
 * Get goal scoring priority for a role
 * @param {string} role - PLAYER_ROLES constant
 * @returns {number} Priority value (lower = higher priority)
 */
export function getRolePriority(role) {
  const priority = GOAL_SCORING_PRIORITY[role];
  if (priority === undefined) {
    console.warn(`getRolePriority: Unknown role "${role}", returning lowest priority`);
    return GOAL_SCORING_PRIORITY[PLAYER_ROLES.UNKNOWN];
  }
  return priority;
}

/**
 * Development mode validation - throws errors for invalid roles
 * Only active when NODE_ENV !== 'production'
 * @param {string} role - Role to validate
 * @param {string} context - Context for error message
 */
export function validateRoleInDev(role, context = '') {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  if (!isValidRole(role)) {
    throw new Error(`Invalid role "${role}" in ${context}. Expected one of: ${Object.values(PLAYER_ROLES).join(', ')}`);
  }
}