/**
 * Test Fixtures - Match Data
 * Sample match configuration and metadata
 */

export const sampleMatchId = '550e8400-e29b-41d4-a716-446655440000';
export const sampleTeamId = '660e8400-e29b-41d4-a716-446655440001';
export const sampleUserId = '770e8400-e29b-41d4-a716-446655440002';

export const sampleMatchConfiguration = {
  matchId: sampleMatchId,
  teamId: sampleTeamId,
  ownTeamName: 'Lightning FC',
  opponentTeamName: 'Thunder United',
  matchType: 'league',
  venueType: 'home',
  periodDurationMinutes: 25,
  totalPeriods: 2,
  format: '5v5',
  formation: '2-2',
  squadSize: 7
};

export const sampleMatchMetadata = {
  plannedPeriods: 2,
  periodDurationMinutes: 25,
  totalPeriods: 2,
  ownScore: 3,
  opponentScore: 2
};

export const sampleStartingLineup = [
  'player-goalie-1',
  'player-defender-1',
  'player-defender-2',
  'player-attacker-1',
  'player-attacker-2'
];

export const sampleMatchRecord = {
  id: sampleMatchId,
  team_id: sampleTeamId,
  match_date: '2025-12-14',
  match_time: '10:00:00',
  opponent: 'Thunder United',
  match_type: 'league',
  venue_type: 'home',
  status: 'completed',
  own_score: 3,
  opponent_score: 2,
  created_at: new Date('2025-12-14T08:00:00Z').toISOString(),
  updated_at: new Date('2025-12-14T11:00:00Z').toISOString()
};

export const samplePendingMatch = {
  id: sampleMatchId,
  team_id: sampleTeamId,
  status: 'pending',
  match_date: '2025-12-14',
  opponent: 'Thunder United',
  created_at: new Date('2025-12-14T08:00:00Z').toISOString()
};

export const sampleRunningMatch = {
  id: sampleMatchId,
  team_id: sampleTeamId,
  status: 'running',
  match_date: '2025-12-14',
  opponent: 'Thunder United',
  created_at: new Date('2025-12-14T08:00:00Z').toISOString(),
  started_at: new Date('2025-12-14T10:00:00Z').toISOString()
};
