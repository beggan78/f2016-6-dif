/**
 * Team Configuration Constants and Utilities
 * 
 * This module defines the modern composite team configuration system that replaces
 * legacy string-based team modes (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7) with a
 * flexible architecture based on four independent components:
 * 
 * 1. **Format** - Field format (5v5, future: 7v7)
 * 2. **Squad Size** - Total players (5-15 supported)
 * 3. **Formation** - Tactical formation (2-2, 1-2-1, future formations)
 * 4. **Substitution Type** - Substitution style (individual, pairs)
 * 
 * Benefits:
 * - Scalable to any squad size within limits
 * - Formation-independent substitution logic
 * - Clear separation of concerns
 * - Easy addition of new formations and substitution types
 * - Dynamic position and role generation
 */

// Field formats supported by the application
export const FORMATS = {
  FORMAT_5V5: '5v5',
  FORMAT_7V7: '7v7'
};

// Game configuration constants
export const GAME_CONSTANTS = {
  FIELD_PLAYERS_5V5: 4,        // Number of field players in 5v5 format (legacy reference)
  GOALIE_COUNT: 1,             // Number of goalies
  MIN_SQUAD_SIZE: 5,           // Minimum squad size
  DEFAULT_MAX_SQUAD_SIZE: 15   // Fallback maximum squad size when format metadata is absent
};

// Maximum squad sizes per supported format (defaulting to fallback above when missing)
export const MAX_SQUAD_SIZE_BY_FORMAT = {
  [FORMATS.FORMAT_5V5]: 11,
  [FORMATS.FORMAT_7V7]: 15,
  '9v9': 19 // Placeholder for future introduction of 9v9 format
};

// Tactical formations available for different formats
export const FORMATIONS = {
  FORMATION_2_2: '2-2',
  FORMATION_1_2_1: '1-2-1',
  FORMATION_1_3: '1-3',
  FORMATION_1_1_2: '1-1-2',
  FORMATION_2_1_1: '2-1-1',
  FORMATION_2_2_2: '2-2-2',
  FORMATION_2_3_1: '2-3-1',
  FORMATION_3_3: '3-3',
  FORMATION_1_3_2: '1-3-2',
  FORMATION_2_1_3: '2-1-3',
  FORMATION_3_2_1: '3-2-1',
  FORMATION_3_1_2: '3-1-2'
};

// Detailed formation definitions, including status
export const FORMATION_DEFINITIONS = {
  [FORMATIONS.FORMATION_2_2]: { 
    label: '2-2', 
    status: 'available',
    formats: [FORMATS.FORMAT_5V5]
  },
  [FORMATIONS.FORMATION_1_2_1]: { 
    label: '1-2-1', 
    status: 'available',
    formats: [FORMATS.FORMAT_5V5]
  },
  [FORMATIONS.FORMATION_1_3]: { 
    label: '1-3 (Coming soon - Select to up-vote)', 
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_5V5]
  },
  [FORMATIONS.FORMATION_1_1_2]: { 
    label: '1-1-2 (Coming soon - Select to up-vote)', 
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_5V5]
  },
  [FORMATIONS.FORMATION_2_1_1]: { 
    label: '2-1-1 (Coming soon - Select to up-vote)', 
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_5V5]
  },
  [FORMATIONS.FORMATION_2_2_2]: {
    label: '2-2-2',
    status: 'available',
    formats: [FORMATS.FORMAT_7V7]
  },
  [FORMATIONS.FORMATION_2_3_1]: {
    label: '2-3-1',
    status: 'available',
    formats: [FORMATS.FORMAT_7V7]
  },
  [FORMATIONS.FORMATION_3_3]: {
    label: '3-3 (Coming soon - Select to up-vote)',
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_7V7]
  },
  [FORMATIONS.FORMATION_1_3_2]: {
    label: '1-3-2 (Coming soon - Select to up-vote)',
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_7V7]
  },
  [FORMATIONS.FORMATION_2_1_3]: {
    label: '2-1-3 (Coming soon - Select to up-vote)',
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_7V7]
  },
  [FORMATIONS.FORMATION_3_2_1]: {
    label: '3-2-1 (Coming soon - Select to up-vote)',
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_7V7]
  },
  [FORMATIONS.FORMATION_3_1_2]: {
    label: '3-1-2 (Coming soon - Select to up-vote)',
    status: 'coming-soon',
    formats: [FORMATS.FORMAT_7V7]
  },
};

// Substitution styles available
export const SUBSTITUTION_TYPES = {
  INDIVIDUAL: 'individual',
  PAIRS: 'pairs'
};

