/**
 * Utility functions for processing match report data
 * Handles match summary generation, player statistics processing, and event timeline formatting
 */

import { EVENT_TYPES } from './gameEventLogger';
import { PLAYER_ROLES, PLAYER_STATUS, TEAM_MODES } from '../constants/playerConstants';
import { getSelectedSquadPlayers, findPlayerById } from './playerUtils';
import { formatTime } from './formatUtils';
import { MODE_DEFINITIONS } from '../constants/gameModes';

/**
 * Generate comprehensive match summary from match events and game log
 * @param {Array} matchEvents - Array of match events from gameEventLogger
 * @param {Array} gameLog - Array of game log entries
 * @param {number} homeScore - Final home team score
 * @param {number} awayScore - Final away team score
 * @returns {Object} Match summary with duration, timestamps, and statistics
 */
export const generateMatchSummary = (matchEvents, gameLog, homeScore = 0, awayScore = 0) => {
  try {
    // Input validation
    if (!Array.isArray(matchEvents)) {
      console.warn('generateMatchSummary: matchEvents is not an array');
      matchEvents = [];
    }
    if (!Array.isArray(gameLog)) {
      console.warn('generateMatchSummary: gameLog is not an array');
      gameLog = [];
    }

    // Find match start and end events
    const matchStartEvent = matchEvents.find(e => e.type === EVENT_TYPES.MATCH_START && !e.undone);
    const matchEndEvent = matchEvents.find(e => e.type === EVENT_TYPES.MATCH_END && !e.undone);

    // Calculate match duration
    let matchDurationMs = 0;
    let matchStartTime = null;
    let matchEndTime = null;

    if (matchStartEvent) {
      matchStartTime = matchStartEvent.timestamp;
      const endTime = matchEndEvent ? matchEndEvent.timestamp : Date.now();
      matchEndTime = matchEndEvent ? matchEndEvent.timestamp : null;
      matchDurationMs = endTime - matchStartTime;
    }

    // Calculate effective playing time (excluding pauses)
    const effectivePlayingTimeMs = calculateEffectivePlayingTime(matchEvents);

    // Generate summary statistics
    const summary = {
      matchStartTime,
      matchEndTime,
      matchDurationMs,
      matchDurationFormatted: formatTime(Math.floor(matchDurationMs / 1000)),
      effectivePlayingTimeMs,
      effectivePlayingTimeFormatted: formatTime(Math.floor(effectivePlayingTimeMs / 1000)),
      homeScore,
      awayScore,
      isMatchComplete: !!matchEndEvent,
      totalEvents: matchEvents.length,
      activeEvents: matchEvents.filter(e => !e.undone).length,
      eventsByType: getEventCountsByType(matchEvents),
      pauseCount: matchEvents.filter(e => 
        (e.type === EVENT_TYPES.TIMER_PAUSED || e.type === EVENT_TYPES.PERIOD_PAUSED) && !e.undone
      ).length,
      totalPauseTimeMs: matchDurationMs - effectivePlayingTimeMs
    };

    return summary;
  } catch (error) {
    console.error('Error generating match summary:', error);
    return {
      matchStartTime: null,
      matchEndTime: null,
      matchDurationMs: 0,
      matchDurationFormatted: '00:00',
      effectivePlayingTimeMs: 0,
      effectivePlayingTimeFormatted: '00:00',
      homeScore: 0,
      awayScore: 0,
      isMatchComplete: false,
      totalEvents: 0,
      activeEvents: 0,
      eventsByType: {},
      pauseCount: 0,
      totalPauseTimeMs: 0
    };
  }
};

/**
 * Process player statistics for match report
 * @param {Array} allPlayers - Array of all players
 * @param {Array} gameLog - Array of game log entries
 * @param {Array} selectedSquadIds - Array of selected squad player IDs
 * @returns {Array} Array of processed player statistics
 */
