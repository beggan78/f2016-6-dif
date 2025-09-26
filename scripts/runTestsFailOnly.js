#!/usr/bin/env node

const path = require('path');

const createJestConfigPath = require.resolve('react-scripts/scripts/utils/createJestConfig');
const originalCreateJestConfig = require(createJestConfigPath);

require.cache[createJestConfigPath].exports = (...args) => {
  const config = originalCreateJestConfig(...args);
  config.reporters = [path.resolve(__dirname, 'jestFailOnlyReporter.js')];
  return config;
};

require('react-scripts/scripts/test');
