/**
 * PromptJS — v3 RESOLVER branch-coverage suite.
 *
 * Goal: close untested *branches* in `src/resolver/promptjs-resolver.js`
 * (baseline 58.92% branch). The resolver is a visitor invoked via
 * `resolver.resolve(ast)`; most untested branches are error/edge paths
 * (E3001/E3002/E3003/E3005, shadowing W3002, write-tracking on `tetap`,
 * builtin/JS-global suppression, external refs, alias properties).
 *
 * Strategy:
 *  - Integration-first: drive the *real* lexer → parser to get authentic
 *    ASTs, then call `resolve()` directly and assert on returned
 *    errors/warnings. Survives refactors because it pins the diagnostic
 *    contract, not internal structure.
 *  - Direct-unit where a branch is unreachable from surface syntax (e.g.
 *    `node.target` as an Identifier object vs a string): hand-build the
 *    minimal AST node and call the visitor method directly.
 *
 * All assertions were validated against real engine behavior before being
 * committed (no assume-then-assert).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Use CommonJS `require` (the SAME module record the engine loads via
// `require('../resolver/promptjs-resolver')`) so V8 coverage attributes our
// direct calls to the same instrumented module instance as the integration
// tests — otherwise a parallel ESM import creates a second perspective that
// V8's merge under-counts.
const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');

// ── Helpers ────────────────────────────────────────────────────────────────
function parse(src) {
  const { tokens } = Lexer.tokenize(src);
  const { ast } = Parser.parse(tokens);
  return ast;
}
function resolve(src) {
  const ast = parse(src);
  const r = new Resolver();
  return r.resolve(ast);
}
const hasCode = (list, code) => list.some((e) => e.code === code);

// A fresh resolver with an initialized global scope so we can call visitor
// methods directly with hand-built nodes (mirrors what resolve() sets up).
function freshResolver() {
  const r = new Resolver();
  // resolve() of an empty program initializes scopes/counters cleanly.
  r.resolve(parse('Buat ruang:\n    "x"'));
  // reset diagnostics so direct-unit assertions start clean
  r.errors = [];
  r.warnings = [];
  return r;
}

const LOC = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };

// ── 1. Identifier resolution branches ───────────────────────────────────────
describe('v3 resolver — Identifier branches', () => {
  it('E3001: undeclared identifier emits an error', () => {
    const { errors } = resolve('Buat ruang:\n    teks tidakAda');
    expect(hasCode(errors, 'E3001')).toBe(true);
  });

  it('declared identifier resolves WITHOUT E3001 (read via interpolation)', () => {
    // `"{nama}"` is the real read form; `teks nama` would parse `teks` as an
    // undeclared identifier (verified against the engine).
    const { errors } = resolve('data nama = "Beb"\nBuat ruang:\n    "{nama}"');
    expect(hasCode(errors, 'E3001')).toBe(false);
  });

  it('JS global (e.g. console) does NOT raise E3001', () => {
    const { errors } = resolve('Buat tombol:\n    on_klik = console.log("hi")');
    expect(hasCode(errors, 'E3001')).toBe(false);
  });

  it('builtin function name as callee does NOT raise E3001', () => {
    // `panjang(...)` is a builtin; its identifier callee must be suppressed.
    const { errors } = resolve(
      'data arr = [1, 2, 3]\nturunan n = panjang(arr)\nBuat ruang:\n    "x"'
    );
    expect(hasCode(errors, 'E3001')).toBe(false);
  });

  it('$external reference is treated as external, not undeclared (direct-unit)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'apiData', _isExternal: true, loc: LOC };
    r.visitIdentifier(node);
    expect(r.errors.length).toBe(0);
    expect(node.resolved).toMatchObject({ kind: 'external', name: 'apiData' });
  });

  it('isCalleeJS identifier is skipped entirely (direct-unit)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'someJsFn', isCalleeJS: true, loc: LOC };
    r.visitIdentifier(node);
    expect(r.errors.length).toBe(0);
    expect(node.resolved).toBeUndefined();
  });

  it('isBuiltinCallee identifier resolves to a builtin kind (direct-unit)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'panjang', isBuiltinCallee: true, loc: LOC };
    r.visitIdentifier(node);
    expect(node.resolved).toMatchObject({ kind: 'builtin', name: 'panjang' });
  });

  it('builtin name (no callee flag) still suppresses E3001 (direct-unit)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'panjang', loc: LOC };
    r.visitIdentifier(node);
    expect(r.errors.length).toBe(0);
    expect(node.resolved).toMatchObject({ kind: 'builtin' });
  });
});

// ── 2. Symbol declaration: duplicate & shadowing ────────────────────────────
describe('v3 resolver — declaration branches', () => {
  it('E3002: duplicate declaration in same scope', () => {
    const { errors } = resolve('tetap a = 1\ntetap a = 2\nBuat ruang:\n    "x"');
    expect(hasCode(errors, 'E3002')).toBe(true);
  });

  it('W3002: shadowing an outer-scope variable from inside a component', () => {
    const src = 'tetap a = 1\nKomponen Kartu():\n    tetap a = 2\n    Buat ruang:\n        teks a';
    const { warnings } = resolve(src);
    expect(hasCode(warnings, 'W3002')).toBe(true);
  });

  it('addSymbol returns null on duplicate (no symbol bound) — direct-unit', () => {
    const r = freshResolver();
    const node1 = { type: 'DataDeclaration', name: 'x', loc: LOC };
    const node2 = { type: 'DataDeclaration', name: 'x', loc: LOC };
    const s1 = r.addSymbol('x', 'data', node1);
    const s2 = r.addSymbol('x', 'data', node2);
    expect(s1).toBeTruthy();
    expect(s2).toBeNull();
    expect(hasCode(r.errors, 'E3002')).toBe(true);
  });
});

// ── 3. Write-tracking + E3003 (const protection) ────────────────────────────
describe('v3 resolver — write tracking & E3003', () => {
  it('E3003: writing to a `tetap` (const) via simpan', () => {
    const { errors } = resolve('tetap a = 1\nBuat ruang:\n    simpan 5 ke a');
    expect(hasCode(errors, 'E3003')).toBe(true);
  });

  it('writing to an `ubah` (mutable) variable does NOT raise E3003', () => {
    const { errors } = resolve('ubah a = 1\nBuat ruang:\n    simpan 5 ke a');
    expect(hasCode(errors, 'E3003')).toBe(false);
  });

  it('_trackWrite with empty target name is a no-op (direct-unit)', () => {
    const r = freshResolver();
    expect(() => r._trackWrite('', { loc: LOC })).not.toThrow();
    expect(r.errors.length).toBe(0);
  });

  it('_trackWrite to unknown symbol does not throw and emits nothing (direct-unit)', () => {
    const r = freshResolver();
    r._trackWrite('neverDeclared', { loc: LOC });
    expect(r.errors.length).toBe(0);
  });

  it('visitSimpanStatement handles target as Identifier OBJECT (direct-unit)', () => {
    // Surface syntax yields a string target; the object-target branch is only
    // reachable by direct construction.
    const r = freshResolver();
    r.addSymbol(
      'a',
      'tetap',
      { type: 'TetapDeclaration', name: 'a', loc: LOC },
      { isWritable: false }
    );
    const node = {
      type: 'SimpanStatement',
      target: { type: 'Identifier', name: 'a', loc: LOC },
      value: { type: 'Literal', value: 5, loc: LOC },
      loc: LOC,
    };
    r.visitSimpanStatement(node);
    expect(hasCode(r.errors, 'E3003')).toBe(true);
  });

  it('visitTambahkanStatement tracks write on a const target → E3003 (direct-unit)', () => {
    const r = freshResolver();
    r.addSymbol(
      'arr',
      'tetap',
      { type: 'TetapDeclaration', name: 'arr', loc: LOC },
      { isWritable: false }
    );
    const node = {
      type: 'TambahkanStatement',
      target: 'arr',
      value: { type: 'Literal', value: 1, loc: LOC },
      loc: LOC,
    };
    r.visitTambahkanStatement(node);
    expect(hasCode(r.errors, 'E3003')).toBe(true);
  });
});

// ── 4. PerbaruiStatement property validation (E4008 path) ────────────────────
describe('v3 resolver — Perbarui property validation', () => {
  it('invalid perbarui property yields a diagnostic (direct-unit)', () => {
    const r = freshResolver();
    const node = {
      type: 'PerbaruiStatement',
      property: 'propertiTidakValid',
      target: { type: 'Identifier', name: 'el', loc: LOC, _isExternal: true },
      value: { type: 'Literal', value: 'x', loc: LOC },
      loc: LOC,
    };
    r.visitPerbaruiStatement(node);
    expect(hasCode(r.warnings, 'E4008')).toBe(true);
  });

  it('valid perbarui property (teks) does NOT warn (direct-unit)', () => {
    const r = freshResolver();
    const node = {
      type: 'PerbaruiStatement',
      property: 'teks',
      target: { type: 'Identifier', name: 'el', loc: LOC, _isExternal: true },
      value: { type: 'Literal', value: 'x', loc: LOC },
      loc: LOC,
    };
    r.visitPerbaruiStatement(node);
    expect(hasCode(r.warnings, 'E4008')).toBe(false);
  });
});

// ── 5. markAsJSExternal recursion ───────────────────────────────────────────
describe('v3 resolver — markAsJSExternal', () => {
  it('marks a plain Identifier as callee JS (direct-unit)', () => {
    const r = freshResolver();
    const node = { type: 'Identifier', name: 'fn', loc: LOC };
    r.markAsJSExternal(node);
    expect(node.isCalleeJS).toBe(true);
  });

  it('recurses through a MemberExpression to mark its root object (direct-unit)', () => {
    const r = freshResolver();
    const root = { type: 'Identifier', name: 'lib', loc: LOC };
    const member = {
      type: 'MemberExpression',
      object: root,
      property: { type: 'Identifier', name: 'method', loc: LOC },
      loc: LOC,
    };
    r.markAsJSExternal(member);
    expect(root.isCalleeJS).toBe(true);
  });
});

// ── 6. resolve() returns the documented result shape ────────────────────────
describe('v3 resolver — resolve() contract', () => {
  it('returns { ast, errors, warnings } and attaches ast.semantic', () => {
    const ast = parse('data x = 1\nBuat ruang:\n    teks x');
    const r = new Resolver();
    const res = r.resolve(ast);
    expect(res).toHaveProperty('ast');
    expect(Array.isArray(res.errors)).toBe(true);
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.ast.semantic).toBeTruthy();
    expect(Array.isArray(res.ast.semantic.symbols)).toBe(true);
  });

  it('re-running resolve() resets diagnostics (no cross-run accumulation)', () => {
    const r = new Resolver();
    r.resolve(parse('Buat ruang:\n    teks tidakAda1'));
    const second = r.resolve(parse('Buat ruang:\n    "ok"'));
    // second program is clean → no leftover E3001 from the first run
    expect(hasCode(second.errors, 'E3001')).toBe(false);
  });
});
