# Gemini Project Brief: src/components/shared

This directory contains reusable UI components that are shared across different screens and features of the application. These components are designed to be generic, highly configurable through props, and adhere to the application's visual design system, promoting consistency and reducing development effort.

## 1. Key Components

- **`UI.js`**: This file serves as a central hub for basic, atomic UI elements. It exports:
  - **`Input`**: A styled text input field.
  - **`Select`**: A styled dropdown selection component.
  - **`Button`**: A versatile button component with different variants (primary, secondary, danger, accent), sizes, and optional icons.
  - **`ConfirmationModal`**: A generic modal for displaying confirmation messages and capturing user decisions.
  - **`FieldPlayerModal`**: A modal specifically for displaying options related to field players (e.g., set to go off next, substitute now, change position).
  - **`SubstitutePlayerModal`**: A modal for options related to substitute players (e.g., activate/inactivate, set to go in next).
  - **`GoalieModal`**: A modal for selecting a new goalie.
  - **`ScoreEditModal`**: A modal for manually editing the game score.

- **`AddPlayerModal.js`**: A dedicated modal for adding temporary players to the roster during game configuration.

- **`HamburgerMenu.js`**: The navigation menu component, typically found in the header. It provides options like adding players, switching team modes (for 7-player squads), and starting a new game.

## 2. Core Architectural Concepts

### a. Reusability
Each component is built to be highly reusable. They accept props to customize their appearance and behavior, allowing them to be used in various contexts without modification.

### b. Design System Adherence
These components embody the application's visual design system (primarily driven by Tailwind CSS). By using these shared components, the application maintains a consistent look and feel across all its screens.

### c. Accessibility
Components are designed with accessibility in mind, including proper use of HTML elements (e.g., `label` for `Input` and `Select`), ARIA attributes where necessary, and focus management for modals.

### d. Modularity
Each component is self-contained and focuses on a single responsibility (e.g., `Button` only renders a button, `Select` only renders a dropdown). This modularity makes them easier to understand, test, and maintain.

### e. Controlled Components
Input and Select components are designed to be controlled components, meaning their state is managed by their parent component, ensuring a predictable data flow.

## 3. Key Data Flows

- **Props-Driven Configuration**: Parent components pass data and callback functions as props to these shared components. For example, a `Button` receives an `onClick` handler, and a `Select` receives `options` and an `onChange` handler.

- **Modal Interactions**: Modals (like `FieldPlayerModal` or `ScoreEditModal`) are typically opened by handlers (from `src/game/handlers/`) or other UI components. They then use callbacks (e.g., `onConfirm`, `onSave`) to communicate user actions back to the parent logic.

- **Input Sanitization**: The `AddPlayerModal` uses `sanitizeNameInput` from `src/utils/inputSanitization.js` to ensure user input adheres to defined rules before being processed.

## 4. How to Make Changes

- **Modifying Component Appearance**: To change the visual style of a shared component (e.g., button colors, input borders), modify its Tailwind CSS classes directly within its JSX. For global changes, consider updating the `tailwind.config.js` file.

- **Adding New Shared Component**: If a new UI element is needed that will be used in multiple places, create a new file in this directory. Design it to be generic and configurable through props.

- **Enhancing Existing Component**: To add new functionality (e.g., a new button variant, an additional prop for an input), modify the component's code and update its prop types/documentation.

- **Debugging UI Issues**: When a shared component isn't behaving as expected, check the props it's receiving from its parent. Ensure the data is correct and that the callback functions are being triggered as intended.