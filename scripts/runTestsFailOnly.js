#!/usr/bin/env node

const path = require('path');

const createJestConfigPath = require.resolve('react-scripts/scripts/utils/createJestConfig');
const originalCreateJestConfig = require(createJestConfigPath);

require.cache[createJestConfigPath].exports = (...args) => {
  const config = originalCreateJestConfig(...args);
  config.reporters = [path.resolve(__dirname, 'jestFailOnlyReporter.js')];
  return config;
};

// In CI environments, ensure we run in non-watch mode and exit after completion
if (process.env.CI === 'true') {
  if (!process.argv.includes('--watchAll')) {
    process.argv.push('--watchAll=false');
  }
  // Force exit after tests complete to prevent hanging
  if (!process.argv.includes('--forceExit')) {
    process.argv.push('--forceExit');
  }
  // Limit workers to reduce memory usage with 100+ test files
  if (!process.argv.some(arg => arg.includes('--maxWorkers') || arg.includes('--runInBand'))) {
    process.argv.push('--maxWorkers=2');
  }
}

require('react-scripts/scripts/test');
