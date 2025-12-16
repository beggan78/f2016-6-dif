-- Automatic Cleanup of Old Match Log Events
-- Sets up scheduled cleanup of match_log_event records older than 3 months
-- Uses pg_cron (already enabled in project) for scheduled execution

-- ========================================
-- Performance Index for Cleanup Queries
-- ========================================

-- Add index on created_at for efficient cleanup queries
-- This ensures the DELETE operation can quickly identify old events
CREATE INDEX IF NOT EXISTS idx_match_log_event_created_at
  ON public.match_log_event(created_at DESC);

COMMENT ON INDEX idx_match_log_event_created_at IS
  'Supports efficient cleanup queries for old match log events';

-- ========================================
-- Cleanup Function with Logging
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_old_match_events(
  p_retention_months INTEGER DEFAULT 3
)
RETURNS TABLE(deleted_count INTEGER, oldest_remaining_date TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_oldest_remaining TIMESTAMPTZ;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date
  v_cutoff_date := NOW() - (p_retention_months || ' months')::INTERVAL;

  -- Delete old match log events
  DELETE FROM public.match_log_event
  WHERE created_at < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Get the oldest remaining event date for monitoring
  SELECT MIN(created_at) INTO v_oldest_remaining
  FROM public.match_log_event;

  -- Log the operation
  RAISE NOTICE 'Match event cleanup completed: % events deleted (older than %), oldest remaining: %',
    v_deleted_count,
    v_cutoff_date,
    COALESCE(v_oldest_remaining::TEXT, 'no events remaining');

  RETURN QUERY SELECT v_deleted_count, v_oldest_remaining;
END;
$$;

COMMENT ON FUNCTION cleanup_old_match_events IS
  'Deletes match_log_event records older than specified retention period (default: 3 months). Returns count of deleted events and oldest remaining event date.';

-- ========================================
-- Monitoring Function
-- ========================================

CREATE OR REPLACE FUNCTION check_match_event_stats()
RETURNS TABLE(
  total_events BIGINT,
  events_last_30_days BIGINT,
  events_last_90_days BIGINT,
  events_older_than_90_days BIGINT,
  oldest_event_date TIMESTAMPTZ,
  newest_event_date TIMESTAMPTZ,
  total_matches_with_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT := 0;
  v_last_30 BIGINT := 0;
  v_last_90 BIGINT := 0;
  v_older_90 BIGINT := 0;
  v_oldest TIMESTAMPTZ;
  v_newest TIMESTAMPTZ;
  v_matches BIGINT := 0;
BEGIN
  -- Total events
  SELECT COUNT(*) INTO v_total FROM public.match_log_event;

  -- Events in last 30 days
  SELECT COUNT(*) INTO v_last_30
  FROM public.match_log_event
  WHERE created_at > NOW() - INTERVAL '30 days';

  -- Events in last 90 days
  SELECT COUNT(*) INTO v_last_90
  FROM public.match_log_event
  WHERE created_at > NOW() - INTERVAL '90 days';

  -- Events older than 90 days (candidates for cleanup)
  SELECT COUNT(*) INTO v_older_90
  FROM public.match_log_event
  WHERE created_at <= NOW() - INTERVAL '90 days';

  -- Oldest and newest event dates
  SELECT MIN(created_at), MAX(created_at)
  INTO v_oldest, v_newest
  FROM public.match_log_event;

  -- Total matches with events
  SELECT COUNT(DISTINCT match_id) INTO v_matches
  FROM public.match_log_event;

  RETURN QUERY SELECT
    v_total,
    v_last_30,
    v_last_90,
    v_older_90,
    v_oldest,
    v_newest,
    v_matches;
END;
$$;

COMMENT ON FUNCTION check_match_event_stats IS
  'Returns statistics about match_log_event table for monitoring and capacity planning';

-- ========================================
-- Schedule Automatic Cleanup Job
-- ========================================

-- Note: pg_cron extension is already enabled in the project
-- (see migration 20250820002631_enable_expired_invitation_refresh.sql)

-- Schedule cleanup to run daily at 2 AM UTC
-- This ensures minimal impact on production workload
SELECT cron.schedule(
  'cleanup-old-match-events',           -- job name
  '0 2 * * *',                          -- cron expression: daily at 2 AM UTC
  'SELECT cleanup_old_match_events();'  -- SQL command (uses default 3-month retention)
);

COMMENT ON EXTENSION pg_cron IS
  'Scheduled jobs extension - used for automatic cleanup of old match events and expired invitations';

-- ========================================
-- Grant Permissions
-- ========================================

-- Grant execute permission to authenticated users for monitoring
GRANT EXECUTE ON FUNCTION check_match_event_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_match_events TO authenticated;

-- ========================================
-- Initial Statistics (No Cleanup on Install)
-- ========================================

-- Display current statistics without deleting anything
-- This allows review of the current state before first cleanup runs
DO $$
DECLARE
  v_stats RECORD;
BEGIN
  SELECT * INTO v_stats FROM check_match_event_stats();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Match Event Cleanup System Installed';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current Statistics:';
  RAISE NOTICE '  Total events: %', v_stats.total_events;
  RAISE NOTICE '  Events (last 30 days): %', v_stats.events_last_30_days;
  RAISE NOTICE '  Events (last 90 days): %', v_stats.events_last_90_days;
  RAISE NOTICE '  Events (older than 90 days): % [will be cleaned up]', v_stats.events_older_than_90_days;
  RAISE NOTICE '  Oldest event: %', COALESCE(v_stats.oldest_event_date::TEXT, 'none');
  RAISE NOTICE '  Newest event: %', COALESCE(v_stats.newest_event_date::TEXT, 'none');
  RAISE NOTICE '  Matches with events: %', v_stats.total_matches_with_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Configuration:';
  RAISE NOTICE '  Retention period: 3 months';
  RAISE NOTICE '  Schedule: Daily at 2 AM UTC';
  RAISE NOTICE '  First cleanup: Will run at next scheduled time';
  RAISE NOTICE '';
  RAISE NOTICE 'Manual cleanup: SELECT cleanup_old_match_events();';
  RAISE NOTICE 'Check statistics: SELECT * FROM check_match_event_stats();';
  RAISE NOTICE '========================================';
END;
$$;
