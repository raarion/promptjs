'use strict';

/**
 * List emitter: UlangiStatement (counted / range / reactive / keyed).
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
  PromptJSCompiler.prototype.visitUlangiStatement = function (node) {
    const source = this.lowerExpression(node.source);

    if (node.kind === 'kali') {
      // "ulangi N kali:" → for loop
      this.emit(`for (let __i = 0; __i < ${source}; __i++) {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.kind === 'rentang') {
      // "ulangi item dari A sampai B:" → for range
      const rangeEnd = node.rangeEnd ? this.lowerExpression(node.rangeEnd) : source;
      this.emit(
        `for (let ${node.iteratorName} = ${source}; ${node.iteratorName} <= ${rangeEnd}; ${node.iteratorName}++) {`
      );
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.sourceReactive && node.source && node.source.type === 'Identifier') {
      // Reactive list render over `ulangi item dari <reactive>:`.
      //
      //   - WITHOUT `dengan kunci`  → K1a full re-render (non-keyed).
      //   - WITH    `dengan kunci`  → K1b keyed diff (Opsi B, Map<key,node>),
      //                               reusing/reordering the REAL DOM nodes
      //                               (no vDOM). The keyword is "honest": its
      //                               presence genuinely changes behavior.
      //
      // Shared plumbing:
      //   1. a <span> marker owns all list children (siblings stay untouched)
      //   2. __watch(proxy, ...) drives re-render on change
      //   3. in SPA mode the unsub is registered via __cleanupFns.push (C-1:
      //      per-watcher teardown via unsub, NOT the destructive __cleanup)
      this.helpers.add('__watch');

      // __watch needs the PROXY (bare name), while lowerExpression() unwraps a
      // reactive identifier to `<name>.value`. Use the identifier name directly.
      const proxy = node.source.name;
      const keyed = !!node.keyExpr;

      const markerVar = this.genVar('lmarker');
      this.emit(`const ${markerVar} = document.createElement("span");`);
      this.emit(`${markerVar}.className = "__promptjs_list_marker";`);
      if (this.currentParent) {
        this.emit(`${this.currentParent}.appendChild(${markerVar});`);
      } else if (this.isSPA && this._spaPageRoot) {
        this.emit(`${this._spaPageRoot}.appendChild(${markerVar});`);
      } else {
        this.emit(`document.body.appendChild(${markerVar});`);
      }

      // v132 stabilization (P0.4): for the NON-KEYED (K1a) path, declare
      // this list's own local cleanup array OUTSIDE the __watch callback
      // (same pattern as visitSaatStatement's `cleanupVar`) so it survives
      // across re-renders and can be drained at the START of each one,
      // BEFORE the previous batch of item nodes is thrown away by
      // replaceChildren(). Declared here (not inside the K1a branch below)
      // so it is available to reference from the __watch callback opener.
      // The keyed (K1b) path does NOT use this — see the per-entry
      // approach inside __keyedList's renderFn wrapper below instead,
      // since keyed items may be REUSED (not recreated) across renders.
      const listCleanupVar = keyed ? null : this.genVar('listCleanup');
      if (listCleanupVar) this.emit(`const ${listCleanupVar} = [];`);

      // LIM-SAAT-LEAK-01: a reactive list declared inside a `Saat` block
      // must have its watcher unsubscribed on the NEXT re-render of that
      // `Saat` (via openTrackedSubscription/closeTrackedSubscription below),
      // not just at SPA unmount — otherwise every parent re-render leaks one
      // more permanent list watcher. Outside of a `Saat`, behavior is
      // unchanged (SPA: `__cleanupFns`; non-SPA: plain call).
      this.emit(this.openTrackedSubscription(`__watch(${proxy}, (__list) => {`));
      this.indent++;
      if (listCleanupVar) {
        // v132 stabilization (P0.4): drain the PREVIOUS render's per-item
        // cleanups (Ketika/ikat/on_kelas/nested-Saat registered on items
        // from the last render) before this render's replaceChildren()
        // discards those nodes — mirrors visitSaatStatement exactly.
        this.emit(`${listCleanupVar}.forEach((__fn) => __fn());`);
        this.emit(`${listCleanupVar}.length = 0;`);
      }

      if (keyed) {
        // ── K1b: keyed diff ──────────────────────────────────────────────
        // Lower the key expression with the iterator bound to `item`. It runs
        // inside keyFn(item, indeks), so `item`/`indeks` are in scope.
        this.helpers.add('__keyedList');

        // K2a: opt-in FLIP transitions. When the loop used `dengan transisi
        // <name>`, wrap the keyed reconcile in __flipList so moved/entering/
        // leaving nodes animate. Absence ⇒ plain __keyedList (K1b unchanged).
        const transition = node.transitionName || null;
        const keyCode = this.lowerExpression(node.keyExpr);

        // Emit the shared keyed reconcile. `hooksArg` is the extra __keyedList
        // argument: "__hooks" under FLIP (so leave/move can be intercepted), or
        // empty for the plain K1b path.
        const emitKeyed = (hooksArg) => {
          this.emit(
            `__keyedList(${markerVar}, __list, (${node.iteratorName}, indeks) => (${keyCode}), (${node.iteratorName}, indeks) => {`
          );
          this.indent++;
          // Each item renders into its OWN wrapper node so keyed identity maps
          // 1:1 to a DOM node the reconciler can reuse / reorder / remove.
          const itemVar = this.genVar('kitem');
          this.emit(`const ${itemVar} = document.createElement("span");`);
          this.emit(`${itemVar}.className = "__promptjs_keyed_item";`);
          // v132 stabilization (P0.4): this item's OWN cleanup array, drained
          // by __keyedList itself (runtime.js) right before this exact node
          // is discarded (replaced or removed) — NOT before every render
          // like a `Saat`'s array, since a REUSED node (same key, unchanged
          // item) must keep its listeners alive across renders. Stored ON
          // the node (not a compiler-local var) because __keyedList needs to
          // reach it from a DIFFERENT renderFn invocation than the one that
          // created it.
          this.emit(`${itemVar}.__pjsCleanup = [];`);

          const prevParentK = this.currentParent;
          this.currentParent = itemVar;
          const prevInBuatK = this._inBuatBody;
          this._inBuatBody = true;
          this._saatCleanupStack.push(`${itemVar}.__pjsCleanup`);
          accept(node.body, this);
          this._saatCleanupStack.pop();
          this._inBuatBody = prevInBuatK;
          this.currentParent = prevParentK;

          this.emit(`return ${itemVar};`);
          this.indent--;
          this.emit(hooksArg ? `}, ${hooksArg});` : '});');
        };

        if (transition) {
          this.helpers.add('__flipList');
          const nameLit = JSON.stringify(String(transition));
          this.emit(`__flipList(${markerVar}, (__hooks) => {`);
          this.indent++;
          emitKeyed('__hooks');
          this.indent--;
          this.emit(`}, { name: ${nameLit} });`);
        } else {
          emitKeyed(null);
        }
      } else {
        // ── K1a: full re-render (non-keyed) ────────────────────────────────
        // v132 stabilization (P0.4): every full re-render throws away ALL
        // previous item nodes (via replaceChildren()) and recreates them
        // from scratch — so any Ketika/ikat/on_kelas/nested-Saat registered
        // on a PREVIOUS render's items must be torn down BEFORE the new
        // batch is created, exactly like a `Saat` block already does for
        // its own children. `listCleanupVar` (declared OUTSIDE the __watch
        // callback above, and already drained at the start of this render)
        // is pushed onto `_saatCleanupStack` for the duration of rendering
        // items — reusing the SAME mechanism (not a parallel one) so
        // `registerCleanup`/`wrapTrackedSubscription` calls made while
        // rendering list items automatically land here with zero changes
        // needed at those call sites: a list is now, structurally, "just
        // another cleanup context", the same as a `Saat` block.
        // C-5: consistent DOM clear via replaceChildren() (no innerHTML).
        this.emit(`${markerVar}.replaceChildren();`);
        // Guard: only iterate real arrays; non-array / null / empty ⇒ empty.
        this.emit(`if (Array.isArray(__list)) {`);
        this.indent++;
        this.emit(`__list.forEach((${node.iteratorName}, indeks) => {`);
        this.indent++;

        // Render children into the marker (nested loops nest their own markers).
        const prevParent = this.currentParent;
        this.currentParent = markerVar;
        const prevInBuat = this._inBuatBody;
        this._inBuatBody = true;
        this._saatCleanupStack.push(listCleanupVar);
        accept(node.body, this);
        this._saatCleanupStack.pop();
        this._inBuatBody = prevInBuat;
        this.currentParent = prevParent;

        this.indent--;
        this.emit('});');
        this.indent--;
        this.emit('}');
      }

      this.indent--;
      this.emit(this.closeTrackedSubscription());
    } else {
      // "ulangi item dari sumber:" → forEach (non-reactive: render once)
      this.emit(`${source}.forEach((${node.iteratorName}, indeks) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit('});');
    }
  };
}

module.exports = { install };
