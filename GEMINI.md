# Gemini Project Brief: Sport Wizard

## 1. Project Overview
This is a mobile-first React web application for coaching youth soccer teams, focusing on managing player rotations, tracking playing time, and ensuring fair substitution patterns in 5v5 games.

## 2. Technology Stack
- **Frontend**: React 19 with Hooks
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: Custom hooks (`useGameState`, `useGameUIState`) with `localStorage` for persistence.
- **Build Tool**: Create React App (CRA)

## 3. Project Structure
- **`src/`**: Main application source code.
  - **`src/components/`**: UI components, divided by screen (e.g., `game/`, `setup/`).
  - **`src/game/`**: Core game logic, separated from UI.
    - **`src/game/logic/`**: Handles game state transitions, position utilities, and substitution management (`substitutionManager.js`).
    - **`src/game/queue/`**: Manages the player rotation queue (`rotationQueue.js`).
    - **`src/game/time/`**: Manages timers and player stint calculations (`stintManager.js`).
  - **`src/hooks/`**: Custom React hooks for managing state and side effects.
  - **`src/constants/`**: Application-wide constants (e.g., player data, game configuration).
  - **`src/utils/`**: Utility functions, including formation generation and persistence management.
- **`public/`**: Static assets and `index.html`.
- **`package.json`**: Project dependencies and scripts.

## 4. Key Architectural Concepts
The application's logic is built around a few core concepts:

### a. Game State Management
- **`useGameState` hook**: The primary hook for managing the core game state (players, formations, time, etc.).
- **`persistenceManager.js`**: Handles saving and loading the game state to/from `localStorage`, allowing the app to survive browser refreshes.
- State is generally immutable. Logic functions compute a new state, which is then set.

### b. Rotation and Substitution Logic
The core of the application is its system for ensuring fair play time. This logic differs by game mode:
- **Individual Modes (6 & 7 players)**:
  - A **rotation queue** (`src/game/queue/rotationQueue.js`) dictates substitution order.
  - At the start of periods 2 and 3, the queue is rebuilt based on players' accumulated field time (least time first).
  - During a period, the queue follows a strict round-robin rotation: the player at the front of the queue is substituted off and moved to the end.
- **Pairs Mode (7 players)**:
  - Players are grouped into pairs. Substitutions happen at the pair level.
  - The system recommends which pair to substitute based on the total playing time of the players in the pair.
  - For periods 2 and 3, it tries to keep pairs together while swapping their roles (defender/attacker) to ensure balanced experience. It will only break pairs if necessary to meet time-balancing rules.

### c. Formation Recommendation System
- For periods 2 and 3, the app suggests formations to balance playing time and roles (attacker vs. defender).
- **Individual Mode**: Sorts players by total time on field to determine who starts. Assigns field positions based on who needs more defender/attacker time.
- **Pairs Mode**: Prioritizes keeping pairs intact. For period 3, it enforces strict role balancing based on defender/attacker time ratios, breaking pairs only if necessary.

## 5. Development Workflow
- **Install Dependencies**:
  ```bash
  npm install
  ```
- **Run Development Server**:
  ```bash
  npm start
  ```
- **Run Tests**:
  ```bash
  npm test
  ```
- **Build for Production**:
  ```bash
  npm run build
  ```