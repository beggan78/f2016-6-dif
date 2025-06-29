/**
 * Unit tests for position utility functions
 * Tests position-to-role mapping and formation structure queries
 */

import {
  getPositionRole,
  getOutfieldPositions,
  getFieldPositions,
  getSubstitutePositions,
  isFieldPosition,
  isSubstitutePosition,
  getExpectedCounts,
  getExpectedOutfieldPlayerCount
} from '../positionUtils';

import { TEAM_MODES, PLAYER_ROLES } from '../../../constants/playerConstants';
import { POSITION_KEYS } from '../../../constants/positionConstants';

describe('positionUtils', () => {
  describe('getPositionRole', () => {
    test('should map defender positions to DEFENDER role', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.LEFT_DEFENDER_7)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_DEFENDER_7)).toBe(PLAYER_ROLES.DEFENDER);
    });

    test('should map attacker positions to ATTACKER role', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.LEFT_ATTACKER_7)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_ATTACKER_7)).toBe(PLAYER_ROLES.ATTACKER);
    });

    test('should map substitute positions to SUBSTITUTE role', () => {
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE)).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE_7_1)).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE_7_2)).toBe(PLAYER_ROLES.SUBSTITUTE);
    });

    test('should map goalie position to GOALIE role', () => {
      expect(getPositionRole(POSITION_KEYS.GOALIE)).toBe(PLAYER_ROLES.GOALIE);
    });

    test('should return null for unknown positions', () => {
      expect(getPositionRole('unknownPosition')).toBeNull();
      expect(getPositionRole(null)).toBeNull();
      expect(getPositionRole(undefined)).toBeNull();
      expect(getPositionRole('')).toBeNull();
    });

    test('should handle pair positions (no direct role mapping)', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_PAIR)).toBeNull();
      expect(getPositionRole(POSITION_KEYS.RIGHT_PAIR)).toBeNull();
      expect(getPositionRole(POSITION_KEYS.SUB_PAIR)).toBeNull();
    });
  });

  describe('getOutfieldPositions', () => {
    test('should return all outfield positions for INDIVIDUAL_6', () => {
      const positions = getOutfieldPositions(TEAM_MODES.INDIVIDUAL_6);
      
      expect(positions).toHaveLength(5);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return all outfield positions for INDIVIDUAL_7', () => {
      const positions = getOutfieldPositions(TEAM_MODES.INDIVIDUAL_7);
      
      expect(positions).toHaveLength(6);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER_7);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_1);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_2);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return all outfield positions for PAIRS_7', () => {
      const positions = getOutfieldPositions(TEAM_MODES.PAIRS_7);
      
      expect(positions).toHaveLength(3);
      expect(positions).toContain(POSITION_KEYS.LEFT_PAIR);
      expect(positions).toContain(POSITION_KEYS.RIGHT_PAIR);
      expect(positions).toContain(POSITION_KEYS.SUB_PAIR);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return empty array for unknown team mode', () => {
      const positions = getOutfieldPositions('UNKNOWN_TEAM_MODE');
      
      expect(positions).toEqual([]);
    });

    test('should return empty array for null/undefined team mode', () => {
      expect(getOutfieldPositions(null)).toEqual([]);
      expect(getOutfieldPositions(undefined)).toEqual([]);
    });
  });

  describe('getFieldPositions', () => {
    test('should return only field positions for INDIVIDUAL_6 (excluding substitutes)', () => {
      const positions = getFieldPositions(TEAM_MODES.INDIVIDUAL_6);
      
      expect(positions).toHaveLength(4);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER);
      expect(positions).not.toContain(POSITION_KEYS.SUBSTITUTE);
      expect(positions).not.toContain(POSITION_KEYS.GOALIE);
    });

    test('should return only field positions for INDIVIDUAL_7', () => {
      const positions = getFieldPositions(TEAM_MODES.INDIVIDUAL_7);
      
      expect(positions).toHaveLength(4);
      expect(positions).toContain(POSITION_KEYS.LEFT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_DEFENDER_7);
      expect(positions).toContain(POSITION_KEYS.LEFT_ATTACKER_7);
      expect(positions).toContain(POSITION_KEYS.RIGHT_ATTACKER_7);
      expect(positions).not.toContain(POSITION_KEYS.SUBSTITUTE_7_1);
      expect(positions).not.toContain(POSITION_KEYS.SUBSTITUTE_7_2);
    });

    test('should return only playing pairs for PAIRS_7', () => {
      const positions = getFieldPositions(TEAM_MODES.PAIRS_7);
      
      expect(positions).toHaveLength(2);
      expect(positions).toContain(POSITION_KEYS.LEFT_PAIR);
      expect(positions).toContain(POSITION_KEYS.RIGHT_PAIR);
      expect(positions).not.toContain(POSITION_KEYS.SUB_PAIR);
    });

    test('should return empty array for unknown team mode', () => {
      const positions = getFieldPositions('UNKNOWN_TEAM_MODE');
      
      expect(positions).toEqual([]);
    });
  });

  describe('getSubstitutePositions', () => {
    test('should return substitute positions for INDIVIDUAL_6', () => {
      const positions = getSubstitutePositions(TEAM_MODES.INDIVIDUAL_6);
      
      expect(positions).toHaveLength(1);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE);
    });

    test('should return substitute positions for INDIVIDUAL_7', () => {
      const positions = getSubstitutePositions(TEAM_MODES.INDIVIDUAL_7);
      
      expect(positions).toHaveLength(2);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_1);
      expect(positions).toContain(POSITION_KEYS.SUBSTITUTE_7_2);
    });

    test('should return substitute pair for PAIRS_7', () => {
      const positions = getSubstitutePositions(TEAM_MODES.PAIRS_7);
      
      expect(positions).toHaveLength(1);
      expect(positions).toContain(POSITION_KEYS.SUB_PAIR);
    });

    test('should return empty array for unknown team mode', () => {
      const positions = getSubstitutePositions('UNKNOWN_TEAM_MODE');
      
      expect(positions).toEqual([]);
    });
  });

  describe('isFieldPosition', () => {
    test('should correctly identify field positions in INDIVIDUAL_6', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER, TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_DEFENDER, TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.LEFT_ATTACKER, TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_ATTACKER, TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      
      expect(isFieldPosition(POSITION_KEYS.SUBSTITUTE, TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.GOALIE, TEAM_MODES.INDIVIDUAL_6)).toBe(false);
    });

    test('should correctly identify field positions in INDIVIDUAL_7', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER_7, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_DEFENDER_7, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.LEFT_ATTACKER_7, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_ATTACKER_7, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      
      expect(isFieldPosition(POSITION_KEYS.SUBSTITUTE_7_1, TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.SUBSTITUTE_7_2, TEAM_MODES.INDIVIDUAL_7)).toBe(false);
    });

    test('should correctly identify playing pairs in PAIRS_7', () => {
      expect(isFieldPosition(POSITION_KEYS.LEFT_PAIR, TEAM_MODES.PAIRS_7)).toBe(true);
      expect(isFieldPosition(POSITION_KEYS.RIGHT_PAIR, TEAM_MODES.PAIRS_7)).toBe(true);
      
      expect(isFieldPosition(POSITION_KEYS.SUB_PAIR, TEAM_MODES.PAIRS_7)).toBe(false);
    });

    test('should return false for unknown positions or team modes', () => {
      expect(isFieldPosition('unknownPosition', TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER, 'UNKNOWN_TEAM_MODE')).toBe(false);
    });
  });

  describe('isSubstitutePosition', () => {
    test('should correctly identify substitute positions in INDIVIDUAL_6', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE, TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      
      expect(isSubstitutePosition(POSITION_KEYS.LEFT_DEFENDER, TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.GOALIE, TEAM_MODES.INDIVIDUAL_6)).toBe(false);
    });

    test('should correctly identify substitute positions in INDIVIDUAL_7', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_7_1, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_7_2, TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      
      expect(isSubstitutePosition(POSITION_KEYS.LEFT_DEFENDER_7, TEAM_MODES.INDIVIDUAL_7)).toBe(false);
    });

    test('should correctly identify substitute pair in PAIRS_7', () => {
      expect(isSubstitutePosition(POSITION_KEYS.SUB_PAIR, TEAM_MODES.PAIRS_7)).toBe(true);
      
      expect(isSubstitutePosition(POSITION_KEYS.LEFT_PAIR, TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.RIGHT_PAIR, TEAM_MODES.PAIRS_7)).toBe(false);
    });

    test('should return false for unknown positions or team modes', () => {
      expect(isSubstitutePosition('unknownPosition', TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE, 'UNKNOWN_TEAM_MODE')).toBe(false);
    });
  });

  describe('getExpectedCounts', () => {
    test('should return correct counts for INDIVIDUAL_6', () => {
      const counts = getExpectedCounts(TEAM_MODES.INDIVIDUAL_6);
      
      expect(counts).toBeDefined();
      expect(counts.outfield).toBe(5); // 4 field + 1 substitute
      expect(counts.onField).toBe(4); // 4 field players
    });

    test('should return correct counts for INDIVIDUAL_7', () => {
      const counts = getExpectedCounts(TEAM_MODES.INDIVIDUAL_7);
      
      expect(counts).toBeDefined();
      expect(counts.outfield).toBe(6); // 4 field + 2 substitutes
      expect(counts.onField).toBe(4); // 4 field players
    });

    test('should return correct counts for PAIRS_7', () => {
      const counts = getExpectedCounts(TEAM_MODES.PAIRS_7);
      
      expect(counts).toBeDefined();
      expect(counts.outfield).toBe(6); // 2 field pairs (4 players) + 1 sub pair (2 players)
      expect(counts.onField).toBe(4); // 2 field pairs (4 players)
    });

    test('should return default counts for unknown team mode', () => {
      const counts = getExpectedCounts('UNKNOWN_TEAM_MODE');
      
      expect(counts).toEqual({ outfield: 0, onField: 0 });
    });

    test('should handle null/undefined team mode', () => {
      expect(getExpectedCounts(null)).toEqual({ outfield: 0, onField: 0 });
      expect(getExpectedCounts(undefined)).toEqual({ outfield: 0, onField: 0 });
    });
  });

  describe('getExpectedOutfieldPlayerCount', () => {
    test('should return outfield count for valid team modes', () => {
      expect(getExpectedOutfieldPlayerCount(TEAM_MODES.INDIVIDUAL_6)).toBe(5);
      expect(getExpectedOutfieldPlayerCount(TEAM_MODES.INDIVIDUAL_7)).toBe(6);
      expect(getExpectedOutfieldPlayerCount(TEAM_MODES.PAIRS_7)).toBe(6);
    });

    test('should return 0 for unknown team mode', () => {
      expect(getExpectedOutfieldPlayerCount('UNKNOWN_TEAM_MODE')).toBe(0);
      expect(getExpectedOutfieldPlayerCount(null)).toBe(0);
      expect(getExpectedOutfieldPlayerCount(undefined)).toBe(0);
    });
  });

  describe('team mode consistency', () => {
    test('field positions + substitute positions should equal outfield positions for individual team modes', () => {
      [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7].forEach(teamMode => {
        const fieldPositions = getFieldPositions(teamMode);
        const substitutePositions = getSubstitutePositions(teamMode);
        const outfieldPositions = getOutfieldPositions(teamMode);
        
        expect(fieldPositions.length + substitutePositions.length).toBe(outfieldPositions.length);
        
        // Check no overlap
        const overlap = fieldPositions.filter(pos => substitutePositions.includes(pos));
        expect(overlap).toHaveLength(0);
      });
    });

    test('all field positions should be identified as field positions', () => {
      [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.PAIRS_7].forEach(teamMode => {
        const fieldPositions = getFieldPositions(teamMode);
        
        fieldPositions.forEach(position => {
          expect(isFieldPosition(position, teamMode)).toBe(true);
          expect(isSubstitutePosition(position, teamMode)).toBe(false);
        });
      });
    });

    test('all substitute positions should be identified as substitute positions', () => {
      [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.PAIRS_7].forEach(teamMode => {
        const substitutePositions = getSubstitutePositions(teamMode);
        
        substitutePositions.forEach(position => {
          expect(isSubstitutePosition(position, teamMode)).toBe(true);
          expect(isFieldPosition(position, teamMode)).toBe(false);
        });
      });
    });
  });
});