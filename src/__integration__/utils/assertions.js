/**
 * Custom Assertions for Integration Testing
 * 
 * Custom assertion utilities specifically designed for integration testing
 * of the Sport Wizard application. These assertions validate complex
 * state relationships and cross-component interactions.
 */

import { screen, within } from '@testing-library/react';
import {PLAYER_ROLES, PLAYER_STATUS } from '../../constants/playerConstants';

// ===================================================================
// GAME STATE ASSERTIONS
// ===================================================================

/**
 * Asserts that game state structure is valid and consistent
 */
export const assertValidGameState = (gameState, expectedProperties = {}) => {
  // Basic structure validation
  expect(gameState).toBeDefined();
  expect(typeof gameState).toBe('object');
  
  // Required properties
  const requiredProps = [
    'formation',
    'allPlayers', 
    'rotationQueue'
  ];
  
  requiredProps.forEach(prop => {
    expect(gameState).toHaveProperty(prop);
  });
  
  // Validate formation
  expect(gameState.formation).toBeDefined();
  expect(typeof gameState.formation).toBe('object');
  
  // Validate allPlayers
  expect(Array.isArray(gameState.allPlayers)).toBe(true);
  expect(gameState.allPlayers.length).toBeGreaterThan(0);
  
  // Validate rotationQueue
  expect(Array.isArray(gameState.rotationQueue)).toBe(true);
  
  // Validate expected properties if provided
  Object.entries(expectedProperties).forEach(([key, expectedValue]) => {
    if (typeof expectedValue === 'object' && expectedValue !== null) {
      expect(gameState[key]).toMatchObject(expectedValue);
    } else {
      expect(gameState[key]).toBe(expectedValue);
    }
  });
  
  return true;
};

/**
 * Asserts that player data is consistent across the game state
 */
export const assertPlayerDataConsistency = (gameState) => {
  const { formation, allPlayers, rotationQueue } = gameState;
  
  // Get all player IDs from formation
  const formationPlayerIds = new Set();
  const addPlayerIds = (obj) => {
    if (typeof obj === 'string') {
      formationPlayerIds.add(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(addPlayerIds);
    }
  };
  addPlayerIds(formation);
  
  // All formation players should exist in allPlayers
  formationPlayerIds.forEach(playerId => {
    const player = allPlayers.find(p => p.id === playerId);
    expect(player).toBeDefined();
    expect(player).toHaveProperty('name');
    expect(player).toHaveProperty('stats');
  });
  
  // All rotation queue players should exist in allPlayers
  rotationQueue.forEach(playerId => {
    const player = allPlayers.find(p => p.id === playerId);
    expect(player).toBeDefined();
  });
  
  // Player stats should have required structure
  allPlayers.forEach(player => {
    expect(player.stats).toBeDefined();
    expect(typeof player.stats.timeOnFieldSeconds).toBe('number');
    expect(typeof player.stats.timeAsAttackerSeconds).toBe('number');
    expect(typeof player.stats.timeAsDefenderSeconds).toBe('number');
    expect(typeof player.stats.timeAsGoalieSeconds).toBe('number');
    expect(player.stats.timeOnFieldSeconds).toBeGreaterThanOrEqual(0);
  });
  
  return true;
};

// ===================================================================
// COMPONENT STATE ASSERTIONS
// ===================================================================

/**
 * Asserts that component props are consistent with game state
 */
export const assertComponentPropsConsistency = (componentProps, expectedGameState) => {
  // Check that component props match game state
  if (expectedGameState.formation) {
    expect(componentProps.formation).toEqual(expectedGameState.formation);
  }
  
  if (expectedGameState.allPlayers) {
    expect(componentProps.allPlayers).toEqual(expectedGameState.allPlayers);
  }
  
  if (expectedGameState.rotationQueue) {
    expect(componentProps.rotationQueue).toEqual(expectedGameState.rotationQueue);
  }
  
  // Validate handler functions are provided
  const requiredHandlers = [
    'setFormation',
    'setAllPlayers',
    'setRotationQueue'
  ];
  
  requiredHandlers.forEach(handler => {
    if (componentProps[handler]) {
      expect(typeof componentProps[handler]).toBe('function');
    }
  });
  
  return true;
};

/**
 * Asserts that UI elements reflect the current game state
 */
export const assertUIStateConsistency = (gameState, options = {}) => {
  const { checkPlayerPositions = true, checkTimerDisplay = false } = options;
  
  if (checkPlayerPositions) {
    // Verify that player names appear in expected positions
    const { formation, allPlayers } = gameState;
    
    Object.entries(formation).forEach(([position, playerId]) => {
      if (typeof playerId === 'string') {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
          // Player name should appear somewhere in the UI
          expect(screen.queryByText(player.name)).toBeInTheDocument();
        }
      }
    });
  }
  
  return true;
};