export const processPlayerStatistics = (allPlayers, gameLog, selectedSquadIds) => {
  try {
    // Input validation
    if (!Array.isArray(allPlayers)) {
      console.warn('processPlayerStatistics: allPlayers is not an array');
      return [];
    }
    if (!Array.isArray(selectedSquadIds)) {
      console.warn('processPlayerStatistics: selectedSquadIds is not an array');
      return [];
    }

    // Get only players who participated in the match
    const squadPlayers = getSelectedSquadPlayers(allPlayers, selectedSquadIds);

    // Process each player's statistics
    const processedStats = squadPlayers.map(player => {
      const stats = player.stats || {};
      
      // Determine starting role
      const startingRole = determinePlayerStartingRole(player, gameLog);
      
      // Calculate final time breakdowns
      const timeBreakdown = {
        timeOnFieldSeconds: stats.timeOnFieldSeconds || 0,
        timeAsDefenderSeconds: stats.timeAsDefenderSeconds || 0,
        timeAsAttackerSeconds: stats.timeAsAttackerSeconds || 0,
        timeAsGoalieSeconds: stats.timeAsGoalieSeconds || 0,
        timeAsSubSeconds: stats.timeAsSubSeconds || 0
      };

      // Calculate total time
      const totalActiveTime = timeBreakdown.timeOnFieldSeconds + timeBreakdown.timeAsGoalieSeconds;

      // Calculate role distribution percentages
      const roleDistribution = {
        defenderPercentage: totalActiveTime > 0 ? (timeBreakdown.timeAsDefenderSeconds / totalActiveTime) * 100 : 0,
        attackerPercentage: totalActiveTime > 0 ? (timeBreakdown.timeAsAttackerSeconds / totalActiveTime) * 100 : 0,
        goaliePercentage: totalActiveTime > 0 ? (timeBreakdown.timeAsGoalieSeconds / totalActiveTime) * 100 : 0
      };

      return {
        id: player.id,
        name: player.name,
        startingRole,
        timeBreakdown,
        totalActiveTime,
        roleDistribution,
        // Formatted times for display
        formattedTimes: {
          timeOnField: formatTime(timeBreakdown.timeOnFieldSeconds),
          timeAsDefender: formatTime(timeBreakdown.timeAsDefenderSeconds),
          timeAsAttacker: formatTime(timeBreakdown.timeAsAttackerSeconds),
          timeAsGoalie: formatTime(timeBreakdown.timeAsGoalieSeconds),
          timeAsSub: formatTime(timeBreakdown.timeAsSubSeconds),
          totalActive: formatTime(totalActiveTime)
        }
      };
    });

    // Sort by total active time (descending)
    processedStats.sort((a, b) => b.totalActiveTime - a.totalActiveTime);

    return processedStats;
  } catch (error) {
    console.error('Error processing player statistics:', error);
    return [];
  }
};

/**
 * Format event timeline for display
 * @param {Array} matchEvents - Array of match events
 * @param {Object} options - Formatting options
 * @returns {Array} Formatted event timeline
 */
export const formatEventTimeline = (matchEvents, options = {}) => {
  try {
    const {
      includeUndone = false,
      hideSubstitutions = false,
      hideTimerEvents = false,
      hideGoalEvents = false,
      groupRelatedEvents = false
    } = options;

    // Input validation
    if (!Array.isArray(matchEvents)) {
      console.warn('formatEventTimeline: matchEvents is not an array');
      return [];
    }

    // Filter events based on options
    let filteredEvents = matchEvents.filter(event => {
      // Filter undone events
      if (!includeUndone && event.undone) {
        return false;
      }

      // Filter by event type
      if (hideSubstitutions && isSubstitutionEvent(event.type)) {
        return false;
      }
      if (hideTimerEvents && isTimerEvent(event.type)) {
        return false;
      }
      if (hideGoalEvents && isGoalEvent(event.type)) {
        return false;
      }

      return true;
    });

    // Sort events chronologically
    filteredEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Group related events if requested
    if (groupRelatedEvents) {
      filteredEvents = groupEventsByRelation(filteredEvents);
    }

    // Format events for display
    const formattedEvents = filteredEvents.map((event, index) => {
      const baseEvent = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        matchTime: event.matchTime,
        sequence: event.sequence,
        undone: event.undone,
        data: event.data || {},
        displayIndex: index + 1
      };

      // Add event-specific formatting
      return formatEventForDisplay(baseEvent);
    });

    return formattedEvents;
  } catch (error) {
    console.error('Error formatting event timeline:', error);
    return [];
  }
};

