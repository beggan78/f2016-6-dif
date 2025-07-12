/**
 * Tests for MODE_DEFINITIONS configuration and related utilities
 * Validates that the consolidated configuration is consistent and complete
 */

import { 
  MODE_DEFINITIONS,
  POSITION_ROLE_MAP,
  getFormationPositions,
  getFormationPositionsWithGoalie,
  getInitialFormationTemplate,
  getValidationMessage,
  getOutfieldPositions,
  supportsInactiveUsers,
  supportsNextNextIndicators,
  getAllPositions,
  getAllOutfieldPositions,
  getValidPositions,
  initializePlayerRoleAndStatus
} from '../gameModes';

import { TEAM_MODES, PLAYER_ROLES } from '../playerConstants';

describe('MODE_DEFINITIONS Configuration', () => {
  describe('configuration structure validation', () => {
    test('should have definitions for all team modes', () => {
      const expectedModes = [TEAM_MODES.PAIRS_7, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      
      expectedModes.forEach(mode => {
        expect(MODE_DEFINITIONS).toHaveProperty(mode);
        expect(MODE_DEFINITIONS[mode]).toBeDefined();
      });
    });

    test('should have consistent structure across all modes', () => {
      Object.values(MODE_DEFINITIONS).forEach(definition => {
        expect(definition).toHaveProperty('positions');
        expect(definition).toHaveProperty('expectedCounts');
        expect(definition).toHaveProperty('positionOrder');
        expect(definition).toHaveProperty('fieldPositions');
        expect(definition).toHaveProperty('substitutePositions');
        
        expect(Array.isArray(definition.positionOrder)).toBe(true);
        expect(Array.isArray(definition.fieldPositions)).toBe(true);
        expect(Array.isArray(definition.substitutePositions)).toBe(true);
        
        expect(typeof definition.expectedCounts.outfield).toBe('number');
        expect(typeof definition.expectedCounts.onField).toBe('number');
      });
    });

    test('should have consistent position definitions', () => {
      Object.entries(MODE_DEFINITIONS).forEach(([mode, definition]) => {
        // All positions in positionOrder should exist in positions object
        definition.positionOrder.forEach(position => {
          expect(definition.positions).toHaveProperty(position);
        });
        
        // Field and substitute positions should be subsets of positionOrder
        definition.fieldPositions.forEach(position => {
          expect(definition.positionOrder).toContain(position);
        });
        
        definition.substitutePositions.forEach(position => {
          expect(definition.positionOrder).toContain(position);
        });
        
        // No overlap between field and substitute positions
        const overlap = definition.fieldPositions.filter(pos => 
          definition.substitutePositions.includes(pos)
        );
        expect(overlap).toHaveLength(0);
      });
    });

    test('should have valid individual mode configurations', () => {
      const individualModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      
      individualModes.forEach(mode => {
        const definition = MODE_DEFINITIONS[mode];
        
        // Should have required properties for individual modes
        expect(definition).toHaveProperty('supportsInactiveUsers');
        expect(definition).toHaveProperty('supportsNextNextIndicators'); 
        expect(definition).toHaveProperty('substituteRotationPattern');
        expect(definition).toHaveProperty('initialFormationTemplate');
        expect(definition).toHaveProperty('validationMessage');
        
        // Should have exactly 4 field positions (standard soccer formation)
        expect(definition.fieldPositions).toHaveLength(4);
        
        // Should include standard field positions
        expect(definition.fieldPositions).toContain('leftDefender');
        expect(definition.fieldPositions).toContain('rightDefender');
        expect(definition.fieldPositions).toContain('leftAttacker');
        expect(definition.fieldPositions).toContain('rightAttacker');
      });
    });

    test('should have correct expected counts', () => {
      const testCases = [
        {
          mode: TEAM_MODES.INDIVIDUAL_6,
          expectedOutfield: 5,
          expectedOnField: 4
        },
        {
          mode: TEAM_MODES.INDIVIDUAL_7,
          expectedOutfield: 6,
          expectedOnField: 4
        },
        {
          mode: TEAM_MODES.PAIRS_7,
          expectedOutfield: 6,
          expectedOnField: 4
        }
      ];
      
      testCases.forEach(({ mode, expectedOutfield, expectedOnField }) => {
        const definition = MODE_DEFINITIONS[mode];
        expect(definition.expectedCounts.outfield).toBe(expectedOutfield);
        expect(definition.expectedCounts.onField).toBe(expectedOnField);
      });
    });
  });

  describe('POSITION_ROLE_MAP', () => {
    test('should map all individual mode positions to roles', () => {
      const expectedMappings = {
        goalie: PLAYER_ROLES.GOALIE,
        leftDefender: PLAYER_ROLES.DEFENDER,
        rightDefender: PLAYER_ROLES.DEFENDER,
        leftAttacker: PLAYER_ROLES.ATTACKER,
        rightAttacker: PLAYER_ROLES.ATTACKER,
        substitute_1: PLAYER_ROLES.SUBSTITUTE,
        substitute_2: PLAYER_ROLES.SUBSTITUTE
      };
      
      Object.entries(expectedMappings).forEach(([position, expectedRole]) => {
        expect(POSITION_ROLE_MAP[position]).toBe(expectedRole);
      });
    });

    test('should not have mappings for pair positions', () => {
      const pairPositions = ['leftPair', 'rightPair', 'subPair'];
      
      pairPositions.forEach(position => {
        expect(POSITION_ROLE_MAP).not.toHaveProperty(position);
      });
    });
  });

  describe('utility functions', () => {
    test('getFormationPositions should exclude goalie', () => {
      Object.keys(MODE_DEFINITIONS).forEach(mode => {
        const positions = getFormationPositions(mode);
        expect(positions).not.toContain('goalie');
        
        const definition = MODE_DEFINITIONS[mode];
        const expectedLength = definition.positionOrder.length - 1; // minus goalie
        expect(positions).toHaveLength(expectedLength);
      });
    });

    test('getFormationPositionsWithGoalie should include goalie', () => {
      Object.keys(MODE_DEFINITIONS).forEach(mode => {
        const positions = getFormationPositionsWithGoalie(mode);
        expect(positions).toContain('goalie');
        
        const definition = MODE_DEFINITIONS[mode];
        expect(positions).toHaveLength(definition.positionOrder.length);
      });
    });

    test('getInitialFormationTemplate should create valid templates', () => {
      const individualModes = [TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      
      individualModes.forEach(mode => {
        const template = getInitialFormationTemplate(mode);
        const definition = MODE_DEFINITIONS[mode];
        
        // Should have all required positions
        Object.keys(definition.initialFormationTemplate).forEach(position => {
          expect(template).toHaveProperty(position);
        });
        
        // All positions should initially be null
        Object.values(template).forEach(value => {
          expect(value).toBeNull();
        });
      });
    });

    test('getInitialFormationTemplate should set goalie when provided', () => {
      const mode = TEAM_MODES.INDIVIDUAL_7;
      const goalieId = 'test-goalie';
      
      const template = getInitialFormationTemplate(mode, goalieId);
      expect(template.goalie).toBe(goalieId);
    });

    test('individual mode support functions should be accurate', () => {
      expect(supportsInactiveUsers(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(supportsInactiveUsers(TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(supportsInactiveUsers(TEAM_MODES.PAIRS_7)).toBe(false);
      
      expect(supportsNextNextIndicators(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(supportsNextNextIndicators(TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(supportsNextNextIndicators(TEAM_MODES.PAIRS_7)).toBe(false);
    });

    test('should handle unknown team modes gracefully', () => {
      const unknownMode = 'UNKNOWN_MODE';
      
      expect(getFormationPositions(unknownMode)).toEqual([]);
      expect(getFormationPositionsWithGoalie(unknownMode)).toEqual([]);
      expect(getOutfieldPositions(unknownMode)).toEqual([]);
      expect(getAllPositions(unknownMode)).toEqual([]);
      expect(getValidPositions(unknownMode)).toEqual([]);
      expect(supportsInactiveUsers(unknownMode)).toBe(false);
      expect(supportsNextNextIndicators(unknownMode)).toBe(false);
    });
  });

  describe('initializePlayerRoleAndStatus', () => {
    test('should initialize player status correctly for individual modes', () => {
      const mockFormation = {
        leftDefender: 'p1',
        rightDefender: 'p2', 
        leftAttacker: 'p3',
        rightAttacker: 'p4',
        substitute_1: 'p5',
        substitute_2: 'p6',
        goalie: 'p7'
      };
      
      const testCases = [
        { playerId: 'p1', expectedRole: PLAYER_ROLES.DEFENDER, expectedStatus: 'on_field' },
        { playerId: 'p3', expectedRole: PLAYER_ROLES.ATTACKER, expectedStatus: 'on_field' },
        { playerId: 'p5', expectedRole: PLAYER_ROLES.SUBSTITUTE, expectedStatus: 'substitute' },
        { playerId: 'p7', expectedRole: PLAYER_ROLES.GOALIE, expectedStatus: 'goalie' }
      ];
      
      testCases.forEach(({ playerId, expectedRole, expectedStatus }) => {
        const result = initializePlayerRoleAndStatus(playerId, mockFormation, TEAM_MODES.INDIVIDUAL_7);
        expect(result.role).toBe(expectedRole);
        expect(result.status).toBe(expectedStatus);
      });
    });

    test('should handle pairs mode correctly', () => {
      const mockFormation = {
        leftPair: { defender: 'p1', attacker: 'p2' },
        rightPair: { defender: 'p3', attacker: 'p4' },
        subPair: { defender: 'p5', attacker: 'p6' },
        goalie: 'p7'
      };
      
      const testCases = [
        { playerId: 'p1', expectedRole: PLAYER_ROLES.DEFENDER, expectedStatus: 'on_field' },
        { playerId: 'p2', expectedRole: PLAYER_ROLES.ATTACKER, expectedStatus: 'on_field' },
        { playerId: 'p5', expectedRole: PLAYER_ROLES.DEFENDER, expectedStatus: 'substitute' },
        { playerId: 'p6', expectedRole: PLAYER_ROLES.ATTACKER, expectedStatus: 'substitute' },
        { playerId: 'p7', expectedRole: PLAYER_ROLES.GOALIE, expectedStatus: 'goalie' }
      ];
      
      testCases.forEach(({ playerId, expectedRole, expectedStatus }) => {
        const result = initializePlayerRoleAndStatus(playerId, mockFormation, TEAM_MODES.PAIRS_7);
        expect(result.role).toBe(expectedRole);
        expect(result.status).toBe(expectedStatus);
      });
    });

    test('should return nulls for unknown players or modes', () => {
      const mockFormation = { goalie: 'p1' };
      
      const result = initializePlayerRoleAndStatus('unknown', mockFormation, TEAM_MODES.INDIVIDUAL_7);
      expect(result.role).toBeNull();
      expect(result.status).toBeNull();
      expect(result.pairKey).toBeNull();
    });
  });

  describe('configuration edge cases', () => {
    test('should maintain consistency between individual modes', () => {
      const individual6 = MODE_DEFINITIONS[TEAM_MODES.INDIVIDUAL_6];
      const individual7 = MODE_DEFINITIONS[TEAM_MODES.INDIVIDUAL_7];
      
      // Field positions should be identical
      expect(individual6.fieldPositions).toEqual(individual7.fieldPositions);
      
      // OnField count should be the same
      expect(individual6.expectedCounts.onField).toBe(individual7.expectedCounts.onField);
      
      // Should both have goalie position
      expect(individual6.positionOrder).toContain('goalie');
      expect(individual7.positionOrder).toContain('goalie');
    });

    test('should have correct substitute counts', () => {
      expect(MODE_DEFINITIONS[TEAM_MODES.INDIVIDUAL_6].substitutePositions).toHaveLength(1);
      expect(MODE_DEFINITIONS[TEAM_MODES.INDIVIDUAL_7].substitutePositions).toHaveLength(2);
      expect(MODE_DEFINITIONS[TEAM_MODES.PAIRS_7].substitutePositions).toHaveLength(1);
    });
  });
});