// @ts-check

/**
 * PromptJS v0.2 — Runtime Helper Emitter / Emitor Helper Runtime
 * ============================================================================
 *
 * Runtime helper emitter separated from the main compiler.
 * Runtime helper emitter dipisah dari compiler utama.
 *
 * Berisi string `RUNTIME_HELPERS` (kode JS yang akan di-emit ke output
 * compiler) dan fungsi `emitRuntimeHelpers` yang menulis string tersebut
 * ke `compiler.output`.
 *
 * Helper yang di-emit:
 * - `__createReactive(val)` — Proxy-based reactive state
 * - `__createComputed(fn)` — computed value dari reactive lain
 * - `__watch(reactive, cb)` — subscribe ke perubahan reactive
 * - `__setState(reactive, val)` — set nilai reactive (trigger subscribers)
 * - `__createElement(tag, props, children)` — buat elemen DOM
 * - `__mount(target, parent)` — mount elemen ke parent (default: document.body)
 * - `__cleanup(reactive)` — unsubscribe semua dependency reactive
 * - `__promptjs_panjang/apakahKosong/apakahAda` — builtins yang perlu runtime
 */

'use strict';

/**
 * String berisi seluruh kode runtime helper JS yang akan di-emit ke output
 * compiler. Bukan fungsi yang dipanggil — ini adalah template string.
 *
 * @type {string}
 */
const RUNTIME_HELPERS = `
const __subscribers = new WeakMap();
const __effectMap = new WeakMap();
let __activeEffect = null;
let __effectId = 0;

function __createReactive(val) {
  const obj = { value: val, __id: ++__effectId };
  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (__activeEffect && prop === 'value') {
        let subs = __subscribers.get(proxy) || new Set();
        subs.add(__activeEffect);
        __subscribers.set(proxy, subs);
        if (__activeEffect.__deps) __activeEffect.__deps.add(proxy);
      }
      return target[prop];
    },
    set(target, prop, newVal) {
      const oldVal = target[prop];
      target[prop] = newVal;
      if (prop === 'value' && oldVal !== newVal) {
        const subs = __subscribers.get(proxy);
        if (subs) {
          const subsCopy = Array.from(subs);
          for (let i = 0; i < subsCopy.length; i++) subsCopy[i](newVal, oldVal);
        }
      }
      return true;
    }
  });
  return proxy;
}

function __createComputed(fn) {
  const reactive = __createReactive(null);
  const effect = function computedEffect() {
    __activeEffect = effect;
    try { reactive.value = fn(); } catch(e) { /* defer if deps not ready */ }
    __activeEffect = null;
  };
  effect.__deps = new Set();
  effect.__isComputed = true;
  effect();
  __effectMap.set(reactive, effect);
  return reactive;
}

function __watch(reactive, cb) {
  const effect = function watchEffect(n, o) { cb(n, o); };
  effect.__deps = new Set();
  let subs = __subscribers.get(reactive) || new Set();
  subs.add(effect);
  __subscribers.set(reactive, subs);
  // Run cb once initially so the watcher renders the initial value,
  // not just subsequent changes.
  try { cb(reactive.value, undefined); } catch(e) { /* defer if deps not ready */ }
  const unsub = function unsubscribe() {
    const subs = __subscribers.get(reactive);
    if (subs) subs.delete(effect);
  };
  return unsub;
}

function __setState(reactive, val) {
  reactive.value = val;
}

function __createElement(tag, props, children) {
  if (!props) props = {};
  if (!children) children = [];
  const el = document.createElement(tag === 'fragmen' ? 'div' : tag);
  if (props.id) el.id = props.id;
  if (props.className) el.className = props.className;
  if (props.innerText) el.innerText = props.innerText;
  if (props.src) el.src = props.src;
  if (props.href) el.href = props.href;
  children.forEach(function(child) { el.appendChild(child); });
  return el;
}

function __mount(target, parent) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (el) {
    if (parent) {
      const parentEl = typeof parent === 'string' ? document.querySelector(parent) : parent;
      if (parentEl) parentEl.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  }
}

function __cleanup(reactive) {
  const effect = __effectMap.get(reactive);
  if (effect && effect.__deps) {
    effect.__deps.forEach(function(dep) {
      const subs = __subscribers.get(dep);
      if (subs) subs.delete(effect);
    });
    effect.__deps.clear();
  }
  const subs = __subscribers.get(reactive);
  if (subs) subs.clear();
}

// ============================================================================
// PromptJS Builtin Helper Functions — Fungsi bawaan PromptJS
// ============================================================================
// Catatan: panjang() diterjemahkan langsung ke .length oleh expression lowering,
// jadi tidak perlu runtime helper. Helper di bawah ini untuk builtins yang
// memerlukan logika tambahan.

function __promptjs_panjang(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'string' || Array.isArray(val)) return val.length;
  if (typeof val === 'object' && val.hasOwnProperty('value')) return __promptjs_panjang(val.value);
  return 0;
}

function __promptjs_apakahKosong(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && val.hasOwnProperty('value')) return __promptjs_apakahKosong(val.value);
  return false;
}

function __promptjs_apakahAda(arr, item) {
  if (arr === null || arr === undefined) return false;
  if (typeof arr === 'object' && arr.hasOwnProperty('value')) return __promptjs_apakahAda(arr.value, item);
  if (Array.isArray(arr)) return arr.includes(item);
  if (typeof arr === 'string') return arr.indexOf(item) !== -1;
  return false;
}
`;

/**
 * Emit runtime helpers ke `compiler.output`.
 *
 * Tulis header comment `// === Runtime Helpers ===`, lalu seluruh isi
 * `RUNTIME_HELPERS` (di-trim), lalu baris kosong pemisah.
 *
 * @param {Object} compiler - Instance PromptJSCompiler
 * @returns {void}
 */
function emitRuntimeHelpers(compiler) {
  compiler.emit('// === Runtime Helpers ===');
  compiler.output.push(RUNTIME_HELPERS.trim());
  compiler.emit('');
}

module.exports = {
  RUNTIME_HELPERS,
  emitRuntimeHelpers,
};
