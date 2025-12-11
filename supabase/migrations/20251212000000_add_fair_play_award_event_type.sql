-- Add fair_play_award to match_event_type enum for award event persistence

ALTER TYPE public.match_event_type ADD VALUE 'fair_play_award';
