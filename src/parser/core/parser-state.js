'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Core: State, Primitives, Dispatcher, Block
 * ============================================================================
 *
 * Parser primitives (_peek, _advance, _match, _expect, _makeLoc),
 * the main entry point (parse), statement dispatcher (_parseStatement),
 * and block parser (_parseBlock).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang parser core methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse token stream menjadi AST.
   *
   * Entry point parser. Iterasi semua top-level statement via `_parseStatement`
   * hingga TK_EOF, lalu bungkus hasilnya dalam node Program.
   *
   * @param {Object[]} tokens - Token stream dari lexer (akhirnya TK_EOF)
   * @param {Object} [frontMatterData] - Data front-matter yang sudah di-parse (untuk pre-declare `$external`)
   * @returns {ParseResult} Hasil parsing: `{ ast, errors }`
   */
  PromptJSParser.prototype.parse = function (tokens, frontMatterData) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
    this.warnings = []; // v132 stabilization: reset parser warnings per-parse
    this.frontMatterDecls = [];
    this._exprDepth = 0; // LOW-4: guard kedalaman rekursi ekspresi
    this._hadFatalParseError = false; // [DX-1] set true on E2020 token fallback

    // Pre-populate external data from front-matter as TetapDeclaration nodes
    if (frontMatterData) {
      for (const [name, info] of Object.entries(frontMatterData)) {
        this.frontMatterDecls.push(
          AST.buatTetapDeclaration(
            name,
            null,
            AST.buatLiteral(info.type === 'inline' ? info.value : null, 'external', null),
            null,
            null
          )
        );
        // Mark as external for resolver patch
        this.frontMatterDecls[this.frontMatterDecls.length - 1]._isExternal = true;
        this.frontMatterDecls[this.frontMatterDecls.length - 1]._externalInfo = info;
      }
    }

    const body = [];
    while (!this._atEnd()) {
      const tok = this._peek();
      if (tok.type === TT.TK_EOF) break;
      if (tok.type === TT.TK_IDENT || tok.type === TT.TK_DEDENT) {
        this._advance(); // skip standalone indent/dedent
        continue;
      }
      const stmt = this._parseStatement();
      if (stmt) body.push(stmt);
    }

    // Prepend front-matter declarations
    const fullBody = this.frontMatterDecls.concat(body);

    return {
      ast: AST.buatProgramNode(fullBody, null, 'promptjs'),
      errors: this.errors,
      warnings: this.warnings, // v132 stabilization: surface parser-level warnings (mis. W2005)
      // [DX-1 FIX] Signal that an unrecoverable token error (E2020) occurred so the
      // resolver can suppress the misleading E3001 cascade on the broken subtree.
      hadFatalParseError: !!this._hadFatalParseError,
    };
  };

  // --- Helpers ---
  /**
   * Peek current token tanpa consume.
   *
   * @returns {Object} Token saat ini (atau TK_EOF sentinel jika sudah di akhir)
   */
  PromptJSParser.prototype._peek = function () {
    if (this.pos >= this.tokens.length) return this.tokens[this.tokens.length - 1];
    return this.tokens[this.pos];
  };

  /**
   * Peek token pada offset relatif dari posisi saat ini.
   *
   * @param {number} offset - Offset dari current pos (0 = current, 1 = next, -1 = prev)
   * @returns {Object} Token pada offset (atau TK_EOF sentinel jika out of bounds)
   */
  PromptJSParser.prototype._peekAt = function (offset) {
    const idx = this.pos + offset;
    if (idx >= this.tokens.length) return this.tokens[this.tokens.length - 1];
    return this.tokens[idx];
  };

  /**
   * Consume dan kembalikan current token, lalu advance posisi.
   *
   * @returns {Object} Token yang baru saja di-consume
   */
  PromptJSParser.prototype._advance = function () {
    const tok = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return tok;
  };

  /**
   * Cek apakah parser sudah di akhir token stream (TK_EOF).
   *
   * @returns {boolean} `true` jika current token adalah TK_EOF
   */
  PromptJSParser.prototype._atEnd = function () {
    return this._peek().type === TT.TK_EOF;
  };

  /**
   * Jika current token bertipe `type`, consume dan kembalikan; jika tidak, kembalikan null.
   *
   * @param {string} type - Jenis token yang diharapkan (mis. 'TK_COLON')
   * @returns {Object | null} Token yang di-consume, atau `null` jika tidak cocok
   */
  PromptJSParser.prototype._match = function (type) {
    if (this._peek().type === type) {
      return this._advance();
    }
    return null;
  };

  /**
   * Expect current token bertipe `type`; jika ya consume, jika tidak push error dan kembalikan null.
   *
   * @param {string} type - Jenis token yang diharapkan
   * @param {string} [errorMsg] - Pesan error custom (opsional, default: pesan generik)
   * @returns {Object | null} Token yang di-consume, atau `null` jika gagal
   */
  PromptJSParser.prototype._expect = function (type, errorMsg) {
    if (this._peek().type === type) {
      return this._advance();
    }
    const tok = this._peek();
    this.errors.push({
      code: 'E2001',
      severity: 'error',
      message: errorMsg || `Expected ${type}, got ${tok.type}`,
      line: tok.line,
      column: tok.col,
      suggestion: '',
    });
    return null;
  };

  /**
   * Buat SourceLocation dari token awal dan akhir (convenience wrapper untuk `AST.buatLoc`).
   *
   * @param {Object} startTok - Token awal rentang
   * @param {Object} [endTok] - Token akhir rentang (opsional, default: startTok)
   * @returns {Object} SourceLocation
   */
  PromptJSParser.prototype._makeLoc = function (startTok, endTok) {
    return AST.buatLoc(
      { line: startTok.line, column: startTok.col },
      { line: (endTok || startTok).line, column: (endTok || startTok).col }
    );
  };

  // --- Statement dispatch ---
  /**
   * Dispatch parsing satu statement berdasarkan jenis token saat ini.
   *
   * Ini adalah router utama: cek current token, lalu panggil method
   * `_parse<Type>Statement` yang sesuai. Jika tidak ada yang cocok, laporkan
   * error `E2010` (keyword tidak dikenali di posisi statement).
   *
   * @returns {Object | null} AST node statement, atau `null` jika tidak ada statement (TK_EOF / error)
   */
  PromptJSParser.prototype._parseStatement = function () {
    const tok = this._peek();

    switch (tok.type) {
      case TT.TK_BUAT:
        return this._parseBuatStatement();
      case TT.TK_JIKA:
        return this._parseJikaStatement();
      case TT.TK_LAINNYA:
        return null; // Handled by Jika parser
      case TT.TK_ULANGI:
        return this._parseUlangiStatement();
      case TT.TK_PASS:
        return this._parsePassStatement();
      case TT.TK_DATA:
      case TT.TK_TETAP:
      case TT.TK_UBAH:
      case TT.TK_TURUNAN:
        return this._parseDataDeclaration();
      case TT.TK_FUNGSI:
        return this._parseFungsiDeclaration();
      case TT.TK_DEFINSIKAN:
        return this._parseDefineComponent();
      case TT.TK_SAAT:
        return this._parseSaatStatement();
      case TT.TK_KEMBALIKAN:
        return this._parseReturnStatement();
      case TT.TK_STRING:
        return this._parseTextNode();
      case TT.TK_ON_EVENT:
        return this._parseOnEventStatement();
      // ─── Wave G: Action statement dispatch ────────────────────────────
      case TT.TK_BERHENTI:
        return this._parseSimpleStatement('BerhentiStatement');
      case TT.TK_SELAMA:
        return this._parseSelamaStatement();
      case TT.TK_MUAT_ULANG:
        return this._parseSimpleStatement('MuatUlangStatement');
      case TT.TK_KEMBALI:
        return this._parseSimpleStatement('KembaliStatement');
      case TT.TK_DIPASANG:
        return this._parseLifecycleStatement('dipasang');
      case TT.TK_DILEPAS:
        return this._parseLifecycleStatement('dilepas');
      case TT.TK_SEMBUNYIKAN:
        return this._parseTargetStatement('SembunyikanStatement');
      case TT.TK_HAPUS:
        return this._parseHapusStatement();
      case TT.TK_KOSONGKAN:
        return this._parseTargetStatement('KosongkanStatement');
      case TT.TK_ARAHKAN:
        return this._parseTargetStatement('ArahkanStatement');
      case TT.TK_TAMPILKAN:
        return this._parseTampilkanStatement();
      case TT.TK_SIMPAN:
      case TT.TK_TAMBAHKAN:
      case TT.TK_KURANGI:
      case TT.TK_SISIPKAN:
        return this._parseSimpanStatement();
      case TT.TK_PERBARUI:
        return this._parsePerbaruiStatement();
      case TT.TK_GUNAKAN:
        return this._parseGunakanStatement();
      case TT.TK_KETIKA:
        return this._parseKetikaStatement();
      case TT.TK_AMBIL:
        return this._parseAmbilStatement();
      case TT.TK_JALANKAN:
        return this._parseJalankanStatement();
      case TT.TK_SETELAH:
        return this._parseSetelahStatement();
      case TT.TK_IDENT:
        return this._parsePropertyOrExpr();
      default:
        this._advance(); // skip unknown
        return null;
    }
  };

  // --- Block parsing ---
  /**
   * Parse body block — urutan statement di antara TK_INDENT dan TK_DEDENT.
   *
   * Setelah TK_INDENT, parse statement beruntun via `_parseStatement` hingga
   * TK_DEDENT (atau TK_EOF). Jika tidak ada TK_INDENT, kembalikan null
   * (body kosong — mis. `Buat h1: "text"` tanpa child block).
   *
   * @returns {Object | null} AST node BlockStatement, atau `null` jika tidak ada block
   */
  PromptJSParser.prototype._parseBlock = function () {
    const statements = [];

    // Expect INDENT
    if (this._peek().type !== TT.TK_INDENT) {
      // Empty block (no children)
      return null;
    }
    this._advance(); // consume INDENT

    // Parse statements until DEDENT
    while (this._peek().type !== TT.TK_DEDENT && !this._atEnd()) {
      const stmt = this._parseStatement();
      if (stmt) statements.push(stmt);
    }

    if (this._peek().type === TT.TK_DEDENT) {
      this._advance(); // consume DEDENT
    }

    if (statements.length === 0) return null;

    // Auto-fragment: if multiple top-level children, wrap in fragment.
    // BUG-03 FIX: KetikaStatement (event handlers) must NOT be wrapped in the
    // auto-fragment. When at page root (or inside Jika at page root), the
    // fragment would get a compiledVarName but no createElement call, causing
    // the event handler's SelfReference to point at a phantom (undeclared)
    // variable. Excluding them ensures the resolver emits E3005 instead of
    // producing broken JavaScript.
    if (statements.length > 1) {
      const nonEventStmts = statements.filter(function (s) {
        return s.type !== 'KetikaStatement';
      });
      const eventStmts = statements.filter(function (s) {
        return s.type === 'KetikaStatement';
      });

      const result = [];
      // Only create a fragment wrapper when there are 2+ non-event statements
      if (nonEventStmts.length > 1) {
        const fragSelector = AST.buatSelector('fragment', null, null, [], []);
        const fragBody = AST.buatBlockStatement(nonEventStmts, null);
        result.push(AST.buatBuatStatement(fragSelector, null, null, null, fragBody, null));
      } else if (nonEventStmts.length === 1) {
        result.push(nonEventStmts[0]);
      }
      // Event handlers are left as siblings — resolver will emit E3005 if
      // they lack an explicit target and have no Buat parent.
      for (let _i = 0; _i < eventStmts.length; _i++) {
        result.push(eventStmts[_i]);
      }

      if (result.length > 0) {
        return AST.buatBlockStatement(result, null);
      }
    }

    return AST.buatBlockStatement(statements, null);
  };
}

module.exports = { install };
