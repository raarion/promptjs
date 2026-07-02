/**
 * PromptJS — Regression: bilingual string/collection membership operators.
 *
 * New feature (closes a documented gap: previously `berisi`/`contains` only
 * existed as the builtin CALL `apakahAda(arr, x)`; there was no infix word
 * operator, forcing `.includes()` boilerplate). Adds three prose operators:
 *
 *   berisi   / contains      ->  (a).includes(b)      (string AND array)
 *   diawali  / starts with   ->  String(a).startsWith(b)
 *   diakhiri / ends with     ->  String(a).endsWith(b)
 *
 * Implementation: lexer WORD_OPERATORS + TK_BERISI/TK_DIAWALI/TK_DIAKHIRI,
 * parser precedence 4 (comparison), and a membership branch in expression
 * lowering. `.includes` is chosen for `berisi` because it works natively for
 * both strings and arrays; the prefix/suffix ops coerce via String(...) so a
 * non-string LHS never throws.
 *
 * These tests lock: both languages lower correctly, they compose inside
 * conditions, the emitted JS is syntactically valid, reactivity is preserved,
 * and an identifier whose prefix matches an operator (e.g. `berisiko`) is NOT
 * mis-tokenized.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/** Compile a derived expression `turunan x = <expr>` and return the emitted JS. */
function compileDerived(expr) {
  const r = Engine.compile(
    'Halaman P:\n' +
      '    data nama = "halo dunia"\n' +
      '    data daftar = "x"\n' +
      '    data url = "/api/x"\n' +
      `    turunan hasil = ${expr}\n` +
      '    Buat div: $hasil'
  );
  return r;
}

describe('string/collection membership operators (regression)', () => {
  it('`berisi` lowers to .includes()', () => {
    const r = compileDerived('nama berisi "halo"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('(nama.value).includes("halo")');
  });

  it('`contains` (English) lowers to .includes()', () => {
    const r = compileDerived('nama contains "halo"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('(nama.value).includes("halo")');
  });

  it('`diawali` lowers to String(...).startsWith()', () => {
    const r = compileDerived('url diawali "/api"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('String(url.value).startsWith("/api")');
  });

  it('`starts with` (English, two words) lowers to .startsWith()', () => {
    const r = compileDerived('url starts with "/api"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('String(url.value).startsWith("/api")');
  });

  it('`diakhiri` lowers to String(...).endsWith()', () => {
    const r = compileDerived('nama diakhiri "dunia"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('String(nama.value).endsWith("dunia")');
  });

  it('`ends with` (English, two words) lowers to .endsWith()', () => {
    const r = compileDerived('nama ends with "dunia"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('String(nama.value).endsWith("dunia")');
  });

  it('composes inside a Jika condition', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    data q = "abc"\n' +
        '    Jika q berisi "b":\n' +
        '        Buat div: "ada"'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('(q.value).includes("b")');
  });

  it('preserves reactivity — membership sits inside a computed that reads .value', () => {
    const r = compileDerived('nama berisi "halo"');
    expect(r.success).toBe(true);
    // The .value read inside __createComputed is what registers the dependency.
    expect(r.js).toMatch(/__createComputed\(\(\)\s*=>\s*\(nama\.value\)\.includes/);
  });

  it('emits syntactically valid JavaScript', () => {
    const r = compileDerived('nama berisi "x" dan url diawali "/"');
    expect(r.success).toBe(true);
    // Throws if the emitted body is not parseable.
    expect(() => new Function(r.js)).not.toThrow();
  });

  it('does NOT mis-tokenize an identifier whose prefix matches an operator (`berisiko`)', () => {
    const r = Engine.compile('Halaman P:\n    data berisiko = "tinggi"\n    Buat div: $berisiko');
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('.includes(');
    expect(r.js).toContain('berisiko');
  });

  it('chains with boolean operators at correct precedence', () => {
    const r = compileDerived('nama berisi "halo" dan url berisi "api"');
    expect(r.success).toBe(true);
    // Both membership calls present, joined by &&.
    expect(r.js).toContain('(nama.value).includes("halo")');
    expect(r.js).toContain('(url.value).includes("api")');
    expect(r.js).toContain('&&');
  });
});
