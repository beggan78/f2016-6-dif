/**
 * Debug Utility Functions
 * 
 * Utility functions for randomizing configurations and formations during development/testing.
 * These functions help speed up testing by automatically populating selections.
 * 
 * Also includes debug timing and logging utilities for troubleshooting performance issues.
 */

/**
 * Format current time for human-readable debug logs
 * @returns {string} Formatted time like "14:25:03.087"
 */
export const formatDebugTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

/**
 * Create a debug logger with consistent formatting
 * @param {string} component - Component name for log prefix
 * @returns {function} Logger function
 */
export const createDebugLogger = (component) => {
  return (operation, details = '') => {
    const timestamp = formatDebugTime();
    const detailsStr = details ? ` ${details}` : '';
    console.log(`[${timestamp}] [${component}] ${operation}${detailsStr}`);
  };
};

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
 * Randomize formation positions for different team configurations and formations
 * @param {Array} availablePlayers - Players available for positioning (excluding goalie)
 * @param {Object} teamConfig - Team configuration object with formation info
 * @returns {Object} Formation object with randomized player assignments
 */
export const randomizeFormationPositions = (availablePlayers, teamConfig) => {
  const shuffled = shuffleArray(availablePlayers);
  const formation = {};

  // Extract formation and substitution type from team config
  const selectedFormation = teamConfig?.formation || '2-2';
  const substitutionType = teamConfig?.substitutionType || 'individual';
  const squadSize = teamConfig?.squadSize || 7;
  const format = teamConfig?.format || '5v5';

  if (substitutionType === 'pairs') {
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
  } else {
    // Individual modes: Handle 5v5 and 7v7 formations
    let fieldPlayerCount;

    // Determine field player count based on format
    if (format === '7v7') {
      fieldPlayerCount = 6; // 7v7 has 6 field players
    } else {
      fieldPlayerCount = 4; // 5v5 has 4 field players (default)
    }

    const substituteCount = squadSize - fieldPlayerCount - 1; // Total - field players - goalie = substitutes

    // 5v5 Formations
    if (selectedFormation === '1-2-1') {
      // 1-2-1 Formation: defender, left mid, right mid, attacker + substitutes
      formation.defender = shuffled[0]?.id || null;
      formation.left = shuffled[1]?.id || null;
      formation.right = shuffled[2]?.id || null;
      formation.attacker = shuffled[3]?.id || null;

      // Add substitutes
      for (let i = 0; i < substituteCount; i++) {
        formation[`substitute_${i + 1}`] = shuffled[4 + i]?.id || null;
      }
    } else if (selectedFormation === '2-2') {
      // 2-2 Formation: left/right defenders and attackers + substitutes
      formation.leftDefender = shuffled[0]?.id || null;
      formation.rightDefender = shuffled[1]?.id || null;
      formation.leftAttacker = shuffled[2]?.id || null;
      formation.rightAttacker = shuffled[3]?.id || null;

      // Add substitutes
      for (let i = 0; i < substituteCount; i++) {
        formation[`substitute_${i + 1}`] = shuffled[4 + i]?.id || null;
      }
    }
    // 7v7 Formations
    else if (selectedFormation === '2-2-2') {
      // 2-2-2 Formation: 2 defenders, 2 midfielders, 2 attackers + substitutes
      formation.leftDefender = shuffled[0]?.id || null;
      formation.rightDefender = shuffled[1]?.id || null;
      formation.leftMidfielder = shuffled[2]?.id || null;
      formation.rightMidfielder = shuffled[3]?.id || null;
      formation.leftAttacker = shuffled[4]?.id || null;
      formation.rightAttacker = shuffled[5]?.id || null;

      // Add substitutes
      for (let i = 0; i < substituteCount; i++) {
        formation[`substitute_${i + 1}`] = shuffled[6 + i]?.id || null;
      }
    } else if (selectedFormation === '2-3-1') {
      // 2-3-1 Formation: 2 defenders, 3 midfielders, 1 attacker + substitutes
      formation.leftDefender = shuffled[0]?.id || null;
      formation.rightDefender = shuffled[1]?.id || null;
      formation.leftMidfielder = shuffled[2]?.id || null;
      formation.centerMidfielder = shuffled[3]?.id || null;
      formation.rightMidfielder = shuffled[4]?.id || null;
      formation.attacker = shuffled[5]?.id || null;

      // Add substitutes
      for (let i = 0; i < substituteCount; i++) {
        formation[`substitute_${i + 1}`] = shuffled[6 + i]?.id || null;
      }
    } else {
      // Fallback to 2-2 Formation for unknown formations
      formation.leftDefender = shuffled[0]?.id || null;
      formation.rightDefender = shuffled[1]?.id || null;
      formation.leftAttacker = shuffled[2]?.id || null;
      formation.rightAttacker = shuffled[3]?.id || null;

      // Add substitutes
      for (let i = 0; i < substituteCount; i++) {
        formation[`substitute_${i + 1}`] = shuffled[4 + i]?.id || null;
      }
    }
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