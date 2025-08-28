# Gemini Project Brief: src/components/stats

This directory contains the React components responsible for displaying the game statistics after a match has concluded. It processes the accumulated game data to present a comprehensive overview of player performance and time distribution.

## 1. Key Components

- **`StatsScreen.js`**: This is the main component for the statistics view. It is responsible for:
  - Displaying the final score of the game.
  - Presenting a detailed table of player statistics, including:
    - Player name.
    - Starting role in the match (Goalie, On Field, Substitute).
    - Points earned as Goalie, Defender, and Attacker (based on the custom points system).
    - Total time on field, time as Defender, time as Attacker, and time as Goalie.
  - Providing a button to copy the formatted statistics to the clipboard.
  - Offering an option to start a new game configuration, which involves resetting the entire application state.

## 2. Core Architectural Concepts

### a. Data Aggregation and Presentation
`StatsScreen` takes the `allPlayers` state (which contains accumulated statistics) and the `gameLog` to calculate and display the final statistics. It filters `allPlayers` to only show those who participated in the game.

### b. Custom Points System
The application uses a unique points system to ensure fair role distribution. `StatsScreen` utilizes `calculateRolePoints` from `src/utils/rolePointUtils.js` to compute and display these points, which are awarded in 0.5 increments.

### c. Data Formatting
It uses `formatTime` and `formatPoints` from `src/utils/formatUtils.js` to ensure that time and point values are displayed in a user-friendly and consistent format.

### d. State Reset
The "Start New Game" button triggers a comprehensive reset of the application's state, including clearing `localStorage` for both game state and timers. This ensures a clean slate for a new game.

### e. Clipboard Integration
It leverages the browser's `navigator.clipboard.writeText` API to allow users to easily copy the generated statistics for external use.

## 3. Key Data Flows

- **Game State to Stats**: `StatsScreen` receives `allPlayers`, `homeScore`, `awayScore`, `opponentTeamName`, and `gameLog` as props from `App.js` (which gets them from `useGameState`).

- **Utility Integration**: It calls `calculateRolePoints` to process player stats and `generateStatsText` (from `src/utils/formatUtils.js`) to create the formatted text for copying.

- **State Reset**: When a new game is initiated, `StatsScreen` calls functions provided by `useGameState` (e.g., `clearStoredState`, `setAllPlayers`, `setSelectedSquadIds`, `setGameLog`, `resetScore`, `setOpponentTeamName`) and `useTimers` (`clearTimerState`) to reset the application to its initial configuration state.

## 4. How to Make Changes

- **Modifying Statistics Display**: To change the layout or content of the statistics table, modify the JSX within `StatsScreen.js`. For changes to how time or points are formatted, adjust `src/utils/formatUtils.js`.

- **Adjusting Points Calculation**: If the logic for calculating player points needs to be updated, modify `src/utils/rolePointUtils.js`.

- **Adding New Statistics**: To include new types of statistics, you would likely need to:
  1.  Ensure the necessary data is collected and stored in `player.stats` or `gameLog`.
  2.  Add logic to `StatsScreen.js` to calculate and display these new statistics.
  3.  Potentially update `src/utils/formatUtils.js` if new formatting is required.
  4.  Update `generateStatsText` in `src/utils/formatUtils.js` if the new stats should be included in the copied text.