// Centralised format metadata for dynamic validation/selection logic
export const FORMAT_CONFIGS = {
  [FORMATS.FORMAT_5V5]: {
    label: '5v5',
    fieldPlayers: 4,
    defaultFormation: FORMATIONS.FORMATION_2_2,
    formations: [
      FORMATIONS.FORMATION_2_2,
      FORMATIONS.FORMATION_1_2_1,
      FORMATIONS.FORMATION_1_3,
      FORMATIONS.FORMATION_1_1_2,
      FORMATIONS.FORMATION_2_1_1
    ],
    allowedSubstitutionTypes: [SUBSTITUTION_TYPES.INDIVIDUAL, SUBSTITUTION_TYPES.PAIRS],
    getDefaultSubstitutionType: (squadSize) => (squadSize === 7 ? SUBSTITUTION_TYPES.PAIRS : SUBSTITUTION_TYPES.INDIVIDUAL)
  },
  [FORMATS.FORMAT_7V7]: {
    label: '7v7',
    fieldPlayers: 6,
    defaultFormation: FORMATIONS.FORMATION_2_2_2,
    formations: [
      FORMATIONS.FORMATION_2_2_2,
      FORMATIONS.FORMATION_2_3_1,
      FORMATIONS.FORMATION_3_3,
      FORMATIONS.FORMATION_1_3_2,
      FORMATIONS.FORMATION_2_1_3,
      FORMATIONS.FORMATION_3_2_1,
      FORMATIONS.FORMATION_3_1_2
    ],
    allowedSubstitutionTypes: [SUBSTITUTION_TYPES.INDIVIDUAL],
    getDefaultSubstitutionType: () => SUBSTITUTION_TYPES.INDIVIDUAL
  }
};

/**
 * Determine minimum players required for a given format (goalie + field players)
 * Falls back to global minimum squad size if format metadata is unavailable
 * @param {string} format - Team format identifier (e.g., 5v5, 7v7)
 * @returns {number} Minimum players required to satisfy the format
 */
export function getMinimumPlayersForFormat(format) {
  const formatConfig = FORMAT_CONFIGS[format];
  const goalieCount = GAME_CONSTANTS.GOALIE_COUNT ?? 1;
  if (!formatConfig || typeof formatConfig.fieldPlayers !== 'number') {
    return GAME_CONSTANTS.MIN_SQUAD_SIZE;
  }

  const minimumPlayers = formatConfig.fieldPlayers + goalieCount;
  return Math.max(GAME_CONSTANTS.MIN_SQUAD_SIZE, minimumPlayers);
}

/**
 * Determine maximum players allowed for a given format
 * Falls back to global default when format-specific limit is not defined
 * @param {string} format - Team format identifier (e.g., 5v5, 7v7)
 * @returns {number} Maximum players allowed for the format
 */
export function getMaximumPlayersForFormat(format) {
  const formatCap = MAX_SQUAD_SIZE_BY_FORMAT[format];
  if (typeof formatCap === 'number') {
    return Math.max(GAME_CONSTANTS.MIN_SQUAD_SIZE, formatCap);
  }

  return Math.max(GAME_CONSTANTS.MIN_SQUAD_SIZE, GAME_CONSTANTS.DEFAULT_MAX_SQUAD_SIZE);
}

// Pair role rotation styles (for pairs substitution mode)
export const PAIRED_ROLE_STRATEGY_TYPES = {
  KEEP_THROUGHOUT_PERIOD: 'keep_throughout_period',
  SWAP_EVERY_ROTATION: 'swap_every_rotation'
};

// Detailed paired role strategy definitions
export const PAIRED_ROLE_STRATEGY_DEFINITIONS = {
  [PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD]: {
    label: 'Keep roles throughout period',
    description: 'Players maintain their defender/attacker roles for the entire period',
    shortDescription: 'Consistent roles all period'
  },
  [PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION]: {
    label: 'Swap roles every rotation',
    description: 'Players swap defender/attacker roles each time the pair is substituted',
    shortDescription: 'Roles swap each substitution'
  }
};

export const PAIRED_ROLE_STRATEGY_SUPPORTED_SQUAD_SIZES = {
  [SUBSTITUTION_TYPES.PAIRS]: [7],
  [SUBSTITUTION_TYPES.INDIVIDUAL]: [7, 9, 11]
};

/**
 * Determines if a team configuration supports paired role strategies
 * @param {Object} config - Team configuration fields
 * @returns {boolean} True if paired role strategies are supported
 */
export const canUsePairedRoleStrategy = ({ format, squadSize, formation, substitutionType } = {}) => {
  if (!format || !formation || !squadSize || !substitutionType) {
    return false;
  }

  if (format !== FORMATS.FORMAT_5V5) {
    return false;
  }

  if (formation !== FORMATIONS.FORMATION_2_2) {
    return false;
  }

  const supportedSizes = PAIRED_ROLE_STRATEGY_SUPPORTED_SQUAD_SIZES[substitutionType];
  if (!Array.isArray(supportedSizes)) {
    return false;
  }

  return supportedSizes.includes(squadSize);
};

