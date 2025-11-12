# AI Agent Guide: src/components/shared

This directory contains reusable UI components shared across the application. All components follow Tailwind CSS styling and are props-driven for maximum flexibility.

## Core UI Components (UI.js)

### Form Controls
- **`Input`**: Styled text input with focus states and ref forwarding. Dark theme with sky-400 focus ring.
- **`Select`**: Dropdown with custom chevron icon. Supports object options `{value, label}` or simple string arrays.
- **`MultiSelect`**: Multi-selection dropdown with checkboxes, clear function, and smart label display (shows count when >2 selected).
- **`Slider`**: Range input with visual fill and custom thumb styling. Used for volume controls.

### Buttons and Modals
- **`Button`**: Variants: `primary` (sky-600), `secondary` (slate-600), `danger` (rose-600), `accent` (emerald-600). Sizes: `sm`, `md`, `lg`. Optional Icon prop.
- **`ConfirmationModal`**: Two-button modal (confirm/cancel) with configurable variant for confirm button.
- **`ThreeOptionModal`**: Three-button modal with individual variants for each option.

### Game-Specific Modals
- **`FieldPlayerModal`**: Options for on-field players - set next to sub off, substitute now, change position. Conditional options based on `showPositionChange` and `showSubstitutionOptions`.
- **`SubstitutePlayerModal`**: Options for bench players - activate/inactivate, set as next to go in, change next position. Dynamic UI flow for position selection.
- **`GoalieModal`**: Scrollable list of players to replace current goalie. Marks inactive players as disabled.
- **`ScoreEditModal`**: Increment/decrement controls for own and opponent score.
- **`ScoreManagerModal`**: Comprehensive score management - view goal timeline, add goals scored/conceded, edit/delete goal events. Uses `goalScorers` map to resolve scorer IDs.
- **`SubstituteSelectionModal`**: Select which substitute to bring on for a specific field player.

## Specialized Components

- **`AddPlayerModal`**: Add temporary player with name input. Uses `sanitizeNameInput` utility (50 char max).
- **`GoalScorerModal`**: Three modes - `new` (select scorer), `correct` (update existing), `view` (read-only). Shows position icons (Sword/Shield/ArrowDownUp/Hand) with role-specific colors. Supports "No specific scorer" option for new goals.
- **`FeatureVoteModal`**: Feature voting UI with loading/success/error states. Shows auth prompt for unauthenticated users.
- **`PreferencesModal`**: User preferences with audio alert settings (enable/disable, sound selection, volume slider, test preview). Uses `PreferencesContext` and `audioAlertService`. Preloads sounds on open.
- **`HamburgerMenu`**: Main navigation menu with authentication state, profile, team management, statistics, tactical board, add player, and match management actions. Shows pending requests badge for team managers.

## Key Patterns

### Modal Pattern
- All modals return `null` when `!isOpen`
- Fixed overlay with `z-50` (except ScoreManagerModal at `z-50`)
- Slate-800 background with slate-600 borders
- Close button with X icon in header
- Use `onClose` callback for cancellation

### Player Name Display
- Use `formatPlayerName(player)` from `utils/formatUtils` for consistent display
- `GoalScorerModal` uses `getPlayerName(players, playerId)` for ID resolution

### Position/Role Mapping
- Position icons: `Sword` (attacker), `Shield` (defender), `ArrowDownUp` (midfielder), `Hand` (goalie), `RotateCcw` (substitute)
- Position colors: red (attacker), blue (defender), yellow (midfielder), green (goalie), gray (substitute)
- Use `getPlayerCurrentRole(player)` from `utils/playerSortingUtils`

### Input Sanitization
- Always use `sanitizeNameInput` for user-entered player names
- Max length: 50 characters

### Authentication Context
- `HamburgerMenu` integrates with `AuthContext` and `TeamContext`
- Conditionally shows protected features (team management, statistics)
- Auth modal integration via `authModal.openLogin()` / `authModal.openSignup()`

## Component Exports
All components exported via `index.js`:
- `UI.js` exports all form/modal components via barrel export
- `HamburgerMenu`, `AddPlayerModal` exported individually
- Other modals imported directly from their files
