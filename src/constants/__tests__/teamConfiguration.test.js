import {
  createTeamConfig,
  validateTeamConfig,
  validateAndCorrectTeamConfig,
  createDefaultTeamConfig,
  SUBSTITUTION_TYPES,
  FORMATIONS,
  FORMATS,
  FORMAT_CONFIGS,
  FORMATION_DEFINITIONS
} from '../teamConfiguration';

describe('Team Configuration', () => {
  describe('createTeamConfig', () => {
    test('should create team config for individual mode', () => {
      const config = createTeamConfig('5v5', 6, '2-2', SUBSTITUTION_TYPES.INDIVIDUAL);

      expect(config).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });

    test('should create team config for 1-2-1 formation', () => {
      const config = createTeamConfig('5v5', 7, '1-2-1', SUBSTITUTION_TYPES.INDIVIDUAL);

      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '1-2-1',
        substitutionType: 'individual'
      });
    });
  });

  describe('validateTeamConfig', () => {
    test('should validate individual config', () => {
      const config = {
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };

      expect(() => validateTeamConfig(config)).not.toThrow();
    });

    test('should validate 1-2-1 formation config', () => {
      const config = {
        format: '5v5',
        squadSize: 7,
        formation: FORMATIONS.FORMATION_1_2_1,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };

      expect(() => validateTeamConfig(config)).not.toThrow();
    });
  });

  describe('createDefaultTeamConfig', () => {
    test('should create default config for 6-player squad', () => {
      const config = createDefaultTeamConfig(6);

      expect(config).toEqual({
        format: '5v5',
        squadSize: 6,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });

    test('should create default config for 7-player squad', () => {
      const config = createDefaultTeamConfig(7);

      expect(config).toEqual({
        format: '5v5',
        squadSize: 7,
        formation: '2-2',
        substitutionType: 'individual'
      });
    });
  });

  describe('validateAndCorrectTeamConfig', () => {
    test('should return valid individual config unchanged', () => {
      const validConfig = {
        format: '5v5',
        squadSize: 6,
        formation: FORMATIONS.FORMATION_2_2,
        substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL
      };

      const result = validateAndCorrectTeamConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.correctedConfig).toEqual(validConfig);
      expect(result.corrections).toEqual([]);
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
