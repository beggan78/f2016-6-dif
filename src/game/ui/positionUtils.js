import React from 'react';
import { Shield, Sword, RotateCcw, Hand, Circle } from 'lucide-react';
import { POSITION_DISPLAY_NAMES, ICON_STYLES } from '../../components/game/formations/constants';
import { supportsInactiveUsers, supportsNextNextIndicators, POSITION_ROLE_MAP } from '../../constants/gameModes';
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
  
  // Use role mapping for field positions
  const role = POSITION_ROLE_MAP[position];
  
  switch (role) {
    case PLAYER_ROLES.DEFENDER:
      return <Shield className={ICON_STYLES.small} />;
    case PLAYER_ROLES.MIDFIELDER:
      return <Circle className={ICON_STYLES.small} />;
    case PLAYER_ROLES.ATTACKER:
      return <Sword className={ICON_STYLES.small} />;
    case PLAYER_ROLES.GOALIE:
      return <Hand className={ICON_STYLES.small} />;
    case PLAYER_ROLES.SUBSTITUTE:
      return <RotateCcw className={ICON_STYLES.small} />;
    default:
      // Fallback for unknown positions
      return <Sword className={ICON_STYLES.small} />;
  }
}

/**
 * Get the display name for a position, accounting for inactive status
 */
export function getPositionDisplayName(position, player, teamMode, substitutePositions) {
  // Check if this formation supports inactive players
  const supportsInactivePlayers = supportsInactiveUsers(teamMode);
  
  // For substitute positions with inactive support, check player status
  if (supportsInactivePlayers && substitutePositions.includes(position)) {
    if (player?.stats.isInactive) {
      return 'Inactive';
    }
  }
  
  return POSITION_DISPLAY_NAMES[position] || position;
}

/**
 * Get indicator properties for next/nextNext logic
 */
export function getIndicatorProps(player, position, teamMode, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions) {
  const playerId = player?.id;
  const isSubstitutePosition = substitutePositions.includes(position);
  const supportsNextNext = supportsNextNextIndicators(teamMode);
  
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
export function getPositionEvents(longPressHandlers, position) {
  return longPressHandlers[`${position}Events`] || {};
}

/**
 * Check if a formation supports inactive players
 * @deprecated Use supportsInactiveUsers from gameModes.js instead
 */
export function supportsInactivePlayers(teamMode) {
  return supportsInactiveUsers(teamMode);
}

/**
 * Re-export supportsNextNextIndicators from gameModes for backward compatibility
 */
export { supportsNextNextIndicators } from '../../constants/gameModes';