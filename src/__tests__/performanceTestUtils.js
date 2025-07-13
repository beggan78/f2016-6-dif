/**
 * Performance Test Utilities
 * 
 * Provides utilities for conditional performance testing that can be
 * enabled/disabled based on environment (CI vs local development).
 */

import { shouldRunPerformanceTests, testConfig, getEnvironmentDescription } from '../utils/testEnvironment';

/**
 * Conditionally describes a performance test suite
 * Will skip the entire suite if performance tests are disabled for the current environment
 * 
 * @param {string} suiteName - Name of the test suite
 * @param {Function} suiteFunction - Test suite function
 * @param {Object} options - Options for the performance suite
 * @param {number} options.timeoutMs - Custom timeout for performance tests (default: 10000ms)
 */
export const describePerformance = (suiteName, suiteFunction, options = {}) => {
  const { timeoutMs = 10000 } = options;
  
  if (shouldRunPerformanceTests()) {
    // Run performance tests with extended timeout
    describe(suiteName, () => {
      // Set timeout for all tests in this suite
      beforeAll(() => {
        jest.setTimeout(timeoutMs);
      });
      
      // Add environment info to the suite
      beforeAll(() => {
        console.log(`Running performance tests in: ${getEnvironmentDescription()}`);
        console.log('Performance thresholds:', testConfig.performanceThresholds);
      });
      
      // Reset timeout after suite
      afterAll(() => {
        jest.setTimeout(5000); // Reset to Jest default
      });
      
      suiteFunction();
    });
  } else {
    describe.skip(`${suiteName} (Performance tests - Local only)`, () => {
      it('should run performance tests locally', () => {
        console.log(`Performance tests skipped in ${getEnvironmentDescription()}`);
        console.log('To run performance tests in CI, set RUN_PERFORMANCE_TESTS=true');
        expect(true).toBe(true); // Placeholder test to show skip reason
      });
    });
  }
};

/**
 * Conditionally runs a performance test
 * Will skip the individual test if performance tests are disabled
 * 
 * @param {string} testName - Name of the test
 * @param {Function} testFunction - Test function
 * @param {Object} options - Options for the performance test
 * @param {number} options.timeoutMs - Custom timeout for this test
 */
export const itPerformance = (testName, testFunction, options = {}) => {
  const { timeoutMs = 10000 } = options;
  
  if (shouldRunPerformanceTests()) {
    it(testName, testFunction, timeoutMs);
  } else {
    it.skip(`${testName} (Performance test - Local only)`, () => {
      console.log(`Performance test skipped in ${getEnvironmentDescription()}`);
    });
  }
};

/**
 * Performance test wrapper that provides timing utilities and environment-appropriate thresholds
 * 
 * @param {Function} operation - Function to measure performance of
 * @param {Object} options - Performance measurement options
 * @param {string} options.operation - Type of operation ('fast', 'normal', 'slow')
 * @param {number} options.customThreshold - Custom threshold in milliseconds
 * @param {boolean} options.enableLogging - Whether to log timing results
 * @returns {Promise<{duration: number, passed: boolean}>} Performance measurement results
 */
export const measurePerformance = async (operation, options = {}) => {
  const { 
    operation: operationType = 'normal', 
    customThreshold = null,
    enableLogging = false 
  } = options;
  
  // Get appropriate threshold for environment
  const threshold = customThreshold || testConfig.performanceThresholds[`${operationType}Operation`];
  
  if (enableLogging) {
    console.log(`Measuring ${operationType} operation with threshold: ${threshold}ms`);
  }
  
  const startTime = performance.now();
  
  // Execute the operation (handle both sync and async)
  let result;
  if (operation.constructor.name === 'AsyncFunction') {
    result = await operation();
  } else {
    result = operation();
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  const passed = duration <= threshold;
  
  if (enableLogging) {
    console.log(`Operation completed in ${duration.toFixed(2)}ms (threshold: ${threshold}ms) - ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  return {
    duration,
    threshold,
    passed,
    result
  };
};

/**
 * Creates a performance assertion that works with Jest
 * 
 * @param {Function} operation - Function to measure
 * @param {Object} options - Performance options (same as measurePerformance)
 * @returns {Promise<void>}
 */
export const expectPerformance = async (operation, options = {}) => {
  const measurement = await measurePerformance(operation, options);
  
  expect(measurement.duration).toBeLessThanOrEqual(measurement.threshold);
  
  return measurement;
};

/**
 * Utility to create large mock datasets for performance testing
 */
export const createLargeDataset = {
  /**
   * Creates a large array of mock players
   * @param {number} count - Number of players to create
   * @returns {Array} Array of mock player objects
   */
  players: (count) => Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    stats: {
      startedMatchAs: i < count * 0.7 ? 'ON_FIELD' : null,
      timeOnFieldSeconds: Math.floor(Math.random() * 3600),
      timeAsAttackerSeconds: Math.floor(Math.random() * 1800),
      timeAsDefenderSeconds: Math.floor(Math.random() * 1800),
      timeAsGoalieSeconds: Math.floor(Math.random() * 900)
    }
  })),

  /**
   * Creates a large array of mock events
   * @param {number} count - Number of events to create
   * @returns {Array} Array of mock event objects
   */
  events: (count) => Array.from({ length: count }, (_, i) => ({
    id: `event-${i}`,
    type: ['substitution', 'position_change', 'goalie_change', 'goal_home', 'match_start'][i % 5],
    timestamp: 1000000000000 + (i * 15000),
    matchTime: `${Math.floor(i / 4)}:${String((i * 15) % 60).padStart(2, '0')}`,
    sequence: i + 1,
    data: {},
    undone: false
  })),

  /**
   * Creates a complex nested data structure for testing deep operations
   * @param {number} depth - Depth of nesting
   * @param {number} breadth - Number of items at each level
   * @returns {Object} Nested data structure
   */
  nestedData: (depth, breadth) => {
    const createLevel = (currentDepth) => {
      if (currentDepth === 0) {
        return `leaf-${Math.random()}`;
      }
      
      const level = {};
      for (let i = 0; i < breadth; i++) {
        level[`item-${i}`] = createLevel(currentDepth - 1);
      }
      return level;
    };
    
    return createLevel(depth);
  }
};

/**
 * Helper to test multiple performance scenarios
 * @param {Array} scenarios - Array of {name, operation, options} objects
 * @returns {Promise<Array>} Results for all scenarios
 */
export const runPerformanceScenarios = async (scenarios) => {
  const results = [];
  
  for (const scenario of scenarios) {
    const { name, operation, options = {} } = scenario;
    
    console.log(`Running performance scenario: ${name}`);
    const measurement = await measurePerformance(operation, { 
      ...options, 
      enableLogging: true 
    });
    
    results.push({
      name,
      ...measurement
    });
  }
  
  return results;
};

/**
 * Performance test suite configuration for common use cases
 */
export const performanceConfig = {
  // Standard thresholds for different types of operations
  thresholds: testConfig.performanceThresholds,
  
  // Common dataset sizes for testing
  datasetSizes: {
    small: 10,
    medium: 100,
    large: 1000,
    extraLarge: 5000
  },
  
  // Default options for different test types
  testOptions: {
    rendering: { operation: 'fast', enableLogging: true },
    filtering: { operation: 'normal', enableLogging: true },
    sorting: { operation: 'normal', enableLogging: true },
    complexOperations: { operation: 'slow', enableLogging: true }
  }
};