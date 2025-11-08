-- Migration: Update player_attendance table for monthly tracking
-- Changes:
--   1. Drop attendance_percentage column (redundant calculated field)
--   2. Add month column for monthly granularity
--   3. Update unique constraint to include month
--   4. Clear existing yearly data

BEGIN;

-- Drop attendance_percentage constraint and column
ALTER TABLE player_attendance DROP CONSTRAINT IF EXISTS attendance_percentage_range;
ALTER TABLE player_attendance DROP COLUMN IF EXISTS attendance_percentage;

-- Drop unused audit columns
ALTER TABLE player_attendance DROP COLUMN IF EXISTS created_by;
ALTER TABLE player_attendance DROP COLUMN IF EXISTS last_updated_by;

-- Add month column with check constraint
ALTER TABLE player_attendance ADD COLUMN month integer NOT NULL DEFAULT 1;
ALTER TABLE player_attendance ADD CONSTRAINT player_attendance_month_check
  CHECK (month >= 1 AND month <= 12);

-- Update unique constraint for monthly granularity
ALTER TABLE player_attendance DROP CONSTRAINT IF EXISTS player_attendance_connector_id_player_name_year_key;
ALTER TABLE player_attendance DROP CONSTRAINT IF EXISTS player_attendance_connector_name_year_unique;
ALTER TABLE player_attendance ADD CONSTRAINT player_attendance_connector_id_player_name_year_month_key
  UNIQUE (connector_id, player_name, year, month);

-- Clear existing yearly data (starting fresh with monthly tracking)
DELETE FROM player_attendance;

-- Ensure triggers no longer expect audit columns on player_attendance
DROP TRIGGER IF EXISTS update_player_attendance_timestamp ON public.player_attendance;
CREATE TRIGGER update_player_attendance_timestamp
  BEFORE UPDATE ON public.player_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_only();

-- Ensure upcoming_match trigger does not reference audit columns
DROP TRIGGER IF EXISTS update_upcoming_match_timestamp ON public.upcoming_match;
CREATE TRIGGER update_upcoming_match_timestamp
  BEFORE UPDATE ON public.upcoming_match
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_only();

COMMIT;
