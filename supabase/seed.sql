-- Seed data for Sport Wizard application
-- This file provides sample data for development and testing

-- Insert sample club
INSERT INTO public.club (id, name, short_name, long_name) VALUES
('11111111-1111-1111-1111-111111111111', 'Djurgården', 'DIF', 'Djurgårdens IF');

-- Insert sample team
INSERT INTO public.team (id, club_id, name, configuration, active) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'F2016-6', '{"defaultFormation": "INDIVIDUAL_6", "preferredPeriods": 3, "defaultPeriodDuration": 15}', true);

-- Insert the default roster of 14 players from the app
INSERT INTO public.player (id, name, team_id, jersey_number, on_roster) VALUES
('33333333-3333-3333-3333-333333333333', 'Alma', '22222222-2222-2222-2222-222222222222', '1', true),
('33333333-3333-3333-3333-333333333334', 'Ebba', '22222222-2222-2222-2222-222222222222', '2', true),
('33333333-3333-3333-3333-333333333335', 'Elise', '22222222-2222-2222-2222-222222222222', '3', true),
('33333333-3333-3333-3333-333333333336', 'Filippa', '22222222-2222-2222-2222-222222222222', '4', true),
('33333333-3333-3333-3333-333333333337', 'Fiona', '22222222-2222-2222-2222-222222222222', '5', true),
('33333333-3333-3333-3333-333333333338', 'Ines', '22222222-2222-2222-2222-222222222222', '6', true),
('33333333-3333-3333-3333-333333333339', 'Isabelle', '22222222-2222-2222-2222-222222222222', '7', true),
('33333333-3333-3333-3333-33333333333a', 'Julie', '22222222-2222-2222-2222-222222222222', '8', true),
('33333333-3333-3333-3333-33333333333b', 'Leonie', '22222222-2222-2222-2222-222222222222', '9', true),
('33333333-3333-3333-3333-33333333333c', 'Nicole', '22222222-2222-2222-2222-222222222222', '10', true),
('33333333-3333-3333-3333-33333333333d', 'Rebecka', '22222222-2222-2222-2222-222222222222', '11', true),
('33333333-3333-3333-3333-33333333333e', 'Sigrid', '22222222-2222-2222-2222-222222222222', '12', true),
('33333333-3333-3333-3333-33333333333f', 'Sophie', '22222222-2222-2222-2222-222222222222', '13', true),
('33333333-3333-3333-3333-333333333340', 'Tyra', '22222222-2222-2222-2222-222222222222', '14', true);

-- Insert sample matches
INSERT INTO public.match (
  id, 
  team_id, 
  format, 
  formation, 
  periods, 
  period_duration_minutes, 
  match_duration_seconds,
  type, 
  opponent, 
  captain, 
  goals_scored, 
  goals_conceded, 
  outcome, 
  state,
  finished_at
) VALUES
-- Completed match
('44444444-4444-4444-4444-444444444444', 
 '22222222-2222-2222-2222-222222222222', 
 '5v5', 
 '2-2',
 3, 
 15, 
 2700,
 'league', 
 'AIK F16', 
 '33333333-3333-3333-3333-333333333333', -- Alma as captain
 3, 
 1, 
 'win', 
 'finished',
 now() - interval '1 week'
),
-- Current/pending match
('44444444-4444-4444-4444-444444444445',
 '22222222-2222-2222-2222-222222222222',
 '5v5',
 '1-2-1',
 3,
 15,
 2700,
 'friendly',
 'Hammarby F16',
 '33333333-3333-3333-3333-333333333334', -- Ebba as captain
 0,
 0,
 NULL,
 'pending',
 NULL
);

-- Insert sample match log events for the completed match
INSERT INTO public.match_log_event (
  match_id,
  player_id,
  event_type,
  data,
  occurred_at_seconds,
  period
) VALUES
('44444444-4444-4444-4444-444444444444', NULL, 'match_started', '{}', 0, 1),
('44444444-4444-4444-4444-444444444444', NULL, 'period_started', '{"period": 1}', 0, 1),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333335', 'goal_scored', '{"scorer": "Elise"}', 480, 1),
('44444444-4444-4444-4444-444444444444', NULL, 'period_ended', '{"period": 1}', 900, 1),
('44444444-4444-4444-4444-444444444444', NULL, 'period_started', '{"period": 2}', 900, 2),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333338', 'goal_scored', '{"scorer": "Ines"}', 720, 2),
('44444444-4444-4444-4444-444444444444', NULL, 'goal_conceded', '{"opponent_goal": true}', 840, 2),
('44444444-4444-4444-4444-444444444444', NULL, 'period_ended', '{"period": 2}', 1800, 2),
('44444444-4444-4444-4444-444444444444', NULL, 'period_started', '{"period": 3}', 1800, 3),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-33333333333c', 'goal_scored', '{"scorer": "Nicole"}', 1200, 3),
('44444444-4444-4444-4444-444444444444', NULL, 'period_ended', '{"period": 3}', 2700, 3),
('44444444-4444-4444-4444-444444444444', NULL, 'match_ended', '{"final_score": "3-1"}', 2700, 3);

