'use strict';

/**
 * Control-flow emitters: Jika / Selama / Berhenti / Lewati / Kembalikan.
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
  PromptJSCompiler.prototype.visitJikaStatement = function (node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`if (${cond}) {`);
    this.indent++;
    accept(node.consequent, this);
    this.indent--;
    if (node.alternate) {
      this.emit('} else {');
      this.indent++;
      accept(node.alternate, this);
      this.indent--;
    }
    this.emit('}');
  };

  PromptJSCompiler.prototype.visitSelamaStatement = function (node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`while (${cond}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit('}');
  };

  PromptJSCompiler.prototype.visitBerhentiStatement = function (_node) {
    this.emit(`break;`);
  };

  PromptJSCompiler.prototype.visitLewatiStatement = function (_node) {
    // PromptJS patch: "pass" inside a BuatStatement means "empty element body" — emit nothing.
    // "lewati" inside a loop means "skip this iteration" — emit continue.
    // We use a context flag set by visitBuatStatement.
    if (this._inBuatBody) {
      // pass as empty body marker — nothing to emit
      return;
    }
    this.emit(`continue;`);
  };

  PromptJSCompiler.prototype.visitKembalikanStatement = function (node) {
    if (node.value) {
      const val = this.lowerExpression(node.value);
      this.emit(`return ${val};`);
    } else {
      this.emit(`return;`);
    }
  };
}

module.exports = { install };
