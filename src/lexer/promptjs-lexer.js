// @ts-check

/**
 * PromptJS v1.0.0 — LEXER (Tahap 1) — FACADE
 * ============================================================================
 *
 * Converts raw PromptJS (.pjs) character stream into a stream of tokens.
 * Mengkonversi stream karakter mentah PromptJS (.pjs) menjadi stream token.
 *
 * MODULARIZED: This file is a facade that re-exports all submodules.
 * Actual logic lives in:
 *   - core/token.js        — TT constants, Token class
 *   - core/state.js        — PromptJSLexer constructor + tokenize() main loop
 *   - core/indentation.js  — measureIndent, emitIndentDedent
 *   - core/line-dispatch.js — _tokenizeLine, _tokenizeEventLine,
 *                              _tokenizeExternalRefLine, _tokenizeControlFlow,
 *                              _tokenizePropertyLine
 *   - maps/keywords.js     — KEYWORDS bilingual map
 *   - maps/events.js       — EVENT_ALIASES map
 *   - maps/operators.js    — WORD_OPERATORS (bilingual prose operators)
 *   - maps/tags.js         — TAG_ALIASES (PromptJS tag → HTML tag)
 *   - tokenizers/string-line.js   — _tokenizeStringLine
 *   - tokenizers/expression.js    — _tokenizeExpression
 *   - tokenizers/selector.js      — _tokenizeSelector
 *   - tokenizers/block-opener.js  — _tokenizeBlockOpener
 *   - tokenizers/declaration.js   — _tokenizeDeclaration
 *   - tokenizers/comments.js      — isInStringAt helper
 *   - frontmatter/parse-frontmatter.js — parseFrontMatter
 *   - frontmatter/duplicate-keys.js   — fmAssign helper
 *
 * Murni JavaScript (ES2015), TANPA dependensi.
 */

/**
 * Token yang dihasilkan oleh lexer.
 *
 * @typedef {Object} LexerToken
 * @property {string} type - Jenis token (mis. 'TK_IDENT', 'TK_STRING', 'TK_INDENT')
 * @property {*} value - Nilai token (string untuk ident/keyword, parsed value untuk literal)
 * @property {number} line - Nomor baris (1-indexed)
 * @property {number} col - Nomor kolom (1-indexed)
 * @property {string | Object} raw - Raw source text token (untuk error reporting) atau objek selector untuk TK_IDENT selector
 */

/**
 * Error yang dihasilkan oleh lexer.
 *
 * @typedef {Object} LexerError
 * @property {string} code - Kode error (mis. 'E1001')
 * @property {'error' | 'warning'} severity - Severity error
 * @property {string} message - Pesan error
 * @property {number} line - Nomor baris error
 * @property {number} column - Nomor kolom error
 * @property {string} suggestion - Saran perbaikan
 */

/**
 * Hasil tokenisasi lexer.
 *
 * @typedef {Object} TokenizeResult
 * @property {LexerToken[]} tokens - Daftar token
 * @property {LexerError[]} errors - Daftar error yang terjadi selama tokenisasi
 * @property {string[] | null} frontMatter - Baris front-matter (null jika tidak ada)
 */

// ─── Load submodules ───────────────────────────────────────────────────
const tokenCore = require('./core/token'); // { TT, Token, createError }
const stateCore = require('./core/state'); // { PromptJSLexer }
const indentationCore = require('./core/indentation'); // { measureIndent, emitIndentDedent }
const lineDispatch = require('./core/line-dispatch');
const stringLineTok = require('./tokenizers/string-line');
const expressionTok = require('./tokenizers/expression');
const selectorTok = require('./tokenizers/selector');
const blockOpenerTok = require('./tokenizers/block-opener');
const declarationTok = require('./tokenizers/declaration');
const parseFrontMatterMod = require('./frontmatter/parse-frontmatter');
const KEYWORDS = require('./maps/keywords');
const EVENT_ALIASES = require('./maps/events');
const TAG_ALIASES = require('./maps/tags');

// ─── Extract ───────────────────────────────────────────────────────────
const TT = tokenCore.TT;
const Token = tokenCore.Token;
const PromptJSLexer = stateCore.PromptJSLexer;

// ─── Install prototype methods from submodules ────────────────────────
// Each tokenizer function takes (lexer, ...) as first arg.
// We bind them as prototype methods so `this` is the lexer instance.

PromptJSLexer.prototype._measureIndent = function (line) {
  return indentationCore.measureIndent(line);
};

PromptJSLexer.prototype._emitIndentDedent = function (indent, lineNum) {
  indentationCore.emitIndentDedent(this, indent, lineNum);
};

PromptJSLexer.prototype._tokenizeLine = function (content, lineNum, baseCol) {
  lineDispatch.tokenizeLine(this, content, lineNum, baseCol);
};

PromptJSLexer.prototype._tokenizeStringLine = function (content, lineNum, baseCol) {
  stringLineTok.tokenizeStringLine(this, content, lineNum, baseCol);
};

PromptJSLexer.prototype._tokenizeExpression = function (expr, lineNum, baseCol) {
  expressionTok.tokenizeExpression(this, expr, lineNum, baseCol);
};

PromptJSLexer.prototype._tokenizeSelector = function (selector, lineNum, baseCol) {
  selectorTok.tokenizeSelector(this, selector, lineNum, baseCol);
};

PromptJSLexer.prototype._tokenizeBlockOpener = function (content, lineNum, baseCol, keyword) {
  blockOpenerTok.tokenizeBlockOpener(this, content, lineNum, baseCol, keyword);
};

PromptJSLexer.prototype._tokenizeDeclaration = function (content, lineNum, baseCol, keyword) {
  declarationTok.tokenizeDeclaration(this, content, lineNum, baseCol, keyword);
};

PromptJSLexer.prototype._tokenizeEventLine = function (content, lineNum, baseCol) {
  lineDispatch.tokenizeEventLine(this, content, lineNum, baseCol);
};

PromptJSLexer.prototype._tokenizeExternalRefLine = function (content, lineNum, baseCol) {
  lineDispatch.tokenizeExternalRefLine(this, content, lineNum, baseCol);
};

PromptJSLexer.prototype._tokenizeControlFlow = function (content, lineNum, baseCol, keyword) {
  lineDispatch.tokenizeControlFlow(this, content, lineNum, baseCol, keyword);
};

PromptJSLexer.prototype._tokenizePropertyLine = function (content, lineNum, baseCol) {
  lineDispatch.tokenizePropertyLine(this, content, lineNum, baseCol);
};

// ─── Static method: parseFrontMatter ──────────────────────────────────
PromptJSLexer.parseFrontMatter = parseFrontMatterMod.parseFrontMatter;

// ─── UMD wrapper (preserving original export shape) ───────────────────
(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory({});
  } else {
    root.PromptJSLexer = factory(root.PromptJSLexer || {});
  }
})(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  exports.TT = TT;
  exports.KEYWORDS = KEYWORDS;
  exports.EVENT_ALIASES = EVENT_ALIASES;
  exports.TAG_ALIASES = TAG_ALIASES;
  exports.Token = Token;
  exports.PromptJSLexer = PromptJSLexer;
  exports.parseFrontMatter = PromptJSLexer.parseFrontMatter;

  /**
   * Convenience wrapper: buat instance PromptJSLexer baru dan tokenize source.
   *
   * @param {string} source - Source code `.pjs`
   * @returns {TokenizeResult} Hasil tokenisasi
   */
  exports.tokenize = function (source) {
    const lexer = new PromptJSLexer();
    return lexer.tokenize(source);
  };

  return exports;
});
