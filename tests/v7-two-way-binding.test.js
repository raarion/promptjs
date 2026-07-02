/**
 * PromptJS — Regression: two-way form binding (`ikat` / `bind`).
 *
 * New feature (closes a documented gap: previously syncing an input's value to
 * reactive state required manual `Ketika ... diketik:` + `simpan ...value ke x`
 * boilerplate and a querySelector round-trip). Declaring `ikat = <state>` (or
 * the English `bind = <state>`) inside a form-element body wires the element's
 * `.value` and the reactive state BOTH ways:
 *
 *   1. initial : el.value = state.value                       (state -> input)
 *   2. input   : addEventListener('input', __setState(...))   (input -> state)
 *   3. reactive: __watch(state, v => el.value = v)            (state -> input)
 *
 * The state->input watch is caret-safe (only writes when the value actually
 * differs). In SPA mode (`router: benar`) the input listener AND the watch unsub
 * are both registered into `__cleanupFns` so nothing leaks across route changes,
 * mirroring the existing KetikaStatement / reactive-loop cleanup idiom.
 *
 * These tests lock: both keywords compile & emit all three wires, SPA cleanup is
 * registered, the emitted JS is syntactically valid, existing `nilai = ...`
 * (one-way value) is NOT hijacked, and a full RUNTIME probe proves both
 * directions on the ACTUAL compiler output (not a hand-written shape).
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/** Compile a page with an input that binds via `ikat`/`bind`; return result. */
function compileBinding(bindLine, { spa = false, stateName = 'nama', stateInit = '""' } = {}) {
  const frontMatter = spa ? '---\nrouter: benar\n---\n' : '';
  const src =
    frontMatter +
    'Halaman P:\n' +
    `    data ${stateName} = ${stateInit}\n` +
    '    Buat masukan #f:\n' +
    `        ${bindLine}\n`;
  return Engine.compile(src);
}

describe('two-way binding — parsing & emission', () => {
  it('`ikat = <state>` compiles without error', () => {
    const r = compileBinding('ikat = nama');
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('English `bind = <state>` compiles without error', () => {
    const r = compileBinding('bind = name', { stateName: 'name' });
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('emits the initial state -> input sync', () => {
    const r = compileBinding('ikat = nama');
    expect(r.js).toMatch(/\.value = nama\.value;/);
  });

  it('emits the input -> state listener via __setState', () => {
    const r = compileBinding('ikat = nama');
    expect(r.js).toMatch(/addEventListener\("input",/);
    expect(r.js).toContain('__setState(nama, event.target.value)');
  });

  it('emits the reactive state -> input watch (caret-safe)', () => {
    const r = compileBinding('ikat = nama');
    expect(r.js).toMatch(
      /__watch\(nama, \(__v\) => \{ if \(.*\.value !== __v\) .*\.value = __v; \}\)/
    );
  });

  it('English `bind` targets the correct proxy in the watch', () => {
    const r = compileBinding('bind = name', { stateName: 'name' });
    expect(r.js).toMatch(/__watch\(name,/);
    expect(r.js).toContain('__setState(name, event.target.value)');
  });

  it('emitted JS is syntactically valid (parses via new Function)', () => {
    const r = compileBinding('ikat = nama');
    expect(() => new Function(r.js)).not.toThrow();
  });
});

describe('two-way binding — SPA cleanup (no listener/watch leak)', () => {
  it('registers input listener removal in __cleanupFns', () => {
    const r = compileBinding('ikat = nama', { spa: true });
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__cleanupFns\.push\(function\(\)\s*\{[^}]*removeEventListener\("input"/);
  });

  it('registers the __watch unsub in __cleanupFns', () => {
    const r = compileBinding('ikat = nama', { spa: true });
    expect(r.js).toMatch(/__cleanupFns\.push\(__watch\(nama,/);
  });

  it('SPA emitted JS is syntactically valid', () => {
    const r = compileBinding('ikat = nama', { spa: true });
    expect(() => new Function(r.js)).not.toThrow();
  });
});

describe('two-way binding — no regression on one-way value', () => {
  it('`nilai = <expr>` still emits a plain one-way value assignment (NOT a binding)', () => {
    const r = compileBinding('nilai = nama');
    expect(r.success).toBe(true);
    // one-way value writes the value but must NOT wire an input listener/watch
    expect(r.js).toMatch(/\.value = nama\.value;/);
    expect(r.js).not.toContain('__setState(nama, event.target.value)');
    expect(r.js).not.toMatch(/__watch\(nama,/);
  });
});

describe('two-way binding — RUNTIME behavior on actual compiler output', () => {
  /**
   * Execute the emitted IIFE against a stubbed DOM, capture the bound input via
   * its 'input' listener, and drive both directions. State lives inside the page
   * IIFE, so we expose the proxy by appending a global assignment before it closes.
   */
  function runBound() {
    const base = compileBinding('ikat = nama', { stateInit: '"awal"' });
    expect(base.success).toBe(true);
    const js = base.js.replace(/\}\)\(\);\s*$/, 'window.__PROBE_nama = nama; })();');

    let boundInput = null;
    function makeEl() {
      const L = {};
      const el = {
        _v: '',
        get value() {
          return this._v;
        },
        set value(v) {
          this._v = v;
        },
        set id(_v) {},
        set className(_v) {},
        setAttribute() {},
        addEventListener(ev, fn) {
          L[ev] = fn;
          if (ev === 'input') boundInput = el;
        },
        appendChild() {},
        fireInput(v) {
          this._v = v;
          if (L.input) L.input({ target: el });
        },
      };
      return el;
    }
    const documentStub = {
      createElement() {
        return makeEl();
      },
      createTextNode() {
        return {};
      },
      querySelector() {
        return makeEl();
      },
      addEventListener() {},
      body: { appendChild() {} },
    };
    const win = {};
    new Function('document', 'window', 'console', js)(documentStub, win, { error() {}, log() {} });
    return { boundInput, proxy: win.__PROBE_nama };
  }

  it('initial sync sets input.value from state', () => {
    const { boundInput, proxy } = runBound();
    expect(proxy).toBeTruthy();
    expect(boundInput).toBeTruthy();
    expect(boundInput.value).toBe('awal');
  });

  it('typing into the input updates the state (input -> state)', () => {
    const { boundInput, proxy } = runBound();
    boundInput.fireInput('halo dunia');
    expect(proxy.value).toBe('halo dunia');
  });

  it('programmatic state change updates the input (state -> input)', () => {
    const { boundInput, proxy } = runBound();
    proxy.value = 'dari kode';
    expect(boundInput.value).toBe('dari kode');
  });

  it('setting the same value is a safe no-op (no throw, no clobber)', () => {
    const { boundInput, proxy } = runBound();
    proxy.value = 'sama';
    expect(() => {
      proxy.value = 'sama';
    }).not.toThrow();
    expect(boundInput.value).toBe('sama');
  });
});
