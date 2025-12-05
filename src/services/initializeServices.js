/**
 * Initialize Services
 * Sets up event listeners and background services for the application
 */

import { addEventListener } from '../utils/gameEventLogger';
import { eventPersistenceService } from './eventPersistenceService';

/**
 * Initialize event persistence service
 * Subscribes to game events and persists them to database in real-time
 * @param {Object} gameState - Game state with currentMatchId
 */
export function initializeEventPersistence(gameState) {
  addEventListener((eventType, data) => {
    // Only process 'events_saved' notifications
    if (eventType === 'events_saved' && data.events && data.events.length > 0) {
      // Get the latest event (most recently added)
      const latestEvent = data.events[data.events.length - 1];
      const matchId = gameState.currentMatchId;

      // Only persist if we have both event and matchId
      if (matchId && latestEvent) {
        eventPersistenceService.persistEvent(latestEvent, matchId)
          .catch(error => {
            // Log error but don't throw - persistence failures should not break the game
            console.warn('Background event persistence failed:', error);
          });
      }
    }
  });
}
