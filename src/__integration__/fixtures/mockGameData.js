/**
 * Mock Game Data for Integration Tests
 * 
 * Comprehensive test data scenarios for integration testing of the DIF F16-6 Coach application.
 * Includes realistic game states, player statistics, error scenarios, and edge cases.
 */

import { PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';
import { initializePlayers } from '../../utils/playerUtils';
import { initialRoster } from '../../constants/defaultData';

/**
 * Creates a realistic 7-player squad for testing
 */
export const createTestSquad = () => {
  const allPlayers = initializePlayers(initialRoster);
  return allPlayers.slice(0, 7);
};

/**
 * Formation setups for different team modes
 */
export const formationScenarios = {
  pairs7Standard: (playerIds) => ({
    goalie: playerIds[0],
    leftPair: {
      defender: playerIds[1],
      attacker: playerIds[2]
    },
    rightPair: {
      defender: playerIds[3],
      attacker: playerIds[4]
    },
    subPair: {
      defender: playerIds[5],
      attacker: playerIds[6]
    }
  }),
  
  individual6Standard: (playerIds) => ({
    goalie: playerIds[0],
    leftDefender: playerIds[1],
    rightDefender: playerIds[2],
    leftAttacker: playerIds[3],
    rightAttacker: playerIds[4],
    substitute_1: playerIds[5]
  }),
  
  individual7Standard: (playerIds) => ({
    goalie: playerIds[0],
    leftDefender: playerIds[1],
    rightDefender: playerIds[2],
    leftAttacker: playerIds[3],
    rightAttacker: playerIds[4],
    substitute_1: playerIds[5],
    substitute_2: playerIds[6]
  }),
  
  individual8Standard: (playerIds) => ({
    goalie: playerIds[0],
    leftDefender: playerIds[1],
    rightDefender: playerIds[2],
    leftAttacker: playerIds[3],
    rightAttacker: playerIds[4],
    substitute_1: playerIds[5],
    substitute_2: playerIds[6],
    substitute_3: playerIds[7]
  })
};

/**
 * Realistic game action sequences for testing
 */
export const gameActionSequences = {
  basicSubstitution: [
    { type: 'substitution', timestamp: 300000 }, // 5 minutes in
    { type: 'pause_timer', timestamp: 400000 },
    { type: 'resume_timer', timestamp: 420000 },
    { type: 'substitution', timestamp: 600000 }, // 10 minutes in
    { type: 'end_period', timestamp: 900000 }   // End at 15 minutes
  ],
  
  complexGameplay: [
    { type: 'substitution', timestamp: 180000 }, // 3 minutes
    { type: 'position_switch', timestamp: 300000, player1Id: 'player-2', player2Id: 'player-4' },
    { type: 'pause_timer', timestamp: 450000 },
    { type: 'substitution', timestamp: 500000 },
    { type: 'resume_timer', timestamp: 520000 },
    { type: 'goalie_switch', timestamp: 700000, newGoalieId: 'player-3' },
    { type: 'end_period', timestamp: 900000 }
  ],
  
  fullThreePeriodGame: [
    // Period 1
    { period: 1, type: 'substitution', timestamp: 300000 },
    { period: 1, type: 'substitution', timestamp: 600000 },
    { period: 1, type: 'end_period', timestamp: 900000 },
    
    // Period 2
    { period: 2, type: 'substitution', timestamp: 240000 },
    { period: 2, type: 'pause_timer', timestamp: 400000 },
    { period: 2, type: 'resume_timer', timestamp: 450000 },
    { period: 2, type: 'substitution', timestamp: 700000 },
    { period: 2, type: 'end_period', timestamp: 900000 },
    
    // Period 3
    { period: 3, type: 'substitution', timestamp: 200000 },
    { period: 3, type: 'position_switch', timestamp: 400000, player1Id: 'player-1', player2Id: 'player-5' },
    { period: 3, type: 'substitution', timestamp: 650000 },
    { period: 3, type: 'end_period', timestamp: 900000 }
  ]
};

/**
 * Expected statistics after game completion
 */
export const expectedGameStatistics = {
  threePeriodGame: {
    totalGameTime: 2700, // 45 minutes total
    playersWithGameTime: 7,
    averagePlayTimePerPlayer: 385, // ~6.4 minutes average
    goalieStats: {
      totalGoalieTime: 2700,
      periodsAsGoalie: 3
    }
  },
  
  individual6Game: {
    totalGameTime: 2400, // 40 minutes total
    playersWithGameTime: 6,
    averagePlayTimePerPlayer: 400, // ~6.7 minutes average
    goalieStats: {
      totalGoalieTime: 2400,
      periodsAsGoalie: 2
    }
  }
};

/**
 * localStorage state scenarios for testing persistence
 */
export const persistenceScenarios = {
  midGameState: {
    view: 'game',
    currentPeriodNumber: 2,
    selectedSquadIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7'],
    formation: {
      goalie: 'player-1',
      leftPair: { defender: 'player-2', attacker: 'player-3' },
      rightPair: { defender: 'player-4', attacker: 'player-5' },
      subPair: { defender: 'player-6', attacker: 'player-7' }
    },
    gameLog: [
      {
        periodNumber: 1,
        substitutions: 2,
        endedEarly: false,
        finalStatsSnapshotForAllPlayers: []
      }
    ]
  },
  
  configurationState: {
    view: 'config',
    selectedSquadIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6'],
    numPeriods: 2,
    periodDurationMinutes: 20,
    opponentTeamName: 'Saved Opponent'
  },
  
  corruptedState: '{"invalid": json, data}',
  
  emptyState: null
};

/**
 * Error scenarios for testing recovery mechanisms
 */
export const errorScenarios = {
  localStorage: {
    quotaExceeded: () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      };
      return () => { localStorage.setItem = originalSetItem; };
    },
    
    unavailable: () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });
      return () => { window.localStorage = originalLocalStorage; };
    }
  },
  
  invalidFormation: {
    missingGoalie: (playerIds) => ({
      goalie: null,
      leftPair: { defender: playerIds[1], attacker: playerIds[2] },
      rightPair: { defender: playerIds[3], attacker: playerIds[4] },
      subPair: { defender: playerIds[5], attacker: playerIds[6] }
    }),
    
    duplicateAssignments: (playerIds) => ({
      goalie: playerIds[0],
      leftPair: { defender: playerIds[1], attacker: playerIds[1] }, // Duplicate!
      rightPair: { defender: playerIds[3], attacker: playerIds[4] },
      subPair: { defender: playerIds[5], attacker: playerIds[6] }
    })
  }
};

