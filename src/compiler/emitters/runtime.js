// @ts-check

/**
 * PromptJS v1.0.0 — Runtime Helper Emitter / Emitor Helper Runtime
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

  __keyedList: `
function __keyedList(marker, list, keyFn, renderFn, hooks) {
  // Keyed reconciliation (Opsi B) over the REAL DOM nodes — no vDOM.
  // State (Map<key, {node, item}>) is stashed on the marker so it persists
  // across re-renders. Non-array input clears the list (guard). Duplicate keys
  // are disambiguated as \`\${key}__\${index}\` so each item keeps a stable slot.
  //
  // K2a: optional \`hooks.onRemove(node)\` lets a transition wrapper (__flipList)
  // intercept removals — if it returns true, this fn leaves the node attached
  // (the wrapper animates it out and detaches on transitionend). Default: null
  // ⇒ nodes are removed immediately (K1b behavior, byte-for-byte).
  var onRemove = hooks && hooks.onRemove;
  var prev = marker.__pjsKeyed || new Map();
  if (!Array.isArray(list)) {
    // C-5: consistent clear via replaceChildren (never innerHTML).
    marker.replaceChildren();
    marker.__pjsKeyed = new Map();
    return;
  }
  var next = new Map();
  var seq = [];
  var seen = Object.create(null);
  var __warnedDup = false;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var rawKey = String(keyFn(item, i));
    var key = rawKey;
    if (seen[rawKey] !== undefined) {
      seen[rawKey]++;
      key = rawKey + '__' + i;
      // [DX-3] Duplicate keys are safely disambiguated (\`key__index\`) so the
      // DOM stays stable, but a duplicate key usually signals a data bug (keys
      // should be unique). Surface a ONE-TIME informational warning per render
      // so the developer is aware, without spamming the console.
      if (!__warnedDup && typeof console !== 'undefined' && console.warn) {
        __warnedDup = true;
        console.warn(
          '[PromptJS][W-keyed-dup] Kunci duplikat "' + rawKey + '" pada keyed list; ' +
          'di-disambiguasi menjadi "' + key + '". Pastikan setiap item punya kunci unik.'
        );
      }
    } else {
      seen[rawKey] = 0;
    }
    var entry = prev.get(key);
    var node;
    if (entry && __pjsSame(entry.item, item)) {
      // Same key AND unchanged value → reuse the existing DOM node as-is.
      // Its listeners/watchers (registered under entry.node.__pjsCleanup)
      // stay attached and untouched — this is the "safe reuse" case.
      node = entry.node;
    } else {
      // New key, or the item changed → (re)render its content. Reusing the
      // key slot keeps ordering stable; the fresh node reflects the new data
      // so the \`dengan kunci\` keyword stays honest (updates ARE visible).
      //
      // v132 stabilization (P0.4): if a stale node existed for this key, its
      // per-item cleanups (Ketika/ikat/on_kelas/nested-Saat registered while
      // rendering the OLD node via renderFn) must be drained BEFORE the old
      // node is discarded — otherwise the old node's listeners stay alive
      // forever (only reachable via the closure, never torn down), even
      // though the node itself is detached and replaced.
      if (entry && entry.node) {
        if (typeof entry.node.__pjsCleanup !== 'undefined' && entry.node.__pjsCleanup) {
          entry.node.__pjsCleanup.forEach(function (__fn) { __fn(); });
          entry.node.__pjsCleanup.length = 0;
        }
        if (entry.node.parentNode === marker) {
          marker.removeChild(entry.node);
        }
      }
      node = renderFn(item, i);
    }
    next.set(key, { node: node, item: item });
    seq.push(node);
  }
  // Remove nodes whose key disappeared entirely. If a transition wrapper owns
  // removals (hooks.onRemove returns true), leave the node attached so it can be
  // animated out and detached later; otherwise remove now (K1b default).
  prev.forEach(function (entry, key) {
    if (!next.has(key) && entry.node && entry.node.parentNode === marker) {
      // v132 stabilization (P0.4): drain this removed item's own cleanups
      // (same reasoning as the replace-case above) before detaching it.
      if (typeof entry.node.__pjsCleanup !== 'undefined' && entry.node.__pjsCleanup) {
        entry.node.__pjsCleanup.forEach(function (__fn) { __fn(); });
        entry.node.__pjsCleanup.length = 0;
      }
      if (onRemove && onRemove(entry.node) === true) return;
      marker.removeChild(entry.node);
    }
  });
  // Reorder / insert: walk the desired sequence in REVERSE, using insertBefore
  // against the node that should follow each one (simple O(n), LIS deferred).
  var after = null;
  for (var j = seq.length - 1; j >= 0; j--) {
    var cur = seq[j];
    if (cur.parentNode !== marker || cur.nextSibling !== after) {
      marker.insertBefore(cur, after);
    }
    after = cur;
  }
  marker.__pjsKeyed = next;
}

function __pjsSame(a, b) {
  // Cheap value equality for keyed reuse: identity, or shallow-equal plain
  // objects/arrays (one level). Good enough to detect "item changed" without a
  // deep clone; primitives fall through to Object.is.
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  var ka = Object.keys(a);
  var kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (var i = 0; i < ka.length; i++) {
    var k = ka[i];
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false;
  }
  return true;
}`.trim(),

  __flipList: `
function __flipList(marker, applyReconcile, opts) {
  // K2a: FLIP (First/Last/Invert/Play) transitions layered over the keyed
  // reconciler (__keyedList) \u2014 no vDOM, no eval, no new Function, CSP-safe
  // (only a transform + class toggles on the element). Opt-in: only called when
  // the loop used a "dengan transisi <name>" suffix. Absence => plain __keyedList.
  //
  //   opts = { name, enter, leave, move, dur }
  //     name  \u2192 class prefix (default "pjs")
  //     enter \u2192 class added to newly-inserted nodes         (default name+"-enter")
  //     leave \u2192 class added to nodes about to be removed    (default name+"-leave")
  //     move  \u2192 class added to nodes that change position   (default name+"-move")
  //
  // applyReconcile(hooks) runs the real __keyedList, but with hooks so this
  // wrapper can (a) know which nodes leave (to animate before detaching) and
  // (b) know the final node set. hooks = { onRemove(node) }.
  var name = (opts && opts.name) || 'pjs';
  var CL_ENTER = (opts && opts.enter) || name + '-enter';
  var CL_LEAVE = (opts && opts.leave) || name + '-leave';
  var CL_MOVE = (opts && opts.move) || name + '-move';

  // Accessibility + non-DOM guard: if reduced-motion is requested, or the
  // environment lacks the measurement/animation APIs, skip straight to a plain
  // reconcile with correct final DOM (no animation).
  var reduce = false;
  try {
    reduce =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    reduce = false;
  }
  var canMeasure =
    marker.firstChild == null || typeof marker.firstChild.getBoundingClientRect === 'function';
  if (reduce || !canMeasure) {
    applyReconcile({ onRemove: null });
    return;
  }

  // \u2500\u2500 FIRST: snapshot positions of current children (by node identity) \u2500\u2500\u2500\u2500
  var first = new Map();
  var pre = marker.__pjsKeyed;
  if (pre && typeof pre.forEach === 'function') {
    pre.forEach(function (entry) {
      if (entry.node && typeof entry.node.getBoundingClientRect === 'function') {
        first.set(entry.node, entry.node.getBoundingClientRect());
      }
    });
  }

  // Track leaving nodes so we can animate them out BEFORE detaching.
  var leaving = [];
  applyReconcile({
    onRemove: function (node) {
      // Defer the actual removal: play a leave animation, then detach on
      // transitionend (or immediately if no transition fires).
      leaving.push(node);
      return true; // signal __keyedList: do NOT remove now, we own it.
    },
  });

  // \u2500\u2500 LEAVE: mark leaving nodes, remove on transitionend (C-1 cleanup) \u2500\u2500\u2500\u2500\u2500
  leaving.forEach(function (node) {
    __pjsAddClass(node, CL_LEAVE);
    __pjsOnTransitionEnd(node, function () {
      __pjsRemoveClass(node, CL_LEAVE);
      if (node.parentNode === marker) marker.removeChild(node);
    });
  });

  // \u2500\u2500 LAST + INVERT + PLAY: for surviving nodes that moved, invert then play \u2500
  var post = marker.__pjsKeyed;
  if (post && typeof post.forEach === 'function') {
    post.forEach(function (entry) {
      var node = entry.node;
      if (!node || typeof node.getBoundingClientRect !== 'function') return;
      var prevRect = first.get(node);
      var lastRect = node.getBoundingClientRect();
      if (!prevRect) {
        // New node \u2192 ENTER.
        __pjsAddClass(node, CL_ENTER);
        __pjsOnTransitionEnd(node, function () {
          __pjsRemoveClass(node, CL_ENTER);
        });
        return;
      }
      var dx = prevRect.left - lastRect.left;
      var dy = prevRect.top - lastRect.top;
      if (dx === 0 && dy === 0) return; // no move.
      // INVERT: jump the node back to its old spot with a transform.
      __pjsSetTransform(node, 'translate(' + dx + 'px,' + dy + 'px)');
      __pjsAddClass(node, CL_MOVE);
      // Force reflow so the browser registers the inverted start position.
      void (typeof node.offsetWidth === 'number' ? node.offsetWidth : 0);
      // PLAY: clear the transform \u2192 CSS transition animates back to natural spot.
      __pjsSetTransform(node, '');
      __pjsOnTransitionEnd(node, function () {
        __pjsRemoveClass(node, CL_MOVE);
        __pjsSetTransform(node, '');
      });
    });
  }
}

function __pjsAddClass(node, cls) {
  if (node.classList && typeof node.classList.add === 'function') node.classList.add(cls);
  else if (typeof node.className === 'string' && (' ' + node.className + ' ').indexOf(' ' + cls + ' ') < 0)
    node.className = (node.className ? node.className + ' ' : '') + cls;
}

function __pjsRemoveClass(node, cls) {
  if (node.classList && typeof node.classList.remove === 'function') node.classList.remove(cls);
  else if (typeof node.className === 'string')
    node.className = (' ' + node.className + ' ').replace(' ' + cls + ' ', ' ').trim();
}

function __pjsSetTransform(node, val) {
  if (node.style) node.style.transform = val;
}

function __pjsOnTransitionEnd(node, cb) {
  // Fire cb once on the next transitionend, or synchronously if the env has no
  // event support (jsdom/no-transition) so final DOM is always correct.
  if (!node.addEventListener) {
    cb();
    return;
  }
  var done = false;
  var handler = function () {
    if (done) return;
    done = true;
    if (node.removeEventListener) node.removeEventListener('transitionend', handler);
    cb();
  };
  node.addEventListener('transitionend', handler);
  // Safety net: if no transition is defined, transitionend never fires. Flush
  // on a microtask/timeout so nothing gets stuck (bounded, no leak).
  if (typeof setTimeout === 'function') {
    setTimeout(handler, (node.__pjsTransDur | 0) || 0);
  }
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

  // BUG-07 FIX: Deep equality comparison for object removal
  __promptjs_deepEqual: `
function __promptjs_deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  var keysA = Object.keys(a);
  var keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (var i = 0; i < keysA.length; i++) {
    var key = keysA[i];
    if (!__promptjs_deepEqual(a[key], b[key])) return false;
  }
  return true;
}`.trim(),

  // ── HTML Sanitizer (v1.0.0) ────────────────────────────────────────
  // S-2: Sanitizer berbasis PARSING DOM dengan ALLOWLIST — bukan blocklist regex.
  // Strategi aman-secara-default (safe-by-default):
  //   1. Pakai Sanitizer API native (Element.prototype.setHTML) bila tersedia.
  //   2. Jika tidak, parse via DOMParser lalu buang segala tag/atribut di luar
  //      allowlist (termasuk event handler on*, srcdoc, dan URL javascript:/data:).
  //   3. Tanpa DOM (mis. SSR) -> escape penuh ke teks (tidak pernah dieksekusi).
  // Catatan: untuk HTML kaya tak-tepercaya, gunakan DOMPurify — lihat docs.
  __sanitizeHTML: `
function __sanitizeHTML(html) {
  if (typeof html !== 'string') html = String(html == null ? '' : html);
  var ALLOWED_TAGS = {
    A:1,ABBR:1,B:1,BLOCKQUOTE:1,BR:1,CODE:1,DD:1,DIV:1,DL:1,DT:1,EM:1,
    FIGCAPTION:1,FIGURE:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,HR:1,I:1,IMG:1,
    LI:1,MARK:1,OL:1,P:1,PRE:1,S:1,SMALL:1,SPAN:1,STRONG:1,SUB:1,SUP:1,
    TABLE:1,TBODY:1,TD:1,TFOOT:1,TH:1,THEAD:1,TR:1,U:1,UL:1
  };
  var ALLOWED_ATTR = { href:1, src:1, alt:1, title:1, colspan:1, rowspan:1, id:1, 'class':1 };
  var URL_ATTR = { href:1, src:1 };
  function safeUrl(v) {
    var s = String(v).replace(/[\\u0000-\\u001F\\u007F\\s]/g, '').toLowerCase();
    return !/^(javascript|data|vbscript):/.test(s);
  }
  function escapeText(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  if (typeof document === 'undefined' || !document.createElement) {
    return escapeText(html);
  }
  try {
    var tplN = document.createElement('template');
    if (typeof tplN.setHTML === 'function') { tplN.setHTML(html); return tplN.innerHTML; }
  } catch (e) { /* fallthrough ke parser allowlist */ }
  var doc;
  try {
    doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
  } catch (e2) { return escapeText(html); }
  function clean(node) {
    var child = node.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child.nodeType === 1) {
        if (!ALLOWED_TAGS[child.tagName]) {
          node.removeChild(child);
        } else {
          var attrs = child.attributes;
          for (var i = attrs.length - 1; i >= 0; i--) {
            var name = attrs[i].name;
            var lname = name.toLowerCase();
            if (!ALLOWED_ATTR[lname] || lname.indexOf('on') === 0) {
              child.removeAttribute(name);
            } else if (URL_ATTR[lname] && !safeUrl(attrs[i].value)) {
              child.removeAttribute(name);
            }
          }
          clean(child);
        }
      } else if (child.nodeType === 8) {
        node.removeChild(child);
      }
      child = next;
    }
  }
  clean(doc.body);
  return doc.body.innerHTML;
}`.trim(),

  // ── Safe Attribute Setter (v1.0.0) ──────────────────────────────────────
  // S-4: Atribut elemen di-emit dari nilai .pjs yang tak-tepercaya. Tanpa
  // filter, penulis dapat menyuntik event-handler (`onclick`, `onerror`, …)
  // atau URL skema aktif (`href="javascript:…"`, `src="data:…"`) yang langsung
  // menjadi XSS pada aplikasi hasil. Helper ini adalah TITIK TUNGGAL yang
  // dilalui semua setAttribute dinamis:
  //   • Atribut event-handler (`on*`) DITOLAK total.
  //   • Atribut pembawa-URL dengan skema javascript:/data:/vbscript: DITOLAK.
  //   • Sisanya di-set normal.
  // Mengembalikan true bila atribut ter-set, false bila ditolak (di-warn).
  __safeAttr: `
