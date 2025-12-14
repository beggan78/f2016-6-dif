import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Square,
  Trophy,
  Award,
  Pause,
  Clock,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { formatPlayerName } from '../../utils/formatUtils';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { TEAM_CONFIG } from '../../constants/teamConstants';

const getOrdinal = (event) => typeof event?.ordinal === 'number' ? event.ordinal : null;
const getTimestamp = (event) => typeof event?.timestamp === 'number' ? event.timestamp : null;
const getOccurredSeconds = (event) => typeof event?.occurredAtSeconds === 'number' ? event.occurredAtSeconds : null;
const getSourceIndex = (event) => typeof event?.__sourceIndex === 'number' ? event.__sourceIndex : Infinity;

export const compareEventsForSort = (a, b, sortOrder = 'asc') => {
  const ordA = getOrdinal(a);
  const ordB = getOrdinal(b);

  if (ordA !== null || ordB !== null) {
    if (ordA === null) return sortOrder === 'desc' ? 1 : -1;
    if (ordB === null) return sortOrder === 'desc' ? -1 : 1;
    if (ordA !== ordB) return sortOrder === 'desc' ? ordB - ordA : ordA - ordB;
  }

  const timeA = getTimestamp(a);
  const timeB = getTimestamp(b);
  if (timeA !== null || timeB !== null) {
    if (timeA === null) return sortOrder === 'desc' ? 1 : -1;
    if (timeB === null) return sortOrder === 'desc' ? -1 : 1;
    if (timeA !== timeB) return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  }

  const occA = getOccurredSeconds(a);
  const occB = getOccurredSeconds(b);
  if (occA !== null || occB !== null) {
    if (occA === null) return sortOrder === 'desc' ? 1 : -1;
    if (occB === null) return sortOrder === 'desc' ? -1 : 1;
    if (occA !== occB) return sortOrder === 'desc' ? occB - occA : occA - occB;
  }

  const idxA = getSourceIndex(a);
  const idxB = getSourceIndex(b);
  return idxA - idxB;
};

// Timeline preferences persistence manager
const timelinePrefsManager = createPersistenceManager(STORAGE_KEYS.TIMELINE_PREFERENCES, {
  sortOrder: 'asc'
});

/**
 * GameEventTimeline - Timeline component for displaying match events
 * 
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of event objects from gameEventLogger
 * @param {boolean} props.showSubstitutions - Whether to show substitution events
 * @param {Function} props.onEventFilter - Callback for filter changes
 * @param {Object} props.goalScorers - Object mapping event IDs to player IDs
 * @param {Function} props.getPlayerName - Function to get player name by ID
 * @param {Function} props.onGoalClick - Callback for goal events, for editing
 * @param {string} props.ownTeamName - Own team name
 * @param {string} props.opponentTeam - Opponent team name
 * @param {number} props.matchStartTime - Match start timestamp
 * @param {string} props.filterType - Current filter type
 * @param {string} props.selectedPlayerId - Currently selected player ID for filtering (null for "All")
 * @param {Array} props.availablePlayers - Array of available players for the filter dropdown
 * @param {Function} props.onPlayerFilterChange - Callback when player filter selection changes
 * @param {boolean} props.debugMode - Whether debug mode is active (shows SUBSTITUTION_UNDONE events)
 */
