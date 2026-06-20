'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/helpers/**', 'tests/reports/**', 'node_modules/**'],
    // Coverage is collected but the >=80% gate is enabled in a later wave,
    // once snapshot + negative-path suites are in place.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/tester/**', 'src/**/test-*.js'],
    },
  },
});
