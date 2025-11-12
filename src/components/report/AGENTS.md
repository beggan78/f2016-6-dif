# Report Components - AI Agent Guide

## Purpose
Post-match analysis and reporting system that transforms game data into visual reports for coaches. Displays match summary, player statistics, event timeline, and export capabilities.

## Component Architecture

### Main Orchestrator
- **MatchReportScreen.js**: Coordinates all report functionality
  - Manages UI state (filters, player selection, substitution visibility)
  - Filters squad players by participation and selectedSquadIds
  - Provides error handling for missing data
  - Uses ReportSection wrapper for consistent layout

### Core Components
- **GameEventTimeline.js**: Chronological event visualization with filtering
- **MatchSummaryHeader.js**: Match metadata, scores, and winner display
- **PlayerStatsTable.js**: Sortable statistics table with dynamic columns
- **ReportControls.js**: Print/share functionality
- **ReportSection.js**: Standardized section wrapper with icon and header
- **EventToggleButton.js**: Toggle for substitution event visibility
- **ReportNavigation.js**: Back navigation button

## Key Features

### Game Event Timeline
- **Period Grouping**: Events grouped by period with intermission displays
- **Player Filtering**: Dropdown to filter events by specific player
- **Substitution Toggle**: Show/hide substitution events (controlled by parent)
- **Sort Order**: Persistent preference (oldest-first/newest-first) via PersistenceManager
- **Expandable Details**: Click chevron to view event metadata (period, score, undo info)
- **Clickable Goals**: Click goal events to edit scorer (if onGoalClick provided)
- **Debug Mode**: Shows SUBSTITUTION_UNDONE events when enabled

### Player Statistics Table
- **Dynamic Columns**: Shows midfielder column only if any player has midfielder time
- **Sortable**: Click column headers to sort (name, times, goals)
- **Starting Role**: Displays role player started match with (from stats.startedMatchAs)
- **Time Tracking**: Field, attacker, defender, midfielder, goalie, substitute times
- **Goals Column**: Counts goals from matchEvents using goalScorers mapping
- **Memoized**: React.memo prevents unnecessary re-renders

### Match Summary
- **Winner Highlighting**: Green text for winner, neutral for tie
- **Date/Time**: ISO format (YYYY-MM-DD HH:MM) using Swedish locale
- **Match Duration**: Formatted time display
- **Period Info**: Shows count and duration (e.g., "3 × 12min")

### Report Controls
- **Print**: window.print() or custom onPrint callback
- **Share**: Uses native share API or clipboard fallback
- **Options Section**: Currently only used for display, substitution toggle in parent

## Data Flow

### MatchReportScreen Props
- **matchEvents**: Events from gameEventLogger (filtered by MatchReportScreen)
- **allPlayers**: All player data (filtered to squad players internally)
- **selectedSquadIds**: Array of player IDs to include in report
- **goalScorers**: Object mapping event.id → playerId for goal attribution
- **ownScore, opponentScore**: Final scores
- **matchStartTime**: Timestamp for duration calculation
- **formation**: Used by PlayerStatsTable for starting roles
- **debugMode**: Shows SUBSTITUTION_UNDONE events in timeline

### Key Transformations
1. **Squad Filtering**: allPlayers → squadPlayers (participantSet + hasPlayerParticipated check)
2. **Event Filtering**: matchEvents → filteredEvents (removes substitution events if toggle off)
3. **Match Duration**: Calculate from matchStartTime to last event timestamp
4. **Player Names**: getPlayerName adds "(C)" suffix for captains

### Performance
- **useMemo**: Squad filtering, event filtering, match duration, participantSet
- **useCallback**: getPlayerName, handlePlayerFilterChange (auto-enables substitutions)
- **React.memo**: PlayerStatsTable export memoized to prevent re-renders
- **PersistenceManager**: Timeline sort order persisted to localStorage

## Integration Points

### Event System
- **EVENT_TYPES**: Constants from `utils/gameEventLogger` for event type checking
- **calculateMatchTime**: Converts timestamp to match time string (MM:SS)
- **Event Filtering**: Removes undone events (except GOAL_CORRECTED), filters SUBSTITUTION_UNDONE unless debugMode

### Player System
- **PLAYER_ROLES**: Uses GOALIE, SUBSTITUTE, FIELD_PLAYER constants
- **hasPlayerParticipated**: Utility from `utils/playerUtils` to check if player has stats
- **stats.startedMatchAs**: Player's starting role for the match (from Period 1)
- **stats.isCaptain**: Boolean flag for captain designation in player names

