-- Add related_to column to player table
-- Links a player to a coach/admin user_profile for match planning purposes
ALTER TABLE public.player
  ADD COLUMN related_to uuid REFERENCES public.user_profile(id) ON DELETE SET NULL;

CREATE INDEX idx_player_related_to ON public.player(related_to);
