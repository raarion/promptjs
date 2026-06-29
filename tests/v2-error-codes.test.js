// @ts-check

/**
 * v2 Edge-Case Suite — Error Code Helpers (src/parser/error-codes.js)
 * ===================================================================
 *
 * Exhaustive branch coverage for the diagnostic factory/formatter
 * (baseline branch coverage: 39.53%). These are pure deterministic
 * functions, so we test every branch directly:
 *   - getSeverity: W-prefix, E-prefix, empty/null
 *   - getStage: every pipeline digit 1..6 + default + too-short/null
 *   - createError: default lookup, unknown code fallback, override
 *     application, and the pesan/saran alias synchronization
 *   - buatParseError: wrapper parity with createError
 *   - formatError: error vs warning prefix, modern loc vs legacy
 *     baris/kolom, suggestion present vs absent, stage present vs absent
 */

import { describe, it, expect } from 'vitest';

const Err = require('../src/parser/error-codes.js');
const { createError, buatParseError, formatError, getSeverity, getStage } = Err;

const loc = { start: { line: 5, column: 12 } };

describe('v2 — getSeverity (all branches)', () => {
  it('W-prefixed code → warning', () => {
    expect(getSeverity('W4001')).toBe('warning');
  });
  it('E-prefixed code → error', () => {
    expect(getSeverity('E1001')).toBe('error');
  });
  it('empty / null / undefined code → error (safe default)', () => {
    expect(getSeverity('')).toBe('error');
    expect(getSeverity(null)).toBe('error');
    expect(getSeverity(undefined)).toBe('error');
  });
});

describe('v2 — getStage (every pipeline digit + defaults)', () => {
  const cases = [
    ['E1001', 'Lexer'],
    ['E2001', 'Parser'],
    ['E3001', 'Resolver'],
    ['E4001', 'Analyzer'],
    ['E5001', 'Compiler'],
    ['E6001', 'Runtime'],
    ['E9001', 'System'], // unknown digit → default
    ['W2001', 'Parser'], // warnings share the same digit mapping
  ];
  it.each(cases)('%s → %s', (code, stage) => {
    expect(getStage(code)).toBe(stage);
  });

  it('null / too-short code → System', () => {
    expect(getStage(null)).toBe('System');
    expect(getStage('E')).toBe('System');
    expect(getStage('')).toBe('System');
  });
});

describe('v2 — createError', () => {
  it('known code → fills message/suggestion + dual EN/ID aliases', () => {
    const e = createError('E1002', loc);
    expect(e.code).toBe('E1002');
    expect(e.kode).toBe('E1002'); // ID alias
    expect(e.severity).toBe('error');
    expect(e.stage).toBe('Lexer');
    expect(e.message).toBe(e.pesan); // alias mirrored
    expect(e.suggestion).toBe(e.saran);
    expect(e.loc).toBe(loc);
    expect(e.message).not.toBe('Error tidak dikenal');
  });

  it('unknown code → fallback message, empty suggestion', () => {
    const e = createError('E9999', loc);
    expect(e.message).toBe('Error tidak dikenal');
    expect(e.pesan).toBe('Error tidak dikenal');
    expect(e.suggestion).toBe('');
    expect(e.stage).toBe('System');
  });

  it('overrides replace default fields', () => {
    const e = createError('E1002', loc, /** @type {any} */ ({ message: 'custom msg', extra: 42 }));
    expect(e.message).toBe('custom msg');
    // alias re-synced after override
    expect(e.pesan).toBe('custom msg');
    // `extra` is an arbitrary runtime-only override field, not on the typed shape
    expect(/** @type {any} */ (e).extra).toBe(42);
  });

  it('override of suggestion re-syncs saran alias', () => {
    const e = createError('E1002', loc, { suggestion: 'do this instead' });
    expect(e.suggestion).toBe('do this instead');
    expect(e.saran).toBe('do this instead');
  });

  it('no overrides arg → no crash, defaults intact', () => {
    const e = createError('W4001', loc);
    expect(e.severity).toBe('warning');
    expect(e.stage).toBe('Analyzer');
  });

  it('does not copy inherited (non-own) override properties', () => {
    const proto = { injected: 'nope' };
    const overrides = Object.create(proto);
    overrides.message = 'own only';
    const e = createError('E1002', loc, overrides);
    expect(e.message).toBe('own only');
    // `injected` lives on the prototype, never copied; runtime-only check
    expect(/** @type {any} */ (e).injected).toBeUndefined();
  });
});

describe('v2 — buatParseError wrapper parity', () => {
  it('produces an object equivalent to createError', () => {
    const a = createError('E2001', loc, { message: 'x' });
    const b = buatParseError('E2001', loc, { message: 'x' });
    expect(b).toEqual(a);
  });
});

describe('v2 — formatError', () => {
  it('error → ✗ prefix with modern loc + stage + code', () => {
    const out = formatError({
      code: 'E1002',
      severity: 'error',
      stage: 'Lexer',
      message: 'Tab found',
      suggestion: 'Use spaces',
      loc,
    });
    expect(out).toContain('✗');
    expect(out).toContain('Baris 5, Kolom 12');
    expect(out).toContain('[Lexer]');
    expect(out).toContain('[E1002]');
    expect(out).toContain('Tab found');
    expect(out).toContain('Saran: Use spaces');
  });

  it('warning → ⚠ prefix', () => {
    const out = formatError({
      code: 'W4001',
      severity: 'warning',
      stage: 'Analyzer',
      message: 'heads up',
      loc,
    });
    expect(out.startsWith('⚠')).toBe(true);
  });

  it('legacy baris/kolom location format is supported', () => {
    const out = formatError({
      code: 'E1001',
      severity: 'error',
      message: 'm',
      baris: 7,
      kolom: 3,
    });
    expect(out).toContain('Baris 7, Kolom 3');
  });

  it('no suggestion → no "Saran:" line', () => {
    const out = formatError({
      code: 'E1001',
      severity: 'error',
      stage: 'Lexer',
      message: 'm',
      loc,
    });
    expect(out).not.toContain('Saran:');
  });

  it('falls back to saran alias when suggestion absent', () => {
    const out = formatError({
      code: 'E1001',
      severity: 'error',
      message: 'm',
      saran: 'pakai spasi',
      loc,
    });
    expect(out).toContain('Saran: pakai spasi');
  });

  it('missing stage → no stage bracket', () => {
    const out = formatError({ code: 'E1001', severity: 'error', message: 'm', loc });
    expect(out).not.toContain('[Lexer]');
    expect(out).toContain('[E1001]');
  });

  it('no location at all → empty loc string, still renders code', () => {
    const out = formatError({ code: 'E9999', severity: 'error', message: 'm' });
    expect(out).toContain('[E9999]');
  });
});
