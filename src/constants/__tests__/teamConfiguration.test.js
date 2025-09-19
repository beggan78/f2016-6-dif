import {
  createTeamConfig,
  validateTeamConfig,
  validateAndCorrectTeamConfig,
  createDefaultTeamConfig,
  SUBSTITUTION_TYPES,
  PAIR_ROLE_ROTATION_TYPES,
  PAIR_ROLE_ROTATION_DEFINITIONS,
  FORMATIONS,
  FORMATS,
  FORMAT_CONFIGS,
  FORMATION_DEFINITIONS
} from '../teamConfiguration';

describe('Team Configuration with Pair Role Rotation', () => {
  describe('PAIR_ROLE_ROTATION_TYPES and DEFINITIONS', () => {
    test('should have correct pair role rotation constants', () => {
      expect(PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD).toBe('keep_throughout_period');
      expect(PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION).toBe('swap_every_rotation');
    });

    test('should have definitions for all role rotation types', () => {
      expect(PAIR_ROLE_ROTATION_DEFINITIONS).toHaveProperty(PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD);
      expect(PAIR_ROLE_ROTATION_DEFINITIONS).toHaveProperty(PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION);
      
      // Check that definitions have required properties
      Object.values(PAIR_ROLE_ROTATION_DEFINITIONS).forEach(definition => {
        expect(definition).toHaveProperty('label');
        expect(definition).toHaveProperty('description');
        expect(definition).toHaveProperty('shortDescription');
      });
    });
  });

  describe('createTeamConfig with pairRoleRotation', () => {
    test('should create team config for pairs mode with default role rotation', () => {
      const config = createTeamConfig('5v5', 7, '2-2', SUBSTITUTION_TYPES.PAIRS);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairRoleRotation: 'keep_throughout_period'
      });
    });

    test('should create team config for pairs mode with specific role rotation', () => {
      const config = createTeamConfig('5v5', 7, '2-2', SUBSTITUTION_TYPES.PAIRS, PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairRoleRotation: 'swap_every_rotation'
      });
    });

    test('should not include pairRoleRotation for individual mode', () => {
      const config = createTeamConfig('5v5', 6, '2-2', SUBSTITUTION_TYPES.INDIVIDUAL);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
      
      expect(config).not.toHaveProperty('pairRoleRotation');
    });
  });

  describe('validateTeamConfig with pairRoleRotation', () => {
    test('should validate pairs config with valid role rotation', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION
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
        pairRoleRotation: 'invalid_rotation_type'
      };
      
      expect(() => validateTeamConfig(config)).toThrow('Invalid pair role rotation');
    });

    test('should throw error for role rotation in non-pairs mode', () => {
      const config = {
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
      };
      
      expect(() => validateTeamConfig(config)).toThrow("pairRoleRotation can only be set when substitutionType is 'pairs'");
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

  describe('createDefaultTeamConfig with pair role rotation', () => {
    test('should create default config for 7-player squad with pairs and default role rotation', () => {
      const config = createDefaultTeamConfig(7);
      
      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'pairs',
        pairRoleRotation: 'keep_throughout_period'
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
      
      expect(config).not.toHaveProperty('pairRoleRotation');
    });
  });

  describe('Business Rule Validation - Pairs with Formation', () => {
    test('should throw error for pairs with 1-2-1 formation', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      expect(() => validateTeamConfig(config)).toThrow('Pairs substitution is only supported with 2-2 formation');
    });

    test('should throw error for pairs with non-7 squad size', () => {
      const config = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      expect(() => validateTeamConfig(config)).toThrow('Pairs substitution is only supported with 7 players');
    });

    test('should validate valid pairs configuration', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
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
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
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
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      const result = validateAndCorrectTeamConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairRoleRotation: null
      });
      expect(result.corrections).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pairs to individual'),
          expect.stringContaining('pairRoleRotation')
        ])
      );
    });

    test('should auto-correct pairs with non-7 squad size', () => {
      const invalidConfig = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
      };

      const result = validateAndCorrectTeamConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairRoleRotation: null
      });
      expect(result.corrections).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pairs to individual'),
          expect.stringContaining('pairRoleRotation')
        ])
      );
    });

    test('should auto-correct pairs with both invalid formation and squad size', () => {
      const invalidConfig = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.PAIRS,
        pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION
      };

      const result = validateAndCorrectTeamConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
        pairRoleRotation: null
      });
      expect(result.corrections).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pairs to individual'),
          expect.stringContaining('pairRoleRotation')
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
});
