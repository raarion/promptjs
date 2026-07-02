/**
 * PromptJS — Regression: inline fetch as an event action.
 *
 * New feature (closes a documented gap: previously fetch was ONLY available as
 * a nested block — `Ketika diklik:` newline `Ambil dari "url":` — so wiring a
 * fetch straight onto an event required a nested block or vanilla JS). This adds
 * the inline form:
 *
 *   on_klik = ambil dari "url"                (fetch-and-forget)
 *   on_klik = ambil dari "url" ke items       (bind result + auto loading/error)
 *   on_klik = ambil dari "url": berhasil: ...  (inline, with branches)
 *   on_klik = fetch from "url" ke items        (English)
 *
 * Auto-state: when bound with `ke <target>`, the emitter drives optional
 * companion reactive vars `<target>_memuat` (loading bool) and `<target>_galat`
 * (error). Every write is `typeof`-guarded, so undeclared flags are a harmless
 * no-op — declaring `data items_memuat = salah` opts in.
 *
 * Implementation: parser detects `ambil`/`fetch` + `dari`/`from` after `=` and
 * parses the statement (not an expression); the block body `:`/branches became
 * optional so the bare form parses; emitter registers `AmbilLuarStatement` as a
 * valid Ketika action, emits loading/error/bind state, and — critically —
 * pulls in the `__setState` helper (the bind form has no nested SimpanStatement
 * to register it, which would otherwise ship a ReferenceError at runtime).
 *
 * These tests lock: inline compiles (no E2020), emits async fetch, both
 * languages, branch/bare/bind variants, auto-state ordering, the `__setState`
 * helper is present, emitted JS is valid, and the classic block form is
 * unchanged (zero regression).
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/** Compile a page whose button wires an inline fetch, return the compile result. */
function compilePage(onClickLine, extraData = '') {
  const src =
    'Halaman P:\n' +
    '    data items = []\n' +
    extraData +
    '    Buat tombol #b: "Load"\n' +
    '        ' +
    onClickLine +
    '\n';
  return Engine.compile(src);
}

describe('inline fetch as event action — parsing', () => {
  it('bare inline `on_klik = ambil dari "url"` compiles (no E2020)', () => {
    const r = compilePage('on_klik = ambil dari "https://api.com/data"');
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('English `on_klik = fetch from "url"` compiles', () => {
    const r = compilePage('on_klik = fetch from "https://api.com/data"');
    expect(r.success).toBe(true);
  });

  it('inline with branches compiles and emits both success + error paths', () => {
    const src =
      'Halaman P:\n' +
      '    data items = []\n' +
      '    Buat tombol #b: "Load"\n' +
      '        on_klik = ambil dari "https://api.com/data":\n' +
      '            berhasil:\n' +
      '                simpan __data ke items\n' +
      '            gagal:\n' +
      '                tampilkan "err"\n';
    const r = Engine.compile(src);
    expect(r.success).toBe(true);
    expect(r.js).toContain('__setState(items, __data)');
    expect(r.js).toContain('alert("err")');
  });

  it('the legacy DOM form is NOT hijacked as an event action', () => {
    // `ambil nilai dari X` (TK_IDENT after ambil, not `dari`) must still route
    // to the expression path — it is not a valid external fetch here.
    const r = compilePage('on_klik = ambil nilai dari "#x"');
    // Either an error or a non-fetch emission; must NOT emit an async fetch IIFE.
    expect(r.js || '').not.toContain('await fetch(');
  });
});

describe('inline fetch as event action — emission', () => {
  it('emits an async fetch IIFE inside the click handler', () => {
    const r = compilePage('on_klik = ambil dari "https://api.com/data"');
    expect(r.js).toContain('addEventListener("click"');
    expect(r.js).toContain('await fetch("https://api.com/data"');
    expect(r.js).toContain('await __response.json()');
  });

  it('emitted JS is syntactically valid (parses via new Function)', () => {
    const r = compilePage('on_klik = ambil dari "https://api.com/data"');
    expect(() => new Function(r.js)).not.toThrow();
  });
});

describe('inline fetch with `ke` binding — auto loading/error state', () => {
  const bound = () =>
    compilePage(
      'on_klik = ambil dari "https://api.com/data" ke items',
      '    data items_memuat = salah\n    data items_galat = ""\n'
    );

  it('binds fetched data to the target on success', () => {
    const r = bound();
    expect(r.success).toBe(true);
    expect(r.js).toContain('__setState(items, __data)');
  });

  it('sets loading=true before the request and false in finally', () => {
    const js = bound().js;
    expect(js).toContain('__setState(items_memuat, true)');
    expect(js).toContain('__setState(items_memuat, false)');
    // loading-true must appear before the fetch call
    expect(js.indexOf('__setState(items_memuat, true)')).toBeLessThan(js.indexOf('await fetch('));
  });

  it('records the error into <target>_galat and clears it on retry', () => {
    const js = bound().js;
    expect(js).toContain('__setState(items_galat, null)'); // cleared before request
    expect(js).toMatch(/__setState\(items_galat, __error\.message/); // set on catch
  });

  it('every auto-state write is typeof-guarded (undeclared flags = no-op)', () => {
    const js = bound().js;
    expect(js).toContain('if (typeof items_memuat !== "undefined")');
    expect(js).toContain('if (typeof items_galat !== "undefined")');
  });

  it('CRITICAL: pulls the __setState helper into the bundle (no runtime ReferenceError)', () => {
    // The bind form has no nested SimpanStatement to register __setState; the
    // emitter must add it explicitly, else the output references an undefined
    // function at runtime. This test guards that exact regression.
    const js = bound().js;
    expect(js).toContain('function __setState');
  });

  it('English `fetch from ... ke` also drives auto-state', () => {
    const r = compilePage(
      'on_klik = fetch from "https://api.com/x" ke items',
      '    data items_memuat = salah\n'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('__setState(items, __data)');
    expect(r.js).toContain('__setState(items_memuat, true)');
  });

  it('emitted JS with binding is syntactically valid', () => {
    expect(() => new Function(bound().js)).not.toThrow();
  });
});

describe('no regression to the classic block-form fetch', () => {
  it('`Ketika diklik:` newline `Ambil dari "url":` still compiles and emits fetch', () => {
    const src =
      'Halaman P:\n' +
      '    data items = []\n' +
      '    Buat tombol #b: "Load"\n' +
      '        Ketika diklik:\n' +
      '            Ambil dari "https://api.com/data":\n' +
      '                berhasil:\n' +
      '                    simpan __data ke items\n';
    const r = Engine.compile(src);
    expect(r.success).toBe(true);
    expect(r.js).toContain('await fetch("https://api.com/data"');
    expect(r.js).toContain('__setState(items, __data)');
  });

  it('top-level block `Ambil dari` (outside an event) is unchanged', () => {
    const src =
      'Halaman P:\n' +
      '    data items = []\n' +
      '    Ambil dari "https://api.com/data":\n' +
      '        berhasil:\n' +
      '            simpan __data ke items\n';
    const r = Engine.compile(src);
    expect(r.success).toBe(true);
    expect(r.js).toContain('await fetch("https://api.com/data"');
  });
});
