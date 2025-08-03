/**
 * Shared test utilities for game module tests
 * Provides consistent mock data and helper functions
 */

import { TEAM_MODES, PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';
import { POSITION_KEYS } from '../constants/positionConstants';
import { getModeDefinition } from '../constants/gameModes';
import { getFormationDefinition } from '../utils/formationConfigUtils';

/**
 * Creates a mock player with standard structure
 */
export const createMockPlayer = (id, overrides = {}) => ({
  id,
  name: `Player ${id}`,
  stats: {
    isInactive: false,
    currentStatus: PLAYER_STATUS.ON_FIELD,
    currentRole: PLAYER_ROLES.DEFENDER,
    currentPairKey: POSITION_KEYS.LEFT_DEFENDER,
    lastStintStartTimeEpoch: 1000,
    timeOnFieldSeconds: 0,
    timeAsAttackerSeconds: 0,
    timeAsDefenderSeconds: 0,
    timeAsSubSeconds: 0,
    timeAsGoalieSeconds: 0,
    startedMatchAs: PLAYER_ROLES.ON_FIELD,
    ...overrides.stats
  },
  ...overrides
});

/**
 * Helper to get mode definition from either legacy string or team config object
 * Uses centralized formation configuration utilities with proper legacy handling
 */
const getDefinitionForTests = (teamModeOrConfig, selectedFormation = null) => {
  // For legacy team mode strings, first convert to team config object
  if (typeof teamModeOrConfig === 'string') {
    const { createFormationAwareTeamConfig } = require('../utils/formationConfigUtils');
    const teamConfig = createFormationAwareTeamConfig(teamModeOrConfig, selectedFormation);
    if (!teamConfig) {
      return null;
    }
    return getModeDefinition(teamConfig);
  }
  
  // For team config objects, use directly
  return getFormationDefinition(teamModeOrConfig, selectedFormation);
};

/**
 * Creates an array of mock players with varied statuses using configuration-driven approach
 */
export const createMockPlayers = (count = 7, teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  const players = [];
  const definition = getDefinitionForTests(teamMode);
  
  if (!definition) {
    throw new Error(`Unknown team mode: ${teamMode}`);
  }
  
  for (let i = 1; i <= count; i++) {
    let status, role, position;
    
    if (teamMode === TEAM_MODES.PAIRS_7) {
      // Special handling for pairs mode
      if (i <= 4) {
        status = PLAYER_STATUS.ON_FIELD;
        role = i % 2 === 1 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        position = i <= 2 ? POSITION_KEYS.LEFT_PAIR : POSITION_KEYS.RIGHT_PAIR;
      } else if (i <= 6) {
        status = PLAYER_STATUS.SUBSTITUTE;
        role = i % 2 === 1 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        position = POSITION_KEYS.SUB_PAIR;
      } else {
        status = PLAYER_STATUS.GOALIE;
        role = PLAYER_ROLES.GOALIE;
        position = POSITION_KEYS.GOALIE;
      }
    } else {
      // Use configuration-driven approach for individual modes
      const fieldPositions = definition.fieldPositions;
      const substitutePositions = definition.substitutePositions;
      
      if (i <= fieldPositions.length) {
        status = PLAYER_STATUS.ON_FIELD;
        position = fieldPositions[i - 1];
        role = definition.positions[position].role;
      } else if (i <= fieldPositions.length + substitutePositions.length) {
        status = PLAYER_STATUS.SUBSTITUTE;
        const subIndex = i - fieldPositions.length - 1;
        position = substitutePositions[subIndex];
        role = definition.positions[position].role;
      } else {
        status = PLAYER_STATUS.GOALIE;
        role = PLAYER_ROLES.GOALIE;
        position = POSITION_KEYS.GOALIE;
      }
    }
    
    players.push(createMockPlayer(i.toString(), {
      stats: {
        currentStatus: status,
        currentRole: role,
        currentPairKey: position,
        timeOnFieldSeconds: i * 30, // Varied playing times
        timeAsDefenderSeconds: role === PLAYER_ROLES.DEFENDER ? i * 30 : 0,
        timeAsAttackerSeconds: role === PLAYER_ROLES.ATTACKER ? i * 30 : 0,
        timeAsSubSeconds: status === PLAYER_STATUS.SUBSTITUTE ? i * 10 : 0,
        timeAsGoalieSeconds: status === PLAYER_STATUS.GOALIE ? i * 30 : 0
      }
    }));
  }
  
  return players;
};

/**
 * Creates a mock formation for the specified team mode using configuration-driven approach
 */
export const createMockFormation = (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  const definition = getDefinitionForTests(teamMode);
  
  if (!definition) {
    throw new Error(`Unknown team mode: ${teamMode}`);
  }
  
  if (teamMode === TEAM_MODES.PAIRS_7) {
    // Special handling for pairs mode
    return {
      leftPair: { defender: '1', attacker: '2' },
      rightPair: { defender: '3', attacker: '4' },
      subPair: { defender: '5', attacker: '6' },
      goalie: '7'
    };
  } else {
    // Use configuration-driven approach for individual modes
    const formation = {};
    let playerId = 1;
    
    // Add field positions
    definition.fieldPositions.forEach(position => {
      formation[position] = playerId.toString();
      playerId++;
    });
    
    // Add substitute positions
    definition.substitutePositions.forEach(position => {
      formation[position] = playerId.toString();
      playerId++;
    });
    
    // Add goalie
    formation.goalie = playerId.toString();
    
    return formation;
  }
};

/**
 * Creates a complete mock game state
 */
export const createMockGameState = (teamMode = TEAM_MODES.INDIVIDUAL_7, overrides = {}) => {
  const allPlayers = createMockPlayers(7, teamMode);
  const formation = createMockFormation(teamMode);
  
  return {
    formation,
    allPlayers,
    teamMode,
    rotationQueue: ['1', '2', '3', '4', '5'],
    nextPhysicalPairToSubOut: 'leftPair',
    nextPlayerToSubOut: 'leftDefender',
    nextPlayerIdToSubOut: '1',
    nextNextPlayerIdToSubOut: '2',
    selectedSquadPlayers: allPlayers,
    playersToHighlight: [],
    isSubTimerPaused: false,
    lastSubstitution: null,
    subTimerSeconds: 120,
    ...overrides
  };
};

/**
 * Creates a mock rotation queue
 */
export const createMockRotationQueue = (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  switch (teamMode) {
    case TEAM_MODES.PAIRS_7:
      return ['1', '2', '3', '4', '5', '6'];
    case TEAM_MODES.INDIVIDUAL_6:
      return ['1', '2', '3', '4', '5'];
    case TEAM_MODES.INDIVIDUAL_7:
    default:
      return ['1', '2', '3', '4', '5', '6'];
  }
};

/**
 * Creates time-based test helpers
 */
export const createTimeHelpers = () => ({
  baseTime: 1000,
  getTimeAfter: (seconds) => 1000 + (seconds * 1000),
  createStintTime: (startTime, endTime) => Math.round((endTime - startTime) / 1000)
});

/**
 * Creates mock player lookup function for rotation queue tests
 */
export const createMockPlayerLookup = (players) => {
  return (id) => players.find(p => p.id === id);
};

/**
 * Creates mock dependencies for handler tests
 */
export const createMockDependencies = () => ({
  gameStateFactory: jest.fn(() => createMockGameState()),
  stateUpdaters: {
    setFormation: jest.fn(),
    setAllPlayers: jest.fn(),
    setRotationQueue: jest.fn(),
    setNextPlayerIdToSubOut: jest.fn(),
    setNextNextPlayerIdToSubOut: jest.fn(),
    setNextPhysicalPairToSubOut: jest.fn(),
    setNextPlayerToSubOut: jest.fn()
  },
  animationHooks: {
    setAnimationState: jest.fn(),
    setHideNextOffIndicator: jest.fn(),
    setRecentlySubstitutedPlayers: jest.fn()
  },
  modalHandlers: {
    openFieldPlayerModal: jest.fn(),
    closeFieldPlayerModal: jest.fn(),
    openSubstituteModal: jest.fn(),
    closeSubstituteModal: jest.fn(),
    openGoalieModal: jest.fn(),
    closeGoalieModal: jest.fn(),
    removeModalFromStack: jest.fn()
  }
});

/**
 * Animation state helpers
 */
export const createMockAnimationState = () => ({
  isAnimating: false,
  animatingPlayers: {},
  hideNextOffIndicator: false,
  recentlySubstitutedPlayers: new Set()
});

/**
 * Assertion helpers for complex objects
 */
export const expectPlayerStatsToMatch = (actual, expected) => {
  expect(actual.currentStatus).toBe(expected.currentStatus);
  expect(actual.currentRole).toBe(expected.currentRole);
  expect(actual.currentPairKey).toBe(expected.currentPairKey);
};

export const expectFormationToMatch = (actual, expected, teamMode) => {
  if (teamMode === TEAM_MODES.PAIRS_7) {
    expect(actual.leftPair).toEqual(expected.leftPair);
    expect(actual.rightPair).toEqual(expected.rightPair);
    expect(actual.subPair).toEqual(expected.subPair);
  } else {
    Object.keys(expected).forEach(key => {
      expect(actual[key]).toBe(expected[key]);
    });
  }
  expect(actual.goalie).toBe(expected.goalie);
};

/**
 * Configuration-driven test helpers
 */

/**
 * Get test cases for all individual modes (both INDIVIDUAL_6 and INDIVIDUAL_7)
 * Useful for testing unified behavior across individual modes
 */
export const getIndividualModeTestCases = () => [
  { 
    mode: TEAM_MODES.INDIVIDUAL_6,
    expectedPlayerCount: 6,
    expectedOutfieldCount: 5,
    expectedSubstituteCount: 1
  },
  { 
    mode: TEAM_MODES.INDIVIDUAL_7,
    expectedPlayerCount: 7,
    expectedOutfieldCount: 6,
    expectedSubstituteCount: 2
  }
];

/**
 * Get test cases for all team modes
 */
export const getAllModeTestCases = () => [
  ...getIndividualModeTestCases(),
  { 
    mode: TEAM_MODES.PAIRS_7,
    expectedPlayerCount: 7,
    expectedOutfieldCount: 6,
    expectedSubstituteCount: 2
  }
];

/**
 * Create configuration-driven formation assertions
 */
export const expectFormationConsistency = (formation, teamMode) => {
  const definition = getDefinitionForTests(teamMode);
  
  if (!definition) {
    throw new Error(`Unknown team mode: ${teamMode}`);
  }
  
  // Check that all required positions exist
  definition.positionOrder.forEach(position => {
    if (position !== 'goalie') {
      expect(formation).toHaveProperty(position);
    }
  });
  
  // Check goalie exists
  expect(formation).toHaveProperty('goalie');
  
  // For individual modes, check position structure
  if (teamMode !== TEAM_MODES.PAIRS_7) {
    [...definition.fieldPositions, ...definition.substitutePositions].forEach(position => {
      expect(typeof formation[position]).toBe('string');
    });
  }
};

/**
 * Assert that individual modes behave consistently
 */
export const expectIndividualModesConsistent = (testFn) => {
  const individualModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
  
  individualModes.forEach(mode => {
    const result = testFn(mode);
    // You can add assertions here that should be true for both modes
    expect(result).toBeDefined();
  });
};