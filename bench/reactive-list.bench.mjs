/**
 * Reactive List Rendering — Performance Baseline (K1a, #48)
 * ============================================================================
 * Measures the cost of the K1a reactive `Ulangi untuk` render path relative to
 * the non-reactive `forEach` baseline, on 100 and 1000 items, for BOTH:
 *   - initial render (first paint)
 *   - re-render      (array replaced → __watch fires → full re-render)
 *
 * Reference targets (master plan #47):
 *   - 100 items  ≤ 1.5× non-reactive
 *   - 1000 items ≤ 2.0× non-reactive
 *
 * This is a BENCHMARK, not a unit test. It lives in bench/ so it never counts
 * toward the test-suite metric. Run manually:
 *     node bench/reactive-list.bench.mjs
 *
 * NOTE: `new Function(...)` here executes the COMPILER OUTPUT purely to measure
 * runtime behavior in a real DOM — it is a benchmark harness, NOT PromptJS
 * emitting eval/new Function (the language remains zero-eval / zero-new-Function).
 */

import { JSDOM } from 'jsdom';
import Engine from '../src/engine/promptjs.js';

const SIZES = [100, 1000];
const WARMUP = 5;
const RUNS = 30;

/** Compile a page source to JS, asserting success. */
function compile(src, label) {
  const out = Engine.compile(src);
  if (!out.success) {
    throw new Error(`compile failed (${label}): ${JSON.stringify(out.errors)}`);
  }
  return out.js;
}

/**
 * Build a fresh JSDOM, run the compiled JS in it, and return the window so the
 * caller can drive re-renders through the exposed reactive proxy.
 */
function runInDom(js) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'outside-only',
  });
  const { window } = dom;
  // new Function executes the COMPILER OUTPUT to measure runtime cost — a bench
  // harness, not PromptJS emitting eval/new Function (language stays zero-eval).
  const fn = new Function('document', 'window', 'console', js);
  fn(window.document, window, { error() {}, log() {}, warn() {} });
  return window;
}

/**
 * Inject `window.__PROBE_<name> = <name>;` right after the reactive const decl
 * so the bench can mutate the proxy post-render (same string-surgery technique
 * used by the K1a runtime tests — the language itself emits no eval/new Function).
 */
function withProbe(js, name) {
  const declRe = new RegExp(`(const ${name} = __createReactive\\([^;]*\\);)`);
  if (!declRe.test(js)) throw new Error(`probe decl for "${name}" not found`);
  return js.replace(declRe, `$1 window.__PROBE_${name} = ${name};`);
}

/** Median of a numeric array (robust vs. GC spikes). */
function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Time a thunk `runs` times (after warmup), return median ms. */
function timeIt(setup, action) {
  for (let i = 0; i < WARMUP; i++) {
    const ctx = setup();
    action(ctx);
  }
  const samples = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = setup();
    const t0 = performance.now();
    action(ctx);
    samples.push(performance.now() - t0);
  }
  return median(samples);
}

// ── Source builders ────────────────────────────────────────────────────────
// Reactive (K1a): `Data` → emitter uses marker + __watch full re-render.
function reactiveSrc() {
  return `Data daftar = []
Halaman P:
  Ulangi untuk item dari daftar:
    Buat div.baris: "baris"
`;
}

function makeArray(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = { id: i, label: 'baris-' + i };
  return a;
}

/**
 * Fair, low-variance NON-reactive baseline: the intrinsic DOM cost of building
 * N `<div class="baris">baris</div>` children into a marker via a plain forEach
 * — the SAME element construction the compiler emits for the list body, but
 * WITHOUT the reactive proxy / __watch / Array.isArray / replaceChildren layer.
 *
 * Measured inside an already-mounted DOM so JSDOM page-setup overhead does NOT
 * pollute the comparison (that was the flaw in a full-page-mount baseline).
 */
function baselineForEach(document, marker, arr) {
  arr.forEach(() => {
    const el = document.createElement('div');
    el.className = 'baris';
    el.appendChild(document.createTextNode('baris'));
    marker.appendChild(el);
  });
}

// ── Benchmark ────────────────────────────────────────────────────────────────
function bench() {
  const reactiveJs = withProbe(compile(reactiveSrc(), 'reactive'), 'daftar');

  console.log('Reactive List Rendering — Performance Baseline (K1a, #48)');
  console.log('='.repeat(70));
  console.log('Fair comparison: reactive re-render vs a bare forEach populating');
  console.log('the SAME children into a marker, both inside an already-mounted DOM.');
  console.log(`warmup=${WARMUP} runs=${RUNS} (median ms)\n`);

  const results = [];

  for (const n of SIZES) {
    const arr = makeArray(n);

    // Baseline: bare forEach DOM build (no reactivity), in a mounted DOM.
    const base = timeIt(
      () => {
        const dom = new JSDOM('<!DOCTYPE html><html><body><span id="m"></span></body></html>');
        const marker = dom.window.document.getElementById('m');
        return { document: dom.window.document, marker };
      },
      ({ document, marker }) => {
        marker.replaceChildren();
        baselineForEach(document, marker, arr);
      }
    );

    // Reactive initial render: mount with empty array, then set the array once.
    const rInitial = timeIt(
      () => runInDom(reactiveJs),
      (win) => {
        win.__PROBE_daftar.value = arr;
      }
    );

    // Reactive re-render: mount + prime with n items, then REPLACE the whole
    // array with a fresh n-item array → __watch fires → full re-render.
    const rReRender = timeIt(
      () => {
        const win = runInDom(reactiveJs);
        win.__PROBE_daftar.value = makeArray(n);
        return win;
      },
      (win) => {
        win.__PROBE_daftar.value = makeArray(n);
      }
    );

    const ratioInitial = rInitial / base;
    const ratioReRender = rReRender / base;
    const target = n <= 100 ? 1.5 : 2.0;
    const pass = ratioInitial <= target && ratioReRender <= target;

    results.push({
      n,
      base,
      rInitial,
      rReRender,
      ratioInitial,
      ratioReRender,
      target,
      pass,
    });

    console.log(`items=${n}`);
    console.log(`  non-reactive (bare forEach)  : ${base.toFixed(3)} ms  (1.00× baseline)`);
    console.log(
      `  reactive initial render      : ${rInitial.toFixed(3)} ms  (${ratioInitial.toFixed(2)}×)`
    );
    console.log(
      `  reactive re-render (replace) : ${rReRender.toFixed(3)} ms  (${ratioReRender.toFixed(2)}×)`
    );
    console.log(`  target ≤ ${target.toFixed(1)}×  →  ${pass ? 'PASS ✅' : 'OVER ⚠️'}\n`);
  }

  console.log('='.repeat(70));
  const allPass = results.every((r) => r.pass);
  console.log(allPass ? 'ALL WITHIN TARGET ✅' : 'SOME OVER TARGET ⚠️');
  return results;
}

bench();
