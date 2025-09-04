/**
 * Validation helper utilities for consistent input validation
 * across the pending match resume feature
 */

/**
 * Validates if a value is a non-empty string
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid non-empty string
 */
export const isValidString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Validates if a value is a non-empty array
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid non-empty array
 */
export const isValidArray = (value) => {
  return Array.isArray(value) && value.length > 0;
};

/**
 * Validates if an object has required properties
 * @param {object} obj - Object to validate
 * @param {string[]} requiredProps - Array of required property names
 * @returns {{isValid: boolean, missingProps: string[]}} Validation result
 */
export const hasRequiredProperties = (obj, requiredProps) => {
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, missingProps: requiredProps };
  }

  const missingProps = requiredProps.filter(prop => 
    !(prop in obj) || obj[prop] === null || obj[prop] === undefined
  );

  return {
    isValid: missingProps.length === 0,
    missingProps
  };
};

/**
 * Validates match data has essential fields for reconstruction
 * @param {object} matchData - Match data from database
 * @returns {{isValid: boolean, issues: string[]}} Validation result
 */
export const validateMatchData = (matchData) => {
  const issues = [];

  if (!matchData) {
    return { isValid: false, issues: ['Match data is required'] };
  }

  const requiredFields = ['id', 'team_id', 'state', 'periods', 'period_duration_minutes'];
  const { isValid: hasRequired, missingProps } = hasRequiredProperties(matchData, requiredFields);

  if (!hasRequired) {
    issues.push(`Invalid match data: missing ${missingProps.join(', ')}`);
  }

  // Validate specific field values
  if (matchData.periods && (matchData.periods < 1 || matchData.periods > 10)) {
    issues.push('Invalid number of periods (must be 1-10)');
  }

  if (matchData.period_duration_minutes && 
      (matchData.period_duration_minutes < 1 || matchData.period_duration_minutes > 90)) {
    issues.push('Invalid period duration (must be 1-90 minutes)');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Validates player stats array for match reconstruction
 * @param {Array} playerStats - Player stats from database
 * @param {number} minPlayers - Minimum required players
 * @returns {{isValid: boolean, issues: string[]}} Validation result
 */
export const validatePlayerStats = (playerStats, minPlayers = 5) => {
  const issues = [];

  if (!isValidArray(playerStats)) {
    return { isValid: false, issues: ['No player statistics found for this match'] };
  }

  if (playerStats.length < minPlayers) {
    issues.push(`Not enough players (${playerStats.length}/${minPlayers} minimum)`);
  }

  // Check each player stat has required fields
  const invalidStats = playerStats.filter(stat => 
    !stat.player_id || !stat.match_id || typeof stat.started_as !== 'string'
  );

  if (invalidStats.length > 0) {
    issues.push(`${invalidStats.length} player statistics have invalid data`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Validates if an error is a network/connection error
 * @param {Error|object} error - Error to check
 * @returns {boolean} True if appears to be network error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  
  const message = error.message || error.toString();
  const networkIndicators = [
    'network',
    'connection',
    'timeout',
    'fetch',
    'connection failed',
    'request timeout'
  ];

  return networkIndicators.some(indicator => 
    message.toLowerCase().includes(indicator)
  );
};

/**
 * Safely gets a nested property from an object
 * @param {object} obj - Object to access
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value at path or default value
 */
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  } catch {
    return defaultValue;
  }
};