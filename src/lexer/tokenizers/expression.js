// @ts-check

/**
 * Expression tokenizer — handles complex inline expressions.
 *
 * @module lexer/tokenizers/expression
 */

'use strict';

/** @typedef {import('../core/state.js').PromptJSLexer} PromptJSLexer */

const tokenMod = require('../core/token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const createError = tokenMod.createError;
const KEYWORDS = require('../maps/keywords');
const WORD_OPERATORS = require('../maps/operators');

/**
 * Tokenize ekspresi kompleks.
 *
 * Mendukung:
 * - Literal: angka, string, boolean, null
 * - Identifier dan external ref `$name.path`
 * - Operator: aritmetika, pembanding, logika, kata (word operators)
 * - Ternary `? :` (right-associative)
 * - Member access `.prop` dan `[index]`
 * - Call `(...)` (dengan koma separator)
 * - Object literal `{ k: v, ... }`, Array literal `[a, b, c]`
 * - Grup `(expr)`, Native call `::name(...)`
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} expr - String ekspresi
 * @param {number} lineNum - Nomor baris ekspresi
 * @param {number} baseCol - Kolom awal ekspresi
 */
function tokenizeExpression(lexer, expr, lineNum, baseCol) {
  if (!expr || expr.trim() === '') return;
  expr = expr.trim();

  let pos = 0;
  const len = expr.length;

  while (pos < len) {
    const ch = expr[pos];

    // Whitespace
    if (ch === ' ' || ch === '\t') {
      pos++;
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      pos++; // skip opening quote
      while (pos < len && expr[pos] !== quote) {
        if (expr[pos] === '\\' && pos + 1 < len) {
          str += expr[pos + 1];
          pos += 2;
        } else {
          str += expr[pos];
          pos++;
        }
      }
      if (pos < len) pos++; // skip closing quote
      lexer.tokens.push(new Token(TT.TK_STRING, str, lineNum, baseCol + pos - str.length - 2));
      continue;
    }

    // Number literal
    if (
      (ch >= '0' && ch <= '9') ||
      (ch === '-' && pos + 1 < len && expr[pos + 1] >= '0' && expr[pos + 1] <= '9')
    ) {
      let num = '';
      const numStartCol = baseCol + pos;
      if (ch === '-') {
        num += '-';
        pos++;
      }
      let dotCount = 0;
      while (pos < len && ((expr[pos] >= '0' && expr[pos] <= '9') || expr[pos] === '.')) {
        if (expr[pos] === '.') dotCount++;
        num += expr[pos];
        pos++;
      }
      // Validate numeric literal: at most one decimal point, must not be a
      // lone/trailing dot. Malformed literals (e.g. "1.2.3", "1.", ".") were
      // previously accepted silently with the trailing part dropped (BUG-L1).
      const digits = num.replace('-', '');
      const isMalformed = dotCount > 1 || digits === '.' || digits === '' || digits.endsWith('.');
      if (isMalformed) {
        lexer.errors.push(
          createError(
            'E1008',
            'Angka literal tidak valid di baris ' + lineNum + ': "' + num + '"',
            lineNum,
            numStartCol + 1,
            'Gunakan format angka yang valid (mis. 42, 3.14, -7). Hanya satu titik desimal yang diizinkan.'
          )
        );
      }
      lexer.tokens.push(new Token(TT.TK_NUMBER, parseFloat(num), lineNum, numStartCol + 1));
      continue;
    }

    // External reference: $name.path
    if (ch === '$') {
      let ref = '$';
      pos++;
      while (
        pos < len &&
        (expr[pos] === '_' ||
          expr[pos] === '.' ||
          (expr[pos] >= 'a' && expr[pos] <= 'z') ||
          (expr[pos] >= 'A' && expr[pos] <= 'Z') ||
          (expr[pos] >= '0' && expr[pos] <= '9'))
      ) {
        ref += expr[pos];
        pos++;
      }
      lexer.tokens.push(new Token(TT.TK_EXT_REF, ref, lineNum, baseCol + pos - ref.length + 1));
      continue;
    }

    // Multi-char operators
    if (pos + 2 < len) {
      const triple = expr.substring(pos, pos + 3);
      if (triple === '===' || triple === '!==' || triple === '...') {
        const ttype = triple === '===' ? TT.TK_EQ : triple === '!==' ? TT.TK_NEQ : TT.TK_IDENT;
        lexer.tokens.push(new Token(ttype, triple, lineNum, baseCol + pos + 1));
        pos += 3;
        continue;
      }
    }
    if (pos + 1 < len) {
      const pair = expr.substring(pos, pos + 2);
      if (
        pair === '>=' ||
        pair === '<=' ||
        pair === '&&' ||
        pair === '||' ||
        pair === '=>' ||
        pair === '**'
      ) {
        let ttype2;
        switch (pair) {
          case '>=':
            ttype2 = TT.TK_GTE;
            break;
          case '<=':
            ttype2 = TT.TK_LTE;
            break;
          case '&&':
            ttype2 = TT.TK_AND;
            break;
          case '||':
            ttype2 = TT.TK_OR;
            break;
          case '=>':
            ttype2 = TT.TK_ARROW;
            break;
          case '**':
            ttype2 = TT.TK_POW;
            break;
        }
        lexer.tokens.push(new Token(ttype2, pair, lineNum, baseCol + pos + 1));
        pos += 2;
        continue;
      }
    }

    // Single-char operators & symbols
    switch (ch) {
      case '=':
        lexer.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '>':
        lexer.tokens.push(new Token(TT.TK_GT, '>', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '<':
        lexer.tokens.push(new Token(TT.TK_LT, '<', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '+':
        lexer.tokens.push(new Token(TT.TK_PLUS, '+', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '-':
        lexer.tokens.push(new Token(TT.TK_MINUS, '-', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '*':
        lexer.tokens.push(new Token(TT.TK_STAR, '*', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '/':
        lexer.tokens.push(new Token(TT.TK_SLASH, '/', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '%':
        lexer.tokens.push(new Token(TT.TK_MOD, '%', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '!':
        lexer.tokens.push(new Token(TT.TK_NOT, '!', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '.':
        lexer.tokens.push(new Token(TT.TK_DOT, '.', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '#':
        lexer.tokens.push(new Token(TT.TK_HASH, '#', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case ':':
        lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '?':
        lexer.tokens.push(new Token(TT.TK_QUESTION, '?', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case ',':
        lexer.tokens.push(new Token(TT.TK_COMMA, ',', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '(':
        lexer.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case ')':
        lexer.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '[':
        lexer.tokens.push(new Token(TT.TK_LBRACKET, '[', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case ']':
        lexer.tokens.push(new Token(TT.TK_RBRACKET, ']', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '{':
        lexer.tokens.push(new Token(TT.TK_LBRACE, '{', lineNum, baseCol + pos + 1));
        pos++;
        continue;
      case '}':
        lexer.tokens.push(new Token(TT.TK_RBRACE, '}', lineNum, baseCol + pos + 1));
        pos++;
        continue;
    }

    // Word operators (dan, atau, lebih dari, kali, pangkat, ...)
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      const rest = expr.slice(pos);
      let wop = null;
      for (let wi = 0; wi < WORD_OPERATORS.length; wi++) {
        const m = WORD_OPERATORS[wi].re.exec(rest);
        if (m) {
          wop = { op: WORD_OPERATORS[wi], len: m[0].length };
          break;
        }
      }
      if (wop) {
        lexer.tokens.push(new Token(wop.op.type, wop.op.symbol, lineNum, baseCol + pos + 1));
        pos += wop.len;
        continue;
      }
    }

    // Identifier or keyword
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let ident = '';
      while (
        pos < len &&
        (expr[pos] === '_' ||
          (expr[pos] >= 'a' && expr[pos] <= 'z') ||
          (expr[pos] >= 'A' && expr[pos] <= 'Z') ||
          (expr[pos] >= '0' && expr[pos] <= '9'))
      ) {
        ident += expr[pos];
        pos++;
      }

      // Check if it's a keyword
      const kwType = KEYWORDS[ident.toLowerCase()];
      if (kwType) {
        lexer.tokens.push(new Token(kwType, ident, lineNum, baseCol + pos - ident.length + 1));
      } else {
        lexer.tokens.push(new Token(TT.TK_IDENT, ident, lineNum, baseCol + pos - ident.length + 1));
      }
      continue;
    }

    // Unknown character
    lexer.errors.push(
      createError(
        'E1005',
        'Karakter tidak dikenali di baris ' + lineNum + ": '" + ch + "'",
        lineNum,
        baseCol + pos + 1,
        "Hapus atau ganti karakter '" + ch + "'."
      )
    );
    pos++;
  }
}

module.exports = { tokenizeExpression: tokenizeExpression };
