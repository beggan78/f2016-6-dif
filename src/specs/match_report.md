# Match Report Feature Implementation Plan

## Overview
This document outlines the comprehensive plan for implementing a Match Report feature in the DIF F16-6 Coach application. The match report will provide detailed game statistics, event timeline, and player performance data at the conclusion of each match.

## Feature Requirements

### Core Information to Display
1. **Match metadata**: Date/time started, final score, period lengths, total/effective playing time
2. **Player statistics table**: Starting role, time by position/role breakdown
3. **Game event log**: Period events, substitutions, goals, goalie switches with timestamps
4. **Interactive features**: Toggle substitution visibility, goal scorer entry/correction

### User Experience
- Accessible via "View Match Report" button when match is finished
- Dedicated screen/view for comprehensive report display
- Print-friendly layout for physical copies
- Option to hide/show substitution events
- Home team goal scorer attribution with correction capability
- Export functionality (print, share, save)

## Current Data Analysis

### ✅ Already Available Data
- **Timer Data**: Match duration, pause tracking, substitution timestamps (`useTimers.js`)
- **Player Statistics**: Comprehensive time tracking by role/position (`playerUtils.js`)
- **Game State**: Period-by-period snapshots with formations (`useGameState.js`)
- **Score Tracking**: Real-time home/away scores with persistence
- **Team Information**: Home team name, opponent name configuration
- **Navigation Infrastructure**: View-based routing system ready for extension

### ❌ Missing Data Requirements
- **Individual event timestamps**: Goals, substitutions, goalie switches with match time
- **Goal scorer tracking**: Player attribution for home team goals with correction capability
- **Event sequencing**: Chronological ordering of all match events with undo handling
- **Match start time**: Precise game commencement timestamp
- **Effective playing time**: Total time minus paused time calculation
- **Timer state tracking**: Pause/resume events for accurate time calculations
- **Event correction system**: Undo/modify events (goals, substitutions)
- **Period transition handling**: Events spanning period boundaries
- **Match termination scenarios**: Early end, abandonment, technical issues
- **Data validation**: Event sequence integrity and time consistency checks

## Technical Implementation Plan

### Phase 1: Data Collection Infrastructure

#### 1.1 Game Event Logger (`src/utils/gameEventLogger.js`)
Create centralized event logging system with comprehensive edge case handling:

```javascript
// Event types to track (comprehensive list)
const EVENT_TYPES = {
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
  
  // Player events
  SUBSTITUTION: 'substitution',
  SUBSTITUTION_UNDONE: 'substitution_undone',
  GOALIE_SWITCH: 'goalie_switch',
  POSITION_CHANGE: 'position_change',
  
  // Scoring events
  GOAL_HOME: 'goal_home',
  GOAL_AWAY: 'goal_away',
  GOAL_CORRECTED: 'goal_corrected',
  GOAL_UNDONE: 'goal_undone',
  
  // Timer events
  TIMER_PAUSED: 'timer_paused',
  TIMER_RESUMED: 'timer_resumed',
  TECHNICAL_TIMEOUT: 'technical_timeout'
};

// Enhanced event structure
const eventSchema = {
  id: string,              // Unique event identifier
  type: EVENT_TYPES,       // Event category
  timestamp: number,       // Epoch milliseconds
  matchTime: string,       // Formatted match time (MM:SS)
  periodNumber: number,    // Current period
  data: object,           // Event-specific data
  undone: boolean,        // Event was undone/corrected
  undoTimestamp: number,  // When event was undone
  relatedEventId: string, // Links corrections to original events
  sequence: number        // Event ordering for validation
};
```

**Key Functions**:
- `logEvent(type, data)` - Record new game event with validation
- `removeEvent(eventId)` - Remove event (for undo operations)
- `markEventAsUndone(eventId)` - Mark event as undone without deletion
- `getMatchEvents(options)` - Retrieve events with filtering (hide undone, etc.)
- `calculateMatchTime(timestamp)` - Convert timestamp to match time format
- `getEffectivePlayingTime()` - Total time minus all paused durations
- `validateEventSequence()` - Check event chronology and integrity
- `recoverCorruptedEvents()` - Handle data corruption gracefully

#### 1.2 Enhanced Game State (`src/hooks/useGameState.js`)
Extend existing game state to include comprehensive event tracking:

