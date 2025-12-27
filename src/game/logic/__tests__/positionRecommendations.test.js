import {
  calculateTargetPercentages,
  calculateRoleDeficits,
  assignPositionsByRole,
  calculatePositionRecommendations
} from '../positionRecommendations';
import { TEAM_CONFIGS } from '../../testUtils';

describe('Position Recommendations', () => {
  // Helper to create mock player stats
  const createPlayerStats = (id, name, defenderPercent, midfielderPercent, attackerPercent) => ({
    id,
    displayName: name,
    percentTimeAsDefender: defenderPercent,
    percentTimeAsMidfielder: midfielderPercent,
    percentTimeAsAttacker: attackerPercent
  });

  describe('calculateTargetPercentages', () => {
    test('should calculate 50/50 target for 2-2 formation (5v5)', () => {
      const targets = calculateTargetPercentages(TEAM_CONFIGS.INDIVIDUAL_6);

      expect(targets.defender).toBeCloseTo(50, 1);
      expect(targets.midfielder).toBeCloseTo(0, 1);
      expect(targets.attacker).toBeCloseTo(50, 1);
    });

    test('should calculate 25/50/25 target for 1-2-1 formation (5v5)', () => {
      const targets = calculateTargetPercentages(TEAM_CONFIGS.INDIVIDUAL_7_1_2_1);

      expect(targets.defender).toBeCloseTo(25, 1);
      expect(targets.midfielder).toBeCloseTo(50, 1);
      expect(targets.attacker).toBeCloseTo(25, 1);
    });

    test('should calculate 33.3/33.3/33.3 target for 2-2-2 formation (7v7)', () => {
      const targets = calculateTargetPercentages(TEAM_CONFIGS.INDIVIDUAL_7V7_222);

      expect(targets.defender).toBeCloseTo(33.3, 1);
      expect(targets.midfielder).toBeCloseTo(33.3, 1);
      expect(targets.attacker).toBeCloseTo(33.3, 1);
    });

    test('should calculate 33.3/50/16.7 target for 2-3-1 formation (7v7)', () => {
      const targets = calculateTargetPercentages(TEAM_CONFIGS.INDIVIDUAL_7V7_231);

      expect(targets.defender).toBeCloseTo(33.3, 1);
      expect(targets.midfielder).toBeCloseTo(50, 1);
      expect(targets.attacker).toBeCloseTo(16.7, 1);
    });

    test('should return zero percentages for invalid teamConfig', () => {
      const targets = calculateTargetPercentages(null);

      expect(targets.defender).toBe(0);
      expect(targets.midfielder).toBe(0);
      expect(targets.attacker).toBe(0);
    });
  });

  describe('calculateRoleDeficits', () => {
    const targetPercentages = { defender: 50, midfielder: 0, attacker: 50 };

    test('should calculate positive deficits for underrepresented roles', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 20, 0, 80) // Needs more defender time
      ];

      const deficits = calculateRoleDeficits(playerStats, targetPercentages);

      expect(deficits).toHaveLength(1);
      expect(deficits[0].deficits.defender).toBeCloseTo(30, 1); // 50 - 20 = 30
      expect(deficits[0].deficits.attacker).toBeCloseTo(-30, 1); // 50 - 80 = -30
    });

    test('should calculate negative deficits for overrepresented roles', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 70, 0, 30) // Has too much defender time
      ];

      const deficits = calculateRoleDeficits(playerStats, targetPercentages);

      expect(deficits[0].deficits.defender).toBeCloseTo(-20, 1); // 50 - 70 = -20
      expect(deficits[0].deficits.attacker).toBeCloseTo(20, 1); // 50 - 30 = 20
    });

    test('should treat new players (0% all roles) with equal deficits', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 0, 0, 0) // New player
      ];

      const deficits = calculateRoleDeficits(playerStats, targetPercentages);

      expect(deficits[0].deficits.defender).toBeCloseTo(50, 1);
      expect(deficits[0].deficits.midfielder).toBeCloseTo(0, 1);
      expect(deficits[0].deficits.attacker).toBeCloseTo(50, 1);
      expect(deficits[0].hasHistory).toBe(false);
    });

    test('should exclude goalie and substitutes', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 30, 0, 70),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0),
        createPlayerStats('s1', 'Sub 1', 40, 0, 60)
      ];

      const deficits = calculateRoleDeficits(playerStats, targetPercentages, ['g1', 's1']);

      expect(deficits).toHaveLength(1);
      expect(deficits[0].id).toBe('p1');
    });

    test('should handle 1-2-1 formation percentages', () => {
      const targets121 = { defender: 25, midfielder: 50, attacker: 25 };
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 10, 60, 30) // Needs defender, has too much midfielder
      ];

      const deficits = calculateRoleDeficits(playerStats, targets121);

      expect(deficits[0].deficits.defender).toBeCloseTo(15, 1); // 25 - 10
      expect(deficits[0].deficits.midfielder).toBeCloseTo(-10, 1); // 50 - 60
      expect(deficits[0].deficits.attacker).toBeCloseTo(-5, 1); // 25 - 30
    });
  });

  describe('assignPositionsByRole', () => {
    test('should assign 2-2 formation positions based on deficits', () => {
      const playersWithDeficits = [
        {
          id: 'p1',
          displayName: 'Player 1',
          deficits: { defender: 30, midfielder: 0, attacker: -30 }, // Needs defender
          percentages: { defender: 20, midfielder: 0, attacker: 80 }
        },
        {
          id: 'p2',
          displayName: 'Player 2',
          deficits: { defender: 20, midfielder: 0, attacker: -20 }, // Needs defender (less)
          percentages: { defender: 30, midfielder: 0, attacker: 70 }
        },
        {
          id: 'p3',
          displayName: 'Player 3',
          deficits: { defender: -30, midfielder: 0, attacker: 30 }, // Needs attacker
          percentages: { defender: 80, midfielder: 0, attacker: 20 }
        },
        {
          id: 'p4',
          displayName: 'Player 4',
          deficits: { defender: -20, midfielder: 0, attacker: 20 }, // Needs attacker (less)
          percentages: { defender: 70, midfielder: 0, attacker: 30 }
        }
      ];

      const modeDefinition = {
        fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
        positions: {
          leftDefender: { role: 'DEFENDER' },
          rightDefender: { role: 'DEFENDER' },
          leftAttacker: { role: 'ATTACKER' },
          rightAttacker: { role: 'ATTACKER' }
        }
      };

      const assignments = assignPositionsByRole(playersWithDeficits, modeDefinition);

      // p1 and p2 should be defenders (highest defender deficits)
      const defenders = [assignments.leftDefender, assignments.rightDefender];
      expect(defenders).toContain('p1');
      expect(defenders).toContain('p2');

      // p3 and p4 should be attackers (highest attacker deficits)
      const attackers = [assignments.leftAttacker, assignments.rightAttacker];
      expect(attackers).toContain('p3');
      expect(attackers).toContain('p4');
    });

    test('should assign 1-2-1 formation positions including midfielders', () => {
      const playersWithDeficits = [
        {
          id: 'p1',
          displayName: 'Player 1',
          deficits: { defender: 15, midfielder: -10, attacker: -5 },
          percentages: { defender: 10, midfielder: 60, attacker: 30 }
        },
        {
          id: 'p2',
          displayName: 'Player 2',
          deficits: { defender: -5, midfielder: 20, attacker: -15 },
          percentages: { defender: 30, midfielder: 30, attacker: 40 }
        },
        {
          id: 'p3',
          displayName: 'Player 3',
          deficits: { defender: -10, midfielder: 15, attacker: -5 },
          percentages: { defender: 35, midfielder: 35, attacker: 30 }
        },
        {
          id: 'p4',
          displayName: 'Player 4',
          deficits: { defender: -15, midfielder: -5, attacker: 20 },
          percentages: { defender: 40, midfielder: 55, attacker: 5 }
        }
      ];

      const modeDefinition = {
        fieldPositions: ['defender', 'left', 'right', 'attacker'],
        positions: {
          defender: { role: 'DEFENDER' },
          left: { role: 'MIDFIELDER' },
          right: { role: 'MIDFIELDER' },
          attacker: { role: 'ATTACKER' }
        }
      };

      const assignments = assignPositionsByRole(playersWithDeficits, modeDefinition);

      // p1 should be defender (highest defender deficit)
      expect(assignments.defender).toBe('p1');

      // p2 and p3 should be midfielders (highest midfielder deficits)
      const midfielders = [assignments.left, assignments.right];
      expect(midfielders).toContain('p2');
      expect(midfielders).toContain('p3');

      // p4 should be attacker (highest attacker deficit)
      expect(assignments.attacker).toBe('p4');
    });

    test('should handle ties with random assignment (no alphabetical bias)', () => {
      // With shuffling, tied players can be assigned in any order
      const playersWithDeficits = [
        {
          id: 'p1',
          displayName: 'Alice',
          deficits: { defender: 30, midfielder: 0, attacker: -30 },
          percentages: { defender: 20, midfielder: 0, attacker: 80 }
        },
        {
          id: 'p2',
          displayName: 'Bob',
          deficits: { defender: 30, midfielder: 0, attacker: -30 }, // Same deficit as p1
          percentages: { defender: 20, midfielder: 0, attacker: 80 }
        },
        {
          id: 'p3',
          displayName: 'Charlie',
          deficits: { defender: -30, midfielder: 0, attacker: 30 },
          percentages: { defender: 80, midfielder: 0, attacker: 20 }
        },
        {
          id: 'p4',
          displayName: 'David',
          deficits: { defender: -30, midfielder: 0, attacker: 30 }, // Same deficit as p3
          percentages: { defender: 80, midfielder: 0, attacker: 20 }
        }
      ];

      const modeDefinition = {
        fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
        positions: {
          leftDefender: { role: 'DEFENDER' },
          rightDefender: { role: 'DEFENDER' },
          leftAttacker: { role: 'ATTACKER' },
          rightAttacker: { role: 'ATTACKER' }
        }
      };

      const assignments = assignPositionsByRole(playersWithDeficits, modeDefinition);

      // Both p1 and p2 should be defenders (tied highest deficit)
      const defenders = [assignments.leftDefender, assignments.rightDefender];
      expect(defenders).toContain('p1');
      expect(defenders).toContain('p2');

      // Both p3 and p4 should be attackers (tied highest deficit)
      const attackers = [assignments.leftAttacker, assignments.rightAttacker];
      expect(attackers).toContain('p3');
      expect(attackers).toContain('p4');

      // Order doesn't matter - just verify tied players are assigned to correct roles
    });

    test('should return empty object for invalid modeDefinition', () => {
      const assignments = assignPositionsByRole([], null);
      expect(assignments).toEqual({});
    });
  });

  describe('calculatePositionRecommendations', () => {
    test('should generate complete recommendations for 2-2 formation', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 20, 0, 80),
        createPlayerStats('p2', 'Player 2', 30, 0, 70),
        createPlayerStats('p3', 'Player 3', 70, 0, 30),
        createPlayerStats('p4', 'Player 4', 80, 0, 20),
        createPlayerStats('p5', 'Player 5', 50, 0, 50),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0)
      ];

      const formation = { goalie: 'g1', substitute_1: 'p5' };
      const result = calculatePositionRecommendations(
        playerStats,
        formation,
        TEAM_CONFIGS.INDIVIDUAL_6,
        'g1',
        ['p5']
      );

      expect(result).not.toBeNull();
      expect(result.recommendations).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Should have 4 field positions
      expect(Object.keys(result.recommendations)).toHaveLength(4);

      // Should recommend p1 and p2 for defender (low defender time)
      const defenders = [
        result.recommendations.leftDefender?.playerId,
        result.recommendations.rightDefender?.playerId
      ];
      expect(defenders).toContain('p1');
      expect(defenders).toContain('p2');

      // Should recommend p3 and p4 for attacker (low attacker time)
      const attackers = [
        result.recommendations.leftAttacker?.playerId,
        result.recommendations.rightAttacker?.playerId
      ];
      expect(attackers).toContain('p3');
      expect(attackers).toContain('p4');

      // Check metadata
      expect(result.metadata.playersConsidered).toBe(4);
      expect(result.metadata.targetPercentages.defender).toBeCloseTo(50, 1);
      expect(result.metadata.targetPercentages.attacker).toBeCloseTo(50, 1);
    });

    test('should generate recommendations for 1-2-1 formation', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 10, 60, 30),
        createPlayerStats('p2', 'Player 2', 30, 30, 40),
        createPlayerStats('p3', 'Player 3', 35, 35, 30),
        createPlayerStats('p4', 'Player 4', 40, 55, 5),
        createPlayerStats('p5', 'Player 5', 25, 50, 25),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0)
      ];

      const formation = { goalie: 'g1', substitute_1: 'p5' };
      const result = calculatePositionRecommendations(
        playerStats,
        formation,
        TEAM_CONFIGS.INDIVIDUAL_7_1_2_1,
        'g1',
        ['p5']
      );

      expect(result).not.toBeNull();
      expect(Object.keys(result.recommendations)).toHaveLength(4);

      // Check that positions are filled
      expect(result.recommendations.defender).toBeDefined();
      expect(result.recommendations.left).toBeDefined();
      expect(result.recommendations.right).toBeDefined();
      expect(result.recommendations.attacker).toBeDefined();

      // Check metadata
      expect(result.metadata.targetPercentages.defender).toBeCloseTo(25, 1);
      expect(result.metadata.targetPercentages.midfielder).toBeCloseTo(50, 1);
      expect(result.metadata.targetPercentages.attacker).toBeCloseTo(25, 1);
    });

    test('should generate recommendations for 7v7 2-2-2 formation', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 10, 50, 40),
        createPlayerStats('p2', 'Player 2', 15, 45, 40),
        createPlayerStats('p3', 'Player 3', 40, 10, 50),
        createPlayerStats('p4', 'Player 4', 45, 15, 40),
        createPlayerStats('p5', 'Player 5', 50, 40, 10),
        createPlayerStats('p6', 'Player 6', 40, 50, 10),
        createPlayerStats('p7', 'Player 7', 33, 34, 33),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0)
      ];

      const formation = { goalie: 'g1', substitute_1: 'p7' };
      const result = calculatePositionRecommendations(
        playerStats,
        formation,
        TEAM_CONFIGS.INDIVIDUAL_7V7_222,
        'g1',
        ['p7']
      );

      expect(result).not.toBeNull();
      expect(Object.keys(result.recommendations)).toHaveLength(6);

      // Check metadata for 7v7
      expect(result.metadata.playersConsidered).toBe(6);
      expect(result.metadata.targetPercentages.defender).toBeCloseTo(33.3, 1);
      expect(result.metadata.targetPercentages.midfielder).toBeCloseTo(33.3, 1);
      expect(result.metadata.targetPercentages.attacker).toBeCloseTo(33.3, 1);
    });

    test('should include reason for each recommendation', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 15.2, 0, 84.8),
        createPlayerStats('p2', 'Player 2', 18.5, 0, 81.5),
        createPlayerStats('p3', 'Player 3', 81.5, 0, 18.5),
        createPlayerStats('p4', 'Player 4', 84.8, 0, 15.2),
        createPlayerStats('p5', 'Player 5', 50, 0, 50),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0)
      ];

      const formation = { goalie: 'g1', substitute_1: 'p5' };
      const result = calculatePositionRecommendations(
        playerStats,
        formation,
        TEAM_CONFIGS.INDIVIDUAL_6,
        'g1',
        ['p5']
      );

      // Check that reasons are included
      expect(result.recommendations.leftDefender.reason).toContain('defender time');
      expect(result.recommendations.rightDefender.reason).toContain('defender time');
      expect(result.recommendations.leftAttacker.reason).toContain('attacker time');
      expect(result.recommendations.rightAttacker.reason).toContain('attacker time');
    });

    test('should handle new players with "No match history" reason', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 0, 0, 0), // New player
        createPlayerStats('p2', 'Player 2', 30, 0, 70),
        createPlayerStats('p3', 'Player 3', 70, 0, 30),
        createPlayerStats('p4', 'Player 4', 80, 0, 20),
        createPlayerStats('p5', 'Player 5', 50, 0, 50),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0)
      ];

      const formation = { goalie: 'g1', substitute_1: 'p5' };
      const result = calculatePositionRecommendations(
        playerStats,
        formation,
        TEAM_CONFIGS.INDIVIDUAL_6,
        'g1',
        ['p5']
      );

      // Check if p1 is recommended and has correct reason
      const p1Position = Object.entries(result.recommendations).find(
        ([, data]) => data.playerId === 'p1'
      );

      if (p1Position) {
        expect(p1Position[1].reason).toBe('No match history');
      }
    });

    test('should return null for empty player stats', () => {
      const result = calculatePositionRecommendations([], {}, TEAM_CONFIGS.INDIVIDUAL_6, 'g1', []);
      expect(result).toBeNull();
    });

    test('should return null for invalid teamConfig', () => {
      const playerStats = [createPlayerStats('p1', 'Player 1', 20, 0, 80)];
      const result = calculatePositionRecommendations(playerStats, {}, null, 'g1', []);
      expect(result).toBeNull();
    });

    test('should exclude goalie and substitutes from recommendations', () => {
      const playerStats = [
        createPlayerStats('p1', 'Player 1', 20, 0, 80),
        createPlayerStats('p2', 'Player 2', 30, 0, 70),
        createPlayerStats('p3', 'Player 3', 70, 0, 30),
        createPlayerStats('p4', 'Player 4', 80, 0, 20),
        createPlayerStats('s1', 'Sub 1', 10, 0, 90),
        createPlayerStats('s2', 'Sub 2', 15, 0, 85),
        createPlayerStats('g1', 'Goalie 1', 0, 0, 0)
      ];

      const formation = { goalie: 'g1', substitute_1: 's1', substitute_2: 's2' };
      const result = calculatePositionRecommendations(
        playerStats,
        formation,
        TEAM_CONFIGS.INDIVIDUAL_6,
        'g1',
        ['s1', 's2']
      );

      // Should only consider p1-p4
      expect(result.metadata.playersConsidered).toBe(4);

      // g1, s1, s2 should not be in recommendations
      const allRecommendedIds = Object.values(result.recommendations).map(r => r.playerId);
      expect(allRecommendedIds).not.toContain('g1');
      expect(allRecommendedIds).not.toContain('s1');
      expect(allRecommendedIds).not.toContain('s2');
    });
  });
});
