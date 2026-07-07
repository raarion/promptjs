// @ts-check
/**
 * v132 micro-audit: parenthesized-expression / arrow-function backtrack bug
 *
 * Root cause: _parsePrimary's arrow-function probe saved/restored this._pos
 * (a field that does NOT exist — the real counter is this.pos), making the
 * backtrack a silent no-op.  When the first token after ( was an identifier
 * the probe consumed tokens and advanced this.pos, but on failure the
 * position was never restored — so the subsequent parenthesized-expression
 * parse started from the wrong token.
 *
 * Same bug class as the P0.1 Ketika modifier fix (cca00e9).
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';

describe('v132 micro-audit: parenthesized expression backtrack (this._pos → this.pos)', () => {
  it('(a + b) parses as parenthesized expression, not parser error', () => {
    const r = compile('tetap a = 1\ntetap b = 2\ntetap x = (a + b)\nBuat ruang:\n    teks = x');
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.js).toContain('const x = (a + b)');
  });

  it('(x) + 1 parses correctly (identifier in parens followed by operator)', () => {
    const r = compile('tetap x = 5\ntetap y = (x) + 1\nBuat ruang:\n    teks = y');
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.js).toContain('const y = (x + 1)');
  });

  it('(nama) as standalone expression in binding', () => {
    const r = compile('tetap nama = "Budi"\nBuat ruang:\n    teks = (nama)');
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('arrow function (x, y) => x + y still works after fix', () => {
    const r = compile('tetap fn = (x, y) => x + y\nBuat ruang:\n    teks = fn(1, 2)');
    expect(r.success).toBe(true);
    expect(r.js).toContain('(x, y) => (x + y)');
  });

  it('zero-param arrow () => 42 still works after fix', () => {
    const r = compile('tetap fn = () => 42\nBuat ruang:\n    teks = fn()');
    expect(r.success).toBe(true);
    expect(r.js).toContain('() => 42');
  });

  it('single-param arrow (x) => x * 2 still works', () => {
    const r = compile('tetap fn = (x) => x * 2\nBuat ruang:\n    teks = fn(5)');
    expect(r.success).toBe(true);
    expect(r.js).toContain('(x) => (x * 2)');
  });

  it('nested parentheses ((a + b)) work', () => {
    const r = compile('tetap a = 1\ntetap b = 2\ntetap x = ((a + b))\nBuat ruang:\n    teks = x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('const x = (a + b)');
  });

  it('(a + b) * c works (parens change precedence)', () => {
    const r = compile('tetap a = 1\ntetap b = 2\ntetap c = 3\ntetap x = (a + b) * c\nBuat ruang:\n    teks = x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('const x = ((a + b) * c)');
  });
});
