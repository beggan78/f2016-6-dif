/**
 * Test Fixtures - Event Data
 * Comprehensive sample events covering all 30+ event types
 */

// Sample player IDs and names for consistency
export const PLAYER_IDS = {
  GOALIE_1: 'player-goalie-1',
  GOALIE_2: 'player-goalie-2',
  DEFENDER_1: 'player-defender-1',
  DEFENDER_2: 'player-defender-2',
  ATTACKER_1: 'player-attacker-1',
  ATTACKER_2: 'player-attacker-2',
  MIDFIELDER_1: 'player-midfielder-1',
  SUB_1: 'player-sub-1',
  SUB_2: 'player-sub-2'
};

export const PLAYER_NAMES = {
  [PLAYER_IDS.GOALIE_1]: 'Alex Morgan',
  [PLAYER_IDS.GOALIE_2]: 'Sam Taylor',
  [PLAYER_IDS.DEFENDER_1]: 'Jamie Lee',
  [PLAYER_IDS.DEFENDER_2]: 'Chris Johnson',
  [PLAYER_IDS.ATTACKER_1]: 'Jordan Smith',
  [PLAYER_IDS.ATTACKER_2]: 'Casey Brown',
  [PLAYER_IDS.MIDFIELDER_1]: 'Riley Davis',
  [PLAYER_IDS.SUB_1]: 'Morgan Wilson',
  [PLAYER_IDS.SUB_2]: 'Taylor Martinez'
};

// Match lifecycle events
export const matchCreatedEvent = {
  type: 'match_created',
  matchTime: '0:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    ownTeamName: 'Lightning FC',
    opponentTeamName: 'Thunder United',
    periodDurationMinutes: 25,
    totalPeriods: 2
  }
};

export const matchStartedEvent = {
  type: 'match_start',
  matchTime: '0:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    startingLineup: [
      PLAYER_IDS.GOALIE_1,
      PLAYER_IDS.DEFENDER_1,
      PLAYER_IDS.DEFENDER_2,
      PLAYER_IDS.ATTACKER_1,
      PLAYER_IDS.ATTACKER_2
    ],
    ownTeamName: 'Lightning FC',
    opponentTeamName: 'Thunder United',
    periodDurationMinutes: 25,
    numPeriods: 2
  }
};

export const matchEndedEvent = {
  type: 'match_end',
  matchTime: '50:00',
  periodNumber: 2,
  timestamp: Date.now(),
  data: {
    matchDurationMs: 3000000,
    finalPeriodNumber: 2,
    matchMetadata: {
      totalPeriods: 2,
      ownScore: 3,
      opponentScore: 2
    }
  }
};

export const matchAbandonedEvent = {
  type: 'match_abandoned',
  matchTime: '25:30',
  periodNumber: 2,
  timestamp: Date.now(),
  data: {
    reason: 'Weather conditions'
  }
};

export const matchSuspendedEvent = {
  type: 'match_suspended',
  matchTime: '15:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    reason: 'Medical emergency'
  }
};

// Period events
export const periodStartedEvent = {
  type: 'period_start',
  matchTime: '0:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    startingLineup: [
      PLAYER_IDS.GOALIE_1,
      PLAYER_IDS.DEFENDER_1,
      PLAYER_IDS.ATTACKER_1
    ]
  }
};

export const periodEndedEvent = {
  type: 'period_end',
  matchTime: '25:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

// Goalie events
export const goalieAssignmentEvent = {
  type: 'goalie_assignment',
  matchTime: '0:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    goalieId: PLAYER_IDS.GOALIE_1,
    display_name: PLAYER_NAMES[PLAYER_IDS.GOALIE_1]
  }
};

export const goalieSwitchEvent = {
  type: 'goalie_switch',
  matchTime: '12:30',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    previousGoalieId: PLAYER_IDS.GOALIE_1,
    goalieId: PLAYER_IDS.GOALIE_2,
    previousGoalieName: PLAYER_NAMES[PLAYER_IDS.GOALIE_1],
    goalieName: PLAYER_NAMES[PLAYER_IDS.GOALIE_2]
  }
};

export const goalieEntersWithReplacementEvent = {
  type: 'goalie_assignment',
  matchTime: '15:00',
  periodNumber: 2,
  timestamp: Date.now(),
  data: {
    goalieId: PLAYER_IDS.GOALIE_2,
    newGoalieId: PLAYER_IDS.GOALIE_2,
    previousGoalieId: PLAYER_IDS.GOALIE_1,
    eventType: 'replacement',
    newGoaliePosition: 'defender',
    goalieName: PLAYER_NAMES[PLAYER_IDS.GOALIE_2]
  }
};

