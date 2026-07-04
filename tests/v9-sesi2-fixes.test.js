// @ts-check
/**
 * v9 — SESI-2 (2026-07-04) PromptJS Lab regression suite
 * ============================================================================
 * Locks in the fixes for the consolidated SESI-2 findings (backlog sesi2 v2),
 * verified end-to-end via the real `compile(src)` engine entry (evidence-based,
 * Node >=22). Each finding below is pinned by BOTH the codegen it must produce
 * AND the diagnostics it must (or must not) raise.
 *
 *   S2-BUG-1  `kurangi <n> dari <t>` mis-compiled to `__setState(document,
 *             1 - 1)` — the statement-position parser (`_parseSimpanStatement`)
 *             never handled the `dari` form, so it read the VALUE as the target
 *             and silently dropped `dari <t>`. Fix: parse `kurangi <value> dari
 *             <target>` → target after `dari`, value before it. Decrement form
 *             `kurangi <t>` and `kurangi <t> ke <v>` still work.
 *   S2-BUG-1c (derived) `tambahkan <n> ke <t>` on a reactive scalar emitted
 *             `__setState(hitung, hitung + 3)` — the read side wasn't unwrapped
 *             to `.value`, so a Proxy coerced to "[object Object]3" at runtime.
 *             Fix: read side uses `<name>.value`.
 *   S2-INK-1  a self-referential derived value `turunan c = c + a` passed
 *             silently (success:true, no E4201) because `buildDependencyGraph`
 *             dropped the self edge (`ref.symbol.id === sym.id` guard). Fix:
 *             record the self edge (deduped) so `detectCycles` reports E4201.
 *   S2-DX-1   `tampilkan "#box"` treats the string as an alert MESSAGE while
 *             `sembunyikan`/`kosongkan` operate on an ELEMENT via selector —
 *             a silent footgun. Fix: emit W3005 (non-fatal) when `tampilkan`
 *             gets a bare selector-looking string literal.
 *   knowledge W-keyed-dup is now registered in error-codes (formal, searchable),
 *             documented as a RUNTIME warning (not a compile `warnings[]` entry).
 *
 * Environment note: authored/verified on Node v22.14.0 (repo engines >=22).
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';
import * as ErrorCodes from '../src/parser/error-codes.js';

/** @param {any[]} list @param {string} code */
const find = (list, code) => (list || []).find((e) => e.code === code);
/** @param {any[]} list @param {string} code */
const has = (list, code) => (list || []).some((e) => e.code === code);
/** @param {any} r @returns {string} */
const js = (r) => /** @type {any} */ (r).js || '';

