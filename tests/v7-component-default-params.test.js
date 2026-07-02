/**
 * PromptJS — Regression: component/function default parameter values.
 *
 * Documented feature (docs/language/components.md → "Parameter dengan Default"):
 *   Komponen Tombol(label, varian: "primer"):
 * was completely broken end-to-end prior to this fix:
 *   1. The parser param loop only accepted `,`/`)` after a param name and never
 *      consumed a `:` default marker, so any default emitted
 *      `E2001 Expected ")"` (the lexer already produced IDENT COLON <lit>).
 *   2. Even had it parsed, the component emitter emitted a plain
 *      `const x = props.x;` with no fallback, so a documented default would
 *      never apply at runtime.
 *
 * These tests lock the red→green transition: defaults now parse AND emit a
 * fallback, and the analyzer's E4006 (required-after-defaulted) is finally
 * reachable through the real parser — not just via hand-built AST.
 *
 * Root cause: src/parser/promptjs-parser.js (_parseDefineComponent /
 * _parseFungsiDeclaration) + src/compiler/emitters/statements.js
 * (visitKomponenDeclaration).
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

describe('component default parameters (regression)', () => {
  it('parses a string default without E2001 (was: Expected ")")', () => {
    const r = Engine.compile(
      'Komponen Tombol(label, varian: "primer"):\n' +
        '    Buat button.btn: $label\n\n' +
        'Halaman P:\n' +
        '    Buat Tombol(label: "Hai")'
    );
    expect(r.success).toBe(true);
    const codes = (r.errors || []).map((e) => e.code);
    expect(codes).not.toContain('E2001');
  });

  it('emits a fallback so an omitted prop uses the default', () => {
    const r = Engine.compile(
      'Komponen Tombol(label, varian: "primer"):\n' +
        '    Buat button.btn: $label\n\n' +
        'Halaman P:\n' +
        '    Buat Tombol(label: "Hai")'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('const varian = props.varian !== undefined ? props.varian : "primer";');
    // A param without a default keeps the plain destructure.
    expect(r.js).toContain('const label = props.label;');
  });

  it('supports numeric and expression defaults', () => {
    const r = Engine.compile(
      'Komponen Kotak(isi, ukuran: 10, sisi: 2 + 3):\n' +
        '    Buat div: $isi\n\n' +
        'Halaman P:\n' +
        '    Buat Kotak(isi: "x")'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('const ukuran = props.ukuran !== undefined ? props.ukuran : 10;');
    // Expression defaults are parenthesized to protect precedence in the ternary.
    expect(r.js).toContain('const sisi = props.sisi !== undefined ? props.sisi : (2 + 3);');
  });

  it('lets a caller override the default value', () => {
    const r = Engine.compile(
      'Komponen Lencana(teks, warna: "biru"):\n' +
        '    Buat span.lencana: $teks\n\n' +
        'Halaman T:\n' +
        '    Buat Lencana(teks: "Custom", warna: "hijau")'
    );
    expect(r.success).toBe(true);
    // Override is passed through in the props object at the call site.
    expect(r.js).toContain('"warna": "hijau"');
  });

  it('works with English keywords (Component / default)', () => {
    const r = Engine.compile(
      'Component Badge(text, color: "blue"):\n' +
        '    Create span: text\n\n' +
        'Page Home:\n' +
        '    Create Badge(text: "Hi")'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('const color = props.color !== undefined ? props.color : "blue";');
  });

  it('produces syntactically valid JavaScript', () => {
    const r = Engine.compile(
      'Komponen Tombol(label, varian: "primer"):\n' +
        '    Buat button.btn: $label\n\n' +
        'Halaman P:\n' +
        '    Buat Tombol(label: "Hai")'
    );
    expect(r.success).toBe(true);
    expect(() => new Function(`if(false){\n${r.js}\n}`)).not.toThrow();
  });

  it('E4006 is now reachable through the parser (required after defaulted)', () => {
    const r = Engine.compile(
      'Komponen Kartu(a: 1, b):\n' +
        '    Buat div: $b\n\n' +
        'Halaman P:\n' +
        '    Buat Kartu(b: "x")'
    );
    const found = (r.errors || []).some((e) => e.code === 'E4006');
    if (!found) {
      const codes = [...(r.errors || [])].map((e) => e.code);
      expect.fail(`Expected E4006 through parser but got: [${codes.join(', ')}]`);
    }
  });
});
