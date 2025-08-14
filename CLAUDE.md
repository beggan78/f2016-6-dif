# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Sport Wizard - Claude Code Memory

## Project Overview
Mobile-first web application for coaching youth soccer teams. Manages player rotations, tracks playing time, and maintains fair substitution patterns during 5v5 games with 6-7 player squads.

## Key Commands
- **Development**: `npm start` Before starting the application, check if it's already running.
- **Build**: `npm run build` 
- **Test**: `npm test` (comprehensive test suite)
- **Test Coverage**: `npm test -- --coverage` (90%+ coverage achieved)

## Development Guidelines

### Prime Instructions
- **Always read first**: `.claude/commands/prime.md` for project-specific guidelines
- **Required documentation**: Read `README.md` and `src/game/README.md` before making changes
- **Testing guidelines**: Read `.claude/testing-guidelines.md` for testing patterns and best practices
- **Architecture principles**: DRY, KISS, Separation of Concerns, Single Responsibility

### Code Organization
- **Game logic**: `/src/game/` - Pure functions, no side effects
- **Components**: `/src/components/` - React UI components
- **Constants**: `/src/constants/` - Domain constants and configuration
- **Utils**: `/src/utils/` - Cross-screen utilities

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

### Timer Display Issues
- **Frozen Display**: If timers display but don't update, check that `forceUpdateCounter` is included in `useMemo` dependencies for timer calculations in `useTimers.js`
- **Infinite Loops**: If timer updates cause memory issues, ensure interval IDs are stored in `useRef` not `useState`, and remove interval IDs from `useEffect` dependencies
- **Architecture**: Timer display works via `setInterval` → `setForceUpdateCounter` → `useMemo` recalculation → React re-render
- **Key Dependencies**: Both `matchTimerSeconds` and `subTimerSeconds` must depend on `forceUpdateCounter` for real-time updates

## Testing Architecture

### Test Coverage Status (Phase 2 Complete)
- **Component Tests**: All major components tested (100%)
- **Hook Tests**: All critical hooks tested (100%) 
- **Utility Tests**: All core utilities tested (100%)
- **Game Logic Tests**: Complete coverage (100%)
- **Integration Tests**: Comprehensive workflow coverage including goalie queue fairness

### Key Test Patterns
- **Component Testing**: Rendering, user interactions, props validation, edge cases
- **Hook Testing**: State management, side effects, cleanup, integration
- **Mock Strategies**: Realistic mocks for external dependencies, proper cleanup
- **Data Management**: Shared utilities in `componentTestUtils.js`

### Test Quality Standards
- Minimum 90% coverage for new components
- All user interaction flows must be tested
- Error scenarios and edge cases required
- Performance regression prevention

### Performance Testing
- **Local Development**: Performance tests run automatically with regular test suite
- **CI Environment**: Performance tests are skipped by default to prevent unreliable failures
- **Explicit Performance Testing**: Use `npm run test:performance` to force performance tests in any environment
- **Environment Detection**: Automatic detection of CI vs local environments using environment variables
- **Configurable Thresholds**: Performance thresholds adjust automatically based on environment (more lenient in CI)
- **Performance Utilities**: Dedicated utilities in `src/__tests__/performanceTestUtils.js` for consistent performance testing patterns

### Testing Development Guidelines
- **Production Code Changes**: When the task is to write tests, do not change production code other than to add debug logs aimed at better understanding the logic better
- **Suspected Issues**: If you suspect that the code is not functioning properly and needs changing, please pause and describe what you perceive the error to be. The user can then run the application to confirm or dismiss the hypothesis
- **Test-First Approach**: Focus on making tests accurately reflect actual application behavior rather than changing production code to match test expectations

## Recent Achievements
- **Browser Back Interception for Tactical Board**: Implemented seamless browser back button handling for the Tactical Board view
  - **Integration**: Added TACTICAL_BOARD case to global navigation handler in `App.js`
  - **Registration**: TacticalBoardScreen now automatically registers/unregisters for browser back interception on mount/unmount
  - **Behavior**: Browser back button now has identical behavior to on-screen "Back" button
  - **Testing**: Added comprehensive integration tests for navigation registration and cleanup
  - **Architecture**: Used existing `useBrowserBackIntercept` infrastructure for consistent navigation handling

- **Time Reset During Normal Substitution Bug Fix**: Fixed critical issue where players' accumulated time was reset to 0 during normal substitutions after a previous fix for pause scenarios
  - **Problem**: Commit 9bac94b correctly fixed pause-substitution scenarios but broke normal substitutions by unconditionally calling `resetPlayerStintTimer()` instead of `updatePlayerTimeStats()`
  - **Root Cause**: Substitution manager was not respecting timer pause state - always using reset function regardless of whether timer was paused
  - **Solution**: 
    - **Logic Layer**: Implemented conditional time tracking in all three substitution methods: `const timeResult = isSubTimerPaused ? resetPlayerStintTimer(p, currentTimeEpoch) : { ...p, stats: updatePlayerTimeStats(p, currentTimeEpoch, false) };`
    - **Handler Layer**: Fixed missing `isSubTimerPaused` property in `createGameState()` callback in GameScreen.js
  - **Impact**: Normal substitutions now correctly accumulate player time while pause substitutions preserve time without adding paused duration
  - **Test Coverage**: Added 4 comprehensive test cases covering both normal time accumulation and pause time preservation across different team modes
  - **Documentation**: Updated substitutionManager.js with JSDoc comments documenting conditional time tracking logic


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