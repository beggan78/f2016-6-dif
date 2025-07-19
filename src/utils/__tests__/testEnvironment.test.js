/**
 * Tests for test environment detection utilities
 * Environment-agnostic tests that work in both local and CI environments
 */

import { 
  isCI, 
  isLocal, 
  shouldRunPerformanceTests, 
  getEnvironmentDescription, 
  testConfig 
} from '../testEnvironment';

describe('testEnvironment utilities', () => {
  describe('isCI', () => {
    it('should correctly detect CI environment based on environment variables', () => {
      // Test should verify the logic rather than hardcoded expectations
      const expectedCI = !!(
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
      
      expect(isCI()).toBe(expectedCI);
    });
  });

  describe('isLocal', () => {
    it('should be the inverse of isCI', () => {
      // isLocal should always be the opposite of isCI
      expect(isLocal()).toBe(!isCI());
    });
  });

  describe('shouldRunPerformanceTests', () => {
    it('should run performance tests when explicitly enabled', () => {
      // Save original value
      const originalValue = process.env.RUN_PERFORMANCE_TESTS;
      
      process.env.RUN_PERFORMANCE_TESTS = 'true';
      expect(shouldRunPerformanceTests()).toBe(true);
      
      // Restore original value
      if (originalValue === undefined) {
        delete process.env.RUN_PERFORMANCE_TESTS;
      } else {
        process.env.RUN_PERFORMANCE_TESTS = originalValue;
      }
    });

    it('should default to local environment behavior when not explicitly set', () => {
      // Save original value
      const originalValue = process.env.RUN_PERFORMANCE_TESTS;
      
      delete process.env.RUN_PERFORMANCE_TESTS;
      // Should run performance tests in local environment, skip in CI by default
      expect(shouldRunPerformanceTests()).toBe(isLocal());
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.RUN_PERFORMANCE_TESTS = originalValue;
      }
    });
  });

  describe('getEnvironmentDescription', () => {
    it('should return a valid environment description', () => {
      const description = getEnvironmentDescription();
      const validDescriptions = [
        'Local Development',
        'GitHub Actions',
        'Travis CI',
        'CircleCI',
        'GitLab CI',
        'Jenkins',
        'Buildkite',
        'TeamCity',
        'CI Environment'
      ];
      
      expect(validDescriptions).toContain(description);
    });

    it('should return GitHub Actions when GITHUB_ACTIONS is true', () => {
      // Only test GitHub Actions detection when actually in GitHub Actions
      if (process.env.GITHUB_ACTIONS === 'true') {
        expect(getEnvironmentDescription()).toBe('GitHub Actions');
      }
    });

    it('should return Local Development when not in any CI', () => {
      // Only test local detection when actually in local environment
      if (!isCI()) {
        expect(getEnvironmentDescription()).toBe('Local Development');
      }
    });
  });

  describe('testConfig', () => {
    it('should provide configuration object with all required properties', () => {
      expect(testConfig).toHaveProperty('environment');
      expect(testConfig).toHaveProperty('isCI');
      expect(testConfig).toHaveProperty('isLocal');
      expect(testConfig).toHaveProperty('shouldRunPerformanceTests');
      expect(testConfig).toHaveProperty('performanceThresholds');
    });

    it('should have performance thresholds as numbers', () => {
      expect(testConfig.performanceThresholds).toHaveProperty('fastOperation');
      expect(testConfig.performanceThresholds).toHaveProperty('normalOperation');
      expect(testConfig.performanceThresholds).toHaveProperty('slowOperation');
      
      // Should be numbers
      expect(typeof testConfig.performanceThresholds.fastOperation).toBe('number');
      expect(typeof testConfig.performanceThresholds.normalOperation).toBe('number');
      expect(typeof testConfig.performanceThresholds.slowOperation).toBe('number');
      
      // Should be positive numbers
      expect(testConfig.performanceThresholds.fastOperation).toBeGreaterThan(0);
      expect(testConfig.performanceThresholds.normalOperation).toBeGreaterThan(0);
      expect(testConfig.performanceThresholds.slowOperation).toBeGreaterThan(0);
    });

    it('should have environment-appropriate configuration', () => {
      // Test that config matches current environment
      expect(testConfig.environment).toBe(getEnvironmentDescription());
      expect(testConfig.isCI).toBe(isCI());
      expect(testConfig.isLocal).toBe(isLocal());
      expect(testConfig.shouldRunPerformanceTests).toBe(shouldRunPerformanceTests());
    });

    it('should have higher performance thresholds in CI environment', () => {
      if (isCI()) {
        // CI should have more lenient thresholds
        expect(testConfig.performanceThresholds.fastOperation).toBe(500);
        expect(testConfig.performanceThresholds.normalOperation).toBe(1000);
        expect(testConfig.performanceThresholds.slowOperation).toBe(2000);
      } else {
        // Local should have stricter thresholds
        expect(testConfig.performanceThresholds.fastOperation).toBe(200);
        expect(testConfig.performanceThresholds.normalOperation).toBe(300);
        expect(testConfig.performanceThresholds.slowOperation).toBe(500);
      }
    });
  });
});