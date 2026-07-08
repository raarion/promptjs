'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Control Flow
 * ============================================================================
 *
 * Jika (if/else/else-if), Selama (while), Pass, Return, and Simple statements.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang control flow statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse `Jika`/`If` statement — kondisional dengan opsional cabang `Lainnya`/`Else`.
   *
   * Sintaks: `Jika <kondisi>: <body>` (opsional `Lainnya: <body>`).
   *
   * @returns {Object} AST node JikaStatement
   */
  PromptJSParser.prototype._parseJikaStatement = function () {
    const startTok = this._advance(); // consume Jika/If

    // Parse condition expression
    const condition = this._parseExpression();

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after condition');

    const loc = this._makeLoc(startTok);

    // Parse consequent block
    const consequent = this._parseBlock();

    // Check for Lainnya/Else or multi-word else aliases
    let alternate = null;
    if (this._peek().type === TT.TK_LAINNYA) {
      this._advance(); // consume Lainnya/Else
      if (this._peek().type === TT.TK_COLON) this._advance(); // optional colon
      alternate = this._parseBlock();
    } else if (this._isMultiWordElse()) {
      // "selain itu" → plain else (no condition)
      this._advance(); // consume "selain"
      this._advance(); // consume "itu"
      if (this._peek().type === TT.TK_COLON) this._advance(); // optional colon
      alternate = this._parseBlock();
    } else if (this._isMultiWordElseIf()) {
      // "namun jika" / "tapi kalau" → else-if (with new condition)
      this._advance(); // consume "namun"/"tapi"
      this._advance(); // consume "jika"/"kalau"
      const elifCond = this._parseExpression();
      this._expect(TT.TK_COLON, 'Expected ":" after else-if condition');
      const elifBody = this._parseBlock();
      // Recursively check for further else/else-if chains
      const elifAlternate = this._parseElseChain();
      alternate = AST.buatJikaStatement(elifCond, elifBody, loc, null, elifAlternate);
    }

    return AST.buatJikaStatement(condition, consequent, loc, null, alternate);
  };

  /**
   * Check if current position starts a multi-word "else" pattern.
   * Recognized: `selain itu`
   *
   * @returns {boolean}
   */
  PromptJSParser.prototype._isMultiWordElse = function () {
    const cur = this._peek();
    const nxt = this._peekAt(1);
    return (
      cur.type === TT.TK_IDENT &&
      cur.value === 'selain' &&
      nxt.type === TT.TK_IDENT &&
      nxt.value === 'itu'
    );
  };

  /**
   * Check if current position starts a multi-word "else-if" pattern.
   * Recognized: `namun jika`, `namun kalau`, `tapi jika`, `tapi kalau`
   *
   * @returns {boolean}
   */
  PromptJSParser.prototype._isMultiWordElseIf = function () {
    const cur = this._peek();
    const nxt = this._peekAt(1);
    if (cur.type !== TT.TK_IDENT) return false;
    if (cur.value !== 'namun' && cur.value !== 'tapi') return false;
    return nxt.type === TT.TK_JIKA;
  };

  /**
   * Parse trailing else / else-if chain after a Jika consequent block.
   * Used by multi-word else-if to support chaining: "namun jika ... : ... namun jika ... : ... selain itu: ..."
   *
   * @returns {Object|null} AST node (JikaStatement for else-if, BlockStatement for else), or null
   */
  PromptJSParser.prototype._parseElseChain = function () {
    if (this._peek().type === TT.TK_LAINNYA) {
      this._advance(); // consume Lainnya/Else
      if (this._peek().type === TT.TK_COLON) this._advance();
      return this._parseBlock();
    }
    if (this._isMultiWordElse()) {
      this._advance(); // consume "selain"
      this._advance(); // consume "itu"
      if (this._peek().type === TT.TK_COLON) this._advance();
      return this._parseBlock();
    }
    if (this._isMultiWordElseIf()) {
      const loc = this._makeLoc(this._peek());
      this._advance(); // consume "namun"/"tapi"
      this._advance(); // consume "jika"/"kalau"
      const elifCond = this._parseExpression();
      this._expect(TT.TK_COLON, 'Expected ":" after else-if condition');
      const elifBody = this._parseBlock();
      const elifAlternate = this._parseElseChain();
      return AST.buatJikaStatement(elifCond, elifBody, loc, null, elifAlternate);
    }
    return null;
  };

  /**
   * Parse `Selama`/`while` statement — while loop.
   *
   * Sintaks: `Selama <kondisi>: <body>`
   *         `while <condition>: <body>`
   *
   * @returns {Object} AST node SelamaStatement
   */
  PromptJSParser.prototype._parseSelamaStatement = function () {
    const startTok = this._advance(); // consume Selama/while

    // Parse condition expression
    const condition = this._parseExpression();

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after while condition');

    const loc = this._makeLoc(startTok);

    // Parse body block
    const body = this._parseBlock();

    return AST.buatSelamaStatement(condition, body, loc, null);
  };

  /**
   * Parse `lewati`/`pass` statement — empty body / skip.
   *
   * @returns {Object} AST node LewatiStatement
   */
  PromptJSParser.prototype._parsePassStatement = function () {
    const tok = this._advance(); // consume pass/Lewati
    return AST.buatLewatiStatement(this._makeLoc(tok));
  };

  /**
   * Parse `Kembalikan`/`Return` statement — return dengan opsional ekspresi nilai.
   *
   * @returns {Object} AST node KembalikanStatement
   */
  PromptJSParser.prototype._parseReturnStatement = function () {
    const startTok = this._advance(); // consume Kembalikan/Return
    let value = null;
    if (
      this._peek().type !== TT.TK_COLON &&
      this._peek().type !== TT.TK_INDENT &&
      this._peek().type !== TT.TK_DEDENT
    ) {
      value = this._parseExpression();
    }
    return AST.buatKembalikanStatement(this._makeLoc(startTok), value);
  };

  /**
   * Parse standalone keyword statement (berhenti, muat ulang, kembali).
   * No arguments — just consume the keyword and return the AST node.
   */
  PromptJSParser.prototype._parseSimpleStatement = function (nodeType) {
    const tok = this._advance();
    const loc = this._makeLoc(tok);
    switch (nodeType) {
      case 'BerhentiStatement':
        return AST.buatBerhentiStatement(loc);
      case 'MuatUlangStatement':
        return AST.buatMuatUlangStatement(loc);
      case 'KembaliStatement':
        return AST.buatKembaliStatement(loc);
      default:
        return { type: nodeType, loc };
    }
  };
}

module.exports = { install };
