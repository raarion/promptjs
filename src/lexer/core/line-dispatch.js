// @ts-check

/**
 * Line dispatch — classifies a line by its prefix and routes to the appropriate tokenizer.
 *
 * @module lexer/core/line-dispatch
 */

'use strict';

/** @typedef {import('./state.js').PromptJSLexer} PromptJSLexer */

const tokenMod = require('./token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const KEYWORDS = require('../maps/keywords');

/**
 * Klasifikasi dan tokenize satu baris content (setelah indent di-strip).
 *
 * Urusan dispatch berdasarkan prefix baris:
 * 1. Komentar (`--` / `//`) → skip.
 * 2. String literal (`"..."` / `'...'`) → _tokenizeStringLine.
 * 3. Event handler (`on_x = ...`) → _tokenizeEventLine.
 * 4. External ref (`$name.path`) → _tokenizeExternalRefLine.
 * 5. Block opener → _tokenizeBlockOpener.
 * 6. Control flow → _tokenizeControlFlow.
 * 7. Declaration → _tokenizeDeclaration.
 * 8. `pass` / `lewati` → emit TK_PASS.
 * 9. Property line (`key = value`) → _tokenizePropertyLine.
 * 10. Fallback → _tokenizeExpression.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris (tanpa indent)
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content (offset dari indent)
 */
function tokenizeLine(lexer, content, lineNum, baseCol) {
  const trimmed = content.trim();

  // 1. Comment lines
  if (trimmed.startsWith('--') || trimmed.startsWith('//')) {
    return;
  }

  // 2. String-only lines: "text content"
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    lexer._tokenizeStringLine(trimmed, lineNum, baseCol);
    return;
  }

  // 3. on_event = expr lines
  if (/^on[_\w]+(?:\.[a-zA-Z]+)*\s*=/.test(trimmed)) {
    lexer._tokenizeEventLine(trimmed, lineNum, baseCol);
    return;
  }

  // 4. $external.ref lines
  if (/^\$\w/.test(trimmed)) {
    lexer._tokenizeExternalRefLine(trimmed, lineNum, baseCol);
    return;
  }

  // 5. Block openers
  const blockMatch = trimmed.match(
    /^(Buat|buat|Create|create|Definisikan|definisikan|Define|define|Halaman|halaman|Page|page|Komponen|komponen|Component|component)\b/
  );
  if (blockMatch) {
    lexer._tokenizeBlockOpener(trimmed, lineNum, baseCol, blockMatch[1]);
    return;
  }

  // 6. Control flow
  const ctrlMatch = trimmed.match(
    /^(Jika|jika|If|if|Lainnya|lainnya|Else|else|Ulangi|ulangi|Loop|loop)\b/
  );
  if (ctrlMatch) {
    lexer._tokenizeControlFlow(trimmed, lineNum, baseCol, ctrlMatch[1]);
    return;
  }

  // 7. Data declarations
  const declMatch = trimmed.match(
    /^(Data|data|State|state|Tetap|tetap|Const|const|Ubah|ubah|Let|let|Turunan|turunan|Derived|derived|Fungsi|fungsi|Func|func|Function|function|Saat|saat|When|when|Kembalikan|kembalikan|Return|return)\b/
  );
  if (declMatch) {
    lexer._tokenizeDeclaration(trimmed, lineNum, baseCol, declMatch[1]);
    return;
  }

  // 8. pass/Lewati/Skip
  if (/^(pass|lewati|Lewati|skip|Skip)$/.test(trimmed)) {
    lexer.tokens.push(new Token(TT.TK_PASS, trimmed, lineNum, baseCol + 1));
    return;
  }

  // 9. Property lines: key = value
  if (/^\w[\w-]*\s*=/.test(trimmed)) {
    lexer._tokenizePropertyLine(trimmed, lineNum, baseCol);
    return;
  }

  // 10. Expression / fallback
  lexer._tokenizeExpression(trimmed, lineNum, baseCol);
}