/**
 * Calculate effective playing time (total time minus paused time)
 * @param {Array} matchEvents - Array of match events
 * @returns {number} Effective playing time in milliseconds
 */
export const calculateEffectivePlayingTime = (matchEvents) => {
  try {
    if (!Array.isArray(matchEvents)) {
      console.warn('calculateEffectivePlayingTime: matchEvents is not an array');
      return 0;
    }

    const activeEvents = matchEvents.filter(e => !e.undone);

    // Find match start and end
    const matchStartEvent = activeEvents.find(e => e.type === EVENT_TYPES.MATCH_START);
    const matchEndEvent = activeEvents.find(e => e.type === EVENT_TYPES.MATCH_END);

    if (!matchStartEvent) {
      return 0;
    }

    // Calculate total match time
    const endTime = matchEndEvent ? matchEndEvent.timestamp : Date.now();
    const totalMatchTime = endTime - matchStartEvent.timestamp;

    // Calculate total paused time
    const pauseEvents = activeEvents.filter(e => 
      e.type === EVENT_TYPES.TIMER_PAUSED || 
      e.type === EVENT_TYPES.PERIOD_PAUSED
    );

    const resumeEvents = activeEvents.filter(e => 
      e.type === EVENT_TYPES.TIMER_RESUMED || 
      e.type === EVENT_TYPES.PERIOD_RESUMED
    );

    let totalPausedTime = 0;

    // Calculate pause durations
    for (let i = 0; i < pauseEvents.length; i++) {
      const pauseEvent = pauseEvents[i];
      const correspondingResume = resumeEvents.find(r => 
        r.timestamp > pauseEvent.timestamp && 
        (!pauseEvents[i + 1] || r.timestamp < pauseEvents[i + 1].timestamp)
      );

      if (correspondingResume) {
        totalPausedTime += correspondingResume.timestamp - pauseEvent.timestamp;
      } else {
        // Handle ongoing pause - add time from pause event to end of match
        totalPausedTime += endTime - pauseEvent.timestamp;
      }
    }

    return Math.max(0, totalMatchTime - totalPausedTime);
  } catch (error) {
    console.error('Error calculating effective playing time:', error);
    return 0;
  }
};

/**
 * Determine player starting roles from game log
 * @param {Array} players - Array of players
 * @param {Array} gameLog - Array of game log entries
 * @returns {Object} Object mapping player ID to starting role
 */
export const determinePlayerStartingRoles = (players, gameLog) => {
  try {
    if (!Array.isArray(players)) {
      console.warn('determinePlayerStartingRoles: players is not an array');
      return {};
    }

    const startingRoles = {};

    // Initialize all players as having no starting role
    players.forEach(player => {
      startingRoles[player.id] = null;
    });

    // Use player stats if available (most reliable source)
    players.forEach(player => {
      if (player.stats?.startedMatchAs) {
        startingRoles[player.id] = player.stats.startedMatchAs;
      }
    });

    // Fallback to game log analysis if needed
    if (Array.isArray(gameLog) && gameLog.length > 0) {
      // Find the first formation in the game log
      const firstFormationEntry = gameLog.find(entry => 
        entry.type === 'formation' || entry.data?.periodFormation
      );

      if (firstFormationEntry) {
        analyzeFormationForStartingRoles(firstFormationEntry, startingRoles);
      }
    }

    return startingRoles;
  } catch (error) {
    console.error('Error determining player starting roles:', error);
    return {};
  }
};

// Helper functions

/**
 * Determine individual player starting role
 * @param {Object} player - Player object
 * @param {Array} gameLog - Array of game log entries
 * @returns {string} Starting role
 */
const determinePlayerStartingRole = (player, gameLog) => {
  // Use player stats if available
  if (player.stats?.startedMatchAs) {
    return player.stats.startedMatchAs;
  }

  // Fallback to analyzing game log
  if (Array.isArray(gameLog) && gameLog.length > 0) {
    const firstFormationEntry = gameLog.find(entry => 
      entry.type === 'formation' || entry.data?.periodFormation
    );

    if (firstFormationEntry) {
      return analyzePlayerStartingRoleFromFormation(player.id, firstFormationEntry);
    }
  }

  return 'Unknown';
};

