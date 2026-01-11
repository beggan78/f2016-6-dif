import { orderFieldPositionsForDisplay } from '../positionDisplayOrder';

describe('orderFieldPositionsForDisplay', () => {
  describe('input handling', () => {
    it('should return empty array for undefined input', () => {
      expect(orderFieldPositionsForDisplay()).toEqual([]);
    });

    it('should return empty array for null input', () => {
      expect(orderFieldPositionsForDisplay(null)).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(orderFieldPositionsForDisplay([])).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      expect(orderFieldPositionsForDisplay('leftDefender')).toEqual([]);
    });
  });

  describe('formation ordering', () => {
    it('should order 2-2 positions with attackers first then defenders', () => {
      const positions = ['rightDefender', 'leftAttacker', 'leftDefender', 'rightAttacker'];

      const ordered = orderFieldPositionsForDisplay(positions);

      expect(ordered).toEqual(['leftAttacker', 'rightAttacker', 'rightDefender', 'leftDefender']);
    });

    it('should order 1-2-1 positions with midfielders between attackers and defenders', () => {
      const positions = ['defender', 'right', 'attacker', 'left'];

      const ordered = orderFieldPositionsForDisplay(positions);

      expect(ordered).toEqual(['attacker', 'right', 'left', 'defender']);
    });

    it('should order attackers, midfielders, then defenders for mixed roles', () => {
      const positions = ['left', 'rightDefender', 'attacker', 'right'];

      const ordered = orderFieldPositionsForDisplay(positions);

      expect(ordered).toEqual(['attacker', 'left', 'right', 'rightDefender']);
    });
  });

  describe('edge cases', () => {
    it('should keep unknown positions after field roles in original order', () => {
      const positions = ['mystery', 'leftAttacker', 'rightDefender', 'unknownPosition'];

      const ordered = orderFieldPositionsForDisplay(positions);

      expect(ordered).toEqual(['leftAttacker', 'rightDefender', 'mystery', 'unknownPosition']);
    });

    it('should keep goalie and substitutes after field roles preserving order', () => {
      const positions = ['substitute_1', 'rightAttacker', 'goalie', 'leftDefender'];

      const ordered = orderFieldPositionsForDisplay(positions);

      expect(ordered).toEqual(['rightAttacker', 'leftDefender', 'substitute_1', 'goalie']);
    });
  });
});
