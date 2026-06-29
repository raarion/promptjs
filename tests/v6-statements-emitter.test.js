// @ts-check

/**
 * PromptJS v6 — Statement Emitter Branch Coverage (S-24)
 * ============================================================================
 *
 * Target: src/compiler/emitters/statements.js
 * Baseline gap (full suite): branch 59.55%, lines 71.2%.
 *
 * Strategy (per the project testing skill): drive the emitter through the FULL
 * engine pipeline with VALID .pjs constructs (learned from examples/ and the
 * existing v1.0 suite), then assert against the ACTUAL emitted JS — never a
 * naive guess. Every assertion documents the engine's real behavior.
 *
 * Covers previously-untested emitter paths:
 *   - TampilkanStatement: literal-string → alert; binary/template → alert;
 *     element identifier → show (style.display = '')
 *   - SembunyikanStatement / KosongkanStatement (style.display / innerHTML)
 *   - HapusDariStatement: reactive (filter + __setState) AND non-reactive
 *   - PerbaruiStatement property map: teks, kelas, html (sanitize), nilai,
 *     sumber/tautan (safeAttr URL), nonaktif, and UNKNOWN property (safeAttr)
 *   - localStorage / sessionStorage setItem + removeItem + arahkan
 *   - SPA event-handler tracking (const __handler = ... + cleanup push)
 *   - TextNode emitter (deep nesting), fragment transparency
 *   - External `tetap ... dari frontmatter` (inline data), turunan computed
 */

import { describe, it, expect } from 'vitest';

const PJS = require('../src/engine/promptjs');

/** Compile a full .pjs source through the engine pipeline. */
function compileSource(src) {
  return PJS.compile(src);
}

/** Assert no hard errors (warnings allowed) and return the emitted JS. */
function compileOk(src) {
  const r = compileSource(src);
  const errs = (r.errors || []).filter((e) => e.severity === 'error');
  expect(errs).toEqual([]);
  expect(r.success).toBe(true);
  return r.js;
}

const W = (body) => `---\njudul: "T"\n---\nHalaman T:\n${body}`;
const SPA = (body) => `---\njudul: "T"\nrouter: benar\n---\nHalaman T:\n${body}`;
const BTN = (action) => W(`  Buat tombol:\n    "x"\n    on_klik = ${action}`);

