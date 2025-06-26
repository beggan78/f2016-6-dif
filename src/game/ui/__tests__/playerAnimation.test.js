/**
 * Unit tests for player animation utility functions
 * Tests animation property delegation and formatting
 */

import { getPlayerAnimation, getPairAnimation } from '../playerAnimation';
import * as animationSupport from '../../animation/animationSupport';

// Mock the animation support module
jest.mock('../../animation/animationSupport', () => ({
  getPlayerAnimationProps: jest.fn()
}));

describe('playerAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlayerAnimation', () => {
    test('should return animation props when player has animation', () => {
      const mockAnimationProps = {
        animationClass: 'animate-move-up-100',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '100px' }
      };
      
      animationSupport.getPlayerAnimationProps.mockReturnValue(mockAnimationProps);
      
      const result = getPlayerAnimation('player1', { isAnimating: true });
      
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('player1', { isAnimating: true });
      expect(result).toEqual({
        animationClass: 'animate-move-up-100',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '100px' }
      });
    });

    test('should return empty props when player has no animation', () => {
      animationSupport.getPlayerAnimationProps.mockReturnValue(null);
      
      const result = getPlayerAnimation('player1', { isAnimating: false });
      
      expect(result).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
    });

    test('should return empty props when animation props are undefined', () => {
      animationSupport.getPlayerAnimationProps.mockReturnValue(undefined);
      
      const result = getPlayerAnimation('player1', {});
      
      expect(result).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
    });

    test('should handle missing animation properties gracefully', () => {
      const incompleteProps = {
        animationClass: 'animate-move-down-50'
        // Missing zIndexClass and styleProps
      };
      
      animationSupport.getPlayerAnimationProps.mockReturnValue(incompleteProps);
      
      const result = getPlayerAnimation('player1', { isAnimating: true });
      
      expect(result).toEqual({
        animationClass: 'animate-move-down-50',
        zIndexClass: undefined,
        styleProps: undefined
      });
    });

    test('should pass through all animation state properties', () => {
      const complexAnimationState = {
        isAnimating: true,
        animatingPlayers: {
          player1: { isMoving: true, direction: 'up', distance: 150 }
        },
        hideNextOffIndicator: true,
        recentlySubstitutedPlayers: new Set(['player2'])
      };

      animationSupport.getPlayerAnimationProps.mockReturnValue(null);
      
      getPlayerAnimation('player1', complexAnimationState);
      
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('player1', complexAnimationState);
    });
  });

  describe('getPairAnimation', () => {
    test('should return defender animation when defender is moving', () => {
      const defenderAnimation = {
        animationClass: 'animate-move-up-200',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '200px' }
      };
      
      animationSupport.getPlayerAnimationProps
        .mockReturnValueOnce(defenderAnimation) // defender call
        .mockReturnValueOnce(null); // attacker call
      
      const result = getPairAnimation('defender1', 'attacker1', { isAnimating: true });
      
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('defender1', { isAnimating: true });
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('attacker1', { isAnimating: true });
      expect(result).toEqual({
        animationClass: 'animate-move-up-200',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '200px' }
      });
    });

    test('should return attacker animation when attacker is moving', () => {
      const attackerAnimation = {
        animationClass: 'animate-move-down-75',
        zIndexClass: 'z-index-moving-down',
        styleProps: { '--move-distance': '75px' }
      };
      
      animationSupport.getPlayerAnimationProps
        .mockReturnValueOnce(null) // defender call
        .mockReturnValueOnce(attackerAnimation); // attacker call
      
      const result = getPairAnimation('defender1', 'attacker1', { isAnimating: true });
      
      expect(result).toEqual({
        animationClass: 'animate-move-down-75',
        zIndexClass: 'z-index-moving-down',
        styleProps: { '--move-distance': '75px' }
      });
    });

    test('should prioritize defender animation when both are moving', () => {
      const defenderAnimation = {
        animationClass: 'animate-move-up-100',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '100px' }
      };
      
      const attackerAnimation = {
        animationClass: 'animate-move-up-100',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '100px' }
      };
      
      animationSupport.getPlayerAnimationProps
        .mockReturnValueOnce(defenderAnimation) // defender call
        .mockReturnValueOnce(attackerAnimation); // attacker call
      
      const result = getPairAnimation('defender1', 'attacker1', { isAnimating: true });
      
      // Should use defender animation (first truthy value)
      expect(result).toEqual({
        animationClass: 'animate-move-up-100',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '100px' }
      });
    });

    test('should return empty props when neither player is moving', () => {
      animationSupport.getPlayerAnimationProps
        .mockReturnValueOnce(null) // defender call
        .mockReturnValueOnce(null); // attacker call
      
      const result = getPairAnimation('defender1', 'attacker1', { isAnimating: false });
      
      expect(result).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
    });

    test('should handle undefined animation props gracefully', () => {
      animationSupport.getPlayerAnimationProps
        .mockReturnValueOnce(undefined) // defender call
        .mockReturnValueOnce(undefined); // attacker call
      
      const result = getPairAnimation('defender1', 'attacker1', {});
      
      expect(result).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
    });

    test('should call animation support for both players', () => {
      const animationState = { isAnimating: true };
      
      animationSupport.getPlayerAnimationProps.mockReturnValue(null);
      
      getPairAnimation('defender1', 'attacker1', animationState);
      
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledTimes(2);
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('defender1', animationState);
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('attacker1', animationState);
    });

    test('should handle different player IDs correctly', () => {
      animationSupport.getPlayerAnimationProps.mockReturnValue(null);
      
      getPairAnimation('player5', 'player6', { isAnimating: false });
      
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('player5', { isAnimating: false });
      expect(animationSupport.getPlayerAnimationProps).toHaveBeenCalledWith('player6', { isAnimating: false });
    });
  });

  describe('integration scenarios', () => {
    test('should handle typical individual player animation scenario', () => {
      const individualAnimation = {
        animationClass: 'animate-move-down-125',
        zIndexClass: 'z-index-moving-down',
        styleProps: { '--move-distance': '125px' }
      };
      
      animationSupport.getPlayerAnimationProps.mockReturnValue(individualAnimation);
      
      const result = getPlayerAnimation('player3', {
        isAnimating: true,
        animatingPlayers: {
          player3: { isMoving: true, direction: 'down', distance: 125 }
        }
      });
      
      expect(result.animationClass).toBe('animate-move-down-125');
      expect(result.zIndexClass).toBe('z-index-moving-down');
      expect(result.styleProps).toEqual({ '--move-distance': '125px' });
    });

    test('should handle typical pair animation scenario', () => {
      const pairAnimation = {
        animationClass: 'animate-move-up-84',
        zIndexClass: 'z-index-moving-up',
        styleProps: { '--move-distance': '84px' }
      };
      
      // Both players in pair move together
      animationSupport.getPlayerAnimationProps
        .mockReturnValueOnce(pairAnimation) // defender
        .mockReturnValueOnce(pairAnimation); // attacker
      
      const result = getPairAnimation('defender2', 'attacker2', {
        isAnimating: true,
        animatingPlayers: {
          defender2: { isMoving: true, direction: 'up', distance: 84 },
          attacker2: { isMoving: true, direction: 'up', distance: 84 }
        }
      });
      
      expect(result.animationClass).toBe('animate-move-up-84');
      expect(result.zIndexClass).toBe('z-index-moving-up');
    });

    test('should handle no animation scenario', () => {
      animationSupport.getPlayerAnimationProps.mockReturnValue(null);
      
      const individualResult = getPlayerAnimation('player1', { isAnimating: false });
      const pairResult = getPairAnimation('defender1', 'attacker1', { isAnimating: false });
      
      expect(individualResult).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
      
      expect(pairResult).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
    });
  });
});