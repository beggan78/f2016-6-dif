-- Split player name into first_name, last_name, and display_name
-- This is a new implementation that adds display_name for flexible player identification

BEGIN;

-- Step 1: Rename existing name column to first_name
ALTER TABLE public.player
  RENAME COLUMN name TO first_name;

-- Step 2: Add new last_name column (optional)
ALTER TABLE public.player
  ADD COLUMN last_name text NULL;

-- Step 3: Add new display_name column (nullable initially to allow backfill)
ALTER TABLE public.player
  ADD COLUMN display_name text NULL;

-- Step 4: Backfill display_name with existing first_name values
UPDATE public.player
SET display_name = first_name
WHERE display_name IS NULL;

-- Step 5: Make display_name NOT NULL now that all rows have values
ALTER TABLE public.player
  ALTER COLUMN display_name SET NOT NULL;

-- Step 6: Add length constraints
ALTER TABLE public.player
  ADD CONSTRAINT player_last_name_length CHECK (
    last_name IS NULL OR (char_length(last_name) >= 1 AND char_length(last_name) <= 50)
  );

ALTER TABLE public.player
  ADD CONSTRAINT player_display_name_length CHECK (
    char_length(display_name) >= 2 AND char_length(display_name) <= 50
  );

CREATE INDEX idx_player_display_name ON public.player(display_name);

COMMIT;
