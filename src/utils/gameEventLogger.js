/**
 * Comprehensive Game Event Logger
 * Handles all match events with validation, integrity checking, and crash recovery
 */


// Event types enumeration with comprehensive coverage
export const EVENT_TYPES = {
  // Core match events
  MATCH_START: 'match_start',
  MATCH_END: 'match_end',
  MATCH_ABANDONED: 'match_abandoned',
  MATCH_SUSPENDED: 'match_suspended',
  
  // Period events
  PERIOD_START: 'period_start',
  PERIOD_END: 'period_end',
  PERIOD_PAUSED: 'period_paused',
  PERIOD_RESUMED: 'period_resumed',
  INTERMISSION: 'intermission',
  
  // Player events
  SUBSTITUTION: 'substitution',
  SUBSTITUTION_UNDONE: 'substitution_undone',
  GOALIE_SWITCH: 'goalie_switch',
  GOALIE_ASSIGNMENT: 'goalie_assignment',
  POSITION_CHANGE: 'position_change',
  
  // Scoring events
  GOAL_SCORED: 'goal_home',
  GOAL_CONCEDED: 'goal_conceded',
  GOAL_CORRECTED: 'goal_corrected',
  GOAL_UNDONE: 'goal_undone',
  
  // Timer events
  TIMER_PAUSED: 'timer_paused',
  TIMER_RESUMED: 'timer_resumed',
  TECHNICAL_TIMEOUT: 'technical_timeout'
};

// localStorage keys
const STORAGE_KEYS = {
  PRIMARY: 'dif-coach-match-events',
  BACKUP: 'dif-coach-match-events-backup',
  EMERGENCY: 'dif-coach-match-events-emergency'
};

// Global state for event tracking
let eventSequenceNumber = 0;
let matchStartTime = null;
let currentEvents = [];
let eventListeners = [];

/**
 * Generate unique event ID
 */
const generateEventId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `evt_${timestamp}_${random}`;
};

/**
 * Calculate match time from timestamp
 */
export const calculateMatchTime = (timestamp, startTime = null) => {
  if (!startTime) startTime = matchStartTime;
  if (!startTime || !timestamp) return '00:00';
  
  const elapsed = Math.max(0, timestamp - startTime);
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Calculate checksum for data integrity
 */
const calculateChecksum = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Validate event structure
 */
const validateEvent = (event) => {
  const errors = [];
  
  if (!event.id) errors.push('Event missing id');
  if (!event.type || !Object.values(EVENT_TYPES).includes(event.type)) {
    errors.push('Invalid event type');
  }
  if (!event.timestamp || typeof event.timestamp !== 'number') {
    errors.push('Invalid timestamp');
  }
  if (typeof event.sequence !== 'number') {
    errors.push('Invalid sequence number');
  }
  
  return errors;
};

/**
 * Validate event sequence chronology
 */
export const validateEventSequence = (events) => {
  if (!Array.isArray(events) || events.length === 0) return true;
  
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    
    // Check timestamp order
    if (curr.timestamp < prev.timestamp) {
      console.warn('Events not in chronological order:', prev.id, curr.id);
      return false;
    }
    
    // Check sequence order
    if (curr.sequence <= prev.sequence) {
      console.warn('Event sequence numbers not increasing:', prev.sequence, curr.sequence);
      return false;
    }
  }
  
  return true;
};

/**
 * Create event storage structure
 */
const createEventStorage = (events = [], metadata = {}) => {
  return {
    matchId: metadata.matchId || generateEventId(),
    version: '1.0.0',
    created: metadata.created || Date.now(),
    lastUpdated: Date.now(),
    checksum: '',
    events: events,
    goalScorers: metadata.goalScorers || {},
    corrections: metadata.corrections || {},
    metadata: {
      ...metadata,
      eventCount: events.length,
      lastSequence: eventSequenceNumber
    }
  };
};

/**
 * Save events to localStorage with backup
 */
const saveEvents = (events, metadata = {}) => {
  try {
    const storage = createEventStorage(events, metadata);
    storage.checksum = calculateChecksum(storage);
    
    // Create backup before saving primary
    const existing = localStorage.getItem(STORAGE_KEYS.PRIMARY);
    if (existing) {
      const backup = {
        primary: JSON.parse(existing),
        backupTimestamp: Date.now(),
        reason: 'auto_backup'
      };
      localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(backup));
    }
    
    // Save primary
    localStorage.setItem(STORAGE_KEYS.PRIMARY, JSON.stringify(storage));
    
    // Update current state
    currentEvents = [...events];
    
    // Notify listeners
    notifyEventListeners('events_saved', { events, metadata });
    
    return true;
  } catch (error) {
    console.error('Failed to save events:', error);
    return false;
  }
};

/**
 * Load events from localStorage with validation
 */
