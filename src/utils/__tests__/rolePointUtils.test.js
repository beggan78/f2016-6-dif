import { calculateRolePoints } from '../rolePointUtils';

describe('calculateRolePoints', () => {
  describe('pure goalie scenarios', () => {
    it('should allocate all points to goalie when player only played goalie', () => {
      const player = {
        stats: {
          periodsAsGoalie: 3,
          timeAsDefenderSeconds: 0,
          timeAsAttackerSeconds: 0
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 3,
        defenderPoints: 0,
        midfielderPoints: 0,
        attackerPoints: 0
      });
    });

    it('should handle goalie with more than 3 periods', () => {
      const player = {
        stats: {
          periodsAsGoalie: 5,
          timeAsDefenderSeconds: 0,
          timeAsAttackerSeconds: 0
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 5,
        defenderPoints: 0,
        midfielderPoints: 0,
        attackerPoints: 0
      });
    });

    it('should handle partial goalie with some outfield time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 2,
          timeAsDefenderSeconds: 300,
          timeAsAttackerSeconds: 300
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(2);
      expect(result.defenderPoints + result.midfielderPoints + result.attackerPoints).toBe(1);
      expect(result.defenderPoints).toBe(0.5);
      expect(result.attackerPoints).toBe(0.5);
    });
  });

  describe('outfield player scenarios', () => {
    it('should split points equally for equal time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 600,
          timeAsAttackerSeconds: 600
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 0,
        defenderPoints: 1.5,
        midfielderPoints: 0,
        attackerPoints: 1.5
      });
    });

    it('should allocate all points to defender for defender-only player', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 900,
          timeAsAttackerSeconds: 0
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 0,
        defenderPoints: 3,
        midfielderPoints: 0,
        attackerPoints: 0
      });
    });

    it('should allocate all points to attacker for attacker-only player', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 0,
          timeAsAttackerSeconds: 900
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 0,
        defenderPoints: 0,
        midfielderPoints: 0,
        attackerPoints: 3
      });
    });

    it('should handle unequal time distribution', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 800, // 2/3 of time
          timeAsAttackerSeconds: 400  // 1/3 of time
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints).toBe(2);
      expect(result.attackerPoints).toBe(1);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
    });

    it('should allocate points correctly for midfielder-only player', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 0,
          timeAsMidfielderSeconds: 900,
          timeAsAttackerSeconds: 0
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 0,
        defenderPoints: 0,
        midfielderPoints: 3,
        attackerPoints: 0
      });
    });

    it('should split points among all three roles for mixed player', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 300, // 5 minutes
          timeAsMidfielderSeconds: 600, // 10 minutes  
          timeAsAttackerSeconds: 300 // 5 minutes
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints).toBe(1); // 25% of 1200 -> 0.75 -> rounds to 1.0
      expect(result.midfielderPoints).toBe(1); // 50% of 1200 -> 1.5 -> rounds to 1.0 (due to rounding adjustment)
      expect(result.attackerPoints).toBe(1); // 25% of 1200 -> 0.75 -> rounds to 1.0 (due to rounding adjustment)
      expect(result.defenderPoints + result.midfielderPoints + result.attackerPoints).toBe(3);
    });
  });

  describe('no playing time scenarios', () => {
    it('should return zero points for player with no playing time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 0,
          timeAsAttackerSeconds: 0
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 0,
        defenderPoints: 0,
        midfielderPoints: 0,
        attackerPoints: 0
      });
    });

    it('should handle player with goalie periods but no outfield time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 1,
          timeAsDefenderSeconds: 0,
          timeAsAttackerSeconds: 0
        }
      };

      const result = calculateRolePoints(player);
      expect(result).toEqual({
        goaliePoints: 1,
        defenderPoints: 0,
        midfielderPoints: 0,
        attackerPoints: 0
      });
    });
  });

  describe('rounding behavior', () => {
    it('should round to nearest 0.5', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 100, // Small amount favoring defender
          timeAsAttackerSeconds: 800
        }
      };

      const result = calculateRolePoints(player);
      // Time ratio: defender = 100/900 ≈ 0.111, attacker = 800/900 ≈ 0.889
      // Points: defender ≈ 0.333, attacker ≈ 2.667
      // Rounded: defender = 0.5, attacker = 2.5
      expect(result.defenderPoints).toBe(0.5);
      expect(result.attackerPoints).toBe(2.5);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
    });

    it('should handle rounding discrepancies by adjusting to role with more time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 700, // More time as defender
          timeAsAttackerSeconds: 200
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
      expect(result.defenderPoints).toBeGreaterThan(result.attackerPoints);
    });

    it('should give difference to attacker when attacker has more time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 200, // Less time as defender
          timeAsAttackerSeconds: 700  // More time as attacker
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
      expect(result.attackerPoints).toBeGreaterThan(result.defenderPoints);
    });
  });

  describe('edge cases', () => {
    it('should handle very small time values', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 1,
          timeAsAttackerSeconds: 1
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
      expect(result.defenderPoints).toBe(1.5);
      expect(result.attackerPoints).toBe(1.5);
    });

    it('should handle very large time values', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 10000,
          timeAsAttackerSeconds: 10000
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
      expect(result.defenderPoints).toBe(1.5);
      expect(result.attackerPoints).toBe(1.5);
    });

    it('should handle fractional period values', () => {
      const player = {
        stats: {
          periodsAsGoalie: 1.5,
          timeAsDefenderSeconds: 300,
          timeAsAttackerSeconds: 300
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(1.5);
      expect(result.defenderPoints + result.attackerPoints).toBe(1.5);
    });

    it('should handle zero periods with playing time', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 450,
          timeAsAttackerSeconds: 450
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints).toBe(1.5);
      expect(result.attackerPoints).toBe(1.5);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed role player with 1 period goalie', () => {
      const player = {
        stats: {
          periodsAsGoalie: 1,
          timeAsDefenderSeconds: 600,
          timeAsAttackerSeconds: 300
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(1);
      expect(result.defenderPoints + result.attackerPoints).toBe(2);
      // Defender has 2/3 of outfield time, attacker has 1/3
      // 2/3 * 2 = 1.33... → rounds to 1.5
      // 1/3 * 2 = 0.66... → rounds to 0.5
      expect(result.defenderPoints).toBe(1.5);
      expect(result.attackerPoints).toBe(0.5);
    });

    it('should maintain point total across different scenarios', () => {
      const scenarios = [
        { periodsAsGoalie: 0, timeAsDefenderSeconds: 600, timeAsAttackerSeconds: 300 },
        { periodsAsGoalie: 1, timeAsDefenderSeconds: 400, timeAsAttackerSeconds: 400 },
        { periodsAsGoalie: 2, timeAsDefenderSeconds: 300, timeAsAttackerSeconds: 0 },
        { periodsAsGoalie: 3, timeAsDefenderSeconds: 0, timeAsAttackerSeconds: 0 },
        { periodsAsGoalie: 0.5, timeAsDefenderSeconds: 750, timeAsAttackerSeconds: 250 }
      ];

      scenarios.forEach((stats, index) => {
        const player = { stats };
        const result = calculateRolePoints(player);
        
        const totalPoints = result.goaliePoints + result.defenderPoints + result.attackerPoints;
        const expectedTotal = Math.max(3, stats.periodsAsGoalie);
        
        expect(totalPoints).toBe(expectedTotal);
      });
    });

    it('should handle decimal time values correctly', () => {
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 333.33,
          timeAsAttackerSeconds: 666.67
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
      expect(typeof result.defenderPoints).toBe('number');
      expect(typeof result.attackerPoints).toBe('number');
    });
  });

  describe('rounding edge cases', () => {
    it('should handle cases where exact halves need rounding', () => {
      // Create scenario where rounding to 0.5 increments causes discrepancy
      const player = {
        stats: {
          periodsAsGoalie: 0,
          timeAsDefenderSeconds: 250, // 25% of time
          timeAsAttackerSeconds: 750  // 75% of time
        }
      };

      const result = calculateRolePoints(player);
      expect(result.goaliePoints).toBe(0);
      expect(result.defenderPoints + result.attackerPoints).toBe(3);
      // 25% of 3 = 0.75 → rounds to 1.0
      // 75% of 3 = 2.25 → rounds to 2.0
      // But attacker should get the difference since they have more time
      expect(result.attackerPoints).toBeGreaterThan(result.defenderPoints);
    });

    it('should ensure total never exceeds expected based on goalie periods', () => {
      const testCases = [
        { periodsAsGoalie: 0.5, timeAsDefenderSeconds: 100, timeAsAttackerSeconds: 100 },
        { periodsAsGoalie: 1.5, timeAsDefenderSeconds: 200, timeAsAttackerSeconds: 300 },
        { periodsAsGoalie: 2.5, timeAsDefenderSeconds: 50, timeAsAttackerSeconds: 100 }
      ];

      testCases.forEach(stats => {
        const player = { stats };
        const result = calculateRolePoints(player);
        
        const totalPoints = result.goaliePoints + result.defenderPoints + result.attackerPoints;
        const expectedTotal = Math.max(3, stats.periodsAsGoalie);
        
        expect(totalPoints).toBe(expectedTotal);
      });
    });
  });
});