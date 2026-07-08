'use strict';

/**
 * Expression visitors (return code strings): Call / Identifier / Literal / Binary / Unary / Member / Object / Array / Arrow.
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
  PromptJSCompiler.prototype.visitCallExpression = function (node) {
    const code = this.lowerExpression(node);
    if (this.currentParent && this._inBuatBody) {
      // Render expression result as a text node child of currentParent.
      const txtVar = this.genVar('txt');
      this.emit(`const ${txtVar} = document.createTextNode(String(${code}));`);
      this.emit(`${this.currentParent}.appendChild(${txtVar});`);
    } else if (this.currentParent) {
      // Inside event handler / non-body context — emit as statement.
      this.emit(code + ';');
    }
    return code;
  };

  PromptJSCompiler.prototype.visitIdentifier = function (node) {
    const code = this.lowerExpression(node);
    if (this.currentParent && this._inBuatBody) {
      // Skip SelfReference / element-var references — only render data/tetap/ubah/loop vars.
      const isRenderable =
        node.resolved &&
        ['data', 'turunan', 'tetap', 'ubah', 'parameter'].includes(node.resolved.kind);
      if (isRenderable) {
        const txtVar = this.genVar('txt');
        this.emit(`const ${txtVar} = document.createTextNode(String(${code}));`);
        this.emit(`${this.currentParent}.appendChild(${txtVar});`);
      }
    }
    return code;
  };

  PromptJSCompiler.prototype.visitLiteral = function (node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitBinaryExpression = function (node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitUnaryExpression = function (node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitMemberExpression = function (node) {
    const code = this.lowerExpression(node);
    if (this.currentParent && this._inBuatBody) {
      const txtVar = this.genVar('txt');
      this.emit(`const ${txtVar} = document.createTextNode(String(${code}));`);
      this.emit(`${this.currentParent}.appendChild(${txtVar});`);
    }
    return code;
  };

  PromptJSCompiler.prototype.visitObjectLiteral = function (node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitArrayLiteral = function (node) {
    return this.lowerExpression(node);
  };

  PromptJSCompiler.prototype.visitArrowFunctionExpression = function (node) {
    return this.lowerExpression(node);
  };
}

module.exports = { install };
