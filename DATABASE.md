# Database Schema Management

This document outlines the database schema management approach for the Sport Wizard application using Supabase.

## Overview

We use **Supabase CLI** for schema-as-code management to avoid manual UI changes and ensure consistent, version-controlled database evolution across environments.

## Setup

### Prerequisites

- Node.js (version 14+)
- Docker (for local Supabase development)
- Supabase account and project

### Initial Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Copy environment template**:
   ```bash
   cp .env.example .env.local
   ```

3. **Configure your Supabase credentials** in `.env.local`:
   - Get your project URL and anon key from [Supabase Dashboard](https://supabase.com/dashboard)
   - For CI/CD, you'll also need your access token and project ID

4. **Link to your Supabase project**:
   ```bash
   npm run db:link
   # Follow prompts to authenticate and select your project
   ```

## Local Development

### Starting Local Environment

```bash
# Start local Supabase stack (includes PostgreSQL, Auth, API, etc.)
npm run db:start

# Check status of all services
npm run db:status
```

This will start:
- **Database**: PostgreSQL on `localhost:54322`
- **API**: Supabase API on `http://localhost:54321`
- **Studio**: Database admin UI on `http://localhost:54323`
- **Auth**: Authentication server
- **Storage**: File storage server

### Database Operations

```bash
# Apply all migrations to local database
npm run db:migrate

# Generate TypeScript types from schema
npm run db:types

# Create a new migration from schema changes
npm run db:diff

# Stop local environment
npm run db:stop
```

## Schema Management

### Migration Files

Migrations are stored in `supabase/migrations/` with the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

Current migrations:
- `20250101000000_initial_schema.sql` - Core tables and basic setup
- `20250101000001_analytics_tables.sql` - Advanced analytics and tracking

### Making Schema Changes

#### Direct SQL
1. Create a new migration file:
   ```bash
   # This creates a timestamped file
   npx supabase migration new your_change_description
   ```

2. Write your SQL changes in the new file

3. Apply the migration:
   ```bash
   npm run db:migrate
   ```

### Seed Data

Development seed data is in `supabase/seed.sql` and includes:
- Sample club (DIF)
- Sample team (F16-6) 
- Default roster of 14 players
- Sample completed match with events and statistics
- Sample season statistics

Reset with seed data:
```bash
npm run db:migrate
```

## Database Schema

### Core Tables

#### `club`
- Soccer clubs/organizations
- **Key fields**: `name`, `short_name`, `long_name`

#### `team` 
- Individual teams within clubs
- **Key fields**: `name`, `club_id`, `configuration` (jsonb), `active`

#### `player`
- Individual players
- **Key fields**: `name`, `team_id`, `jersey_number`, `active`

#### `match`
- Individual games/matches
- **Key fields**: `team_id`, `format`, `formation`, `periods`, `opponent`, `captain`, `goals_scored`, `outcome`, `type`, `venue_type`

#### `match_log_event`
- Audit trail of all match activities
- **Key fields**: `match_id`, `player_id`, `event_type`, `occurred_at_seconds`, `period`

### User Management

#### `user_profile`
- Extends Supabase `auth.users`
- **Key fields**: `id` (references auth.users), `name`

#### `team_user`
- Team access control
- **Key fields**: `team_id`, `user_id`, `role` (parent/player/coach/admin)

#### `club_user`
- Team access control
- **Key fields**: `team_id`, `user_id`, `role` (parent/player/coach/admin)

### Enum Types

#### `match_type`
- Values: `league`, `friendly`, `cup`, `tournament`, `internal`
- Referenced by `match.type` and analytics views to label fixture category

#### `match_venue_type`
- Values: `home`, `away`, `neutral`
- Referenced by `match.venue_type` to record match location context


## Production Deployment

SUPABASE DEPLOYMENT POLICY: NEVER deploy Edge Functions or migrations directly to remote Supabase. 
ALL testing and development is done against local Supabase only.
Remote deployments are handled with GitHub Actions.

## Security

### Row Level Security (RLS)

RLS is enabled on all tables but policies are not defined in migrations. Configure policies manually in Supabase Dashboard based on your requirements:

1. **Team-based access**: Users can only access data for teams they belong to
2. **Role-based permissions**: Different access levels for parents/players/coaches/admins
3. **Public read for some data**: Consider making player names and basic team info public

Example policy concepts:
```sql
-- Users can read teams they belong to
CREATE POLICY "Users can view own teams" ON public.team
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_user 
      WHERE user_id = auth.uid()
    )
  );
```

## Troubleshooting

### Common Issues

**"Connection refused" when starting local database**
- Ensure Docker is running
- Check if port 54322 is available
- Try `npm run db:restart`

**Migrations fail to apply**
- Check migration SQL syntax
- Ensure proper foreign key constraints
- Review error logs in terminal

**TypeScript generation fails**
- Ensure local database is running
- Check that migrations have been applied
- Verify schema is valid

### Useful Commands

```bash
# View detailed status of all services
npx supabase status

# View database logs
npx supabase logs db

# Reset specific service
npx supabase stop db && npx supabase start

# Pull latest schema from remote (overwrites local)
npm run db:pull
```

## Development Workflow

1. **Start local environment**: `npm run db:start`
2. **Make schema changes**: Create migration files
3. **Generate migration** (if using UI): `npm run db:diff`
4. **Test locally**: `npm run db:migrate`
5. **Generate types**: `npm run db:types`
6. **Commit changes**: Git commit migration files
7. **Deploy to production**: ONLY via CI/CD

## Best Practices

1. **Always test migrations locally** before deploying
2. **Use descriptive migration names** that explain the change
3. **Edit migrations that are NOT yet in main branch** - One migration per branch
4. **Never edit migrations that ARE in main branch** - create new ones for each branch
5. **Use transactions for complex migrations** to ensure atomicity
6. **Back up production data** before major schema changes
7. **Document breaking changes** in migration comments
8. **Test rollback procedures** for critical changes

## Integration with Application

The application uses the Supabase JavaScript client to interact with the database. With proper TypeScript generation, you get:

- **Type-safe database queries**
- **Auto-completion in your IDE**
- **Compile-time error checking**
- **Consistent data structures**

Generate types after schema changes:
```bash
npm run db:types
```

This creates `src/types/supabase.ts` with your complete database schema as TypeScript types.

---

For more details on Supabase CLI features, see the [official documentation](https://supabase.com/docs/guides/local-development).
