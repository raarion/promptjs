'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Reactivity & Lifecycle
 * ============================================================================
 *
 * Saat (reactive watcher), lifecycle hooks (dipasang/dilepas), and
 * Setelah (post-completion hook).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang reactivity statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse `Saat`/`When` statement — reactive watcher terhadap data reaktif.
   *
   * Sintaks: `Saat <target>: <body>`.
   *
   * @returns {Object} AST node SaatStatement
   */
  PromptJSParser.prototype._parseSaatStatement = function () {
    const startTok = this._advance(); // consume Saat/When

    // Parse target (the reactive variable being watched)
    const target = this._parseExpression();

    // [BUG-02 FIX] Accept optional "berubah"/"changes" keyword after target.
    // The documentation lists `Saat tema berubah:` as valid syntax, but the
    // parser previously rejected it because it expected ':' immediately after
    // the target expression. Now we consume the optional keyword.
    const nextTok = this._peek();
    if (
      nextTok &&
      nextTok.type === TT.TK_IDENT &&
      (nextTok.value === 'berubah' || nextTok.value === 'changes')
    ) {
      this._advance(); // consume berubah/changes
    }

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after saat target');

    const loc = this._makeLoc(startTok);
    const body = this._parseBlock();

    return AST.buatSaatStatement(target, body, loc, null);
  };

  /**
   * Parse lifecycle hook (dipasang:, dilepas:).
   * `dipasang:` / `dilepas:` → block body.
   */
  PromptJSParser.prototype._parseLifecycleStatement = function (kind) {
    const tok = this._advance();
    this._expect(TT.TK_COLON, 'Expected ":" after lifecycle keyword');
    const loc = this._makeLoc(tok);
    const body = this._parseBlock();
    return AST.buatLifecycleStatement(kind, body, loc, null);
  };

  /**
   * Parse `Setelah`/`after` statement — post-completion hook.
   *
   * Sintaks: `Setelah <target> selesai: <body>`
   *          `Setelah <target>: -> <aksi>`
   *          `after <target> completed: <body>`
   *
   * Kata "selesai"/"completed" adalah opsional (dekoratif).
   * Target adalah nama fungsi/operasi yang akan dipanggil,
   * lalu body dieksekusi setelah Promise-nya resolve.
   *
   * @returns {Object} AST node SetelahStatement
   */
  PromptJSParser.prototype._parseSetelahStatement = function () {
    const startTok = this._advance(); // consume Setelah/after

    // Parse target identifier (nama fungsi/operasi)
    const targetTok = this._expect(TT.TK_IDENT, 'Expected target name after "setelah"');
    const target = targetTok ? targetTok.value : '_unknown';

    // Optionally consume decorative word "selesai" (completed) if present as IDENT
    if (
      this._peek() &&
      this._peek().type === TT.TK_IDENT &&
      (this._peek().value === 'selesai' || this._peek().value === 'completed')
    ) {
      this._advance(); // skip decorative word
    }

    const loc = this._makeLoc(startTok);

    // Expect `:` then INDENT block
    this._expect(TT.TK_COLON, 'Expected ":" after setelah target');
    const body = this._parseBlock();

    return AST.buatSetelahStatement(target, loc, null, body, null);
  };
}

module.exports = { install };
