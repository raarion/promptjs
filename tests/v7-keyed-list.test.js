/**
 * PromptJS — K1b: keyed list reconciliation (`dengan kunci <expr>`), #49.
 * ============================================================================
 * Three-tier coverage (parse → emit → runtime) for the keyed diff built on the
 * K1a reactive-list foundation. Opsi B (Map<key,node>) over the REAL DOM nodes,
 * NO vDOM: nodes are reused / reordered (insertBefore) / removed / re-rendered.
 *
 * The "honest keyword" contract is asserted both ways:
 *   - WITH `dengan kunci`  → emits __keyedList (keyed diff, node reuse).
 *   - WITHOUT it           → falls back to the K1a full re-render (no keyedList).
 *
 * Edge cases covered: reorder, insert, remove, update (same key, changed value),
 * duplicate key (`${key}__${index}`), non-array guard, empty array, nested loop,
 * two-way binding inside an item, and the C-1 sibling-watcher survival guarantee.
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
 * Keyed-capable DOM stub: tracks children order + parentNode/nextSibling so the
 * reconciler's insertBefore/removeChild/replaceChildren behave like a real DOM.
 */
function makeDom() {
  function makeEl(tag) {
    const el = {
      tagName: tag,
      className: '',
      _text: '',
      children: [],
      parentNode: null,
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
        if (ref == null) {
          this.children.push(n);
        } else {
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
      addEventListener() {},
      querySelector() {
        return null;
      },
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
  return { document, body, makeEl };
}

/** Find the first list marker element in a subtree. */
function findMarker(el) {
  if (el && el.className === '__promptjs_list_marker') return el;
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
 * Run a page, exposing the reactive proxy `stateName` on window as
 * `__PROBE_<name>` via string-surgery (mirrors the K1a test harness). Returns
 * the marker + a labels() helper reading each wrapper's text in DOM order.
 */
function runKeyed(stateName, lines, opts = {}) {
  const r = compilePage(lines, opts);
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);
  const { document, body } = makeDom();
  const win = {};
  const declRe = new RegExp(`(const ${stateName} = __createReactive\\([^;]*\\);)`);
  expect(r.js).toMatch(declRe);
  const probedJs = r.js.replace(declRe, `$1 window.__PROBE_${stateName} = ${stateName};`);
  new Function('document', 'window', 'console', probedJs)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  const marker = findMarker(body);
  const wrappers = () => (marker ? marker.children : []);
  const labels = () => wrappers().map(textOf);
  return { r, document, body, win, marker, wrappers, labels };
}

const KEYED =
  '    data daftar = []\n    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n';

// ─── PARSE ───────────────────────────────────────────────────────────────────
describe('keyed list (K1b) — parsing', () => {
  it('`dengan kunci <expr>` on a reactive loop compiles clean', () => {
    const r = compilePage(KEYED);
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('`dengan kunci` on the no-`untuk` `in` form compiles clean', () => {
    const r = compilePage(
      '    data daftar = []\n    Ulangi it in $daftar dengan kunci it.id:\n      Buat teks: it.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('a bare `dengan` identifier (no `kunci`) is NOT treated as a key clause', () => {
    // `dengan` alone must still be usable as a normal identifier elsewhere; here
    // we simply assert the honest keyword needs BOTH words — a loop without the
    // pair parses as a plain (K1a) loop.
    const r = compilePage(
      '    data daftar = []\n    Ulangi untuk item dari $daftar:\n      Buat teks: item\n'
    );
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('__keyedList');
  });
});

// ─── EMIT ────────────────────────────────────────────────────────────────────
describe('keyed list (K1b) — emission', () => {
  it('WITH `dengan kunci` emits __keyedList with a keyFn + renderFn (no full-replace loop)', () => {
    const r = compilePage(KEYED);
    expect(r.js).toContain('function __keyedList');
    expect(r.js).toMatch(/__keyedList\(__lmarker\w*, __list, \(item, indeks\) => \(item\.id\),/);
    expect(r.js).toContain('__promptjs_keyed_item');
  });

  it('honest keyword: WITHOUT `dengan kunci` falls back to K1a (no __keyedList)', () => {
    const r = compilePage(
      '    data daftar = []\n    Ulangi untuk item dari $daftar:\n      Buat teks: item\n'
    );
    expect(r.js).not.toContain('__keyedList');
    expect(r.js).toContain('.replaceChildren()');
    expect(r.js).toMatch(/__watch\(daftar,/);
  });

  it('C-1: SPA keyed list registers unsub via __cleanupFns.push (never __cleanup(source))', () => {
    const r = compilePage(KEYED, { spa: true });
    expect(r.js).toContain('__cleanupFns.push(__watch(daftar,');
    expect(r.js).not.toContain('__cleanup(daftar)');
  });

  it('C-5: keyed reconciler clears non-array via replaceChildren(), never innerHTML', () => {
    const r = compilePage(KEYED);
    // the helper body guards non-array with replaceChildren
    expect(r.js).toContain('marker.replaceChildren()');
    expect(r.js).not.toMatch(/marker\.innerHTML/);
  });

  it('nested keyed loops emit two __keyedList calls', () => {
    const r = compilePage(
      '    data baris = []\n    data kolom = []\n' +
        '    Ulangi untuk b dari $baris dengan kunci b.id:\n' +
        '      Ulangi untuk k dari $kolom dengan kunci k.id:\n' +
        '        Buat teks: k.label\n'
    );
    expect(r.success).toBe(true);
    const calls = (r.js.match(/__keyedList\(/g) || []).length;
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});

// ─── RUNTIME (JSDOM-style) ────────────────────────────────────────────────────
describe('keyed list (K1b) — runtime', () => {
  it('renders the initial keyed array', () => {
    const { win, labels } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ];
    expect(labels()).toEqual(['a', 'b', 'c']);
  });

  it('reorders by REUSING the same DOM nodes (keyed identity preserved)', () => {
    const { win, wrappers, labels } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ];
    const nodeA = wrappers().find((w) => textOf(w) === 'a');
    win.__PROBE_daftar.value = [
      { id: 3, label: 'c' },
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ];
    expect(labels()).toEqual(['c', 'a', 'b']);
    // same key ⇒ same node instance moved, not recreated
    expect(wrappers().find((w) => textOf(w) === 'a')).toBe(nodeA);
  });

  it('inserts a new key in the middle without disturbing reused nodes', () => {
    const { win, wrappers, labels } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ];
    const nodeA = wrappers().find((w) => textOf(w) === 'a');
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 3, label: 'c' },
      { id: 2, label: 'b' },
    ];
    expect(labels()).toEqual(['a', 'c', 'b']);
    expect(wrappers().find((w) => textOf(w) === 'a')).toBe(nodeA);
  });

  it('removes nodes whose key disappeared', () => {
    const { win, labels } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ];
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 3, label: 'c' },
    ];
    expect(labels()).toEqual(['a', 'c']);
  });

  it('updates content when a key persists but its value changed (no stale node)', () => {
    const { win, labels } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ];
    win.__PROBE_daftar.value = [
      { id: 1, label: 'A2' },
      { id: 2, label: 'b' },
    ];
    expect(labels()).toEqual(['A2', 'b']);
  });

  it('duplicate keys are disambiguated (both items render, no collision)', () => {
    const { win, labels } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [
      { id: 9, label: 'x' },
      { id: 9, label: 'y' },
    ];
    expect(labels()).toEqual(['x', 'y']);
  });

  it('guard: non-array clears the list without throwing', () => {
    const { win, wrappers } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [{ id: 1, label: 'a' }];
    expect(() => {
      win.__PROBE_daftar.value = null;
    }).not.toThrow();
    expect(wrappers().length).toBe(0);
  });

  it('guard: empty array renders nothing', () => {
    const { win, wrappers } = runKeyed('daftar', KEYED);
    win.__PROBE_daftar.value = [{ id: 1, label: 'a' }];
    win.__PROBE_daftar.value = [];
    expect(wrappers().length).toBe(0);
  });

  it('C-1: a keyed list watcher does NOT kill a sibling watcher on the SAME source', () => {
    // A keyed list AND a `Saat` count watcher both subscribe to `daftar`.
    // Per-watcher unsub (C-1) must keep BOTH alive across re-renders — the
    // destructive __cleanup(daftar) would have silenced the sibling.
    const { win, body } = runKeyed(
      'daftar',
      '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n' +
        '    Saat daftar:\n      Buat teks: panjang($daftar)\n'
    );
    win.__PROBE_daftar.value = [{ id: 1, label: 'a' }];
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
      { id: 3, label: 'c' },
    ];
    // collect ALL text in the page (list wrappers + sibling count node)
    const all = [];
    const walk = (n) => {
      if (!n) return;
      if (n._text) all.push(String(n._text));
      (n.children || []).forEach(walk);
    };
    walk(body);
    // keyed list watcher alive → all three labels present
    expect(all).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    // sibling `Saat` watcher alive → count reflects latest length (3)
    expect(all).toContain('3');
  });

  it('two-way binding inside a keyed item compiles + wires __setState', () => {
    const r = compilePage(
      '    data daftar = []\n    data nama = ""\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n' +
        '      Buat masukan #f:\n          ikat = nama\n'
    );
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain('__keyedList(');
    expect(r.js).toContain('__setState(nama, event.target.value)');
  });
});
