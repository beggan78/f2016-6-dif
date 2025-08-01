import { PLAYER_ROLES, TEAM_MODES } from './playerConstants.js';
import { SUBSTITUTION_TYPES, GAME_CONSTANTS, validateTeamConfig } from './teamConfiguration.js';

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
 * Unified helper to get mode definition from either legacy string or modern config object
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {Object|null} Mode definition object or null if invalid
 */
export const getDefinition = (teamModeOrConfig) => {
  if (!teamModeOrConfig) {
    return null;
  }
  if (typeof teamModeOrConfig === 'string') {
    return getLegacyModeDefinition(teamModeOrConfig);
  }
  return getModeDefinition(teamModeOrConfig);
};

/**
 * Dynamic mode definition generator with memoization - BREAKING CHANGE: Replaces static MODE_DEFINITIONS
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
  
  // Validate team configuration
  validateTeamConfig(teamConfig);
  
  const { formation, substitutionType, squadSize } = teamConfig;
  
  // Get formation layout
  const formationLayout = FORMATION_LAYOUTS[formation];
  if (!formationLayout) {
    throw new Error(`Unknown formation: ${formation}`);
  }
  
  let modeDefinition;
  
  // Handle pairs mode (special case)
  if (substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    modeDefinition = buildPairsModeDefinition(teamConfig);
  } else {
    // Generate substitute positions for individual mode
    const substitutePositions = generateSubstitutePositions(squadSize);
    
    // Build individual mode definition
    modeDefinition = buildIndividualModeDefinition(teamConfig, formationLayout, substitutePositions);
  }
  
  // Cache the result
  modeDefinitionCache.set(cacheKey, modeDefinition);
  
  return modeDefinition;
};

// BREAKING CHANGE: Temporary export for test compatibility
// This will be removed once all tests are updated to use getModeDefinition()
export const MODE_DEFINITIONS = {};

/**
 * Position-role lookup table - UPDATED: Includes 1-2-1 formation positions
 * Used for mapping positions to player roles across all formations
 */
export const POSITION_ROLE_MAP = {
  // Common positions
  goalie: PLAYER_ROLES.GOALIE,
  
  // 2-2 Formation positions
  leftDefender: PLAYER_ROLES.DEFENDER,
  rightDefender: PLAYER_ROLES.DEFENDER,
  leftAttacker: PLAYER_ROLES.ATTACKER,
  rightAttacker: PLAYER_ROLES.ATTACKER,
  
  // 1-2-1 Formation positions
  defender: PLAYER_ROLES.DEFENDER,      // Single center back
  left: PLAYER_ROLES.MIDFIELDER,        // Left midfielder
  right: PLAYER_ROLES.MIDFIELDER,       // Right midfielder
  attacker: PLAYER_ROLES.ATTACKER,      // Single center forward
  
  // Substitute positions (dynamically generated, but commonly used)
  substitute_1: PLAYER_ROLES.SUBSTITUTE,
  substitute_2: PLAYER_ROLES.SUBSTITUTE,
  substitute_3: PLAYER_ROLES.SUBSTITUTE,
  substitute_4: PLAYER_ROLES.SUBSTITUTE,
  substitute_5: PLAYER_ROLES.SUBSTITUTE
};

// BREAKING CHANGE: All utility functions now use dynamic mode definitions
// These functions maintain the same API but use getModeDefinition() internally

/**
 * Get formation positions (excluding goalie) - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {string[]} Array of position keys excluding goalie
 */
export function getFormationPositions(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition ? definition.positionOrder.filter(pos => pos !== 'goalie') : [];
}

/**
 * Get formation positions including goalie - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {string[]} Array of all position keys including goalie
 */
export function getFormationPositionsWithGoalie(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition ? definition.positionOrder : [];
}

/**
 * Get initial formation template - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @param {string|null} goalieId - Optional goalie ID to pre-fill
 * @returns {Object} Formation template object with position keys mapped to player IDs or null
 */
