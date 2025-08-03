/**
 * Tests for game mode configuration and related utilities
 * Validates that the dynamic configuration system is consistent and complete
 */

import { 
  getModeDefinition,
  POSITION_ROLE_MAP,
  getFormationPositions,
  getFormationPositionsWithGoalie,
  getInitialFormationTemplate,
  getValidationMessage,
  getOutfieldPositions,
  supportsInactiveUsers,
  supportsNextNextIndicators,
  getAllPositions,
  getValidPositions,
  initializePlayerRoleAndStatus,
  isIndividualMode,
  getPlayerCountForMode,
  isIndividual5Mode,
  isIndividual6Mode,
  isIndividual7Mode,
  isIndividual8Mode,
  isIndividual9Mode,
  isIndividual10Mode
} from '../gameModes';

import { TEAM_MODES, PLAYER_ROLES } from '../playerConstants';
import { createTeamConfig, SUBSTITUTION_TYPES, FORMATIONS } from '../teamConfiguration';

describe('Game Mode Configuration', () => {
  describe('Legacy compatibility', () => {
    test('should work with legacy team mode strings via utility functions', () => {
      const expectedModes = [TEAM_MODES.PAIRS_7, TEAM_MODES.INDIVIDUAL_5, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7, TEAM_MODES.INDIVIDUAL_8, TEAM_MODES.INDIVIDUAL_9, TEAM_MODES.INDIVIDUAL_10];
      
      expectedModes.forEach(mode => {
        // Test that legacy modes work through utility functions
        const positions = getFormationPositions(mode);
        expect(Array.isArray(positions)).toBe(true);
        expect(positions.length).toBeGreaterThan(0);
      });
    });

    test('getModeDefinition should return consistent structure for team configs', () => {
      const testConfigs = [
        createTeamConfig('5v5', 7, '2-2', 'pairs'),
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual'),
        createTeamConfig('5v5', 8, '2-2', 'individual'),
        createTeamConfig('5v5', 9, '2-2', 'individual'),
        createTeamConfig('5v5', 10, '2-2', 'individual')
      ];
      
      testConfigs.forEach(config => {
        const definition = getModeDefinition(config);
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

    test('getModeDefinition should have consistent position definitions', () => {
      const testConfigs = [
        createTeamConfig('5v5', 7, '2-2', 'pairs'),
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual'),
        createTeamConfig('5v5', 8, '2-2', 'individual'),
        createTeamConfig('5v5', 9, '2-2', 'individual'),
        createTeamConfig('5v5', 10, '2-2', 'individual')
      ];
      
      testConfigs.forEach(config => {
        const definition = getModeDefinition(config);
        
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
      const individualConfigs = [
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual'),
        createTeamConfig('5v5', 8, '2-2', 'individual'),
        createTeamConfig('5v5', 9, '2-2', 'individual'),
        createTeamConfig('5v5', 10, '2-2', 'individual')
      ];
      
      individualConfigs.forEach(config => {
        const definition = getModeDefinition(config);
        
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
          config: createTeamConfig('5v5', 5, '2-2', 'individual'),
          expectedOutfield: 4,
          expectedOnField: 4
        },
        {
          config: createTeamConfig('5v5', 6, '2-2', 'individual'),
          expectedOutfield: 5,
          expectedOnField: 4
        },
        {
          config: createTeamConfig('5v5', 7, '2-2', 'individual'),
          expectedOutfield: 6,
          expectedOnField: 4
        },
        {
          config: createTeamConfig('5v5', 8, '2-2', 'individual'),
          expectedOutfield: 7,
          expectedOnField: 4
        },
        {
          config: createTeamConfig('5v5', 9, '2-2', 'individual'),
          expectedOutfield: 8,
          expectedOnField: 4
        },
        {
          config: createTeamConfig('5v5', 10, '2-2', 'individual'),
          expectedOutfield: 9,
          expectedOnField: 4
        },
        {
          config: createTeamConfig('5v5', 7, '2-2', 'pairs'),
          expectedOutfield: 6,
          expectedOnField: 4
        }
      ];
      
      testCases.forEach(({ config, expectedOutfield, expectedOnField }) => {
        const definition = getModeDefinition(config);
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
        substitute_2: PLAYER_ROLES.SUBSTITUTE,
        substitute_3: PLAYER_ROLES.SUBSTITUTE,
        substitute_4: PLAYER_ROLES.SUBSTITUTE,
        substitute_5: PLAYER_ROLES.SUBSTITUTE
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
      const testConfigs = [
        createTeamConfig('5v5', 7, '2-2', 'pairs'),
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual')
      ];
      
      testConfigs.forEach(config => {
        const positions = getFormationPositions(config);
        expect(positions).not.toContain('goalie');
        
        const definition = getModeDefinition(config);
        const expectedLength = definition.positionOrder.length - 1; // minus goalie
        expect(positions).toHaveLength(expectedLength);
      });
      
      // Test legacy modes too
      const legacyModes = [TEAM_MODES.PAIRS_7, TEAM_MODES.INDIVIDUAL_5, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      legacyModes.forEach(mode => {
        const positions = getFormationPositions(mode);
        expect(positions).not.toContain('goalie');
        expect(positions.length).toBeGreaterThan(0);
      });
    });

    test('getFormationPositionsWithGoalie should include goalie', () => {
      const testConfigs = [
        createTeamConfig('5v5', 7, '2-2', 'pairs'),
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual')
      ];
      
      testConfigs.forEach(config => {
        const positions = getFormationPositionsWithGoalie(config);
        expect(positions).toContain('goalie');
        
        const definition = getModeDefinition(config);
        expect(positions).toHaveLength(definition.positionOrder.length);
      });
      
      // Test legacy modes too
      const legacyModes = [TEAM_MODES.PAIRS_7, TEAM_MODES.INDIVIDUAL_5, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      legacyModes.forEach(mode => {
        const positions = getFormationPositionsWithGoalie(mode);
        expect(positions).toContain('goalie');
        expect(positions.length).toBeGreaterThan(0);
      });
    });

    test('getInitialFormationTemplate should create valid templates', () => {
      const individualConfigs = [
        createTeamConfig('5v5', 5, '2-2', 'individual'),
        createTeamConfig('5v5', 6, '2-2', 'individual'),
        createTeamConfig('5v5', 7, '2-2', 'individual'),
        createTeamConfig('5v5', 8, '2-2', 'individual'),
        createTeamConfig('5v5', 9, '2-2', 'individual'),
        createTeamConfig('5v5', 10, '2-2', 'individual')
      ];
      
      individualConfigs.forEach(config => {
        const template = getInitialFormationTemplate(config);
        const definition = getModeDefinition(config);
        
        // Should have all required positions
        Object.keys(definition.initialFormationTemplate).forEach(position => {
          expect(template).toHaveProperty(position);
        });
        
        // All positions should initially be null
        Object.values(template).forEach(value => {
          expect(value).toBeNull();
        });
      });
      
      // Test legacy modes too
      const legacyModes = [TEAM_MODES.INDIVIDUAL_5, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];
      legacyModes.forEach(mode => {
        const template = getInitialFormationTemplate(mode);
        expect(template).toHaveProperty('goalie');
        expect(template.goalie).toBeNull();
      });
    });

    test('getInitialFormationTemplate should set goalie when provided', () => {
      const config = createTeamConfig('5v5', 7, '2-2', 'individual');
      const goalieId = 'test-goalie';
      
      const template = getInitialFormationTemplate(config, goalieId);
      expect(template.goalie).toBe(goalieId);
      
      // Test legacy mode too
      const legacyTemplate = getInitialFormationTemplate(TEAM_MODES.INDIVIDUAL_7, goalieId);
      expect(legacyTemplate.goalie).toBe(goalieId);
    });

    test('individual mode support functions should be accurate', () => {
      // Test with team config objects
      expect(supportsInactiveUsers(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(supportsInactiveUsers(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(true);
      expect(supportsInactiveUsers(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(true);
      expect(supportsInactiveUsers(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      expect(supportsNextNextIndicators(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(supportsNextNextIndicators(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(false);
      expect(supportsNextNextIndicators(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(true);
      expect(supportsNextNextIndicators(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(supportsInactiveUsers(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
      expect(supportsInactiveUsers(TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(supportsInactiveUsers(TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(supportsInactiveUsers(TEAM_MODES.PAIRS_7)).toBe(false);
      
      expect(supportsNextNextIndicators(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
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
      
      // Test with team config object
      const config = createTeamConfig('5v5', 7, '2-2', 'individual');
      testCases.forEach(({ playerId, expectedRole, expectedStatus }) => {
        const result = initializePlayerRoleAndStatus(playerId, mockFormation, config);
        expect(result.role).toBe(expectedRole);
        expect(result.status).toBe(expectedStatus);
      });
      
      // Test legacy compatibility
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
        { playerId: 'p5', expectedRole: PLAYER_ROLES.SUBSTITUTE, expectedStatus: 'substitute' },
        { playerId: 'p6', expectedRole: PLAYER_ROLES.SUBSTITUTE, expectedStatus: 'substitute' },
        { playerId: 'p7', expectedRole: PLAYER_ROLES.GOALIE, expectedStatus: 'goalie' }
      ];
      
      // Test with team config object
      const config = createTeamConfig('5v5', 7, '2-2', 'pairs');
      testCases.forEach(({ playerId, expectedRole, expectedStatus }) => {
        const result = initializePlayerRoleAndStatus(playerId, mockFormation, config);
        expect(result.role).toBe(expectedRole);
        expect(result.status).toBe(expectedStatus);
      });
      
      // Test legacy compatibility
      testCases.forEach(({ playerId, expectedRole, expectedStatus }) => {
        const result = initializePlayerRoleAndStatus(playerId, mockFormation, TEAM_MODES.PAIRS_7);
        expect(result.role).toBe(expectedRole);
        expect(result.status).toBe(expectedStatus);
      });
    });

    test('should return nulls for unknown players or modes', () => {
      const mockFormation = { goalie: 'p1' };
      
      // Test with team config object
      const config = createTeamConfig('5v5', 7, '2-2', 'individual');
      const result1 = initializePlayerRoleAndStatus('unknown', mockFormation, config);
      expect(result1.role).toBeNull();
      expect(result1.status).toBeNull();
      expect(result1.pairKey).toBeNull();
      
      // Test legacy compatibility
      const result2 = initializePlayerRoleAndStatus('unknown', mockFormation, TEAM_MODES.INDIVIDUAL_7);
      expect(result2.role).toBeNull();
      expect(result2.status).toBeNull();
      expect(result2.pairKey).toBeNull();
    });
  });

  describe('configuration edge cases', () => {
    test('should maintain consistency between individual modes', () => {
      const individual5 = getModeDefinition(createTeamConfig('5v5', 5, '2-2', 'individual'));
      const individual6 = getModeDefinition(createTeamConfig('5v5', 6, '2-2', 'individual'));
      const individual7 = getModeDefinition(createTeamConfig('5v5', 7, '2-2', 'individual'));
      const individual8 = getModeDefinition(createTeamConfig('5v5', 8, '2-2', 'individual'));
      const individual9 = getModeDefinition(createTeamConfig('5v5', 9, '2-2', 'individual'));
      const individual10 = getModeDefinition(createTeamConfig('5v5', 10, '2-2', 'individual'));
      
      // Field positions should be identical across all individual modes with same formation
      expect(individual5.fieldPositions).toEqual(individual6.fieldPositions);
      expect(individual5.fieldPositions).toEqual(individual7.fieldPositions);
      expect(individual5.fieldPositions).toEqual(individual8.fieldPositions);
      expect(individual5.fieldPositions).toEqual(individual9.fieldPositions);
      expect(individual5.fieldPositions).toEqual(individual10.fieldPositions);
      
      // OnField count should be the same across all individual modes
      expect(individual5.expectedCounts.onField).toBe(individual6.expectedCounts.onField);
      expect(individual5.expectedCounts.onField).toBe(individual7.expectedCounts.onField);
      expect(individual5.expectedCounts.onField).toBe(individual8.expectedCounts.onField);
      expect(individual5.expectedCounts.onField).toBe(individual9.expectedCounts.onField);
      expect(individual5.expectedCounts.onField).toBe(individual10.expectedCounts.onField);
      
      // Should all have goalie position
      expect(individual5.positionOrder).toContain('goalie');
      expect(individual6.positionOrder).toContain('goalie');
      expect(individual7.positionOrder).toContain('goalie');
      expect(individual8.positionOrder).toContain('goalie');
      expect(individual9.positionOrder).toContain('goalie');
      expect(individual10.positionOrder).toContain('goalie');
    });

    test('should have correct substitute counts', () => {
      expect(getModeDefinition(createTeamConfig('5v5', 5, '2-2', 'individual')).substitutePositions).toHaveLength(0);
      expect(getModeDefinition(createTeamConfig('5v5', 6, '2-2', 'individual')).substitutePositions).toHaveLength(1);
      expect(getModeDefinition(createTeamConfig('5v5', 7, '2-2', 'individual')).substitutePositions).toHaveLength(2);
      expect(getModeDefinition(createTeamConfig('5v5', 8, '2-2', 'individual')).substitutePositions).toHaveLength(3);
      expect(getModeDefinition(createTeamConfig('5v5', 9, '2-2', 'individual')).substitutePositions).toHaveLength(4);
      expect(getModeDefinition(createTeamConfig('5v5', 10, '2-2', 'individual')).substitutePositions).toHaveLength(5);
      expect(getModeDefinition(createTeamConfig('5v5', 7, '2-2', 'pairs')).substitutePositions).toHaveLength(1);
    });
  });

  describe('isIndividualMode helper function', () => {
    test('should return true for all individual modes', () => {
      // Test with team config objects
      expect(isIndividualMode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(true);
      expect(isIndividualMode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(true);
      expect(isIndividualMode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(true);
      expect(isIndividualMode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(true);
      expect(isIndividualMode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(true);
      expect(isIndividualMode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(true);
      
      // Test legacy compatibility
      expect(isIndividualMode(TEAM_MODES.INDIVIDUAL_5)).toBe(true);
      expect(isIndividualMode(TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(isIndividualMode(TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isIndividualMode(TEAM_MODES.INDIVIDUAL_8)).toBe(true);
      expect(isIndividualMode(TEAM_MODES.INDIVIDUAL_9)).toBe(true);
      expect(isIndividualMode(TEAM_MODES.INDIVIDUAL_10)).toBe(true);
    });

    test('should return false for non-individual modes', () => {
      // Test with team config objects
      expect(isIndividualMode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividualMode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividualMode('unknown_mode')).toBe(false);
      expect(isIndividualMode(null)).toBe(false);
      expect(isIndividualMode(undefined)).toBe(false);
    });
  });

  describe('getPlayerCountForMode helper function', () => {
    test('should return correct player counts for all team modes', () => {
      // Test with team config objects
      expect(getPlayerCountForMode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(5);
      expect(getPlayerCountForMode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(6);
      expect(getPlayerCountForMode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(7);
      expect(getPlayerCountForMode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(8);
      expect(getPlayerCountForMode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(9);
      expect(getPlayerCountForMode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(10);
      expect(getPlayerCountForMode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(7);
      
      // Test legacy compatibility
      expect(getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_5)).toBe(5);
      expect(getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_6)).toBe(6);
      expect(getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_7)).toBe(7);
      expect(getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_8)).toBe(8);
      expect(getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_9)).toBe(9);
      expect(getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_10)).toBe(10);
      expect(getPlayerCountForMode(TEAM_MODES.PAIRS_7)).toBe(7);
    });

    test('should return null for invalid team modes', () => {
      expect(getPlayerCountForMode('unknown_mode')).toBe(null);
      expect(getPlayerCountForMode(null)).toBe(null);
      expect(getPlayerCountForMode(undefined)).toBe(null);
    });
  });

  describe('specific individual mode checker functions', () => {
    test('isIndividual5Mode should only return true for INDIVIDUAL_5', () => {
      // Test with team config objects
      expect(isIndividual5Mode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(true);
      expect(isIndividual5Mode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(false);
      expect(isIndividual5Mode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(false);
      expect(isIndividual5Mode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(false);
      expect(isIndividual5Mode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(false);
      expect(isIndividual5Mode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(false);
      expect(isIndividual5Mode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividual5Mode(TEAM_MODES.INDIVIDUAL_5)).toBe(true);
      expect(isIndividual5Mode(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isIndividual5Mode(TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      expect(isIndividual5Mode(TEAM_MODES.INDIVIDUAL_8)).toBe(false);
      expect(isIndividual5Mode(TEAM_MODES.INDIVIDUAL_9)).toBe(false);
      expect(isIndividual5Mode(TEAM_MODES.INDIVIDUAL_10)).toBe(false);
      expect(isIndividual5Mode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividual5Mode(null)).toBe(false);
    });

    test('isIndividual6Mode should only return true for INDIVIDUAL_6', () => {
      // Test with team config objects
      expect(isIndividual6Mode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(true);
      expect(isIndividual6Mode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(isIndividual6Mode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(false);
      expect(isIndividual6Mode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(false);
      expect(isIndividual6Mode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(false);
      expect(isIndividual6Mode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(false);
      expect(isIndividual6Mode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividual6Mode(TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(isIndividual6Mode(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
      expect(isIndividual6Mode(TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      expect(isIndividual6Mode(TEAM_MODES.INDIVIDUAL_8)).toBe(false);
      expect(isIndividual6Mode(TEAM_MODES.INDIVIDUAL_9)).toBe(false);
      expect(isIndividual6Mode(TEAM_MODES.INDIVIDUAL_10)).toBe(false);
      expect(isIndividual6Mode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividual6Mode(null)).toBe(false);
    });

    test('isIndividual7Mode should only return true for INDIVIDUAL_7', () => {
      // Test with team config objects
      expect(isIndividual7Mode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(true);
      expect(isIndividual7Mode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(isIndividual7Mode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(false);
      expect(isIndividual7Mode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(false);
      expect(isIndividual7Mode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(false);
      expect(isIndividual7Mode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(false);
      expect(isIndividual7Mode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividual7Mode(TEAM_MODES.INDIVIDUAL_7)).toBe(true);
      expect(isIndividual7Mode(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
      expect(isIndividual7Mode(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isIndividual7Mode(TEAM_MODES.INDIVIDUAL_8)).toBe(false);
      expect(isIndividual7Mode(TEAM_MODES.INDIVIDUAL_9)).toBe(false);
      expect(isIndividual7Mode(TEAM_MODES.INDIVIDUAL_10)).toBe(false);
      expect(isIndividual7Mode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividual7Mode(null)).toBe(false);
    });

    test('isIndividual8Mode should only return true for INDIVIDUAL_8', () => {
      // Test with team config objects
      expect(isIndividual8Mode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(true);
      expect(isIndividual8Mode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(isIndividual8Mode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(false);
      expect(isIndividual8Mode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(false);
      expect(isIndividual8Mode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(false);
      expect(isIndividual8Mode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(false);
      expect(isIndividual8Mode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividual8Mode(TEAM_MODES.INDIVIDUAL_8)).toBe(true);
      expect(isIndividual8Mode(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
      expect(isIndividual8Mode(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isIndividual8Mode(TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      expect(isIndividual8Mode(TEAM_MODES.INDIVIDUAL_9)).toBe(false);
      expect(isIndividual8Mode(TEAM_MODES.INDIVIDUAL_10)).toBe(false);
      expect(isIndividual8Mode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividual8Mode(null)).toBe(false);
    });

    test('isIndividual9Mode should only return true for INDIVIDUAL_9', () => {
      // Test with team config objects
      expect(isIndividual9Mode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(true);
      expect(isIndividual9Mode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(isIndividual9Mode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(false);
      expect(isIndividual9Mode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(false);
      expect(isIndividual9Mode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(false);
      expect(isIndividual9Mode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(false);
      expect(isIndividual9Mode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividual9Mode(TEAM_MODES.INDIVIDUAL_9)).toBe(true);
      expect(isIndividual9Mode(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
      expect(isIndividual9Mode(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isIndividual9Mode(TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      expect(isIndividual9Mode(TEAM_MODES.INDIVIDUAL_8)).toBe(false);
      expect(isIndividual9Mode(TEAM_MODES.INDIVIDUAL_10)).toBe(false);
      expect(isIndividual9Mode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividual9Mode(null)).toBe(false);
    });

    test('isIndividual10Mode should only return true for INDIVIDUAL_10', () => {
      // Test with team config objects
      expect(isIndividual10Mode(createTeamConfig('5v5', 10, '2-2', 'individual'))).toBe(true);
      expect(isIndividual10Mode(createTeamConfig('5v5', 5, '2-2', 'individual'))).toBe(false);
      expect(isIndividual10Mode(createTeamConfig('5v5', 6, '2-2', 'individual'))).toBe(false);
      expect(isIndividual10Mode(createTeamConfig('5v5', 7, '2-2', 'individual'))).toBe(false);
      expect(isIndividual10Mode(createTeamConfig('5v5', 8, '2-2', 'individual'))).toBe(false);
      expect(isIndividual10Mode(createTeamConfig('5v5', 9, '2-2', 'individual'))).toBe(false);
      expect(isIndividual10Mode(createTeamConfig('5v5', 7, '2-2', 'pairs'))).toBe(false);
      
      // Test legacy compatibility
      expect(isIndividual10Mode(TEAM_MODES.INDIVIDUAL_10)).toBe(true);
      expect(isIndividual10Mode(TEAM_MODES.INDIVIDUAL_5)).toBe(false);
      expect(isIndividual10Mode(TEAM_MODES.INDIVIDUAL_6)).toBe(false);
      expect(isIndividual10Mode(TEAM_MODES.INDIVIDUAL_7)).toBe(false);
      expect(isIndividual10Mode(TEAM_MODES.INDIVIDUAL_8)).toBe(false);
      expect(isIndividual10Mode(TEAM_MODES.INDIVIDUAL_9)).toBe(false);
      expect(isIndividual10Mode(TEAM_MODES.PAIRS_7)).toBe(false);
      expect(isIndividual10Mode(null)).toBe(false);
    });
  });
  
  // New tests for the dynamic system and 1-2-1 formation
  describe('Dynamic Mode Definition System', () => {
    test('getModeDefinition should work with new 1-2-1 formation', () => {
      const config121 = createTeamConfig('5v5', 7, '1-2-1', 'individual');
      const definition = getModeDefinition(config121);
      
      expect(definition.formation).toBe('1-2-1');
      expect(definition.fieldPositions).toEqual(['defender', 'left', 'right', 'attacker']);
      expect(definition.positions.defender.role).toBe(PLAYER_ROLES.DEFENDER);
      expect(definition.positions.left.role).toBe(PLAYER_ROLES.MIDFIELDER);
      expect(definition.positions.right.role).toBe(PLAYER_ROLES.MIDFIELDER);
      expect(definition.positions.attacker.role).toBe(PLAYER_ROLES.ATTACKER);
    });
    
    test('getModeDefinition should have memoization', () => {
      const config = createTeamConfig('5v5', 7, '2-2', 'individual');
      
      // First call
      const definition1 = getModeDefinition(config);
      
      // Second call with same config should return cached result
      const definition2 = getModeDefinition(config);
      
      // Should be the exact same object (reference equality)
      expect(definition1).toBe(definition2);
    });
    
    test('getModeDefinition should handle different formations correctly', () => {
      const config22 = createTeamConfig('5v5', 7, '2-2', 'individual');
      const config121 = createTeamConfig('5v5', 7, '1-2-1', 'individual');
      
      const def22 = getModeDefinition(config22);
      const def121 = getModeDefinition(config121);
      
      // Different formations should have different field positions
      expect(def22.fieldPositions).toEqual(['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker']);
      expect(def121.fieldPositions).toEqual(['defender', 'left', 'right', 'attacker']);
      
      // But same squad size means same substitute count
      expect(def22.substitutePositions.length).toBe(def121.substitutePositions.length);
    });
    
    test('getModeDefinition should validate team configuration', () => {
      expect(() => {
        getModeDefinition({ format: 'invalid', squadSize: 7, formation: '2-2', substitutionType: 'individual' });
      }).toThrow('Invalid format: invalid');
      
      expect(() => {
        getModeDefinition({ format: '5v5', squadSize: 20, formation: '2-2', substitutionType: 'individual' });
      }).toThrow('Invalid squad size: 20');
      
      expect(() => {
        getModeDefinition({ format: '5v5', squadSize: 7, formation: 'invalid', substitutionType: 'individual' });
      }).toThrow('Formation invalid not valid for 5v5 with 7 players');
    });
  });
  
  describe('POSITION_ROLE_MAP updates', () => {
    test('should include 1-2-1 formation positions', () => {
      expect(POSITION_ROLE_MAP.defender).toBe(PLAYER_ROLES.DEFENDER);
      expect(POSITION_ROLE_MAP.left).toBe(PLAYER_ROLES.MIDFIELDER);
      expect(POSITION_ROLE_MAP.right).toBe(PLAYER_ROLES.MIDFIELDER);
      expect(POSITION_ROLE_MAP.attacker).toBe(PLAYER_ROLES.ATTACKER);
    });
  });
});