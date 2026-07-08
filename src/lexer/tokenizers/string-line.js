// @ts-check

/**
 * String line tokenizer — tokenizes lines that are string literals.
 *
 * @module lexer/tokenizers/string-line
 */

'use strict';

const tokenMod = require('../core/token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const createError = tokenMod.createError;

/**
 * Tokenize baris yang berisi hanya string literal (children text).
 *
 * Format: `"text"` atau `'text'`. Jika quote penutup tidak ditemukan,
 * emit error `E1003` (string tidak tertutup) tapi tetap emit token string.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris dimulai dengan quote
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 */
function tokenizeStringLine(lexer, content, lineNum, baseCol) {
  const quote = content[0];

  // F-3 fix: find the FIRST unescaped closing quote, not just at end of line.
  // This enables patterns like: "text " + $var or "label: " + expr
  let closeIdx = -1;
  for (let i = 1; i < content.length; i++) {
    if (content[i] === '\\' && i + 1 < content.length) {
      i++; // skip escaped character
      continue;
    }
    if (content[i] === quote) {
      closeIdx = i;
      break;
    }
  }

  if (closeIdx >= 0) {
    // String ditemukan — emit sebagai TK_STRING
    const text = content.substring(1, closeIdx);
    lexer.tokens.push(new Token(TT.TK_STRING, text, lineNum, baseCol + 1, content));

    // Jika ada sisa setelah string (mis. " + expr), tokenize sebagai expression
    const remainder = content.substring(closeIdx + 1).trim();
    if (remainder) {
      // Q-1 fix: also handle CSS single-quote font-family values
      // If remainder starts with comma (CSS context), skip it
      lexer._tokenizeExpression(remainder, lineNum, baseCol + closeIdx + 1);
    }
  } else {
    // Unterminated string — no closing quote found anywhere on line
    const textUterm = content.substring(1);
    lexer.tokens.push(new Token(TT.TK_STRING, textUterm, lineNum, baseCol + 1, content));
    lexer.errors.push(
      createError(
        'E1004',
        'String tidak tertutup di baris ' + lineNum,
        lineNum,
        baseCol + 1,
        'Pastikan string diakhiri dengan ' + quote + '.'
      )
    );
  }
}

module.exports = { tokenizeStringLine: tokenizeStringLine };
