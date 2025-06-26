# Gemini Project Brief: src/utils

This directory contains various utility functions that provide common functionalities used across different parts of the application. These utilities are designed to be pure, reusable, and independent of React components or core game logic, promoting modularity and testability.

## 1. Key Utility Modules

- **`formationGenerator.js`**: This module is crucial for the application's intelligent recommendation system. It contains the logic for generating optimal player formations for subsequent periods, ensuring fair playing time and role distribution.
  - **`generateRecommendedFormation`**: Used for Pairs mode, it prioritizes maintaining existing partnerships while balancing roles and playing time.
  - **`generateBalancedFormationForPeriod3`**: A specialized function for Period 3 in Pairs mode, enforcing stricter role balance based on accumulated attacker/defender time.
  - **`generateIndividualFormationRecommendation`**: Used for Individual modes (6-player and 7-player), it builds a rotation queue and assigns field positions based on players' accumulated playing time, ensuring those with less time play more.

- **`persistenceManager.js`**: Manages all interactions with `localStorage` for saving, loading, and backing up the game state. It provides a robust and centralized way to ensure data persistence across sessions.
  - **`PersistenceManager` class**: A generic class for `localStorage` operations, including support checks, error handling, and state sanitization.
  - **`GamePersistenceManager` class**: Extends `PersistenceManager` with game-specific default state and methods for saving only relevant game state fields and performing auto-backups.

- **`playerUtils.js`**: Provides helper functions for common player-related operations, such as initializing player objects, finding players by ID, getting player names, and filtering players by status or squad.

- **`formatUtils.js`**: Contains functions for formatting various data types for display, such as time (MM:SS), time differences (with +/- signs), and player statistics for export.

- **`inputSanitization.js`**: Offers utilities for sanitizing and validating user input, primarily for player names, to prevent invalid characters or excessive length.

- **`formationUtils.js`**: Provides general utilities related to formation structures, such as getting all positions for a given formation type.

- **`rolePointUtils.js`**: Contains the logic for calculating player role points based on their time spent as goalie, defender, and attacker, used for statistical analysis and fair play tracking.

## 2. Core Architectural Concepts

### a. Pure Functions
Most utility functions in this directory are pure: they take inputs and produce outputs without causing side effects or relying on external mutable state. This makes them highly testable and predictable.

### b. Reusability
These utilities are designed to be used across different components and modules (e.g., `useGameState`, UI components, other game logic modules), reducing code duplication and promoting a consistent approach to common tasks.

### c. Decoupling
Utilities are generally decoupled from the React component lifecycle and specific game state management. They operate on raw data, making them flexible and easy to integrate into various contexts.

## 3. Key Data Flows

- **Formation Generation**: `useGameState` calls functions from `formationGenerator.js` during period setup to get recommended formations. These functions take player stats and previous formation data as input and return a new formation structure and rotation queue.

- **State Persistence**: `useGameState` interacts with `persistenceManager.js` to save the entire game state to `localStorage` whenever it changes and to load it on application startup. It also uses `persistenceManager` for creating and restoring backups.

- **Player Data Handling**: `playerUtils.js` functions are used extensively by `useGameState`, UI components, and other game logic modules to manipulate and query player data.

## 4. How to Make Changes

- **Modifying Recommendation Logic**: Changes to how formations are recommended should be made in `formationGenerator.js`. Ensure that the new logic correctly processes player stats and produces valid formation structures.

- **Changing Persistence Behavior**: Adjustments to how data is saved, loaded, or backed up should be made in `persistenceManager.js`. Be cautious with changes here, as they can affect data integrity.

- **Adding New Utility**: If a new, reusable piece of logic is needed, create a new file in this directory. Ensure it is a pure function or a well-encapsulated class, and that it has no side effects unless explicitly intended and documented.