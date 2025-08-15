# Gemini Project Brief: src/components/report

This directory contains the React components responsible for providing comprehensive post-match analysis and reporting capabilities. It transforms raw game data from `gameEventLogger` and `useGameState` into structured, visual reports that coaches can use to analyze team performance, track player statistics, and review match events.

## 1. Component Architecture

- **`MatchReportScreen.js`**: The primary component that orchestrates the entire report view. It manages UI state (like filters and visibility), handles data transformation, and passes the prepared data down to its children.
- **`GameEventTimeline.js`**: A complex component that renders a chronological and filterable timeline of all match events (goals, substitutions, period changes).
- **`MatchSummaryHeader.js`**: Displays the final score, team names, and other high-level match metadata.
- **`PlayerStatsTable.js`**: A sortable table that shows detailed statistics for each player who participated in the match.
- **`ReportControls.js`**: Provides UI controls for navigating the report, filtering the timeline, and exporting data.

## 2. Key Features

- **Event Filtering**: The timeline can be filtered by player or event type, and substitution events can be toggled for clarity.
- **Sortable Stats**: The player statistics table allows sorting by any time-based column (e.g., total field time, time as attacker).
- **Responsive Design**: All components are designed to be mobile-first, ensuring a good user experience on all screen sizes.
- **Data Export**: The `ReportControls` component includes functionality for printing or sharing the match report.

## 3. Data Flow

1.  **Input**: `MatchReportScreen` receives raw data as props, primarily `matchEvents`, `allPlayers`, `gameLog`, and score information.
2.  **Transformation**: Inside `MatchReportScreen`, this raw data is processed, filtered, and sorted using `useMemo` hooks for performance. For example, the `filteredAndSortedEvents` are calculated based on the user's filter selections.
3.  **Distribution**: The transformed data is then passed as props to the child components (`GameEventTimeline`, `PlayerStatsTable`, etc.) for rendering.
4.  **Interaction**: User actions (e.g., changing a filter) are handled by callbacks in `MatchReportScreen`, which update the local UI state and trigger a re-render with the newly transformed data.

## 4. How to Make Changes

- **Adding a new event type to the timeline**: You will need to update the helper functions in `MatchReportScreen` (like `getEventIcon`, `getEventColor`, `formatEventDescription`) to handle the new event type.
- **Adding a new statistic to the table**: Modify the `columns` configuration array in `PlayerStatsTable.js` and ensure the new data field is available in the `sortedPlayers` array.
- **Changing the report layout**: Modify the JSX and Tailwind CSS classes directly in `MatchReportScreen.js` to adjust the arrangement of the sub-components.
