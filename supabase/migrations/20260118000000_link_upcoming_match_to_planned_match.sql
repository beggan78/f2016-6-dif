-- Add nullable FK column to upcoming_match table to link to planned matches
-- This allows tracking which upcoming matches have been planned with squad selection

-- Add the FK column
ALTER TABLE upcoming_match
ADD COLUMN planned_match_id UUID REFERENCES match(id) ON DELETE SET NULL;

-- Add index for efficient querying of planned matches
CREATE INDEX idx_upcoming_match_planned_match_id
ON upcoming_match(planned_match_id);

-- Add index to find unplanned upcoming matches quickly
CREATE INDEX idx_upcoming_match_unplanned
ON upcoming_match(connector_id, match_date)
WHERE planned_match_id IS NULL;

-- Document the column purpose
COMMENT ON COLUMN upcoming_match.planned_match_id IS
'Links to match.id when this upcoming match has been planned with a squad selection. NULL means not yet planned.';
