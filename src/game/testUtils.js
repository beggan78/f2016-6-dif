/**
 * Shared test utilities for game module tests
 * Provides consistent mock data and helper functions using modern teamConfig architecture
 */

import { PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';
import { POSITION_KEYS } from '../constants/positionConstants';
import { getModeDefinition } from '../constants/gameModes';
import { getFormationDefinition } from '../utils/formationConfigUtils';

// Modern teamConfig objects for testing (replaces legacy TEAM_MODES)
export const TEAM_CONFIGS = {
  PAIRS_7: {
    format: '5v5',
    squadSize: 7,
    formation: '2-2',
    substitutionType: 'pairs'
  },
  INDIVIDUAL_6: {
    format: '5v5',
    squadSize: 6,
    formation: '2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_7: {
    format: '5v5',
    squadSize: 7,
    formation: '2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_8: {
    format: '5v5',
    squadSize: 8,
    formation: '2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_9: {
    format: '5v5',
    squadSize: 9,
    formation: '2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_10: {
    format: '5v5',
    squadSize: 10,
    formation: '2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_7_1_2_1: {
    format: '5v5',
    squadSize: 7,
    formation: '1-2-1',
    substitutionType: 'individual'
  },
  INDIVIDUAL_7V7_MIN: {
    format: '7v7',
    squadSize: 7,
    formation: '2-2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_7V7_222: {
    format: '7v7',
    squadSize: 9,
    formation: '2-2-2',
    substitutionType: 'individual'
  },
  INDIVIDUAL_7V7_231: {
    format: '7v7',
    squadSize: 10,
    formation: '2-3-1',
    substitutionType: 'individual'
  }
};

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
    startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
    ...overrides.stats
  },
  ...overrides
});

/**
 * Helper to get mode definition from teamConfig object
 * Uses centralized formation configuration utilities
 */
const getDefinitionForTests = (teamConfig, selectedFormation = null) => {
  if (!teamConfig || typeof teamConfig !== 'object') {
    throw new Error('teamConfig must be a valid team configuration object');
  }
  
  return getFormationDefinition(teamConfig, selectedFormation || teamConfig.formation);
};

/**
 * Creates an array of mock players with varied statuses using modern teamConfig approach
 */
export const createMockPlayers = (count = 7, teamConfig = TEAM_CONFIGS.INDIVIDUAL_7) => {
  const players = [];
  const definition = getDefinitionForTests(teamConfig);
  
  if (!definition) {
    throw new Error(`Unable to get definition for teamConfig: ${JSON.stringify(teamConfig)}`);
  }
  
  for (let i = 1; i <= count; i++) {
    let status, role, position;
    
    if (teamConfig.substitutionType === 'pairs') {
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
 * Creates a mock formation for the specified teamConfig using configuration-driven approach
 */
export const createMockFormation = (teamConfig = TEAM_CONFIGS.INDIVIDUAL_7) => {
  const definition = getDefinitionForTests(teamConfig);
  
  if (!definition) {
    throw new Error(`Unable to get definition for teamConfig: ${JSON.stringify(teamConfig)}`);
  }
  
  if (teamConfig.substitutionType === 'pairs') {
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
 * Creates a complete mock game state using modern teamConfig architecture
 */
export const createMockGameState = (teamConfig = TEAM_CONFIGS.INDIVIDUAL_7, overrides = {}) => {
  const allPlayers = createMockPlayers(teamConfig.squadSize || 7, teamConfig);
  const formation = createMockFormation(teamConfig);
  const definition = getDefinitionForTests(teamConfig);
  const firstFieldPosition = definition?.fieldPositions?.[0] || 'leftDefender';
  const rotationQueue = definition
    ? [...definition.fieldPositions, ...definition.substitutePositions].map((_, idx) => (idx + 1).toString())
    : ['1', '2', '3', '4', '5'];
  
  return {
    formation,
    allPlayers,
    teamConfig,
    selectedFormation: teamConfig.formation,
    rotationQueue,
    nextPhysicalPairToSubOut: teamConfig.substitutionType === 'pairs' ? 'leftPair' : firstFieldPosition,
    nextPlayerToSubOut: teamConfig.substitutionType === 'pairs' ? 'leftPair' : firstFieldPosition,
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
 * Creates a mock rotation queue based on teamConfig
 */
export const createMockRotationQueue = (teamConfig = TEAM_CONFIGS.INDIVIDUAL_7) => {
  const definition = getDefinitionForTests(teamConfig);

  if (!definition) {
    return [];
  }

  if (teamConfig.substitutionType === 'pairs') {
    return ['1', '2', '3', '4', '5', '6'];
  }

  const outfieldSlots = definition.fieldPositions.length + definition.substitutePositions.length;
  return Array.from({ length: Math.max(outfieldSlots, 1) }, (_, i) => (i + 1).toString());
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
    setNextPlayerToSubOut: jest.fn(),
    setSubstitutionCountOverride: jest.fn(),
    clearSubstitutionCountOverride: jest.fn()
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
    openSubstituteSelectionModal: jest.fn(),
    closeSubstituteSelectionModal: jest.fn(),
    openGoalieModal: jest.fn(),
    closeGoalieModal: jest.fn(),
    removeFromNavigationStack: jest.fn()
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

export const expectFormationToMatch = (actual, expected, teamConfig) => {
  if (teamConfig.substitutionType === 'pairs') {
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
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_6,
    expectedPlayerCount: 6,
    expectedOutfieldCount: 5,
    expectedSubstituteCount: 1
  },
  { 
    teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
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
    teamConfig: TEAM_CONFIGS.PAIRS_7,
    expectedPlayerCount: 7,
    expectedOutfieldCount: 6,
    expectedSubstituteCount: 2
  }
];

/**
 * Create configuration-driven formation assertions
 */
export const expectFormationConsistency = (formation, teamConfig) => {
  const definition = getDefinitionForTests(teamConfig);
  
  if (!definition) {
    throw new Error(`Unable to get definition for teamConfig: ${JSON.stringify(teamConfig)}`);
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
  if (teamConfig.substitutionType !== 'pairs') {
    [...definition.fieldPositions, ...definition.substitutePositions].forEach(position => {
      expect(typeof formation[position]).toBe('string');
    });
  }
};

/**
 * Assert that individual modes behave consistently
 */
export const expectIndividualModesConsistent = (testFn) => {
  const individualConfigs = [TEAM_CONFIGS.INDIVIDUAL_6, TEAM_CONFIGS.INDIVIDUAL_7];
  
  individualConfigs.forEach(teamConfig => {
    const result = testFn(teamConfig);
    // You can add assertions here that should be true for both modes
    expect(result).toBeDefined();
  });
};
