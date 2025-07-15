/**
 * Generalized carousel substitution patterns for individual modes
 * 
 * This module provides a unified system for handling substitution patterns across
 * all individual modes (6, 7, and 8-player), replacing hardcoded logic with
 * configuration-driven patterns.
 */

/**
 * Defines carousel substitution patterns for different individual modes
 */
export const CAROUSEL_PATTERNS = {
  simple: {
    // 6-player: direct swap between field player and substitute_1
    getSubstitutionMapping: (outgoingPlayer, substitutePositions, formation) => ({
      [outgoingPlayer]: substitutePositions[0], // Field player → substitute_1
      [formation[substitutePositions[0]]]: outgoingPlayer // substitute_1 → field
    })
  },
  
  carousel: {
    // 7-player: 3-position rotation
    // Field player → substitute_2, substitute_2 → substitute_1, substitute_1 → field
    getSubstitutionMapping: (outgoingPlayer, substitutePositions, formation) => ({
      [outgoingPlayer]: substitutePositions[1], // Field player → substitute_2
      [formation[substitutePositions[1]]]: substitutePositions[0], // substitute_2 → substitute_1
      [formation[substitutePositions[0]]]: outgoingPlayer // substitute_1 → field
    })
  },
  
  advanced_carousel: {
    // 8-player: Field player goes to bottom, all substitutes move up
    // Field player → substitute_3, substitute_1 → field, substitute_2 → substitute_1, substitute_3 → substitute_2
    getSubstitutionMapping: (outgoingPlayer, substitutePositions, formation) => {
      const mapping = {};
      
      // Field player goes to bottom substitute position
      mapping[outgoingPlayer] = substitutePositions[2]; // substitute_3
      
      // All substitutes move up one position
      mapping[formation[substitutePositions[1]]] = substitutePositions[0]; // substitute_2 → substitute_1
      mapping[formation[substitutePositions[2]]] = substitutePositions[1]; // substitute_3 → substitute_2
      
      // substitute_1 goes to field (this is handled by the field position assignment)
      // We don't need to explicitly map it since it's handled by the calling code
      
      return mapping;
    }
  }
};

/**
 * Gets the carousel substitution mapping for a given pattern
 * 
 * @param {string} pattern - The carousel pattern type ('simple', 'carousel', 'advanced_carousel')
 * @param {string} outgoingPlayer - The field player being substituted out
 * @param {Array<string>} substitutePositions - Array of substitute position keys for the team mode
 * @param {Object} formation - Current formation object
 * @returns {Object} Mapping of player IDs to their new positions
 * @throws {Error} If pattern is unknown
 */
export const getCarouselMapping = (pattern, outgoingPlayer, substitutePositions, formation) => {
  const carouselPattern = CAROUSEL_PATTERNS[pattern];
  if (!carouselPattern) {
    throw new Error(`Unknown carousel pattern: ${pattern}`);
  }
  
  return carouselPattern.getSubstitutionMapping(outgoingPlayer, substitutePositions, formation);
};

/**
 * Helper function to get the field position key for a given player
 * 
 * @param {string} playerId - The player ID to find
 * @param {Object} formation - Current formation object
 * @param {Array<string>} fieldPositions - Array of field position keys
 * @returns {string|null} The position key where the player is located, or null if not found
 */
export const getPlayerFieldPosition = (playerId, formation, fieldPositions) => {
  return fieldPositions.find(position => formation[position] === playerId) || null;
};

/**
 * Helper function to apply carousel mapping to formation
 * 
 * @param {Object} formation - Current formation object
 * @param {Object} carouselMapping - Mapping from getCarouselMapping()
 * @param {Array<string>} fieldPositions - Array of field position keys
 * @param {Array<string>} substitutePositions - Array of substitute position keys
 * @returns {Object} New formation with carousel mapping applied
 */
export const applyCarouselMapping = (formation, carouselMapping, fieldPositions, substitutePositions) => {
  const newFormation = { ...formation };
  
  Object.entries(carouselMapping).forEach(([playerId, newPosition]) => {
    if (substitutePositions.includes(newPosition)) {
      // Player going to substitute position
      newFormation[newPosition] = playerId;
    } else {
      // Player going to field position - find the position key
      const fieldPosition = getPlayerFieldPosition(playerId, formation, fieldPositions);
      if (fieldPosition) {
        newFormation[fieldPosition] = carouselMapping[formation[newPosition]] || playerId;
      }
    }
  });
  
  return newFormation;
};

/**
 * Validates that a carousel pattern can be applied to the given formation
 * 
 * @param {string} pattern - The carousel pattern type
 * @param {Object} formation - Current formation object
 * @param {Array<string>} substitutePositions - Array of substitute position keys
 * @returns {boolean} True if pattern can be applied, false otherwise
 */
export const validateCarouselPattern = (pattern, formation, substitutePositions) => {
  const carouselPattern = CAROUSEL_PATTERNS[pattern];
  if (!carouselPattern) {
    return false;
  }
  
  // Check that all substitute positions have players
  return substitutePositions.every(position => formation[position] != null);
};