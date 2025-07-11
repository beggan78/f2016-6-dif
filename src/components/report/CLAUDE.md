# Report Components - Claude Code Memory

## Purpose
The report components provide comprehensive post-match analysis and reporting capabilities for the DIF F16-6 Coach application. This module transforms raw game data into structured, visual reports that coaches can use to analyze team performance, track player statistics, and review match events.

## Component Architecture

### Main Orchestrator
- **MatchReportScreen.js**: Primary screen component that coordinates all report functionality
  - Manages local UI state (filters, visibility toggles)
  - Handles error states and missing data scenarios
  - Provides navigation between report sections
  - Coordinates data flow to sub-components

### Focused Sub-Components
- **GameEventTimeline.js**: Complex timeline visualization for match events
- **MatchSummaryHeader.js**: Match metadata and score display
- **PlayerStatsTable.js**: Sortable player statistics table
- **ReportControls.js**: Navigation and export controls

## Key Features

### Game Event Timeline
- **Chronological Display**: Events organized by periods with visual timeline
- **Event Filtering**: Filter by player, event type, or substitution visibility
- **Period Grouping**: Automatic grouping with intermission display
- **Event Details**: Expandable event information with technical details
- **Sort Control**: Toggle between newest-first and oldest-first ordering
- **Goal Integration**: Clickable goal events for scorer editing

### Player Statistics
- **Sortable Columns**: All time-based statistics sortable ascending/descending
- **Role Tracking**: Starting roles (Goalie, Field, Substitute)
- **Time Breakdown**: Field time, attacker time, defender time, goalie time
- **Responsive Design**: Mobile-optimized table with hover effects
- **Missing Data Handling**: Graceful display of incomplete statistics

### Match Summary
- **Visual Hierarchy**: Clear display of match outcome with winner highlighting
- **Metadata Display**: Match date, time, duration, and period information
- **Team Comparison**: Side-by-side team names and scores
- **Status Indicators**: Win/loss/tie status with visual cues

### Report Controls
- **Navigation**: Links to stats screen and other app sections
- **Export Options**: Print and share functionality
- **Filtering Controls**: Toggle visibility of substitution events
- **Sorting Options**: Timeline ordering preferences

## Data Flow

### Input Data Sources
```javascript
// Main data inputs to MatchReportScreen
{
  matchEvents: [],           // From gameEventLogger
  allPlayers: [],           // Player data with stats
  gameLog: [],              // Period-by-period data
  goalScorers: {},          // Event ID to player ID mapping
  homeScore: 0,             // Final scores
  awayScore: 0,
  matchStartTime: timestamp  // Match timing data
}
```

### Data Transformations
1. **Event Processing**: Raw events → filtered and sorted timeline
2. **Player Filtering**: All players → squad players with statistics
3. **Time Calculations**: Timestamps → match time and duration
4. **Score Attribution**: Goal events → scorer identification

### Component Communication
- **Props Down**: Data flows from MatchReportScreen to sub-components
- **Callbacks Up**: User interactions bubble up through callback props
- **State Management**: Local UI state managed in MatchReportScreen

### Performance Optimization
- **useMemo** for expensive filtering/sorting operations in timeline and table components
- **useCallback** for stable event handler references to prevent unnecessary re-renders
- **Component-level memoization** for pure display components with complex prop structures
- **State persistence** using PersistenceManager for timeline preferences and user experience

## Integration Points

### Game Event Logger
```javascript
import { EVENT_TYPES, calculateMatchTime } from '../../utils/gameEventLogger';
```
- Consumes events from match logging system
- Handles event filtering and undone event logic
- Calculates match time for timeline display

### Player Data System
```javascript
import { PLAYER_ROLES } from '../../constants/playerConstants';
```
- Integrates with player statistics tracking
- Displays time spent in different roles
- Handles player name resolution

### Navigation System
- **App-level Navigation**: Callbacks to navigate between screens
- **Browser Back Support**: Integrates with browser history management
- **Deep Linking**: Supports direct navigation to report sections

### Formatting Utilities
```javascript
import { formatTime } from '../../utils/formatUtils';
```
- Consistent time formatting across all components
- Handles various time display formats
- Responsive to different duration ranges

## Component Responsibilities

### MatchReportScreen
- **State Management**: Controls visibility, filtering, and UI state
- **Data Preparation**: Transforms raw data for sub-components
- **Error Handling**: Manages missing data and loading states
- **Layout Orchestration**: Coordinates responsive layout sections

### GameEventTimeline
- **Event Visualization**: Renders chronological event timeline
- **Complex Filtering**: Multi-dimensional event filtering system
- **Period Management**: Groups events by periods with intermissions
- **User Interaction**: Handles event expansion and goal editing

### MatchSummaryHeader
- **Match Metadata**: Displays date, time, and match information
- **Score Presentation**: Visual hierarchy for match outcomes
- **Winner Determination**: Calculates and displays match results