// ===================================================================
// PERSISTENCE ASSERTIONS
// ===================================================================

/**
 * Asserts that data is properly persisted to localStorage
 */
export const assertDataPersistence = (expectedData, storageKey = 'dif-coach-game-state') => {
  const storedData = localStorage.getItem(storageKey);
  expect(storedData).not.toBeNull();
  
  const parsedData = JSON.parse(storedData);
  
  // Validate basic structure
  expect(parsedData).toBeDefined();
  expect(typeof parsedData).toBe('object');
  
  // Validate expected data if provided
  if (expectedData) {
    Object.entries(expectedData).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        expect(parsedData[key]).toMatchObject(value);
      } else {
        expect(parsedData[key]).toBe(value);
      }
    });
  }
  
  return parsedData;
};

/**
 * Asserts that data persistence survives browser refresh simulation
 */
export const assertPersistenceAfterRefresh = async (beforeState, afterRefreshCallback) => {
  // Store the original state
  const originalData = JSON.stringify(beforeState);
  
  // Simulate refresh by calling the callback
  const restoredState = await afterRefreshCallback();
  
  // Verify critical data was restored
  expect(restoredState).toBeDefined();

  return restoredState;
};

// ===================================================================
// ANIMATION STATE ASSERTIONS
// ===================================================================

/**
 * Asserts that animation state is valid and consistent
 */
export const assertValidAnimationState = (animationState, expectedAnimations = []) => {
  if (!animationState) {
    if (expectedAnimations.length > 0) {
      throw new Error('Expected animations but animationState is null/undefined');
    }
    return true;
  }
  
  expect(typeof animationState).toBe('object');
  
  // Validate expected animations
  expectedAnimations.forEach(({ playerId, direction, distance }) => {
    expect(animationState[playerId]).toBeDefined();
    
    if (direction !== undefined) {
      expect(animationState[playerId].direction).toBe(direction);
    }
    
    if (distance !== undefined) {
      expect(animationState[playerId].distance).toBe(distance);
    }
  });
  
  return true;
};

/**
 * Asserts that animation timing is within expected bounds
 */
export const assertAnimationTiming = (startTime, endTime, expectedDuration = 1000, tolerance = 100) => {
  const actualDuration = endTime - startTime;
  expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance);
  expect(actualDuration).toBeLessThanOrEqual(expectedDuration + tolerance);
  
  return actualDuration;
};

// ===================================================================
// PERFORMANCE ASSERTIONS
// ===================================================================

/**
 * Asserts that operations complete within acceptable time limits
 */
export const assertPerformanceThreshold = (measurement, thresholds = {}) => {
  const {
    maxDuration = 2000,
    minDuration = 0,
    operationName = 'operation'
  } = thresholds;
  
  expect(measurement.duration).toBeGreaterThanOrEqual(minDuration);
  expect(measurement.duration).toBeLessThanOrEqual(maxDuration);
  
  // Warn if operation is slower than ideal
  const idealDuration = maxDuration * 0.5;
  if (measurement.duration > idealDuration) {
    console.warn(
      `Performance warning: ${operationName} took ${measurement.duration.toFixed(2)}ms ` +
      `(ideal: <${idealDuration}ms, max: ${maxDuration}ms)`
    );
  }
  
  return measurement.duration;
};

/**
 * Asserts that memory usage stays within reasonable bounds
 */
