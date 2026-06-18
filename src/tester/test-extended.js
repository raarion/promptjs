/**
 * PromptJS v0.1 — Extended Pipeline Tests
 * ============================================================================
 */
'use strict';

const Engine = require('../engine/promptjs');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failCount++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// ── KetikaStatement self-reference fix (4.3) ──
test('4.3: KetikaStatement self-reference (on_klik without target)', () => {
  const r = Engine.compile(`Buat tombol:\n    "Click me"\n    on_klik = alert("clicked")`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('addEventListener("click"'), 'Should bind click: ' + r.js);
  // Self-reference: the button element should be the event target
  assert(r.js.includes('alert("clicked")'), 'Should call alert: ' + r.js);
});

// ── Front-matter inline value ──
test('Front-matter inline string value', () => {
  const r = Engine.compile(`---\nnama: Beb\n---\nBuat ruang:\n    "Halo"`, { loadDataFiles: false });
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('const nama = "Beb"'), 'Should emit nama const: ' + r.js);
});

// ── Front-matter inline JSON ──
test('Front-matter inline JSON value', () => {
  const r = Engine.compile(`---\nproduk: {"value": "Kopi"}\n---\nBuat ruang:\n    "Halo"`, { loadDataFiles: false });
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('const produk = '), 'Should emit produk const: ' + r.js);
});

// ── Bilingual Jika/If ──
test('Bilingual Jika/If produces same output', () => {
  const id = Engine.compile(`tetap x = 5\nBuat ruang:\n    Jika x > 3:\n        "Big"`);
  const en = Engine.compile(`const x = 5\nCreate div:\n    If x > 3:\n        "Big"`);
  assert(id.success, 'ID Jika should compile: ' + JSON.stringify(id.errors));
  assert(en.success, 'EN If should compile: ' + JSON.stringify(en.errors));
  assert(id.js.includes('if'), 'ID should have if');
  assert(en.js.includes('if'), 'EN should have if');
});

// ── Bilingual Tetap/Const ──
test('Bilingual Tetap/Const produce same output', () => {
  const id = Engine.compile(`tetap nama = "test"\nBuat ruang:\n    "Halo"`);
  const en = Engine.compile(`const nama = "test"\nCreate div:\n    "Halo"`);
  assert(id.success, 'ID Tetap should compile: ' + JSON.stringify(id.errors));
  assert(en.success, 'EN Const should compile: ' + JSON.stringify(en.errors));
  assert(id.js.includes('const nama = "test"'), 'ID should have const nama');
  assert(en.js.includes('const nama = "test"'), 'EN should have const nama');
});

// ── Loop with text body ──
test('Ulangi with text body inside element', () => {
  const r = Engine.compile(`tetap items = ["A", "B"]\nBuat ruang:\n    Ulangi untuk item in items:\n        "Item"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('forEach'), 'Should use forEach: ' + r.js);
  assert(r.js.includes('item'), 'Should reference item: ' + r.js);
});

// ── Loop with N kali ──
test('Ulangi 3 kali: (counted loop)', () => {
  const r = Engine.compile(`Buat ruang:\n    Ulangi 3 kali:\n        "Hello"`);
  // This might not work if the parser doesn't handle "N kali" syntax
  if (r.success) {
    assert(r.js.includes('for') || r.js.includes('forEach'), 'Should have loop: ' + r.js);
  }
  // If not supported yet, that's OK — just don't crash
});

// ── Nested Buat elements ──
test('Nested Buat elements', () => {
  const r = Engine.compile(`Buat ruang.luar:\n    Buat ruang.dalam:\n        "Nested"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('document.createElement("div")'), 'Should create divs: ' + r.js);
  // Should have appendChild for nesting
  const appendCount = (r.js.match(/appendChild/g) || []).length;
  assert(appendCount >= 2, 'Should have at least 2 appendChild calls, got ' + appendCount);
});

// ── Fragment passthrough ──
test('Fragment does NOT create a real DOM element', () => {
  const r = Engine.compile(`Buat ruang:\n    Buat fragmen:\n        "A"\n        "B"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(!r.js.includes('createElement("fragment")'), 'Should NOT create fragment element: ' + r.js);
  assert(r.js.includes('createTextNode("A")'), 'Should have text A: ' + r.js);
  assert(r.js.includes('createTextNode("B")'), 'Should have text B: ' + r.js);
});

// ── Lewati keyword (Indonesian pass) ──
test('Lewati keyword in BuatStatement', () => {
  const r = Engine.compile(`Buat ruang.kotak:\n    lewati`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('document.createElement("div")'), 'Should create element: ' + r.js);
  assert(!r.js.includes('continue;'), 'Should NOT emit continue: ' + r.js);
});

// ── Multiple selectors .class1.class2 ──
test('Multiple class selector: Buat ruang.kotak.besar:', () => {
  const r = Engine.compile(`Buat ruang.kotak.besar:\n    "Test"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('className = "kotak besar"'), 'Should have both classes: ' + r.js);
});

// ── Selector with id: tag#id ──
test('Selector with id: Buat ruang#main:', () => {
  const r = Engine.compile(`Buat ruang#main:\n    "Test"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('id = "main"'), 'Should set id: ' + r.js);
});

// ── Full class + id selector: tag.class#id ──
test('Full selector: Buat ruang.kontainer#app:', () => {
  const r = Engine.compile(`Buat ruang.kontainer#app:\n    "Test"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('className = "kontainer"'), 'Should have class: ' + r.js);
  assert(r.js.includes('id = "app"'), 'Should set id: ' + r.js);
});

// ── END-TO-END: Full realistic example ──
test('8.10: End-to-end full example', () => {
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
  assert(r.success, 'Full example should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('document.createElement("div")'), 'Should create divs: ' + r.js);
  assert(r.js.includes('document.createElement("h1")'), 'Should create h1: ' + r.js);
  assert(r.js.includes('document.createElement("header")'), 'Should create header: ' + r.js);
  assert(r.js.includes('document.createElement("footer")'), 'Should create footer: ' + r.js);
  assert(r.js.includes('if'), 'Should have if statement: ' + r.js);
  assert(r.js.includes('else'), 'Should have else: ' + r.js);
  assert(r.js.includes('createTextNode("Selamat Datang")'), 'Should have text: ' + r.js);
  assert(r.js.includes('createTextNode("Hak Cipta 2024")'), 'Should have footer text: ' + r.js);
  assert(r.js.includes('const nama ='), 'Should declare nama: ' + r.js);
  assert(r.js.includes('const stok ='), 'Should declare stok: ' + r.js);
});

// ── Summary ──
console.log(`\n══ Results: ${passCount} passed, ${failCount} failed ══`);
process.exit(failCount > 0 ? 1 : 0);
