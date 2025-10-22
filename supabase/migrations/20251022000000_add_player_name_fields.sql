-- Add first_name, last_name, and display_name fields to player table
-- This migration enhances player identity management by separating name components

-- Add new columns
ALTER TABLE public.player
  ADD COLUMN first_name text CHECK (char_length(first_name) >= 1 AND char_length(first_name) <= 50),
  ADD COLUMN last_name text CHECK (char_length(last_name) >= 1 AND char_length(last_name) <= 50),
  ADD COLUMN display_name text CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 50);

-- Migrate existing data: copy name to display_name for existing records
UPDATE public.player
SET display_name = name
WHERE display_name IS NULL;

-- Make display_name NOT NULL after migration
ALTER TABLE public.player
  ALTER COLUMN display_name SET NOT NULL;

-- Add index on display_name for better search performance
CREATE INDEX idx_player_display_name ON public.player(display_name);

-- Add comment to document the fields
COMMENT ON COLUMN public.player.first_name IS 'Player first name (optional)';
COMMENT ON COLUMN public.player.last_name IS 'Player last name (optional)';
COMMENT ON COLUMN public.player.display_name IS 'Player display name - shown throughout the application';
COMMENT ON COLUMN public.player.name IS 'Legacy player name field - kept for backward compatibility, use display_name instead';