```javascript
// Add to game state
const [matchEvents, setMatchEvents] = useState([]);
const [matchStartTime, setMatchStartTime] = useState(null);
const [goalScorers, setGoalScorers] = useState({}); // { eventId: playerId }
const [eventSequenceNumber, setEventSequenceNumber] = useState(0);
const [lastEventBackup, setLastEventBackup] = useState(null);
const [timerPauseStartTime, setTimerPauseStartTime] = useState(null);
const [totalPausedDuration, setTotalPausedDuration] = useState(0);
```

**Integration Points**:
- Hook into existing substitution handlers with undo detection
- Extend timer start/stop/pause/resume functions
- Enhance score modification functions with correction capability
- Add to localStorage persistence with backup strategy
- Integrate with existing undo substitution system
- Add validation checks for event sequence integrity

#### 1.3 Goal Scorer & Correction Modal (`src/components/shared/GoalScorerModal.js`)
Enhanced modal component for goal attribution and correction:

```javascript
// Modal for selecting/correcting goal scorer
const GoalScorerModal = ({ 
  isOpen, 
  onClose, 
  onSelectScorer,
  onCorrectGoal,
  onUndoGoal,
  eligiblePlayers,
  mode, // 'new', 'correct', 'view'
  existingGoalData
}) => {
  // Player selection interface
  // Goal correction options
  // Undo goal functionality
  // Confirmation/skip options
  // Integration with goal logging and event correction
};
```

#### 1.4 Event Validation & Recovery (`src/utils/eventValidation.js`)
Data integrity and crash recovery system:

```javascript
const validateMatchData = (events, gameState) => {
  const errors = [];
  
  // Check event chronology
  if (!eventsAreChronological(events)) {
    errors.push('Events not in chronological order');
  }
  
  // Validate playing time calculations
  const calculatedTime = calculateEffectivePlayingTime(events);
  if (Math.abs(calculatedTime - gameState.totalEffectiveTime) > 5) {
    errors.push('Playing time calculation inconsistent');
  }
  
  // Check player time totals
  const playerTimeTotals = calculatePlayerTimeTotals(events);
  if (!validatePlayerTimeConsistency(playerTimeTotals, gameState.allPlayers)) {
    errors.push('Player time statistics inconsistent');
  }
  
  return errors;
};

const recoverFromCrash = () => {
  try {
    const backup = localStorage.getItem('match-events-backup');
    const primary = localStorage.getItem('match-events');
    
    // Use backup if primary is corrupted
    return validateAndRestore(primary) || validateAndRestore(backup);
  } catch (error) {
    console.error('Failed to recover match data:', error);
    return null;
  }
};
```

### Phase 2: Event Tracking Integration

#### 2.1 Enhanced Timer Integration (`src/hooks/useTimers.js`)
Comprehensive timer event tracking with pause/resume handling:

```javascript
// Enhanced startTimers function
const startTimers = useCallback(() => {
  const now = Date.now();
  setMatchStartTime(now); // NEW: Track match start
  
  logEvent(EVENT_TYPES.MATCH_START, { 
    timestamp: now,
    periodDurationMinutes,
    teamMode,
    homeTeamName,
    awayTeamName
  });
  
  logEvent(EVENT_TYPES.PERIOD_START, { 
    periodNumber: currentPeriodNumber,
    timestamp: now,
    startingFormation: periodFormation
  });
  
  // ... existing timer logic
}, [currentPeriodNumber, logEvent, periodDurationMinutes, teamMode]);

// Enhanced pause/resume with event tracking
const pauseSubTimer = useCallback((updatePlayerStats) => {
  if (!isSubTimerPaused && lastSubstitutionTime) {
    const now = Date.now();
    
    // Log pause event
    logEvent(EVENT_TYPES.TIMER_PAUSED, {
      pauseType: 'substitution',
      currentMatchTime: calculateMatchTime(now),
      activeStints: getActivePlayerStints()
    });
    
    setPauseStartTime(now);
    
    // ... existing pause logic
  }
}, [isSubTimerPaused, lastSubstitutionTime, logEvent]);

const resumeSubTimer = useCallback((updatePlayerStats) => {
  if (isSubTimerPaused && pauseStartTime) {
    const now = Date.now();
    const pauseDuration = now - pauseStartTime;
    
    // Log resume event
    logEvent(EVENT_TYPES.TIMER_RESUMED, {
      pauseType: 'substitution',
      pauseDurationMs: pauseDuration,
      currentMatchTime: calculateMatchTime(now)
    });
    
    // ... existing resume logic
  }
}, [isSubTimerPaused, pauseStartTime, logEvent]);
```

