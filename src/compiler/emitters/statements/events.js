'use strict';
const { eventMap, MODIFIER_MAP } = require('./constants');

/**
 * Event emitter: KetikaStatement (event listeners + on_kelas/on_class reactive class binding).
 *
 * This module is a behavior-preserving extraction from the former monolithic
 * `src/compiler/emitters/statements.js`. Every visitor is installed onto
 * `PromptJSCompiler.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang visitor untuk modul ini ke `PromptJSCompiler.prototype`.
 *
 * @param {Function} PromptJSCompiler - Constructor PromptJSCompiler
 * @param {Function} accept - Fungsi `accept` dari `utils/visitor` (dispatch visitor)
 * @returns {void}
 */
function install(PromptJSCompiler, accept) {
  PromptJSCompiler.prototype.visitKetikaStatement = function (node) {
    // BUG-17 FIX: on_kelas / on_class → reactive class binding, not addEventListener
    // When a user writes `on_kelas = tema` inside a Buat block, they want
    // the element's className to reactively track the value of `tema`, not
    // to listen for a DOM event named "on_kelas".
    if (
      node.event === 'on_kelas' ||
      node.event === 'on_class' ||
      node.event === 'kelas' ||
      node.event === 'class'
    ) {
      this.helpers.add('__watch');
      let elTarget = 'document';
      if (node.target) {
        if (node.target.type === 'SelfReference') {
          elTarget = node.target.referencedNode.compiledVarName || 'null';
        } else if (node.target.type === 'Identifier') {
          elTarget = node.target.name;
        } else {
          elTarget = this.resolveTarget(node.target);
        }
      }
      // Resolve the expression (RHS of on_kelas = ...)
      let watchExpr;
      if (node.action) {
        watchExpr = this.lowerExpression(node.action);
      } else if (node.body) {
        // Body form: fall back to emitting body inside __watch callback
        watchExpr = null;
      }
      // Determine the reactive source to watch.
      //
      // LIM-CLASS-01 FIX: __watch() expects a *reactive proxy* (an object,
      // used as a WeakMap key) — not the plain value produced by evaluating
      // an expression. When the RHS is a bare Identifier (e.g. `on_kelas =
      // tema`), that identifier already IS the reactive proxy, so we can
      // watch it directly. But when the RHS is any other expression (e.g.
      // a ternary `aktif ? "a" : "b"`, string concatenation, etc.), lowering
      // it produces a *value* string like `(aktif.value ? "a" : "b")`.
      // Passing that value straight into __watch(...) crashes at runtime
      // with "Invalid value used as weak map key" because __subscribers is
      // a WeakMap and the value can be a primitive (string/boolean/etc.).
      //
      // Fix: wrap non-identifier expressions in __createComputed() first,
      // producing a real reactive proxy whose `.value` is recomputed
      // whenever its dependencies change — then watch *that* computed proxy.
      let watchTarget;
      let usesComputed = false;
      if (node.action && node.action.type === 'Identifier') {
        watchTarget = node.action.name;
      } else if (watchExpr) {
        this.helpers.add('__createComputed');
        this.helpers.add('__createReactive');
        watchTarget = this.genVar('classComputed');
        this.emit(`const ${watchTarget} = __createComputed(() => ${watchExpr});`);
        usesComputed = true;
      } else {
        watchTarget = elTarget; // fallback
      }
      // Emit initial className assignment
      if (usesComputed) {
        this.emit(`${elTarget}.className = ${watchTarget}.value;`);
      } else if (watchExpr) {
        this.emit(`${elTarget}.className = ${watchExpr};`);
      }

      // Emit __watch for reactive updates.
      // LIM-SAAT-LEAK-01: route through wrapTrackedSubscription so an
      // `on_kelas`/`on_class` binding declared inside a `Saat` block gets
      // its watch unsubscribed on the NEXT re-render of that `Saat` —
      // otherwise every re-render registers one more permanent watcher on
      // the (fresh) child element, leaking a subscriber per toggle. Falls
      // back to the existing SPA/`__cleanupFns` and plain-emit behavior
      // outside of a `Saat` block (unchanged).
      this.emit(
        this.wrapTrackedSubscription(
          `__watch(${watchTarget}, (nilaiBaru) => { ${elTarget}.className = nilaiBaru; })`
        )
      );
      return;
    }

    const eventName = eventMap[node.event] || node.event;

    // v132 stabilization (P0.1): `.sekali`/`.once` is a listener OPTION
    // (the 3rd argument to addEventListener, `{ once: true }`), not a
    // statement executed inside the handler body like `.cegah`/`.hentikan`
    // (which map to `event.preventDefault()`/`event.stopPropagation()`
    // calls). It was previously listed in the parser's VALID_MODIFIERS
    // (so it parsed and landed on `node.modifiers` correctly) but the
    // compiler's MODIFIER_MAP below never had an entry for it — so it was
    // silently accepted and had literally zero effect on the emitted JS.
    const wantsOnce = !!(
      node.modifiers && node.modifiers.some((m) => m === 'sekali' || m === 'once')
    );
    let target = 'document';

    if (node.target) {
      if (node.target.type === 'SelfReference') {
        target = node.target.referencedNode.compiledVarName || 'null';
      } else if (node.target.type === 'Identifier') {
        if (node.target.name === 'halaman') {
          target = 'document';
        } else {
          target = node.target.name;
        }
      } else if (node.target.type === 'Selector') {
        target = this.resolveTarget(node.target);
      } else if (node.target.type === 'Literal') {
        target = `document.querySelector("${node.target.value}")`;
      }
    }

    // Determine context name for error reporting (v0.5 patch: use tag name)
    let errorContext = 'halaman';
    if (node.target) {
      if (node.target.type === 'Identifier') {
        errorContext = node.target.name;
      } else if (node.target.type === 'SelfReference' && node.target.referencedNode) {
        const ref = node.target.referencedNode;
        errorContext = (ref.selector && ref.selector.tag) || ref.compiledVarName || 'elemen';
      } else {
        errorContext = 'elemen';
      }
    }
    const errorHook = 'on_' + node.event;

    // Custom events (mounted/unmounted) need MutationObserver
    if (eventName === '__promptjs_mounted' || eventName === '__promptjs_unmounted') {
      const domEvent = eventName === '__promptjs_mounted' ? 'DOMNodeInserted' : 'DOMNodeRemoved';
      this.emit(`${target}.addEventListener("${domEvent}", (event) => {`);
    } else if (eventName === 'DOMContentLoaded') {
      this.emit(`document.addEventListener("DOMContentLoaded", (event) => {`);
    } else {
      // v0.6 patch: In SPA mode, track event listeners for cleanup on unmount.
      // This prevents listener leaks especially on document/window targets.
      if (this.isSPA) {
        const handlerVar = this.genVar('handler');
        this.emit(`const ${handlerVar} = (event) => {`);
        // Handler body will be emitted below, then we close + addEventListener + push cleanup
        this._pendingSpaHandler = { target, eventName, handlerVar, wantsOnce };
      } else {
        this.emit(`${target}.addEventListener("${eventName}", (event) => {`);
      }
    }

    this.indent++;
    // v0.5: Error boundary — wrap handler body in try/catch
    this.helpers.add('__pjs_handleError');
    this.emit(`try {`);

    this.indent++;

    if (node.modifiers && node.modifiers.length > 0) {
      for (const mod of node.modifiers) {
        if (MODIFIER_MAP[mod]) {
          this.emit(`event.${MODIFIER_MAP[mod]}();`);
        }
      }
    } else if (node.event === 'disubmit') {
      // Legacy: auto-preventDefault for submit events without explicit modifier
      this.emit('event.preventDefault();');
    }

    if (node.body) accept(node.body, this);
    if (node.action) {
      // Action may be a Statement (SimpanStatement, TambahkanStatement, etc.)
      // or an Expression (CallExpression, Identifier, etc.).
      //
      // For Statement nodes, use `accept` so the proper visitor runs
      // (visitSimpanStatement emits `__setState(...)`, etc.).
      //
      // For Expression nodes, use `lowerExpression` and emit as a statement.
      const actionType = node.action.type;
      const statementTypes = new Set([
        'SimpanStatement',
        'TambahkanStatement',
        'KurangiStatement',
        'SisipkanStatement',
        'PerbaruiStatement',
        'TampilkanStatement',
        'SembunyikanStatement',
        'HapusStatement',
        'KosongkanStatement',
        'ArahkanStatement',
        'MuatUlangStatement',
        'KembaliStatement',
        'BerhentiStatement',
        'LanjutkanStatement',
        'PassStatement',
        'LewatiStatement',
        // v1.1: inline fetch as event action (`on_klik = ambil dari "url"`).
        // visitAmbilLuarStatement emits the full async fetch IIFE.
        'AmbilLuarStatement',
      ]);
      if (statementTypes.has(actionType)) {
        // Statement visitor emits via this.emit() internally.
        accept(node.action, this);
      } else {
        // Expression visitor returns a code string — emit as statement.
        const actionCode = this.lowerExpression(node.action);
        if (actionCode && actionCode !== 'undefined') {
          this.emit(actionCode + ';');
        }
      }
    }

    this.indent--;
    // v0.5: catch block for error boundary
    this.emit(`} catch(__e) {`);
    this.emit(`  __pjs_handleError(__e, "${errorContext}", "${errorHook}");`);
    this.emit(`}`);

    this.indent--;
    // v0.6 patch: SPA mode — close handler var, addEventListener, track cleanup
    if (this._pendingSpaHandler) {
      const h = this._pendingSpaHandler;
      const hOptsSuffix = h.wantsOnce ? ', { once: true }' : '';
      this.emit('};');
      this.emit(`${h.target}.addEventListener("${h.eventName}", ${h.handlerVar}${hOptsSuffix});`);
      // v132 stabilization (P0.2): route this listener's teardown through
      // registerCleanup() instead of an unconditional __cleanupFns.push —
      // when this Ketika is declared inside an open `Saat` block, its
      // cleanup now lands in that Saat's OWN local cleanup array (freed on
      // the Saat's next re-render), matching the same routing already used
      // for on_kelas/ikat/nested-Saat/reactive-list watchers since #77.
      // Falls back to the previous __cleanupFns behavior when not nested
      // inside a Saat (still SPA top-level, unchanged from before this fix).
      const removeExpr = `function() { ${h.target}.removeEventListener("${h.eventName}", ${h.handlerVar}); }`;
      const cleanupStmt = this.registerCleanup(removeExpr);
      if (cleanupStmt) this.emit(cleanupStmt);
      this._pendingSpaHandler = null;
    } else if (wantsOnce) {
      // v132 stabilization (P0.1): non-SPA bare addEventListener call — no
      // separate handler variable exists to reference in a removeListener
      // cleanup (and non-SPA has no unmount concept to hang cleanup off of
      // anyway), so the ONLY thing needed here is passing `{ once: true }`
      // as the 3rd argument, closing the callback with `}, { once: true });`
      // instead of the plain `});`.
      this.emit('}, { once: true });');
    } else {
      this.emit('});');
    }
  };
}

module.exports = { install };
