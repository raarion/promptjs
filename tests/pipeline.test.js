/**
 * PromptJS — Core pipeline tests (migrated from src/tester/test-all.js).
 * Covers the happy paths of the 5-stage compile pipeline.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

describe('core pipeline', () => {
  it('8.1: Buat judul.utama#judul with text node', () => {
    const r = Engine.compile('Buat judul.utama#judul:\n    "Halo"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("h1")');
    expect(r.js).toContain('id = "judul"');
    expect(r.js).toContain('className = "utama"');
    expect(r.js).toContain('createTextNode("Halo")');
  });

  it('8.2: bilingual keywords produce equivalent compiled JS', () => {
    const id = Engine.compile('Buat ruang.kotak:\n    "Indonesia"');
    const en = Engine.compile('Create div.kotak:\n    "English"');
    expect(id.success).toBe(true);
    expect(en.success).toBe(true);
    expect(id.js).toContain('document.createElement("div")');
    expect(en.js).toContain('document.createElement("div")');
    expect(id.js).toContain('className = "kotak"');
    expect(en.js).toContain('className = "kotak"');
  });

  it('8.3: TextNode compiles correctly', () => {
    const r = Engine.compile('Buat ruang:\n    "Hello PromptJS!"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('createTextNode("Hello PromptJS!")');
  });

  it('8.4: on_klik = handler() synthesizes a click listener', () => {
    // Uses console.log (a JS global) so the source compiles cleanly; an
    // undeclared handler would raise E3001 and emit no JS. The point of this
    // test is that `on_klik` is lowered into an addEventListener("click") call.
    const r = Engine.compile('Buat tombol:\n    "Klik"\n    on_klik = console.log("clicked")');
    expect(r.success).toBe(true);
    expect(r.js).toContain('addEventListener("click"');
    expect(r.js).toContain('console.log("clicked")');
  });

  it('8.5: front-matter data resolves without E3001', () => {
    const r = Engine.compile('---\nnama: Beb\n---\nBuat ruang:\n    "Halo"', {
      loadDataFiles: false,
    });
    expect(r.success).toBe(true);
    expect(r.js).toContain('const nama =');
  });

  it('8.6: Jika stok > 0 compiles to an if statement', () => {
    const r = Engine.compile('tetap stok = 5\nBuat ruang:\n    Jika stok > 0:\n        "Ada stok"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('if');
    expect(r.js).toContain('stok');
  });

  it('8.7: Ulangi untuk item in daftar compiles to forEach', () => {
    const r = Engine.compile(
      'tetap daftar = [1, 2, 3]\nBuat ruang:\n    Ulangi untuk item in daftar:\n        "Item"'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('forEach');
  });

  it('8.8: pass in BuatStatement produces an empty element', () => {
    const r = Engine.compile('Buat ruang.kotak:\n    pass');
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    expect(r.js).not.toContain('continue;');
  });

  it('8.9: auto-fragment wrapping for multi-root page', () => {
    const r = Engine.compile('Buat ruang:\n    "First"\n    "Second"');
    expect(r.success).toBe(true);
    const textNodeCount = (r.js.match(/createTextNode/g) || []).length;
    expect(textNodeCount).toBeGreaterThanOrEqual(2);
  });

  it('JS_GLOBALS: alert/console/document do not trigger E3001', () => {
    const r = Engine.compile('Buat tombol:\n    on_klik = alert("hi")');
    const hasE3001 = r.errors.some(
      (e) => e.code === 'E3001' && e.message && e.message.includes('alert')
    );
    expect(hasE3001).toBe(false);
  });
});
