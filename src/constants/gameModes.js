import { PLAYER_ROLES, TEAM_MODES } from './playerConstants';

/**
 * Complete formation definitions - Single source of truth for all formation logic
 * This replaces scattered formation logic across constants and utils
 */
export const MODE_DEFINITIONS = {
  [TEAM_MODES.PAIRS_7]: {
    positions: {
      goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
      leftPair: { key: 'leftPair', type: 'pair' },
      rightPair: { key: 'rightPair', type: 'pair' },  
      subPair: { key: 'subPair', type: 'pair' }
    },
    expectedCounts: { outfield: 6, onField: 4 },
    positionOrder: ['goalie', 'leftPair', 'rightPair', 'subPair'],
    fieldPositions: ['leftPair', 'rightPair'],
    substitutePositions: ['subPair']
  },
  [TEAM_MODES.INDIVIDUAL_6]: {
    positions: {
      goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
      leftDefender: { key: 'leftDefender', role: PLAYER_ROLES.DEFENDER },
      rightDefender: { key: 'rightDefender', role: PLAYER_ROLES.DEFENDER },
      leftAttacker: { key: 'leftAttacker', role: PLAYER_ROLES.ATTACKER },
      rightAttacker: { key: 'rightAttacker', role: PLAYER_ROLES.ATTACKER },
      substitute_1: { key: 'substitute_1', role: PLAYER_ROLES.SUBSTITUTE }
    },
    expectedCounts: { outfield: 5, onField: 4 },
    positionOrder: ['goalie', 'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute_1'],
    fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
    substitutePositions: ['substitute_1'],
    supportsInactiveUsers: true,
    supportsNextNextIndicators: false,
    substituteRotationPattern: 'simple',
    initialFormationTemplate: {
      goalie: null,
      leftDefender: null,
      rightDefender: null,
      leftAttacker: null,
      rightAttacker: null,
      substitute_1: null
    },
    validationMessage: "Please complete the team formation with 1 goalie and 5 unique outfield players."
  },
  [TEAM_MODES.INDIVIDUAL_7]: {
    positions: {
      goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
      leftDefender: { key: 'leftDefender', role: PLAYER_ROLES.DEFENDER },
      rightDefender: { key: 'rightDefender', role: PLAYER_ROLES.DEFENDER },
      leftAttacker: { key: 'leftAttacker', role: PLAYER_ROLES.ATTACKER },
      rightAttacker: { key: 'rightAttacker', role: PLAYER_ROLES.ATTACKER },
      substitute_1: { key: 'substitute_1', role: PLAYER_ROLES.SUBSTITUTE },
      substitute_2: { key: 'substitute_2', role: PLAYER_ROLES.SUBSTITUTE }
    },
    expectedCounts: { outfield: 6, onField: 4 },
    positionOrder: ['goalie', 'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute_1', 'substitute_2'],
    fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
    substitutePositions: ['substitute_1', 'substitute_2'],
    supportsInactiveUsers: true,
    supportsNextNextIndicators: true,
    substituteRotationPattern: 'carousel',
    initialFormationTemplate: {
      goalie: null,
      leftDefender: null,
      rightDefender: null,
      leftAttacker: null,
      rightAttacker: null,
      substitute_1: null,
      substitute_2: null
    },
    validationMessage: "Please complete the team formation with 1 goalie and 6 unique outfield players."
  },
  [TEAM_MODES.INDIVIDUAL_8]: {
    positions: {
      goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
      leftDefender: { key: 'leftDefender', role: PLAYER_ROLES.DEFENDER },
      rightDefender: { key: 'rightDefender', role: PLAYER_ROLES.DEFENDER },
      leftAttacker: { key: 'leftAttacker', role: PLAYER_ROLES.ATTACKER },
      rightAttacker: { key: 'rightAttacker', role: PLAYER_ROLES.ATTACKER },
      substitute_1: { key: 'substitute_1', role: PLAYER_ROLES.SUBSTITUTE },
      substitute_2: { key: 'substitute_2', role: PLAYER_ROLES.SUBSTITUTE },
      substitute_3: { key: 'substitute_3', role: PLAYER_ROLES.SUBSTITUTE }
    },
    expectedCounts: { outfield: 7, onField: 4 },
    positionOrder: ['goalie', 'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute_1', 'substitute_2', 'substitute_3'],
    fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
    substitutePositions: ['substitute_1', 'substitute_2', 'substitute_3'],
    supportsInactiveUsers: true,
    supportsNextNextIndicators: true,
    substituteRotationPattern: 'advanced_carousel',
    initialFormationTemplate: {
      goalie: null,
      leftDefender: null,
      rightDefender: null,
      leftAttacker: null,
      rightAttacker: null,
      substitute_1: null,
      substitute_2: null,
      substitute_3: null
    },
    validationMessage: "Please complete the team formation with 1 goalie and 7 unique outfield players."
  }
};

/**
 * Position-role lookup table - Replaces string matching with table-driven lookups
 */
