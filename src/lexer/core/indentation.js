// @ts-check

/**
 * Indentation engine — measures indent levels and emits INDENT/DEDENT tokens.
 *
 * @module lexer/core/indentation
 */

'use strict';

const tokenMod = require('./token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const createError = tokenMod.createError;

/**
 * Mengukur level indentasi baris (dalam spasi).
 *
 * PromptJS memakai 2 spasi per level. Karakter TAB dilarang; indentasi
 * ganjil (bukan kelipatan 2) juga dilarang.
 *
 * @param {string} line - Baris source code
 * @returns {number} Jumlah spasi indentasi (0, 2, 4, ...), atau `-1` jika error (TAB atau ganjil)
 */
function measureIndent(line) {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === ' ') {
      count++;
    } else if (ch === '\t') {
      return -2; // Tab detected — distinct error (E1002)
    } else {
      break;
    }
  }
  if (count % 2 !== 0) return -1; // Odd indent (E1001)
  return count;
}

/**
 * Emit token INDENT/DEDENT berdasarkan perubahan level indentasi.
 *
 * @param {PromptJSLexer} lexer - Lexer instance (needs tokens, errors, indentStack)
 * @param {number} indent - Level indentasi baris saat ini
 * @param {number} lineNum - Nomor baris
 */
function emitIndentDedent(lexer, indent, lineNum) {
  const current = lexer.indentStack[lexer.indentStack.length - 1];
  if (indent > current) {
    lexer.indentStack.push(indent);
    lexer.tokens.push(new Token(TT.TK_INDENT, '', lineNum, 1));
  } else if (indent < current) {
    while (
      lexer.indentStack.length > 1 &&
      lexer.indentStack[lexer.indentStack.length - 1] > indent
    ) {
      lexer.indentStack.pop();
      lexer.tokens.push(new Token(TT.TK_DEDENT, '', lineNum, 1));
    }
    if (lexer.indentStack[lexer.indentStack.length - 1] !== indent) {
      lexer.errors.push(
        createError(
          'E1003',
          'Indentasi tidak konsisten di baris ' +
            lineNum +
            ': expected ' +
            lexer.indentStack[lexer.indentStack.length - 1] +
            ', got ' +
            indent,
          lineNum,
          1,
          'Pastikan setiap blok menggunakan indentasi yang konsisten (kelipatan 2 spasi).'
        )
      );
    }
  }
}

module.exports = { measureIndent: measureIndent, emitIndentDedent: emitIndentDedent };
