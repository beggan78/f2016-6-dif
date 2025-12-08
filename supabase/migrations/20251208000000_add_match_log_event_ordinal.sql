-- Add ordinal column for efficient ordering and incremental fetching
-- This enables "fetch events since last ordinal" pattern for live updates

-- Add ordinal column with auto-incrementing sequence
ALTER TABLE public.match_log_event
  ADD COLUMN ordinal BIGSERIAL NOT NULL;

-- Create index for efficient ordinal-based queries
CREATE INDEX idx_match_log_event_ordinal ON public.match_log_event(ordinal);

-- Create composite index for match_id + ordinal (most common query pattern for live updates)
CREATE INDEX idx_match_log_event_match_ordinal ON public.match_log_event(match_id, ordinal);

COMMENT ON COLUMN public.match_log_event.ordinal IS
  'Auto-incrementing sequence number for efficient ordering and incremental event fetching. Used by live match reporting to fetch only new events since last poll.';