export const loadEvents = () => {
  try {
    const primary = localStorage.getItem(STORAGE_KEYS.PRIMARY);
    
    if (primary) {
      const storage = JSON.parse(primary);
      
      // Validate checksum
      const expectedChecksum = storage.checksum;
      const actualChecksum = calculateChecksum({
        ...storage,
        checksum: ''
      });
      
      if (expectedChecksum !== actualChecksum) {
        console.warn('Primary storage checksum mismatch, attempting backup recovery');
        return loadFromBackup();
      }
      
      // Validate event sequence
      if (!validateEventSequence(storage.events)) {
        console.warn('Event sequence validation failed, attempting backup recovery');
        return loadFromBackup();
      }
      
      // Update global state
      currentEvents = storage.events || [];
      eventSequenceNumber = storage.metadata?.lastSequence || 0;
      
      // Find match start event to set global start time
      const matchStartEvent = currentEvents.find(e => e.type === EVENT_TYPES.MATCH_START);
      if (matchStartEvent) {
        matchStartTime = matchStartEvent.timestamp;
      }
      
      return storage;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load events:', error);
    return loadFromBackup();
  }
};

/**
 * Load from backup storage
 */
const loadFromBackup = () => {
  try {
    const backup = localStorage.getItem(STORAGE_KEYS.BACKUP);
    
    if (backup) {
      const backupData = JSON.parse(backup);
      const storage = backupData.primary;
      
      if (storage && storage.events) {
        console.log('Successfully restored from backup');
        
        // Update global state
        currentEvents = storage.events;
        eventSequenceNumber = storage.metadata?.lastSequence || 0;
        
        return storage;
      }
    }
    
    console.warn('No valid backup found, starting with empty events');
    return createEventStorage();
  } catch (error) {
    console.error('Failed to load backup:', error);
    return createEventStorage();
  }
};

/**
 * Main event logging function
 * @param {string} type - Event type from EVENT_TYPES
 * @param {Object} data - Event data
 * @param {number} [customTimestamp] - Optional custom timestamp for when event actually occurred
 */
export const logEvent = (type, data = {}, customTimestamp = null) => {
  try {
    // Validate event type
    if (!Object.values(EVENT_TYPES).includes(type)) {
      throw new Error(`Invalid event type: ${type}`);
    }
    
    const timestamp = customTimestamp || Date.now();
    eventSequenceNumber++;
    
    const event = {
      id: data.eventId || generateEventId(),
      type,
      timestamp,
      matchTime: calculateMatchTime(timestamp),
      periodNumber: data.periodNumber || null,
      sequence: eventSequenceNumber,
      data: { ...data },
      undone: false,
      relatedEventId: data.relatedEventId || null
    };
    
    // Validate event structure
    const validationErrors = validateEvent(event);
    if (validationErrors.length > 0) {
      throw new Error(`Event validation failed: ${validationErrors.join(', ')}`);
    }
    
    // Special handling for match start
    if (type === EVENT_TYPES.MATCH_START) {
      matchStartTime = timestamp;
      event.matchTime = '00:00';
    }
    
    // Add to current events
    const newEvents = [...currentEvents, event];
    
    // Save to storage
    const saveSuccess = saveEvents(newEvents, {
      goalScorers: data.goalScorers,
      corrections: data.corrections
    });
    
    if (!saveSuccess) {
      throw new Error('Failed to save event to storage');
    }
    
    return event;
  } catch (error) {
    console.error('Failed to log event:', error);
    throw error;
  }
};

/**
 * Remove event (for undo operations)
 */
export const removeEvent = (eventId) => {
  try {
    const eventIndex = currentEvents.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      console.warn(`Event not found for removal: ${eventId}`);
      return false;
    }
    
    const removedEvent = currentEvents[eventIndex];
    const newEvents = currentEvents.filter(e => e.id !== eventId);
    
    const saveSuccess = saveEvents(newEvents);
    
    if (saveSuccess) {
      console.log(`Event removed: ${removedEvent.type} (${eventId})`);
      notifyEventListeners('event_removed', { removedEvent });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to remove event:', error);
    return false;
  }
};

/**
 * Mark event as undone without removing it
 */
export const markEventAsUndone = (eventId, undoReason = 'user_action') => {
  try {
    const eventIndex = currentEvents.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      console.warn(`Event not found for undo marking: ${eventId}`);
      return false;
    }
    
    const newEvents = [...currentEvents];
    newEvents[eventIndex] = {
      ...newEvents[eventIndex],
      undone: true,
      undoTimestamp: Date.now(),
      undoReason
    };
    
    const saveSuccess = saveEvents(newEvents);
    
    if (saveSuccess) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to mark event as undone:', error);
    return false;
  }
};

/**
 * Get match events with filtering options
 */
