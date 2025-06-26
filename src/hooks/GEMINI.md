# Gemini Project Brief: src/hooks

This directory contains custom React hooks that encapsulate reusable stateful logic and side effects for the application. These hooks are central to managing the application's complex state and interactions.

## 1. Core Hooks

- **`useGameState.js`**: This is the primary hook for managing the entire game's core state. It handles:
  - Initialization of game state from `localStorage` via `persistenceManager`.
  - All game-related data: players, squad selection, period configuration, current formation, scores, game log, and the rotation queue.
  - Actions that modify the game state: `handleSubstitution`, `handleEndPeriod`, `switchPlayerPositions`, `switchGoalie`, `togglePlayerInactive`, etc.
  - Integration with `persistenceManager` for saving/loading state and managing backups.
  - Logic for preparing periods and starting the game, including formation recommendations.
  - Wake lock and alert timer management.

- **`useGameUIState.js`**: Manages UI-specific state that is not part of the core game logic but affects how the UI is rendered and animated. It handles:
  - Animation coordination (`animationState`).
  - Tracking recently substituted players for visual highlighting.
  - Managing the `lastSubstitution` for undo functionality.
  - A flag (`shouldSubstituteNow`) to coordinate immediate substitution actions.

- **`useTimers.js`**: Encapsulates all logic related to the match timer and substitution timer. It handles:
  - Starting, stopping, pausing, and resuming timers.
  - Persisting timer state to `localStorage` to survive page refreshes.
  - Calculating elapsed time for both timers.
  - Providing functions to reset and restore timer values.

## 2. Utility Hooks

- **`useBrowserBackIntercept.js`**: Intercepts the browser's back button functionality to close modals gracefully instead of navigating away. It maintains a stack of open modals.

- **`useFieldPositionHandlers.js`**: A helper hook that simplifies the integration of `useLongPressWithScrollDetection` for various field positions, adapting to different formation types.

- **`useGameModals.js`**: Manages the state and actions for various modals used throughout the game UI (e.g., player selection, substitute options, goalie switch). It integrates with `useBrowserBackIntercept`.

- **`useLongPressWithScrollDetection.js`**: Provides long-press detection for touch and mouse events, with a crucial feature to cancel the long press if the user scrolls, preventing accidental actions during scrolling.

- **`useTeamNameAbbreviation.js`**: Handles the dynamic abbreviation of team names in the score display based on available screen width, ensuring the UI remains responsive.

## 3. Key Interactions & Data Flow

- **Centralized State (`useGameState`)**: Almost all application state flows through `useGameState`. Components interact with the game state by calling functions provided by this hook (e.g., `handleSubstitution`, `switchPlayerPositions`).

- **UI State Separation (`useGameUIState`)**: `useGameUIState` manages visual feedback and temporary UI states, keeping them separate from the core game logic in `useGameState`. This separation allows for independent development and testing of UI behaviors.

- **Timer Integration (`useTimers`)**: `useTimers` provides the current time values to the UI and also exposes functions (`pauseSubTimer`, `resumeSubTimer`) that `useGameState` can call to update player time statistics when the timer state changes.

- **Persistence**: Both `useGameState` and `useTimers` leverage `localStorage` for state persistence, ensuring that the game state and timers are preserved across browser sessions or accidental refreshes.

## 4. How to Make Changes

- **Modifying Game Logic**: Changes to core game rules (e.g., how substitutions work, how time is calculated for stats) should primarily be implemented in the `src/game/` directory. `useGameState` would then call these updated pure functions.

- **Adding New UI Features**: If a new UI feature requires new state or interactions, consider whether it belongs in `useGameState` (core game data) or `useGameUIState` (visual/temporary UI state). Create new utility hooks if the logic is reusable across multiple components.

- **Debugging State Issues**: When debugging, inspect the state managed by `useGameState` and `useTimers` to understand the current application state. Pay attention to how actions modify this state and how effects (`useEffect`) synchronize data or trigger side effects.