#### 2.2 Substitution Event Tracking with Undo Handling (`src/game/handlers/substitutionHandlers.js`)
Enhanced substitution tracking with comprehensive undo support:

```javascript
// Enhanced substitution handler with event logging
const handleSubstitutionWithHighlight = useCallback(() => {
  const gameState = gameStateFactory();
  const now = Date.now();
  
  // Generate event ID for potential undo tracking
  const substitutionEventId = generateEventId();
  
  animateStateChange(
    gameState,
    calculateSubstitution,
    (newGameState) => {
      // ... existing state updates
      
      // NEW: Log substitution event
      const substitutionEvent = logEvent(EVENT_TYPES.SUBSTITUTION, {
        eventId: substitutionEventId,
        playersOff: [beforeNextPlayerId].filter(Boolean),
        playersOn: newGameState.playersToHighlight || [],
        formationType: teamMode,
        matchTime: calculateMatchTime(now),
        beforeFormation: beforeFormation,
        afterFormation: newGameState.periodFormation
      });
      
      // Enhanced lastSubstitution data with event ID
      const lastSubstitutionData = {
        // ... existing fields
        eventId: substitutionEventId,
        relatedEvents: [substitutionEvent.id]
      };
      
      setLastSubstitution(lastSubstitutionData);
    },
    setAnimationState,
    setHideNextOffIndicator,
    setRecentlySubstitutedPlayers
  );
}, [logEvent, teamMode, calculateMatchTime]);

// Enhanced undo handler with event removal
const handleUndo = useCallback(() => {
  const gameState = gameStateFactory();
  
  if (gameState.lastSubstitution) {
    // Remove the substitution event from timeline
    removeEvent(gameState.lastSubstitution.eventId);
    
    // Log undo action (optional - for audit trail)
    logEvent(EVENT_TYPES.SUBSTITUTION_UNDONE, {
      originalEventId: gameState.lastSubstitution.eventId,
      undoMatchTime: calculateCurrentMatchTime(),
      reason: 'user_initiated'
    });
    
    // Apply undo logic (existing implementation)
    const newGameState = calculateUndo(gameState, gameState.lastSubstitution);
    
    // Apply state changes
    setPeriodFormation(newGameState.periodFormation);
    setAllPlayers(newGameState.allPlayers);
    // ... other state updates
    
    // Clear undo data
    clearLastSubstitution();
  }
}, [removeEvent, logEvent, calculateCurrentMatchTime]);
```

#### 2.3 Enhanced Score Event Tracking (`src/game/handlers/scoreHandlers.js`)
Comprehensive goal tracking with correction and undo capabilities:

