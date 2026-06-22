/**
 * PromptJS — Extended feature tests (migrated from src/tester/test-extended.js).
 * Covers events, front-matter, bilingual parity, loops, selectors and a full example.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

describe('extended features', () => {
  it('4.3: KetikaStatement self-reference (on_klik without target)', () => {
    const r = Engine.compile('Buat tombol:\n    "Click me"\n    on_klik = alert("clicked")');
    expect(r.success).toBe(true);
    expect(r.js).toContain('addEventListener("click"');
    expect(r.js).toContain('alert("clicked")');
  });

  it('front-matter inline string value', () => {
    const r = Engine.compile('---\nnama: Beb\n---\nBuat ruang:\n    "Halo"', {
      loadDataFiles: false,
    });
    expect(r.success).toBe(true);
    expect(r.js).toContain('const nama = "Beb"');
  });

  it('front-matter inline JSON value', () => {
    const r = Engine.compile('---\nproduk: {"value": "Kopi"}\n---\nBuat ruang:\n    "Halo"', {
      loadDataFiles: false,
    });
    expect(r.success).toBe(true);
    expect(r.js).toContain('const produk = ');
  });

  it('bilingual Jika/If produce equivalent output', () => {
    const id = Engine.compile('tetap x = 5\nBuat ruang:\n    Jika x > 3:\n        "Big"');
    const en = Engine.compile('const x = 5\nCreate div:\n    If x > 3:\n        "Big"');
    expect(id.success).toBe(true);
    expect(en.success).toBe(true);
    expect(id.js).toContain('if');
    expect(en.js).toContain('if');
  });

  it('bilingual Tetap/Const produce equivalent output', () => {
    const id = Engine.compile('tetap nama = "test"\nBuat ruang:\n    "Halo"');
    const en = Engine.compile('const nama = "test"\nCreate div:\n    "Halo"');
    expect(id.success).toBe(true);
    expect(en.success).toBe(true);
    expect(id.js).toContain('const nama = "test"');
    expect(en.js).toContain('const nama = "test"');
  });

  it('Ulangi with text body inside element', () => {
    const r = Engine.compile(
      'tetap items = ["A", "B"]\nBuat ruang:\n    Ulangi untuk item in items:\n        "Item"'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('forEach');
    expect(r.js).toContain('item');
  });

  it('Ulangi 3 kali (counted loop) compiles to a for loop', () => {
    const r = Engine.compile('Buat ruang:\n    Ulangi 3 kali:\n        "Hello"');
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/for \(let __i = 0; __i < 3; __i\+\+\)/);
  });

  it('Loop 5 times (English counted loop) compiles to a for loop', () => {
    const r = Engine.compile('Create div:\n    Loop 5 times:\n        "Hello"');
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/for \(let __i = 0; __i < 5; __i\+\+\)/);
  });

  it('loop source separator "from"/"dari" aliases "in"', () => {
    const withFrom = Engine.compile(
      'tetap arr = [1, 2]\nBuat ruang:\n    Ulangi untuk x from arr:\n        "i"'
    );
    const withDari = Engine.compile(
      'tetap arr = [1, 2]\nBuat ruang:\n    Ulangi untuk x dari arr:\n        "i"'
    );
    expect(withFrom.success).toBe(true);
    expect(withDari.success).toBe(true);
    expect(withFrom.js).toContain('forEach');
    expect(withDari.js).toContain('forEach');
  });

  it('nested Buat elements', () => {
    const r = Engine.compile('Buat ruang.luar:\n    Buat ruang.dalam:\n        "Nested"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    const appendCount = (r.js.match(/appendChild/g) || []).length;
    expect(appendCount).toBeGreaterThanOrEqual(2);
  });

  it('fragment does NOT create a real DOM element', () => {
    const r = Engine.compile('Buat ruang:\n    Buat fragmen:\n        "A"\n        "B"');
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('createElement("fragment")');
    expect(r.js).toContain('createTextNode("A")');
    expect(r.js).toContain('createTextNode("B")');
  });

  it('lewati keyword in BuatStatement', () => {
    const r = Engine.compile('Buat ruang.kotak:\n    lewati');
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    expect(r.js).not.toContain('continue;');
  });

  it('multiple class selector: Buat ruang.kotak.besar', () => {
    const r = Engine.compile('Buat ruang.kotak.besar:\n    "Test"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('className = "kotak besar"');
  });

  it('selector with id: Buat ruang#main', () => {
    const r = Engine.compile('Buat ruang#main:\n    "Test"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('id = "main"');
  });

  it('full selector: Buat ruang.kontainer#app', () => {
    const r = Engine.compile('Buat ruang.kontainer#app:\n    "Test"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('className = "kontainer"');
    expect(r.js).toContain('id = "app"');
  });

  it('anonymous page "Halaman:" compiles without an id', () => {
    const r = Engine.compile('Halaman:\n    Buat h1: "Hai"');
    expect(r.success).toBe(true);
  });

  it('named page "Halaman Beranda:" sets the root element id', () => {
    const r = Engine.compile('Halaman Beranda:\n    Buat h1: "Hai"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('.id = "beranda"');
  });

  it('English named page "Page Home:" sets the root element id', () => {
    const r = Engine.compile('Page Home:\n    Create h1: "Hi"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('id = "home"');
  });

  it('8.10: end-to-end full example', () => {
    const source = `---
nama: Toko Kita
stok: 42
---
tetap batas = 10
Buat halaman:
    Buat kepala:
        Buat judul.utama:
            "Selamat Datang"
    Buat ruang.konten:
        Jika stok > 0:
            Buat paragraf:
                "Ada stok tersedia"
        Lainnya:
            Buat paragraf:
                "Stok habis"
    Buat kaki:
        "Hak Cipta 2024"`;
    const r = Engine.compile(source, { loadDataFiles: false });
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    expect(r.js).toContain('document.createElement("h1")');
    expect(r.js).toContain('document.createElement("header")');
    expect(r.js).toContain('document.createElement("footer")');
    expect(r.js).toContain('if');
    expect(r.js).toContain('else');
    expect(r.js).toContain('createTextNode("Selamat Datang")');
    expect(r.js).toContain('createTextNode("Hak Cipta 2024")');
    expect(r.js).toContain('const nama =');
    expect(r.js).toContain('const stok =');
  });
});
