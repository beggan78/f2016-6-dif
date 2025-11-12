# AI Agent Guide: src/utils

This directory contains cross-cutting utility functions for data transformation, validation, persistence, and common operations. All utilities are designed to be pure, reusable, and independent of React components.

## Core Utility Modules

### Persistence & Data Management
- **`persistenceManager.js`**: ALWAYS use PersistenceManager for localStorage operations
  - `PersistenceManager`: Generic class with error handling, validation, quota management, support detection
  - `GamePersistenceManager`: Game-specific extension with default state and field filtering
  - `createPersistenceManager(key, defaultState)`: Factory function for custom managers
  - Handles corrupted data, quota exceeded, SSR/test environments automatically

- **`DataSyncManager.js`**: Synchronizes data between localStorage and Supabase
  - Routes storage based on authentication state (anonymous = local, authenticated = cloud)
  - Handles match saving, player stats, match events, and migration from local to cloud
  - Maps application roles to database enums using `roleToDatabase()` and `normalizeRole()`

### Player Operations
- **`playerUtils.js`**: Player data queries and transformations
  - `findPlayerById()`, `findPlayerByIdWithValidation()`: Safe player lookups
  - `createPlayerLookup()`, `createPlayerLookupFunction()`: Lookup function factories
  - `getPlayerName()`: Includes captain designation "(C)"
  - `hasPlayerParticipated()`: Determines if player played (for database persistence)
  - `resetPlayerMatchStartState()`: Clears match-start markers without affecting cumulative stats
  - `setCaptain()`, `isPlayerCaptain()`, `getCaptainPlayer()`: Captain management
  - `hasActiveSubstitutes()`: Checks for active (non-inactive) substitutes

### Formation & Rotation
- **`formationGenerator.js`**: Generates optimal formations based on playing time balance
  - `generateIndividualFormationRecommendation()`: Individual modes (6/7/8+ players) with time-based rotation
  - Supports 2-2 and 1-2-1 formations with role-specific time tracking
  - Returns `{formation, rotationQueue, nextToRotateOff}` structure

- **`formationConfigUtils.js`**: Formation validation and compatibility
  - `getFormationDefinition()`: Gets mode definition for team config
  - `isFormationCompatible()`: Validates formation compatibility
  - `isValidTeamConfig()`: Checks team config structure

- **`queueUtils.js`**: Rotation queue manipulation
  - `getNextActivePlayer()`, `getNextNextActivePlayer()`: Safe queue access
  - `rotatePlayerToEnd()`, `removePlayerFromQueue()`, `addPlayerToQueue()`: Queue operations
  - `isPlayerNextInQueue()`, `getPlayerPositionInQueue()`: Queue queries
  - `validateRotationQueue()`: Structure and content validation

### Data Formatting
- **`formatUtils.js`**: Display formatting
  - `formatTime()`: MM:SS format with NaN protection
  - `formatTimeDifference()`: +/- time difference format
  - `getPlayerLabel()`: Player name with time stats for periods 2+
  - `formatPlayerName()`: Adds captain "(C)" designation
  - `generateStatsText()`: Tab-delimited statistics export format

- **`rolePointUtils.js`**: Role point calculations
  - `calculateRolePoints()`: Proportional 3-point system across goalie/defender/midfielder/attacker
  - Rounds to nearest 0.5, handles goalie-only players, distributes rounding differences

### Input Validation & Sanitization
- **`inputSanitization.js`**: XSS and SQL injection protection
  - `sanitizeNameInput()`, `isValidNameInput()`: Names (50 char max, allowed pattern)
  - `sanitizeEmailInput()`, `isValidEmailInput()`: Email addresses (320 char max, RFC 5321)
  - `sanitizeMessageInput()`, `isValidMessageInput()`: Messages (500 char max)
  - `sanitizeSearchInput()`: Search terms with SQL wildcard removal
  - Removes script tags, HTML tags, javascript: URLs, event handlers, SQL patterns

