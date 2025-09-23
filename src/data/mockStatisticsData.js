// Mock data for statistics section
// This data simulates what would come from the database tables

export const mockTeamStats = {
  totalMatches: 24,
  wins: 15,
  draws: 4,
  losses: 5,
  goalsScored: 87,
  goalsConceded: 34,
  averageGoalsScored: 3.6,
  averageGoalsConceded: 1.4
};

export const mockMatches = [
  {
    id: '1',
    date: '2024-09-15',
    opponent: 'Lions FC',
    goalsScored: 4,
    goalsConceded: 2,
    outcome: 'win',
    type: 'league',
    duration: 45 * 60, // 45 minutes in seconds
    periods: 3,
    format: '5v5'
  },
  {
    id: '2',
    date: '2024-09-08',
    opponent: 'Eagles United',
    goalsScored: 2,
    goalsConceded: 2,
    outcome: 'draw',
    type: 'friendly',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  },
  {
    id: '3',
    date: '2024-09-01',
    opponent: 'Sharks Academy',
    goalsScored: 1,
    goalsConceded: 3,
    outcome: 'loss',
    type: 'cup',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  },
  {
    id: '4',
    date: '2024-08-25',
    opponent: 'Thunder FC',
    goalsScored: 5,
    goalsConceded: 1,
    outcome: 'win',
    type: 'league',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  },
  {
    id: '5',
    date: '2024-08-18',
    opponent: 'Wolves FC',
    goalsScored: 3,
    goalsConceded: 0,
    outcome: 'win',
    type: 'friendly',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  },
  {
    id: '6',
    date: '2024-08-11',
    opponent: 'Panthers SC',
    goalsScored: 2,
    goalsConceded: 4,
    outcome: 'loss',
    type: 'league',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  },
  {
    id: '7',
    date: '2024-08-04',
    opponent: 'Falcons Academy',
    goalsScored: 6,
    goalsConceded: 2,
    outcome: 'win',
    type: 'tournament',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  },
  {
    id: '8',
    date: '2024-07-28',
    opponent: 'Bears United',
    goalsScored: 1,
    goalsConceded: 1,
    outcome: 'draw',
    type: 'friendly',
    duration: 45 * 60,
    periods: 3,
    format: '5v5'
  }
];

export const mockPlayers = [
  {
    id: '1',
    name: 'Alex Johnson',
    jerseyNumber: 7,
    matchesPlayed: 22,
    goalsScored: 18,
    totalPlayTime: 22 * 35 * 60, // 22 matches * 35 minutes average
    defenderTime: 8 * 60 * 60, // 8 hours as defender
    midfielderTime: 6 * 60 * 60, // 6 hours as midfielder
    attackerTime: 12 * 60 * 60, // 12 hours as attacker
    goalieTime: 2 * 60 * 60, // 2 hours as goalie
    startsAsSubstitute: 3,
    captainCount: 8,
    fairPlayAwards: 2
  },
  {
    id: '2',
    name: 'Emma Rodriguez',
    jerseyNumber: 10,
    matchesPlayed: 24,
    goalsScored: 12,
    totalPlayTime: 24 * 40 * 60,
    defenderTime: 4 * 60 * 60,
    midfielderTime: 14 * 60 * 60,
    attackerTime: 10 * 60 * 60,
    goalieTime: 0,
    startsAsSubstitute: 1,
    captainCount: 16,
    fairPlayAwards: 4
  },
  {
    id: '3',
    name: 'Liam Chen',
    jerseyNumber: 1,
    matchesPlayed: 20,
    goalsScored: 2,
    totalPlayTime: 20 * 30 * 60,
    defenderTime: 2 * 60 * 60,
    midfielderTime: 1 * 60 * 60,
    attackerTime: 3 * 60 * 60,
    goalieTime: 18 * 60 * 60, // Primary goalie
    startsAsSubstitute: 4,
    captainCount: 2,
    fairPlayAwards: 3
  },
  {
    id: '4',
    name: 'Sofia Martinez',
    jerseyNumber: 5,
    matchesPlayed: 19,
    goalsScored: 8,
    totalPlayTime: 19 * 32 * 60,
    defenderTime: 12 * 60 * 60,
    midfielderTime: 4 * 60 * 60,
    attackerTime: 8 * 60 * 60,
    goalieTime: 1 * 60 * 60,
    startsAsSubstitute: 6,
    captainCount: 0,
    fairPlayAwards: 1
  },
  {
    id: '5',
    name: 'Noah Williams',
    jerseyNumber: 9,
    matchesPlayed: 21,
    goalsScored: 15,
    totalPlayTime: 21 * 38 * 60,
    defenderTime: 3 * 60 * 60,
    midfielderTime: 8 * 60 * 60,
    attackerTime: 16 * 60 * 60,
    goalieTime: 0,
    startsAsSubstitute: 2,
    captainCount: 5,
    fairPlayAwards: 2
  },
  {
    id: '6',
    name: 'Ava Thompson',
    jerseyNumber: 3,
    matchesPlayed: 18,
    goalsScored: 4,
    totalPlayTime: 18 * 25 * 60,
    defenderTime: 14 * 60 * 60,
    midfielderTime: 6 * 60 * 60,
    attackerTime: 2 * 60 * 60,
    goalieTime: 3 * 60 * 60,
    startsAsSubstitute: 8,
    captainCount: 1,
    fairPlayAwards: 3
  },
  {
    id: '7',
    name: 'Ethan Davis',
    jerseyNumber: 11,
    matchesPlayed: 16,
    goalsScored: 7,
    totalPlayTime: 16 * 28 * 60,
    defenderTime: 6 * 60 * 60,
    midfielderTime: 10 * 60 * 60,
    attackerTime: 8 * 60 * 60,
    goalieTime: 0,
    startsAsSubstitute: 5,
    captainCount: 3,
    fairPlayAwards: 1
  }
];

