-- Add RLS policy to allow authenticated users to create clubs.

CREATE POLICY "Allow authenticated users to create clubs" ON public.club
  FOR INSERT TO authenticated
  WITH CHECK (true);
