// @ts-check
/**
 * v8 — HARI-1 (2026-07-04) PromptJS Lab regression suite
 * ============================================================================
 * Locks in the fixes for the consolidated Day-1 findings (backlog v2 FINAL):
 *
 *   BUG-1  muatulang / kembali  → were rejected by the compiler whitelist
 *          (`_validateNodeTypes` allTypes) with E5001 even though the emitter
 *          was ready. Fix: whitelisted MuatUlangStatement/KembaliStatement.
 *   BUG-2  inline attribute selector `Buat tag[attr="v"]:` was swallowed into
 *          the tag name (silent-wrong). Fix: lexer parses `[...]` into
 *          attributes; parser forwards them to emitSafeAttribute.
 *   BUG-4  a space between tag and selector (`tombol #muat`) produced
 *          `createElement("tombol ")` (trailing space + unmapped local tag).
 *          Same root as BUG-2 (selector tokenizer). Fix: tag terminates at
 *          whitespace / `[`.
 *   BUG-3  W4101 false-positive for fetch auto-state (`*_memuat`/`*_galat`).
 *          Fix: resolver marks the bind target + companions as used.
 *   INK-1  E4009 (unknown event) sat in `warnings` with severity 'error'.
 *          Fix: severity is now 'warning' (bucket + severity consistent).
 *   DX-1   E2020 leaked internal token names, had no suggestion, and cascaded
 *          a phantom E3001. Fix: human-readable message + suggestion + cascade
 *          suppression.
 *   DX-2   `dengan transisi` without `dengan kunci` was dropped silently.
 *          Fix: emits W3004 before dropping.
 *   DX-3   duplicate keyed keys were disambiguated silently. Fix: the
 *          `__keyedList` runtime emits a one-time console.warn.
 *
 * Every assertion is driven through the real `compile(src)` engine entry
 * (evidence-based), matching the tester probes.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';

/** @param {any[]} list @param {string} code */
const find = (list, code) => (list || []).find((e) => e.code === code);
/** @param {any[]} list @param {string} code */
const has = (list, code) => (list || []).some((e) => e.code === code);

