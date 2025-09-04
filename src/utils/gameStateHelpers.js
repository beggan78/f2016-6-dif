/**
 * Game state management helpers for clean state setting operations
 * Consolidates repetitive game state setting logic
 */

/**
 * Applies reconstructed game state to the game state setters
 * Consolidates the repetitive conditional state setting from useMatchRecovery
 * 
 * @param {object} reconstructedState - Game state reconstructed from database
 * @param {object} gameStateSetters - Object containing all game state setter functions
 * @returns {boolean} True if all state was set successfully
 */
export const applyReconstructedGameState = (reconstructedState, gameStateSetters) => {
  if (!reconstructedState || !gameStateSetters) {
    console.warn('Invalid parameters for applying reconstructed game state');
    return false;
  }

  try {
    // State setters mapping for cleaner iteration
    const stateSetters = [
      { key: 'teamConfig', setter: 'setTeamConfig' },
      { key: 'selectedFormation', setter: 'setSelectedFormation' },
      { key: 'selectedSquadIds', setter: 'setSelectedSquadIds' },
      { key: 'periods', setter: 'setNumPeriods' },
      { key: 'periodDurationMinutes', setter: 'setPeriodDurationMinutes' },
      { key: 'opponentTeam', setter: 'setOpponentTeam' },
      { key: 'captainId', setter: 'setCaptainId' },
      { key: 'matchType', setter: 'setMatchType' },
      { key: 'currentMatchId', setter: 'setCurrentMatchId' },
      { key: 'formation', setter: 'setFormation' },
      { key: 'periodGoalieIds', setter: 'setPeriodGoalieIds' }
    ];

    let successCount = 0;

    // Apply each state value if it exists
    stateSetters.forEach(({ key, setter }, index) => {
      const value = reconstructedState[key];
      const setterFn = gameStateSetters[setter];

      if (value !== undefined && value !== null && typeof setterFn === 'function') {
        try {
          // Track critical state application order
          if (process.env.NODE_ENV === 'development' && (key === 'currentMatchId' || key === 'formation')) {
            console.log(`🔢 STATE ORDER ${index}: Setting ${key}`, {
              timestamp: new Date().toISOString(),
              hasValue: !!value,
              isFormation: key === 'formation'
            });
          }

          setterFn(value);
          successCount++;

          if (process.env.NODE_ENV === 'development' && (key === 'formation' || key === 'currentMatchId')) {
            console.log(`✅ Applied ${key}`, {
              hasData: !!value,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn(`Failed to set ${key}:`, error);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ Skipping ${key}: value=${value}, setterExists=${typeof setterFn === 'function'}`);
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Applied ${successCount}/${stateSetters.length} game state values from reconstructed state`);
    }

    return successCount > 0;

  } catch (error) {
    console.error('❌ Exception while applying reconstructed game state:', error);
    return false;
  }
};

/**
 * Creates a game state setters object from individual setter functions
 * Helper to organize setters for cleaner function calls
 * 
 * @param {object} gameState - Game state object with setter methods
 * @returns {object} Organized setters object
 */
export const createGameStateSetters = (gameState) => {
  return {
    setTeamConfig: gameState?.setTeamConfig,
    setSelectedFormation: gameState?.setSelectedFormation,
    setSelectedSquadIds: gameState?.setSelectedSquadIds,
    setNumPeriods: gameState?.setNumPeriods,
    setPeriodDurationMinutes: gameState?.setPeriodDurationMinutes,
    setOpponentTeam: gameState?.setOpponentTeam,
    setCaptainId: gameState?.setCaptainId,
    setMatchType: gameState?.setMatchType,
    setCurrentMatchId: gameState?.setCurrentMatchId,
    setFormation: gameState?.setFormation,
    setPeriodGoalieIds: gameState?.setPeriodGoalieIds
  };
};

/**
 * Validates that required game state setters are available
 * @param {object} gameStateSetters - Setters object to validate
 * @returns {{isValid: boolean, missingSetters: string[]}} Validation result
 */
export const validateGameStateSetters = (gameStateSetters) => {
  const requiredSetters = [
    'setTeamConfig',
    'setSelectedFormation', 
    'setSelectedSquadIds',
    'setNumPeriods',
    'setPeriodDurationMinutes',
    'setOpponentTeam'
  ];

  const missingSetters = requiredSetters.filter(setter => 
    !gameStateSetters?.[setter] || typeof gameStateSetters[setter] !== 'function'
  );

  return {
    isValid: missingSetters.length === 0,
    missingSetters
  };
};

/**
 * Safely clears game state by calling clear methods if they exist
 * @param {object} gameState - Game state object with potential clear methods
 */
export const clearGameStateIfNeeded = (gameState) => {
  const clearMethods = [
    'clearStoredState',
    'clearTeamConfig',
    'clearMatchData'
  ];

  clearMethods.forEach(method => {
    if (typeof gameState?.[method] === 'function') {
      try {
        gameState[method]();
      } catch (error) {
        console.warn(`Failed to call ${method}:`, error);
      }
    }
  });
};