/**
 * Analyze formation entry to determine starting roles
 * @param {Object} formationEntry - Game log entry with formation data
 * @param {Object} startingRoles - Object to update with starting roles
 */
const analyzeFormationForStartingRoles = (formationEntry, startingRoles) => {
  try {
    const formation = formationEntry.data?.periodFormation || formationEntry.periodFormation;
    
    if (!formation) {
      return;
    }

    // Identify goalie
    if (formation.goalie) {
      startingRoles[formation.goalie] = PLAYER_ROLES.GOALIE;
    }

    // Identify field players and substitutes based on formation structure
    Object.entries(formation).forEach(([positionKey, playerId]) => {
      if (positionKey === 'goalie' || !playerId) {
        return;
      }

      // Determine if this is a field position or substitute position
      const isFieldPosition = isFieldPositionKey(positionKey);
      const isSubstitutePosition = isSubstitutePositionKey(positionKey);

      if (isFieldPosition) {
        startingRoles[playerId] = PLAYER_ROLES.ON_FIELD;
      } else if (isSubstitutePosition) {
        startingRoles[playerId] = PLAYER_ROLES.SUBSTITUTE;
      }
    });
  } catch (error) {
    console.error('Error analyzing formation for starting roles:', error);
  }
};

/**
 * Analyze player starting role from formation
 * @param {string} playerId - Player ID
 * @param {Object} formationEntry - Game log entry with formation data
 * @returns {string} Starting role
 */
const analyzePlayerStartingRoleFromFormation = (playerId, formationEntry) => {
  try {
    const formation = formationEntry.data?.periodFormation || formationEntry.periodFormation;
    
    if (!formation) {
      return 'Unknown';
    }

    // Check if player is goalie
    if (formation.goalie === playerId) {
      return PLAYER_ROLES.GOALIE;
    }

    // Find player's position in formation
    const playerPosition = Object.entries(formation).find(([_, id]) => id === playerId);
    
    if (!playerPosition) {
      return 'Unknown';
    }

    const [positionKey] = playerPosition;

    // Determine role based on position
    if (isFieldPositionKey(positionKey)) {
      return PLAYER_ROLES.ON_FIELD;
    } else if (isSubstitutePositionKey(positionKey)) {
      return PLAYER_ROLES.SUBSTITUTE;
    }

    return 'Unknown';
  } catch (error) {
    console.error('Error analyzing player starting role from formation:', error);
    return 'Unknown';
  }
};

/**
 * Check if position key represents a field position
 * @param {string} positionKey - Position key to check
 * @returns {boolean} True if field position
 */
const isFieldPositionKey = (positionKey) => {
  const fieldPositionKeys = [
    'leftPair', 'rightPair',
    'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker',
    'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'
  ];
  return fieldPositionKeys.includes(positionKey);
};

/**
 * Check if position key represents a substitute position
 * @param {string} positionKey - Position key to check
 * @returns {boolean} True if substitute position
 */
const isSubstitutePositionKey = (positionKey) => {
  const substitutePositionKeys = [
    'subPair', 'substitute', 'substitute7_1', 'substitute7_2'
  ];
  return substitutePositionKeys.includes(positionKey);
};

/**
 * Get event counts by type
 * @param {Array} matchEvents - Array of match events
 * @returns {Object} Object with event type counts
 */
const getEventCountsByType = (matchEvents) => {
  const counts = {};
  
  matchEvents.forEach(event => {
    if (!event.undone) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
  });

  return counts;
};

/**
 * Check if event type is a substitution event
 * @param {string} eventType - Event type to check
 * @returns {boolean} True if substitution event
 */
const isSubstitutionEvent = (eventType) => {
  const substitutionTypes = [
    EVENT_TYPES.SUBSTITUTION,
    EVENT_TYPES.SUBSTITUTION_UNDONE,
    EVENT_TYPES.GOALIE_SWITCH,
    EVENT_TYPES.POSITION_CHANGE
  ];
  return substitutionTypes.includes(eventType);
};

/**
 * Check if event type is a timer event
 * @param {string} eventType - Event type to check
 * @returns {boolean} True if timer event
 */
