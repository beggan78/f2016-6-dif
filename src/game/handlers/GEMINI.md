# Gemini Project Brief: src/game/handlers

This directory contains handler functions that act as an intermediary layer between the UI components and the core game logic. They are responsible for translating user interactions into calls to the pure game state logic, managing UI-specific side effects (like animations and modals), and coordinating updates across different parts of the application state.

## 1. Key Handler Modules

- **`substitutionHandlers.js`**: This is the most complex handler, managing all aspects of player substitutions and position changes. It orchestrates:
  - Calling `calculateSubstitution` from `src/game/logic/gameStateLogic`.
  - Triggering UI animations via `animateStateChange`.
  - Managing the `lastSubstitution` state for undo functionality.
  - Handling modal interactions for setting next substitutions, performing swaps, and managing inactive players.

- **`fieldPositionHandlers.js`**: Creates callbacks for long-press events on player positions (field players and substitutes). These callbacks open appropriate modals (`FieldPlayerModal`, `SubstitutePlayerModal`) based on the formation type and the player's role.

- **`goalieHandlers.js`**: Manages the logic for changing the goalie. It opens the `GoalieModal`, calls `calculateGoalieSwitch` from `src/game/logic/gameStateLogic`, and triggers animations.

- **`scoreHandlers.js`**: Handles adding goals and editing the score. It interacts with the score state in `useGameState` and opens the `ScoreEditModal`.

- **`timerHandlers.js`**: Manages pausing and resuming the substitution timer. Crucially, it calls `handlePauseResumeTime` from `src/game/time/stintManager` to ensure player time statistics are correctly updated when the timer state changes.

## 2. Core Architectural Concepts

### a. Separation of Concerns
Handlers decouple the UI from the core game logic. UI components (like `GameScreen.js`) don't directly manipulate game state or perform complex calculations. Instead, they call handler functions, which then interact with the appropriate logic modules.

### b. Orchestration Layer
Handlers act as an orchestration layer. They gather necessary data from the current game state, pass it to the pure logic functions (from `src/game/logic/`), receive the new state, and then update the React state via `stateUpdaters` (provided by `useGameState`). They also coordinate UI feedback like animations and modal displays.

### c. Animation Integration
Many handlers integrate with the `animateStateChange` utility (from `src/game/animation/animationSupport`) to provide smooth visual transitions for game events like substitutions and position swaps. This ensures a consistent and responsive user experience.

### d. Modals as Interaction Flows
Handlers frequently use the `modalHandlers` (from `useGameModals`) to guide users through multi-step interactions, such as selecting a player for a position swap or confirming an action.

## 3. Key Data Flows

- **UI Event -> Handler -> Logic -> State Update -> UI Re-render**:
  1.  A user interaction (e.g., long-press on a player card) triggers a callback in `GameScreen.js`.
  2.  This callback invokes a handler function (e.g., `fieldPositionHandlers.leftDefenderCallback`).
  3.  The handler opens a modal (e.g., `FieldPlayerModal`).
  4.  Upon user confirmation in the modal, another handler function (e.g., `substitutionHandlers.handleSubstituteNow`) is called.
  5.  This handler calls a pure logic function (e.g., `calculateSubstitution` from `src/game/logic/gameStateLogic`) with the current game state.
  6.  The new game state is returned, and the handler uses `stateUpdaters` to update the `useGameState` hook.
  7.  `useGameState` updates its internal state, triggering a re-render of `GameScreen.js` and its children with the new data.
  8.  Animations are triggered by updates to `useGameUIState` via `animationHooks`.

## 4. How to Make Changes

- **Modifying Interaction Flow**: If the sequence of user actions for a particular feature needs to change (e.g., adding a confirmation step), modify the relevant handler function. Ensure that modals are opened/closed correctly and that the right logic functions are called at each step.

- **Adding New UI-Triggered Logic**: If a new UI action needs to trigger a change in game state, create a new handler function (or extend an existing one). This handler should:
  - Accept necessary `gameStateFactory`, `stateUpdaters`, `animationHooks`, and `modalHandlers`.
  - Call the appropriate pure logic function from `src/game/logic/`.
  - Update the state via `stateUpdaters`.
  - Coordinate any necessary UI feedback (animations, modals).

- **Debugging**: When debugging issues related to user interactions not leading to expected state changes, trace the flow through the handlers. Verify that the correct handler is called, that it receives the expected data, and that it correctly calls the underlying logic functions and state updaters.