/**
 * Visitor mixin for component/DOM-related nodes:
 *   GunakanStatement, BuatStatement, TampilkanStatement, SembunyikanStatement,
 *   HapusStatement, KosongkanStatement, AmbilDomStatement, ArahkanStatement
 */

const { accept } = require('../../utils/visitor');
const Err = require('../../parser/error-codes');

const componentsVisitors = {
  // ─── GunakanStatement ─────────────────────────────────────
  visitGunakanStatement: function (node) {
    if (node.componentName) {
      const symbol = this.currentScope.lookup(node.componentName);
      if (!symbol) {
        this.errors.push(
          Err.createError('E3004', node.loc, {
            message: `Komponen "${node.componentName}" digunakan sebelum dideklarasi.`,
            suggestion: 'Pindahkan deklarasi komponen sebelum penggunaannya.',
          })
        );
      } else if (symbol.kind !== 'komponen') {
        this.errors.push(
          Err.createError('E4010', node.loc, {
            message: `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`,
            suggestion: 'Pastikan nama yang direferensikan adalah komponen (PascalCase).',
          })
        );
      }
    }

    if (node.props) {
      node.props.forEach((prop) => {
        if (prop.value) accept(prop.value, this);
      });
    }

    this.genericVisit(node);
  },

  // ─── BuatStatement ────────────────────────────────────────
  visitBuatStatement: function (node) {
    this.buatStack.push(node);
    this.genericVisit(node);
    this.buatStack.pop();
  },

  // ─── TampilkanStatement ───────────────────────────────────
  visitTampilkanStatement: function (node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  },

  // ─── SembunyikanStatement ─────────────────────────────────
  visitSembunyikanStatement: function (node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  },

  // ─── HapusStatement ───────────────────────────────────────
  visitHapusStatement: function (node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  },

  // ─── KosongkanStatement ───────────────────────────────────
  visitKosongkanStatement: function (node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  },

  // ─── AmbilDomStatement ────────────────────────────────────
  visitAmbilDomStatement: function (node) {
    if (node.source) accept(node.source, this);
    this.genericVisit(node);
  },

  // ─── ArahkanStatement ─────────────────────────────────────
  visitArahkanStatement: function (node) {
    if (node.url) accept(node.url, this);
    this.genericVisit(node);
  },
};

module.exports = componentsVisitors;
