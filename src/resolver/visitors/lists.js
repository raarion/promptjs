/**
 * Visitor mixin for list-related nodes:
 *   UlangiStatement
 */

const { accept } = require('../../utils/visitor');
const { Scope } = require('../core/scope');
const Err = require('../../parser/error-codes');

const listsVisitors = {
  /**
   * Visitor untuk UlangiStatement — push scope iterasi, tambahkan iterator
   * sebagai simbol lokal, traverse source dan body.
   */
  visitUlangiStatement: function (node) {
    accept(node.source, this);

    // K1a: expose source reactivity to the emitter
    if (node.source && node.source.type === 'Identifier') {
      const sourceSymbol = this.currentScope.lookup(node.source.name);
      if (sourceSymbol) {
        node.sourceSymbol = sourceSymbol;
        node.sourceReactive = sourceSymbol.kind === 'data' || sourceSymbol.kind === 'turunan';
      }
    }

    const prevScope = this.currentScope;
    this.currentScope = new Scope('iterasi', prevScope);

    if (node.iteratorName) {
      this.addSymbol(node.iteratorName, 'ubah', node, { isWritable: false });
    }

    // K1b: key expression resolves inside iterasi scope
    if (node.keyExpr) {
      accept(node.keyExpr, this);
    }

    // K2a: FLIP transitions require stable keyed identity
    if (node.transitionName && !node.keyExpr) {
      const droppedName = node.transitionName;
      this.warnings.push(
        Err.createError('W3004', node.loc, {
          message: `"dengan transisi ${droppedName}" diabaikan karena daftar tidak memakai "dengan kunci".`,
          suggestion:
            'Tambahkan "dengan kunci <ekspresi>" (mis. item.id) agar transisi FLIP dapat melacak identitas item.',
        })
      );
      delete node.transitionName;
    }

    accept(node.body, this);
    this.currentScope = prevScope;
  },
};

module.exports = listsVisitors;
