/**
 * Game Event Logger Tests
 * Tests event logging functionality with undo/correction scenarios
 */

import {
  EVENT_TYPES,
  logEvent,
  removeEvent,
  markEventAsUndone,
  updateEventData,
  getMatchEvents,
  getEventById,
  getEffectivePlayingTime,
  calculateMatchTime,
  clearAllEvents,
  validateEventSequence,
  addEventListener,
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

describe('gameEventLogger', () => {
  beforeEach(() => {
    // Clear all events before each test
    clearAllEvents();
    
    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Event Logging', () => {
    test('should log a basic event', () => {
      const event = logEvent(EVENT_TYPES.MATCH_START, {
        periodDurationMinutes: 15,
        teamConfig: { format: '5v5', squadSize: 6, formation: '2-2' }
      });

      expect(event).toMatchObject({
        type: EVENT_TYPES.MATCH_START,
        timestamp: 1640995200000,
        matchTime: '00:00',
        sequence: 1,
        undone: false
      });
      
      expect(event.id).toBeDefined();
      expect(event.data.periodDurationMinutes).toBe(15);
    });

    test('should generate unique event IDs', () => {
      const event1 = logEvent(EVENT_TYPES.PERIOD_START, {});
      const event2 = logEvent(EVENT_TYPES.SUBSTITUTION, {});

      expect(event1.id).not.toBe(event2.id);
    });

    test('should increment sequence numbers', () => {
      const event1 = logEvent(EVENT_TYPES.MATCH_START, {});
      const event2 = logEvent(EVENT_TYPES.PERIOD_START, {});
      const event3 = logEvent(EVENT_TYPES.SUBSTITUTION, {});

      expect(event1.sequence).toBe(1);
      expect(event2.sequence).toBe(2);
      expect(event3.sequence).toBe(3);
    });

    test('should calculate match time correctly', () => {
      // Start match
      const startEvent = logEvent(EVENT_TYPES.MATCH_START, {});
      
      // Mock later time (2 minutes later)
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000 + 120000);
      
      const laterEvent = logEvent(EVENT_TYPES.SUBSTITUTION, {});
      
      expect(startEvent.matchTime).toBe('00:00');
      expect(laterEvent.matchTime).toBe('02:00');
    });

    test('should reject invalid event types', () => {
      expect(() => {
        logEvent('INVALID_TYPE', {});
      }).toThrow('Invalid event type: INVALID_TYPE');
    });

    test('should handle custom event IDs', () => {
      const customId = 'custom_event_123';
      const event = logEvent(EVENT_TYPES.GOAL_SCORED, {
        eventId: customId,
        scorerId: 'player_1'
      });

      expect(event.id).toBe(customId);
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(() => {
      // Create some test events
      logEvent(EVENT_TYPES.MATCH_START, {});
      logEvent(EVENT_TYPES.PERIOD_START, { periodNumber: 1 });
      logEvent(EVENT_TYPES.SUBSTITUTION, { playersOff: ['p1'], playersOn: ['p2'] });
      logEvent(EVENT_TYPES.GOAL_SCORED, { scorerId: 'p3' });
    });

    test('should retrieve all events', () => {
      const events = getMatchEvents();
      
      expect(events).toHaveLength(4);
      expect(events[0].type).toBe(EVENT_TYPES.MATCH_START);
      expect(events[3].type).toBe(EVENT_TYPES.GOAL_SCORED);
    });

    test('should filter events by type', () => {
      const goalEvents = getMatchEvents({
        eventTypes: [EVENT_TYPES.GOAL_SCORED, EVENT_TYPES.GOAL_CONCEDED]
      });
      
      expect(goalEvents).toHaveLength(1);
      expect(goalEvents[0].type).toBe(EVENT_TYPES.GOAL_SCORED);
    });

    test('should exclude undone events by default', () => {
      const goalEvent = logEvent(EVENT_TYPES.GOAL_SCORED, { scorerId: 'p4' });
      markEventAsUndone(goalEvent.id);
      
      const events = getMatchEvents();
      const undoneEvents = getMatchEvents({ includeUndone: true });
      
      expect(events).toHaveLength(4); // Original 4, undone goal not included
      expect(undoneEvents).toHaveLength(5); // Original 4 + undone goal
    });

    test('should get event by ID', () => {
      const goalEvent = logEvent(EVENT_TYPES.GOAL_CONCEDED, { scorerId: 'p5' });
      const retrievedEvent = getEventById(goalEvent.id);
      
      expect(retrievedEvent).toEqual(goalEvent);
      expect(retrievedEvent.type).toBe(EVENT_TYPES.GOAL_CONCEDED);
    });

    test('should return null for non-existent event ID', () => {
      const event = getEventById('non_existent_id');
      expect(event).toBeNull();
    });
  });

  describe('Event Removal and Undo', () => {
    test('should remove event completely', () => {
      const event1 = logEvent(EVENT_TYPES.SUBSTITUTION, { playersOff: ['p1'] });
      const event2 = logEvent(EVENT_TYPES.GOAL_SCORED, { scorerId: 'p2' });
      
      const beforeRemoval = getMatchEvents();
      expect(beforeRemoval).toHaveLength(2);
      
      const removed = removeEvent(event1.id);
      expect(removed).toBe(true);
      
      const afterRemoval = getMatchEvents();
      expect(afterRemoval).toHaveLength(1);
      expect(afterRemoval[0].id).toBe(event2.id);
    });

    test('should mark event as undone without removing', () => {
      const event = logEvent(EVENT_TYPES.SUBSTITUTION, { playersOff: ['p1'] });
      
      const marked = markEventAsUndone(event.id, 'test_undo');
      expect(marked).toBe(true);
      
      const allEvents = getMatchEvents({ includeUndone: true });
      const activeEvents = getMatchEvents();
      
      expect(allEvents).toHaveLength(1);
      expect(activeEvents).toHaveLength(0);
      expect(allEvents[0].undone).toBe(true);
      expect(allEvents[0].undoReason).toBe('test_undo');
    });

    test('should handle removal of non-existent event', () => {
      const removed = removeEvent('non_existent_id');
      expect(removed).toBe(false);
    });

    test('should handle undo marking of non-existent event', () => {
      const marked = markEventAsUndone('non_existent_id');
      expect(marked).toBe(false);
    });
  });

  describe('Event Data Updates (Score History Rewriting)', () => {
    test('should update existing event data', () => {
      const goalEvent = logEvent(EVENT_TYPES.GOAL_SCORED, {
        ownScore: 1,
        opponentScore: 0,
        scorerId: 'player1' 
      });
      
      const updated = updateEventData(goalEvent.id, { 
        ownScore: 2,
        opponentScore: 0
      });
      
      expect(updated).toBe(true);
      
      const updatedEvent = getEventById(goalEvent.id);
      expect(updatedEvent.data.ownScore).toBe(2);
      expect(updatedEvent.data.opponentScore).toBe(0);
      expect(updatedEvent.data.scorerId).toBe('player1'); // Should preserve existing data
    });

    test('should merge new data with existing data', () => {
      const goalEvent = logEvent(EVENT_TYPES.GOAL_CONCEDED, {
        ownScore: 1,
        opponentScore: 1,
        scorerId: 'player2',
        extraData: 'preserve' 
      });
      
      updateEventData(goalEvent.id, { 
        opponentScore: 2 // Only update opponentScore
      });
      
      const updatedEvent = getEventById(goalEvent.id);
      expect(updatedEvent.data.ownScore).toBe(1); // Preserved
      expect(updatedEvent.data.opponentScore).toBe(2); // Updated
      expect(updatedEvent.data.scorerId).toBe('player2'); // Preserved
      expect(updatedEvent.data.extraData).toBe('preserve'); // Preserved
    });

    test('should handle update of non-existent event', () => {
      const updated = updateEventData('non_existent_id', { ownScore: 5 });
      expect(updated).toBe(false);
    });

    test('should preserve event metadata during data update', () => {
      const goalEvent = logEvent(EVENT_TYPES.GOAL_SCORED, { ownScore: 1, opponentScore: 0 });
      const originalType = goalEvent.type;
      const originalTimestamp = goalEvent.timestamp;
      const originalSequence = goalEvent.sequence;
      
      updateEventData(goalEvent.id, { ownScore: 3 });
      
      const updatedEvent = getEventById(goalEvent.id);
      expect(updatedEvent.type).toBe(originalType);
      expect(updatedEvent.timestamp).toBe(originalTimestamp);
      expect(updatedEvent.sequence).toBe(originalSequence);
      expect(updatedEvent.undone).toBe(false);
    });

    test('should trigger event listeners on data update', () => {
      const mockCallback = jest.fn();
      const removeListener = addEventListener(mockCallback);
      
      const goalEvent = logEvent(EVENT_TYPES.GOAL_SCORED, { ownScore: 1, opponentScore: 0 });
      mockCallback.mockClear(); // Clear the logEvent call
      
      updateEventData(goalEvent.id, { ownScore: 2 });
      
      expect(mockCallback).toHaveBeenCalledWith('events_saved', expect.objectContaining({
        events: expect.any(Array)
      }));
      
      removeListener();
    });

    test('should support goal deletion history rewrite workflow', () => {
      // Create sequence of goals with incrementing scores
      const goal1 = logEvent(EVENT_TYPES.GOAL_SCORED, { ownScore: 1, opponentScore: 0 });
      const goal2 = logEvent(EVENT_TYPES.GOAL_CONCEDED, { ownScore: 1, opponentScore: 1 });
      const goal3 = logEvent(EVENT_TYPES.GOAL_SCORED, { ownScore: 2, opponentScore: 1 });
      const goal4 = logEvent(EVENT_TYPES.GOAL_SCORED, { ownScore: 3, opponentScore: 1 });
      
      // Mark middle goal as deleted (goal2)
      markEventAsUndone(goal2.id, 'manual_deletion');
      
      // Rewrite history for subsequent goals (decrement away score)
      updateEventData(goal3.id, { ownScore: 2, opponentScore: 0 }); // Was 2-1, now 2-0
      updateEventData(goal4.id, { ownScore: 3, opponentScore: 0 }); // Was 3-1, now 3-0
      
      // Verify final state
      const events = getMatchEvents({ includeUndone: true });
      const deletedGoal = events.find(e => e.id === goal2.id);
      const correctedGoal3 = events.find(e => e.id === goal3.id);
      const correctedGoal4 = events.find(e => e.id === goal4.id);
      
      expect(deletedGoal.undone).toBe(true);
      expect(correctedGoal3.data.ownScore).toBe(2);
      expect(correctedGoal3.data.opponentScore).toBe(0);
      expect(correctedGoal4.data.ownScore).toBe(3);
      expect(correctedGoal4.data.opponentScore).toBe(0);
    });
  });

  describe('Time Calculations', () => {
    test('should calculate effective playing time with pauses', () => {
      const startTime = 1640995200000;
      const pauseTime = startTime + 60000; // 1 minute later
      const resumeTime = pauseTime + 30000; // 30 seconds pause
      const endTime = resumeTime + 60000; // 1 minute after resume
      
      jest.spyOn(Date, 'now').mockReturnValueOnce(startTime);
      logEvent(EVENT_TYPES.MATCH_START, {});
      
      jest.spyOn(Date, 'now').mockReturnValueOnce(pauseTime);
      logEvent(EVENT_TYPES.TIMER_PAUSED, {});
      
      jest.spyOn(Date, 'now').mockReturnValueOnce(resumeTime);
      logEvent(EVENT_TYPES.TIMER_RESUMED, {});
      
      jest.spyOn(Date, 'now').mockReturnValueOnce(endTime);
      logEvent(EVENT_TYPES.MATCH_END, {});
      
      const effectiveTime = getEffectivePlayingTime();
      
      // Total time: 150 seconds, Pause time: 30 seconds, Effective: 120 seconds
      expect(effectiveTime).toBe(120000); // 2 minutes in milliseconds
    });

    test('should handle ongoing pause in effective time calculation', () => {
      const startTime = 1640995200000;
      const pauseTime = startTime + 60000; // 1 minute later
      const currentTime = pauseTime + 30000; // Still paused
      
      jest.spyOn(Date, 'now').mockReturnValueOnce(startTime);
      logEvent(EVENT_TYPES.MATCH_START, {});
      
      jest.spyOn(Date, 'now').mockReturnValueOnce(pauseTime);
      logEvent(EVENT_TYPES.TIMER_PAUSED, {});
      
      // Mock current time for calculation (the getEffectivePlayingTime will call Date.now())
      jest.spyOn(Date, 'now').mockReturnValue(currentTime);
      
      const effectiveTime = getEffectivePlayingTime();
      
      // Total time: 90 seconds, Pause time: 30 seconds, Effective: 60 seconds
      expect(effectiveTime).toBe(60000); // 1 minute in milliseconds
    });

    test('should calculate match time from custom start time', () => {
      const startTime = 1640995200000;
      const eventTime = startTime + 185000; // 3 minutes 5 seconds later
      
      const matchTime = calculateMatchTime(eventTime, startTime);
      expect(matchTime).toBe('03:05');
    });

    test('should handle invalid time parameters', () => {
      expect(calculateMatchTime(null)).toBe('00:00');
      expect(calculateMatchTime(1640995200000, null)).toBe('00:00');
    });
  });

  describe('Event Validation', () => {
    test('should validate event sequence', () => {
      const events = [
        { sequence: 1, timestamp: 1000 },
        { sequence: 2, timestamp: 2000 },
        { sequence: 3, timestamp: 3000 }
      ];
      
      expect(validateEventSequence(events)).toBe(true);
    });

    test('should detect chronology errors', () => {
      const events = [
        { sequence: 1, timestamp: 2000 },
        { sequence: 2, timestamp: 1000 }, // Out of order
        { sequence: 3, timestamp: 3000 }
      ];
      
      expect(validateEventSequence(events)).toBe(false);
    });

    test('should detect sequence number errors', () => {
      const events = [
        { sequence: 1, timestamp: 1000 },
        { sequence: 1, timestamp: 2000 }, // Duplicate sequence
        { sequence: 3, timestamp: 3000 }
      ];
      
      expect(validateEventSequence(events)).toBe(false);
    });

    test('should handle empty or invalid arrays', () => {
      expect(validateEventSequence([])).toBe(true);
      expect(validateEventSequence([{ sequence: 1, timestamp: 1000 }])).toBe(true);
      expect(validateEventSequence(null)).toBe(true);
    });
  });

  describe('Event Listeners (Real-time Sync System)', () => {
    test('should add and remove event listeners', () => {
      const mockCallback = jest.fn();
      
      const removeListener = addEventListener(mockCallback);
      
      // Trigger an event
      logEvent(EVENT_TYPES.GOAL_SCORED, { scorerId: 'p1' });
      
      expect(mockCallback).toHaveBeenCalledWith('events_saved', expect.any(Object));
      
      // Remove listener
      removeListener();
      mockCallback.mockClear();
      
      // Trigger another event
      logEvent(EVENT_TYPES.GOAL_CONCEDED, { scorerId: 'p2' });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should notify listeners on all event operations', () => {
      const mockCallback = jest.fn();
      const removeListener = addEventListener(mockCallback);
      
      // Test logEvent
      logEvent(EVENT_TYPES.GOAL_SCORED, { scorerId: 'p1' });
      expect(mockCallback).toHaveBeenCalledTimes(1);
      
      const events = getMatchEvents();
      const goalEvent = events[0];
      
      // Test markEventAsUndone
      markEventAsUndone(goalEvent.id);
      expect(mockCallback).toHaveBeenCalledTimes(2);
      
      // Test updateEventData
      updateEventData(goalEvent.id, { ownScore: 5 });
      expect(mockCallback).toHaveBeenCalledTimes(3);
      
      // Verify all calls were 'events_saved' events
      mockCallback.mock.calls.forEach(call => {
        expect(call[0]).toBe('events_saved');
        expect(call[1]).toHaveProperty('events');
        expect(call[1]).toHaveProperty('metadata');
      });
      
      removeListener();
    });

    test('should support multiple simultaneous listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      const remove1 = addEventListener(callback1);
      const remove2 = addEventListener(callback2);
      const remove3 = addEventListener(callback3);
      
      logEvent(EVENT_TYPES.GOAL_SCORED, { scorerId: 'p1' });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
      
      // Remove middle listener
      remove2();
      
      logEvent(EVENT_TYPES.GOAL_CONCEDED, { scorerId: 'p2' });
      
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1); // Should not increase
      expect(callback3).toHaveBeenCalledTimes(2);
      
      remove1();
      remove3();
    });

    test('should handle listener errors gracefully without affecting other listeners', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodCallback = jest.fn();
      
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      addEventListener(errorCallback);
      const removeGoodListener = addEventListener(goodCallback);
      
      // Should not throw despite listener error
      expect(() => {
        logEvent(EVENT_TYPES.SUBSTITUTION, {});
      }).not.toThrow();
      
      // Good callback should still have been called
      expect(goodCallback).toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
      
      removeGoodListener();
      consoleSpy.mockRestore();
    });

    test('should provide correct event data to listeners for goal deletion workflow', () => {
      const mockCallback = jest.fn();
      const removeListener = addEventListener(mockCallback);
      
      // Create a goal
      const goalEvent = logEvent(EVENT_TYPES.GOAL_SCORED, {
        ownScore: 1,
        opponentScore: 0,
        scorerId: 'player1' 
      });
      
      mockCallback.mockClear();
      
      // Simulate goal deletion workflow
      markEventAsUndone(goalEvent.id, 'manual_deletion');
      
      // Verify listener received correct data
      expect(mockCallback).toHaveBeenCalledWith('events_saved', expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            id: goalEvent.id,
            undone: true,
            undoReason: 'manual_deletion'
          })
        ])
      }));
      
      removeListener();
    });

    test('should enable real-time sync pattern used in useGameState', () => {
      // This test simulates the pattern used in useGameState hook
      let syncTriggered = false;
      
      const realTimeSyncCallback = (eventType, data) => {
        if (eventType === 'events_saved') {
          syncTriggered = true;
          
          // Verify we have access to the updated events
          expect(data.events).toBeDefined();
          expect(Array.isArray(data.events)).toBe(true);
        }
      };
      
      const removeListener = addEventListener(realTimeSyncCallback);
      
      // Simulate operations that should trigger real-time sync
      const goalEvent = logEvent(EVENT_TYPES.GOAL_SCORED, { ownScore: 1, opponentScore: 0 });
      expect(syncTriggered).toBe(true);
      
      syncTriggered = false;
      markEventAsUndone(goalEvent.id);
      expect(syncTriggered).toBe(true);
      
      syncTriggered = false;
      updateEventData(goalEvent.id, { ownScore: 2 });
      expect(syncTriggered).toBe(true);
      
      removeListener();
    });
  });

  describe('Persistence', () => {
    test('should handle storage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      expect(() => {
        logEvent(EVENT_TYPES.GOAL_SCORED, {});
      }).not.toThrow();
    });
  });

  describe('State Clearing', () => {
    test('should clear all events and reset state', () => {
      logEvent(EVENT_TYPES.MATCH_START, {});
      logEvent(EVENT_TYPES.SUBSTITUTION, {});
      
      expect(getMatchEvents()).toHaveLength(2);
      
      const cleared = clearAllEvents();
      expect(cleared).toBe(true);
      
      expect(getMatchEvents()).toHaveLength(0);
      // Note: localStorage clearing is tested via functional behavior, not mocks
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid event logging', () => {
      const events = [];
      
      for (let i = 0; i < 10; i++) {
        events.push(logEvent(EVENT_TYPES.SUBSTITUTION, { index: i }));
      }
      
      expect(events).toHaveLength(10);
      expect(events[0].sequence).toBe(1);
      expect(events[9].sequence).toBe(10);
    });

    test('should handle events with large data objects', () => {
      const largeData = {
        players: new Array(100).fill(null).map((_, i) => ({ id: `p${i}`, name: `Player ${i}` })),
        formation: { /* complex formation data */ },
        metadata: { /* extensive metadata */ }
      };
      
      expect(() => {
        logEvent(EVENT_TYPES.PERIOD_START, largeData);
      }).not.toThrow();
    });
  });
});