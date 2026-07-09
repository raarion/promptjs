/**
 * Visitor mixin for fetch-related nodes:
 *   AmbilLuarStatement
 */

const { accept } = require('../../utils/visitor');
const { Scope } = require('../core/scope');

const fetchVisitors = {
  /**
   * Visitor untuk AmbilLuarStatement — traverse url, branches, dan options.
   */
  visitAmbilLuarStatement: function (node) {
    if (node.url) accept(node.url, this);

    // [BUG-3 FIX] Inline fetch bind form — mark auto-state as used
    if (node.bindTarget) {
      this._markFetchAutoStateUsed(node.bindTarget, node);
      this._markFetchAutoStateUsed(`${node.bindTarget}_memuat`, node);
      this._markFetchAutoStateUsed(`${node.bindTarget}_galat`, node);
    }

    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);

    if (node.saveTarget) {
      this.addSymbol(node.saveTarget, 'ubah', node, { isWritable: true });
    }

    this.genericVisit(node);
    this.currentScope = prevScope;
  },
};

module.exports = fetchVisitors;