```javascript
// Enhanced home goal handler with correction support
const handleAddHomeGoal = useCallback(() => {
  const eventId = generateEventId();
  const now = Date.now();
  
  // Log goal event
  const goalEvent = logEvent(EVENT_TYPES.GOAL_HOME, {
    eventId,
    matchTime: calculateMatchTime(now),
    period: currentPeriodNumber,
    homeScore: homeScore + 1,
    awayScore,
    scorerId: null // To be filled by modal
  });
  
  // Update score immediately
  addHomeGoal();
  
  // Show goal scorer modal for attribution
  showGoalScorerModal({
    eventId,
    team: 'home',
    eligiblePlayers: getEligibleHomePlayers(),
    matchTime: calculateMatchTime(now)
  });
}, [logEvent, calculateCurrentMatchTime, addHomeGoal, currentPeriodNumber]);

// Goal correction handler
const handleCorrectGoal = useCallback((eventId, newScorerId) => {
  // Update goal scorer attribution
  setGoalScorers(prev => ({
    ...prev,
    [eventId]: newScorerId
  }));
  
  // Log correction event
  logEvent(EVENT_TYPES.GOAL_CORRECTED, {
    originalEventId: eventId,
    newScorerId,
    correctionTime: calculateCurrentMatchTime(),
    reason: 'scorer_correction'
  });
}, [logEvent, calculateCurrentMatchTime]);

// Goal undo handler
const handleUndoGoal = useCallback((eventId) => {
  const goalEvent = getEventById(eventId);
  
  if (goalEvent) {
    // Remove goal event
    removeEvent(eventId);
    
    // Remove goal scorer attribution
    setGoalScorers(prev => {
      const updated = { ...prev };
      delete updated[eventId];
      return updated;
    });
    
    // Update score
    if (goalEvent.type === EVENT_TYPES.GOAL_HOME) {
      addHomeGoal(-1);
    } else if (goalEvent.type === EVENT_TYPES.GOAL_AWAY) {
      addAwayGoal(-1);
    }
    
    // Log undo event
    logEvent(EVENT_TYPES.GOAL_UNDONE, {
      originalEventId: eventId,
      undoTime: calculateCurrentMatchTime(),
      reason: 'user_correction'
    });
  }
}, [removeEvent, getEventById, addHomeGoal, addAwayGoal, logEvent]);

// Away goal handler (similar structure)
const handleAddAwayGoal = useCallback(() => {
  const eventId = generateEventId();
  const now = Date.now();
  
  logEvent(EVENT_TYPES.GOAL_AWAY, {
    eventId,
    matchTime: calculateMatchTime(now),
    period: currentPeriodNumber,
    homeScore,
    awayScore: awayScore + 1
  });
  
  addAwayGoal();
}, [logEvent, calculateCurrentMatchTime, addAwayGoal, currentPeriodNumber]);
```

### Phase 3: Match Report Screen

#### 3.1 Navigation Enhancement (`src/hooks/useGameState.js`)
Add match report to view routing:

```javascript
// Enhanced view states
const VIEWS = {
  CONFIG: 'config',
  PERIOD_SETUP: 'periodSetup', 
  GAME: 'game',
  MATCH_REPORT: 'matchReport',  // NEW
  STATS: 'stats'
};

// Navigation flow: game → matchReport → stats
```

#### 3.2 Match Report Screen (`src/components/report/MatchReportScreen.js`)
Comprehensive report display component:

```javascript
const MatchReportScreen = ({
  matchEvents,
  matchStartTime,
  allPlayers,
  gameLog,
  homeScore,
  awayScore,
  periodDurationMinutes,
  teamMode,
  homeTeamName,
  awayTeamName,
  onNavigateToStats,
  onBackToGame
}) => {
  // Report sections:
  // - Match Summary Header
  // - Player Statistics Table
  // - Game Event Timeline
  // - Navigation Controls
};
```

**Key Components**:
- `MatchSummaryHeader` - Date, time, score, duration summary
- `PlayerStatsTable` - Sortable table with role/time breakdown
- `GameEventTimeline` - Chronological event list with filters
- `ReportControls` - Print, export, navigation options

#### 3.3 Report Data Processing (`src/utils/matchReportUtils.js`)
Utility functions for report generation:

```javascript
// Core report utilities
const generateMatchSummary = (matchEvents, gameLog) => {
  // Calculate match duration, effective playing time
  // Format match metadata
  // Generate summary statistics
};

const processPlayerStatistics = (allPlayers, gameLog) => {
  // Calculate final time breakdowns
  // Determine starting roles
  // Generate sortable statistics
};

const formatEventTimeline = (matchEvents, options = {}) => {
  // Sort events chronologically  
  // Apply visibility filters (substitutions, etc.)
  // Format for display
};
```

### Phase 4: UI Components & Styling

#### 4.1 Report Layout Components
Create reusable components for report sections:

- `StatsSummaryCard` - Key metrics display
- `PlayerStatsRow` - Individual player statistics
- `EventTimelineItem` - Single event display
- `ReportSection` - Consistent section styling
- `PrintableReport` - Print-optimized layout

#### 4.2 Interactive Features
- **Substitution Toggle**: Show/hide substitution events
- **Goal Scorer Attribution**: Click to add/edit goal scorers
- **Sort Options**: Player table sorting by various metrics
- **Filter Controls**: Event timeline filtering

#### 4.3 Responsive Design
- **Mobile-first**: Touch-friendly interface for tablets
- **Print Styles**: Clean black/white printing layout
- **Accessibility**: Screen reader support, keyboard navigation

