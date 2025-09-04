# Pending Match Resume Feature - Implementation Plan

## Overview
Allow users to configure matches hours before they start. Matches can currently (implicitly) be saved in 'pending' state by clicking "Enter Game" in the PeriodSetupScreen.
Resume them later with the ability to make last-minute changes before starting the match.

## Current System Analysis
- ✅ `matchRecoveryService.js` handles 'finished' state matches
- ✅ `useMatchRecovery` hook manages recovery workflow  
- ✅ `MatchRecoveryModal` presents save/delete options
- ✅ Player stats stored in database when match reaches 'finished'
- ✅ Match lifecycle: `pending` → `running` → `finished` → `confirmed`

## Key Design Decisions

### Substitution Configuration Storage
**Problem**: Substitution mode has complex sub-options that need to be persisted:
- **Individual** substitutions (simple)
- **Pairs** substitutions with two sub-modes:
  - "Keep roles throughout period" (`keep_throughout_period`)
  - "Swap roles every rotation" (`swap_every_rotation`)

**Solution**: Store complete substitution configuration as JSON in database
- **Database**: Add `substitution_config jsonb DEFAULT '{}'::jsonb` column to `match` table
- **Flexibility**: Supports current modes + future substitution types without schema changes
- **Validation**: Application-level validation, no database constraints for now
- **Migration**: Existing records get `{}` default, handled gracefully in code

### User Experience Flow
**Navigation**: Resume pending match → PeriodSetupScreen (not direct to game)
- Pre-populate formation, squad, opponent, periods from database
- All substitution configuration already stored and restored
- User can review/modify before "Enter Game"
- Clean separation: database provides saved config, user confirms/adjusts

## Implementation Phases

### Phase 1: Core Services & Detection
**Goal**: Detect and manage pending matches at the service layer

#### 1.1 Extend Match Recovery Service
- **File**: `src/services/matchRecoveryService.js`
- **Add function**: `checkForPendingMatches()`
  - Query matches with `state: 'pending'` for current team
  - Return array with match info (id, opponent, created_at, formation, etc.)
- **Add function**: `validatePendingMatchData(matchId)`
  - Verify match belongs to current team
  - Check player_match_stats consistency
  - Return validation status and any issues

#### 1.2 Database Schema Update
- **Migration**: Add `substitution_config jsonb DEFAULT '{}'::jsonb` to `match` table
- **No constraints**: Application handles validation, database remains flexible
- **Backward compatibility**: Existing records get `{}` default

#### 1.3 Create Pending Match Service
- **New file**: `src/services/pendingMatchService.js`
- **Functions**:
  - `loadPendingMatchData(matchId)` - Load match + player_match_stats + substitution_config
  - `resumePendingMatch(matchId)` - Build complete game state object from database
  - `deletePendingMatch(matchId)` - Remove match and associated stats
  - `reconstructFormationFromStats(playerStats, matchData)` - Rebuild formation layout
  - `parseSubstitutionConfigToTeamConfig(substitutionConfig)` - Convert JSON to team config format
  - `validatePlayerRoster(playerStats, currentTeamPlayers)` - Check roster changes

#### 1.4 Update Match State Manager
- **File**: `src/services/matchStateManager.js`
- **Updates**:
  - `formatMatchDataFromGameState()` - Include substitution config in match data
  - `formatSubstitutionConfigFromGameState(gameState)` - Convert team config to JSON format
  - `createMatch()` and `updateExistingMatch()` - Store substitution_config field

### Phase 2: Hook Integration & State Management  
**Goal**: Integrate pending match detection into existing recovery system

#### 2.1 Extend Match Recovery Hook
- **File**: `src/hooks/useMatchRecovery.js`
- **Add state**:
  - `pendingMatches` - Array of available pending matches
  - `showPendingMatchesModal` - Boolean for modal visibility
  - `selectedPendingMatch` - Currently selected match for operations
- **Add functions**:
  - `handleResumePendingMatch(matchId)` - Resume selected match
  - `handleDeletePendingMatch(matchId)` - Delete selected match  
  - `handleClosePendingModal()` - Close modal without action
