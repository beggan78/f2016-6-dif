/**
 * Player Sorting Utils Tests
 * Tests the new architecture that uses player stats instead of formation lookups
 */

import {
  getPlayerCurrentRole,
  getCurrentAttackers,
  getCurrentDefenders,
  sortPlayersByGoalScoringRelevance,
  getPlayerPositionDisplay,
  isPlayerOnField,
  groupPlayersByRole
} from '../playerSortingUtils';
import { TEAM_MODES } from '../../constants/playerConstants';

describe('playerSortingUtils', () => {
  // Test data - Players with stats representing their current roles
  const mockAttackerAlice = { 
    id: 'p1', 
    name: 'Alice',
    stats: {
      currentRole: 'Attacker',
      currentStatus: 'on_field',
      currentPairKey: 'leftAttacker'
    }
  };
  
  const mockAttackerBob = { 
    id: 'p2', 
    name: 'Bob',
    stats: {
      currentRole: 'Attacker',
      currentStatus: 'on_field',
      currentPairKey: 'rightAttacker'
    }
  };
  
  const mockDefenderCharlie = { 
    id: 'p3', 
    name: 'Charlie',
    stats: {
      currentRole: 'Defender',
      currentStatus: 'on_field',
      currentPairKey: 'leftDefender'
    }
  };
  
  const mockDefenderDiana = { 
    id: 'p4', 
    name: 'Diana',
    stats: {
      currentRole: 'Defender',
      currentStatus: 'on_field',
      currentPairKey: 'rightDefender'
    }
  };
  
  const mockGoalieEve = { 
    id: 'p5', 
    name: 'Eve',
    stats: {
      currentRole: 'Goalie',
      currentStatus: 'goalie',
      currentPairKey: 'goalie'
    }
  };
  
  const mockSubstituteFrank = { 
    id: 'p6', 
    name: 'Frank',
    stats: {
      currentRole: 'Substitute',
      currentStatus: 'substitute',
      currentPairKey: 'substitute_1'
    }
  };
  
  const mockSubstituteGrace = { 
    id: 'p7', 
    name: 'Grace',
    stats: {
      currentRole: 'Substitute',
      currentStatus: 'substitute',
      currentPairKey: 'substitute_2'
    }
  };

  const mockPlayers = [
    mockAttackerAlice,
    mockAttackerBob, 
    mockDefenderCharlie,
    mockDefenderDiana,
    mockGoalieEve,
    mockSubstituteFrank,
    mockSubstituteGrace
  ];

  describe('getPlayerCurrentRole', () => {
    test('should get role from player stats data', () => {
      expect(getPlayerCurrentRole(mockAttackerAlice)).toBe('ATTACKER');
      expect(getPlayerCurrentRole(mockAttackerBob)).toBe('ATTACKER');
      expect(getPlayerCurrentRole(mockDefenderCharlie)).toBe('DEFENDER');
      expect(getPlayerCurrentRole(mockDefenderDiana)).toBe('DEFENDER');
      expect(getPlayerCurrentRole(mockGoalieEve)).toBe('GOALIE');
      expect(getPlayerCurrentRole(mockSubstituteFrank)).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole(mockSubstituteGrace)).toBe('SUBSTITUTE');
    });

    test('should handle different role formats', () => {
      const playerWithUpperCase = { 
        stats: { currentRole: 'ATTACKER' }
      };
      const playerWithTitleCase = { 
        stats: { currentRole: 'Attacker' }
      };
      
      expect(getPlayerCurrentRole(playerWithUpperCase)).toBe('ATTACKER');
      expect(getPlayerCurrentRole(playerWithTitleCase)).toBe('ATTACKER');
    });

    test('should handle null/undefined inputs', () => {
      expect(getPlayerCurrentRole(null)).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole({})).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole({ stats: {} })).toBe('SUBSTITUTE');
      expect(getPlayerCurrentRole({ stats: { currentRole: null } })).toBe('SUBSTITUTE');
    });

    test('should default to substitute for unknown roles', () => {
      const playerWithUnknownRole = { 
        stats: { currentRole: 'UNKNOWN_ROLE' }
      };
      expect(getPlayerCurrentRole(playerWithUnknownRole)).toBe('SUBSTITUTE');
    });
  });

  describe('sortPlayersByGoalScoringRelevance', () => {
    test('should sort players by goal scoring priority', () => {
      const shuffledPlayers = [
        mockSubstituteFrank,    // Priority 4
        mockGoalieEve,          // Priority 3
        mockDefenderCharlie,    // Priority 2
        mockAttackerAlice       // Priority 1 (highest)
      ];

      const sorted = sortPlayersByGoalScoringRelevance(shuffledPlayers);
      
      expect(sorted.map(p => p.id)).toEqual(['p1', 'p3', 'p5', 'p6']);
    });

    test('should sort PAIRS_7 mode players correctly', () => {
      const pairsPlayers = [
        { id: 'p1', name: 'Alice', stats: { currentRole: 'Defender', currentPairKey: 'leftPair' }},
        { id: 'p2', name: 'Bob', stats: { currentRole: 'Attacker', currentPairKey: 'leftPair' }},
        { id: 'p3', name: 'Charlie', stats: { currentRole: 'Defender', currentPairKey: 'rightPair' }},
        { id: 'p4', name: 'Diana', stats: { currentRole: 'Attacker', currentPairKey: 'rightPair' }},
        { id: 'p5', name: 'Eve', stats: { currentRole: 'Substitute', currentPairKey: 'subPair' }},
        { id: 'p6', name: 'Frank', stats: { currentRole: 'Substitute', currentPairKey: 'subPair' }},
        { id: 'p7', name: 'Grace', stats: { currentRole: 'Goalie', currentPairKey: 'goalie' }}
      ];

      const sorted = sortPlayersByGoalScoringRelevance(pairsPlayers);
      
      // Should prioritize: Attackers first (p2, p4), then Defenders (p1, p3), then Goalie (p7), then Substitutes (p5, p6)
      expect(sorted.map(p => p.id)).toEqual(['p2', 'p4', 'p1', 'p3', 'p7', 'p5', 'p6']);
    });

    test('should handle PAIRS_7 players with null currentRole (before game initialization)', () => {
      const pairsPlayersWithNullRoles = [
        { id: 'p1', name: 'Alice', stats: { currentRole: null, currentPairKey: 'leftPair' }},
        { id: 'p2', name: 'Bob', stats: { currentRole: null, currentPairKey: 'leftPair' }},
        { id: 'p3', name: 'Charlie', stats: { currentRole: null, currentPairKey: 'rightPair' }},
        { id: 'p4', name: 'Diana', stats: { currentRole: null, currentPairKey: 'rightPair' }},
        { id: 'p5', name: 'Eve', stats: { currentRole: null, currentPairKey: 'subPair' }},
        { id: 'p6', name: 'Frank', stats: { currentRole: null, currentPairKey: 'subPair' }},
        { id: 'p7', name: 'Grace', stats: { currentRole: null, currentPairKey: 'goalie' }}
      ];

      const sorted = sortPlayersByGoalScoringRelevance(pairsPlayersWithNullRoles);
      
      // All should be treated as substitutes and sorted alphabetically
      expect(sorted.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace']);
      
      // All should have SUBSTITUTE role priority  
      sorted.forEach(player => {
        expect(getPlayerCurrentRole(player)).toBe('SUBSTITUTE');
      });
    });

    test('should sort alphabetically within same role category', () => {
      const playersWithSameRoles = [
        { id: 'p2', name: 'Zoe', stats: { currentRole: 'Attacker' }},
        { id: 'p1', name: 'Alice', stats: { currentRole: 'Attacker' }},
        { id: 'p4', name: 'Diana', stats: { currentRole: 'Defender' }},
        { id: 'p3', name: 'Bob', stats: { currentRole: 'Defender' }}
      ];

      const sorted = sortPlayersByGoalScoringRelevance(playersWithSameRoles);
      
      // Should be attackers first (Alice, Zoe), then defenders (Bob, Diana)
      expect(sorted.map(p => p.name)).toEqual(['Alice', 'Zoe', 'Bob', 'Diana']);
    });

    test('should handle empty player array', () => {
      expect(sortPlayersByGoalScoringRelevance([])).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(sortPlayersByGoalScoringRelevance(null)).toBeNull();
      expect(sortPlayersByGoalScoringRelevance(undefined)).toBeUndefined();
    });

    test('should not mutate original array', () => {
      const originalPlayers = [mockSubstituteFrank, mockAttackerAlice];
      const originalOrder = originalPlayers.map(p => p.id);
      
      sortPlayersByGoalScoringRelevance(originalPlayers);
      
      expect(originalPlayers.map(p => p.id)).toEqual(originalOrder);
    });
  });

  describe('getPlayerPositionDisplay', () => {
    test('should return correct position names from player data', () => {
      expect(getPlayerPositionDisplay(mockAttackerAlice)).toBe('Left Attacker');
      expect(getPlayerPositionDisplay(mockAttackerBob)).toBe('Right Attacker');
      expect(getPlayerPositionDisplay(mockDefenderCharlie)).toBe('Left Defender');
      expect(getPlayerPositionDisplay(mockDefenderDiana)).toBe('Right Defender');
      expect(getPlayerPositionDisplay(mockGoalieEve)).toBe('Goalie');
      expect(getPlayerPositionDisplay(mockSubstituteFrank)).toBe('Substitute 1');
      expect(getPlayerPositionDisplay(mockSubstituteGrace)).toBe('Substitute 2');
    });

    test('should handle different substitute positions', () => {
      const sub3Player = { 
        stats: { currentPairKey: 'substitute_3' }
      };
      const genericSubPlayer = { 
        stats: { currentPairKey: 'substitute' }
      };
      
      expect(getPlayerPositionDisplay(sub3Player)).toBe('Substitute 3');
      expect(getPlayerPositionDisplay(genericSubPlayer)).toBe('Substitute');
    });

    test('should handle PAIRS_7 mode position names with role-based display', () => {
      const leftPairDefender = { 
        stats: { currentPairKey: 'leftPair', currentRole: 'Defender' }
      };
      const leftPairAttacker = { 
        stats: { currentPairKey: 'leftPair', currentRole: 'Attacker' }
      };
      const rightPairDefender = { 
        stats: { currentPairKey: 'rightPair', currentRole: 'Defender' }
      };
      const rightPairAttacker = { 
        stats: { currentPairKey: 'rightPair', currentRole: 'Attacker' }
      };
      const subPairDefender = { 
        stats: { currentPairKey: 'subPair', currentRole: 'Defender' }
      };
      const subPairAttacker = { 
        stats: { currentPairKey: 'subPair', currentRole: 'Attacker' }
      };
      
      expect(getPlayerPositionDisplay(leftPairDefender)).toBe('Left Defender');
      expect(getPlayerPositionDisplay(leftPairAttacker)).toBe('Left Attacker');
      expect(getPlayerPositionDisplay(rightPairDefender)).toBe('Right Defender');
      expect(getPlayerPositionDisplay(rightPairAttacker)).toBe('Right Attacker');
      expect(getPlayerPositionDisplay(subPairDefender)).toBe('Sub Defender');
      expect(getPlayerPositionDisplay(subPairAttacker)).toBe('Sub Attacker');
    });

    test('should handle null/undefined inputs', () => {
      expect(getPlayerPositionDisplay(null)).toBe('Substitute');
      expect(getPlayerPositionDisplay({})).toBe('Substitute');
      expect(getPlayerPositionDisplay({ stats: {} })).toBe('Substitute');
    });
  });

  describe('isPlayerOnField', () => {
    test('should correctly identify field players', () => {
      expect(isPlayerOnField(mockAttackerAlice)).toBe(true);
      expect(isPlayerOnField(mockDefenderCharlie)).toBe(true);
      expect(isPlayerOnField(mockGoalieEve)).toBe(true);
      expect(isPlayerOnField(mockSubstituteFrank)).toBe(false);
      expect(isPlayerOnField(mockSubstituteGrace)).toBe(false);
    });

    test('should handle different status values', () => {
      const inactivePlayer = { 
        stats: { currentStatus: 'inactive' }
      };
      
      expect(isPlayerOnField(inactivePlayer)).toBe(false);
    });

    test('should handle null/undefined inputs', () => {
      expect(isPlayerOnField(null)).toBe(false);
      expect(isPlayerOnField({})).toBe(false);
      expect(isPlayerOnField({ stats: {} })).toBe(false);
    });
  });

  describe('groupPlayersByRole', () => {
    test('should group players correctly by role', () => {
      const groups = groupPlayersByRole(mockPlayers);
      
      expect(groups.attackers.map(p => p.id)).toEqual(['p1', 'p2']);
      expect(groups.defenders.map(p => p.id)).toEqual(['p3', 'p4']);
      expect(groups.goalie.map(p => p.id)).toEqual(['p5']);
      expect(groups.substitutes.map(p => p.id)).toEqual(['p6', 'p7']);
    });

    test('should handle null players array', () => {
      const groups = groupPlayersByRole(null);
      expect(groups.attackers).toEqual([]);
      expect(groups.defenders).toEqual([]);
      expect(groups.goalie).toEqual([]);
      expect(groups.substitutes).toEqual([]);
    });

    test('should handle empty players array', () => {
      const groups = groupPlayersByRole([]);
      expect(groups.attackers).toEqual([]);
      expect(groups.defenders).toEqual([]);
      expect(groups.goalie).toEqual([]);
      expect(groups.substitutes).toEqual([]);
    });
  });

  // Legacy functions that still use formation data (not changed in this refactor)
  describe('Legacy formation-based functions', () => {
    const mockFormation = {
      leftAttacker: 'p1',
      rightAttacker: 'p2',
      leftDefender: 'p3',
      rightDefender: 'p4',
      goalie: 'p5'
    };

    describe('getCurrentAttackers', () => {
      test('should get attackers from formation', () => {
        const attackers = getCurrentAttackers(mockFormation, TEAM_MODES.INDIVIDUAL_7);
        expect(attackers).toEqual(['p1', 'p2']);
      });

      test('should handle missing formation', () => {
        expect(getCurrentAttackers(null, TEAM_MODES.INDIVIDUAL_7)).toEqual([]);
      });
    });

    describe('getCurrentDefenders', () => {
      test('should get defenders from formation', () => {
        const defenders = getCurrentDefenders(mockFormation, TEAM_MODES.INDIVIDUAL_7);
        expect(defenders).toEqual(['p3', 'p4']);
      });

      test('should handle missing formation', () => {
        expect(getCurrentDefenders(null, TEAM_MODES.INDIVIDUAL_7)).toEqual([]);
      });
    });
  });
});