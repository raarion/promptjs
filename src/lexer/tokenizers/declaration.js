// @ts-check

/**
 * Declaration tokenizer — handles `Data`, `Tetap`, `Ubah`, `Fungsi`, `Saat`, `Kembalikan` lines.
 *
 * @module lexer/tokenizers/declaration
 */

'use strict';

/** @typedef {import('../core/state.js').PromptJSLexer} PromptJSLexer */

const tokenMod = require('../core/token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const KEYWORDS = require('../maps/keywords');

/**
 * Tokenize baris deklarasi.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris (mis. `Data harga = 1000`)
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 * @param {string} keyword - Keyword yang cocok (mis. 'Data', 'Tetap')
 */
function tokenizeDeclaration(lexer, content, lineNum, baseCol, keyword) {
  const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_IDENT;
  lexer.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

  const kwLower = keyword.toLowerCase();
  const afterKeyword = content.substring(keyword.length);
  const afterTrim = afterKeyword.trim();
  if (!afterTrim) return;

  const afterStart = afterKeyword.indexOf(afterTrim);
  const afterCol = baseCol + keyword.length + afterStart + 1;

  // ─── Fungsi / Komponen / Definisikan: parse signature ────────────────
  if (
    kwLower === 'fungsi' ||
    kwLower === 'func' ||
    kwLower === 'function' ||
    kwLower === 'komponen' ||
    kwLower === 'component' ||
    kwLower === 'definisikan' ||
    kwLower === 'define'
  ) {
    const sigMatch = afterTrim.match(/^([A-Za-z_]\w*)\s*\(/);
    if (sigMatch) {
      const name = sigMatch[1];
      const nameCol = afterCol;
      lexer.tokens.push(new Token(TT.TK_IDENT, name, lineNum, nameCol));

      const paramStart = sigMatch[0].length - 1;
      const rest = afterTrim.substring(paramStart);
      lexer._tokenizeExpression(rest, lineNum, afterCol + paramStart);
      return;
    }
    lexer._tokenizeExpression(afterTrim, lineNum, afterCol);
    return;
  }

  // ─── Data/Tetap/Ubah/Turunan: parse nama lalu sisa ──────────────────
  if (
    kwLower === 'data' ||
    kwLower === 'state' ||
    kwLower === 'tetap' ||
    kwLower === 'const' ||
    kwLower === 'ubah' ||
    kwLower === 'let' ||
    kwLower === 'turunan' ||
    kwLower === 'derived'
  ) {
    const nameMatch = afterTrim.match(/^([A-Za-z_]\w*)/);
    if (nameMatch) {
      const vname = nameMatch[1];
      lexer.tokens.push(new Token(TT.TK_IDENT, vname, lineNum, afterCol));

      const restStart = nameMatch[0].length;
      const vrest = afterTrim.substring(restStart).trim();
      if (vrest) {
        const restAbsStart = afterTrim.indexOf(vrest, restStart);
        const restCol = afterCol + restAbsStart;

        if (vrest.startsWith('=')) {
          lexer.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, restCol + 1));
          const exprPart = vrest.substring(1).trim();
          if (exprPart) {
            lexer._tokenizeExpression(
              exprPart,
              lineNum,
              restCol + 1 + (vrest.length - 1 - vrest.indexOf(exprPart))
            );
          }
        } else if (vrest.startsWith(':')) {
          lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, restCol + 1));
          const afterColon = vrest.substring(1).trim();
          // BUG-05 FIX: Skip '=' that is part of '=>' or inside parentheses
          let eqIdx = -1;
          let parenDepth = 0;
          for (let ei = 0; ei < afterColon.length; ei++) {
            const c = afterColon[ei];
            if (c === '(') parenDepth++;
            else if (c === ')') parenDepth--;
            else if (c === '=' && parenDepth === 0) {
              if (ei + 1 < afterColon.length && afterColon[ei + 1] === '>') {
                continue;
              }
              eqIdx = ei;
              break;
            }
          }
          if (eqIdx >= 0) {
            const typeHint = afterColon.substring(0, eqIdx).trim();
            const initPart = afterColon.substring(eqIdx + 1).trim();
            if (typeHint) {
              lexer.tokens.push(new Token(TT.TK_IDENT, typeHint, lineNum, restCol + 2));
            }
            lexer.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, restCol + 2 + eqIdx));
            if (initPart) {
              lexer._tokenizeExpression(initPart, lineNum, restCol + 2 + eqIdx + 1);
            }
          } else if (afterColon) {
            const isExprLike = /[()=><+\-*/%,!&|]/.test(afterColon);
            if (isExprLike) {
              lexer._tokenizeExpression(afterColon, lineNum, restCol + 2);
            } else {
              lexer.tokens.push(new Token(TT.TK_IDENT, afterColon, lineNum, restCol + 2));
            }
          }
        }
      }
      return;
    }
    lexer._tokenizeExpression(afterTrim, lineNum, afterCol);
    return;
  }

  // ─── Saat/When ───────────────────────────────────────────────────────
  if (kwLower === 'saat' || kwLower === 'when') {
    const targetMatch = afterTrim.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)/);
    if (targetMatch) {
      const target = targetMatch[1];
      const parts = target.split('.');
      let partCol = afterCol;
      for (let pi = 0; pi < parts.length; pi++) {
        if (pi > 0) {
          lexer.tokens.push(new Token(TT.TK_DOT, '.', lineNum, partCol));
          partCol += 1;
        }
        lexer.tokens.push(new Token(TT.TK_IDENT, parts[pi], lineNum, partCol));
        partCol += parts[pi].length;
      }
      const srest = afterTrim.substring(targetMatch[0].length).trim();
      if (srest) {
        const srestAbsStart = afterTrim.indexOf(srest, targetMatch[0].length);
        lexer._tokenizeExpression(srest, lineNum, afterCol + srestAbsStart);
      }
      return;
    }
    lexer._tokenizeExpression(afterTrim, lineNum, afterCol);
    return;
  }

  // Fallback default (Kembalikan/Return dan lainnya)
  lexer._tokenizeExpression(afterTrim, lineNum, afterCol);
}

module.exports = { tokenizeDeclaration: tokenizeDeclaration };
