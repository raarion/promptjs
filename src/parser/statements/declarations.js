'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Declarations
 * ============================================================================
 *
 * Data/Tetap/Ubah/Turunan declarations, Fungsi declarations,
 * Komponen definitions, and YAML-style data block parsing.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang declaration statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse block-style data declaration body (YAML-style arrays/objects).
   * BUG-14: Handles indented content after `data nama:` such as:
   *   data daftarSederhana:
   *     - "a"
   *     - "b"
   *
   * @returns {Object} AST node (ArrayLiteral or ObjectLiteral)
   */
  PromptJSParser.prototype._parseDataBlock = function () {
    if (this._peek().type !== TT.TK_INDENT) {
      return null;
    }
    this._advance(); // consume INDENT

    const items = [];
    const props = [];

    while (this._peek().type !== TT.TK_DEDENT && !this._atEnd()) {
      if (this._peek().type === TT.TK_MINUS) {
        // Array item: - "value" or - expression
        this._advance(); // consume -
        // Parse only a PRIMARY expression (not a full expression that would
        // consume subsequent TK_MINUS tokens as subtraction operators).
        const item = this._parsePrimaryExpression();
        items.push(item);
      } else if (
        this._peek().type === TT.TK_IDENT &&
        this._peekAt(1) &&
        this._peekAt(1).type === TT.TK_COLON
      ) {
        // Object property: key: value
        const keyTok = this._advance(); // consume key
        this._advance(); // consume :
        const val = this._parseExpression();
        props.push(AST.buatPropertyNode(String(keyTok.value), val, null, false));
      } else {
        // Skip unexpected tokens
        this._advance();
      }
    }

    if (this._peek().type === TT.TK_DEDENT) {
      this._advance(); // consume DEDENT
    }

    if (items.length > 0) {
      return AST.buatArrayLiteral(items, null);
    } else if (props.length > 0) {
      return AST.buatObjectLiteral(props, null);
    }
    return null;
  };

  /**
   * Parse deklarasi variabel — `Data`/`State`, `Tetap`/`Const`, `Ubah`/`Let`, `Turunan`/`Derived`.
   *
   * Sintaks: `<keyword> <nama> [: <typeHint>] [= <init>]`.
   *
   * @returns {Object} AST node DataDeclaration / TetapDeclaration / UbahDeclaration / TurunanDeclaration
   */
  PromptJSParser.prototype._parseDataDeclaration = function () {
    const kindTok = this._advance(); // consume keyword
    const keyword = kindTok.value.toLowerCase();

    // Parse name
    const nameTok = this._expect(TT.TK_IDENT, 'Expected variable name');
    const name = nameTok ? nameTok.value : '_';

    // Optional type hint: `name: typeHint = value` or `name = value`
    // BUG-05 FIX: Also handle `name: <expr>` where the colon is followed by
    // an expression that serves as the init value (no separate type hint).
    // This handles cases like `ubah positif: angka.saring(x => x > 3)`.
    let typeHint = null;
    let init = null;
    if (this._match(TT.TK_COLON)) {
      // BUG-14 FIX: Check if next token is TK_INDENT -> block-style data declaration
      // data daftarSederhana:
      //   - "a"
      //   - "b"
      if (this._peek().type === TT.TK_INDENT) {
        init = this._parseDataBlock();
      } else {
        // Peek ahead: if the next token is a single IDENT followed by =, it's a type hint.
        // Otherwise, the entire expression after : is the init value.
        const nextTok = this._peek();
        const nextNextTok = this._peekAt(1);
        if (
          nextTok &&
          nextTok.type === TT.TK_IDENT &&
          nextNextTok &&
          nextNextTok.type === TT.TK_ASSIGN
        ) {
          // It's a type hint: `name: typeHint = value`
          const hintTok = this._advance();
          typeHint = hintTok.value;
          this._advance(); // consume =
          init = this._parseExpression();
        } else {
          // No type hint — the entire expression after : is the init value
          init = this._parseExpression();
        }
      } // end of BUG-14 else block
    } else if (this._match(TT.TK_ASSIGN)) {
      init = this._parseExpression();
    }

    const loc = this._makeLoc(kindTok);

    switch (keyword) {
      case 'data':
      case 'state':
        return AST.buatDataDeclaration(name, typeHint, init, loc, null);
      case 'tetap':
      case 'const':
        return AST.buatTetapDeclaration(name, typeHint, init, loc, null);
      case 'ubah':
      case 'let':
        return AST.buatUbahDeclaration(name, typeHint, init, loc, null);
      case 'turunan':
      case 'derived':
        return AST.buatTurunanDeclaration(name, typeHint, init, loc, null);
      default:
        return AST.buatTetapDeclaration(name, typeHint, init, loc, null);
    }
  };

  /**
   * Parse deklarasi fungsi `Fungsi <nama>(<params>): <body>`.
   *
   * @returns {Object} AST node FungsiDeclaration
   */
  PromptJSParser.prototype._parseFungsiDeclaration = function () {
    const startTok = this._advance(); // consume Fungsi/Func
    const nameTok = this._expect(TT.TK_IDENT, 'Expected function name');
    const name = nameTok ? nameTok.value : '_fn';

    // Parse parameters
    const params = [];
    if (this._match(TT.TK_LPAREN)) {
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        const pTok = this._expect(TT.TK_IDENT, 'Expected parameter name');
        // Optional default value: `nama: <expr>`
        let pDefault = null;
        if (pTok && this._match(TT.TK_COLON)) {
          pDefault = this._parseExpression();
        }
        if (pTok) {
          params.push(AST.buatParameter(pTok.value, pTok.loc || null, null, pDefault));
        }
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")"');
    }

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after function signature');

    const loc = this._makeLoc(startTok);
    const body = this._parseBlock();

    return AST.buatFungsiDeclaration(name, params, body, loc, null, null);
  };

  /**
   * Parse deklarasi komponen `Komponen <Name>(<params>): <body>` / `Definisikan <Name>(...):`.
   *
   * Tambahkan nama komponen ke `this.componentNames` untuk validasi `Gunakan`.
   *
   * @returns {Object} AST node KomponenDeclaration
   */
  PromptJSParser.prototype._parseDefineComponent = function () {
    const startTok = this._advance(); // consume Definisikan/Define
    const nameTok = this._expect(TT.TK_IDENT, 'Expected component name');
    const name = nameTok ? nameTok.value : '_comp';

    // Register component name for disambiguation
    this.componentNames.add(name);

    // Parse parameters
    const params = [];
    if (this._match(TT.TK_LPAREN)) {
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        const pTok = this._expect(TT.TK_IDENT, 'Expected parameter name');
        // Optional default value: `nama: <expr>` (e.g. `varian: "primer"`)
        let pDefault = null;
        if (pTok && this._match(TT.TK_COLON)) {
          pDefault = this._parseExpression();
        }
        if (pTok) {
          params.push(AST.buatParameter(pTok.value, pTok.loc || null, null, pDefault));
        }
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")"');
    }

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after component definition');

    const loc = this._makeLoc(startTok);
    const body = this._parseBlock();

    return AST.buatKomponenDeclaration(name, params, body, loc, null, null);
  };
}

module.exports = { install };
