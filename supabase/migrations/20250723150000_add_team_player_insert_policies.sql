-- RLS policy to allow authenticated users to create a new team.
CREATE POLICY "Allow authenticated users to create teams"
ON public.team
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policy to allow coaches to create players for their team.
CREATE POLICY "Allow coaches to create players for their team"
ON public.player
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() IN (
    SELECT user_id
    FROM public.team_user
    WHERE team_user.team_id = player.team_id AND team_user.role = 'coach'::public.user_role
  ))
);
