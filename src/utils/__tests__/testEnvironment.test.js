/**
 * Tests for test environment detection utilities
 */

import { 
  isCI, 
  isLocal, 
  shouldRunPerformanceTests, 
  getEnvironmentDescription, 
  testConfig 
} from '../testEnvironment';

describe('testEnvironment utilities', () => {
  // Store original env vars to restore after tests
  const originalEnv = { ...process.env };
  
  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('isCI', () => {
    it('should detect CI=true environment', () => {
      process.env.CI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should detect GitHub Actions environment', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(isCI()).toBe(true);
    });

    it('should detect Travis CI environment', () => {
      process.env.TRAVIS = 'true';
      expect(isCI()).toBe(true);
    });

    it('should detect CircleCI environment', () => {
      process.env.CIRCLECI = 'true';
      expect(isCI()).toBe(true);
    });

    it('should return false for local environment', () => {
      // Clear all CI environment variables
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.TRAVIS;
      delete process.env.CIRCLECI;
      delete process.env.JENKINS_URL;
      delete process.env.BUILD_NUMBER;
      delete process.env.GITLAB_CI;
      delete process.env.TEAMCITY_VERSION;
      delete process.env.BUILDKITE;
      
      expect(isCI()).toBe(false);
    });
  });

  describe('isLocal', () => {
    it('should return true when not in CI', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      expect(isLocal()).toBe(true);
    });

    it('should return false when in CI', () => {
      process.env.CI = 'true';
      expect(isLocal()).toBe(false);
    });
  });

  describe('shouldRunPerformanceTests', () => {
    it('should run performance tests when explicitly enabled', () => {
      process.env.CI = 'true'; // In CI
      process.env.RUN_PERFORMANCE_TESTS = 'true'; // But explicitly enabled
      expect(shouldRunPerformanceTests()).toBe(true);
    });

    it('should run performance tests in local environment by default', () => {
      delete process.env.CI;
      delete process.env.RUN_PERFORMANCE_TESTS;
      expect(shouldRunPerformanceTests()).toBe(true);
    });

    it('should skip performance tests in CI by default', () => {
      process.env.CI = 'true';
      delete process.env.RUN_PERFORMANCE_TESTS;
      expect(shouldRunPerformanceTests()).toBe(false);
    });
  });

  describe('getEnvironmentDescription', () => {
    it('should identify GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(getEnvironmentDescription()).toBe('GitHub Actions');
    });

    it('should identify Travis CI', () => {
      process.env.TRAVIS = 'true';
      expect(getEnvironmentDescription()).toBe('Travis CI');
    });

    it('should return Local Development for non-CI', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      expect(getEnvironmentDescription()).toBe('Local Development');
    });

    it('should return generic CI Environment for unknown CI', () => {
      process.env.CI = 'true';
      delete process.env.GITHUB_ACTIONS;
      delete process.env.TRAVIS;
      expect(getEnvironmentDescription()).toBe('CI Environment');
    });
  });

  describe('testConfig', () => {
    it('should provide configuration object', () => {
      expect(testConfig).toHaveProperty('environment');
      expect(testConfig).toHaveProperty('isCI');
      expect(testConfig).toHaveProperty('isLocal');
      expect(testConfig).toHaveProperty('shouldRunPerformanceTests');
      expect(testConfig).toHaveProperty('performanceThresholds');
    });

    it('should have performance thresholds', () => {
      expect(testConfig.performanceThresholds).toHaveProperty('fastOperation');
      expect(testConfig.performanceThresholds).toHaveProperty('normalOperation');
      expect(testConfig.performanceThresholds).toHaveProperty('slowOperation');
      
      // Should be numbers
      expect(typeof testConfig.performanceThresholds.fastOperation).toBe('number');
      expect(typeof testConfig.performanceThresholds.normalOperation).toBe('number');
      expect(typeof testConfig.performanceThresholds.slowOperation).toBe('number');
    });

    it('should have more lenient thresholds in CI', () => {
      // Clear module cache to get fresh config
      jest.resetModules();
      
      // Test CI thresholds
      process.env.CI = 'true';
      const { testConfig: ciConfig } = require('../testEnvironment');
      
      // Clear cache again and test local thresholds  
      jest.resetModules();
      delete process.env.CI;
      const { testConfig: localConfig } = require('../testEnvironment');
      
      expect(ciConfig.performanceThresholds.fastOperation).toBeGreaterThan(
        localConfig.performanceThresholds.fastOperation
      );
    });
  });
});