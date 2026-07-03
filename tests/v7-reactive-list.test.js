/**
 * PromptJS — Regression: reactive list rendering for `Ulangi untuk` (K1a, #48).
 *
 * Foundation (NON-keyed) of the keyed-list roadmap (master plan #47). Before
 * K1a, `Ulangi untuk item dari <array>:` lowered to a plain `array.forEach(...)`
 * that ran ONCE at build time — mutating a reactive (`data`/`turunan`) array did
 * NOT re-render the list. K1a makes a loop over a REACTIVE source re-render the
 * whole list (non-keyed full re-render; keyed diff is K1b/#49) by mirroring the
 * proven `visitSaatStatement` marker idiom:
 *
 *   1. a <span> marker owns all list children (siblings untouched)
 *   2. __watch(proxy, ...) re-renders on every change
 *   3. clear via replaceChildren() each pass                      (C-5)
 *   4. Array.isArray(...) guard → non-array / null / empty render empty
 *   5. in SPA mode the unsub is registered via __cleanupFns.push  (C-1)
 *
 * A NON-reactive source (`tetap`/`ubah`/literal) keeps the original one-shot
 * forEach — no behavior change, no extra runtime cost.
 *
 * Coverage is three-tier: PARSE (compiles clean), EMIT (correct shape), and
 * RUNTIME (JSDOM-style stub proving actual DOM re-render on the REAL compiler
 * output, not a hand-written shape). The critical C-1 test proves a list watcher
 * uses per-watcher `unsub` teardown and does NOT kill a sibling watcher that
 * subscribes to the SAME reactive source (which the destructive `__cleanup`
 * would have done).
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/** Compile a page whose body is `lines` (already indented under `Halaman P:`). */
function compilePage(lines, { spa = false } = {}) {
  const frontMatter = spa ? '---\nrouter: benar\n---\n' : '';
  return Engine.compile(frontMatter + 'Halaman P:\n' + lines);
}

/**
 * Minimal DOM stub that actually tracks children so tests can assert re-render.
 * Supports appendChild / replaceChildren / removeChild + a `children` array.
 */
function makeDom() {
  function makeEl(tag) {
    const el = {
      tagName: tag,
      className: '',
      _text: '',
      children: [],
      set innerText(v) {
        this._text = v;
      },
      get innerText() {
        return this._text;
      },
      set innerHTML(v) {
        // only used as a clear (v === "") elsewhere in the codebase
        if (v === '') this.children = [];
      },
      appendChild(c) {
        this.children.push(c);
        return c;
      },
      removeChild(c) {
        this.children = this.children.filter((x) => x !== c);
        return c;
      },
      replaceChildren() {
        this.children = [];
      },
      setAttribute() {},
      addEventListener() {},
      querySelector() {
        return makeEl('div');
      },
    };
    return el;
  }
  const body = makeEl('body');
  const document = {
    createElement: (t) => makeEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: t }),
    querySelector: () => makeEl('div'),
    addEventListener() {},
    body,
  };
  return { document, body, makeEl };
}

/**
 * Run compiled JS in a stubbed DOM. `expose` is PromptJS source that stashes the
 * reactive proxy onto window so the test can mutate it and observe re-renders.
 * NOTE: `new Function` here executes the COMPILER OUTPUT for probing only — the
 * PromptJS language itself emits zero eval / zero new Function.
 */
function runPage(lines, { spa = false } = {}) {
  const r = compilePage(lines, { spa });
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);
  const { document, body } = makeDom();
  const win = {};
  new Function('document', 'window', 'console', r.js)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  return { r, document, body, win };
}

/** Recursively collect innerText from an element subtree (skips empty). */
function collectText(el) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n._text) out.push(n._text);
    (n.children || []).forEach(walk);
  };
  walk(el);
  return out;
}

