'use strict';

/**
 * Declaration statement emitters: data / tetap / ubah / turunan / fungsi.
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
  PromptJSCompiler.prototype.visitDataDeclaration = function (node) {
    const initVal = this.lowerExpression(node.init);
    this.helpers.add('__createReactive');
    this.emit(`const ${node.name} = __createReactive(${initVal});`, node.loc);
  };

  PromptJSCompiler.prototype.visitTetapDeclaration = function (node) {
    // PromptJS patch: handle external data from front-matter
    if (node._isExternal && node._externalInfo) {
      const info = node._externalInfo;
      if (info.type === 'inline' && info.value !== null && info.value !== undefined) {
        this.emit(`const ${node.name} = ${JSON.stringify(info.value)};`);
      } else if (info.type === 'file') {
        // File reference: at build time, the engine should have loaded the data.
        // If not loaded (dev mode), emit a placeholder that loads at runtime.
        this.emit(
          `const ${node.name} = window.__DATA__ && window.__DATA__.${node.name} || ${JSON.stringify(info.value || null)};`
        );
      } else {
        this.emit(`const ${node.name} = ${JSON.stringify(info.value || null)};`);
      }
      return;
    }
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = ${initVal};`);
  };

  PromptJSCompiler.prototype.visitUbahDeclaration = function (node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`let ${node.name} = ${initVal};`, node.loc);
  };

  PromptJSCompiler.prototype.visitTurunanDeclaration = function (node) {
    const expr = this.lowerExpression(node.init);
    this.helpers.add('__createComputed');
    this.helpers.add('__createReactive');
    this.emit(`const ${node.name} = __createComputed(() => ${expr});`, node.loc);
  };

  PromptJSCompiler.prototype.visitFungsiDeclaration = function (node) {
    const params = node.params.map((p) => p.name).join(', ');
    this.emit(`function ${node.name}(${params}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit('}');
  };
}

module.exports = { install };
