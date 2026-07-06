// @ts-check
/**
 * LIM & MIS fixes for v132 — regression + feature tests
 *
 * LIM-1: Gunakan Nama(prop: val) — parenthesized props
 * LIM-2: arahkan ke "/path" — optional "ke" after arahkan
 * LIM-3: E4201 per-symbol suggestion for mutual turunan cycles
 * LIM-4: kurangi <value> ke <target> — rejected with E2020
 * MIS-1: E5001 per-node type suggestion for unknown AST nodes
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';

// ═══════════════════════════════════════════════════════════════
// LIM-1: Gunakan Nama(prop: val)
// ═══════════════════════════════════════════════════════════════
describe('LIM-1: Gunakan Nama(prop: val) — parenthesized props', () => {
  it('accepts Gunakan with single paren prop', () => {
    const r = compile('Komponen Salam:\n  Tampilkan "Halo"\n\nGunakan Salam(nama: "Dunia")');
    expect(r.success).toBe(true);
    expect(r.js).toContain('__komp_Salam');
    expect(r.js).toContain('"nama": "Dunia"');
  });

  it('accepts Gunakan with multiple paren props', () => {
    const r = compile(
      'Komponen Kartu:\n  Tampilkan "Kartu"\n\nGunakan Kartu(judul: "Halo", isi: "Dunia")'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('"judul": "Halo"');
    expect(r.js).toContain('"isi": "Dunia"');
  });

  it('still supports Gunakan without props (no parens)', () => {
    const r = compile('Komponen Salam:\n  Tampilkan "Halo"\n\nGunakan Salam');
    expect(r.success).toBe(true);
    expect(r.js).toContain('__komp_Salam()');
  });

  it('reports E3004 for Gunakan with props but undeclared component', () => {
    const r = compile('Gunakan TidakAda(nama: "test")');
    expect(r.success).toBe(false);
    const e = r.errors.find((e) => e.code === 'E3004');
    expect(e).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// LIM-2: arahkan ke "/path" — optional "ke"
// ═══════════════════════════════════════════════════════════════
describe('LIM-2: arahkan ke "/path" — optional "ke"', () => {
  it('accepts arahkan ke "/path" (with ke)', () => {
    const r = compile('arahkan ke "/halaman"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('window.location.href = "/halaman"');
  });

  it('still accepts arahkan "/path" (without ke)', () => {
    const r = compile('arahkan "/halaman"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('window.location.href = "/halaman"');
  });

  it('handles arahkan ke inside event handler', () => {
    const r = compile('Buat tombol:\n  "Klik"\n  Ketika diklik:\n    arahkan ke "/halaman"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('window.location.href = "/halaman"');
  });

  it('handles arahkan ke with variable path', () => {
    const r = compile('Data url = "/halaman"\narahkan ke url');
    expect(r.success).toBe(true);
    expect(r.js).toContain('window.location.href = url.value');
  });
});

// ═══════════════════════════════════════════════════════════════
// LIM-3: E4201 per-symbol suggestion
// ═══════════════════════════════════════════════════════════════
describe('LIM-3: E4201 per-symbol suggestion for mutual turunan cycles', () => {
  it('suggests breaking specific symbol for mutual cycle', () => {
    const r = compile('Data x = 1\nTurunan a = b + 1\nTurunan b = a + 1');
    expect(r.success).toBe(false);
    const e = r.errors.find((e) => e.code === 'E4201');
    expect(e).toBeDefined();
    expect(e.message).toContain('a -> b -> a');
    expect(e.suggestion).toContain('"b"');
    expect(e.suggestion).toContain('"a"');
    expect(e.suggestion).toContain('Data');
  });

  it('suggests self-reference for self-cycle', () => {
    const r = compile('Turunan x = x + 1');
    expect(r.success).toBe(false);
    const e = r.errors.find((e) => e.code === 'E4201');
    expect(e).toBeDefined();
    expect(e.message).toContain('x -> x');
    expect(e.suggestion).toContain('"x"');
  });

  it('handles triple cycle with specific suggestion', () => {
    const r = compile('Data x = 1\nTurunan a = b + 1\nTurunan b = c + 1\nTurunan c = a + 1');
    expect(r.success).toBe(false);
    const e = r.errors.find((e) => e.code === 'E4201');
    expect(e).toBeDefined();
    expect(e.message).toContain('a -> b -> c -> a');
    expect(e.suggestion).toContain('"c"');
    expect(e.suggestion).toContain('"a"');
  });
});

// ═══════════════════════════════════════════════════════════════
// LIM-4: kurangi <value> ke <target> — rejected
// ═══════════════════════════════════════════════════════════════
describe('LIM-4: kurangi <value> ke <target> — rejected with E2020', () => {
  it('rejects "kurangi 5 ke hitung" with E2020', () => {
    const r = compile('Data hitung = 10\n\nkurangi 5 ke hitung');
    expect(r.success).toBe(false);
    const e = r.errors.find((e) => e.code === 'E2020');
    expect(e).toBeDefined();
    expect(e.message).toContain('kurangi');
    expect(e.message).toContain('dari');
    expect(e.suggestion).toContain('dari');
  });

  it('still accepts "kurangi hitung" (form 1: decrement by 1)', () => {
    const r = compile('Data hitung = 10\n\nkurangi hitung');
    expect(r.success).toBe(true);
    expect(r.js).toContain('hitung.value - 1');
  });

  it('still accepts "kurangi hitung ke 5" (form 2: subtract to value)', () => {
    const r = compile('Data hitung = 10\n\nkurangi hitung ke 5');
    expect(r.success).toBe(true);
    expect(r.js).toContain('hitung.value - 5');
  });

  it('still accepts "kurangi 5 dari hitung" (form 3: subtract value from target)', () => {
    const r = compile('Data hitung = 10\n\nkurangi 5 dari hitung');
    expect(r.success).toBe(true);
    expect(r.js).toContain('hitung.value - 5');
  });

  it('does NOT reject "kurangi hitung ke 5" (identifier + ke = valid form 2)', () => {
    const r = compile('Data hitung = 10\n\nkurangi hitung ke 5');
    expect(r.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// MIS-1: E5001 per-node suggestion
// ═══════════════════════════════════════════════════════════════
describe('MIS-1: E5001 per-node type suggestion', () => {
  it('E5001 for ForStatement includes Ulangi suggestion', () => {
    const PromptJSCompiler = require('../src/compiler/promptjs-compiler.js');
    const compiler = new PromptJSCompiler();
    const badNode = { type: 'ForStatement' };
    let thrownMsg = '';
    try {
      compiler._validateNodeTypes(badNode);
    } catch (err) {
      thrownMsg = err.message;
    }
    expect(thrownMsg).toContain('ForStatement');
    expect(thrownMsg).toContain('UlangiStatement');
  });

  it('E5001 for WhileStatement includes Selama suggestion', () => {
    const PromptJSCompiler = require('../src/compiler/promptjs-compiler.js');
    const compiler = new PromptJSCompiler();
    const badNode = { type: 'WhileStatement' };
    let thrownMsg = '';
    try {
      compiler._validateNodeTypes(badNode);
    } catch (err) {
      thrownMsg = err.message;
    }
    expect(thrownMsg).toContain('WhileStatement');
    expect(thrownMsg).toContain('SelamaStatement');
  });

  it('E5001 for unknown type includes generic suggestion', () => {
    const PromptJSCompiler = require('../src/compiler/promptjs-compiler.js');
    const compiler = new PromptJSCompiler();
    const badNode = { type: 'SomeRandomType' };
    let thrownMsg = '';
    try {
      compiler._validateNodeTypes(badNode);
    } catch (err) {
      thrownMsg = err.message;
    }
    expect(thrownMsg).toContain('SomeRandomType');
    expect(thrownMsg).toContain('node type sudah didukung');
  });
});