### Phase 5: Testing & Edge Case Validation

#### 5.1 Unit Tests
- `gameEventLogger.test.js` - Event logging with undo/correction scenarios
- `eventValidation.test.js` - Data integrity and crash recovery
- `matchReportUtils.test.js` - Report generation with corrupted data
- `MatchReportScreen.test.js` - Component rendering with edge cases
- `goalCorrectionModal.test.js` - Goal scorer attribution and correction

#### 5.2 Integration Tests
- End-to-end match flow with event tracking and corrections
- Undo substitution with event timeline consistency
- Goal scoring, correction, and undo workflows
- Timer pause/resume with accurate time calculations
- Match termination scenarios (normal, early, abandoned)
- Crash recovery and data restoration
- Performance testing with long matches (100+ events)

#### 5.3 Edge Case Testing
- Multiple rapid substitutions and undo operations
- Goal corrections during live gameplay
- App crash during critical events (goal, substitution)
- Timer synchronization after extended pauses
- Data corruption and recovery scenarios
- Period transition boundary events

#### 5.4 User Testing
- Coach workflow validation with realistic match scenarios
- Report accuracy verification with actual game data
- Print/export functionality across different devices
- Goal correction workflow usability testing

## Data Persistence Strategy

### Enhanced Event Storage Structure
```javascript
// Primary storage: 'dif-coach-match-events'
{
  matchId: string,
  version: '1.0.0',
  created: timestamp,
  lastUpdated: timestamp,
  checksum: string,
  events: [
    {
      id: 'evt_001',
      type: 'period_start',
      timestamp: 1640995200000,
      matchTime: '00:00',
      periodNumber: 1,
      sequence: 1,
      data: {},
      undone: false,
      relatedEventId: null
    },
    // ... additional events
  ],
  goalScorers: {
    'evt_goal_001': 'player_5'
  },
  corrections: {
    'evt_goal_001': {
      originalScorer: null,
      correctedScorer: 'player_5',
      correctionTimestamp: 1640995300000
    }
  }
}

// Backup storage: 'dif-coach-match-events-backup'
{
  primary: { /* full event data */ },
  backupTimestamp: timestamp,
  autoBackups: [
    { timestamp: number, eventCount: number, checksum: string },
    // ... last 5 auto-backups
  ]
}
```

### Enhanced Backup & Recovery
- **Real-time Auto-save**: Events saved immediately with validation
- **Incremental Backups**: Backup created every 10 events or 5 minutes
- **Checksum Validation**: Detect data corruption automatically
- **Multi-layer Recovery**: Primary → Backup → Emergency recovery
- **Conflict Resolution**: Handle timer/event timestamp mismatches with user notification
- **Version Migration**: Handle data format changes gracefully
- **Event Sequence Validation**: Ensure chronological consistency on load
- **Corrupted Event Isolation**: Remove corrupted events while preserving valid data

## Implementation Timeline (Revised)

### Sprint 1 (Enhanced Data Infrastructure) - 8 days
- [ ] Create comprehensive game event logger utility
- [ ] Implement event validation and integrity checking
- [ ] Enhance game state with event tracking and undo detection
- [ ] Add crash recovery and backup systems
- [ ] Create goal scorer/correction modal components
- [ ] Unit tests for event logging with edge cases
- [ ] Data migration strategy for existing games

### Sprint 2 (Event Integration & Edge Cases) - 12 days  
- [ ] Integrate substitution event tracking with undo handling
- [ ] Add comprehensive goal/score event logging with corrections
- [ ] Enhance timer integration with pause/resume tracking
- [ ] Implement period transition event handling
- [ ] Add performance optimizations for long matches
- [ ] Create event correction and undo workflows
- [ ] Integration tests for complex event scenarios

### Sprint 3 (Match Report Screen & Export) - 12 days
- [ ] Build match report screen with comprehensive data display
- [ ] Create report data processing utilities with error handling
- [ ] Add navigation and export functionality
- [ ] Implement player statistics table with sorting/filtering
- [ ] Create interactive event timeline with correction capabilities
- [ ] Add print-friendly layouts and mobile responsiveness
- [ ] Implement timezone and time display formatting

