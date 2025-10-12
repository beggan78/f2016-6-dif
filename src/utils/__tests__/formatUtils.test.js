import {
  formatTime,
  formatTimeDifference,
  formatMinutesAsTime,
  getPlayerLabel,
  formatPoints,
  generateStatsText
} from '../formatUtils';
import { calculateRolePoints } from '../rolePointUtils';
import { PLAYER_ROLES } from '../../constants/playerConstants';

jest.mock('../rolePointUtils');

describe('formatTime', () => {
  it('should format time correctly for zero seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('should format time correctly for seconds under a minute', () => {
    expect(formatTime(30)).toBe('00:30');
    expect(formatTime(59)).toBe('00:59');
  });

  it('should format time correctly for exact minutes', () => {
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(120)).toBe('02:00');
    expect(formatTime(600)).toBe('10:00');
  });

  it('should format time correctly for minutes and seconds', () => {
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(325)).toBe('05:25');
    expect(formatTime(3661)).toBe('61:01'); // Over 60 minutes
  });

  it('should handle large time values', () => {
    expect(formatTime(3600)).toBe('60:00'); // 1 hour
    expect(formatTime(7200)).toBe('120:00'); // 2 hours
  });

  it('should handle edge cases', () => {
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(61)).toBe('01:01');
  });
});

describe('formatMinutesAsTime', () => {
  it('formats zero minutes as 00:00', () => {
    expect(formatMinutesAsTime(0)).toBe('00:00');
  });

  it('formats fractional minutes to include seconds', () => {
    expect(formatMinutesAsTime(7.5)).toBe('07:30');
    expect(formatMinutesAsTime(12.25)).toBe('12:15');
  });

  it('formats durations equal to or over an hour with hours included', () => {
    expect(formatMinutesAsTime(60)).toBe('01:00:00');
    expect(formatMinutesAsTime(75)).toBe('01:15:00');
    expect(formatMinutesAsTime(90.5)).toBe('01:30:30');
  });

  it('gracefully handles invalid values', () => {
    expect(formatMinutesAsTime(undefined)).toBe('00:00');
    expect(formatMinutesAsTime(null)).toBe('00:00');
    expect(formatMinutesAsTime(-5)).toBe('00:00');
  });
});

describe('formatTimeDifference', () => {
  it('should format positive time differences', () => {
    expect(formatTimeDifference(30)).toBe('+00:30');
    expect(formatTimeDifference(90)).toBe('+01:30');
    expect(formatTimeDifference(300)).toBe('+05:00');
  });

  it('should format negative time differences', () => {
    expect(formatTimeDifference(-30)).toBe('-00:30');
    expect(formatTimeDifference(-90)).toBe('-01:30');
    expect(formatTimeDifference(-300)).toBe('-05:00');
  });

  it('should format zero difference', () => {
    expect(formatTimeDifference(0)).toBe('+00:00');
  });

  it('should handle large positive and negative differences', () => {
    expect(formatTimeDifference(3600)).toBe('+60:00');
    expect(formatTimeDifference(-3600)).toBe('-60:00');
  });
});

describe('getPlayerLabel', () => {
  const mockPlayer = {
    name: 'John Doe',
    stats: {
      timeOnFieldSeconds: 450, // 7:30
      timeAsAttackerSeconds: 300, // 5:00
      timeAsDefenderSeconds: 150  // 2:30, difference: +2:30
    }
  };

  it('should return only player name for period 1', () => {
    const result = getPlayerLabel(mockPlayer, 1);
    expect(result).toBe('John Doe');
  });

  it('should include time stats for period 2', () => {
    const result = getPlayerLabel(mockPlayer, 2);
    expect(result).toBe('John Doe  ⏱️ 07:30  ⚔️ +02:30');
  });

  it('should include time stats for period 3', () => {
    const result = getPlayerLabel(mockPlayer, 3);
    expect(result).toBe('John Doe  ⏱️ 07:30  ⚔️ +02:30');
  });

  it('should handle negative time difference', () => {
    const playerWithNegativeDiff = {
      name: 'Jane Smith',
      stats: {
        timeOnFieldSeconds: 600, // 10:00
        timeAsAttackerSeconds: 120, // 2:00
        timeAsDefenderSeconds: 480  // 8:00, difference: -6:00
      }
    };

    const result = getPlayerLabel(playerWithNegativeDiff, 2);
    expect(result).toBe('Jane Smith  ⏱️ 10:00  ⚔️ -06:00');
  });

  it('should handle zero time difference', () => {
    const playerWithZeroDiff = {
      name: 'Equal Player',
      stats: {
        timeOnFieldSeconds: 300,
        timeAsAttackerSeconds: 150,
        timeAsDefenderSeconds: 150
      }
    };

    const result = getPlayerLabel(playerWithZeroDiff, 2);
    expect(result).toBe('Equal Player  ⏱️ 05:00  ⚔️ +00:00');
  });

  it('should handle zero field time', () => {
    const playerWithZeroTime = {
      name: 'Bench Player',
      stats: {
        timeOnFieldSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0
      }
    };

    const result = getPlayerLabel(playerWithZeroTime, 3);
    expect(result).toBe('Bench Player  ⏱️ 00:00  ⚔️ +00:00');
  });
});

