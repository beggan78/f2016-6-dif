import {
  createTeamConfig,
  validateTeamConfig,
  validateAndCorrectTeamConfig,
  createDefaultTeamConfig,
  SUBSTITUTION_TYPES,
  PAIRED_ROLE_STRATEGY_TYPES,
  PAIRED_ROLE_STRATEGY_DEFINITIONS,
  FORMATIONS,
  FORMATS,
  FORMAT_CONFIGS,
  FORMATION_DEFINITIONS,
  canUsePairedRoleStrategy
} from '../teamConfiguration';

describe('Team Configuration with Paired Role Strategy', () => {
  describe('PAIRED_ROLE_STRATEGY_TYPES and DEFINITIONS', () => {
    test('should have correct paired role strategy constants', () => {
      expect(PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD).toBe('keep_throughout_period');
      expect(PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION).toBe('swap_every_rotation');
    });

    test('should have definitions for all paired role strategy types', () => {
      expect(PAIRED_ROLE_STRATEGY_DEFINITIONS).toHaveProperty(PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD);
      expect(PAIRED_ROLE_STRATEGY_DEFINITIONS).toHaveProperty(PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION);
      
      // Check that definitions have required properties
      Object.values(PAIRED_ROLE_STRATEGY_DEFINITIONS).forEach(definition => {
        expect(definition).toHaveProperty('label');
        expect(definition).toHaveProperty('description');
        expect(definition).toHaveProperty('shortDescription');
      });
    });
  });

  describe('createTeamConfig with pairedRoleStrategy', () => {
    test('should create team config for pairs mode with default role rotation', () => {
      const config = createTeamConfig('5v5', 7, '2-2', SUBSTITUTION_TYPES.PAIRS);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairedRoleStrategy: 'keep_throughout_period'
      });
    });

    test('should create team config for pairs mode with specific role rotation', () => {
      const config = createTeamConfig('5v5', 7, '2-2', SUBSTITUTION_TYPES.PAIRS, PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairedRoleStrategy: 'swap_every_rotation'
      });
    });

    test('should include pairedRoleStrategy for eligible individual configurations', () => {
      const config = createTeamConfig('5v5', 9, '2-2', SUBSTITUTION_TYPES.INDIVIDUAL);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 9,
        formation: '2-2',
        substitutionType: 'individual',
        pairedRoleStrategy: 'keep_throughout_period'
      });
    });

    test('should not include pairedRoleStrategy for ineligible individual mode', () => {
      const config = createTeamConfig('5v5', 6, '2-2', SUBSTITUTION_TYPES.INDIVIDUAL);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
      
      expect(config).not.toHaveProperty('pairedRoleStrategy');
    });
  });

  describe('validateTeamConfig with pairedRoleStrategy', () => {
    test('should validate pairs config with valid role rotation', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
      };
      
      expect(() => validateTeamConfig(config)).not.toThrow();
    });

    test('should validate individual config with paired role strategy when eligible', () => {
      const config = {
        format: '5v5',
        squadSize: 9,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
      };

      expect(() => validateTeamConfig(config)).not.toThrow();
    });

    test('should validate pairs config without role rotation (uses default)', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.PAIRS
      };
      
      expect(() => validateTeamConfig(config)).not.toThrow();
    });

    test('should throw error for invalid role rotation in pairs mode', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: 'invalid_rotation_type'
      };
      
      expect(() => validateTeamConfig(config)).toThrow('Invalid paired role strategy');
    });

    test('should throw error for role rotation in non-eligible configuration', () => {
      const config = {
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };
      
      expect(() => validateTeamConfig(config)).toThrow('pairedRoleStrategy can only be set when the configuration supports paired rotations');
    });

    test('should validate individual config without role rotation', () => {
      const config = {
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };
      
      expect(() => validateTeamConfig(config)).not.toThrow();
    });
  });

  describe('createDefaultTeamConfig with paired role strategy', () => {
    test('should create default config for 7-player squad with pairs and default role rotation', () => {
      const config = createDefaultTeamConfig(7);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairedRoleStrategy: 'keep_throughout_period'
      });
    });

    test('should create default config for 9-player squad with individual substitutions and paired strategy', () => {
      const config = createDefaultTeamConfig(9);

      expect(config).toEqual({
        format: '5v5',
        squadSize: 9,
        formation: '2-2',
        substitutionType: 'individual',
        pairedRoleStrategy: 'keep_throughout_period'
      });
    });

    test('should create default config for 6-player squad without role rotation', () => {
      const config = createDefaultTeamConfig(6);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
      
      expect(config).not.toHaveProperty('pairedRoleStrategy');
    });
  });

  describe('Business Rule Validation - Pairs with Formation', () => {
    test('should throw error for pairs with 1-2-1 formation', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      expect(() => validateTeamConfig(config)).toThrow('Pairs substitution is only supported with 2-2 formation');
    });

    test('should throw error for pairs with non-7 squad size', () => {
      const config = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      expect(() => validateTeamConfig(config)).toThrow('Pairs substitution is only supported with 7 players');
    });

    test('should validate valid pairs configuration', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      expect(() => validateTeamConfig(config)).not.toThrow();
    });
  });

  describe('validateAndCorrectTeamConfig', () => {
    test('should return valid config unchanged', () => {
      const validConfig = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      const result = validateAndCorrectTeamConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.correctedConfig).toEqual(validConfig);
      expect(result.corrections).toEqual([]);
    });

    test('should auto-correct pairs with 1-2-1 formation', () => {
      const invalidConfig = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      const result = validateAndCorrectTeamConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: null
      });
      expect(result.corrections).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pairs to individual'),
          expect.stringContaining('pairedRoleStrategy')
        ])
      );
    });

    test('should auto-correct pairs with non-7 squad size', () => {
      const invalidConfig = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      const result = validateAndCorrectTeamConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: null
      });
      expect(result.corrections).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pairs to individual'),
          expect.stringContaining('pairedRoleStrategy')
        ])
      );
    });

    test('should auto-correct pairs with both invalid formation and squad size', () => {
      const invalidConfig = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.SWAP_EVERY_ROTATION
      };

      const result = validateAndCorrectTeamConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairedRoleStrategy: null
      });
      expect(result.corrections).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pairs to individual'),
          expect.stringContaining('pairedRoleStrategy')
        ])
      );
    });

    test('should preserve individual mode configuration', () => {
      const individualConfig = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };

      const result = validateAndCorrectTeamConfig(individualConfig);

      expect(result.isValid).toBe(true);
      expect(result.correctedConfig).toEqual(individualConfig);
      expect(result.corrections).toEqual([]);
    });
  });

  describe('7v7 formation catalog', () => {
    test('should expose available and coming soon formations for 7v7', () => {
      const formations = FORMAT_CONFIGS[FORMATS.FORMAT_7V7].formations;

      expect(formations).toEqual(
        expect.arrayContaining([
          FORMATIONS.FORMATION_2_2_2,
          FORMATIONS.FORMATION_2_3_1,
          FORMATIONS.FORMATION_3_3,
          FORMATIONS.FORMATION_1_3_2,
          FORMATIONS.FORMATION_2_1_3,
          FORMATIONS.FORMATION_3_2_1,
          FORMATIONS.FORMATION_3_1_2
        ])
      );

      const comingSoonEntries = formations.filter(
        formation => FORMATION_DEFINITIONS[formation].status === 'coming-soon'
      );

      expect(comingSoonEntries).toEqual(
        expect.arrayContaining([
          FORMATIONS.FORMATION_3_3,
          FORMATIONS.FORMATION_1_3_2,
          FORMATIONS.FORMATION_2_1_3,
          FORMATIONS.FORMATION_3_2_1,
          FORMATIONS.FORMATION_3_1_2
        ])
      );

      expect(FORMATION_DEFINITIONS[FORMATIONS.FORMATION_2_2_2].status).toBe('available');
      expect(FORMATION_DEFINITIONS[FORMATIONS.FORMATION_2_3_1].status).toBe('available');
    });
  });

  describe('canUsePairedRoleStrategy helper', () => {
    test('returns true for 7-player pairs mode', () => {
      expect(
        canUsePairedRoleStrategy({
          format: FORMATS.FORMAT_5V5,
          squadSize: 7,
          formation: FORMATIONS.FORMATION_2_2,
          substitutionType: SUBSTITUTION_TYPES.PAIRS
        })
      ).toBe(true);
    });

    test('returns true for 9-player individual mode with 2-2 formation', () => {
      expect(
        canUsePairedRoleStrategy({
          format: FORMATS.FORMAT_5V5,
          squadSize: 9,
          formation: FORMATIONS.FORMATION_2_2,
          substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
        })
      ).toBe(true);
    });

    test('returns false for unsupported formations or squad sizes', () => {
      expect(
        canUsePairedRoleStrategy({
          format: FORMATS.FORMAT_5V5,
          squadSize: 6,
          formation: FORMATIONS.FORMATION_2_2,
          substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
        })
      ).toBe(false);

      expect(
        canUsePairedRoleStrategy({
          format: FORMATS.FORMAT_5V5,
          squadSize: 9,
          formation: FORMATIONS.FORMATION_1_2_1,
          substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
        })
      ).toBe(false);
    });
  });
});
