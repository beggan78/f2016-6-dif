/**
 * Mock Game Data for Integration Tests
 * 
 * Comprehensive test data scenarios for integration testing of the DIF F16-6 Coach application.
 * Includes realistic game states, player statistics, error scenarios, and edge cases.
 */

import { TEAM_MODES, PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';
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
 * Complete game configuration scenarios
 */
export const gameConfigScenarios = {
  standardPairs: {
    numPeriods: 3,
    periodDurationMinutes: 15,
    alertMinutes: 5,
    teamMode: TEAM_MODES.PAIRS_7,
    opponentTeamName: 'Test Opponent FC'
  },
  
  individual6: {
    numPeriods: 2,
    periodDurationMinutes: 20,
    alertMinutes: 3,
    teamMode: TEAM_MODES.INDIVIDUAL_6,
    opponentTeamName: 'Rival Team'
  },
  
  individual7: {
    numPeriods: 4,
    periodDurationMinutes: 12,
    alertMinutes: 2,
    teamMode: TEAM_MODES.INDIVIDUAL_7,
    opponentTeamName: 'Championship Opponents'
  }
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
    substitute: playerIds[5]
  }),
  
  individual7Standard: (playerIds) => ({
    goalie: playerIds[0],
    leftDefender: playerIds[1],
    rightDefender: playerIds[2],
    leftAttacker: playerIds[3],
    rightAttacker: playerIds[4],
    substitute_1: playerIds[5],
    substitute_2: playerIds[6]
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
    teamMode: TEAM_MODES.PAIRS_7,
    periodFormation: {
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
    teamMode: TEAM_MODES.INDIVIDUAL_6,
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
        currentPeriodStatus: index < 4 ? PLAYER_STATUS.ON_FIELD : 
                           index === 0 ? PLAYER_STATUS.GOALIE : PLAYER_STATUS.SUBSTITUTE,
        currentPeriodRole: index === 0 ? PLAYER_ROLES.GOALIE :
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
        currentPeriodStatus: PLAYER_STATUS.ON_FIELD,
        currentPeriodRole: index % 2 === 0 ? PLAYER_ROLES.DEFENDER : PLAYER_ROLES.ATTACKER
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
        currentPeriodStatus: index === 6 ? PLAYER_STATUS.SUBSTITUTE : 
                           index === 0 ? PLAYER_STATUS.GOALIE :
                           index < 5 ? PLAYER_STATUS.ON_FIELD : PLAYER_STATUS.SUBSTITUTE
      }
    }));
  }
};

/**
 * Complete game state scenarios for different phases
 */
export const gameStateScenarios = {
  /**
   * Fresh game - just started
   */
  freshGame: (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
    const players = playerDataScenarios.balanced();
    
    const formations = {
      [TEAM_MODES.PAIRS_7]: formationScenarios.pairs7Standard(players.map(p => p.id)),
      [TEAM_MODES.INDIVIDUAL_6]: formationScenarios.individual6Standard(players.slice(0, 6).map(p => p.id)),
      [TEAM_MODES.INDIVIDUAL_7]: formationScenarios.individual7Standard(players.map(p => p.id))
    };
    
    return {
      view: 'game',
      currentPeriodNumber: 1,
      selectedSquadIds: players.map(p => p.id),
      teamMode: teamMode,
      periodFormation: formations[teamMode],
      allPlayers: players.map(player => ({
        ...player,
        stats: {
          ...player.stats,
          timeOnFieldSeconds: 0,
          timeAsAttackerSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsGoalieSeconds: 0,
          timeAsSubSeconds: 0,
          lastStintStartTimeEpoch: Date.now()
        }
      })),
      rotationQueue: players.slice(1).map(p => p.id), // Exclude goalie
      gameConfig: gameConfigScenarios.standardPairs,
      matchTimerSeconds: 900, // 15 minutes
      subTimerSeconds: 0,
      isSubTimerPaused: false,
      nextPlayerIdToSubOut: players[1].id,
      nextNextPlayerIdToSubOut: players[2].id,
      homeScore: 0,
      awayScore: 0,
      playersToHighlight: [],
      gameHistory: {
        substitutions: [],
        periods: []
      }
    };
  },
  
  /**
   * Mid-game state with some history
   */
  midGame: (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
    const players = playerDataScenarios.unbalanced();
    const gameState = gameStateScenarios.freshGame(teamMode);
    
    return {
      ...gameState,
      allPlayers: players,
      matchTimerSeconds: 450, // 7.5 minutes remaining
      subTimerSeconds: 120,   // 2 minutes since last sub
      homeScore: 2,
      awayScore: 1,
      gameHistory: {
        substitutions: [
          {
            timestamp: Date.now() - 300000,
            playerOut: players[1].id,
            playerIn: players[5].id,
            position: 'leftDefender'
          },
          {
            timestamp: Date.now() - 180000,
            playerOut: players[3].id,
            playerIn: players[6].id,
            position: 'leftAttacker'
          }
        ],
        periods: [
          {
            number: 1,
            startTime: Date.now() - 450000,
            endTime: null,
            substitutions: 2
          }
        ]
      }
    };
  },
  
  /**
   * End-game state ready for stats
   */
  endGame: (teamMode = TEAM_MODES.INDIVIDUAL_7) => {
    const players = playerDataScenarios.endGame();
    const gameState = gameStateScenarios.freshGame(teamMode);
    
    return {
      ...gameState,
      currentPeriodNumber: 3,
      allPlayers: players,
      matchTimerSeconds: 0,
      subTimerSeconds: 0,
      isSubTimerPaused: true,
      homeScore: 4,
      awayScore: 2,
      gameHistory: {
        substitutions: [
          // Period 1 substitutions
          { timestamp: Date.now() - 2400000, playerOut: players[1].id, playerIn: players[5].id, position: 'leftDefender' },
          { timestamp: Date.now() - 2100000, playerOut: players[2].id, playerIn: players[6].id, position: 'rightDefender' },
          
          // Period 2 substitutions
          { timestamp: Date.now() - 1500000, playerOut: players[3].id, playerIn: players[1].id, position: 'leftAttacker' },
          { timestamp: Date.now() - 1200000, playerOut: players[4].id, playerIn: players[2].id, position: 'rightAttacker' },
          
          // Period 3 substitutions
          { timestamp: Date.now() - 600000, playerOut: players[5].id, playerIn: players[3].id, position: 'leftDefender' },
          { timestamp: Date.now() - 300000, playerOut: players[6].id, playerIn: players[4].id, position: 'rightDefender' }
        ],
        periods: [
          { number: 1, startTime: Date.now() - 2700000, endTime: Date.now() - 1800000, substitutions: 2 },
          { number: 2, startTime: Date.now() - 1800000, endTime: Date.now() - 900000, substitutions: 2 },
          { number: 3, startTime: Date.now() - 900000, endTime: Date.now(), substitutions: 2 }
        ]
      }
    };
  },
  
  /**
   * Game state with inactive players (Individual 7 mode)
   */
  withInactivePlayers: () => {
    const players = playerDataScenarios.withInactivePlayers();
    const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
    
    return {
      ...gameState,
      allPlayers: players,
      rotationQueue: players.filter(p => !p.stats.isInactive).slice(1).map(p => p.id) // Exclude inactive and goalie
    };
  }
};