- **`authValidation.js`**: Authentication form validation
  - `validateEmail()`, `validatePassword()`, `validatePasswordConfirmation()`: Field validators
  - `validateLoginForm()`, `validateSignupForm()`, `validateResetPasswordForm()`: Form validators
  - `validateOtpCode()`: 6-digit numeric verification codes
  - PASSWORD_REQUIREMENTS: min 8 chars, requires number (Supabase requirement)

### Time & Timing
- **`timeUtils.js`**: Time operations and constants
  - `getCurrentTimestamp()`: Centralized Date.now() replacement
  - `isTimerPaused()`, `getCurrentTimestampIfActive()`: Timer state checks
  - `getTimeTrackingParams()`: Standard params for substitution operations
  - `formatTimeMMSS()`: Alternative MM:SS formatter
  - `calculateDurationInSeconds()`: Duration between timestamps
  - TIMEOUT_CONSTANTS: Command timeouts, animation delays, highlight durations

### Formation Structure & Validation
- **`formationUtils.js`**: Cross-screen formation structure operations
  - `getAllPositions()`: Gets all positions including goalie for a team config
  - `getModeDefinition()`: Gets formation definition (wraps gameModes.getModeDefinition)
  - `getExpectedFormationStructure()`: Returns clean formation template with null values
  - `validateFormationStructure()`: Validates formation matches expected structure
  - `normalizeFormationStructure()`: Cleans messy formation data to expected structure
  - Handles individual rotation structures across supported formations

### Error Handling & Recovery
- **`errorHandler.js`**: Structured error framework
  - `handleError()`: Centralized error logging with categories and severity
  - `GameError` class: Structured errors with category, severity, context, timestamp
  - ERROR_CATEGORIES: game_logic, timer, storage, formation, player, validation, network, ui
  - ERROR_SEVERITY: low, medium, high, critical
  - ErrorRecovery.withFallback(): Try operation with fallback value
  - ErrorRecovery.withRetry(): Retry with exponential backoff
  - ErrorRecovery.safeLocalStorage: DEPRECATED - use PersistenceManager instead
  - `useErrorHandler()`: React hook for component error handling
  - `logErrorBoundary()`: Error boundary logging

### Match Report & Analytics
- **`matchReportUtils.js`**: Match report data processing
  - `generateMatchSummary()`: Creates comprehensive summary from events and game log
  - `processPlayerStatistics()`: Processes player stats with time breakdowns and percentages
  - `formatEventTimeline()`: Formats events for display with filtering options
  - `calculateEffectivePlayingTime()`: Total time minus paused time
  - `determinePlayerStartingRoles()`: Determines starting roles from game log and stats
  - Includes event categorization, severity levels, human-readable descriptions

## Architecture Principles

### Pure Functions
Most utilities are pure functions with no side effects, making them predictable and testable.

### Error Handling
Utilities include defensive coding with null checks, default values, and fallbacks to prevent runtime errors.

### Immutability
All data transformation functions return new objects/arrays, never mutating inputs.

### Validation First
Input validation utilities check data before processing to prevent injection attacks and invalid state.

## Critical Patterns

### PersistenceManager Usage
Always use PersistenceManager instead of direct localStorage:
- Complex state: `createPersistenceManager(key, defaultState)`
- Game state: Use `GamePersistenceManager` (pre-configured with defaults)
- Automatic: Error handling, quota management, SSR/test support

### Player Role Mapping
Always use `mapFormationPositionToRole()` before database persistence to convert UI positions to database enums (prevents constraint errors).

### Time Tracking
Use `getCurrentTimestamp()` for all time operations; supports timer pause state via `getTimeTrackingParams()`.

### Formation Definitions
Use `getFormationDefinition()` from formationConfigUtils to get mode definitions; supports formation overrides for preview/recommendation scenarios.
