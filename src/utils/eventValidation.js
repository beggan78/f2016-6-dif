/**
 * Event Validation & Recovery Utilities
 * Provides data integrity checking and crash recovery functionality
 */

import { EVENT_TYPES, getMatchEvents, calculateMatchTime } from './gameEventLogger';
import { PLAYER_ROLES, PLAYER_STATUS } from '../constants/playerConstants';
import { normalizeRole } from '../constants/roleConstants';

/**
 * Validation error types
 */
export const VALIDATION_ERROR_TYPES = {
  CHRONOLOGY: 'chronology_error',
  TIME_INCONSISTENCY: 'time_inconsistency',
  PLAYER_TIME_MISMATCH: 'player_time_mismatch',
  SEQUENCE_GAP: 'sequence_gap',
  DUPLICATE_EVENT: 'duplicate_event',
  MISSING_DATA: 'missing_data',
  CORRUPTED_EVENT: 'corrupted_event'
};

/**
 * Validate events are in chronological order
 */
export const eventsAreChronological = (events) => {
  if (!Array.isArray(events) || events.length <= 1) return true;
  
  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp < events[i - 1].timestamp) {
      return false;
    }
  }
  
  return true;
};

/**
 * Calculate effective playing time from events
 */
export const calculateEffectivePlayingTime = (events) => {
  if (!Array.isArray(events) || events.length === 0) return 0;
  
  const matchStart = events.find(e => e.type === EVENT_TYPES.MATCH_START);
  if (!matchStart) return 0;
  
  const matchEnd = events.find(e => e.type === EVENT_TYPES.MATCH_END);
  const endTime = matchEnd ? matchEnd.timestamp : Date.now();
  
  // Calculate total pause time
  let totalPauseTime = 0;
  let currentPauseStart = null;
  
  events.forEach(event => {
    if (event.type === EVENT_TYPES.TIMER_PAUSED || event.type === EVENT_TYPES.PERIOD_PAUSED) {
      if (!currentPauseStart) {
        currentPauseStart = event.timestamp;
      }
    } else if (event.type === EVENT_TYPES.TIMER_RESUMED || event.type === EVENT_TYPES.PERIOD_RESUMED) {
      if (currentPauseStart) {
        totalPauseTime += event.timestamp - currentPauseStart;
        currentPauseStart = null;
      }
    }
  });
  
  // If still paused, count pause time up to now
  if (currentPauseStart) {
    totalPauseTime += endTime - currentPauseStart;
  }
  
  const totalTime = endTime - matchStart.timestamp;
  return Math.max(0, totalTime - totalPauseTime);
};

/**
 * Calculate player time totals from events
 */
export const calculatePlayerTimeTotals = (events) => {
  if (!Array.isArray(events)) return {};
  
  const playerTimes = {};
  const playerStints = {}; // Track current stint start times
  
  // Helper to initialize player
  const initializePlayer = (playerId) => {
    if (!playerTimes[playerId]) {
      playerTimes[playerId] = {
        timeOnField: 0,
        timeAsGoalie: 0,
        timeAsDefender: 0,
        timeAsAttacker: 0,
        timeAsSub: 0
      };
    }
  };
  
  // Helper to end a stint
  const endStint = (playerId, endTime, role, status) => {
    if (playerStints[playerId]) {
      const stintDuration = endTime - playerStints[playerId].startTime;
      
      if (status === PLAYER_STATUS.ON_FIELD) {
        playerTimes[playerId].timeOnField += stintDuration;
      }
      
      const normalizedRole = normalizeRole(role);
      if (normalizedRole === PLAYER_ROLES.GOALIE) {
        playerTimes[playerId].timeAsGoalie += stintDuration;
      } else if (normalizedRole === PLAYER_ROLES.DEFENDER) {
        playerTimes[playerId].timeAsDefender += stintDuration;
      } else if (normalizedRole === PLAYER_ROLES.ATTACKER) {
        playerTimes[playerId].timeAsAttacker += stintDuration;
      } else if (normalizedRole === PLAYER_ROLES.SUBSTITUTE) {
        playerTimes[playerId].timeAsSub += stintDuration;
      }
      
      delete playerStints[playerId];
    }
  };
  
  // Process events chronologically
  events.forEach(event => {
    switch (event.type) {
      case EVENT_TYPES.MATCH_START:
        // Initialize starting players
        if (event.data.startingFormation) {
          Object.values(event.data.startingFormation).forEach(playerId => {
            if (playerId) {
              initializePlayer(playerId);
              playerStints[playerId] = {
                startTime: event.timestamp,
                role: event.data.playerRoles?.[playerId] || 'Unknown',
                status: PLAYER_STATUS.ON_FIELD
              };
            }
          });
        }
        break;
        
      case EVENT_TYPES.SUBSTITUTION:
        // End stints for players going off
        if (event.data.playersOff) {
          event.data.playersOff.forEach(playerId => {
            endStint(playerId, event.timestamp, 
              playerStints[playerId]?.role || 'Unknown',
              playerStints[playerId]?.status || 'substitute'
            );
          });
        }
        
        // Start stints for players coming on
        if (event.data.playersOn) {
          event.data.playersOn.forEach(playerId => {
            initializePlayer(playerId);
            playerStints[playerId] = {
              startTime: event.timestamp,
              role: event.data.newRoles?.[playerId] || 'Unknown',
              status: PLAYER_STATUS.ON_FIELD
            };
          });
        }
        break;
        
      case EVENT_TYPES.GOALIE_SWITCH:
        // Handle goalie changes
        if (event.data.oldGoalie) {
          endStint(event.data.oldGoalie, event.timestamp, PLAYER_ROLES.GOALIE, PLAYER_STATUS.ON_FIELD);
        }
        if (event.data.newGoalie) {
          initializePlayer(event.data.newGoalie);
          playerStints[event.data.newGoalie] = {
            startTime: event.timestamp,
            role: PLAYER_ROLES.GOALIE,
            status: PLAYER_STATUS.ON_FIELD
          };
        }
        break;
        
      case EVENT_TYPES.MATCH_END:
        // End all active stints
        Object.keys(playerStints).forEach(playerId => {
          endStint(playerId, event.timestamp,
            playerStints[playerId].role,
            playerStints[playerId].status
          );
        });
        break;
    }
  });
  
  return playerTimes;
};

