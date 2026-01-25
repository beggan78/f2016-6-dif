ALTER TABLE player
ADD COLUMN match_id uuid REFERENCES match(id) ON DELETE CASCADE;

CREATE INDEX idx_player_match_id ON player(match_id);

ALTER TABLE player
ADD CONSTRAINT check_temp_player_not_on_roster
CHECK (match_id IS NULL OR on_roster = false);

COMMENT ON COLUMN player.match_id IS 'If set, this player is temporary and scoped to this specific match only. Temporary players have on_roster=false and are excluded from roster management and general statistics.';