- **Update effect**: Check for both finished AND pending matches on login

#### 2.2 Game State Integration
- **Files**: Game state loading logic
- **Add capability**: `loadGameStateFromDatabase(matchData, playerStats, substitutionConfig)`
  - Reconstruct formation layout from `started_as` fields
  - Set squad selection from participating players
  - Load match configuration (periods, duration, opponent, etc.)
  - Restore complete substitution configuration (type + sub-options)
  - Navigate to PeriodSetupScreen with pre-populated, editable config

### Phase 3: User Interface Components
**Goal**: Create user-friendly interface for pending match management

#### 3.1 Pending Matches Modal
- **New file**: `src/components/modals/PendingMatchesModal.js`
- **Features**:
  - List all pending matches with essential details
  - Match info: opponent name, creation date/time
  - Actions per match: "Resume", "Delete"
  - Global actions: "Configure New Match", "Close"
  - Handle empty state (no pending matches)
  - Loading and error states
  - Simple, focused interface - detailed config review happens in PeriodSetupScreen

### Phase 4: Integration & Navigation
**Goal**: Integrate pending match flow into main application

#### 4.1 App Integration
- **File**: `src/App.js`
- **Updates**:
  - Import and render `PendingMatchesModal`
  - Connect to extended `useMatchRecovery` hook
  - Handle navigation when resuming pending matches
  - Determine target screen (PERIOD_SETUP vs GAME based on match state)

#### 4.2 Navigation Flow
- **Simplified Logic**: All pending match resumes → PeriodSetupScreen
  - Pre-populate all configuration from database (formation, squad, opponent, periods, substitution config)
  - User can review and modify any settings before proceeding
  - Complete team configuration ready for use
  - "Enter Game" button transitions `pending` → `running` (existing behavior)
  - Consistent user experience regardless of when match was saved

### Phase 5: Edge Cases & Polish
**Goal**: Handle complex scenarios and improve user experience

#### 5.1 Data Validation & Error Handling
- **Scenarios**:
  - Player roster has changed since match creation
  - Match data is corrupted or incomplete
  - Multiple pending matches for same opponent
  - Very old pending matches (cleanup policy?)
- **Solutions**:
  - Clear validation messages in modal
  - Graceful fallbacks to manual configuration
  - Option to "Fix Issues" that guides user through corrections

#### 5.2 User Experience Enhancements
- **Features**:
  - Sort pending matches by creation date
  - Search/filter pending matches
  - Bulk actions (delete multiple)
  - Confirmation dialogs for destructive actions
  - Loading states during database operations

#### 5.3 Testing Strategy
- **Unit Tests**:
  - Service functions for loading/validating pending matches
  - Game state reconstruction logic
  - Hook state management
- **Integration Tests**:
  - End-to-end pending match resume flow
  - Navigation between screens
  - Database consistency after operations

## Technical Considerations

### Database Schema
- ✅ Match table supports `state: 'pending'` 
- ✅ `player_match_stats` stores initial formation via `started_as`
- ✅ New `substitution_config jsonb DEFAULT '{}'::jsonb` column for complete substitution configuration
- ✅ All required fields present for full match reconstruction

### Security & Permissions
- ✅ Existing RLS policies cover pending matches
- ✅ Team membership validation already in place
- Ensure pending match operations respect team boundaries

### Performance
- Index on `(team_id, state)` for efficient pending match queries
- Batch load player stats for multiple pending matches
- Consider caching for frequently accessed pending matches

### Backward Compatibility
- All changes extend existing functionality
- No breaking changes to current finished match recovery
- Graceful handling of edge cases

## Success Metrics
1. Users can successfully create and resume pending matches
2. Formation and player data reconstructs accurately
3. No data loss during pending match operations
4. Smooth user experience with clear action options
5. Proper error handling for all edge cases

## Dependencies
- Existing match state management system
- Current authentication and team management
- Established database schema and RLS policies
- UI component library and modal patterns