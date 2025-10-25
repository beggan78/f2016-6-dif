import { generateRecommendedFormation, generateBalancedFormationForPeriod3, generateIndividualFormationRecommendation } from './formationGenerator';
import { PAIRED_ROLE_STRATEGY_TYPES } from '../constants/teamConfiguration';
import { TEAM_CONFIGS } from '../game/testUtils';

describe('Formation Generator - Pair Mode', () => {
  // Mock player data
  const createPlayer = (id, name, timeOnField = 0, defenderTime = 0, attackerTime = 0) => ({
    id,
    name,
    stats: {
      timeOnFieldSeconds: timeOnField,
      timeAsDefenderSeconds: defenderTime,
      timeAsAttackerSeconds: attackerTime
    }
  });

  const squad = [
    createPlayer('p1', 'Player 1'),
    createPlayer('p2', 'Player 2'),
    createPlayer('p3', 'Player 3'),
    createPlayer('p4', 'Player 4'),
    createPlayer('p5', 'Player 5'),
    createPlayer('p6', 'Player 6'),
    createPlayer('p7', 'Player 7')
  ];

  describe('Period 2 Formation Logic', () => {
    test('should maintain pair integrity with role swapping when no goalie change', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      const result = generateRecommendedFormation(
        2, // period 2
        'p7', // same goalie
        'p7', // previous goalie
        prevFormation,
        squad,
        squad
      );

      // All pairs should be preserved but with swapped roles
      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      
      // Check that p1-p2 pair exists with swapped roles
      const p1p2Pair = allPairs.find(pair => 
        (pair.defender === 'p1' && pair.attacker === 'p2') ||
        (pair.defender === 'p2' && pair.attacker === 'p1')
      );
      expect(p1p2Pair).toBeDefined();
      expect(p1p2Pair.defender).toBe('p2'); // Swapped from original
      expect(p1p2Pair.attacker).toBe('p1');

      // Check that p3-p4 pair exists with swapped roles
      const p3p4Pair = allPairs.find(pair => 
        (pair.defender === 'p3' && pair.attacker === 'p4') ||
        (pair.defender === 'p4' && pair.attacker === 'p3')
      );
      expect(p3p4Pair).toBeDefined();
      expect(p3p4Pair.defender).toBe('p4'); // Swapped from original
      expect(p3p4Pair.attacker).toBe('p3');

      // Check that p5-p6 pair exists with swapped roles
      const p5p6Pair = allPairs.find(pair => 
        (pair.defender === 'p5' && pair.attacker === 'p6') ||
        (pair.defender === 'p6' && pair.attacker === 'p5')
      );
      expect(p5p6Pair).toBeDefined();
      expect(p5p6Pair.defender).toBe('p6'); // Swapped from original
      expect(p5p6Pair.attacker).toBe('p5');
    });

    test('should handle goalie change by pairing ex-goalie with orphaned partner', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p7' } // p7 was goalie's partner
      };

      const playerStatsWithTime = squad.map(p => ({
        ...p,
        stats: {
          ...p.stats,
          timeOnFieldSeconds: p.id === 'p7' ? 300 : 150 // p7 has most time
        }
      }));

      const result = generateRecommendedFormation(
        2, // period 2
        'p6', // new goalie
        'p7', // previous goalie
        prevFormation,
        playerStatsWithTime,
        squad
      );

      // Should find a pair containing both p7 (ex-goalie) and p5 (orphaned partner)
      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      const exGoaliePair = allPairs.find(pair => 
        (pair.defender === 'p7' && pair.attacker === 'p5') ||
        (pair.defender === 'p5' && pair.attacker === 'p7')
      );
      
      expect(exGoaliePair).toBeDefined();
      
      // The orphaned partner (p5) should have changed roles (was defender, now attacker)
      if (exGoaliePair.attacker === 'p5') {
        expect(exGoaliePair.defender).toBe('p7');
      } else {
        expect(exGoaliePair.attacker).toBe('p7');
        expect(exGoaliePair.defender).toBe('p5');
      }
    });

    test('should recommend substitute pair based on most playing time', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      const playerStatsWithTime = squad.map(p => ({
        ...p,
        stats: {
          ...p.stats,
          timeOnFieldSeconds: p.id === 'p3' ? 400 : 150 // p3 has most time
        }
      }));

      const result = generateRecommendedFormation(
        2,
        'p7',
        'p7',
        prevFormation,
        playerStatsWithTime,
        squad
      );

      // The pair containing p3 should be recommended as substitutes
      expect(
        result.recommendedSubs.defender === 'p3' || result.recommendedSubs.attacker === 'p3'
      ).toBe(true);
    });
  });

  describe('Period 3 Formation Logic - Role Balance Enforcement', () => {
    test('should enforce role balance based on time ratios', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      // Create imbalanced player stats
      const playerStatsImbalanced = [
        createPlayer('p1', 'Player 1', 300, 1, 300), // Needs defender role (ratio < 0.8)
        createPlayer('p2', 'Player 2', 300, 300, 1), // Needs attacker role (ratio > 1.25)
        createPlayer('p3', 'Player 3', 300, 100, 100), // Balanced (ratio ≈ 1)
        createPlayer('p4', 'Player 4', 300, 120, 120), // Balanced
        createPlayer('p5', 'Player 5', 300, 1, 400), // Needs defender role
        createPlayer('p6', 'Player 6', 300, 400, 1), // Needs attacker role
        createPlayer('p7', 'Player 7', 0, 0, 0) // Goalie
      ];

      const result = generateBalancedFormationForPeriod3(
        'p7',
        'p7',
        prevFormation,
        playerStatsImbalanced,
        playerStatsImbalanced
      );

      // Find pairs and check role assignments
      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      
      // p1 and p5 should be defenders (they need defender role)
      const p1Pair = allPairs.find(pair => pair.defender === 'p1' || pair.attacker === 'p1');
      const p5Pair = allPairs.find(pair => pair.defender === 'p5' || pair.attacker === 'p5');
      
      expect(p1Pair?.defender).toBe('p1');
      expect(p5Pair?.defender).toBe('p5');

      // p2 and p6 should be attackers (they need attacker role)
      const p2Pair = allPairs.find(pair => pair.defender === 'p2' || pair.attacker === 'p2');
      const p6Pair = allPairs.find(pair => pair.defender === 'p6' || pair.attacker === 'p6');
      
      expect(p2Pair?.attacker).toBe('p2');
      expect(p6Pair?.attacker).toBe('p6');
    });

    test('should break pairs when role balance cannot be maintained with existing pairs', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      // Create scenario where pairs must be broken for role balance
      const playerStatsForBreaking = [
        createPlayer('p1', 'Player 1', 300, 1, 400), // Needs defender role
        createPlayer('p2', 'Player 2', 300, 1, 350), // Needs defender role 
        createPlayer('p3', 'Player 3', 300, 400, 1), // Needs attacker role
        createPlayer('p4', 'Player 4', 300, 350, 1), // Needs attacker role
        createPlayer('p5', 'Player 5', 300, 100, 100), // Balanced
        createPlayer('p6', 'Player 6', 300, 120, 120), // Balanced
        createPlayer('p7', 'Player 7', 0, 0, 0) // Goalie
      ];

      const result = generateBalancedFormationForPeriod3(
        'p7',
        'p7',
        prevFormation,
        playerStatsForBreaking,
        playerStatsForBreaking
      );

      // Verify that role requirements are respected even if pairs are broken
      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      
      // p1 and p2 should both be defenders
      const p1Pair = allPairs.find(pair => pair.defender === 'p1' || pair.attacker === 'p1');
      const p2Pair = allPairs.find(pair => pair.defender === 'p2' || pair.attacker === 'p2');
      
      expect(p1Pair?.defender).toBe('p1');
      expect(p2Pair?.defender).toBe('p2');

      // p3 and p4 should both be attackers
      const p3Pair = allPairs.find(pair => pair.defender === 'p3' || pair.attacker === 'p3');
      const p4Pair = allPairs.find(pair => pair.defender === 'p4' || pair.attacker === 'p4');
      
      expect(p3Pair?.attacker).toBe('p3');
      expect(p4Pair?.attacker).toBe('p4');

      // This means the original pairs (p1-p2, p3-p4) have been broken up
      // p1 should NOT be paired with p2, and p3 should NOT be paired with p4
      expect(p1Pair === p2Pair).toBe(false);
      expect(p3Pair === p4Pair).toBe(false);
    });

    test('should handle goalie change in period 3 while maintaining role balance', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p7' }, // p7 was playing with p3
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      const playerStatsWithGoalieChange = [
        createPlayer('p1', 'Player 1', 300, 100, 100), // Balanced
        createPlayer('p2', 'Player 2', 300, 120, 120), // Balanced
        createPlayer('p3', 'Player 3', 300, 1, 400), // Needs defender role
        createPlayer('p4', 'Player 4', 300, 400, 1), // Needs attacker role (new goalie)
        createPlayer('p5', 'Player 5', 300, 130, 130), // Balanced
        createPlayer('p6', 'Player 6', 300, 140, 140), // Balanced
        createPlayer('p7', 'Player 7', 250, 200, 1) // Ex-goalie, needs attacker role
      ];

      const result = generateBalancedFormationForPeriod3(
        'p4', // new goalie
        'p4', // previous goalie (same for this test)
        prevFormation,
        playerStatsWithGoalieChange,
        playerStatsWithGoalieChange
      );

      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      
      // p3 should be defender (needs defender role)
      const p3Pair = allPairs.find(pair => pair.defender === 'p3' || pair.attacker === 'p3');
      expect(p3Pair?.defender).toBe('p3');

      // p7 should be attacker (needs attacker role)
      const p7Pair = allPairs.find(pair => pair.defender === 'p7' || pair.attacker === 'p7');
      expect(p7Pair?.attacker).toBe('p7');

      // All players should be assigned to exactly one pair
      const assignedPlayers = new Set();
      allPairs.forEach(pair => {
        if (pair.defender) assignedPlayers.add(pair.defender);
        if (pair.attacker) assignedPlayers.add(pair.attacker);
      });
      
      // Should have 6 outfield players assigned
      expect(assignedPlayers.size).toBe(6);
      expect(assignedPlayers.has('p4')).toBe(false); // p4 is goalie
    });

    test('should apply opposite role rule for flexible players', () => {
      const prevFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      // All players have balanced time ratios (flexible)
      const balancedPlayerStats = [
        createPlayer('p1', 'Player 1', 300, 150, 150),
        createPlayer('p2', 'Player 2', 300, 140, 160),
        createPlayer('p3', 'Player 3', 300, 160, 140),
        createPlayer('p4', 'Player 4', 300, 155, 145),
        createPlayer('p5', 'Player 5', 300, 145, 155),
        createPlayer('p6', 'Player 6', 300, 150, 150),
        createPlayer('p7', 'Player 7', 0, 0, 0) // Goalie
      ];

      const result = generateBalancedFormationForPeriod3(
        'p7',
        'p7',
        prevFormation,
        balancedPlayerStats,
        balancedPlayerStats
      );

      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      
      // Players should get opposite roles from period 2
      // p1 was defender in period 2, should be attacker in period 3
      const p1Pair = allPairs.find(pair => pair.defender === 'p1' || pair.attacker === 'p1');
      expect(p1Pair?.attacker).toBe('p1');

      // p2 was attacker in period 2, should be defender in period 3
      const p2Pair = allPairs.find(pair => pair.defender === 'p2' || pair.attacker === 'p2');
      expect(p2Pair?.defender).toBe('p2');

      // p3 was defender in period 2, should be attacker in period 3
      const p3Pair = allPairs.find(pair => pair.defender === 'p3' || pair.attacker === 'p3');
      expect(p3Pair?.attacker).toBe('p3');

      // p4 was attacker in period 2, should be defender in period 3
      const p4Pair = allPairs.find(pair => pair.defender === 'p4' || pair.attacker === 'p4');
      expect(p4Pair?.defender).toBe('p4');
    });

    test('should swap roles for slightly imbalanced flexible players - realistic scenario', () => {
      // Based on user's real scenario: playerA slightly needs defender time, playerB slightly needs attacker time
      const prevFormation = {
        leftPair: { defender: 'playerB', attacker: 'playerA' }, // Period 2 roles
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' }
      };

      const playerStatsRealistic = [
        createPlayer('playerA', 'Player A', 1810, 910, 900), // Played defender P1, attacker P2 - ratio = 910/900 = 1.01
        createPlayer('playerB', 'Player B', 1810, 900, 910), // Played attacker P1, defender P2 - ratio = 900/910 = 0.99
        createPlayer('p3', 'Player 3', 1800, 900, 900),       // Balanced
        createPlayer('p4', 'Player 4', 1800, 900, 900),       // Balanced  
        createPlayer('p5', 'Player 5', 1800, 900, 900),       // Balanced
        createPlayer('p6', 'Player 6', 1800, 900, 900),       // Balanced
        createPlayer('p7', 'Player 7', 0, 0, 0)               // Goalie
      ];

      const result = generateBalancedFormationForPeriod3(
        'p7',
        'p7', 
        prevFormation,
        playerStatsRealistic,
        playerStatsRealistic
      );

      const allPairs = [result.recommendedLeft, result.recommendedRight, result.recommendedSubs];
      
      // Find pairs for playerA and playerB
      const playerAPair = allPairs.find(pair => pair.defender === 'playerA' || pair.attacker === 'playerA');
      const playerBPair = allPairs.find(pair => pair.defender === 'playerB' || pair.attacker === 'playerB');
      
      // Both players should be assigned to pairs
      expect(playerAPair).toBeDefined();
      expect(playerBPair).toBeDefined();
      
      // Expected role assignments based on time balance:
      // playerA: 910 def / 900 att = 1.01 (slightly more defender time) → should play DEFENDER in period 3
      // playerB: 900 def / 910 att = 0.99 (slightly more attacker time) → should play ATTACKER in period 3
      expect(playerAPair?.defender).toBe('playerA');
      expect(playerBPair?.attacker).toBe('playerB');
      
      console.log('Player A pair:', playerAPair);
      console.log('Player B pair:', playerBPair);
    });
  });

  describe('Substitute Recommendations', () => {
    test('should recommend pair with most playing time as substitutes', () => {
      const playerStatsWithTime = [
        createPlayer('p1', 'Player 1', 200, 100, 100),
        createPlayer('p2', 'Player 2', 250, 125, 125),
        createPlayer('p3', 'Player 3', 400, 200, 200), // Most time
        createPlayer('p4', 'Player 4', 180, 90, 90),
        createPlayer('p5', 'Player 5', 220, 110, 110),
        createPlayer('p6', 'Player 6', 190, 95, 95),
        createPlayer('p7', 'Player 7', 0, 0, 0)
      ];

      const result = generateBalancedFormationForPeriod3(
        'p7',
        'p7',
        null, // No previous formation
        playerStatsWithTime,
        playerStatsWithTime
      );

      // p3 should be in the substitute pair
      expect(
        result.recommendedSubs.defender === 'p3' || result.recommendedSubs.attacker === 'p3'
      ).toBe(true);
    });

    test('should recommend first to rotate off among non-substitute pairs', () => {
      const playerStatsWithTime = [
        createPlayer('p1', 'Player 1', 350, 175, 175), // Second highest time
        createPlayer('p2', 'Player 2', 180, 90, 90),
        createPlayer('p3', 'Player 3', 400, 200, 200), // Highest time - should be sub
        createPlayer('p4', 'Player 4', 160, 80, 80),
        createPlayer('p5', 'Player 5', 220, 110, 110),
        createPlayer('p6', 'Player 6', 190, 95, 95),
        createPlayer('p7', 'Player 7', 0, 0, 0)
      ];

      const result = generateBalancedFormationForPeriod3(
        'p7',
        'p7',
        null,
        playerStatsWithTime,
        playerStatsWithTime
      );

      // p3 should be in substitutes
      expect(
        result.recommendedSubs.defender === 'p3' || result.recommendedSubs.attacker === 'p3'
      ).toBe(true);

      // p1 should be in the first to rotate off pair (among non-subs)
      const firstToRotateOffPair = result.firstToSubRec === 'leftPair' 
        ? result.recommendedLeft 
        : result.recommendedRight;
      
      expect(
        firstToRotateOffPair.defender === 'p1' || firstToRotateOffPair.attacker === 'p1'
      ).toBe(true);
    });
  });
});

