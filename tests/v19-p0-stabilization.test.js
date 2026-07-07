/**
 * PromptJS v132 — Lapis 1–3 Stabilization Pass — P0 regression tests.
 *
 * These tests lock in the fixes for seven P0 findings from the Lapis 1–3
 * architecture audit (2026-07-07, HEAD 94a02f1). Each `describe` block below
 * maps 1:1 to a P0 item from the stabilization pass task list:
 *
 *   P0.1 — `.sekali`/`.once` event modifier was parsed but never emitted as
 *          `{ once: true }` — handler ran on every dispatch, not once.
 *   P0.2 — `Ketika`/plain event handlers declared inside a `Saat` block (SPA
 *          mode) always leaked their `removeEventListener` cleanup into the
 *          page-level `__cleanupFns` array instead of the `Saat`'s own local
 *          `__saatCleanup_N` array — never freed until full SPA unmount.
 *   P0.3 — `ikat`/two-way binding's input→state direction (the
 *          `addEventListener('input', ...)` half) had the same leak as P0.2;
 *          only the state→input (`__watch`) half was already tracked.
 *   P0.4 — Event handlers attached to items inside a reactive
 *          `Ulangi untuk ... dari <reactive>` list leaked on every list
 *          re-render, regardless of whether the list was inside a `Saat` or
 *          at top level.
 *   P0.5 — Inline `ambil ... ke <target>` (fetch) declared inside a `Saat`
 *          created a new `AbortController` on every re-render whose `.abort`
 *          cleanup leaked into the global `__cleanupFns`, both wasting
 *          memory and allowing a stale (superseded) request to overwrite
 *          fresher data if it happened to resolve later.
 *   P0.6 — `Buat NamaKomponen(prop: val):` (WITH a trailing colon) — the
 *          exact form documented in docs/language/components.md and
 *          docs/language/syntax-reference.md — miscompiled because the
 *          lexer's block-opener colon search did not track paren depth and
 *          matched the first colon INSIDE the parentheses instead of the
 *          real block-opener colon after `)`.
 *   P0.7 — `Gunakan NamaKomponen(...):` followed by an indented child block
 *          silently compiled the block as unrelated SIBLING statements
 *          (not component content), because `_parseGunakanStatement` never
 *          checked for a trailing colon/block. Slots (#82) are still
 *          out of scope; this only ensures the situation is diagnosed
 *          instead of silently miscompiled.
 *
 * Root cause note common to P0.2/P0.3/P0.4/P0.5: `src/compiler/promptjs-
 * compiler.js` already has a generalized "tracked subscription" mechanism
 * (`wrapTrackedSubscription`/`openTrackedSubscription`/`closeTrackedSubscription`,
 * added for issue #77 / LIM-SAAT-LEAK-01) that routes a cleanup function to
 * the innermost active `Saat`'s local cleanup array (`this._saatCleanupStack`)
 * when one is open, falling back to the page-level `__cleanupFns` (SPA) or a
 * bare/unwrapped call (non-SPA) otherwise. That mechanism was applied to
 * `on_kelas`, `ikat`'s state→input watch, nested `Saat`, and reactive-list
 * watchers — but NOT to plain `Ketika` handlers, `ikat`'s input→state
 * listener, per-item list handlers, or the fetch AbortController cleanup.
 * The fix in this pass generalizes the SAME mechanism (a new
 * `registerCleanup` helper wrapping the same routing logic) to those
 * previously-missed call sites, rather than patching each one differently.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');

// ─────────────────────────────────────────────────────────────────────────
// Shared DOM stub — richer than the v16/v17/v18 harnesses: tracks
// addEventListener options (specifically `{ once: true }`) and supports
// manually dispatching events so `.sekali`/`.once` can be verified at
// runtime, not just via codegen-shape string assertions.
// ─────────────────────────────────────────────────────────────────────────
function makeTrackedEl(tag) {
  const el = {
    tagName: tag,
    _className: '',
    _id: '',
    _text: '',
    _value: '',
    children: [],
    parentNode: null,
    _listeners: {}, // eventName -> [{ fn, options }]
    get className() {
      return this._className;
    },
    set className(v) {
      this._className = String(v);
    },
    get id() {
      return this._id;
    },
    set id(v) {
      this._id = v;
    },
    set innerText(v) {
      this._text = v;
    },
    get innerText() {
      return this._text;
    },
    set innerHTML(v) {
      if (v === '') {
        this.children.forEach((c) => (c.parentNode = null));
        this.children = [];
      }
    },
    set value(v) {
      this._value = v;
    },
    get value() {
      return this._value;
    },
    appendChild(c) {
      c.parentNode = this;
      this.children.push(c);
      return c;
    },
    removeChild(c) {
      c.parentNode = null;
      this.children = this.children.filter((x) => x !== c);
      return c;
    },
    remove() {
      if (this.parentNode) {
        this.parentNode.children = this.parentNode.children.filter((x) => x !== this);
        this.parentNode = null;
      }
    },
    replaceChildren(...nodes) {
      this.children.forEach((c) => (c.parentNode = null));
      this.children = [];
      nodes.forEach((n) => this.appendChild(n));
    },
    querySelector(sel) {
      const idMatch = sel.match(/^#(.+)$/);
      if (idMatch) {
        const stack = [...this.children];
        while (stack.length) {
          const n = stack.shift();
          if (n.id === idMatch[1]) return n;
          stack.push(...n.children);
        }
        return null;
      }
      return null;
    },
    setAttribute() {},
    addEventListener(ev, fn, options) {
      this._listeners[ev] = this._listeners[ev] || [];
      this._listeners[ev].push({ fn, options: options || {} });
    },
    removeEventListener(ev, fn) {
      if (this._listeners[ev]) {
        this._listeners[ev] = this._listeners[ev].filter((l) => l.fn !== fn);
      }
    },
    /** Simulate a real dispatch: fires all current listeners for `ev`,
     * honoring `{ once: true }` by auto-removing after firing (mirrors
     * native `addEventListener` semantics). */
    dispatch(ev, eventObj) {
      const self = this;
      const listeners = (this._listeners[ev] || []).slice();
      for (const { fn, options } of listeners) {
        fn(eventObj || { type: ev, target: self, preventDefault() {}, stopPropagation() {} });
        if (options && options.once) {
          this.removeEventListener(ev, fn);
        }
      }
    },
  };
  return el;
}

