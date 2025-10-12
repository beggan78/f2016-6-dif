# Gemini Project Brief: src/components/setup

This directory contains the React components responsible for the initial game configuration and period setup. These components guide the user through selecting a squad, assigning goalies, setting game parameters, and defining the starting formation for each period.

## 1. Key Components

- **`ConfigurationScreen.js`**: This is the initial screen where users configure a new game. It allows:
  - **Squad Selection**: Choosing 6 or 7 players from the full roster.
  - **Game Settings**: Setting the number of periods, period duration, and substitution alert times.
  - **Team Configuration**: Selecting between Pairs or Individual configurations for 7-player squads.
  - **Goalie Assignment**: Assigning a goalie for each period.
  - **Opponent Team Name**: Input for the opponent's team name.

- **`PeriodSetupScreen.js`**: This screen is displayed before each period (or after the initial configuration). It allows the user to:
  - **Assign Players to Positions**: Manually assign players to specific field positions (defender, attacker) and substitute roles based on the chosen team configuration.
  - **Review Current Score**: Displays the current score before starting a new period.
  - **Goalie Confirmation**: Confirms or allows changing the goalie for the current period.
  - **Formation Validation**: Ensures that all required positions are filled before starting the period.

- **`PairSelectionCard.js`**: A reusable sub-component used within `PeriodSetupScreen` to facilitate player assignment for a specific pair (Left, Right, or Substitutes) in Pairs mode.

- **`IndividualPositionCard.js`**: A reusable sub-component used within `PeriodSetupScreen` to facilitate player assignment for a specific individual position (e.g., Left Defender, Substitute) in Individual modes.

## 2. Core Architectural Concepts

### a. Controlled Components
All input fields and selection dropdowns are controlled components, meaning their values are managed by React state (specifically, the state within `useGameState`). Changes are propagated via `onChange` handlers that update the `useGameState` hook.

### b. Progressive Disclosure
The UI adapts based on user selections. For example, goalie assignment options only appear once a squad size is selected, and team mode selection is only available for 7-player squads.

### c. Configuration-Specific UI
The `PeriodSetupScreen` dynamically renders different player assignment interfaces (`PairSelectionCard` vs. `IndividualPositionCard`) based on the team configuration selected in `ConfigurationScreen`. This ensures the UI is always relevant to the chosen configuration.

### d. Input Validation & Feedback
Basic input validation (e.g., squad size, goalie assignments) is performed before proceeding to the next step, providing immediate feedback to the user.

### e. Integration with `useGameState`
These components heavily rely on the `useGameState` hook to read and update the global game state. Functions like `setSelectedSquadIds`, `setNumPeriods`, `setPeriodGoalieIds`, `setFormation`, `handleStartPeriodSetup`, and `handleStartGame` are all provided by `useGameState`.

## 3. Key Data Flows

1.  **Configuration to Game State**: User selections in `ConfigurationScreen` (squad, periods, duration, team configuration, goalies) directly update the corresponding state variables in `useGameState`.

2.  **Period Setup to Game State**: Player assignments in `PeriodSetupScreen` update the `formation` state in `useGameState`. When `handleStartGame` is called, `useGameState` finalizes the formation and transitions the view to the game screen.

3.  **Recommendations**: For periods 2 and 3, `useGameState` pre-populates the `formation` based on intelligent recommendations from `formationGenerator.js`, which `PeriodSetupScreen` then displays for review and optional manual adjustment.

## 4. How to Make Changes

-   **Adding New Configuration Options**: If new game settings are introduced, add them to `ConfigurationScreen.js`, ensure they are managed by `useGameState`, and update `gameConfig.js` if they are fixed options.

-   **Modifying Player Assignment Logic**: Changes to how players are assigned to positions (e.g., new validation rules, different assignment methods) would primarily involve modifying `handlePlayerAssignment`, `handleIndividualPlayerAssignment`, or `handleIndividual7PlayerAssignment` functions within `PeriodSetupScreen.js`.

-   **Updating Formation Display**: If the visual layout or interaction for assigning players within a formation changes, modify `PairSelectionCard.js` or `IndividualPositionCard.js` accordingly.

-   **Enhancing Recommendations**: While the display is here, the core recommendation logic resides in `src/utils/formationGenerator.js`. Changes to how recommendations are generated should be made there, and `PeriodSetupScreen` will automatically reflect them.