export const getMatchEvents = (options = {}) => {
  const {
    includeUndone = false,
    eventTypes = null,
    startTime = null,
    endTime = null
  } = options;
  
  let filteredEvents = [...currentEvents];
  
  // Filter undone events
  if (!includeUndone) {
    filteredEvents = filteredEvents.filter(e => !e.undone);
  }
  
  // Filter by event types
  if (eventTypes && Array.isArray(eventTypes)) {
    filteredEvents = filteredEvents.filter(e => eventTypes.includes(e.type));
  }
  
  // Filter by time range
  if (startTime) {
    filteredEvents = filteredEvents.filter(e => e.timestamp >= startTime);
  }
  if (endTime) {
    filteredEvents = filteredEvents.filter(e => e.timestamp <= endTime);
  }
  
  return filteredEvents;
};

/**
 * Get event by ID
 */
export const getEventById = (eventId) => {
  return currentEvents.find(e => e.id === eventId) || null;
};

/**
 * Calculate effective playing time
 */
export const getEffectivePlayingTime = () => {
  const events = getMatchEvents();
  
  const pauseEvents = events.filter(e => 
    e.type === EVENT_TYPES.TIMER_PAUSED || 
    e.type === EVENT_TYPES.PERIOD_PAUSED
  );
  
  const resumeEvents = events.filter(e => 
    e.type === EVENT_TYPES.TIMER_RESUMED || 
    e.type === EVENT_TYPES.PERIOD_RESUMED
  );
  
  let totalPausedTime = 0;
  
  // Calculate pause durations
  for (let i = 0; i < pauseEvents.length; i++) {
    const pauseEvent = pauseEvents[i];
    const correspondingResume = resumeEvents.find(r => 
      r.timestamp > pauseEvent.timestamp && 
      (!resumeEvents[i - 1] || r.timestamp > resumeEvents[i - 1].timestamp)
    );
    
    if (correspondingResume) {
      totalPausedTime += correspondingResume.timestamp - pauseEvent.timestamp;
    } else {
      // Handle ongoing pause - pause time from pause event to current time
      const currentTime = Date.now();
      if (pauseEvent.timestamp < currentTime) {
        totalPausedTime += currentTime - pauseEvent.timestamp;
      }
    }
  }
  
  // Get total match time
  const matchStart = events.find(e => e.type === EVENT_TYPES.MATCH_START);
  const matchEnd = events.find(e => e.type === EVENT_TYPES.MATCH_END);
  
  if (!matchStart) return 0;
  
  const endTime = matchEnd ? matchEnd.timestamp : Date.now();
  const totalTime = endTime - matchStart.timestamp;
  
  return Math.max(0, totalTime - totalPausedTime);
};

/**
 * Event listener management
 */
export const addEventListener = (callback) => {
  eventListeners.push(callback);
  return () => {
    const index = eventListeners.indexOf(callback);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  };
};

const notifyEventListeners = (eventType, data) => {
  eventListeners.forEach(callback => {
    try {
      callback(eventType, data);
    } catch (error) {
      console.error('Event listener error:', error);
    }
  });
};

/**
 * Clear all events (for testing or reset)
 */
export const clearAllEvents = () => {
  try {
    currentEvents = [];
    eventSequenceNumber = 0;
    matchStartTime = null;
    
    localStorage.removeItem(STORAGE_KEYS.PRIMARY);
    localStorage.removeItem(STORAGE_KEYS.BACKUP);
    localStorage.removeItem(STORAGE_KEYS.EMERGENCY);
    
    notifyEventListeners('events_cleared', {});
    
    return true;
  } catch (error) {
    console.error('Failed to clear events:', error);
    return false;
  }
};

/**
 * Get the match start time
 */
export const getMatchStartTime = () => {
  return matchStartTime;
};

/**
 * Get all current events
 */
export const getAllEvents = () => {
  return [...currentEvents];
};

/**
 * Update event data in place (for score corrections)
 */
export const updateEventData = (eventId, newData) => {
  try {
    const eventIndex = currentEvents.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      console.warn(`Event not found for data update: ${eventId}`);
      return false;
    }
    
    const newEvents = [...currentEvents];
    newEvents[eventIndex] = {
      ...newEvents[eventIndex],
      data: {
        ...newEvents[eventIndex].data,
        ...newData
      }
    };
    
    const saveSuccess = saveEvents(newEvents);
    
    if (saveSuccess) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to update event data:', error);
    return false;
  }
};

/**
 * Initialize event logger
 */
export const initializeEventLogger = () => {
  const storage = loadEvents();
  
  if (storage) {
    console.log(`Event logger initialized with ${storage.events.length} events`);
  } else {
    console.log('Event logger initialized with empty state');
  }
  
  return storage;
};

// Initialize on module load
initializeEventLogger();