### PlayerStatsTable
- **Data Presentation**: Sortable table with responsive design
- **Statistics Display**: Time-based statistics with proper formatting
- **User Interface**: Sorting indicators and hover effects

### ReportControls
- **Navigation**: Provides navigation to other app sections
- **Export Functions**: Print and share functionality
- **Report Options**: Filtering and sorting controls

## Testing Architecture

### Component Testing
- **Isolated Testing**: Each component tested in isolation
- **Props Validation**: Comprehensive prop testing
- **User Interactions**: Event handling and state changes
- **Edge Cases**: Missing data and error scenarios

### Integration Testing
- **Data Flow**: End-to-end data flow testing
- **Event Ordering**: Complex event ordering scenarios (`eventOrderingFix.test.js`)
- **Cross-Component**: Component interaction testing

### Test Utilities
- **Mock Data**: Shared test data utilities
- **Component Helpers**: Common testing patterns
- **Event Simulation**: User interaction simulation

## Usage Guidelines

### Code Conventions
- **Component Names**: PascalCase with descriptive, domain-specific names
- **Function Names**: camelCase using verb-noun patterns for clarity
- **Defensive Programming**: Comprehensive null checks and default parameter values
- **Pure Functions**: All data transformations use pure functions without side effects

### Adding New Event Types
1. **Update EVENT_TYPES**: Add new event type to gameEventLogger
2. **Icon Mapping**: Add icon in `getEventIcon()` function
3. **Color Mapping**: Add colors in `getEventColor()` and `getEventBackgroundColor()`
4. **Description**: Add formatting in `formatEventDescription()`

### Extending Statistics
1. **Column Configuration**: Add new column to `columns` array in PlayerStatsTable
2. **Sorting Logic**: Update sorting logic in `sortedPlayers` useMemo
3. **Data Access**: Ensure new stat fields are available in player data

### Customizing Timeline
1. **Filtering**: Extend `filteredAndSortedEvents` logic
2. **Grouping**: Modify `groupedEventsByPeriod` for new grouping rules
3. **Rendering**: Update `renderEvent()` for new display formats

### Report Export
1. **Print Styles**: Add print-specific CSS classes
2. **Data Export**: Extend ReportControls for new export formats
3. **Share Integration**: Customize share functionality

## Common Issues & Debugging

### Timeline Event Ordering
- **Problem**: Events appear in wrong chronological order
- **Solution**: Check timestamp consistency and sort logic
- **Debug**: Use expanded event details to verify timestamps

### Missing Player Names
- **Problem**: "Unknown" appears instead of player names
- **Solution**: Verify `getPlayerName` function and player data integrity
- **Debug**: Check player ID consistency between events and player data

### Statistics Display
- **Problem**: Time statistics show "--" instead of values
- **Solution**: Verify player stats structure and time field initialization
- **Debug**: Check `player.stats` object structure and time calculations

### Performance Issues
- **Problem**: Slow rendering with large event lists
- **Solution**: Optimize filtering and sorting with proper memoization
- **Debug**: Use React DevTools Profiler to identify bottlenecks

### Mobile Responsiveness
- **Problem**: Layout breaks on mobile devices
- **Solution**: Check responsive classes and table overflow handling
- **Debug**: Test on various screen sizes and orientations

## Future Enhancements

### Potential Features
- **Export to PDF**: Generate PDF reports
- **Advanced Filtering**: Multiple filter criteria
- **Statistical Analysis**: Trend analysis and insights
- **Custom Reporting**: User-defined report templates
- **Real-time Updates**: Live event streaming during matches

### Technical Improvements
- **Performance**: Virtualized timeline for large datasets
- **Accessibility**: Enhanced keyboard navigation and screen reader support
- **Internationalization**: Multi-language support
- **Offline Support**: Local storage for report caching

## Dependencies

### External Libraries
- **React**: Core framework with hooks
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first styling

### Internal Dependencies
- **Game Event Logger**: Event tracking and time calculations
- **Player Utilities**: Player data access and formatting
- **Shared UI Components**: Button, Modal, and other UI elements
- **Format Utilities**: Time formatting and display helpers

## File Structure
```
/src/components/report/
├── MatchReportScreen.js     # Main orchestrator component
├── GameEventTimeline.js     # Event timeline visualization
├── MatchSummaryHeader.js    # Match metadata display
├── PlayerStatsTable.js      # Player statistics table
├── ReportControls.js        # Navigation and export controls
└── __tests__/               # Comprehensive test suite
    ├── MatchReportScreen.test.js
    ├── GameEventTimeline.test.js
    ├── MatchSummaryHeader.test.js
    ├── PlayerStatsTable.test.js
    ├── ReportControls.test.js
    └── eventOrderingFix.test.js
```

This module represents a sophisticated reporting system that transforms raw match data into actionable insights for coaches, with comprehensive testing and mobile-first design principles.