/**
 * Creates a composite team configuration object
 * @param {string} format - Field format (5v5, 7v7, etc.)
 * @param {number} squadSize - Total number of players (5-15)
 * @param {string} formation - Tactical formation (2-2, 1-2-1, etc.)
 * @param {string} substitutionType - Substitution style (individual, pairs)
 * @param {string} [pairedRoleStrategy] - Paired role strategy (only for paired-compatible modes)
 * @returns {Object} Team configuration object
 */
export const createTeamConfig = (format, squadSize, formation, substitutionType, pairedRoleStrategy = null) => {
  const config = {
    format,
    squadSize,
    formation,
    substitutionType
  };

  if (canUsePairedRoleStrategy(config)) {
    config.pairedRoleStrategy = pairedRoleStrategy || PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD;
  }

  return config;
};

/**
 * Gets valid formation options for a given format and squad size
 * @param {string} format - Field format
 * @param {number} squadSize - Squad size
 * @returns {string[]} Array of valid formation strings
 */
export const getValidFormations = (format, squadSize) => {
  const formationsForFormat = Object.entries(FORMATION_DEFINITIONS)
    .filter(([, definition]) => {
      if (definition.formats && !definition.formats.includes(format)) {
        return false;
      }
      return true;
    })
    .map(([key]) => key);

  if (formationsForFormat.length > 0) {
    return formationsForFormat;
  }

  // Fallback: retain existing behaviour for unknown formats
  return [FORMATIONS.FORMATION_2_2];
};

/**
 * Validates a team configuration object
 * @param {Object} teamConfig - Team configuration to validate
 * @throws {Error} If configuration is invalid
 * @returns {boolean} True if valid
 */