export function getInitialFormationTemplate(teamModeOrConfig, goalieId = null) {
  const definition = getDefinition(teamModeOrConfig);
  if (!definition?.initialFormationTemplate) return {};
  
  const template = { ...definition.initialFormationTemplate };
  if (goalieId) {
    template.goalie = goalieId;
  }
  return template;
}

/**
 * Get validation message - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {string} Human-readable validation message for formation completion
 */
export function getValidationMessage(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition?.validationMessage || "Please complete the team formation.";
}

/**
 * Get all outfield positions - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {string[]} Array of field and substitute position keys (excludes goalie)
 */
export function getOutfieldPositions(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  if (!definition) return [];
  
  return [...definition.fieldPositions, ...definition.substitutePositions];
}

/**
 * Check if supports inactive players - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {boolean} True if team configuration supports inactive player management
 */
export function supportsInactiveUsers(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition?.supportsInactiveUsers || false;
}

/**
 * Check if supports next-next indicators - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function supportsNextNextIndicators(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition?.supportsNextNextIndicators || false;
}

/**
 * Check if is individual mode - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function isIndividualMode(teamModeOrConfig) {
  if (!teamModeOrConfig) return false;
  if (typeof teamModeOrConfig === 'string') {
    return [TEAM_MODES.INDIVIDUAL_5, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8, TEAM_MODES.INDIVIDUAL_9, TEAM_MODES.INDIVIDUAL_10].includes(teamModeOrConfig);
  }
  return teamModeOrConfig.substitutionType === SUBSTITUTION_TYPES.INDIVIDUAL;
}

/**
 * Get player count for team mode - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function getPlayerCountForMode(teamModeOrConfig) {
  if (!teamModeOrConfig) return null;
  if (typeof teamModeOrConfig === 'string') {
    const definition = getLegacyModeDefinition(teamModeOrConfig);
    if (!definition) return null;
    
    if (teamModeOrConfig === TEAM_MODES.PAIRS_7) {
      return 7;
    }
    return definition.positionOrder.length;
  }
  return teamModeOrConfig.squadSize;
}

/**
 * Factory function to create individual mode checkers for specific squad sizes
 * @param {number} squadSize - The squad size to check for
 * @returns {Function} Function that checks if teamModeOrConfig matches the squad size
 */
const createIndividualModeChecker = (squadSize) => (teamModeOrConfig) => {
  if (!teamModeOrConfig) return false;
  if (typeof teamModeOrConfig === 'string') {
    const expectedTeamMode = `INDIVIDUAL_${squadSize}`;
    return teamModeOrConfig === TEAM_MODES[expectedTeamMode];
  }
  return teamModeOrConfig.squadSize === squadSize && teamModeOrConfig.substitutionType === SUBSTITUTION_TYPES.INDIVIDUAL;
};

/**
 * Legacy team mode checks - BREAKING CHANGE: These now work with team config objects too
 * Generated using factory function to eliminate code duplication
 */
export const isIndividual5Mode = createIndividualModeChecker(5);
export const isIndividual6Mode = createIndividualModeChecker(6);
export const isIndividual7Mode = createIndividualModeChecker(7);
export const isIndividual8Mode = createIndividualModeChecker(8);
export const isIndividual9Mode = createIndividualModeChecker(9);
export const isIndividual10Mode = createIndividualModeChecker(10);

/**
 * Get all positions - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function getAllPositions(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition ? definition.positionOrder : [];
}

/**
 * Get valid positions for switching operations - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function getValidPositions(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  if (!definition) return [];
  
  if (typeof teamModeOrConfig === 'string' && teamModeOrConfig === TEAM_MODES.PAIRS_7) {
    return ['leftPair', 'rightPair', 'subPair'];
  }
  
  if (typeof teamModeOrConfig === 'object' && teamModeOrConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    return ['leftPair', 'rightPair', 'subPair'];
  }
  
  return [...definition.fieldPositions, ...definition.substitutePositions];
}

/**
 * Get max inactive count - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function getMaxInactiveCount(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition?.substitutePositions.length || 0;
}

/**
 * Get substitute positions - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 * @returns {string[]} Array of substitute position keys
 */
