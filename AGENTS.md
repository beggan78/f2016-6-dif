# Repository Guidelines for AI Agents

## Project Overview
Sport Wizard is a mobile-first React 18 web application for coaching youth soccer teams (5v5 and 7v7 formats) with Supabase backend for authentication, database persistence, and real-time features.

## Directory Structure

### Root Level
- **`.claude/`** - Agent documentation and session guidelines
- **`.github/`** - GitHub Actions CI/CD workflows
- **`public/`** - Static assets served directly (HTML, icons, manifests)
- **`scripts/`** - Build and test utilities (Jest reporters, test runners)
- **`screenshots/`** - UI screenshots for visual changes
- **`src/`** - Application source code (see below)
- **`supabase/`** - Database migrations, seeds, and Edge Functions
- **Key files**: `package.json`, `tailwind.config.js`, `postcss.config.js`

### Source Organization (`src/`)
- **`components/`** - React UI components (setup, game, stats, team, auth, tactical, shared)
- **`game/`** - Pure game logic functions (animation, logic, queue, recommendations, time)
- **`hooks/`** - Custom React hooks for state and side effects
- **`services/`** - Database operations and external API calls (see `src/services/README.md`)
- **`utils/`** - Cross-cutting utilities (formatting, validation, persistence)
- **`constants/`** - Application constants (configurations, enums, defaults)
- **`contexts/`** - React Context providers (Auth, Team, Preferences, Navigation)
- **`types/`** - TypeScript type definitions (`supabase.ts` is auto-generated)
- **`__tests__/`** - Unit tests
- **`__integration__/`** - Integration tests
- **`App.js`** - Main application component and routing

### Database (`supabase/`)
- **`migrations/`** - Timestamped SQL migration files
- **`functions/`** - Supabase Edge Functions
- **`seed.sql`** - Development seed data
- **`config.toml`** - Supabase configuration

## Essential Commands

### Development
```bash
npm start              # Start dev server (assumes app not already running)
npm run build          # Production build
CI=true npm run build  # Build with ESLint error checking
```

### Testing
```bash
npm test                         # Run tests in watch mode
npm test -- --watchAll=false     # Run tests once
npm test -- --coverage           # Generate coverage report (target: 90%+)
npm run test:performance         # Run performance tests
```

### Database (Local Only)
```bash
npm run db:start    # Start local Supabase stack
npm run db:stop     # Stop local Supabase
npm run db:migrate      # Apply all migrations
npm run db:types    # Generate TypeScript types from schema
npm run db:diff     # Create migration from schema changes
```

**CRITICAL**: Never deploy migrations or Edge Functions to remote Supabase. All remote deployments handled via GitHub Actions.

## Code Architecture Principles

### Pure Functions
- All game logic in `/src/game/` must be pure functions
- No side effects, no mutations, no I/O operations
- Same input always produces same output

### State Immutability
- Never mutate state directly
- Use spread syntax for objects: `{...obj, field: newValue}`
- Use immutable array methods: `.map()`, `.filter()`, `.slice()`
- Forbidden: `.push()`, `.splice()`, direct property assignment

### React Patterns
- Functional components with hooks
- Exhaustive dependencies in `useEffect`/`useMemo`/`useCallback`
- Store interval IDs in `useRef`, never `useState`
- PropTypes or TypeScript for all components

## Key Documentation Files

Before making changes, review:
- **`CLAUDE.md`** - Comprehensive project memory and guidelines
- **`README.md`** - Feature overview and user documentation
- **`DATABASE.md`** - Schema management and Supabase operations
- **`DATA_MODEL.md`** - Current database schema reference and entity details
- **`src/game/README.md`** - Game logic architecture
- **`src/services/README.md`** - Database patterns and match lifecycle
- **`.claude/testing-guidelines.md`** - Testing patterns and best practices

## Pre-Completion Checklist

Before finishing any task:
- [ ] No direct state mutations
- [ ] All hook dependencies are exhaustive
- [ ] ESLint passes: `CI=true npm run build`
- [ ] Relevant tests pass
- [ ] Pure functions remain pure
