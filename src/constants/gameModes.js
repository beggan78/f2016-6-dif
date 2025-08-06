import { PLAYER_ROLES } from './playerConstants.js';
import { SUBSTITUTION_TYPES, GAME_CONSTANTS } from './teamConfiguration.js';

/**
 * Formation-specific position layouts
 * Defines the tactical arrangement and role mappings for each formation
 */
const FORMATION_LAYOUTS = {
  '2-2': {
    fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
    positions: {
      leftDefender: PLAYER_ROLES.DEFENDER,
      rightDefender: PLAYER_ROLES.DEFENDER,
      leftAttacker: PLAYER_ROLES.ATTACKER,
      rightAttacker: PLAYER_ROLES.ATTACKER,
    },
    expectedRoleCounts: {
      [PLAYER_ROLES.DEFENDER]: 2,
      [PLAYER_ROLES.ATTACKER]: 2
    }
  },
  '1-2-1': {
    fieldPositions: ['defender', 'left', 'right', 'attacker'],
    positions: {
      defender: PLAYER_ROLES.DEFENDER,
      left: PLAYER_ROLES.MIDFIELDER,
      right: PLAYER_ROLES.MIDFIELDER,
      attacker: PLAYER_ROLES.ATTACKER,
    },
    expectedRoleCounts: {
      [PLAYER_ROLES.DEFENDER]: 1,
      [PLAYER_ROLES.MIDFIELDER]: 2,
      [PLAYER_ROLES.ATTACKER]: 1
    }
  }
};

/**
 * Generate substitute positions dynamically based on squad size
 * @param {number} squadSize - Total number of players
 * @returns {string[]} Array of substitute position keys
 */
const generateSubstitutePositions = (squadSize) => {
  const substituteCount = squadSize - (GAME_CONSTANTS.FIELD_PLAYERS_5V5 + GAME_CONSTANTS.GOALIE_COUNT);
  return Array.from({ length: substituteCount }, (_, i) => `substitute_${i + 1}`);
};

/**
 * Calculate expected counts for formation validation
 * @param {Object} formationLayout - Formation layout object
 * @param {number} substituteCount - Number of substitute positions
 * @returns {Object} Expected counts object
 */
const calculateExpectedCounts = (formationLayout, substituteCount) => {
  return {
    outfield: GAME_CONSTANTS.FIELD_PLAYERS_5V5 + substituteCount,
    onField: GAME_CONSTANTS.FIELD_PLAYERS_5V5
  };
};

/**
 * Generate initial formation template
 * @param {Object} formationLayout - Formation layout object
 * @param {string[]} substitutePositions - Array of substitute position keys
 * @returns {Object} Initial formation template with null values
 */
const generateInitialFormationTemplate = (formationLayout, substitutePositions) => {
  const template = { goalie: null };
  
  // Add field positions
  formationLayout.fieldPositions.forEach(position => {
    template[position] = null;
  });
  
  // Add substitute positions
  substitutePositions.forEach(position => {
    template[position] = null;
  });
  
  return template;
};

/**
 * Create position objects from formation field positions
 * @param {Object} formationLayout - Formation layout object with positions
 * @returns {Object} Position objects mapped to roles
 */
const createFieldPositionObjects = (formationLayout) => {
  return Object.fromEntries(
    Object.entries(formationLayout.positions).map(([pos, role]) => [
      pos, { key: pos, role }
    ])
  );
};

/**
 * Create substitute position objects
 * @param {string[]} substitutePositions - Array of substitute position keys
 * @returns {Object} Substitute position objects
 */
const createSubstitutePositionObjects = (substitutePositions) => {
  return Object.fromEntries(
    substitutePositions.map(pos => [pos, { key: pos, role: PLAYER_ROLES.SUBSTITUTE }])
  );
};

/**
 * Build complete positions object for a team configuration
 * @param {Object} formationLayout - Formation layout object
 * @param {string[]} substitutePositions - Array of substitute position keys
 * @returns {Object} Complete positions object
 */
const buildCompletePositions = (formationLayout, substitutePositions) => {
  return {
    goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
    ...createFieldPositionObjects(formationLayout),
    ...createSubstitutePositionObjects(substitutePositions)
  };
};

/**
 * Simple memoization cache for getModeDefinition
 * Maps team config JSON string to mode definition
 */
const modeDefinitionCache = new Map();

/**
 * Determine substitute rotation pattern based on substitute count
 * @param {number} substituteCount - Number of substitute positions
 * @returns {string} Rotation pattern identifier
 */