// ════════════════════════════════════════════════════════════════════════════
// BUG-1 — muatulang / kembali navigation (whitelist gap → E5001)
// ════════════════════════════════════════════════════════════════════════════
describe('v8 BUG-1 — muatulang / kembali navigation', () => {
  const reload = `Halaman Beranda:
  Buat tombol#refresh:
    "Muat ulang"
    Ketika diklik:
      muatulang`;

  const back = `Halaman Beranda:
  Buat tombol#back:
    "Kembali"
    Ketika diklik:
      kembali`;

  it('muatulang compiles (no E5001) and emits window.location.reload();', () => {
    const r = compile(reload);
    expect(r.success).toBe(true);
    expect(has(r.errors, 'E5001')).toBe(false);
    expect(r.js).toContain('window.location.reload();');
  });

  it('kembali compiles (no E5001) and emits window.history.back();', () => {
    const r = compile(back);
    expect(r.success).toBe(true);
    expect(has(r.errors, 'E5001')).toBe(false);
    expect(r.js).toContain('window.history.back();');
  });

  it('English aliases reload / back behave identically', () => {
    const r1 = compile(`Halaman B:
  Buat tombol#r:
    "x"
    Ketika diklik:
      reload`);
    const r2 = compile(`Halaman B:
  Buat tombol#b:
    "x"
    Ketika diklik:
      back`);
    expect(r1.success).toBe(true);
    expect(r1.js).toContain('window.location.reload();');
    expect(r2.success).toBe(true);
    expect(r2.js).toContain('window.history.back();');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BUG-2 — inline attribute selector `Buat tag[attr="v"]:`
// ════════════════════════════════════════════════════════════════════════════
describe('v8 BUG-2 — inline attribute selector', () => {
  it('parses [placeholder="ketik"] into a real attribute, not into the tag', () => {
    const r = compile(`Halaman B:
  Buat masukan[placeholder="ketik"]:`);
    expect(r.success).toBe(true);
    // tag name must be the clean mapped tag, never contain "[" or the raw attr
    expect(r.js).toContain('document.createElement("input")');
    expect(r.js).not.toContain('masukan[');
    expect(r.js).not.toContain('createElement("masukan');
    // attribute must be routed through the safe-attribute path
    expect(r.js).toMatch(/placeholder/);
    expect(r.js).toContain('"placeholder", "ketik"');
  });

  it('AST selector.attributes is populated (was [] before the fix)', () => {
    const r = compile(`Halaman B:
  Buat masukan[placeholder="ketik"]:`);
    const json = JSON.stringify(r.ast);
    expect(json).toContain('"type":"AttributeNode"');
    expect(json).toContain('"key":"placeholder"');
  });

  it('supports id + multiple attributes incl. a valueless attribute', () => {
    const r = compile(`Halaman B:
  Buat masukan#nama[placeholder="ketik"][disabled]:`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("input")');
    expect(r.js).toContain('.id = "nama"');
    expect(r.js).toContain('"placeholder", "ketik"');
    // valueless attribute lowers to an empty-string value
    expect(r.js).toMatch(/"disabled",\s*""/);
  });

  it('single-quoted attribute value is parsed', () => {
    const r = compile(`Halaman B:
  Buat masukan[tipe='teks']:`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"tipe", "teks"');
    expect(r.js).not.toContain('masukan[');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BUG-4 — space between tag and selector (`tombol #muat`)
// ════════════════════════════════════════════════════════════════════════════
describe('v8 BUG-4 — tag/selector whitespace + local tag mapping', () => {
  it('`tombol #muat` maps to <button> with NO trailing space', () => {
    const r = compile(`Halaman B:
  Buat tombol #muat:
    "Muat"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("button")');
    expect(r.js).not.toContain('createElement("tombol ")');
    expect(r.js).not.toContain('createElement("tombol")');
    expect(r.js).toContain('.id = "muat"');
  });

  it('`div #x` yields a clean "div" tag (no trailing space)', () => {
    const r = compile(`Halaman B:
  Buat div #x:
    "x"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    expect(r.js).not.toContain('createElement("div ")');
  });

  it('regression: `tombol#muat` (no space) still maps to <button>', () => {
    const r = compile(`Halaman B:
  Buat tombol#muat:
    "x"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("button")');
    expect(r.js).toContain('.id = "muat"');
  });

  it('regression: `div.a#b` classes + id still resolve correctly', () => {
    const r = compile(`Halaman B:
  Buat div.a#b:
    "x"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    expect(r.js).toContain('.className = "a"');
    expect(r.js).toContain('.id = "b"');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// BUG-3 — W4101 false-positive for fetch auto-state
// ════════════════════════════════════════════════════════════════════════════
describe('v8 BUG-3 — fetch auto-state W4101 false-positive', () => {
  const fetchDemo = `Halaman Beranda:
  data hasil = []
  data hasil_memuat = salah
  data hasil_galat = ""
  Buat tombol #muat:
    "Muat Data"
    on_klik = ambil dari "https://api.test/items" ke hasil`;

  it('does NOT warn W4101 for hasil / hasil_memuat / hasil_galat', () => {
    const r = compile(fetchDemo);
    expect(r.success).toBe(true);
    expect(has(r.warnings, 'W4101')).toBe(false);
    // and no W4102/W4103 dead-write warnings either
    expect(has(r.warnings, 'W4102')).toBe(false);
    expect(has(r.warnings, 'W4103')).toBe(false);
  });

  it('still emits the auto-state codegen (proof the vars are truly used)', () => {
    const r = compile(fetchDemo);
    expect(r.js).toContain('__setState(hasil, __data)');
    expect(r.js).toContain('hasil_memuat');
    expect(r.js).toContain('hasil_galat');
  });

  it('a genuinely unused declaration STILL warns W4101 (fix is scoped)', () => {
    const r = compile(`Halaman B:
  data tidakDipakai = 5
  Buat span: "x"`);
    const w = find(r.warnings, 'W4101');
    expect(w).toBeTruthy();
    expect(w.message).toContain('tidakDipakai');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INK-1 — E4009 severity/bucket consistency
// ════════════════════════════════════════════════════════════════════════════
describe('v8 INK-1 — E4009 unknown-event severity', () => {
  const src = `Halaman B:
  Buat tombol:
    "x"
    Ketika dikedip:
      muatulang`;

  it('E4009 lands in warnings with severity "warning" (not "error")', () => {
    const r = compile(src);
    const w = find(r.warnings, 'E4009');
    expect(w).toBeTruthy();
    expect(w.severity).toBe('warning');
    // must NOT be duplicated into the errors bucket
    expect(has(r.errors, 'E4009')).toBe(false);
  });

  it('unknown event is non-fatal and still binds the listener', () => {
    const r = compile(src);
    expect(r.success).toBe(true);
    expect(r.js).toContain('addEventListener("dikedip"');
  });

  it('a valid event name emits no E4009', () => {
    const r = compile(`Halaman B:
  Buat tombol:
    "x"
    Ketika diklik:
      muatulang`);
    expect(has(r.warnings, 'E4009')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DX-1 — E2020 human-readable message + suggestion + cascade suppression
// ════════════════════════════════════════════════════════════════════════════
describe('v8 DX-1 — E2020 diagnostics', () => {
  const src = `Halaman Beranda:
  Buat tombol:
  Buat span: "x"`;

  it('E2020 no longer leaks the internal token name (TK_BUAT)', () => {
    const r = compile(src);
    const e = find(r.errors, 'E2020');
    expect(e).toBeTruthy();
    expect(e.message).not.toContain('TK_BUAT');
    expect(e.message).not.toMatch(/TK_/);
    // shows the human-facing source text instead
    expect(e.message).toContain('"Buat"');
  });

  it('E2020 carries a non-empty actionable suggestion', () => {
    const r = compile(src);
    const e = find(r.errors, 'E2020');
    expect(e.suggestion).toBeTruthy();
    expect(e.suggestion.length).toBeGreaterThan(0);
  });

  it('the misleading E3001 cascade is suppressed', () => {
    const r = compile(src);
    // Before the fix a phantom `E3001 "span tidak dideklarasikan"` followed.
    expect(has(r.errors, 'E3001')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DX-2 — transition without key emits W3004 (no longer silent)
// ════════════════════════════════════════════════════════════════════════════
describe('v8 DX-2 — transition without key', () => {
  const noKey = `Halaman Papan:
  data items = []
  Buat ul#daftar:
    Ulangi untuk item dari items dengan transisi geser:
      Buat li: item.teks`;

  it('emits W3004 warning explaining the ignored transition', () => {
    const r = compile(noKey);
    expect(r.success).toBe(true);
    const w = find(r.warnings, 'W3004');
    expect(w).toBeTruthy();
    expect(w.severity).toBe('warning');
    expect(w.message).toContain('geser');
    expect(w.suggestion).toContain('dengan kunci');
  });

  it('the transition is still dropped (falls back to non-FLIP render)', () => {
    const r = compile(noKey);
    expect(r.js).not.toContain('__flipList');
  });

  it('WITH a key: transition engages and NO W3004 is emitted', () => {
    const withKey = `Halaman Papan:
  data items = []
  Buat ul#daftar:
    Ulangi untuk item dari items dengan kunci item.id dengan transisi geser:
      Buat li: item.teks`;
    const r = compile(withKey);
    expect(r.success).toBe(true);
    expect(has(r.warnings, 'W3004')).toBe(false);
    expect(r.js).toContain('__flipList');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DX-3 — duplicate keyed key emits a one-time runtime console.warn
// ════════════════════════════════════════════════════════════════════════════
describe('v8 DX-3 — duplicate keyed-key observability', () => {
  const keyed = `Halaman Papan:
  data items = []
  Buat ul#daftar:
    Ulangi untuk item dari items dengan kunci item.id:
      Buat li: item.nama`;

  it('the __keyedList runtime warns once on duplicate-key disambiguation', () => {
    const r = compile(keyed);
    expect(r.success).toBe(true);
    // The runtime helper carries the DX-3 warning + one-time guard.
    expect(r.js).toContain('W-keyed-dup');
    expect(r.js).toContain('__warnedDup');
    // still performs the safe `key__index` disambiguation
    expect(r.js).toContain("rawKey + '__' + i");
  });
});
