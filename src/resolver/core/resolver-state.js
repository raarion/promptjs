/**
 * Resolver state mixin — constructor, resolve entry point, addSymbol,
 * addError, addWarning, markAsJSExternal.
 *
 * These methods require direct access to the resolver's internal state
 * (errors, warnings, currentScope, buatStack, allSymbols, etc.).
 */
const { accept } = require('../../utils/visitor');
const Err = require('../../parser/error-codes');
const { Scope } = require('./scope');
const { SemanticSymbol } = require('./symbol');

const resolverState = {
  // ─── Entry Point ───────────────────────────────────────────
  /**
   * Entry point resolver — traverse AST, resolve references, build symbol table.
   *
   * @param {Object} ast - Root AST node (Program)
   * @returns {{ ast: Object, errors: Object[], warnings: Object[] }} Hasil resolusi
   */
  resolve: function (ast) {
    this.errors = [];
    this.warnings = [];
    Scope._nextId = 0;
    this._symbolIdCounter = 0;
    this.currentScope = new Scope('global', null);
    this.allSymbols = [];

    // Pass 1: Hoisting deklarasi global
    this.gatherGlobals(ast);

    // Pass 2: Deep resolution
    accept(ast, this);

    // Tempelkan metadata untuk Analyzer
    ast.semantic = {
      symbols: this.allSymbols,
      globalScope: this.currentScope,
    };

    return { ast, errors: this.errors, warnings: this.warnings };
  },

  // ─── Utility: menambah simbol ────────────────────────────────
  /**
   * Tambahkan simbol baru ke current scope.
   *
   * @param {string} name - Nama simbol
   * @param {string} kind - Jenis simbol
   * @param {Object} node - AST node deklarasi
   * @param {Object} [metadata] - Metadata tambahan
   * @returns {SemanticSymbol | null} Simbol yang baru ditambahkan
   */
  addSymbol: function (name, kind, node, metadata = {}) {
    const existing = this.currentScope.symbols.get(name);
    if (existing) {
      this.errors.push(
        Err.createError('E3002', node.loc, {
          message: `Simbol "${name}" sudah dideklarasikan dalam scope yang sama.`,
          suggestion: `Deklarasi pertama ada di Baris ${existing.declarationNode.loc.start.line}.`,
        })
      );
      return null;
    }

    const shadowed = this.currentScope.parent ? this.currentScope.parent.lookup(name) : null;

    if (shadowed) {
      this.warnings.push(
        Err.createError('W3002', node.loc, {
          message: `Variabel "${name}" menyembunyikan variabel dengan nama sama di scope luar.`,
          suggestion: 'Gunakan nama yang berbeda untuk menghindari kebingungan.',
          relatedInformation: [
            {
              message: `Deklarasi yang disembunyikan: "${name}" (${shadowed.kind}).`,
              loc:
                shadowed.declarationNode && shadowed.declarationNode.loc
                  ? shadowed.declarationNode.loc
                  : null,
            },
          ],
        })
      );
    }

    const symbol = new SemanticSymbol(name, kind, node, this.currentScope.type, {
      ...metadata,
      id: 'sym_' + ++this._symbolIdCounter,
      scopeId: this.currentScope.id,
      shadowedSymbol: shadowed,
    });

    this.currentScope.define(name, symbol);
    this.allSymbols.push(symbol);

    node.symbol = symbol;
    return symbol;
  },

  /**
   * Tandai node sebagai referensi JS external (bukan PromptJS symbol).
   *
   * @param {Object} node - AST node yang akan ditandai
   */
  markAsJSExternal: function (node) {
    if (node.type === 'Identifier') {
      node.isCalleeJS = true;
    } else if (node.type === 'MemberExpression') {
      this.markAsJSExternal(node.object);
    }
  },

  // ─── Error/Warning Helpers ──────────────────────────────────
  /**
   * Tambahkan error ke daftar `this.errors`.
   */
  addError: function (code, message, loc, suggestion) {
    this.errors.push(
      Err.createError(code, loc, {
        message: message,
        suggestion: suggestion || '',
      })
    );
  },

  /**
   * Tambahkan warning ke daftar `this.warnings`.
   */
  addWarning: function (code, message, loc, suggestion) {
    this.warnings.push(
      Err.createError(code, loc, {
        message: message,
        suggestion: suggestion || '',
      })
    );
  },
};

module.exports = resolverState;
