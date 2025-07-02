/**
 * Integration Test Helpers
 * 
 * Common integration test patterns and utilities for the DIF F16-6 Coach application.
 * These helpers provide standardized approaches to common integration testing scenarios.
 */

import { act, waitFor, fireEvent, within } from '@testing-library/react';

// ===================================================================
// COMMON INTEGRATION TEST PATTERNS
// ===================================================================

/**
 * Executes a function and waits for all async operations to complete
 */
export const executeAndWaitForAsync = async (asyncFunction, timeout = 5000) => {
  let result;
  
  await act(async () => {
    result = await asyncFunction();
  });
  
  // Wait for any pending state updates
  await waitFor(() => {
    // This is a generic wait that ensures React has finished all updates
    return true;
  }, { timeout });
  
  return result;
};

/**
 * Waits for multiple conditions to be met in parallel
 */
export const waitForMultipleConditions = async (conditions, options = {}) => {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const results = await Promise.all(
      conditions.map(async (condition) => {
        try {
          return await condition();
        } catch {
          return false;
        }
      })
    );
    
    if (results.every(result => result === true)) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Multiple conditions not met within ${timeout}ms`);
};

/**
 * Simulates user interaction with proper timing and event ordering
 */
export const simulateUserInteraction = {
  /**
   * Simulates a click with realistic timing
   */
  click: async (element, options = {}) => {
    const { delay = 50 } = options;
    
    await act(async () => {
      fireEvent.mouseDown(element);
      await new Promise(resolve => setTimeout(resolve, delay));
      fireEvent.mouseUp(element);
      fireEvent.click(element);
    });
  },
  
  /**
   * Simulates typing with realistic character delays
   */
  type: async (element, text, options = {}) => {
    const { delay = 20 } = options;
    
    await act(async () => {
      element.focus();
      
      for (const char of text) {
        fireEvent.keyDown(element, { key: char });
        fireEvent.keyPress(element, { key: char });
        
        // Update the input value
        const currentValue = element.value || '';
        fireEvent.change(element, { 
          target: { value: currentValue + char } 
        });
        
        fireEvent.keyUp(element, { key: char });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    });
  },
  
  /**
   * Simulates a long press interaction
   */
  longPress: async (element, options = {}) => {
    const { duration = 500 } = options;
    
    await act(async () => {
      fireEvent.mouseDown(element);
      await new Promise(resolve => setTimeout(resolve, duration));
      fireEvent.mouseUp(element);
    });
  },
  
  /**
   * Simulates form submission
   */
  submitForm: async (form) => {
    await act(async () => {
      fireEvent.submit(form);
    });
  }
};

/**
 * Component state helpers for integration testing
 */
export const componentStateHelpers = {
  /**
   * Waits for a component to reach a specific state
   */
  waitForComponentState: async (getState, expectedState, timeout = 5000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentState = getState();
      
      if (JSON.stringify(currentState) === JSON.stringify(expectedState)) {
        return currentState;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Component did not reach expected state within ${timeout}ms`);
  },
  
  /**
   * Captures component state at specific points for comparison
   */
  captureStateSnapshot: (getState) => {
    return {
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(getState()))
    };
  },
  
  /**
   * Compares two state snapshots for differences
   */
  compareSnapshots: (snapshot1, snapshot2) => {
    const differences = [];
    
    const findDifferences = (obj1, obj2, path = '') => {
      for (const key in obj1) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj2)) {
          differences.push({
            type: 'removed',
            path: currentPath,
            value: obj1[key]
          });
        } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
          findDifferences(obj1[key], obj2[key], currentPath);
        } else if (obj1[key] !== obj2[key]) {
          differences.push({
            type: 'changed',
            path: currentPath,
            oldValue: obj1[key],
            newValue: obj2[key]
          });
        }
      }
      
      for (const key in obj2) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in obj1)) {
          differences.push({
            type: 'added',
            path: currentPath,
            value: obj2[key]
          });
        }
      }
    };
    
    findDifferences(snapshot1.state, snapshot2.state);
    
    return {
      hasDifferences: differences.length > 0,
      differences,
      timeDelta: snapshot2.timestamp - snapshot1.timestamp
    };
  }
};

