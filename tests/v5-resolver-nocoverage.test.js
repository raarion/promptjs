/**
 * PromptJS — v5 RESOLVER no-coverage suite (Cluster A).
 *
 * Goal: execute the resolver visitor paths that the prior Stryker subset left
 * entirely UNCOVERED (145 NoCoverage mutants, 117 of them in the resolver).
 * A NoCoverage mutant is one no test even RUNS through — so a single test that
 * walks the line kills every mutant on it at once. These are the cheapest,
 * highest-ROI kills in the whole v5 effort.
 *
 * Hot-lines targeted (from reports/mutation/mutation.json, baseline 49.72%):
 *   - L678 / L681  visitJalankanExpression — node.arguments / node.withArgs loops
 *   - L766 / L782 / L798  Tambahkan/Kurangi/Sisipkan with an Identifier-node target
 *   - L897 / L910 / L923 / L966  Tampilkan/Sembunyikan/Hapus/Kosongkan target traversal
 *   - L979  Arahkan url traversal
 *   - L994 / L996  visitPerbaruiStatement node-target accept + Identifier write-track
 *   - L1012  AmbilDom source traversal
 *   - L1025 / L1031 / L1032  AmbilLuar url + saveTarget symbol seeding
 *   - L1049 / L1053  Selama condition + body traversal
 *
 * Strategy mirrors the v3/v4 branch suites:
 *   - INTEGRATION (real lexer → parser → resolve) where the construct compiles
 *     cleanly, so the assertion pins observable behavior end-to-end.
 *   - DIRECT-UNIT (hand-built AST + visitor call on a resolver with an
 *     initialized global scope) for visitors whose surface syntax is awkward
 *     or raises an earlier error before the branch we want to exercise.
 *
 * Every assertion was validated against real engine output before commit
 * (no assume-then-assert). Source is NOT modified — tests + config only.
 * Uses CommonJS require for the SAME instrumented module record the engine loads.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Lexer = require('../src/lexer/promptjs-lexer');
const Parser = require('../src/parser/promptjs-parser');
const Resolver = require('../src/resolver/promptjs-resolver');

// ── Helpers ───────────────────────────────────────────────────────────────
function parse(src) {
  const { tokens } = Lexer.tokenize(src);
  const { ast } = Parser.parse(tokens);
  return ast;
}
function resolve(src) {
  const r = new Resolver();
  const out = r.resolve(parse(src));
  return { resolver: r, ast: out.ast, errors: out.errors, warnings: r.warnings };
}
const hasCode = (list, code) => list.some((e) => e.code === code);

// A resolver with an initialized global scope so we can call visitor methods
// directly with hand-built nodes (mirrors what resolve() sets up).
function freshResolver() {
  const r = new Resolver();
  r.resolve(parse('Buat ruang:\n    "x"'));
  r.errors = [];
  r.warnings = [];
  return r;
}

const LOC = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
const id = (name) => ({ type: 'Identifier', name, loc: LOC });
const num = (v) => ({ type: 'Literal', value: v, kind: 'number', loc: LOC });
const str = (v) => ({ type: 'Literal', value: v, kind: 'string', loc: LOC });

function declareData(r, name) {
  r.visitDataDeclaration({ type: 'DataDeclaration', name, init: num(0), loc: LOC });
}

// ── 1. visitJalankanExpression — args / withArgs loops (L678, L681) ────────
describe('v5 resolver — JalankanExpression argument traversal', () => {
  it('integration: `jalankan` with positional arguments resolves cleanly', () => {
    // Drives L678: node.arguments.length > 0 → forEach(accept)
    const { errors } = resolve('jalankan cetak("a", "b")');
    expect(errors.length).toBe(0);
  });

  it('arguments that reference a declared symbol are resolved (read tracked)', () => {
    const { ast, errors } = resolve('data pesan = "hi"\njalankan cetak(pesan)');
    expect(errors.length).toBe(0);
    // the JalankanExpression argument Identifier should have been resolved
    const jalankan = ast.body.find((n) => n.type === 'JalankanExpression');
    expect(jalankan).toBeDefined();
    expect(jalankan.arguments.length).toBe(1);
  });

  it('direct-unit: withArgs branch (L681) is traversed', () => {
    const r = freshResolver();
    declareData(r, 'x');
    const node = {
      type: 'JalankanExpression',
      callee: 'cetak',
      arguments: [num(1)],
      withArgs: [id('x')],
      loc: LOC,
    };
    r.visitJalankanExpression(node);
    // x referenced via withArgs → read tracked, no error
    expect(r.errors.length).toBe(0);
    // currentJalankanCallee restored to null/undefined after the visit
    expect(r.currentJalankanCallee == null).toBe(true);
  });

  it('empty arguments/withArgs do not throw (guard both falsy branches)', () => {
    const r = freshResolver();
    r.visitJalankanExpression({ type: 'JalankanExpression', callee: 'noop', loc: LOC });
    expect(r.errors.length).toBe(0);
  });
});

// ── 2. Mutation statements with Identifier-node target (L766/L782/L798) ────
describe('v5 resolver — Tambahkan/Kurangi/Sisipkan Identifier-target dispatch', () => {
  for (const [type, visit, line] of [
    ['TambahkanStatement', 'visitTambahkanStatement', 'L766'],
    ['KurangiStatement', 'visitKurangiStatement', 'L782'],
    ['SisipkanStatement', 'visitSisipkanStatement', 'L798'],
  ]) {
    it(`${type}: Identifier-node target tracks a write (${line})`, () => {
      const r = freshResolver();
      declareData(r, 'arr');
      const node = { type, target: id('arr'), value: num(1), loc: LOC };
      r[visit](node);
      expect(node.targetSymbol).toBeDefined();
      expect(node.targetSymbol.writeCount).toBeGreaterThan(0);
      expect(hasCode(r.errors, 'E3003')).toBe(false);
    });
  }

  it('integration: `tambahkan X ke arr` drives the Identifier-target path', () => {
    const { errors } = resolve('data arr = [1]\ntambahkan 2 ke arr');
    expect(errors.length).toBe(0);
  });
});

// ── 3. DOM-action visitors target traversal (L897/L910/L923/L966/L979) ─────
describe('v5 resolver — DOM-action visitor target traversal', () => {
  it('Tampilkan resolves its target identifier (L897)', () => {
    const r = freshResolver();
    declareData(r, 'kotak');
    const node = { type: 'TampilkanStatement', target: id('kotak'), loc: LOC };
    r.visitTampilkanStatement(node);
    expect(node.target.resolved).toBeDefined();
    expect(node.target.resolved.name).toBe('kotak');
    expect(r.errors.length).toBe(0);
  });

  it('Sembunyikan resolves its target identifier (L910)', () => {
    const r = freshResolver();
    declareData(r, 'panel');
    const node = { type: 'SembunyikanStatement', target: id('panel'), loc: LOC };
    r.visitSembunyikanStatement(node);
    expect(node.target.resolved).toBeDefined();
    expect(r.errors.length).toBe(0);
  });

  it('Hapus resolves its target identifier (L923)', () => {
    const r = freshResolver();
    declareData(r, 'baris');
    const node = { type: 'HapusStatement', target: id('baris'), loc: LOC };
    r.visitHapusStatement(node);
    expect(node.target.resolved).toBeDefined();
    expect(r.errors.length).toBe(0);
  });

  it('Kosongkan resolves its target identifier (L966)', () => {
    const r = freshResolver();
    declareData(r, 'daftar');
    const node = { type: 'KosongkanStatement', target: id('daftar'), loc: LOC };
    r.visitKosongkanStatement(node);
    expect(node.target.resolved).toBeDefined();
    expect(r.errors.length).toBe(0);
  });

  it('Hapus on an undeclared identifier emits E3001 (target really traversed)', () => {
    const r = freshResolver();
    const node = { type: 'HapusStatement', target: id('tidakAda'), loc: LOC };
    r.visitHapusStatement(node);
    expect(hasCode(r.errors, 'E3001')).toBe(true);
  });

  it('integration: `arahkan "/x"` traverses the url node (L979)', () => {
    const { errors } = resolve('arahkan "/home"');
    expect(errors.length).toBe(0);
  });
});

// ── 4. visitPerbaruiStatement node-target accept + write-track (L994/L996) ─
describe('v5 resolver — Perbarui node-target traversal', () => {
  it('node (Identifier) target is accepted AND write-tracked (L994/L996)', () => {
    const r = freshResolver();
    declareData(r, 'judul');
    const node = {
      type: 'PerbaruiStatement',
      target: id('judul'),
      property: 'teks',
      value: str('halo'),
      loc: LOC,
    };
    r.visitPerbaruiStatement(node);
    // L994 else-branch: accept(target) → resolved set; L996: symbol found → write-track
    expect(node.target.resolved).toBeDefined();
    expect(node.targetSymbol).toBeDefined();
    expect(node.targetSymbol.writeCount).toBeGreaterThan(0);
  });

  it('node target that is undeclared still gets accepted → E3001', () => {
    const r = freshResolver();
    const node = {
      type: 'PerbaruiStatement',
      target: id('hilang'),
      property: 'teks',
      value: str('x'),
      loc: LOC,
    };
    r.visitPerbaruiStatement(node);
    expect(hasCode(r.errors, 'E3001')).toBe(true);
  });
});

// ── 5. AmbilDom / AmbilLuar / Selama traversal (L1012/L1025/L1031/L1032/L1049/L1053)
describe('v5 resolver — AmbilDom / AmbilLuar / Selama traversal', () => {
  it('AmbilDom traverses its source node (L1012)', () => {
    const r = freshResolver();
    declareData(r, 'sumber');
    const node = { type: 'AmbilDomStatement', source: id('sumber'), loc: LOC };
    r.visitAmbilDomStatement(node);
    expect(node.source.resolved).toBeDefined();
    expect(r.errors.length).toBe(0);
  });

  it('AmbilLuar traverses url AND seeds the saveTarget symbol (L1025/L1031/L1032)', () => {
    const r = freshResolver();
    const node = {
      type: 'AmbilLuarStatement',
      url: str('https://api.test/x'),
      saveTarget: 'hasil',
      body: {
        type: 'BlockStatement',
        body: [{ type: 'TampilkanStatement', target: id('hasil'), loc: LOC }],
      },
      loc: LOC,
    };
    r.visitAmbilLuarStatement(node);
    // saveTarget seeded as a writable `ubah` inside the callback scope, so the
    // `tampilkan hasil` reference inside the body resolves with no E3001.
    expect(hasCode(r.errors, 'E3001')).toBe(false);
  });

  it('AmbilLuar without a saveTarget still traverses url (guard L1031 false branch)', () => {
    const r = freshResolver();
    const node = {
      type: 'AmbilLuarStatement',
      url: str('https://api.test/y'),
      body: { type: 'BlockStatement', body: [] },
      loc: LOC,
    };
    r.visitAmbilLuarStatement(node);
    expect(r.errors.length).toBe(0);
  });

  it('integration: `setelah tik:` attaches targetSymbol when name resolves (L994/L996)', () => {
    // L994 `if (node.target)` true → lookup('tik') finds the fungsi symbol →
    // L996 `if (symbol)` true → node.targetSymbol attached for the compiler.
    const { ast, errors } = resolve(
      'fungsi tik():\n    tampilkan "t"\nsetelah tik:\n    tampilkan "x"'
    );
    expect(errors.length).toBe(0);
    const setelah = ast.body.find((n) => n.type === 'SetelahStatement');
    expect(setelah).toBeDefined();
    expect(setelah.target).toBe('tik');
    expect(setelah.targetSymbol).toBeDefined();
  });

  it('integration: `setelah <ms>:` with a non-symbol target leaves targetSymbol unset (L996 false)', () => {
    // Numeric/delay target does not resolve to a declared symbol → L996 false branch.
    const { ast } = resolve('setelah 1000:\n    tampilkan "hai"');
    const setelah = ast.body.find((n) => n.type === 'SetelahStatement');
    expect(setelah).toBeDefined();
    expect(setelah.targetSymbol).toBeUndefined();
  });

  it('Selama traverses both condition and body (L1049/L1053)', () => {
    const r = freshResolver();
    declareData(r, 'n');
    const node = {
      type: 'SelamaStatement',
      condition: {
        type: 'BinaryExpression',
        operator: '<',
        left: id('n'),
        right: num(3),
        loc: LOC,
      },
      body: {
        type: 'BlockStatement',
        body: [{ type: 'TampilkanStatement', target: id('n'), loc: LOC }],
      },
      loc: LOC,
    };
    r.visitSelamaStatement(node);
    // condition's `n` and body's `n` both resolve → no E3001
    expect(hasCode(r.errors, 'E3001')).toBe(false);
  });

  it('integration: `selama n < 3:` end-to-end resolves cleanly', () => {
    const { errors } = resolve('data n = 0\nselama n < 3:\n    simpan n ke n');
    expect(errors.length).toBe(0);
  });

  it('integration: `hapus 1 dari arr` drives HapusDari reactive branch', () => {
    const { ast, errors } = resolve('data arr = [1, 2]\nhapus 1 dari arr');
    expect(errors.length).toBe(0);
    const hd = ast.body.find((n) => n.type === 'HapusDariStatement');
    expect(hd).toBeDefined();
    // fromArray is a reactive `data` symbol → branch flag set true
    expect(hd.fromArrayReactive).toBe(true);
  });
});
