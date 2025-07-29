import { getAllPositions as getPositionsFromGameModes, getModeDefinition as getModeDefinitionDynamic } from '../constants/gameModes';
import { TEAM_MODES } from '../constants/playerConstants';

/**
 * Cross-screen formation utilities
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 */

/**
 * Legacy mode definition mapper for backward compatibility
 * Maps legacy team mode strings to team configurations
 */
const getLegacyModeDefinition = (legacyTeamMode) => {
  const legacyMappings = {
    [TEAM_MODES.PAIRS_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
    [TEAM_MODES.INDIVIDUAL_5]: { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_6]: { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_8]: { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_9]: { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
    [TEAM_MODES.INDIVIDUAL_10]: { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
  };
  
  const teamConfig = legacyMappings[legacyTeamMode];
  if (!teamConfig) {
    return null;
  }
  
  try {
    return getModeDefinitionDynamic(teamConfig);
  } catch (error) {
    return null;
  }
};

/**
 * Gets all positions for a formation including goalie
 * @param {string} teamMode - Legacy team mode string
 * @returns {string[]} Array of all position keys including goalie
 */
export function getAllPositions(teamMode) {
  // Handle invalid inputs gracefully to match original behavior
  if (!teamMode || typeof teamMode !== 'string') {
    return [];
  }
  
  try {
    return getPositionsFromGameModes(teamMode);
  } catch (error) {
    // Return empty array for any errors (invalid team modes, validation errors, etc.)
    return [];
  }
}

/**
 * Gets formation definition for a team mode
 * @param {string} teamMode - Legacy team mode string  
 * @returns {Object|null} Mode definition object or null if invalid
 */
export function getModeDefinition(teamMode) {
  if (!teamMode || typeof teamMode !== 'string') {
    return null;
  }
  
  return getLegacyModeDefinition(teamMode);
}