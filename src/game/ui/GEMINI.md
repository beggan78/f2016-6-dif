# Gemini Project Brief: src/game/ui

This directory contains utility functions specifically designed to support the user interface (UI) of the game screen. These utilities abstract away the logic for dynamic styling, animation, and position-specific display, ensuring a consistent and maintainable visual presentation.

## 1. Key UI Utility Modules

- **`playerAnimation.js`**: Provides functions to determine the animation properties (CSS classes, z-index, inline styles) for individual players and pairs based on the current `animationState` (managed by `useGameUIState`). It integrates with `src/game/animation/animationSupport.js` to apply the actual animation effects.

- **`playerStyling.js`**: Contains logic to calculate and return the appropriate CSS classes for background colors, text colors, border colors, and glow effects for player cards. This styling is dynamic and depends on a player's status (on field, substitute, inactive), their role in the next substitution, and whether they were recently involved in a substitution.

- **`positionUtils.js`**: Offers helper functions for rendering position-specific UI elements. This includes:
  - Determining the correct icon (e.g., shield for defender, sword for attacker, rotate for substitute).
  - Getting the display name for a position, with special handling for inactive players in 7-player individual mode.
  - Calculating `isNextOff`, `isNextOn`, `isNextNextOff`, and `isNextNextOn` indicators, which drive the visual cues for upcoming substitutions.
  - Providing a way to extract long-press event handlers for each position.
  - Functions to check if a team mode supports inactive players or next/next-next indicators.

## 2. Core Architectural Concepts

### a. UI-Specific Logic
These modules encapsulate logic that is purely for presentation. They do not modify the game state directly but rather interpret the current game state to determine how elements should look or behave visually.

### b. Dynamic Styling and Animation
The utilities enable highly dynamic UI. Player cards change appearance (color, border, glow) and can animate based on their status, role, and involvement in recent game events. This provides rich visual feedback to the user.

### c. Abstraction of Complexity
Instead of embedding complex conditional styling and animation logic directly within React components, these utilities abstract that complexity into reusable functions. This keeps the React components cleaner and more focused on rendering structure.

### d. Integration with Constants
These modules heavily rely on constants defined in `src/components/game/formations/constants.js` (e.g., `FORMATION_STYLES`, `ICON_STYLES`, `POSITION_DISPLAY_NAMES`) to ensure consistent visual language and easy modification of styling parameters.

## 3. Key Data Flows

- **Game State to UI Utilities**: React components (like `IndividualFormation.js` and `PairsFormation.js`) pass relevant game state data (e.g., `player.stats`, `animationState`, `nextPlayerIdToSubOut`) to functions in `playerAnimation.js`, `playerStyling.js`, and `positionUtils.js`.

- **Utility Output to Components**: These utility functions return CSS classes, style objects, icons, and display strings, which the React components then apply to their JSX elements to render the dynamic UI.

## 4. How to Make Changes

- **Changing Visual Appearance**: To modify colors, borders, or general styling, adjust the values in `src/components/game/formations/constants.js` or directly within `playerStyling.js`.

- **Modifying Animation Behavior**: Changes to how players animate during substitutions or position swaps should be made in `playerAnimation.js` and potentially `src/game/animation/animationSupport.js`. This might involve adjusting CSS keyframes or the logic that applies animation classes.

- **Adjusting Indicators**: If the logic for showing "next off" or "next on" indicators needs to change, modify `positionUtils.js`, specifically the `getIndicatorProps` function. This includes adding new types of indicators or altering their conditions.

- **Adding New Position-Specific UI**: If new types of positions or player roles are introduced, update `positionUtils.js` to provide appropriate icons, display names, and styling rules for them.