import { getModeDefinition as getModernModeDefinition } from '../constants/gameModes';
import { SUBSTITUTION_TYPES } from '../constants/teamConfiguration';

/**
 * Cross-screen formation utilities and standardization functions
 * Core position logic has been moved to src/game/logic/positionUtils.js
 * These functions are used across multiple screens for general formation queries
 * and formation structure standardization
 */

/**
 * Gets all positions for a formation including goalie
 * @param {Object} teamConfig - Team configuration object
 * @returns {string[]} Array of all position keys including goalie
 */
export function getAllPositions(teamConfig) {
  // Handle invalid inputs gracefully to match original behavior
  if (!teamConfig || typeof teamConfig !== 'object') {
    return [];
  }

  try {
    // Modern team config (with composite structure)
    if (teamConfig.format && teamConfig.squadSize && teamConfig.formation) {
      const modeDefinition = getModernModeDefinition(teamConfig);
      return modeDefinition ? modeDefinition.positionOrder : [];
    }

    // Legacy team config (with mode string) - this is deprecated
    // For now, return empty array since we're moving to modern team configs
    if (teamConfig.mode) {
      return [];
    }

    return [];
  } catch (error) {
    // Return empty array for any errors (invalid team modes, validation errors, etc.)
    return [];
  }
}

/**
 * Gets formation definition for a team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object|null} Mode definition object or null if invalid
 */
export function getModeDefinition(teamConfig) {
  if (!teamConfig || typeof teamConfig !== 'object') {
    return null;
  }

  // Modern team config (with composite structure)
  if (teamConfig.format && teamConfig.squadSize && teamConfig.formation) {
    return getModernModeDefinition(teamConfig);
  }

  // Legacy team config (with mode string) - this is deprecated
  // For now, return null since we're moving to modern team configs
  if (teamConfig.mode) {
    return null;
  }

  return null;
}

/**
 * Get the expected clean formation structure for a team configuration
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object} Expected formation template with null values
 */
export function getExpectedFormationStructure(teamConfig) {
  if (!teamConfig) {
    return {};
  }

  const modeDefinition = getModeDefinition(teamConfig);
  if (!modeDefinition) {
    return {};
  }

  // For pairs mode, return pair structure
  if (teamConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    return {
      goalie: null,
      leftPair: { defender: null, attacker: null },
      rightPair: { defender: null, attacker: null },
      subPair: { defender: null, attacker: null }
    };
  }

  const structure = { goalie: null };

  const fieldPositions = modeDefinition.fieldPositions || [];
  fieldPositions.forEach(positionKey => {
    structure[positionKey] = null;
  });

  const substitutePositions = modeDefinition.substitutePositions || [];
  substitutePositions.forEach(positionKey => {
    structure[positionKey] = null;
  });

  return structure;
}

/**
 * Validate that a formation structure matches the expected structure for a team config
 * @param {Object} formation - Formation object to validate
 * @param {Object} teamConfig - Team configuration object
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
export function validateFormationStructure(formation, teamConfig) {
  const errors = [];

  if (!formation || typeof formation !== 'object') {
    return { isValid: false, errors: ['Formation is null or not an object'] };
  }

  if (!teamConfig) {
    return { isValid: false, errors: ['Team config is required'] };
  }

  const expectedStructure = getExpectedFormationStructure(teamConfig);
  const expectedKeys = Object.keys(expectedStructure);
  const formationKeys = Object.keys(formation);

  // Check for missing required positions
  const missingKeys = expectedKeys.filter(key => !(key in formation));
  if (missingKeys.length > 0) {
    errors.push(`Missing required positions: ${missingKeys.join(', ')}`);
  }

  // Check for unexpected extra positions
  const extraKeys = formationKeys.filter(key => !expectedKeys.includes(key));
  if (extraKeys.length > 0) {
    errors.push(`Unexpected positions found: ${extraKeys.join(', ')}`);
  }

  // For pairs mode, validate pair structure
  if (teamConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    const pairKeys = ['leftPair', 'rightPair', 'subPair'];
    for (const pairKey of pairKeys) {
      const pair = formation[pairKey];
      if (pair && typeof pair === 'object') {
        if (!pair.hasOwnProperty('defender') || !pair.hasOwnProperty('attacker')) {
          errors.push(`${pairKey} must have defender and attacker properties`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize a messy formation structure to the expected clean structure
 * @param {Object} messyFormation - Formation object that may contain redundant/mixed data
 * @param {Object} teamConfig - Team configuration object
 * @param {string[]} squadSelection - Array of valid player IDs
 * @returns {Object} Cleaned formation structure
 */
export function normalizeFormationStructure(messyFormation, teamConfig, squadSelection = []) {
  if (!messyFormation || !teamConfig) {
    return getExpectedFormationStructure(teamConfig);
  }

  const cleanFormation = getExpectedFormationStructure(teamConfig);
  const squadSet = new Set(squadSelection);

  // Helper function to get a valid player ID from the messy formation
  const getValidPlayerId = (playerId) => {
    if (!playerId || (squadSelection.length > 0 && !squadSet.has(playerId))) {
      return null;
    }
    return playerId;
  };

  // Clean goalie position
  cleanFormation.goalie = getValidPlayerId(messyFormation.goalie);

  if (teamConfig.substitutionType === SUBSTITUTION_TYPES.PAIRS) {
    // Normalize pairs mode
    const pairKeys = ['leftPair', 'rightPair', 'subPair'];

    for (const pairKey of pairKeys) {
      if (messyFormation[pairKey] && typeof messyFormation[pairKey] === 'object') {
        // Use existing pair structure if valid
        const pair = messyFormation[pairKey];
        cleanFormation[pairKey] = {
          defender: getValidPlayerId(pair.defender),
          attacker: getValidPlayerId(pair.attacker)
        };
      }
    }
  } else {
    const modeDefinition = getModeDefinition(teamConfig);

    if (modeDefinition) {
      (modeDefinition.fieldPositions || []).forEach(positionKey => {
        cleanFormation[positionKey] = getValidPlayerId(messyFormation[positionKey]);
      });

      (modeDefinition.substitutePositions || []).forEach(positionKey => {
        const legacyKey = positionKey === 'substitute_1' && messyFormation.substitute
          ? 'substitute'
          : positionKey;
        cleanFormation[positionKey] = getValidPlayerId(messyFormation[legacyKey]);
      });
    }
  }

  return cleanFormation;
}
