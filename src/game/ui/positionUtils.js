import React from 'react';
import { Shield, Sword, RotateCcw, Hand, ArrowDownUp } from 'lucide-react';
import { POSITION_DISPLAY_NAMES, ICON_STYLES } from '../../components/game/formations/constants';
import { supportsInactiveUsers } from '../../constants/gameModes';
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
 * Get indicator properties for N-player substitution logic
 */
export function getIndicatorProps(
  player,
  position,
  teamConfig,
  nextPlayerIdToSubOut,
  nextNextPlayerIdToSubOut,
  substitutePositions,
  substitutionCount = 1,
  rotationQueue = []
) {
  const playerId = player?.id;
  const isSubstitutePosition = substitutePositions.includes(position);

  // Get first N players from rotation queue (these are next to sub out)
  const nextNToSubOut = rotationQueue.slice(0, substitutionCount);

  // Get first N substitute positions (these are next to sub in)
  const nextNSubstitutePositions = substitutePositions.slice(0, substitutionCount);

  const indicators = {
    isNextOff: nextNToSubOut.includes(playerId),
    isNextOn: isSubstitutePosition && nextNSubstitutePositions.includes(position),
    isNextNextOff: false, // Removed: no next-next indicators
    isNextNextOn: false   // Removed: no next-next indicators
  };

  return indicators;
}

/**
 * Maps substitute positions to their target field positions based on rotation queue
 * @param {Array} rotationQueue - Current rotation queue (on-field players in substitution order)
 * @param {Object} formation - Current formation object
 * @param {Array} fieldPositions - Array of field position keys
 * @param {Array} substitutePositions - Array of substitute position keys
 * @param {number} substitutionCount - Number of players to substitute
 * @returns {Object} Mapping of substitute position → target field position name
 */
export function getSubstituteTargetPositions(rotationQueue, formation, fieldPositions, substitutePositions, substitutionCount) {
  const mapping = {};

  // Get first N players from rotation queue (next to sub out)
  const nextNToSubOut = rotationQueue.slice(0, substitutionCount);

  // For each substitute position in the first N substitutes
  const nextNSubstitutePositions = substitutePositions.slice(0, substitutionCount);

  nextNSubstitutePositions.forEach((subPosition, index) => {
    if (index < nextNToSubOut.length) {
      const playerIdToSubOut = nextNToSubOut[index];

      // Find which field position this player currently occupies
      const targetFieldPosition = fieldPositions.find(pos => formation[pos] === playerIdToSubOut);

      if (targetFieldPosition) {
        mapping[subPosition] = targetFieldPosition;
      }
    }
  });

  return mapping;
}

/**
 * Extract long press event handlers for a position
 */
export function getPositionEvents(quickTapHandlers, position) {
  return quickTapHandlers[`${position}Events`] || {};
}
