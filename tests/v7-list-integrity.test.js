/**
 * PromptJS — K1c: reactive/keyed list INTEGRITY & reactivity-signal guards, #50.
 * ============================================================================
 * K1a (#48) added reactive list rendering; K1b (#49) added the keyed diff via
 * `dengan kunci`. This file STRENGTHENS the invariants that keep those two
 * features honest and leak-free. It does NOT change behaviour — it only asserts
 * guarantees the enhancer/refiner must never regress:
 *
 *   • Honest keyword  — `dengan kunci` genuinely switches to the keyed path
 *     (node reuse on reorder); WITHOUT it the loop rebuilds (K1a fallback).
 *     Proven both at emit level AND at runtime (node identity).
 *   • C-1 (High)      — list teardown uses the per-watcher `unsub` returned by
 *     __watch (registered via __cleanupFns.push), NEVER the destructive
 *     __cleanup(source). Strengthened here with MULTI-sibling survival, REPEATED
 *     teardown (idempotent unsub), and NESTED-loop sibling survival.
 *   • C-3            — the reactivity SIGNAL alone selects the path: a reactive
 *     source (`data`/`turunan`) takes __watch/__keyedList; a non-reactive source
 *     (`tetap`/`ubah`/inline literal) keeps the plain one-shot forEach with NO
 *     __watch and NO __keyedList (regression guard against accidental promotion).
 *
 * Three-tier: parse (compiles clean) → emit (generated JS shape) → runtime
 * (JSDOM-style stub, real node identity). All assertions target NEW ground not
 * already covered by v7-reactive-list / v7-keyed-list.
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
 * reconciler's insertBefore / removeChild / replaceChildren behave like a real
 * DOM (mirrors the K1a/K1b harness so node-identity assertions are meaningful).
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

/** All text within a subtree, concatenated in DOM order. */
function allText(root) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n._text) out.push(String(n._text));
    (n.children || []).forEach(walk);
  };
  walk(root);
  return out;
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
 * Run a page, exposing each reactive proxy in `stateNames` on `window` as
 * `__PROBE_<name>` via string-surgery (mirrors the K1a/K1b harness). Returns the
 * window + body so tests can mutate sources and inspect the DOM.
 */
function runPage(stateNames, lines, opts = {}) {
  const r = compilePage(lines, opts);
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);
  const { document, body } = makeDom();
  const win = {};
  let js = r.js;
  for (const name of stateNames) {
    const declRe = new RegExp(`(const ${name} = __createReactive\\([^;]*\\);)`);
    expect(js).toMatch(declRe);
    js = js.replace(declRe, `$1 window.__PROBE_${name} = ${name};`);
  }
  new Function('document', 'window', 'console', js)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  return { r, document, body, win };
}

const KEYED =
  '    data daftar = []\n    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n';
const NONKEYED =
  '    data daftar = []\n    Ulangi untuk item dari $daftar:\n      Buat teks: item.label\n';

