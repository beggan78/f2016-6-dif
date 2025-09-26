import React from 'react';
import { Shield, Sword, RotateCcw, Hand, ArrowDownUp } from 'lucide-react';
import { POSITION_DISPLAY_NAMES, ICON_STYLES } from '../../components/game/formations/constants';
import { supportsInactiveUsers, supportsNextNextIndicators } from '../../constants/gameModes';
import { getPositionRole } from '../logic/positionUtils';
import { PLAYER_ROLES } from '../../constants/playerConstants';

/**
 * Game-screen UI utilities for position rendering
 * Handles position icons, display names, indicators, and formation-specific UI logic
 */

/**
 * Get the appropriate icon for a position based on role mapping
 */
export function getPositionIcon(position, substitutePositions) {
  // Handle goalie position
  if (position === 'goalie') {
    return <Hand className={ICON_STYLES.small} />;
  }
  
  // Handle substitute positions
  if (substitutePositions && substitutePositions.includes(position)) {
    return <RotateCcw className={ICON_STYLES.small} />;
  }

  const role = getPositionRole(position);

  switch (role) {
    case PLAYER_ROLES.DEFENDER:
      return <Shield className={ICON_STYLES.small} />;
    case PLAYER_ROLES.MIDFIELDER:
      return <ArrowDownUp className={ICON_STYLES.small} />;
    case PLAYER_ROLES.GOALIE:
      return <Hand className={ICON_STYLES.small} />;
    case PLAYER_ROLES.SUBSTITUTE:
      return <RotateCcw className={ICON_STYLES.small} />;
    case PLAYER_ROLES.ATTACKER:
    default:
      return <Sword className={ICON_STYLES.small} />;
  }
}

/**
 * Get the display name for a position, accounting for inactive status
 */
export function getPositionDisplayName(position, player, teamConfig, substitutePositions) {
  // Check if this formation supports inactive players
  const supportsInactive = supportsInactiveUsers(teamConfig);
  
  // For substitute positions with inactive support, check player status
  if (supportsInactive && substitutePositions.includes(position)) {
    if (player?.stats.isInactive) {
      return 'Inactive';
    }
  }
  
  return POSITION_DISPLAY_NAMES[position] || position;
}

/**
 * Get indicator properties for next/nextNext logic
 */
export function getIndicatorProps(player, position, teamConfig, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions) {
  const playerId = player?.id;
  const isSubstitutePosition = substitutePositions.includes(position);
  const supportsNextNext = supportsNextNextIndicators(teamConfig);
  
  const indicators = {
    isNextOff: playerId === nextPlayerIdToSubOut,
    isNextOn: isSubstitutePosition && position === substitutePositions[0], // First substitute is "next on"
    isNextNextOff: supportsNextNext ? playerId === nextNextPlayerIdToSubOut : false,
    isNextNextOn: supportsNextNext && isSubstitutePosition && position === substitutePositions[1] // Second substitute is "next next on"
  };
  
  
  return indicators;
}

/**
 * Extract long press event handlers for a position
 */
export function getPositionEvents(quickTapHandlers, position) {
  return quickTapHandlers[`${position}Events`] || {};
}


/**
 * Re-export supportsNextNextIndicators from gameModes for backward compatibility
 */
export { supportsNextNextIndicators } from '../../constants/gameModes';
