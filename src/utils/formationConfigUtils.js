/**
 * Formation Configuration Utilities
 * 
 * Centralized utilities for handling formation-aware team configurations,
 * legacy team mode mappings, and formation-related operations.
 * 
 * This module eliminates code duplication across 10+ files and provides
 * a single source of truth for team configuration operations.
 */

import { TEAM_MODES } from '../constants/playerConstants';
import { createTeamConfig, FORMATIONS } from '../constants/teamConfiguration';
import { getModeDefinition } from '../constants/gameModes';

/**
 * Legacy team mode to modern team config mappings
 * Single source of truth for all legacy conversions
 */
const LEGACY_TEAM_MODE_MAPPINGS = {
  [TEAM_MODES.PAIRS_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'pairs' },
  [TEAM_MODES.INDIVIDUAL_5]: { format: '5v5', squadSize: 5, formation: '2-2', substitutionType: 'individual' },
  [TEAM_MODES.INDIVIDUAL_6]: { format: '5v5', squadSize: 6, formation: '2-2', substitutionType: 'individual' },
  [TEAM_MODES.INDIVIDUAL_7]: { format: '5v5', squadSize: 7, formation: '2-2', substitutionType: 'individual' },
  [TEAM_MODES.INDIVIDUAL_8]: { format: '5v5', squadSize: 8, formation: '2-2', substitutionType: 'individual' },
  [TEAM_MODES.INDIVIDUAL_9]: { format: '5v5', squadSize: 9, formation: '2-2', substitutionType: 'individual' },
  [TEAM_MODES.INDIVIDUAL_10]: { format: '5v5', squadSize: 10, formation: '2-2', substitutionType: 'individual' }
};

/**
 * Gets the legacy team mode mapping for a given legacy team mode string
 * @param {string} legacyTeamMode - Legacy team mode string (e.g., 'pairs_7', 'individual_6')
 * @returns {Object|null} Team configuration mapping or null if not found
 */
export const getLegacyTeamModeMapping = (legacyTeamMode) => {
  return LEGACY_TEAM_MODE_MAPPINGS[legacyTeamMode] || null;
};

/**
 * Migrates from legacy team mode string to modern team config object
 * @param {string} legacyTeamMode - Legacy team mode string
 * @returns {Object} Team configuration object
 */
export const migrateFromLegacyTeamMode = (legacyTeamMode) => {
  
  const mapping = getLegacyTeamModeMapping(legacyTeamMode);
  if (!mapping) {
    console.warn(`Unknown legacy team mode: ${legacyTeamMode}, falling back to individual_7`);
    return createTeamConfig('5v5', 7, '2-2', 'individual');
  }
  
  const result = createTeamConfig(mapping.format, mapping.squadSize, mapping.formation, mapping.substitutionType);
  return result;
};

/**
 * Migrates from legacy team mode string to modern team config object (strict version)
 * Returns null for unknown legacy team modes instead of fallback
 * @param {string} legacyTeamMode - Legacy team mode string
 * @returns {Object|null} Team configuration object or null if unknown
 */
export const migrateFromLegacyTeamModeStrict = (legacyTeamMode) => {
  const mapping = getLegacyTeamModeMapping(legacyTeamMode);
  if (!mapping) {
    return null;
  }
  
  return createTeamConfig(mapping.format, mapping.squadSize, mapping.formation, mapping.substitutionType);
};


/**
 * Creates a formation-aware team configuration
 * Handles both legacy team mode strings and modern team config objects
 * @param {string|Object} teamMode - Legacy team mode string or modern team config object
 * @param {string} selectedFormation - Selected formation (e.g., '2-2', '1-2-1')
 * @returns {Object} Formation-aware team configuration object
 */
export const createFormationAwareTeamConfig = (teamMode, selectedFormation) => {

  // If it's already a modern team config object, optionally override formation
  if (typeof teamMode === 'object' && teamMode !== null) {
    if (selectedFormation && selectedFormation !== teamMode.formation) {
      return {
        ...teamMode,
        formation: selectedFormation
      };
    }
    return teamMode;
  }

  // If it's a legacy string and we have a selected formation, create formation-aware config
  if (typeof teamMode === 'string' && selectedFormation) {
    const mapping = getLegacyTeamModeMapping(teamMode);
    if (mapping) {
      return {
        ...mapping,
        formation: selectedFormation
      };
    }
    
    // Fallback: parse squad size from legacy string
    const squadSizeMatch = teamMode.match(/_(\d+)$/);
    const squadSize = squadSizeMatch ? parseInt(squadSizeMatch[1], 10) : 7;
    
    return {
      format: '5v5',
      squadSize,
      formation: selectedFormation,
      substitutionType: 'individual'
    };
  }

  // If it's a legacy string without selected formation, migrate normally
  if (typeof teamMode === 'string') {
    return migrateFromLegacyTeamMode(teamMode);
  }

  // Fallback to default configuration
  console.warn('Unknown teamMode type, falling back to default config:', teamMode);
  return createTeamConfig('5v5', 7, selectedFormation || '2-2', 'individual');
};

/**
 * Gets formation definition for either legacy team mode or modern team config
 * Provides unified access to mode definitions across the codebase
 * @param {string|Object} teamModeOrConfig - Legacy team mode string or modern team config object
 * @param {string} selectedFormation - Optional formation override
 * @returns {Object|null} Mode definition object or null if invalid
 */
export const getFormationDefinition = (teamModeOrConfig, selectedFormation = null) => {
  if (!teamModeOrConfig) {
    return null;
  }

  try {
    // If it's a legacy string, try getModeDefinition directly first
    if (typeof teamModeOrConfig === 'string') {
      const directResult = getModeDefinition(teamModeOrConfig);
      if (directResult && (!selectedFormation || directResult.formation === selectedFormation)) {
        return directResult;
      }
      
      // If we need formation override or direct lookup failed, create formation-aware config
      const formationAwareConfig = createFormationAwareTeamConfig(teamModeOrConfig, selectedFormation);
      return getModeDefinition(formationAwareConfig);
    }
    
    // For modern team config objects
    const formationAwareConfig = createFormationAwareTeamConfig(teamModeOrConfig, selectedFormation);
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
 * Gets all available legacy team mode strings
 * Useful for migration and validation operations
 * @returns {string[]} Array of legacy team mode strings
 */
export const getAllLegacyTeamModes = () => {
  return Object.keys(LEGACY_TEAM_MODE_MAPPINGS);
};

/**
 * Checks if a string is a valid legacy team mode
 * @param {string} teamMode - String to check
 * @returns {boolean} True if it's a valid legacy team mode
 */
export const isLegacyTeamMode = (teamMode) => {
  return typeof teamMode === 'string' && LEGACY_TEAM_MODE_MAPPINGS.hasOwnProperty(teamMode);
};

/**
 * Checks if an object is a modern team config
 * @param {*} teamConfig - Object to check
 * @returns {boolean} True if it's a modern team config object
 */
export const isModernTeamConfig = (teamConfig) => {
  return typeof teamConfig === 'object' && 
         teamConfig !== null &&
         typeof teamConfig.format === 'string' &&
         typeof teamConfig.squadSize === 'number' &&
         typeof teamConfig.formation === 'string' &&
         typeof teamConfig.substitutionType === 'string';
};