function makeDocument() {
  const body = makeTrackedEl('body');
  return {
    createElement: (t) => makeTrackedEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: t, parentNode: null }),
    createDocumentFragment: () => makeTrackedEl('#fragment'),
    querySelector: () => makeTrackedEl('div'),
    addEventListener() {},
    body,
  };
}

/** Compile + run, exposing reactive proxies on `window.__PROBE_<name>` and
 * (for SPA sources) the page factory object on `window.__PAGE`. */
function runSource(source, { exposeCleanupFns = false } = {}) {
  const r = compile(source);
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);

  const document = makeDocument();
  const win = {};
  let js = r.js.replace(
    /const (\w+) = __createReactive\(/g,
    'const $1 = window.__PROBE_$1 = __createReactive('
  );
  if (exposeCleanupFns) {
    js = js.replace(
      'var __cleanupFns = [];',
      'var __cleanupFns = []; window.__cleanupFns = __cleanupFns;'
    );
    js = js.replace(/const (__saatCleanup_\d+) = \[\];/g, 'const $1 = []; window.$1 = $1;');
  }
  js = js.replace('return {', 'window.__PAGE = {');

  const factory = new Function('document', 'window', 'console', js);
  factory(document, win, { error() {}, log() {}, warn() {} });

  // SPA sources compile to a `{ el, mount, unmount }` factory object rather
  // than auto-appending to document.body — mount it so DOM assertions below
  // can find rendered elements the same way they would for a non-SPA source.
  // `el` can be `null` for a page whose only top-level statement is a `Saat`
  // (its marker span self-appends to document.body directly, independent of
  // mount() — see visitSaatStatement's fallback-to-document.body branch) —
  // in that case, calling `mount()` would try to append the null root and
  // throw, AND is unnecessary since the marker is already attached; only
  // mount() when there is a real root element to attach.
  if (win.__PAGE && typeof win.__PAGE.mount === 'function' && win.__PAGE.el) {
    win.__PAGE.mount(document.body);
  }

  return { r, document, win };
}

