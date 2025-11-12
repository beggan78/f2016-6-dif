# AGENTS.md - src/components/setup

Setup components for pre-game configuration and period setup. Handles squad selection, formation assignment, and goalie management.

## Key Components

### ConfigurationScreen.js
Initial game configuration screen with comprehensive state management:

**Core Configuration**:
- **Squad Selection**: 5-15 players supported (min varies by format)
- **Match Details**: Opponent name (optional, 50 char max), match type (league/friendly/cup/tournament/internal), venue type (home/away/neutral)
- **Game Settings**: Periods (1-4), duration (5-40 min), substitution alerts (0-5 min)
- **Format & Formation**: Format selection (5v5, future 7v7) with formation-specific options (2-2, 1-2-1)
- **Goalie Assignment**: Pre-assign goalies for each period
- **Captain Selection**: Optional captain assignment

**Team Configuration System**:
- Uses `createTeamConfig()` to create composite configuration with format, squadSize, and formation
- Auto-creates team config when squad size is selected (uses `createTeamConfigFromSquadSize()`)

**State Management**:
- Integrates with `useGameState` hook for all configuration state
- Sets `hasActiveConfiguration` flag when user makes changes
- Manages `resumeData` for pending match restoration
- Uses refs to prevent infinite loops in resume processing (`isProcessingResumeDataRef`, `resumeDataAppliedRef`)

**Pending Match Handling**:
- Detects pending matches via `checkForPendingMatches()`
- Shows `PendingMatchResumeModal` for NEW_SIGN_IN detection
- Resume flow: Creates resume data → applies to state → sets `currentMatchId` and `matchCreated`
- Discard flow: Calls `discardPendingMatch()` → clears state via `clearStoredState()`

**Authentication & Team Context**:
- Shows `TeamManagement` component if user has no clubs/teams
- Syncs team roster to game state via `syncPlayersFromTeamRoster()`
- Clears squad selection on NEW_SIGN_IN if team has no players

### PeriodSetupScreen.js
Formation and position assignment for each period:

**Formation Assignments**:
- Position-specific assignments (2-2: leftDefender, rightDefender, leftAttacker, rightAttacker; 1-2-1: defender, left, right, attacker; plus substitutes)

**Dynamic UI Rendering**:
- Renders `IndividualPositionCard` components for each position
- Uses `POSITION_CONFIG` map to define position titles and keys
- Uses `getModeDefinition()` to get field and substitute positions

**Player Assignment Logic**:
- Supports swapping when formation is complete (direct position swaps)
- Validates no duplicate assignments during initial setup
- Shows confirmation modal when activating inactive players
- Detects direct and indirect inactive player scenarios

**Inactive Player Handling**:
- Detects inactive players via `isPlayerInactive()` helper
- Direct scenario: User selects inactive player for field position
- Indirect scenario: Swap would place inactive player from substitute into field position
- Inactive goalie scenario: Auto-shows confirmation modal on mount if goalie is inactive
- Confirmation modal allows activation or cancellation (restores dropdown)

**Goalie Changes**:
- Period 1: Simple goalie assignment
- Period 2+: Offers to re-run recommendations when goalie changes
- Supports goalie swapping with current field player
- Updates `periodGoalieIds` and rotation queue

**Formation Validation**:
- `isFormationComplete()` checks all positions filled and no duplicates
- Disables "Enter Game" button until formation is valid

**Resume Support**:
- Accepts `resumeFormationData` prop to restore saved formations
- Applied via `useEffect` on mount

### FormationPreview.js
Visual preview component for tactical formations:

**Purpose**: Shows position layout on field with role icons for different formations

**Supported Formations**:
- 2-2: 2 defenders, 2 attackers
- 1-2-1: 1 defender, 2 midfielders, 1 attacker
- 2-2-2: 2 defenders, 2 midfielders, 2 attackers (7v7)
- 2-3-1: 2 defenders, 3 midfielders, 1 attacker (7v7)

**Rendering**: Uses field background image with absolute-positioned role icons (Shield, Sword, ArrowDownUp, Hand)

## Critical Patterns

### Configuration State Sequence
1. User selects squad → auto-creates team config
2. User selects formation → updates team config
3. Rotation queue recalculates automatically (single substitution system—no mode switch)
4. All changes set `hasActiveConfiguration` to true

### Resume Data Processing
1. Check if `resumeData` exists and not already processed
2. Set `isProcessingResumeDataRef` to prevent concurrent execution
3. Apply team config, formation, squad, goalies, match details
4. Set `isResumedMatch` and `hasActiveConfiguration` flags
5. Reset processing refs

### Guard Clauses for State Updates
- Skip auto-config when `isProcessingResumeDataRef` is true
- Skip team sync when resume processing is active
- Skip NEW_SIGN_IN cleanup when `hasActiveConfiguration` or `isResumedMatch` is true

### Player Assignment Flow (PeriodSetupScreen)
1. User selects player from dropdown
2. Check if player is inactive and target is field position → show confirmation
3. Check if swap would place inactive player in field position → show confirmation
4. Otherwise proceed with assignment/swap logic

## Key Dependencies

- **State Management**: `useGameState` hook provides all state and handlers
- **Team Context**: `useTeam` hook provides team roster and club info
- **Auth Context**: `useAuth` hook provides user and session detection
- **Constants**: `teamConfiguration.js`, `gameModes.js`, `gameConfig.js`, `matchTypes.js`, `matchVenues.js`
- **Services**: `matchStateManager.js`, `pendingMatchService.js`, `sessionDetectionService.js`
- **Utilities**: `formationGenerator.js` for period recommendations

## Important Notes

- ConfigurationScreen must render before PeriodSetupScreen in game flow
- Formation data structure differs between supported formations
- Goalie is always excluded from field/substitute position options
- Resume data processing uses refs to prevent race conditions and infinite loops
- Inactive player handling requires user confirmation before activation
- Team sync completion is coordinated with resume data processing via refs