// Substitution events
export const substitutionEvent = {
  type: 'substitution',
  matchTime: '10:15',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playersOff: [PLAYER_IDS.ATTACKER_1, PLAYER_IDS.DEFENDER_1],
    playersOn: [PLAYER_IDS.SUB_1, PLAYER_IDS.SUB_2],
    playersOffNames: [PLAYER_NAMES[PLAYER_IDS.ATTACKER_1], PLAYER_NAMES[PLAYER_IDS.DEFENDER_1]],
    playersOnNames: [PLAYER_NAMES[PLAYER_IDS.SUB_1], PLAYER_NAMES[PLAYER_IDS.SUB_2]],
    correlationId: 'correlation-123'
  }
};

export const substitutionEmptyArraysEvent = {
  type: 'substitution',
  matchTime: '20:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playersOff: [],
    playersOn: []
  }
};

// Position switch events
export const positionSwitchEvent = {
  type: 'position_change',
  matchTime: '18:45',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    sourcePlayerId: PLAYER_IDS.DEFENDER_1,
    targetPlayerId: PLAYER_IDS.ATTACKER_1,
    sourcePosition: 'defender',
    targetPosition: 'attacker',
    sourcePlayerName: PLAYER_NAMES[PLAYER_IDS.DEFENDER_1],
    targetPlayerName: PLAYER_NAMES[PLAYER_IDS.ATTACKER_1]
  }
};

export const positionSwitchIncompleteEvent = {
  type: 'position_change',
  matchTime: '22:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    sourcePlayerId: PLAYER_IDS.DEFENDER_1,
    // Missing targetPlayerId - should skip
    sourcePosition: 'defender'
  }
};

// Score events
export const goalScoredEvent = {
  type: 'goal_scored',
  matchTime: '8:30',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_1,
    scorerId: PLAYER_IDS.ATTACKER_1,
    scorerName: PLAYER_NAMES[PLAYER_IDS.ATTACKER_1],
    ownScore: 1,
    opponentScore: 0
  }
};

export const goalConcededEvent = {
  type: 'goal_conceded',
  matchTime: '14:20',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    ownScore: 1,
    opponentScore: 1
  }
};

export const goalScoredNoPlayerEvent = {
  type: 'goal_scored',
  matchTime: '20:00',
  periodNumber: 2,
  timestamp: Date.now(),
  data: {
    ownScore: 2,
    opponentScore: 1
    // No playerId - valid case
  }
};

// Player activation events
export const playerInactivatedEvent = {
  type: 'player_inactivated',
  matchTime: '5:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_2,
    playerDisplayName: PLAYER_NAMES[PLAYER_IDS.ATTACKER_2]
  }
};

export const playerReactivatedEvent = {
  type: 'player_reactivated',
  matchTime: '12:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_2,
    display_name: PLAYER_NAMES[PLAYER_IDS.ATTACKER_2]
  }
};

export const playerActivatedEvent = {
  type: 'player_activated',
  matchTime: '13:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.DEFENDER_2,
    playerName: PLAYER_NAMES[PLAYER_IDS.DEFENDER_2]
  }
};

// Fair play award
export const fairPlayAwardEvent = {
  type: 'fair_play_award',
  matchTime: '50:00',
  periodNumber: 2,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.MIDFIELDER_1,
    display_name: PLAYER_NAMES[PLAYER_IDS.MIDFIELDER_1]
  }
};

// Events with no database mapping (should be skipped)
export const periodPausedEvent = {
  type: 'period_paused',
  matchTime: '10:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const periodResumedEvent = {
  type: 'period_resumed',
  matchTime: '10:30',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const timerPausedEvent = {
  type: 'timer_paused',
  matchTime: '15:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const timerResumedEvent = {
  type: 'timer_resumed',
  matchTime: '15:15',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const substitutionUndoneEvent = {
  type: 'substitution_undone',
  matchTime: '20:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const goalCorrectedEvent = {
  type: 'goal_corrected',
  matchTime: '22:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const goalUndoneEvent = {
  type: 'goal_undone',
  matchTime: '23:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const intermissionEvent = {
  type: 'intermission',
  matchTime: '25:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const technicalTimeoutEvent = {
  type: 'technical_timeout',
  matchTime: '18:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

// Edge cases
export const eventWithMissingMatchTime = {
  type: 'goal_scored',
  matchTime: null,
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_1,
    ownScore: 1,
    opponentScore: 0
  }
};

export const eventWithInvalidMatchTime = {
  type: 'goal_scored',
  matchTime: 'invalid',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_1,
    ownScore: 2,
    opponentScore: 0
  }
};

export const eventWithUnknownType = {
  type: 'unknown_event_type',
  matchTime: '5:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {}
};

export const eventWithMissingPeriod = {
  type: 'goal_scored',
  matchTime: '10:00',
  // periodNumber missing
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_1,
    ownScore: 1,
    opponentScore: 0
  }
};