// ===================================================================
// ASYNC OPERATION HELPERS
// ===================================================================

/**
 * Handles async operations with proper error handling and timeouts
 */
export const asyncOperationHelpers = {
  /**
   * Retries an async operation until it succeeds or times out
   */
  retryUntilSuccess: async (operation, options = {}) => {
    const { maxRetries = 3, retryDelay = 1000, timeout = 10000 } = options;
    const startTime = Date.now();
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Operation timed out after ${timeout}ms`);
      }
      
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
  },
  
  /**
   * Runs multiple async operations in parallel with error handling
   */
  runInParallel: async (operations, options = {}) => {
    const { timeout = 10000, failFast = false } = options;
    
    const operationPromises = operations.map(async (operation, index) => {
      try {
        const result = await operation();
        return { index, success: true, result };
      } catch (error) {
        return { index, success: false, error: error.message };
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Parallel operations timed out after ${timeout}ms`)), timeout);
    });
    
    if (failFast) {
      return await Promise.race([Promise.all(operationPromises), timeoutPromise]);
    } else {
      return await Promise.race([Promise.allSettled(operationPromises), timeoutPromise]);
    }
  },
  
  /**
   * Creates a controlled async operation that can be resolved externally
   */
  createControllablePromise: () => {
    let resolve, reject;
    
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    
    return {
      promise,
      resolve,
      reject,
      isResolved: false,
      isRejected: false
    };
  }
};

// ===================================================================
// COMPONENT INTERACTION UTILITIES
// ===================================================================

/**
 * Higher-level component interaction utilities
 */
export const componentInteractionHelpers = {
  /**
   * Finds and interacts with form elements by label text
   */
  interactWithFormElement: async (labelText, value, interactionType = 'change') => {
    const element = screen.getByLabelText(new RegExp(labelText, 'i'));
    
    switch (interactionType) {
      case 'change':
        await act(async () => {
          fireEvent.change(element, { target: { value } });
        });
        break;
      case 'click':
        await simulateUserInteraction.click(element);
        break;
      case 'type':
        await simulateUserInteraction.type(element, value);
        break;
      default:
        throw new Error(`Unknown interaction type: ${interactionType}`);
    }
    
    return element;
  },
  
  /**
   * Navigates through a multi-step process
   */
  navigateMultiStepProcess: async (steps) => {
    const results = [];
    
    for (const [index, step] of steps.entries()) {
      try {
        await act(async () => {
          await step.action();
        });
        
        if (step.validation) {
          await waitFor(step.validation);
        }
        
        results.push({
          step: index,
          name: step.name,
          success: true
        });
      } catch (error) {
        results.push({
          step: index,
          name: step.name,
          success: false,
          error: error.message
        });
        
        if (step.required !== false) {
          throw error;
        }
      }
    }
    
    return results;
  },
  
  /**
   * Waits for a specific UI element to appear and become interactive
   */
  waitForInteractiveElement: async (selector, options = {}) => {
    const { timeout = 5000, shouldBeEnabled = true } = options;
    
    let element;
    
    await waitFor(() => {
      if (typeof selector === 'string') {
        element = document.querySelector(selector);
      } else if (typeof selector === 'function') {
        element = selector();
      } else {
        element = selector;
      }
      
      expect(element).toBeInTheDocument();
      
      if (shouldBeEnabled) {
        expect(element).not.toBeDisabled();
      }
    }, { timeout });
    
    return element;
  },
  
  /**
   * Finds elements within a specific container scope
   */
  findInContainer: (container, finder) => {
    const containerElement = typeof container === 'string' 
      ? document.querySelector(container)
      : container;
    
    if (!containerElement) {
      throw new Error('Container element not found');
    }
    
    return within(containerElement)[finder.method](...finder.args);
  }
};

