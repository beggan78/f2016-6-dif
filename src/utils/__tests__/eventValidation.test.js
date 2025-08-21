/**
 * Event Validation Tests
 * Tests data integrity and crash recovery functionality
 */

// Mock localStorage for crash recovery tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock the gameEventLogger to prevent initialization during import
jest.mock('../gameEventLogger', () => ({
  EVENT_TYPES: {
    MATCH_START: 'match_start',
    MATCH_END: 'match_end',
    SUBSTITUTION: 'substitution',
    GOALIE_SWITCH: 'goalie_switch',
    GOAL_SCORED: 'goal_home',
    GOAL_CONCEDED: 'goal_conceded',
    TIMER_PAUSED: 'timer_paused',
    TIMER_RESUMED: 'timer_resumed',
    PERIOD_PAUSED: 'period_paused',
    PERIOD_RESUMED: 'period_resumed',
    PERIOD_START: 'period_start',
    PERIOD_END: 'period_end'
  },
  getMatchEvents: jest.fn(() => []),
  calculateMatchTime: jest.fn(() => '00:00')
}));

import {
  VALIDATION_ERROR_TYPES,
  eventsAreChronological,
  calculateEffectivePlayingTime,
  calculatePlayerTimeTotals,
  validatePlayerTimeConsistency,
  hasSequenceGaps,
  findDuplicateEvents,
  validateMatchData,
  recoverCorruptedEvents,
  recoverFromCrash,
  validateAndRestore
} from '../eventValidation';

import { EVENT_TYPES } from '../gameEventLogger';

