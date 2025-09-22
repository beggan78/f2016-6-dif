// Mock data for statistics section
import { formatPlayerName } from '../utils/formatUtils';

// Mock players
export const mockPlayers = [
  { id: 'player-1', name: 'Alex', surname: 'Johnson', jersey_number: 10 },
  { id: 'player-2', name: 'Sam', surname: 'Smith', jersey_number: 7 },
  { id: 'player-3', name: 'Jordan', surname: 'Brown', jersey_number: 3 },
  { id: 'player-4', name: 'Casey', surname: 'Davis', jersey_number: 1 },
  { id: 'player-5', name: 'Taylor', surname: 'Wilson', jersey_number: 5 },
  { id: 'player-6', name: 'Morgan', surname: 'Garcia', jersey_number: 8 },
  { id: 'player-7', name: 'Avery', surname: 'Martinez', jersey_number: 2 },
  { id: 'player-8', name: 'Riley', surname: 'Anderson', jersey_number: 9 },
  { id: 'player-9', name: 'Charlie', surname: 'Taylor', jersey_number: 4 },
  { id: 'player-10', name: 'Jamie', surname: 'Thomas', jersey_number: 6 }
];

// Mock matches with detailed statistics
export const mockMatches = [
  {
    id: 'match-1',
    date: '2024-01-15',
    opponent: 'Eagles FC',
    own_score: 3,
    opponent_score: 2,
    outcome: 'win',
    type: 'league',
    format: '5v5',
    formation: '2-2',
    periods: 3,
    period_duration_minutes: 15,
    match_duration_seconds: 2700,
    captain: 'player-1',
    fair_play_award: 'player-3',
    player_stats: {
      'player-1': {
        goals_scored: 2,
        goalie_time_seconds: 0,
        defender_time_seconds: 900,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 1350,
        substitute_time_seconds: 450,
        total_field_time_seconds: 2250,
        started_as: 'attacker',
        was_captain: true,
        got_fair_play_award: false
      },
      'player-2': {
        goals_scored: 1,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 2250,
        substitute_time_seconds: 450,
        total_field_time_seconds: 2250,
        started_as: 'attacker',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-3': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 2700,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: true
      },
      'player-4': {
        goals_scored: 0,
        goalie_time_seconds: 2700,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'goalie',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-5': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 1800,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 900,
        total_field_time_seconds: 1800,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-6': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 450,
        substitute_time_seconds: 2250,
        total_field_time_seconds: 450,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-7': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 900,
        substitute_time_seconds: 1800,
        total_field_time_seconds: 900,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      }
    }
  },
  {
    id: 'match-2',
    date: '2024-01-22',
    opponent: 'Lions United',
    own_score: 1,
    opponent_score: 1,
    outcome: 'draw',
    type: 'friendly',
    format: '5v5',
    formation: '2-2',
    periods: 3,
    period_duration_minutes: 15,
    match_duration_seconds: 2700,
    captain: 'player-2',
    fair_play_award: 'player-5',
    player_stats: {
      'player-1': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 1800,
        substitute_time_seconds: 900,
        total_field_time_seconds: 1800,
        started_as: 'attacker',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-2': {
        goals_scored: 1,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 2700,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'attacker',
        was_captain: true,
        got_fair_play_award: false
      },
      'player-3': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 1350,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 1350,
        total_field_time_seconds: 1350,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-4': {
        goals_scored: 0,
        goalie_time_seconds: 2700,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'goalie',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-5': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 2700,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: true
      },
      'player-6': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 900,
        substitute_time_seconds: 1800,
        total_field_time_seconds: 900,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-8': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 1350,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 1350,
        total_field_time_seconds: 1350,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      }
    }
  },
  {
    id: 'match-3',
    date: '2024-01-29',
    opponent: 'Sharks Academy',
    own_score: 0,
    opponent_score: 2,
    outcome: 'loss',
    type: 'league',
    format: '5v5',
    formation: '1-2-1',
    periods: 3,
    period_duration_minutes: 15,
    match_duration_seconds: 2700,
    captain: 'player-3',
    fair_play_award: 'player-1',
    player_stats: {
      'player-1': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 1350,
        attacker_time_seconds: 1350,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'midfielder',
        was_captain: false,
        got_fair_play_award: true
      },
      'player-2': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 2700,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'midfielder',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-3': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 2700,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: true,
        got_fair_play_award: false
      },
      'player-4': {
        goals_scored: 0,
        goalie_time_seconds: 1350,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 1350,
        total_field_time_seconds: 1350,
        started_as: 'goalie',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-5': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 2700,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'attacker',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-7': {
        goals_scored: 0,
        goalie_time_seconds: 1350,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 1350,
        total_field_time_seconds: 1350,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-9': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 2700,
        total_field_time_seconds: 0,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      }
    }
  },
  {
    id: 'match-4',
    date: '2024-02-05',
    opponent: 'Tigers FC',
    own_score: 4,
    opponent_score: 1,
    outcome: 'win',
    type: 'cup',
    format: '5v5',
    formation: '2-2',
    periods: 3,
    period_duration_minutes: 15,
    match_duration_seconds: 2700,
    captain: 'player-1',
    fair_play_award: 'player-2',
    player_stats: {
      'player-1': {
        goals_scored: 3,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 2700,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'attacker',
        was_captain: true,
        got_fair_play_award: false
      },
      'player-2': {
        goals_scored: 1,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 2700,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'attacker',
        was_captain: false,
        got_fair_play_award: true
      },
      'player-3': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 2700,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-4': {
        goals_scored: 0,
        goalie_time_seconds: 2700,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'goalie',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-5': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 2700,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-6': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 2700,
        total_field_time_seconds: 0,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      }
    }
  },
  {
    id: 'match-5',
    date: '2024-02-12',
    opponent: 'Bears FC',
    own_score: 2,
    opponent_score: 3,
    outcome: 'loss',
    type: 'friendly',
    format: '5v5',
    formation: '2-2',
    periods: 3,
    period_duration_minutes: 15,
    match_duration_seconds: 2700,
    captain: 'player-5',
    fair_play_award: 'player-4',
    player_stats: {
      'player-1': {
        goals_scored: 1,
        goalie_time_seconds: 0,
        defender_time_seconds: 1350,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 1350,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-2': {
        goals_scored: 1,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 1800,
        substitute_time_seconds: 900,
        total_field_time_seconds: 1800,
        started_as: 'attacker',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-4': {
        goals_scored: 0,
        goalie_time_seconds: 2700,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'goalie',
        was_captain: false,
        got_fair_play_award: true
      },
      'player-5': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 2700,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 0,
        total_field_time_seconds: 2700,
        started_as: 'defender',
        was_captain: true,
        got_fair_play_award: false
      },
      'player-6': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 900,
        substitute_time_seconds: 1800,
        total_field_time_seconds: 900,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      },
      'player-8': {
        goals_scored: 0,
        goalie_time_seconds: 0,
        defender_time_seconds: 0,
        midfielder_time_seconds: 0,
        attacker_time_seconds: 0,
        substitute_time_seconds: 2700,
        total_field_time_seconds: 0,
        started_as: 'substitute',
        was_captain: false,
        got_fair_play_award: false
      }
    }
  }
];