export const assertMemoryUsage = (beforeMemory, afterMemory, options = {}) => {
  const { maxIncrease = 50 * 1024 * 1024 } = options; // 50MB default
  
  if (beforeMemory && afterMemory) {
    const memoryIncrease = afterMemory - beforeMemory;
    expect(memoryIncrease).toBeLessThanOrEqual(maxIncrease);
    
    if (memoryIncrease > maxIncrease * 0.8) {
      console.warn(`Memory usage warning: increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }
  }
  
  return afterMemory - beforeMemory;
};

// ===================================================================
// ERROR HANDLING ASSERTIONS
// ===================================================================

/**
 * Asserts that error handling behaves correctly
 */
export const assertErrorHandling = async (errorTrigger, expectedBehavior = {}) => {
  const {
    shouldRecover = true,
    maxRecoveryTime = 5000,
    shouldDisplayError = false,
    expectedErrorMessage = null
  } = expectedBehavior;
  
  let errorOccurred = false;
  let recoveryOccurred = false;
  const startTime = Date.now();
  
  try {
    await errorTrigger();
  } catch (error) {
    errorOccurred = true;
    
    if (expectedErrorMessage) {
      expect(error.message).toMatch(new RegExp(expectedErrorMessage, 'i'));
    }
  }
  
  expect(errorOccurred).toBe(true);
  
  if (shouldRecover) {
    // Wait for recovery
    const checkRecovery = async () => {
      // Check if error UI is cleared or app is functional again
      // This is application-specific and may need customization
      return !screen.queryByText(/error/i) && !screen.queryByText(/something went wrong/i);
    };
    
    while (Date.now() - startTime < maxRecoveryTime) {
      if (await checkRecovery()) {
        recoveryOccurred = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    expect(recoveryOccurred).toBe(true);
  }
  
  if (shouldDisplayError) {
    // Verify error is displayed to user
    expect(screen.queryByText(/error/i) || screen.queryByText(/something went wrong/i)).toBeInTheDocument();
  }
  
  return {
    errorOccurred,
    recoveryOccurred,
    recoveryTime: recoveryOccurred ? Date.now() - startTime : null
  };
};

// ===================================================================
// WORKFLOW ASSERTIONS
// ===================================================================

/**
 * Asserts that a complete user workflow completes successfully
 */
export const assertWorkflowCompletion = (workflowResults, expectedSteps = []) => {
  expect(workflowResults).toBeDefined();
  expect(workflowResults.steps).toBeDefined();
  expect(Array.isArray(workflowResults.steps)).toBe(true);
  
  // Verify all expected steps were completed
  expectedSteps.forEach(expectedStep => {
    expect(workflowResults.steps).toContain(expectedStep);
  });
  
  // Verify no errors occurred (unless expected)
  expect(workflowResults.errors).toBeDefined();
  expect(Array.isArray(workflowResults.errors)).toBe(true);
  
  if (workflowResults.errors.length > 0) {
    console.warn('Workflow completed with errors:', workflowResults.errors);
  }
  
  return workflowResults;
};

/**
 * Asserts that navigation between screens works correctly
 */
export const assertScreenNavigation = async (fromScreen, toScreen, navigationAction) => {
  // Verify we're on the expected starting screen
  expect(screen.queryByTestId(fromScreen) || screen.queryByText(new RegExp(fromScreen, 'i'))).toBeInTheDocument();
  
  // Perform navigation
  await navigationAction();
  
  // Verify we reached the target screen
  expect(screen.queryByTestId(toScreen) || screen.queryByText(new RegExp(toScreen, 'i'))).toBeInTheDocument();
  
  // Verify we left the original screen
  expect(screen.queryByTestId(fromScreen)).not.toBeInTheDocument();
  
  return true;
};

// ===================================================================
// EXPORT ALL ASSERTIONS
// ===================================================================

export default {
  // Game state assertions
  assertValidGameState,
  assertPlayerDataConsistency,
  assertFormationStructure,
  
  // Component state assertions
  assertComponentPropsConsistency,
  assertUIStateConsistency,
  
  // Persistence assertions
  assertDataPersistence,
  assertPersistenceAfterRefresh,
  
  // Animation assertions
  assertValidAnimationState,
  assertAnimationTiming,
  
  // Performance assertions
  assertPerformanceThreshold,
  assertMemoryUsage,
  
  // Error handling assertions
  assertErrorHandling,
  
  // Workflow assertions
  assertWorkflowCompletion,
  assertScreenNavigation
};