describe('eventValidation', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('Chronological Validation', () => {
    test('should validate events in chronological order', () => {
      const events = [
        { timestamp: 1000 },
        { timestamp: 2000 },
        { timestamp: 3000 }
      ];
      
      expect(eventsAreChronological(events)).toBe(true);
    });

    test('should detect events out of chronological order', () => {
      const events = [
        { timestamp: 2000 },
        { timestamp: 1000 }, // Out of order
        { timestamp: 3000 }
      ];
      
      expect(eventsAreChronological(events)).toBe(false);
    });

    test('should handle empty arrays and single events', () => {
      expect(eventsAreChronological([])).toBe(true);
      expect(eventsAreChronological([{ timestamp: 1000 }])).toBe(true);
      expect(eventsAreChronological(null)).toBe(true);
    });
  });

  describe('Effective Playing Time Calculation', () => {
    test('should calculate time without pauses', () => {
      const events = [
        { type: EVENT_TYPES.MATCH_START, timestamp: 1000 },
        { type: EVENT_TYPES.MATCH_END, timestamp: 61000 } // 1 minute later
      ];
      
      const effectiveTime = calculateEffectivePlayingTime(events);
      expect(effectiveTime).toBe(60000); // 1 minute
    });

    test('should calculate time with single pause period', () => {
      const events = [
        { type: EVENT_TYPES.MATCH_START, timestamp: 1000 },
        { type: EVENT_TYPES.TIMER_PAUSED, timestamp: 31000 }, // 30s in
        { type: EVENT_TYPES.TIMER_RESUMED, timestamp: 46000 }, // 15s pause
        { type: EVENT_TYPES.MATCH_END, timestamp: 76000 } // 30s more
      ];
      
      const effectiveTime = calculateEffectivePlayingTime(events);
      expect(effectiveTime).toBe(60000); // 75s total - 15s pause = 60s
    });

    test('should handle multiple pause periods', () => {
      const events = [
        { type: EVENT_TYPES.MATCH_START, timestamp: 1000 },
        { type: EVENT_TYPES.TIMER_PAUSED, timestamp: 16000 }, // 15s in
        { type: EVENT_TYPES.TIMER_RESUMED, timestamp: 26000 }, // 10s pause
        { type: EVENT_TYPES.TIMER_PAUSED, timestamp: 51000 }, // 25s more
        { type: EVENT_TYPES.TIMER_RESUMED, timestamp: 61000 }, // 10s pause
        { type: EVENT_TYPES.MATCH_END, timestamp: 86000 } // 25s more
      ];
      
      const effectiveTime = calculateEffectivePlayingTime(events);
      expect(effectiveTime).toBe(65000); // 85s total - 20s pause = 65s
    });

    test('should handle ongoing pause at calculation time', () => {
      const mockNow = 61000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      const events = [
        { type: EVENT_TYPES.MATCH_START, timestamp: 1000 },
        { type: EVENT_TYPES.TIMER_PAUSED, timestamp: 31000 } // Still paused
      ];
      
      const effectiveTime = calculateEffectivePlayingTime(events);
      expect(effectiveTime).toBe(30000); // 60s total - 30s pause = 30s
      
      jest.restoreAllMocks();
    });

    test('should return 0 if no match start event', () => {
      const events = [
        { type: EVENT_TYPES.SUBSTITUTION, timestamp: 1000 },
        { type: EVENT_TYPES.GOAL_SCORED, timestamp: 2000 }
      ];
      
      expect(calculateEffectivePlayingTime(events)).toBe(0);
    });
  });

  describe('Player Time Totals Calculation', () => {
    test('should calculate basic player time totals', () => {
      const events = [
        {
          type: EVENT_TYPES.MATCH_START,
          timestamp: 1000,
          data: {
            startingFormation: {
              leftDefender: 'p1',
              goalie: 'p2'
            },
            playerRoles: {
              'p1': 'Defender',
              'p2': 'Goalie'
            }
          }
        },
        {
          type: EVENT_TYPES.MATCH_END,
          timestamp: 61000 // 1 minute match
        }
      ];
      
      const playerTimes = calculatePlayerTimeTotals(events);
      
      expect(playerTimes.p1.timeOnField).toBe(60000);
      expect(playerTimes.p1.timeAsDefender).toBe(60000);
      expect(playerTimes.p2.timeAsGoalie).toBe(60000);
    });

    test('should handle substitutions', () => {
      const events = [
        {
          type: EVENT_TYPES.MATCH_START,
          timestamp: 1000,
          data: {
            startingFormation: { leftDefender: 'p1' },
            playerRoles: { 'p1': 'Defender' }
          }
        },
        {
          type: EVENT_TYPES.SUBSTITUTION,
          timestamp: 31000, // 30s in
          data: {
            playersOff: ['p1'],
            playersOn: ['p2'],
            newRoles: { 'p2': 'Defender' }
          }
        },
        {
          type: EVENT_TYPES.MATCH_END,
          timestamp: 61000
        }
      ];
      
      const playerTimes = calculatePlayerTimeTotals(events);
      
      expect(playerTimes.p1.timeOnField).toBe(30000); // 30s
      expect(playerTimes.p1.timeAsDefender).toBe(30000);
      expect(playerTimes.p2.timeOnField).toBe(30000); // 30s
      expect(playerTimes.p2.timeAsDefender).toBe(30000);
    });

    test('should handle goalie switches', () => {
      const events = [
        {
          type: EVENT_TYPES.MATCH_START,
          timestamp: 1000,
          data: {
            startingFormation: { goalie: 'p1' },
            playerRoles: { 'p1': 'Goalie' }
          }
        },
        {
          type: EVENT_TYPES.GOALIE_SWITCH,
          timestamp: 31000,
          data: {
            oldGoalie: 'p1',
            newGoalie: 'p2'
          }
        },
        {
          type: EVENT_TYPES.MATCH_END,
          timestamp: 61000
        }
      ];
      
      const playerTimes = calculatePlayerTimeTotals(events);
      
      expect(playerTimes.p1.timeAsGoalie).toBe(30000);
      expect(playerTimes.p2.timeAsGoalie).toBe(30000);
    });
  });

  describe('Player Time Consistency Validation', () => {
    test('should validate consistent player times', () => {
      const calculatedTimes = {
        'p1': {
          timeOnField: 60000, // 60 seconds in ms
          timeAsDefender: 60000
        }
      };
      
      const actualPlayers = [
        {
          id: 'p1',
          stats: {
            timeOnFieldSeconds: 60, // 60 seconds
            timeAsDefenderSeconds: 60
          }
        }
      ];
      
      expect(validatePlayerTimeConsistency(calculatedTimes, actualPlayers)).toBe(true);
    });

    test('should detect time inconsistencies', () => {
      const calculatedTimes = {
        'p1': {
          timeOnField: 60000, // 60 seconds
          timeAsDefender: 60000
        }
      };
      
      const actualPlayers = [
        {
          id: 'p1',
          stats: {
            timeOnFieldSeconds: 100, // Wrong! 40 second difference
            timeAsDefenderSeconds: 60
          }
        }
      ];
      
      expect(validatePlayerTimeConsistency(calculatedTimes, actualPlayers)).toBe(false);
    });

    test('should handle missing data gracefully', () => {
      expect(validatePlayerTimeConsistency(null, null)).toBe(false);
      expect(validatePlayerTimeConsistency({}, [])).toBe(true);
    });
  });

  describe('Sequence Validation', () => {
    test('should detect sequence gaps', () => {
      const events = [
        { sequence: 1 },
        { sequence: 2 },
        { sequence: 5 } // Gap: missing 3, 4
      ];
      
      expect(hasSequenceGaps(events)).toBe(true);
    });

    test('should validate continuous sequences', () => {
      const events = [
        { sequence: 1 },
        { sequence: 2 },
        { sequence: 3 }
      ];
      
      expect(hasSequenceGaps(events)).toBe(false);
    });

    test('should handle empty arrays', () => {
      expect(hasSequenceGaps([])).toBe(false);
      expect(hasSequenceGaps([{ sequence: 1 }])).toBe(false);
    });
  });

  describe('Duplicate Detection', () => {
    test('should find duplicate events', () => {
      const events = [
        { id: 'event1', type: 'substitution' },
        { id: 'event2', type: 'goal' },
        { id: 'event1', type: 'substitution' } // Duplicate
      ];
      
      const duplicates = findDuplicateEvents(events);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].id).toBe('event1');
    });

    test('should return empty array for unique events', () => {
      const events = [
        { id: 'event1', type: 'substitution' },
        { id: 'event2', type: 'goal' },
        { id: 'event3', type: 'pause' }
      ];
      
      expect(findDuplicateEvents(events)).toHaveLength(0);
    });
  });

  describe('Comprehensive Match Data Validation', () => {
    test('should validate clean match data', () => {
      const events = [
        {
          id: 'evt1',
          type: EVENT_TYPES.MATCH_START,
          timestamp: 1000,
          sequence: 1
        },
        {
          id: 'evt2',
          type: EVENT_TYPES.SUBSTITUTION,
          timestamp: 2000,
          sequence: 2
        }
      ];
      
      const errors = validateMatchData(events, null);
      expect(errors).toHaveLength(0);
    });

    test('should detect multiple validation errors', () => {
      const events = [
        {
          id: 'evt1',
          type: EVENT_TYPES.MATCH_START,
          timestamp: 2000,
          sequence: 1
        },
        {
          id: 'evt1', // Duplicate ID
          type: 'INVALID_TYPE', // Invalid type
          timestamp: 1000, // Out of chronological order
          sequence: 1 // Duplicate sequence
        },
        {
          // Missing ID
          type: EVENT_TYPES.GOAL_SCORED,
          timestamp: 3000,
          sequence: 3
        }
      ];
      
      const errors = validateMatchData(events, null);
      expect(errors.length).toBeGreaterThan(0);
      
      const errorTypes = errors.map(e => e.type);
      expect(errorTypes).toContain(VALIDATION_ERROR_TYPES.CHRONOLOGY);
      expect(errorTypes).toContain(VALIDATION_ERROR_TYPES.DUPLICATE_EVENT);
      expect(errorTypes).toContain(VALIDATION_ERROR_TYPES.MISSING_DATA);
      expect(errorTypes).toContain(VALIDATION_ERROR_TYPES.CORRUPTED_EVENT);
    });

    test('should handle non-array input', () => {
      const errors = validateMatchData('not an array', null);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(VALIDATION_ERROR_TYPES.CORRUPTED_EVENT);
      expect(errors[0].severity).toBe('critical');
    });
  });

  describe('Corrupted Event Recovery', () => {
    test('should recover valid events from corrupted data', () => {
      const corruptedEvents = [
        { id: 'evt1', type: EVENT_TYPES.MATCH_START, timestamp: 2000 },
        null, // Corrupted
        { id: 'evt2', type: EVENT_TYPES.SUBSTITUTION, timestamp: 1000 },
        { id: 'evt3', type: 'INVALID_TYPE', timestamp: 3000 }, // Invalid type
        { id: 'evt4', type: EVENT_TYPES.GOAL_SCORED, timestamp: 4000 },
        'not an object' // Corrupted
      ];
      
      const recovered = recoverCorruptedEvents(corruptedEvents);
      
      expect(recovered).toHaveLength(3); // evt1, evt2, and evt4 are valid (evt2 has valid structure)
      expect(recovered[0].id).toBe('evt2'); // Should be first due to timestamp sorting
      expect(recovered[1].id).toBe('evt1'); // Second by timestamp
      expect(recovered[2].id).toBe('evt4'); // Third by timestamp
      
      // Should be sorted by timestamp
      expect(recovered[0].timestamp).toBeLessThan(recovered[1].timestamp);
      
      // Should have corrected sequence numbers
      expect(recovered[0].sequence).toBe(1);
      expect(recovered[1].sequence).toBe(2);
    });

    test('should handle completely corrupted data', () => {
      const recovered = recoverCorruptedEvents('not an array');
      expect(recovered).toEqual([]);
    });

    test('should remove duplicates during recovery', () => {
      const eventsWithDuplicates = [
        { id: 'evt1', type: EVENT_TYPES.MATCH_START, timestamp: 1000 },
        { id: 'evt1', type: EVENT_TYPES.MATCH_START, timestamp: 1000 }, // Duplicate
        { id: 'evt2', type: EVENT_TYPES.GOAL_SCORED, timestamp: 2000 }
      ];
      
      const recovered = recoverCorruptedEvents(eventsWithDuplicates);
      expect(recovered).toHaveLength(2);
      expect(recovered[0].id).toBe('evt1');
      expect(recovered[1].id).toBe('evt2');
    });
  });

  describe('Crash Recovery', () => {
    test('should return null when no valid storage found', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const recovered = recoverFromCrash();
      expect(recovered).toBeNull();
    });
  });

  describe('Validate and Restore', () => {
    test('should restore valid storage data', () => {
      const validData = {
        events: [
          { id: 'evt1', type: EVENT_TYPES.MATCH_START, timestamp: 1000, sequence: 1 }
        ]
      };
      
      const result = validateAndRestore(JSON.stringify(validData));
      expect(result).toEqual(validData);
    });

    test('should attempt recovery for invalid data', () => {
      const invalidData = {
        events: [
          { id: 'evt1', type: EVENT_TYPES.MATCH_START, timestamp: 1000, sequence: 1 },
          null // Corrupted
        ]
      };
      
      const result = validateAndRestore(JSON.stringify(invalidData));
      expect(result.recovered).toBe(true);
      expect(result.events).toHaveLength(1);
    });

    test('should handle invalid JSON', () => {
      const result = validateAndRestore('invalid json');
      expect(result).toBeNull();
    });

    test('should handle null input', () => {
      const result = validateAndRestore(null);
      expect(result).toBeNull();
    });
  });
});