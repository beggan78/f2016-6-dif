/**
 * Debug Utility Functions
 * 
 * Utility functions for randomizing configurations and formations during development/testing.
 * These functions help speed up testing by automatically populating selections.
 */

/**
 * Fisher-Yates shuffle algorithm for randomizing arrays
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get random selection of players from a list
 * @param {Array} players - Array of player objects with id and name
 * @param {number} count - Number of players to select
 * @returns {Array} Array of randomly selected players
 */
export const getRandomPlayers = (players, count) => {
  if (count >= players.length) {
    return shuffleArray(players);
  }
  
  const shuffled = shuffleArray(players);
  return shuffled.slice(0, count);
};

/**
 * Create random goalie assignments for multiple periods
 * @param {Array} selectedPlayers - Array of selected player objects
 * @param {number} numPeriods - Number of periods to assign goalies for
 * @returns {Object} Object with period numbers as keys and player IDs as values
 */
export const randomizeGoalieAssignments = (selectedPlayers, numPeriods) => {
  const assignments = {};
  const shuffledPlayers = shuffleArray(selectedPlayers);
  
  for (let period = 1; period <= numPeriods; period++) {
    // Cycle through players if more periods than players
    const playerIndex = (period - 1) % shuffledPlayers.length;
    assignments[period] = shuffledPlayers[playerIndex].id;
  }
  
  return assignments;
};

/**
 * Randomize formation positions for different team modes
 * @param {Array} availablePlayers - Players available for positioning (excluding goalie)
 * @param {string} teamMode - Team mode (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7, INDIVIDUAL_8)
 * @returns {Object} Formation object with randomized player assignments
 */
export const randomizeFormationPositions = (availablePlayers, teamMode) => {
  const shuffled = shuffleArray(availablePlayers);
  const formation = {};
  
  if (teamMode === 'pairs_7') {
    // Pairs mode: 3 pairs (left, right, sub) with defender/attacker roles
    formation.leftPair = {
      defender: shuffled[0]?.id || null,
      attacker: shuffled[1]?.id || null
    };
    formation.rightPair = {
      defender: shuffled[2]?.id || null,
      attacker: shuffled[3]?.id || null
    };
    formation.subPair = {
      defender: shuffled[4]?.id || null,
      attacker: shuffled[5]?.id || null
    };
  } else if (teamMode === 'individual_6') {
    // Individual 6-player mode: 4 field positions + 1 substitute
    formation.leftDefender = shuffled[0]?.id || null;
    formation.rightDefender = shuffled[1]?.id || null;
    formation.leftAttacker = shuffled[2]?.id || null;
    formation.rightAttacker = shuffled[3]?.id || null;
    formation.substitute_1 = shuffled[4]?.id || null;
  } else if (teamMode === 'individual_7') {
    // Individual 7-player mode: 4 field positions + 2 substitutes
    formation.leftDefender = shuffled[0]?.id || null;
    formation.rightDefender = shuffled[1]?.id || null;
    formation.leftAttacker = shuffled[2]?.id || null;
    formation.rightAttacker = shuffled[3]?.id || null;
    formation.substitute_1 = shuffled[4]?.id || null;
    formation.substitute_2 = shuffled[5]?.id || null;
  } else if (teamMode === 'individual_8') {
    // Individual 8-player mode: 4 field positions + 3 substitutes
    formation.leftDefender = shuffled[0]?.id || null;
    formation.rightDefender = shuffled[1]?.id || null;
    formation.leftAttacker = shuffled[2]?.id || null;
    formation.rightAttacker = shuffled[3]?.id || null;
    formation.substitute_1 = shuffled[4]?.id || null;
    formation.substitute_2 = shuffled[5]?.id || null;
    formation.substitute_3 = shuffled[6]?.id || null;
  }
  
  return formation;
};

/**
 * Check if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
export const isDebugMode = () => {
  // Check URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'true') {
    return true;
  }
  
  // Check localStorage
  if (localStorage.getItem('debug-mode') === 'true') {
    return true;
  }
  
  // Check environment variable (for development builds)
  if (process.env.REACT_APP_DEBUG === 'true') {
    return true;
  }
  
  return false;
};

/**
 * Get random game configuration settings (optional enhancement)
 * @returns {Object} Random configuration settings
 */
export const getRandomGameSettings = () => {
  const periods = [1, 2][Math.floor(Math.random() * 2)]; // 1 or 2 periods
  const durations = [5, 10, 15, 20][Math.floor(Math.random() * 4)]; // Random duration
  const alerts = [1, 2, 3][Math.floor(Math.random() * 3)]; // Random alert timing
  
  return {
    numPeriods: periods,
    periodDurationMinutes: durations,
    alertMinutes: alerts
  };
};