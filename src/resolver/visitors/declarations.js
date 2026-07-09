/**
 * Visitor mixin for declaration nodes:
 *   DataDeclaration, TetapDeclaration, UbahDeclaration, TurunanDeclaration,
 *   FungsiDeclaration, KomponenDeclaration, BlockStatement,
 *   ArrowFunctionExpression, TextNode
 */

const { accept } = require('../../utils/visitor');
const Err = require('../../parser/error-codes');
const { SemanticSymbol } = require('../core/symbol');
const { Scope } = require('../core/scope');

const declarationsVisitors = {
  // ─── DataDeclaration ─────────────────────────────────────
  visitDataDeclaration: function (node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
    }
    this.genericVisit(node);
  },

  // ─── TetapDeclaration ────────────────────────────────────
  visitTetapDeclaration: function (node) {
    if (!this.currentScope.symbols.has(node.name)) {
      const isExternal = node._isExternal || false;
      this.addSymbol(node.name, 'tetap', node, { isWritable: false, isExternal: isExternal });
    }
    if (!node.init && !node._isExternal) {
      this.warnings.push(
        Err.createError('W4003', node.loc, {
          message: `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`,
          suggestion: 'Berikan nilai awal untuk konstanta.',
        })
      );
    }
    this.genericVisit(node);
  },

  // ─── UbahDeclaration ─────────────────────────────────────
  visitUbahDeclaration: function (node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'ubah', node, { isWritable: true });
    }
    this.genericVisit(node);
  },

  // ─── TurunanDeclaration ──────────────────────────────────
  visitTurunanDeclaration: function (node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
    }
    this.genericVisit(node);
  },

  // ─── FungsiDeclaration ───────────────────────────────────
  visitFungsiDeclaration: function (node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);

    if (node.params) {
      node.params.forEach((p) =>
        this.addSymbol(p.name, 'parameter', p, { isReactive: false, isWritable: true })
      );
    }

    this.genericVisit(node);
    this.currentScope = prevScope;
  },

  // ─── KomponenDeclaration ─────────────────────────────────
  visitKomponenDeclaration: function (node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('komponen', prevScope);

    if (node.params) {
      node.params.forEach((p) =>
        this.addSymbol(p.name, 'parameter', p, { isReactive: true, isWritable: true })
      );
    }

    this.buatStack.push(node);
    this.genericVisit(node);
    this.buatStack.pop();

    this.currentScope = prevScope;
  },

  // ─── BlockStatement ───────────────────────────────────────
  visitBlockStatement: function (node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);
    this.genericVisit(node);
    this.currentScope = prevScope;
  },

  // ─── ArrowFunctionExpression ──────────────────────────────
  visitArrowFunctionExpression: function (node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('arrow', prevScope);

    if (node.params) {
      for (const param of node.params) {
        if (param.type === 'Identifier') {
          const sym = new SemanticSymbol(param.name, 'ubah', null, param.loc);
          sym.isWritable = false;
          this.currentScope.define(param.name, sym);
        }
      }
    }

    if (node.body) {
      accept(node.body, this);
    }

    this.currentScope = prevScope;
  },

  // ─── TextNode ─────────────────────────────────────────────
  visitTextNode: function (_node) {
    // TextNode has no identifiers to resolve — pure text value.
  },
};

module.exports = declarationsVisitors;
