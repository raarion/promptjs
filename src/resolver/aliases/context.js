const { JS_GLOBALS } = require('../core/globals');

/**
 * Context-aware alias helpers.
 *
 * These methods determine whether a given AST node refers to a DOM element,
 * a reactive data variable, or an array-like variable. Used by
 * MemberExpression visitor to decide which property/method aliases to apply.
 */

const aliasContext = {
  /**
   * [BUG-13 FIX] Check if a node refers to a DOM element.
   * A node is a DOM element if:
   * - It has compiledVarName (set by the compiler for Buat elements)
   * - It references a symbol of kind 'komponen'
   * - It is 'document', 'window', 'console', 'localStorage', 'sessionStorage'
   * - It is a SelfReference
   *
   * @param {Object} node - AST node to check
   * @returns {boolean} True if node refers to a DOM element
   */
  _isDomElement: function (node) {
    if (!node) return false;
    if (node.type === 'SelfReference') return true;
    if (node.compiledVarName) return true;
    if (node.type === 'Identifier') {
      if (JS_GLOBALS.has(node.name)) {
        const domGlobals = new Set([
          'document',
          'window',
          'localStorage',
          'sessionStorage',
          'console',
        ]);
        return domGlobals.has(node.name);
      }
      if (node.resolved) {
        return node.resolved.kind === 'komponen' || node.resolved.isDomElement === true;
      }
    }
    if (node.type === 'MemberExpression') {
      return this._isDomElement(node.object);
    }
    return false;
  },

  /**
   * [BUG-13 FIX] Check if a node refers to a reactive data/turunan variable.
   *
   * @param {Object} node - AST node to check
   * @returns {boolean} True if node is a reactive data variable
   */
  _isReactiveDataVar: function (node) {
    if (!node) return false;
    if (node.type === 'Identifier' && node.resolved) {
      return node.resolved.kind === 'data' || node.resolved.kind === 'turunan';
    }
    if (node.type === 'MemberExpression') {
      let root = node.object;
      while (root && root.type === 'MemberExpression') {
        root = root.object;
      }
      if (root && root.type === 'Identifier' && root.resolved) {
        return root.resolved.kind === 'data' || root.resolved.kind === 'turunan';
      }
    }
    return false;
  },

  /**
   * [BUG-13 FIX] Check if a node refers to an array-like variable.
   * An array-like variable is one whose init value is an ArrayLiteral,
   * or whose typeHint is 'array'.
   *
   * @param {Object} node - AST node to check
   * @returns {boolean} True if node is likely an array
   */
  _isArrayLikeVar: function (node) {
    if (!node) return false;
    if (node.type === 'Identifier' && node.resolved) {
      const sym = node.resolved;
      if (sym.declarationNode && sym.declarationNode.init) {
        return sym.declarationNode.init.type === 'ArrayLiteral';
      }
      if (sym.typeHint === 'array') return true;
    }
    return false;
  },
};

module.exports = aliasContext;
