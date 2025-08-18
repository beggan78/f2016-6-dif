-- Migration: Add unique constraint for team names within clubs
-- This ensures team names are unique within each club to prevent confusion
-- Created: 2025-08-18 (Production-safe migration)

-- First, identify and handle any existing duplicate team names
-- We'll append a number suffix to duplicates to make them unique
DO $$
DECLARE
    duplicate_record RECORD;
    counter INTEGER;
    new_name TEXT;
BEGIN
    -- Find teams with duplicate names within the same club
    FOR duplicate_record IN
        SELECT club_id, name, array_agg(id ORDER BY created_at) as team_ids
        FROM public.team 
        GROUP BY club_id, name 
        HAVING count(*) > 1
    LOOP
        -- Keep the first team (oldest) with original name
        -- Rename subsequent duplicates by appending numbers
        counter := 2;
        
        -- Skip the first team (index 1) and rename the rest
        FOR i IN 2..array_length(duplicate_record.team_ids, 1)
        LOOP
            -- Generate new unique name
            new_name := duplicate_record.name || ' (' || counter || ')';
            
            -- Ensure the new name doesn't already exist in this club
            WHILE EXISTS (
                SELECT 1 FROM public.team 
                WHERE club_id = duplicate_record.club_id 
                AND name = new_name
            ) LOOP
                counter := counter + 1;
                new_name := duplicate_record.name || ' (' || counter || ')';
            END LOOP;
            
            -- Update the duplicate team with new name
            UPDATE public.team 
            SET name = new_name,
                updated_at = CURRENT_TIMESTAMP,
                last_updated_by = created_by -- Use original creator as updater
            WHERE id = duplicate_record.team_ids[i];
            
            -- Log the change (for debugging/auditing)
            RAISE NOTICE 'Renamed duplicate team: % -> % (Club ID: %)', 
                duplicate_record.name, new_name, duplicate_record.club_id;
            
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Add the unique constraint now that all duplicates are resolved
ALTER TABLE public.team 
ADD CONSTRAINT unique_team_name_per_club 
UNIQUE (club_id, name);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_team_club_name 
ON public.team(club_id, name);

-- Update the create_team_with_admin function to handle unique constraint violations
CREATE OR REPLACE FUNCTION public.create_team_with_admin(
  p_club_id uuid,
  team_name text,
  team_config jsonb DEFAULT '{}'::jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_team public.team;
  result json;
BEGIN
  -- Insert team
  INSERT INTO public.team (club_id, name, configuration, created_by)
  VALUES (p_club_id, team_name, team_config, auth.uid())
  RETURNING * INTO new_team;
  
  -- Add creator as team admin
  INSERT INTO public.team_user (team_id, user_id, role)
  VALUES (new_team.id, auth.uid(), 'admin'::public.user_role);
  
  -- Return success result
  SELECT json_build_object(
    'success', true,
    'team', row_to_json(new_team),
    'message', 'Team created successfully with admin privileges'
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    -- Check if it's the specific constraint we care about
    IF SQLERRM LIKE '%unique_team_name_per_club%' THEN
      SELECT json_build_object(
        'success', false,
        'error', 'duplicate_team_name',
        'message', 'A team with this name already exists in this club. Please choose a different name.'
      ) INTO result;
      RETURN result;
    ELSE
      -- Re-raise other unique violations
      RAISE;
    END IF;
  WHEN OTHERS THEN
    -- Handle other errors
    SELECT json_build_object(
      'success', false,
      'error', 'unknown_error',
      'message', 'Failed to create team: ' || SQLERRM
    ) INTO result;
    RETURN result;
END $$;

-- Add helpful comment to the constraint
COMMENT ON CONSTRAINT unique_team_name_per_club ON public.team 
IS 'Ensures team names are unique within each club to prevent user confusion';