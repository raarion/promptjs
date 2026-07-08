'use strict';
const { directProps, urlBearing, propertyMap } = require('./constants');

/**
 * Property / binding emitters: two-way binding, PropertyNode, Perbarui (update).
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
function install(PromptJSCompiler, _accept) {
  PromptJSCompiler.prototype.emitTwoWayBinding = function (elVar, stateNode) {
    // The proxy object is needed for __setState/__watch; a bare Identifier
    // lowers to `name.value` (a read), so pull the proxy name directly.
    const proxy =
      stateNode && stateNode.type === 'Identifier'
        ? stateNode.name
        : this.lowerExpression(stateNode).split('.')[0];
    this.helpers.add('__setState');
    this.helpers.add('__watch');

    // 1. initial state -> input
    this.emit(`${elVar}.value = ${proxy}.value;`);

    // 2. input -> state
    // v132 stabilization (P0.3): route this listener's removeEventListener
    // teardown through registerCleanup() instead of unconditionally pushing
    // to the page-level __cleanupFns. Before this fix, this was the ONLY
    // half of `ikat` that ignored `this._saatCleanupStack` — the state→input
    // watch below (step 3) already used wrapTrackedSubscription, creating an
    // internal asymmetry where toggling a `Saat` containing `ikat` cleaned
    // up one direction but not the other. Same routing as visitKetikaStatement.
    if (this.isSPA) {
      const handlerVar = this.genVar('bindHandler');
      this.emit(`const ${handlerVar} = (event) => { __setState(${proxy}, event.target.value); };`);
      this.emit(`${elVar}.addEventListener("input", ${handlerVar});`);
      const removeExpr = `function() { ${elVar}.removeEventListener("input", ${handlerVar}); }`;
      const cleanupStmt = this.registerCleanup(removeExpr);
      if (cleanupStmt) this.emit(cleanupStmt);
    } else {
      this.emit(
        `${elVar}.addEventListener("input", (event) => { __setState(${proxy}, event.target.value); });`
      );
    }

    // 3. state -> input (skip when equal so typing never clobbers the caret)
    // LIM-SAAT-LEAK-01: use wrapTrackedSubscription so a two-way binding
    // declared inside a `Saat` block gets its watch unsubscribed on the
    // NEXT re-render of that `Saat`, instead of leaking a duplicate watcher
    // on every toggle. Falls back to the existing SPA/`__cleanupFns` and
    // plain-emit behavior outside of a `Saat` block (unchanged).
    this.emit(
      this.wrapTrackedSubscription(
        `__watch(${proxy}, (__v) => { if (${elVar}.value !== __v) ${elVar}.value = __v; })`
      )
    );
  };

  PromptJSCompiler.prototype.visitPropertyNode = function (node) {
    if (!this.currentParent) return; // Tidak ada elemen target — skip
    const val = this.lowerExpression(node.value);
    const key = node.key;
    const parent = this.currentParent;
    if (key === 'teks') {
      this.emit(`${parent}.innerText = ${val};`);
    } else if (key === 'html') {
      this.emitHtmlAssignment(parent, val); // S-3: jalur terpadu
    } else if (key === 'kelas') {
      this.emit(`${parent}.className = ${val};`);
    } else if (key === 'nilai') {
      this.emit(`${parent}.value = ${val};`);
    } else if (key === 'ikat' || key === 'bind') {
      // v1.1: two-way binding — `ikat = <state>` / `bind = <state>` inside a
      // form element body wires input.value <-> reactive state, both ways.
      this.emitTwoWayBinding(parent, node.value);
    } else {
      // Atribut HTML umum: src, href, alt, width, height, id, placeholder, dll.
      // Gunakan direct property assignment (lebih efisien) untuk properti

      // S-4: atribut pembawa-URL (href/src) tetap rawan walau via direct
      // property assignment (`a.href = "javascript:…"`). Rutekan SEMUA atribut
      // tak-tepercaya lewat __safeAttr; biarkan hanya properti non-URL yang

      if (directProps.has(key) && !urlBearing.has(key)) {
        this.emit(`${parent}.${key} = ${val};`);
      } else {
        this.emitSafeAttribute(parent, key, val); // S-4: filter on*/URL
      }
    }
  };

  PromptJSCompiler.prototype.visitPerbaruiStatement = function (node) {
    const val = this.lowerExpression(node.value);
    const target = this.resolveTarget(node.target);

    const jsProp = propertyMap[node.property];
    if (jsProp) {
      if (jsProp === 'innerHTML') {
        this.helpers.add('__sanitizeHTML');
        this.emit(`${target}.${jsProp} = __sanitizeHTML(${val});`);
      } else if (jsProp === 'src' || jsProp === 'href') {
        // S-4: properti pembawa-URL tetap rawan via direct assignment.
        this.emitSafeAttribute(target, jsProp, val);
      } else {
        this.emit(`${target}.${jsProp} = ${val};`);
      }
    } else {
      // S-4: atribut tak-dikenal/tak-tepercaya → filter on*/URL.
      this.emitSafeAttribute(target, node.property, val);
    }
  };
}

module.exports = { install };
