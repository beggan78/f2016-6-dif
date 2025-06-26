import { PLAYER_ROLES, TEAM_MODES } from './playerConstants';

/**
 * Complete formation definitions - Single source of truth for all formation logic
 * This replaces scattered formation logic across constants and utils
 */
export const FORMATION_DEFINITIONS = {
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
      substitute: { key: 'substitute', role: PLAYER_ROLES.SUBSTITUTE }
    },
    expectedCounts: { outfield: 5, onField: 4 },
    positionOrder: ['goalie', 'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'],
    fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
    substitutePositions: ['substitute']
  },
  [TEAM_MODES.INDIVIDUAL_7]: {
    positions: {
      goalie: { key: 'goalie', role: PLAYER_ROLES.GOALIE },
      leftDefender7: { key: 'leftDefender7', role: PLAYER_ROLES.DEFENDER },
      rightDefender7: { key: 'rightDefender7', role: PLAYER_ROLES.DEFENDER },
      leftAttacker7: { key: 'leftAttacker7', role: PLAYER_ROLES.ATTACKER },
      rightAttacker7: { key: 'rightAttacker7', role: PLAYER_ROLES.ATTACKER },
      substitute7_1: { key: 'substitute7_1', role: PLAYER_ROLES.SUBSTITUTE },
      substitute7_2: { key: 'substitute7_2', role: PLAYER_ROLES.SUBSTITUTE }
    },
    expectedCounts: { outfield: 6, onField: 4 },
    positionOrder: ['goalie', 'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'],
    fieldPositions: ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'],
    substitutePositions: ['substitute7_1', 'substitute7_2']
  }
};

/**
 * Position-role lookup table - Replaces string matching with table-driven lookups
 */
export const POSITION_ROLE_MAP = {
  goalie: PLAYER_ROLES.GOALIE,
  leftDefender: PLAYER_ROLES.DEFENDER,
  rightDefender: PLAYER_ROLES.DEFENDER,
  leftDefender7: PLAYER_ROLES.DEFENDER,
  rightDefender7: PLAYER_ROLES.DEFENDER,
  leftAttacker: PLAYER_ROLES.ATTACKER,
  rightAttacker: PLAYER_ROLES.ATTACKER,
  leftAttacker7: PLAYER_ROLES.ATTACKER,
  rightAttacker7: PLAYER_ROLES.ATTACKER,
  substitute: PLAYER_ROLES.SUBSTITUTE,
  substitute7_1: PLAYER_ROLES.SUBSTITUTE,
  substitute7_2: PLAYER_ROLES.SUBSTITUTE
};

/**
 * Get formation positions (excluding goalie) - Replaces FORMATION_POSITIONS
 */
export function getFormationPositions(teamMode) {
  const definition = FORMATION_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder.filter(pos => pos !== 'goalie') : [];
}

/**
 * Get formation positions including goalie - Replaces FORMATION_POSITIONS_WITH_GOALIE
 */
export function getFormationPositionsWithGoalie(teamMode) {
  const definition = FORMATION_DEFINITIONS[teamMode];
  return definition ? definition.positionOrder : [];
}