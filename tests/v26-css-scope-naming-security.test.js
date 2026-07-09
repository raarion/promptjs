'use strict';

import { describe, it, expect } from 'vitest';

/**
 * v132 CodeQL #30 — CSS scope-name sanitizer security regression
 *
 * The sanitizer must preserve the public #79 scope-id behavior while avoiding
 * regex-based processing of file/component names. File names can be influenced
 * by project input, so this test also exercises long repeated separators that
 * previously triggered CodeQL's polynomial-regex warning.
 */

const { sanitizeScopeName, buildScopeId } = require('../src/engine/css');

describe('v26 CSS scope-name sanitizer security regression', () => {
  it('preserves existing scope-name behavior for normal file/component names', () => {
    expect(sanitizeScopeName('[slug]')).toBe('slug');
    expect(sanitizeScopeName('My File')).toBe('my-file');
    expect(sanitizeScopeName('Home.PJS')).toBe('home-pjs');
    expect(sanitizeScopeName('admin/dashboard')).toBe('admin-dashboard');
    expect(sanitizeScopeName('')).toBe('x');
    expect(sanitizeScopeName(null)).toBe('x');
    expect(buildScopeId('Home', 'Kartu')).toBe('home-kartu');
    expect(buildScopeId('Home')).toBe('home');
  });

  it('collapses repeated non-alphanumeric separators without regex backtracking risk', () => {
    const repeatedDashes = '-'.repeat(20_000);
    const repeatedMixed = 'Home' + repeatedDashes + 'Kartu' + '_'.repeat(20_000) + 'Utama';

    expect(sanitizeScopeName(repeatedDashes)).toBe('x');
    expect(sanitizeScopeName(repeatedMixed)).toBe('home-kartu-utama');
    expect(buildScopeId(repeatedMixed, repeatedMixed)).toBe('home-kartu-utama-home-kartu-utama');
  });

  it('keeps only lowercase ASCII letters and digits, using dash as separator', () => {
    expect(sanitizeScopeName('Äplikasi Café 2026!!!')).toBe('plikasi-caf-2026');
    expect(sanitizeScopeName('___Alpha___Beta___42___')).toBe('alpha-beta-42');
    expect(sanitizeScopeName('123---ABC---xyz')).toBe('123-abc-xyz');
  });
});