// ===================================================================
// COMPREHENSIVE PLAYER DATA SCENARIOS
// ===================================================================

/**
 * Player scenarios with various time distributions and statistics
 */
export const playerDataScenarios = {
  /**
   * Balanced time distribution - ideal scenario
   */
  balanced: (playerCount = 7) => {
    const players = initializePlayers(initialRoster).slice(0, playerCount);
    const baseTime = 300; // 5 minutes base time
    
    return players.map((player, index) => ({
      ...player,
      stats: {
        ...player.stats,
        timeOnFieldSeconds: baseTime + (index * 20), // 300-420 seconds
        timeAsAttackerSeconds: (baseTime + (index * 20)) / 2,
        timeAsDefenderSeconds: (baseTime + (index * 20)) / 2,
        timeAsGoalieSeconds: index === 0 ? 900 : 0, // Only first player as goalie
        timeAsSubSeconds: playerCount > 6 ? 60 : 0,
        periodsAsGoalie: index === 0 ? 1 : 0,
        periodsAsDefender: index < 3 ? 1 : 0,
        periodsAsAttacker: index >= 3 && index < 6 ? 1 : 0,
        currentStatus: index < 4 ? PLAYER_STATUS.ON_FIELD :
                           index === 0 ? PLAYER_STATUS.GOALIE : PLAYER_STATUS.SUBSTITUTE,
        currentRole: index === 0 ? PLAYER_ROLES.GOALIE :
                          index < 3 ? PLAYER_ROLES.DEFENDER :
                          index < 6 ? PLAYER_ROLES.ATTACKER : PLAYER_ROLES.SUBSTITUTE
      }
    }));
  },
  
  /**
   * Unbalanced time distribution - needs correction
   */
  unbalanced: (playerCount = 7) => {
    const players = initializePlayers(initialRoster).slice(0, playerCount);
    
    return players.map((player, index) => ({
      ...player,
      stats: {
        ...player.stats,
        timeOnFieldSeconds: index * 120, // 0, 120, 240, 360, etc.
        timeAsAttackerSeconds: index < 3 ? index * 80 : 0, // Heavily favor first players as attackers
        timeAsDefenderSeconds: index >= 3 ? (index - 3) * 40 : 0,
        timeAsGoalieSeconds: index === 0 ? 600 : 0,
        timeAsSubSeconds: index > 4 ? 300 : 0,
        periodsAsGoalie: index === 0 ? 1 : 0,
        periodsAsDefender: index < 2 ? 1 : 0,
        periodsAsAttacker: index === 2 || index === 3 ? 1 : 0,
        isInactive: false
      }
    }));
  },
  
  /**
   * End-game statistics - realistic final game state
   */
  endGame: (playerCount = 7) => {
    const players = initializePlayers(initialRoster).slice(0, playerCount);
    
    return players.map((player, index) => ({
      ...player,
      stats: {
        ...player.stats,
        timeOnFieldSeconds: 400 + (index * 50), // 400-700 seconds total
        timeAsAttackerSeconds: 200 + (index * 25),
        timeAsDefenderSeconds: 200 + (index * 25),
        timeAsGoalieSeconds: index < 3 ? 300 : 0, // Multiple players had goalie time
        timeAsSubSeconds: 120,
        periodsAsGoalie: index < 3 ? 1 : 0,
        periodsAsDefender: 2,
        periodsAsAttacker: 1,
        currentStatus: PLAYER_STATUS.ON_FIELD,
        currentRole: index % 2 === 0 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER
      }
    }));
  },
  
  /**
   * Individual 7 mode with inactive players
   */
  withInactivePlayers: (playerCount = 7) => {
    const players = initializePlayers(initialRoster).slice(0, playerCount);
    
    return players.map((player, index) => ({
      ...player,
      stats: {
        ...player.stats,
        isInactive: index === 6, // Last player is inactive
        timeOnFieldSeconds: index === 6 ? 0 : 300 + (index * 30),
        timeAsAttackerSeconds: index === 6 ? 0 : 150 + (index * 15),
        timeAsDefenderSeconds: index === 6 ? 0 : 150 + (index * 15),
        timeAsGoalieSeconds: index === 0 ? 450 : 0,
        timeAsSubSeconds: index > 4 && index !== 6 ? 90 : 0,
        currentStatus: index === 6 ? PLAYER_STATUS.SUBSTITUTE :
                           index === 0 ? PLAYER_STATUS.GOALIE :
                           index < 5 ? PLAYER_STATUS.ON_FIELD : PLAYER_STATUS.SUBSTITUTE
      }
    }));
  }
};


