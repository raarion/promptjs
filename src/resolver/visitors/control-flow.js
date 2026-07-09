/**
 * Visitor mixin for control-flow nodes:
 *   SelamaStatement
 */

const { accept } = require('../../utils/visitor');
const { Scope } = require('../core/scope');

const controlFlowVisitors = {
  /**
   * Visitor untuk SelamaStatement — traverse condition dan body.
   */
  visitSelamaStatement: function (node) {
    if (node.condition) accept(node.condition, this);

    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);
    if (node.body) accept(node.body, this);
    this.currentScope = prevScope;
  },
};

module.exports = controlFlowVisitors;
