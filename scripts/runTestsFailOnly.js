#!/usr/bin/env node

const path = require('path');

const createJestConfigPath = require.resolve('react-scripts/scripts/utils/createJestConfig');
const originalCreateJestConfig = require(createJestConfigPath);

require.cache[createJestConfigPath].exports = (...args) => {
  const config = originalCreateJestConfig(...args);
  config.reporters = [path.resolve(__dirname, 'jestFailOnlyReporter.js')];
  config.moduleNameMapper = {
    ...(config.moduleNameMapper || {}),
    '^jsr:@supabase/supabase-js@2$': '@supabase/supabase-js',
    '^https://esm\\.sh/@upstash/redis@1\\.28\\.4$': '<rootDir>/src/__mocks__/upstashRedis.js'
  };
  return config;
};

require('react-scripts/scripts/test');
