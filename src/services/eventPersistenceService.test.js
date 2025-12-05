/**
 * Event Persistence Service Tests
 * Tests for real-time event persistence to Supabase database
 */

import { eventPersistenceService } from './eventPersistenceService';
import { supabase, getCurrentUser } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  },
  getCurrentUser: jest.fn()
}));

describe('EventPersistenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Event Type Mapping', () => {
    it('should map direct event types correctly', () => {
      expect(eventPersistenceService.mapEventTypeToDatabase('match_start')).toBe('match_started');
      expect(eventPersistenceService.mapEventTypeToDatabase('match_end')).toBe('match_ended');
      expect(eventPersistenceService.mapEventTypeToDatabase('period_start')).toBe('period_started');
      expect(eventPersistenceService.mapEventTypeToDatabase('period_end')).toBe('period_ended');
      expect(eventPersistenceService.mapEventTypeToDatabase('goal_scored')).toBe('goal_scored');
      expect(eventPersistenceService.mapEventTypeToDatabase('goal_conceded')).toBe('goal_conceded');
      expect(eventPersistenceService.mapEventTypeToDatabase('substitution')).toBe('substitution_in');
      expect(eventPersistenceService.mapEventTypeToDatabase('goalie_assignment')).toBe('goalie_enters');
      expect(eventPersistenceService.mapEventTypeToDatabase('position_change')).toBe('position_switch');
    });

    it('should map special case event types', () => {
      expect(eventPersistenceService.mapEventTypeToDatabase('goalie_switch')).toBe('goalie_exits');
      expect(eventPersistenceService.mapEventTypeToDatabase('match_abandoned')).toBe('match_ended');
      expect(eventPersistenceService.mapEventTypeToDatabase('match_suspended')).toBe('match_ended');
    });

    it('should return null for unmapped event types', () => {
      expect(eventPersistenceService.mapEventTypeToDatabase('timer_paused')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('timer_resumed')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('intermission')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('substitution_undone')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('goal_corrected')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('goal_undone')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('technical_timeout')).toBeNull();
    });

    it('should return null for unknown event types', () => {
      expect(eventPersistenceService.mapEventTypeToDatabase('unknown_event')).toBeNull();
      expect(eventPersistenceService.mapEventTypeToDatabase('')).toBeNull();
    });
  });

  describe('Match Time Parsing', () => {
    it('should parse valid match time strings', () => {
      expect(eventPersistenceService.parseMatchTimeToSeconds('00:00')).toBe(0);
      expect(eventPersistenceService.parseMatchTimeToSeconds('01:00')).toBe(60);
      expect(eventPersistenceService.parseMatchTimeToSeconds('05:30')).toBe(330);
      expect(eventPersistenceService.parseMatchTimeToSeconds('10:45')).toBe(645);
      expect(eventPersistenceService.parseMatchTimeToSeconds('25:00')).toBe(1500);
    });

    it('should handle invalid match time formats', () => {
      expect(eventPersistenceService.parseMatchTimeToSeconds(null)).toBe(0);
      expect(eventPersistenceService.parseMatchTimeToSeconds(undefined)).toBe(0);
      expect(eventPersistenceService.parseMatchTimeToSeconds('')).toBe(0);
      expect(eventPersistenceService.parseMatchTimeToSeconds('invalid')).toBe(0);
      expect(eventPersistenceService.parseMatchTimeToSeconds('5')).toBe(0);
    });
  });

  describe('Data Transformation', () => {
    it('should transform basic event to database format', () => {
      const event = {
        id: 'evt_123',
        type: 'goal_scored',
        timestamp: Date.now(),
        matchTime: '05:30',
        periodNumber: 1,
        data: { playerId: 'player_456', scorerId: 'player_456', ownScore: 2, opponentScore: 1 }
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_789');

      expect(result).toMatchObject({
        match_id: 'match_789',
        event_type: 'goal_scored',
        occurred_at_seconds: 330, // 5*60 + 30
        period: 1,
        player_id: 'player_456'
      });
      expect(result.data).toEqual({
        ownScore: 2,
        opponentScore: 1
      });
    });

    it('should handle event without player_id', () => {
      const event = {
        id: 'evt_123',
        type: 'match_start',
        timestamp: Date.now(),
        matchTime: '00:00',
        periodNumber: 1,
        data: {}
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_789');

      expect(result.player_id).toBeUndefined();
      expect(result.event_type).toBe('match_started');
      expect(result.data).toBeNull();
    });

    it('should create TWO events for goalie switch', () => {
      const event = {
        id: 'evt_123',
        type: 'goalie_switch',
        timestamp: Date.now(),
        matchTime: '10:00',
        periodNumber: 2,
        data: {
          oldGoalieId: 'goalie_1',
          newGoalieId: 'goalie_2',
          previousGoalieId: 'goalie_1',
          goalieId: 'goalie_2'
        }
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_123');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].event_type).toBe('goalie_exits');
      expect(result[0].player_id).toBe('goalie_1');
      expect(result[1].event_type).toBe('goalie_enters');
      expect(result[1].player_id).toBe('goalie_2');
      expect(result[0].correlation_id).toBe(result[1].correlation_id);
      expect(result[0].correlation_id).toBeTruthy();
      expect(result[0].data).toBeNull();
      expect(result[1].data).toBeNull();
    });

    it('should handle goalie switch with only new goalie', () => {
      const event = {
        id: 'evt_123',
        type: 'goalie_switch',
        timestamp: Date.now(),
        matchTime: '10:00',
        periodNumber: 2,
        data: {
          newGoalieId: 'goalie_2'
        }
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_123');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].event_type).toBe('goalie_enters');
      expect(result[0].player_id).toBe('goalie_2');
      expect(result[0].data).toBeNull();
    });

    it('should create minimal events for substitution with shared correlation', () => {
      const event = {
        id: 'evt_999',
        type: 'substitution',
        matchTime: '08:10',
        periodNumber: 1,
        data: {
          playersOff: ['p1', 'p2'],
          playersOn: ['p3', 'p4']
        }
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_sub');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
      const correlationIds = new Set(result.map(r => r.correlation_id));
      expect(correlationIds.size).toBe(1);
      expect(result.filter(r => r.event_type === 'substitution_out').map(r => r.player_id)).toEqual(['p1', 'p2']);
      expect(result.filter(r => r.event_type === 'substitution_in').map(r => r.player_id)).toEqual(['p3', 'p4']);
      result.forEach(r => expect(r.data).toBeNull());
    });

    it('should set player_id for goalie_enters from goalie assignment', () => {
      const event = {
        id: 'evt_goalie',
        type: 'goalie_assignment',
        matchTime: '00:30',
        periodNumber: 1,
        data: { goalieId: 'g1' }
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_goalie');
      expect(result.event_type).toBe('goalie_enters');
      expect(result.player_id).toBe('g1');
      expect(result.data).toBeNull();
    });

    it('should keep match end reason for abandoned/suspended matches', () => {
      const abandonedEvent = {
        id: 'evt_123',
        type: 'match_abandoned',
        timestamp: Date.now(),
        matchTime: '15:00',
        periodNumber: 1,
        data: {}
      };

      const result = eventPersistenceService.transformEventForDatabase(abandonedEvent, 'match_789');

      expect(result.event_type).toBe('match_ended');
      expect(result.data.matchEndReason).toBe('match_abandoned');
    });

    it('should return null for unmapped event types', () => {
      const event = {
        id: 'evt_123',
        type: 'timer_paused',
        timestamp: Date.now(),
        matchTime: '05:00',
        periodNumber: 1,
        data: {}
      };

      const result = eventPersistenceService.transformEventForDatabase(event, 'match_789');

      expect(result).toBeNull();
    });
  });

  describe('Authentication Checks', () => {
    it('should skip database write for anonymous users', async () => {
      getCurrentUser.mockResolvedValue(null);

      const mockInsert = jest.fn();
      supabase.from.mockReturnValue({ insert: mockInsert });

      const event = {
        id: 'evt_123',
        type: 'goal_scored',
        timestamp: Date.now(),
        matchTime: '01:00',
        periodNumber: 1,
        data: {}
      };

      const result = await eventPersistenceService.persistEvent(event, 'match_123');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Not authenticated');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should attempt database write for authenticated users', async () => {
      getCurrentUser.mockResolvedValue({ id: 'user_123' });

      const mockInsert = jest.fn().mockResolvedValue({ data: [], error: null });
      supabase.from.mockReturnValue({ insert: mockInsert });

      const event = {
        id: 'evt_123',
        type: 'goal_scored',
        timestamp: Date.now(),
        matchTime: '01:00',
        periodNumber: 1,
        data: { scorerId: 'player_456' }
      };

      await eventPersistenceService.persistEvent(event, 'match_123');

      expect(mockInsert).toHaveBeenCalled();
      const insertedEvent = mockInsert.mock.calls[0][0];
      expect(insertedEvent.match_id).toBe('match_123');
      expect(insertedEvent.event_type).toBe('goal_scored');
    });
  });

  describe('Database Write Failures', () => {
    it('should handle database write errors gracefully', async () => {
      getCurrentUser.mockResolvedValue({ id: 'user_123' });

      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      supabase.from.mockReturnValue({ insert: mockInsert });

      const event = {
        id: 'evt_123',
        type: 'goal_scored',
        timestamp: Date.now(),
        matchTime: '01:00',
        periodNumber: 1,
        data: {}
      };

      const result = await eventPersistenceService.persistEvent(event, 'match_123');

      expect(result.success).toBe(true); // Returns success=true even with failures
      expect(result.results).toBeDefined();
    });

    it('should store failed events in localStorage after max retries', async () => {
      getCurrentUser.mockResolvedValue({ id: 'user_123' });

      const mockInsert = jest.fn().mockRejectedValue(new Error('Network error'));
      supabase.from.mockReturnValue({ insert: mockInsert });

      const event = {
        id: 'evt_123',
        type: 'goal_scored',
        timestamp: Date.now(),
        matchTime: '01:00',
        periodNumber: 1,
        data: {}
      };

      // Trigger write with max retries exhausted (by calling writeEventToDatabase directly)
      const dbEvent = eventPersistenceService.transformEventForDatabase(event, 'match_123');
      await eventPersistenceService.writeEventToDatabase(dbEvent, 5); // Max retries

      const failedEvents = localStorage.getItem('failed_event_writes');
      expect(failedEvents).toBeTruthy();
      const parsed = JSON.parse(failedEvents);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].event).toMatchObject({ match_id: 'match_123' });
    });
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = eventPersistenceService.generateCorrelationId();
      const id2 = eventPersistenceService.generateCorrelationId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });

  describe('Event Key Generation', () => {
    it('should generate unique keys for different events', () => {
      const event1 = {
        match_id: 'match_1',
        event_type: 'goal_scored',
        occurred_at_seconds: 100,
        period: 1
      };

      const event2 = {
        match_id: 'match_1',
        event_type: 'goal_scored',
        occurred_at_seconds: 200,
        period: 1
      };

      const key1 = eventPersistenceService.getEventKey(event1);
      const key2 = eventPersistenceService.getEventKey(event2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for identical events', () => {
      const event = {
        match_id: 'match_1',
        event_type: 'goal_scored',
        occurred_at_seconds: 100,
        period: 1
      };

      const key1 = eventPersistenceService.getEventKey(event);
      const key2 = eventPersistenceService.getEventKey(event);

      expect(key1).toBe(key2);
    });
  });

  describe('Backoff Calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(eventPersistenceService.calculateBackoffDelay(0)).toBe(1000); // 1s
      expect(eventPersistenceService.calculateBackoffDelay(1)).toBe(2000); // 2s
      expect(eventPersistenceService.calculateBackoffDelay(2)).toBe(4000); // 4s
      expect(eventPersistenceService.calculateBackoffDelay(3)).toBe(8000); // 8s
      expect(eventPersistenceService.calculateBackoffDelay(4)).toBe(16000); // 16s
    });
  });
});