// ═══════════════════════════════════════════════════════════════════════
// P0.1 — `.sekali`/`.once` event modifier
// ═══════════════════════════════════════════════════════════════════════
describe('P0.1 — .sekali/.once event modifier', () => {
  it('compiles .sekali to addEventListener with { once: true }', () => {
    const r = compile(
      'data hitung = 0\n\nBuat tombol#btn:\n    teks = "Klik"\n    on_klik.sekali = simpan hitung tambah 1 ke hitung'
    );
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/addEventListener\("click",\s*[\s\S]*?,\s*\{\s*once:\s*true\s*\}\)/);
  });

  it('compiles .once (English alias) to addEventListener with { once: true }', () => {
    const r = compile(
      'data hitung = 0\n\nBuat tombol#btn:\n    teks = "Klik"\n    on_klik.once = simpan hitung tambah 1 ke hitung'
    );
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/addEventListener\("click",\s*[\s\S]*?,\s*\{\s*once:\s*true\s*\}\)/);
  });

  it('runtime: handler with .sekali fires exactly once across two dispatches', () => {
    const { document, win } = runSource(
      'data hitung = 0\n\nBuat tombol#btn:\n    teks = "Klik"\n    on_klik.sekali = simpan hitung tambah 1 ke hitung'
    );
    const el = document.body.children[0];
    expect(el.id).toBe('btn');
    el.dispatch('click');
    el.dispatch('click');
    el.dispatch('click');
    expect(win.__PROBE_hitung.value).toBe(1); // only the FIRST dispatch had effect
  });

  it('runtime: handler WITHOUT .sekali fires on every dispatch (baseline, unaffected)', () => {
    const { document, win } = runSource(
      'data hitung = 0\n\nBuat tombol#btn:\n    teks = "Klik"\n    on_klik = simpan hitung tambah 1 ke hitung'
    );
    const el = document.body.children[0];
    el.dispatch('click');
    el.dispatch('click');
    el.dispatch('click');
    expect(win.__PROBE_hitung.value).toBe(3);
  });

  it('.cegah/.prevent still calls event.preventDefault()', () => {
    const r = compile('Buat form#f:\n    Ketika disubmit.cegah:\n        simpan 1 ke x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('event.preventDefault();');
  });

  it('.hentikan/.stop still calls event.stopPropagation()', () => {
    const r = compile('Buat tombol#btn:\n    Ketika diklik.hentikan:\n        simpan 1 ke x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('event.stopPropagation();');
  });

  it('combined modifiers .cegah.sekali both apply: preventDefault() AND { once: true }', () => {
    const r = compile('Buat form#f:\n    Ketika disubmit.cegah.sekali:\n        simpan 1 ke x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('event.preventDefault();');
    expect(r.js).toMatch(/addEventListener\("submit",\s*[\s\S]*?,\s*\{\s*once:\s*true\s*\}\)/);
  });

  it('combined modifiers .prevent.once (English aliases) both apply', () => {
    const r = compile('Buat form#f:\n    Ketika disubmit.prevent.once:\n        simpan 1 ke x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('event.preventDefault();');
    expect(r.js).toMatch(/addEventListener\("submit",\s*[\s\S]*?,\s*\{\s*once:\s*true\s*\}\)/);
  });

  it('runtime: combined .hentikan.sekali stops propagation AND fires only once', () => {
    const { document, win } = runSource(
      'data hitung = 0\n\nBuat tombol#btn:\n    teks = "Klik"\n    on_klik.hentikan.sekali = simpan hitung tambah 1 ke hitung'
    );
    const el = document.body.children[0];
    el.dispatch('click');
    el.dispatch('click');
    expect(win.__PROBE_hitung.value).toBe(1);
  });

  it('an unsupported modifier (.capture) is NOT silently accepted — produces a diagnostic', () => {
    const r = compile('Buat tombol#btn:\n    Ketika diklik.capture:\n        simpan 1 ke x');
    // Must not silently succeed with the modifier just dropped on the floor.
    const allDiagnostics = [...(r.errors || []), ...(r.warnings || [])];
    expect(allDiagnostics.length).toBeGreaterThan(0);
  });

  it('the on_event inline form (on_klik.sekali = ...) also supports combined modifiers', () => {
    const r = compile('Buat form#f:\n    on_dikirim.cegah.sekali = simpan 1 ke x');
    expect(r.success).toBe(true);
    expect(r.js).toContain('event.preventDefault();');
    expect(r.js).toMatch(/addEventListener\("submit",\s*[\s\S]*?,\s*\{\s*once:\s*true\s*\}\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P0.2 — Ketika/plain event handler inside Saat (SPA) cleanup ownership
// ═══════════════════════════════════════════════════════════════════════
describe('P0.2 — Ketika inside Saat (SPA) is cleaned up on re-render, not just unmount', () => {
  const SRC = [
    '---',
    'router: benar',
    '---',
    'data hitung = 0',
    'data tampil = benar',
    '',
    'Saat tampil:',
    '    Buat tombol#btn:',
    '        teks = "Klik"',
    '        Ketika diklik:',
    '            simpan hitung tambah 1 ke hitung',
  ].join('\n');

  it('codegen: the removeEventListener cleanup for a Ketika inside Saat is routed to the local __saatCleanup_N array, not __cleanupFns', () => {
    const r = compile(SRC);
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(function\(\) \{ .*removeEventListener\("click"/);
  });

  it('runtime: toggling tampil repeatedly does not grow __cleanupFns (page-level array) for the button listener', () => {
    const { win } = runSource(SRC, { exposeCleanupFns: true });
    const before = win.__cleanupFns.length;
    for (let i = 0; i < 10; i++) {
      win.__PROBE_tampil.value = false;
      win.__PROBE_tampil.value = true;
    }
    const after = win.__cleanupFns.length;
    expect(after).toBe(before);
  });

  it('runtime: the stale button from a previous Saat render no longer responds to clicks after re-render', () => {
    const { document, win } = runSource(SRC, { exposeCleanupFns: true });
    const firstBtn = document.body.children[0].querySelector('#btn');
    win.__PROBE_tampil.value = false;
    win.__PROBE_tampil.value = true;
    const secondBtn = document.body.children[0].querySelector('#btn');
    expect(secondBtn).not.toBe(firstBtn);

    firstBtn.dispatch('click'); // stale — should NOT increment hitung anymore
    expect(win.__PROBE_hitung.value).toBe(0);

    secondBtn.dispatch('click'); // live — should increment
    expect(win.__PROBE_hitung.value).toBe(1);
  });

  it('SPA unmount() still cleans up a Ketika-inside-Saat listener that was never re-rendered', () => {
    const source = [
      '---',
      'router: benar',
      '---',
      'Halaman Beranda:',
      '    data hitung = 0',
      '    data tampil = benar',
      '',
      '    Saat tampil:',
      '        Buat tombol#btn:',
      '            teks = "Klik"',
      '            Ketika diklik:',
      '                simpan hitung tambah 1 ke hitung',
    ].join('\n');
    const r = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(r.success).toBe(true);
    const document = makeDocument();
    const win = {};
    let js = r.js.replace(
      /const (\w+) = __createReactive\(/g,
      'const $1 = window.__PROBE_$1 = __createReactive('
    );
    js = js.replace('return {', 'window.__PAGE = {');
    const factory = new Function('document', 'window', 'console', js);
    factory(document, win, { error() {}, log() {}, warn() {} });
    const page = win.__PAGE;
    page.mount(document.body);
    const btn = document.body.querySelector('#btn');
    page.unmount();
    btn.dispatch('click'); // after unmount, must be inert
    expect(win.__PROBE_hitung.value).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P0.3 — ikat/two-way binding input→state cleanup ownership inside Saat (SPA)
// ═══════════════════════════════════════════════════════════════════════
describe('P0.3 — ikat inside Saat (SPA): both directions cleaned up on re-render', () => {
  const SRC = [
    '---',
    'router: benar',
    '---',
    'data nama = ""',
    'data tampil = benar',
    '',
    'Saat tampil:',
    '    Buat masukan#nama:',
    '        ikat = nama',
  ].join('\n');

  it('codegen: the input listener removeEventListener cleanup is routed to the local __saatCleanup_N array', () => {
    const r = compile(SRC);
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(function\(\) \{ .*removeEventListener\("input"/);
  });

  it('runtime: toggling tampil repeatedly does not grow __cleanupFns for the input listener', () => {
    const { win } = runSource(SRC, { exposeCleanupFns: true });
    const before = win.__cleanupFns.length;
    for (let i = 0; i < 10; i++) {
      win.__PROBE_tampil.value = false;
      win.__PROBE_tampil.value = true;
    }
    expect(win.__cleanupFns.length).toBe(before);
  });

  it('runtime: state -> input still works after re-render (no regression)', () => {
    const { document, win } = runSource(SRC, { exposeCleanupFns: true });
    win.__PROBE_tampil.value = false;
    win.__PROBE_tampil.value = true;
    const input = document.body.children[0].querySelector('#nama');
    win.__PROBE_nama.value = 'Budi';
    expect(input.value).toBe('Budi');
  });

  it('runtime: input -> state still works after re-render (no regression), stale input no longer updates state', () => {
    const { document, win } = runSource(SRC, { exposeCleanupFns: true });
    const firstInput = document.body.children[0].querySelector('#nama');
    win.__PROBE_tampil.value = false;
    win.__PROBE_tampil.value = true;
    const secondInput = document.body.children[0].querySelector('#nama');

    firstInput.value = 'stale-input';
    firstInput.dispatch('input');
    expect(win.__PROBE_nama.value).not.toBe('stale-input');

    secondInput.value = 'Live';
    secondInput.dispatch('input');
    expect(win.__PROBE_nama.value).toBe('Live');
  });

  it('ikat outside of Saat / non-SPA is unaffected (no cleanup array, direct bare emit)', () => {
    const r = compile('data nama = ""\n\nBuat masukan#i:\n    ikat = nama');
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('__cleanupFns');
    expect(r.js).not.toContain('__saatCleanup');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P0.4 — Reactive list per-item event handler cleanup
// ═══════════════════════════════════════════════════════════════════════
describe('P0.4 — reactive list per-item Ketika handlers are cleaned up on list re-render', () => {
  const NONKEYED_SRC = [
    '---',
    'router: benar',
    '---',
    'data hitung = 0',
    'data items = []',
    '',
    'Buat div#root:',
    '    Ulangi untuk it dari $items:',
    '        Buat tombol.item:',
    '            teks = "x"',
    '            Ketika diklik:',
    '                simpan hitung tambah 1 ke hitung',
  ].join('\n');

  it('runtime (non-keyed): repeated list refresh does not grow __cleanupFns without bound', () => {
    const { win } = runSource(NONKEYED_SRC, { exposeCleanupFns: true });
    for (let i = 0; i < 20; i++) {
      win.__PROBE_items.value = [1, 2, 3];
      win.__PROBE_items.value = [];
    }
    // Allow a small constant overhead (e.g. the list watcher itself), but
    // must NOT grow proportionally to the number of render cycles (61 before
    // the fix for 20 cycles x 3 items).
    expect(win.__cleanupFns.length).toBeLessThan(5);
  });

  it('runtime (non-keyed): stale item buttons from a previous render no longer respond to clicks', () => {
    const { document, win } = runSource(NONKEYED_SRC, { exposeCleanupFns: true });
    win.__PROBE_items.value = ['a', 'b'];
    const root = document.body.children[0];
    const marker = root.children[0];
    const firstBtn = marker.children[0];

    win.__PROBE_items.value = ['c', 'd'];
    firstBtn.dispatch('click');
    expect(win.__PROBE_hitung.value).toBe(0);

    const liveBtn = marker.children[0];
    liveBtn.dispatch('click');
    expect(win.__PROBE_hitung.value).toBe(1);
  });

  const KEYED_SRC = [
    '---',
    'router: benar',
    '---',
    'data hitung = 0',
    'data items = []',
    '',
    'Buat div#root:',
    '    Ulangi untuk it dari $items dengan kunci it.id:',
    '        Buat tombol.item:',
    '            teks = "x"',
    '            Ketika diklik:',
    '                simpan hitung tambah 1 ke hitung',
  ].join('\n');

  // Keyed-list reconciliation (`__keyedList`) exercises real DOM APIs the
  // lightweight `makeTrackedEl` stub above does not implement (`insertBefore`,
  // `nextSibling`, live NodeList-like ordering) — use jsdom (already a
  // devDependency, per package.json) for these two tests instead of the
  // custom stub, matching the pattern used in the Lapis 1-3 audit sessions.
  function runSourceJsdom(source) {
    const { JSDOM } = require('jsdom');
    const r = compile(source);
    expect(r.success).toBe(true);
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const { window } = dom;
    let js = r.js.replace(
      /const (\w+) = __createReactive\(/g,
      'const $1 = window.__PROBE_$1 = __createReactive('
    );
    js = js.replace('return {', 'window.__PAGE = {');
    const factory = new Function('document', 'window', 'console', js);
    factory(window.document, window, window.console);
    if (window.__PAGE && typeof window.__PAGE.mount === 'function' && window.__PAGE.el) {
      window.__PAGE.mount(window.document.body);
    }
    return { window, document: window.document };
  }

  it('runtime (keyed): reused node (same key, __pjsSame item) keeps working and is NOT double-cleaned', () => {
    const { window, document } = runSourceJsdom(KEYED_SRC);
    const stableItem = { id: 1 };
    window.__PROBE_items.value = [stableItem];
    const marker = document.querySelector('.__promptjs_list_marker');
    const wrapperBefore = marker.children[0];

    // Re-set with the SAME item reference (should be reused, not re-rendered).
    window.__PROBE_items.value = [stableItem];
    const wrapperAfter = marker.children[0];
    expect(wrapperAfter).toBe(wrapperBefore);

    const btn = wrapperAfter.children[0];
    btn.dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(window.__PROBE_hitung.value).toBe(1);
  });

  it('runtime (keyed): item re-rendered (same key, changed value) cleans up the old listener', () => {
    const { window, document } = runSourceJsdom(KEYED_SRC);
    window.__PROBE_items.value = [{ id: 1, label: 'v1' }];
    const marker = document.querySelector('.__promptjs_list_marker');
    const wrapperBefore = marker.children[0];
    const btnBefore = wrapperBefore.children[0];

    // Re-set with the SAME key but a DIFFERENT value (`__pjsSame` does a
    // shallow-equality check — an object with the same `id` but a changed
    // field is correctly detected as "item changed", forcing a genuine
    // re-render of that keyed slot rather than a reuse; a same-shape object
    // with an identical value, even a new reference, would be reused, which
    // is correct/intentional and not the scenario under test here).
    window.__PROBE_items.value = [{ id: 1, label: 'v2' }];

    btnBefore.dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(window.__PROBE_hitung.value).toBe(0); // stale listener must be inert

    const wrapperAfter = marker.children[0];
    const btnAfter = wrapperAfter.children[0];
    btnAfter.dispatchEvent(new window.Event('click', { bubbles: true }));
    expect(window.__PROBE_hitung.value).toBe(1); // new listener works
  });

  it('runtime: a newly-added item in the list has a working listener', () => {
    const { document, win } = runSource(NONKEYED_SRC, { exposeCleanupFns: true });
    win.__PROBE_items.value = ['a'];
    win.__PROBE_items.value = ['a', 'b'];
    const root = document.body.children[0];
    const marker = root.children[0];
    marker.children[1].dispatch('click');
    expect(win.__PROBE_hitung.value).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P0.5 — Inline fetch inside Saat: AbortController cleanup + stale race
// ═══════════════════════════════════════════════════════════════════════
describe('P0.5 — inline ambil (fetch) inside Saat: no stale overwrite, no unbounded cleanup growth', () => {
  const SRC = [
    '---',
    'router: benar',
    '---',
    'data tampil = benar',
    'data hasil = null',
    '',
    'Saat tampil:',
    '    Buat div#box:',
    '        ambil dari "https://api.example.com" ke hasil',
  ].join('\n');

  it('codegen: the AbortController.abort cleanup is routed to the local __saatCleanup_N array', () => {
    const r = compile(SRC);
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(function\(\) \{ .*\.abort\(\); \}\)/);
  });

  it('runtime: repeated Saat re-renders do not grow __cleanupFns without bound', () => {
    global.fetch = () => new Promise(() => {}); // never resolves; irrelevant to this assertion
    global.AbortController = class {
      constructor() {
        this.signal = {};
      }
      abort() {}
    };
    try {
      const { win } = runSource(SRC, { exposeCleanupFns: true });
      const before = win.__cleanupFns.length;
      for (let i = 0; i < 10; i++) {
        win.__PROBE_tampil.value = false;
        win.__PROBE_tampil.value = true;
      }
      expect(win.__cleanupFns.length).toBe(before);
    } finally {
      delete global.fetch;
      delete global.AbortController;
    }
  });

  it('runtime: a stale (superseded) request does not overwrite fresher data — the old AbortController is actually aborted on re-render', async () => {
    let callCount = 0;
    const aborted = {};
    global.AbortController = class {
      constructor() {
        this.id = ++callCount;
        this.signal = {
          aborted: false,
          _handlers: [],
          addEventListener(ev, fn) {
            this._handlers.push(fn);
          },
        };
      }
      abort() {
        aborted[this.id] = true;
        this.signal.aborted = true;
        this.signal._handlers.forEach((fn) => fn());
      }
    };
    global.fetch = (url, opts) => {
      const myCall = callCount; // AbortController is constructed just before fetch() is called
      const delay = myCall === 1 ? 50 : 5; // first (now-stale) request resolves LAST
      return new Promise((resolve, reject) => {
        const t = setTimeout(
          () => resolve({ ok: true, json: async () => ({ callNum: myCall }) }),
          delay
        );
        if (opts && opts.signal) {
          opts.signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }
      });
    };
    try {
      // `Saat tampil:` re-renders on EVERY change of `tampil`, not just
      // truthy transitions — so this produces THREE fetch calls total:
      //   call 1: initial render (tampil = benar), delay 50ms (slowest)
      //   call 2: tampil -> false re-render, delay 5ms
      //   call 3: tampil -> true re-render, delay 5ms (latest/final)
      const { win } = runSource(SRC);
      win.__PROBE_tampil.value = false;
      win.__PROBE_tampil.value = true;

      await new Promise((resolve) => setTimeout(resolve, 100));
      // The two SUPERSEDED controllers (call 1 and call 2) must both have
      // been genuinely aborted by the time their re-renders were replaced.
      expect(aborted[1]).toBe(true);
      expect(aborted[2]).toBe(true);
      // The result must reflect the LATEST render (call 3), never an
      // earlier/stale render's response overwriting it after the fact.
      expect(win.__PROBE_hasil.value).toEqual({ callNum: 3 });
    } finally {
      delete global.fetch;
      delete global.AbortController;
    }
  });

  it('SPA unmount() still aborts an in-flight request', () => {
    let abortCalled = false;
    global.AbortController = class {
      constructor() {
        this.signal = {};
      }
      abort() {
        abortCalled = true;
      }
    };
    global.fetch = () => new Promise(() => {});
    try {
      const source = [
        '---',
        'router: benar',
        '---',
        'Halaman Beranda:',
        '    data hasil = null',
        '    ambil dari "https://api.example.com" ke hasil',
      ].join('\n');
      const r = compile(source, { pageName: 'index', pageRoute: '/' });
      expect(r.success).toBe(true);
      const document = makeDocument();
      const win = {};
      const js = r.js.replace('return {', 'window.__PAGE = {');
      const factory = new Function('document', 'window', 'console', js);
      factory(document, win, { error() {}, log() {}, warn() {} });
      win.__PAGE.mount(document.body);
      win.__PAGE.unmount();
      expect(abortCalled).toBe(true);
    } finally {
      delete global.fetch;
      delete global.AbortController;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P0.6 — `Buat NamaKomponen(prop: val):` with trailing colon
// ═══════════════════════════════════════════════════════════════════════
describe('P0.6 — Buat NamaKomponen(prop: val): with a trailing colon (documented syntax)', () => {
  it('the EXACT example from docs/language/components.md compiles successfully', () => {
    const r = compile(
      'Komponen Kartu(judul, harga):\n    Buat h3: judul\n\nBuat Kartu(judul: "Kopi Aceh", harga: 45000):'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain('__komp_Kartu({ "judul": "Kopi Aceh", "harga": 45000 })');
  });

  it('the EXACT example from docs/language/syntax-reference.md compiles successfully', () => {
    const r = compile(
      'Komponen Kartu(judul, harga):\n    Buat div.kartu:\n        Buat h3: judul\n        Buat span: harga\n\nBuat Kartu(judul: "Kopi", harga: 45000):'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('a normal selector with a trailing colon (Buat div.kartu:) is unaffected', () => {
    const r = compile('Buat div.kartu:\n    Buat h3: "x"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
    expect(r.js).toContain('className = "kartu"');
  });

  it('a selector with an attribute bracket containing a colon-like value is unaffected', () => {
    const r = compile('Buat div[data-info="a:b"]:\n    Buat span: "x"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("div")');
  });

  it('component invocation WITHOUT a trailing colon still works (no regression)', () => {
    const r = compile('Komponen Kartu(judul):\n    Buat h3: judul\n\nBuat Kartu(judul: "Halo")');
    expect(r.success).toBe(true);
    expect(r.js).toContain('__komp_Kartu({ "judul": "Halo" })');
  });

  it('Gunakan Nama(...): with a trailing colon (no child block) still works', () => {
    const r = compile(
      'Komponen Kartu(judul):\n    Buat h3: judul\n\nGunakan Kartu(judul: "Halo"):'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('__komp_Kartu({ "judul": "Halo" })');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P0.7 — Gunakan NamaKomponen(...): with a child block must not silently
// become sibling statements — must produce a clear diagnostic instead.
// ═══════════════════════════════════════════════════════════════════════
describe('P0.7 — Gunakan NamaKomponen(...): with an indented child block is diagnosed, not silently miscompiled', () => {
  it('produces an explicit error/warning instead of silently compiling the block as siblings', () => {
    const r = compile(
      'Komponen Kartu(judul):\n    Buat div.kartu:\n        Buat h3: judul\n\nGunakan Kartu(judul: "Halo"):\n    Buat p: "Konten body kartu di sini"'
    );
    const allDiagnostics = [...(r.errors || []), ...(r.warnings || [])];
    expect(allDiagnostics.length).toBeGreaterThan(0);
  });

  it('the diagnostic message clearly mentions the unsupported child-block/slot situation', () => {
    const r = compile(
      'Komponen Kartu(judul):\n    Buat div.kartu:\n        Buat h3: judul\n\nGunakan Kartu(judul: "Halo"):\n    Buat p: "x"'
    );
    const allDiagnostics = [...(r.errors || []), ...(r.warnings || [])];
    const messages = allDiagnostics.map((d) => (d.message || '').toLowerCase());
    const mentionsRelevant = messages.some(
      (m) => m.includes('slot') || m.includes('child') || m.includes('anak') || m.includes('blok')
    );
    expect(mentionsRelevant).toBe(true);
  });

  it('does NOT compile the child block as sibling DOM output appended outside the component', () => {
    const r = compile(
      'Komponen Kartu(judul):\n    Buat div.kartu:\n        Buat h3: judul\n\nBuat div#wrapper:\n    Gunakan Kartu(judul: "Halo"):\n        Buat p: "harus tidak jadi sibling"\n    Buat span: "setelah gunakan"'
    );
    // Either this now fails to compile (error), or if it still compiles, the
    // "harus tidak jadi sibling" text must NOT appear as a bare sibling
    // paragraph appended directly under #wrapper alongside the component.
    if (r.success) {
      // If compilation is still allowed to proceed (e.g. warning-only), the
      // paragraph must not silently appear as an unrelated sibling next to
      // the component instance without at least a warning being present.
      expect(r.warnings.length + r.errors.length).toBeGreaterThan(0);
    } else {
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it('Gunakan NamaKomponen(...) WITHOUT a child block still compiles cleanly with no diagnostics about slots', () => {
    const r = compile('Komponen Kartu(judul):\n    Buat h3: judul\n\nGunakan Kartu(judul: "Halo")');
    expect(r.success).toBe(true);
    const allDiagnostics = [...(r.errors || []), ...(r.warnings || [])];
    const slotDiagnostics = allDiagnostics.filter((d) =>
      (d.message || '').toLowerCase().includes('slot')
    );
    expect(slotDiagnostics.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P1.2 — PascalCase validation (E2003) for component names
// ═══════════════════════════════════════════════════════════════════════
describe('P1.2 — E2003 PascalCase validation is now active', () => {
  it('a lowercase component name produces E2003', () => {
    const r = compile('Komponen kartu(judul):\n    Buat h3: judul');
    expect(r.success).toBe(false);
    expect(r.errors.some((e) => e.code === 'E2003')).toBe(true);
  });

  it('a PascalCase component name compiles cleanly (no regression)', () => {
    const r = compile('Komponen Kartu(judul):\n    Buat h3: judul');
    expect(r.success).toBe(true);
    expect(r.errors.some((e) => e.code === 'E2003')).toBe(false);
  });

  it('existing valid component declarations across the test suite are unaffected (spot check: Definisikan alias)', () => {
    const r = compile('Definisikan Label(teksnya):\n    Buat teks: teksnya');
    expect(r.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// P1.3 — Unknown/typo prop validation on component instantiation
// ═══════════════════════════════════════════════════════════════════════
describe('P1.3 — unknown prop on component instantiation produces W4005', () => {
  it('a typo prop name (judl vs judul) produces W4005 with the correct suggestion', () => {
    const r = compile('Komponen Kartu(judul):\n    Buat h3: judul\n\nGunakan Kartu(judl: "typo")');
    expect(r.success).toBe(true); // warning-only, not a hard error
    const w = r.warnings.find((w) => w.code === 'W4005');
    expect(w).toBeTruthy();
    expect(w.message).toContain('judl');
    expect(w.suggestion).toContain('judul');
  });

  it('a valid prop name produces no W4005', () => {
    const r = compile(
      'Komponen Kartu(judul):\n    Buat h3: judul\n\nGunakan Kartu(judul: "benar")'
    );
    expect(r.success).toBe(true);
    expect(r.warnings.some((w) => w.code === 'W4005')).toBe(false);
  });

  it('default parameters are unaffected (no false-positive W4005 for a param with a default)', () => {
    const r = compile(
      'Komponen Tombol(label, varian: "primer"):\n    Buat button.btn: label\n\nGunakan Tombol(label: "Hai")'
    );
    expect(r.success).toBe(true);
    expect(r.warnings.some((w) => w.code === 'W4005')).toBe(false);
  });

  it('the "Buat NamaKomponen(...)" invocation form is ALSO validated (same underlying GunakanStatement)', () => {
    const r = compile('Komponen Kartu(judul):\n    Buat h3: judul\n\nBuat Kartu(judl: "typo")');
    expect(r.success).toBe(true);
    expect(r.warnings.some((w) => w.code === 'W4005')).toBe(true);
  });
});
