-- Add RLS policies for the club table
-- This allows any authenticated user to view the list of clubs, which is necessary for the team setup flow.

CREATE POLICY "Allow authenticated users to read clubs" ON public.club
  FOR SELECT TO authenticated
  USING (true);
