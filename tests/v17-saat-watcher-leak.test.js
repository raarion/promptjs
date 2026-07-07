/**
 * PromptJS — Regression: `Saat` re-render leaked child-watcher subscriptions
 * (LIM-SAAT-LEAK-01, follow-up investigation for GitHub issue #77).
 *
 * ## Background
 *
 * Issue #77 hypothesized that combining `Saat` with reactive class binding
 * (`on_kelas`) might update an internal watcher *marker* span instead of the
 * intended visible element. Direct testing here DISPROVES that specific
 * hypothesis: `className` always lands on the correct child element, never
 * on the `__promptjs_watcher_marker` wrapper span.
 *
 * However, that same investigation uncovered a real, more general bug:
 * every re-render of a `Saat` block re-registers a brand-new subscription
 * for anything reactive inside its body — `on_kelas`/`on_class` dynamic
 * class binding, `ikat`/`bind` two-way form binding, a nested `Saat`, and a
 * reactive `Ulangi untuk ... dari <reactive>` list — WITHOUT ever
 * unsubscribing the previous render's subscriptions. Each re-render of the
 * outer `Saat` therefore leaked one more permanent watcher forever, all of
 * them still trying (and, for direct DOM mutations, succeeding) to update
 * detached/stale DOM nodes from earlier renders.
 *
 * ## Fix
 *
 * Each `Saat` now owns a local cleanup array (`__saatCleanup_N`) that:
 *   - child subscriptions push their `__watch(...)` unsub function into
 *     (via `wrapTrackedSubscription`/`openTrackedSubscription` in
 *     src/compiler/promptjs-compiler.js, which consults a
 *     `this._saatCleanupStack` so NESTED `Saat` blocks each get their own
 *     independent array);
 *   - is drained (every accumulated fn called, then emptied) at the START
 *     of every re-render, before the marker is cleared and new children
 *     are rendered — tearing down the previous render's child watchers.
 *
 * Coverage here is three-tier, matching the project's existing convention
 * (see tests/v7-reactive-list.test.js): PARSE (compiles + correct codegen
 * shape), and RUNTIME (JSDOM-style stub proving actual leak-free behavior
 * on the REAL compiler output).
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
      _value: '',
      children: [],
      parentNode: null,
      get className() {
        return this._className;
      },
      set className(v) {
        // Real DOM coerces className to a string (e.g. `el.className = true`
        // yields "true"). Mirror that so tests reflect actual DOM behavior.
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
      replaceChildren() {
        this.children.forEach((c) => (c.parentNode = null));
        this.children = [];
      },
      querySelector(sel) {
        // Minimal `#id` lookup, recursive — enough for these tests.
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
      addEventListener() {},
    };
    return el;
  }
  const body = makeEl('body');
  const document = {
    createElement: (t) => makeEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: t, parentNode: null }),
    querySelector: () => makeEl('div'),
    addEventListener() {},
    body,
  };
  const win = {};
  const probedJs = r.js.replace(
    /const (\w+) = __createReactive\(/g,
    'const $1 = window.__PROBE_$1 = __createReactive('
  );
  new Function('document', 'window', 'console', probedJs)(document, win, {
    error() {},
    log() {},
    warn() {},
  });
  return { r, document, body, win };
}

describe('LIM-SAAT-LEAK-01 — codegen shape', () => {
  it('emits a local cleanup array for a Saat block', () => {
    const r = compile('data hitung = 0\nSaat hitung:\n    "x"');
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/const __saatCleanup_\d+ = \[\];/);
    expect(r.js).toMatch(/__saatCleanup_\d+\.forEach\(\(__fn\) => __fn\(\)\);/);
    expect(r.js).toMatch(/__saatCleanup_\d+\.length = 0;/);
  });

  it('routes an on_kelas subscription inside Saat into the local cleanup array, not __cleanupFns', () => {
    const r = compile(
      'data aktif = benar\n\nSaat aktif:\n    Buat div#a:\n        on_kelas = aktif'
    );
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(__watch\(aktif, \(nilaiBaru\)/);
    expect(r.js).not.toContain('__cleanupFns');
  });

  it('routes a two-way binding (ikat) inside Saat into the local cleanup array', () => {
    const r = compile(
      'data aktif = benar\ndata nama = "x"\n\nSaat aktif:\n    Buat masukan#i:\n        ikat = nama'
    );
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(__watch\(nama,/);
  });

  it('routes a reactive list inside Saat into the local cleanup array', () => {
    const r = compile(
      'data aktif = benar\ndata items = []\n\nSaat aktif:\n    Buat div#a:\n        Ulangi untuk it dari $items:\n            Buat span: it'
    );
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(__watch\(items, \(__list\)/);
  });

  it('nested Saat blocks each get their own independent cleanup array', () => {
    const r = compile(
      'data luar = benar\ndata dalam = benar\n\nSaat luar:\n    Buat div#a:\n        Saat dalam:\n            Buat span#b: "x"'
    );
    expect(r.success).toBe(true);
    const matches = r.js.match(/const __saatCleanup_\d+ = \[\];/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBe(2);
  });
});

describe('LIM-SAAT-LEAK-01 — runtime: no leak across re-renders', () => {
  it('unsubscribes the previous on_kelas watcher when Saat re-renders (stale element stops updating)', () => {
    const { win, body } = runSource(
      'data aktif = benar\n\nSaat aktif:\n    Buat div#kotak:\n        teks = "x"\n        on_kelas = aktif'
    );
    const marker = body.children[0];
    const firstKotak = marker.querySelector('#kotak');
    expect(firstKotak.className).toBe('true');

    // Re-render #1: firstKotak becomes detached; secondKotak is live.
    win.__PROBE_aktif.value = false;
    expect(firstKotak.parentNode).toBeNull();
    const secondKotak = marker.querySelector('#kotak');
    expect(secondKotak.className).toBe('false');

    // Re-render #2: if the watcher on firstKotak had leaked, its className
    // would change here too, even though it's long detached from the DOM.
    win.__PROBE_aktif.value = true;
    expect(firstKotak.className).toBe('false'); // frozen, proves unsubscribed
    expect(marker.querySelector('#kotak').className).toBe('true'); // live element updates
  });

  it('unsubscribes the previous reactive-list watcher when the parent Saat re-renders', () => {
    const { win, body } = runSource(
      'data toggle = benar\ndata items = ["a", "b"]\n\n' +
        'Saat toggle:\n    Buat div#list:\n        Ulangi untuk it dari $items:\n            Buat span: it'
    );
    const marker = body.children[0];
    const firstList = marker.querySelector('#list');
    expect(firstList.children.length).toBe(1); // list marker wraps 2 spans

    // Mutate items -> the CURRENT list watcher re-renders in place.
    win.__PROBE_items.value = ['x', 'y', 'z'];
    expect(firstList.children[0].children.length).toBe(3);

    // Toggle outer Saat -> #list is recreated; old one is detached.
    win.__PROBE_toggle.value = false;
    expect(firstList.parentNode).toBeNull();
    const secondList = marker.querySelector('#list');
    expect(secondList).not.toBe(firstList);

    // Mutate items again -> only the LIVE list watcher should react.
    // A leaked old watcher would still try to touch firstList's (detached)
    // list-marker child.
    const frozenSnapshot = firstList.children[0].children.length;
    win.__PROBE_items.value = ['final'];
    expect(firstList.children[0].children.length).toBe(frozenSnapshot); // unchanged/frozen
    expect(secondList.children[0].children.length).toBe(1); // live element updated
  });

  it('a nested Saat is unaffected by its parent Saat cleanup (independent arrays)', () => {
    const { win, body } = runSource(
      'data luar = benar\ndata dalam = benar\n\n' +
        'Saat luar:\n    Buat div#a:\n        Saat dalam:\n            Buat span#b:\n                teks = "isi"'
    );
    // Should compile and run without throwing, and render the nested content.
    const marker = body.children[0];
    const a = marker.querySelector('#a');
    expect(a).not.toBeNull();
    const b = a.querySelector('#b');
    expect(b.innerText).toBe('isi');

    // Toggling the inner Saat should not throw or corrupt the outer state.
    expect(() => {
      win.__PROBE_dalam.value = false;
    }).not.toThrow();
    expect(() => {
      win.__PROBE_luar.value = false;
    }).not.toThrow();
  });
});

/**
 * ## #77 closure-verification follow-up (found during re-investigation of
 * this issue against the latest `v132` HEAD, NOT part of the original
 * LIM-SAAT-LEAK-01 fix commit)
 *
 * Two additional leak angles were found and fixed alongside this test file:
 *
 *   1. A NESTED `Saat`'s own outer watch registration was never itself
 *      routed through the tracked-cleanup mechanism — only the reactive
 *      CHILDREN inside a `Saat` were tracked, not a nested `Saat` block
 *      acting as one of those children. Toggling an OUTER `Saat` therefore
 *      still leaked one new permanent subscription per toggle on whatever
 *      reactive source an INNER `Saat` watched.
 *   2. In SPA mode, `unmount()` only unsubscribed a `Saat`'s own outer
 *      watch (via `__cleanupFns`) — it never drained that `Saat`'s local
 *      child-cleanup array, so the LAST rendered batch of `on_kelas`/
 *      `ikat`/list child watches stayed subscribed forever after unmount.
 *
 * Both are verified fixed below using the real subscriber-count on the
 * reactive proxy (via a `WeakMap` probe) rather than DOM inspection alone,
 * since a leaked subscriber may not always be DOM-visible.
 */
