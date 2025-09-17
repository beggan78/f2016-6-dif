-- Add initial_config column to match table for pending match resume feature
ALTER TABLE public.match 
ADD COLUMN initial_config jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.match.initial_config IS 'Stores complete initial match configuration for resuming pending matches. Includes formation, teamConfig, matchConfig, periodGoalies, and squadSelection.';