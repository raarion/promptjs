/**
 * PromptJS v132 — parser position regression tests.
 *
 * Scope: parser `this.pos` backtracking around parenthesized expressions and
 * parenthesized arrow functions. This locks the micro-audit requested after
 * the v132 stabilization commits: `_parsePrimaryExpression` must restore the
 * real parser cursor (`this.pos`) when `(ident ...)` is NOT an arrow parameter
 * list, while preserving valid `(x, y) => expr` parsing.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

describe('v132 parser this.pos micro-audit — parentheses and arrows', () => {
  it('parses a parenthesized identifier expression without losing the cursor', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    data hitung = 1\n' +
        '    turunan hasil = (hitung) tambah 2\n' +
        '    Buat div: $hasil'
    );

    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain('const hasil = __createComputed(() => (hitung.value + 2));');
  });

  it('still parses parenthesized arrow-function parameters', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    tetap fn = (a, b) => a + b\n' +
        '    tetap hasil = fn(1, 2)\n' +
        '    Buat div: $hasil'
    );

    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain('const fn = (a, b) => (a + b);');
  });
});
