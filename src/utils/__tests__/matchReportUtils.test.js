/**
 * Tests for matchReportUtils
 */

import {
  generateMatchSummary,
  processPlayerStatistics,
  formatEventTimeline,
  calculateEffectivePlayingTime,
  determinePlayerStartingRoles
} from '../matchReportUtils';
import { EVENT_TYPES } from '../gameEventLogger';
import { PLAYER_ROLES } from '../../constants/playerConstants';

describe('matchReportUtils', () => {
  // Mock data for testing
  const mockMatchEvents = [
    {
      id: 'evt1',
      type: EVENT_TYPES.MATCH_START,
      timestamp: 1000,
      matchTime: '00:00',
      sequence: 1,
      undone: false,
      data: {}
    },
    {
      id: 'evt2',
      type: EVENT_TYPES.TIMER_PAUSED,
      timestamp: 2000,
      matchTime: '00:01',
      sequence: 2,
      undone: false,
      data: {}
    },
    {
      id: 'evt3',
      type: EVENT_TYPES.TIMER_RESUMED,
      timestamp: 3000,
      matchTime: '00:02',
      sequence: 3,
      undone: false,
      data: {}
    },
    {
      id: 'evt4',
      type: EVENT_TYPES.MATCH_END,
      timestamp: 5000,
      matchTime: '00:04',
      sequence: 4,
      undone: false,
      data: {}
    }
  ];

  const mockPlayers = [
    {
      id: 'p1',
      name: 'Player 1',
      stats: {
        startedMatchAs: PLAYER_ROLES.GOALIE,
        timeOnFieldSeconds: 0,
        timeAsDefenderSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsGoalieSeconds: 240,
        timeAsSubSeconds: 0
      }
    },
    {
      id: 'p2',
      name: 'Player 2',
      stats: {
        startedMatchAs: PLAYER_ROLES.ON_FIELD,
        timeOnFieldSeconds: 180,
        timeAsDefenderSeconds: 120,
        timeAsAttackerSeconds: 60,
        timeAsGoalieSeconds: 0,
        timeAsSubSeconds: 60
      }
    }
  ];

  const mockSelectedSquadIds = ['p1', 'p2'];

  describe('generateMatchSummary', () => {
    it('should generate match summary with valid events', () => {
      const summary = generateMatchSummary(mockMatchEvents, [], 2, 1);

      expect(summary.matchStartTime).toBe(1000);
      expect(summary.matchEndTime).toBe(5000);
      expect(summary.matchDurationMs).toBe(4000);
      expect(summary.ownScore).toBe(2);
      expect(summary.opponentScore).toBe(1);
      expect(summary.isMatchComplete).toBe(true);
      expect(summary.totalEvents).toBe(4);
      expect(summary.activeEvents).toBe(4);
      expect(summary.pauseCount).toBe(1);
    });

    it('should handle empty events array', () => {
      const summary = generateMatchSummary([], [], 0, 0);

      expect(summary.matchStartTime).toBe(null);
      expect(summary.matchEndTime).toBe(null);
      expect(summary.matchDurationMs).toBe(0);
      expect(summary.isMatchComplete).toBe(false);
      expect(summary.totalEvents).toBe(0);
    });

    it('should handle invalid input gracefully', () => {
      const summary = generateMatchSummary([], [], 0, 0);

      expect(summary.matchStartTime).toBe(null);
      expect(summary.totalEvents).toBe(0);
    });
  });

  describe('processPlayerStatistics', () => {
    it('should process player statistics correctly', () => {
      const stats = processPlayerStatistics(mockPlayers, [], mockSelectedSquadIds);

      expect(stats).toHaveLength(2);
      expect(stats[0].name).toBe('Player 1');
      expect(stats[0].startingRole).toBe(PLAYER_ROLES.GOALIE);
      expect(stats[0].timeBreakdown.timeAsGoalieSeconds).toBe(240);
      expect(stats[0].totalActiveTime).toBe(240);

      expect(stats[1].name).toBe('Player 2');
      expect(stats[1].startingRole).toBe(PLAYER_ROLES.ON_FIELD);
      expect(stats[1].timeBreakdown.timeOnFieldSeconds).toBe(180);
      expect(stats[1].totalActiveTime).toBe(180);
    });

    it('should handle empty players array', () => {
      const stats = processPlayerStatistics([], [], []);

      expect(stats).toHaveLength(0);
    });

    it('should handle invalid input gracefully', () => {
      const stats = processPlayerStatistics([], [], []);

      expect(stats).toHaveLength(0);
    });
  });

  describe('formatEventTimeline', () => {
    it('should format event timeline correctly', () => {
      const timeline = formatEventTimeline(mockMatchEvents);

      expect(timeline).toHaveLength(4);
      expect(timeline[0].type).toBe(EVENT_TYPES.MATCH_START);
      expect(timeline[0].displayIndex).toBe(1);
      expect(timeline[0].description).toBe('Match started');
      expect(timeline[0].category).toBe('match');
      expect(timeline[0].severity).toBe('high');
    });

    it('should filter undone events', () => {
      const eventsWithUndone = [
        ...mockMatchEvents,
        {
          id: 'evt5',
          type: EVENT_TYPES.SUBSTITUTION,
          timestamp: 4000,
          matchTime: '00:03',
          sequence: 5,
          undone: true,
          data: {}
        }
      ];

      const timeline = formatEventTimeline(eventsWithUndone, { includeUndone: false });

      expect(timeline).toHaveLength(4);
      expect(timeline.find(e => e.undone)).toBeUndefined();
    });

    it('should handle empty events array', () => {
      const timeline = formatEventTimeline([]);

      expect(timeline).toHaveLength(0);
    });

    it('should handle invalid input gracefully', () => {
      const timeline = formatEventTimeline([]);

      expect(timeline).toHaveLength(0);
    });
  });

  describe('calculateEffectivePlayingTime', () => {
    it('should calculate effective playing time correctly', () => {
      const effectiveTime = calculateEffectivePlayingTime(mockMatchEvents);

      // Total time: 4000ms, Pause time: 1000ms (2000-3000)
      // Effective time: 4000 - 1000 = 3000ms
      expect(effectiveTime).toBe(3000);
    });

    it('should handle match without pauses', () => {
      const eventsWithoutPauses = [
        mockMatchEvents[0], // MATCH_START
        mockMatchEvents[3]  // MATCH_END
      ];

      const effectiveTime = calculateEffectivePlayingTime(eventsWithoutPauses);

      expect(effectiveTime).toBe(4000);
    });

    it('should handle ongoing match', () => {
      const ongoingEvents = [mockMatchEvents[0]]; // Only MATCH_START
      const originalNow = Date.now;
      Date.now = jest.fn(() => 6000);

      const effectiveTime = calculateEffectivePlayingTime(ongoingEvents);

      expect(effectiveTime).toBe(5000);

      Date.now = originalNow;
    });

    it('should handle empty events array', () => {
      const effectiveTime = calculateEffectivePlayingTime([]);

      expect(effectiveTime).toBe(0);
    });

    it('should handle invalid input gracefully', () => {
      const effectiveTime = calculateEffectivePlayingTime([]);

      expect(effectiveTime).toBe(0);
    });
  });

  describe('determinePlayerStartingRoles', () => {
    it('should determine starting roles from player stats', () => {
      const startingRoles = determinePlayerStartingRoles(mockPlayers, []);

      expect(startingRoles.p1).toBe(PLAYER_ROLES.GOALIE);
      expect(startingRoles.p2).toBe(PLAYER_ROLES.ON_FIELD);
    });

    it('should handle players without starting roles', () => {
      const playersWithoutRoles = [
        { id: 'p1', name: 'Player 1', stats: {} },
        { id: 'p2', name: 'Player 2', stats: {} }
      ];

      const startingRoles = determinePlayerStartingRoles(playersWithoutRoles, []);

      expect(startingRoles.p1).toBe(null);
      expect(startingRoles.p2).toBe(null);
    });

    it('should handle empty players array', () => {
      const startingRoles = determinePlayerStartingRoles([], []);

      expect(Object.keys(startingRoles)).toHaveLength(0);
    });

    it('should handle invalid input gracefully', () => {
      const startingRoles = determinePlayerStartingRoles([], []);

      expect(Object.keys(startingRoles)).toHaveLength(0);
    });
  });
});