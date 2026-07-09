/**
 * Visitor mixin for mutation statements:
 *   SimpanStatement, TambahkanStatement, KurangiStatement, SisipkanStatement,
 *   PerbaruiStatement, HapusDariStatement
 */

const { accept } = require('../../utils/visitor');
const Err = require('../../parser/error-codes');
const { VALID_PERBARUI_PROPERTIES } = require('../core/globals');

const mutationsVisitors = {
  // ─── SimpanStatement ──────────────────────────────────────
  visitSimpanStatement: function (node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    } else if (node.target && node.target.type === 'MemberExpression') {
      // [BUG-12 FIX] Track writes to MemberExpression targets
      let root = node.target.object;
      while (root && root.type === 'MemberExpression') {
        root = root.object;
      }
      if (root && root.type === 'Identifier') {
        const rootSymbol = this.currentScope.lookup(root.name);
        if (rootSymbol) {
          node.targetSymbol = rootSymbol;
          rootSymbol.writeCount++;
        }
      }
    }
    this.genericVisit(node);
  },

  // ─── TambahkanStatement ───────────────────────────────────
  visitTambahkanStatement: function (node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  },

  // ─── KurangiStatement ─────────────────────────────────────
  visitKurangiStatement: function (node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  },

  // ─── SisipkanStatement ────────────────────────────────────
  visitSisipkanStatement: function (node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  },

  // ─── PerbaruiStatement ────────────────────────────────────
  visitPerbaruiStatement: function (node) {
    if (node.target) {
      if (typeof node.target === 'string') {
        this._trackWrite(node.target, node);
      } else {
        accept(node.target, this);
        if (node.target.type === 'Identifier' && node.target.name) {
          this._trackWrite(node.target.name, node);
        }
      }
    }

    if (node.value) accept(node.value, this);

    if (node.property && typeof node.property === 'string') {
      if (!VALID_PERBARUI_PROPERTIES.has(node.property)) {
        this.warnings.push(
          Err.createError('E4008', node.loc, {
            message: `Properti perbarui "${node.property}" mungkin tidak didukung.`,
            suggestion: 'Gunakan properti yang didukung: teks, html, kelas, src, href, nilai, dll.',
          })
        );
      }
    }
  },

  // ─── HapusDariStatement ───────────────────────────────────
  visitHapusDariStatement: function (node) {
    if (node.item) accept(node.item, this);
    if (node.fromArray) accept(node.fromArray, this);
    if (node.fromArray && node.fromArray.type === 'Identifier') {
      const symbol = this.currentScope.lookup(node.fromArray.name);
      if (symbol) {
        node.fromArraySymbol = symbol;
        node.fromArrayReactive = symbol.kind === 'data' || symbol.kind === 'turunan';
        node.fromArrayResolved = symbol.resolvedName || symbol.name;
      } else {
        this.addError(
          'E3001',
          'Identifier "' + node.fromArray.name + '" tidak dideklarasikan',
          node.loc
        );
      }
    }
  },
};

module.exports = mutationsVisitors;
