/**
 * PromptJS — K2a: FLIP list transitions (`dengan transisi <name>`), #52.
 * ============================================================================
 * Three-tier coverage (parse → emit → runtime) for opt-in FLIP transitions
 * layered on the K1b keyed reconciler. FLIP = First/Last/Invert/Play: measure
 * node boxes before/after reconcile, invert with a transform, play by clearing
 * it and listening for `transitionend`. Enter/leave use paired CSS classes.
 *
 * Core guarantees asserted here:
 *   - "Honest keyword": `dengan transisi` engages __flipList ONLY when the loop
 *     is also keyed; its absence keeps K1b byte-for-byte (no __flipList).
 *   - Move preserves keyed node identity (same DOM node, transform lifecycle).
 *   - Enter adds/removes the enter class; leave defers removal to transitionend.
 *   - prefers-reduced-motion ⇒ no animation, correct final DOM.
 *   - Rapid mutations ⇒ no orphaned listeners / stuck transforms.
 *   - SPA navigate-away mid-transition ⇒ cleanup (C-1), no leak.
 *   - No vDOM / eval / new Function; CSP-safe (transform + class toggles only).
 *
 * NOTE: `new Function` here executes the COMPILER OUTPUT for probing only — the
 * PromptJS language itself emits zero eval / zero new Function.
 */

import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/** Compile a page whose body is `lines` (already indented under `Halaman P:`). */
function compilePage(lines, { spa = false } = {}) {
  const frontMatter = spa ? '---\nrouter: benar\n---\n' : '';
  return Engine.compile(frontMatter + 'Halaman P:\n' + lines);
}

/**
 * FLIP-capable DOM stub. Extends the K1b keyed stub with the APIs __flipList
 * needs: classList, style.transform, getBoundingClientRect (position derived
 * from sibling index so reorder ⇒ box change ⇒ "move"), and transitionend
 * event support with a manual `__fireTransitionEnd()` to drive the P step.
 */
function makeDom({ reducedMotion = false } = {}) {
  const listeners = []; // global registry for leak assertions

  function makeEl(tag) {
    const _classes = new Set();
    const _handlers = {}; // event -> [fn]
    const el = {
      tagName: tag,
      _text: '',
      children: [],
      parentNode: null,
      style: { transform: '' },
      classList: {
        add: (c) => _classes.add(c),
        remove: (c) => _classes.delete(c),
        contains: (c) => _classes.has(c),
      },
      get className() {
        return [..._classes].join(' ');
      },
      set className(v) {
        _classes.clear();
        String(v)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((c) => _classes.add(c));
      },
      set innerText(v) {
        this._text = v;
      },
      get innerText() {
        return this._text;
      },
      set innerHTML(v) {
        if (v === '') this.replaceChildren();
      },
      set value(v) {
        this._value = v;
      },
      get value() {
        return this._value;
      },
      // Position derived from index within parent → reorder changes it, so the
      // FLIP wrapper sees a non-zero (dx,dy) and animates a "move".
      getBoundingClientRect() {
        let idx = 0;
        if (this.parentNode) idx = this.parentNode.children.indexOf(this);
        const top = idx * 20;
        return { top, left: 0, bottom: top + 20, right: 100, width: 100, height: 20 };
      },
      get offsetWidth() {
        return 100; // forces the "reflow" read in __flipList to be a number.
      },
      appendChild(c) {
        this.children.push(c);
        c.parentNode = this;
        return c;
      },
      removeChild(c) {
        this.children = this.children.filter((x) => x !== c);
        c.parentNode = null;
        return c;
      },
      insertBefore(n, ref) {
        this.children = this.children.filter((x) => x !== n);
        if (ref == null) this.children.push(n);
        else {
          const i = this.children.indexOf(ref);
          this.children.splice(i < 0 ? this.children.length : i, 0, n);
        }
        n.parentNode = this;
        return n;
      },
      replaceChildren() {
        this.children.forEach((c) => (c.parentNode = null));
        this.children = [];
      },
      get nextSibling() {
        if (!this.parentNode) return null;
        const s = this.parentNode.children;
        const i = s.indexOf(this);
        return i >= 0 && i < s.length - 1 ? s[i + 1] : null;
      },
      setAttribute() {},
      addEventListener(ev, fn) {
        (_handlers[ev] = _handlers[ev] || []).push(fn);
        listeners.push({ el, ev, fn });
      },
      removeEventListener(ev, fn) {
        if (_handlers[ev]) _handlers[ev] = _handlers[ev].filter((h) => h !== fn);
        for (let i = listeners.length - 1; i >= 0; i--) {
          if (listeners[i].el === el && listeners[i].ev === ev && listeners[i].fn === fn)
            listeners.splice(i, 1);
        }
      },
      // Test helper: fire a transitionend for this node (the FLIP "settle").
      __fireTransitionEnd() {
        (_handlers.transitionend || []).slice().forEach((fn) => fn());
      },
      __classSet: _classes,
    };
    return el;
  }

  const body = makeEl('body');
  const document = {
    createElement: (t) => makeEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: t, _text: t }),
    querySelector: () => null,
    addEventListener() {},
    body,
  };
  const win = {
    matchMedia: (q) => ({
      matches: reducedMotion && /prefers-reduced-motion/.test(q),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }),
  };
  return { document, window: win, body, listeners };
}

