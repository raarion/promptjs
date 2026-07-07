// @ts-check

/**
 * PromptJS v1.0.0 — PARSER (Tahap 2)
 * ============================================================================
 *
 * Produces AST nodes compatible with PromptJS's ast-factory.js shapes.
 * Menghasilkan node AST yang kompatibel dengan ast-factory.js.
 *
 * Recursive-descent parser yang mengonsumsi token stream dari lexer dan
 * membangun AST. Setiap error dilaporkan sebagai error node (bukan exception)
 * agar parsing bisa lanjut dan melaporkan multiple errors dalam satu pass.
 *
 * Event alias resolution (mis. `on_klik` → `click`) dilakukan di sini,
 * bukan di lexer.
 */

'use strict';

const AST = require('./ast-factory');
const TT = require('../lexer/promptjs-lexer').TT;

// Event alias: PromptJS on_x → PromptJS event name
const EVENT_ALIASES = require('../lexer/promptjs-lexer').EVENT_ALIASES;

// v132 stabilization: event modifiers that are parsed AND actually have a
// codegen effect (src/compiler/emitters/statements.js MODIFIER_MAP / the
// `{ once: true }` addEventListener option). Shared by both `Ketika ...:`
// (_parseKetikaStatement) and the inline `on_x.mod = ...` form
// (_parseOnEventStatement) so the two paths cannot drift out of sync again.
const VALID_EVENT_MODIFIERS = {
  cegah: true,
  prevent: true,
  sekali: true,
  once: true,
  hentikan: true,
  stop: true,
};

// v132 stabilization (P0.1): modifier NAMES that are recognizable (borrowed
// from common web-framework vocabulary) but have NO implementation in the
// compiler yet. These must not be silently dropped — silently accepting them
// as if they did something would be a repeat of the original `.sekali`/
// `.once` no-op bug. Anything not in either list is treated as "this DOT is
// probably part of a target expression, not a modifier" (unchanged prior
// behavior), preserving the escape hatch for a genuine dotted target.
const KNOWN_UNSUPPORTED_MODIFIERS = {
  capture: true,
  passive: true,
  self: true,
  exact: true,
};

/**
 * Hasil parsing.
 *
 * @typedef {Object} ParseResult
 * @property {Object} ast - Root AST node (Program)
 * @property {Object[]} errors - Daftar error yang terjadi selama parsing
 * @property {Object[]} [warnings] - Daftar warning parser (mis. W2005 event
 *   modifier tidak dikenal/belum didukung) — v132 stabilization pass
 * @property {boolean} [hadFatalParseError] - True jika terjadi error token
 *   yang tidak dapat dipulihkan (E2020); dipakai engine untuk menekan cascade
 *   E3001 pada subtree yang rusak (DX-1 FIX)
 */

/**
 * Constructor PromptJSParser — recursive-descent parser untuk PromptJS.
 *
 * State parser:
 * - `tokens` — token stream dari lexer
 * - `pos` — posisi current token (index ke `tokens`)
 * - `errors` — daftar error yang terkumpul
 * - `componentNames` — Set nama komponen yang telah dideklarasikan (untuk validasi `Gunakan`)
 *
 * @constructor
 * @this {PromptJSParser}
 */
function PromptJSParser() {
  this.tokens = [];
  this.pos = 0;
  this.errors = [];
  this.warnings = []; // v132 stabilization: parser-level warnings (mis. W2005 unknown event modifier)
  this.componentNames = new Set(); // Track defined components
  this._exprDepth = 0; // LOW-4: kedalaman rekursi ekspresi saat ini
}

/**
 * Batas kedalaman rekursi ekspresi. Input patologis (mis. ribuan tanda kurung
 * bersarang `(((...)))` atau unary `!!!!...`) sebelumnya bisa membuat call
 * stack JS overflow (RangeError mentah). Dengan guard ini, parser memancarkan
 * error terstruktur E2029 alih-alih crash (LOW-4 dari audit 2026-06).
 * @type {number}
 */
PromptJSParser.MAX_EXPR_DEPTH = 350;