// ═══════════════════════════════════════════════════════════════════════════
// S2-BUG-1 — `kurangi <n> dari <t>` target/value mapping
// ═══════════════════════════════════════════════════════════════════════════
describe('v9 S2-BUG-1 — kurangi/tambahkan target mapping', () => {
  const wrap = (stmt) => `Halaman B:
  data hitung = 10
  Buat tombol #a:
    "x"
    Ketika diklik:
      ${stmt}`;

  it('`kurangi 1 dari hitung` → __setState(hitung, hitung.value - 1) (was: document, 1 - 1)', () => {
    const r = compile(wrap('kurangi 1 dari hitung'));
    expect(r.success).toBe(true);
    expect(js(r)).toContain('__setState(hitung, hitung.value - 1);');
    // The old bug wrote to `document` and used a literal LHS — must be gone.
    expect(js(r)).not.toContain('__setState(document,');
    expect(js(r)).not.toMatch(/__setState\([^,]*,\s*1 - 1\)/);
  });

  it('`kurangi n dari hitung` (expression value) → __setState(hitung, hitung.value - n.value)', () => {
    const src = `Halaman B:
  data hitung = 10
  data n = 2
  Buat tombol #a:
    "x"
    Ketika diklik:
      kurangi n dari hitung`;
    const r = compile(src);
    expect(r.success).toBe(true);
    expect(js(r)).toContain('__setState(hitung, hitung.value - n.value);');
    expect(js(r)).not.toContain('__setState(n,');
  });

  it('decrement form `kurangi hitung` unchanged → __setState(hitung, hitung.value - 1)', () => {
    const r = compile(wrap('kurangi hitung'));
    expect(r.success).toBe(true);
    expect(js(r)).toContain('__setState(hitung, hitung.value - 1);');
  });

  it('target-first `kurangi hitung ke 5` subtracts value → __setState(hitung, hitung.value - 5)', () => {
    // The `ke` form is target-FIRST (`kurangi <target> ke <value>`), the mirror
    // of the documented value-first `dari` form. Both must land on `hitung`.
    const r = compile(wrap('kurangi hitung ke 5'));
    expect(r.success).toBe(true);
    expect(js(r)).toContain('__setState(hitung, hitung.value - 5);');
    expect(js(r)).not.toContain('__setState(document,');
  });

  it('mapping bug is silent-wrong: no error/warning masked the miscompile before', () => {
    // The finding was dangerous precisely BECAUSE it succeeded. We assert the
    // corrected codegen; there must be no E-level diagnostic on the happy path.
    const r = compile(wrap('kurangi 1 dari hitung'));
    expect(has(r.errors, 'E5001')).toBe(false);
    expect((r.errors || []).length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// S2-BUG-1c — reactive-scalar `tambahkan <n> ke <t>` must unwrap `.value`
// ═══════════════════════════════════════════════════════════════════════════
describe('v9 S2-BUG-1c — tambahkan reactive scalar .value unwrap', () => {
  const wrap = (stmt) => `Halaman B:
  data hitung = 10
  Buat tombol #a:
    "x"
    Ketika diklik:
      ${stmt}
      Buat span: hitung`;

  it('`tambahkan 3 ke hitung` → __setState(hitung, hitung.value + 3) (was: hitung + 3)', () => {
    const r = compile(wrap('tambahkan 3 ke hitung'));
    expect(r.success).toBe(true);
    expect(js(r)).toContain('__setState(hitung, hitung.value + 3);');
    // Raw Proxy + literal would coerce to "[object Object]3" — must not appear.
    expect(js(r)).not.toMatch(/__setState\(hitung,\s*hitung \+ 3\)/);
  });

  it('array target `tambahkan` still uses push+spread (not the scalar path)', () => {
    const src = `Halaman B:
  data daftar = []
  Buat tombol #a:
    "x"
    Ketika diklik:
      tambahkan 1 ke daftar
      Buat span: daftar`;
    const r = compile(src);
    expect(r.success).toBe(true);
    expect(js(r)).toContain('.value.push(1)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// S2-INK-1 — self-cycle `turunan c = c + a` → E4201
// ═══════════════════════════════════════════════════════════════════════════
describe('v9 S2-INK-1 — self-referential turunan cycle detection', () => {
  it('`turunan c = c tambah a` now raises E4201 (was: success:true, silent)', () => {
    const r = compile(`Halaman B:
  data a = 1
  turunan c = c tambah a`);
    expect(r.success).toBe(false);
    const e = find(r.errors, 'E4201');
    expect(e).toBeTruthy();
    expect(e.message).toMatch(/c -> c/);
  });

  it('self-cycle via repeated ref `turunan c = c + c` yields exactly one E4201 (deduped edge)', () => {
    const r = compile(`Halaman B:
  data a = 1
  turunan c = c tambah c`);
    expect(r.success).toBe(false);
    const cyc = (r.errors || []).filter((e) => e.code === 'E4201');
    expect(cyc.length).toBe(1);
  });

  it('non-cyclic chain `c = a + 1`, `d = c + 1` stays clean (no false E4201)', () => {
    const r = compile(`Halaman B:
  data a = 1
  turunan c = a tambah 1
  turunan d = c tambah 1`);
    expect(r.success).toBe(true);
    expect(has(r.errors, 'E4201')).toBe(false);
  });

  it('mutual forward-ref still surfaces a diagnostic (E3001 today, not a silent pass)', () => {
    const r = compile(`Halaman B:
  data a = 1
  turunan d = c tambah a
  turunan c = d tambah a`);
    expect(r.success).toBe(false);
    // Documented limitation: resolver forward-ref guard fires E3001 before the
    // analyzer's E4201 — the important property is it does NOT pass silently.
    expect((r.errors || []).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// S2-DX-1 — `tampilkan "<selector>"` footgun warning (W3005)
// ═══════════════════════════════════════════════════════════════════════════
describe('v9 S2-DX-1 — tampilkan selector-string footgun (W3005)', () => {
  const wrap = (stmt) => `Halaman B:
  Buat tombol #t:
    "go"
    Ketika diklik:
      ${stmt}`;

  it('`tampilkan "#box"` warns W3005 and still emits alert (non-fatal)', () => {
    const r = compile(wrap('tampilkan "#box"'));
    expect(r.success).toBe(true);
    const w = find(r.warnings, 'W3005');
    expect(w).toBeTruthy();
    expect(w.message).toContain('#box');
    expect(w.suggestion).toMatch(/tampilkan #box/);
    expect(js(r)).toContain('alert("#box")');
  });

  it('`tampilkan ".panel"` (class selector) also warns W3005', () => {
    const r = compile(wrap('tampilkan ".panel"'));
    expect(has(r.warnings, 'W3005')).toBe(true);
  });

  it('a genuine message `tampilkan "Halo dunia"` does NOT warn (no false positive)', () => {
    const r = compile(wrap('tampilkan "Halo dunia"'));
    expect(has(r.warnings, 'W3005')).toBe(false);
    expect(js(r)).toContain('alert("Halo dunia")');
  });

  it('element ops `sembunyikan "#box"` operate on the element, no W3005', () => {
    const r = compile(wrap('sembunyikan "#box"'));
    expect(has(r.warnings, 'W3005')).toBe(false);
    expect(js(r)).toContain('querySelector("#box")');
    expect(js(r)).toContain("style.display = 'none'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Knowledge-gap — W-keyed-dup formally registered (runtime warning, not compile)
// ═══════════════════════════════════════════════════════════════════════════
describe('v9 knowledge — W-keyed-dup registered + W3005 code table', () => {
  it('W-keyed-dup + W3005 codes exist with messages/suggestions', () => {
    const codes = /** @type {any} */ (ErrorCodes).CODES || ErrorCodes;
    const messages = /** @type {any} */ (ErrorCodes).ERROR_MESSAGES || {};
    expect(codes['W-keyed-dup']).toBe('W-keyed-dup');
    expect(codes.W3005).toBe('W3005');
    expect(typeof messages['W-keyed-dup']).toBe('string');
    expect(typeof messages.W3005).toBe('string');
  });

  it('keyed-dup is NOT a compile warning (compiler cannot see runtime data)', () => {
    // Duplicate keys are only knowable from runtime DATA, so a keyed list that
    // COMPILES fine must have an empty compile warnings[] for W-keyed-dup.
    const r = compile(`Halaman B:
  data item = [1, 2]
  Ulangi untuk x dari item:
    Buat span dengan kunci x: x`);
    expect(has(r.warnings, 'W-keyed-dup')).toBe(false);
  });
});
