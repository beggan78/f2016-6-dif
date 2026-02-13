import { orderFieldPositionsForDisplay, groupFieldPositionsByRole } from '../positionDisplayOrder';
import { PLAYER_ROLES } from '../../constants/playerConstants';

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

describe('groupFieldPositionsByRole', () => {
  describe('input handling', () => {
    it('should return empty array for undefined input', () => {
      expect(groupFieldPositionsByRole()).toEqual([]);
    });

    it('should return empty array for null input', () => {
      expect(groupFieldPositionsByRole(null)).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(groupFieldPositionsByRole([])).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      expect(groupFieldPositionsByRole('leftDefender')).toEqual([]);
    });
  });

  describe('2-2 formation', () => {
    it('should group into Attacker and Defender roles in display order', () => {
      const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];

      const groups = groupFieldPositionsByRole(positions);

      expect(groups).toHaveLength(2);
      expect(groups[0].role).toBe(PLAYER_ROLES.ATTACKER);
      expect(groups[0].positions).toEqual(['leftAttacker', 'rightAttacker']);
      expect(groups[1].role).toBe(PLAYER_ROLES.DEFENDER);
      expect(groups[1].positions).toEqual(['leftDefender', 'rightDefender']);
    });
  });

  describe('1-2-1 formation', () => {
    it('should group into Attacker, Midfielder, and Defender roles in display order', () => {
      const positions = ['defender', 'left', 'right', 'attacker'];

      const groups = groupFieldPositionsByRole(positions);

      expect(groups).toHaveLength(3);
      expect(groups[0].role).toBe(PLAYER_ROLES.ATTACKER);
      expect(groups[0].positions).toEqual(['attacker']);
      expect(groups[1].role).toBe(PLAYER_ROLES.MIDFIELDER);
      expect(groups[1].positions).toEqual(['left', 'right']);
      expect(groups[2].role).toBe(PLAYER_ROLES.DEFENDER);
      expect(groups[2].positions).toEqual(['defender']);
    });
  });

  describe('edge cases', () => {
    it('should skip positions with no recognized role', () => {
      const positions = ['leftAttacker', 'mystery', 'rightDefender'];

      const groups = groupFieldPositionsByRole(positions);

      expect(groups).toHaveLength(2);
      expect(groups[0].role).toBe(PLAYER_ROLES.ATTACKER);
      expect(groups[0].positions).toEqual(['leftAttacker']);
      expect(groups[1].role).toBe(PLAYER_ROLES.DEFENDER);
      expect(groups[1].positions).toEqual(['rightDefender']);
    });
  });
});
