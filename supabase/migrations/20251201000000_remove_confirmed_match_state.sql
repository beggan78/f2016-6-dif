-- Remove deprecated confirmed match state and make finished the terminal state

BEGIN;

-- Normalize existing data before altering the enum
UPDATE public.match
SET state = 'finished'
WHERE state = 'confirmed';

-- Create a replacement enum without the confirmed value
CREATE TYPE public.match_state_new AS ENUM (
  'running',
  'finished',
  'pending'
);

-- Drop default to avoid referencing the old type during conversion
ALTER TABLE public.match
  ALTER COLUMN state DROP DEFAULT;

-- Move column to the new enum type
ALTER TABLE public.match
  ALTER COLUMN state TYPE public.match_state_new USING state::text::public.match_state_new;

-- Restore default
ALTER TABLE public.match
  ALTER COLUMN state SET DEFAULT 'running'::public.match_state_new;

-- Replace old enum with the new definition
DROP TYPE public.match_state;
ALTER TYPE public.match_state_new RENAME TO match_state;

-- Update column comment to reflect the simplified lifecycle
COMMENT ON COLUMN public.match.state IS 'Match state: running (active), finished (completed), pending (unused). Defaults to running when match is created.';

COMMIT;