const determineSubstituteRotationPattern = (substituteCount) => {
  if (substituteCount === 0) return 'none';
  if (substituteCount === 1) return 'simple';
  if (substituteCount === 2) return 'carousel';
  return 'advanced_carousel'; // 3+ substitutes
};

/**
 * Build pairs mode definition (special case handling)
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object} Complete pairs mode definition
 */
const buildPairsModeDefinition = (teamConfig) => {
  const { format, squadSize, formation, substitutionType } = teamConfig;
  
  return {
    format,
    squadSize,
    formation,
    substitutionType,
    positions: {
      goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
      leftPair: { key: 'leftPair', type: 'pair' },
      rightPair: { key: 'rightPair', type: 'pair' },  
      subPair: { key: 'subPair', type: 'pair' }
    },
    expectedCounts: { outfield: 6, onField: 4 },
    positionOrder: ['goalie', 'leftPair', 'rightPair', 'subPair'],
    fieldPositions: ['leftPair', 'rightPair'],
    substitutePositions: ['subPair'],
    supportsInactiveUsers: false,
    supportsNextNextIndicators: false,
    substituteRotationPattern: 'pairs',
    initialFormationTemplate: {
      goalie: null,
      leftPair: null,
      rightPair: null,
      subPair: null
    },
    validationMessage: "Please complete the team formation with 1 goalie and 3 pairs (6 outfield players)."
  };
};

/**
 * Build individual mode definition
 * @param {Object} teamConfig - Team configuration object
 * @param {Object} formationLayout - Formation layout object
 * @param {string[]} substitutePositions - Array of substitute position keys
 * @returns {Object} Complete individual mode definition
 */
const buildIndividualModeDefinition = (teamConfig, formationLayout, substitutePositions) => {
  const { format, squadSize, formation, substitutionType } = teamConfig;
  
  const positions = buildCompletePositions(formationLayout, substitutePositions);
  const expectedCounts = calculateExpectedCounts(formationLayout, substitutePositions.length);
  const positionOrder = ['goalie', ...formationLayout.fieldPositions, ...substitutePositions];
  const substituteRotationPattern = determineSubstituteRotationPattern(substitutePositions.length);
  
  return {
    format,
    squadSize,
    formation,
    substitutionType,
    positions,
    expectedCounts,
    positionOrder,
    fieldPositions: formationLayout.fieldPositions,
    substitutePositions,
    supportsInactiveUsers: substitutePositions.length > 0,
    supportsNextNextIndicators: substitutePositions.length >= 2,
    substituteRotationPattern,
    initialFormationTemplate: generateInitialFormationTemplate(formationLayout, substitutePositions),
    validationMessage: `Please complete the team formation with 1 goalie and ${squadSize - 1} unique outfield players.`
  };
};

/**
 * Dynamic mode definition generator with memoization
 * @param {Object} teamConfig - Composite team configuration
 * @returns {Object} Complete mode definition object
 */
export const getModeDefinition = (teamConfig) => {
  // Handle null/undefined team config
  if (!teamConfig) {
    return null;
  }
  
  // Create cache key from team config
  const cacheKey = JSON.stringify(teamConfig);
  
  // Check cache first
  if (modeDefinitionCache.has(cacheKey)) {
    return modeDefinitionCache.get(cacheKey);
  }
  
  // Generate mode definition
  let modeDefinition;
  
  if (teamConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    modeDefinition = buildPairsModeDefinition(teamConfig);
  } else {
    // Individual substitution type
    const formationLayout = FORMATION_LAYOUTS[teamConfig.formation];
    if (!formationLayout) {
      console.warn(`Unknown formation: ${teamConfig.formation}`);
      return null;
    }
    
    const substitutePositions = generateSubstitutePositions(teamConfig.squadSize);
    modeDefinition = buildIndividualModeDefinition(teamConfig, formationLayout, substitutePositions);
  }
  
  // Cache and return
  modeDefinitionCache.set(cacheKey, modeDefinition);
  return modeDefinition;
};

// =============================================================================
// PUBLIC API FUNCTIONS - All work exclusively with teamConfig objects
// =============================================================================

/**
 * Get formation positions (excluding goalie)
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of position keys
 */
export function getFormationPositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.fieldPositions : [];
}

/**
 * Get all formation positions including goalie
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of position keys including goalie
 */
export function getFormationPositionsWithGoalie(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? ['goalie', ...definition.fieldPositions] : [];
}

/**
 * Get initial formation template with optional goalie assignment
 * @param {Object} teamConfig - Team configuration object
 * @param {string} goalieId - Optional goalie player ID
 * @returns {Object} Formation template object
 */