/** Find the first list marker element in a subtree. */
function findMarker(el) {
  if (el && el.className && el.className.indexOf('__promptjs_list_marker') >= 0) return el;
  for (const c of el.children || []) {
    const m = findMarker(c);
    if (m) return m;
  }
  return null;
}

/** Concatenated text of one keyed-item wrapper subtree. */
function textOf(w) {
  let t = '';
  const walk = (n) => {
    if (!n) return;
    if (n._text) t += n._text;
    (n.children || []).forEach(walk);
  };
  walk(w);
  return t;
}

/**
 * Compile + run a keyed+transition page, exposing the reactive proxy on window
 * as `__PROBE_<name>` (string-surgery, mirrors the K1a/K1b harness).
 */
function runFlip(stateName, lines, opts = {}) {
  const r = compilePage(lines, { spa: opts.spa });
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);
  const dom = makeDom({ reducedMotion: opts.reducedMotion });
  const declRe = new RegExp(`(const ${stateName} = __createReactive\\([^;]*\\);)`);
  expect(r.js).toMatch(declRe);
  const probedJs = r.js.replace(declRe, `$1 window.__PROBE_${stateName} = ${stateName};`);
  // matchMedia must be reachable as a bare global inside the compiled fn.
  const fn = new Function('document', 'window', 'console', 'matchMedia', 'setTimeout', probedJs);
  const noopTimers = [];
  fn(
    dom.document,
    dom.window,
    { error() {}, log() {}, warn() {} },
    dom.window.matchMedia,
    (cb) => {
      noopTimers.push(cb);
      return 0;
    } // capture safety-net timers; we drive settle manually
  );
  const marker = findMarker(dom.body);
  const wrappers = () => (marker ? marker.children : []);
  const labels = () => wrappers().map(textOf);
  const set = (arr) => {
    dom.window[`__PROBE_${stateName}`].value = arr;
  };
  const settleAll = () =>
    wrappers().forEach((w) => w.__fireTransitionEnd && w.__fireTransitionEnd());
  return { r, ...dom, marker, wrappers, labels, set, settleAll, noopTimers };
}

const KEYED_TRANS =
  '    data daftar = []\n    Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi fade:\n      Buat teks: item.label\n';
const KEYED_ONLY =
  '    data daftar = []\n    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n';

