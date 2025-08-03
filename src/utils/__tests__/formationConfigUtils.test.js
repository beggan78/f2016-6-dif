/**
 * Formation Configuration Utilities Tests
 * 
 * Comprehensive test suite for the centralized formation configuration utilities.
 * Tests all legacy migration, formation-aware config creation, and validation functions.
 */

import {
  getLegacyTeamModeMapping,
  migrateFromLegacyTeamMode,
  migrateFromLegacyTeamModeStrict,
  createFormationAwareTeamConfig,
  getFormationDefinition,
  isFormationCompatible,
  getAllLegacyTeamModes,
  isLegacyTeamMode,
  isModernTeamConfig
} from '../formationConfigUtils';
import { TEAM_MODES } from '../../constants/playerConstants';
import { FORMATIONS } from '../../constants/teamConfiguration';

// Mock the getModeDefinition function
jest.mock('../../constants/gameModes', () => ({
  getModeDefinition: jest.fn((config) => {
    // Return a mock mode definition for valid configs
    if (config && typeof config === 'object' && config.format === '5v5' && config.squadSize >= 5 && config.squadSize <= 10) {
      return {
        format: config.format,
        squadSize: config.squadSize,
        formation: config.formation,
        substitutionType: config.substitutionType,
        fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
        substitutePositions: config.squadSize === 6 ? ['substitute'] : ['substitute_1', 'substitute_2'],
        positions: {
          goalie: { key: 'goalie', role: 'Goalie' },
          leftDefender: { key: 'leftDefender', role: 'Defender' },
          rightDefender: { key: 'rightDefender', role: 'Defender' },
          leftAttacker: { key: 'leftAttacker', role: 'Attacker' },
          rightAttacker: { key: 'rightAttacker', role: 'Attacker' }
        }
      };
    }
    // Handle legacy team mode strings by converting them first
    if (typeof config === 'string') {
      const legacyMappings = {
        'pairs_7': { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
        'individual_5': { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
        'individual_6': { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
        'individual_7': { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
        'individual_8': { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
        'individual_9': { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
        'individual_10': { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
      };
      
      const mapping = legacyMappings[config];
      if (mapping) {
        return {
          format: mapping.format,
          squadSize: mapping.squadSize,
          formation: mapping.formation,
          substitutionType: mapping.substitutionType,
          fieldPositions: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'],
          substitutePositions: mapping.squadSize === 6 ? ['substitute'] : ['substitute_1', 'substitute_2'],
          positions: {
            goalie: { key: 'goalie', role: 'Goalie' },
            leftDefender: { key: 'leftDefender', role: 'Defender' },
            rightDefender: { key: 'rightDefender', role: 'Defender' },
            leftAttacker: { key: 'leftAttacker', role: 'Attacker' },
            rightAttacker: { key: 'rightAttacker', role: 'Attacker' }
          }
        };
      }
    }
    return null;
  })
}));

describe('formationConfigUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getLegacyTeamModeMapping', () => {
    it('should return correct mapping for PAIRS_7', () => {
      const result = getLegacyTeamModeMapping(TEAM_MODES.PAIRS_7);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs'
      });
    });

    it('should return correct mapping for INDIVIDUAL_6', () => {
      const result = getLegacyTeamModeMapping(TEAM_MODES.INDIVIDUAL_6);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });

    it('should return correct mapping for INDIVIDUAL_7', () => {
      const result = getLegacyTeamModeMapping(TEAM_MODES.INDIVIDUAL_7);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });

    it('should return null for unknown team mode', () => {
      const result = getLegacyTeamModeMapping('unknown_mode');
      expect(result).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(getLegacyTeamModeMapping(null)).toBeNull();
      expect(getLegacyTeamModeMapping(undefined)).toBeNull();
    });
  });

  describe('migrateFromLegacyTeamMode', () => {
    it('should migrate PAIRS_7 correctly', () => {
      const result = migrateFromLegacyTeamMode(TEAM_MODES.PAIRS_7);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs'
      });
    });

    it('should migrate INDIVIDUAL_6 correctly', () => {
      const result = migrateFromLegacyTeamMode(TEAM_MODES.INDIVIDUAL_6);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });

    it('should fallback to individual_7 for unknown team mode', () => {
      const result = migrateFromLegacyTeamMode('unknown_mode');
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      });
      expect(console.warn).toHaveBeenCalledWith('Unknown legacy team mode: unknown_mode, falling back to individual_7');
    });
  });

  describe('migrateFromLegacyTeamModeStrict', () => {
    it('should migrate PAIRS_7 correctly', () => {
      const result = migrateFromLegacyTeamModeStrict(TEAM_MODES.PAIRS_7);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs'
      });
    });

    it('should migrate INDIVIDUAL_6 correctly', () => {
      const result = migrateFromLegacyTeamModeStrict(TEAM_MODES.INDIVIDUAL_6);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });

    it('should return null for unknown team mode', () => {
      const result = migrateFromLegacyTeamModeStrict('unknown_mode');
      expect(result).toBeNull();
    });
  });


  describe('createFormationAwareTeamConfig', () => {
    it('should handle modern team config with formation override', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      };
      const result = createFormationAwareTeamConfig(teamConfig, '1-2-1');
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });
    });

    it('should return modern team config unchanged if no formation override', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      };
      const result = createFormationAwareTeamConfig(teamConfig, '2-2');
      expect(result).toEqual(teamConfig);
    });

    it('should handle legacy string with formation override', () => {
      const result = createFormationAwareTeamConfig(TEAM_MODES.INDIVIDUAL_7, '1-2-1');
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });
    });

    it('should handle legacy string without formation override', () => {
      const result = createFormationAwareTeamConfig(TEAM_MODES.PAIRS_7, null);
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs'
      });
    });

    it('should parse squad size from unknown legacy string', () => {
      const result = createFormationAwareTeamConfig('unknown_mode_8', '1-2-1');
      expect(result).toEqual({
        format: '5v5',
        squadSize: 8,
        formation: '1-2-1',
        substitutionType: 'individual'
      });
    });

    it('should fallback to default for invalid inputs', () => {
      const result = createFormationAwareTeamConfig(null, '1-2-1');
      expect(result).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });
    });
  });

  describe('getFormationDefinition', () => {
    it('should get definition for legacy team mode', () => {
      // Mock the getModeDefinition to return result for legacy strings
      const { getModeDefinition } = require('../../constants/gameModes');
      getModeDefinition.mockReturnValueOnce({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });

      const result = getFormationDefinition(TEAM_MODES.INDIVIDUAL_6);
      expect(result).toBeTruthy();
      expect(result.format).toBe('5v5');
      expect(result.squadSize).toBe(6);
    });

    it('should get definition for modern team config', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      };
      
      // Mock to return result for the team config
      const { getModeDefinition } = require('../../constants/gameModes');
      getModeDefinition.mockReturnValueOnce({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });

      const result = getFormationDefinition(teamConfig);
      expect(result).toBeTruthy();
      expect(result.formation).toBe('1-2-1');
    });

    it('should handle formation override', () => {
      // Mock to return result for formation override
      const { getModeDefinition } = require('../../constants/gameModes');
      getModeDefinition.mockReturnValueOnce({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });

      const result = getFormationDefinition(TEAM_MODES.INDIVIDUAL_7, '1-2-1');
      expect(result).toBeTruthy();
      expect(result.formation).toBe('1-2-1');
    });

    it('should return null for invalid inputs', () => {
      expect(getFormationDefinition(null)).toBeNull();
      expect(getFormationDefinition(undefined)).toBeNull();
    });
  });

  describe('isFormationCompatible', () => {
    it('should return true for valid formation and team config', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      };
      const result = isFormationCompatible(FORMATIONS.FORMATION_2_2, teamConfig);
      expect(result).toBe(true);
    });

    it('should return true for 1-2-1 formation', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      };
      const result = isFormationCompatible(FORMATIONS.FORMATION_1_2_1, teamConfig);
      expect(result).toBe(true);
    });

    it('should return false for invalid formation', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      };
      const result = isFormationCompatible('invalid-formation', teamConfig);
      expect(result).toBe(false);
    });

    it('should return false for null/undefined inputs', () => {
      expect(isFormationCompatible(null, {})).toBe(false);
      expect(isFormationCompatible(FORMATIONS.FORMATION_2_2, null)).toBe(false);
    });
  });

  describe('getAllLegacyTeamModes', () => {
    it('should return all legacy team mode strings', () => {
      const result = getAllLegacyTeamModes();
      expect(result).toContain(TEAM_MODES.PAIRS_7);
      expect(result).toContain(TEAM_MODES.INDIVIDUAL_5);
      expect(result).toContain(TEAM_MODES.INDIVIDUAL_6);
      expect(result).toContain(TEAM_MODES.INDIVIDUAL_7);
      expect(result).toContain(TEAM_MODES.INDIVIDUAL_8);
      expect(result).toContain(TEAM_MODES.INDIVIDUAL_9);
      expect(result).toContain(TEAM_MODES.INDIVIDUAL_10);
      expect(result.length).toBe(7);
    });
  });

  describe('isLegacyTeamMode', () => {
    it('should return true for valid legacy team modes', () => {
      expect(isLegacyTeamMode(TEAM_MODES.PAIRS_7)).toBe(true);
      expect(isLegacyTeamMode(TEAM_MODES.INDIVIDUAL_6)).toBe(true);
      expect(isLegacyTeamMode(TEAM_MODES.INDIVIDUAL_7)).toBe(true);
    });

    it('should return false for invalid inputs', () => {
      expect(isLegacyTeamMode('unknown_mode')).toBe(false);
      expect(isLegacyTeamMode(null)).toBe(false);
      expect(isLegacyTeamMode({})).toBe(false);
      expect(isLegacyTeamMode(123)).toBe(false);
    });
  });

  describe('isModernTeamConfig', () => {
    it('should return true for valid modern team config', () => {
      const teamConfig = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      };
      expect(isModernTeamConfig(teamConfig)).toBe(true);
    });

    it('should return false for invalid configs', () => {
      expect(isModernTeamConfig(null)).toBe(false);
      expect(isModernTeamConfig('string')).toBe(false);
      expect(isModernTeamConfig({})).toBe(false);
      expect(isModernTeamConfig({
        format: '5v5',
        squadSize: 7,
        formation: '2-2'
        // missing substitutionType
      })).toBe(false);
      expect(isModernTeamConfig({
        format: 123, // wrong type
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      })).toBe(false);
    });
  });

  describe('Integration Tests', () => {

    it('should create formation-aware config from legacy and get definition', () => {
      // Mock getModeDefinition to return a valid result
      const { getModeDefinition } = require('../../constants/gameModes');
      getModeDefinition.mockReturnValueOnce({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });

      const formationAwareConfig = createFormationAwareTeamConfig(TEAM_MODES.INDIVIDUAL_7, '1-2-1');
      const definition = getFormationDefinition(formationAwareConfig);
      expect(definition).toBeTruthy();
      expect(definition.formation).toBe('1-2-1');
      expect(definition.substitutionType).toBe('individual');
    });
  });
});