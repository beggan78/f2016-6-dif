/**
 * Period Transition Event Logging Tests
 * Tests comprehensive period and match lifecycle event logging
 */

import {
  EVENT_TYPES,
  logEvent,
  getMatchEvents,
  clearAllEvents,
  calculateMatchTime,
  initializeEventLogger
} from '../gameEventLogger';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Period Transition Event Logging', () => {
  beforeEach(() => {
    // Clear all events before each test
    clearAllEvents();
    
    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Match Lifecycle Events', () => {
    test('should log complete match lifecycle for INDIVIDUAL_6 mode', () => {
      const startTime = 1640995200000;
      const formation6 = {
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute: 'player6'
      };

      // Match start
      const matchStart = logEvent(EVENT_TYPES.MATCH_START, {
        periodDurationMinutes: 15,
        teamMode: 'INDIVIDUAL_6',
        homeTeamName: 'Djurgården',
        awayTeamName: 'Test Opponent',
        numPeriods: 2,
        matchMetadata: {
          startTime,
          plannedPeriods: 2,
          periodDurationMinutes: 15
        }
      });

      // Period 1 start
      const period1Start = logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        periodDurationMinutes: 15,
        startingFormation: formation6,
        teamMode: 'INDIVIDUAL_6',
        periodMetadata: {
          startTime,
          plannedDurationMinutes: 15,
          isFirstPeriod: true
        }
      });

      // Simulate period 1 end (15 minutes later)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 15 * 60 * 1000);
      
      const period1End = logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 1,
        periodDurationMs: 15 * 60 * 1000,
        periodDurationMinutes: 15,
        plannedDurationMinutes: 15,
        endingFormation: formation6,
        teamMode: 'INDIVIDUAL_6',
        periodMetadata: {
          endTime: startTime + 15 * 60 * 1000,
          startTime,
          actualDurationMs: 15 * 60 * 1000,
          wasCompleted: true,
          endReason: 'normal_completion'
        }
      });

      // Period 2 start
      const period2Start = logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 2,
        periodDurationMinutes: 15,
        startingFormation: formation6,
        teamMode: 'INDIVIDUAL_6',
        periodMetadata: {
          startTime: startTime + 15 * 60 * 1000,
          plannedDurationMinutes: 15,
          isFirstPeriod: false
        }
      });

      // Simulate period 2 end (30 minutes total)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 30 * 60 * 1000);

      const period2End = logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 2,
        periodDurationMs: 15 * 60 * 1000,
        periodDurationMinutes: 15,
        plannedDurationMinutes: 15,
        endingFormation: formation6,
        teamMode: 'INDIVIDUAL_6',
        periodMetadata: {
          endTime: startTime + 30 * 60 * 1000,
          startTime: startTime + 15 * 60 * 1000,
          actualDurationMs: 15 * 60 * 1000,
          wasCompleted: true,
          endReason: 'normal_completion'
        }
      });

      // Match end
      const matchEnd = logEvent(EVENT_TYPES.MATCH_END, {
        finalPeriodNumber: 2,
        matchDurationMs: 30 * 60 * 1000,
        teamMode: 'INDIVIDUAL_6',
        matchMetadata: {
          endTime: startTime + 30 * 60 * 1000,
          endReason: 'normal_completion',
          wasCompleted: true,
          totalPeriods: 2
        }
      });

      // Verify all events were logged
      const events = getMatchEvents();
      expect(events).toHaveLength(6);

      // Verify event sequence
      expect(events[0].type).toBe(EVENT_TYPES.MATCH_START);
      expect(events[1].type).toBe(EVENT_TYPES.PERIOD_START);
      expect(events[2].type).toBe(EVENT_TYPES.PERIOD_END);
      expect(events[3].type).toBe(EVENT_TYPES.PERIOD_START);
      expect(events[4].type).toBe(EVENT_TYPES.PERIOD_END);
      expect(events[5].type).toBe(EVENT_TYPES.MATCH_END);

      // Verify period numbers
      expect(events[1].data.periodNumber).toBe(1);
      expect(events[2].data.periodNumber).toBe(1);
      expect(events[3].data.periodNumber).toBe(2);
      expect(events[4].data.periodNumber).toBe(2);

      // Verify match times
      expect(events[0].matchTime).toBe('00:00');
      expect(events[1].matchTime).toBe('00:00');
      expect(events[2].matchTime).toBe('15:00');
      expect(events[5].matchTime).toBe('30:00');

      // Verify formations are preserved
      expect(events[1].data.startingFormation).toEqual(formation6);
      expect(events[2].data.endingFormation).toEqual(formation6);
    });

    test('should log complete match lifecycle for INDIVIDUAL_7 mode', () => {
      const formation7 = {
        goalie: 'player1',
        leftDefender7: 'player2',
        rightDefender7: 'player3',
        leftAttacker7: 'player4',
        rightAttacker7: 'player5',
        substitute7_1: 'player6',
        substitute7_2: 'player7'
      };

      // Log all events for 7-player mode
      logEvent(EVENT_TYPES.MATCH_START, {
        teamMode: 'INDIVIDUAL_7',
        homeTeamName: 'Djurgården',
        awayTeamName: 'Test Opponent'
      });

      logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        startingFormation: formation7,
        teamMode: 'INDIVIDUAL_7'
      });

      logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 1,
        endingFormation: formation7,
        teamMode: 'INDIVIDUAL_7'
      });

      logEvent(EVENT_TYPES.MATCH_END, {
        finalPeriodNumber: 1,
        teamMode: 'INDIVIDUAL_7'
      });

      const events = getMatchEvents();
      expect(events).toHaveLength(4);
      
      // Verify all events have correct team mode
      events.forEach(event => {
        if (event.data.teamMode) {
          expect(event.data.teamMode).toBe('INDIVIDUAL_7');
        }
      });

      // Verify 7-player formation structure
      const periodStart = events.find(e => e.type === EVENT_TYPES.PERIOD_START);
      expect(periodStart.data.startingFormation.substitute7_1).toBe('player6');
      expect(periodStart.data.startingFormation.substitute7_2).toBe('player7');
    });

    test('should log complete match lifecycle for PAIRS_7 mode', () => {
      const formationPairs = {
        goalie: 'player1',
        leftPair: { defender: 'player2', attacker: 'player3' },
        rightPair: { defender: 'player4', attacker: 'player5' },
        subPair: { defender: 'player6', attacker: 'player7' }
      };

      // Log all events for pairs mode
      logEvent(EVENT_TYPES.MATCH_START, {
        teamMode: 'PAIRS_7',
        homeTeamName: 'Djurgården',
        awayTeamName: 'Test Opponent'
      });

      logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        startingFormation: formationPairs,
        teamMode: 'PAIRS_7'
      });

      logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 1,
        endingFormation: formationPairs,
        teamMode: 'PAIRS_7'
      });

      logEvent(EVENT_TYPES.MATCH_END, {
        finalPeriodNumber: 1,
        teamMode: 'PAIRS_7'
      });

      const events = getMatchEvents();
      expect(events).toHaveLength(4);
      
      // Verify pairs formation structure
      const periodStart = events.find(e => e.type === EVENT_TYPES.PERIOD_START);
      expect(periodStart.data.startingFormation.leftPair.defender).toBe('player2');
      expect(periodStart.data.startingFormation.leftPair.attacker).toBe('player3');
    });
  });

  describe('Event Data Completeness', () => {
    test('should include all required match metadata in MATCH_START event', () => {
      const matchStart = logEvent(EVENT_TYPES.MATCH_START, {
        periodDurationMinutes: 15,
        teamMode: 'INDIVIDUAL_6',
        homeTeamName: 'Djurgården',
        awayTeamName: 'Test Opponent',
        numPeriods: 2,
        matchMetadata: {
          startTime: 1640995200000,
          venue: 'Test Stadium',
          weather: 'Sunny',
          referee: 'Test Referee',
          plannedPeriods: 2,
          periodDurationMinutes: 15
        }
      });

      expect(matchStart.data).toMatchObject({
        periodDurationMinutes: 15,
        teamMode: 'INDIVIDUAL_6',
        homeTeamName: 'Djurgården',
        awayTeamName: 'Test Opponent',
        numPeriods: 2
      });

      expect(matchStart.data.matchMetadata).toMatchObject({
        startTime: 1640995200000,
        venue: 'Test Stadium',
        weather: 'Sunny',
        referee: 'Test Referee',
        plannedPeriods: 2,
        periodDurationMinutes: 15
      });
    });

    test('should include all required period metadata in PERIOD_START event', () => {
      const formation = {
        goalie: 'player1',
        leftDefender: 'player2',
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute: 'player6'
      };

      const periodStart = logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        periodDurationMinutes: 15,
        startingFormation: formation,
        teamMode: 'INDIVIDUAL_6',
        periodMetadata: {
          startTime: 1640995200000,
          plannedDurationMinutes: 15,
          isFirstPeriod: true
        }
      });

      expect(periodStart.data).toMatchObject({
        periodNumber: 1,
        periodDurationMinutes: 15,
        startingFormation: formation,
        teamMode: 'INDIVIDUAL_6'
      });

      expect(periodStart.data.periodMetadata).toMatchObject({
        startTime: 1640995200000,
        plannedDurationMinutes: 15,
        isFirstPeriod: true
      });
    });

    test('should include all required period metadata in PERIOD_END event', () => {
      const formation = {
        goalie: 'player1',
        leftDefender: 'player6', // Player rotated in
        rightDefender: 'player3',
        leftAttacker: 'player4',
        rightAttacker: 'player5',
        substitute: 'player2' // Original player rotated out
      };

      const startTime = 1640995200000;
      const endTime = startTime + 15 * 60 * 1000;

      const periodEnd = logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 1,
        periodDurationMs: 15 * 60 * 1000,
        periodDurationMinutes: 15,
        periodDurationSeconds: 900,
        plannedDurationMinutes: 15,
        endingFormation: formation,
        teamMode: 'INDIVIDUAL_6',
        periodMetadata: {
          endTime,
          startTime,
          actualDurationMs: 15 * 60 * 1000,
          wasCompleted: true,
          endReason: 'normal_completion'
        }
      });

      expect(periodEnd.data).toMatchObject({
        periodNumber: 1,
        periodDurationMs: 15 * 60 * 1000,
        periodDurationMinutes: 15,
        periodDurationSeconds: 900,
        plannedDurationMinutes: 15,
        endingFormation: formation,
        teamMode: 'INDIVIDUAL_6'
      });

      expect(periodEnd.data.periodMetadata).toMatchObject({
        endTime,
        startTime,
        actualDurationMs: 15 * 60 * 1000,
        wasCompleted: true,
        endReason: 'normal_completion'
      });
    });

    test('should include all required match metadata in MATCH_END event', () => {
      const startTime = 1640995200000;
      const endTime = startTime + 30 * 60 * 1000;

      const matchEnd = logEvent(EVENT_TYPES.MATCH_END, {
        finalPeriodNumber: 2,
        matchDurationMs: 30 * 60 * 1000,
        teamMode: 'INDIVIDUAL_6',
        matchMetadata: {
          endTime,
          endReason: 'normal_completion',
          wasCompleted: true,
          totalPeriods: 2
        }
      });

      expect(matchEnd.data).toMatchObject({
        finalPeriodNumber: 2,
        matchDurationMs: 30 * 60 * 1000,
        teamMode: 'INDIVIDUAL_6'
      });

      expect(matchEnd.data.matchMetadata).toMatchObject({
        endTime,
        endReason: 'normal_completion',
        wasCompleted: true,
        totalPeriods: 2
      });
    });
  });

  describe('Integration with Timer System', () => {
    test('should properly sequence events for match report generation', () => {
      // Simulate a complete match flow as it would happen in the app
      const startTime = 1640995200000;
      
      // Match start (called by App.js handleStartGame -> timers.startTimers)
      logEvent(EVENT_TYPES.MATCH_START, {
        teamMode: 'INDIVIDUAL_6',
        homeTeamName: 'Djurgården',
        awayTeamName: 'Test Opponent',
        numPeriods: 2
      });

      // Period 1 start (called by timers.startTimers)
      logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        teamMode: 'INDIVIDUAL_6'
      });

      // Period 1 end (called by App.js handleEndPeriod -> timers.stopTimers)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 15 * 60 * 1000);
      logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 1,
        teamMode: 'INDIVIDUAL_6'
      });

      // Period 2 start (called by timers.startTimers for next period)
      logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 2,
        teamMode: 'INDIVIDUAL_6'
      });

      // Period 2 end (called by timers.stopTimers)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 30 * 60 * 1000);
      logEvent(EVENT_TYPES.PERIOD_END, {
        periodNumber: 2,
        teamMode: 'INDIVIDUAL_6'
      });

      // Match end (called by timers.stopTimers with isMatchEnd=true)
      logEvent(EVENT_TYPES.MATCH_END, {
        finalPeriodNumber: 2,
        teamMode: 'INDIVIDUAL_6'
      });

      const events = getMatchEvents();
      
      // Verify proper sequence for match report
      expect(events).toHaveLength(6);
      expect(events.map(e => e.type)).toEqual([
        EVENT_TYPES.MATCH_START,
        EVENT_TYPES.PERIOD_START,
        EVENT_TYPES.PERIOD_END,
        EVENT_TYPES.PERIOD_START,
        EVENT_TYPES.PERIOD_END,
        EVENT_TYPES.MATCH_END
      ]);

      // Verify timing progression
      expect(events[0].matchTime).toBe('00:00'); // Match start
      expect(events[1].matchTime).toBe('00:00'); // Period 1 start
      expect(events[2].matchTime).toBe('15:00'); // Period 1 end
      expect(events[3].matchTime).toBe('15:00'); // Period 2 start
      expect(events[4].matchTime).toBe('30:00'); // Period 2 end
      expect(events[5].matchTime).toBe('30:00'); // Match end

      // Verify sequence numbers increment properly
      expect(events.map(e => e.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing formation data gracefully', () => {
      const periodStart = logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        startingFormation: null, // Missing formation
        teamMode: 'INDIVIDUAL_6'
      });

      expect(periodStart).toBeDefined();
      expect(periodStart.data.startingFormation).toBeNull();
    });

    test('should handle missing team mode gracefully', () => {
      const periodStart = logEvent(EVENT_TYPES.PERIOD_START, {
        periodNumber: 1,
        // Missing teamMode
      });

      expect(periodStart).toBeDefined();
      expect(periodStart.data.teamMode).toBeUndefined();
    });
  });
});