// ===================================================================
// PERFORMANCE MEASUREMENT UTILITIES
// ===================================================================

/**
 * Performance measurement helpers for integration tests
 */
export const performanceMeasurement = {
  /**
   * Measures the execution time of an async operation
   */
  measureAsyncOperation: async (operation, operationName = 'operation') => {
    const startTime = performance.now();
    let result, error;
    
    try {
      result = await operation();
    } catch (err) {
      error = err;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const measurement = {
      operationName,
      duration,
      startTime,
      endTime,
      success: !error,
      ...(error && { error: error.message })
    };
    
    // Log performance warning if operation is slow
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    if (error) {
      throw error;
    }
    
    return { result, measurement };
  },
  
  /**
   * Creates a performance benchmark for repeated operations
   */
  createBenchmark: (operationName) => {
    const measurements = [];
    
    return {
      measure: async (operation) => {
        const { result, measurement } = await performanceMeasurement.measureAsyncOperation(
          operation, 
          operationName
        );
        measurements.push(measurement);
        return result;
      },
      
      getStats: () => {
        if (measurements.length === 0) {
          return null;
        }
        
        const durations = measurements.map(m => m.duration);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        return {
          operationName,
          count: measurements.length,
          totalTime: sum,
          averageTime: avg,
          minTime: min,
          maxTime: max,
          measurements
        };
      },
      
      reset: () => {
        measurements.length = 0;
      }
    };
  }
};

// ===================================================================
// ERROR HANDLING UTILITIES
// ===================================================================

/**
 * Error handling and recovery utilities for integration tests
 */
export const errorHandlingHelpers = {
  /**
   * Executes an operation with graceful error handling
   */
  withErrorHandling: async (operation, errorHandler = null) => {
    try {
      return await operation();
    } catch (error) {
      if (errorHandler) {
        return await errorHandler(error);
      }
      
      // Default error handling - log and re-throw
      console.error('Integration test operation failed:', error);
      throw error;
    }
  },
  
  /**
   * Captures and categorizes errors during integration tests
   */
  captureErrors: () => {
    const errors = [];
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      errors.push({
        type: 'error',
        timestamp: Date.now(),
        message: args.join(' ')
      });
      originalError(...args);
    };
    
    console.warn = (...args) => {
      errors.push({
        type: 'warning',
        timestamp: Date.now(),
        message: args.join(' ')
      });
      originalWarn(...args);
    };
    
    return {
      getErrors: () => errors,
      getErrorCount: () => errors.filter(e => e.type === 'error').length,
      getWarningCount: () => errors.filter(e => e.type === 'warning').length,
      restore: () => {
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  },
  
  /**
   * Tests error recovery mechanisms
   */
  testErrorRecovery: async (triggerError, expectedRecovery, options = {}) => {
    const { timeout = 5000, recoveryDelay = 100 } = options;
    const startTime = Date.now();
    
    // Trigger the error
    await triggerError();
    
    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, recoveryDelay));
    
    // Verify recovery within timeout
    while (Date.now() - startTime < timeout) {
      try {
        const isRecovered = await expectedRecovery();
        if (isRecovered) {
          return true;
        }
      } catch (error) {
        // Continue waiting for recovery
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Error recovery not detected within ${timeout}ms`);
  }
};

// ===================================================================
// LOCALSTORAGE PERSISTENCE TESTING UTILITIES
// ===================================================================

/**
 * localStorage persistence testing utilities for integration tests
 */
export const localStoragePersistenceHelpers = {
  /**
   * Simulates localStorage coordination between multiple hooks
   */
  simulateHookCoordination: async (hooks, operations) => {
    const results = [];
    
    // Clear localStorage states
    hooks.forEach(hook => {
      if (hook._clearMockLocalStorage) hook._clearMockLocalStorage();
      if (hook._clearMockGameLocalStorage) hook._clearMockGameLocalStorage();
    });
    
    // Execute operations in sequence or parallel
    for (const operation of operations) {
      const { hook, action, params, simulateFailure, expectSuccess = true } = operation;
      
      try {
        // Simulate failure if requested
        if (simulateFailure) {
          if (hook._simulateLocalStorageFailure) {
            hook._simulateLocalStorageFailure(simulateFailure);
          } else if (hook._simulateGameStateStorageFailure) {
            hook._simulateGameStateStorageFailure(simulateFailure);
          }
        }
        
        // Execute the operation
        const result = await hook[action](...(params || []));
        
        results.push({
          hook: hook.constructor?.name || 'unknown',
          action,
          success: true,
          result,
          expected: expectSuccess
        });
        
        if (!expectSuccess) {
          throw new Error(`Expected operation to fail but it succeeded`);
        }
        
      } catch (error) {
        results.push({
          hook: hook.constructor?.name || 'unknown',
          action,
          success: false,
          error: error.message,
          expected: expectSuccess
        });
        
        if (expectSuccess) {
          throw error;
        }
      }
    }
    
    return results;
  },
  
  /**
   * Tests localStorage state synchronization between hooks
   */
  testStateSynchronization: async (gameStateHook, timerHook, options = {}) => {
    const { includeFailureScenarios = false, timeout = 5000 } = options;
    
    // Clear initial states
    gameStateHook._clearMockGameLocalStorage();
    timerHook._clearMockLocalStorage();
    
    // Test data
    const testGameState = {
      currentPeriodNumber: 2,
      homeScore: 3,
      awayScore: 1,
      teamMode: 'INDIVIDUAL_7'
    };
    
    const testTimerState = {
      matchTimerSeconds: 720,
      subTimerSeconds: 90,
      isSubTimerPaused: false
    };
    
    const scenarios = [
      {
        name: 'Simultaneous Save',
        action: async () => {
          // Simultaneously save both states
          await Promise.all([
            gameStateHook._mockSaveGameStateToLocalStorage(testGameState),
            timerHook._mockSaveToLocalStorage(testTimerState)
          ]);
        }
      },
      {
        name: 'Cross-Load Verification',
        action: async () => {
          // Verify both states can be loaded independently
          const loadedGameState = gameStateHook._mockLoadGameStateFromLocalStorage();
          const loadedTimerState = timerHook._mockLoadFromLocalStorage();
          
          expect(loadedGameState).toEqual(testGameState);
          expect(loadedTimerState).toEqual(testTimerState);
        }
      }
    ];
    
    if (includeFailureScenarios) {
      scenarios.push(
        {
          name: 'Game State Save Failure',
          action: async () => {
            gameStateHook._simulateGameStateStorageFailure('saveFailure');
            try {
              await gameStateHook._mockSaveGameStateToLocalStorage(testGameState);
              throw new Error('Expected save to fail');
            } catch (error) {
              expect(error.message).toContain('localStorage save failure');
            }
            
            // Timer should still work
            await timerHook._mockSaveToLocalStorage(testTimerState);
          }
        },
        {
          name: 'Timer Load Failure',
          action: async () => {
            timerHook._simulateLocalStorageFailure('loadFailure');
            try {
              timerHook._mockLoadFromLocalStorage();
              throw new Error('Expected load to fail');
            } catch (error) {
              expect(error.message).toContain('localStorage load failure');
            }
            
            // Game state should still work
            const gameState = gameStateHook._mockLoadGameStateFromLocalStorage();
            expect(gameState).toEqual(testGameState);
          }
        }
      );
    }
    
    // Execute all scenarios
    const results = [];
    for (const scenario of scenarios) {
      const startTime = Date.now();
      try {
        await scenario.action();
        results.push({
          name: scenario.name,
          success: true,
          duration: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          name: scenario.name,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
        throw error;
      }
    }
    
    return results;
  },
  
  /**
   * Simulates page refresh scenario
   */
  simulatePageRefresh: async (hooks, preRefreshState, postRefreshValidation) => {
    // Save all states before "refresh"
    const saveOperations = hooks.map(async (hook, index) => {
      const state = preRefreshState[index];
      if (hook._mockSaveGameStateToLocalStorage) {
        return hook._mockSaveGameStateToLocalStorage(state);
      } else if (hook._mockSaveToLocalStorage) {
        return hook._mockSaveToLocalStorage(state);
      }
    });
    
    await Promise.all(saveOperations);
    
    // Simulate page refresh by clearing runtime state but keeping localStorage
    hooks.forEach(hook => {
      if (hook._resetMockState) hook._resetMockState();
      if (hook._updateMockTimerState) hook._updateMockTimerState({
        matchTimerSeconds: 900,
        subTimerSeconds: 0,
        isSubTimerPaused: false
      });
    });
    
    // Load states after "refresh"
    const loadedStates = await Promise.all(
      hooks.map(async hook => {
        if (hook._mockLoadGameStateFromLocalStorage) {
          return hook._mockLoadGameStateFromLocalStorage();
        } else if (hook._mockLoadFromLocalStorage) {
          return hook._mockLoadFromLocalStorage();
        }
      })
    );
    
    // Validate post-refresh state
    if (postRefreshValidation) {
      await postRefreshValidation(loadedStates, preRefreshState);
    }
    
    return {
      preRefreshState,
      loadedStates,
      synchronized: JSON.stringify(preRefreshState) === JSON.stringify(loadedStates)
    };
  },
  
  /**
   * Tests localStorage quota exceeded scenarios
   */
  testQuotaHandling: async (hooks, options = {}) => {
    const { testRecovery = true } = options;
    
    const quotaTests = [];
    
    for (const hook of hooks) {
      const hookName = hook.constructor?.name || 'unknown';
      
      // Test quota exceeded during save
      if (hook._simulateGameStateStorageFailure) {
        hook._simulateGameStateStorageFailure('quotaExceeded');
        
        try {
          await hook._mockSaveGameStateToLocalStorage({ large: 'data' });
          quotaTests.push({
            hook: hookName,
            test: 'QuotaExceeded',
            success: false,
            message: 'Expected quota exceeded error'
          });
        } catch (error) {
          quotaTests.push({
            hook: hookName,
            test: 'QuotaExceeded',
            success: error.name === 'QuotaExceededError',
            message: error.message
          });
        }
        
        // Test recovery if requested
        if (testRecovery) {
          hook._clearMockGameLocalStorage();
          const recoveryResult = await hook._mockSaveGameStateToLocalStorage({ small: 'data' });
          quotaTests.push({
            hook: hookName,
            test: 'QuotaRecovery',
            success: recoveryResult === true,
            message: 'Recovery after quota cleared'
          });
        }
      }
      
      if (hook._simulateLocalStorageFailure) {
        hook._simulateLocalStorageFailure('quotaExceeded');
        
        try {
          await hook._mockSaveToLocalStorage({ large: 'timer data' });
          quotaTests.push({
            hook: hookName,
            test: 'TimerQuotaExceeded',
            success: false,
            message: 'Expected timer quota exceeded error'
          });
        } catch (error) {
          quotaTests.push({
            hook: hookName,
            test: 'TimerQuotaExceeded',
            success: error.name === 'QuotaExceededError',
            message: error.message
          });
        }
        
        // Test recovery if requested
        if (testRecovery) {
          hook._clearMockLocalStorage();
          const recoveryResult = await hook._mockSaveToLocalStorage({ small: 'timer' });
          quotaTests.push({
            hook: hookName,
            test: 'TimerQuotaRecovery',
            success: recoveryResult === true,
            message: 'Timer recovery after quota cleared'
          });
        }
      }
    }
    
    return quotaTests;
  }
};

export default {
  executeAndWaitForAsync,
  waitForMultipleConditions,
  simulateUserInteraction,
  componentStateHelpers,
  asyncOperationHelpers,
  componentInteractionHelpers,
  performanceMeasurement,
  errorHandlingHelpers,
  localStoragePersistenceHelpers
};