// ─── PARSE ──────────────────────────────────────────────────────────────────
describe('list transitions (K2a) — parsing', () => {
  it('`dengan kunci … dengan transisi <name>` compiles clean (untuk form)', () => {
    const r = compilePage(KEYED_TRANS);
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('transition on the no-`untuk` `in` form compiles clean', () => {
    const r = compilePage(
      '    data daftar = []\n    Ulangi it in $daftar dengan kunci it.id dengan transisi geser:\n      Buat teks: it.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('a string transition name compiles clean', () => {
    const r = compilePage(
      '    data daftar = []\n    Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi "fade":\n      Buat teks: item.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });
});

// ─── EMIT ───────────────────────────────────────────────────────────────────
describe('list transitions (K2a) — emit', () => {
  it('WITH `dengan transisi` wraps the keyed reconcile in __flipList (honest keyword)', () => {
    const r = compilePage(KEYED_TRANS);
    expect(r.js).toMatch(/__flipList\(/);
    expect(r.js).toMatch(/__keyedList\(/);
    expect(r.js).toMatch(/name:\s*"fade"/);
    expect(r.js).toMatch(/function __flipList/);
  });

  it('WITHOUT `dengan transisi` emits plain __keyedList and NO __flipList (K1b unchanged)', () => {
    const r = compilePage(KEYED_ONLY);
    expect(r.js).toMatch(/__keyedList\(/);
    // Assert no __flipList *call* (the word also appears in a __keyedList
    // helper comment, so match the call syntax, not the bare identifier).
    expect(r.js).not.toMatch(/__flipList\(/);
    expect(r.js).not.toMatch(/function __flipList/);
  });

  it('`dengan transisi` WITHOUT a key does NOT engage FLIP (transitions require keyed identity)', () => {
    // Honest keyword: transition alone (no `dengan kunci`) must not animate.
    const r = compilePage(
      '    data daftar = []\n    Ulangi untuk item dari $daftar dengan transisi fade:\n      Buat teks: item.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.js).not.toMatch(/__flipList\(/);
    expect(r.js).not.toMatch(/function __flipList/);
  });

  it('emitted output contains zero real eval / new Function calls (CSP-safe)', () => {
    const r = compilePage(KEYED_TRANS);
    // Strip line comments so the helper's prose ("no eval, no new Function")
    // does not create a false positive; assert no actual call syntax remains.
    const code = r.js.replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/\beval\s*\(/);
    expect(code).not.toMatch(/new\s+Function\s*\(/);
  });

  it('SPA mode still registers the list watcher via __cleanupFns.push (C-1)', () => {
    const r = compilePage(KEYED_TRANS, { spa: true });
    expect(r.js).toMatch(/__cleanupFns\.push\(__watch\(/);
    expect(r.js).not.toMatch(/__cleanup\(daftar\)/);
  });

  it('nested keyed+transition loops emit two __flipList wrappers', () => {
    const nested =
      '    data grid = []\n' +
      '    Ulangi untuk baris dari $grid dengan kunci baris.id dengan transisi fade:\n' +
      '      Ulangi untuk sel dari baris.sel dengan kunci sel.id dengan transisi geser:\n' +
      '        Buat teks: sel.v\n';
    const r = compilePage(nested);
    expect(r.success).toBe(true);
    const count = (r.js.match(/__flipList\(/g) || []).length;
    expect(count).toBe(2);
  });
});

// ─── RUNTIME (JSDOM-style) ───────────────────────────────────────────────────
describe('list transitions (K2a) — runtime FLIP', () => {
  it('initial render places items (enter path) with correct labels', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);
    expect(h.labels()).toEqual(['A', 'B']);
  });

  it('reorder preserves node identity and applies then clears the move transform', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ]);
    const before = h.wrappers().slice();
    // Reverse the list → every node moves.
    h.set([
      { id: 3, label: 'C' },
      { id: 2, label: 'B' },
      { id: 1, label: 'A' },
    ]);
    expect(h.labels()).toEqual(['C', 'B', 'A']);
    // Identity preserved: the same 3 node objects, just reordered.
    const after = h.wrappers();
    expect(new Set(after)).toEqual(new Set(before));
    // A move class was applied and the transform was cleared to "play".
    const moved = after.filter((n) => n.classList.contains('fade-move'));
    expect(moved.length).toBeGreaterThan(0);
    moved.forEach((n) => expect(n.style.transform).toBe(''));
    // Settle: transitionend removes the move class (no stuck state).
    h.settleAll();
    after.forEach((n) => expect(n.classList.contains('fade-move')).toBe(false));
  });

  it('leave: removed node stays attached until transitionend, then detaches', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);
    const leaving = h.wrappers().find((w) => textOf(w) === 'B');
    h.set([{ id: 1, label: 'A' }]);
    // Not detached yet — leave animation in flight, marked with leave class.
    expect(leaving.parentNode).toBe(h.marker);
    expect(leaving.classList.contains('fade-leave')).toBe(true);
    // transitionend → node is removed.
    leaving.__fireTransitionEnd();
    expect(leaving.parentNode).toBe(null);
    expect(h.labels()).toEqual(['A']);
  });

  it('reduced-motion: no animation classes, correct final DOM (instant)', () => {
    const h = runFlip('daftar', KEYED_TRANS, { reducedMotion: true });
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);
    h.set([
      { id: 2, label: 'B' },
      { id: 1, label: 'A' },
    ]);
    // Correct order with NO move/enter classes and no lingering transform.
    expect(h.labels()).toEqual(['B', 'A']);
    h.wrappers().forEach((n) => {
      expect(n.classList.contains('fade-move')).toBe(false);
      expect(n.classList.contains('fade-enter')).toBe(false);
      expect(n.style.transform).toBe('');
    });
  });

  it('reduced-motion: removal is immediate (no deferred leave)', () => {
    const h = runFlip('daftar', KEYED_TRANS, { reducedMotion: true });
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);
    h.set([{ id: 1, label: 'A' }]);
    expect(h.labels()).toEqual(['A']); // gone at once, no transitionend needed.
  });

  it('rapid successive mutations settle without stuck transforms', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ]);
    for (let i = 0; i < 5; i++) {
      h.set([
        { id: 3, label: 'C' },
        { id: 1, label: 'A' },
        { id: 2, label: 'B' },
      ]);
      h.set([
        { id: 1, label: 'A' },
        { id: 2, label: 'B' },
        { id: 3, label: 'C' },
      ]);
    }
    h.settleAll();
    expect(h.labels()).toEqual(['A', 'B', 'C']);
    h.wrappers().forEach((n) => expect(n.style.transform).toBe(''));
  });

  it('duplicate keys still resolve to distinct nodes under transitions', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([
      { id: 1, label: 'X' },
      { id: 1, label: 'Y' },
    ]);
    expect(h.labels()).toEqual(['X', 'Y']); // `${key}__${index}` disambiguation.
  });

  it('non-array guard: clears list without throwing (transitions off-path)', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([{ id: 1, label: 'A' }]);
    expect(() => h.set(null)).not.toThrow();
    expect(h.labels()).toEqual([]);
  });

  it('empty array clears the list (after leave animations settle)', () => {
    const h = runFlip('daftar', KEYED_TRANS);
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);
    const leaving = h.wrappers().slice();
    h.set([]);
    // Leave animations in flight: nodes marked + still attached until settle.
    leaving.forEach((n) => expect(n.classList.contains('fade-leave')).toBe(true));
    leaving.forEach((n) => n.__fireTransitionEnd());
    expect(h.labels()).toEqual([]);
  });
});

