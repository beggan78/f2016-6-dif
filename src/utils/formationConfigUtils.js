/**
 * Formation Configuration Utilities
 * 
 * Utilities for handling team configurations and formation-related operations.
 * Works exclusively with modern teamConfig objects.
 */

import { FORMATIONS } from '../constants/teamConfiguration';
import { getModeDefinition } from '../constants/gameModes';

/**
 * Gets formation definition for team config object
 * @param {Object} teamConfig - Team configuration object
 * @param {string} selectedFormation - Optional formation override
 * @returns {Object|null} Mode definition object or null if invalid
 */
export const getFormationDefinition = (teamConfig, selectedFormation = null) => {
  if (!teamConfig || typeof teamConfig !== 'object') {
    return null;
  }

  try {
    // Create formation-aware config if needed
    const formationAwareConfig = selectedFormation && selectedFormation !== teamConfig.formation
      ? { ...teamConfig, formation: selectedFormation }
      : teamConfig;
      
    return getModeDefinition(formationAwareConfig);
  } catch (error) {
    console.warn('Failed to get formation definition:', error);
    return null;
  }
};

/**
 * Validates if a formation is compatible with a team configuration
 * @param {string} formation - Formation to validate (e.g., '2-2', '1-2-1')
 * @param {Object} teamConfig - Team configuration object
 * @returns {boolean} True if formation is compatible
 */
export const isFormationCompatible = (formation, teamConfig) => {
  if (!formation || !teamConfig) {
    return false;
  }

  // Check if formation exists in constants
  const formationExists = Object.values(FORMATIONS).includes(formation);
  if (!formationExists) {
    return false;
  }

  // Test if we can create a valid mode definition
  try {
    const testConfig = { ...teamConfig, formation };
    const modeDefinition = getModeDefinition(testConfig);
    return modeDefinition !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Checks if an object is a valid team config
 * @param {*} teamConfig - Object to check
 * @returns {boolean} True if it's a valid team config object
 */
export const isValidTeamConfig = (teamConfig) => {
  return typeof teamConfig === 'object' && 
         teamConfig !== null &&
         typeof teamConfig.format === 'string' &&
         typeof teamConfig.squadSize === 'number' &&
         typeof teamConfig.formation === 'string' &&
         typeof teamConfig.substitutionType === 'string';
};