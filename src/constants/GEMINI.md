# Gemini Project Brief: src/constants

This directory centralizes all static, unchanging values and configurations used throughout the application. It serves as a single source of truth for game rules, player roles, formation structures, and UI options, promoting consistency and ease of modification.

## 1. Key Constant Modules

- **`formations.js`**: This is the most critical constant file, defining the complete structure and properties of all supported formation types (`PAIRS_7`, `INDIVIDUAL_6`, `INDIVIDUAL_7`). It includes:
  - `FORMATION_DEFINITIONS`: A comprehensive object detailing positions, expected player counts, and the order of positions for each formation type.
  - `POSITION_ROLE_MAP`: A lookup table that maps specific position keys (e.g., `leftDefender`, `substitute7_1`) to their corresponding `PLAYER_ROLES`.
  - Helper functions (`getFormationPositions`, `getFormationPositionsWithGoalie`) to easily retrieve position lists based on formation type.

- **`playerConstants.js`**: Defines fundamental constants related to players and their status:
  - `PLAYER_ROLES`: Enumerates the different roles a player can have (e.g., `GOALIE`, `DEFENDER`, `ATTACKER`, `SUBSTITUTE`).
  - `FORMATION_TYPES`: Lists the distinct formation types supported by the application.
  - `PLAYER_STATUS`: Defines the possible in-game statuses for a player (e.g., `ON_FIELD`, `SUBSTITUTE`, `GOALIE`).

- **`positionConstants.js`**: Contains raw string values for all unique position keys used across different formations. These are low-level identifiers that are then mapped to roles and display names in `formations.js` and UI components.

- **`gameConfig.js`**: Stores configurable options for the game setup, such as:
  - `PERIOD_OPTIONS`: Available number of periods.
  - `DURATION_OPTIONS`: Available period durations in minutes.
  - `ALERT_OPTIONS`: Configuration for substitution timer alerts.
  - `TIME_CONSTANTS`: General time-related constants.

- **`defaultData.js`**: Provides initial default data, such as the `initialRoster` of players.

- **`teamConstants.js`**: Defines constants related to team names, like `HOME_TEAM_NAME` and `DEFAULT_AWAY_TEAM_NAME`.

## 2. Core Architectural Concepts

### a. Single Source of Truth
By centralizing these values, the application ensures that all parts of the codebase refer to the same definitions, preventing inconsistencies and errors that can arise from duplicated or hardcoded values.

### b. Configuration over Code
Many aspects of the game's behavior and UI are driven by these constants. This makes the application highly configurable; changes to game rules or UI options can often be made by simply modifying a constant value rather than altering complex logic.

### c. Readability and Maintainability
Using named constants instead of magic strings or numbers improves code readability. When a value needs to be updated, it only needs to be changed in one place, simplifying maintenance.

### d. Type Safety (Implicit)
While JavaScript doesn't enforce strict types at runtime, using constants for enumerated values (like `PLAYER_ROLES` or `FORMATION_TYPES`) provides a form of implicit type safety, guiding developers to use only predefined valid options.

## 3. Key Data Flows

- **Global Access**: Constants are imported and used directly by almost every module in the application, including React components, hooks, game logic, and utility functions.

- **Formation-Driven Logic**: The `FORMATION_DEFINITIONS` in `formations.js` are particularly influential, dictating how players are positioned, how substitutions occur, and how recommendations are generated across the entire game logic.

## 4. How to Make Changes

- **Modifying Game Rules**: To change the number of periods, duration options, or player roles, update the relevant constants in `gameConfig.js` or `playerConstants.js`.

- **Adding New Formations**: To introduce a new formation type, add a new entry to `FORMATION_DEFINITIONS` in `formations.js`, ensuring all necessary properties (positions, counts, order) are defined. You might also need to update `FORMATION_TYPES` in `playerConstants.js`.

- **Updating Player Roster**: Modify the `initialRoster` array in `defaultData.js`.

- **Changing Position Keys**: If new positions are introduced, add their keys to `positionConstants.js` and then define their properties and roles in `formations.js`.