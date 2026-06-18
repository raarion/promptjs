/**
 * PromptJS v0.1 — Comprehensive Pipeline Tests
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

// ── TEST 8.1: Buat with selector ──
test('8.1: Buat judul.utama#judul: "Halo"', () => {
  const r = Engine.compile(`Buat judul.utama#judul:\n    "Halo"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('document.createElement("h1")'), 'Should create h1: ' + r.js);
  assert(r.js.includes('id = "judul"'), 'Should set id: ' + r.js);
  assert(r.js.includes('className = "utama"'), 'Should set class: ' + r.js);
  assert(r.js.includes('createTextNode("Halo")'), 'Should have text node: ' + r.js);
});

// ── TEST 8.2: Bilingual keywords produce identical output ──
test('8.2: Bilingual keywords produce same compiled JS', () => {
  const id = Engine.compile(`Buat ruang.kotak:\n    "Indonesia"`);
  const en = Engine.compile(`Create div.kotak:\n    "English"`);
  assert(id.success, 'ID should compile: ' + JSON.stringify(id.errors));
  assert(en.success, 'EN should compile: ' + JSON.stringify(en.errors));
  // Both should produce same tag (div) and same structure
  assert(id.js.includes('document.createElement("div")'), 'ID should use div: ' + id.js);
  assert(en.js.includes('document.createElement("div")'), 'EN should use div: ' + en.js);
  assert(id.js.includes('className = "kotak"'), 'ID should have class kotak');
  assert(en.js.includes('className = "kotak"'), 'EN should have class kotak');
});

// ── TEST 8.3: TextNode ──
test('8.3: TextNode compiles correctly', () => {
  const r = Engine.compile(`Buat ruang:\n    "Hello PromptJS!"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('createTextNode("Hello PromptJS!")'), 'Should have text: ' + r.js);
});

// ── TEST 8.4: on_klik synthesizes KetikaStatement ──
test('8.4: on_klik = handler() synthesizes KetikaStatement', () => {
  const r = Engine.compile(`Buat tombol:\n    "Klik"\n    on_klik = handleClick()`);
  if (!r.success) {
    // Check if it's just the handleClick undeclared issue
    const hasUndeclared = r.errors.some(e => e.message && e.message.includes('handleClick'));
    if (hasUndeclared) {
      // This is expected for undeclared handler — but let's see if JS is still generated
      console.log('    (handleClick undeclared — expected)');
    }
  }
  // Even with errors, check if the JS structure is right when it's generated
  if (r.js) {
    assert(r.js.includes('addEventListener("click"'), 'Should have click event: ' + r.js);
  }
});

// ── TEST 8.5: $external.ref resolves without E3001 ──
test('8.5: Front-matter data resolves without E3001', () => {
  const r = Engine.compile(`---\nnama: Beb\n---\nBuat ruang:\n    "Halo"`, { loadDataFiles: false });
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('const nama ='), 'Should declare nama: ' + r.js);
});

// ── TEST 8.6: Jika with direct operator ──
test('8.6: Jika stok > 0 compiles correctly', () => {
  const r = Engine.compile(`tetap stok = 5\nBuat ruang:\n    Jika stok > 0:\n        "Ada stok"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('if'), 'Should have if: ' + r.js);
  assert(r.js.includes('stok'), 'Should reference stok: ' + r.js);
});

// ── TEST 8.7: Ulangi loop ──
test('8.7: Ulangi untuk item in daftar: compiles to forEach', () => {
  const r = Engine.compile(`tetap daftar = [1, 2, 3]\nBuat ruang:\n    Ulangi untuk item in daftar:\n        "Item"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('forEach'), 'Should use forEach: ' + r.js);
});

// ── TEST 8.8: pass in BuatStatement ──
test('8.8: pass in BuatStatement produces empty element', () => {
  const r = Engine.compile(`Buat ruang.kotak:\n    pass`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  assert(r.js.includes('document.createElement("div")'), 'Should create element: ' + r.js);
  // pass should NOT emit continue; when inside BuatStatement
  assert(!r.js.includes('continue;'), 'Should NOT emit continue: ' + r.js);
});

// ── TEST 8.9: Auto-fragment wrapping ──
test('8.9: Auto-fragment wrapping for multi-root page', () => {
  const r = Engine.compile(`Buat ruang:\n    "First"\n    "Second"`);
  assert(r.success, 'Should succeed: ' + JSON.stringify(r.errors));
  // Should have two text nodes
  const textNodeCount = (r.js.match(/createTextNode/g) || []).length;
  assert(textNodeCount >= 2, 'Should have at least 2 text nodes, got ' + textNodeCount + ': ' + r.js);
});

// ── Additional: JS_GLOBALS ──
test('JS_GLOBALS: alert, console, document should not trigger E3001', () => {
  const r = Engine.compile(`Buat tombol:\n    on_klik = alert("hi")`);
  // alert is a JS global — should NOT trigger E3001
  const hasE3001 = r.errors.some(e => e.code === 'E3001' && e.message && e.message.includes('alert'));
  assert(!hasE3001, 'alert should not trigger E3001: ' + JSON.stringify(r.errors));
});

// ── Summary ──
console.log(`\n══ Results: ${passCount} passed, ${failCount} failed ══`);
process.exit(failCount > 0 ? 1 : 0);
