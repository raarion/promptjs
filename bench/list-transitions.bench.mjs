/**
 * List Transitions (FLIP) — Performance Overhead (K2a, #52)
 * ============================================================================
 * Measures the cost of the opt-in FLIP transition path (`dengan transisi`)
 * relative to the plain K1b keyed path (`dengan kunci`), on a full REORDER of
 * 100 and 1000 items — the worst case where every node moves.
 *
 * FLIP overhead = keyed+transition reorder ÷ keyed-only reorder. We report the
 * actual ratio; the goal (master plan #47 spirit) is bounded overhead on the
 * animated path while the non-animated keyed path stays untouched.
 *
 * Note: JSDOM has no layout engine, so getBoundingClientRect returns zeros and
 * the "move" branch is exercised structurally (measure + class toggles + the
 * transitionend bookkeeping) without real pixel motion — which is exactly the
 * per-node overhead we want to bound.
 *
 * This is a BENCHMARK, not a unit test. It lives in bench/ so it never counts
 * toward the test-suite metric. Run manually:
 *     node bench/list-transitions.bench.mjs
 *
 * NOTE: `new Function(...)` here executes the COMPILER OUTPUT purely to measure
 * runtime behavior in a real DOM — a benchmark harness, NOT PromptJS emitting
 * eval/new Function (the language remains zero-eval / zero-new-Function).
 */

import { JSDOM } from 'jsdom';
import Engine from '../src/engine/promptjs.js';

const SIZES = [100, 1000];
const WARMUP = 5;
const RUNS = 30;

function compile(src, label) {
  const out = Engine.compile(src);
  if (!out.success) throw new Error(`compile failed (${label}): ${JSON.stringify(out.errors)}`);
  return out.js;
}

function withProbe(js, name) {
  const declRe = new RegExp(`(const ${name} = __createReactive\\([^;]*\\);)`);
  if (!declRe.test(js)) throw new Error(`probe decl for "${name}" not found`);
  return js.replace(declRe, `$1 window.__PROBE_${name} = ${name};`);
}

function runInDom(js) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  // matchMedia is not in JSDOM by default; provide a no-reduced-motion stub so
  // the FLIP path runs (not the reduced-motion early-out).
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (q) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    });
  }
  const fn = new Function('document', 'window', 'console', 'matchMedia', js);
  fn(window.document, window, { error() {}, log() {}, warn() {} }, window.matchMedia);
  return window;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function timeIt(setup, action) {
  for (let i = 0; i < WARMUP; i++) action(setup());
  const samples = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = setup();
    const t0 = performance.now();
    action(ctx);
    samples.push(performance.now() - t0);
  }
  return median(samples);
}

// ── Source builders ─────────────────────────────────────────────────────────
function keyedSrc() {
  return `Data daftar = []
Halaman P:
  Ulangi untuk item dari daftar dengan kunci item.id:
    Buat div.baris: item.label
`;
}
function transitionSrc() {
  return `Data daftar = []
Halaman P:
  Ulangi untuk item dari daftar dengan kunci item.id dengan transisi fade:
    Buat div.baris: item.label
`;
}

function makeArray(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = { id: i, label: 'baris-' + i };
  return a;
}
function reversed(arr) {
  return [...arr].reverse();
}

// ── Benchmark ────────────────────────────────────────────────────────────────
function bench() {
  console.log('List Transitions (FLIP) — Performance Overhead (K2a, #52)');
  console.log('='.repeat(70));
  console.log('Full REORDER (every node moves): keyed+transition vs keyed-only.');
  console.log(`warmup=${WARMUP} runs=${RUNS} (median ms)\n`);

  const keyedJs = withProbe(compile(keyedSrc(), 'keyed'), 'daftar');
  const transJs = withProbe(compile(transitionSrc(), 'transition'), 'daftar');

  const rows = [];
  for (const n of SIZES) {
    const arr = makeArray(n);
    const rev = reversed(arr);

    // Keyed-only reorder: prime with arr, then reorder to reversed.
    const keyed = timeIt(
      () => {
        const win = runInDom(keyedJs);
        win.__PROBE_daftar.value = arr;
        return win;
      },
      (win) => {
        win.__PROBE_daftar.value = rev;
      }
    );

    // Keyed+transition reorder: same, on the FLIP path.
    const trans = timeIt(
      () => {
        const win = runInDom(transJs);
        win.__PROBE_daftar.value = arr;
        return win;
      },
      (win) => {
        win.__PROBE_daftar.value = rev;
      }
    );

    const ratio = trans / keyed;
    rows.push({ n, keyed, trans, ratio });
    console.log(
      `${String(n).padStart(5)} items | keyed-only ${keyed.toFixed(3)}ms | ` +
        `+transition ${trans.toFixed(3)}ms | overhead ${ratio.toFixed(2)}×`
    );
  }

  console.log('\nSummary:');
  for (const r of rows) {
    console.log(
      `  ${String(r.n).padStart(5)} items → FLIP overhead ${r.ratio.toFixed(2)}× vs keyed-only`
    );
  }
  console.log('\n(JSDOM has no layout; ratios reflect measure + class/listener');
  console.log(' bookkeeping overhead per node, not real pixel animation cost.)');
}

bench();
