/**
 * Shared test utilities for game module tests
 * Provides consistent mock data and helper functions
 */

import { TEAM_MODES, PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';
import { POSITION_KEYS } from '../constants/positionConstants';

/**
 * Creates a mock player with standard structure
 */
export const createMockPlayer = (id, overrides = {}) => ({
  id,
  name: `Player ${id}`,
  stats: {
    isInactive: false,
    currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
    currentPeriodRole: PLAYER_ROLES.DEFENDER,
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
 * Creates an array of mock players with varied statuses
 */
export const createMockPlayers = (count = 7, teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  const players = [];
  
  for (let i = 1; i <= count; i++) {
    let status, role, position;
    
    if (teamMode === TEAM_MODES.PAIRS_7) {
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
    } else if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
      if (i <= 4) {
        status = PLAYER_STATUS.ON_FIELD;
        role = i <= 2 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        position = [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER, 
                   POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER][i - 1];
      } else if (i === 5) {
        status = PLAYER_STATUS.SUBSTITUTE;
        role = PLAYER_ROLES.SUBSTITUTE;
        position = POSITION_KEYS.SUBSTITUTE;
      } else {
        status = PLAYER_STATUS.GOALIE;
        role = PLAYER_ROLES.GOALIE;
        position = POSITION_KEYS.GOALIE;
      }
    } else { // INDIVIDUAL_7
      if (i <= 4) {
        status = PLAYER_STATUS.ON_FIELD;
        role = i <= 2 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER;
        position = [POSITION_KEYS.LEFT_DEFENDER_7, POSITION_KEYS.RIGHT_DEFENDER_7,
                   POSITION_KEYS.LEFT_ATTACKER_7, POSITION_KEYS.RIGHT_ATTACKER_7][i - 1];
      } else if (i <= 6) {
        status = PLAYER_STATUS.SUBSTITUTE;
        role = PLAYER_ROLES.SUBSTITUTE;
        position = i === 5 ? POSITION_KEYS.SUBSTITUTE_7_1 : POSITION_KEYS.SUBSTITUTE_7_2;
      } else {
        status = PLAYER_STATUS.GOALIE;
        role = PLAYER_ROLES.GOALIE;
        position = POSITION_KEYS.GOALIE;
      }
    }
    
    players.push(createMockPlayer(i.toString(), {
      stats: {
        currentPeriodStatus: status,
        currentPeriodRole: role,
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
 * Creates a mock formation for the specified formation type
 */
export const createMockFormation = (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  switch (teamMode) {
    case TEAM_MODES.PAIRS_7:
      return {
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '3', attacker: '4' },
        subPair: { defender: '5', attacker: '6' },
        goalie: '7'
      };
      
    case TEAM_MODES.INDIVIDUAL_6:
      return {
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute: '5',
        goalie: '6'
      };
      
    case TEAM_MODES.INDIVIDUAL_7:
    default:
      return {
        leftDefender7: '1',
        rightDefender7: '2',
        leftAttacker7: '3',
        rightAttacker7: '4',
        substitute7_1: '5',
        substitute7_2: '6',
        goalie: '7'
      };
  }
};

/**
 * Creates a complete mock game state
 */
export const createMockGameState = (teamMode = TEAM_MODES.INDIVIDUAL_7, overrides = {}) => {
  const allPlayers = createMockPlayers(7, teamMode);
  const periodFormation = createMockFormation(teamMode);
  
  return {
    periodFormation,
    allPlayers,
    teamMode,
    rotationQueue: ['1', '2', '3', '4', '5'],
    nextPhysicalPairToSubOut: 'leftPair',
    nextPlayerToSubOut: 'leftDefender7',
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
    setPeriodFormation: jest.fn(),
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
  expect(actual.currentPeriodStatus).toBe(expected.currentPeriodStatus);
  expect(actual.currentPeriodRole).toBe(expected.currentPeriodRole);
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