/**
 * Validate player time consistency
 */
export const validatePlayerTimeConsistency = (calculatedTimes, actualPlayers) => {
  if (!calculatedTimes || !actualPlayers) return false;
  
  const tolerance = 5000; // 5 seconds tolerance in milliseconds
  
  for (const player of actualPlayers) {
    const calculated = calculatedTimes[player.id];
    const actual = player.stats;
    
    if (calculated && actual) {
      // Check field time
      const fieldTimeDiff = Math.abs(
        (calculated.timeOnField / 1000) - (actual.timeOnFieldSeconds || 0)
      );
      if (fieldTimeDiff > tolerance / 1000) {
        console.warn(`Field time mismatch for player ${player.id}: calculated ${calculated.timeOnField / 1000}s, actual ${actual.timeOnFieldSeconds}s`);
        return false;
      }
      
      // Check role times (convert to seconds for comparison)
      const roleTimes = [
        { calc: calculated.timeAsGoalie / 1000, actual: actual.timeAsGoalieSeconds || 0 },
        { calc: calculated.timeAsDefender / 1000, actual: actual.timeAsDefenderSeconds || 0 },
        { calc: calculated.timeAsAttacker / 1000, actual: actual.timeAsAttackerSeconds || 0 },
        { calc: calculated.timeAsSub / 1000, actual: actual.timeAsSubSeconds || 0 }
      ];
      
      for (const roleTime of roleTimes) {
        const diff = Math.abs(roleTime.calc - roleTime.actual);
        if (diff > tolerance / 1000) {
          console.warn(`Role time mismatch for player ${player.id}: calculated ${roleTime.calc}s, actual ${roleTime.actual}s`);
          return false;
        }
      }
    }
  }
  
  return true;
};

/**
 * Check for sequence gaps in events
 */
export const hasSequenceGaps = (events) => {
  if (!Array.isArray(events) || events.length <= 1) return false;
  
  const sequences = events.map(e => e.sequence).sort((a, b) => a - b);
  
  for (let i = 1; i < sequences.length; i++) {
    if (sequences[i] - sequences[i - 1] > 1) {
      return true;
    }
  }
  
  return false;
};

/**
 * Find duplicate events
 */
export const findDuplicateEvents = (events) => {
  if (!Array.isArray(events)) return [];
  
  const duplicates = [];
  const seenIds = new Set();
  
  events.forEach(event => {
    if (seenIds.has(event.id)) {
      duplicates.push(event);
    } else {
      seenIds.add(event.id);
    }
  });
  
  return duplicates;
};

/**
 * Comprehensive match data validation
 */