// Mock match details with individual player stats
export const mockMatchDetails = {
  '1': {
    match: mockMatches[0],
    playerStats: [
      {
        playerId: '1',
        name: 'Alex Johnson',
        goalsScored: 2,
        totalPlayTime: 35 * 60, // 35 minutes
        defenderTime: 0,
        midfielderTime: 15 * 60,
        attackerTime: 20 * 60,
        goalieTime: 0,
        startedAs: 'attacker',
        wasCaptain: true,
        gotFairPlayAward: false
      },
      {
        playerId: '2',
        name: 'Emma Rodriguez',
        goalsScored: 1,
        totalPlayTime: 40 * 60,
        defenderTime: 0,
        midfielderTime: 25 * 60,
        attackerTime: 15 * 60,
        goalieTime: 0,
        startedAs: 'midfielder',
        wasCaptain: false,
        gotFairPlayAward: true
      },
      {
        playerId: '3',
        name: 'Liam Chen',
        goalsScored: 0,
        totalPlayTime: 45 * 60,
        defenderTime: 0,
        midfielderTime: 0,
        attackerTime: 0,
        goalieTime: 45 * 60,
        startedAs: 'goalie',
        wasCaptain: false,
        gotFairPlayAward: false
      },
      {
        playerId: '4',
        name: 'Sofia Martinez',
        goalsScored: 1,
        totalPlayTime: 30 * 60,
        defenderTime: 20 * 60,
        midfielderTime: 10 * 60,
        attackerTime: 0,
        goalieTime: 0,
        startedAs: 'defender',
        wasCaptain: false,
        gotFairPlayAward: false
      },
      {
        playerId: '5',
        name: 'Noah Williams',
        goalsScored: 0,
        totalPlayTime: 25 * 60,
        defenderTime: 0,
        midfielderTime: 5 * 60,
        attackerTime: 20 * 60,
        goalieTime: 0,
        startedAs: 'substitute',
        wasCaptain: false,
        gotFairPlayAward: false
      },
      {
        playerId: '6',
        name: 'Ava Thompson',
        goalsScored: 0,
        totalPlayTime: 20 * 60,
        defenderTime: 15 * 60,
        midfielderTime: 5 * 60,
        attackerTime: 0,
        goalieTime: 0,
        startedAs: 'substitute',
        wasCaptain: false,
        gotFairPlayAward: false
      }
    ]
  },
  '2': {
    match: mockMatches[1],
    playerStats: [
      {
        playerId: '1',
        name: 'Alex Johnson',
        goalsScored: 1,
        totalPlayTime: 40 * 60,
        defenderTime: 10 * 60,
        midfielderTime: 15 * 60,
        attackerTime: 15 * 60,
        goalieTime: 0,
        startedAs: 'attacker',
        wasCaptain: false,
        gotFairPlayAward: false
      },
      {
        playerId: '2',
        name: 'Emma Rodriguez',
        goalsScored: 1,
        totalPlayTime: 45 * 60,
        defenderTime: 0,
        midfielderTime: 30 * 60,
        attackerTime: 15 * 60,
        goalieTime: 0,
        startedAs: 'midfielder',
        wasCaptain: true,
        gotFairPlayAward: false
      },
      {
        playerId: '3',
        name: 'Liam Chen',
        goalsScored: 0,
        totalPlayTime: 45 * 60,
        defenderTime: 0,
        midfielderTime: 0,
        attackerTime: 0,
        goalieTime: 45 * 60,
        startedAs: 'goalie',
        wasCaptain: false,
        gotFairPlayAward: true
      }
    ]
  }
};

// Helper function to format time in minutes:seconds
export const formatPlayTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper function to calculate percentage
export const calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Helper function to get outcome color
export const getOutcomeColor = (outcome) => {
  switch (outcome) {
    case 'win': return 'text-emerald-400';
    case 'loss': return 'text-red-400';
    case 'draw': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
};

// Helper function to get match type badge color
export const getMatchTypeBadgeColor = (type) => {
  switch (type) {
    case 'league': return 'bg-blue-600 text-blue-100';
    case 'cup': return 'bg-purple-600 text-purple-100';
    case 'tournament': return 'bg-orange-600 text-orange-100';
    case 'friendly': return 'bg-green-600 text-green-100';
    case 'internal': return 'bg-gray-600 text-gray-100';
    default: return 'bg-slate-600 text-slate-100';
  }
};