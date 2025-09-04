-- Add initial configuration storage to match table
-- This enables complete match setup persistence when creating pending matches
-- Stores all necessary information for perfect match resumption

-- Add JSONB column for complete initial configuration storage
ALTER TABLE public.match 
  ADD COLUMN initial_config jsonb DEFAULT '{}'::jsonb;

-- Add comment explaining the column purpose and structure
COMMENT ON COLUMN public.match.initial_config IS 'Complete initial match configuration in JSON format. Contains teamConfig, matchConfig, squadSelection, formation positions, and periodGoalies. Example: {"teamConfig":{"format":"5v5","squadSize":7,"formation":"2-2","substitutionType":"pairs"},"matchConfig":{"periods":3,"periodDurationMinutes":15,"matchType":"league","opponentTeam":"Rival FC","captainId":"player-123"},"squadSelection":["player-123","player-456"],"formation":{"goalie":"player-123","leftPair":{"defender":"player-456","attacker":"player-789"}},"periodGoalies":{"1":"player-123","2":"player-456"}}. Defaults to empty object for backward compatibility.';

-- Note: No database constraints or indexes added initially - application handles validation
-- This approach provides maximum flexibility for complete match setup storage while keeping
-- the database schema simple and focused on storage rather than enforcement