describe('Formation Generator - Individual Mode', () => {
  // Mock player data for individual modes
  const createIndividualPlayer = (id, name, timeOnField = 0, isInactive = false) => ({
    id,
    name,
    stats: {
      timeOnFieldSeconds: timeOnField,
      timeAsDefenderSeconds: timeOnField / 2,
      timeAsAttackerSeconds: timeOnField / 2,
      timeAsGoalieSeconds: 0,
      isInactive
    }
  });

  // Mock player data for 1-2-1 formation with midfielder time
  const create121Player = (id, name, timeOnField = 0, defenderTime = 0, midfielderTime = 0, attackerTime = 0, isInactive = false) => ({
    id,
    name,
    stats: {
      timeOnFieldSeconds: timeOnField,
      timeAsDefenderSeconds: defenderTime,
      timeAsMidfielderSeconds: midfielderTime,
      timeAsAttackerSeconds: attackerTime,
      timeAsGoalieSeconds: 0,
      isInactive
    }
  });

  describe('Swap-every-rotation pair persistence', () => {
    const basePreviousFormation = {
      goalie: 'g1',
      leftDefender: 'p1',
      rightDefender: 'p2',
      leftAttacker: 'p3',
      rightAttacker: 'p4',
      substitute_1: 'p5',
      substitute_2: 'p6'
    };

    const baseSwapConfig = {
      ...TEAM_CONFIGS.INDIVIDUAL_7,
      pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
    };

    const createSwapSquad = () => {
      const playerBlueprint = [
        { id: 'p1', name: 'Player 1', time: 420, preferredSide: 'left' },
        { id: 'p3', name: 'Player 3', time: 400, preferredSide: 'left' },
        { id: 'p2', name: 'Player 2', time: 410, preferredSide: 'right' },
        { id: 'p4', name: 'Player 4', time: 390, preferredSide: 'right' },
        { id: 'p5', name: 'Player 5', time: 200, preferredSide: 'left' },
        { id: 'p6', name: 'Player 6', time: 190, preferredSide: 'right' },
        { id: 'g1', name: 'Goalie 1', time: 0, preferredSide: null }
      ];

      return playerBlueprint.map(({ id, name, time, preferredSide }) => {
        const base = createIndividualPlayer(id, name, time);
        return {
          ...base,
          stats: {
            ...base.stats,
            preferredSide
          }
        };
      });
    };

    const applyOverrides = (squad, overrides = {}) =>
      squad.map(player => {
        const override = overrides[player.id];
        if (!override) {
          return player;
        }
        return {
          ...player,
          stats: {
            ...player.stats,
            ...override
          }
        };
      });

    test('should swap roles while keeping side pairings when goalie remains the same', () => {
      const squad = createSwapSquad();

      const result = generateIndividualFormationRecommendation(
        'g1',
        squad,
        squad,
        baseSwapConfig,
        '2-2',
        basePreviousFormation
      );

      expect(result.formation.leftDefender).toBe('p3');
      expect(result.formation.leftAttacker).toBe('p1');
      expect(result.formation.rightDefender).toBe('p4');
      expect(result.formation.rightAttacker).toBe('p2');
      expect(new Set([result.formation.substitute_1, result.formation.substitute_2])).toEqual(new Set(['p5', 'p6']));

      expect(result.rotationQueue.slice(0, 2)).toEqual(['p3', 'p4']);
    });

    test('should break only the affected pair when the goalie changes', () => {
      const squad = applyOverrides(createSwapSquad(), {
        g1: { preferredSide: 'right', timeOnFieldSeconds: 180 },
        p4: { preferredSide: 'right' }
      });

      const result = generateIndividualFormationRecommendation(
        'p4',
        squad,
        squad,
        baseSwapConfig,
        '2-2',
        basePreviousFormation
      );

      expect(result.formation.leftDefender).toBe('p3');
      expect(result.formation.leftAttacker).toBe('p1');

      // Right side should contain the orphaned partner (p2) and the ex-goalie (g1) with swapped roles
      expect([result.formation.rightDefender, result.formation.rightAttacker]).toEqual(expect.arrayContaining(['p2', 'g1']));
      expect(result.formation.rightAttacker).toBe('p2');
      expect(result.formation.rightDefender).toBe('g1');
    });
  });

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
