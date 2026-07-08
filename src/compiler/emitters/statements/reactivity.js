'use strict';

/**
 * Reactivity emitters: Saat (watcher), Lifecycle (pasang/lepas), Setelah (next-tick).
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
  PromptJSCompiler.prototype.visitSaatStatement = function (node) {
    // __watch butuh proxy (bukan .value) — pakai node.target.name bila Identifier.
    this.helpers.add('__watch');
    let tgtStr;
    if (node.target && node.target.type === 'Identifier') {
      tgtStr = node.target.name;
    } else {
      tgtStr = this.resolveTarget(node.target);
    }

    // Buat marker element sebagai wrapper untuk children watcher.
    const markerVar = this.genVar('wmarker');
    this.emit(`const ${markerVar} = document.createElement("span");`);
    this.emit(`${markerVar}.className = "__promptjs_watcher_marker";`);
    if (this.currentParent) {
      this.emit(`${this.currentParent}.appendChild(${markerVar});`);
    } else if (this.isSPA && this._spaPageRoot) {
      this.emit(`${this._spaPageRoot}.appendChild(${markerVar});`);
    } else {
      this.emit(`document.body.appendChild(${markerVar});`);
    }

    // LIM-SAAT-LEAK-01: this Saat's own local cleanup array, declared
    // OUTSIDE the watch callback so it survives across re-renders.
    const cleanupVar = this.genVar('saatCleanup');
    this.emit(`const ${cleanupVar} = [];`);

    // LIM-SAAT-LEAK-01 (nested-Saat follow-up): route THIS Saat's own
    // watch registration through the tracked-subscription helpers — same
    // priority as any other child subscription: parent Saat's cleanup
    // array (if nested) > __cleanupFns (if SPA, top-level) > plain call
    // (non-SPA, top-level — byte-for-byte unchanged from before this fix).
    // This MUST run before `cleanupVar` is pushed onto `_saatCleanupStack`
    // below, so it resolves against the PARENT context, not itself.
    this.emit(this.openTrackedSubscription(`__watch(${tgtStr}, (nilaiBaru, nilaiLama) => {`));
    this.indent++;
    // LIM-SAAT-LEAK-01: unsubscribe every child watch registered by the
    // PREVIOUS render before clearing/re-rendering the marker. On the very
    // first firing the array is empty, so this is a harmless no-op.
    this.emit(`${cleanupVar}.forEach((__fn) => __fn());`);
    this.emit(`${cleanupVar}.length = 0;`);
    // Clear hanya marker ini, bukan parent.
    this.emit(`${markerVar}.innerHTML = "";`);

    // Set currentParent ke marker agar children di-append ke marker.
    const prevParent = this.currentParent;
    this.currentParent = markerVar;
    // Watcher body bukan "Buat body" biasa — set flag supaya visitIdentifier
    // dan visitCallExpression tetap merender text node di sini.
    const prevInBuat = this._inBuatBody;
    this._inBuatBody = true;
    // LIM-SAAT-LEAK-01: push this Saat's cleanup array so subscriptions
    // registered while rendering its body land here, not on a parent's
    // array or the page-level SPA cleanup.
    this._saatCleanupStack.push(cleanupVar);

    if (node.body) accept(node.body, this);

    this._saatCleanupStack.pop();
    this._inBuatBody = prevInBuat;
    this.currentParent = prevParent;
    this.indent--;
    this.emit(this.closeTrackedSubscription());

    // LIM-SAAT-LEAK-01 (SPA-unmount follow-up): also tear down the LAST
    // rendered batch of child watches whenever THIS Saat itself is torn
    // down (SPA unmount, or — since this also goes through
    // wrapTrackedSubscription — a parent Saat's next re-render). Only
    // emitted when there is an actual teardown mechanism to hook into
    // (nested in a nother Saat, or SPA `__cleanupFns`); skipped entirely
    // for the common top-level non-SPA case, which has no unmount concept
    // and must keep its exact prior codegen shape.
    if (this._saatCleanupStack.length > 0 || this.isSPA) {
      this.emit(
        this.wrapTrackedSubscription(
          `(function() { ${cleanupVar}.forEach(function(__fn) { __fn(); }); })`
        )
      );
    }
  };

  PromptJSCompiler.prototype.visitLifecycleStatement = function (node) {
    // Lifecycle hooks: dipasang, dilepas, diperbarui.
    // #88: Inside a Komponen, lifecycle hooks fire immediately as IIFEs
    // (the factory is called at mount time, so the IIFE runs at mount).
    const insideComponent = this._componentScopeStack && this._componentScopeStack.length > 0;

    if (this.isSPA) {
      if (insideComponent) {
        // #88 fix: component dipasang/dilepas → IIFE, NOT deferred push
        this.emit(`(function() {`);
        this.indent++;
        if (node.body) accept(node.body, this);
        this.indent--;
        this.emit(`})();`);
      } else if (node.kind === 'dipasang') {
        this.emit(`__dipasangFns.push(function() {`);
        this.indent++;
        if (node.body) accept(node.body, this);
        this.indent--;
        this.emit(`});`);
      } else if (node.kind === 'dilepas') {
        this.emit(`__dilepasFns.push(function() {`);
        this.indent++;
        if (node.body) accept(node.body, this);
        this.indent--;
        this.emit(`});`);
      } else {
        // Generic lifecycle — just emit the body directly
        if (node.body) accept(node.body, this);
      }
      return;
    }

    // Non-SPA: original behavior (DOMContentLoaded / beforeunload) — unchanged
    this.emit(`// Lifecycle: saat komponen ${node.kind}`);
    if (node.kind === 'dipasang') {
      // mounted — schedule to run after DOM is ready
      this.emit(`if (document.readyState === 'loading') {`);
      this.indent++;
      this.emit(`document.addEventListener('DOMContentLoaded', () => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
      this.indent--;
      this.emit(`} else {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.kind === 'dilepas') {
      // unmounted — use beforeunload as approximation
      this.emit(`window.addEventListener('beforeunload', () => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
    } else {
      // Generic lifecycle — just emit the body
      accept(node.body, this);
    }
  };

  PromptJSCompiler.prototype.visitSetelahStatement = function (node) {
    // "setelah X selesai" — X adalah nama operasi/fungsi async
    // Lower to: X().then(() => { ... }) atau callback setelah pemanggilan
    const target = node.target;

    // Cek apakah target adalah fungsi yang sudah di-resolve.
    // Jika ya, panggil langsung tanpa typeof check (fungsi lokal selalu ada).
    // Jika tidak, gunakan typeof check untuk keamanan (external/async).
    const isLocalFunction = node.targetSymbol && node.targetSymbol.isFunction;
    const callExpr = isLocalFunction
      ? `${target}()`
      : `(typeof ${target} === 'function' ? ${target}() : ${target})`;

    this.emit(`// setelah ${target} selesai`);
    if (node.body) {
      this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
    } else if (node.action) {
      this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
      this.indent++;
      accept(node.action, this);
      this.indent--;
      this.emit(`});`);
    }
  };
}

module.exports = { install };
