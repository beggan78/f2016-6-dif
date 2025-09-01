-- Add 'unknown' value to player_role enum
-- This allows storing 'unknown' when position mapping fails instead of misleading 'substitute'

ALTER TYPE public.player_role ADD VALUE 'unknown';