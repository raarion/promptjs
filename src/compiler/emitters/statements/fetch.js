'use strict';
const { kindMap, keyMap } = require('./constants');

/**
 * Fetch emitters: AmbilDom (read from DOM) + AmbilLuar (async fetch with bind/branch).
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
  PromptJSCompiler.prototype.visitAmbilDomStatement = function (node) {
    // "ambil nilai/teks/html/dll dari sumber -> simpan ke target"
    const source = this.resolveTarget(node.source);
    const targetVar = node.target; // string nama variabel

    if (node.kind === 'atribut') {
      const attrName = node.attributeName || '';
      this.emit(`__setState(${targetVar}, ${source}.getAttribute("${attrName}"));`);
    } else {
      const jsProp = kindMap[node.kind] || node.kind;
      this.emit(`__setState(${targetVar}, ${source}.${jsProp});`);
    }
  };

  PromptJSCompiler.prototype.visitAmbilLuarStatement = function (node) {
    // v0.7: "Ambil dari URL:" → async IIFE with try/catch/finally
    // Developer menulis deklaratif, compiler emits async/await di balik layar.
    // TIDAK ada keyword async di DSL — prinsip ⑨ terjaga.
    const url = this.lowerExpression(node.url);

    // Build fetch options
    const fetchOptionPairs = [];
    if (node.options && node.options.length > 0) {
      node.options.forEach((opt) => {
        const key = opt.key;
        const val = this.lowerExpression(opt.value);

        const jsKey = keyMap[key] || key;
        // Body needs JSON.stringify if it's an object
        if (jsKey === 'body') {
          fetchOptionPairs.push(`"${jsKey}": JSON.stringify(${val})`);
        } else {
          fetchOptionPairs.push(`"${jsKey}": ${val}`);
        }
      });
    }

    // v0.7: SPA mode — AbortController for request cancellation on unmount
    //
    // v132 stabilization (P0.5): route this AbortController's teardown
    // through registerCleanup() instead of unconditionally pushing to the
    // page-level __cleanupFns. Before this fix, an `ambil ... ke <target>`
    // declared inside a `Saat` block created a NEW AbortController on every
    // re-render, but the OLD one was only ever aborted at full SPA unmount —
    // meaning a stale (superseded) in-flight request could still resolve and
    // overwrite fresher data written by a later render (a real race
    // condition, not just a cleanup-array memory leak). Now, when nested
    // inside a `Saat`, the PREVIOUS render's AbortController is aborted as
    // part of that Saat's normal pre-render drain (the same array used for
    // on_kelas/ikat/Ketika/nested-Saat), so a re-render genuinely cancels
    // the outdated request before starting the new one.
    if (this.isSPA) {
      const ctrlVar = this.genVar('ctrl');
      this.emit(`const ${ctrlVar} = new AbortController();`);
      const abortExpr = `function() { ${ctrlVar}.abort(); }`;
      const cleanupStmt = this.registerCleanup(abortExpr);
      if (cleanupStmt) this.emit(cleanupStmt);
      fetchOptionPairs.push(`"signal": ${ctrlVar}.signal`);
    }

    const fetchOptions = fetchOptionPairs.length > 0 ? `{ ${fetchOptionPairs.join(', ')} }` : '{}';

    // v1.1: Automatic `.memuat` (loading) / `.galat` (error) state for the
    // inline bind form `ambil dari "url" ke <target>`. The companion reactive
    // vars `<target>_memuat` and `<target>_galat` are OPTIONAL — every write is
    // `typeof`-guarded so an undeclared flag is a harmless no-op (never a
    // ReferenceError). Declaring `data items_memuat = salah` in the DSL opts in.
    const bind = node.bindTarget || null;
    const memuatVar = bind ? `${bind}_memuat` : null;
    const galatVar = bind ? `${bind}_galat` : null;

    // Inline bind emits `__setState(...)` directly, so the helper must be
    // pulled into the tree-shaken bundle explicitly (block-form fetch relied on
    // a nested SimpanStatement to register it; the bind form has none).
    if (bind) {
      this.helpers.add('__setState');
    }

    // Loading = true (+ clear previous error) BEFORE the request begins.
    if (bind) {
      this.emit(`if (typeof ${memuatVar} !== "undefined") __setState(${memuatVar}, true);`);
      this.emit(`if (typeof ${galatVar} !== "undefined") __setState(${galatVar}, null);`);
    }

    // Emit async IIFE — developer never sees the word "async"
    this.emit(`(async function() {`);
    this.indent++;
    this.emit(`try {`);
    this.indent++;
    this.emit(`const __response = await fetch(${url}, ${fetchOptions});`);
    this.emit(`if (!__response.ok) throw new Error("HTTP " + __response.status);`);
    this.emit(`const __data = await __response.json();`);

    // v1.1: inline bind — assign fetched data to the bound state on success.
    if (bind) {
      this.emit(`__setState(${bind}, __data);`);
    }

    // berhasil: branch
    if (node.branches && node.branches.length > 0) {
      const berhasil = node.branches.find((b) => b.kind === 'berhasil');
      if (berhasil && berhasil.action) {
        accept(berhasil.action, this);
      }
    }

    this.indent--;
    this.emit(`} catch(__error) {`);
    this.indent++;

    // v0.7: SPA mode — ignore AbortError (request cancelled on unmount)
    if (this.isSPA) {
      this.emit(`if (__error.name === "AbortError") return;`);
    }

    // v1.1: inline bind — record the error message into `<target>_galat`.
    if (bind) {
      this.emit(
        `if (typeof ${galatVar} !== "undefined") __setState(${galatVar}, __error.message || String(__error));`
      );
    }

    // gagal: branch
    if (node.branches && node.branches.length > 0) {
      const gagal = node.branches.find((b) => b.kind === 'gagal');
      if (gagal && gagal.action) {
        accept(gagal.action, this);
      } else if (!bind) {
        this.emit(`console.error("[PromptJS] Ambil gagal:", __error);`);
      }
    } else if (!bind) {
      this.emit(`console.error("[PromptJS] Ambil gagal:", __error);`);
    }

    this.indent--;

    // selalu: branch and/or auto loading-reset both live in the finally block.
    const selalu = node.branches ? node.branches.find((b) => b.kind === 'selalu') : null;
    if ((selalu && selalu.action) || bind) {
      this.emit(`} finally {`);
      this.indent++;
      if (bind) {
        this.emit(`if (typeof ${memuatVar} !== "undefined") __setState(${memuatVar}, false);`);
      }
      if (selalu && selalu.action) {
        accept(selalu.action, this);
      }
      this.indent--;
    }

    this.emit(`}`);
    this.indent--;
    this.emit(`})();`);
  };
}

module.exports = { install };
