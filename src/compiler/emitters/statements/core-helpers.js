'use strict';

/**
 * Core helper prototype methods (HTML assignment + safe attribute) shared by other emitters. Must be installed before modules that call these helpers.
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
  PromptJSCompiler.prototype.emitHtmlAssignment = function (targetVar, valExpr) {
    this.helpers.add('__sanitizeHTML');
    this.emit(`${targetVar}.innerHTML = __sanitizeHTML(${valExpr});`);
  };

  PromptJSCompiler.prototype.emitSafeAttribute = function (targetVar, key, valExpr) {
    this.helpers.add('__safeAttr');
    this.emit(`__safeAttr(${targetVar}, "${key}", ${valExpr});`);
  };
}

module.exports = { install };