export const eventWithPlayerNameMap = {
  type: 'substitution',
  matchTime: '15:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playersOff: [PLAYER_IDS.ATTACKER_1],
    playersOn: [PLAYER_IDS.SUB_1],
    playerNameMap: {
      [PLAYER_IDS.ATTACKER_1]: PLAYER_NAMES[PLAYER_IDS.ATTACKER_1],
      [PLAYER_IDS.SUB_1]: PLAYER_NAMES[PLAYER_IDS.SUB_1]
    }
  }
};

export const eventWithSwapPlayer = {
  type: 'position_change',
  matchTime: '20:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    sourcePlayerId: PLAYER_IDS.DEFENDER_1,
    targetPlayerId: PLAYER_IDS.ATTACKER_1,
    swapPlayerId: PLAYER_IDS.ATTACKER_1,
    swapPlayerName: PLAYER_NAMES[PLAYER_IDS.ATTACKER_1],
    sourcePosition: 'defender',
    targetPosition: 'attacker'
  }
};

// Display name edge cases
export const eventWithUnknownDisplayName = {
  type: 'goal_scored',
  matchTime: '5:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_1,
    display_name: 'Unknown',
    ownScore: 1,
    opponentScore: 0
  }
};

export const eventWithEmptyDisplayName = {
  type: 'goal_scored',
  matchTime: '6:00',
  periodNumber: 1,
  timestamp: Date.now(),
  data: {
    playerId: PLAYER_IDS.ATTACKER_1,
    display_name: '   ',
    ownScore: 1,
    opponentScore: 0
  }
};

export const eventWithValidUUID = {
  type: 'substitution',
  matchTime: '10:00',
  periodNumber: 1,
  timestamp: Date.now(),
  id: '550e8400-e29b-41d4-a716-446655440000',
  data: {
    playersOff: [PLAYER_IDS.ATTACKER_1],
    playersOn: [PLAYER_IDS.SUB_1],
    correlationId: '550e8400-e29b-41d4-a716-446655440001'
  }
};

export const eventWithInvalidUUID = {
  type: 'substitution',
  matchTime: '11:00',
  periodNumber: 1,
  timestamp: Date.now(),
  id: 'not-a-uuid',
  data: {
    playersOff: [PLAYER_IDS.ATTACKER_1],
    playersOn: [PLAYER_IDS.SUB_1],
    correlationId: 'also-not-a-uuid'
  }
};

// All events mapped by type for easy access
export const allEventsByType = {
  match_created: matchCreatedEvent,
  match_start: matchStartedEvent,
  match_end: matchEndedEvent,
  match_abandoned: matchAbandonedEvent,
  match_suspended: matchSuspendedEvent,
  period_start: periodStartedEvent,
  period_end: periodEndedEvent,
  goalie_assignment: goalieAssignmentEvent,
  goalie_switch: goalieSwitchEvent,
  substitution: substitutionEvent,
  position_change: positionSwitchEvent,
  goal_scored: goalScoredEvent,
  goal_conceded: goalConcededEvent,
  player_inactivated: playerInactivatedEvent,
  player_reactivated: playerReactivatedEvent,
  player_activated: playerActivatedEvent,
  fair_play_award: fairPlayAwardEvent,
  period_paused: periodPausedEvent,
  period_resumed: periodResumedEvent,
  timer_paused: timerPausedEvent,
  timer_resumed: timerResumedEvent,
  substitution_undone: substitutionUndoneEvent,
  goal_corrected: goalCorrectedEvent,
  goal_undone: goalUndoneEvent,
  intermission: intermissionEvent,
  technical_timeout: technicalTimeoutEvent
};

// Collection of all events for iteration
export const allEvents = Object.values(allEventsByType);