// ─── PARSE ────────────────────────────────────────────────────────────────
describe('reactive list (K1a) — parsing', () => {
  it('loop over a reactive `data` array compiles clean', () => {
    const r = compilePage(
      '    data items = ["a", "b"]\n    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('loop over a non-reactive `tetap` array compiles clean', () => {
    const r = compilePage(
      '    tetap items = ["a", "b"]\n    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('nested reactive loops compile clean', () => {
    const r = compilePage(
      '    data rows = [1, 2]\n    data cols = [3, 4]\n' +
        '    Ulangi untuk r dari $rows:\n      Ulangi untuk c dari $cols:\n        Buat teks: c'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });
});

// ─── EMIT ─────────────────────────────────────────────────────────────────
describe('reactive list (K1a) — emission', () => {
  it('reactive source emits __watch on the PROXY (not .value) + guard + replaceChildren', () => {
    const r = compilePage(
      '    data items = ["a", "b"]\n    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(r.js).toContain('__watch(items,');
    expect(r.js).not.toContain('__watch(items.value,');
    expect(r.js).toContain('Array.isArray(');
    expect(r.js).toContain('.replaceChildren()');
    expect(r.js).toContain('__promptjs_list_marker');
  });

  it('non-reactive source keeps the plain one-shot forEach (no __watch, no marker)', () => {
    const r = compilePage(
      '    tetap items = ["a", "b"]\n    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(r.js).toContain('items.forEach(');
    expect(r.js).not.toContain('__promptjs_list_marker');
    expect(r.js).not.toMatch(/__watch\(items,/);
  });

  it('C-5: reactive list clears via replaceChildren(), never innerHTML on the marker', () => {
    const r = compilePage(
      '    data items = ["x"]\n    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(r.js).toContain('.replaceChildren()');
    expect(r.js).not.toMatch(/__lmarker\w*\.innerHTML/);
  });

  it('SPA mode (C-1): reactive list unsub registered via __cleanupFns.push (not __cleanup)', () => {
    const r = compilePage(
      '    data items = ["a"]\n    Ulangi untuk it dari $items:\n      Buat teks: it',
      { spa: true }
    );
    expect(r.js).toContain('__cleanupFns.push(__watch(items,');
    // The list teardown must NOT use the destructive __cleanup(source).
    expect(r.js).not.toContain('__cleanup(items)');
  });

  it('nested reactive loops emit nested markers', () => {
    const r = compilePage(
      '    data rows = [1]\n    data cols = [2]\n' +
        '    Ulangi untuk r dari $rows:\n      Ulangi untuk c dari $cols:\n        Buat teks: c'
    );
    const markers = (r.js.match(/__promptjs_list_marker/g) || []).length;
    expect(markers).toBeGreaterThanOrEqual(2);
    expect(r.js).toContain('__watch(rows,');
    expect(r.js).toContain('__watch(cols,');
  });
});

// ─── RUNTIME (JSDOM-style) ─────────────────────────────────────────────────
describe('reactive list (K1a) — runtime', () => {
  it('renders the initial array into the DOM', () => {
    const { body } = runPage(
      '    data items = ["alpha", "beta"]\n' +
        '    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    const texts = collectText(body);
    expect(texts).toContain('alpha');
    expect(texts).toContain('beta');
  });

  it('re-renders when the reactive array changes (push)', () => {
    // stash the proxy on window so we can mutate it post-render
    const { body, win } = runPageWithProbe(
      'items',
      '    data items = ["one"]\n' + '    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(collectText(body)).toEqual(expect.arrayContaining(['one']));
    // mutate the reactive source → should trigger __watch → re-render
    win.__PROBE_items.value = ['one', 'two', 'three'];
    const after = collectText(body);
    expect(after).toEqual(expect.arrayContaining(['one', 'two', 'three']));
  });

  it('guard: setting the source to a non-array renders empty without throwing', () => {
    const { body, win } = runPageWithProbe(
      'items',
      '    data items = ["a", "b"]\n' + '    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    expect(() => {
      win.__PROBE_items.value = null;
    }).not.toThrow();
    // marker cleared; nothing from the list remains
    expect(collectText(body)).not.toContain('a');
    expect(collectText(body)).not.toContain('b');
  });

  it('guard: empty array renders nothing (no throw)', () => {
    const { body, win } = runPageWithProbe(
      'items',
      '    data items = ["a"]\n' + '    Ulangi untuk it dari $items:\n      Buat teks: it'
    );
    win.__PROBE_items.value = [];
    expect(collectText(body)).not.toContain('a');
  });

  it('C-1: a list watcher does NOT kill a sibling watcher on the SAME source', () => {
    // Two independent watchers subscribe to `items`: the reactive list, and a
    // `Saat` watcher rendering panjang(items). If teardown used the destructive
    // __cleanup(items) it would clear ALL subscribers; per-watcher unsub must
    // keep both alive across re-renders.
    const { body, win } = runPageWithProbe(
      'items',
      '    data items = ["a"]\n' +
        '    Ulangi untuk it dari $items:\n      Buat teks: it\n' +
        '    Saat items:\n      Buat teks: panjang($items)'
    );
    // initial: list "a" + count "1"
    expect(collectText(body)).toEqual(expect.arrayContaining(['a']));
    // change the source multiple times; BOTH watchers must keep firing
    win.__PROBE_items.value = ['a', 'b'];
    win.__PROBE_items.value = ['a', 'b', 'c'];
    const texts = collectText(body);
    // list watcher still alive → renders all three items
    expect(texts).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    // sibling `Saat` watcher still alive → count reflects latest length (3)
    expect(texts.map(String)).toContain('3');
  });
});

/**
 * Like runPage but appends `ekspor` of the given state so the runtime stashes
 * the reactive proxy on window as `__PROBE_<name>` (mirrors the two-way test's
 * probe). We inject a tiny trailing statement in the compiled JS is NOT needed —
 * PromptJS `ekspor` already exposes it; instead we grab it by convention.
 */
function runPageWithProbe(stateName, lines, opts = {}) {
  const r = compilePage(lines, opts);
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);
  const { document, body } = makeDom();
  const win = {};
  // The compiled proxy is a top-level `const <name> = __createReactive(...)`
  // INSIDE an IIFE, so an appended epilogue can't reach it. Inject the probe
  // assignment right after that declaration instead (test-only string surgery
  // on the compiler output — the language emits no eval / new Function).
  const declRe = new RegExp(`(const ${stateName} = __createReactive\\([^;]*\\);)`);
  expect(r.js).toMatch(declRe);
  const probedJs = r.js.replace(declRe, `$1 window.__PROBE_${stateName} = ${stateName};`);
  new Function('document', 'window', 'console', probedJs)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  return { r, document, body, win };
}