### Storage
- **STORAGE_KEYS.TIMELINE_PREFERENCES**: Key for timeline sort order persistence
- **createPersistenceManager**: Creates manager for loading/saving sort order

### Formatting
- **formatTime**: From `utils/formatUtils` for time display (seconds → MM:SS)
- **formatPlayerName**: Formats player name, adds "(C)" for captains
- **Swedish locale**: Date/time formatting uses 'sv-SE' (ISO format)

## Critical Implementation Details

### GameEventTimeline Event Formatting
- **Goal Events**: Format as "3-2 TeamName Scored - PlayerName" (uses goalScorers mapping)
- **Substitution Events**: Handles single-player substitutions (playersOff/playersOn arrays)
- **Period Grouping**: Groups by event.periodNumber, displays intermissions between periods
- **Intermission Calculation**: Matches start/end events by precedingPeriodNumber/followingPeriodNumber
- **Timeline Visuals**: Uses Lucide icons (Play, Square, Trophy, Shield, etc.)

### PlayerStatsTable Starting Roles
- **Critical**: Only uses stats.startedMatchAs (not stats.startedAs or formation)
- **Values**: GOALIE → "Goalie", SUBSTITUTE → "Sub", FIELD_PLAYER → "Field", undefined → "--"
- **Dynamic Columns**: Midfielder column only shown if any player has timeAsMidfielderSeconds > 0
- **Sort Logic**: Default sort by name ascending, persists in component state

### Event Filtering Logic
- **Undone Events**: Filter out events with undone=true (except GOAL_CORRECTED)
- **Debug Events**: SUBSTITUTION_UNDONE only shown when debugMode=true
- **Player Filter**: When selectedPlayerId set, shows only events involving that player + period markers
- **Auto-enable**: Selecting a player automatically enables substitution visibility

### ReportSection Pattern
- **Usage**: Wrap all report sections for consistent styling
- **Props**: icon (Lucide component), title, children, optional headerExtra
- **Styling**: bg-slate-800 rounded-lg with sky-colored headers

## Testing

### Test Files
- Individual component tests for each component in `__tests__/`
- **eventOrderingFix.test.js**: Tests for event ordering edge cases
- Components use React Testing Library patterns

## Common Modifications

### Adding New Event Types to Timeline
1. Update `getEventIcon()` - map event type to Lucide icon
2. Update `getEventColor()` - set icon and text color
3. Update `getEventBackgroundColor()` - set container background
4. Update `formatEventDescription()` - format display text
5. Update player filter logic in `filteredAndSortedEvents` if event involves players

### Adding Statistics Columns
1. Add column definition to `columns` array in PlayerStatsTable
2. Add sort case in `sortedPlayers` useMemo switch statement
3. Ensure player.stats contains the required field
4. For conditional columns, check data existence in columns useMemo (like midfielder column)

### Modifying Event Filtering
- **MatchReportScreen**: Controls high-level filtering (substitution visibility toggle)
- **GameEventTimeline**: Controls granular filtering (player filter, debug mode, undone events)
- Both use useMemo for performance on filter changes

## Common Issues

### Missing Player Names
- Check goalScorers mapping contains correct event.id → playerId
- Verify allPlayers array includes all referenced player IDs
- getPlayerName returns null for unknown players (handled gracefully)

### Statistics Show "--"
- PlayerStatsTable shows "--" when time values are 0 or undefined
- This is expected behavior for players with no time in specific roles
- Check player.stats object structure if all columns show "--"

### Events Not Appearing
- Check event.undone flag (undone events filtered except GOAL_CORRECTED)
- Verify debugMode prop if looking for SUBSTITUTION_UNDONE events
- Check selectedPlayerId filter - restricts to events involving that player

### Intermissions Not Displaying
- Requires matching INTERMISSION start/end events with precedingPeriodNumber/followingPeriodNumber
- Check event.data.intermissionType ('start' or 'end')
- Duration calculated from timestamp difference

## File Structure
```
/src/components/report/
├── MatchReportScreen.js      # Main orchestrator
├── GameEventTimeline.js      # Event timeline with filtering
├── MatchSummaryHeader.js     # Match metadata and scores
├── PlayerStatsTable.js       # Sortable statistics table
├── ReportControls.js         # Print/share controls
├── ReportSection.js          # Section wrapper component
├── EventToggleButton.js      # Substitution visibility toggle
├── ReportNavigation.js       # Back button navigation
└── __tests__/                # Test files
```
