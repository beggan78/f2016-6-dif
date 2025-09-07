# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Sport Wizard - Claude Code Memory

## Project Overview
Mobile-first web application for coaching youth soccer teams with Supabase backend. Manages player rotations, tracks playing time, maintains fair substitution patterns, and provides comprehensive match history with database persistence. Supports flexible squad sizes (5-15 players) with modern composite team configuration architecture.

## Key Commands
- **Development**: `npm start` Before starting the application, check if it's already running.
- **Build**: `npm run build` 
- **Test**: `npm test` (comprehensive test suite)
- **Test Coverage**: `npm test -- --coverage` (90%+ coverage achieved)

## Development Guidelines

### Prime Instructions
- **Required documentation**: Read `README.md` and `src/game/README.md` before making changes
- **Testing guidelines**: Read `.claude/testing-guidelines.md` for testing patterns and best practices
- **Services documentation**: Read `/src/services/README.md` for database and match lifecycle patterns
- **Architecture principles**: DRY, KISS, Separation of Concerns, Single Responsibility
- **CRITICAL: SUPABASE DEPLOYMENT POLICY**: NEVER deploy Edge Functions or migrations directly to remote Supabase. ALL testing and development is done against local Supabase only. The user handles remote deployments.
- **CRITICAL: DATABASE MIGRATIONS**: Migrations are ONLY applied from GitHub Actions workflow, NEVER manually from local machine. Test new functionality against local Supabase. Apply local schema changes with `npm run db:reset` to apply local migrations.

### CRITICAL: Database User ID References
**Understanding auth.users.id vs public.user_profile.id**:

- **auth.users.id**: Supabase Auth user ID - use for RLS policies and Edge Functions
  - **RLS Policies**: Tables with RLS policies using `auth.uid()` MUST reference `auth.users(id)`
  - **Edge Functions**: `supabase.auth.getUser()` returns `auth.users` record
  - **Examples**: `team_invitation.invited_by_user_id`, audit fields (`created_by`, `last_updated_by`)

- **public.user_profile.id**: Application user profile - use for business logic relationships  
  - **Business Tables**: Tables for app features reference `public.user_profile(id)` 
  - **Relationship**: `user_profile.id` has FK to `auth.users.id` (1:1 mapping)
  - **Examples**: `team_user.user_id`, `club_user.user_id`, `player` ownership

**Rule of Thumb**: 
- RLS + `auth.uid()` = reference `auth.users(id)`
- Business relationships = reference `public.user_profile(id)`

### CRITICAL: Match Lifecycle & Database Patterns

**Match State Management** (services/matchStateManager.js):
- Three-state lifecycle: `running` → `finished` → `confirmed`
- `currentMatchId` - persisted in localStorage and game state
- `matchCreationAttempted` - prevents duplicate match creation
- **clearStoredState() MUST reset both** `currentMatchId` and `matchCreationAttempted`

**Role Mapping for Database** - CRITICAL to prevent errors:
```javascript
// ✅ Correct: Use for database persistence
mapFormationPositionToRole(position, currentRole)

// ❌ Wrong: Direct formation position to database
player.started_as = 'leftDefender' // Will cause DB constraint errors
```

**Formation Positions vs Database Roles**:
- Formation positions: `leftDefender`, `rightAttacker`, `left`, `right` (UI-specific)  
- Database roles: `goalie`, `defender`, `midfielder`, `attacker`, `substitute`, `unknown` (standardized enums)
- Always use `mapFormationPositionToRole()` for conversion
- `unknown` is used when position mapping fails (no fallback to other roles)

### Code Organization
- **Game logic**: `/src/game/` - Pure functions, no side effects
- **Components**: `/src/components/` - React UI components
- **Constants**: `/src/constants/` - Domain constants and configuration
- **Utils**: `/src/utils/` - Cross-screen utilities
- **Services**: `/src/services/` - Data persistence and external APIs (see `/src/services/README.md`)

### Key Architecture Patterns
1. **Pure Functions**: All game state transitions are pure functions (input → output, no side effects)
2. **Animation System**: Unified animation system in `/src/game/animation/animationSupport.js`
3. **Time Management**: Stint-based time tracking in `/src/game/time/`
4. **Queue Management**: Player rotation queues in `/src/game/queue/`

## Team Configuration System
Modern composite team configuration system using four components:

### Team Configuration Components
- **Format**: Field format (`5v5`, future: `7v7`)
- **Squad Size**: Total players (5-15 players supported)
- **Formation**: Tactical formation (`2-2`, `1-2-1`, and future formations)
- **Substitution Type**: Substitution style (`individual`, `pairs`)

### Common Configurations
- **7-player pairs**: `{format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs'}`
- **6-player individual**: `{format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual'}`
- **7-player individual**: `{format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual'}`

### Supported Formations
- **2-2 Formation**: 2 defenders, 2 attackers (fully implemented)
- **1-2-1 Formation**: 1 defender, 2 midfielders, 1 attacker (fully implemented with midfielder role support)

