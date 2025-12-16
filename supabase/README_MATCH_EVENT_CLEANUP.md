# Match Event Cleanup System

## Overview

The match_log_event table stores detailed event logs for live match tracking and post-match reports. To prevent unlimited growth and maintain database performance, this system automatically cleans up old event records.

## Configuration

- **Retention Period**: 3 months (configurable)
- **Schedule**: Daily at 2 AM UTC
- **Implementation**: pg_cron scheduled job
- **Migration**: `20251216120000_cleanup_old_match_events.sql`

## Why 3 Months?

Match event logs are most valuable for:
- **Live tracking** during active matches
- **Recent analysis** for coaching decisions and player development
- **Short-term reporting** for parents and team members

After 3 months, the aggregated statistics in `player_match_stats` and `season_stats` provide sufficient historical data without needing detailed event logs.

## Manual Operations

### Check Current Statistics

```sql
SELECT * FROM check_match_event_stats();
```

Returns:
- Total events in database
- Events from last 30 days
- Events from last 90 days
- Events older than 90 days (cleanup candidates)
- Oldest and newest event dates
- Count of matches with events

### Manual Cleanup

To run cleanup immediately (instead of waiting for scheduled job):

```sql
SELECT * FROM cleanup_old_match_events();
```

With custom retention period (e.g., 6 months):

```sql
SELECT * FROM cleanup_old_match_events(6);
```

### View Scheduled Jobs

```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-match-events';
```

### Check Job History

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'cleanup-old-match-events'
ORDER BY start_time DESC
LIMIT 10;
```

## Modifying Configuration

### Change Retention Period

Update the scheduled job:

```sql
-- Change to 6 months retention
SELECT cron.alter_job(
  'cleanup-old-match-events',
  schedule := '0 2 * * *',  -- Keep same schedule
  command := 'SELECT cleanup_old_match_events(6);'  -- Change retention
);
```

### Change Schedule

```sql
-- Run weekly instead of daily (Sundays at 3 AM)
SELECT cron.alter_job(
  'cleanup-old-match-events',
  schedule := '0 3 * * 0',  -- Every Sunday at 3 AM
  command := 'SELECT cleanup_old_match_events();'
);
```

### Disable Cleanup

```sql
-- Unschedule the job (keeps function available for manual runs)
SELECT cron.unschedule('cleanup-old-match-events');
```

### Re-enable Cleanup

```sql
-- Re-schedule the job
SELECT cron.schedule(
  'cleanup-old-match-events',
  '0 2 * * *',
  'SELECT cleanup_old_match_events();'
);
```

## Monitoring

### Set Up Alerts

Monitor the cleanup job execution:

```sql
-- Check if cleanup is running successfully
SELECT
  jobname,
  MAX(start_time) as last_run,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failures_last_30_days
FROM cron.job_run_details
WHERE jobname = 'cleanup-old-match-events'
  AND start_time > NOW() - INTERVAL '30 days'
GROUP BY jobname;
```

### Database Growth Tracking

```sql
-- Check table size
SELECT
  pg_size_pretty(pg_total_relation_size('match_log_event')) as total_size,
  pg_size_pretty(pg_relation_size('match_log_event')) as table_size,
  pg_size_pretty(pg_indexes_size('match_log_event')) as indexes_size;
```

## Troubleshooting

### Job Not Running

1. Check if pg_cron extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Check job schedule:
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-match-events';
```

3. Check for errors:
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'cleanup-old-match-events'
  AND status = 'failed'
ORDER BY start_time DESC;
```

### Cleanup Taking Too Long

If you have millions of events, consider batching:

```sql
-- Delete in smaller batches
DO $$
DECLARE
  v_batch_size INTEGER := 10000;
  v_deleted INTEGER;
BEGIN
  LOOP
    DELETE FROM match_log_event
    WHERE id IN (
      SELECT id FROM match_log_event
      WHERE created_at < NOW() - INTERVAL '3 months'
      LIMIT v_batch_size
    );

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    EXIT WHEN v_deleted = 0;

    RAISE NOTICE 'Deleted % events', v_deleted;
    PERFORM pg_sleep(1);  -- Brief pause between batches
  END LOOP;
END $$;
```

## Data Recovery

**Important**: Deleted events cannot be recovered. If you need to preserve old events:

1. **Export before cleanup**:
```sql
COPY (
  SELECT * FROM match_log_event
  WHERE created_at < NOW() - INTERVAL '3 months'
) TO '/path/to/backup.csv' CSV HEADER;
```

2. **Disable automatic cleanup** before making schema changes:
```sql
SELECT cron.unschedule('cleanup-old-match-events');
```

## Performance Impact

- **Index**: `idx_match_log_event_created_at` ensures efficient cleanup queries
- **Schedule**: 2 AM UTC chosen for minimal user impact
- **Vacuum**: PostgreSQL auto-vacuum reclaims space after cleanup
- **Expected impact**: < 1 second for typical workloads (thousands of old events)

## Related Systems

This cleanup system follows the same pattern as:
- **Team Invitation Expiry** (`expire_old_team_invitations`) - Runs hourly
- Uses shared **pg_cron** extension infrastructure

## Security

- Functions are `SECURITY DEFINER` to ensure proper permissions
- Execution restricted to `service_role` (default cron role); execution revoked from `PUBLIC`
- No sensitive data exposed in function outputs
- Respects foreign key constraints (ON DELETE CASCADE from matches)