const isTimerEvent = (eventType) => {
  const timerTypes = [
    EVENT_TYPES.TIMER_PAUSED,
    EVENT_TYPES.TIMER_RESUMED,
    EVENT_TYPES.PERIOD_PAUSED,
    EVENT_TYPES.PERIOD_RESUMED,
    EVENT_TYPES.TECHNICAL_TIMEOUT
  ];
  return timerTypes.includes(eventType);
};

/**
 * Check if event type is a goal event
 * @param {string} eventType - Event type to check
 * @returns {boolean} True if goal event
 */
const isGoalEvent = (eventType) => {
  const goalTypes = [
    EVENT_TYPES.GOAL_HOME,
    EVENT_TYPES.GOAL_AWAY,
    EVENT_TYPES.GOAL_CORRECTED,
    EVENT_TYPES.GOAL_UNDONE
  ];
  return goalTypes.includes(eventType);
};

/**
 * Group events by relation
 * @param {Array} events - Array of events
 * @returns {Array} Array of events with grouped relations
 */
const groupEventsByRelation = (events) => {
  // This is a placeholder for more sophisticated event grouping logic
  // For now, just return events as-is
  return events;
};

/**
 * Format event for display
 * @param {Object} event - Event object
 * @returns {Object} Formatted event object
 */
const formatEventForDisplay = (event) => {
  const formatted = { ...event };

  // Add human-readable description
  formatted.description = generateEventDescription(event);

  // Add display category
  formatted.category = categorizeEvent(event.type);

  // Add severity level
  formatted.severity = getEventSeverity(event.type);

  return formatted;
};

/**
 * Generate human-readable event description
 * @param {Object} event - Event object
 * @returns {string} Human-readable description
 */
const generateEventDescription = (event) => {
  const { type, data } = event;

  switch (type) {
    case EVENT_TYPES.MATCH_START:
      return 'Match started';
    case EVENT_TYPES.MATCH_END:
      return 'Match ended';
    case EVENT_TYPES.PERIOD_START:
      return `Period ${data.periodNumber || 'unknown'} started`;
    case EVENT_TYPES.PERIOD_END:
      return `Period ${data.periodNumber || 'unknown'} ended`;
    case EVENT_TYPES.SUBSTITUTION:
      return 'Player substitution';
    case EVENT_TYPES.GOALIE_SWITCH:
      return 'Goalie switch';
    case EVENT_TYPES.POSITION_CHANGE:
      return 'Position change';
    case EVENT_TYPES.GOAL_HOME:
      return 'Goal scored (Home)';
    case EVENT_TYPES.GOAL_AWAY:
      return 'Goal scored (Away)';
    case EVENT_TYPES.TIMER_PAUSED:
      return 'Timer paused';
    case EVENT_TYPES.TIMER_RESUMED:
      return 'Timer resumed';
    default:
      return `Event: ${type}`;
  }
};

/**
 * Categorize event type
 * @param {string} eventType - Event type
 * @returns {string} Event category
 */
const categorizeEvent = (eventType) => {
  if (isSubstitutionEvent(eventType)) {
    return 'substitution';
  }
  if (isTimerEvent(eventType)) {
    return 'timer';
  }
  if (isGoalEvent(eventType)) {
    return 'goal';
  }
  if ([EVENT_TYPES.MATCH_START, EVENT_TYPES.MATCH_END].includes(eventType)) {
    return 'match';
  }
  if ([EVENT_TYPES.PERIOD_START, EVENT_TYPES.PERIOD_END].includes(eventType)) {
    return 'period';
  }
  return 'other';
};

/**
 * Get event severity level
 * @param {string} eventType - Event type
 * @returns {string} Severity level
 */
const getEventSeverity = (eventType) => {
  const highSeverity = [
    EVENT_TYPES.MATCH_START,
    EVENT_TYPES.MATCH_END,
    EVENT_TYPES.MATCH_ABANDONED,
    EVENT_TYPES.MATCH_SUSPENDED
  ];

  const mediumSeverity = [
    EVENT_TYPES.GOAL_HOME,
    EVENT_TYPES.GOAL_AWAY,
    EVENT_TYPES.PERIOD_START,
    EVENT_TYPES.PERIOD_END
  ];

  if (highSeverity.includes(eventType)) {
    return 'high';
  }
  if (mediumSeverity.includes(eventType)) {
    return 'medium';
  }
  return 'low';
};