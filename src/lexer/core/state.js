// @ts-check

/**
 * Lexer state — PromptJSLexer constructor and main `tokenize()` method.
 *
 * @module lexer/core/state
 */

'use strict';

/** @typedef {import('./types.js').TokenizeResult} TokenizeResult */

const tokenMod = require('./token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;
const createError = tokenMod.createError;
const measureIndent = require('./indentation').measureIndent;
const emitIndentDedent = require('./indentation').emitIndentDedent;
const isInStringAt = require('../tokenizers/comments').isInStringAt;

/**
 * Known compiler directives for implicit front-matter detection.
 */
const KNOWN_DIRECTIVES = new Set([
  'router',
  'adapter',
  'butuhAuth',
  'redirect',
  'token',
  'tokenKey',
  'peran',
  // Module directives
  'kirim',
  'share',
  'terima',
  'get',
  // v132 #79: opt-in CSS scoping directive
  'gayaCakupan',
]);

/**
 * Update bracket depth from newly emitted tokens.
 *
 * @param {PromptJSLexer} lexer
 * @param {number} tokenCountBefore - index of first new token
 */
function updateBracketDepth(lexer, tokenCountBefore) {
  for (let j = tokenCountBefore; j < lexer.tokens.length; j++) {
    const t = lexer.tokens[j];
    if (t.type === TT.TK_LBRACKET || t.type === TT.TK_LBRACE) {
      lexer._bracketDepth++;
    } else if (t.type === TT.TK_RBRACKET || t.type === TT.TK_RBRACE) {
      lexer._bracketDepth = Math.max(0, lexer._bracketDepth - 1);
    }
  }
}

/**
 * Constructor PromptJSLexer — tokenizer PromptJS.
 *
 * @constructor
 */
function PromptJSLexer() {
  this.source = '';
  this.tokens = [];
  this.errors = [];
  this.frontMatter = null;

  // State
  this.pos = 0;
  this.line = 1;
  this.col = 1;
  this.indentStack = [0];
  this.pendingDedents = 0;
  this.inFrontMatter = false;
  this._bracketDepth = 0; // F-1: track bracket depth for multi-line array/object suppression
  this._inBlockComment = false; // LIM-08: track /* */ block comment state across lines
}

/**
 * Tokenize source code PromptJS menjadi daftar token.
 *
 * @param {string} source - Source code `.pjs`
 * @returns {TokenizeResult} Hasil tokenisasi
 */
PromptJSLexer.prototype.tokenize = function (source) {
  this.source = source;
  this.tokens = [];
  this.errors = [];
  this.frontMatter = null;
  this.pos = 0;
  this.line = 1;
  this.col = 1;
  this.indentStack = [0];
  this.pendingDedents = 0;
  this.inFrontMatter = false;
  this._bracketDepth = 0;
  this._inBlockComment = false;

  const lines = source.split('\n');

  // v0.9: Pre-scan for implicit front-matter
  let implicitFmEnd = -1;
  let implicitFmStart = -1;
  let fmScanStarted = false;
  for (let si = 0; si < lines.length; si++) {
    const st = lines[si].trim();
    if (!fmScanStarted) {
      if (st === '') continue;
      if (st === '---') break;
      const colonIdx = st.indexOf(':');
      if (colonIdx > 0) {
        const skey = st.substring(0, colonIdx).trim();
        if (KNOWN_DIRECTIVES.has(skey)) {
          fmScanStarted = true;
          implicitFmStart = si;
          implicitFmEnd = si;
          continue;
        }
      }
      break;
    }
    if (st === '' || st === '---') break;
    const colonIdx2 = st.indexOf(':');
    if (colonIdx2 > 0) {
      const skey2 = st.substring(0, colonIdx2).trim();
      if (KNOWN_DIRECTIVES.has(skey2)) {
        implicitFmEnd = si;
        continue;
      }
    }
    break;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 1;

    // --- Front-matter detection ---
    if (i === 0 && rawLine.trim() === '---') {
      this.inFrontMatter = true;
      continue;
    }
    if (implicitFmStart >= 0 && i >= implicitFmStart && !this.inFrontMatter) {
      this.inFrontMatter = true;
    }
    if (this.inFrontMatter) {
      const fmTrimmed = rawLine.trim();
      if (fmTrimmed === '---') {
        this.inFrontMatter = false;
        continue;
      } else if (implicitFmStart >= 0 && i > implicitFmEnd) {
        this.inFrontMatter = false;
      } else {
        if (!this.frontMatter) this.frontMatter = [];
        this.frontMatter.push(rawLine);
        continue;
      }
    }

    // --- LIM-08: Block comment (/* ... */) handling ---
    if (this._inBlockComment) {
      let searchFrom = 0;
      let closeIdx = -1;
      while (searchFrom < rawLine.length) {
        const idx = rawLine.indexOf('*/', searchFrom);
        if (idx === -1) break;
        if (!isInStringAt(rawLine, idx)) {
          closeIdx = idx;
          break;
        }
        searchFrom = idx + 2;
      }
      if (closeIdx !== -1) {
        this._inBlockComment = false;
        const afterComment = rawLine.substring(closeIdx + 2).trim();
        if (afterComment === '') continue;
        const indent = measureIndent(rawLine);
        if (indent === -2 || indent < 0 || indent > rawLine.length) continue;
        if (this._bracketDepth === 0) emitIndentDedent(this, indent, lineNum);
        const tokenCountBefore = this.tokens.length;
        this._tokenizeLine(afterComment, lineNum, indent);
        updateBracketDepth(this, tokenCountBefore);
      }
      continue;
    }

    // Check for block comment open
    const trimmedPreview = rawLine.trim();
    if (!trimmedPreview.startsWith('--') && !trimmedPreview.startsWith('//')) {
      let bSearchFrom = 0;
      let openIdx = -1;
      while (bSearchFrom < rawLine.length) {
        const bIdx = rawLine.indexOf('/*', bSearchFrom);
        if (bIdx === -1) break;
        if (!isInStringAt(rawLine, bIdx)) {
          openIdx = bIdx;
          break;
        }
        bSearchFrom = bIdx + 2;
      }
      if (openIdx !== -1) {
        let bCloseIdx = -1;
        let searchClose = openIdx + 2;
        while (searchClose < rawLine.length) {
          const cIdx = rawLine.indexOf('*/', searchClose);
          if (cIdx === -1) break;
          if (!isInStringAt(rawLine, cIdx)) {
            bCloseIdx = cIdx;
            break;
          }
          searchClose = cIdx + 2;
        }
        if (bCloseIdx === -1) {
          this._inBlockComment = true;
          continue;
        }
        const before = rawLine.substring(0, openIdx).trim();
        const after = rawLine.substring(bCloseIdx + 2).trim();
        const effectiveContent = (before + ' ' + after).trim();
        if (effectiveContent === '') continue;
        const bIndent = measureIndent(rawLine);
        if (bIndent === -2 || bIndent < 0 || bIndent > rawLine.length) continue;
        if (this._bracketDepth === 0) emitIndentDedent(this, bIndent, lineNum);
        const bTokenCountBefore = this.tokens.length;
        this._tokenizeLine(effectiveContent, lineNum, bIndent);
        updateBracketDepth(this, bTokenCountBefore);
        continue;
      }
    }

    // --- Blank lines ---
    if (rawLine.trim() === '') {
      continue;
    }

    // --- Indentation handling ---
    const lineIndent = measureIndent(rawLine);
    if (lineIndent === -2) {
      this.errors.push(
        createError(
          'E1002',
          'Indentasi tidak valid di baris ' + lineNum + ': karakter TAB ditemukan',
          lineNum,
          1,
          'Ganti semua tab menjadi spasi (2, 4, 6, ...).'
        )
      );
      continue;
    }
    if (lineIndent < 0) {
      this.errors.push(
        createError(
          'E1001',
          'Indentasi ganjil di baris ' + lineNum + ': bukan kelipatan 2 spasi',
          lineNum,
          1,
          'Gunakan kelipatan 2 spasi untuk indentasi.'
        )
      );
      continue;
    }
    if (lineIndent > rawLine.length) continue;

    if (this._bracketDepth === 0) {
      emitIndentDedent(this, lineIndent, lineNum);
    }

    // --- Tokenize the content of the line ---
    const content = rawLine.substring(lineIndent);
    const tokenCountBefore2 = this.tokens.length;
    this._tokenizeLine(content, lineNum, lineIndent);

    updateBracketDepth(this, tokenCountBefore2);
  }

  // Emit remaining DEDENTs at EOF
  while (this.indentStack.length > 1) {
    this.indentStack.pop();
    this.tokens.push(new Token(TT.TK_DEDENT, '', this.line, 0));
  }

  this.tokens.push(new Token(TT.TK_EOF, '', this.line, 0));
  return { tokens: this.tokens, errors: this.errors, frontMatter: this.frontMatter };
};

// ─── Prototype method stubs (implementations set by facade promptjs-lexer.js) ─
// Declared here so TypeScript checkJs can see them on the type.

/** @param {string} _l @returns {number} */
PromptJSLexer.prototype._measureIndent = function (_l) {
  return 0;
};

/** @param {number} _indent @param {number} _lineNum @returns {void} */
PromptJSLexer.prototype._emitIndentDedent = function (_indent, _lineNum) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizeLine = function (_content, _lineNum, _baseCol) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizeStringLine = function (_content, _lineNum, _baseCol) {};

/** @param {string} _expr @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizeExpression = function (_expr, _lineNum, _baseCol) {};

/** @param {string} _selector @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizeSelector = function (_selector, _lineNum, _baseCol) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @param {string} _keyword @returns {void} */
PromptJSLexer.prototype._tokenizeBlockOpener = function (_content, _lineNum, _baseCol, _keyword) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @param {string} _keyword @returns {void} */
PromptJSLexer.prototype._tokenizeDeclaration = function (_content, _lineNum, _baseCol, _keyword) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizeEventLine = function (_content, _lineNum, _baseCol) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizeExternalRefLine = function (_content, _lineNum, _baseCol) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @param {string} _keyword @returns {void} */
PromptJSLexer.prototype._tokenizeControlFlow = function (_content, _lineNum, _baseCol, _keyword) {};

/** @param {string} _content @param {number} _lineNum @param {number} _baseCol @returns {void} */
PromptJSLexer.prototype._tokenizePropertyLine = function (_content, _lineNum, _baseCol) {};

/**
 * Static method stub — real implementation assigned by facade.
 *
 * @type {(fmLines: string[]) => Object}
 */
PromptJSLexer.parseFrontMatter = function (_fmLines) {
  return {};
};

module.exports = { PromptJSLexer: PromptJSLexer };
