'use strict';

/**
 * Interop emitters: LangsungBlock (JS passthrough), PanggilNative, RantaiAksi, Jalankan.
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
  PromptJSCompiler.prototype.visitLangsungBlock = function (node) {
    this.emit(node.content);
  };

  PromptJSCompiler.prototype.visitPanggilNativeExpression = function (node) {
    const args = node.arguments.map((a) => this.lowerExpression(a)).join(', ');
    // Gunakan lowerExpression untuk callee, bukan .name langsung
    // Ini mendukung MemberExpression seperti console.log, document.querySelector
    const calleeCode = this.lowerExpression(node.callee);
    const code = `${calleeCode}(${args})`;

    if (this.currentParent) {
      // Jika dipanggil sebagai statement di dalam blok 'buat'
      this.emit(`${code};`);
    } else {
      return code;
    }
  };

  PromptJSCompiler.prototype.visitRantaiAksi = function (node) {
    // RantaiAksi: first statement diikuti chain of actions
    // "aksi1 lalu aksi2 lalu aksi3"
    // Lower: jalankan first, lalu chain secara berurutan

    // Visit the first action
    if (node.first) accept(node.first, this);

    // Visit each chained action
    if (node.chain && node.chain.length > 0) {
      node.chain.forEach((chainedAction) => {
        accept(chainedAction, this);
      });
    }
  };

  PromptJSCompiler.prototype.visitJalankanExpression = function (node) {
    const code = this.lowerExpression(node);
    if (this.currentParent) {
      this.emit(code + ';');
    }
    return code;
  };
}

module.exports = { install };
