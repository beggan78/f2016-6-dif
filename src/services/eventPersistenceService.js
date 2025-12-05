/**
 * Event Persistence Service
 * Handles real-time persistence of game events to Supabase database
 * with retry logic, exponential backoff, and graceful error handling
 */

import { supabase, getCurrentUser } from '../lib/supabase';

class EventPersistenceService {
  constructor() {
    this.retryQueue = [];
    this.maxRetries = 5;
    this.baseRetryDelay = 1000; // 1 second
    this.retryTimers = new Map();
  }

  /**
   * Main entry point - persist event to database
   * @param {Object} event - Event from gameEventLogger
   * @param {string} matchId - Current match ID
   * @returns {Promise<{success: boolean, ...}>}
   */
  async persistEvent(event, matchId) {
    try {
      const resolvedMatchId = matchId || event?.matchId || event?.data?.matchId;
      if (!resolvedMatchId) {
        return { success: true, skipped: true, reason: 'Missing matchId' };
      }

      // Check authentication
      const user = await getCurrentUser();
      if (!user) {
        return { success: true, skipped: true, reason: 'Not authenticated' };
      }

      // Transform event to database format
      const dbEvents = this.transformEventForDatabase(event, resolvedMatchId);
      if (!dbEvents) {
        return { success: true, skipped: true, reason: 'No database mapping' };
      }

      // Handle single event or array (goalie switch creates TWO)
      const eventsToWrite = Array.isArray(dbEvents) ? dbEvents : [dbEvents];

      // Write all events (non-blocking)
      const results = await Promise.allSettled(
        eventsToWrite.map(dbEvent => this.writeEventToDatabase(dbEvent))
      );

      return { success: true, results };
    } catch (error) {
      console.warn('Event persistence error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Map localStorage event type to database enum
   * @param {string} eventType - Event type from EVENT_TYPES
   * @returns {string|null} Database event type or null if no mapping
   */
  mapEventTypeToDatabase(eventType) {
    const mapping = {
      // Direct mappings
      'match_start': 'match_started',
      'match_end': 'match_ended',
      'period_start': 'period_started',
      'period_end': 'period_ended',
      'goal_scored': 'goal_scored',
      'goal_conceded': 'goal_conceded',
      'substitution': 'substitution_in',
      'goalie_assignment': 'goalie_enters',
      'position_change': 'position_switch',

      // Special cases
      'goalie_switch': 'goalie_exits', // Will create TWO events
      'match_abandoned': 'match_ended',
      'match_suspended': 'match_ended',

      // No database mapping - localStorage only
      'period_paused': null,
      'period_resumed': null,
      'intermission': null,
      'substitution_undone': null,
      'goal_corrected': null,
      'goal_undone': null,
      'timer_paused': null,
      'timer_resumed': null,
      'technical_timeout': null
    };

    return mapping[eventType] !== undefined ? mapping[eventType] : null;
  }

  /**
   * Transform localStorage event to database format
   * @param {Object} event - Event from localStorage
   * @param {string} matchId - Match ID
   * @returns {Object|Array|null} Database event(s) or null if no mapping
   */
  transformEventForDatabase(event, matchId) {
    const dbEventType = this.mapEventTypeToDatabase(event.type);

    if (!dbEventType) {
      return null; // Skip events without database mapping
    }

    // Convert match time "MM:SS" to seconds
    const occurredAtSeconds = this.parseMatchTimeToSeconds(event.matchTime);

    // Base event structure
    const baseEvent = {
      match_id: matchId,
      event_type: dbEventType,
      occurred_at_seconds: occurredAtSeconds,
      period: event.periodNumber || 1,
      data: {
        originalEventType: event.type, // Audit trail
        ...event.data,
        localStorageEventId: event.id
      },
      correlation_id: event.relatedEventId || null
    };

    // Add player_id if present
    if (event.data?.playerId) {
      baseEvent.player_id = event.data.playerId;
    } else if (event.data?.scorerId) {
      // For goal events, scorerId might be the player reference
      baseEvent.player_id = event.data.scorerId;
    }

    // Special handling: Goalie switch creates TWO events
    if (event.type === 'goalie_switch') {
      const correlationId = this.generateCorrelationId();

      const events = [];

      // Goalie exiting
      if (event.data.previousGoalieId || event.data.oldGoalieId) {
        events.push({
          ...baseEvent,
          event_type: 'goalie_exits',
          player_id: event.data.previousGoalieId || event.data.oldGoalieId,
          correlation_id: correlationId
        });
      }

      // Goalie entering
      if (event.data.goalieId || event.data.newGoalieId) {
        events.push({
          ...baseEvent,
          event_type: 'goalie_enters',
          player_id: event.data.goalieId || event.data.newGoalieId,
          correlation_id: correlationId
        });
      }

      return events.length > 0 ? events : null;
    }

    // Special handling: Match end reasons
    if (event.type === 'match_abandoned' || event.type === 'match_suspended') {
      baseEvent.data.matchEndReason = event.type;
    }

    return baseEvent;
  }

  /**
   * Write event to database with retry logic
   * @param {Object} dbEvent - Database-formatted event
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<{success: boolean, ...}>}
   */
  async writeEventToDatabase(dbEvent, retryCount = 0) {
    try {
      const { data, error } = await supabase
        .from('match_log_event')
        .insert(dbEvent);

      if (error) {
        throw error;
      }

      // Success - clear from retry queue if present
      this.removeFromRetryQueue(dbEvent);
      return { success: true, data };

    } catch (error) {
      console.warn(`Failed to write event (attempt ${retryCount + 1}):`, error.message);

      if (retryCount < this.maxRetries) {
        // Schedule retry with exponential backoff
        this.scheduleRetry(dbEvent, retryCount);
        return { success: false, retrying: true };
      } else {
        // Max retries reached - log permanent failure
        console.error('Max retries reached for event:', dbEvent, error);
        this.logPersistentFailure(dbEvent, error);
        return { success: false, retrying: false, error };
      }
    }
  }

  /**
   * Schedule retry with exponential backoff
   * @param {Object} dbEvent - Database event to retry
   * @param {number} retryCount - Current retry count
   */
  scheduleRetry(dbEvent, retryCount) {
    const delay = this.calculateBackoffDelay(retryCount);
    const eventKey = this.getEventKey(dbEvent);

    // Clear any existing retry timer
    if (this.retryTimers.has(eventKey)) {
      clearTimeout(this.retryTimers.get(eventKey));
    }

    // Schedule retry
    const timerId = setTimeout(async () => {
      await this.writeEventToDatabase(dbEvent, retryCount + 1);
      this.retryTimers.delete(eventKey);
    }, delay);

    this.retryTimers.set(eventKey, timerId);
  }

  /**
   * Calculate exponential backoff delay
   * Retry intervals: 1s, 2s, 4s, 8s, 16s
   * @param {number} retryCount - Current retry attempt
   * @returns {number} Delay in milliseconds
   */
  calculateBackoffDelay(retryCount) {
    return this.baseRetryDelay * Math.pow(2, retryCount);
  }

  /**
   * Parse match time "MM:SS" to seconds
   * @param {string} matchTime - Time in MM:SS format
   * @returns {number} Time in seconds
   */
  parseMatchTimeToSeconds(matchTime) {
    if (!matchTime || typeof matchTime !== 'string') {
      return 0;
    }

    const parts = matchTime.split(':');
    if (parts.length !== 2) {
      return 0;
    }

    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;

    return (minutes * 60) + seconds;
  }

  /**
   * Generate unique correlation ID for related events
   * @returns {string} Correlation ID
   */
  generateCorrelationId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get unique key for event (for retry tracking)
   * @param {Object} dbEvent - Database event
   * @returns {string} Event key
   */
  getEventKey(dbEvent) {
    return `${dbEvent.match_id}_${dbEvent.event_type}_${dbEvent.occurred_at_seconds}_${dbEvent.period}`;
  }

  /**
   * Remove event from retry queue
   * @param {Object} dbEvent - Database event
   */
  removeFromRetryQueue(dbEvent) {
    const eventKey = this.getEventKey(dbEvent);
    this.retryQueue = this.retryQueue.filter(
      item => this.getEventKey(item.event) !== eventKey
    );
  }

  /**
   * Log permanent failure for manual sync later
   * @param {Object} dbEvent - Database event
   * @param {Error} error - Error object
   */
  logPersistentFailure(dbEvent, error) {
    try {
      const failedEvents = this.getFailedEventsFromStorage();
      failedEvents.push({
        event: dbEvent,
        error: error.message,
        timestamp: Date.now(),
        attemptedRetries: this.maxRetries
      });

      localStorage.setItem('failed_event_writes', JSON.stringify(failedEvents));
      console.error('Event persistence failed permanently:', {
        event: dbEvent,
        error: error.message,
        retries: this.maxRetries
      });
    } catch (storageError) {
      console.error('Failed to store failed event:', storageError);
    }
  }

  /**
   * Get failed events from localStorage
   * @returns {Array} Failed events
   */
  getFailedEventsFromStorage() {
    try {
      const stored = localStorage.getItem('failed_event_writes');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse failed events:', error);
      return [];
    }
  }

  /**
   * Clear all retry timers (for cleanup)
   */
  clearAllRetryTimers() {
    this.retryTimers.forEach(timerId => clearTimeout(timerId));
    this.retryTimers.clear();
  }
}

// Singleton instance
export const eventPersistenceService = new EventPersistenceService();
