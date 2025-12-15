-- Migration: Live Match Report Features
-- Consolidates match event tracking, attendance, and live reporting enhancements
-- Original migrations:
--   - 20251208000000_add_match_log_event_ordinal.sql
--   - 20251212000000_add_fair_play_award_event_type.sql
--   - 20251213000000_add_match_created_event_type.sql
--   - 20251215090000_add_day_to_player_attendance.sql

BEGIN;

-- 1. Add new event types to match_event_type enum
ALTER TYPE public.match_event_type ADD VALUE 'fair_play_award';
ALTER TYPE public.match_event_type ADD VALUE 'match_created';

-- 2. Add ordinal column to match_log_event for efficient ordering
ALTER TABLE public.match_log_event
  ADD COLUMN ordinal BIGSERIAL NOT NULL;

CREATE INDEX idx_match_log_event_ordinal ON public.match_log_event(ordinal);
CREATE INDEX idx_match_log_event_match_ordinal ON public.match_log_event(match_id, ordinal);

COMMENT ON COLUMN public.match_log_event.ordinal IS
  'Auto-incrementing sequence number for efficient ordering and incremental event fetching. Used by live match reporting to fetch only new events since last poll.';

-- 3. Add day-of-month tracking to player_attendance
-- TRUNCATE TABLE player_attendance;

ALTER TABLE player_attendance
  ADD COLUMN day_of_month integer NOT NULL;

ALTER TABLE player_attendance
  ADD CONSTRAINT player_attendance_day_check
  CHECK (day_of_month >= 1 AND day_of_month <= 31);

ALTER TABLE player_attendance
  DROP CONSTRAINT IF EXISTS player_attendance_connector_id_player_name_year_month_key,
  ADD CONSTRAINT player_attendance_connector_id_player_name_year_month_day_key
    UNIQUE (connector_id, player_name, year, month, day_of_month);

COMMIT;

