import { generateIndividualFormationRecommendation } from './formationGenerator';
import { TEAM_CONFIGS } from '../game/testUtils';

describe('Formation Generator - Individual Mode', () => {
  // Mock player data for individual modes
  const createIndividualPlayer = (id, name, timeOnField = 0, isInactive = false) => {
    const [firstName, ...lastParts] = name.split(' ');
    const lastName = lastParts.length > 0 ? lastParts.join(' ') : null;
    return {
      id,
      displayName: name,
      firstName,
      lastName,
      stats: {
        timeOnFieldSeconds: timeOnField,
        timeAsDefenderSeconds: timeOnField / 2,
        timeAsAttackerSeconds: timeOnField / 2,
        timeAsGoalieSeconds: 0,
        isInactive
      }
    };
  };

  // Mock player data for 1-2-1 formation with midfielder time
  const create121Player = (id, name, timeOnField = 0, defenderTime = 0, midfielderTime = 0, attackerTime = 0, isInactive = false) => {
    const [firstName, ...lastParts] = name.split(' ');
    const lastName = lastParts.length > 0 ? lastParts.join(' ') : null;
    return {
      id,
      displayName: name,
      firstName,
      lastName,
      stats: {
        timeOnFieldSeconds: timeOnField,
        timeAsDefenderSeconds: defenderTime,
        timeAsMidfielderSeconds: midfielderTime,
        timeAsAttackerSeconds: attackerTime,
        timeAsGoalieSeconds: 0,
        isInactive
      }
    };
  };

  describe('1-2-1 Formation Tests', () => {
    const create121Squad = () => [
      create121Player('p1', 'Player 1', 900, 300, 300, 300), // Balanced
      create121Player('p2', 'Player 2', 900, 100, 400, 400), // Needs defender role
      create121Player('p3', 'Player 3', 900, 400, 100, 400), // Needs midfielder role
      create121Player('p4', 'Player 4', 900, 400, 400, 100), // Needs attacker role
      create121Player('p5', 'Player 5', 800, 200, 300, 300), // Less time, balanced
      create121Player('p6', 'Player 6', 700, 100, 200, 400), // Less time, various roles
      create121Player('g1', 'Goalie 1', 0, 0, 0, 0),
    ];

    test('should correctly route to 1-2-1 algorithm when formation is 1-2-1', () => {
      const squad = create121Squad();
      
      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_7_1_2_1 // Use proper teamConfig with 1-2-1 formation
      );

      expect(result.formation.goalie).toBe('g1');
      expect(result.formation.defender).toBeDefined();
      expect(result.formation.left).toBeDefined();
      expect(result.formation.right).toBeDefined();
      expect(result.formation.attacker).toBeDefined();
    });

    test('should default to 2-2 algorithm when no formation specified', () => {
      const squad = create121Squad();
      
      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_7 // Use proper teamConfig - should default to 2-2
      );

      expect(result.formation.goalie).toBe('g1');
      expect(result.formation.leftDefender).toBeDefined();
      expect(result.formation.rightDefender).toBeDefined();
      expect(result.formation.leftAttacker).toBeDefined();
      expect(result.formation.rightAttacker).toBeDefined();
    });

    test('should assign positions based on role deficits in 1-2-1', () => {
      const squad = [
        create121Player('p1', 'Player 1', 400, 100, 200, 100), // Low total time, high defender deficit
        create121Player('p2', 'Player 2', 500, 200, 100, 200), // Low total time, high midfielder deficit  
        create121Player('p3', 'Player 3', 600, 200, 200, 200), // Low total time, balanced
        create121Player('p4', 'Player 4', 700, 100, 200, 400), // Low total time, high attacker deficit
        create121Player('p5', 'Player 5', 800, 200, 300, 300), // Higher time
        create121Player('p6', 'Player 6', 900, 100, 200, 400), // Highest time
        create121Player('g1', 'Goalie 1', 0, 0, 0, 0),
      ];
      
      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_7_1_2_1
      );

      // Field players should be p1, p2, p3, p4 (lowest total times)
      const fieldPlayers = [
        result.formation.defender,
        result.formation.left,
        result.formation.right,
        result.formation.attacker
      ];
      
      expect(fieldPlayers).toContain('p1');
      expect(fieldPlayers).toContain('p2');
      expect(fieldPlayers).toContain('p3');
      expect(fieldPlayers).toContain('p4');
      
      // p5 and p6 should be substitutes (higher total times)
      const substitutes = [result.formation.substitute_1, result.formation.substitute_2];
      expect(substitutes).toContain('p5');
      expect(substitutes).toContain('p6');
    });

    test('should handle inactive players correctly in 1-2-1', () => {
      const squad = [
        create121Player('p1', 'Player 1', 900, 300, 300, 300),
        create121Player('p2', 'Player 2', 800, 300, 300, 200),
        create121Player('p3', 'Player 3', 700, 200, 300, 200),
        create121Player('p4', 'Player 4', 600, 200, 200, 200),
        create121Player('p5', 'Player 5', 500, 100, 200, 200, true), // inactive
        create121Player('p6', 'Player 6', 400, 100, 100, 200, true), // inactive
        create121Player('g1', 'Goalie 1', 0, 0, 0, 0),
      ];
      
      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_7_1_2_1
      );

      // Should place inactive players in substitute positions
      const substitutePositions = [result.formation.substitute_1, result.formation.substitute_2];
      expect(substitutePositions).toContain('p5');
      expect(substitutePositions).toContain('p6');
    });

    test('should create proper rotation queue for 1-2-1', () => {
      const squad = create121Squad();
      
      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_7_1_2_1
      );

      expect(result.rotationQueue).toHaveLength(6); // 6 outfield players
      expect(result.nextToRotateOff).toBeDefined();
      expect(result.rotationQueue).toContain(result.nextToRotateOff);
    });

    test('should handle limited players scenario in 1-2-1', () => {
      const squad = [
        create121Player('p1', 'Player 1', 900, 300, 300, 300),
        create121Player('p2', 'Player 2', 800, 300, 300, 200),
        create121Player('p3', 'Player 3', 700, 200, 300, 200),
        create121Player('p4', 'Player 4', 600, 200, 200, 200),
        create121Player('g1', 'Goalie 1', 0, 0, 0, 0),
      ];
      
      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        { format: '5v5', squadSize: 5, formation: '1-2-1', substitutionType: 'individual' }
      );

      // Should assign the 4 field positions
      expect(result.formation.defender).toBeDefined();
      expect(result.formation.left).toBeDefined();
      expect(result.formation.right).toBeDefined();
      expect(result.formation.attacker).toBeDefined();
      
      // No rotation possible with limited players
      expect(result.rotationQueue).toHaveLength(0);
      expect(result.nextToRotateOff).toBeNull();
    });
  });

  describe('9-Player Mode Inactive Player Handling', () => {
    const squad9 = [
      createIndividualPlayer('p1', 'Player 1', 300),
      createIndividualPlayer('p2', 'Player 2', 280),
      createIndividualPlayer('p3', 'Player 3', 260),
      createIndividualPlayer('p4', 'Player 4', 240),
      createIndividualPlayer('p5', 'Player 5', 220, true), // inactive
      createIndividualPlayer('p6', 'Player 6', 200, true), // inactive
      createIndividualPlayer('p7', 'Player 7', 180),
      createIndividualPlayer('p8', 'Player 8', 160),
      createIndividualPlayer('g1', 'Goalie 1', 0)
    ];

    test('should place 1 inactive player in substitute_4 position', () => {
      const squad = squad9.map(p => ({ ...p, stats: { ...p.stats, isInactive: p.id === 'p5' } }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_9
      );

      expect(result.formation.substitute_4).toBe('p5');
      expect(result.formation.substitute_3).not.toBe('p5');
      expect(result.formation.substitute_2).not.toBe('p5');
      expect(result.formation.substitute_1).not.toBe('p5');
    });

    test('should place 2 inactive players in substitute_3 and substitute_4 positions', () => {
      const squad = squad9.map(p => ({ 
        ...p, 
        stats: { ...p.stats, isInactive: p.id === 'p5' || p.id === 'p6' } 
      }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_9
      );

      const inactivePositions = [result.formation.substitute_3, result.formation.substitute_4];
      expect(inactivePositions).toContain('p5');
      expect(inactivePositions).toContain('p6');
      expect(result.formation.substitute_1).not.toBe('p5');
      expect(result.formation.substitute_1).not.toBe('p6');
      expect(result.formation.substitute_2).not.toBe('p5');
      expect(result.formation.substitute_2).not.toBe('p6');
    });

    test('should place 3 inactive players in substitute_2, substitute_3, and substitute_4 positions', () => {
      const squad = squad9.map(p => ({ 
        ...p, 
        stats: { ...p.stats, isInactive: p.id === 'p5' || p.id === 'p6' || p.id === 'p7' } 
      }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_9
      );

      const inactivePositions = [
        result.formation.substitute_2, 
        result.formation.substitute_3, 
        result.formation.substitute_4
      ];
      expect(inactivePositions).toContain('p5');
      expect(inactivePositions).toContain('p6');
      expect(inactivePositions).toContain('p7');
      expect(result.formation.substitute_1).not.toBe('p5');
      expect(result.formation.substitute_1).not.toBe('p6');
      expect(result.formation.substitute_1).not.toBe('p7');
    });

    test('should place 4 inactive players in all substitute positions', () => {
      const squad = squad9.map(p => ({ 
        ...p, 
        stats: { ...p.stats, isInactive: ['p5', 'p6', 'p7', 'p8'].includes(p.id) } 
      }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_9
      );

      const allSubstitutePositions = [
        result.formation.substitute_1,
        result.formation.substitute_2, 
        result.formation.substitute_3, 
        result.formation.substitute_4
      ];
      expect(allSubstitutePositions).toContain('p5');
      expect(allSubstitutePositions).toContain('p6');
      expect(allSubstitutePositions).toContain('p7');
      expect(allSubstitutePositions).toContain('p8');
    });
  });

  describe('10-Player Mode Inactive Player Handling', () => {
    const squad10 = [
      createIndividualPlayer('p1', 'Player 1', 300),
      createIndividualPlayer('p2', 'Player 2', 280),
      createIndividualPlayer('p3', 'Player 3', 260),
      createIndividualPlayer('p4', 'Player 4', 240),
      createIndividualPlayer('p5', 'Player 5', 220),
      createIndividualPlayer('p6', 'Player 6', 200),
      createIndividualPlayer('p7', 'Player 7', 180),
      createIndividualPlayer('p8', 'Player 8', 160),
      createIndividualPlayer('p9', 'Player 9', 140),
      createIndividualPlayer('g1', 'Goalie 1', 0)
    ];

    test('should place 1 inactive player in substitute_5 position', () => {
      const squad = squad10.map(p => ({ ...p, stats: { ...p.stats, isInactive: p.id === 'p9' } }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_10
      );

      expect(result.formation.substitute_5).toBe('p9');
      expect(result.formation.substitute_4).not.toBe('p9');
      expect(result.formation.substitute_3).not.toBe('p9');
      expect(result.formation.substitute_2).not.toBe('p9');
      expect(result.formation.substitute_1).not.toBe('p9');
    });

    test('should place 3 inactive players in substitute_3, substitute_4, and substitute_5 positions', () => {
      const squad = squad10.map(p => ({ 
        ...p, 
        stats: { ...p.stats, isInactive: ['p7', 'p8', 'p9'].includes(p.id) } 
      }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_10
      );

      const inactivePositions = [
        result.formation.substitute_3, 
        result.formation.substitute_4,
        result.formation.substitute_5
      ];
      expect(inactivePositions).toContain('p7');
      expect(inactivePositions).toContain('p8');
      expect(inactivePositions).toContain('p9');
      expect(result.formation.substitute_1).not.toBe('p7');
      expect(result.formation.substitute_1).not.toBe('p8');
      expect(result.formation.substitute_1).not.toBe('p9');
      expect(result.formation.substitute_2).not.toBe('p7');
      expect(result.formation.substitute_2).not.toBe('p8');
      expect(result.formation.substitute_2).not.toBe('p9');
    });

    test('should place 5 inactive players in all substitute positions', () => {
      const squad = squad10.map(p => ({ 
        ...p, 
        stats: { ...p.stats, isInactive: ['p5', 'p6', 'p7', 'p8', 'p9'].includes(p.id) } 
      }));
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad,
        squad,
        TEAM_CONFIGS.INDIVIDUAL_10
      );

      const allSubstitutePositions = [
        result.formation.substitute_1,
        result.formation.substitute_2, 
        result.formation.substitute_3, 
        result.formation.substitute_4,
        result.formation.substitute_5
      ];
      expect(allSubstitutePositions).toContain('p5');
      expect(allSubstitutePositions).toContain('p6');
      expect(allSubstitutePositions).toContain('p7');
      expect(allSubstitutePositions).toContain('p8');
      expect(allSubstitutePositions).toContain('p9');
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing 7-player mode behavior', () => {
      const squad7 = [
        createIndividualPlayer('p1', 'Player 1', 300),
        createIndividualPlayer('p2', 'Player 2', 280),
        createIndividualPlayer('p3', 'Player 3', 260),
        createIndividualPlayer('p4', 'Player 4', 240),
        createIndividualPlayer('p5', 'Player 5', 220, true), // inactive
        createIndividualPlayer('p6', 'Player 6', 200),
        createIndividualPlayer('g1', 'Goalie 1', 0)
      ];
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad7,
        squad7,
        TEAM_CONFIGS.INDIVIDUAL_7
      );

      // Should place inactive player in substitute_2 (last position for 7-player mode)
      expect(result.formation.substitute_2).toBe('p5');
      expect(result.formation.substitute_1).not.toBe('p5');
    });

    test('should maintain existing 8-player mode behavior', () => {
      const squad8 = [
        createIndividualPlayer('p1', 'Player 1', 300),
        createIndividualPlayer('p2', 'Player 2', 280),
        createIndividualPlayer('p3', 'Player 3', 260),
        createIndividualPlayer('p4', 'Player 4', 240),
        createIndividualPlayer('p5', 'Player 5', 220),
        createIndividualPlayer('p6', 'Player 6', 200, true), // inactive
        createIndividualPlayer('p7', 'Player 7', 180),
        createIndividualPlayer('g1', 'Goalie 1', 0)
      ];
      
      const result = generateIndividualFormationRecommendation(
        'g1', // current goalie
        squad8,
        squad8,
        TEAM_CONFIGS.INDIVIDUAL_8
      );

      // Should place inactive player in substitute_3 (last position for 8-player mode)
      expect(result.formation.substitute_3).toBe('p6');
      expect(result.formation.substitute_1).not.toBe('p6');
      expect(result.formation.substitute_2).not.toBe('p6');
    });
  });
});
