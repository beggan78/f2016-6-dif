# DIF F16-6 Coach - Claude Code Memory

## Project Overview
Mobile-first web application for coaching youth soccer teams. Manages player rotations, tracks playing time, and maintains fair substitution patterns during 5v5 games with 6-7 player squads.

## Key Commands
- **Development**: `npm start`
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

## Team Modes
- **PAIRS_7**: 7-player pairs mode (3 pairs: left, right, substitute + goalie)
- **INDIVIDUAL_6**: 6-player individual (4 field + 1 substitute + goalie)
- **INDIVIDUAL_7**: 7-player individual (4 field + 2 substitutes + goalie)

## Time Tracking System
- **Stint-based**: Players accumulate time in "stints" for each role/status
- **Current stint**: Tracked via `lastStintStartTimeEpoch` for real-time calculations
- **Key fields**: `timeOnFieldSeconds`, `timeAsAttackerSeconds`, `timeAsDefenderSeconds`, `timeAsGoalieSeconds`
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

### Testing Development Guidelines
- **Production Code Changes**: When the task is to write tests, do not change production code other than to add debug logs aimed at better understanding the logic better
- **Suspected Issues**: If you suspect that the code is not functioning properly and needs changing, please pause and describe what you perceive the error to be. The user can then run the application to confirm or dismiss the hypothesis
- **Test-First Approach**: Focus on making tests accurately reflect actual application behavior rather than changing production code to match test expectations

## Recent Achievements
- **Timer Pause-Substitute-Resume Bug Fix**: Resolved critical timer calculation issue during pause-substitute-resume scenarios
  - **Problem**: When timer was paused, then substitution occurred, then timer resumed, players received incorrect accumulated time
  - **Root Cause**: `resetSubTimer()` was unconditionally clearing `totalPausedDuration`, destroying pause state
  - **Solution**: Modified `resetSubTimer()` to preserve pause state during substitutions by setting `pauseStartTime` to current time when timer is paused
  - **Impact**: Timer calculations now work correctly for pause → substitute → resume workflows
  - **Test Coverage**: Added 4 comprehensive test cases covering complex pause-substitute-resume scenarios in `useTimers.test.js`
  - **Code Cleanup**: Removed unnecessary `lastSubDuringPause` flag that was initially considered but not needed

- **Timer Display Fix**: Resolved timer display freezing issue that prevented real-time updates
  - Fixed missing `forceUpdateCounter` dependencies in `useMemo` hooks for timer calculations
  - Replaced `useState` interval management with `useRef` to prevent infinite loops
  - Timers now update correctly every second during active periods
  - Added comprehensive debugging documentation and regression tests
  
- **Goalie Queue Fairness Fix**: Implemented fair rotation queue positioning during goalie switches
  - Former goalie now takes new goalie's exact position in rotation queue
  - Prevents unfair penalties by maintaining queue position fairness
  - Comprehensive test coverage across all team modes
  - Fixed missing state updater calls in handler layer

## Notes for Future Sessions
- Always use existing utilities rather than reimplementing
- Follow pure function architecture for all game logic
- Maintain separation between logic, animation, and UI concerns
- When in doubt about time calculations, trace through stint manager flow
- Always run the whole test suite after having completed a feature or a change to make sure nothing has broken
- **Testing**: Follow patterns in `.claude/testing-guidelines.md` for new tests
- **New components**: Write tests first, following established patterns in `__tests__` directories
- **State Updates**: Ensure all calculated state changes are properly applied via handler state updaters