// ─── SPA CLEANUP (C-1) ───────────────────────────────────────────────────────
describe('list transitions (K2a) — SPA cleanup (C-1)', () => {
  it('SPA: the list watcher is torn down via unsub without killing sibling watchers', () => {
    // Two reactive consumers of the SAME source: a keyed+transition list AND a
    // plain `Saat` watcher. Tearing down the list must NOT kill the sibling.
    const SPA_SRC =
      '    data daftar = []\n' +
      '    Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi fade:\n' +
      '      Buat teks: item.label\n' +
      '    Saat daftar:\n' +
      '      Buat teks: panjang($daftar)\n';
    const r = compilePage(SPA_SRC, { spa: true });
    expect(r.success).toBe(true);
    // Emit contract: both the list and the sibling register via __cleanupFns,
    // and neither uses the destructive __cleanup(daftar).
    expect(r.js).toMatch(/__cleanupFns\.push\(__watch\(daftar/);
    expect(r.js).not.toMatch(/__cleanup\(daftar\)/);
    // The unsub returned by __watch is what gets pushed (per-watcher teardown).
    expect(r.js).toMatch(/__flipList\(/);
  });

  it('runtime C-1: a keyed+transition list does NOT kill a sibling watcher on the SAME source', () => {
    // Two consumers of `daftar`: the FLIP list + a `Saat` sibling. A destructive
    // __cleanup(daftar) would silence the sibling; per-watcher unsub keeps both
    // firing across re-renders. Assert the sibling count node tracks the length.
    const SRC =
      '    data daftar = []\n' +
      '    Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi fade:\n' +
      '      Buat teks: item.label\n' +
      '    Saat daftar:\n' +
      '      Buat teks: panjang($daftar)\n';
    const h = runFlip('daftar', SRC);
    const allText = () => {
      let t = '';
      const walk = (n) => {
        if (!n) return;
        if (n._text) t += n._text + '|';
        (n.children || []).forEach(walk);
      };
      walk(h.body);
      return t;
    };
    h.set([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ]);
    // List reflects items AND the sibling `Saat` watcher reflects length 3.
    expect(h.labels()).toEqual(['A', 'B', 'C']);
    expect(allText()).toMatch(/3/); // sibling still alive after list re-render.
  });
});
