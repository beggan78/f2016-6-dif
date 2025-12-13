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

      // Write all events sequentially to preserve order
      const results = [];
      for (const dbEvent of eventsToWrite) {
        try {
          const result = await this.writeEventToDatabase(dbEvent);
          results.push({ status: 'fulfilled', value: result });
        } catch (error) {
          results.push({ status: 'rejected', reason: error });
          console.warn('Event write failed (continuing sequence):', error);
          // Continue writing remaining events even if one fails
        }
      }

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
      'match_created': 'match_created',
      'period_start': 'period_started',
      'period_end': 'period_ended',
      'goal_scored': 'goal_scored',
      'goal_conceded': 'goal_conceded',
      'substitution': 'substitution_in',
      'goalie_assignment': 'goalie_enters',
      'position_change': 'position_switch',
      'player_inactivated': 'player_inactivated',
      'player_activated': 'player_reactivated',
      'player_reactivated': 'player_reactivated',
      'fair_play_award': 'fair_play_award',

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

    const baseCorrelationId = this.normalizeCorrelationId(
      event?.data?.correlationId ||
      event?.relatedEventId ||
      event?.id
    );

    const buildBaseEvent = (overrides = {}) => ({
      match_id: matchId,
      event_type: dbEventType,
      occurred_at_seconds: occurredAtSeconds,
      period: event.periodNumber || 1,
      data: null,
      correlation_id: baseCorrelationId || null,
      ...overrides
    });

    const getCorrelationId = () =>
      baseCorrelationId ||
      this.generateCorrelationId();

    // Special handling: Goalie switch creates TWO events
    if (event.type === 'goalie_switch') {
      const correlationId = this.generateCorrelationId();

      const events = [];

      // Goalie exiting
      if (event.data.previousGoalieId || event.data.oldGoalieId) {
        const exitName = this.getDisplayNameForPlayer(event, event.data.previousGoalieId || event.data.oldGoalieId);
        events.push({
          ...buildBaseEvent({
            occurred_at_seconds: occurredAtSeconds,
            period: event.periodNumber || 1
          }),
          event_type: 'goalie_exits',
          player_id: event.data.previousGoalieId || event.data.oldGoalieId,
          correlation_id: correlationId,
          data: exitName ? { display_name: exitName } : null
        });
      }

      // Goalie entering
      if (event.data.goalieId || event.data.newGoalieId) {
        const enterName = this.getDisplayNameForPlayer(event, event.data.goalieId || event.data.newGoalieId);
        events.push({
          ...buildBaseEvent({
            occurred_at_seconds: occurredAtSeconds,
            period: event.periodNumber || 1
          }),
          event_type: 'goalie_enters',
          player_id: event.data.goalieId || event.data.newGoalieId,
          correlation_id: correlationId,
          data: enterName ? { display_name: enterName } : null
        });
      }

      return events.length > 0 ? events : null;
    }

    // Special handling: Match end reasons
    if (event.type === 'match_abandoned' || event.type === 'match_suspended') {
      return buildBaseEvent({
        data: {
          matchEndReason: event.type
        }
      });
    }

    if (dbEventType === 'match_ended' && event.type === 'match_end') {
      return buildBaseEvent({ data: null });
    }

    // Minimal payloads by event type
    if (dbEventType === 'match_created') {
      const ownTeamName = event.data?.ownTeamName || null;
      const opponentTeamName = event.data?.opponentTeamName || null;
      const periodDurationMinutes = event.data?.periodDurationMinutes || null;
      const totalPeriods = event.data?.totalPeriods || null;

      // Build data object only if we have data to store
      const dataObj = {
        ...(ownTeamName ? { ownTeamName } : {}),
        ...(opponentTeamName ? { opponentTeamName } : {}),
        ...(typeof periodDurationMinutes === 'number' ? { periodDurationMinutes } : {}),
        ...(typeof totalPeriods === 'number' ? { totalPeriods } : {})
      };

      const hasData = Object.keys(dataObj).length > 0;

      return buildBaseEvent({
        data: hasData ? dataObj : null
      });
    }

    if (dbEventType === 'match_started') {
      const startingLineup = Array.isArray(event.data?.startingLineup) ? event.data.startingLineup : null;
      const ownTeamName = event.data?.ownTeamName || event.data?.teamName || null;
      const opponentTeamName = event.data?.opponentTeamName
        || event.data?.opponentTeam
        || event.data?.opponentName
        || null;
      const periodDurationMinutes = event.data?.periodDurationMinutes
        || event.data?.matchMetadata?.periodDurationMinutes
        || null;
      const totalPeriods = event.data?.numPeriods
        || event.data?.totalPeriods
        || event.data?.matchMetadata?.plannedPeriods
        || null;

      // Build data object only if we have data to store
      const dataObj = {
        ...(startingLineup ? { startingLineup } : {}),
        ...(ownTeamName ? { ownTeamName } : {}),
        ...(opponentTeamName ? { opponentTeamName, opponentName: opponentTeamName } : {}),
        ...(typeof periodDurationMinutes === 'number' ? { periodDurationMinutes } : {}),
        ...(typeof totalPeriods === 'number' ? { totalPeriods } : {})
      };

      // Return null if data object is empty, otherwise return the data
      const hasData = Object.keys(dataObj).length > 0;

      return buildBaseEvent({
        data: hasData ? dataObj : null
      });
    }

    if (dbEventType === 'match_ended' && event.type === 'match_end') {
      let matchDurationSeconds = typeof event.data?.matchDurationMs === 'number'
        ? Math.round(event.data.matchDurationMs / 1000)
        : null;
      if (matchDurationSeconds === null && event.matchTime) {
        matchDurationSeconds = this.parseMatchTimeToSeconds(event.matchTime);
      }
      const totalPeriods = event.data?.finalPeriodNumber || event.data?.matchMetadata?.totalPeriods || null;

      return buildBaseEvent({
        data: {
          ...(matchDurationSeconds !== null ? { matchDurationSeconds } : {}),
          ...(typeof totalPeriods === 'number' ? { totalPeriods } : {}),
          ...(event.data?.matchMetadata ? { matchMetadata: event.data.matchMetadata } : null)
        }
      });
    }

    if (dbEventType === 'goalie_enters') {
      const goalieId = event.data?.goalieId || event.data?.newGoalieId || event.data?.playerId || event.data?.scorerId;
      const correlationId = getCorrelationId();
      const baseEvent = buildBaseEvent({
        player_id: goalieId || undefined,
        data: goalieId ? this.buildDisplayNameData(event, goalieId) : null,
        correlation_id: correlationId
      });

      const isReplacement = event.data?.eventType === 'replacement';
      const previousGoalieId = event.data?.previousGoalieId || event.data?.oldGoalieId;
      const replacementTargetPosition = event.data?.newGoaliePosition || null;

      if (isReplacement && previousGoalieId) {
        const positionSwitchEvent = {
          ...buildBaseEvent({
            event_type: 'position_switch',
            player_id: previousGoalieId,
            correlation_id: correlationId,
            data: {
              old_position: 'goalie',
              new_position: replacementTargetPosition,
              ...(this.buildDisplayNameData(event, previousGoalieId) || {})
            }
          })
        };

        return [baseEvent, positionSwitchEvent];
      }

      return baseEvent;
    }

    if (event.type === 'substitution') {
      const correlationId = getCorrelationId();
      const playersOff = Array.isArray(event.data?.playersOff) ? event.data.playersOff : [];
      const playersOn = Array.isArray(event.data?.playersOn) ? event.data.playersOn : [];
      const substitutionEvents = [];

      playersOff.forEach(playerId => {
        const displayData = this.buildDisplayNameData(event, playerId);
        substitutionEvents.push({
          ...buildBaseEvent({
            event_type: 'substitution_out',
            player_id: playerId,
            correlation_id: correlationId,
            data: displayData
          })
        });
      });

      playersOn.forEach(playerId => {
        const displayData = this.buildDisplayNameData(event, playerId);
        substitutionEvents.push({
          ...buildBaseEvent({
            event_type: 'substitution_in',
            player_id: playerId,
            correlation_id: correlationId,
            data: displayData
          })
        });
      });

      return substitutionEvents.length > 0 ? substitutionEvents : null;
    }

    if (dbEventType === 'position_switch') {
      const sourcePlayerId = event.data?.sourcePlayerId;
      const targetPlayerId = event.data?.targetPlayerId;
      const sourcePosition = event.data?.sourcePosition || null;
      const targetPosition = event.data?.targetPosition || null;

      // Only create paired events when both players are present
      if (sourcePlayerId && targetPlayerId) {
        const correlationId = getCorrelationId();

        return [
          {
            ...buildBaseEvent({
              player_id: sourcePlayerId,
              correlation_id: correlationId,
              data: {
                old_position: sourcePosition,
                new_position: targetPosition,
                ...(this.buildDisplayNameData(event, sourcePlayerId) || {})
              }
            })
          },
          {
            ...buildBaseEvent({
              player_id: targetPlayerId,
              correlation_id: correlationId,
              data: {
                old_position: targetPosition,
                new_position: sourcePosition,
                ...(this.buildDisplayNameData(event, targetPlayerId) || {})
              }
            })
          }
        ];
      }
    }

    if (dbEventType === 'goal_scored' || dbEventType === 'goal_conceded') {
      const payload = {
        ownScore: event.data?.ownScore,
        opponentScore: event.data?.opponentScore
      };

      const scorerName = this.getDisplayNameForPlayer(event, event.data?.playerId || event.data?.scorerId || event.player_id);
      if (scorerName) {
        payload.display_name = scorerName;
      }

      const base = buildBaseEvent({
        data: payload,
        player_id: event.data?.playerId || event.data?.scorerId || undefined
      });

      return base;
    }

    if (dbEventType === 'period_started' || dbEventType === 'period_ended') {
      if (dbEventType === 'period_started') {
        const startingLineup = Array.isArray(event.data?.startingLineup) ? event.data.startingLineup : null;
        return buildBaseEvent({
          data: startingLineup ? { startingLineup } : null
        });
      }
      return buildBaseEvent({ data: null });
    }

    if (dbEventType === 'player_inactivated' || dbEventType === 'player_reactivated') {
      const playerId = event.data?.playerId || event.player_id;
      const displayData = this.buildDisplayNameData(event, playerId);
      return buildBaseEvent({
        event_type: dbEventType,
        player_id: playerId || undefined,
        data: displayData
      });
    }

    if (dbEventType === 'fair_play_award') {
      const displayData = this.buildDisplayNameData(event, event.data?.playerId);
      return buildBaseEvent({
        event_type: dbEventType,
        player_id: event.data?.playerId || undefined,
        data: displayData
      });
    }

    return buildBaseEvent({
      data: event.data ? { ...event.data } : null,
      player_id: event.data?.playerId || event.data?.scorerId || undefined
    });
  }

  /**
   * Build minimal data payload containing a display name when available
   * @param {Object} event - Original logged event
   * @param {string} playerId - Player ID associated with the database event
   * @returns {Object|null} Data payload with display_name or null
   */
  buildDisplayNameData(event, playerId) {
    const displayName = this.getDisplayNameForPlayer(event, playerId);
    return displayName ? { display_name: displayName } : null;
  }

  /**
   * Extract a player's display name from event data when available
   * @param {Object} event - Original logged event
   * @param {string} playerId - Player ID to match
   * @returns {string|null} Display name string or null
   */
  getDisplayNameForPlayer(event, playerId) {
    if (!event || !playerId) {
      return null;
    }

    const data = event.data || {};
    const normalizeName = (value) => {
      if (!value || typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'unknown') {
        return null;
      }
      return trimmed;
    };

    const directDisplayName = normalizeName(data.display_name);
    if (directDisplayName) {
      return directDisplayName;
    }

    const playerDisplayName = normalizeName(data.playerDisplayName);
    if (playerDisplayName) {
      return playerDisplayName;
    }

    if (typeof data.playerName === 'string' && (!data.playerId || data.playerId === playerId)) {
      const normalized = normalizeName(data.playerName);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof data.scorerName === 'string' && (!data.scorerId || data.scorerId === playerId)) {
      const normalized = normalizeName(data.scorerName);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof data.goalieName === 'string' && (
      (data.goalieId && data.goalieId === playerId) ||
      (data.newGoalieId && data.newGoalieId === playerId)
    )) {
      const normalized = normalizeName(data.goalieName);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof data.previousGoalieName === 'string' && (
      (data.previousGoalieId && data.previousGoalieId === playerId) ||
      (data.oldGoalieId && data.oldGoalieId === playerId)
    )) {
      const normalized = normalizeName(data.previousGoalieName);
      if (normalized) {
        return normalized;
      }
    }

    if (data.playerNameMap && typeof data.playerNameMap === 'object' && data.playerNameMap[playerId]) {
      const normalized = normalizeName(data.playerNameMap[playerId]);
      if (normalized) {
        return normalized;
      }
    }

    if (Array.isArray(data.playersOff) && Array.isArray(data.playersOffNames)) {
      const index = data.playersOff.findIndex(id => id === playerId);
      if (index !== -1 && data.playersOffNames[index]) {
        const normalized = normalizeName(data.playersOffNames[index]);
        if (normalized) {
          return normalized;
        }
      }
    }

    if (Array.isArray(data.playersOn) && Array.isArray(data.playersOnNames)) {
      const index = data.playersOn.findIndex(id => id === playerId);
      if (index !== -1 && data.playersOnNames[index]) {
        const normalized = normalizeName(data.playersOnNames[index]);
        if (normalized) {
          return normalized;
        }
      }
    }

    if (typeof data.sourcePlayerName === 'string' && data.sourcePlayerId === playerId) {
      const normalized = normalizeName(data.sourcePlayerName);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof data.targetPlayerName === 'string' && data.targetPlayerId === playerId) {
      const normalized = normalizeName(data.targetPlayerName);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof data.swapPlayerName === 'string' && data.swapPlayerId === playerId) {
      const normalized = normalizeName(data.swapPlayerName);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  /**
   * Write event to database with retry logic
   * @param {Object} dbEvent - Database-formatted event
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<{success: boolean, ...}>}
   */
  async writeEventToDatabase(dbEvent, retryCount = 0) {
    try {
      // Fair play award should be unique per match - replace existing entry
      if (dbEvent.event_type === 'fair_play_award') {
        await supabase
          .from('match_log_event')
          .delete()
          .eq('match_id', dbEvent.match_id)
          .eq('event_type', 'fair_play_award');
      }

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
   * Validate UUID strings for correlation_id to satisfy DB constraints
   * @param {string} value - Possible UUID value
   * @returns {boolean} True if value is a valid UUID
   */
  isValidUuid(value) {
    if (!value || typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value.trim());
  }

  /**
   * Normalize correlation ID to a valid UUID or null
   * @param {string} value - Raw correlation ID value
   * @returns {string|null} Valid UUID string or null
   */
  normalizeCorrelationId(value) {
    return this.isValidUuid(value) ? value : null;
  }

  /**
   * Generate unique correlation ID for related events
   * @returns {string} Correlation ID
   */
  generateCorrelationId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // Fallback UUID v4 generator for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
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