export function GameEventTimeline({
  events = [],
  showSubstitutions = false,
  onEventFilter,
  goalScorers = {},
  getPlayerName,
  onGoalClick,
  ownTeamName = TEAM_CONFIG.OWN_TEAM_NAME,
  opponentTeam = "Opponent",
  matchStartTime,
  filterType = 'all',
  selectedPlayerId = null,
  availablePlayers = [],
  onPlayerFilterChange,
  debugMode = false
}) {
  // Load sort preference using PersistenceManager, default to 'asc' (oldest first)
  const [sortOrder, setSortOrder] = useState(() => {
    const preferences = timelinePrefsManager.loadState();
    return preferences.sortOrder;
  });
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  // Save sort preference using PersistenceManager when it changes
  useEffect(() => {
    timelinePrefsManager.saveState({ sortOrder });
  }, [sortOrder]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Filter out undone events unless they're marked as corrections
    filtered = filtered.filter(event => 
      !event.undone || event.type === EVENT_TYPES.GOAL_CORRECTED
    );

    // Filter out SUBSTITUTION_UNDONE events unless debug mode is active
    if (!debugMode) {
      filtered = filtered.filter(event => 
        event.type !== EVENT_TYPES.SUBSTITUTION_UNDONE
      );
    }

    // Filter by selected player if one is selected
    if (selectedPlayerId) {
      filtered = filtered.filter(event => {
        const { type, data } = event;
        const eventData = data || {};
        
        // Always show match/period events
        if (type === EVENT_TYPES.MATCH_START || type === EVENT_TYPES.MATCH_END || 
            type === EVENT_TYPES.PERIOD_START || type === EVENT_TYPES.PERIOD_END ||
            type === EVENT_TYPES.INTERMISSION) {
          return true;
        }
        
        // Show goal events if the selected player is the scorer
        if (type === EVENT_TYPES.GOAL_SCORED || type === EVENT_TYPES.GOAL_CONCEDED) {
          const scorerId = goalScorers[event.id] || eventData.scorerId;
          return scorerId === selectedPlayerId;
        }
        
        // Show substitution events if the selected player is involved
        if (type === EVENT_TYPES.SUBSTITUTION) {
          const playersOff = eventData.playersOff || (eventData.outPlayerId ? [eventData.outPlayerId] : []);
          const playersOn = eventData.playersOn || (eventData.inPlayerId ? [eventData.inPlayerId] : []);
          return playersOff.includes(selectedPlayerId) || playersOn.includes(selectedPlayerId);
        }
        
        // Show goalie switch events if the selected player is involved
        if (type === EVENT_TYPES.GOALIE_SWITCH) {
          return eventData.oldGoalieId === selectedPlayerId || eventData.newGoalieId === selectedPlayerId;
        }
        
        // Show goalie assignment events if the selected player is involved
        if (type === EVENT_TYPES.GOALIE_ASSIGNMENT) {
          return eventData.goalieId === selectedPlayerId;
        }

        if (type === EVENT_TYPES.GOALIE_SWITCH) {
          if (eventData.oldGoalieId === selectedPlayerId || eventData.newGoalieId === selectedPlayerId) {
            return true;
          }
          const goalieChanges = Array.isArray(eventData.positionChanges) ? eventData.positionChanges : [];
          return goalieChanges.some(change => change.playerId === selectedPlayerId);
        }
        
        // Show position change events if the selected player is involved
        if (type === EVENT_TYPES.POSITION_CHANGE) {
          if (eventData.player1Id === selectedPlayerId || eventData.player2Id === selectedPlayerId) {
            return true;
          }
          const positionChanges = Array.isArray(eventData.positionChanges) ? eventData.positionChanges : [];
          return positionChanges.some(change => change.playerId === selectedPlayerId);
        }

        // Show player inactivation/activation events if the selected player is involved
        if (type === EVENT_TYPES.PLAYER_INACTIVATED || type === EVENT_TYPES.PLAYER_ACTIVATED) {
          return event.playerId === selectedPlayerId;
        }

        if (type === EVENT_TYPES.FAIR_PLAY_AWARD) {
          return event.playerId === selectedPlayerId;
        }

        // Hide other events for specific player filter
        return false;
      });
    }

    // Sort by ordinal first, then timestamp, respecting requested order
    filtered.sort((a, b) => compareEventsForSort(a, b, sortOrder));

    return filtered;
  }, [events, sortOrder, selectedPlayerId, goalScorers, debugMode]);

  // Group events by periods and process intermissions
  const groupedEventsByPeriod = useMemo(() => {
    const groups = {};
    let intermissionEvents = [];
    let matchStartEvent = null;
    let matchEndEvent = null;
    let fairPlayAwardEvent = null;
    
    filteredAndSortedEvents.forEach(event => {
      // Handle match-level events specially (not grouped with periods)
      if (event.type === EVENT_TYPES.MATCH_START) {
        matchStartEvent = event;
        return;
      }
      
      if (event.type === EVENT_TYPES.MATCH_END) {
        matchEndEvent = event;
        return;
      }

      if (event.type === EVENT_TYPES.FAIR_PLAY_AWARD) {
        fairPlayAwardEvent = event;
        return;
      }
      
      // Handle intermission events specially
      if (event.type === EVENT_TYPES.INTERMISSION) {
        intermissionEvents.push(event);
        return;
      }
      
      // Get period number from event data or default to 1
      const periodNumber = event.periodNumber || event.data?.periodNumber || 1;
      
      if (!groups[periodNumber]) {
        groups[periodNumber] = [];
      }
      
      groups[periodNumber].push(event);
    });
    
    // Process intermissions to calculate durations
    const processedIntermissions = {};
    const intermissionStarts = intermissionEvents.filter(e => e.data?.intermissionType === 'start');
    const intermissionEnds = intermissionEvents.filter(e => e.data?.intermissionType === 'end');
    
    intermissionStarts.forEach(startEvent => {
      const followingPeriod = startEvent.data?.followingPeriodNumber;
      if (followingPeriod) {
        const endEvent = intermissionEnds.find(e => e.data?.precedingPeriodNumber === followingPeriod - 1);
        if (endEvent) {
          const duration = endEvent.timestamp - startEvent.timestamp;
          processedIntermissions[followingPeriod] = {
            startEvent,
            endEvent,
            duration,
            durationMinutes: Math.floor(duration / 60000),
            durationSeconds: Math.floor((duration % 60000) / 1000)
          };
        }
      }
    });
    
    return { groups, intermissions: processedIntermissions, matchStartEvent, matchEndEvent, fairPlayAwardEvent };
  }, [filteredAndSortedEvents]);

  // Get event icon based on type
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case EVENT_TYPES.MATCH_START:
      case EVENT_TYPES.PERIOD_START:
        return Play;
      case EVENT_TYPES.MATCH_END:
      case EVENT_TYPES.PERIOD_END:
        return Square;
      case EVENT_TYPES.INTERMISSION:
        return Clock;
      case EVENT_TYPES.GOAL_SCORED:
      case EVENT_TYPES.GOAL_CONCEDED:
        return Trophy;
      case EVENT_TYPES.SUBSTITUTION:
      case EVENT_TYPES.GOALIE_SWITCH:
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        return ArrowUpDown;
      case EVENT_TYPES.TIMER_PAUSED:
      case EVENT_TYPES.PERIOD_PAUSED:
        return Pause;
      case EVENT_TYPES.TIMER_RESUMED:
      case EVENT_TYPES.PERIOD_RESUMED:
        return Play;
      case EVENT_TYPES.POSITION_CHANGE:
        return ArrowUpDown;
      case EVENT_TYPES.GOAL_CORRECTED:
        return CheckCircle;
      case EVENT_TYPES.GOAL_UNDONE:
        return XCircle;
      case EVENT_TYPES.SUBSTITUTION_UNDONE:
        return XCircle;
      case EVENT_TYPES.FAIR_PLAY_AWARD:
        return Award;
      case EVENT_TYPES.TECHNICAL_TIMEOUT:
        return AlertCircle;
      default:
        return Clock;
    }
  };

  // Get event color based on type
  const getEventColor = (eventType, isUndone = false) => {
    if (isUndone) return 'text-slate-500';
    
    switch (eventType) {
      case EVENT_TYPES.MATCH_START:
      case EVENT_TYPES.MATCH_END:
        return 'text-sky-400';
      case EVENT_TYPES.PERIOD_START:
      case EVENT_TYPES.PERIOD_END:
        return 'text-blue-400';
      case EVENT_TYPES.INTERMISSION:
        return 'text-slate-400';
      case EVENT_TYPES.GOAL_SCORED:
      case EVENT_TYPES.GOAL_CONCEDED:
        return 'text-yellow-400';
      case EVENT_TYPES.SUBSTITUTION:
      case EVENT_TYPES.POSITION_CHANGE:
        return 'text-cyan-400';
      case EVENT_TYPES.GOALIE_SWITCH:
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        return 'text-purple-400';
      case EVENT_TYPES.FAIR_PLAY_AWARD:
        return 'text-emerald-300';
      case EVENT_TYPES.TIMER_PAUSED:
      case EVENT_TYPES.PERIOD_PAUSED:
        return 'text-orange-400';
      case EVENT_TYPES.TIMER_RESUMED:
      case EVENT_TYPES.PERIOD_RESUMED:
        return 'text-green-400';
      case EVENT_TYPES.GOAL_CORRECTED:
        return 'text-green-400';
      case EVENT_TYPES.GOAL_UNDONE:
      case EVENT_TYPES.SUBSTITUTION_UNDONE:
        return 'text-red-400';
      case EVENT_TYPES.TECHNICAL_TIMEOUT:
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  // Get event background color for the container
  const getEventBackgroundColor = (eventType, isUndone = false) => {
    if (isUndone) return 'bg-slate-700/50';
    
    switch (eventType) {
      case EVENT_TYPES.GOAL_SCORED:
      case EVENT_TYPES.GOAL_CONCEDED:
        return 'bg-yellow-400/40 border-yellow-400/60';
      case EVENT_TYPES.SUBSTITUTION:
      case EVENT_TYPES.POSITION_CHANGE:
        return 'bg-cyan-900/20 border-cyan-700/30';
      case EVENT_TYPES.GOALIE_SWITCH:
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        return 'bg-purple-900/20 border-purple-700/30';
      case EVENT_TYPES.FAIR_PLAY_AWARD:
        return 'bg-emerald-800/30 border-emerald-500/60';
      default:
        return 'bg-slate-700/30 border-slate-600/30';
    }
  };

  const formatPositionLabel = (positionKey) => {
    if (!positionKey || typeof positionKey !== 'string') return 'Unknown position';
    return positionKey
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Format event description
  const formatEventDescription = (event) => {
    const { type, data } = event;
    const eventData = data || {};
    
    switch (type) {
      case EVENT_TYPES.MATCH_START:
        return `Match started`;
      case EVENT_TYPES.MATCH_END:
        return `Match ended`;
      case EVENT_TYPES.PERIOD_START:
        const periodStartNumber = eventData.periodNumber || event.periodNumber || eventData.period || event.period || 'Unknown';
        return `Period ${periodStartNumber} started`;
      case EVENT_TYPES.PERIOD_END:
        const periodEndNumber = eventData.periodNumber || event.periodNumber || eventData.period || event.period || 'Unknown';
        return `Period ${periodEndNumber} ended`;
      case EVENT_TYPES.GOAL_SCORED:
        // Extract score data for new format: "3-2 - Own Team Scored - PlayerName"
        const ownScore = eventData.ownScore;
        const opponentScore = eventData.opponentScore;
        const ownScorer = goalScorers[event.id]
          ? (getPlayerName ? (getPlayerName(goalScorers[event.id]) || null) : null)
          : (eventData.scorerId ? (getPlayerName ? (getPlayerName(eventData.scorerId) || null) : null) : null);
        
        // Format with score and team, optionally include scorer
        if (ownScore !== undefined && opponentScore !== undefined) {
          const baseFormat = `${ownScore}-${opponentScore} ${ownTeamName} Scored`;
          return ownScorer ? `${baseFormat} - ${ownScorer}` : baseFormat;
        } else {
          // Fallback to old format if score data missing
          const fallbackScorer = ownScorer || 'Unknown scorer';
          return `Goal for ${ownTeamName} - ${fallbackScorer}`;
        }
        
      case EVENT_TYPES.GOAL_CONCEDED:
        // Extract score data for new format: "4-2 - Eagles United Scored" (no scorer)
        const awayOwnScore = eventData.ownScore;
        const awayOpponentScore = eventData.opponentScore;
        
        // Format with score and team only (no scorer for away team)
        if (awayOwnScore !== undefined && awayOpponentScore !== undefined) {
          return `${awayOwnScore}-${awayOpponentScore} ${opponentTeam} Scored`;
        } else {
          // Fallback to old format if score data missing
          return `Goal for ${opponentTeam}`;
        }
      case EVENT_TYPES.SUBSTITUTION:
        const playersOffArray = eventData.playersOff || (eventData.outPlayerId ? [eventData.outPlayerId] : []);
        const playersOnArray = eventData.playersOn || (eventData.inPlayerId ? [eventData.inPlayerId] : []);
        
        // Get player names for all players going off
        const playersOffNames = playersOffArray.map(playerId => 
          playerId ? (getPlayerName ? (getPlayerName(playerId) || 'Unknown') : 'Unknown') : 'Unknown'
        ).filter(name => name !== 'Unknown');
        
        // Get player names for all players coming on
        const playersOnNames = playersOnArray.map(playerId => 
          playerId ? (getPlayerName ? (getPlayerName(playerId) || 'Unknown') : 'Unknown') : 'Unknown'
        ).filter(name => name !== 'Unknown');
        
        // Create display strings with text indicators for direction
        const offPlayersDisplay = playersOffNames.length > 0 ? playersOffNames.join(' & ') + ' (Out)' : 'Unknown (Out)';
        const onPlayersDisplay = playersOnNames.length > 0 ? playersOnNames.join(' & ') + ' (In)' : 'Unknown (In)';
        
        return `Substitution: ${offPlayersDisplay} → ${onPlayersDisplay}`;
      case EVENT_TYPES.GOALIE_SWITCH:
        const goaliePositionChanges = Array.isArray(eventData.positionChanges) ? eventData.positionChanges : [];
        const oldGoalieChange = goaliePositionChanges.find(change => (change.oldPosition || '').toLowerCase() === 'goalie');
        const newGoalieChange = goaliePositionChanges.find(change => (change.newPosition || '').toLowerCase() === 'goalie');
        const otherPositionChanges = goaliePositionChanges.filter(change =>
          change !== oldGoalieChange && change !== newGoalieChange
        );

        const resolveChangeName = (change) =>
          change?.playerName ||
          (change?.playerId && getPlayerName ? (getPlayerName(change.playerId) || null) : null) ||
          null;

        const oldGoalieName = eventData.oldGoalieName ||
          (eventData.oldGoalieId && getPlayerName ? (getPlayerName(eventData.oldGoalieId) || null) : null) ||
          resolveChangeName(oldGoalieChange);
        const newGoalieName = eventData.newGoalieName ||
          (eventData.newGoalieId && getPlayerName ? (getPlayerName(eventData.newGoalieId) || null) : null) ||
          resolveChangeName(newGoalieChange);
        const newGoaliePreviousPosition = eventData.newGoaliePreviousPosition ||
          newGoalieChange?.oldPosition;
        const oldGoalieNewPosition = eventData.oldGoalieNewPosition ||
          oldGoalieChange?.newPosition;

        const parts = [];

        if (newGoalieName || newGoaliePreviousPosition || newGoalieChange) {
          const previousRole = newGoaliePreviousPosition ? ` (from ${formatPositionLabel(newGoaliePreviousPosition)})` : '';
          parts.push(`New goalie: ${newGoalieName || 'Unknown'}${previousRole}`);
        }

        if (oldGoalieName || oldGoalieNewPosition || oldGoalieChange) {
          const destination = oldGoalieNewPosition
            ? ` → ${formatPositionLabel(oldGoalieNewPosition)}`
            : ' leaves goal';
          parts.push(`Old goalie: ${oldGoalieName || 'Unknown'}${destination}`);
        }

        if (otherPositionChanges.length > 0) {
          const summary = otherPositionChanges.map(change => {
            const name = resolveChangeName(change) || 'Unknown';
            const oldPos = formatPositionLabel(change.oldPosition);
            const newPos = formatPositionLabel(change.newPosition);
            return `${name} (${oldPos} → ${newPos})`;
          }).join(' | ');
          parts.push(`Other switches: ${summary}`);
        }

        if (parts.length > 0) {
          return parts.join(' | ');
        }

        if (goaliePositionChanges.length > 0) {
          const summary = goaliePositionChanges.map(change => {
            const name =
              resolveChangeName(change) ||
              'Unknown';
            const oldPos = formatPositionLabel(change.oldPosition);
            const newPos = formatPositionLabel(change.newPosition);
            return `${name} (${oldPos} → ${newPos})`;
          }).join(' | ');
          return summary;
        }

        const oldGoalie = oldGoalieName || 'Unknown';
        const newGoalie = newGoalieName || 'Unknown';
        return `New goalie: ${newGoalie} | Old goalie: ${oldGoalie}`;
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        const goalieId = eventData.goalieId || event.playerId;
        const goalieNameFromId = goalieId ? (getPlayerName ? (getPlayerName(goalieId) || null) : null) : null;
        const assignedGoalieName = eventData.goalieName || eventData.display_name || goalieNameFromId || null;
        if (eventData.description) {
          return eventData.description;
        }
        if (assignedGoalieName) {
          return `${assignedGoalieName} is goalie`;
        }
        return 'Goalie assigned';
      case EVENT_TYPES.POSITION_CHANGE:
        const positionChanges = Array.isArray(eventData.positionChanges) ? eventData.positionChanges : [];
        if (positionChanges.length > 0) {
          const summary = positionChanges.map(change => {
            const name =
              change.playerName ||
              (change.playerId && getPlayerName ? (getPlayerName(change.playerId) || null) : null) ||
              'Unknown';
            const newPos = formatPositionLabel(change.newPosition);
            return `${name} → ${newPos}`;
          }).join(' | ');
          return `Position switch: ${summary}`;
        }
        if (eventData.player1Id && eventData.player2Id) {
          const player1 = eventData.player1Id ? (getPlayerName ? (getPlayerName(eventData.player1Id) || 'Unknown') : 'Unknown') : 'Unknown';
          const player2 = eventData.player2Id ? (getPlayerName ? (getPlayerName(eventData.player2Id) || 'Unknown') : 'Unknown') : 'Unknown';
          return `Position switch: ${player1} ↔ ${player2}`;
        }

        const positionChangeName =
          eventData.display_name ||
          (eventData.player1Id && getPlayerName ? (getPlayerName(eventData.player1Id) || null) : null) ||
          (event.playerId && getPlayerName ? (getPlayerName(event.playerId) || null) : null) ||
          eventData.playerName ||
          'Unknown';

        const oldPosition = eventData.old_position || eventData.oldPosition;
        const newPosition = eventData.new_position || eventData.newPosition;

        if (newPosition || oldPosition) {
          const movement = oldPosition ? `${formatPositionLabel(oldPosition)} → ${formatPositionLabel(newPosition || 'Unknown')}` : `→ ${formatPositionLabel(newPosition || 'Unknown')}`;
          return `Position change: ${positionChangeName} ${movement}`;
        }

        return `Position change: ${positionChangeName}`;
      case EVENT_TYPES.PLAYER_INACTIVATED:
        const inactivatedPlayerName =
          eventData.display_name ||
          eventData.playerName ||
          (event.playerId && getPlayerName ? (getPlayerName(event.playerId) || null) : null) ||
          'Unknown';
        return `${inactivatedPlayerName} inactivated`;
      case EVENT_TYPES.PLAYER_ACTIVATED:
        const activatedPlayerName =
          eventData.display_name ||
          eventData.playerName ||
          (event.playerId && getPlayerName ? (getPlayerName(event.playerId) || null) : null) ||
          'Unknown';
        return `${activatedPlayerName} re-activated`;
      case EVENT_TYPES.FAIR_PLAY_AWARD:
        const fairPlayName =
          eventData.display_name ||
          eventData.playerName ||
          (event.playerId && getPlayerName ? (getPlayerName(event.playerId) || null) : null) ||
          'Unknown player';
        return `Fair Play Award: ${fairPlayName}`;
      case EVENT_TYPES.TIMER_PAUSED:
        return `Timer paused`;
      case EVENT_TYPES.TIMER_RESUMED:
        return `Timer resumed`;
      case EVENT_TYPES.PERIOD_PAUSED:
        return `Period paused`;
      case EVENT_TYPES.PERIOD_RESUMED:
        return `Period resumed`;
      case EVENT_TYPES.INTERMISSION:
        return `Intermission`;
      case EVENT_TYPES.GOAL_CORRECTED:
        return `Goal corrected`;
      case EVENT_TYPES.GOAL_UNDONE:
        return `Goal undone`;
      case EVENT_TYPES.SUBSTITUTION_UNDONE:
        return `Substitution undone`;
      case EVENT_TYPES.TECHNICAL_TIMEOUT:
        return `Technical timeout`;
      default:
        return `${type.replace(/_/g, ' ')}`;
    }
  };

  // Toggle event expansion for details
  const toggleEventExpansion = (eventId) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Handle goal event click
  const handleGoalEventClick = (event) => {
    if (onGoalClick && (event.type === EVENT_TYPES.GOAL_SCORED || event.type === EVENT_TYPES.GOAL_CONCEDED)) {
      onGoalClick(event);
    }
  };

  // Determine if event should be clickable
  const isEventClickable = (event) => {
    return onGoalClick && (event.type === EVENT_TYPES.GOAL_SCORED || event.type === EVENT_TYPES.GOAL_CONCEDED);
  };

  // Format event time
  const formatEventTime = (event) => {
    return event.matchTime || calculateMatchTime(event.timestamp, matchStartTime);
  };

  // Render a single event
  const renderEvent = (event) => {
    const Icon = getEventIcon(event.type);
    const iconColor = getEventColor(event.type, event.undone);
    const bgColor = getEventBackgroundColor(event.type, event.undone);
    const isClickable = isEventClickable(event);
    const isExpanded = expandedEvents.has(event.id);
    const details = renderEventDetails(event);
    const isGoalEvent = event.type === EVENT_TYPES.GOAL_SCORED || event.type === EVENT_TYPES.GOAL_CONCEDED;
    const isGoalScored = event.type === EVENT_TYPES.GOAL_SCORED;
    
    return (
      <div key={event.id} className="relative flex items-start">
        {/* Timeline dot */}
        <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border-2 ${
          isGoalEvent ? 'border-yellow-400' : iconColor.replace('text-', 'border-')
        }`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        
        {/* Event content */}
        <div className="ml-4 flex-1">
          <div
            className={`rounded-lg border p-4 ${bgColor} ${
              isClickable ? 'cursor-pointer hover:bg-opacity-80 transition-colors' : ''
            } ${event.undone ? 'opacity-60' : ''} ${
              isGoalScored ? 'shadow-lg shadow-yellow-400/30' : ''
            }`}
            onClick={() => handleGoalEventClick(event)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono text-slate-400">
                    {formatEventTime(event)}
                  </span>
                  {event.undone && (
                    <span className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded">
                      UNDONE
                    </span>
                  )}
                </div>
                <p className={`${
                  isGoalEvent ? 'text-base font-bold' : 'text-sm font-medium'
                } mt-1 ${event.undone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {formatEventDescription(event)}
                </p>
                {isClickable && (
                  <p className="text-xs text-slate-400 mt-1">
                    Click to edit scorer
                  </p>
                )}
              </div>
              
              {/* Expand button for events with details */}
              {details.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEventExpansion(event.id);
                  }}
                  className="ml-2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
            
            {/* Event details (expandable) */}
            {isExpanded && details.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-600/50">
                <dl className="space-y-1">
                  {details.map((detail, idx) => (
                    <dd key={idx} className="text-xs text-slate-400">
                      {detail}
                    </dd>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render intermission section
  const renderIntermission = (intermission) => {
    const minutes = intermission.durationMinutes;
    const seconds = intermission.durationSeconds;
    
    return (
      <div key={`intermission-${intermission.startEvent.id}`} className="py-8 flex justify-center">
        <div className="bg-slate-700/50 rounded-lg px-6 py-4 border border-slate-600/50">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">Intermission</p>
              <p className="text-xs text-slate-400 mt-1">
                {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render event details
  const renderEventDetails = (event) => {
    const { data } = event;
    const eventData = data || {};
    const details = [];

    if (event.periodNumber && event.type !== EVENT_TYPES.MATCH_END && event.type !== EVENT_TYPES.FAIR_PLAY_AWARD) {
      details.push(`Period: ${event.periodNumber}`);
    }

    if (eventData.ownScore !== undefined && eventData.opponentScore !== undefined) {
      details.push(`Score: ${eventData.ownScore} - ${eventData.opponentScore}`);
    }

    if (event.type === EVENT_TYPES.FAIR_PLAY_AWARD) {
      const recipientName =
        eventData.display_name ||
        eventData.playerName ||
        (event.playerId && getPlayerName ? (getPlayerName(event.playerId) || null) : null) ||
        null;
      if (recipientName) {
        details.push(`Awarded to: ${recipientName}`);
      }
    }

    if (event.undone) {
      details.push(`Undone: ${event.undoReason || 'user action'}`);
      if (event.undoTimestamp) {
        details.push(`Undone at: ${calculateMatchTime(event.undoTimestamp, matchStartTime)}`);
      }
    }

    if (event.relatedEventId) {
      details.push(`Related to: ${event.relatedEventId}`);
    }

    const positionChanges = Array.isArray(eventData.positionChanges) ? eventData.positionChanges : [];
    if (positionChanges.length > 0) {
      details.push('Position changes:');
      positionChanges.forEach(change => {
        const name =
          change.playerName ||
          (change.playerId && getPlayerName ? (getPlayerName(change.playerId) || null) : null) ||
          'Unknown';
        const oldPos = formatPositionLabel(change.oldPosition);
        const newPos = formatPositionLabel(change.newPosition);
        details.push(`- ${name}: ${oldPos} → ${newPos}`);
      });
    }

    const startingLineup = Array.isArray(eventData.startingLineup) ? eventData.startingLineup : [];
    if (startingLineup.length > 0) {
      details.push('Starting positions:');
      startingLineup.forEach((entry) => {
        const positionLabel = formatPositionLabel(entry.position);
        const playerName = entry.name || 'Unknown';
        details.push(`- ${positionLabel}: ${playerName}`);
      });
    }

    return details;
  };

  const renderBoundaryEvent = (event) => (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-600"></div>
        <div className="space-y-4">
          {renderEvent(event)}
        </div>
      </div>
    </div>
  );

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-400">No events recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-400">
            {filteredAndSortedEvents.length} events
          </span>
          
          {/* Player Filter Dropdown */}
          {availablePlayers.length > 0 && onPlayerFilterChange && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-400">Player:</label>
              <select
                value={selectedPlayerId || ''}
                onChange={(e) => onPlayerFilterChange(e.target.value || null)}
                className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Players</option>
                {availablePlayers.map(player => (
                  <option key={player.id} value={player.id}>
                    {formatPlayerName(player)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center space-x-1 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <span>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
          {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Timeline - Chronological with match-level events */}
      <div className="space-y-6">
        {/* Boundary Events - respect sort order */}
        {sortOrder === 'desc' && (
          <>
            {groupedEventsByPeriod.fairPlayAwardEvent && renderBoundaryEvent(groupedEventsByPeriod.fairPlayAwardEvent)}
            {groupedEventsByPeriod.matchEndEvent && renderBoundaryEvent(groupedEventsByPeriod.matchEndEvent)}
          </>
        )}
        {sortOrder === 'asc' && groupedEventsByPeriod.matchStartEvent && renderBoundaryEvent(groupedEventsByPeriod.matchStartEvent)}
        
        {/* Period Events */}
        {Object.keys(groupedEventsByPeriod.groups)
          .sort((a, b) => sortOrder === 'desc' ? b - a : a - b)
          .map((periodNumber) => {
            const periodEvents = groupedEventsByPeriod.groups[periodNumber];
            const nextPeriod = parseInt(periodNumber) + 1;
            const intermission = groupedEventsByPeriod.intermissions[nextPeriod];
            const periodHeader = (periodNumber > 1 || (periodNumber === 1 && !groupedEventsByPeriod.matchStartEvent)) ? (
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-px bg-slate-600 flex-1"></div>
                <h3 className="text-sm font-medium text-slate-300 px-3">
                  Period {periodNumber}
                </h3>
                <div className="h-px bg-slate-600 flex-1"></div>
              </div>
            ) : null;
            
            return (
              <div key={`period-${periodNumber}`} className="space-y-4">
                {/* Period Header placement depends on sort order: show near chronological start */}
                {sortOrder === 'asc' && periodHeader}
                
                {/* Period Events */}
                <div className="relative">
                  {/* Timeline line for this period */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-600"></div>
                  
                  {/* Events in this period */}
                  <div className="space-y-4">
                    {periodEvents.map((event) => renderEvent(event))}
                  </div>
                </div>

                {sortOrder === 'desc' && periodHeader}
                
                {/* Intermission after this period (if exists) */}
                {intermission && renderIntermission(intermission)}
              </div>
            );
          })}
          
        {/* Boundary Events - respect sort order */}
        {sortOrder === 'asc' && (
          <>
            {groupedEventsByPeriod.matchEndEvent && renderBoundaryEvent(groupedEventsByPeriod.matchEndEvent)}
            {groupedEventsByPeriod.fairPlayAwardEvent && renderBoundaryEvent(groupedEventsByPeriod.fairPlayAwardEvent)}
          </>
        )}
        {sortOrder === 'desc' && groupedEventsByPeriod.matchStartEvent && renderBoundaryEvent(groupedEventsByPeriod.matchStartEvent)}
      </div>
    </div>
  );
}
