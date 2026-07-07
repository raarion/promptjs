/**
 * PromptJS — Regression + boundary tests for GitHub issue #80
 * "[v132 backlog] Direct reactive turunan display/property binding is partial"
 *
 * Suggested test cases from the issue:
 *   - Render a computed value directly in text output.
 *   - Bind a computed value to an attribute/property.
 *   - Update the source reactive value and verify the computed
 *     display/binding updates.
 *   - Verify cycle diagnostics such as E4201 still work and give useful
 *     suggestions.
 *
 * Acceptance criteria from the issue:
 *   - Add regression tests for supported computed display/binding forms.
 *   - Unsupported forms should produce a clear diagnostic OR docs note
 *     (no silent wrong behavior).
 *   - Release notes should avoid claiming broad computed reactivity unless
 *     these cases pass.
 *
 * This suite documents, with executable proof, exactly where the boundary
 * currently sits (as of v132 commit 5dec780 / this commit):
 *
 *   SUPPORTED:     `turunan` read inside `Saat` — fully reactive, re-renders
 *                  on every dependency change (same mechanism as `data`).
 *   SUPPORTED:     `turunan` bound to `on_kelas` — reactive (LIM-CLASS-01
 *                  fix wraps any non-Identifier RHS, and a bare `turunan`
 *                  identifier IS itself a reactive proxy, same as `data`).
 *   NOT SUPPORTED: `turunan` assigned directly to a property (`teks =
 *                  <turunan>`, no `Saat`) — one-time snapshot, matching the
 *                  same documented boundary as plain `data` (see
 *                  docs/language/reactivity.md's "Penting" callout, added
 *                  in commit 9415eb5). This is a DOCUMENTED limitation, not
 *                  a silent bug — verified here to make sure it stays that
 *                  way (no accidental regression to something worse, no
 *                  accidental undocumented "fix" that isn't actually
 *                  tested).
 *   VERIFIED:      E4201 cycle diagnostics still fire correctly and name
 *                  the specific turunan to break (LIM-3, commit a94eb5f).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');

/** Run compiled JS and return handles for post-hoc mutation/inspection. */
function runSource(source) {
  const r = compile(source);
  expect(r.success).toBe(true);
  expect(r.errors).toEqual([]);

  function makeEl(tag) {
    const el = {
      tagName: tag,
      _className: '',
      _id: '',
      _text: '',
      children: [],
      set className(v) {
        this._className = String(v);
      },
      get className() {
        return this._className;
      },
      set id(v) {
        this._id = v;
      },
      get id() {
        return this._id;
      },
      set innerText(v) {
        // Real DOM coerces innerText to a string.
        this._text = String(v);
      },
      get innerText() {
        return this._text;
      },
      set innerHTML(v) {
        if (v === '') this.children = [];
      },
      appendChild(c) {
        this.children.push(c);
        return c;
      },
      querySelector(sel) {
        const idMatch = sel.match(/^#(.+)$/);
        if (idMatch) {
          const stack = [...this.children];
          while (stack.length) {
            const n = stack.shift();
            if (n.id === idMatch[1]) return n;
            stack.push(...(n.children || []));
          }
          return null;
        }
        return null;
      },
      setAttribute() {},
      addEventListener() {},
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
  const win = {};
  const probedJs = r.js
    .replace(
      /const (\w+) = __createReactive\(/g,
      'const $1 = window.__PROBE_$1 = __createReactive('
    )
    .replace(
      /const (\w+) = __createComputed\(/g,
      'const $1 = window.__PROBE_$1 = __createComputed('
    );
  new Function('document', 'window', 'console', probedJs)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  return { r, document, body, win };
}

/** Recursively collect innerText from an element subtree. */
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

describe('#80 — SUPPORTED: turunan is reactive when read inside Saat', () => {
  it('renders the initial computed value', () => {
    const { body } = runSource(
      'data hitung = 0\nturunan ganda = hitung * 2\n\n' + 'Saat ganda:\n    Buat span: ganda'
    );
    expect(collectText(body)).toContain('0');
  });

  it('updates the display when the underlying data changes', () => {
    const { win, body } = runSource(
      'data hitung = 0\nturunan ganda = hitung * 2\n\n' + 'Saat ganda:\n    Buat span: ganda'
    );
    win.__PROBE_hitung.value = 5;
    expect(collectText(body)).toContain('10');
    win.__PROBE_hitung.value = 21;
    expect(collectText(body)).toContain('42');
  });

  it('re-renders correctly across multiple updates without leaking (LIM-SAAT-LEAK-01 interaction)', () => {
    const { win, body } = runSource(
      'data hitung = 0\nturunan ganda = hitung * 2\n\n' + 'Saat ganda:\n    Buat span#nilai: ganda'
    );
    const marker = body.children[0];
    for (let i = 1; i <= 5; i++) {
      win.__PROBE_hitung.value = i;
      const live = marker.querySelector('#nilai');
      expect(live.innerText).toBe(String(i * 2));
    }
  });
});

describe('#80 — SUPPORTED: turunan bound to on_kelas is reactive', () => {
  it('updates className when the turunan value changes', () => {
    const { win, body } = runSource(
      'data hitung = 0\nturunan kelasnya = hitung > 5 ? "besar" : "kecil"\n\n' +
        'Buat div#kotak:\n    on_kelas = kelasnya'
    );
    const kotak = body.children[0];
    expect(kotak.className).toBe('kecil');
    win.__PROBE_hitung.value = 10;
    expect(kotak.className).toBe('besar');
  });
});

describe('#80 — DOCUMENTED LIMITATION: direct turunan property assignment is a one-time snapshot', () => {
  it('compiles clean (no error) but does NOT wire up a __watch for a direct `teks = <turunan>`', () => {
    const r = compile(
      'data hitung = 0\nturunan ganda = hitung * 2\n\nBuat span#label:\n    teks = ganda'
    );
    expect(r.success).toBe(true);
    // Direct assignment reads .value once; there is no __watch(ganda, ...) tied to this element.
    expect(r.js).toContain('__el_1.innerText = ganda.value;');
    expect(r.js).not.toMatch(/__watch\(ganda,/);
  });

  it('runtime: the rendered text does NOT update when the source data changes (matches documented behavior)', () => {
    const { win, body } = runSource(
      'data hitung = 0\nturunan ganda = hitung * 2\n\nBuat span#label:\n    teks = ganda'
    );
    const label = body.querySelector('#label');
    expect(label.innerText).toBe('0');
    win.__PROBE_hitung.value = 99;
    // Documented snapshot behavior: this intentionally stays "0", proving
    // the limitation described in docs/language/reactivity.md is accurate
    // and has not silently regressed into something worse (e.g. a crash)
    // nor silently started working without tests/docs being updated.
    expect(label.innerText).toBe('0');
  });
});

describe('#80 — cycle diagnostics (E4201) still work with per-symbol suggestions', () => {
  it('detects a direct two-node cycle and names the specific turunan to break', () => {
    const r = compile('turunan a = b + 1\nturunan b = a + 1\ntampilkan a');
    expect(r.success).toBe(false);
    const cycleError = r.errors.find((e) => e.code === 'E4201');
    expect(cycleError).toBeTruthy();
    expect(cycleError.suggestion).toMatch(/"b"/);
    expect(cycleError.suggestion).toMatch(/tidak bergantung pada "a"/);
  });

  it('detects a self-referential turunan cycle', () => {
    const r = compile('data a = 1\nturunan c = c + a\ntampilkan c');
    expect(r.success).toBe(false);
    expect(r.errors.some((e) => e.code === 'E4201')).toBe(true);
  });
});
