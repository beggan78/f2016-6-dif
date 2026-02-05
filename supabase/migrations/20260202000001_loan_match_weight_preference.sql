-- ============================================================================
-- LOAN MATCH WEIGHT TEAM PREFERENCE - Sport Wizard
-- ============================================================================
-- Purpose: Default preference for loan match weighting in statistics
-- ============================================================================

INSERT INTO public.team_preference (team_id, key, value, category, description)
SELECT
  team.id,
  'loanMatchWeight',
  '0.5',
  'statistics',
  'Weight applied to loan matches when calculating player statistics'
FROM public.team
WHERE NOT EXISTS (
  SELECT 1
  FROM public.team_preference pref
  WHERE pref.team_id = team.id
    AND pref.key = 'loanMatchWeight'
);
