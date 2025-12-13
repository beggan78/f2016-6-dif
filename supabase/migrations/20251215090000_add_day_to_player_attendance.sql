-- Migration: Add day_of_month to player_attendance for daily tracking
-- Changes:
--   1. Add day_of_month column with NOT NULL and default 1
--   2. Enforce valid day range (1-31)
--   3. Update unique constraint to include day_of_month for daily granularity

BEGIN;

-- Add day_of_month column for daily attendance tracking
ALTER TABLE player_attendance
  ADD COLUMN day_of_month integer NOT NULL DEFAULT 1;

-- Ensure day_of_month is within the calendar range
ALTER TABLE player_attendance
  ADD CONSTRAINT player_attendance_day_check
  CHECK (day_of_month >= 1 AND day_of_month <= 31);

-- Update unique constraint to include day_of_month
ALTER TABLE player_attendance
  DROP CONSTRAINT IF EXISTS player_attendance_connector_id_player_name_year_month_key,
  ADD CONSTRAINT player_attendance_connector_id_player_name_year_month_day_key
    UNIQUE (connector_id, player_name, year, month, day_of_month);

COMMIT;
