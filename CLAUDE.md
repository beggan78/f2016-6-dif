# DIF F16-6 Coach - Claude Code Memory

## Project Overview
Mobile-first web application for coaching youth soccer teams. Manages player rotations, tracks playing time, and maintains fair substitution patterns during 5v5 games with 6-7 player squads.

## Key Commands
- **Development**: `npm start`
- **Build**: `npm run build` 
- **Test**: `npm test` (345+ tests across comprehensive test suite)
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

## Formation Types
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

## Testing Architecture

### Test Coverage Status (Phase 2 Complete)
- **Total Tests**: 345+ tests across 11 test suites
- **Component Tests**: 9/9 major components tested (100%)
- **Hook Tests**: 3/3 critical hooks tested (100%) 
- **Utility Tests**: All core utilities tested (100%)
- **Game Logic Tests**: Complete coverage (100%)

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

## Notes for Future Sessions
- Always use existing utilities rather than reimplementing
- Follow pure function architecture for all game logic
- Maintain separation between logic, animation, and UI concerns
- When in doubt about time calculations, trace through stint manager flow
- **Testing**: Follow patterns in `.claude/testing-guidelines.md` for new tests
- **New components**: Write tests first, following established patterns in `__tests__` directories