describe('LIM-SAAT-LEAK-01 — nested Saat watch itself is cleaned up (not just its children)', () => {
  function countSubscribers(win, proxy) {
    const subs = win.__SUBS_PROBE.get(proxy);
    return subs ? subs.size : 0;
  }

  function runSourceWithSubsProbe(source) {
    const r = compile(source);
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);

    function makeEl(tag) {
      const el = {
        tagName: tag,
        _className: '',
        _id: '',
        children: [],
        parentNode: null,
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
          this._text = String(v);
        },
        get innerText() {
          return this._text || '';
        },
        set innerHTML(v) {
          if (v === '') {
            this.children.forEach((c) => (c.parentNode = null));
            this.children = [];
          }
        },
        appendChild(c) {
          c.parentNode = this;
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
              stack.push(...n.children);
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
      createTextNode: (t) => ({ nodeType: 3, textContent: t, parentNode: null }),
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
        'var __subscribers = new WeakMap();',
        'var __subscribers = new WeakMap(); window.__SUBS_PROBE = __subscribers;'
      );
    new Function('document', 'window', 'console', probedJs)(document, win, {
      error() {},
      log() {},
      warn() {},
    });
    return { r, document, body, win };
  }

  it('does not leak the inner Saat watch itself when the outer Saat re-renders', () => {
    const { win, body } = runSourceWithSubsProbe(
      'data luar = benar\ndata dalam = benar\n\n' +
        'Saat luar:\n    Buat div#a:\n        Saat dalam:\n            Buat span#b:\n                teks = "x"'
    );
    expect(countSubscribers(win, win.__PROBE_dalam)).toBe(1);

    for (let i = 0; i < 3; i++) {
      win.__PROBE_luar.value = !win.__PROBE_luar.value;
    }
    // Before the fix: 4 (one leaked inner-Saat watch per outer re-render).
    // After the fix: still exactly 1 (the previous inner Saat watch is
    // unsubscribed via the parent's cleanup array before the new one is
    // created).
    expect(countSubscribers(win, win.__PROBE_dalam)).toBe(1);

    // Content should still render correctly after all the toggling.
    const marker = body.children[0];
    const a = marker.querySelector('#a');
    expect(a.querySelector('#b').innerText).toBe('x');
  });

  it('codegen: a nested Saat watch registration is pushed into the parent cleanup array', () => {
    const r = compile(
      'data luar = benar\ndata dalam = benar\n\n' +
        'Saat luar:\n    Buat div#a:\n        Saat dalam:\n            Buat span#b:\n                teks = "x"'
    );
    expect(r.success).toBe(true);
    // The inner Saat's own __watch(dalam, ...) call must be wrapped by the
    // OUTER Saat's cleanup array push, not emitted as a bare call.
    expect(r.js).toMatch(/__saatCleanup_\d+\.push\(__watch\(dalam,/);
  });
});

describe('LIM-SAAT-LEAK-01 — SPA unmount tears down the last rendered child watches', () => {
  /** Compile with `router: benar` and run the resulting SPA factory. */
  function runSpaPage(body) {
    const source = ['---', 'router: benar', '---', 'Halaman Beranda:', body].join('\n');
    const r = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(r.success).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.js).toContain('mount: function');
    expect(r.js).toContain('unmount: function');

    function makeEl(tag) {
      const el = {
        tagName: tag,
        _className: '',
        _id: '',
        children: [],
        parentNode: null,
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
          this._text = String(v);
        },
        get innerText() {
          return this._text || '';
        },
        set innerHTML(v) {
          if (v === '') {
            this.children.forEach((c) => (c.parentNode = null));
            this.children = [];
          }
        },
        appendChild(c) {
          c.parentNode = this;
          this.children.push(c);
          return c;
        },
        remove() {
          if (this.parentNode) {
            this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
            this.parentNode = null;
          }
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
        addEventListener() {},
      };
      return el;
    }
    const rootBody = makeEl('body');
    const document = {
      createElement: (t) => makeEl(t),
      createTextNode: (t) => ({ nodeType: 3, textContent: t, parentNode: null }),
      querySelector: () => makeEl('div'),
      addEventListener() {},
      body: rootBody,
    };
    const win = {};
    const probedJs = r.js
      .replace(
        /const (\w+) = __createReactive\(/g,
        'const $1 = window.__PROBE_$1 = __createReactive('
      )
      .replace(
        'var __subscribers = new WeakMap();',
        'var __subscribers = new WeakMap(); window.__SUBS_PROBE = __subscribers;'
      )
      .replace('return {', 'window.__PAGE = {');
    new Function('document', 'window', 'console', probedJs)(document, win, {
      error() {},
      log() {},
      warn() {},
    });
    const page = win.__PAGE;
    page.mount(rootBody);
    return { r, page, rootBody, win };
  }

  function countSubscribers(win, proxy) {
    const subs = win.__SUBS_PROBE.get(proxy);
    return subs ? subs.size : 0;
  }

  it('unmount() removes the outer Saat watch AND its last-rendered on_kelas child watch', () => {
    const { page, rootBody, win } = runSpaPage(
      '    data aktif = benar\n' +
        '    Saat aktif:\n' +
        '        Buat div#kotak:\n' +
        '            teks = "Halo"\n' +
        '            on_kelas = aktif'
    );
    expect(countSubscribers(win, win.__PROBE_aktif)).toBe(2); // outer Saat + on_kelas

    const kotakBeforeUnmount = rootBody.querySelector('#kotak');
    page.unmount();

    // Before the fix: 1 (only the outer Saat's own watch was unsubscribed;
    // the on_kelas child watch from the last render leaked forever).
    // After the fix: 0 (both are torn down).
    expect(countSubscribers(win, win.__PROBE_aktif)).toBe(0);

    // The detached element must no longer receive updates.
    win.__PROBE_aktif.value = false;
    expect(kotakBeforeUnmount.className).toBe('true'); // frozen, proves unsubscribed
  });
});
