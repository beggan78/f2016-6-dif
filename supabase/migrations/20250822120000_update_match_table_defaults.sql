-- Update match table to remove unnecessary defaults and change state default
-- This ensures explicit values are required when creating matches

-- Remove defaults from columns that should be explicitly set
ALTER TABLE public.match 
  ALTER COLUMN format DROP DEFAULT,
  ALTER COLUMN formation DROP DEFAULT,
  ALTER COLUMN periods DROP DEFAULT,
  ALTER COLUMN period_duration_minutes DROP DEFAULT,
  ALTER COLUMN match_duration_seconds DROP DEFAULT,
  ALTER COLUMN type DROP DEFAULT;

-- Change state default from 'pending' to 'running' since matches start running
ALTER TABLE public.match 
  ALTER COLUMN state SET DEFAULT 'running'::public.match_state;

-- Add comment explaining the change
COMMENT ON COLUMN public.match.state IS 'Match state: running (active), finished (completed), confirmed (saved to history), pending (unused). Defaults to running when match is created.';
COMMENT ON COLUMN public.match.format IS 'Match format (3v3, 5v5, 7v7, 9v9, 11v11) - must be explicitly set, no default';
COMMENT ON COLUMN public.match.formation IS 'Formation configuration used - must be explicitly set, no default';
COMMENT ON COLUMN public.match.periods IS 'Number of periods in match - must be explicitly set, no default';
COMMENT ON COLUMN public.match.period_duration_minutes IS 'Duration of each period in minutes - must be explicitly set, no default';
COMMENT ON COLUMN public.match.type IS 'Type of match (friendly, internal, league, tournament, cup) - must be explicitly set, no default';