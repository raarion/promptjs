/**
 * Visitor mixin for event-related nodes:
 *   KetikaStatement, SetelahStatement, SaatStatement
 */

const { accept } = require('../../utils/visitor');
const { Scope } = require('../core/scope');
const Err = require('../../parser/error-codes');
const { VALID_EVENT_NAMES } = require('../core/globals');

const eventsVisitors = {
  // ─── KetikaStatement ──────────────────────────────────────
  visitKetikaStatement: function (node) {
    if (!node.target) {
      if (this.buatStack.length > 0) {
        const parentNode = this.buatStack[this.buatStack.length - 1];
        node.target = {
          type: 'SelfReference',
          referencedNode: parentNode,
          loc: node.loc,
        };
      } else {
        this.errors.push(
          Err.createError('E3005', node.loc, {
            message:
              'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".',
            suggestion:
              'Tambahkan target pada "ketika" atau letakkan di dalam blok "buat"/"komponen".',
          })
        );
      }
    } else {
      accept(node.target, this);
    }

    if (node.event && typeof node.event === 'string' && !VALID_EVENT_NAMES.has(node.event)) {
      this.warnings.push(
        Err.createError('E4009', node.loc, {
          severity: 'warning',
          message: `Event name "${node.event}" mungkin tidak dikenali.`,
          suggestion: 'Gunakan nama event yang valid: diklik, diketik, ditekan, dll.',
        })
      );
    }

    const prevScope = this.currentScope;
    this.currentScope = new Scope('watcher', prevScope);
    if (node.body) accept(node.body, this);
    if (node.action) accept(node.action, this);
    this.currentScope = prevScope;
  },

  // ─── SetelahStatement ─────────────────────────────────────
  visitSetelahStatement: function (node) {
    if (node.target) {
      const symbol = this.currentScope.lookup(node.target);
      if (symbol) {
        node.targetSymbol = symbol;
      }
    }
    this.genericVisit(node);
  },

  // ─── SaatStatement ────────────────────────────────────────
  visitSaatStatement: function (node) {
    let targetName;
    if (typeof node.target === 'string') {
      targetName = node.target;
    } else if (node.target && node.target.type === 'Identifier') {
      targetName = node.target.name;
    } else if (node.target && node.target.type === 'MemberExpression') {
      let root = node.target;
      while (root.type === 'MemberExpression') {
        root = root.object;
      }
      targetName = root.name;
    } else {
      targetName = String(node.target);
    }

    const binding = this.currentScope.lookup(targetName);
    if (!binding) {
      node.isUndefined = true;
      this.errors.push(
        Err.createError('E3001', node.loc, {
          message: `Identifier "${targetName}" tidak dideklarasikan.`,
          suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.',
        })
      );
    } else if (!binding.isReactive) {
      this.warnings.push(
        Err.createError('W3003', node.loc, {
          message: `Variabel "${targetName}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
          suggestion: 'Gunakan "data" (var) reaktif sebagai target watcher.',
        })
      );
    }

    const prevScope = this.currentScope;
    this.currentScope = new Scope('watcher', prevScope);
    this.genericVisit(node);
    this.currentScope = prevScope;
  },
};

module.exports = eventsVisitors;
