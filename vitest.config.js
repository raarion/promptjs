'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/helpers/**', 'tests/reports/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/tester/**', 'src/**/test-*.js'],
      // Per-module thresholds (Opsi B) — set at current level + buffer to
      // prevent regression. Raise in future PRs as coverage improves.
      // Path to ≥80% overall: implement missing keywords (simpan, ketika,
      // berhenti, dll.) which will naturally exercise more code paths.
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 55,
        lines: 60,
        perFile: false,
      },
    },
  },
});
