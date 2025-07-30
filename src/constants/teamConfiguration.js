/**
 * Team Configuration Constants and Utilities
 * 
 * This module defines the composite team configuration system that separates
 * concerns between field format, squad size, formation, and substitution type.
 * This replaces the previous team mode system with a more scalable architecture.
 */

// Field formats supported by the application
export const FORMATS = {
  FORMAT_5V5: '5v5',
  FORMAT_7V7: '7v7'  // Future support
};

// Game configuration constants
export const GAME_CONSTANTS = {
  FIELD_PLAYERS_5V5: 4,        // Number of field players in 5v5 format
  GOALIE_COUNT: 1,             // Number of goalies
  MIN_SQUAD_SIZE: 5,           // Minimum squad size
  MAX_SQUAD_SIZE: 15           // Maximum squad size
};

// Tactical formations available for different formats
export const FORMATIONS = {
  FORMATION_2_2: '2-2',
  FORMATION_1_2_1: '1-2-1',
  FORMATION_1_3: '1-3',
  FORMATION_1_1_2: '1-1-2',
  FORMATION_2_1_1: '2-1-1',
};

// Detailed formation definitions, including status
export const FORMATION_DEFINITIONS = {
  [FORMATIONS.FORMATION_2_2]: { 
    label: '2-2 (2 Defenders, 2 Attackers)', 
    status: 'available' 
  },
  [FORMATIONS.FORMATION_1_2_1]: { 
    label: '1-2-1 (1 Defender, 2 Midfielders, 1 Attacker)', 
    status: 'available' 
  },
  [FORMATIONS.FORMATION_1_3]: { 
    label: '1-3 (Coming soon - Select to up-vote)', 
    status: 'coming-soon' 
  },
  [FORMATIONS.FORMATION_1_1_2]: { 
    label: '1-1-2 (Coming soon - Select to up-vote)', 
    status: 'coming-soon' 
  },
  [FORMATIONS.FORMATION_2_1_1]: { 
    label: '2-1-1 (Coming soon - Select to up-vote)', 
    status: 'coming-soon' 
  },
};

// Substitution styles available
export const SUBSTITUTION_TYPES = {
  INDIVIDUAL: 'individual',
  PAIRS: 'pairs'
};

/**
 * Creates a composite team configuration object
 * @param {string} format - Field format (5v5, 7v7, etc.)
 * @param {number} squadSize - Total number of players (5-15)
 * @param {string} formation - Tactical formation (2-2, 1-2-1, etc.)
 * @param {string} substitutionType - Substitution style (individual, pairs)
 * @returns {Object} Team configuration object
 */
export const createTeamConfig = (format, squadSize, formation, substitutionType) => ({
  format,
  squadSize,
  formation,
  substitutionType
});

/**
 * Gets valid formation options for a given format and squad size
 * @param {string} format - Field format
 * @param {number} squadSize - Squad size
 * @returns {string[]} Array of valid formation strings
 */
export const getValidFormations = (format, squadSize) => {
  if (format === FORMATS.FORMAT_5V5) {
    // For 5v5, all defined formations are returned
    return Object.keys(FORMATION_DEFINITIONS);
  }
  
  // Future: 7v7 formations
  if (format === FORMATS.FORMAT_7V7) {
    return [FORMATIONS.FORMATION_2_2]; // Placeholder for future 7v7 formations
  }
  
  // Default to 2-2 formation
  return [FORMATIONS.FORMATION_2_2];
};

/**
 * Validates a team configuration object
 * @param {Object} teamConfig - Team configuration to validate
 * @throws {Error} If configuration is invalid
 * @returns {boolean} True if valid
 */
export const validateTeamConfig = (teamConfig) => {
  const { format, squadSize, formation, substitutionType } = teamConfig;
  
  // Validate format
  if (!Object.values(FORMATS).includes(format)) {
    throw new Error(`Invalid format: ${format}. Must be one of: ${Object.values(FORMATS).join(', ')}`);
  }
  
  // Validate squad size
  if (squadSize < GAME_CONSTANTS.MIN_SQUAD_SIZE || squadSize > GAME_CONSTANTS.MAX_SQUAD_SIZE) {
    throw new Error(`Invalid squad size: ${squadSize}. Must be between ${GAME_CONSTANTS.MIN_SQUAD_SIZE} and ${GAME_CONSTANTS.MAX_SQUAD_SIZE} players`);
  }
  
  // Validate formation for the given format
  const validFormations = getValidFormations(format, squadSize);
  if (!validFormations.includes(formation)) {
    throw new Error(`Formation ${formation} not valid for ${format} with ${squadSize} players. Valid formations: ${validFormations.join(', ')}`);
  }
  
  // Validate substitution type
  if (!Object.values(SUBSTITUTION_TYPES).includes(substitutionType)) {
    throw new Error(`Invalid substitution type: ${substitutionType}. Must be one of: ${Object.values(SUBSTITUTION_TYPES).join(', ')}`);
  }
  
  return true;
};

/**
 * Creates a default team configuration
 * @param {number} squadSize - Squad size
 * @returns {Object} Default team configuration
 */
export const createDefaultTeamConfig = (squadSize) => {
  // Determine default substitution type based on squad size
  // 7-player squads can use pairs, others default to individual
  const defaultSubstitutionType = squadSize === 7 
    ? SUBSTITUTION_TYPES.PAIRS 
    : SUBSTITUTION_TYPES.INDIVIDUAL;
  
  return createTeamConfig(
    FORMATS.FORMAT_5V5,           // Default to 5v5
    squadSize,                    // Use provided squad size
    FORMATIONS.FORMATION_2_2,     // Default to 2-2 formation
    defaultSubstitutionType       // Individual or pairs based on squad size
  );
};