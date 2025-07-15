import React from 'react';
import { Shield, Sword, RotateCcw } from 'lucide-react';
import { POSITION_DISPLAY_NAMES, ICON_STYLES } from '../../components/game/formations/constants';
import { supportsInactiveUsers, supportsNextNextIndicators } from '../../constants/gameModes';

/**
 * Game-screen UI utilities for position rendering
 * Handles position icons, display names, indicators, and formation-specific UI logic
 */

/**
 * Get the appropriate icon for a position
 */
export function getPositionIcon(position, substitutePositions) {
  if (substitutePositions.includes(position)) {
    return <RotateCcw className={ICON_STYLES.small} />;
  } else if (position.includes('Defender')) {
    return <Shield className={ICON_STYLES.small} />;
  } else {
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
  
  // DEBUG: Log when a player has both indicators (this is the bug!)
  if (indicators.isNextOff && indicators.isNextOn) {
    console.error(`🚨 DUAL INDICATOR BUG DETECTED 🚨`);
    console.error(`Player ${playerId} (${player?.name}) at position ${position} has BOTH indicators:`);
    console.error(`- isNextOff: ${indicators.isNextOff} (playerId === nextPlayerIdToSubOut: ${playerId} === ${nextPlayerIdToSubOut})`);
    console.error(`- isNextOn: ${indicators.isNextOn} (isSubstitutePosition: ${isSubstitutePosition} && position === substitutePositions[0]: ${position} === ${substitutePositions[0]})`);
    console.error(`- Player stats:`, player?.stats);
    console.error(`- substitutePositions:`, substitutePositions);
    console.error(`- teamMode:`, teamMode);
    console.error(`Stack trace:`, new Error().stack);
  }
  
  // DEBUG: Log indicator calculation for debugging
  if (playerId && (indicators.isNextOff || indicators.isNextOn)) {
    console.log(`[INDICATOR DEBUG] Player ${playerId} (${player?.name}) at ${position}:`);
    console.log(`  - isNextOff: ${indicators.isNextOff} (nextPlayerIdToSubOut: ${nextPlayerIdToSubOut})`);
    console.log(`  - isNextOn: ${indicators.isNextOn} (first substitute: ${substitutePositions[0]})`);
    console.log(`  - isSubstitutePosition: ${isSubstitutePosition}`);
    console.log(`  - player.stats.isInactive: ${player?.stats?.isInactive}`);
  }
  
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