/**
 * Tests for test environment detection utilities
 * Simplified for GitHub Actions only deployment
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
    it('should detect GitHub Actions environment', () => {
      // In GitHub Actions, this should always be true
      expect(isCI()).toBe(true);
    });
  });

  describe('isLocal', () => {
    it('should return false in GitHub Actions', () => {
      // In GitHub Actions, this should always be false
      expect(isLocal()).toBe(false);
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

    it('should skip performance tests in GitHub Actions by default', () => {
      // Save original value
      const originalValue = process.env.RUN_PERFORMANCE_TESTS;
      
      delete process.env.RUN_PERFORMANCE_TESTS;
      expect(shouldRunPerformanceTests()).toBe(false);
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.RUN_PERFORMANCE_TESTS = originalValue;
      }
    });
  });

  describe('getEnvironmentDescription', () => {
    it('should identify GitHub Actions', () => {
      expect(getEnvironmentDescription()).toBe('GitHub Actions');
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

    it('should have GitHub Actions environment configuration', () => {
      expect(testConfig.environment).toBe('GitHub Actions');
      expect(testConfig.isCI).toBe(true);
      expect(testConfig.isLocal).toBe(false);
      
      // Should have CI-appropriate performance thresholds
      expect(testConfig.performanceThresholds.fastOperation).toBe(500);
      expect(testConfig.performanceThresholds.normalOperation).toBe(1000);
      expect(testConfig.performanceThresholds.slowOperation).toBe(2000);
    });
  });
});