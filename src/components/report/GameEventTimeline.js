import React, { useState, useMemo, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Trophy, 
  RotateCcw, 
  Shield, 
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

// Timeline preferences persistence manager
const timelinePrefsManager = createPersistenceManager('dif-coach-timeline-preferences', {
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
 * @param {string} props.homeTeamName - Home team name
 * @param {string} props.awayTeamName - Away team name
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
  homeTeamName = "Djurgården",
  awayTeamName = "Opponent",
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
        const { type, data = {} } = event;
        
        // Always show match/period events
        if (type === EVENT_TYPES.MATCH_START || type === EVENT_TYPES.MATCH_END || 
            type === EVENT_TYPES.PERIOD_START || type === EVENT_TYPES.PERIOD_END ||
            type === EVENT_TYPES.INTERMISSION) {
          return true;
        }
        
        // Show goal events if the selected player is the scorer
        if (type === EVENT_TYPES.GOAL_HOME || type === EVENT_TYPES.GOAL_AWAY) {
          const scorerId = goalScorers[event.id] || data.scorerId;
          return scorerId === selectedPlayerId;
        }
        
        // Show substitution events if the selected player is involved
        if (type === EVENT_TYPES.SUBSTITUTION) {
          const playersOff = data.playersOff || (data.outPlayerId ? [data.outPlayerId] : []);
          const playersOn = data.playersOn || (data.inPlayerId ? [data.inPlayerId] : []);
          return playersOff.includes(selectedPlayerId) || playersOn.includes(selectedPlayerId);
        }
        
        // Show goalie switch events if the selected player is involved
        if (type === EVENT_TYPES.GOALIE_SWITCH) {
          return data.oldGoalieId === selectedPlayerId || data.newGoalieId === selectedPlayerId;
        }
        
        // Show goalie assignment events if the selected player is involved
        if (type === EVENT_TYPES.GOALIE_ASSIGNMENT) {
          return data.goalieId === selectedPlayerId;
        }
        
        // Show position change events if the selected player is involved
        if (type === EVENT_TYPES.POSITION_CHANGE) {
          return data.player1Id === selectedPlayerId || data.player2Id === selectedPlayerId;
        }
        
        // Hide other events for specific player filter
        return false;
      });
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const comparison = a.timestamp - b.timestamp;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [events, sortOrder, selectedPlayerId, goalScorers, debugMode]);

  // Group events by periods and process intermissions
  const groupedEventsByPeriod = useMemo(() => {
    const groups = {};
    let intermissionEvents = [];
    let matchStartEvent = null;
    let matchEndEvent = null;
    
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
    
    return { groups, intermissions: processedIntermissions, matchStartEvent, matchEndEvent };
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
      case EVENT_TYPES.GOAL_HOME:
      case EVENT_TYPES.GOAL_AWAY:
        return Trophy;
      case EVENT_TYPES.SUBSTITUTION:
        return RotateCcw;
      case EVENT_TYPES.GOALIE_SWITCH:
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        return Shield;
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
      case EVENT_TYPES.GOAL_HOME:
      case EVENT_TYPES.GOAL_AWAY:
        return 'text-yellow-400';
      case EVENT_TYPES.SUBSTITUTION:
      case EVENT_TYPES.POSITION_CHANGE:
        return 'text-cyan-400';
      case EVENT_TYPES.GOALIE_SWITCH:
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        return 'text-purple-400';
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
      case EVENT_TYPES.GOAL_HOME:
      case EVENT_TYPES.GOAL_AWAY:
        return 'bg-yellow-400/40 border-yellow-400/60';
      case EVENT_TYPES.SUBSTITUTION:
      case EVENT_TYPES.POSITION_CHANGE:
        return 'bg-cyan-900/20 border-cyan-700/30';
      case EVENT_TYPES.GOALIE_SWITCH:
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        return 'bg-purple-900/20 border-purple-700/30';
      default:
        return 'bg-slate-700/30 border-slate-600/30';
    }
  };

  // Format event description
  const formatEventDescription = (event) => {
    const { type, data = {} } = event;
    
    switch (type) {
      case EVENT_TYPES.MATCH_START:
        return `Match started`;
      case EVENT_TYPES.MATCH_END:
        return `Match ended`;
      case EVENT_TYPES.PERIOD_START:
        return `Period ${data.periodNumber || 'Unknown'} started`;
      case EVENT_TYPES.PERIOD_END:
        return `Period ${data.periodNumber || 'Unknown'} ended`;
      case EVENT_TYPES.GOAL_HOME:
        // Extract score data for new format: "3-2 - Djurgården Scored - PlayerName"
        const homeScore = data.homeScore;
        const awayScore = data.awayScore;
        const homeScorer = goalScorers[event.id] 
          ? (getPlayerName ? (getPlayerName(goalScorers[event.id]) || null) : null)
          : (data.scorerId ? (getPlayerName ? (getPlayerName(data.scorerId) || null) : null) : null);
        
        // Format with score and team, optionally include scorer
        if (homeScore !== undefined && awayScore !== undefined) {
          const baseFormat = `${homeScore}-${awayScore} ${homeTeamName} Scored`;
          return homeScorer ? `${baseFormat} - ${homeScorer}` : baseFormat;
        } else {
          // Fallback to old format if score data missing
          const fallbackScorer = homeScorer || 'Unknown scorer';
          return `Goal for ${homeTeamName} - ${fallbackScorer}`;
        }
        
      case EVENT_TYPES.GOAL_AWAY:
        // Extract score data for new format: "4-2 - Eagles United Scored" (no scorer)
        const awayHomeScore = data.homeScore;
        const awayAwayScore = data.awayScore;
        
        // Format with score and team only (no scorer for away team)
        if (awayHomeScore !== undefined && awayAwayScore !== undefined) {
          return `${awayHomeScore}-${awayAwayScore} ${awayTeamName} Scored`;
        } else {
          // Fallback to old format if score data missing
          return `Goal for ${awayTeamName}`;
        }
      case EVENT_TYPES.SUBSTITUTION:
        // Handle multiple players for pairs mode substitutions
        const playersOffArray = data.playersOff || (data.outPlayerId ? [data.outPlayerId] : []);
        const playersOnArray = data.playersOn || (data.inPlayerId ? [data.inPlayerId] : []);
        
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
        const oldGoalie = data.oldGoalieId ? (getPlayerName ? (getPlayerName(data.oldGoalieId) || 'Unknown') : 'Unknown') : 'Unknown';
        const newGoalie = data.newGoalieId ? (getPlayerName ? (getPlayerName(data.newGoalieId) || 'Unknown') : 'Unknown') : 'Unknown';
        return `Goalie change: ${oldGoalie} → ${newGoalie}`;
      case EVENT_TYPES.GOALIE_ASSIGNMENT:
        const assignedGoalie = data.goalieId ? (getPlayerName ? (getPlayerName(data.goalieId) || 'Unknown') : 'Unknown') : 'Unknown';
        const assignedGoalieName = data.goalieName || assignedGoalie;
        return data.description || `${assignedGoalieName} is goalie`;
      case EVENT_TYPES.POSITION_CHANGE:
        const player1 = data.player1Id ? (getPlayerName ? (getPlayerName(data.player1Id) || 'Unknown') : 'Unknown') : 'Unknown';
        const player2 = data.player2Id ? (getPlayerName ? (getPlayerName(data.player2Id) || 'Unknown') : 'Unknown') : 'Unknown';
        return `Position switch: ${player1} ↔ ${player2}`;
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
    if (onGoalClick && (event.type === EVENT_TYPES.GOAL_HOME || event.type === EVENT_TYPES.GOAL_AWAY)) {
      onGoalClick(event);
    }
  };

  // Determine if event should be clickable
  const isEventClickable = (event) => {
    return onGoalClick && (event.type === EVENT_TYPES.GOAL_HOME || event.type === EVENT_TYPES.GOAL_AWAY);
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
    const isGoalEvent = event.type === EVENT_TYPES.GOAL_HOME || event.type === EVENT_TYPES.GOAL_AWAY;
    const isHomeGoal = event.type === EVENT_TYPES.GOAL_HOME;
    
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
              isHomeGoal ? 'shadow-lg shadow-yellow-400/30' : ''
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
    const { data = {} } = event;
    const details = [];

    if (event.periodNumber) {
      details.push(`Period: ${event.periodNumber}`);
    }

    if (data.homeScore !== undefined && data.awayScore !== undefined) {
      details.push(`Score: ${data.homeScore} - ${data.awayScore}`);
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

    return details;
  };

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
        {/* Match Start Event */}
        {groupedEventsByPeriod.matchStartEvent && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-600"></div>
              <div className="space-y-4">
                {renderEvent(groupedEventsByPeriod.matchStartEvent)}
              </div>
            </div>
          </div>
        )}
        
        {/* Period Events */}
        {Object.keys(groupedEventsByPeriod.groups)
          .sort((a, b) => sortOrder === 'desc' ? b - a : a - b)
          .map((periodNumber) => {
            const periodEvents = groupedEventsByPeriod.groups[periodNumber];
            const nextPeriod = parseInt(periodNumber) + 1;
            const intermission = groupedEventsByPeriod.intermissions[nextPeriod];
            
            return (
              <div key={`period-${periodNumber}`} className="space-y-4">
                {/* Period Header - show for periods > 1, or period 1 when there's no match start event */}
                {(periodNumber > 1 || (periodNumber === 1 && !groupedEventsByPeriod.matchStartEvent)) && (
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="h-px bg-slate-600 flex-1"></div>
                    <h3 className="text-sm font-medium text-slate-300 px-3">
                      Period {periodNumber}
                    </h3>
                    <div className="h-px bg-slate-600 flex-1"></div>
                  </div>
                )}
                
                {/* Period Events */}
                <div className="relative">
                  {/* Timeline line for this period */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-600"></div>
                  
                  {/* Events in this period */}
                  <div className="space-y-4">
                    {periodEvents.map((event) => renderEvent(event))}
                  </div>
                </div>
                
                {/* Intermission after this period (if exists) */}
                {intermission && renderIntermission(intermission)}
              </div>
            );
          })}
          
        {/* Match End Event */}
        {groupedEventsByPeriod.matchEndEvent && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-600"></div>
              <div className="space-y-4">
                {renderEvent(groupedEventsByPeriod.matchEndEvent)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}