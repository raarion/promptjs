/**
 * PromptJS — v4 RESOLVER branch-coverage suite (continuation of v3).
 *
 * Goal: close the *remaining* untested branches in
 * `src/resolver/promptjs-resolver.js` after v3 (scoped branch ≈ 64.7%).
 * v3 covered Identifier resolution, scoping, and the diagnostic contract;
 * v4 targets the write-tracking + DOM-action visitors that v3 left cold:
 *
 *   - _trackWrite: symbol-not-found early return, E3003 on `tetap` writes,
 *     and the string-target vs Identifier-target dispatch in
 *     Simpan/Tambahkan/Kurangi/Sisipkan statements.
 *   - visitPerbaruiStatement: string target vs node target, E4008 on an
 *     unsupported `property`, valid-property suppression.
 *   - visitGunakanStatement: E3004 (undeclared component), E4010 (using a
 *     non-component symbol), the happy path, and props traversal.
 *   - visitHapusDariStatement: reactive vs non-reactive fromArray, E3001
 *     when fromArray is an undeclared Identifier.
 *   - visitSaatStatement: string / Identifier / MemberExpression target
 *     forms, E3001 (undeclared) and W3003 (non-reactive watcher target).
 *
 * Strategy mirrors v3:
 *   - Direct-unit (hand-built AST + a resolver with an initialized global
 *     scope) for branches gated behind surface-syntax errors (e.g. a DOM
 *     target referenced by bare id raises E3001 before the branch we want).
 *   - Integration (real lexer → parser → resolve) where the construct
 *     compiles cleanly, so we pin the diagnostic contract.
 *
 * Every assertion below was validated against real engine behavior before
 * being committed (no assume-then-assert). Uses CommonJS `require` for the
 * SAME instrumented module record the engine loads.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');

// ── Helpers ───────────────────────────────────────────────────────────
function parse(src) {
  const { tokens } = Lexer.tokenize(src);
  const { ast } = Parser.parse(tokens);
  return ast;
}
const hasCode = (list, code) => list.some((e) => e.code === code);

// A resolver with an initialized global scope so we can call visitor methods
// directly with hand-built nodes (mirrors what resolve() sets up). We then
// seed symbols via the real declaration visitors so lookups behave exactly
// like production.
function freshResolver() {
  const r = new Resolver();
  r.resolve(parse('Buat ruang:\n    "x"'));
  r.errors = [];
  r.warnings = [];
  return r;
}

const LOC = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
const id = (name) => ({ type: 'Identifier', name, loc: LOC });

// Seed a symbol into the resolver's current (global) scope using the real
// declaration visitors, so isWritable/isReactive/kind are set authentically.
function declareData(r, name) {
  r.visitDataDeclaration({
    type: 'DataDeclaration',
    name,
    init: { type: 'NumberLiteral', value: 0 },
    loc: LOC,
  });
}
function declareTetap(r, name) {
  r.visitTetapDeclaration({
    type: 'TetapDeclaration',
    name,
    init: { type: 'NumberLiteral', value: 0 },
    loc: LOC,
  });
}

// ── 1. _trackWrite via Simpan/Tambahkan/Kurangi/Sisipkan ───────────────
describe('v4 resolver — write-tracking branches', () => {
  it('_trackWrite no-ops when targetName is empty (string-target guard)', () => {
    const r = freshResolver();
    // target is an empty string → `if (!targetName) return;`
    r.visitSimpanStatement({
      type: 'SimpanStatement',
      target: '',
      value: { type: 'NumberLiteral', value: 1 },
      loc: LOC,
    });
    expect(r.errors.length).toBe(0);
  });

  it('_trackWrite no-ops when symbol is not found in scope', () => {
    const r = freshResolver();
    // unknown name → lookup() returns null → neither writeCount nor E3003
    const node = {
      type: 'SimpanStatement',
      target: 'tidakAda',
      value: { type: 'NumberLiteral', value: 1 },
      loc: LOC,
    };
    r.visitSimpanStatement(node);
    expect(r.errors.length).toBe(0);
    expect(node.targetSymbol).toBeUndefined();
  });

  it('Simpan to a writable `data` symbol increments writeCount, no error', () => {
    const r = freshResolver();
    declareData(r, 'skor');
    const node = {
      type: 'SimpanStatement',
      target: 'skor',
      value: { type: 'NumberLiteral', value: 1 },
      loc: LOC,
    };
    r.visitSimpanStatement(node);
    expect(hasCode(r.errors, 'E3003')).toBe(false);
    expect(node.targetSymbol).toBeDefined();
    expect(node.targetSymbol.writeCount).toBeGreaterThan(0);
  });

  it('Simpan to a `tetap` (const) symbol emits E3003', () => {
    const r = freshResolver();
    declareTetap(r, 'PI');
    const node = {
      type: 'SimpanStatement',
      target: 'PI',
      value: { type: 'NumberLiteral', value: 3 },
      loc: LOC,
    };
    r.visitSimpanStatement(node);
    expect(hasCode(r.errors, 'E3003')).toBe(true);
  });

  it('Simpan with Identifier-node target (not string) dispatches via node.target.name', () => {
    const r = freshResolver();
    declareData(r, 'nilai');
    const node = {
      type: 'SimpanStatement',
      target: id('nilai'),
      value: { type: 'NumberLiteral', value: 1 },
      loc: LOC,
    };
    r.visitSimpanStatement(node);
    expect(node.targetSymbol).toBeDefined();
  });

  it('Tambahkan / Kurangi / Sisipkan all track writes to a const → E3003', () => {
    for (const t of ['TambahkanStatement', 'KurangiStatement', 'SisipkanStatement']) {
      const r = freshResolver();
      declareTetap(r, 'K');
      const visit = {
        TambahkanStatement: 'visitTambahkanStatement',
        KurangiStatement: 'visitKurangiStatement',
        SisipkanStatement: 'visitSisipkanStatement',
      }[t];
      r[visit]({ type: t, target: 'K', value: { type: 'NumberLiteral', value: 1 }, loc: LOC });
      expect(hasCode(r.errors, 'E3003')).toBe(true);
    }
  });
});

// ── 2. visitPerbaruiStatement ──────────────────────────────────────────
describe('v4 resolver — visitPerbaruiStatement branches', () => {
  it('string target is tracked as a write (const → E3003)', () => {
    const r = freshResolver();
    declareTetap(r, 'judul');
    r.visitPerbaruiStatement({
      type: 'PerbaruiStatement',
      target: 'judul',
      property: 'teks',
      value: { type: 'StringLiteral', value: 'hi' },
      loc: LOC,
    });
    expect(hasCode(r.errors, 'E3003')).toBe(true);
  });

  it('Identifier-node target is tracked as a write', () => {
    const r = freshResolver();
    declareData(r, 'box');
    const node = {
      type: 'PerbaruiStatement',
      target: id('box'),
      property: 'teks',
      value: { type: 'StringLiteral', value: 'hi' },
      loc: LOC,
    };
    r.visitPerbaruiStatement(node);
    expect(node.targetSymbol).toBeDefined();
  });

  it('unsupported `property` emits E4008 warning', () => {
    const r = freshResolver();
    r.visitPerbaruiStatement({
      type: 'PerbaruiStatement',
      target: id('box'),
      property: 'tidakAdaProperti',
      value: { type: 'StringLiteral', value: 'x' },
      loc: LOC,
    });
    expect(hasCode(r.warnings, 'E4008')).toBe(true);
  });

  it('supported `property` (teks) does NOT emit E4008', () => {
    const r = freshResolver();
    r.visitPerbaruiStatement({
      type: 'PerbaruiStatement',
      target: id('box'),
      property: 'teks',
      value: { type: 'StringLiteral', value: 'x' },
      loc: LOC,
    });
    expect(hasCode(r.warnings, 'E4008')).toBe(false);
  });
});

// ── 3. visitGunakanStatement ───────────────────────────────────────────
describe('v4 resolver — visitGunakanStatement branches', () => {
  it('E3004 when the component name is undeclared', () => {
    const r = freshResolver();
    r.visitGunakanStatement({
      type: 'GunakanStatement',
      componentName: 'Kartu',
      props: [],
      loc: LOC,
    });
    expect(hasCode(r.errors, 'E3004')).toBe(true);
  });

  it('E4010 when the referenced symbol is not a component', () => {
    const r = freshResolver();
    declareData(r, 'bukanKomponen');
    r.visitGunakanStatement({
      type: 'GunakanStatement',
      componentName: 'bukanKomponen',
      props: [],
      loc: LOC,
    });
    expect(hasCode(r.errors, 'E4010')).toBe(true);
  });

  it('props values are traversed (undeclared prop value → E3001)', () => {
    const r = freshResolver();
    // declare the component so we pass the component check and reach props
    r.addSymbol('Kartu', 'komponen', { loc: LOC }, {});
    r.errors = [];
    r.visitGunakanStatement({
      type: 'GunakanStatement',
      componentName: 'Kartu',
      props: [{ name: 'judul', value: id('tidakAda') }],
      loc: LOC,
    });
    expect(hasCode(r.errors, 'E3001')).toBe(true);
  });
});

// ── 4. visitHapusDariStatement ─────────────────────────────────────────
describe('v4 resolver — visitHapusDariStatement branches', () => {
  it('reactive fromArray (data) sets fromArrayReactive = true', () => {
    const r = freshResolver();
    declareData(r, 'daftar');
    const node = {
      type: 'HapusDariStatement',
      item: { type: 'NumberLiteral', value: 1 },
      fromArray: id('daftar'),
      loc: LOC,
    };
    r.visitHapusDariStatement(node);
    expect(node.fromArrayReactive).toBe(true);
    expect(node.fromArraySymbol).toBeDefined();
  });

  it('undeclared fromArray Identifier emits E3001', () => {
    const r = freshResolver();
    const node = {
      type: 'HapusDariStatement',
      item: { type: 'NumberLiteral', value: 1 },
      fromArray: id('hantu'),
      loc: LOC,
    };
    r.visitHapusDariStatement(node);
    expect(hasCode(r.errors, 'E3001')).toBe(true);
  });

  it('non-reactive fromArray (ubah) sets fromArrayReactive = false', () => {
    const r = freshResolver();
    r.visitUbahDeclaration({
      type: 'UbahDeclaration',
      name: 'tmp',
      init: { type: 'ArrayLiteral', elements: [] },
      loc: LOC,
    });
    const node = {
      type: 'HapusDariStatement',
      item: { type: 'NumberLiteral', value: 1 },
      fromArray: id('tmp'),
      loc: LOC,
    };
    r.visitHapusDariStatement(node);
    expect(node.fromArrayReactive).toBe(false);
  });
});

// ── 5. visitSaatStatement ──────────────────────────────────────────────
describe('v4 resolver — visitSaatStatement target forms', () => {
  it('string target that is undeclared emits E3001', () => {
    const r = freshResolver();
    r.visitSaatStatement({ type: 'SaatStatement', target: 'tidakAda', body: null, loc: LOC });
    expect(hasCode(r.errors, 'E3001')).toBe(true);
  });

  it('Identifier-node target that is reactive (data) emits NO warning/error', () => {
    const r = freshResolver();
    declareData(r, 'jam');
    r.errors = [];
    r.warnings = [];
    r.visitSaatStatement({ type: 'SaatStatement', target: id('jam'), body: null, loc: LOC });
    expect(hasCode(r.errors, 'E3001')).toBe(false);
    expect(hasCode(r.warnings, 'W3003')).toBe(false);
  });

  it('non-reactive target (ubah) emits W3003', () => {
    const r = freshResolver();
    r.visitUbahDeclaration({
      type: 'UbahDeclaration',
      name: 'biasa',
      init: { type: 'NumberLiteral', value: 0 },
      loc: LOC,
    });
    r.errors = [];
    r.warnings = [];
    r.visitSaatStatement({ type: 'SaatStatement', target: id('biasa'), body: null, loc: LOC });
    expect(hasCode(r.warnings, 'W3003')).toBe(true);
  });

  it('MemberExpression target resolves to its root object name', () => {
    const r = freshResolver();
    declareData(r, 'objek');
    r.errors = [];
    r.warnings = [];
    const member = {
      type: 'MemberExpression',
      object: id('objek'),
      property: id('berubah'),
      loc: LOC,
    };
    r.visitSaatStatement({ type: 'SaatStatement', target: member, body: null, loc: LOC });
    // root 'objek' is reactive data → no E3001, no W3003
    expect(hasCode(r.errors, 'E3001')).toBe(false);
    expect(hasCode(r.warnings, 'W3003')).toBe(false);
  });

  it('non-string/non-node target falls back to String(target) and looks up', () => {
    const r = freshResolver();
    // numeric target → String(123) = "123" → undeclared → E3001
    r.visitSaatStatement({ type: 'SaatStatement', target: 123, body: null, loc: LOC });
    expect(hasCode(r.errors, 'E3001')).toBe(true);
  });
});
