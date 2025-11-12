# AI Agent Guide: src/constants

This directory centralizes domain constants, configuration values, and enums used throughout the application. These constants define game rules, player roles, team configurations, formations, and match settings.

## Critical Constants Files

### playerConstants.js
**PLAYER_ROLES** - Business logic and database roles:
- `GOALIE`, `DEFENDER`, `ATTACKER`, `MIDFIELDER` - Tactical roles
- `SUBSTITUTE` - Initial status only
- `FIELD_PLAYER` - Generic field role when specific role unknown
- `UNKNOWN` - Fallback when position mapping fails

**PLAYER_STATUS** - Current game state:
- `ON_FIELD`, `SUBSTITUTE`, `GOALIE` - In-game status values
- Never mix PLAYER_ROLES with PLAYER_STATUS

### roleConstants.js
Central role value management system preventing case sensitivity bugs:
- `DB_ROLE_VALUES` - Lowercase values for Supabase operations
- `DISPLAY_ROLE_VALUES` - Title case for UI display
- Conversion functions: `roleToDatabase()`, `roleFromDatabase()`, `roleToDisplay()`, `normalizeRole()`
- `GOAL_SCORING_PRIORITY` - Priority mapping for goal attribution

### teamConfiguration.js
Modern composite team configuration architecture with three components:

**Core Constants:**
- `FORMATS`: Field formats (`5v5`, `7v7`)
- `FORMATIONS`: Tactical formations (`2-2`, `1-2-1`, `2-2-2`, `2-3-1`, etc.)
- `GAME_CONSTANTS`: Squad size limits (5-15 players), field player counts

**Key Functions:**
- `createTeamConfig()` - Build team configuration objects
- `validateTeamConfig()` - Validate configuration with business rules
- `getValidFormations()` - Get formations for format and squad size

**Business Rules:**
- Individual substitution: Supports 6-7 player squads with rotation queue
- Each format has specific field player counts and allowed formations

### gameModes.js
Dynamic mode definition generator from team configurations:
- `getModeDefinition()` - Returns complete mode definition (memoized)
- `getFormationPositions()` - Field positions for configuration
- `initializePlayerRoleAndStatus()` - Map formation position to role/status
- Formation layouts define position-to-role mappings

**Critical Pattern:**
Formation positions (UI-specific) differ from database roles. Always use role mapping functions when persisting data.

### positionConstants.js
Raw position string constants for all formations:
- Position keys: `leftDefender`, `rightDefender`, `leftAttacker`, `rightAttacker` (2-2)
- Position keys: `defender`, `left`, `right`, `attacker` (1-2-1)
- Substitute positions: `substitute_1` through `substitute_5`
- Helper functions: `isFieldPosition()`, `isSubstitutePosition()`

### matchTypes.js
Match type enumeration matching database enum:
- `MATCH_TYPES`: `league`, `friendly`, `cup`, `tournament`, `internal`
- `MATCH_TYPE_OPTIONS`: Options with labels and descriptions
- `DEFAULT_MATCH_TYPE`: Defaults to `league`

### matchVenues.js
Match venue types for analytics and persistence:
- `VENUE_TYPES`: `home`, `away`, `neutral`
- `DEFAULT_VENUE_TYPE`: Defaults to `home`

### gameConfig.js
Game setup configuration options:
- `PERIOD_OPTIONS`: [1, 2, 3] periods
- `DURATION_OPTIONS`: [10, 15, 20, 25, 30] minutes
- `ALERT_OPTIONS`: Substitution timer alerts (0-5 minutes)

## Key Patterns for AI Agents

### Role vs Status Distinction
**CRITICAL:** Never mix PLAYER_ROLES with PLAYER_STATUS:
- Use `FIELD_PLAYER` for generic field assignments
- Use specific roles (`DEFENDER`, `ATTACKER`, `MIDFIELDER`) for tactical positions
- Use `PLAYER_STATUS` only for current game state

### Database Persistence
When persisting player data:
1. Map formation positions to roles using `initializePlayerRoleAndStatus()`
2. Convert roles to database format using `roleToDatabase()`
3. Never persist UI-specific position keys directly

### Team Configuration
All game logic works with team configuration objects created by `createTeamConfig()`:
- Pass team config to `getModeDefinition()` for complete mode properties
- Use validation functions before persisting configurations
- Respect business rules (squad size limits, format compatibility)

### Formation-Specific Logic
Different formations have different position keys and role mappings:
- 2-2: Two defenders, two attackers
- 1-2-1: One defender, two midfielders, one attacker
- Check formation in team config before assuming position structure

## Architecture Principles

- **Single Source of Truth**: All domain constants defined once, imported everywhere
- **Configuration-Driven**: Game behavior driven by constants, not hardcoded values
- **Type Safety**: Constants provide implicit type safety through enums
- **Separation of Concerns**: Database values, display values, and constants kept separate
