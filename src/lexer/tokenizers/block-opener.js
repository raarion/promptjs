// @ts-check

/**
 * Block opener tokenizer — handles `Buat`, `Halaman`, `Komponen`, `Definisikan` lines.
 *
 * @module lexer/tokenizers/block-opener
 */

'use strict';

const tokenMod = require('../core/token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const createError = tokenMod.createError;
const KEYWORDS = require('../maps/keywords');

// Keywords that ARE the element name (not just a prefix like Buat)
const SELF_NAMED_KEYWORDS = new Set(['halaman', 'page']);

/**
 * Tokenize baris pembuka blok (`Buat`/`Create`/`Halaman`/`Page`/`Komponen`/`Component`/`Definisikan`/`Define`).
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} content - Isi baris (mis. `Buat h1: "text"`)
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal content
 * @param {string} keyword - Keyword yang cocok (mis. 'Buat', 'Halaman')
 */
function tokenizeBlockOpener(lexer, content, lineNum, baseCol, keyword) {
  const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_BUAT;
  lexer.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

  // For self-named keywords like Halaman/Page, the keyword itself is the tag name.
  const kwLower = keyword.toLowerCase();
  const isSelfNamed = SELF_NAMED_KEYWORDS.has(kwLower);

  let afterKeyword;
  if (isSelfNamed) {
    // === Self-named block opener: pages (and the component synonym) ===
    const selectorTag = kwLower;
    let rest = content.substring(keyword.length).trim();
    if (rest.toLowerCase().startsWith(selectorTag)) {
      rest = rest.substring(selectorTag.length).trim();
    }
    let namePart = rest;
    const restColon = rest.indexOf(':');
    if (restColon >= 0) namePart = rest.slice(0, restColon);
    namePart = namePart.trim();
    const pageId = namePart ? namePart.replace(/^#/, '').toLowerCase() : null;

    lexer.tokens.push(
      new Token(TT.TK_IDENT, selectorTag, lineNum, baseCol + keyword.length + 1, {
        type: 'Selector',
        tag: selectorTag,
        classes: [],
        id: pageId,
      })
    );

    const sColon = content.indexOf(':', keyword.length);
    if (sColon >= 0) {
      lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + sColon + 1));
      const inlineContent1 = content.substring(sColon + 1).trim();
      if (inlineContent1) {
        lexer._tokenizeExpression(inlineContent1, lineNum, baseCol + sColon + 2);
      }
    } else {
      lexer.errors.push(
        createError(
          'E1010',
          'Block opener tanpa colon di baris ' + lineNum + ': "' + content + '"',
          lineNum,
          baseCol + 1,
          'Tambahkan : di akhir baris untuk membuka blok. Contoh: Halaman Beranda:'
        )
      );
    }
    return;
  } else {
    afterKeyword = content.substring(keyword.length).trim();
  }

  // === Component declaration: "Komponen Name(p1, p2):" / "Definisikan Name(p1):" ===
  if (kwToken === TT.TK_DEFINSIKAN) {
    const declNameMatch = afterKeyword.match(/^([A-Za-z_]\w*)/);
    const declName = declNameMatch ? declNameMatch[1] : '';
    const nameCol = baseCol + keyword.length + 2;
    lexer.tokens.push(new Token(TT.TK_IDENT, declName, lineNum, nameCol));
    const declRest = afterKeyword.substring(declName.length).trim();
    if (declRest.startsWith('(')) {
      const closeIdx = declRest.indexOf(')');
      const paramStr = closeIdx >= 0 ? declRest.substring(1, closeIdx) : declRest.substring(1);
      const parenCol = nameCol + declName.length;
      lexer.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, parenCol));
      if (paramStr.trim()) {
        lexer._tokenizeExpression(paramStr, lineNum, parenCol + 1);
      }
      lexer.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, parenCol + paramStr.length + 1));
    }
    const declColon = content.indexOf(':', keyword.length);
    if (declColon >= 0) {
      lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + declColon + 1));
    } else {
      lexer.errors.push(
        createError(
          'E1010',
          'Block opener tanpa colon di baris ' + lineNum + ': "' + content + '"',
          lineNum,
          baseCol + 1,
          'Tambahkan : di akhir baris. Contoh: Komponen Kartu(judul):'
        )
      );
    }
    return;
  }

  // === Component invocation: "Buat Name(arg: val, ...)" (no colon, no body) ===
  // v132 stabilization (P0.6): accept an OPTIONAL trailing `:` after closing `)`.
  if (kwToken === TT.TK_BUAT) {
    const invMatch = afterKeyword.match(/^([A-Za-z_]\w*)\s*\((.*)\)(\s*:)?\s*$/);
    if (invMatch) {
      const invName = invMatch[1];
      const invArgs = invMatch[2];
      const hasTrailingColon = !!invMatch[3];
      const invNameCol = baseCol + keyword.length + 2;
      lexer.tokens.push(
        new Token(TT.TK_IDENT, invName, lineNum, invNameCol, {
          type: 'Selector',
          tag: invName,
          classes: [],
          id: null,
        })
      );
      const invParenCol = invNameCol + invName.length;
      lexer.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, invParenCol));
      if (invArgs.trim()) {
        lexer._tokenizeExpression(invArgs, lineNum, invParenCol + 1);
      }
      const invRparenCol = invParenCol + invArgs.length + 1;
      lexer.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, invRparenCol));
      if (hasTrailingColon) {
        const colonOffset = content.lastIndexOf(':');
        lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + colonOffset + 1));
      }
      return;
    }
  }

  // Find the first colon that is NOT inside a string literal
  let colonIdx = -1;
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < afterKeyword.length; i++) {
    const ch = afterKeyword[i];
    if (inString) {
      if (ch === stringChar && afterKeyword[i - 1] !== '\\') {
        inString = false;
      }
    } else {
      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
      } else if (ch === ':') {
        colonIdx = i;
        break;
      }
    }
  }

  if (colonIdx >= 0) {
    const selector = afterKeyword.substring(0, colonIdx).trim();
    const inlineContent2 = afterKeyword.substring(colonIdx + 1).trim();

    if (selector) {
      lexer._tokenizeSelector(selector, lineNum, baseCol + keyword.length + 1);
    }
    const contentColonIdx = content.indexOf(':', keyword.length);
    lexer.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + contentColonIdx + 1));

    if (inlineContent2) {
      lexer._tokenizeExpression(inlineContent2, lineNum, baseCol + contentColonIdx + 2);
    }
  } else if (afterKeyword) {
    lexer._tokenizeSelector(afterKeyword, lineNum, baseCol + keyword.length + 1);
    lexer.errors.push(
      createError(
        'E1010',
        'Block opener tanpa colon di baris ' + lineNum + ': "' + content + '"',
        lineNum,
        baseCol + 1,
        'Tambahkan : di akhir baris untuk membuka blok. Contoh: Buat card:'
      )
    );
  }
}

module.exports = { tokenizeBlockOpener: tokenizeBlockOpener };
