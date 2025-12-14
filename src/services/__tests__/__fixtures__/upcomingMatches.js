/**
 * Test Fixtures - Upcoming Matches
 * Sample upcoming match records from provider connectors
 */

export const sampleConnectorId = '880e8400-e29b-41d4-a716-446655440003';
export const sampleTeamId = '660e8400-e29b-41d4-a716-446655440001';

// Helper to get date strings relative to today
export const getToday = () => new Date().toISOString().split('T')[0];
export const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};
export const getNextWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};
export const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

export const upcomingMatchAgainstPalawan = {
  id: '990e8400-e29b-41d4-a716-446655440004',
  connector_id: sampleConnectorId,
  external_id: 'ext-match-123',
  opponent: 'Palawan',
  match_date: getTomorrow(),
  match_time: '14:00:00',
  location: 'City Stadium',
  division: 'U12 Premier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  connector: {
    team_id: sampleTeamId
  }
};

export const upcomingMatchAgainstThunder = {
  id: 'aa0e8400-e29b-41d4-a716-446655440005',
  connector_id: sampleConnectorId,
  external_id: 'ext-match-124',
  opponent: 'Thunder United',
  match_date: getNextWeek(),
  match_time: '10:00:00',
  location: 'West Field',
  division: 'U12 Premier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  connector: {
    team_id: sampleTeamId
  }
};

export const upcomingMatchAgainstLightning = {
  id: 'bb0e8400-e29b-41d4-a716-446655440006',
  connector_id: sampleConnectorId,
  external_id: 'ext-match-125',
  opponent: 'Lightning FC',
  match_date: getToday(),
  match_time: '16:00:00',
  location: 'North Park',
  division: 'U12 Premier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  connector: {
    team_id: sampleTeamId
  }
};

export const pastMatch = {
  id: 'cc0e8400-e29b-41d4-a716-446655440007',
  connector_id: sampleConnectorId,
  external_id: 'ext-match-122',
  opponent: 'Storm FC',
  match_date: getYesterday(),
  match_time: '10:00:00',
  location: 'South Stadium',
  division: 'U12 Premier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  connector: {
    team_id: sampleTeamId
  }
};

// Match with whitespace in opponent name (for testing normalization)
export const upcomingMatchWithWhitespace = {
  id: 'dd0e8400-e29b-41d4-a716-446655440008',
  connector_id: sampleConnectorId,
  external_id: 'ext-match-126',
  opponent: '  Palawan  ',
  match_date: getTomorrow(),
  match_time: '18:00:00',
  location: 'East Field',
  division: 'U12 Premier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  connector: {
    team_id: sampleTeamId
  }
};

// Match with mixed case opponent name (for testing case-insensitive matching)
export const upcomingMatchMixedCase = {
  id: 'ee0e8400-e29b-41d4-a716-446655440009',
  connector_id: sampleConnectorId,
  external_id: 'ext-match-127',
  opponent: 'PALAWAN',
  match_date: getNextWeek(),
  match_time: '12:00:00',
  location: 'Central Field',
  division: 'U12 Premier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  connector: {
    team_id: sampleTeamId
  }
};

export const allUpcomingMatches = [
  upcomingMatchAgainstPalawan,
  upcomingMatchAgainstThunder,
  upcomingMatchAgainstLightning,
  upcomingMatchWithWhitespace,
  upcomingMatchMixedCase
];

export const allMatchesIncludingPast = [
  pastMatch,
  ...allUpcomingMatches
];