## CRITICAL: Player Role vs Status Distinction

**PLAYER_ROLES** (constants/playerConstants.js) - For business logic and database:
- `GOALIE`, `DEFENDER`, `ATTACKER`, `MIDFIELDER`, `SUBSTITUTE`
- `FIELD_PLAYER` - Used when specific field role is unknown (replaces deprecated ON_FIELD)

**PLAYER_STATUS** (constants/playerConstants.js) - For current game state:
- `ON_FIELD`, `SUBSTITUTE`, `GOALIE`

**Critical Rule**: Never mix roles with status. Use FIELD_PLAYER for generic field assignments, specific roles (DEFENDER/ATTACKER/MIDFIELDER) for tactical positions.

## Time Tracking System
- **Stint-based**: Players accumulate time in "stints" for each role/status
- **Current stint**: Tracked via `lastStintStartTimeEpoch` for real-time calculations
- **Key fields**: `timeOnFieldSeconds`, `timeAsAttackerSeconds`, `timeAsDefenderSeconds`, `timeAsGoalieSeconds`, `timeAsMidfielderSeconds` (1-2-1 formation)
- **Role tracking**: Supports Defender, Attacker, Midfielder, and Goalie roles
- **Formation-aware**: Time tracking adapts to active formation (2-2 vs 1-2-1)
- **Role changes**: Use `handleRoleChange()` and `startNewStint()` utilities

## Important Utilities

### Game State Logic (`/src/game/logic/gameStateLogic.js`)
- `calculateSubstitution()` - Handle regular substitutions
- `calculateGoalieSwitch()` - Handle goalie replacements
- `calculatePositionSwitch()` - Handle position swaps
- All return new game state without side effects

### Time Management (`/src/game/time/`)
- `updatePlayerTimeStats()` - Calculate and apply stint time
- `handleRoleChange()` - Manage role transitions with time tracking
- `startNewStint()` - Initialize new stint timing
- `shouldSkipTimeCalculation()` - Determine when to skip time calculations

### Animation System (`/src/game/animation/animationSupport.js`)
- `animateStateChange()` - Main entry point for all animated state changes
- `captureAllPlayerPositions()` - Snapshot player positions
- `calculateAllPlayerAnimations()` - Determine movement animations

## Debugging Tips
- **Time issues**: Check `lastStintStartTimeEpoch` and time field initialization
- **Queue problems**: Use `createRotationQueue()` utilities and verify position tracking
- **Animation glitches**: Ensure proper before/after position capture
- **State inconsistency**: Verify pure functions return consistent results

### Timer Architecture
- **Real-time Updates**: `setInterval` → `setForceUpdateCounter` → `useMemo` recalculation → React re-render
- **Key Pattern**: Timer calculations must depend on `forceUpdateCounter` in `useMemo` for live updates
- **Interval Storage**: Use `useRef` for interval IDs, never `useState` (prevents infinite loops)

## Testing Guidelines

### Essential Test Commands
- `npm test` - Run tests in watch mode
- `npm test -- --coverage` - Generate coverage report (target: 90%+)
- `npm run test:performance` - Force performance tests in any environment

### Key Testing Patterns
- **Test Utilities**: Use shared utilities in `componentTestUtils.js`
- **Performance Tests**: Environment-aware (lenient in CI, strict locally)
- **Mock Strategy**: Realistic mocks with proper cleanup
- **Quality Standard**: 90% coverage minimum, all user flows tested

### Critical Rules
- When writing tests, avoid changing production code except for debug logs
- If production code seems buggy, describe the issue rather than fixing it
- Tests should reflect actual application behavior, not ideal behavior

## Notes for Future Sessions
- Always use existing utilities rather than reimplementing
- Follow pure function architecture for all game logic
- Maintain separation between logic, animation, and UI concerns
- When in doubt about time calculations, trace through stint manager flow
- Always run the whole test suite after having completed a feature or a change to make sure nothing has broken
- **Linting**: Always run `CI=true && npm run build` before finishing a task to check for ESLint errors that will fail in GitHub CI
- **Testing**: Follow patterns in `.claude/testing-guidelines.md` for new tests
- **New components**: Write tests first, following established patterns in `__tests__` directories
- **State Updates**: Ensure all calculated state changes are properly applied via handler state updaters

## General Principles
- Assume that application is already running. If it needs to be started, the user will start it
- Always assume that the application is already running.

## Recent Major Features (Reference)
- **Browser Back Interception**: Tactical Board integrated with `useBrowserBackIntercept` hook
- **Time Tracking Bug Fix**: Fixed substitution timer conditional logic with `isSubTimerPaused` checks
- **Match Database System**: Full match lifecycle with player statistics persistence via `matchStateManager.js`
- **Role Constants Cleanup**: Eliminated `ON_FIELD` role, introduced `FIELD_PLAYER` and role/status separation