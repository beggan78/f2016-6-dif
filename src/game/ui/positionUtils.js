import React from 'react';
import { Shield, Sword, RotateCcw } from 'lucide-react';
import { TEAM_MODES } from '../../constants/playerConstants';
import { POSITION_DISPLAY_NAMES, ICON_STYLES } from '../../components/game/formations/constants';

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
  const supportsInactivePlayers = teamMode === TEAM_MODES.INDIVIDUAL_7;
  
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
  const supportsNextNextIndicators = teamMode === TEAM_MODES.INDIVIDUAL_7;
  
  return {
    isNextOff: playerId === nextPlayerIdToSubOut,
    isNextOn: isSubstitutePosition && position === substitutePositions[0], // First substitute is "next on"
    isNextNextOff: supportsNextNextIndicators ? playerId === nextNextPlayerIdToSubOut : false,
    isNextNextOn: supportsNextNextIndicators && isSubstitutePosition && position === substitutePositions[1] // Second substitute is "next next on"
  };
}

/**
 * Extract long press event handlers for a position
 */
export function getPositionEvents(longPressHandlers, position) {
  return longPressHandlers[`${position}Events`] || {};
}

/**
 * Check if a formation supports inactive players
 */
export function supportsInactivePlayers(teamMode) {
  return teamMode === TEAM_MODES.INDIVIDUAL_7;
}

/**
 * Check if a formation supports next/nextNext indicators
 */
export function supportsNextNextIndicators(teamMode) {
  return teamMode === TEAM_MODES.INDIVIDUAL_7;
}