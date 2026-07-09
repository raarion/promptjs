/**
 * Visitor mixin for MemberExpression nodes — alias resolution for
 * property access and method calls.
 */

const { accept } = require('../../utils/visitor');
const { UNIVERSAL_PROPERTI, DOM_ONLY_PROPERTI } = require('../aliases/properties');
const { UNIVERSAL_METHOD, MUTATING_METHODS } = require('../aliases/methods');

const memberExpressionVisitors = {
  /**
   * Visitor untuk node MemberExpression — akses properti `obj.prop` atau `obj[idx]`.
   */
  visitMemberExpression: function (node) {
    accept(node.object, this);

    if (node.property.type === 'Identifier') {
      const propName = node.property.name;

      if (propName === 'indeks') {
        node.property.isVirtual = true;
      }

      const isDomContext = this._isDomElement(node.object);
      const isReactiveData = this._isReactiveDataVar(node.object);
      const isArrayLike = this._isArrayLikeVar(node.object);

      if (isDomContext) {
        // DOM element: apply all aliases (universal + DOM-specific)
        if (DOM_ONLY_PROPERTI[propName]) {
          node.property.originalName = propName;
          node.property.name = DOM_ONLY_PROPERTI[propName];
          node.isTranslatedAlias = true;
        } else if (UNIVERSAL_PROPERTI[propName]) {
          node.property.originalName = propName;
          node.property.name = UNIVERSAL_PROPERTI[propName];
          node.isTranslatedAlias = true;
        }
        if (UNIVERSAL_METHOD[propName]) {
          node.property.originalName = propName;
          node.property.name = UNIVERSAL_METHOD[propName];
          node.isTranslatedMethodAlias = true;
          node.isMutatingMethod = MUTATING_METHODS.has(UNIVERSAL_METHOD[propName]);
        }
      } else if (isArrayLike || !isReactiveData) {
        // Array or non-reactive variable: apply universal aliases only
        if (UNIVERSAL_PROPERTI[propName]) {
          node.property.originalName = propName;
          node.property.name = UNIVERSAL_PROPERTI[propName];
          node.isTranslatedAlias = true;
        }
        if (UNIVERSAL_METHOD[propName]) {
          node.property.originalName = propName;
          node.property.name = UNIVERSAL_METHOD[propName];
          node.isTranslatedMethodAlias = true;
          node.isMutatingMethod = MUTATING_METHODS.has(UNIVERSAL_METHOD[propName]);
        }
      } else if (isReactiveData) {
        // BUG-15 FIX: Reactive data — method aliases only, no property aliases
        if (UNIVERSAL_METHOD[propName]) {
          node.property.originalName = propName;
          node.property.name = UNIVERSAL_METHOD[propName];
          node.isTranslatedMethodAlias = true;
          node.isMutatingMethod = MUTATING_METHODS.has(UNIVERSAL_METHOD[propName]);
        }
        // Property aliases NOT applied on reactive data (BUG-13 fix)
      }
    }
  },
};

module.exports = memberExpressionVisitors;
