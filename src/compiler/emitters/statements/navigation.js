'use strict';

/**
 * Navigation emitters: Arahkan / MuatUlang / Kembali.
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
  PromptJSCompiler.prototype.visitArahkanStatement = function (node) {
    // "arahkan ke URL" → SPA navigate or full reload
    const url = this.lowerExpression(node.url);
    if (this.isSPA) {
      this.emit(`__pjsRouter.navigate(${url});`);
    } else {
      this.emit(`window.location.href = ${url};`);
    }
  };

  PromptJSCompiler.prototype.visitMuatUlangStatement = function (_node) {
    this.emit(`window.location.reload();`);
  };

  PromptJSCompiler.prototype.visitKembaliStatement = function (_node) {
    this.emit(`window.history.back();`);
  };
}

module.exports = { install };