/**
 * Tokenize baris event handler `on_nama_event = ekspresi`.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris `on_x = expr`
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 */
function tokenizeEventLine(lexer, content, lineNum, baseCol) {
  const eqIdx = content.indexOf('=');
  const eventName = content.substring(0, eqIdx).trim();
  const expr = content.substring(eqIdx + 1).trim();

  lexer.tokens.push(new Token(TT.TK_ON_EVENT, eventName, lineNum, baseCol + 1));
  lexer.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));
  lexer._tokenizeExpression(expr, lineNum, baseCol + eqIdx + 2);
}

/**
 * Tokenize baris yang berisi external reference `$nama.path`.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 */
function tokenizeExternalRefLine(lexer, content, lineNum, baseCol) {
  const eqIdx = content.indexOf('=');
  if (eqIdx > 0) {
    const key = content.substring(0, eqIdx).trim();
    const val = content.substring(eqIdx + 1).trim();
    lexer.tokens.push(new Token(TT.TK_IDENT, key, lineNum, baseCol + 1));
    lexer.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));
    lexer._tokenizeExpression(val, lineNum, baseCol + eqIdx + 2);
  } else {
    lexer._tokenizeExpression(content, lineNum, baseCol);
  }
}

/**
 * Tokenize baris control flow (`Jika`/`If`, `Lainnya`/`Else`, `Ulangi`/`Loop`).
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 * @param {string} keyword - Keyword yang cocok
 */
function tokenizeControlFlow(lexer, content, lineNum, baseCol, keyword) {
  const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_IDENT;
  lexer.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

  const afterKeyword = content.substring(keyword.length).trim();

  if (keyword.toLowerCase() === 'lainnya' || keyword.toLowerCase() === 'else') {
    if (afterKeyword.trim() === ':' || afterKeyword.trim() === '') {
      if (afterKeyword.trim() === ':') {
        lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + content.length));
      }
      return;
    }
  }

  if (afterKeyword.endsWith(':')) {
    let condition = afterKeyword.substring(0, afterKeyword.length - 1).trim();
    // Counted loop: the trailing `kali`/`times` is the loop suffix
    const isLoop = keyword.toLowerCase() === 'ulangi' || keyword.toLowerCase() === 'loop';
    let countSuffix = null;
    if (isLoop) {
      const suffixMatch = condition.match(/\s+(kali|times)$/i);
      if (suffixMatch) {
        countSuffix = suffixMatch[1];
        condition = condition.substring(0, condition.length - suffixMatch[0].length).trim();
      }
    }
    if (condition) {
      lexer._tokenizeExpression(condition, lineNum, baseCol + keyword.length + 1);
    }
    if (countSuffix) {
      lexer.tokens.push(
        new Token(TT.TK_KALI, countSuffix, lineNum, baseCol + content.lastIndexOf(countSuffix) + 1)
      );
    }
    lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + content.indexOf(':') + 1));
  } else {
    if (afterKeyword) {
      lexer._tokenizeExpression(afterKeyword, lineNum, baseCol + keyword.length + 1);
    }
  }
}

/**
 * Tokenize baris property `key = value`.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 */
function tokenizePropertyLine(lexer, content, lineNum, baseCol) {
  const eqIdx = content.indexOf('=');
  const key = content.substring(0, eqIdx).trim();
  const value = content.substring(eqIdx + 1).trim();

  lexer.tokens.push(new Token(TT.TK_IDENT, key, lineNum, baseCol + 1));
  lexer.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));
  lexer._tokenizeExpression(value, lineNum, baseCol + eqIdx + 2);
}

module.exports = {
  tokenizeLine: tokenizeLine,
  tokenizeEventLine: tokenizeEventLine,
  tokenizeExternalRefLine: tokenizeExternalRefLine,
  tokenizeControlFlow: tokenizeControlFlow,
  tokenizePropertyLine: tokenizePropertyLine,
};
