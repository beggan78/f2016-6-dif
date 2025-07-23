-- Add RLS policies for user_profile table
-- This allows users to manage their own profile data

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profile
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON public.user_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING (auth.uid() = id);

-- Users can delete their own profile (optional - for account deletion)
CREATE POLICY "Users can delete own profile" ON public.user_profile
  FOR DELETE USING (auth.uid() = id);