export const POSITION_ROLE_MAP = {
  goalie: PLAYER_ROLES.GOALIE,
  leftDefender: PLAYER_ROLES.DEFENDER,
  rightDefender: PLAYER_ROLES.DEFENDER,
  leftAttacker: PLAYER_ROLES.ATTACKER,
  rightAttacker: PLAYER_ROLES.ATTACKER,
  substitute_1: PLAYER_ROLES.SUBSTITUTE,
  substitute_2: PLAYER_ROLES.SUBSTITUTE,
  substitute_3: PLAYER_ROLES.SUBSTITUTE
};

/**
 * Get formation positions (excluding goalie) - Replaces FORMATION_POSITIONS
 */
export function getFormationPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder.filter(pos => pos !== 'goalie') : [];
}

/**
 * Get formation positions including goalie - Replaces FORMATION_POSITIONS_WITH_GOALIE
 */
export function getFormationPositionsWithGoalie(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder : [];
}

/**
 * Get initial formation template for a team mode
 */
export function getInitialFormationTemplate(teamMode, goalieId = null) {
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition?.initialFormationTemplate) return {};
  
  const template = { ...definition.initialFormationTemplate };
  if (goalieId) {
    template.goalie = goalieId;
  }
  return template;
}

/**
 * Get validation message for a team mode
 */
export function getValidationMessage(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition?.validationMessage || "Please complete the team formation.";
}

/**
 * Get all outfield positions for formation validation
 */
export function getOutfieldPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition) return [];
  
  return [...definition.fieldPositions, ...definition.substitutePositions];
}

/**
 * Check if a team mode supports inactive players
 */
export function supportsInactiveUsers(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition?.supportsInactiveUsers || false;
}

/**
 * Check if a team mode supports next-next indicators
 */
export function supportsNextNextIndicators(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition?.supportsNextNextIndicators || false;
}

/**
 * Check if a team mode is an individual mode (any individual player count)
 */
export function isIndividualMode(teamMode) {
  return [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8].includes(teamMode);
}

/**
 * Get the total number of players for a given team mode
 */
export function getPlayerCountForMode(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition) return null;
  
  // Calculate from position order length
  return definition.positionOrder.length;
}

/**
 * Check if a team mode is specifically the 6-player individual mode
 */
export function isIndividual6Mode(teamMode) {
  return teamMode === TEAM_MODES.INDIVIDUAL_6;
}

/**
 * Check if a team mode is specifically the 7-player individual mode
 */
export function isIndividual7Mode(teamMode) {
  return teamMode === TEAM_MODES.INDIVIDUAL_7;
}

/**
 * Check if a team mode is specifically the 8-player individual mode
 */
export function isIndividual8Mode(teamMode) {
  return teamMode === TEAM_MODES.INDIVIDUAL_8;
}

/**
 * Get all positions for a team mode (including goalie)
 */
export function getAllPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder : [];
}

/**
 * Get valid positions for player switching/positioning operations
 */
export function getValidPositions(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition) return [];
  
  if (teamMode === TEAM_MODES.PAIRS_7) {
    return ['leftPair', 'rightPair', 'subPair'];
  }
  
  // For individual modes, return all outfield positions
  return [...definition.fieldPositions, ...definition.substitutePositions];
}

/**
 * Get maximum number of inactive players allowed for a team mode
 */
export function getMaxInactiveCount(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  return definition?.substitutePositions.length || 0;
}

/**
 * Get the bottom substitute position (for positioning inactive players)
 */
export function getBottomSubstitutePosition(teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition?.substitutePositions?.length) return null;
  
  return definition.substitutePositions[definition.substitutePositions.length - 1];
}

/**
 * Initialize player role and status based on formation position
 */
export function initializePlayerRoleAndStatus(playerId, formation, teamMode) {
  const definition = MODE_DEFINITIONS[teamMode];
  if (!definition) return { role: null, status: null, pairKey: null };
  
  // Check if player is goalie
  if (playerId === formation.goalie) {
    return {
      role: PLAYER_ROLES.GOALIE,
      status: 'goalie',
      pairKey: 'goalie'
    };
  }
  
  // Check field positions
  for (const position of definition.fieldPositions) {
    if (playerId === formation[position]) {
      return {
        role: definition.positions[position].role,
        status: 'on_field',
        pairKey: position
      };
    }
  }
  
  // Check substitute positions
  for (const position of definition.substitutePositions) {
    if (playerId === formation[position]) {
      return {
        role: definition.positions[position].role,
        status: 'substitute',
        pairKey: position
      };
    }
  }
  
  // Handle pairs mode (special case)
  if (teamMode === TEAM_MODES.PAIRS_7) {
    const pairPositions = ['leftPair', 'rightPair', 'subPair'];
    for (const pairKey of pairPositions) {
      const pair = formation[pairKey];
      if (pair) {
        if (playerId === pair.defender) {
          return {
            role: pairKey === 'subPair' ? PLAYER_ROLES.SUBSTITUTE : PLAYER_ROLES.DEFENDER,
            status: pairKey === 'subPair' ? 'substitute' : 'on_field',
            pairKey
          };
        }
        if (playerId === pair.attacker) {
          return {
            role: pairKey === 'subPair' ? PLAYER_ROLES.SUBSTITUTE : PLAYER_ROLES.ATTACKER,
            status: pairKey === 'subPair' ? 'substitute' : 'on_field',
            pairKey
          };
        }
      }
    }
  }
  
  return { role: null, status: null, pairKey: null };
}