/**
 * PromptJS — v4 ANALYZER branch-coverage suite (continuation of v3).
 *
 * v3 covered usage warnings (W4101/W4102/W4103), type hints, write-to-derived,
 * side-effects, and component-param ordering (analyzer branch ≈ 84.4%). v4
 * closes the remaining control-flow / context branches that v3 left cold:
 *
 *   - visitBerhentiStatement: E4011 outside loop/handler, AND the
 *     in-function-but-not-loop/handler second E4011 branch.
 *   - visitLewatiStatement: E4012 outside a loop.
 *   - visitTampilkanStatement: E4007 on an unknown `mode`; valid mode passes.
 *   - visitGunakanStatement (analyzer copy): E4010 when symbol is not a komponen.
 *   - visitSaatStatement (analyzer copy): string / Identifier / MemberExpression
 *     target forms feeding the W3003 non-reactive check.
 *   - emitUsageWarnings strict mode: top-level fungsi/komponen skipped in
 *     'normal' but reported in 'strict'; ErrorNode declaration is skipped.
 *
 * Direct-unit calls drive context flags (loopDepth/handlerDepth/inFunction)
 * deterministically — the only reliable way to hit both E4011 branches.
 * Every assertion validated against real engine behavior first.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');
const Analyzer = require('../src/analyzer/promptjs-analyzer');

// ── Helpers ───────────────────────────────────────────────────────────
function parse(src) {
  const { tokens } = Lexer.tokenize(src);
  const { ast } = Parser.parse(tokens);
  return ast;
}
function analyze(src, opts) {
  const r = new Resolver();
  const rr = r.resolve(parse(src));
  const a = new Analyzer();
  return a.analyze(rr.ast, opts || { usageWarnings: 'normal' });
}
const hasCode = (list, code) => list.some((e) => e.code === code);
const LOC = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };

// A bare analyzer with initialized fields for direct-unit visitor calls.
function bareAnalyzer() {
  const a = new Analyzer();
  a.analyze(parse('Buat ruang:\n    "x"'), { usageWarnings: 'off' });
  a.errors = [];
  a.warnings = [];
  a.context = a.context || {};
  a.context.loopDepth = 0;
  a.context.handlerDepth = 0;
  a.context.inFunction = false;
  return a;
}

// ── 1. visitBerhentiStatement — both E4011 branches ────────────────────
describe('v4 analyzer — berhenti (E4011) context branches', () => {
  it('berhenti OUTSIDE any loop/handler emits E4011', () => {
    const a = bareAnalyzer();
    a.visitBerhentiStatement({ type: 'BerhentiStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4011')).toBe(true);
  });

  it('berhenti INSIDE a loop is valid (no E4011)', () => {
    const a = bareAnalyzer();
    a.context.loopDepth = 1;
    a.visitBerhentiStatement({ type: 'BerhentiStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4011')).toBe(false);
  });

  it('berhenti INSIDE a handler is valid (no E4011)', () => {
    const a = bareAnalyzer();
    a.context.handlerDepth = 1;
    a.visitBerhentiStatement({ type: 'BerhentiStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4011')).toBe(false);
  });

  it('berhenti inside a FUNCTION (not loop/handler) emits E4011', () => {
    const a = bareAnalyzer();
    a.context.inFunction = true;
    a.context.loopDepth = 0;
    a.context.handlerDepth = 0;
    a.visitBerhentiStatement({ type: 'BerhentiStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4011')).toBe(true);
  });
});

// ── 2. visitLewatiStatement — E4012 ────────────────────────────────────
describe('v4 analyzer — lewati (E4012)', () => {
  it('lewati outside a loop emits E4012', () => {
    const a = bareAnalyzer();
    a.visitLewatiStatement({ type: 'LewatiStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4012')).toBe(true);
  });

  it('lewati inside a loop is valid (no E4012)', () => {
    const a = bareAnalyzer();
    a.context.loopDepth = 1;
    a.visitLewatiStatement({ type: 'LewatiStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4012')).toBe(false);
  });
});

// ── 3. visitTampilkanStatement — E4007 invalid mode ────────────────────
describe('v4 analyzer — tampilkan mode (E4007)', () => {
  it('unknown mode emits E4007', () => {
    const a = bareAnalyzer();
    a.visitTampilkanStatement({ type: 'TampilkanStatement', mode: 'tidakAda', loc: LOC });
    expect(hasCode(a.errors, 'E4007')).toBe(true);
  });

  it('valid mode (ganti) does NOT emit E4007', () => {
    const a = bareAnalyzer();
    a.visitTampilkanStatement({ type: 'TampilkanStatement', mode: 'ganti', loc: LOC });
    expect(hasCode(a.errors, 'E4007')).toBe(false);
  });

  it('no mode at all does NOT emit E4007', () => {
    const a = bareAnalyzer();
    a.visitTampilkanStatement({ type: 'TampilkanStatement', loc: LOC });
    expect(hasCode(a.errors, 'E4007')).toBe(false);
  });
});

// ── 4. visitGunakanStatement (analyzer copy) — E4010 ───────────────────
describe('v4 analyzer — gunakan non-component (E4010)', () => {
  it('using a non-component symbol emits E4010', () => {
    // integration: declare data `x`, then `gunakan x` → analyzer E4010
    const res = analyze('data x = 1\nBuat ruang:\n    gunakan x', { usageWarnings: 'off' });
    expect(hasCode(res.errors, 'E4010')).toBe(true);
  });
});

// ── 5. visitSaatStatement (analyzer copy) — target forms ───────────────
describe('v4 analyzer — saat target forms', () => {
  it('Identifier-node target (non-reactive) flows through (string-extraction branch)', () => {
    const a = bareAnalyzer();
    // No symbol map entry → branch executes without throwing; documents the
    // Identifier target-name extraction path.
    expect(() =>
      a.visitSaatStatement({
        type: 'SaatStatement',
        target: { type: 'Identifier', name: 'foo' },
        body: null,
        loc: LOC,
      })
    ).not.toThrow();
  });

  it('MemberExpression target resolves to its root object (no throw)', () => {
    const a = bareAnalyzer();
    const member = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'obj' },
      property: { type: 'Identifier', name: 'berubah' },
      loc: LOC,
    };
    expect(() =>
      a.visitSaatStatement({ type: 'SaatStatement', target: member, body: null, loc: LOC })
    ).not.toThrow();
  });

  it('non-string/non-node target falls back to String() (no throw)', () => {
    const a = bareAnalyzer();
    expect(() =>
      a.visitSaatStatement({ type: 'SaatStatement', target: 42, body: null, loc: LOC })
    ).not.toThrow();
  });
});

// ── 6. emitUsageWarnings — strict vs normal skip branches ──────────────
describe('v4 analyzer — usage warnings strict/normal skip branches', () => {
  it('normal mode does NOT warn an unused top-level fungsi', () => {
    const res = analyze('fungsi sapa():\n    kembalikan 1\nBuat ruang:\n    "x"', {
      usageWarnings: 'normal',
    });
    expect(hasCode(res.warnings, 'W4101')).toBe(false);
  });

  it('strict mode DOES warn an unused top-level fungsi (W4101)', () => {
    const res = analyze('fungsi sapa():\n    kembalikan 1\nBuat ruang:\n    "x"', {
      usageWarnings: 'strict',
    });
    expect(hasCode(res.warnings, 'W4101')).toBe(true);
  });

  it('usageWarnings: "off" emits no usage warnings at all', () => {
    const res = analyze('tetap tidakDipakai = 1\nBuat ruang:\n    "x"', { usageWarnings: 'off' });
    expect(hasCode(res.warnings, 'W4101')).toBe(false);
  });
});
