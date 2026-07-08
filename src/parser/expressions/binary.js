'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Expressions: Binary (Precedence Climbing)
 * ============================================================================
 *
 * Binary expression parser using precedence climbing.
 * Handles: ||, &&, ===, !==, >, >=, <, <=, berisi, diawali, diakhiri,
 *          +, -, *, /, %, **
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang binary expression method ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse ekspresi biner dengan precedence climbing.
   *
   * Algoritma: parse operan kiri via `_parseUnaryExpression`, lalu selama
   * current token adalah operator dengan precedence >= `minPrec`, consume
   * operator, parse operan kanan via rekursi `_parseBinaryExpression(prec + 1)`,
   * gabungkan keduanya ke BinaryExpression. Implementasi standard untuk
   * left-associative operators.
   *
   * @param {number} minPrec - Minimum precedence yang akan dikonsumsi (0 = semua)
   * @returns {Object} AST node expression
   */
  PromptJSParser.prototype._parseBinaryExpression = function (minPrec) {
    let left = this._parseUnaryExpression();

    const PRECEDENCE = {
      [TT.TK_OR]: 1,
      [TT.TK_AND]: 2,
      [TT.TK_EQ]: 3,
      [TT.TK_NEQ]: 3,
      [TT.TK_GT]: 4,
      [TT.TK_GTE]: 4,
      [TT.TK_LT]: 4,
      [TT.TK_LTE]: 4,
      // String/collection membership operators — comparison precedence
      [TT.TK_BERISI]: 4,
      [TT.TK_DIAWALI]: 4,
      [TT.TK_DIAKHIRI]: 4,
      [TT.TK_PLUS]: 5,
      [TT.TK_MINUS]: 5,
      [TT.TK_STAR]: 6,
      [TT.TK_SLASH]: 6,
      [TT.TK_MOD]: 6,
      [TT.TK_POW]: 7,
    };

    while (true) {
      const opTok = this._peek();
      const prec = PRECEDENCE[opTok.type];
      if (!prec || prec < minPrec) break;

      this._advance(); // consume operator
      // `**` is right-associative; everything else is left-associative.
      const nextMin = opTok.type === TT.TK_POW ? prec : prec + 1;
      const right = this._parseBinaryExpression(nextMin);

      // Map operator token to JS operator string
      const opMap = {
        [TT.TK_PLUS]: '+',
        [TT.TK_MINUS]: '-',
        [TT.TK_STAR]: '*',
        [TT.TK_SLASH]: '/',
        [TT.TK_MOD]: '%',
        [TT.TK_POW]: '**',
        [TT.TK_GT]: '>',
        [TT.TK_GTE]: '>=',
        [TT.TK_LT]: '<',
        [TT.TK_LTE]: '<=',
        [TT.TK_EQ]: '===',
        [TT.TK_NEQ]: '!==',
        [TT.TK_AND]: '&&',
        [TT.TK_OR]: '||',
        // String/collection membership — kept as named operators; lowered to
        // method calls (.includes/.startsWith/.endsWith) in expression lowering.
        [TT.TK_BERISI]: 'berisi',
        [TT.TK_DIAWALI]: 'diawali',
        [TT.TK_DIAKHIRI]: 'diakhiri',
      };
      const opStr = opMap[opTok.type] || opTok.value;

      left = AST.buatBinaryExpression(opStr, left, right, this._makeLoc(opTok));
    }

    return left;
  };
}

module.exports = { install };
