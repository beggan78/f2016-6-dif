/**
 * Shared testing utilities for React hooks
 * Provides common mocks, helpers, and test data for hook testing
 */

import { TEAM_MODES, PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';

/**
 * Enhanced localStorage mock for hook testing
 */
export const createMockLocalStorage = () => {
  const store = new Map();
  
  return {
    getItem: jest.fn((key) => store.get(key) || null),
    setItem: jest.fn((key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn((key) => {
      store.delete(key);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
    length: 0,
    key: jest.fn((index) => Array.from(store.keys())[index] || null),
    // Test helpers
    __getStore: () => store,
    __clear: () => store.clear(),
    __simulateError: (operation, error) => {
      const originalFn = store[operation];
      store[operation] = jest.fn(() => {
        throw error;
      });
      return () => {
        store[operation] = originalFn;
      };
    }
  };
};

/**
 * Mock browser APIs for testing
 */
export const createMockBrowserAPIs = () => ({
  // Wake Lock API
  navigator: {
    wakeLock: {
      request: jest.fn().mockResolvedValue({
        release: jest.fn().mockResolvedValue()
      })
    },
    vibrate: jest.fn()
  },
  
  // History API
  history: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    go: jest.fn()
  },
  
  // Location API
  location: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  
  // Timers
  setTimeout: jest.fn().mockImplementation((fn, delay) => {
    return Number(setTimeout(fn, delay));
  }),
  clearTimeout: jest.fn().mockImplementation((id) => {
    clearTimeout(id);
  }),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
  
  // Events
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
});

/**
 * Mock game state data for testing
 */
export const createMockGameState = (overrides = {}) => ({
  allPlayers: createMockPlayers(),
  view: 'config',
  selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7'],
  numPeriods: 3,
  periodDurationMinutes: 15,
  periodGoalieIds: { 1: '7', 2: '7', 3: '7' },
  teamMode: TEAM_MODES.INDIVIDUAL_7,
  alertMinutes: 2,
  currentPeriodNumber: 1,
  periodFormation: createMockFormation(),
  nextPhysicalPairToSubOut: 'leftPair',
  nextPlayerToSubOut: 'leftDefender7',
  nextPlayerIdToSubOut: '1',
  nextNextPlayerIdToSubOut: '2',
  rotationQueue: ['1', '2', '3', '4', '5', '6'],
  gameLog: [],
  opponentTeamName: 'Test Opponent',
  homeScore: 0,
  awayScore: 0,
  lastSubstitutionTimestamp: null,
  ...overrides
});

/**
 * Create mock players for testing
 */
export const createMockPlayers = (count = 7) => {
  const players = [];
  
  for (let i = 1; i <= count; i++) {
    players.push({
      id: `${i}`,
      name: `Player ${i}`,
      stats: {
        isInactive: false,
        currentPeriodStatus: i <= 4 ? PLAYER_STATUS.ON_FIELD : 
                            i === 7 ? PLAYER_STATUS.GOALIE : PLAYER_STATUS.SUBSTITUTE,
        currentPeriodRole: i <= 2 ? PLAYER_ROLES.DEFENDER :
                          i <= 4 ? PLAYER_ROLES.ATTACKER :
                          i === 7 ? PLAYER_ROLES.GOALIE : PLAYER_ROLES.SUBSTITUTE,
        currentPairKey: i <= 2 ? 'leftDefender7' :
                       i <= 4 ? 'leftAttacker7' :
                       i === 7 ? 'goalie' : `substitute7_${i - 4}`,
        lastStintStartTimeEpoch: Date.now() - (i * 30000), // Varied start times
        timeOnFieldSeconds: i * 30,
        timeAsAttackerSeconds: i <= 4 ? i * 15 : 0,
        timeAsDefenderSeconds: i <= 2 ? i * 15 : 0,
        timeAsSubSeconds: i > 4 && i < 7 ? i * 10 : 0,
        timeAsGoalieSeconds: i === 7 ? i * 30 : 0,
        startedMatchAs: i <= 4 ? PLAYER_ROLES.ON_FIELD :
                       i === 7 ? PLAYER_ROLES.GOALIE : PLAYER_ROLES.SUBSTITUTE,
        periodsAsGoalie: i === 7 ? 1 : 0,
        periodsAsDefender: i <= 2 ? 1 : 0,
        periodsAsAttacker: i <= 4 && i > 2 ? 1 : 0
      }
    });
  }
  
  return players;
};

/**
 * Create mock formation for testing
 */
export const createMockFormation = (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
  switch (teamMode) {
    case TEAM_MODES.PAIRS_7:
      return {
        goalie: '7',
        leftPair: { defender: '1', attacker: '2' },
        rightPair: { defender: '3', attacker: '4' },
        subPair: { defender: '5', attacker: '6' }
      };
      
    case TEAM_MODES.INDIVIDUAL_6:
      return {
        goalie: '6',
        leftDefender: '1',
        rightDefender: '2',
        leftAttacker: '3',
        rightAttacker: '4',
        substitute: '5'
      };
      
    case TEAM_MODES.INDIVIDUAL_7:
    default:
      return {
        goalie: '7',
        leftDefender7: '1',
        rightDefender7: '2',
        leftAttacker7: '3',
        rightAttacker7: '4',
        substitute7_1: '5',
        substitute7_2: '6'
      };
  }
};

/**
 * Create mock timer state for testing
 */
export const createMockTimerState = (overrides = {}) => ({
  matchTimerSeconds: 900, // 15 minutes
  subTimerSeconds: 120,   // 2 minutes
  isPeriodActive: false,
  isSubTimerPaused: false,
  periodStartTime: null,
  lastSubTime: null,
  pausedSubTime: 0,
  subPauseStartTime: null,
  ...overrides
});

/**
 * Mock external dependencies for useGameState
 */
export const createMockGameStateDependencies = () => ({
  // Utility functions
  initializePlayers: jest.fn().mockReturnValue(createMockPlayers()),
  
  // Formation generators
  generateRecommendedFormation: jest.fn().mockReturnValue({
    leftPair: { defender: '1', attacker: '2' },
    rightPair: { defender: '3', attacker: '4' },
    subPair: { defender: '5', attacker: '6' },
    goalie: '7'
  }),
  generateIndividualFormationRecommendation: jest.fn().mockReturnValue({
    leftDefender7: '1',
    rightDefender7: '2',
    leftAttacker7: '3',
    rightAttacker7: '4',
    substitute7_1: '5',
    substitute7_2: '6',
    goalie: '7'
  }),
  
  // Game logic
  createSubstitutionManager: jest.fn().mockReturnValue({
    executeSubstitution: jest.fn(),
    updateRotationQueue: jest.fn()
  }),
  handleRoleChange: jest.fn().mockImplementation((player, newRole, currentTime, isSubTimerPaused) => {
    return {
      ...player.stats,
      currentPeriodRole: newRole,
      lastStintStartTimeEpoch: currentTime,
      timeOnFieldSeconds: player.stats.timeOnFieldSeconds || 0,
      timeAsAttackerSeconds: player.stats.timeAsAttackerSeconds || 0,
      timeAsDefenderSeconds: player.stats.timeAsDefenderSeconds || 0,
      timeAsGoalieSeconds: player.stats.timeAsGoalieSeconds || 0,
      currentPeriodStatus: player.stats.currentPeriodStatus,
      currentPairKey: player.stats.currentPairKey,
      isInactive: player.stats.isInactive || false
    };
  }),
  updatePlayerTimeStats: jest.fn().mockImplementation((player, currentTime, isSubTimerPaused) => {
    return {
      ...player.stats,
      lastStintStartTimeEpoch: currentTime,
      timeOnFieldSeconds: player.stats.timeOnFieldSeconds || 0,
      timeAsAttackerSeconds: player.stats.timeAsAttackerSeconds || 0,
      timeAsDefenderSeconds: player.stats.timeAsDefenderSeconds || 0,
      timeAsGoalieSeconds: player.stats.timeAsGoalieSeconds || 0,
      currentPeriodStatus: player.stats.currentPeriodStatus,
      currentPeriodRole: player.stats.currentPeriodRole,
      currentPairKey: player.stats.currentPairKey,
      isInactive: player.stats.isInactive || false
    };
  }),
  createRotationQueue: jest.fn().mockReturnValue({
    initialize: jest.fn(),
    deactivatePlayer: jest.fn(),
    activatePlayer: jest.fn(),
    reactivatePlayer: jest.fn(),
    removePlayer: jest.fn(),
    addPlayer: jest.fn(),
    toArray: jest.fn().mockReturnValue(['1', '2', '3', '4', '5', '6'])
  }),
  getPositionRole: jest.fn().mockReturnValue(PLAYER_ROLES.DEFENDER),
  
  // Player utilities
  hasInactivePlayersInSquad: jest.fn().mockReturnValue(false),
  createPlayerLookup: jest.fn().mockReturnValue(() => createMockPlayers()[0]),
  findPlayerById: jest.fn().mockImplementation((players, id) => 
    players.find(p => p.id === id)
  ),
  getSelectedSquadPlayers: jest.fn().mockReturnValue(createMockPlayers()),
  getOutfieldPlayers: jest.fn().mockReturnValue(createMockPlayers().slice(0, 6)),
  
  // Persistence manager
  persistenceManager: {
    loadState: jest.fn().mockReturnValue(createMockGameState()),
    saveGameState: jest.fn().mockReturnValue(true),
    createBackup: jest.fn().mockReturnValue('backup-key'),
    autoBackup: jest.fn().mockReturnValue('auto-backup-key')
  }
});

/**
 * Setup function to apply all mocks consistently
 */
export const setupHookTestEnvironment = () => {
  const mockLocalStorage = createMockLocalStorage();
  const mockBrowserAPIs = createMockBrowserAPIs();
  
  // Apply localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  // Apply navigator mocks
  Object.defineProperty(window, 'navigator', {
    value: {
      ...window.navigator,
      ...mockBrowserAPIs.navigator
    },
    writable: true
  });
  
  // Apply history mocks
  Object.defineProperty(window, 'history', {
    value: {
      ...window.history,
      ...mockBrowserAPIs.history
    },
    writable: true
  });
  
  // Apply location mocks
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      ...mockBrowserAPIs.location
    },
    writable: true
  });
  
  // Mock console methods to avoid noise
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  return {
    mockLocalStorage,
    mockBrowserAPIs,
    cleanup: () => {
      mockLocalStorage.__clear();
      jest.clearAllMocks();
      jest.restoreAllMocks();
    }
  };
};

/**
 * Test utilities for async operations
 */
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForNextTick = () => new Promise(resolve => setImmediate(resolve));

/**
 * Assertion helpers for hook testing
 */
export const expectHookResult = (result, expectedProperties) => {
  expectedProperties.forEach(prop => {
    expect(result.current).toHaveProperty(prop);
  });
};

export const expectFunctionToHaveBeenCalledWithGameState = (mockFn, gameStateSubset = {}) => {
  expect(mockFn).toHaveBeenCalled();
  const callArgs = mockFn.mock.calls[mockFn.mock.calls.length - 1][0];
  
  Object.keys(gameStateSubset).forEach(key => {
    expect(callArgs).toHaveProperty(key, gameStateSubset[key]);
  });
};

/**
 * Helper to create test scenarios for different team modes
 */
export const createTeamModeTestScenarios = () => [
  {
    name: 'PAIRS_7',
    teamMode: TEAM_MODES.PAIRS_7,
    expectedPlayers: 7,
    formation: createMockFormation(TEAM_MODES.PAIRS_7)
  },
  {
    name: 'INDIVIDUAL_6',
    teamMode: TEAM_MODES.INDIVIDUAL_6,
    expectedPlayers: 6,
    formation: createMockFormation(TEAM_MODES.INDIVIDUAL_6)
  },
  {
    name: 'INDIVIDUAL_7',
    teamMode: TEAM_MODES.INDIVIDUAL_7,
    expectedPlayers: 7,
    formation: createMockFormation(TEAM_MODES.INDIVIDUAL_7)
  }
];

/**
 * Helper to simulate localStorage errors
 */
export const simulateLocalStorageError = (mockLocalStorage, operation, error) => {
  const original = mockLocalStorage[operation];
  mockLocalStorage[operation].mockImplementation(() => {
    throw error;
  });
  
  return () => {
    mockLocalStorage[operation] = original;
  };
};

/**
 * Helper to create game log entries for testing
 */
export const createMockGameLogEntry = (periodNumber, players = createMockPlayers()) => ({
  periodNumber,
  startTime: Date.now() - 900000, // 15 minutes ago
  endTime: Date.now(),
  finalStatsSnapshotForAllPlayers: players.map(player => ({
    ...player,
    stats: {
      ...player.stats,
      // Add some accumulated time for testing recommendations
      timeOnFieldSeconds: player.stats.timeOnFieldSeconds + (periodNumber * 300),
      timeAsDefenderSeconds: player.stats.timeAsDefenderSeconds + (periodNumber * 150),
      timeAsAttackerSeconds: player.stats.timeAsAttackerSeconds + (periodNumber * 150)
    }
  })),
  substitutions: [],
  score: { home: periodNumber, away: periodNumber - 1 }
});

export default {
  createMockLocalStorage,
  createMockBrowserAPIs,
  createMockGameState,
  createMockPlayers,
  createMockFormation,
  createMockTimerState,
  createMockGameStateDependencies,
  setupHookTestEnvironment,
  waitFor,
  waitForNextTick,
  expectHookResult,
  expectFunctionToHaveBeenCalledWithGameState,
  createTeamModeTestScenarios,
  simulateLocalStorageError,
  createMockGameLogEntry
};