'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Lists (Ulangi)
 * ============================================================================
 *
 * All Ulangi/Loop variants: counted (N kali), iteration (untuk x in src),
 * range (dari A sampai B), plus optional `dengan kunci` and `dengan transisi`.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang list/loop statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * K1b keyed diff: optionally parse a `dengan kunci <expr>` suffix on an
   * iteration loop, right before the trailing `:`.
   *
   * `dengan` / `kunci` are not reserved keywords — they lex as plain IDENT — so
   * we peek for the exact two-identifier sequence and only then consume + parse
   * the key expression. Anything else is left untouched (no false positives).
   * This is the "honest keyword": its presence genuinely switches the emitter to
   * keyed reconciliation; its absence keeps the K1a full-re-render behavior.
   *
   * @returns {Object | null} the parsed key expression, or null if absent
   */
  PromptJSParser.prototype._tryParseDenganKunci = function () {
    const t0 = this._peek();
    const t1 = this._peekAt(1);
    if (
      t0.type === TT.TK_IDENT &&
      t0.value === 'dengan' &&
      t1.type === TT.TK_IDENT &&
      t1.value === 'kunci'
    ) {
      this._advance(); // consume `dengan`
      this._advance(); // consume `kunci`
      return this._parseExpression();
    }
    return null;
  };

  /**
   * K2a list transitions: optionally parse a `dengan transisi <name>` suffix on a
   * keyed iteration loop, right before the trailing `:`.
   *
   * Like `dengan kunci`, the words `dengan` / `transisi` are NOT reserved — they
   * lex as plain IDENT — so we peek for the exact two-identifier sequence and only
   * then consume + read the transition name. Anything else is left untouched (no
   * false positives). This is another "honest keyword": its presence genuinely
   * switches the emitter to FLIP-wrapped reconciliation; its absence keeps the
   * K1b keyed behavior byte-for-byte.
   *
   * The `<name>` is a simple identifier or string literal (a CSS class prefix),
   * NOT a full expression — transition names are static styling hooks, so keeping
   * them literal avoids ambiguity and keeps the emit CSP-safe (no dynamic eval).
   *
   * @returns {string | null} the transition name, or null if absent
   */
  PromptJSParser.prototype._tryParseDenganTransisi = function () {
    const t0 = this._peek();
    const t1 = this._peekAt(1);
    if (
      t0.type === TT.TK_IDENT &&
      t0.value === 'dengan' &&
      t1.type === TT.TK_IDENT &&
      t1.value === 'transisi'
    ) {
      this._advance(); // consume `dengan`
      this._advance(); // consume `transisi`
      const nameTok = this._peek();
      if (nameTok.type === TT.TK_IDENT || nameTok.type === TT.TK_STRING) {
        this._advance();
        return String(nameTok.value);
      }
      // `dengan transisi` with no readable name → default hook name.
      return 'pjs';
    }
    return null;
  };

  /**
   * Parse `Ulangi`/`Loop` statement — tiga varian loop.
   *
   * Varian yang didukung (deteksi dari token setelah `Ulangi`):
   * - Counted: `Ulangi <N> kali:` — `kind: 'kali'`
   * - Iterasi: `Ulangi untuk <x> <sep> <source>:` — `kind: 'dari'`/`'in'` (sep = `dari`/`in`/`from`)
   * - Range: `Ulangi <x> dari <A> sampai <B>:` — `kind: 'rentang'`
   *
   * @returns {Object} AST node UlangiStatement
   */
  PromptJSParser.prototype._parseUlangiStatement = function () {
    const startTok = this._advance(); // consume Ulangi/Loop

    // Counted loop: "Ulangi N kali:" / "Loop N times:" (kind = 'kali').
    if (this._peek().type !== TT.TK_UNTUK) {
      // Range loop without "untuk": "Ulangi i dari 1 sampai 5:"
      // Check if next is IDENT followed by IN (dari/in/from)
      if (
        this._peek().type === TT.TK_IDENT &&
        (this._peekAt(1).type === TT.TK_IN || this._peekAt(1).type === TT.TK_IDENT)
      ) {
        // Could be range loop: "Ulangi i dari 1 sampai 5:"
        // or iteration loop without "untuk": "Ulangi i in items:"
        const iteratorTok = this._advance();
        const iteratorName = iteratorTok.value;

        // Expect separator (in/dari/from)
        if (this._peek().type === TT.TK_IN) {
          this._advance(); // consume in/dari/from
        }

        // Parse source / range-start
        const source = this._parseExpression();

        // Check for range loop: "sampai/until"
        if (this._peek().type === TT.TK_SAMPAI) {
          this._advance(); // consume sampai/until
          const rangeEnd = this._parseExpression();
          this._expect(TT.TK_COLON, 'Expected ":" after range loop');
          const rangeLoc = this._makeLoc(startTok);
          const rangeBody = this._parseBlock();
          return AST.buatUlangiStatement(
            iteratorName,
            source,
            rangeBody,
            'rentang',
            rangeLoc,
            null,
            rangeEnd
          );
        }

        // Regular iteration: "Ulangi i in items:" (optional `dengan kunci <expr>`
        // then optional `dengan transisi <name>` — transitions require a key).
        const iterKeyExpr = this._tryParseDenganKunci();
        const iterTransition = this._tryParseDenganTransisi();
        this._expect(TT.TK_COLON, 'Expected ":" after loop source');
        const iterLoc = this._makeLoc(startTok);
        const iterBody = this._parseBlock();
        return AST.buatUlangiStatement(
          iteratorName,
          source,
          iterBody,
          'dari',
          iterLoc,
          null,
          null,
          iterKeyExpr,
          iterTransition
        );
      }

      // Try counted loop: "Ulangi N kali:"
      const countExpr = this._parseExpression();
      if (countExpr && this._peek().type === TT.TK_KALI) {
        this._advance(); // consume kali/times
        this._expect(TT.TK_COLON, 'Expected ":" after counted loop');
        const countLoc = this._makeLoc(startTok);
        const countBody = this._parseBlock();
        return AST.buatUlangiStatement(null, countExpr, countBody, 'kali', countLoc, null, null);
      }
      // Neither "untuk/for" nor a valid "N kali/times" counted loop.
      this.errors.push({
        code: 'E2010',
        severity: 'error',
        message: 'Expected "untuk/for" after "ulangi/loop"',
        line: startTok.line,
        column: startTok.col,
        suggestion:
          'Syntax: Ulangi untuk item in $collection:  (atau: Ulangi N kali:  atau: Ulangi i dari 1 sampai 10:)',
      });
      return null;
    }
    this._advance(); // consume untuk/for

    // Iterator name
    const iteratorTok = this._expect(TT.TK_IDENT, 'Expected iterator variable name');
    const iteratorName = iteratorTok ? iteratorTok.value : '_';

    // Expect "in"
    if (this._peek().type !== TT.TK_IN) {
      this.errors.push({
        code: 'E2011',
        severity: 'error',
        message: 'Expected "in" after iterator name',
        line: this._peek().line,
        column: this._peek().col,
        suggestion:
          'Syntax: Ulangi untuk item in $collection:  atau  Ulangi untuk i dari 1 sampai 10:',
      });
      return null;
    }
    this._advance(); // consume in

    // Source / range-start expression
    const source = this._parseExpression();

    // [FIX] Range loop: "Ulangi untuk i dari 1 sampai 10:"
    if (this._peek().type === TT.TK_SAMPAI) {
      this._advance(); // consume sampai/until

      const rangeEnd = this._parseExpression();

      this._expect(TT.TK_COLON, 'Expected ":" after range loop');

      const rangeLoc = this._makeLoc(startTok);
      const rangeBody = this._parseBlock();

      return AST.buatUlangiStatement(
        iteratorName,
        source,
        rangeBody,
        'rentang',
        rangeLoc,
        null,
        rangeEnd
      );
    }

    // Optional keyed diff suffix: "... dengan kunci <expr>:" (K1b), then optional
    // transition suffix "... dengan transisi <name>:" (K2a — requires a key).
    const keyExpr = this._tryParseDenganKunci();
    const transitionName = this._tryParseDenganTransisi();

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after loop source');

    const loc = this._makeLoc(startTok);

    // Parse body block
    const body = this._parseBlock();

    return AST.buatUlangiStatement(
      iteratorName,
      source,
      body,
      'dari',
      loc,
      null,
      null,
      keyExpr,
      transitionName
    );
  };
}

module.exports = { install };
