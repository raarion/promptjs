/**
 * PromptJS — v5 DIAGNOSTIC-TEXT suite (Cluster B: StringLiteral mutants).
 *
 * StringLiteral mutants replace a diagnostic `message` / `suggestion` string
 * with "" or "Stryker was here!". They SURVIVE whenever a test only checks
 * `err.code` (or `errors.length`) but never the human-facing text. Since the
 * exact wording of `message`/`suggestion` IS the diagnostic contract a user
 * reads, pinning it is a legitimate, non-brittle assertion (not over-fitting
 * an internal/debug string).
 *
 * Every expected string below was captured from REAL engine output (probed
 * before writing — no assume-then-assert) and corresponds to a Survived/
 * NoCoverage StringLiteral mutant in reports/mutation/mutation.json:
 *
 *   Resolver: E3002 (duplicate, L426/427), W3002 (shadow, L439/443),
 *             E3001 (undeclared, L557), E3003 (const write),
 *             E3004 (component undeclared), E4010 (use non-component).
 *   Analyzer: W4001 (type mismatch, L200/202), E4004 (read-only turunan,
 *             L252/254), E4201 (dependency cycle, L311/313),
 *             W4101 (unused symbol, L377/379), W4103 (reactive write-only).
 *
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
  return { errors: out.errors, warnings: r.warnings, ast: out.ast };
}
function analyze(src, opts) {
  const r = new Resolver();
  const rr = r.resolve(parse(src));
  const a = new Analyzer();
  const out = a.analyze(rr.ast, opts || { usageWarnings: 'normal' });
  return { errors: out.errors, warnings: out.warnings };
}
const find = (list, code) => list.find((e) => e.code === code);

// ── Resolver diagnostics ────────────────────────────────────────────────────
describe('v5 diagnostic text — resolver messages & suggestions', () => {
  it('E3002 duplicate symbol: exact message + suggestion (kills L426/L427)', () => {
    const { errors } = resolve('data x = 1\ndata x = 2');
    const e = find(errors, 'E3002');
    expect(e).toBeDefined();
    expect(e.message).toBe('Simbol "x" sudah dideklarasikan dalam scope yang sama.');
    expect(e.suggestion).toBe('Deklarasi pertama ada di Baris 1.');
    // Indonesian aliases are kept in sync by createError()
    expect(e.pesan).toBe(e.message);
    expect(e.saran).toBe(e.suggestion);
  });

  it('E3001 undeclared identifier: exact message + suggestion (kills L557)', () => {
    const { errors } = resolve('tetap x = tidakAda');
    const e = find(errors, 'E3001');
    expect(e).toBeDefined();
    expect(e.message).toBe('Identifier "tidakAda" tidak dideklarasikan.');
    expect(e.suggestion).toBe(
      'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.'
    );
  });

  it('E3003 write to const: exact message + suggestion', () => {
    const { errors } = resolve('tetap PI = 3\nsimpan 4 ke PI');
    const e = find(errors, 'E3003');
    expect(e).toBeDefined();
    expect(e.message).toBe('Variabel tetap "PI" tidak dapat diubah setelah inisialisasi.');
    expect(e.suggestion).toBe('Gunakan "ubah" jika variabel perlu diubah, bukan "tetap".');
  });

  it('W3002 shadowing: exact message + suggestion (kills L439/L443)', () => {
    const { warnings } = resolve('data x = 1\nkomponen K():\n    data x = 2\n    tampilkan x');
    const w = find(warnings, 'W3002');
    expect(w).toBeDefined();
    expect(w.message).toBe('Variabel "x" menyembunyikan variabel dengan nama sama di scope luar.');
    expect(w.suggestion).toBe('Gunakan nama yang berbeda untuk menghindari kebingungan.');
  });

  it('E3004 component used before declaration: exact message + suggestion', () => {
    const { errors } = resolve('gunakan TidakAda');
    const e = find(errors, 'E3004');
    expect(e).toBeDefined();
    expect(e.message).toBe('Komponen "TidakAda" digunakan sebelum dideklarasi.');
    expect(e.suggestion).toBe('Pindahkan deklarasi komponen sebelum penggunaannya.');
  });

  it('E4010 `gunakan` on a non-component: exact message + suggestion', () => {
    const { errors } = resolve('data x = 1\ngunakan x');
    const e = find(errors, 'E4010');
    expect(e).toBeDefined();
    expect(e.message).toBe('"x" bukan komponen, tidak dapat digunakan dengan "gunakan".');
    expect(e.suggestion).toBe('Pastikan nama yang direferensikan adalah komponen (PascalCase).');
  });
});

// ── Analyzer diagnostics ────────────────────────────────────────────────────
describe('v5 diagnostic text — analyzer messages & suggestions', () => {
  it('W4001 type-hint mismatch: exact message + suggestion (kills L200/L202)', () => {
    const { warnings } = analyze('data x: angka = "teks"');
    const w = find(warnings, 'W4001');
    expect(w).toBeDefined();
    expect(w.message).toBe('Type hint "angka" tidak cocok dengan nilai awal bertipe "teks".');
    expect(w.suggestion).toBe('Gunakan nilai yang sesuai atau ubah type hint menjadi yang benar.');
  });

  it('E4004 write to read-only turunan: exact message + suggestion (kills L252/L254)', () => {
    const { errors } = analyze('data a = 1\nturunan b = a + 1\nsimpan 5 ke b');
    const e = find(errors, 'E4004');
    expect(e).toBeDefined();
    expect(e.message).toBe('Data turunan "b" bersifat read-only dan tidak boleh diubah.');
    expect(e.suggestion).toBe('Gunakan data (var) biasa jika perlu mengubah nilainya.');
  });

  it('E4201 dependency cycle: exact message + suggestion (kills L311/L313)', () => {
    const { errors } = analyze('turunan a = b + 1\nturunan b = a + 1');
    const e = find(errors, 'E4201');
    expect(e).toBeDefined();
    expect(e.message).toBe('Dependency cycle pada data turunan: a -> b -> a');
    expect(e.suggestion).toBe(
      'Ubah salah satu ekspresi turunan agar tidak saling bergantung secara melingkar.'
    );
  });

  it('W4101 unused symbol: exact message + suggestion (kills L377/L379)', () => {
    const { warnings } = analyze('data tidakDipakai = 1\ntampilkan "x"');
    const w = find(warnings, 'W4101');
    expect(w).toBeDefined();
    expect(w.message).toBe('Simbol "tidakDipakai" dideklarasikan tetapi tidak pernah digunakan.');
    expect(w.suggestion).toBe(
      'Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut.'
    );
  });

  it('W4103 reactive data mutated but never read: exact message + suggestion', () => {
    const { warnings } = analyze('data s = 0\nsimpan 5 ke s');
    const w = find(warnings, 'W4103');
    expect(w).toBeDefined();
    expect(w.message).toBe('Data reaktif "s" dimutasi 1 kali tetapi tidak pernah dibaca.');
    expect(w.suggestion).toBe(
      'Jika state reaktif tidak pernah dibaca, pertimbangkan ubah biasa atau hapus mutasinya.'
    );
  });
});
