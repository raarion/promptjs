/**
 * PromptJS — v5 BOUNDARY suite (Cluster D: ConditionalExpression / Logical /
 * Equality survivors on high-density lines).
 *
 * After Clusters A–C the score reached 58.71%. The remaining survivors are
 * dominated by ConditionalExpression mutants clustered on a handful of
 * high-traffic lines that prior suites executed but never asserted the OUTCOME
 * of either branch. This suite pins the observable result of both branches on
 * the densest "double-win" lines (a single test kills Conditional + Logical +
 * Equality + the residual String/Boolean mutants sharing that line):
 *
 *   Analyzer:
 *     L175  checkTypeHint BinaryExpression: arithmetic operators infer "angka",
 *           comparison/logic operators infer "benar-salah" (drives W4001 both ways)
 *     L385/L396  emitUsageWarnings: W4103 (reactive data write-only) vs
 *                W4102 (non-reactive write-only) vs W4101 (never used)
 *   Resolver:
 *     L580–600  visitMemberExpression property/method alias translation
 *               (.panjang→length, .sisip→push mutating)
 *     L630–656  visitCallExpression builtin detection (panjang())
 *     L1195     ketika/event-name validation → E4009 for an unknown event
 *
 * All expected values captured from REAL engine output before writing.
 * Source is NOT modified — tests only.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');
const Analyzer = require('../src/analyzer/promptjs-analyzer');

function parse(src) {
  const { tokens } = Lexer.tokenize(src);
  return Parser.parse(tokens).ast;
}
function resolve(src) {
  const r = new Resolver();
  const out = r.resolve(parse(src));
  return { ast: out.ast, errors: out.errors, warnings: r.warnings };
}
function analyze(src, opts) {
  const r = new Resolver();
  const rr = r.resolve(parse(src));
  const a = new Analyzer();
  const out = a.analyze(rr.ast, opts || { usageWarnings: 'normal' });
  return { errors: out.errors, warnings: out.warnings };
}
const has = (list, code) => list.some((e) => e.code === code);
const find = (list, code) => list.find((e) => e.code === code);
function findNode(root, pred) {
  let f = null;
  const seen = new WeakSet();
  (function walk(n) {
    if (!n || f || typeof n !== 'object' || seen.has(n)) return;
    seen.add(n);
    if (pred(n)) {
      f = n;
      return;
    }
    for (const k in n) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  })(root);
  return f;
}

// ── 1. checkTypeHint BinaryExpression branches (analyzer L173-180, ×18) ─────
describe('v5 boundary — type-hint inference over BinaryExpression operands', () => {
  it('arithmetic operand (a + 1) infers "angka" → mismatched `teks` hint warns W4001', () => {
    const { warnings } = analyze('data a = 1\ndata x: teks = a + 1\ntampilkan x\ntampilkan a');
    const w = find(warnings, 'W4001');
    expect(w).toBeDefined();
    expect(w.message).toBe('Type hint "teks" tidak cocok dengan nilai awal bertipe "angka".');
  });

  it('each arithmetic operator (− * / %) is treated as "angka"', () => {
    for (const op of ['-', '*', '/', '%']) {
      const { warnings } = analyze(
        `data a = 2\ndata x: teks = a ${op} 1\ntampilkan x\ntampilkan a`
      );
      expect(has(warnings, 'W4001'), `op ${op} should infer angka`).toBe(true);
    }
  });

  it('comparison operand (a < 1) infers "benar-salah" → mismatched `teks` hint warns', () => {
    const { warnings } = analyze('data a = 1\ndata x: teks = a < 1\ntampilkan x\ntampilkan a');
    const w = find(warnings, 'W4001');
    expect(w).toBeDefined();
    expect(w.message).toBe('Type hint "teks" tidak cocok dengan nilai awal bertipe "benar-salah".');
  });

  it('a CORRECT arithmetic hint (angka = a + 1) produces NO W4001 (false branch)', () => {
    const { warnings } = analyze('data a = 1\ndata x: angka = a + 1\ntampilkan x\ntampilkan a');
    expect(has(warnings, 'W4001')).toBe(false);
  });
});

// ── 2. Usage-warning classification (analyzer L385/L396 etc.) ───────────────
describe('v5 boundary — usage-warning classification W4101/W4102/W4103', () => {
  it('reactive `data` written but never read → W4103 (not W4102)', () => {
    const { warnings } = analyze('data s = 0\nsimpan 5 ke s');
    expect(has(warnings, 'W4103')).toBe(true);
    expect(has(warnings, 'W4102')).toBe(false);
  });

  it('non-reactive `ubah` written but never read → W4102 (not W4103)', () => {
    const { warnings } = analyze('ubah u = 0\nsimpan 5 ke u');
    expect(has(warnings, 'W4102')).toBe(true);
    expect(has(warnings, 'W4103')).toBe(false);
  });

  it('symbol neither read nor written → W4101 (and neither W4102/W4103)', () => {
    const { warnings } = analyze('data belumDipakai = 1\ntampilkan "x"');
    expect(has(warnings, 'W4101')).toBe(true);
    expect(has(warnings, 'W4102')).toBe(false);
    expect(has(warnings, 'W4103')).toBe(false);
  });

  it('usageWarnings: "off" suppresses all usage warnings (guard branch)', () => {
    const { warnings } = analyze('data belumDipakai = 1\ntampilkan "x"', { usageWarnings: 'off' });
    expect(has(warnings, 'W4101')).toBe(false);
  });
});

// ── 2b. Parameter symbol flags (resolver L1086 fungsi vs L1108 komponen) ────
describe('v5 boundary — function vs component parameter reactivity', () => {
  it('a `fungsi` parameter is writable but NOT reactive (L1086 isReactive:false)', () => {
    const { ast } = resolve('fungsi f(x):\n    tampilkan x\nsetelah f:\n    tampilkan "y"');
    const p = ast.semantic.symbols.find((s) => s.name === 'x' && s.kind === 'parameter');
    expect(p).toBeDefined();
    expect(p.isParameter).toBe(true);
    expect(p.isReactive).toBe(false);
    expect(p.isWritable).toBe(true);
  });

  it('a `komponen` parameter IS reactive and writable (L1108 isReactive:true)', () => {
    const { ast } = resolve('komponen K(judul):\n    tampilkan judul\ngunakan K');
    const p = ast.semantic.symbols.find((s) => s.name === 'judul' && s.kind === 'parameter');
    expect(p).toBeDefined();
    expect(p.isParameter).toBe(true);
    expect(p.isReactive).toBe(true);
    expect(p.isWritable).toBe(true);
  });
});

// ── 2c. W4003 tetap-without-init (resolver L1296-1305) ──────────────────────
describe('v5 boundary — `tetap` without initial value', () => {
  it('a `tetap` with no init warns W4003 with exact message + suggestion', () => {
    const { warnings } = resolve('tetap K');
    const w = find(warnings, 'W4003');
    expect(w).toBeDefined();
    expect(w.message).toBe('Deklarasi "tetap" untuk "K" tanpa nilai awal.');
    expect(w.suggestion).toBe('Berikan nilai awal untuk konstanta.');
  });

  it('a `tetap` WITH an init does NOT warn W4003 (false branch)', () => {
    const { warnings } = resolve('tetap K = 42\ntampilkan K');
    expect(has(warnings, 'W4003')).toBe(false);
  });
});

// ── 3. MemberExpression alias translation (resolver L580-600) ───────────────
describe('v5 boundary — property/method alias translation', () => {
  it('property alias `.panjang` is rewritten to `.length` and flagged translated', () => {
    const { ast } = resolve('data arr = [1, 2]\ndata n = arr.panjang\ntampilkan n');
    const me = findNode(ast, (n) => n.type === 'MemberExpression');
    expect(me).toBeDefined();
    expect(me.property.name).toBe('length');
    expect(me.property.originalName).toBe('panjang');
    expect(me.isTranslatedAlias).toBe(true);
  });

  it('method alias `.sisip` is rewritten to `.push`, flagged translated + mutating', () => {
    const { ast } = resolve('data arr = [1]\narr.sisip(2)');
    const me = findNode(ast, (n) => n.type === 'MemberExpression');
    expect(me).toBeDefined();
    expect(me.property.name).toBe('push');
    expect(me.property.originalName).toBe('sisip');
    expect(me.isTranslatedMethodAlias).toBe(true);
    expect(me.isMutatingMethod).toBe(true);
  });
});

// ── 4. CallExpression builtin detection (resolver L630-656) ─────────────────
describe('v5 boundary — builtin call detection', () => {
  it('`panjang(arr)` is detected as a builtin call with builtinInfo attached', () => {
    const { ast } = resolve('data arr = [1, 2]\ndata n = panjang(arr)\ntampilkan n');
    const ce = findNode(ast, (n) => n.type === 'CallExpression');
    expect(ce).toBeDefined();
    expect(ce.isBuiltin).toBe(true);
    expect(ce.builtinInfo).toBeDefined();
  });
});

// ── 5. Event-name validation (resolver L1195) ───────────────────────────────
describe('v5 boundary — ketika/event-name validation', () => {
  it('an unknown event name warns E4009 with exact message + suggestion', () => {
    const { warnings } = resolve(
      'buat tombol#b:\n    "x"\nketika tombolNgawur di b:\n    tampilkan "y"'
    );
    const w = find(warnings, 'E4009');
    expect(w).toBeDefined();
    expect(w.message).toBe('Event name "tombolNgawur" mungkin tidak dikenali.');
    expect(w.suggestion).toBe('Gunakan nama event yang valid: diklik, diketik, ditekan, dll.');
  });

  it('a valid event name does NOT warn E4009 (false branch of the guard)', () => {
    const { warnings } = resolve('buat tombol#b:\n    "x"\nketika diklik di b:\n    tampilkan "y"');
    expect(has(warnings, 'E4009')).toBe(false);
  });
});
