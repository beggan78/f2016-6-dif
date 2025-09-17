# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts the React app, split by domain (`components/`, `game/`, `hooks/`, `services/`, `utils/`) plus `assets/` for media and `types/` for generated Supabase typings.
- Tests live alongside source in `src/__tests__/` and `src/__integration__/`; shared fixtures belong beside the code they exercise.
- `public/` serves static assets and the HTML shell, while `scripts/` contains CLI helpers for maintenance.
- `supabase/` stores migrations, seeds, and config; snapshots from `npm run db:types` land in `src/types/supabase.ts`.

## Build, Test, and Development Commands
- `npm start` boots the React development server with hot reload.
- `npm run build` creates the production bundle used for deployments.
- `npm test` opens Jest in watch mode; add `-- --watchAll=false` for one-off runs or `-- --coverage` for reports.
- `npm run test:performance` runs the performance-focused Jest suite (set `RUN_PERFORMANCE_TESTS=true`).
- `npm run db:start|stop|reset|migrate|seed` control the local Supabase stack; run `db:start` before features that hit Postgres.

## Coding Style & Naming Conventions
- Follow the existing ESLint rules from `react-app` and keep two-space indentation; run `npx eslint src` if you need a manual check.
- Component files use PascalCase (for example `TeamManagement.js`); hooks start with `use*` inside `hooks/`; utilities remain camelCase.
- Favor functional React components, Tailwind utility classes, and centralize constants in `src/constants/`.

## Testing Guidelines
- Jest with React Testing Library backs the suite; target ≥90% coverage for new or changed code.
- Place fast unit tests as `*.test.js` within `__tests__` folders; broader flows go under `src/__integration__/`.
- Mock Supabase calls with existing helpers before hitting the live service; clear timers and storage between specs.
- Run `npm test -- --watchAll=false` before opening a pull request, and include screenshots for UI changes in `screenshots/` when applicable.

## Commit & Pull Request Guidelines
- Match the Git history: concise, imperative summaries (e.g., "Add invitation notifications"), optionally referencing issues with `#123`.
- Each PR should explain the problem, solution, and test results; link Supabase migration IDs when schema changes ship.
- Include any generated assets or updated docs (such as `src/types/supabase.ts`) in the same PR to keep reviewers current.
