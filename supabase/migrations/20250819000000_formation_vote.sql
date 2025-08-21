-- Formation Voting System
-- This migration creates the complete formation voting system including:
-- - formation_vote table with RLS policies
-- - submit_formation_vote function with proper auth context

-- Create formation_vote table
CREATE TABLE public.formation_vote (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  formation text NOT NULL,
  format text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  -- Ensure one vote per user per formation per format
  UNIQUE(user_id, formation, format)
);

-- Enable Row Level Security
ALTER TABLE public.formation_vote ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only insert their own formation votes
CREATE POLICY "Users can insert own formation votes" ON public.formation_vote
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create formation vote submission function
CREATE OR REPLACE FUNCTION public.submit_formation_vote(
  p_formation text,
  p_format text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_vote_record public.formation_vote;
  result json;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    SELECT json_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'You must be logged in to vote for formations'
    ) INTO result;
    RETURN result;
  END IF;

  -- Validate input parameters
  IF p_formation IS NULL OR p_format IS NULL OR 
     length(trim(p_formation)) = 0 OR length(trim(p_format)) = 0 THEN
    SELECT json_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Formation and format are required'
    ) INTO result;
    RETURN result;
  END IF;

  -- Validate input lengths and format
  IF length(p_formation) > 20 OR length(p_format) > 10 THEN
    SELECT json_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Formation or format is too long'
    ) INTO result;
    RETURN result;
  END IF;

  -- Attempt to insert the vote
  BEGIN
    INSERT INTO public.formation_vote (user_id, formation, format)
    VALUES (v_user_id, p_formation, p_format)
    RETURNING * INTO v_vote_record;

    -- Return success response
    SELECT json_build_object(
      'success', true,
      'data', json_build_object(
        'id', v_vote_record.id,
        'formation', v_vote_record.formation,
        'format', v_vote_record.format,
        'created_at', v_vote_record.created_at
      ),
      'message', format('Your vote for the %s formation in %s format has been recorded!', p_formation, p_format)
    ) INTO result;
    RETURN result;

  EXCEPTION
    -- Handle duplicate vote (unique constraint violation)
    WHEN unique_violation THEN
      SELECT json_build_object(
        'success', false,
        'error', 'duplicate_vote',
        'message', format('You have already voted for the %s formation in %s format.', p_formation, p_format)
      ) INTO result;
      RETURN result;

    -- Handle other database errors
    WHEN OTHERS THEN
      SELECT json_build_object(
        'success', false,
        'error', 'database_error',
        'message', 'Unable to submit your vote at this time. Please try again later.'
      ) INTO result;
      RETURN result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_formation_vote(text, text) TO authenticated;

-- Add table and function comments for documentation
COMMENT ON TABLE public.formation_vote IS 'Stores user votes for unimplemented formations across different match formats';
COMMENT ON COLUMN public.formation_vote.formation IS 'Formation identifier (e.g., 1-3, 1-1-2, 2-1-1)';
COMMENT ON COLUMN public.formation_vote.format IS 'Match format (e.g., 5v5, 7v7, 9v9, 11v11)';
COMMENT ON FUNCTION public.submit_formation_vote IS 'Submits a formation vote for authenticated users with proper RLS context. Uses SECURITY DEFINER to establish auth context for RLS policies.';