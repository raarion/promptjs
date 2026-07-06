/**
 * v16 — LIM-CLASS-01: `on_kelas` / `on_class` dynamic class binding crash
 *
 * Bug: when the RHS of `on_kelas = <expr>` is anything other than a bare
 * Identifier (e.g. a ternary, string concatenation, or any other
 * expression), the compiler passed the *evaluated value* (a primitive
 * string/boolean) into `__watch(...)` instead of a reactive proxy. Since
 * `__watch` stores subscribers in a `WeakMap` keyed by the first argument,
 * this crashed at runtime with:
 *
 *   TypeError: Invalid value used as weak map key
 *
 * Reproduction (found during v132 fast-track audit, related to tracked
 * backlog item #77 — "reactive class binding via saat + kelas may target
 * watcher marker"):
 *
 *   data aktif = benar
 *   Buat div#dalam:
 *     on_kelas = aktif ? "item-aktif" : "item-nonaktif"
 *
 * Fix: non-Identifier RHS expressions are now wrapped in
 * `__createComputed(() => <expr>)`, producing a real reactive proxy that is
 * watched (and re-evaluated whenever its dependencies change), matching the
 * same "computed" pattern already used by `turunan`. Bare-Identifier RHS
 * (the common case, e.g. `on_kelas = tema`) is unchanged — it still watches
 * the identifier's reactive proxy directly, with zero extra overhead.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');

/** Compile PromptJS source and run the resulting JS against a stubbed DOM. */
function runSource(source) {
  const r = compile(source);
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);

  function makeEl(tag) {
    const el = {
      tagName: tag,
      className: '',
      id: '',
      _text: '',
      children: [],
      set innerText(v) {
        this._text = v;
      },
      get innerText() {
        return this._text;
      },
      appendChild(c) {
        this.children.push(c);
        return c;
      },
      setAttribute() {},
      addEventListener() {},
    };
    return el;
  }
  const elementsById = new Map();
  const origMakeEl = makeEl;
  function trackedMakeEl(tag) {
    const el = origMakeEl(tag);
    Object.defineProperty(el, 'id', {
      get() {
        return this._id || '';
      },
      set(v) {
        this._id = v;
        elementsById.set(v, el);
      },
    });
    return el;
  }
  const body = trackedMakeEl('body');
  const document = {
    createElement: (t) => trackedMakeEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: t }),
    querySelector: () => trackedMakeEl('div'),
    addEventListener() {},
    body,
  };
  const win = {};
  // Stash reactive proxies onto window so tests can mutate them post-render,
  // mirroring the existing `runPageWithProbe` idiom used elsewhere (v7-reactive-list).
  const probedJs = r.js.replace(
    /const (\w+) = __createReactive\(/g,
    'const $1 = window.__PROBE_$1 = __createReactive('
  );
  new Function('document', 'window', 'console', probedJs)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  return { r, document, body, win, elementsById };
}

describe('LIM-CLASS-01 — on_kelas with bare Identifier (baseline, unaffected)', () => {
  it('compiles to a direct __watch(<identifier>, ...) with no computed wrapper', () => {
    const r = compile('data tema = "terang"\n\nBuat div#kotak:\n    on_kelas = tema');
    expect(r.success).toBe(true);
    expect(r.js).toContain('__watch(tema, (nilaiBaru)');
    expect(r.js).not.toContain('__createComputed');
  });

  it('runtime: updates className when the identifier changes', () => {
    const { win, elementsById } = runSource(
      'data tema = "terang"\n\nBuat div#kotak:\n    on_kelas = tema'
    );
    const el = elementsById.get('kotak');
    expect(el.className).toBe('terang');
    win.__PROBE_tema.value = 'gelap';
    expect(el.className).toBe('gelap');
  });
});

describe('LIM-CLASS-01 — on_kelas with a non-Identifier expression (bug repro + fix)', () => {
  it('compiles ternary RHS to a __createComputed(...) wrapper, not a raw value watch', () => {
    const r = compile(
      'data aktif = benar\n\nBuat div#dalam:\n    on_kelas = aktif ? "item-aktif" : "item-nonaktif"'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain(
      '__createComputed(() => (aktif.value ? "item-aktif" : "item-nonaktif"))'
    );
    // The watch target must be the computed proxy variable, not the raw ternary value.
    expect(r.js).toMatch(/__watch\(__classComputed_\d+, \(nilaiBaru\)/);
  });

  it('runtime: does NOT throw "Invalid value used as weak map key"', () => {
    expect(() => {
      runSource(
        'data aktif = benar\n\nBuat div#dalam:\n    on_kelas = aktif ? "item-aktif" : "item-nonaktif"'
      );
    }).not.toThrow();
  });

  it('runtime: sets the correct initial className from the ternary', () => {
    const { elementsById } = runSource(
      'data aktif = benar\n\nBuat div#dalam:\n    on_kelas = aktif ? "item-aktif" : "item-nonaktif"'
    );
    const el = elementsById.get('dalam');
    expect(el.className).toBe('item-aktif');
  });

  it('runtime: reactively updates className when the source changes (true → false)', () => {
    const { win, elementsById } = runSource(
      'data aktif = benar\n\nBuat div#dalam:\n    on_kelas = aktif ? "item-aktif" : "item-nonaktif"'
    );
    const el = elementsById.get('dalam');
    expect(el.className).toBe('item-aktif');
    win.__PROBE_aktif.value = false;
    expect(el.className).toBe('item-nonaktif');
    win.__PROBE_aktif.value = true;
    expect(el.className).toBe('item-aktif');
  });

  it('runtime: works for string concatenation RHS too', () => {
    const { win, elementsById } = runSource(
      'data ukuran = "besar"\n\nBuat div#kartu:\n    on_kelas = "kartu-" + ukuran'
    );
    const el = elementsById.get('kartu');
    expect(el.className).toBe('kartu-besar');
    win.__PROBE_ukuran.value = 'kecil';
    expect(el.className).toBe('kartu-kecil');
  });
});
