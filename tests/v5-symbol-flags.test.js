/**
 * PromptJS — v5 SYMBOL-FLAGS suite (Cluster C: BooleanLiteral mutants).
 *
 * BooleanLiteral mutants flip a `true`/`false` literal in the source. They
 * SURVIVE whenever the resulting flag on a resolved symbol (isReactive,
 * isWritable, isComputed, isUndefined) or the `kind` of a synthetic
 * `node.resolved` (builtin/global/external) is never asserted. These flags ARE
 * the resolver's semantic contract — the compiler downstream branches on them
 * (reactive binding vs plain var, writable guard, computed memo) — so pinning
 * their exact values is a behavioral assertion, not implementation coupling.
 *
 * Target lines (reports/mutation/mutation.json, BooleanLiteral survivors):
 *   - L484/L490/L492/L494  isReactive / isWritable metadata per declaration kind
 *   - L523/L537/L543/L550  node.resolved.kind = builtin / global / external
 *   - L554                 node.isUndefined = true on an undeclared identifier
 *
 * All expected values were captured from REAL engine output before writing.
 * Source is NOT modified — tests only. CommonJS require = same instrumented
 * module record the engine loads.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');

function parse(src) {
  const { tokens } = Lexer.tokenize(src);
  return Parser.parse(tokens).ast;
}
function symbolsOf(src) {
  const r = new Resolver();
  const out = r.resolve(parse(src));
  return out.ast.semantic.symbols;
}
function byName(syms, name) {
  return syms.find((s) => s.name === name);
}

// Direct-unit helper (v4 pattern): a resolver with an initialized global scope.
function freshResolver() {
  const r = new Resolver();
  r.resolve(parse('Buat ruang:\n    "x"'));
  r.errors = [];
  r.warnings = [];
  return r;
}
const LOC = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };

// ── 1. Declaration-kind flag matrix (L484/L490/L492/L494) ───────────────────
describe('v5 symbol flags — isReactive / isWritable / isComputed per kind', () => {
  it('`data` is reactive AND writable', () => {
    const s = byName(symbolsOf('data a = 1\ntampilkan a'), 'a');
    expect(s.kind).toBe('data');
    expect(s.isReactive).toBe(true);
    expect(s.isWritable).toBe(true);
    expect(s.isComputed).toBe(false);
  });

  it('`tetap` (const) is neither reactive nor writable', () => {
    const s = byName(symbolsOf('tetap b = 1\ntampilkan b'), 'b');
    expect(s.kind).toBe('tetap');
    expect(s.isReactive).toBe(false);
    expect(s.isWritable).toBe(false);
  });

  it('`ubah` is writable but NOT reactive', () => {
    const s = byName(symbolsOf('ubah c = 1\ntampilkan c'), 'c');
    expect(s.kind).toBe('ubah');
    expect(s.isReactive).toBe(false);
    expect(s.isWritable).toBe(true);
  });

  it('`turunan` (computed) is reactive, read-only, and computed', () => {
    const s = byName(symbolsOf('data a = 1\nturunan d = a + 1\ntampilkan d'), 'd');
    expect(s.kind).toBe('turunan');
    expect(s.isReactive).toBe(true);
    expect(s.isWritable).toBe(false);
    expect(s.isComputed).toBe(true);
  });

  it('`fungsi` is a function symbol, not writable/reactive', () => {
    const s = byName(
      symbolsOf('fungsi f():\n    tampilkan "x"\nsetelah f:\n    tampilkan "y"'),
      'f'
    );
    expect(s.kind).toBe('fungsi');
    expect(s.isFunction).toBe(true);
    expect(s.isWritable).toBe(false);
    expect(s.isReactive).toBe(false);
  });

  it('`komponen` is a component symbol, not writable/reactive', () => {
    const s = byName(symbolsOf('komponen Kartu():\n    tampilkan "x"\ngunakan Kartu'), 'Kartu');
    expect(s.kind).toBe('komponen');
    expect(s.isComponent).toBe(true);
    expect(s.isWritable).toBe(false);
    expect(s.isReactive).toBe(false);
  });
});

// ── 2. node.resolved.kind for builtin / global / external (L523/L537/L543/L550)
describe('v5 symbol flags — synthetic node.resolved.kind + isReactive/isWritable', () => {
  it('a JS global identifier resolves to kind "global", not reactive/writable (L537/L543)', () => {
    const r = freshResolver();
    // `Math` is in JS_GLOBALS → visitIdentifier sets a synthetic resolved object.
    const node = { type: 'Identifier', name: 'Math', loc: LOC };
    r.visitIdentifier(node);
    expect(node.resolved).toBeDefined();
    expect(node.resolved.kind).toBe('global');
    expect(node.resolved.isReactive).toBe(false);
    expect(node.resolved.isWritable).toBe(false);
    // a recognized global is NOT an undeclared-identifier error
    expect(r.errors.length).toBe(0);
  });

  it('a builtin-callee identifier resolves to kind "builtin" (L523)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'panjang', isBuiltinCallee: true, loc: LOC };
    r.visitIdentifier(node);
    expect(node.resolved).toBeDefined();
    expect(node.resolved.kind).toBe('builtin');
    expect(node.resolved.isReactive).toBe(false);
    expect(node.resolved.isWritable).toBe(false);
  });

  it('an $external-marked identifier resolves to kind "external" (L550)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'apiKey', _isExternal: true, loc: LOC };
    r.visitIdentifier(node);
    expect(node.resolved).toBeDefined();
    expect(node.resolved.kind).toBe('external');
    expect(node.resolved.isReactive).toBe(false);
    expect(node.resolved.isWritable).toBe(false);
    expect(r.errors.length).toBe(0);
  });
});

// ── 3. isUndefined flag on an undeclared identifier (L554) ───────────────────
describe('v5 symbol flags — isUndefined on undeclared identifier', () => {
  it('an undeclared identifier sets node.isUndefined = true AND emits E3001 (L554)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'tidakDideklarasi', loc: LOC };
    r.visitIdentifier(node);
    expect(node.isUndefined).toBe(true);
    expect(r.errors.some((e) => e.code === 'E3001')).toBe(true);
  });

  it('a declared identifier is NOT flagged undefined (false branch of L554)', () => {
    const r = freshResolver();
    r.visitDataDeclaration({
      type: 'DataDeclaration',
      name: 'ada',
      init: { type: 'Literal', value: 0, kind: 'number' },
      loc: LOC,
    });
    const node = { type: 'Identifier', name: 'ada', loc: LOC };
    r.visitIdentifier(node);
    expect(node.isUndefined).toBeUndefined();
    expect(node.resolved).toBeDefined();
    expect(node.resolved.name).toBe('ada');
  });
});
