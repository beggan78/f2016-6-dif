# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, organized by domain: UI under `components/`, gameplay utilities in `game/`, shared hooks in `hooks/`, data calls in `services/`, and helpers inside `utils/`. Store static media in `src/assets/`, while generated Supabase types belong to `src/types/supabase.ts`. Jest specs sit alongside features inside `src/__tests__/` for units and `src/__integration__/` for broader flows. Runtime assets stay in `public/`, CLI helpers in `scripts/`, and Supabase migrations plus seeds in `supabase/`.

## Build, Test, and Development Commands
Use `npm start` for the hot-reloading React dev server and `npm run build` for the production bundle. Run `npm test -- --watchAll=false` before pushing to execute the Jest suite once, or add `--coverage` when you need reports. Performance-focused checks live behind `npm run test:performance` (set `RUN_PERFORMANCE_TESTS=true`). The local database stack is managed with `npm run db:start|stop|reset|migrate|seed`; keep it running when you touch features that depend on Postgres.

## Coding Style & Naming Conventions
Follow the Create React App ESLint config with two-space indentation. Components use PascalCase (`TeamManagement.js`), hooks start with `use*`, utilities stay camelCase, and constants collect under `src/constants/`. Favor functional React components, Tailwind utility classes, and TypeScript-friendly patterns even in plain JS. Run `npx eslint src` whenever you need a manual lint check.

**Agent Workflow Requirement**
- Always run `npx eslint src` (or a narrowed path if appropriate) against the files you just modified and fix eslint errors before returning control to the user.

## Testing Guidelines
Jest plus React Testing Library power the suite. Target at least 90% coverage for new or updated modules and group fast specs as `*.test.js` in `__tests__/`. Larger flows move to `src/__integration__/`. Mock Supabase calls with the existing helpers, reset timers and storage between specs, and add UI screenshots to `screenshots/` for visual changes.

## Commit & Pull Request Guidelines
Write concise, imperative commit messages (e.g., `Add invitation notifications`) and reference issues with `#123` when relevant. PRs should explain the problem, outline the solution, list manual or automated test results, and link Supabase migration IDs when schema changes ship. Include regenerated assets—such as `src/types/supabase.ts` or screenshots—in the same PR so reviewers stay current.

## Security & Configuration Tips
Store Supabase keys in your local `.env` file and never commit secrets. After pulling migration changes, run `npm run db:migrate` followed by `npm run db:seed` to sync your environment. If you update database types, commit the refreshed `src/types/supabase.ts` snapshot with the associated API changes.

### Supabase Operations
- When developing locally, migrations and Supabase edge function deployments are **only** run against the local Supabase instance. Never push schema or function changes to the remote project from your workstation; production updates happen exclusively via CI.
- The user makes all changes, prompt the user to run the commands for you:
  - `supabase db push --local` – apply pending SQL migrations to the local Supabase database.

## Game Configuration Notes
- Formats currently supported: `5v5` (pairs or individual) and `7v7` (individual only). Use the metadata in `src/constants/teamConfiguration.js` when adding new modes so validation and defaults update automatically.
- 7v7 formations (`2-2-2`, `2-3-1`) add dedicated midfielder positions. UI/helpers should source position lists from `getModeDefinition` rather than hard-coding keys.
- When persisting team configs or match data, always include the `format` field so Supabase records reflect the correct ruleset.