// ===================================================================
// EDGE CASE AND ERROR SCENARIOS
// ===================================================================

// ===================================================================
// PERFORMANCE TEST DATA
// ===================================================================

/**
 * Large datasets for performance testing
 */
export const performanceTestData = {
  /**
   * Large player roster for stress testing
   */
  largeRoster: (playerCount = 50) => {
    return new Array(playerCount).fill(null).map((_, i) => ({
      id: `stress-player-${i + 1}`,
      name: `Stress Player ${i + 1}`,
      stats: {
        isInactive: false,
        currentStatus: i < 4 ? PLAYER_STATUS.ON_FIELD : PLAYER_STATUS.SUBSTITUTE,
        currentRole: i < 2 ? PLAYER_ROLES.DEFENDER :
                          i < 4 ? PLAYER_ROLES.ATTACKER : PLAYER_ROLES.SUBSTITUTE,
        currentPairKey: null,
        lastStintStartTimeEpoch: Date.now() - (i * 1000),
        timeOnFieldSeconds: i * 30,
        timeAsAttackerSeconds: i * 15,
        timeAsDefenderSeconds: i * 15,
        timeAsSubSeconds: i > 10 ? i * 5 : 0,
        timeAsGoalieSeconds: i === 0 ? i * 60 : 0,
        startedMatchAs: i < 4 ? PLAYER_ROLES.ON_FIELD : PLAYER_ROLES.SUBSTITUTE,
        periodsAsGoalie: i === 0 ? 1 : 0,
        periodsAsDefender: i < 10 ? 1 : 0,
        periodsAsAttacker: i >= 10 && i < 20 ? 1 : 0
      }
    }));
  },
  
  /**
   * Extensive game history for performance testing
   */
  extensiveHistory: (actionCount = 1000) => {
    const actions = [];
    const actionTypes = ['substitution', 'pause_timer', 'resume_timer', 'position_switch', 'goalie_switch'];
    
    for (let i = 0; i < actionCount; i++) {
      actions.push({
        type: actionTypes[i % actionTypes.length],
        timestamp: Date.now() - ((actionCount - i) * 1000),
        playerOut: `player-${(i % 7) + 1}`,
        playerIn: `player-${((i + 1) % 7) + 1}`,
        position: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'][i % 4],
        period: Math.floor(i / (actionCount / 3)) + 1
      });
    }
    
    return actions;
  }
};