// ─── HONEST KEYWORD (emit + runtime node-identity) ──────────────────────────
describe('K1c integrity — honest `dengan kunci` keyword', () => {
  it('emit: adding `dengan kunci` is the ONLY difference that turns on __keyedList', () => {
    const keyed = compilePage(KEYED);
    const plain = compilePage(NONKEYED);
    expect(keyed.success && plain.success).toBe(true);
    // keyed path present only in the keyed compile
    expect(keyed.js).toContain('__keyedList(');
    expect(plain.js).not.toContain('__keyedList(');
    // both still reactive (K1a foundation) — the keyword does not remove __watch
    expect(keyed.js).toMatch(/__watch\(daftar,/);
    expect(plain.js).toMatch(/__watch\(daftar,/);
  });

  it('runtime: WITH `dengan kunci`, a reorder REUSES the same DOM node', () => {
    const { win, body } = runPage(['daftar'], KEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ];
    const marker = findMarker(body);
    const nodeA = marker.children.find((w) => textOf(w) === 'a');
    win.__PROBE_daftar.value = [
      { id: 2, label: 'b' },
      { id: 1, label: 'a' },
    ];
    // same key ⇒ identical node instance, just moved
    expect(marker.children.map(textOf)).toEqual(['b', 'a']);
    expect(marker.children.find((w) => textOf(w) === 'a')).toBe(nodeA);
  });

  it('runtime: WITHOUT `dengan kunci`, the same reorder REBUILDS nodes (K1a fallback)', () => {
    const { win, body } = runPage(['daftar'], NONKEYED);
    win.__PROBE_daftar.value = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ];
    const marker = findMarker(body);
    const nodeA = marker.children.find((c) => textOf(c) === 'a');
    win.__PROBE_daftar.value = [
      { id: 2, label: 'b' },
      { id: 1, label: 'a' },
    ];
    // content is correct...
    expect(marker.children.map(textOf)).toEqual(['b', 'a']);
    // ...but identity is NOT preserved: full re-render replaced the old node
    expect(marker.children.find((c) => textOf(c) === 'a')).not.toBe(nodeA);
  });
});

// ─── C-3: reactivity SIGNAL selects the path ────────────────────────────────
describe('K1c integrity — C-3 reactivity-signal guard', () => {
  it('non-reactive `tetap` source: one-shot forEach, NO __watch / NO __keyedList', () => {
    const r = compilePage(
      '    tetap items = [{ id: 1, label: "a" }]\n' +
        '    Ulangi untuk it dari $items dengan kunci it.id:\n      Buat teks: it.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.js).not.toMatch(/__watch\(items,/);
    expect(r.js).not.toContain('__keyedList(');
    expect(r.js).toMatch(/items\.forEach\(/);
  });

  it('non-reactive `ubah` local source: one-shot forEach, NO __watch / NO __keyedList', () => {
    const r = compilePage(
      '    ubah items = [{ id: 1, label: "a" }]\n' +
        '    Ulangi untuk it dari $items dengan kunci it.id:\n      Buat teks: it.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.js).not.toMatch(/__watch\(items,/);
    expect(r.js).not.toContain('__keyedList(');
    expect(r.js).toMatch(/items\.forEach\(/);
  });

  it('reactive `turunan` (computed) source IS promoted to the reactive path', () => {
    const r = compilePage(
      '    data dasar = []\n    turunan items = $dasar\n' +
        '    Ulangi untuk it dari $items dengan kunci it.id:\n      Buat teks: it.label\n'
    );
    expect(r.success).toBe(true);
    // computed sources are reactive ⇒ keyed diff wired on the derived proxy
    expect(r.js).toContain('__keyedList(');
    expect(r.js).toMatch(/__watch\(items,/);
  });
});

// ─── C-1 (High): per-watcher unsub, strengthened ────────────────────────────
describe('K1c integrity — C-1 sibling-watcher survival (strengthened)', () => {
  it('emit: keyed + non-keyed loops both push unsub, never __cleanup(source) (SPA)', () => {
    const r = compilePage(
      '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n' +
        '    Ulangi untuk it dari $daftar:\n      Buat teks: it.label\n',
      { spa: true }
    );
    expect(r.success).toBe(true);
    // every list watcher on `daftar` is torn down via cleanupFns.push(__watch(...))
    const pushes = (r.js.match(/__cleanupFns\.push\(__watch\(daftar,/g) || []).length;
    expect(pushes).toBeGreaterThanOrEqual(2);
    // and the destructive whole-source cleanup is never used for list teardown
    expect(r.js).not.toContain('__cleanup(daftar)');
  });

  it('runtime: a keyed list does NOT kill MULTIPLE sibling watchers on the same source', () => {
    // Two independent `Saat` watchers + a keyed list, all subscribed to `daftar`.
    // Destructive __cleanup(daftar) would silence BOTH siblings; per-watcher
    // unsub must keep all three firing across repeated re-renders. Each sibling
    // renders `panjang($daftar)` (a bare count node) — mirrors the proven K1b
    // sibling harness — so BOTH counters must reflect the latest length.
    const { win, body } = runPage(
      ['daftar'],
      '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n' +
        '    Saat daftar:\n      Buat teks: panjang($daftar)\n' +
        '    Saat daftar:\n      Buat teks: panjang($daftar)\n'
    );
    win.__PROBE_daftar.value = [{ id: 1, label: 'x' }];
    win.__PROBE_daftar.value = [
      { id: 1, label: 'x' },
      { id: 2, label: 'y' },
    ];
    const txt = allText(body);
    // keyed list watcher alive → both labels present
    expect(txt).toEqual(expect.arrayContaining(['x', 'y']));
    // BOTH sibling watchers alive → the count 2 appears at least twice
    expect(txt.filter((t) => t === '2').length).toBeGreaterThanOrEqual(2);
  });

  it('runtime: repeated source mutations keep the keyed list AND sibling in sync (no drift)', () => {
    const { win, body } = runPage(
      ['daftar'],
      '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n      Buat teks: item.label\n' +
        '    Saat daftar:\n      Buat teks: panjang($daftar)\n'
    );
    // hammer the source several times; every watcher must survive each cycle
    for (let i = 1; i <= 5; i++) {
      const arr = [];
      for (let k = 1; k <= i; k++) arr.push({ id: k, label: 'L' + k });
      win.__PROBE_daftar.value = arr;
    }
    const txt = allText(body);
    expect(txt).toEqual(expect.arrayContaining(['L1', 'L2', 'L3', 'L4', 'L5']));
    // sibling still firing after 5 cycles → shows the final length
    expect(txt).toContain('5');
  });

  it('runtime: NESTED keyed loop watcher does not kill an outer sibling on the same source', () => {
    const { win, body } = runPage(
      ['baris'],
      '    data baris = []\n' +
        '    Ulangi untuk b dari $baris dengan kunci b.id:\n' +
        '      Ulangi untuk c dari $baris dengan kunci c.id:\n' +
        '        Buat teks: c.label\n' +
        '    Saat baris:\n      Buat teks: panjang($baris)\n'
    );
    win.__PROBE_baris.value = [
      { id: 1, label: 'p' },
      { id: 2, label: 'q' },
    ];
    const txt = allText(body);
    // nested list rendered (labels appear) and outer sibling still alive
    expect(txt).toEqual(expect.arrayContaining(['p', 'q']));
    expect(txt).toContain('2');
  });
});
