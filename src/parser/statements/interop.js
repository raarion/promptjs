'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Interop (Jalankan)
 * ============================================================================
 *
 * `jalankan <fungsi>(<args>)` — call a PromptJS function by name.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang interop statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse `jalankan` statement (call PromptJS function).
   * `jalankan <fungsi>(<args>)`
   */
  PromptJSParser.prototype._parseJalankanStatement = function () {
    const tok = this._advance();
    const loc = this._makeLoc(tok);

    // Parse callee (identifier)
    const calleeTok = this._expect(TT.TK_IDENT, 'Expected function name after "jalankan"');
    const callee = calleeTok
      ? AST.buatIdentifier(calleeTok.value, null)
      : AST.buatIdentifier('_', null);

    // Optional arguments
    let arguments_ = [];
    if (this._peek().type === TT.TK_LPAREN) {
      this._advance();
      arguments_ = [];
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        arguments_.push(this._parseExpression());
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")"');
    }

    return AST.buatJalankanExpression(callee, 'jalankan', loc, null, arguments_);
  };
}

module.exports = { install };