// ===================================================================
// EDGE CASE AND ERROR SCENARIOS
// ===================================================================

/**
 * Edge case scenarios for robust testing
 */
export const edgeCaseScenarios = {
  /**
   * Minimum viable game state
   */
  minimumData: {
    view: 'game',
    selectedSquadIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6'],
    teamMode: TEAM_MODES.INDIVIDUAL_6,
    periodFormation: {
      goalie: 'player-1',
      leftDefender: 'player-2',
      rightDefender: 'player-3',
      leftAttacker: 'player-4',
      rightAttacker: 'player-5',
      substitute: 'player-6'
    },
    allPlayers: playerDataScenarios.balanced(6)
  },
  
  /**
   * Maximum complexity scenario
   */
  maximumComplexity: {
    view: 'game',
    currentPeriodNumber: 3,
    selectedSquadIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7'],
    teamMode: TEAM_MODES.INDIVIDUAL_7,
    periodFormation: formationScenarios.individual7Standard(['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7']),
    allPlayers: playerDataScenarios.withInactivePlayers(),
    rotationQueue: ['player-2', 'player-3', 'player-4', 'player-5', 'player-6'],
    gameConfig: {
      numPeriods: 4,
      periodDurationMinutes: 30,
      alertMinutes: 1,
      teamMode: TEAM_MODES.INDIVIDUAL_7,
      opponentTeamName: 'Complex Test Opponent FC United Academy'
    },
    matchTimerSeconds: 1800, // 30 minutes
    subTimerSeconds: 59,
    homeScore: 15,
    awayScore: 12,
    nextPlayerIdToSubOut: 'player-2',
    nextNextPlayerIdToSubOut: 'player-3',
    playersToHighlight: ['player-2', 'player-5'],
    gameHistory: {
      substitutions: new Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() - (20 - i) * 60000,
        playerOut: `player-${(i % 6) + 1}`,
        playerIn: `player-${((i + 3) % 6) + 1}`,
        position: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'][i % 4]
      })),
      periods: [
        { number: 1, startTime: Date.now() - 5400000, endTime: Date.now() - 3600000, substitutions: 6 },
        { number: 2, startTime: Date.now() - 3600000, endTime: Date.now() - 1800000, substitutions: 7 },
        { number: 3, startTime: Date.now() - 1800000, endTime: null, substitutions: 7 }
      ]
    }
  },
  
  /**
   * Data consistency edge cases
   */
  dataInconsistencies: {
    missingPlayer: {
      periodFormation: {
        goalie: 'missing-player-id',
        leftDefender: 'player-1',
        rightDefender: 'player-2',
        leftAttacker: 'player-3',
        rightAttacker: 'player-4',
        substitute_1: 'player-5',
        substitute_2: 'player-6'
      },
      allPlayers: playerDataScenarios.balanced(6) // Missing the goalie player
    },
    
    duplicateAssignments: {
      periodFormation: {
        goalie: 'player-1',
        leftDefender: 'player-2',
        rightDefender: 'player-2', // Duplicate!
        leftAttacker: 'player-3',
        rightAttacker: 'player-4',
        substitute_1: 'player-5',
        substitute_2: 'player-6'
      },
      allPlayers: playerDataScenarios.balanced(7)
    },
    
    invalidRotationQueue: {
      rotationQueue: ['missing-player', 'player-1', 'duplicate-id', 'duplicate-id'],
      allPlayers: playerDataScenarios.balanced(7)
    }
  }
};

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
        currentPeriodStatus: i < 4 ? PLAYER_STATUS.ON_FIELD : PLAYER_STATUS.SUBSTITUTE,
        currentPeriodRole: i < 2 ? PLAYER_ROLES.DEFENDER : 
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
      periodFormation: {
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
      periodFormation: {
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
        expectedResult: { view: 'game', periodFormation: Object }
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