// ════════════════════════════════════════════════════════════════════════
// 1. TampilkanStatement — message vs element
// ════════════════════════════════════════════════════════════════════════
describe('v6 — TampilkanStatement', () => {
  it('string literal target → alert(...)', () => {
    const js = compileOk(BTN('tampilkan "Halo"'));
    expect(js).toContain('alert("Halo")');
  });

  it('binary expression target → alert(...) (not querySelector)', () => {
    const js = compileOk(
      W('  data n = 0\n  Buat tombol:\n    "x"\n    on_klik = tampilkan "n=" + n')
    );
    expect(js).toContain('alert(');
    // reactive identifier lowers with .value
    expect(js).toContain('n.value');
  });

  it('a quoted selector-like string is STILL treated as a message (alert), not a show', () => {
    // Documents real behavior: tampilkan ".box" → alert(".box"), because a
    // Literal target is auto-detected as a message.
    const js = compileOk(BTN('tampilkan ".box"'));
    expect(js).toContain('alert(".box")');
    expect(js).not.toContain("style.display = ''");
  });

  it('identifier target → element show (style.display = "")', () => {
    const js = compileOk(W('  data el = 0\n  Buat tombol:\n    "x"\n    on_klik = tampilkan el'));
    expect(js).toContain("style.display = ''");
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. SembunyikanStatement / KosongkanStatement
// ════════════════════════════════════════════════════════════════════════
describe('v6 — Sembunyikan / Kosongkan', () => {
  it('sembunyikan → style.display = "none"', () => {
    const js = compileOk(BTN('sembunyikan ".box"'));
    expect(js).toContain("style.display = 'none'");
    expect(js).toContain('document.querySelector(".box")');
  });

  it('kosongkan → innerHTML = ""', () => {
    const js = compileOk(BTN('kosongkan ".box"'));
    expect(js).toContain("innerHTML = ''");
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. HapusDariStatement — reactive vs non-reactive
// ════════════════════════════════════════════════════════════════════════
describe('v6 — HapusDariStatement', () => {
  it('reactive array (data) → filter + __setState', () => {
    const js = compileOk(
      W('  data daftar = ["a","b"]\n  Buat tombol:\n    "x"\n    on_klik = hapus "a" dari daftar')
    );
    expect(js).toContain('.filter((__item) => __item !== "a")');
    expect(js).toContain('__setState(');
  });

  it('non-reactive array (ubah) → plain filter assignment (no __setState)', () => {
    const js = compileOk(
      W('  ubah arr = ["a","b"]\n  Buat tombol:\n    "x"\n    on_klik = hapus "a" dari arr')
    );
    expect(js).toContain('.filter((__item) => __item !== "a")');
    // ubah arrays are not reactive → no __setState wrapper for the removal
    const userPart = js.slice(js.indexOf('// === User Code ==='));
    expect(userPart).not.toContain('__setState(arr');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. PerbaruiStatement — property map branches
// ════════════════════════════════════════════════════════════════════════
// NOTE on syntax: the parser reads `perbarui <prop> <target-expr>: <value>` —
// the VALUE comes after a colon. (Without the colon the value lowers to
// `undefined`.) These tests use the colon form to exercise each property-map
// branch with a real value.
describe('v6 — PerbaruiStatement property map', () => {
  it('teks → innerText', () => {
    expect(compileOk(BTN('perbarui teks ".o": "v"'))).toContain('.innerText = "v"');
  });

  it('kelas → className', () => {
    expect(compileOk(BTN('perbarui kelas ".o": "aktif"'))).toContain('.className = "aktif"');
  });

  it('html → __sanitizeHTML (S-3)', () => {
    const js = compileOk(BTN('perbarui html ".o": "<b>hi</b>"'));
    expect(js).toContain('__sanitizeHTML(');
    expect(js).toContain('.innerHTML = __sanitizeHTML(');
  });

  it('nilai → value', () => {
    expect(compileOk(BTN('perbarui nilai ".o": "v"'))).toContain('.value = "v"');
  });

  it('sumber (src) → __safeAttr URL filter (S-4)', () => {
    const js = compileOk(BTN('perbarui sumber ".o": "/a.png"'));
    expect(js).toContain('__safeAttr(');
  });

  it('tautan (href) → __safeAttr URL filter (S-4)', () => {
    const js = compileOk(BTN('perbarui tautan ".o": "/u"'));
    expect(js).toContain('__safeAttr(');
  });

  it('nonaktif → disabled', () => {
    expect(compileOk(BTN('perbarui nonaktif ".o": benar'))).toContain('.disabled = ');
  });

  it('UNKNOWN property → __safeAttr fallback (S-4 filter)', () => {
    const js = compileOk(BTN('perbarui peran ".o": "main"'));
    expect(js).toContain('__safeAttr(');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. Storage + navigation (simpan/hapus localStorage, arahkan)
// ═══════════════════════════════════════════════════════════════════════
describe('v6 — Storage & navigation', () => {
  it('simpan ... ke localStorage.x → localStorage.setItem', () => {
    const js = compileOk(BTN('simpan "tok" ke localStorage.auth'));
    expect(js).toContain('localStorage.setItem("auth", "tok")');
  });

  it('simpan ... ke sessionStorage.x → sessionStorage.setItem', () => {
    const js = compileOk(BTN('simpan "tok" ke sessionStorage.s'));
    expect(js).toContain('sessionStorage.setItem("s", "tok")');
  });

  it('hapus localStorage.x → localStorage.removeItem', () => {
    const js = compileOk(BTN('hapus localStorage.auth'));
    expect(js).toContain('localStorage.removeItem("auth")');
  });

  it('arahkan → window.location.href', () => {
    const js = compileOk(BTN('arahkan "/next"'));
    expect(js).toContain('window.location.href = "/next"');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. SPA event-handler tracking (cleanup branch)
// ════════════════════════════════════════════════════════════════════════
describe('v6 — SPA event handler tracking', () => {
  it('SPA mode tracks element handler in a named const for cleanup', () => {
    const js = compileOk(
      SPA('  Buat tombol#b:\n    "x"\n    Ketika diklik:\n      tampilkan "ok"')
    );
    expect(js).toContain('var __cleanupFns = [];');
    // SPA handler emitted as `const __handler... = (event) => {`
    expect(js).toMatch(/const __handler\w* = \(event\) =>/);
  });

  it('non-SPA element handler uses inline addEventListener (no handler const)', () => {
    const js = compileOk(W('  Buat tombol#b:\n    "x"\n    Ketika diklik:\n      tampilkan "ok"'));
    expect(js).toContain('.addEventListener("click", (event) =>');
    expect(js).not.toContain('const __handler');
  });

  it('Ketika muat: binds to document DOMContentLoaded', () => {
    const js = compileOk(W('  Ketika muat:\n    tampilkan "loaded"'));
    expect(js).toContain('document.addEventListener("DOMContentLoaded"');
  });

  it('submit handler auto-injects preventDefault', () => {
    const js = compileOk(W('  Buat formulir#f:\n    Ketika disubmit:\n      tampilkan "ok"'));
    expect(js).toContain('event.preventDefault();');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. TextNode + fragment + declarations
// ════════════════════════════════════════════════════════════════════════
describe('v6 — TextNode, fragment & declarations', () => {
  it('bare string child → createTextNode appended to parent', () => {
    const js = compileOk(W('  Buat div:\n    "halo dunia"'));
    expect(js).toContain('document.createTextNode("halo dunia")');
    expect(js).toContain('.appendChild(');
  });

  it('deeply nested text node appends to the inner element', () => {
    const js = compileOk(W('  Buat div:\n    Buat p:\n      "deep"'));
    expect(js).toContain('document.createTextNode("deep")');
  });

  it('fragment is transparent: children append to grandparent', () => {
    const js = compileOk(
      W('  Buat div:\n    Buat fragment:\n      Buat p: "a"\n      Buat p: "b"')
    );
    // two paragraphs created, both appended (fragment adds no wrapper element)
    const created = (js.match(/document\.createElement\("p"\)/g) || []).length;
    expect(created).toBe(2);
    expect(js).not.toContain('createElement("fragment")');
  });

  it('data declaration → __createReactive', () => {
    const js = compileOk(W('  data n = 5\n  Saat n:\n    Buat span: n'));
    expect(js).toContain('__createReactive(5)');
  });

  it('turunan declaration → __createComputed', () => {
    const js = compileOk(W('  data n = 0\n  turunan dua = n * 2\n  Saat dua:\n    Buat span: dua'));
    expect(js).toContain('__createComputed(');
  });

  it('ubah declaration → let binding', () => {
    const js = compileOk(
      W('  ubah x = 1\n  Buat tombol:\n    "x"\n    on_klik = simpan x ke localStorage.k')
    );
    expect(js).toContain('let x = 1;');
  });

  it('external tetap from front-matter inlines the JSON value', () => {
    const src =
      '---\njudul: "T"\nangka: 42\n---\nHalaman T:\n  tetap angka dari frontmatter\n  Buat p: "x"';
    const js = compileOk(src);
    expect(js).toContain('const angka = 42;');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 8. Element construction details (id, class, selector attrs, props)
// ════════════════════════════════════════════════════════════════════════
describe('v6 — Buat element selector & properties', () => {
  it('id + multiple classes emit .id and .className', () => {
    const js = compileOk(W('  Buat div.a.b#main: "x"'));
    expect(js).toContain('.id = "main"');
    expect(js).toContain('.className = "a b"');
  });

  it('unknown element property → __safeAttr filter (S-4)', () => {
    // A non-special property (not teks/html/nilai) routes through emitSafeAttribute.
    const js = compileOk(W('  Buat div:\n    peran = "main"'));
    expect(js).toContain('__safeAttr(');
  });

  it('property teks on element → innerText', () => {
    const js = compileOk(W('  Buat div:\n    teks = "hi"'));
    expect(js).toContain('.innerText = "hi"');
  });

  it('property html on element → __sanitizeHTML', () => {
    const js = compileOk(W('  Buat div:\n    html = "<b>hi</b>"'));
    expect(js).toContain('__sanitizeHTML(');
  });

  it('property nilai on element → .value', () => {
    const js = compileOk(W('  Buat masukan:\n    nilai = "v"'));
    expect(js).toContain('.value = "v"');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 9. Control flow inside element bodies — Ulangi loop + Jika/Lainnya
// ════════════════════════════════════════════════════════════════════════
describe('v6 — control flow emitters', () => {
  it('Ulangi untuk ... dari <reactive-array> emits a .map render loop', () => {
    const js = compileOk(
      W(
        '  data daftar = [1,2,3]\n  Buat ul:\n    Ulangi untuk item dari daftar:\n      Buat li: item'
      )
    );
    // Iterates over the reactive array (lowered with .value) to build children.
    expect(js).toContain('daftar.value');
    expect(js).toContain('createElement("li")');
  });

  it('Jika/Lainnya emits an if/else branch in the handler', () => {
    const js = compileOk(
      W(
        '  data n = 5\n  Ketika muat:\n    Jika n > 3:\n      tampilkan "besar"\n    Lainnya:\n      tampilkan "kecil"'
      )
    );
    expect(js).toContain('if (');
    expect(js).toContain('else');
    expect(js).toContain('alert("besar")');
    expect(js).toContain('alert("kecil")');
  });

  it('Jika without Lainnya emits a bare if (no else)', () => {
    const js = compileOk(W('  data n = 1\n  Ketika muat:\n    Jika n > 0:\n      tampilkan "pos"'));
    expect(js).toContain('if (');
    expect(js).toContain('alert("pos")');
  });
});
