# Gemini Project Brief: src/game

This directory contains the core, non-UI logic for the soccer game simulation. It is designed to be a pure data-in, data-out engine that can be tested independently of the React frontend.

## 1. Directory Structure

- **`logic/`**: Contains the primary state transition functions. These functions take the current game state and an action (e.g., substitution, position switch) and return a new, updated game state.
  - `gameStateLogic.js`: The main entry point for all game actions. It orchestrates calls to other modules.
  - `substitutionManager.js`: Encapsulates the complex rules for substitutions, which vary significantly between team modes (Pairs vs. Individual).
  - `positionUtils.js`: Provides helper functions for querying formation structures and determining player roles based on their position.
- **`queue/`**: Manages the player rotation queue, which is fundamental to the fair play time algorithm in individual modes.
  - `rotationQueue.js`: A class that handles the order of players for substitutions, including support for temporarily inactive players in the 7-player individual mode.
- **`time/`**: Contains all logic related to time tracking.
  - `stintManager.js`: Manages player "stints"—the period of time a player spends in a single role (e.g., defender, goalie). It updates player stats with accumulated time.
  - `timeCalculator.js`: A set of pure functions for low-level time calculations (e.g., calculating duration, formatting time).

## 2. Core Architectural Concepts

### a. Pure Functions & Immutability
The entire game engine is built on the principle of immutability. Functions in `gameStateLogic.js` do not modify the state directly. Instead, they take the current state as an argument and return a completely new state object. This makes the logic predictable, testable, and easy to integrate with React's state management.

### b. State-Driven Logic
All decisions are based on the current `gameState` object. The logic is deterministic: for a given state and a given action, the result will always be the same. There are no hidden side effects.

### c. Decoupling of Concerns
- **Logic vs. UI**: This directory has no knowledge of React or the DOM. It only deals with data structures representing the game.
- **Time vs. Logic**: Time calculations are isolated in `src/game/time`. The main game logic consumes these calculations but is not concerned with their implementation.
- **Queue vs. Logic**: The rotation queue is a self-contained data structure, allowing the substitution logic to focus on the "what" (who gets substituted) while the queue handles the "how" (maintaining the order).

## 3. Key Data Flows

1.  **Substitution (Individual Mode)**:
    - `gameStateLogic.calculateSubstitution` is called.
    - It invokes `substitutionManager.handleIndividualSubstitution`.
    - The `substitutionManager` uses `rotationQueue.js` to identify the next player to come off and the next to go on.
    - The outgoing player is moved to the end of the `rotationQueue`.
    - `stintManager.js` is used to finalize the time tracking for the players involved before their roles/statuses are changed.
    - A new `gameState` object is returned with the updated formation, player stats, and rotation queue.

2.  **Time Update**:
    - The UI layer periodically calls functions that use `stintManager.updatePlayerTimeStats`.
    - This function gets the duration of the current stint from `timeCalculator.calculateCurrentStintDuration`.
    - It adds this duration to the relevant time counters (e.g., `timeOnFieldSeconds`, `timeAsDefenderSeconds`) based on the player's current role and status.

## 4. How to Make Changes

- **For bugs in game logic**: Start by writing a failing test in the relevant `__tests__` directory that reproduces the bug. Then, trace the data flow starting from `gameStateLogic.js` to pinpoint the incorrect calculation or state transition.
- **For new features**: Add new functions to `gameStateLogic.js` for new actions. If the feature involves complex, self-contained logic, create a new manager module (similar to `substitutionManager`) and have `gameStateLogic` delegate to it. Ensure all new logic is covered by unit tests.