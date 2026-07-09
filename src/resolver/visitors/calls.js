/**
 * Visitor mixin for call-related nodes:
 *   CallExpression, JalankanExpression
 */

const { accept } = require('../../utils/visitor');
const { BUILTIN_FUNCTIONS } = require('../core/globals');

const callsVisitors = {
  /**
   * Visitor untuk node CallExpression — pemanggilan fungsi `callee(args)`.
   */
  visitCallExpression: function (node) {
    accept(node.callee, this);

    if (node.arguments && node.arguments.length > 0) {
      node.arguments.forEach((arg) => accept(arg, this));
    }

    if (node.callee && node.callee.type === 'Identifier') {
      const calleeName = node.callee.name;
      if (BUILTIN_FUNCTIONS[calleeName]) {
        const builtin = BUILTIN_FUNCTIONS[calleeName];
        node.isBuiltin = true;
        node.builtinInfo = builtin;
        node.callee.originalName = calleeName;

        if (builtin.prefix) {
          node.isPrefixBuiltin = true;
        }

        if (builtin.helper) {
          node.needsRuntimeHelper = true;
        }
      }
    }

    // Cek jika callee adalah MemberExpression dengan method alias yang bermutasi
    if (node.callee && node.callee.type === 'MemberExpression' && node.callee.isMutatingMethod) {
      node.isMutatingMethodCall = true;
      node.mutatingMethodName = node.callee.property.name;
    }
  },

  /**
   * Visitor untuk node JalankanExpression — JS interop via `Jalankan name(args)`.
   */
  visitJalankanExpression: function (node) {
    const prevCallee = this.currentJalankanCallee;
    this.currentJalankanCallee = node.callee;

    if (node.arguments && node.arguments.length > 0) {
      node.arguments.forEach((arg) => accept(arg, this));
    }
    if (node.withArgs && node.withArgs.length > 0) {
      node.withArgs.forEach((arg) => accept(arg, this));
    }

    this.currentJalankanCallee = prevCallee;
  },
};

module.exports = callsVisitors;
