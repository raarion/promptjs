/**
 * Visitor mixin for Identifier nodes — resolve references, track reads.
 */

const Err = require('../../parser/error-codes');
const { JS_GLOBALS, BUILTIN_FUNCTIONS } = require('../core/globals');

const identifiersVisitors = {
  /**
   * Visitor untuk node Identifier — resolusi referensi + tracking read.
   */
  visitIdentifier: function (node) {
    // Abaikan jika ini adalah nama callee dari "jalankan"
    if (
      node.isCalleeJS ||
      (this.currentJalankanCallee && node.name === this.currentJalankanCallee)
    ) {
      return;
    }

    // Abaikan jika ini adalah nama fungsi bawaan (builtin)
    if (node.isBuiltinCallee && BUILTIN_FUNCTIONS[node.name]) {
      node.resolved = { kind: 'builtin', name: node.name, isReactive: false, isWritable: false };
      return;
    }

    const symbol = this.currentScope.lookup(node.name);
    if (symbol) {
      node.resolved = symbol;
      node.semantic = { symbol };
      symbol.readCount++;
      symbol.references.push(node);
    } else {
      if (BUILTIN_FUNCTIONS[node.name]) {
        node.resolved = { kind: 'builtin', name: node.name, isReactive: false, isWritable: false };
        return;
      }

      if (JS_GLOBALS.has(node.name)) {
        node.resolved = { kind: 'global', name: node.name, isReactive: false, isWritable: false };
        return;
      }

      if (node._isExternal) {
        node.resolved = { kind: 'external', name: node.name, isReactive: false, isWritable: false };
        return;
      }

      node.isUndefined = true;
      if (this._suppressUndeclaredCascade) {
        return;
      }
      this.errors.push(
        Err.createError('E3001', node.loc, {
          message: `Identifier "${node.name}" tidak dideklarasikan.`,
          suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.',
        })
      );
    }
  },
};

module.exports = identifiersVisitors;
