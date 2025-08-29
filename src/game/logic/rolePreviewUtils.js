/**
 * Role Preview Utilities for Pair Role Rotation Feature
 * 
 * Provides functions to calculate and display upcoming roles for players 
 * in pairs substitution mode when role rotation is enabled.
 */

import { PAIR_ROLE_ROTATION_TYPES } from '../../constants/teamConfiguration';

/**
 * Determines if role preview should be shown for a given pair and team configuration
 * 
 * @param {string} pairKey - The pair key ('leftPair', 'rightPair', 'subPair')
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if role preview should be shown
 */
export const shouldShowRolePreview = (pairKey, teamConfig) => {
  // Only show preview for substitute pairs
  if (pairKey !== 'subPair') {
    return false;
  }
  
  // Only show preview when role rotation is set to swap every rotation
  return teamConfig?.pairRoleRotation === PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION;
};

/**
 * Calculates the upcoming role for a player when they next enter the field
 * 
 * @param {string} playerId - The player's ID
 * @param {Object} pairData - The pair object containing defender and attacker IDs
 * @param {string} pairKey - The pair key ('leftPair', 'rightPair', 'subPair')
 * @param {Object} teamConfig - Team configuration object
 * @returns {string|null} The upcoming role ('defender' or 'attacker') or null if no preview
 */
export const getRolePreview = (playerId, pairData, pairKey, teamConfig) => {
  // Only calculate preview if it should be shown
  if (!shouldShowRolePreview(pairKey, teamConfig)) {
    return null;
  }
  
  // Ensure pairData is valid
  if (!pairData || !pairData.defender || !pairData.attacker) {
    return null;
  }
  
  // Determine current role and return swapped role
  const isCurrentlyDefender = pairData.defender === playerId;
  const isCurrentlyAttacker = pairData.attacker === playerId;
  
  if (isCurrentlyDefender) {
    return 'attacker';
  } else if (isCurrentlyAttacker) {
    return 'defender';
  }
  
  // Player not found in this pair
  return null;
};

/**
 * Gets the current role of a player within a pair
 * 
 * @param {string} playerId - The player's ID  
 * @param {Object} pairData - The pair object containing defender and attacker IDs
 * @returns {string|null} The current role ('defender' or 'attacker') or null if not found
 */
export const getCurrentRole = (playerId, pairData) => {
  if (!pairData || !playerId) {
    return null;
  }
  
  if (pairData.defender === playerId) {
    return 'defender';
  } else if (pairData.attacker === playerId) {
    return 'attacker';
  }
  
  return null;
};

/**
 * Formats role display information including preview if applicable
 * 
 * @param {string} currentRole - Current role ('defender' or 'attacker')
 * @param {string|null} previewRole - Upcoming role or null if no preview
 * @param {boolean} showPreview - Whether to show the preview
 * @returns {Object} Display information with role text and preview text
 */
export const formatRoleDisplay = (currentRole, previewRole, showPreview) => {
  const roleLabels = {
    defender: 'D',
    attacker: 'A'
  };
  
  const currentLabel = roleLabels[currentRole] || currentRole;
  
  if (showPreview && previewRole) {
    const previewLabel = roleLabels[previewRole] || previewRole;
    return {
      currentText: currentLabel,
      previewText: `Next: ${previewLabel}`,
      hasPreview: true
    };
  }
  
  return {
    currentText: currentLabel,
    previewText: null,
    hasPreview: false
  };
};

/**
 * Gets complete role information for a player in a pair including preview
 * 
 * @param {string} playerId - The player's ID
 * @param {Object} pairData - The pair object containing defender and attacker IDs  
 * @param {string} pairKey - The pair key ('leftPair', 'rightPair', 'subPair')
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object} Complete role information with current role, preview role, and display data
 */
export const getCompleteRoleInfo = (playerId, pairData, pairKey, teamConfig) => {
  const currentRole = getCurrentRole(playerId, pairData);
  const previewRole = getRolePreview(playerId, pairData, pairKey, teamConfig);
  const showPreview = shouldShowRolePreview(pairKey, teamConfig);
  const displayInfo = formatRoleDisplay(currentRole, previewRole, showPreview);
  
  return {
    currentRole,
    previewRole,
    showPreview,
    ...displayInfo
  };
};

/**
 * Utility to get role icon component based on role type
 * Used with existing Shield/Sword icon system
 * 
 * @param {string} role - Role type ('defender' or 'attacker')
 * @returns {string} Icon name for the role
 */
export const getRoleIcon = (role) => {
  switch (role) {
    case 'defender':
      return 'Shield';
    case 'attacker':
      return 'Sword';
    default:
      return 'Shield'; // Default to defender icon
  }
};