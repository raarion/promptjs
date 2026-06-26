// @ts-check

/**
 * PromptJS v0.5 — Runtime Helper Emitter / Emitor Helper Runtime
 * ============================================================================
 *
 * v0.5 changes:
 * - Split RUNTIME_HELPERS monolith → per-helper map for tree shaking
 * - Add __pjs_handleError helper for error boundaries
 * - emitRuntimeHelpers() only emits helpers present in compiler.helpers Set
 *
 * Helper yang di-emit (tree-shaken berdasarkan penggunaan):
 * - `__createReactive(val)` — Proxy-based reactive state
 * - `__createComputed(fn)` — computed value dari reactive lain
 * - `__watch(reactive, cb)` — subscribe ke perubahan reactive
 * - `__setState(reactive, val)` — set nilai reactive (trigger subscribers)
 * - `__cleanup(reactive)` — unsubscribe semua dependency reactive
 * - `__pjs_handleError(error, context, hook)` — error boundary handler
 * - `__promptjs_panjang/apakahKosong/apakahAda` — builtins yang perlu runtime
 *
 * Helper yang TIDAK di-emit (legacy, sudah tidak dipakai langsung):
 * - `__createElement` — visitBuatStatement pakai document.createElement langsung
 * - `__mount` — visitBuatStatement pakai appendChild langsung
 */

'use strict';

// ============================================================================
// SHARED REACTIVE INFRASTRUCTURE
// ============================================================================
// Globals yang dibutuhkan oleh beberapa helper — selalu di-emit kalau
// ADA helper reaktif yang dipakai.

const REACTIVE_INFRA = `
var __subscribers = new WeakMap();
var __effectMap = new WeakMap();
var __activeEffect = null;
var __effectId = 0;
`.trim();

// ============================================================================
// PER-HELPER CODE MAP
// ============================================================================
// Setiap helper punya kode mandiri. Di-emit hanya jika namanya ada
// di compiler.helpers Set.

/**
 * @type {Object<string, string>}
 * Map nama helper → kode JS-nya.
 */
const RUNTIME_HELPER_MAP = {
  // ── Reactive Core ────────────────────────────────────────────────────
  __createReactive: `
function __createReactive(val) {
  var obj = { value: val, __id: ++__effectId };
  var proxy = new Proxy(obj, {
    get: function(target, prop) {
      if (__activeEffect && prop === 'value') {
        var subs = __subscribers.get(proxy) || new Set();
        subs.add(__activeEffect);
        __subscribers.set(proxy, subs);
        if (__activeEffect.__deps) __activeEffect.__deps.add(proxy);
      }
      return target[prop];
    },
    set: function(target, prop, newVal) {
      var oldVal = target[prop];
      target[prop] = newVal;
      if (prop === 'value' && oldVal !== newVal) {
        var subs = __subscribers.get(proxy);
        if (subs) {
          var subsCopy = Array.from(subs);
          for (var i = 0; i < subsCopy.length; i++) subsCopy[i](newVal, oldVal);
        }
      }
      return true;
    }
  });
  return proxy;
}`.trim(),

  __createComputed: `
function __createComputed(fn) {
  var reactive = __createReactive(null);
  var effect = function computedEffect() {
    __activeEffect = effect;
    try { reactive.value = fn(); } catch(e) { /* defer if deps not ready */ }
    __activeEffect = null;
  };
  effect.__deps = new Set();
  effect.__isComputed = true;
  effect();
  __effectMap.set(reactive, effect);
  return reactive;
}`.trim(),

  __watch: `
function __watch(reactive, cb) {
  var effect = function watchEffect(n, o) { cb(n, o); };
  effect.__deps = new Set();
  var subs = __subscribers.get(reactive) || new Set();
  subs.add(effect);
  __subscribers.set(reactive, subs);
  try { cb(reactive.value, undefined); } catch(e) { /* defer if deps not ready */ }
  var unsub = function unsubscribe() {
    var s = __subscribers.get(reactive);
    if (s) s.delete(effect);
  };
  return unsub;
}`.trim(),

  __setState: `
function __setState(reactive, val) {
  reactive.value = val;
}`.trim(),

  __cleanup: `
function __cleanup(reactive) {
  var effect = __effectMap.get(reactive);
  if (effect && effect.__deps) {
    effect.__deps.forEach(function(dep) {
      var subs = __subscribers.get(dep);
      if (subs) subs.delete(effect);
    });
    effect.__deps.clear();
  }
  var subs = __subscribers.get(reactive);
  if (subs) subs.clear();
}`.trim(),

  // ── Error Boundary (v0.5) ────────────────────────────────────────────
  __pjs_handleError: `
function __pjs_handleError(error, context, hook) {
  console.error("[PromptJS] Error di " + context + "." + hook + ":", error);
  if (window.__pjsClearError) { window.__pjsClearError(); }
}`.trim(),

  // ── PromptJS Builtin Helpers ─────────────────────────────────────────
  __promptjs_panjang: `
function __promptjs_panjang(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string' || Array.isArray(val)) return val.length;
  if (typeof val === 'object' && val.hasOwnProperty('value')) return __promptjs_panjang(val.value);
  return 0;
}`.trim(),

  __promptjs_apakahKosong: `
function __promptjs_apakahKosong(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && val.hasOwnProperty('value')) return __promptjs_apakahKosong(val.value);
  return false;
}`.trim(),

  __promptjs_apakahAda: `
function __promptjs_apakahAda(arr, item) {
  if (arr === null || arr === undefined) return false;
  if (typeof arr === 'object' && arr.hasOwnProperty('value')) return __promptjs_apakahAda(arr.value, item);
  if (Array.isArray(arr)) return arr.includes(item);
  if (typeof arr === 'string') return arr.indexOf(item) !== -1;
  return false;
}`.trim(),

  // ── HTML Sanitizer (v1.0.1) ────────────────────────────────────────
  __sanitizeHTML: `
function __sanitizeHTML(html) {
  if (typeof html !== 'string') return String(html == null ? '' : html);
  // Strip <script> tags and event handlers to prevent XSS
  return html
    .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, '')
    .replace(/<script\\b[^>]*\\/>/gi, '')
    .replace(/<script\\b[^>]*>/gi, '')
    .replace(/\\bon\\w+\\s*=\\s*["'][^"']*["']/gi, '')
    .replace(/\\bon\\w+\\s*=\\s*[^\\s>]+/gi, '')
    .replace(/javascript\\s*:/gi, 'blocked:');
}`.trim(),
};