function __safeAttr(el, name, value) {
  if (!el || typeof name !== 'string') return false;
  var lname = name.toLowerCase();
  // Tolak semua event-handler inline (onclick, onerror, onmouseover, ...).
  if (lname.indexOf('on') === 0) {
    if (typeof console !== 'undefined') console.warn('[PromptJS] PJS-W1001: atribut event-handler diblokir demi keamanan: ' + name + ' (saran: gunakan addEventListener atau pengikat acara PromptJS, jangan atribut on* inline)');
    return false;
  }
  // Atribut 'style' tidak boleh memuat skema/ekspresi aktif (clickjacking,
  // CSS expression injection). Difilter secara konservatif (LOW-3).
  if (lname === 'style') {
    var sv = String(value == null ? '' : value).replace(/[\\u0000-\\u001F\\u007F]/g, '').toLowerCase();
    if (/(javascript:|vbscript:|expression\\s*\\(|-moz-binding|behavior\\s*:)/.test(sv)) {
      if (typeof console !== 'undefined') console.warn('[PromptJS] PJS-W1003: nilai style tidak aman diblokir: ' + value + ' (saran: hindari javascript:, expression(), atau -moz-binding di CSS inline)');
      return false;
    }
    el.setAttribute(name, value == null ? '' : value);
    return true;
  }
  function __badScheme(raw) {
    var cs = String(raw == null ? '' : raw).replace(/[\\u0000-\\u001F\\u007F\\s]/g, '').toLowerCase();
    return /^(javascript|data|vbscript):/.test(cs);
  }
  var URL_ATTR = { href:1, src:1, action:1, formaction:1, poster:1, 'xlink:href':1, background:1, cite:1, srcset:1, 'data':1 };
  if (URL_ATTR[lname]) {
    if (lname === 'srcset') {
      // srcset = daftar kandidat dipisah koma; skema dicek PER kandidat,
      // bukan hanya di awal string (LOW-2).
      var cands = String(value == null ? '' : value).split(',');
      for (var ci = 0; ci < cands.length; ci++) {
        var url = cands[ci].trim().split(/\\s+/)[0];
        if (url && __badScheme(url)) {
          if (typeof console !== 'undefined') console.warn('[PromptJS] PJS-W1002: URL skema tidak aman diblokir pada atribut ' + name + ': ' + value + ' (saran: gunakan URL http(s): atau path relatif)');
          return false;
        }
      }
    } else if (__badScheme(value)) {
      if (typeof console !== 'undefined') console.warn('[PromptJS] PJS-W1002: URL skema tidak aman diblokir pada atribut ' + name + ': ' + value + ' (saran: gunakan URL http(s):, mailto:, atau path relatif)');
      return false;
    }
  }
  el.setAttribute(name, value == null ? '' : value);
  return true;
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
    '__keyedList',
    '__flipList',
    '__cleanup',
    // Error boundary
    '__pjs_handleError',
    // Builtins
    '__promptjs_panjang',
    '__promptjs_apakahKosong',
    '__promptjs_apakahAda',
    '__promptjs_deepEqual',
    '__sanitizeHTML',
    '__safeAttr',
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