describe('formatPoints', () => {
  it('should format whole numbers without decimals', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(1)).toBe('1');
    expect(formatPoints(10)).toBe('10');
    expect(formatPoints(100)).toBe('100');
  });

  it('should format decimal numbers with one decimal place', () => {
    expect(formatPoints(0.5)).toBe('0.5');
    expect(formatPoints(1.3)).toBe('1.3');
    expect(formatPoints(10.7)).toBe('10.7');
    expect(formatPoints(99.9)).toBe('99.9');
  });

  it('should round to one decimal place', () => {
    expect(formatPoints(1.23)).toBe('1.2');
    expect(formatPoints(1.27)).toBe('1.3');
    expect(formatPoints(1.999)).toBe('2.0');
  });

  it('should handle negative numbers', () => {
    expect(formatPoints(-1)).toBe('-1');
    expect(formatPoints(-1.5)).toBe('-1.5');
    expect(formatPoints(-10.7)).toBe('-10.7');
  });

  it('should handle zero', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(0.0)).toBe('0');
  });
});

describe('generateStatsText', () => {
  const mockSquadPlayers = [
    {
      name: 'Player One',
      stats: {
        startedMatchAs: PLAYER_ROLES.GOALIE,
        timeOnFieldSeconds: 300,
        timeAsDefenderSeconds: 150,
        timeAsAttackerSeconds: 150,
        timeAsGoalieSeconds: 900
      }
    },
    {
      name: 'Player Two',
      stats: {
        startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
        timeOnFieldSeconds: 600,
        timeAsDefenderSeconds: 400,
        timeAsAttackerSeconds: 200,
        timeAsGoalieSeconds: 0
      }
    },
    {
      name: 'Player Three',
      stats: {
        startedMatchAs: PLAYER_ROLES.SUBSTITUTE,
        timeOnFieldSeconds: 450,
        timeAsDefenderSeconds: 225,
        timeAsAttackerSeconds: 225,
        timeAsGoalieSeconds: 0
      }
    }
  ];

  beforeEach(() => {
    calculateRolePoints.mockImplementation((player) => ({
      goaliePoints: player.stats.timeAsGoalieSeconds > 0 ? 2.5 : 0,
      defenderPoints: player.stats.timeAsDefenderSeconds / 100,
      attackerPoints: player.stats.timeAsAttackerSeconds / 100
    }));
  });

  it('should generate complete stats text with all players', () => {
    const result = generateStatsText(mockSquadPlayers, 3, 1, 'Hammarby');
    
    expect(result).toContain('Final Score: Djurgården 3 - 1 Hammarby');
    expect(result).toContain('Spelare\t\tStart\tM\tB\tMit\tA\tUte\tBack\tMid\tFw\tMv');
    expect(result).toContain('Player One\t\tM\t2.5\t1.5\t0\t1.5\t05:00\t02:30\t00:00\t02:30\t15:00');
    expect(result).toContain('Player Two\t\tS\t0\t4\t0\t2\t10:00\t06:40\t00:00\t03:20\t00:00');
    expect(result).toContain('Player Three\t\tA\t0\t2.3\t0\t2.3\t07:30\t03:45\t00:00\t03:45\t00:00');
  });

  it('should handle missing opponent team name', () => {
    const result = generateStatsText(mockSquadPlayers, 2, 0);
    
    expect(result).toContain('Final Score: Djurgården 2 - 0 Opponent');
  });

  it('should handle empty opponent team name', () => {
    const result = generateStatsText(mockSquadPlayers, 1, 2, '');
    
    expect(result).toContain('Final Score: Djurgården 1 - 2 Opponent');
  });

  it('should handle zero scores', () => {
    const result = generateStatsText(mockSquadPlayers, 0, 0, 'AIK');
    
    expect(result).toContain('Final Score: Djurgården 0 - 0 AIK');
  });

  it('should handle high scores', () => {
    const result = generateStatsText(mockSquadPlayers, 15, 12, 'IFK Göteborg');
    
    expect(result).toContain('Final Score: Djurgården 15 - 12 IFK Göteborg');
  });

  it('should handle players with unknown start position', () => {
    const playersWithUnknownStart = [
      {
        name: 'Unknown Player',
        stats: {
          startedMatchAs: null, // Unknown start position
          timeOnFieldSeconds: 300,
          timeAsDefenderSeconds: 150,
          timeAsAttackerSeconds: 150,
          timeAsGoalieSeconds: 0
        }
      }
    ];

    calculateRolePoints.mockReturnValue({
      goaliePoints: 0,
      defenderPoints: 1.5,
      attackerPoints: 1.5
    });

    const result = generateStatsText(playersWithUnknownStart, 1, 0, 'Test Team');
    
    expect(result).toContain('Unknown Player\t\t-\t0\t1.5\t0\t1.5\t05:00\t02:30\t00:00\t02:30\t00:00');
  });

  it('should handle empty squad', () => {
    const result = generateStatsText([], 0, 0, 'Empty Team');
    
    expect(result).toContain('Final Score: Djurgården 0 - 0 Empty Team');
    expect(result).toContain('Spelare\t\tStart\tM\tB\tMit\tA\tUte\tBack\tMid\tFw\tMv');
    expect(result).toContain('------\t\t-------\t-\t-\t---\t-\t----------\t----\t---\t--\t--');
    // Should not contain any player data
    expect(result.split('\n')).toHaveLength(5); // Score + empty + header + separator + empty line
  });

  it('should format decimal points correctly in stats', () => {
    calculateRolePoints.mockImplementation(() => ({
      goaliePoints: 1.25,
      defenderPoints: 2.75,
      attackerPoints: 0.5
    }));

    const result = generateStatsText([mockSquadPlayers[0]], 1, 1, 'Test');
    
    expect(result).toContain('Player One\t\tM\t1.3\t2.8\t0\t0.5\t'); // Rounded to 1 decimal
  });

  it('should handle very long player names', () => {
    const playerWithLongName = {
      name: 'Very Long Player Name That Might Cause Issues',
      stats: {
        startedMatchAs: PLAYER_ROLES.FIELD_PLAYER,
        timeOnFieldSeconds: 300,
        timeAsDefenderSeconds: 150,
        timeAsAttackerSeconds: 150,
        timeAsGoalieSeconds: 0
      }
    };

    calculateRolePoints.mockReturnValue({
      goaliePoints: 0,
      defenderPoints: 1.5,
      attackerPoints: 1.5
    });

    const result = generateStatsText([playerWithLongName], 1, 0, 'Test');
    
    expect(result).toContain('Very Long Player Name That Might Cause Issues\t\tS\t0\t1.5\t0\t1.5\t');
  });
});

describe('formatUtils integration', () => {
  it('should work together to create consistent time formatting', () => {
    const timeInSeconds = 3665; // 1 hour, 1 minute, 5 seconds
    const formattedTime = formatTime(timeInSeconds);
    const timeDiff = formatTimeDifference(timeInSeconds);
    
    expect(formattedTime).toBe('61:05');
    expect(timeDiff).toBe('+61:05');
  });

  it('should handle edge cases consistently', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTimeDifference(0)).toBe('+00:00');
    expect(formatPoints(0)).toBe('0');
  });

  it('should maintain formatting consistency in player labels', () => {
    const player = {
      name: 'Test Player',
      stats: {
        timeOnFieldSeconds: 0,
        timeAsAttackerSeconds: 0,
        timeAsDefenderSeconds: 0
      }
    };

    const label = getPlayerLabel(player, 2);
    expect(label).toBe('Test Player  ⏱️ 00:00  ⚔️ +00:00');
  });
});
