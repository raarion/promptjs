/**
 * PromptJS — v3 ANALYZER branch-coverage suite.
 *
 * Goal: close untested *branches* in `src/analyzer/promptjs-analyzer.js`
 * (baseline 59.66% branch). The analyzer runs after the resolver via
 * `analyzer.analyze(ast, options)` and emits semantic diagnostics:
 * type-hint mismatches (W4001), write-to-derived (E4004/E4101),
 * side-effects in derived expressions (E4002), duplicate/ordering of
 * component params (E4005/E4006), and usage warnings (W4101/W4102/W4103).
 *
 * Strategy (same discipline as v3 resolver suite):
 *  - Integration-first for diagnostics reachable from surface syntax — drive
 *    the real lexer → parser → resolver, then call `analyze()` and assert on
 *    returned errors/warnings.
 *  - Direct-unit for helper branches (`checkTypeHint`, `checkWriteToTurunan`,
 *    `checkSideEffectInTurunan`, `lookupSymbol` fallback) where building the
 *    exact node shape is the only reliable way to hit every branch.
 *
 * Every assertion was validated against real engine behavior first.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

// CommonJS `require` to share the exact instrumented module record the engine
// loads (see note in v3-resolver-branches.test.js) — keeps V8 coverage merge
// a clean union with the integration tests.
const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');
const Analyzer = require('../src/analyzer/promptjs-analyzer');

// ── Helpers ────────────────────────────────────────────────────────────────
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

// A bare analyzer for direct-unit calls (analyze() initializes the fields we
// touch: errors, warnings, context, _symbolMap).
function bareAnalyzer() {
  const a = new Analyzer();
  a.analyze(parse('Buat ruang:\n    "x"'), { usageWarnings: 'off' });
  a.errors = [];
  a.warnings = [];
  a.context = a.context || {};
  return a;
}

// ── 1. Usage warnings (W4101 / W4102 / W4103) ───────────────────────────────
describe('v3 analyzer — usage warnings', () => {
  it('W4101: a declared-but-unused symbol', () => {
    const res = analyze('tetap tidakDipakai = 1\nBuat ruang:\n    "x"', {
      usageWarnings: 'normal',
    });
    expect(hasCode(res.warnings, 'W4101')).toBe(true);
  });

  it('W4102: a mutable variable written but never read', () => {
    const res = analyze('ubah a = 0\nBuat ruang:\n    simpan 5 ke a', { usageWarnings: 'normal' });
    expect(hasCode(res.warnings, 'W4102')).toBe(true);
  });

  it('W4103: reactive data mutated but never read', () => {
    const res = analyze('data a = 0\nBuat ruang:\n    simpan 5 ke a', { usageWarnings: 'normal' });
    expect(hasCode(res.warnings, 'W4103')).toBe(true);
  });

  it('usageWarnings:"off" suppresses all usage warnings', () => {
    const res = analyze('tetap tidakDipakai = 1\nBuat ruang:\n    "x"', { usageWarnings: 'off' });
    expect(hasCode(res.warnings, 'W4101')).toBe(false);
  });

  it('usageWarnings:false is coerced to "normal" by `|| "normal"` (documents real behavior)', () => {
    // NOTE: `emitUsageWarnings` reads `this.options.usageWarnings || 'normal'`,
    // so a literal `false` is replaced by 'normal' BEFORE the `=== false`
    // guard — meaning that guard is effectively dead and `false` does NOT
    // suppress. We pin the *actual* behavior (warning IS emitted) rather than
    // the intuitive-but-wrong expectation. Use 'off' to truly disable.
    const res = analyze('tetap tidakDipakai = 1\nBuat ruang:\n    "x"', { usageWarnings: false });
    expect(hasCode(res.warnings, 'W4101')).toBe(true);
  });

  it('normal mode does NOT warn unused top-level fungsi (noise reduction)', () => {
    const res = analyze('Fungsi tak():\n    kembalikan 1\nBuat ruang:\n    "x"', {
      usageWarnings: 'normal',
    });
    expect(hasCode(res.warnings, 'W4101')).toBe(false);
  });

  it('strict mode DOES warn unused top-level fungsi', () => {
    const res = analyze('Fungsi tak():\n    kembalikan 1\nBuat ruang:\n    "x"', {
      usageWarnings: 'strict',
    });
    expect(hasCode(res.warnings, 'W4101')).toBe(true);
  });

  it('default options (none passed) still runs without throwing', () => {
    const r = new Resolver();
    const rr = r.resolve(parse('data x = 1\nBuat ruang:\n    "{x}"'));
    const a = new Analyzer();
    expect(() => a.analyze(rr.ast)).not.toThrow();
  });
});

// ── 2. Type-hint checking (W4001) — checkTypeHint direct-unit ───────────────
describe('v3 analyzer — checkTypeHint branches', () => {
  let a;
  beforeEach(() => {
    a = bareAnalyzer();
  });

  it('integration: `data x: angka = "teks"` → W4001', () => {
    const res = analyze('data x: angka = "teks"\nBuat ruang:\n    "{x}"', { usageWarnings: 'off' });
    expect(hasCode(res.warnings, 'W4001')).toBe(true);
  });

  it('number literal matching `angka` → no warning', () => {
    a.checkTypeHint('angka', { type: 'Literal', value: 42, loc: LOC });
    expect(a.warnings.length).toBe(0);
  });

  it('string literal vs `angka` → W4001', () => {
    a.checkTypeHint('angka', { type: 'Literal', value: 'hi', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('boolean literal infers `benar-salah`', () => {
    a.checkTypeHint('angka', { type: 'Literal', value: true, loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('ObjectLiteral infers `objek`', () => {
    a.checkTypeHint('array', { type: 'ObjectLiteral', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('ArrayLiteral infers `array`', () => {
    a.checkTypeHint('objek', { type: 'ArrayLiteral', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('BinaryExpression with arithmetic op infers `angka`', () => {
    a.checkTypeHint('teks', { type: 'BinaryExpression', operator: '+', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('BinaryExpression with comparison op infers `benar-salah`', () => {
    a.checkTypeHint('angka', { type: 'BinaryExpression', operator: '>', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('UnaryExpression `bukan` infers `benar-salah`', () => {
    a.checkTypeHint('angka', { type: 'UnaryExpression', operator: 'bukan', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('UnaryExpression `-` infers `angka`', () => {
    a.checkTypeHint('teks', { type: 'UnaryExpression', operator: '-', loc: LOC });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('MemberExpression `.panjang` infers `angka`', () => {
    a.checkTypeHint('teks', {
      type: 'MemberExpression',
      property: { type: 'Identifier', name: 'panjang' },
      loc: LOC,
    });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('CallExpression to `ambil*` infers `teks`', () => {
    a.checkTypeHint('angka', {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'ambilData' },
      loc: LOC,
    });
    expect(hasCode(a.warnings, 'W4001')).toBe(true);
  });

  it('unknown CallExpression type stays silent (no false positive)', () => {
    a.checkTypeHint('angka', {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'misteri' },
      loc: LOC,
    });
    expect(a.warnings.length).toBe(0);
  });

  it('no typeHint → early return, no warning', () => {
    a.checkTypeHint(null, { type: 'Literal', value: 'x', loc: LOC });
    expect(a.warnings.length).toBe(0);
  });

  it('ErrorNode value → early return, no warning', () => {
    a.checkTypeHint('angka', { type: 'ErrorNode', loc: LOC });
    expect(a.warnings.length).toBe(0);
  });

  it('matching string hint → no warning', () => {
    a.checkTypeHint('teks', { type: 'Literal', value: 'hello', loc: LOC });
    expect(a.warnings.length).toBe(0);
  });
});

// ── 3. checkWriteToTurunan (E4004 / E4101) ──────────────────────────────────
describe('v3 analyzer — checkWriteToTurunan', () => {
  it('integration: writing to a `turunan` → E4004', () => {
    const res = analyze('data x = 1\nturunan y = x tambah 1\nBuat ruang:\n    simpan 5 ke y', {
      usageWarnings: 'off',
    });
    expect(hasCode(res.errors, 'E4004')).toBe(true);
  });

  it('no target → early return (direct-unit)', () => {
    const a = bareAnalyzer();
    a.checkWriteToTurunan({ loc: LOC });
    expect(a.errors.length).toBe(0);
  });

  it('turunan symbol via node.targetSymbol → E4004 (direct-unit)', () => {
    const a = bareAnalyzer();
    a.checkWriteToTurunan({
      target: 'd',
      targetSymbol: { kind: 'turunan', name: 'd' },
      loc: LOC,
    });
    expect(hasCode(a.errors, 'E4004')).toBe(true);
  });

  it('non-writable (isWritable:false) non-turunan → E4101 (direct-unit)', () => {
    const a = bareAnalyzer();
    a.checkWriteToTurunan({
      target: 'k',
      targetSymbol: { kind: 'tetap', name: 'k', isWritable: false },
      loc: LOC,
    });
    expect(hasCode(a.errors, 'E4101')).toBe(true);
  });

  it('target as Identifier object reads .name (direct-unit)', () => {
    const a = bareAnalyzer();
    a.checkWriteToTurunan({
      target: { type: 'Identifier', name: 'd' },
      targetSymbol: { kind: 'turunan', name: 'd' },
      loc: LOC,
    });
    expect(hasCode(a.errors, 'E4004')).toBe(true);
  });

  it('unresolvable target name → early return, no error (direct-unit)', () => {
    const a = bareAnalyzer();
    a.checkWriteToTurunan({ target: { type: 'Identifier' }, loc: LOC });
    expect(a.errors.length).toBe(0);
  });
});

// ── 4. checkSideEffectInTurunan (E4002) ─────────────────────────────────────
describe('v3 analyzer — checkSideEffectInTurunan', () => {
  it('emits E4002 only when context.inTurunanExpr is true (direct-unit)', () => {
    const a = bareAnalyzer();
    a.context.inTurunanExpr = true;
    a.checkSideEffectInTurunan({ loc: LOC });
    expect(hasCode(a.errors, 'E4002')).toBe(true);
  });

  it('stays silent when not inside a derived expression (direct-unit)', () => {
    const a = bareAnalyzer();
    a.context.inTurunanExpr = false;
    a.checkSideEffectInTurunan({ loc: LOC });
    expect(a.errors.length).toBe(0);
  });
});

// ── 5. lookupSymbol fallback path ───────────────────────────────────────────
describe('v3 analyzer — lookupSymbol', () => {
  it('returns null for an unknown name', () => {
    const a = bareAnalyzer();
    expect(a.lookupSymbol('namaYangTidakAda')).toBeNull();
  });

  it('falls back to linear scan when _symbolMap is absent (direct-unit)', () => {
    const a = bareAnalyzer();
    a._symbolMap = null; // force the fallback branch
    a._currentAst = { semantic: { symbols: [{ name: 'fallbackSym', kind: 'data' }] } };
    expect(a.lookupSymbol('fallbackSym')).toMatchObject({ name: 'fallbackSym' });
    expect(a.lookupSymbol('bukanIni')).toBeNull();
  });

  it('returns null when there is no semantic data at all (direct-unit)', () => {
    const a = bareAnalyzer();
    a._symbolMap = null;
    a._currentAst = {};
    expect(a.lookupSymbol('apa')).toBeNull();
  });
});

// ── 6. Component parameter validation (E4005 / E4006) ───────────────────────
describe('v3 analyzer — component param validation', () => {
  it('E4005: duplicate parameter names (direct-unit)', () => {
    const a = bareAnalyzer();
    const node = {
      type: 'KomponenDeclaration',
      name: 'Kartu',
      params: [
        { name: 'judul', loc: LOC },
        { name: 'judul', loc: LOC },
      ],
      body: [],
      loc: LOC,
    };
    a.visitKomponenDeclaration(node);
    expect(hasCode(a.errors, 'E4005')).toBe(true);
  });

  it('E4006: required param after a defaulted one (direct-unit)', () => {
    const a = bareAnalyzer();
    const node = {
      type: 'KomponenDeclaration',
      name: 'Kartu',
      params: [
        { name: 'a', defaultValue: { type: 'Literal', value: 1, loc: LOC }, loc: LOC },
        { name: 'b', loc: LOC },
      ],
      body: [],
      loc: LOC,
    };
    a.visitKomponenDeclaration(node);
    expect(hasCode(a.errors, 'E4006')).toBe(true);
  });

  it('valid param ordering produces no E4005/E4006 (direct-unit)', () => {
    const a = bareAnalyzer();
    const node = {
      type: 'KomponenDeclaration',
      name: 'Kartu',
      params: [
        { name: 'a', loc: LOC },
        { name: 'b', defaultValue: { type: 'Literal', value: 2, loc: LOC }, loc: LOC },
      ],
      body: [],
      loc: LOC,
    };
    a.visitKomponenDeclaration(node);
    expect(hasCode(a.errors, 'E4005')).toBe(false);
    expect(hasCode(a.errors, 'E4006')).toBe(false);
  });
});

// ── 7. analyze() contract ───────────────────────────────────────────────────
describe('v3 analyzer — analyze() contract', () => {
  it('returns { ast, errors, warnings }', () => {
    const res = analyze('data x = 1\nBuat ruang:\n    "{x}"', { usageWarnings: 'off' });
    expect(res).toHaveProperty('ast');
    expect(Array.isArray(res.errors)).toBe(true);
    expect(Array.isArray(res.warnings)).toBe(true);
  });

  it('tolerates an AST with no semantic metadata (defensive branch)', () => {
    const a = new Analyzer();
    const bare = { type: 'Program', body: [], loc: LOC };
    expect(() => a.analyze(bare, { usageWarnings: 'normal' })).not.toThrow();
  });
});
