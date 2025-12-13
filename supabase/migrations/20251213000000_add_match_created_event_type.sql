-- Add match_created to match_event_type enum for tracking match configuration saves
-- This event is logged when a pending match is created (via Save Configuration, Get Live Match Link, or Proceed to Period Setup)

ALTER TYPE public.match_event_type ADD VALUE 'match_created';