// Calculate aggregated player statistics
export const calculatePlayerStats = (playerId) => {
  const player = mockPlayers.find(p => p.id === playerId);
  if (!player) return null;

  let totalMatches = 0;
  let totalGoals = 0;
  let totalFieldTime = 0;
  let totalGoalieTime = 0;
  let totalDefenderTime = 0;
  let totalMidfielderTime = 0;
  let totalAttackerTime = 0;
  let startsAsSubstitute = 0;
  let captainCount = 0;
  let fairPlayAwards = 0;

  mockMatches.forEach(match => {
    const stats = match.player_stats[playerId];
    if (stats) {
      totalMatches++;
      totalGoals += stats.goals_scored;
      totalFieldTime += stats.total_field_time_seconds;
      totalGoalieTime += stats.goalie_time_seconds;
      totalDefenderTime += stats.defender_time_seconds;
      totalMidfielderTime += stats.midfielder_time_seconds;
      totalAttackerTime += stats.attacker_time_seconds;
      
      if (stats.started_as === 'substitute') startsAsSubstitute++;
      if (stats.was_captain) captainCount++;
      if (stats.got_fair_play_award) fairPlayAwards++;
    }
  });

  const totalOnFieldTime = totalFieldTime + totalGoalieTime;
  const avgTimePerMatch = totalMatches > 0 ? totalOnFieldTime / totalMatches : 0;

  return {
    ...player,
    matchesPlayed: totalMatches,
    goalsScored: totalGoals,
    averageTimePerMatch: avgTimePerMatch,
    percentageDefender: totalOnFieldTime > 0 ? (totalDefenderTime / totalOnFieldTime) * 100 : 0,
    percentageMidfielder: totalOnFieldTime > 0 ? (totalMidfielderTime / totalOnFieldTime) * 100 : 0,
    percentageAttacker: totalOnFieldTime > 0 ? (totalAttackerTime / totalOnFieldTime) * 100 : 0,
    percentageGoalkeeper: totalOnFieldTime > 0 ? (totalGoalieTime / totalOnFieldTime) * 100 : 0,
    percentageStartsAsSubstitute: totalMatches > 0 ? (startsAsSubstitute / totalMatches) * 100 : 0,
    captainCount,
    fairPlayAwards
  };
};

// Get all player statistics
export const getAllPlayerStats = () => {
  return mockPlayers.map(player => calculatePlayerStats(player.id)).filter(Boolean);
};

// Calculate team statistics
export const calculateTeamStats = () => {
  let totalMatches = mockMatches.length;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  mockMatches.forEach(match => {
    totalGoalsScored += match.own_score;
    totalGoalsConceded += match.opponent_score;
    
    if (match.outcome === 'win') wins++;
    else if (match.outcome === 'draw') draws++;
    else if (match.outcome === 'loss') losses++;
  });

  return {
    totalMatches,
    totalGoalsScored,
    totalGoalsConceded,
    averageGoalsScored: totalMatches > 0 ? totalGoalsScored / totalMatches : 0,
    averageGoalsConceded: totalMatches > 0 ? totalGoalsConceded / totalMatches : 0,
    wins,
    draws,
    losses,
    winPercentage: totalMatches > 0 ? (wins / totalMatches) * 100 : 0
  };
};

// Get player name function
export const getPlayerName = (playerId) => {
  const player = mockPlayers.find(p => p.id === playerId);
  return player ? formatPlayerName(player) : 'Unknown Player';
};

// Get match with detailed player stats
export const getMatchDetails = (matchId) => {
  const match = mockMatches.find(m => m.id === matchId);
  if (!match) return null;

  return {
    ...match,
    playerStatsWithNames: Object.entries(match.player_stats).map(([playerId, stats]) => ({
      playerId,
      playerName: getPlayerName(playerId),
      ...stats
    }))
  };
};