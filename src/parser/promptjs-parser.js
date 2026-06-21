// @ts-check

/**
 * PromptJS v0.2 — PARSER (Tahap 2)
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

/**
 * Hasil parsing.
 *
 * @typedef {Object} ParseResult
 * @property {Object} ast - Root AST node (Program)
 * @property {Object[]} errors - Daftar error yang terjadi selama parsing
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
  this.componentNames = new Set(); // Track defined components
}

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
  this.frontMatterDecls = [];

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
      return this._parseTargetStatement('HapusStatement');
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
        const blockBody = AST.buatBlockStatement([textNode], null);
        body = blockBody;
      } else {
        // Expression → set as 'teks' property (compatible with PromptJS's BuatStatement.properties.teks)
        properties = { teks: inlineExpr };
      }
    }
  } else {
    // Parse block body (indented children)
    body = this._parseBlock();
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

  return AST.buatSelector(tag, null, id, classes, []);
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

  // Auto-fragment: if multiple top-level children, wrap in fragment
  if (statements.length > 1) {
    const fragSelector = AST.buatSelector('fragment', null, null, [], []);
    const fragBody = AST.buatBlockStatement(statements, null);
    return AST.buatBlockStatement(
      [AST.buatBuatStatement(fragSelector, null, null, null, fragBody, null)],
      null
    );
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

  // Check for Lainnya/Else
  let alternate = null;
  if (this._peek().type === TT.TK_LAINNYA) {
    this._advance(); // consume Lainnya/Else
    if (this._peek().type === TT.TK_COLON) this._advance(); // optional colon
    alternate = this._parseBlock();
  }

  return AST.buatJikaStatement(condition, consequent, loc, null, alternate);
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
PromptJSParser.prototype._parseUlangiStatement = function () {
  const startTok = this._advance(); // consume Ulangi/Loop

  // Counted loop: "Ulangi N kali:" / "Loop N times:" (kind = 'kali').
  if (this._peek().type !== TT.TK_UNTUK) {
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
      suggestion: 'Syntax: Ulangi untuk item in $collection:  (atau: Ulangi N kali:)',
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
      suggestion: 'Syntax: Ulangi untuk item in $collection:',
    });
    return null;
  }
  this._advance(); // consume in

  // Source expression
  const source = this._parseExpression();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after loop source');

  const loc = this._makeLoc(startTok);

  // Parse body block
  const body = this._parseBlock();

  return AST.buatUlangiStatement(iteratorName, source, body, 'dari', loc, null, null);
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
  const eventName = startTok.value;

  // Map to PromptJS event name
  const promptjsEvent = EVENT_ALIASES[eventName] || eventName;

  // Expect =
  this._expect(TT.TK_ASSIGN, 'Expected "=" after event name');

  // Parse action expression
  const action = this._parseExpression();

  const loc = this._makeLoc(startTok);

  // Synthesize KetikaStatement (self-referencing — target will be resolved in Resolver)
  return AST.buatKetikaStatement(promptjsEvent, loc, null, null, null, action);
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
PromptJSParser.prototype._parseDataDeclaration = function () {
  const kindTok = this._advance(); // consume keyword
  const keyword = kindTok.value.toLowerCase();

  // Parse name
  const nameTok = this._expect(TT.TK_IDENT, 'Expected variable name');
  const name = nameTok ? nameTok.value : '_';

  // Optional type hint: `name: typeHint = value` or `name = value`
  let typeHint = null;
  if (this._match(TT.TK_COLON)) {
    const hintTok = this._expect(TT.TK_IDENT, 'Expected type hint name');
    if (hintTok) typeHint = hintTok.value;
  }

  // Expect =
  let init = null;
  if (this._match(TT.TK_ASSIGN)) {
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
      if (pTok) params.push(AST.buatParameter(pTok.value, null, null, null));
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
      if (pTok) params.push(AST.buatParameter(pTok.value, null, null, null));
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

  // Identifier or keyword-as-identifier
  if (tok.type === TT.TK_IDENT) {
    this._advance();
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
    const target = this._parseExpression();
    const nodeTypeMap = {
      [TT.TK_SEMBUNYIKAN]: 'SembunyikanStatement',
      [TT.TK_HAPUS]: 'HapusStatement',
      [TT.TK_KOSONGKAN]: 'KosongkanStatement',
      [TT.TK_TAMPILKAN]: 'TampilkanStatement',
      [TT.TK_ARAHKAN]: 'ArahkanStatement',
    };
    return { type: nodeTypeMap[kwTok.type], loc: this._makeLoc(kwTok), target };
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
      const target = this._parseExpression();
      return { type: 'KurangiStatement', loc: this._makeLoc(kwTok), target };
    }
    const value = this._parseExpression();
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

  // Parenthesized expression
  if (tok.type === TT.TK_LPAREN) {
    this._advance();
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
  this.errors.push({
    code: 'E2020',
    severity: 'error',
    message: `Unexpected token: ${tok.type} ("${tok.value}")`,
    line: tok.line,
    column: tok.col,
    suggestion: '',
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
 * Parse single-target statement (sembunyikan, hapus, kosongkan, arahkan).
 * `<keyword> <target>` where target is an expression (Identifier, Selector, etc.)
 */
PromptJSParser.prototype._parseTargetStatement = function (nodeType) {
  const tok = this._advance();
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
    // kurangi <target> [ke <value>]
    const target = this._parseExpression();
    let value = null;
    if (this._peek().type === TT.TK_KE) {
      this._advance();
      value = this._parseExpression();
    }
    return AST.buatKurangiStatement(target, loc, null, value);
  }

  // simpan/tambahkan/sisipkan <value> ke <target>
  const value = this._parseExpression();
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

  // Optional props — "dengan" is not a keyword in TT, so we check if next
  // token is TK_IDENT with value "dengan". For now, skip complex prop parsing.
  // The simple form: `gunakan NamaKomponen` (no props)

  return AST.buatGunakanStatement(componentName, loc, null);
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

  // Optional target
  let target = null;
  if (this._peek().type === TT.TK_IDENT && this._peek().value !== 'diklik') {
    target = this._parseExpression();
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after ketika event');

  const body = this._parseBlock();

  return AST.buatKetikaStatement(event, loc, null, target, body, null);
};

/**
 * Parse `ambil` statement (fetch from DOM or URL).
 * Simplified: `ambil <kind> dari <source> ke <target>`
 */
PromptJSParser.prototype._parseAmbilStatement = function () {
  const tok = this._advance();
  const loc = this._makeLoc(tok);

  // Parse kind (identifier: nilai, teks, atribut)
  const kindTok = this._expect(TT.TK_IDENT, 'Expected kind after "ambil"');
  const kind = kindTok ? kindTok.value : 'nilai';

  // Parse source expression (rest of line as expression)
  const source = this._parseExpression();

  // Parse target (string name)
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
