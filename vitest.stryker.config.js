'use strict';

/**
 * Vitest config used ONLY by Stryker mutation testing.
 *
 * Runs a focused subset of tests that exercise the resolver + analyzer (the
 * two mutated modules) instead of the full 710-test suite. This keeps a full
 * mutation run to a few minutes while still measuring whether our assertions
 * actually kill mutants in the DSL semantic core. The subset combines the new
 * v3 branch suites (direct + integration on resolver/analyzer) with the
 * existing pipeline/expression/negative suites that drive those modules
 * end-to-end.
 */
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: [
      'tests/v3-resolver-branches.test.js',
      'tests/v3-analyzer-branches.test.js',
      'tests/v4-resolver-branches.test.js',
      'tests/v4-analyzer-branches.test.js',
      'tests/v5-resolver-nocoverage.test.js',
      'tests/v5-diagnostic-text.test.js',
      'tests/v5-symbol-flags.test.js',
      'tests/v5-boundary.test.js',
      'tests/pipeline.test.js',
      'tests/c4-expressions.test.js',
      'tests/negative-errors.test.js',
      'tests/negative-complex.test.js',
      'tests/extended.test.js',
    ],
    exclude: ['node_modules/**'],
  },
});
