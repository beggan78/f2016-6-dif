/**
 * Test Environment Detection Utility
 * 
 * Provides utilities to detect the testing environment and determine
 * whether certain types of tests should be executed.
 */

/**
 * Detects if tests are running in a CI environment
 * @returns {boolean} True if running in CI, false otherwise
 */
export const isCI = () => {
  // Check for common CI environment variables
  return !!(
    process.env.CI === 'true' ||
    process.env.CONTINUOUS_INTEGRATION === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.TRAVIS === 'true' ||
    process.env.CIRCLECI === 'true' ||
    process.env.JENKINS_URL ||
    process.env.BUILD_NUMBER ||
    process.env.GITLAB_CI === 'true' ||
    process.env.TEAMCITY_VERSION ||
    process.env.BUILDKITE === 'true'
  );
};

/**
 * Detects if we're running in a local development environment
 * @returns {boolean} True if running locally, false otherwise
 */
export const isLocal = () => {
  return !isCI();
};

/**
 * Checks if performance tests should be run
 * Performance tests are skipped in CI by default unless explicitly enabled
 * @returns {boolean} True if performance tests should run, false otherwise
 */
export const shouldRunPerformanceTests = () => {
  // Allow override via environment variable
  if (process.env.RUN_PERFORMANCE_TESTS === 'true') {
    return true;
  }
  
  // By default, only run performance tests in local environment
  return isLocal();
};

/**
 * Gets a descriptive string of the current test environment
 * @returns {string} Environment description
 */
export const getEnvironmentDescription = () => {
  if (isCI()) {
    // Try to identify specific CI provider
    if (process.env.GITHUB_ACTIONS === 'true') return 'GitHub Actions';
    if (process.env.TRAVIS === 'true') return 'Travis CI';
    if (process.env.CIRCLECI === 'true') return 'CircleCI';
    if (process.env.GITLAB_CI === 'true') return 'GitLab CI';
    if (process.env.JENKINS_URL) return 'Jenkins';
    if (process.env.BUILDKITE === 'true') return 'Buildkite';
    if (process.env.TEAMCITY_VERSION) return 'TeamCity';
    return 'CI Environment';
  }
  
  return 'Local Development';
};

/**
 * Configuration object with environment-specific settings
 */
export const testConfig = {
  environment: getEnvironmentDescription(),
  isCI: isCI(),
  isLocal: isLocal(),
  shouldRunPerformanceTests: shouldRunPerformanceTests(),
  
  // Performance test thresholds (can be adjusted based on environment)
  performanceThresholds: {
    // More lenient thresholds for CI if performance tests are enabled
    fastOperation: isCI() ? 500 : 200,
    normalOperation: isCI() ? 1000 : 300,
    slowOperation: isCI() ? 2000 : 500,
  }
};

/**
 * Logs the current test environment configuration
 * Useful for debugging test issues
 */
export const logTestEnvironment = () => {
  console.log('Test Environment Configuration:', {
    environment: testConfig.environment,
    isCI: testConfig.isCI,
    isLocal: testConfig.isLocal,
    shouldRunPerformanceTests: testConfig.shouldRunPerformanceTests,
    performanceThresholds: testConfig.performanceThresholds,
    relevantEnvVars: {
      CI: process.env.CI,
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
      RUN_PERFORMANCE_TESTS: process.env.RUN_PERFORMANCE_TESTS,
    }
  });
};