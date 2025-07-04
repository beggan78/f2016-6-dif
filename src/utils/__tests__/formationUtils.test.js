import { getAllPositions, getModeDefinition } from '../formationUtils';
import { TEAM_MODES } from '../../constants/playerConstants';

describe('formationUtils', () => {
  describe('getAllPositions', () => {
    it('should return correct positions for PAIRS_7 mode', () => {
      const positions = getAllPositions(TEAM_MODES.PAIRS_7);
      expect(positions).toEqual(['goalie', 'leftPair', 'rightPair', 'subPair']);
    });

    it('should return correct positions for INDIVIDUAL_6 mode', () => {
      const positions = getAllPositions(TEAM_MODES.INDIVIDUAL_6);
      expect(positions).toEqual([
        'goalie', 
        'leftDefender', 
        'rightDefender', 
        'leftAttacker', 
        'rightAttacker', 
        'substitute'
      ]);
    });

    it('should return correct positions for INDIVIDUAL_7 mode', () => {
      const positions = getAllPositions(TEAM_MODES.INDIVIDUAL_7);
      expect(positions).toEqual([
        'goalie',
        'leftDefender7',
        'rightDefender7', 
        'leftAttacker7',
        'rightAttacker7',
        'substitute7_1',
        'substitute7_2'
      ]);
    });

    it('should return empty array for unknown team mode', () => {
      const positions = getAllPositions('UNKNOWN_MODE');
      expect(positions).toEqual([]);
    });

    it('should return empty array for null team mode', () => {
      const positions = getAllPositions(null);
      expect(positions).toEqual([]);
    });

    it('should return empty array for undefined team mode', () => {
      const positions = getAllPositions(undefined);
      expect(positions).toEqual([]);
    });

    it('should handle empty string team mode', () => {
      const positions = getAllPositions('');
      expect(positions).toEqual([]);
    });
  });

  describe('getModeDefinition', () => {
    it('should return complete definition for PAIRS_7 mode', () => {
      const definition = getModeDefinition(TEAM_MODES.PAIRS_7);
      
      expect(definition).toBeDefined();
      expect(definition.positions).toBeDefined();
      expect(definition.expectedCounts).toEqual({ outfield: 6, onField: 4 });
      expect(definition.positionOrder).toEqual(['goalie', 'leftPair', 'rightPair', 'subPair']);
      expect(definition.fieldPositions).toEqual(['leftPair', 'rightPair']);
      expect(definition.substitutePositions).toEqual(['subPair']);
    });

    it('should return complete definition for INDIVIDUAL_6 mode', () => {
      const definition = getModeDefinition(TEAM_MODES.INDIVIDUAL_6);
      
      expect(definition).toBeDefined();
      expect(definition.positions).toBeDefined();
      expect(definition.expectedCounts).toEqual({ outfield: 5, onField: 4 });
      expect(definition.positionOrder).toEqual([
        'goalie', 
        'leftDefender', 
        'rightDefender', 
        'leftAttacker', 
        'rightAttacker', 
        'substitute'
      ]);
      expect(definition.fieldPositions).toEqual([
        'leftDefender', 
        'rightDefender', 
        'leftAttacker', 
        'rightAttacker'
      ]);
      expect(definition.substitutePositions).toEqual(['substitute']);
    });

    it('should return complete definition for INDIVIDUAL_7 mode', () => {
      const definition = getModeDefinition(TEAM_MODES.INDIVIDUAL_7);
      
      expect(definition).toBeDefined();
      expect(definition.positions).toBeDefined();
      expect(definition.expectedCounts).toEqual({ outfield: 6, onField: 4 });
      expect(definition.positionOrder).toEqual([
        'goalie',
        'leftDefender7',
        'rightDefender7',
        'leftAttacker7',
        'rightAttacker7',
        'substitute7_1',
        'substitute7_2'
      ]);
      expect(definition.fieldPositions).toEqual([
        'leftDefender7',
        'rightDefender7', 
        'leftAttacker7',
        'rightAttacker7'
      ]);
      expect(definition.substitutePositions).toEqual(['substitute7_1', 'substitute7_2']);
    });

    it('should return null for unknown team mode', () => {
      const definition = getModeDefinition('UNKNOWN_MODE');
      expect(definition).toBeNull();
    });

    it('should return null for null team mode', () => {
      const definition = getModeDefinition(null);
      expect(definition).toBeNull();
    });

    it('should return null for undefined team mode', () => {
      const definition = getModeDefinition(undefined);
      expect(definition).toBeNull();
    });

    it('should return null for empty string team mode', () => {
      const definition = getModeDefinition('');
      expect(definition).toBeNull();
    });
  });

  describe('position definitions structure', () => {
    const teamModes = [TEAM_MODES.PAIRS_7, TEAM_MODES.INDIVIDUAL_6, TEAM_MODES.INDIVIDUAL_7];

    teamModes.forEach(teamMode => {
      describe(`${teamMode} structure validation`, () => {
        let definition;

        beforeEach(() => {
          definition = getModeDefinition(teamMode);
        });

        it('should have all required properties', () => {
          expect(definition).toHaveProperty('positions');
          expect(definition).toHaveProperty('expectedCounts');
          expect(definition).toHaveProperty('positionOrder');
          expect(definition).toHaveProperty('fieldPositions');
          expect(definition).toHaveProperty('substitutePositions');
        });

        it('should have goalie position defined', () => {
          expect(definition.positions).toHaveProperty('goalie');
          expect(definition.positions.goalie.key).toBe('goalie');
        });

        it('should have consistent position order with positions object', () => {
          definition.positionOrder.forEach(positionKey => {
            if (positionKey !== 'goalie' && !positionKey.includes('Pair')) {
              expect(definition.positions).toHaveProperty(positionKey);
            }
          });
        });

        it('should have field positions that are in position order', () => {
          definition.fieldPositions.forEach(fieldPos => {
            expect(definition.positionOrder).toContain(fieldPos);
          });
        });

        it('should have substitute positions that are in position order', () => {
          definition.substitutePositions.forEach(subPos => {
            expect(definition.positionOrder).toContain(subPos);
          });
        });

        it('should have positive expected counts', () => {
          expect(definition.expectedCounts.outfield).toBeGreaterThan(0);
          expect(definition.expectedCounts.onField).toBeGreaterThan(0);
          expect(definition.expectedCounts.onField).toBeLessThanOrEqual(definition.expectedCounts.outfield);
        });

        it('should have goalie as first position in order', () => {
          expect(definition.positionOrder[0]).toBe('goalie');
        });
      });
    });
  });

  describe('mode-specific behavior', () => {
    it('should handle PAIRS_7 pair positions correctly', () => {
      const definition = getModeDefinition(TEAM_MODES.PAIRS_7);
      
      expect(definition.positions.leftPair.type).toBe('pair');
      expect(definition.positions.rightPair.type).toBe('pair');
      expect(definition.positions.subPair.type).toBe('pair');
    });

    it('should handle INDIVIDUAL_6 roles correctly', () => {
      const definition = getModeDefinition(TEAM_MODES.INDIVIDUAL_6);
      
      expect(definition.positions.leftDefender.role).toBe('Defender');
      expect(definition.positions.rightDefender.role).toBe('Defender');
      expect(definition.positions.leftAttacker.role).toBe('Attacker');
      expect(definition.positions.rightAttacker.role).toBe('Attacker');
      expect(definition.positions.substitute.role).toBe('Substitute');
    });

    it('should handle INDIVIDUAL_7 roles correctly', () => {
      const definition = getModeDefinition(TEAM_MODES.INDIVIDUAL_7);
      
      expect(definition.positions.leftDefender7.role).toBe('Defender');
      expect(definition.positions.rightDefender7.role).toBe('Defender');
      expect(definition.positions.leftAttacker7.role).toBe('Attacker');
      expect(definition.positions.rightAttacker7.role).toBe('Attacker');
      expect(definition.positions.substitute7_1.role).toBe('Substitute');
      expect(definition.positions.substitute7_2.role).toBe('Substitute');
    });

    it('should have correct substitute count for each mode', () => {
      const pairs7Def = getModeDefinition(TEAM_MODES.PAIRS_7);
      const individual6Def = getModeDefinition(TEAM_MODES.INDIVIDUAL_6);
      const individual7Def = getModeDefinition(TEAM_MODES.INDIVIDUAL_7);

      expect(pairs7Def.substitutePositions).toHaveLength(1);
      expect(individual6Def.substitutePositions).toHaveLength(1);
      expect(individual7Def.substitutePositions).toHaveLength(2);
    });

    it('should have correct field position count for each mode', () => {
      const pairs7Def = getModeDefinition(TEAM_MODES.PAIRS_7);
      const individual6Def = getModeDefinition(TEAM_MODES.INDIVIDUAL_6);
      const individual7Def = getModeDefinition(TEAM_MODES.INDIVIDUAL_7);

      expect(pairs7Def.fieldPositions).toHaveLength(2); // 2 pairs
      expect(individual6Def.fieldPositions).toHaveLength(4); // 4 individual positions
      expect(individual7Def.fieldPositions).toHaveLength(4); // 4 individual positions
    });
  });

  describe('integration with position order', () => {
    it('should maintain consistent ordering across all modes', () => {
      const pairs7Positions = getAllPositions(TEAM_MODES.PAIRS_7);
      const individual6Positions = getAllPositions(TEAM_MODES.INDIVIDUAL_6);
      const individual7Positions = getAllPositions(TEAM_MODES.INDIVIDUAL_7);

      // All modes should start with goalie
      expect(pairs7Positions[0]).toBe('goalie');
      expect(individual6Positions[0]).toBe('goalie');
      expect(individual7Positions[0]).toBe('goalie');

      // All modes should have unique positions
      expect(new Set(pairs7Positions).size).toBe(pairs7Positions.length);
      expect(new Set(individual6Positions).size).toBe(individual6Positions.length);
      expect(new Set(individual7Positions).size).toBe(individual7Positions.length);
    });

    it('should have consistent position lengths', () => {
      const pairs7Positions = getAllPositions(TEAM_MODES.PAIRS_7);
      const individual6Positions = getAllPositions(TEAM_MODES.INDIVIDUAL_6);
      const individual7Positions = getAllPositions(TEAM_MODES.INDIVIDUAL_7);

      expect(pairs7Positions).toHaveLength(4); // goalie + 3 pairs
      expect(individual6Positions).toHaveLength(6); // goalie + 5 individual positions
      expect(individual7Positions).toHaveLength(7); // goalie + 6 individual positions
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle case-sensitive team mode names', () => {
      expect(getAllPositions('PAIRS_7')).toEqual([]);
      expect(getAllPositions('pairs_7')).not.toEqual([]);
      
      expect(getModeDefinition('INDIVIDUAL_6')).toBeNull();
      expect(getModeDefinition('individual_6')).not.toBeNull();
    });

    it('should handle numeric inputs', () => {
      expect(getAllPositions(7)).toEqual([]);
      expect(getAllPositions(6)).toEqual([]);
      expect(getModeDefinition(7)).toBeNull();
    });

    it('should handle object inputs', () => {
      expect(getAllPositions({})).toEqual([]);
      expect(getAllPositions([])).toEqual([]);
      expect(getModeDefinition({})).toBeNull();
    });

    it('should return consistent results for repeated calls', () => {
      const positions1 = getAllPositions(TEAM_MODES.PAIRS_7);
      const positions2 = getAllPositions(TEAM_MODES.PAIRS_7);
      
      expect(positions1).toEqual(positions2);
      expect(positions1).toEqual(['goalie', 'leftPair', 'rightPair', 'subPair']);
    });

    it('should return consistent definitions for repeated calls', () => {
      const def1 = getModeDefinition(TEAM_MODES.PAIRS_7);
      const def2 = getModeDefinition(TEAM_MODES.PAIRS_7);
      
      expect(def1).toEqual(def2);
      expect(def1.positionOrder).toEqual(['goalie', 'leftPair', 'rightPair', 'subPair']);
    });
  });
});