/** Sentinel internal untuk menghentikan rekursi ekspresi yang terlalu dalam. */
const EXPR_DEPTH_EXCEEDED = Symbol('EXPR_DEPTH_EXCEEDED');

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
    if (tok.type === TT.TK_INDENT || tok.type === TT.TK_DEDENT) {
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

// --- Buat Statement ---
/**
 * Parse `Buat`/`Create` statement — pembuatan elemen DOM atau instansiasi komponen.
 *
 * Bentuk yang didukung:
 * - `Buat tag.class#id:` — elemen dengan selector
 * - `Buat h1: "text"` — elemen dengan inline text
 * - `Buat NamaKomponen(prop: val)` — instansiasi komponen (jika nama ada di `componentNames`)
 * - `Buat tag: -> aksi` — elemen dengan aksi tunggal
 *
 * Setelah header, parse body block (INDENT ... DEDENT) jika ada.
 *
 * @returns {Object} AST node BuatStatement atau GunakanStatement
 */
PromptJSParser.prototype._parseBuatStatement = function () {
  const startTok = this._advance(); // consume Buat/Create

  // Parse selector: tag[.class]*[#id]
  const selector = this._parseSelector();

  // Component invocation: "Buat Kartu(judul: "Hai", isi: ...)" — named args, no block.
  if (this._peek().type === TT.TK_LPAREN) {
    this._advance(); // consume (
    const props = [];
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      const keyTok = this._expect(TT.TK_IDENT, 'Expected argument name in component call');
      this._expect(TT.TK_COLON, 'Expected ":" after argument name');
      const valExpr = this._parseExpression();
      if (keyTok) props.push({ key: keyTok.value, value: valExpr });
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")" to close component arguments');
    return AST.buatGunakanStatement(selector.tag, this._makeLoc(startTok), null, props, null);
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after block opener');

  const loc = this._makeLoc(startTok);

  // Check for inline content after colon (e.g. Buat h1: "text" or Buat p: $judul)
  // If the next token is NOT an INDENT, we have inline content
  let body = null;
  let properties = null;
  let inlineChildren = null;

  if (this._peek().type !== TT.TK_INDENT && this._peek().type !== TT.TK_DEDENT && !this._atEnd()) {
    // Inline content — parse as expression and create a TextNode or property
    const inlineExpr = this._parseExpression();

    if (inlineExpr) {
      // Wrap inline expression in a TextNode-like body
      if (inlineExpr.type === 'Literal' && typeof inlineExpr.value === 'string') {
        // String literal → TextNode
        const textNode = {
          type: 'TextNode',
          loc: inlineExpr.loc || loc,
          value: inlineExpr.value,
        };
        inlineChildren = [textNode];
      } else {
        // Expression → set as 'teks' property (compatible with PromptJS's BuatStatement.properties.teks)
        properties = { teks: inlineExpr };
      }
    }
  }

  // After inline content, also check for an indented block body.
  // This supports the pattern: `Buat tombol: "Click"` followed by an indented
  // `Ketika diklik:` block. The inline content becomes the first child of the
  // block, and the indented statements become subsequent children.
  if (this._peek().type === TT.TK_INDENT) {
    const blockBody = this._parseBlock();
    if (blockBody && blockBody.body) {
      if (inlineChildren && inlineChildren.length > 0) {
        // Merge inline children as first children, then block body children
        const mergedChildren = inlineChildren.concat(blockBody.body);
        body = AST.buatBlockStatement(mergedChildren, null);
      } else {
        body = blockBody;
      }
    } else if (inlineChildren && inlineChildren.length > 0) {
      body = AST.buatBlockStatement(inlineChildren, null);
    }
  } else if (inlineChildren && inlineChildren.length > 0) {
    // Only inline content, no indented block
    body = AST.buatBlockStatement(inlineChildren, null);
  }

  // Check if this is a component invocation (selector.tag matches known component)
  // This will be re-checked in Resolver, but we set a hint here
  const node = AST.buatBuatStatement(selector, loc, properties, null, body, null);

  // If selector tag is a known component name, mark for Resolver disambiguation
  if (this.componentNames.has(selector.tag)) {
    node._isComponentInvocation = true;
  }

  return node;
};

// --- Selector parsing ---
/**
 * Parse selector CSS-style `tag.class#id` (sudah di-emit sebagai objek oleh lexer).
 *
 * @returns {Object} AST node Selector
 */
PromptJSParser.prototype._parseSelector = function () {
  const tok = this._peek();
  let tag = '';
  const classes = [];
  let id = null;
  const attributes = [];

  // If the IDENT token has raw selector metadata from lexer
  if (
    tok.type === TT.TK_IDENT &&
    tok.raw &&
    typeof tok.raw === 'object' &&
    tok.raw.type === 'Selector'
  ) {
    this._advance();
    const sel = tok.raw;
    tag = sel.tag;
    classes.push(...sel.classes);
    id = sel.id;

    // BUG-2 fix: forward inline attributes `[attr="val"]` from the lexer.
    // BUG-10 fix: distinguish between quoted and unquoted attribute values.
    // Quoted values become Literal nodes; unquoted identifiers become
    // Identifier nodes so they compile to reactive references (e.g. url.value).
    if (Array.isArray(sel.attributes) && sel.attributes.length > 0) {
      for (const a of sel.attributes) {
        let valNode;
        if (a.value == null) {
          // Boolean/valueless attribute, e.g. [disabled]
          valNode = AST.buatLiteral('', 'string', null);
        } else if (typeof a.value === 'object' && a.value.__raw !== undefined) {
          // Structured value from BUG-10 lexer fix
          if (a.value.__quoted) {
            // Quoted string literal: [href="https://example.com"]
            valNode = AST.buatLiteral(String(a.value.__raw), 'string', null);
          } else {
            // Unquoted identifier: [href=url] → variable reference
            const raw = a.value.__raw;
            // Only treat as identifier if it's a valid JS identifier pattern
            if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(raw)) {
              valNode = AST.buatIdentifier(raw, null);
            } else {
              // Complex expression like a URL path — treat as string literal
              valNode = AST.buatLiteral(String(raw), 'string', null);
            }
          }
        } else {
          // Legacy format (plain string value)
          valNode = AST.buatLiteral(String(a.value), 'string', null);
        }
        attributes.push(AST.buatAttributeNode(a.key, valNode, null));
      }
    }

    // Consume any extra DOT and HASH tokens that the lexer also emitted
    while (this._peek().type === TT.TK_DOT || this._peek().type === TT.TK_HASH) {
      this._advance();
    }
  } else if (tok.type === TT.TK_IDENT) {
    tag = this._advance().value;

    // Collect class tokens (DOT) and id token (HASH)
    // But stop if we hit COLON — we don't consume it here
    while (this._peek().type === TT.TK_DOT) {
      this._advance(); // consume DOT token itself
      // The DOT token's value IS the class name (from lexer)
      classes.push(this.tokens[this.pos - 1].value);
    }
    if (this._peek().type === TT.TK_HASH) {
      this._advance(); // consume HASH token itself
      // The HASH token's value IS the id name (from lexer)
      id = this.tokens[this.pos - 1].value;
    }
  }

  return AST.buatSelector(tag, null, id, classes, attributes);
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

// --- Jika Statement ---
/**
 * Parse `Jika`/`If` statement — kondisional dengan opsional cabang `Lainnya`/`Else`.
 *
 * Sintaks: `Jika <kondisi>: <body>` (opsional `Lainnya: <body>`).
 *
 * @returns {Object} AST node JikaStatement
 */
PromptJSParser.prototype._parseJikaStatement = function () {
  const startTok = this._advance(); // consume Jika/If

  // Parse condition expression
  const condition = this._parseExpression();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after condition');

  const loc = this._makeLoc(startTok);

  // Parse consequent block
  const consequent = this._parseBlock();

  // Check for Lainnya/Else or multi-word else aliases
  let alternate = null;
  if (this._peek().type === TT.TK_LAINNYA) {
    this._advance(); // consume Lainnya/Else
    if (this._peek().type === TT.TK_COLON) this._advance(); // optional colon
    alternate = this._parseBlock();
  } else if (this._isMultiWordElse()) {
    // "selain itu" → plain else (no condition)
    this._advance(); // consume "selain"
    this._advance(); // consume "itu"
    if (this._peek().type === TT.TK_COLON) this._advance(); // optional colon
    alternate = this._parseBlock();
  } else if (this._isMultiWordElseIf()) {
    // "namun jika" / "tapi kalau" → else-if (with new condition)
    this._advance(); // consume "namun"/"tapi"
    this._advance(); // consume "jika"/"kalau"
    const elifCond = this._parseExpression();
    this._expect(TT.TK_COLON, 'Expected ":" after else-if condition');
    const elifBody = this._parseBlock();
    // Recursively check for further else/else-if chains
    const elifAlternate = this._parseElseChain();
    alternate = AST.buatJikaStatement(elifCond, elifBody, loc, null, elifAlternate);
  }

  return AST.buatJikaStatement(condition, consequent, loc, null, alternate);
};

/**
 * Check if current position starts a multi-word "else" pattern.
 * Recognized: `selain itu`
 *
 * @returns {boolean}
 */
PromptJSParser.prototype._isMultiWordElse = function () {
  const cur = this._peek();
  const nxt = this._peekAt(1);
  return (
    cur.type === TT.TK_IDENT &&
    cur.value === 'selain' &&
    nxt.type === TT.TK_IDENT &&
    nxt.value === 'itu'
  );
};

/**
 * Check if current position starts a multi-word "else-if" pattern.
 * Recognized: `namun jika`, `namun kalau`, `tapi jika`, `tapi kalau`
 *
 * @returns {boolean}
 */
PromptJSParser.prototype._isMultiWordElseIf = function () {
  const cur = this._peek();
  const nxt = this._peekAt(1);
  if (cur.type !== TT.TK_IDENT) return false;
  if (cur.value !== 'namun' && cur.value !== 'tapi') return false;
  return nxt.type === TT.TK_JIKA;
};

/**
 * Parse trailing else / else-if chain after a Jika consequent block.
 * Used by multi-word else-if to support chaining: "namun jika ... : ... namun jika ... : ... selain itu: ..."
 *
 * @returns {Object|null} AST node (JikaStatement for else-if, BlockStatement for else), or null
 */
PromptJSParser.prototype._parseElseChain = function () {
  if (this._peek().type === TT.TK_LAINNYA) {
    this._advance(); // consume Lainnya/Else
    if (this._peek().type === TT.TK_COLON) this._advance();
    return this._parseBlock();
  }
  if (this._isMultiWordElse()) {
    this._advance(); // consume "selain"
    this._advance(); // consume "itu"
    if (this._peek().type === TT.TK_COLON) this._advance();
    return this._parseBlock();
  }
  if (this._isMultiWordElseIf()) {
    const loc = this._makeLoc(this._peek());
    this._advance(); // consume "namun"/"tapi"
    this._advance(); // consume "jika"/"kalau"
    const elifCond = this._parseExpression();
    this._expect(TT.TK_COLON, 'Expected ":" after else-if condition');
    const elifBody = this._parseBlock();
    const elifAlternate = this._parseElseChain();
    return AST.buatJikaStatement(elifCond, elifBody, loc, null, elifAlternate);
  }
  return null;
};

// --- Selama Statement ---
/**
 * Parse `Selama`/`while` statement — while loop.
 *
 * Sintaks: `Selama <kondisi>: <body>`
 *         `while <condition>: <body>`
 *
 * @returns {Object} AST node SelamaStatement
 */
PromptJSParser.prototype._parseSelamaStatement = function () {
  const startTok = this._advance(); // consume Selama/while

  // Parse condition expression
  const condition = this._parseExpression();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after while condition');

  const loc = this._makeLoc(startTok);

  // Parse body block
  const body = this._parseBlock();

  return AST.buatSelamaStatement(condition, body, loc, null);
};

// --- Setelah Statement ---
/**
 * Parse `Setelah`/`after` statement — post-completion hook.
 *
 * Sintaks: `Setelah <target> selesai: <body>`
 *          `Setelah <target>: -> <aksi>`
 *          `after <target> completed: <body>`
 *
 * Kata "selesai"/"completed" adalah opsional (dekoratif).
 * Target adalah nama fungsi/operasi yang akan dipanggil,
 * lalu body dieksekusi setelah Promise-nya resolve.
 *
 * @returns {Object} AST node SetelahStatement
 */
PromptJSParser.prototype._parseSetelahStatement = function () {
  const startTok = this._advance(); // consume Setelah/after

  // Parse target identifier (nama fungsi/operasi)
  const targetTok = this._expect(TT.TK_IDENT, 'Expected target name after "setelah"');
  const target = targetTok ? targetTok.value : '_unknown';

  // Optionally consume decorative word "selesai" (completed) if present as IDENT
  if (
    this._peek() &&
    this._peek().type === TT.TK_IDENT &&
    (this._peek().value === 'selesai' || this._peek().value === 'completed')
  ) {
    this._advance(); // skip decorative word
  }

  const loc = this._makeLoc(startTok);

  // Expect `:` then INDENT block
  this._expect(TT.TK_COLON, 'Expected ":" after setelah target');
  const body = this._parseBlock();

  return AST.buatSetelahStatement(target, loc, null, body, null);
};

// --- Ulangi Statement ---
/**
 * Parse `Ulangi`/`Loop` statement — tiga varian loop.
 *
 * Varian yang didukung (deteksi dari token setelah `Ulangi`):
 * - Counted: `Ulangi <N> kali:` — `kind: 'kali'`
 * - Iterasi: `Ulangi untuk <x> <sep> <source>:` — `kind: 'dari'`/`'in'` (sep = `dari`/`in`/`from`)
 * - Range: `Ulangi <x> dari <A> sampai <B>:` — `kind: 'rentang'`
 *
 * @returns {Object} AST node UlangiStatement
 */
/**
 * K1b keyed diff: optionally parse a `dengan kunci <expr>` suffix on an
 * iteration loop, right before the trailing `:`.
 *
 * `dengan` / `kunci` are not reserved keywords — they lex as plain IDENT — so
 * we peek for the exact two-identifier sequence and only then consume + parse
 * the key expression. Anything else is left untouched (no false positives).
 * This is the "honest keyword": its presence genuinely switches the emitter to
 * keyed reconciliation; its absence keeps the K1a full-re-render behavior.
 *
 * @returns {Object | null} the parsed key expression, or null if absent
 */
PromptJSParser.prototype._tryParseDenganKunci = function () {
  const t0 = this._peek();
  const t1 = this._peekAt(1);
  if (
    t0.type === TT.TK_IDENT &&
    t0.value === 'dengan' &&
    t1.type === TT.TK_IDENT &&
    t1.value === 'kunci'
  ) {
    this._advance(); // consume `dengan`
    this._advance(); // consume `kunci`
    return this._parseExpression();
  }
  return null;
};

/**
 * K2a list transitions: optionally parse a `dengan transisi <name>` suffix on a
 * keyed iteration loop, right before the trailing `:`.
 *
 * Like `dengan kunci`, the words `dengan` / `transisi` are NOT reserved — they
 * lex as plain IDENT — so we peek for the exact two-identifier sequence and only
 * then consume + read the transition name. Anything else is left untouched (no
 * false positives). This is another "honest keyword": its presence genuinely
 * switches the emitter to FLIP-wrapped reconciliation; its absence keeps the
 * K1b keyed behavior byte-for-byte.
 *
 * The `<name>` is a simple identifier or string literal (a CSS class prefix),
 * NOT a full expression — transition names are static styling hooks, so keeping
 * them literal avoids ambiguity and keeps the emit CSP-safe (no dynamic eval).
 *
 * @returns {string | null} the transition name, or null if absent
 */
PromptJSParser.prototype._tryParseDenganTransisi = function () {
  const t0 = this._peek();
  const t1 = this._peekAt(1);
  if (
    t0.type === TT.TK_IDENT &&
    t0.value === 'dengan' &&
    t1.type === TT.TK_IDENT &&
    t1.value === 'transisi'
  ) {
    this._advance(); // consume `dengan`
    this._advance(); // consume `transisi`
    const nameTok = this._peek();
    if (nameTok.type === TT.TK_IDENT || nameTok.type === TT.TK_STRING) {
      this._advance();
      return String(nameTok.value);
    }
    // `dengan transisi` with no readable name → default hook name.
    return 'pjs';
  }
  return null;
};

PromptJSParser.prototype._parseUlangiStatement = function () {
  const startTok = this._advance(); // consume Ulangi/Loop

  // Counted loop: "Ulangi N kali:" / "Loop N times:" (kind = 'kali').
  if (this._peek().type !== TT.TK_UNTUK) {
    // Range loop without "untuk": "Ulangi i dari 1 sampai 5:"
    // Check if next is IDENT followed by IN (dari/in/from)
    if (
      this._peek().type === TT.TK_IDENT &&
      (this._peekAt(1).type === TT.TK_IN || this._peekAt(1).type === TT.TK_IDENT)
    ) {
      // Could be range loop: "Ulangi i dari 1 sampai 5:"
      // or iteration loop without "untuk": "Ulangi i in items:"
      const iteratorTok = this._advance();
      const iteratorName = iteratorTok.value;

      // Expect separator (in/dari/from)
      if (this._peek().type === TT.TK_IN) {
        this._advance(); // consume in/dari/from
      }

      // Parse source / range-start
      const source = this._parseExpression();

      // Check for range loop: "sampai/until"
      if (this._peek().type === TT.TK_SAMPAI) {
        this._advance(); // consume sampai/until
        const rangeEnd = this._parseExpression();
        this._expect(TT.TK_COLON, 'Expected ":" after range loop');
        const rangeLoc = this._makeLoc(startTok);
        const rangeBody = this._parseBlock();
        return AST.buatUlangiStatement(
          iteratorName,
          source,
          rangeBody,
          'rentang',
          rangeLoc,
          null,
          rangeEnd
        );
      }

      // Regular iteration: "Ulangi i in items:" (optional `dengan kunci <expr>`
      // then optional `dengan transisi <name>` — transitions require a key).
      const iterKeyExpr = this._tryParseDenganKunci();
      const iterTransition = this._tryParseDenganTransisi();
      this._expect(TT.TK_COLON, 'Expected ":" after loop source');
      const iterLoc = this._makeLoc(startTok);
      const iterBody = this._parseBlock();
      return AST.buatUlangiStatement(
        iteratorName,
        source,
        iterBody,
        'dari',
        iterLoc,
        null,
        null,
        iterKeyExpr,
        iterTransition
      );
    }

    // Try counted loop: "Ulangi N kali:"
    const countExpr = this._parseExpression();
    if (countExpr && this._peek().type === TT.TK_KALI) {
      this._advance(); // consume kali/times
      this._expect(TT.TK_COLON, 'Expected ":" after counted loop');
      const countLoc = this._makeLoc(startTok);
      const countBody = this._parseBlock();
      return AST.buatUlangiStatement(null, countExpr, countBody, 'kali', countLoc, null, null);
    }
    // Neither "untuk/for" nor a valid "N kali/times" counted loop.
    this.errors.push({
      code: 'E2010',
      severity: 'error',
      message: 'Expected "untuk/for" after "ulangi/loop"',
      line: startTok.line,
      column: startTok.col,
      suggestion:
        'Syntax: Ulangi untuk item in $collection:  (atau: Ulangi N kali:  atau: Ulangi i dari 1 sampai 10:)',
    });
    return null;
  }
  this._advance(); // consume untuk/for

  // Iterator name
  const iteratorTok = this._expect(TT.TK_IDENT, 'Expected iterator variable name');
  const iteratorName = iteratorTok ? iteratorTok.value : '_';

  // Expect "in"
  if (this._peek().type !== TT.TK_IN) {
    this.errors.push({
      code: 'E2011',
      severity: 'error',
      message: 'Expected "in" after iterator name',
      line: this._peek().line,
      column: this._peek().col,
      suggestion:
        'Syntax: Ulangi untuk item in $collection:  atau  Ulangi untuk i dari 1 sampai 10:',
    });
    return null;
  }
  this._advance(); // consume in

  // Source / range-start expression
  const source = this._parseExpression();

  // [FIX] Range loop: "Ulangi untuk i dari 1 sampai 10:"
  if (this._peek().type === TT.TK_SAMPAI) {
    this._advance(); // consume sampai/until

    const rangeEnd = this._parseExpression();

    this._expect(TT.TK_COLON, 'Expected ":" after range loop');

    const rangeLoc = this._makeLoc(startTok);
    const rangeBody = this._parseBlock();

    return AST.buatUlangiStatement(
      iteratorName,
      source,
      rangeBody,
      'rentang',
      rangeLoc,
      null,
      rangeEnd
    );
  }

  // Optional keyed diff suffix: "... dengan kunci <expr>:" (K1b), then optional
  // transition suffix "... dengan transisi <name>:" (K2a — requires a key).
  const keyExpr = this._tryParseDenganKunci();
  const transitionName = this._tryParseDenganTransisi();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after loop source');

  const loc = this._makeLoc(startTok);

  // Parse body block
  const body = this._parseBlock();

  return AST.buatUlangiStatement(
    iteratorName,
    source,
    body,
    'dari',
    loc,
    null,
    null,
    keyExpr,
    transitionName
  );
};

// --- Pass Statement ---
/**
 * Parse `lewati`/`pass` statement — empty body / skip.
 *
 * @returns {Object} AST node LewatiStatement
 */
PromptJSParser.prototype._parsePassStatement = function () {
  const tok = this._advance(); // consume pass/Lewati
  return AST.buatLewatiStatement(this._makeLoc(tok));
};

// --- Text Node (NEW — string literal as child) ---
/**
 * Parse text node — baris string literal sebagai child element.
 *
 * @returns {Object} AST node TextNode
 */
PromptJSParser.prototype._parseTextNode = function () {
  const tok = this._advance(); // consume STRING
  // TextNode is a special node type — we create it as a PropertyNode with key 'teks'
  // This is compatible with PromptJS's BuatStatement.properties.teks handling
  return {
    type: 'TextNode',
    loc: this._makeLoc(tok),
    value: tok.value,
  };
};

// --- On-Event Statement (synthesized into KetikaStatement) ---
/**
 * Parse `on_event = expr` line sebagai KetikaStatement.
 *
 * Resolusi alias event (`on_klik` → `click`) dilakukan di sini via `EVENT_ALIASES`.
 *
 * @returns {Object} AST node KetikaStatement
 */
PromptJSParser.prototype._parseOnEventStatement = function () {
  const startTok = this._advance(); // consume ON_EVENT
  let rawEventName = startTok.value; // e.g. "on_dikirim.cegah.hentikan"

  // v0.7: Parse modifiers from the event name string.
  // Lexer produces event name as "on_dikirim.cegah" (modifier embedded in string).
  //
  // v132 stabilization (P0.1): this loop previously silently DROPPED any
  // dot-suffix that wasn't in the valid-modifier list (including
  // recognizable-but-unimplemented names like `.capture`/`.passive`) with no
  // diagnostic at all — reuses the SAME two module-level modifier tables as
  // `_parseKetikaStatement` so the inline (`on_x.mod = ...`) and block
  // (`Ketika x.mod:`) forms can never drift out of sync on which modifiers
  // are recognized/supported again.
  const modifiers = [];
  if (rawEventName.includes('.')) {
    const parts = rawEventName.split('.');
    rawEventName = parts[0]; // The actual event name (e.g. "on_dikirim")
    for (let i = 1; i < parts.length; i++) {
      const mod = parts[i].toLowerCase();
      if (VALID_EVENT_MODIFIERS[mod]) {
        modifiers.push(mod);
      } else if (KNOWN_UNSUPPORTED_MODIFIERS[mod]) {
        this.warnings.push({
          code: 'W2005',
          severity: 'warning',
          message: `Event modifier ".${mod}" dikenal tapi belum diimplementasikan — tidak berpengaruh pada compile ini.`,
          line: startTok.line,
          column: startTok.col,
          suggestion:
            'Modifier yang didukung saat ini: .cegah/.prevent, .hentikan/.stop, .sekali/.once.',
        });
      }
      // Anything else (unrecognized dot-suffix) is silently ignored here,
      // unchanged from prior behavior — the lexer already committed the
      // entire "on_x.suffix" string as a single ON_EVENT token value by this
      // point, so there is no token-level backtrack available in this path
      // (unlike the block `Ketika` form). A completely unknown suffix most
      // likely indicates a typo in a modifier name; W2005 only fires for
      // names that match a KNOWN (but unimplemented) modifier vocabulary to
      // avoid false positives on unrelated dotted identifiers.
    }
  }

  // Map to PromptJS event name
  const promptjsEvent = EVENT_ALIASES[rawEventName] || rawEventName;

  // Expect =
  this._expect(TT.TK_ASSIGN, 'Expected "=" after event name');

  // v1.1: Inline fetch as event action.
  // `on_klik = ambil dari "url"` (± `: <branches>`) parses the RHS as a full
  // AmbilLuarStatement (external fetch), NOT an expression. The block-form
  // (`Ketika diklik:` newline `Ambil dari …:`) already worked; this closes the
  // inline-form gap so a developer can wire a fetch straight onto an event
  // without dropping to a nested block or vanilla JS.
  //
  // We detect `ambil`/`fetch` followed by `dari`/`from`/`in` (TK_IN). The
  // legacy DOM form (`ambil nilai dari elemen`) is intentionally NOT accepted
  // here — as an event action it is meaningless, so it falls through to the
  // expression path and errors as before (no silent behaviour change).
  let action;
  if (this._peek().type === TT.TK_AMBIL && this._peekAt(1).type === TT.TK_IN) {
    action = this._parseAmbilStatement();
  } else {
    // Parse action expression (default path — unchanged).
    action = this._parseExpression();
  }

  const loc = this._makeLoc(startTok);

  // Synthesize KetikaStatement with modifiers
  const node = AST.buatKetikaStatement(promptjsEvent, loc, null, null, null, action);
  if (modifiers.length > 0) {
    node.modifiers = modifiers;
  }
  return node;
};

// --- Property or Expression line ---
/**
 * Parse baris property `key = value` atau ekspresi standalone.
 *
 * Dispatch: jika current token adalah TK_IDENT dan next adalah TK_ASSIGN,
 * parse sebagai property (AttributeNode); jika tidak, parse sebagai ekspresi.
 *
 * @returns {Object | null} AST node AttributeNode atau expression node, atau `null` jika tidak ada
 */
PromptJSParser.prototype._parsePropertyOrExpr = function () {
  // Check if this is key = value
  if (this._peekAt(1).type === TT.TK_ASSIGN) {
    const keyTok = this._advance(); // consume key IDENT
    this._advance(); // consume =
    const value = this._parseExpression();
    return AST.buatPropertyNode(keyTok.value, value, this._makeLoc(keyTok), false);
  }

  // Otherwise it's an expression statement
  return this._parseExpression();
};

// --- Data declarations ---
/**
 * Parse deklarasi variabel — `Data`/`State`, `Tetap`/`Const`, `Ubah`/`Let`, `Turunan`/`Derived`.
 *
 * Sintaks: `<keyword> <nama> [: <typeHint>] [= <init>]`.
 *
 * @returns {Object} AST node DataDeclaration / TetapDeclaration / UbahDeclaration / TurunanDeclaration
 */
/**
 * Parse block-style data declaration body (YAML-style arrays/objects).
 * BUG-14: Handles indented content after `data nama:` such as:
 *   data daftarSederhana:
 *     - "a"
 *     - "b"
 *
 * @returns {Object} AST node (ArrayLiteral or ObjectLiteral)
 */
PromptJSParser.prototype._parseDataBlock = function () {
  if (this._peek().type !== TT.TK_INDENT) {
    return null;
  }
  this._advance(); // consume INDENT

  const items = [];
  const props = [];

  while (this._peek().type !== TT.TK_DEDENT && !this._atEnd()) {
    if (this._peek().type === TT.TK_MINUS) {
      // Array item: - "value" or - expression
      this._advance(); // consume -
      // Parse only a PRIMARY expression (not a full expression that would
      // consume subsequent TK_MINUS tokens as subtraction operators).
      const item = this._parsePrimaryExpression();
      items.push(item);
    } else if (
      this._peek().type === TT.TK_IDENT &&
      this._peekAt(1) &&
      this._peekAt(1).type === TT.TK_COLON
    ) {
      // Object property: key: value
      const keyTok = this._advance(); // consume key
      this._advance(); // consume :
      const val = this._parseExpression();
      props.push(AST.buatPropertyNode(String(keyTok.value), val, null, false));
    } else {
      // Skip unexpected tokens
      this._advance();
    }
  }

  if (this._peek().type === TT.TK_DEDENT) {
    this._advance(); // consume DEDENT
  }

  if (items.length > 0) {
    return AST.buatArrayLiteral(items, null);
  } else if (props.length > 0) {
    return AST.buatObjectLiteral(props, null);
  }
  return null;
};

PromptJSParser.prototype._parseDataDeclaration = function () {
  const kindTok = this._advance(); // consume keyword
  const keyword = kindTok.value.toLowerCase();

  // Parse name
  const nameTok = this._expect(TT.TK_IDENT, 'Expected variable name');
  const name = nameTok ? nameTok.value : '_';

  // Optional type hint: `name: typeHint = value` or `name = value`
  // BUG-05 FIX: Also handle `name: <expr>` where the colon is followed by
  // an expression that serves as the init value (no separate type hint).
  // This handles cases like `ubah positif: angka.saring(x => x > 3)`.
  let typeHint = null;
  let init = null;
  if (this._match(TT.TK_COLON)) {
    // BUG-14 FIX: Check if next token is TK_INDENT -> block-style data declaration
    // data daftarSederhana:
    //   - "a"
    //   - "b"
    if (this._peek().type === TT.TK_INDENT) {
      init = this._parseDataBlock();
    } else {
      // Peek ahead: if the next token is a single IDENT followed by =, it's a type hint.
      // Otherwise, the entire expression after : is the init value.
      const nextTok = this._peek();
      const nextNextTok = this._peekAt(1);
      if (
        nextTok &&
        nextTok.type === TT.TK_IDENT &&
        nextNextTok &&
        nextNextTok.type === TT.TK_ASSIGN
      ) {
        // It's a type hint: `name: typeHint = value`
        const hintTok = this._advance();
        typeHint = hintTok.value;
        this._advance(); // consume =
        init = this._parseExpression();
      } else {
        // No type hint — the entire expression after : is the init value
        init = this._parseExpression();
      }
    } // end of BUG-14 else block
  } else if (this._match(TT.TK_ASSIGN)) {
    init = this._parseExpression();
  }

  const loc = this._makeLoc(kindTok);

  switch (keyword) {
    case 'data':
    case 'state':
      return AST.buatDataDeclaration(name, typeHint, init, loc, null);
    case 'tetap':
    case 'const':
      return AST.buatTetapDeclaration(name, typeHint, init, loc, null);
    case 'ubah':
    case 'let':
      return AST.buatUbahDeclaration(name, typeHint, init, loc, null);
    case 'turunan':
    case 'derived':
      return AST.buatTurunanDeclaration(name, typeHint, init, loc, null);
    default:
      return AST.buatTetapDeclaration(name, typeHint, init, loc, null);
  }
};

// --- Fungsi Declaration ---
/**
 * Parse deklarasi fungsi `Fungsi <nama>(<params>): <body>`.
 *
 * @returns {Object} AST node FungsiDeclaration
 */
PromptJSParser.prototype._parseFungsiDeclaration = function () {
  const startTok = this._advance(); // consume Fungsi/Func
  const nameTok = this._expect(TT.TK_IDENT, 'Expected function name');
  const name = nameTok ? nameTok.value : '_fn';

  // Parse parameters
  const params = [];
  if (this._match(TT.TK_LPAREN)) {
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      const pTok = this._expect(TT.TK_IDENT, 'Expected parameter name');
      // Optional default value: `nama: <expr>`
      let pDefault = null;
      if (pTok && this._match(TT.TK_COLON)) {
        pDefault = this._parseExpression();
      }
      if (pTok) {
        params.push(AST.buatParameter(pTok.value, pTok.loc || null, null, pDefault));
      }
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")"');
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after function signature');

  const loc = this._makeLoc(startTok);
  const body = this._parseBlock();

  return AST.buatFungsiDeclaration(name, params, body, loc, null, null);
};

// --- Define Component ---
/**
 * Parse deklarasi komponen `Komponen <Name>(<params>): <body>` / `Definisikan <Name>(...):`.
 *
 * Tambahkan nama komponen ke `this.componentNames` untuk validasi `Gunakan`.
 *
 * @returns {Object} AST node KomponenDeclaration
 */
PromptJSParser.prototype._parseDefineComponent = function () {
  const startTok = this._advance(); // consume Definisikan/Define
  const nameTok = this._expect(TT.TK_IDENT, 'Expected component name');
  const name = nameTok ? nameTok.value : '_comp';

  // Register component name for disambiguation
  this.componentNames.add(name);

  // Parse parameters
  const params = [];
  if (this._match(TT.TK_LPAREN)) {
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      const pTok = this._expect(TT.TK_IDENT, 'Expected parameter name');
      // Optional default value: `nama: <expr>` (e.g. `varian: "primer"`)
      let pDefault = null;
      if (pTok && this._match(TT.TK_COLON)) {
        pDefault = this._parseExpression();
      }
      if (pTok) {
        params.push(AST.buatParameter(pTok.value, pTok.loc || null, null, pDefault));
      }
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")"');
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after component definition');

  const loc = this._makeLoc(startTok);
  const body = this._parseBlock();

  return AST.buatKomponenDeclaration(name, params, body, loc, null, null);
};

// --- Saat Statement ---
/**
 * Parse `Saat`/`When` statement — reactive watcher terhadap data reaktif.
 *
 * Sintaks: `Saat <target>: <body>`.
 *
 * @returns {Object} AST node SaatStatement
 */
PromptJSParser.prototype._parseSaatStatement = function () {
  const startTok = this._advance(); // consume Saat/When

  // Parse target (the reactive variable being watched)
  const target = this._parseExpression();

  // [BUG-02 FIX] Accept optional "berubah"/"changes" keyword after target.
  // The documentation lists `Saat tema berubah:` as valid syntax, but the
  // parser previously rejected it because it expected ':' immediately after
  // the target expression. Now we consume the optional keyword.
  const nextTok = this._peek();
  if (
    nextTok &&
    nextTok.type === TT.TK_IDENT &&
    (nextTok.value === 'berubah' || nextTok.value === 'changes')
  ) {
    this._advance(); // consume berubah/changes
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after saat target');

  const loc = this._makeLoc(startTok);
  const body = this._parseBlock();

  return AST.buatSaatStatement(target, body, loc, null);
};

// --- Return Statement ---
/**
 * Parse `Kembalikan`/`Return` statement — return dengan opsional ekspresi nilai.
 *
 * @returns {Object} AST node KembalikanStatement
 */
PromptJSParser.prototype._parseReturnStatement = function () {
  const startTok = this._advance(); // consume Kembalikan/Return
  let value = null;
  if (
    this._peek().type !== TT.TK_COLON &&
    this._peek().type !== TT.TK_INDENT &&
    this._peek().type !== TT.TK_DEDENT
  ) {
    value = this._parseExpression();
  }
  return AST.buatKembalikanStatement(this._makeLoc(startTok), value);
};

// --- Expression parsing (Pratt-style, simplified) ---
/**
 * Entry point parsing ekspresi — delegate ke `_parseBinaryExpression(0)`.
 *
 * @returns {Object} AST node expression
 */
PromptJSParser.prototype._parseExpression = function () {
  // LOW-4: lindungi dari rekursi ekspresi yang terlalu dalam (stack overflow).
  // Entry terluar (depth 0 → 1) menangkap sentinel agar parser memancarkan
  // E2029 dan tetap mengembalikan node, bukan melempar RangeError mentah.
  const isOutermost = this._exprDepth === 0;
  this._exprDepth++;
  if (this._exprDepth > PromptJSParser.MAX_EXPR_DEPTH) {
    this._exprDepth--;
    throw EXPR_DEPTH_EXCEEDED;
  }
  try {
    const test = this._parseBinaryExpression(0);

    // Ternary conditional: test ? consequent : alternate (right-associative).
    if (this._peek().type === TT.TK_QUESTION) {
      const qTok = this._advance(); // consume "?"
      const consequent = this._parseExpression();
      this._expect(TT.TK_COLON, 'Expected ":" in ternary expression');
      const alternate = this._parseExpression();
      return AST.buatConditionalExpression(test, consequent, alternate, this._makeLoc(qTok));
    }

    return test;
  } catch (err) {
    if (err === EXPR_DEPTH_EXCEEDED) {
      if (isOutermost) {
        const tok = this._peek();
        this.errors.push({
          code: 'E2029',
          severity: 'error',
          message: `Ekspresi terlalu dalam (melebihi batas kedalaman ${PromptJSParser.MAX_EXPR_DEPTH})`,
          line: tok ? tok.line : 0,
          column: tok ? tok.col : 0,
          suggestion: 'Sederhanakan ekspresi atau pecah menjadi beberapa langkah/variabel.',
        });
        // Kembalikan node literal placeholder agar caller tetap mendapat AST valid.
        return AST.buatLiteral(null, 'null', this._makeLoc(tok || this._peek()));
      }
      throw err; // teruskan ke entry terluar
    }
    throw err;
  } finally {
    this._exprDepth--;
  }
};

/**
 * Parse ekspresi biner dengan precedence climbing.
 *
 * Algoritma: parse operan kiri via `_parseUnaryExpression`, lalu selama
 * current token adalah operator dengan precedence >= `minPrec`, consume
 * operator, parse operan kanan via rekursi `_parseBinaryExpression(prec + 1)`,
 * gabungkan keduanya ke BinaryExpression. Implementasi standard untuk
 * left-associative operators.
 *
 * @param {number} minPrec - Minimum precedence yang akan dikonsumsi (0 = semua)
 * @returns {Object} AST node expression
 */
PromptJSParser.prototype._parseBinaryExpression = function (minPrec) {
  let left = this._parseUnaryExpression();

  const PRECEDENCE = {
    [TT.TK_OR]: 1,
    [TT.TK_AND]: 2,
    [TT.TK_EQ]: 3,
    [TT.TK_NEQ]: 3,
    [TT.TK_GT]: 4,
    [TT.TK_GTE]: 4,
    [TT.TK_LT]: 4,
    [TT.TK_LTE]: 4,
    // String/collection membership operators — comparison precedence
    [TT.TK_BERISI]: 4,
    [TT.TK_DIAWALI]: 4,
    [TT.TK_DIAKHIRI]: 4,
    [TT.TK_PLUS]: 5,
    [TT.TK_MINUS]: 5,
    [TT.TK_STAR]: 6,
    [TT.TK_SLASH]: 6,
    [TT.TK_MOD]: 6,
    [TT.TK_POW]: 7,
  };

  while (true) {
    const opTok = this._peek();
    const prec = PRECEDENCE[opTok.type];
    if (!prec || prec < minPrec) break;

    this._advance(); // consume operator
    // `**` is right-associative; everything else is left-associative.
    const nextMin = opTok.type === TT.TK_POW ? prec : prec + 1;
    const right = this._parseBinaryExpression(nextMin);

    // Map operator token to JS operator string
    const opMap = {
      [TT.TK_PLUS]: '+',
      [TT.TK_MINUS]: '-',
      [TT.TK_STAR]: '*',
      [TT.TK_SLASH]: '/',
      [TT.TK_MOD]: '%',
      [TT.TK_POW]: '**',
      [TT.TK_GT]: '>',
      [TT.TK_GTE]: '>=',
      [TT.TK_LT]: '<',
      [TT.TK_LTE]: '<=',
      [TT.TK_EQ]: '===',
      [TT.TK_NEQ]: '!==',
      [TT.TK_AND]: '&&',
      [TT.TK_OR]: '||',
      // String/collection membership — kept as named operators; lowered to
      // method calls (.includes/.startsWith/.endsWith) in expression lowering.
      [TT.TK_BERISI]: 'berisi',
      [TT.TK_DIAWALI]: 'diawali',
      [TT.TK_DIAKHIRI]: 'diakhiri',
    };
    const opStr = opMap[opTok.type] || opTok.value;

    left = AST.buatBinaryExpression(opStr, left, right, this._makeLoc(opTok));
  }

  return left;
};

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

/**
 * Parse primary expression — atom ekspresi (literal, identifier, grup, object/array literal).
 *
 * Mendukung:
 * - Literal: TK_NUMBER, TK_STRING, TK_TRUE, TK_FALSE, TK_NULL
 * - Identifier: TK_IDENT (termasuk external ref `$name`)
 * - Grup: `(` expr `)`
 * - Object literal: `{ k: v, ... }`
 * - Array literal: `[a, b, c]`
 * - Ternary: `test ? consequent : alternate` (right-associative)
 *
 * Jika tidak ada yang cocok, laporkan error `E2020` dan kembalikan literal null.
 *
 * @returns {Object} AST node expression
 */
PromptJSParser.prototype._parsePrimaryExpression = function () {
  const tok = this._peek();

  // String literal
  if (tok.type === TT.TK_STRING) {
    this._advance();
    return AST.buatLiteral(tok.value, 'string', this._makeLoc(tok));
  }

  // Number literal
  if (tok.type === TT.TK_NUMBER) {
    this._advance();
    return AST.buatLiteral(tok.value, 'number', this._makeLoc(tok));
  }

  // Boolean literals: benar/true → true, salah/false → false
  if (tok.type === TT.TK_BENAR) {
    this._advance();
    return AST.buatLiteral(true, 'boolean', this._makeLoc(tok));
  }
  if (tok.type === TT.TK_SALAH) {
    this._advance();
    return AST.buatLiteral(false, 'boolean', this._makeLoc(tok));
  }

  // Null literal: kosong/null → null
  if (tok.type === TT.TK_KOSONG) {
    this._advance();
    return AST.buatLiteral(null, 'null', this._makeLoc(tok));
  }

  // External reference: $name.path
  if (tok.type === TT.TK_EXT_REF) {
    this._advance();
    const parts = tok.value.substring(1).split('.'); // strip $, split by dot
    let expr = AST.buatIdentifier(parts[0], this._makeLoc(tok));
    expr._isExternal = true; // Flag for resolver patch
    for (let i = 1; i < parts.length; i++) {
      expr = AST.buatMemberExpression(expr, AST.buatIdentifier(parts[i], null), null);
      expr._isExternal = true;
    }
    return expr;
  }

  // Identifier or keyword-as-identifier (or arrow function: x => expr)
  if (tok.type === TT.TK_IDENT) {
    this._advance();
    // BUG-05 FIX: Check if this is a single-param arrow function (x => expr)
    if (this._peek().type === TT.TK_ARROW) {
      this._advance(); // consume =>
      const params = [AST.buatIdentifier(tok.value, this._makeLoc(tok))];
      const body = this._parseExpression();
      return AST.buatArrowFunctionExpression(params, body, this._makeLoc(tok), true);
    }
    return AST.buatIdentifier(tok.value, this._makeLoc(tok));
  }

  // ─── Wave G: action keywords as expression values ─────────────────
  // These keywords can appear after `on_klik = <keyword>` and need to
  // be lowered to JS by the expression lowerer.
  if (tok.type === TT.TK_MUAT_ULANG) {
    this._advance();
    return { type: 'MuatUlangStatement', loc: this._makeLoc(tok) };
  }
  if (tok.type === TT.TK_KEMBALI) {
    this._advance();
    return { type: 'KembaliStatement', loc: this._makeLoc(tok) };
  }
  if (tok.type === TT.TK_BERHENTI) {
    this._advance();
    return { type: 'BerhentiStatement', loc: this._makeLoc(tok) };
  }
  // For target-action keywords, parse as a call with target
  if (
    tok.type === TT.TK_SEMBUNYIKAN ||
    tok.type === TT.TK_HAPUS ||
    tok.type === TT.TK_KOSONGKAN ||
    tok.type === TT.TK_TAMPILKAN ||
    tok.type === TT.TK_ARAHKAN
  ) {
    const kwTok = this._advance();
    // LIM-2 FIX: "arahkan ke <url>" — optional "ke" after arahkan (inline expression path)
    if (kwTok.type === TT.TK_ARAHKAN && this._peek().type === TT.TK_KE) {
      this._advance(); // consume optional "ke"
    }
    const target = this._parseExpression();
    const loc = this._makeLoc(kwTok);
    // v1.0: "hapus <item> dari <array>" → HapusDariStatement (inline expression path)
    if (kwTok.type === TT.TK_HAPUS && this._peek() && this._peek().type === TT.TK_IN) {
      this._advance(); // consume dari/from
      const fromArray = this._parseExpression();
      return AST.buatHapusDariStatement(target, fromArray, loc, null);
    }
    // Use AST factory functions for proper property names (url vs target, etc.)
    if (kwTok.type === TT.TK_ARAHKAN) return AST.buatArahkanStatement(target, loc, null);
    if (kwTok.type === TT.TK_SEMBUNYIKAN) return AST.buatSembunyikanStatement(target, loc, null);
    if (kwTok.type === TT.TK_HAPUS) return AST.buatHapusStatement(target, loc, null);
    if (kwTok.type === TT.TK_KOSONGKAN) return AST.buatKosongkanStatement(target, loc, null);
    if (kwTok.type === TT.TK_TAMPILKAN) return AST.buatTampilkanStatement(target, loc, null);
    // Fallback
    return { type: 'ArahkanStatement', loc, target };
  }
  // simpan/tambahkan/kurangi/sisipkan as expression: parse value + ke + target
  if (
    tok.type === TT.TK_SIMPAN ||
    tok.type === TT.TK_TAMBAHKAN ||
    tok.type === TT.TK_KURANGI ||
    tok.type === TT.TK_SISIPKAN
  ) {
    const kwTok = this._advance();
    const kind = kwTok.value.toLowerCase();
    if (kind === 'kurangi' || kind === 'remove') {
      // Two forms: "kurangi target" (decrement by 1) or "kurangi value dari target" (subtract value)
      const firstArg = this._parseExpression();
      // Check if "dari/from/in" follows → "kurangi <value> dari <target>"
      if (this._peek() && this._peek().type === TT.TK_IN) {
        this._advance(); // consume dari/from/in
        const target = this._parseExpression();
        return { type: 'KurangiStatement', loc: this._makeLoc(kwTok), target, value: firstArg };
      }
      // LIM-4 FIX: detect "kurangi <literal> ke <target>" — invalid form (inline path)
      if (this._peek() && this._peek().type === TT.TK_KE && firstArg.type === 'Literal') {
        this._advance(); // consume ke
        this._parseExpression(); // consume the mistaken target
        const errorLoc = this._makeLoc(kwTok);
        this.errors.push({
          code: 'E2020',
          severity: 'error',
          stage: 'Parser',
          message:
            'Sintaks "kurangi <nilai> ke <target>" tidak valid. Gunakan "kurangi <nilai> dari <target>" untuk mengurangi nilai dari target.',
          pesan:
            'Sintaks "kurangi <nilai> ke <target>" tidak valid. Gunakan "kurangi <nilai> dari <target>" untuk mengurangi nilai dari target.',
          suggestion: 'Gunakan "kurangi <nilai> dari <target>", mis. "kurangi 5 dari hitung".',
          saran: 'Gunakan "kurangi <nilai> dari <target>", mis. "kurangi 5 dari hitung".',
          loc: errorLoc,
        });
        return { type: 'ErrorNode', loc: errorLoc };
      }
      // "kurangi target" → decrement by 1
      return { type: 'KurangiStatement', loc: this._makeLoc(kwTok), target: firstArg };
    }
    let value = this._parseExpression();
    // BUG-16 FIX: Support space-separated method arguments in inline simpan
    if (this._peek() && this._peek().type !== TT.TK_KE) {
      if (value && (value.type === 'MemberExpression' || value.type === 'Identifier')) {
        const args = [];
        while (this._peek() && this._peek().type !== TT.TK_KE && !this._atEnd()) {
          const arg = this._parseExpression();
          args.push(arg);
        }
        if (args.length > 0) {
          value = {
            type: 'CallExpression',
            callee: value,
            arguments: args,
            loc: value.loc,
          };
        }
      }
    }
    if (this._peek().type === TT.TK_KE) {
      this._advance();
      const target = this._parseExpression();
      const nodeTypeMap = {
        simpan: 'SimpanStatement',
        tambahkan: 'TambahkanStatement',
        sisipkan: 'SisipkanStatement',
      };
      return {
        type: nodeTypeMap[kind] || 'SimpanStatement',
        loc: this._makeLoc(kwTok),
        value,
        target,
        kind,
      };
    }
    return { type: 'SimpanStatement', loc: this._makeLoc(kwTok), value, target: null, kind };
  }
  // jalankan as expression
  if (tok.type === TT.TK_JALANKAN) {
    this._advance();
    const calleeTok = this._expect(TT.TK_IDENT, 'Expected function name after "jalankan"');
    const callee = calleeTok
      ? AST.buatIdentifier(calleeTok.value, null)
      : AST.buatIdentifier('_', null);
    const args = [];
    if (this._peek().type === TT.TK_LPAREN) {
      this._advance();
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        args.push(this._parseExpression());
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")"');
    }
    return AST.buatJalankanExpression(callee, 'jalankan', null, null, args);
  }
  // perbarui as expression
  if (tok.type === TT.TK_PERBARUI) {
    this._advance();
    const propTok = this._expect(TT.TK_IDENT, 'Expected property name after "perbarui"');
    const property = propTok ? propTok.value : 'teks';
    const target = this._parseExpression();
    let value = null;
    if (this._match(TT.TK_COLON)) {
      value = this._parseExpression();
    }
    return { type: 'PerbaruiStatement', loc: null, property, target, value };
  }

  // Parenthesized expression OR arrow function params: (x, y) => expr
  if (tok.type === TT.TK_LPAREN) {
    this._advance();
    // BUG-05 FIX: Check if this is an arrow function by looking for pattern: (id, id, ...) =>
    // Save position for backtracking
    const savedPos = this.pos;
    const savedTokens = this.tokens.slice();
    const possibleParams = [];
    let isArrow = false;
    try {
      // Try to parse as parameter list
      if (this._peek().type === TT.TK_RPAREN) {
        // () => expr  (zero params)
        this._advance(); // consume )
        if (this._peek().type === TT.TK_ARROW) {
          isArrow = true;
        }
      } else if (this._peek().type === TT.TK_IDENT) {
        // Parse comma-separated identifiers
        while (true) {
          if (this._peek().type !== TT.TK_IDENT) break;
          const paramTok = this._advance();
          possibleParams.push(AST.buatIdentifier(paramTok.value, this._makeLoc(paramTok)));
          if (this._peek().type === TT.TK_COMMA) {
            this._advance(); // consume comma
          } else {
            break;
          }
        }
        if (this._peek().type === TT.TK_RPAREN) {
          this._advance(); // consume )
          if (this._peek().type === TT.TK_ARROW) {
            isArrow = true;
          }
        }
      }
    } catch {
      // Not an arrow function, will backtrack
    }
    if (isArrow) {
      // It IS an arrow function: (x, y) => expr
      this._advance(); // consume =>
      const body = this._parseExpression();
      return AST.buatArrowFunctionExpression(possibleParams, body, this._makeLoc(tok), true);
    }
    // Not an arrow function — backtrack and parse as parenthesized expression
    this.pos = savedPos;
    this.tokens = savedTokens;
    const expr = this._parseExpression();
    this._expect(TT.TK_RPAREN, 'Expected ")"');
    return expr;
  }

  // Array literal
  if (tok.type === TT.TK_LBRACKET) {
    this._advance();
    const elems = [];
    while (this._peek().type !== TT.TK_RBRACKET && !this._atEnd()) {
      elems.push(this._parseExpression());
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RBRACKET, 'Expected "]"');
    return AST.buatArrayLiteral(elems, null);
  }

  // Object literal
  if (tok.type === TT.TK_LBRACE) {
    this._advance();
    const props = [];
    while (this._peek().type !== TT.TK_RBRACE && !this._atEnd()) {
      // Keys may be identifiers, string literals ("a-b") or numbers.
      const keyPeek = this._peek();
      let keyTok;
      if (
        keyPeek.type === TT.TK_IDENT ||
        keyPeek.type === TT.TK_STRING ||
        keyPeek.type === TT.TK_NUMBER
      ) {
        keyTok = this._advance();
      } else {
        this.errors.push({
          code: 'E2001',
          severity: 'error',
          message: `Expected property key (identifier or string), got ${keyPeek.type}`,
          line: keyPeek.line,
          column: keyPeek.col,
          suggestion: 'Gunakan nama properti atau string sebagai kunci objek.',
        });
        break;
      }
      if (!this._match(TT.TK_COLON) && !this._match(TT.TK_ASSIGN)) break;
      const val = this._parseExpression();
      if (keyTok) props.push(AST.buatPropertyNode(String(keyTok.value), val, null, false));
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RBRACE, 'Expected "}"');
    return AST.buatObjectLiteral(props, null);
  }

  // Fallback: skip and report
  this._advance();
  // [DX-1 FIX] Human-readable E2020: show the offending source text (`tok.value`)
  // instead of leaking the internal token name (`TK_BUAT`), and always attach an
  // actionable Saran. The `_hadFatalParseError` flag lets the resolver suppress
  // the misleading cascade (e.g. a phantom E3001 "span tidak dideklarasikan").
  const shown =
    tok.value !== undefined && tok.value !== null && String(tok.value).length > 0
      ? `"${tok.value}"`
      : 'token tidak terduga';
  this._hadFatalParseError = true;
  this.errors.push({
    code: 'E2020',
    severity: 'error',
    message: `Token tidak terduga ${shown} di baris ${tok.line}. Kemungkinan blok sebelumnya kosong atau kurang isi/label.`,
    line: tok.line,
    column: tok.col,
    suggestion:
      'Pastikan blok sebelumnya memiliki isi (mis. label/teks setelah ":"), atau periksa sintaks di sekitar posisi ini.',
  });
  return AST.buatLiteral(null, 'null', null);
};

// ─── Wave G: Action statement parsers ───────────────────────────────────

/**
 * Parse standalone keyword statement (berhenti, muat ulang, kembali).
 * No arguments — just consume the keyword and return the AST node.
 */
PromptJSParser.prototype._parseSimpleStatement = function (nodeType) {
  const tok = this._advance();
  const loc = this._makeLoc(tok);
  switch (nodeType) {
    case 'BerhentiStatement':
      return AST.buatBerhentiStatement(loc);
    case 'MuatUlangStatement':
      return AST.buatMuatUlangStatement(loc);
    case 'KembaliStatement':
      return AST.buatKembaliStatement(loc);
    default:
      return { type: nodeType, loc };
  }
};

/**
 * Parse lifecycle hook (dipasang:, dilepas:).
 * `dipasang:` / `dilepas:` → block body.
 */
PromptJSParser.prototype._parseLifecycleStatement = function (kind) {
  const tok = this._advance();
  this._expect(TT.TK_COLON, 'Expected ":" after lifecycle keyword');
  const loc = this._makeLoc(tok);
  const body = this._parseBlock();
  return AST.buatLifecycleStatement(kind, body, loc, null);
};

/**
 * Parse `hapus` statement with two forms:
 * 1. `hapus <storage>.<key>` → HapusStatement (localStorage/sessionStorage removal)
 * 2. `hapus <item> dari <array>` → HapusDariStatement (array item removal)
 */
PromptJSParser.prototype._parseHapusStatement = function () {
  const tok = this._advance();
  const item = this._parseExpression();
  const loc = this._makeLoc(tok);

  // Check if next token is `dari` / `from` (TK_IN)
  // "hapus item dari daftar" → HapusDariStatement
  if (this._peek() && this._peek().type === TT.TK_IN) {
    this._advance(); // consume dari/from
    const fromArray = this._parseExpression();
    return AST.buatHapusDariStatement(item, fromArray, loc, null);
  }

  // Otherwise: "hapus localStorage.token" → HapusStatement
  return AST.buatHapusStatement(item, loc, null);
};

/**
 * Parse single-target statement (sembunyikan, hapus, kosongkan, arahkan).
 * `<keyword> <target>` where target is an expression (Identifier, Selector, etc.)
 */
PromptJSParser.prototype._parseTargetStatement = function (nodeType) {
  const tok = this._advance();
  // LIM-2 FIX: "arahkan ke <url>" — optional "ke" after arahkan
  if (nodeType === 'ArahkanStatement' && this._peek().type === TT.TK_KE) {
    this._advance(); // consume optional "ke"
  }
  const target = this._parseExpression();
  const loc = this._makeLoc(tok);
  switch (nodeType) {
    case 'SembunyikanStatement':
      return AST.buatSembunyikanStatement(target, loc, null);
    case 'HapusStatement':
      return AST.buatHapusStatement(target, loc, null);
    case 'KosongkanStatement':
      return AST.buatKosongkanStatement(target, loc, null);
    case 'ArahkanStatement':
      return AST.buatArahkanStatement(target, loc, null);
    default:
      return { type: nodeType, loc, target };
  }
};

/**
 * Parse `tampilkan` statement.
 * `tampilkan <target>` or `tampilkan <target> di <mountTarget>` or
 * `tampilkan <target> dengan mode <mode>`
 */
PromptJSParser.prototype._parseTampilkanStatement = function () {
  const tok = this._advance();
  const target = this._parseExpression();
  const loc = this._makeLoc(tok);
  const mountTarget = null;
  const mode = null;
  const messageKind = null;

  // Optional `di <mountTarget>` — but `di` is not a keyword, so we check
  // if next token is TK_IDENT with value 'di'. For now, keep it simple.
  // Mode is also optional — skip complex parsing for now.

  return AST.buatTampilkanStatement(target, loc, null, mountTarget, mode, messageKind);
};

/**
 * Parse `simpan` / `tambahkan` / `kurangi` / `sisipkan` statement.
 * `simpan <value> ke <target>` — SimpanStatement
 * `tambahkan <value> ke <target>` — TambahkanStatement
 * `kurangi <target>` or `kurangi <target> ke <value>` — KurangiStatement
 * `sisipkan <value> ke <target>` — SisipkanStatement
 */
PromptJSParser.prototype._parseSimpanStatement = function () {
  const tok = this._advance();
  const kind = tok.value.toLowerCase();
  const loc = this._makeLoc(tok);

  if (kind === 'kurangi' || kind === 'remove') {
    // Three forms (statement position):
    //   1. `kurangi <target>`              → decrement by 1
    //   2. `kurangi <target> ke <value>`   → subtract <value> from <target>
    //   3. `kurangi <value> dari <target>` → subtract <value> from <target>
    // Form 3 (S2-BUG-1): the FIRST expression is the VALUE and the target
    // follows `dari`/`from`/`in` (TK_IN). Without this branch the parser
    // mis-mapped `kurangi 1 dari hitung` as target=`1`, silently dropping
    // `dari hitung` → emitter produced `__setState(document, 1 - 1)`.
    //
    // LIM-4 FIX: `kurangi <value> ke <target>` is NOT a valid form.
    // If firstArg is a literal (number/string) and next is `ke`, the user
    // likely meant `kurangi <value> dari <target>`. Emit E2020 with suggestion.
    const firstArg = this._parseExpression();
    if (this._peek().type === TT.TK_IN) {
      this._advance(); // consume dari/from/in
      const target = this._parseExpression();
      // firstArg is the value being subtracted; target is what we mutate.
      return AST.buatKurangiStatement(target, loc, null, firstArg);
    }
    // LIM-4: detect `kurangi <literal> ke <target>` — invalid form
    if (this._peek().type === TT.TK_KE && firstArg.type === 'Literal') {
      this._advance(); // consume ke
      this._parseExpression(); // consume the mistaken target (advance past it)
      this.errors.push({
        code: 'E2020',
        severity: 'error',
        stage: 'Parser',
        message:
          'Sintaks "kurangi <nilai> ke <target>" tidak valid. Gunakan "kurangi <nilai> dari <target>" untuk mengurangi nilai dari target.',
        pesan:
          'Sintaks "kurangi <nilai> ke <target>" tidak valid. Gunakan "kurangi <nilai> dari <target>" untuk mengurangi nilai dari target.',
        suggestion: 'Gunakan "kurangi <nilai> dari <target>", mis. "kurangi 5 dari hitung".',
        saran: 'Gunakan "kurangi <nilai> dari <target>", mis. "kurangi 5 dari hitung".',
        loc: loc,
      });
      return { type: 'ErrorNode', loc: loc };
    }
    let value = null;
    if (this._peek().type === TT.TK_KE) {
      this._advance();
      value = this._parseExpression();
    }
    // Form 1/2: firstArg is the target.
    return AST.buatKurangiStatement(firstArg, loc, null, value);
  }

  // simpan/tambahkan/sisipkan <value> ke <target>
  // BUG-16 FIX: Support space-separated method arguments.
  // "simpan teks.apakahAda "World" ke hasil" — after parsing the MemberExpression
  // for the value, if the next token is not TK_KE and looks like an argument,
  // wrap the value into a CallExpression.
  let value = this._parseExpression();
  // Collect space-separated arguments until we hit TK_KE
  if (this._peek() && this._peek().type !== TT.TK_KE) {
    // Check if value is a method reference (MemberExpression) that might need args
    if (value && (value.type === 'MemberExpression' || value.type === 'Identifier')) {
      const args = [];
      while (this._peek() && this._peek().type !== TT.TK_KE && !this._atEnd()) {
        const arg = this._parseExpression();
        args.push(arg);
      }
      if (args.length > 0) {
        // Wrap value + args into a CallExpression
        value = {
          type: 'CallExpression',
          callee: value,
          arguments: args,
          loc: value.loc,
        };
      }
    }
  }
  this._expect(TT.TK_KE, 'Expected "ke" after value in simpan/tambahkan/sisipkan');
  const target = this._parseExpression();

  if (kind === 'tambahkan' || kind === 'append') {
    return AST.buatTambahkanStatement(value, target, loc, null);
  }
  if (kind === 'sisipkan' || kind === 'insert') {
    return AST.buatSisipkanStatement(value, target, loc, null);
  }
  // Default: simpan
  return AST.buatSimpanStatement(value, target, 'simpan', loc, null);
};

/**
 * Parse `perbarui` statement.
 * `perbarui <property> <target> -> <value>` or
 * `perbarui <property> <target>: <value>`
 */
PromptJSParser.prototype._parsePerbaruiStatement = function () {
  const tok = this._advance();
  const loc = this._makeLoc(tok);

  // Parse property name (identifier)
  const propTok = this._expect(TT.TK_IDENT, 'Expected property name after "perbarui"');
  const property = propTok ? propTok.value : 'teks';

  // Parse target expression
  const target = this._parseExpression();

  // Expect -> or : for value
  let value;
  if (this._match(TT.TK_COLON)) {
    value = this._parseExpression();
  } else {
    // Try to parse value as expression (flexible syntax)
    value = this._parseExpression();
  }

  return AST.buatPerbaruiStatement(property, target, value, loc, null);
};

/**
 * Parse `gunakan` statement (component instantiation).
 * `gunakan <ComponentName>` or `gunakan <ComponentName> dengan <prop>: <val>, ...`
 */
PromptJSParser.prototype._parseGunakanStatement = function () {
  const tok = this._advance();
  const loc = this._makeLoc(tok);

  // Component name (PascalCase identifier)
  const nameTok = this._expect(TT.TK_IDENT, 'Expected component name after "gunakan"');
  const componentName = nameTok ? nameTok.value : '_';

  // LIM-1 FIX: Optional props in parentheses — "Gunakan Nama(prop: val, prop2: val2)"
  // Mirrors the Buat Nama(prop: val) syntax already supported in _parseBuatStatement.
  let props = null;
  if (this._peek().type === TT.TK_LPAREN) {
    this._advance(); // consume (
    props = [];
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      const keyTok = this._expect(TT.TK_IDENT, 'Expected property name in component props');
      this._expect(TT.TK_COLON, 'Expected ":" after property name');
      const valExpr = this._parseExpression();
      if (keyTok) props.push({ key: keyTok.value, value: valExpr });
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")" to close component props');
  }

  // v132 stabilization (P0.7): `Gunakan NamaKomponen(...):` followed by an
  // indented child block used to be silently accepted here — this function
  // returned immediately without ever looking at the trailing `:`/INDENT,
  // so the child block was left in the token stream and parsed by the
  // ENCLOSING block as ordinary SIBLING statements, positioned next to (not
  // inside) the component instance, with no error or warning at all. Since
  // slots/transclusion (#82) are NOT implemented, a child block here can
  // never actually be rendered as part of the component — surface E2030
  // instead of silently miscompiling. The colon and its block ARE consumed
  // (so parsing can continue cleanly), but the block's statements are
  // deliberately discarded (not attached to the returned GunakanStatement
  // and not left for the enclosing block to pick up as siblings) so nothing
  // is silently rendered in the wrong place.
  if (this._peek().type === TT.TK_COLON) {
    const colonTok = this._peek();
    const savedPos = this.pos;
    this._advance(); // consume the colon
    if (this._peek().type === TT.TK_INDENT) {
      this._parseBlock(); // consume + discard the child block's tokens
      this.errors.push({
        code: 'E2030',
        severity: 'error',
        message: `"Gunakan ${componentName}(...):" dengan blok anak (child block) belum didukung — slot/transklusi belum diimplementasikan (backlog #82).`,
        line: colonTok.line,
        column: colonTok.col,
        suggestion:
          'Slot/transklusi belum didukung (backlog #82). Gunakan "Gunakan NamaKomponen(...)" tanpa blok anak, atau pindahkan konten ke dalam definisi komponen.',
      });
    } else {
      // A trailing colon with NO indented block (e.g. "Gunakan Nama(...):"
      // on its own with nothing indented under it) is harmless — same as
      // today, restore position so the colon is simply not consumed as
      // part of this statement (matches prior behavior for this sub-case).
      this.pos = savedPos;
    }
  }

  return AST.buatGunakanStatement(componentName, loc, null, props, null);
};

/**
 * Parse `ketika` statement (event handler with explicit target).
 * `ketika <target> <event>: <body>` or `ketika <target> <event> -> <action>`
 * Simplified: `ketika <event>: <body>`
 */
PromptJSParser.prototype._parseKetikaStatement = function () {
  const tok = this._advance();
  const loc = this._makeLoc(tok);

  // Parse event name (identifier)
  const eventTok = this._expect(TT.TK_IDENT, 'Expected event name after "ketika"');
  const event = eventTok ? eventTok.value : 'diklik';

  // BUG-09 FIX: Parse event modifiers (.cegah, .hentikan, .sekali, etc.)
  // "Ketika diklik .cegah:" → event="diklik", modifiers=["cegah"]
  //
  // v132 stabilization (P0.1): the original backtrack below referenced
  // `this._pos` (undefined field — the real position counter is `this.pos`),
  // so it was always a no-op; a DOT consumed while probing an invalid
  // modifier was never actually put back. This accidentally still worked for
  // the common case (a bare-identifier target immediately after the DOT),
  // but the DOT itself was silently dropped from the token stream — fixed to
  // use the correct field name so the backtrack genuinely restores position.
  const modifiers = [];
  while (this._peek().type === TT.TK_DOT) {
    const dotPos = this.pos; // position of THIS dot, restored on backtrack
    this._advance(); // consume DOT
    const modTok = this._peek();
    const modName = modTok.type === TT.TK_IDENT ? modTok.value.toLowerCase() : null;
    if (modName && VALID_EVENT_MODIFIERS[modName]) {
      this._advance(); // consume modifier name
      modifiers.push(modName);
    } else if (modName && KNOWN_UNSUPPORTED_MODIFIERS[modName]) {
      // v132 stabilization (P0.1): a recognizable-but-unimplemented
      // modifier name (e.g. .capture/.passive) must NOT be silently
      // swallowed as if it were a target expression — surface W2005 so
      // the developer knows it has NO effect, instead of guessing.
      this._advance(); // consume the modifier-looking identifier
      this.warnings.push({
        code: 'W2005',
        severity: 'warning',
        message: `Event modifier ".${modName}" dikenal tapi belum diimplementasikan — tidak berpengaruh pada compile ini.`,
        line: modTok.line,
        column: modTok.col,
        suggestion:
          'Modifier yang didukung saat ini: .cegah/.prevent, .hentikan/.stop, .sekali/.once.',
      });
    } else {
      // Not a modifier at all — this DOT is part of a target expression.
      // Backtrack to just before THIS dot (modifiers already consumed in
      // earlier loop iterations, if any, remain consumed) so target parsing
      // below sees the untouched `.member` token sequence.
      this.pos = dotPos;
      break;
    }
  }

  // Optional target
  let target = null;
  if (this._peek().type === TT.TK_IDENT && this._peek().value !== 'diklik') {
    target = this._parseExpression();
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after ketika event');

  const body = this._parseBlock();

  const node = AST.buatKetikaStatement(event, loc, null, target, body, null);
  if (modifiers.length > 0) {
    node.modifiers = modifiers;
  }
  return node;
};

/**
 * Parse `ambil` statement (fetch from DOM or URL).
 * Simplified: `ambil <kind> dari <source> ke <target>`
 */
PromptJSParser.prototype._parseAmbilStatement = function () {
  const tok = this._advance(); // consume "ambil"/"fetch"
  const loc = this._makeLoc(tok);

  // v0.7: Detect "Ambil dari URL:" (AmbilLuar) vs "ambil nilai dari elemen" (AmbilDom)
  // "Ambil dari" = next word is TK_IN (dari/from/in) → AmbilLuarStatement
  // "ambil nilai dari ..." = next word is TK_IDENT (nilai/teks/atribut) → AmbilDomStatement

  const nextTok = this._peek();

  // Case 1: "Ambil dari URL:" → AmbilLuarStatement
  if (nextTok.type === TT.TK_IN) {
    this._advance(); // consume "dari"/"from"
    const url = this._parseExpression();

    // v1.1: The block body (`:` + options/branches) is OPTIONAL. This enables
    // the bare inline form `on_klik = ambil dari "url"` (fetch-and-forget /
    // auto-state) with no branches. When no colon follows we skip block parsing
    // entirely and emit a branch-less fetch. The classic block form
    // (`Ambil dari "url":` newline berhasil/gagal) is unchanged.
    if (this._peek().type !== TT.TK_COLON) {
      // Optional `ke <target>` state binding for the bare inline form:
      //   `ambil dari "url" ke items`
      // Emits `__setState(items, __data)` on success and drives auto loading/
      // error state (`items_memuat` / `items_galat`) — see the emitter. No
      // binding ⇒ pure fetch-and-forget.
      let bindTarget = null;
      if (this._peek().type === TT.TK_KE) {
        this._advance(); // consume "ke"
        const tgtTok = this._expect(TT.TK_IDENT, 'Expected state name after "ke"');
        if (tgtTok) bindTarget = tgtTok.value;
      }
      const node = AST.buatAmbilLuarStatement(url, [], loc, null, []);
      if (bindTarget) node.bindTarget = bindTarget;
      return node;
    }
    this._expect(TT.TK_COLON, 'Expected ":" after URL in Ambil dari');

    // Parse block body: options (metode, isi, header) + branches (berhasil, gagal, selalu)
    const options = [];
    const branches = [];
    const OPTION_KEYS = new Set([
      'metode',
      'method',
      'isi',
      'body',
      'header',
      'headers',
      'mode',
      'kredensial',
      'credentials',
    ]);
    const _BRANCH_KEYS = new Set([
      'berhasil',
      'success',
      'gagal',
      'error',
      'selalu',
      'always',
      'finally',
    ]);
    const BRANCH_MAP = {
      berhasil: 'berhasil',
      success: 'berhasil',
      gagal: 'gagal',
      error: 'gagal',
      selalu: 'selalu',
      always: 'selalu',
      finally: 'selalu',
    };

    if (this._match(TT.TK_INDENT)) {
      while (!this._atEnd() && this._peek().type !== TT.TK_DEDENT) {
        const itemTok = this._peek();
        if (itemTok.type === TT.TK_IDENT || itemTok.type === TT.TK_IN) {
          const word = itemTok.value ? itemTok.value.toLowerCase() : '';

          // Option line: "metode = POST"
          if (OPTION_KEYS.has(word)) {
            this._advance(); // consume option key
            this._expect(TT.TK_ASSIGN, 'Expected "=" after option key');
            const val = this._parseExpression();
            options.push(AST.buatFetchOption(word, val, this._makeLoc(itemTok)));
            continue;
          }

          // Branch: "berhasil:" / "gagal:" / "selalu:"
          if (BRANCH_MAP[word]) {
            this._advance(); // consume branch keyword
            this._expect(TT.TK_COLON, 'Expected ":" after branch keyword');
            const branchKind = BRANCH_MAP[word];
            const branchBody = this._parseBlock();
            branches.push(AST.buatFetchBranch(branchKind, branchBody, this._makeLoc(itemTok)));
            continue;
          }
        }

        // Skip newlines/unknown tokens
        this._advance();
      }
      this._match(TT.TK_DEDENT);
    }

    return AST.buatAmbilLuarStatement(url, branches, loc, null, options);
  }

  // Case 2: "ambil nilai/teks/atribut dari ..." → AmbilDomStatement (legacy)
  const kindTok = this._expect(TT.TK_IDENT, 'Expected kind after "ambil"');
  const kind = kindTok ? kindTok.value : 'nilai';
  const source = this._parseExpression();
  let target = '_result';
  if (this._peek().type === TT.TK_KE) {
    this._advance();
    const targetTok = this._expect(TT.TK_IDENT, 'Expected target name after "ke"');
    if (targetTok) target = targetTok.value;
  }

  return AST.buatAmbilDomStatement(kind, source, target, loc, null);
};

/**
 * Parse `jalankan` statement (call PromptJS function).
 * `jalankan <fungsi>(<args>)`
 */
PromptJSParser.prototype._parseJalankanStatement = function () {
  const tok = this._advance();
  const loc = this._makeLoc(tok);

  // Parse callee (identifier)
  const calleeTok = this._expect(TT.TK_IDENT, 'Expected function name after "jalankan"');
  const callee = calleeTok
    ? AST.buatIdentifier(calleeTok.value, null)
    : AST.buatIdentifier('_', null);

  // Optional arguments
  let arguments_ = [];
  if (this._peek().type === TT.TK_LPAREN) {
    this._advance();
    arguments_ = [];
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      arguments_.push(this._parseExpression());
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")"');
  }

  return AST.buatJalankanExpression(callee, 'jalankan', loc, null, arguments_);
};

// --- Module index ---
module.exports = {
  PromptJSParser,
  parse(tokens, frontMatterData) {
    const parser = new PromptJSParser();
    return parser.parse(tokens, frontMatterData);
  },
};