-- Insert sample season stats for the current year
INSERT INTO public.season_stats (
  player_id,
  season_year,
  matches_played,
  goals_scored,
  captain_count,
  fair_play_awards,
  total_field_time_seconds,
  total_goalie_time_seconds,
  total_defender_time_seconds,
  total_attacker_time_seconds,
  starts_as_field_player,
  starts_as_goalie
) VALUES
('33333333-3333-3333-3333-333333333333', EXTRACT(YEAR FROM CURRENT_DATE), 5, 2, 2, 1, 8400, 900, 4200, 4200, 4, 1), -- Alma
('33333333-3333-3333-3333-333333333334', EXTRACT(YEAR FROM CURRENT_DATE), 5, 1, 1, 0, 7800, 1500, 3900, 3900, 4, 1), -- Ebba
('33333333-3333-3333-3333-333333333335', EXTRACT(YEAR FROM CURRENT_DATE), 5, 3, 0, 2, 8100, 1200, 4050, 4050, 4, 1), -- Elise
('33333333-3333-3333-3333-333333333336', EXTRACT(YEAR FROM CURRENT_DATE), 4, 1, 1, 0, 6900, 900, 3450, 3450, 3, 1), -- Filippa
('33333333-3333-3333-3333-333333333337', EXTRACT(YEAR FROM CURRENT_DATE), 5, 0, 0, 1, 7500, 1800, 3750, 3750, 4, 1), -- Fiona
('33333333-3333-3333-3333-333333333338', EXTRACT(YEAR FROM CURRENT_DATE), 5, 4, 1, 0, 8700, 600, 4350, 4350, 5, 0), -- Ines
('33333333-3333-3333-3333-333333333339', EXTRACT(YEAR FROM CURRENT_DATE), 4, 0, 0, 0, 6600, 1200, 3300, 3300, 3, 1), -- Isabelle
('33333333-3333-3333-3333-33333333333a', EXTRACT(YEAR FROM CURRENT_DATE), 5, 2, 0, 1, 7800, 1500, 3900, 3900, 4, 1), -- Julie
('33333333-3333-3333-3333-33333333333b', EXTRACT(YEAR FROM CURRENT_DATE), 5, 1, 0, 0, 8100, 1200, 4050, 4050, 4, 1), -- Leonie
('33333333-3333-3333-3333-33333333333c', EXTRACT(YEAR FROM CURRENT_DATE), 5, 5, 0, 0, 8400, 900, 4200, 4200, 5, 0), -- Nicole
('33333333-3333-3333-3333-33333333333d', EXTRACT(YEAR FROM CURRENT_DATE), 4, 1, 0, 1, 6900, 900, 3450, 3450, 3, 1), -- Rebecka
('33333333-3333-3333-3333-33333333333e', EXTRACT(YEAR FROM CURRENT_DATE), 5, 0, 1, 1, 7500, 1800, 3750, 3750, 4, 1), -- Sigrid
('33333333-3333-3333-3333-33333333333f', EXTRACT(YEAR FROM CURRENT_DATE), 5, 2, 0, 0, 8100, 1200, 4050, 4050, 4, 1), -- Sophie
('33333333-3333-3333-3333-333333333340', EXTRACT(YEAR FROM CURRENT_DATE), 4, 1, 0, 0, 6600, 1200, 3300, 3300, 3, 1); -- Tyra

-- Insert sample settings
INSERT INTO public.settings (team_id, key, enabled, is_global) VALUES
('22222222-2222-2222-2222-222222222222', 'auto_substitution_alerts', true, false),
('22222222-2222-2222-2222-222222222222', 'fair_play_tracking', true, false),
('22222222-2222-2222-2222-222222222222', 'detailed_time_tracking', true, false),
(NULL, 'enable_analytics', true, true),
(NULL, 'data_retention_months', true, true);

-- Note: User profile and team_user data would typically be created
-- through authentication flows, not seeded directly