// ============================================================================
// HELPERS YANG MEMBUTUHKAN REACTIVE INFRASTRUCTURE
// ============================================================================
const REACTIVE_HELPERS = new Set(['__createReactive', '__createComputed', '__watch', '__cleanup']);

// ============================================================================
// BACKWARD COMPAT: RUNTIME_HELPERS monolith (untuk snapshot tests)
// ============================================================================

/**
 * Full monolith string — for backward compatibility with any code
 * that imports RUNTIME_HELPERS directly.
 * @type {string}
 */
const RUNTIME_HELPERS = REACTIVE_INFRA + '\n\n' + Object.values(RUNTIME_HELPER_MAP).join('\n\n');

// ============================================================================
// EMIT FUNCTION
// ============================================================================

/**
 * Emit runtime helpers ke `compiler.output` — hanya yang dipakai (tree shaking).
 *
 * Algoritma:
 * 1. Jika compiler.helpers kosong → skip seluruh runtime (output minimal)
 * 2. Jika ada reactive helper → emit shared infra dulu
 * 3. Emit setiap helper yang ada di Set, urut sesuai definisi
 *
 * @param {Object} compiler - Instance PromptJSCompiler
 * @returns {void}
 */
function emitRuntimeHelpers(compiler) {
  const needed = compiler.helpers;

  // Jika tidak ada helper yang dipakai, skip seluruh blok
  if (!needed || needed.size === 0) {
    return;
  }

  compiler.emit('// === Runtime Helpers ===');

  // Emit shared reactive infrastructure jika ada helper reaktif yang dipakai
  const needsReactive = [...needed].some((h) => REACTIVE_HELPERS.has(h));
  if (needsReactive) {
    compiler.output.push(REACTIVE_INFRA);
    compiler.emit('');
  }

  // Emit helpers yang dipakai, urut sesuai urusan logis
  const emitOrder = [
    // Reactive core dulu
    '__createReactive',
    '__createComputed',
    '__watch',
    '__setState',
    '__cleanup',
    // Error boundary
    '__pjs_handleError',
    // Builtins
    '__promptjs_panjang',
    '__promptjs_apakahKosong',
    '__promptjs_apakahAda',
    '__sanitizeHTML',
  ];

  for (const name of emitOrder) {
    if (needed.has(name) && RUNTIME_HELPER_MAP[name]) {
      compiler.output.push(RUNTIME_HELPER_MAP[name]);
      compiler.emit('');
    }
  }
}

module.exports = {
  RUNTIME_HELPERS,
  RUNTIME_HELPER_MAP,
  REACTIVE_HELPERS,
  emitRuntimeHelpers,
};
