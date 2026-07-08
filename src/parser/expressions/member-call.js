'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Expressions: Unary & Postfix (Member/Call)
 * ============================================================================
 *
 * Unary expression parser (prefix !, -, tidak) and postfix expression parser
 * (.member access, (args) function calls).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang unary + postfix expression methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse ekspresi uner — operator prefix (`-`, `!`, `tidak`/`not`) diikuti operan.
   *
   * @returns {Object} AST node UnaryExpression atau expression dari `_parsePostfixExpression`
   */
  PromptJSParser.prototype._parseUnaryExpression = function () {
    if (this._peek().type === TT.TK_NOT) {
      const opTok = this._advance();
      const operand = this._parseUnaryExpression();
      return AST.buatUnaryExpression('!', operand, this._makeLoc(opTok), true);
    }
    if (this._peek().type === TT.TK_MINUS) {
      const opTok = this._advance();
      const operand = this._parseUnaryExpression();
      return AST.buatUnaryExpression('-', operand, this._makeLoc(opTok), true);
    }
    return this._parsePostfixExpression();
  };

  /**
   * Parse ekspresi postfix — operan diikuti optional `.prop`, `[index]`, atau `(args)`.
   *
   * Bangun MemberExpression / CallExpression berantai (mis. `a.b.c[0](x, y)`).
   *
   * @returns {Object} AST node expression (MemberExpression / CallExpression / primary)
   */
  PromptJSParser.prototype._parsePostfixExpression = function () {
    let expr = this._parsePrimaryExpression();

    while (true) {
      if (this._peek().type === TT.TK_DOT) {
        this._advance(); // consume DOT
        const propTok = this._expect(TT.TK_IDENT, 'Expected property name after "."');
        if (propTok) {
          expr = AST.buatMemberExpression(expr, AST.buatIdentifier(propTok.value, null), null);
        }
      } else if (this._peek().type === TT.TK_LPAREN) {
        // Function call
        this._advance(); // consume (
        const args = [];
        while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
          args.push(this._parseExpression());
          if (!this._match(TT.TK_COMMA)) break;
        }
        this._expect(TT.TK_RPAREN, 'Expected ")"');
        expr = AST.buatCallExpression(expr, args, null);
      } else {
        break;
      }
    }

    return expr;
  };
}

module.exports = { install };