export const validateTeamConfig = (teamConfig) => {
  const { format, squadSize, formation, substitutionType, pairedRoleStrategy } = teamConfig;

  // Validate format
  if (!Object.values(FORMATS).includes(format) || !FORMAT_CONFIGS[format]) {
    throw new Error(`Invalid format: ${format}. Must be one of: ${Object.values(FORMATS).join(', ')}`);
  }

  const formatConfig = FORMAT_CONFIGS[format];
  const maximumPlayersForFormat = getMaximumPlayersForFormat(format);

  // Validate squad size
  if (squadSize < GAME_CONSTANTS.MIN_SQUAD_SIZE || squadSize > maximumPlayersForFormat) {
    throw new Error(`Invalid squad size: ${squadSize}. Must be between ${GAME_CONSTANTS.MIN_SQUAD_SIZE} and ${maximumPlayersForFormat} players for ${format}`);
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

  if (!formatConfig.allowedSubstitutionTypes.includes(substitutionType)) {
    throw new Error(`Substitution type ${substitutionType} is not supported for ${format}. Allowed: ${formatConfig.allowedSubstitutionTypes.join(', ')}`);
  }

  // Business rule: Pairs substitution only allowed with 2-2 formation and 7 players
  if (substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    if (format !== FORMATS.FORMAT_5V5) {
      throw new Error(`Pairs substitution is only supported for ${FORMATS.FORMAT_5V5}, not ${format}`);
    }
    if (formation !== FORMATIONS.FORMATION_2_2) {
      throw new Error(`Pairs substitution is only supported with ${FORMATIONS.FORMATION_2_2} formation, not ${formation}`);
    }
    if (squadSize !== 7) {
      throw new Error(`Pairs substitution is only supported with 7 players, not ${squadSize} players`);
    }
  }

  const supportsPairedStrategy = canUsePairedRoleStrategy(teamConfig);

  if (pairedRoleStrategy !== undefined && pairedRoleStrategy !== null) {
    if (!Object.values(PAIRED_ROLE_STRATEGY_TYPES).includes(pairedRoleStrategy)) {
      throw new Error(`Invalid paired role strategy: ${pairedRoleStrategy}. Must be one of: ${Object.values(PAIRED_ROLE_STRATEGY_TYPES).join(', ')}`);
    }

    if (!supportsPairedStrategy) {
      throw new Error('pairedRoleStrategy can only be set when the configuration supports paired rotations');
    }
  }

  return true;
};

/**
 * Validates and auto-corrects a team configuration object
 * If the configuration is invalid, it returns a corrected version
 * @param {Object} teamConfig - Team configuration to validate and potentially correct
 * @returns {Object} { isValid: boolean, correctedConfig: Object, corrections: string[] }
 */
export const validateAndCorrectTeamConfig = (teamConfig) => {
  const corrections = [];
  let correctedConfig = { ...teamConfig };
  const formatConfig = FORMAT_CONFIGS[teamConfig.format];

  try {
    validateTeamConfig(teamConfig);
    return { isValid: true, correctedConfig: teamConfig, corrections: [] };
  } catch (error) {
    // Handle specific business rule violations with auto-correction
    const { squadSize, formation, substitutionType } = correctedConfig;

    // Auto-correct unsupported substitution types for the selected format
    if (formatConfig && !formatConfig.allowedSubstitutionTypes.includes(substitutionType)) {
      const fallbackSubType = formatConfig.getDefaultSubstitutionType
        ? formatConfig.getDefaultSubstitutionType(squadSize)
        : SUBSTITUTION_TYPES.INDIVIDUAL;

      correctedConfig.substitutionType = fallbackSubType;
      correctedConfig.pairedRoleStrategy = null;
      corrections.push(`Changed substitution type to ${fallbackSubType} (unsupported for format ${teamConfig.format})`);
      if (teamConfig.pairedRoleStrategy) {
        corrections.push('Removed pairedRoleStrategy setting (configuration does not support paired rotations)');
      }
    }

    // Auto-correct pairs substitution incompatibility
    if (correctedConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
      const pairsSupportedForFormat = correctedConfig.format === FORMATS.FORMAT_5V5;
      if (!pairsSupportedForFormat || formation !== FORMATIONS.FORMATION_2_2 || squadSize !== 7) {
        correctedConfig.substitutionType = SUBSTITUTION_TYPES.INDIVIDUAL;
        correctedConfig.pairedRoleStrategy = null;
        corrections.push(`Changed substitution type from pairs to individual (pairs only supported with 2-2 formation and 7 players)`);
        if (teamConfig.pairedRoleStrategy) {
          corrections.push('Removed pairedRoleStrategy setting (configuration does not support paired rotations)');
        }

        console.log('⚠️ TEAM CONFIG AUTO-CORRECTION: Pairs substitution incompatible with configuration', {
          formation,
          squadSize,
          originalSubstitutionType: substitutionType,
          correctedSubstitutionType: correctedConfig.substitutionType
        });
      }
    }

    const supportsPairedStrategy = canUsePairedRoleStrategy(correctedConfig);

    if (!supportsPairedStrategy && correctedConfig.pairedRoleStrategy) {
      const originalStrategy = teamConfig.pairedRoleStrategy ?? correctedConfig.pairedRoleStrategy;
      correctedConfig.pairedRoleStrategy = null;
      corrections.push(`Removed pairedRoleStrategy setting (configuration does not support paired rotations)`);

      console.log('⚠️ TEAM CONFIG AUTO-CORRECTION: pairedRoleStrategy removed for unsupported configuration', {
        originalPairedRoleStrategy: originalStrategy,
        correctedPairedRoleStrategy: correctedConfig.pairedRoleStrategy,
        substitutionType: correctedConfig.substitutionType,
        format: correctedConfig.format,
        formation: correctedConfig.formation,
        squadSize: correctedConfig.squadSize
      });
    } else if (supportsPairedStrategy && !correctedConfig.pairedRoleStrategy) {
      correctedConfig.pairedRoleStrategy = PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD;
    }

    // Try validation again with corrected config
    try {
      validateTeamConfig(correctedConfig);
      return { isValid: false, correctedConfig, corrections };
    } catch (validationError) {
      // If still invalid, throw the original validation error
      throw error;
    }
  }
};

/**
 * Creates a default team configuration
 * @param {number} squadSize - Squad size
 * @returns {Object} Default team configuration
 */
export const createDefaultTeamConfig = (squadSize, format = FORMATS.FORMAT_5V5) => {
  const resolvedFormat = FORMAT_CONFIGS[format] ? format : FORMATS.FORMAT_5V5;
  const formatConfig = FORMAT_CONFIGS[resolvedFormat];

  const defaultSubstitutionType = formatConfig.getDefaultSubstitutionType
    ? formatConfig.getDefaultSubstitutionType(squadSize)
    : SUBSTITUTION_TYPES.INDIVIDUAL;

  const defaultFormation = formatConfig.defaultFormation || FORMATIONS.FORMATION_2_2;

  const defaultPairedRoleStrategy = canUsePairedRoleStrategy({
    format: resolvedFormat,
    squadSize,
    formation: defaultFormation,
    substitutionType: defaultSubstitutionType
  })
    ? PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
    : null;

  return createTeamConfig(
    resolvedFormat,
    squadSize,
    defaultFormation,
    defaultSubstitutionType,
    defaultPairedRoleStrategy
  );
};