### Sprint 4 (Testing, Polish & Validation) - 8 days
- [ ] Comprehensive edge case testing suite
- [ ] Performance testing with realistic match scenarios
- [ ] User acceptance testing with actual coaches
- [ ] Data validation and corruption recovery testing
- [ ] Cross-device and print functionality validation
- [ ] Documentation and deployment preparation
- [ ] Final bug fixes and optimizations

**Total Estimated Duration**: 40 days (increased from 28 days due to comprehensive edge case handling)

## Success Criteria

### Functional Requirements
- ✅ All match events tracked with accurate timestamps and undo capability
- ✅ Complete player statistics available with validation checks
- ✅ Event timeline with filtering and correction capabilities
- ✅ Goal scorer attribution and correction for home team
- ✅ Print-friendly report layout with export functionality
- ✅ Comprehensive event validation and data integrity
- ✅ Crash recovery with minimal data loss (< 30 seconds of events)
- ✅ Event correction workflows (goals, substitutions)

### Performance Requirements
- ✅ Report generation < 2 seconds (even with 200+ events)
- ✅ Event logging with no game performance impact (< 10ms per event)
- ✅ Reliable data persistence across sessions with corruption detection
- ✅ Memory usage optimization for long matches
- ✅ Auto-backup completion < 500ms

### User Experience Requirements  
- ✅ Intuitive navigation to match report from any game state
- ✅ Clear, readable report format with interactive elements
- ✅ Mobile-friendly report viewing and correction workflows
- ✅ Easy goal scorer assignment and correction process
- ✅ Seamless undo operations with visual feedback
- ✅ Error recovery with user-friendly notifications

## Technical Dependencies

### External Dependencies
- No new external libraries required
- Leverages existing React/JavaScript infrastructure

### Internal Dependencies
- Extends existing game state management
- Builds on current timer and scoring systems
- Integrates with existing modal and navigation patterns

### Compatibility
- Maintains backward compatibility with existing game data
- Preserves current localStorage structure
- No breaking changes to existing workflows

## Risk Mitigation

### Data Loss Prevention
- **Multi-layer Backup**: Primary storage + backup + emergency recovery
- **Real-time Validation**: Event sequence and integrity checks on every write
- **Crash Recovery**: Auto-restore from last known good state
- **Incremental Backups**: Regular snapshots prevent catastrophic loss
- **Checksum Verification**: Detect and isolate corrupted data automatically
- **Event Redundancy**: Critical events (goals, periods) stored with extra validation

### Performance Concerns  
- **Event Batching**: Group rapid events to prevent UI blocking
- **Lazy Loading**: Load report data only when accessed
- **Memory Optimization**: Clean up old event listeners and large objects
- **Throttled Auto-save**: Limit backup frequency to prevent performance impact
- **Event Pruning**: Archive very old events to localStorage backup
- **Background Processing**: Offload report generation to web workers if needed

### User Experience Risks
- **Complex Correction Workflows**: Provide clear, step-by-step guidance
- **Information Overload**: Use progressive disclosure and smart defaults
- **Mobile Usability**: Touch-optimized correction interfaces
- **Undo Confusion**: Clear visual feedback for all reversible actions
- **Timer Synchronization**: Visual indicators when timers are out of sync
- **Error Communication**: User-friendly messages for technical failures

### Technical Integration Risks
- **Existing Undo System**: Ensure new event logging doesn't break current undo
- **Timer Drift**: Validate event timestamps against multiple time sources
- **State Consistency**: Verify event log matches actual game state
- **Browser Compatibility**: Test localStorage limits across devices
- **Performance Regression**: Monitor existing game performance metrics
- **Data Migration**: Graceful handling of existing game data without events

### Edge Case Scenarios
- **Rapid Fire Events**: Handle multiple substitutions/goals in quick succession
- **Boundary Conditions**: Events exactly at period transitions
- **Network Issues**: Offline capability with sync when reconnected
- **Clock Changes**: Handle device time zone or daylight saving changes
- **Incomplete Matches**: Graceful handling of abandoned/terminated games
- **Concurrent Access**: Prevent data corruption from multiple browser tabs

This comprehensive plan provides a clear roadmap for implementing the Match Report feature while leveraging the existing robust architecture of the DIF F16-6 Coach application.