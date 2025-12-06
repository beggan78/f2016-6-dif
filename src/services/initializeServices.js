/**
 * Initialize Services
 * Sets up event listeners and background services for the application
 */

import { addEventListener } from '../utils/gameEventLogger';
import { eventPersistenceService } from './eventPersistenceService';

/**
 * Initialize event persistence service
 * Subscribes to game events and persists them to database in real-time
 * @param {Function|Object} matchIdSource - Function returning latest matchId or static value
 */
export function initializeEventPersistence(matchIdSource) {
  const resolveMatchId = (event) => {
    if (typeof matchIdSource === 'function') {
      const dynamicMatchId = matchIdSource(event);
      if (dynamicMatchId) {
        return dynamicMatchId;
      }
    } else if (matchIdSource) {
      return matchIdSource;
    }

    // Fall back to event payload if available
    return event?.data?.matchId || event?.matchId || null;
  };

  const unsubscribe = addEventListener((eventType, data) => {
    // Only process 'events_saved' notifications
    if (eventType !== 'events_saved' || !data?.events?.length) {
      return;
    }

    // Get the latest event (most recently added)
    const latestEvent = data.events[data.events.length - 1];
    const matchId = resolveMatchId(latestEvent);

    if (matchId && latestEvent) {
      eventPersistenceService.persistEvent(latestEvent, matchId).catch(error => {
        // Log error but don't throw - persistence failures should not break the game
        console.warn('Background event persistence failed:', error);
      });
    }
  });

  return unsubscribe;
}