export const validateMatchData = (events, gameState) => {
  const errors = [];
  
  try {
    // Basic array validation
    if (!Array.isArray(events)) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.CORRUPTED_EVENT,
        message: 'Events is not an array',
        severity: 'critical'
      });
      return errors;
    }
    
    // Check event chronology
    if (!eventsAreChronological(events)) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.CHRONOLOGY,
        message: 'Events not in chronological order',
        severity: 'high'
      });
    }
    
    // Check for sequence gaps
    if (hasSequenceGaps(events)) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.SEQUENCE_GAP,
        message: 'Gaps found in event sequence numbers',
        severity: 'medium'
      });
    }
    
    // Check for duplicates
    const duplicates = findDuplicateEvents(events);
    if (duplicates.length > 0) {
      errors.push({
        type: VALIDATION_ERROR_TYPES.DUPLICATE_EVENT,
        message: `Found ${duplicates.length} duplicate events`,
        severity: 'high',
        data: duplicates
      });
    }
    
    // Validate playing time calculations
    if (gameState) {
      const calculatedTime = calculateEffectivePlayingTime(events);
      const expectedTime = gameState.totalEffectiveTime;
      
      if (expectedTime && Math.abs(calculatedTime - expectedTime) > 5000) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.TIME_INCONSISTENCY,
          message: `Playing time calculation inconsistent: calculated ${calculatedTime}ms, expected ${expectedTime}ms`,
          severity: 'medium'
        });
      }
      
      // Check player time consistency
      if (gameState.allPlayers) {
        const playerTimeTotals = calculatePlayerTimeTotals(events);
        if (!validatePlayerTimeConsistency(playerTimeTotals, gameState.allPlayers)) {
          errors.push({
            type: VALIDATION_ERROR_TYPES.PLAYER_TIME_MISMATCH,
            message: 'Player time statistics inconsistent with events',
            severity: 'medium'
          });
        }
      }
    }
    
    // Validate individual events
    events.forEach((event, index) => {
      if (!event.id) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.MISSING_DATA,
          message: `Event at index ${index} missing id`,
          severity: 'high'
        });
      }
      
      if (!event.type || !Object.values(EVENT_TYPES).includes(event.type)) {
        errors.push({
          type: VALIDATION_ERROR_TYPES.CORRUPTED_EVENT,
          message: `Event at index ${index} has invalid type: ${event.type}`,
          severity: 'high'
        });
      }
      
      if (!event.timestamp || typeof event.timestamp !== 'number') {
        errors.push({
          type: VALIDATION_ERROR_TYPES.CORRUPTED_EVENT,
          message: `Event at index ${index} has invalid timestamp`,
          severity: 'critical'
        });
      }
    });
    
  } catch (error) {
    errors.push({
      type: VALIDATION_ERROR_TYPES.CORRUPTED_EVENT,
      message: `Validation failed with error: ${error.message}`,
      severity: 'critical'
    });
  }
  
  return errors;
};

/**
 * Attempt to recover from corrupted events
 */
export const recoverCorruptedEvents = (events) => {
  if (!Array.isArray(events)) {
    console.error('Cannot recover: events is not an array');
    return [];
  }
  
  
  let recoveredEvents = [];
  
  // Filter out obviously corrupted events
  events.forEach((event, index) => {
    try {
      // Basic validation
      if (event && 
          typeof event === 'object' && 
          event.id && 
          event.type && 
          Object.values(EVENT_TYPES).includes(event.type) &&
          event.timestamp && 
          typeof event.timestamp === 'number') {
        
        recoveredEvents.push(event);
      } else {
      }
    } catch (error) {
    }
  });
  
  // Sort by timestamp to fix chronology
  recoveredEvents.sort((a, b) => a.timestamp - b.timestamp);
  
  // Remove duplicates based on ID
  const uniqueEvents = [];
  const seenIds = new Set();
  
  recoveredEvents.forEach(event => {
    if (!seenIds.has(event.id)) {
      seenIds.add(event.id);
      uniqueEvents.push(event);
    }
  });
  
  // Fix sequence numbers
  uniqueEvents.forEach((event, index) => {
    event.sequence = index + 1;
  });
  
  
  return uniqueEvents;
};

/**
 * Attempt crash recovery from localStorage
 */
export const recoverFromCrash = () => {
  try {

    // Try primary storage first
    const primary = localStorage.getItem('dif-coach-match-events');
    if (primary) {
      const primaryData = JSON.parse(primary);
      const validationErrors = validateMatchData(primaryData.events);

      if (validationErrors.length === 0) {
        return primaryData;
      }

      // Try to recover primary data
      const recoveredEvents = recoverCorruptedEvents(primaryData.events);
      if (recoveredEvents.length > 0) {
        return {
          ...primaryData,
          events: recoveredEvents,
          recovered: true,
          recoveryTimestamp: Date.now()
        };
      }
    }

    console.warn('No valid primary storage found for crash recovery');
    return null;

  } catch (error) {
    console.error('Crash recovery failed:', error);
    return null;
  }
};

/**
 * Validate and restore from storage
 */
export const validateAndRestore = (storageString) => {
  try {
    if (!storageString) return null;
    
    const data = JSON.parse(storageString);
    const validationErrors = validateMatchData(data.events);
    
    if (validationErrors.length === 0) {
      return data;
    }
    
    // Attempt recovery if validation fails
    const recoveredEvents = recoverCorruptedEvents(data.events);
    if (recoveredEvents.length > 0) {
      return {
        ...data,
        events: recoveredEvents,
        recovered: true,
        recoveryTimestamp: Date.now()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to validate and restore:', error);
    return null;
  }
};