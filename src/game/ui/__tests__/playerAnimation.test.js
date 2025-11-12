/**
 * Unit tests for player animation utility functions
 * Tests animation property delegation and formatting
 */

import { getPlayerAnimation } from '../playerAnimation';
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
        zIndexClass: '',
        styleProps: {}
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

    test('should handle no animation scenario', () => {
      animationSupport.getPlayerAnimationProps.mockReturnValue(null);
      
      const individualResult = getPlayerAnimation('player1', { isAnimating: false });
      
      expect(individualResult).toEqual({
        animationClass: '',
        zIndexClass: '',
        styleProps: {}
      });
    });
  });
});
