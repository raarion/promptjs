'use strict';

/**
 * PromptJS — ESLint flat config (ESLint 10).
 * Source code is CommonJS targeting Node >= 20.
 * Formatting concerns are delegated to Prettier (see eslint-config-prettier).
 */
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        // The compiler is UMD/browser-targeted (lexer UMD wrapper references `self`)
        // and emits DOM code, so browser globals are legitimate here.
        ...globals.browser,
      },
    },
    rules: {
      // Pragmatic gate for Level 1 — tightened in later waves.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Modernize the Node >= 20 source: no legacy `var`, prefer immutable bindings.
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Vitest specs are ES modules running in a Node + browser-ish (jsdom) context.
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  prettier,
];
