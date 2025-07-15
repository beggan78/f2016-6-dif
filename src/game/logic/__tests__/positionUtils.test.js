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
      expect(getPositionRole(POSITION_KEYS.LEFT_DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
    });

    test('should map attacker positions to ATTACKER role', () => {
      expect(getPositionRole(POSITION_KEYS.LEFT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.LEFT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
      expect(getPositionRole(POSITION_KEYS.RIGHT_ATTACKER)).toBe(PLAYER_ROLES.ATTACKER);
    });

    test('should map substitute positions to SUBSTITUTE role', () => {
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE_1)).toBe(PLAYER_ROLES.SUBSTITUTE);
      expect(getPositionRole(POSITION_KEYS.SUBSTITUTE_2)).toBe(PLAYER_ROLES.SUBSTITUTE);
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
    test('should return correct outfield positions for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          expectedLength: 5,
          expectedPositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER, 
                            POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER, 
                            POSITION_KEYS.SUBSTITUTE_1],
          excludedPositions: [POSITION_KEYS.GOALIE, POSITION_KEYS.SUBSTITUTE_2]
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          expectedLength: 6,
          expectedPositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER,
                            POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER,
                            POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2],
          excludedPositions: [POSITION_KEYS.GOALIE]
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          expectedLength: 3,
          expectedPositions: [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR, POSITION_KEYS.SUB_PAIR],
          excludedPositions: [POSITION_KEYS.GOALIE, POSITION_KEYS.LEFT_DEFENDER]
        }
      ];

      testCases.forEach(({ mode, expectedLength, expectedPositions, excludedPositions }) => {
        const positions = getOutfieldPositions(mode);
        
        expect(positions).toHaveLength(expectedLength);
        expectedPositions.forEach(pos => {
          expect(positions).toContain(pos);
        });
        excludedPositions.forEach(pos => {
          expect(positions).not.toContain(pos);
        });
      });
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
    test('should return only field positions (excluding substitutes) for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          expectedLength: 4,
          expectedPositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER,
                            POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER],
          excludedPositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.GOALIE]
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          expectedLength: 4,
          expectedPositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER,
                            POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER],
          excludedPositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2, POSITION_KEYS.GOALIE]
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          expectedLength: 2,
          expectedPositions: [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR],
          excludedPositions: [POSITION_KEYS.SUB_PAIR, POSITION_KEYS.GOALIE]
        }
      ];

      testCases.forEach(({ mode, expectedLength, expectedPositions, excludedPositions }) => {
        const positions = getFieldPositions(mode);
        
        expect(positions).toHaveLength(expectedLength);
        expectedPositions.forEach(pos => {
          expect(positions).toContain(pos);
        });
        excludedPositions.forEach(pos => {
          expect(positions).not.toContain(pos);
        });
      });
    });

    test('should return empty array for unknown team mode', () => {
      const positions = getFieldPositions('UNKNOWN_TEAM_MODE');
      
      expect(positions).toEqual([]);
    });
  });

  describe('getSubstitutePositions', () => {
    test('should return substitute positions for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          expectedLength: 1,
          expectedPositions: [POSITION_KEYS.SUBSTITUTE_1],
          excludedPositions: [POSITION_KEYS.SUBSTITUTE_2, POSITION_KEYS.SUB_PAIR]
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          expectedLength: 2,
          expectedPositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2],
          excludedPositions: [POSITION_KEYS.SUB_PAIR]
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          expectedLength: 1,
          expectedPositions: [POSITION_KEYS.SUB_PAIR],
          excludedPositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2]
        }
      ];

      testCases.forEach(({ mode, expectedLength, expectedPositions, excludedPositions }) => {
        const positions = getSubstitutePositions(mode);
        
        expect(positions).toHaveLength(expectedLength);
        expectedPositions.forEach(pos => {
          expect(positions).toContain(pos);
        });
        excludedPositions.forEach(pos => {
          expect(positions).not.toContain(pos);
        });
      });
    });

    test('should return empty array for unknown team mode', () => {
      const positions = getSubstitutePositions('UNKNOWN_TEAM_MODE');
      
      expect(positions).toEqual([]);
    });
  });

  describe('isFieldPosition', () => {
    test('should correctly identify field positions for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          fieldPositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER,
                          POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER],
          nonFieldPositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.GOALIE]
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          fieldPositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.RIGHT_DEFENDER,
                          POSITION_KEYS.LEFT_ATTACKER, POSITION_KEYS.RIGHT_ATTACKER],
          nonFieldPositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2, POSITION_KEYS.GOALIE]
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          fieldPositions: [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR],
          nonFieldPositions: [POSITION_KEYS.SUB_PAIR, POSITION_KEYS.GOALIE]
        }
      ];

      testCases.forEach(({ mode, fieldPositions, nonFieldPositions }) => {
        fieldPositions.forEach(position => {
          expect(isFieldPosition(position, mode)).toBe(true);
        });
        nonFieldPositions.forEach(position => {
          expect(isFieldPosition(position, mode)).toBe(false);
        });
      });
    });

    test('should return false for unknown positions or team modes', () => {
      expect(isFieldPosition('unknownPosition', TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isFieldPosition(POSITION_KEYS.LEFT_DEFENDER, 'UNKNOWN_TEAM_MODE')).toBe(false);
    });
  });

  describe('isSubstitutePosition', () => {
    test('should correctly identify substitute positions for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          substitutePositions: [POSITION_KEYS.SUBSTITUTE_1],
          nonSubstitutePositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.GOALIE, POSITION_KEYS.SUBSTITUTE_2]
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          substitutePositions: [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2],
          nonSubstitutePositions: [POSITION_KEYS.LEFT_DEFENDER, POSITION_KEYS.GOALIE]
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          substitutePositions: [POSITION_KEYS.SUB_PAIR],
          nonSubstitutePositions: [POSITION_KEYS.LEFT_PAIR, POSITION_KEYS.RIGHT_PAIR, POSITION_KEYS.GOALIE]
        }
      ];

      testCases.forEach(({ mode, substitutePositions, nonSubstitutePositions }) => {
        substitutePositions.forEach(position => {
          expect(isSubstitutePosition(position, mode)).toBe(true);
        });
        nonSubstitutePositions.forEach(position => {
          expect(isSubstitutePosition(position, mode)).toBe(false);
        });
      });
    });

    test('should return false for unknown positions or team modes', () => {
      expect(isSubstitutePosition('unknownPosition', TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isSubstitutePosition(POSITION_KEYS.SUBSTITUTE_1, 'UNKNOWN_TEAM_MODE')).toBe(false);
    });
  });

  describe('getExpectedCounts', () => {
    test('should return correct counts for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          expectedOutfield: 5, // 4 field + 1 substitute
          expectedOnField: 4   // 4 field players
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          expectedOutfield: 6, // 4 field + 2 substitutes
          expectedOnField: 4   // 4 field players
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          expectedOutfield: 6, // 2 field pairs (4 players) + 1 sub pair (2 players)
          expectedOnField: 4   // 2 field pairs (4 players)
        }
      ];

      testCases.forEach(({ mode, expectedOutfield, expectedOnField }) => {
        const counts = getExpectedCounts(mode);
        
        expect(counts).toBeDefined();
        expect(counts.outfield).toBe(expectedOutfield);
        expect(counts.onField).toBe(expectedOnField);
      });
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
    test('should return outfield count for each team mode', () => {
      // Test using configuration-driven validation
      const testCases = [
        { mode: TEAM_MODES.INDIVIDUAL_6, expectedCount: 5 },
        { mode: TEAM_MODES.INDIVIDUAL_7, expectedCount: 6 },
        { mode: TEAM_MODES.PAIRS_7, expectedCount: 6 }
      ];

      testCases.forEach(({ mode, expectedCount }) => {
        expect(getExpectedOutfieldPlayerCount(mode)).toBe(expectedCount);
      });
    });

    test('should return 0 for unknown team mode', () => {
      expect(getExpectedOutfieldPlayerCount('UNKNOWN_TEAM_MODE')).toBe(0);
      expect(getExpectedOutfieldPlayerCount(null)).toBe(0);
      expect(getExpectedOutfieldPlayerCount(undefined)).toBe(0);
    });
  });

  describe('team mode consistency', () => {
    test('field positions + substitute positions should equal outfield positions', () => {
      // Test consistency across all team modes using configuration
      const allTeamModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8, TEAM_MODES.PAIRS_7];
      
      allTeamModes.forEach(teamMode => {
        const fieldPositions = getFieldPositions(teamMode);
        const substitutePositions = getSubstitutePositions(teamMode);
        const outfieldPositions = getOutfieldPositions(teamMode);
        
        expect(fieldPositions.length + substitutePositions.length).toBe(outfieldPositions.length);
        
        // Check no overlap between field and substitute positions
        const overlap = fieldPositions.filter(pos => substitutePositions.includes(pos));
        expect(overlap).toHaveLength(0);
        
        // Check all positions are accounted for in outfield positions
        [...fieldPositions, ...substitutePositions].forEach(position => {
          expect(outfieldPositions).toContain(position);
        });
      });
    });

    test('all field positions should be identified as field positions', () => {
      // Test position classification consistency across all team modes
      const allTeamModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8, TEAM_MODES.PAIRS_7];
      
      allTeamModes.forEach(teamMode => {
        const fieldPositions = getFieldPositions(teamMode);
        
        fieldPositions.forEach(position => {
          expect(isFieldPosition(position, teamMode)).toBe(true);
          expect(isSubstitutePosition(position, teamMode)).toBe(false);
        });
      });
    });

    test('all substitute positions should be identified as substitute positions', () => {
      // Test substitute position classification consistency across all team modes
      const allTeamModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8, TEAM_MODES.PAIRS_7];
      
      allTeamModes.forEach(teamMode => {
        const substitutePositions = getSubstitutePositions(teamMode);
        
        substitutePositions.forEach(position => {
          expect(isSubstitutePosition(position, teamMode)).toBe(true);
          expect(isFieldPosition(position, teamMode)).toBe(false);
        });
      });
    });
  });
});