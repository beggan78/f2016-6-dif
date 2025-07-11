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
    substitutePositions: ['substitute_1']
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
    substitutePositions: ['substitute_1', 'substitute_2']
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
  substitute_2: PLAYER_ROLES.SUBSTITUTE
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