export function getSubstitutePositions(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  return definition?.substitutePositions || [];
}

/**
 * Get bottom substitute position - UPDATED: Uses dynamic definitions
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function getBottomSubstitutePosition(teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  if (!definition?.substitutePositions?.length) return null;
  
  return definition.substitutePositions[definition.substitutePositions.length - 1];
}

/**
 * Initialize player role and status - UPDATED: Uses dynamic definitions
 * @param {string} playerId - Player ID
 * @param {Object} formation - Formation object
 * @param {Object|string} teamModeOrConfig - Team mode string (legacy) or team config object
 */
export function initializePlayerRoleAndStatus(playerId, formation, teamModeOrConfig) {
  const definition = getDefinition(teamModeOrConfig);
  if (!definition) {
    return { role: null, status: null, pairKey: null };
  }
  
  // Check if player is goalie
  if (playerId === formation.goalie) {
    return {
      role: PLAYER_ROLES.GOALIE,
      status: 'goalie',
      pairKey: 'goalie'
    };
  }
  
  // Handle pairs mode FIRST (special case) - this should come before individual position checks
  const isPairs = (typeof teamModeOrConfig === 'string' && teamModeOrConfig === TEAM_MODES.PAIRS_7) ||
                  (typeof teamModeOrConfig === 'object' && teamModeOrConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS);
  
  if (isPairs) {
    const pairPositions = ['leftPair', 'rightPair', 'subPair'];
    for (const pairKey of pairPositions) {
      const pair = formation[pairKey];
      if (pair) {
        if (playerId === pair.defender) {
          const result = {
            role: pairKey === 'subPair' ? PLAYER_ROLES.SUBSTITUTE : PLAYER_ROLES.DEFENDER,
            status: pairKey === 'subPair' ? 'substitute' : 'on_field',
            pairKey
          };
          return result;
        }
        if (playerId === pair.attacker) {
          const result = {
            role: pairKey === 'subPair' ? PLAYER_ROLES.SUBSTITUTE : PLAYER_ROLES.ATTACKER,
            status: pairKey === 'subPair' ? 'substitute' : 'on_field',
            pairKey
          };
          return result;
        }
      }
    }
    return { role: null, status: null, pairKey: null };
  }
  
  // Check field positions (for individual modes)
  for (const position of definition.fieldPositions) {
    if (playerId === formation[position]) {
      const result = {
        role: definition.positions[position].role,
        status: 'on_field',
        pairKey: position
      };
      return result;
    }
  }
  
  // Check substitute positions (for individual modes)
  for (const position of definition.substitutePositions) {
    if (playerId === formation[position]) {
      const result = {
        role: definition.positions[position].role,
        status: 'substitute',
        pairKey: position
      };
      return result;
    }
  }
  
  return { role: null, status: null, pairKey: null };
}

/**
 * Legacy mode definition mapper - TEMPORARY: For backward compatibility during transition
 * @param {string} legacyTeamMode - Legacy team mode string
 * @returns {Object} Mode definition object
 */
function getLegacyModeDefinition(legacyTeamMode) {
  // Map legacy team modes to team configurations
  const legacyMappings = {
    [TEAM_MODES.PAIRS_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
    [TEAM_MODES.INDIVIDUAL_5]: { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_6]: { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_8]: { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_9]: { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_10]: { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
  };
  
  const teamConfig = legacyMappings[legacyTeamMode];
  if (!teamConfig) {
    console.warn(`Unknown legacy team mode: ${legacyTeamMode}`);
    return null;
  }
  
  return getModeDefinition(teamConfig);
}