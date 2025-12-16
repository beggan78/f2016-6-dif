-- Batched cleanup for match_log_event to reduce lock time on large tables

-- Remove prior single-parameter version so the new batched signature is the only variant
DROP FUNCTION IF EXISTS cleanup_old_match_events(integer);

CREATE OR REPLACE FUNCTION cleanup_old_match_events(
  p_retention_months INTEGER DEFAULT 3,
  p_batch_size INTEGER DEFAULT 10000,
  p_max_batches INTEGER DEFAULT 50,
  p_pause_ms INTEGER DEFAULT 50
)
RETURNS TABLE(deleted_count INTEGER, oldest_remaining_date TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_deleted INTEGER := 0;
  v_batch_deleted INTEGER := 0;
  v_batches_run INTEGER := 0;
  v_oldest_remaining TIMESTAMPTZ;
  v_cutoff_date TIMESTAMPTZ;
  v_batch_size INTEGER := GREATEST(COALESCE(p_batch_size, 1), 1);
  v_max_batches INTEGER := GREATEST(COALESCE(p_max_batches, 1), 1);
  v_sleep_seconds DOUBLE PRECISION := GREATEST(COALESCE(p_pause_ms, 0), 0) / 1000.0;
  v_more_remaining BOOLEAN := FALSE;
BEGIN
  v_cutoff_date := NOW() - (p_retention_months || ' months')::INTERVAL;

  LOOP
    WITH old_events AS (
      SELECT id
      FROM public.match_log_event
      WHERE created_at < v_cutoff_date
      ORDER BY created_at
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM public.match_log_event e
    USING old_events
    WHERE e.id = old_events.id;

    GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
    EXIT WHEN v_batch_deleted = 0;

    v_total_deleted := v_total_deleted + v_batch_deleted;
    v_batches_run := v_batches_run + 1;

    EXIT WHEN v_batches_run >= v_max_batches;

    IF v_sleep_seconds > 0 THEN
      PERFORM pg_sleep(v_sleep_seconds);
    END IF;
  END LOOP;

  -- Check if more old events remain when we stopped due to batch cap
  IF v_batches_run >= v_max_batches THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.match_log_event
      WHERE created_at < v_cutoff_date
    ) INTO v_more_remaining;
  END IF;

  SELECT MIN(created_at) INTO v_oldest_remaining
  FROM public.match_log_event;

  RAISE NOTICE 'Match event cleanup completed: % events deleted across % batches (older than %), oldest remaining: %',
    v_total_deleted,
    v_batches_run,
    v_cutoff_date,
    COALESCE(v_oldest_remaining::TEXT, 'no events remaining');

  IF v_more_remaining THEN
    RAISE NOTICE 'Additional old events remain after reaching the batch limit (batch size: %, max batches: %). Re-run cleanup to continue.',
      v_batch_size,
      v_max_batches;
  END IF;

  RETURN QUERY SELECT v_total_deleted, v_oldest_remaining;
END;
$$;

COMMENT ON FUNCTION cleanup_old_match_events IS
  'Deletes match_log_event records older than specified retention period using batched deletes (defaults: 3 months retention, 10k batch size, 50 batches max, 50ms pause). Returns count of deleted events and oldest remaining event date.';

REVOKE EXECUTE ON FUNCTION cleanup_old_match_events FROM PUBLIC;
