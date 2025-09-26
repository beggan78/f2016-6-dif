-- Add venue type enum and started_at tracking to match table

-- 1. Create new enum for match venue types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_venue_type') THEN
    CREATE TYPE public.match_venue_type AS ENUM ('home', 'away', 'neutral');
  END IF;
END $$;

-- 2. Add venue_type and started_at columns to match table
ALTER TABLE public.match
  ADD COLUMN IF NOT EXISTS venue_type public.match_venue_type NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- 3. Backfill existing records with default venue_type if needed
UPDATE public.match
SET venue_type = 'home'
WHERE venue_type IS NULL;

COMMENT ON COLUMN public.match.venue_type IS 'Venue type for the match: home, away, or neutral.';
COMMENT ON COLUMN public.match.started_at IS 'Timestamp when the match actually started (state changed to running).';

-- 4. Trigger to automatically set started_at when state transitions to running
CREATE OR REPLACE FUNCTION public.handle_match_started_at()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state = 'running' AND NEW.started_at IS NULL THEN
      NEW.started_at = now();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.state = 'running' AND (OLD.state IS DISTINCT FROM 'running') AND NEW.started_at IS NULL THEN
      NEW.started_at = now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_match_set_started_at ON public.match;
CREATE TRIGGER on_match_set_started_at
  BEFORE INSERT OR UPDATE ON public.match
  FOR EACH ROW EXECUTE FUNCTION public.handle_match_started_at();