export function getInitialFormationTemplate(teamConfig, goalieId = null) {
  const definition = getModeDefinition(teamConfig);
  if (!definition) return {};
  
  const template = { ...definition.initialFormationTemplate };
  if (goalieId) {
    template.goalie = goalieId;
  }
  return template;
}

/**
 * Get validation message for team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string} Validation message
 */
export function getValidationMessage(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.validationMessage : 'Invalid team configuration';
}

/**
 * Get outfield positions (field + substitutes, excluding goalie)
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of outfield position keys
 */
export function getOutfieldPositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? [...definition.fieldPositions, ...definition.substitutePositions] : [];
}

/**
 * Check if team configuration supports inactive users
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if inactive users are supported
 */
export function supportsInactiveUsers(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.supportsInactiveUsers : false;
}

/**
 * Check if team configuration supports next-next indicators
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if next-next indicators are supported
 */
export function supportsNextNextIndicators(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.supportsNextNextIndicators : false;
}

/**
 * Check if team configuration is individual mode
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if individual substitution mode
 */
export function isIndividualMode(teamConfig) {
  if (!teamConfig) return false;
  return teamConfig.substitutionType === SUBSTITUTION_TYPES.INDIVIDUAL;
}

/**
 * Get player count for team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {number|null} Squad size or null if invalid
 */
export function getPlayerCountForMode(teamConfig) {
  if (!teamConfig) return null;
  return teamConfig.squadSize;
}

/**
 * Create individual mode checker function for specific squad size
 * @param {number} squadSize - Squad size to check for
 * @returns {Function} Function that checks if teamConfig matches the squad size
 */
const createIndividualModeChecker = (squadSize) => (teamConfig) => {
  if (!teamConfig) return false;
  return teamConfig.squadSize === squadSize && teamConfig.substitutionType === SUBSTITUTION_TYPES.INDIVIDUAL;
};

// Export individual mode checkers
export const isIndividual5Mode = createIndividualModeChecker(5);
export const isIndividual6Mode = createIndividualModeChecker(6);
export const isIndividual7Mode = createIndividualModeChecker(7);
export const isIndividual8Mode = createIndividualModeChecker(8);
export const isIndividual9Mode = createIndividualModeChecker(9);
export const isIndividual10Mode = createIndividualModeChecker(10);

/**
 * Get all positions for team configuration (including goalie)
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of all position keys
 */
export function getAllPositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.positionOrder : [];
}

/**
 * Get valid positions for team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of valid position keys
 */
export function getValidPositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  if (!definition) return [];
  
  if (teamConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    return ['leftPair', 'rightPair', 'subPair'];
  }
  
  return definition.positionOrder;
}

/**
 * Get maximum inactive player count for team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {number} Maximum inactive count
 */
export function getMaxInactiveCount(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.substitutePositions.length : 0;
}

/**
 * Get substitute positions for team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of substitute position keys
 */
export function getSubstitutePositions(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  return definition ? definition.substitutePositions : [];
}

/**
 * Get bottom substitute position for team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {string|null} Bottom substitute position or null
 */
export function getBottomSubstitutePosition(teamConfig) {
  const definition = getModeDefinition(teamConfig);
  if (!definition || !definition.substitutePositions.length) {
    return null;
  }
  return definition.substitutePositions[definition.substitutePositions.length - 1];
}

/**
 * Initialize player role and status based on formation position
 * @param {string} playerId - Player ID
 * @param {Object} formation - Current formation
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object} Player role and status information
 */
export function initializePlayerRoleAndStatus(playerId, formation, teamConfig) {
  const definition = getModeDefinition(teamConfig);
  if (!definition) {
    return { currentRole: PLAYER_ROLES.SUBSTITUTE, currentStatus: PLAYER_ROLES.SUBSTITUTE };
  }

  // Find player position in formation
  for (const [position, assignedPlayerId] of Object.entries(formation)) {
    if (assignedPlayerId === playerId) {
      const positionInfo = definition.positions[position];
      if (positionInfo) {
        const role = positionInfo.role;
        return { 
          currentRole: role, 
          currentStatus: role,
          currentPairKey: position
        };
      }
    }
  }

  const isPairs = teamConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS;
  
  // Default to substitute if not found in formation
  return {
    currentRole: PLAYER_ROLES.SUBSTITUTE,
    currentStatus: PLAYER_ROLES.SUBSTITUTE,
    currentPairKey: isPairs ? 'subPair' : 'substitute_1'
  };
}