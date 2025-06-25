import { getPlayerAnimationProps } from '../animation/animationSupport';

/**
 * Game-screen utility functions for getting player animation properties
 * Handles animation classes, z-index, and style props
 */

/**
 * Utility function for getting player animation properties
 * Handles animation classes, z-index, and style props
 */
export function getPlayerAnimation(playerId, animationState) {
  const animationProps = getPlayerAnimationProps(playerId, animationState);
  
  if (animationProps) {
    return {
      animationClass: animationProps.animationClass,
      zIndexClass: animationProps.zIndexClass,
      styleProps: animationProps.styleProps
    };
  }
  
  return {
    animationClass: '',
    zIndexClass: '',
    styleProps: {}
  };
}

/**
 * Utility function for pairs formation animation - checks both defender and attacker
 * Returns animation props from whichever player is moving
 */
export function getPairAnimation(defenderPlayerId, attackerPlayerId, animationState) {
  const defenderAnimationProps = getPlayerAnimationProps(defenderPlayerId, animationState);
  const attackerAnimationProps = getPlayerAnimationProps(attackerPlayerId, animationState);
  
  // Use the animation props from whichever player is moving
  const animationProps = defenderAnimationProps || attackerAnimationProps;
  
  if (animationProps) {
    return {
      animationClass: animationProps.animationClass,
      zIndexClass: animationProps.zIndexClass,
      styleProps: animationProps.styleProps
    };
  }
  
  return {
    animationClass: '',
    zIndexClass: '',
    styleProps: {}
  };
}