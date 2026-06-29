'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/helpers/**', 'tests/reports/**', 'node_modules/**'],
    // FS-/subprocess-heavy suites (cli-commands, builder-integration,
    // findpjsfiles, adapter I/O) can starve under heavy parallel load (e.g. a
    // pre-push hook running the whole suite at once) and hit the 5s default,
    // producing FLAKY "Test timed out in 5000ms" failures that are NOT
    // assertion failures — every such test is green in isolation. Raising the
    // ceiling gives slow-under-load tests headroom without weakening fast ones.
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.js'],
      exclude: ['src/tester/**', 'src/**/test-*.js'],
      // Global thresholds — raised again after the v3 resolver+analyzer branch
      // suite lifted overall coverage to 81.52% lines / 71.6% branches
      // (resolver 83% L / 64.73% B, analyzer 89.43% L / 84.45% B). Set just
      // below the measured numbers so CI fails on REGRESSION (a deleted or
      // weakened test) while leaving normal churn headroom. Verified stable
      // across 3 consecutive full runs (zero variance).
      thresholds: {
        statements: 80,
        branches: 71,
        functions: 82,
        lines: 81,
        perFile: false,
      },
    },
  },
});
