# Gemini Project Brief: src/components/game

This directory contains the React components responsible for rendering the main game screen and its sub-components, particularly the player formation visualizations. It acts as the primary interface between the user and the core game logic.

## 1. Directory Structure

- **`GameScreen.js`**: The main component for the live game view. It orchestrates all other sub-components, manages UI-specific state, and integrates with various hooks to interact with the core game state and timers.
- **`formations/`**: Contains components responsible for rendering the player formations on the field.
  - **`FormationRenderer.js`**: A smart component that dynamically renders either `PairsFormation` or `IndividualFormation` based on the `teamMode` prop.
  - **`PairsFormation.js`**: Renders the 7-player pairs formation, displaying pairs of defenders and attackers, and a substitute pair.
  - **`IndividualFormation.js`**: Renders the 6-player or 7-player individual formations, displaying players in specific positions (e.g., Left Defender, Right Attacker, Substitutes).
  - **`formations/components/PlayerStatsDisplay.js`**: A small, reusable component to display a player's total outfield time and attacker/defender time difference.
  - **`formations/constants.js`**: Defines shared styling, icon classes, position display names, and help messages used across the formation components.

## 2. Core Architectural Concepts

### a. UI-Logic Separation
This directory is strictly for UI rendering and user interaction. It consumes data and functions from `src/hooks/useGameState` and `src/hooks/useGameUIState` but does not contain core game simulation logic. This separation ensures that the game logic remains pure and testable independently of the UI.

### b. Event-Driven Interactions
User interactions (taps, long presses) on player cards trigger callbacks that are ultimately handled by functions provided by `useGameState` or `useGameUIState`. This pattern ensures that UI events are translated into state changes in a controlled manner.

### c. Visual Feedback & Animation
- **`useGameUIState`**: Manages animation states (`animationState`) and tracks `recentlySubstitutedPlayers` to provide visual cues (e.g., glow effects, player movement animations) during substitutions and other game events.
- **`playerAnimation.js` (in `src/game/ui/`)**: Provides utility functions to determine CSS classes for player animations based on the current `animationState`.
- **`playerStyling.js` (in `src/game/ui/`)**: Provides utility functions to determine dynamic styling (background colors, border colors, text colors) based on player status, role, and next substitution indicators.

### d. Dynamic Formation Rendering
`FormationRenderer` abstracts away the complexity of different team modes, allowing `GameScreen` to simply pass the `teamMode` and relevant data, and the correct formation visualization is rendered automatically.

### e. Modals for Complex Interactions
Complex user interactions (e.g., selecting a player for substitution, changing a goalie) are handled via modals, managed by `useGameModals`. This keeps the main `GameScreen` clean and focuses user attention on the specific interaction.

## 3. Key Data Flows

1.  **Game State to UI**: `useGameState` provides the `periodFormation`, `allPlayers`, `matchTimerSeconds`, `subTimerSeconds`, etc., as props to `GameScreen`. These props are then passed down to `FormationRenderer` and other sub-components for display.

2.  **User Interaction to Logic**: When a user taps or long-presses a player card:
    - `useLongPressWithScrollDetection` detects the interaction.
    - `useFieldPositionHandlers` maps the interaction to a specific callback (e.g., `leftDefenderCallback`).
    - This callback (defined in `createFieldPositionHandlers` within `src/game/handlers/`) opens a modal via `useGameModals`.
    - Once the user confirms an action in the modal (e.g., "SUB NOW"), a function from `useGameState` (e.g., `handleSubstitution`) is called, triggering a state update.

3.  **Animation Flow**: When `handleSubstitution` (from `useGameState`) is called, it updates `useGameUIState.animationState`. This state change propagates down to `FormationRenderer` and its children, which then apply the appropriate animation classes to player elements.

## 4. How to Make Changes

- **Styling/Layout**: Modify Tailwind CSS classes directly within the JSX of the relevant component (`PairsFormation.js`, `IndividualFormation.js`, `GameScreen.js`). Use `formations/constants.js` for shared styles.
- **Visual Indicators**: Adjust the logic in `src/game/ui/positionUtils.js`, `playerStyling.js`, and `playerAnimation.js` to change how players are highlighted or animated. Update `formations/constants.js` for new colors or icons.
- **New Interaction Flows**: If adding a new type of user interaction, define a new callback in `src/game/handlers/` and integrate it with `useGameModals` and `useGameState` as appropriate. Ensure the UI component (e.g., `GameScreen`) passes the necessary props and callbacks.
- **Debugging UI Issues**: Use React Developer Tools to inspect component props and state. Verify that the data received from `useGameState` and `useGameUIState` is correct and that UI components are rendering accordingly.