// ===================================================================
// ANIMATION TEST SCENARIOS
// ===================================================================

/**
 * Animation-specific test data
 */
export const animationTestScenarios = {
  /**
   * Simple position swap for animation testing
   */
  simpleSwap: {
    before: {
      formation: {
        goalie: 'player-1',
        leftDefender: 'player-2',
        rightDefender: 'player-3',
        leftAttacker: 'player-4',
        rightAttacker: 'player-5',
        substitute_1: 'player-6',
        substitute_2: 'player-7'
      }
    },
    after: {
      formation: {
        goalie: 'player-1',
        leftDefender: 'player-6', // Swapped with substitute
        rightDefender: 'player-3',
        leftAttacker: 'player-4',
        rightAttacker: 'player-5',
        substitute_1: 'player-2', // Swapped with field player
        substitute_2: 'player-7'
      }
    },
    expectedAnimations: [
      { playerId: 'player-2', direction: 'down', distance: 200 },
      { playerId: 'player-6', direction: 'up', distance: 200 }
    ]
  },
  
  /**
   * Complex multi-player animation
   */
  complexAnimation: {
    before: formationScenarios.individual7Standard(['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7']),
    after: {
      goalie: 'player-1',
      leftDefender: 'player-3',   // Was rightDefender
      rightDefender: 'player-4',  // Was leftAttacker
      leftAttacker: 'player-5',   // Was rightAttacker
      rightAttacker: 'player-6',  // Was substitute_1
      substitute_1: 'player-7',   // Was substitute_2
      substitute_2: 'player-2'    // Was leftDefender
    },
    expectedAnimations: [
      { playerId: 'player-2', direction: 'down' },
      { playerId: 'player-3', direction: 'left' },
      { playerId: 'player-4', direction: 'down' },
      { playerId: 'player-5', direction: 'right' },
      { playerId: 'player-6', direction: 'up' },
      { playerId: 'player-7', direction: 'up' }
    ]
  }
};

// ===================================================================
// WORKFLOW TEST SCENARIOS
// ===================================================================

/**
 * Complete workflow scenarios for end-to-end testing
 */
export const workflowScenarios = {
  /**
   * Complete game workflow - configuration to stats
   */
  completeGame: {
    steps: [
      {
        name: 'configuration',
        screen: 'config',
        data: gameConfigScenarios.standardPairs,
        expectedResult: { view: 'setup', selectedSquadIds: Array.isArray }
      },
      {
        name: 'period_setup',
        screen: 'setup',
        data: formationScenarios.pairs7Standard,
        expectedResult: { view: 'game', formation: Object }
      },
      {
        name: 'gameplay',
        screen: 'game',
        actions: gameActionSequences.basicSubstitution,
        expectedResult: { substitutions: Array.isArray }
      },
      {
        name: 'stats_view',
        screen: 'stats',
        expectedResult: { totalGameTime: Number, playersWithGameTime: Number }
      }
    ]
  },
  
  /**
   * Error recovery workflow
   */
  errorRecovery: {
    steps: [
      {
        name: 'trigger_storage_error',
        errorType: 'localStorage_quota',
        expectedBehavior: 'graceful_degradation'
      },
      {
        name: 'verify_functionality',
        expectedResult: { canContinueGame: true }
      },
      {
        name: 'trigger_invalid_data',
        errorType: 'corrupted_formation',
        expectedBehavior: 'reset_to_valid_state'
      },
      {
        name: 'verify_recovery',
        expectedResult: { formationValid: true }
      }
    ]
  },
  
  /**
   * Browser refresh persistence workflow
   */
  persistenceWorkflow: {
    steps: [
      {
        name: 'setup_game',
        data: gameStateScenarios.midGame(),
        action: 'save_to_storage'
      },
      {
        name: 'simulate_refresh',
        action: 'clear_memory_state'
      },
      {
        name: 'restore_state',
        action: 'load_from_storage',
        expectedResult: { stateRestored: true, dataIntegrity: true }
      },
      {
        name: 'verify_functionality',
        expectedResult: { canContinueGame: true }
      }
    ]
  }
};