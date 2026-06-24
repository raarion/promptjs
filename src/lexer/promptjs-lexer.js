// @ts-check

/**
 * PromptJS v0.2 — LEXER (Tahap 1)
 * ============================================================================
 *
 * Converts raw PromptJS (.pjs) character stream into a stream of tokens.
 * Mengkonversi stream karakter mentah PromptJS (.pjs) menjadi stream token.
 *
 * Features / Fitur:
 *   • Tokenisasi keyword bilingual (Buat/Create, Jika/If, Lainnya/Else, dll)
 *   • Indentasi 2-spasi → INDENT/DEDENT stack (adaptasi dari PromptJS)
 *   • Line-type detection: property, string, on_event, $external, block opener
 *   • Front-matter parsing (--- yaml-like block ---)
 *   • Operator standar langsung (>, <, +, *, ===, &&, ||)
 *   • Error reporting berkode dengan konteks baris:kolom + saran bilingual
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

(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory({});
  } else {
    root.PromptJSLexer = factory(root.PromptJSLexer || {});
  }
})(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  /* ==========================================================================
   * 1. KONSTANTA TIPE TOKEN
   * ========================================================================== */
  const TT = {
    // Struktur
    TK_BUAT: 'TK_BUAT', // Buat / Create
    TK_JIKA: 'TK_JIKA', // Jika / If
    TK_LAINNYA: 'TK_LAINNYA', // Lainnya / Else
    TK_ULANGI: 'TK_ULANGI', // Ulangi / Loop
    TK_UNTUK: 'TK_UNTUK', // Untuk / For
    TK_IN: 'TK_IN', // in
    TK_SAMPAI: 'TK_SAMPAI', // [FIX] sampai / until (range loop upper bound)
    TK_KALI: 'TK_KALI', // kali / times (counted-loop suffix)
    TK_PASS: 'TK_PASS', // pass / Lewati
    TK_DEFINSIKAN: 'TK_DEFINSIKAN', // Definisikan / Define
    TK_DATA: 'TK_DATA', // Data / State
    TK_TETAP: 'TK_TETAP', // Tetap / Const
    TK_UBAH: 'TK_UBAH', // Ubah / Let
    TK_TURUNAN: 'TK_TURUNAN', // Turunan / Derived
    TK_FUNGSI: 'TK_FUNGSI', // Fungsi / Func
    TK_SAAT: 'TK_SAAT', // Saat / When
    TK_KEMBALIKAN: 'TK_KEMBALIKAN', // Kembalikan / Return

    // Literals & Identifiers
    TK_STRING: 'TK_STRING',
    TK_NUMBER: 'TK_NUMBER',
    TK_IDENT: 'TK_IDENT',
    TK_EXT_REF: 'TK_EXT_REF', // $nama.path (external data reference)
    TK_BENAR: 'TK_BENAR', // benar / true (boolean literal)
    TK_SALAH: 'TK_SALAH', // salah / false (boolean literal)
    TK_KOSONG: 'TK_KOSONG', // kosong / null (null literal)

    // ─── Action statements (Wave G: keyword activation) ──────────────────
    TK_SIMPAN: 'TK_SIMPAN', // simpan / save
    TK_TAMBAHKAN: 'TK_TAMBAHKAN', // tambahkan / append
    TK_KURANGI: 'TK_KURANGI', // kurangi / remove
    TK_SISIPKAN: 'TK_SISIPKAN', // sisipkan / insert
    TK_KETIKA: 'TK_KETIKA', // ketika / when (event handler with target)
    TK_BERHENTI: 'TK_BERHENTI', // berhenti / break
    TK_TAMPILKAN: 'TK_TAMPILKAN', // tampilkan / show
    TK_SEMBUNYIKAN: 'TK_SEMBUNYIKAN', // sembunyikan / hide
    TK_HAPUS: 'TK_HAPUS', // hapus / remove
    TK_KOSONGKAN: 'TK_KOSONGKAN', // kosongkan / clear
    TK_PERBARUI: 'TK_PERBARUI', // perbarui / update
    TK_AMBIL: 'TK_AMBIL', // ambil / fetch
    TK_ARAHKAN: 'TK_ARAHKAN', // arahkan / navigate
    TK_MUAT_ULANG: 'TK_MUAT_ULANG', // muat ulang / reload
    TK_KEMBALI: 'TK_KEMBALI', // kembali / back
    TK_JALANKAN: 'TK_JALANKAN', // jalankan / run
    TK_GUNAKAN: 'TK_GUNAKAN', // gunakan / use (component instantiation)
    TK_DIPASANG: 'TK_DIPASANG', // dipasang / mounted (lifecycle)
    TK_DILEPAS: 'TK_DILEPAS', // dilepas / unmounted (lifecycle)
    TK_KE: 'TK_KE', // ke / to (target preposition for simpan)

    // Operators
    TK_ASSIGN: 'TK_ASSIGN', // =
    TK_EQ: 'TK_EQ', // ===
    TK_NEQ: 'TK_NEQ', // !==
    TK_GT: 'TK_GT', // >
    TK_GTE: 'TK_GTE', // >=
    TK_LT: 'TK_LT', // <
    TK_LTE: 'TK_LTE', // <=
    TK_PLUS: 'TK_PLUS', // +
    TK_MINUS: 'TK_MINUS', // -
    TK_STAR: 'TK_STAR', // *
    TK_SLASH: 'TK_SLASH', // /
    TK_MOD: 'TK_MOD', // %
    TK_POW: 'TK_POW', // **
    TK_AND: 'TK_AND', // &&
    TK_OR: 'TK_OR', // ||
    TK_NOT: 'TK_NOT', // !
    TK_QUESTION: 'TK_QUESTION', // ? (ternary)
    TK_DOT: 'TK_DOT', // .
    TK_HASH: 'TK_HASH', // #
    TK_LPAREN: 'TK_LPAREN', // (
    TK_RPAREN: 'TK_RPAREN', // )
    TK_LBRACKET: 'TK_LBRACKET', // [
    TK_RBRACKET: 'TK_RBRACKET', // ]
    TK_LBRACE: 'TK_LBRACE', // {
    TK_RBRACE: 'TK_RBRACE', // }
    TK_COMMA: 'TK_COMMA', // ,
    TK_COLON: 'TK_COLON', // :
    TK_ARROW: 'TK_ARROW', // =>

    // Event binding
    TK_ON_EVENT: 'TK_ON_EVENT', // on_klik, on_mouseover, dll

    // Struktur
    TK_INDENT: 'TK_INDENT',
    TK_DEDENT: 'TK_DEDENT',
    TK_NEWLINE: 'TK_NEWLINE',
    TK_EOF: 'TK_EOF',

    // Front-matter
    TK_FRONT_MATTER: 'TK_FRONT_MATTER',
  };

  /* ==========================================================================
   * 2. KEYWORD BILINGUAL MAP
   * ========================================================================== */
  const KEYWORDS = {
    // Indonesia
    buat: TT.TK_BUAT,
    jika: TT.TK_JIKA,
    lainnya: TT.TK_LAINNYA,
    ulangi: TT.TK_ULANGI,
    untuk: TT.TK_UNTUK,
    pass: TT.TK_PASS,
    lewati: TT.TK_PASS,
    definisikan: TT.TK_DEFINSIKAN,
    data: TT.TK_DATA,
    tetap: TT.TK_TETAP,
    ubah: TT.TK_UBAH,
    turunan: TT.TK_TURUNAN,
    fungsi: TT.TK_FUNGSI,
    saat: TT.TK_SAAT,
    kembalikan: TT.TK_KEMBALIKAN,
    in: TT.TK_IN,
    dari: TT.TK_IN,
    sampai: TT.TK_SAMPAI, // [FIX] range loop upper bound keyword
    kali: TT.TK_KALI,
    halaman: TT.TK_BUAT, // Page root — synonym for Buat halaman
    komponen: TT.TK_DEFINSIKAN, // Component declaration (alias of Definisikan)

    // English
    create: TT.TK_BUAT,
    page: TT.TK_BUAT, // Page root — synonym for Create page
    component: TT.TK_DEFINSIKAN, // Component declaration (alias of Define)
    if: TT.TK_JIKA,
    else: TT.TK_LAINNYA,
    loop: TT.TK_ULANGI,
    for: TT.TK_UNTUK,
    from: TT.TK_IN,
    until: TT.TK_SAMPAI, // [FIX] English alias for range loop upper bound
    times: TT.TK_KALI,
    define: TT.TK_DEFINSIKAN,
    state: TT.TK_DATA,
    const: TT.TK_TETAP,
    let: TT.TK_UBAH,
    derived: TT.TK_TURUNAN,
    func: TT.TK_FUNGSI,
    function: TT.TK_FUNGSI, // [FIX] English alias for 'func' (full form)
    watch: TT.TK_SAAT,
    return: TT.TK_KEMBALIKAN,
    skip: TT.TK_PASS,

    // Boolean & null literals (bilingual)
    // Catatan: `salah` juga muncul sebagai event alias (`on_salah` → `error`),
    // tapi di konteks expression (bukan setelah `on_`), `salah` harus jadi boolean literal.
    benar: TT.TK_BENAR,
    true: TT.TK_BENAR,
    salah: TT.TK_SALAH,
    false: TT.TK_SALAH,
    kosong: TT.TK_KOSONG,
    null: TT.TK_KOSONG,

    // ─── Action statements (Wave G) ──────────────────────────────────────
    simpan: TT.TK_SIMPAN,
    save: TT.TK_SIMPAN,
    tambahkan: TT.TK_TAMBAHKAN,
    append: TT.TK_TAMBAHKAN,
    kurangi: TT.TK_KURANGI,
    remove: TT.TK_KURANGI,
    sisipkan: TT.TK_SISIPKAN,
    insert: TT.TK_SISIPKAN,
    ketika: TT.TK_KETIKA,
    when: TT.TK_KETIKA,
    berhenti: TT.TK_BERHENTI,
    break: TT.TK_BERHENTI,
    tampilkan: TT.TK_TAMPILKAN,
    show: TT.TK_TAMPILKAN,
    sembunyikan: TT.TK_SEMBUNYIKAN,
    hide: TT.TK_SEMBUNYIKAN,
    hapus: TT.TK_HAPUS,
    delete: TT.TK_HAPUS,
    kosongkan: TT.TK_KOSONGKAN,
    clear: TT.TK_KOSONGKAN,
    perbarui: TT.TK_PERBARUI,
    update: TT.TK_PERBARUI,
    ambil: TT.TK_AMBIL,
    fetch: TT.TK_AMBIL,
    arahkan: TT.TK_ARAHKAN,
    navigate: TT.TK_ARAHKAN,
    muatulang: TT.TK_MUAT_ULANG,
    reload: TT.TK_MUAT_ULANG,
    kembali: TT.TK_KEMBALI,
    back: TT.TK_KEMBALI,
    jalankan: TT.TK_JALANKAN,
    run: TT.TK_JALANKAN,
    gunakan: TT.TK_GUNAKAN,
    use: TT.TK_GUNAKAN,
    dipasang: TT.TK_DIPASANG,
    mounted: TT.TK_DIPASANG,
    dilepas: TT.TK_DILEPAS,
    unmounted: TT.TK_DILEPAS,
    ke: TT.TK_KE,
    to: TT.TK_KE,
  };

  /* ==========================================================================
   * WORD OPERATORS (bilingual prose operators -> token type + JS symbol)
   * Ordered longest-first so multi-word phrases win over their prefixes
   * (e.g. "tidak sama dengan" before "tidak", "lebih dari" before "kurang").
   * Recognized only inside expression tokenization.
   * ========================================================================== */
  const WORD_OPERATORS = [
    { phrase: 'tidak sama dengan', type: TT.TK_NEQ, symbol: '!==' },
    { phrase: 'sama dengan', type: TT.TK_EQ, symbol: '===' },
    { phrase: 'paling sedikit', type: TT.TK_GTE, symbol: '>=' },
    { phrase: 'paling banyak', type: TT.TK_LTE, symbol: '<=' },
    { phrase: 'lebih dari', type: TT.TK_GT, symbol: '>' },
    { phrase: 'kurang dari', type: TT.TK_LT, symbol: '<' },
    { phrase: 'dan', type: TT.TK_AND, symbol: '&&' },
    { phrase: 'atau', type: TT.TK_OR, symbol: '||' },
    { phrase: 'tidak', type: TT.TK_NOT, symbol: '!' },
    { phrase: 'negatif', type: TT.TK_MINUS, symbol: '-' },
    { phrase: 'tambah', type: TT.TK_PLUS, symbol: '+' },
    { phrase: 'kurang', type: TT.TK_MINUS, symbol: '-' },
    { phrase: 'kali', type: TT.TK_STAR, symbol: '*' },
    { phrase: 'bagi', type: TT.TK_SLASH, symbol: '/' },
    { phrase: 'mod', type: TT.TK_MOD, symbol: '%' },
    { phrase: 'pangkat', type: TT.TK_POW, symbol: '**' },
  ].map(function (w) {
    return {
      type: w.type,
      symbol: w.symbol,
      re: new RegExp('^' + w.phrase.replace(/ /g, '\\s+') + '(?![A-Za-z0-9_])', 'i'),
    };
  });

  /* ==========================================================================
   * 3. EVENT ALIAS MAP (PromptJS on_x → PromptJS native event name)
   * ========================================================================== */
  const EVENT_ALIASES = {
    // Indonesia style
    on_klik: 'diklik',
    on_diklik: 'diklik',
    on_diketik: 'diketik',
    on_ditekan: 'ditekan',
    on_dilepas: 'dilepas',
    on_diubah: 'diubah',
    on_disubmit: 'disubmit',
    on_dikirim: 'dikirim',
    on_difokus: 'difokus',
    on_ditinggal: 'ditinggal',
    on_diarahkan: 'diarahkan',
    on_dimuat: 'dimuat',
    on_digulir: 'digulir',

    // English style
    on_click: 'diklik',
    on_input: 'diketik',
    on_keydown: 'ditekan',
    on_keyup: 'dilepas',
    on_change: 'diubah',
    on_submit: 'disubmit',
    on_focus: 'difokus',
    on_blur: 'ditinggal',
    on_mouseover: 'diarahkan',
    on_mouseout: 'ditinggal-kursor',
    on_load: 'dimuat',
    on_scroll: 'digulir',
    on_dragstart: 'diseret',
    on_contextmenu: 'dikonteks',
    on_paste: 'dilewat',
    on_mouseenter: 'masuk',
    on_mouseleave: 'keluar',
    on_resize: 'diubahukuran',
    on_error: 'salah',
  };

  /* ==========================================================================
   * 4. TAG ALIASES (PromptJS tag → HTML tag, merged with PromptJS's)
   * ========================================================================== */
  const TAG_ALIASES = {
    tombol: 'button',
    button: 'button',
    ruang: 'div',
    div: 'div',
    judul: 'h1',
    h1: 'h1',
    subjudul: 'h2',
    h2: 'h2',
    paragraf: 'p',
    p: 'p',
    gambar: 'img',
    img: 'img',
    tautan: 'a',
    a: 'a',
    masukan: 'input',
    input: 'input',
    pilihan: 'select',
    select: 'select',
    kolom: 'textarea',
    textarea: 'textarea',
    tabel: 'table',
    table: 'table',
    artikel: 'article',
    article: 'article',
    kanvas: 'canvas',
    canvas: 'canvas',
    opsi: 'option',
    option: 'option',
    fragmen: 'fragment',
    fragment: 'fragment',
    wadah: 'div',
    pemisah: 'hr',
    hr: 'hr',
    form: 'form',
    frm: 'form',
    nav: 'nav',
    navigasi: 'nav',
    header: 'header',
    kepala: 'header',
    footer: 'footer',
    kaki: 'footer',
    section: 'section',
    bagian: 'section',
    main: 'main',
    utama: 'main',
    aside: 'aside',
    samping: 'aside',
    ul: 'ul',
    daftar: 'ul',
    ol: 'ol',
    daftarterurut: 'ol',
    li: 'li',
    item: 'li',
    span: 'span',
    rentang: 'span',
    label: 'label',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    video: 'video',
    audio: 'audio',
    iframe: 'iframe',
    bingkai: 'iframe',
  };

  /* ==========================================================================
   * 5. ERROR REPORTING
   * ========================================================================== */
  /**
   * Membuat objek error terformat (internal helper).
   *
   * @param {string} code - Kode error (mis. 'E1001')
   * @param {string} message - Pesan error
   * @param {number} line - Nomor baris error
   * @param {number} col - Nomor kolom error
   * @param {string} [suggestion] - Saran perbaikan (opsional)
   * @returns {LexerError} Objek error terformat
   */
  function createError(code, message, line, col, suggestion) {
    return {
      code: code,
      severity: 'error',
      message: message,
      line: line,
      column: col,
      suggestion: suggestion || '',
    };
  }

  /* ==========================================================================
   * 6. TOKEN OBJECT
   * ========================================================================== */
  /**
   * Constructor Token — representasi satu token hasil lexer.
   *
   * @constructor
   * @param {string} type - Jenis token (mis. 'TK_IDENT', 'TK_STRING')
   * @param {*} value - Nilai token
   * @param {number} line - Nomor baris (1-indexed)
   * @param {number} col - Nomor kolom (1-indexed)
   * @param {string | Object} [raw] - Raw source text atau objek selector (default: `value`)
   * @this {LexerToken}
   */
  function Token(type, value, line, col, raw) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
    this.raw = raw || value;
  }

  /**
   * Representasi string token untuk debugging.
   *
   * @returns {string} Format: `Token(TYPE, "value", line:col)`
   */
  Token.prototype.toString = function () {
    return `Token(${this.type}, "${this.value}", ${this.line}:${this.col})`;
  };

  /* ==========================================================================
   * 7. LEXER ENGINE
   * ========================================================================== */
  /**
   * Constructor PromptJSLexer — tokenizer PromptJS.
   *
   * State lexer disimpan sebagai instance fields:
   * - `source` — source code yang sedang di-tokenize
   * - `tokens` — daftar token yang telah di-emit
   * - `errors` — daftar error yang terjadi
   * - `frontMatter` — baris front-matter (jika ada)
   * - `indentStack` — stack level indentasi untuk INDENT/DEDENT emission
   *
   * @constructor
   * @this {PromptJSLexer & LexerToken[] & LexerError[] & string[] & number[]}
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
  }

  /**
   * Tokenize source code PromptJS menjadi daftar token.
   *
   * Algoritma utama:
   * 1. Reset state lexer (tokens, errors, pos, indent stack).
   * 2. Deteksi front-matter block (`--- ... ---`) di awal file.
   * 3. Untuk setiap baris non-kosong:
   *    a. Hitung indentasi (emit INDENT/DEDENT sesuai kebutuhan).
   *    b. Dispatch ke `_tokenizeLine` untuk klasifikasi jenis baris.
   * 4. Pada EOF, emit DEDENT tersisa di stack, lalu emit TK_EOF.
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

    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const lineNum = i + 1;

      // --- Front-matter detection ---
      if (i === 0 && rawLine.trim() === '---') {
        this.inFrontMatter = true;
        continue;
      }
      if (this.inFrontMatter) {
        if (rawLine.trim() === '---') {
          this.inFrontMatter = false;
        } else {
          // Accumulate front-matter lines (parse later)
          if (!this.frontMatter) this.frontMatter = [];
          this.frontMatter.push(rawLine);
        }
        continue;
      }

      // --- Blank lines ---
      if (rawLine.trim() === '') {
        continue;
      }

      // --- Indentation handling ---
      const indent = this._measureIndent(rawLine);
      if (indent < 0) {
        this.errors.push(
          createError(
            'E1001',
            `Indentasi ganjil di baris ${lineNum}: ${indent} spasi (harus kelipatan 2)`,
            lineNum,
            1,
            'Gunakan kelipatan 2 spasi untuk indentasi.'
          )
        );
        continue;
      }
      if (indent > rawLine.length) continue; // all-whitespace line

      this._emitIndentDedent(indent, lineNum);

      // --- Tokenize the content of the line ---
      const content = rawLine.substring(indent);
      this._tokenizeLine(content, lineNum, indent);
    }

    // Emit remaining DEDENTs at EOF
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.tokens.push(new Token(TT.TK_DEDENT, '', this.line, 0));
    }

    this.tokens.push(new Token(TT.TK_EOF, '', this.line, 0));
    return { tokens: this.tokens, errors: this.errors, frontMatter: this.frontMatter };
  };

  /**
   * Mengukur level indentasi baris (dalam spasi).
   *
   * PromptJS memakai 2 spasi per level. Karakter TAB dilarang; indentasi
   * ganjil (bukan kelipatan 2) juga dilarang.
   *
   * @param {string} line - Baris source code
   * @returns {number} Jumlah spasi indentasi (0, 2, 4, ...), atau `-1` jika error (TAB atau ganjil)
   */
  PromptJSLexer.prototype._measureIndent = function (line) {
    let count = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') {
        count++;
      } else if (ch === '\t') {
        return -1; // Tab detected — error
      } else {
        break;
      }
    }
    if (count % 2 !== 0) return -1; // Odd indent
    return count;
  };

  /**
   * Emit token INDENT/DEDENT berdasarkan perubahan level indentasi.
   *
   * - Jika `indent` > level teratas stack: push ke stack, emit TK_INDENT.
   * - Jika `indent` < level teratas stack: pop stack sampai level cocok,
   *   emit TK_DEDENT untuk setiap pop. Jika tidak cocok dengan level manapun,
   *   laporkan `E1002` (indentasi tidak konsisten).
   * - Jika `indent` == level teratas stack: tidak emit apa-apa.
   *
   * @param {number} indent - Level indentasi baris saat ini
   * @param {number} lineNum - Nomor baris
   * @returns {void}
   */
  PromptJSLexer.prototype._emitIndentDedent = function (indent, lineNum) {
    const current = this.indentStack[this.indentStack.length - 1];
    if (indent > current) {
      this.indentStack.push(indent);
      this.tokens.push(new Token(TT.TK_INDENT, '', lineNum, 1));
    } else if (indent < current) {
      while (
        this.indentStack.length > 1 &&
        this.indentStack[this.indentStack.length - 1] > indent
      ) {
        this.indentStack.pop();
        this.tokens.push(new Token(TT.TK_DEDENT, '', lineNum, 1));
      }
      if (this.indentStack[this.indentStack.length - 1] !== indent) {
        this.errors.push(
          createError(
            'E1002',
            `Indentasi tidak konsisten di baris ${lineNum}: expected ${this.indentStack[this.indentStack.length - 1]}, got ${indent}`,
            lineNum,
            1,
            'Pastikan setiap blok menggunakan indentasi yang konsisten (kelipatan 2 spasi).'
          )
        );
      }
    }
  };

  /**
   * Klasifikasi dan tokenize satu baris content (setelah indent di-strip).
   *
   * Urusan dispatch berdasarkan prefix baris:
   * 1. Komentar (`--` / `//`) → skip.
   * 2. String literal (`"..."` / `'...'`) → `_tokenizeStringLine`.
   * 3. Event handler (`on_x = ...`) → `_tokenizeEventLine`.
   * 4. External ref (`$name.path`) → `_tokenizeExternalRefLine`.
   * 5. Block opener (`Buat`/`Halaman`/`Komponen`/...) → `_tokenizeBlockOpener`.
   * 6. Control flow (`Jika`/`Lainnya`/`Ulangi`) → `_tokenizeControlFlow`.
   * 7. Declaration (`Data`/`Tetap`/`Ubah`/`Fungsi`/`Saat`/`Kembalikan`) → `_tokenizeDeclaration`.
   * 8. `pass` / `lewati` → emit TK_PASS.
   * 9. Property line (`key = value`) → `_tokenizePropertyLine`.
   * 10. Fallback → `_tokenizeExpression`.
   *
   * @param {string} content - Isi baris (tanpa indent)
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content (offset dari indent)
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeLine = function (content, lineNum, baseCol) {
    const trimmed = content.trim();

    // 1. Comment lines
    if (trimmed.startsWith('--') || trimmed.startsWith('//')) {
      return; // Skip comments
    }

    // 2. String-only lines: "text content"
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
      this._tokenizeStringLine(trimmed, lineNum, baseCol);
      return;
    }

    // 3. on_event = expr lines
    if (/^on[_\w]+(?:\.[a-zA-Z]+)*\s*=/.test(trimmed)) {
      this._tokenizeEventLine(trimmed, lineNum, baseCol);
      return;
    }

    // 4. $external.ref lines (as property value or standalone)
    if (/^\$\w/.test(trimmed)) {
      this._tokenizeExternalRefLine(trimmed, lineNum, baseCol);
      return;
    }

    // 5. Block openers: Buat/Create/Definisikan/Define/Halaman/Page/Komponen/Component keyword
    const blockMatch = trimmed.match(
      /^(Buat|buat|Create|create|Definisikan|definisikan|Define|define|Halaman|halaman|Page|page|Komponen|komponen|Component|component)\b/
    );
    if (blockMatch) {
      this._tokenizeBlockOpener(trimmed, lineNum, baseCol, blockMatch[1]);
      return;
    }

    // 6. Control flow: Jika/If, Lainnya/Else, Ulangi/Loop
    const ctrlMatch = trimmed.match(
      /^(Jika|jika|If|if|Lainnya|lainnya|Else|else|Ulangi|ulangi|Loop|loop)\b/
    );
    if (ctrlMatch) {
      this._tokenizeControlFlow(trimmed, lineNum, baseCol, ctrlMatch[1]);
      return;
    }

    // 7. Data declarations: Data/State, Tetap/Const, Ubah/Let, Turunan/Derived, Fungsi/Func
    const declMatch = trimmed.match(
      /^(Data|data|State|state|Tetap|tetap|Const|const|Ubah|ubah|Let|let|Turunan|turunan|Derived|derived|Fungsi|fungsi|Func|func|Function|function|Saat|saat|When|when|Kembalikan|kembalikan|Return|return)\b/
    );
    if (declMatch) {
      this._tokenizeDeclaration(trimmed, lineNum, baseCol, declMatch[1]);
      return;
    }

    // 8. pass/Lewati/Skip
    if (/^(pass|lewati|Lewati|skip|Skip)$/.test(trimmed)) {
      this.tokens.push(new Token(TT.TK_PASS, trimmed, lineNum, baseCol + 1));
      return;
    }

    // 9. Property lines: key = value (fallback — most generic)
    if (/^\w[\w-]*\s*=/.test(trimmed)) {
      this._tokenizePropertyLine(trimmed, lineNum, baseCol);
      return;
    }

    // 10. Expression / fallback
    this._tokenizeExpression(trimmed, lineNum, baseCol);
  };

  /**
   * Tokenize baris yang berisi hanya string literal (children text).
   *
   * Format: `"text"` atau `'text'`. Jika quote penutup tidak ditemukan,
   * emit error `E1003` (string tidak tertutup) tapi tetap emit token string.
   *
   * @param {string} content - Isi baris dimulai dengan quote
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeStringLine = function (content, lineNum, baseCol) {
    const quote = content[0];
    const endIdx = content.length - 1;
    // Find matching closing quote
    if (content[endIdx] === quote) {
      const text = content.substring(1, endIdx);
      this.tokens.push(new Token(TT.TK_STRING, text, lineNum, baseCol + 1, content));
    } else {
      // Unterminated string
      const text = content.substring(1);
      this.tokens.push(new Token(TT.TK_STRING, text, lineNum, baseCol + 1, content));
      this.errors.push(
        createError(
          'E1003',
          `String tidak tertutup di baris ${lineNum}`,
          lineNum,
          baseCol + 1,
          `Pastikan string diakhiri dengan ${quote}.`
        )
      );
    }
  };

  /**
   * Tokenize baris event handler `on_nama_event = ekspresi`.
   *
   * Emit tiga kelompok token:
   * 1. TK_ON_EVENT dengan nama event (mis. 'on_klik').
   * 2. TK_ASSIGN ('=').
   * 3. Hasil tokenisasi ekspresi kanan via `_tokenizeExpression`.
   *
   * @param {string} content - Isi baris `on_x = expr`
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeEventLine = function (content, lineNum, baseCol) {
    const eqIdx = content.indexOf('=');
    const eventName = content.substring(0, eqIdx).trim();
    const expr = content.substring(eqIdx + 1).trim();

    this.tokens.push(new Token(TT.TK_ON_EVENT, eventName, lineNum, baseCol + 1));

    // Look up PromptJS event name
    this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));

    // Tokenize the expression part
    this._tokenizeExpression(expr, lineNum, baseCol + eqIdx + 2);
  };

  /**
   * Tokenize baris yang berisi external reference `$nama.path`.
   *
   * Dua bentuk:
   * - `key = $ext.ref` — property dengan external ref sebagai nilai.
   * - `$ext.ref` (standalone) — langsung tokenize sebagai ekspresi.
   *
   * @param {string} content - Isi baris
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeExternalRefLine = function (content, lineNum, baseCol) {
    // Handle: $name.path = ... or just $name.path
    const eqIdx = content.indexOf('=');
    if (eqIdx > 0) {
      // It's a property with external ref as value: key = $ext.ref
      const key = content.substring(0, eqIdx).trim();
      const val = content.substring(eqIdx + 1).trim();

      this.tokens.push(new Token(TT.TK_IDENT, key, lineNum, baseCol + 1));
      this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));
      this._tokenizeExpression(val, lineNum, baseCol + eqIdx + 2);
    } else {
      // Standalone external reference
      this._tokenizeExpression(content, lineNum, baseCol);
    }
  };

  /**
   * Tokenize baris pembuka blok (`Buat`/`Create`/`Halaman`/`Page`/`Komponen`/`Component`/`Definisikan`/`Define`).
   *
   * Tiga varian:
   * - Self-named (`Halaman:`/`Page:`): keyword itu sendiri jadi tag.
   *   Named page (`Halaman Beranda:`) menghasilkan `id="beranda"`.
   * - Component declaration (`Komponen Name(p1, p2):`/`Definisikan Name(...)`):
   *   emit TK_IDENT untuk nama, TK_LPAREN/RPAREN untuk parameter.
   * - Element creation (`Buat h1.class#id:`): emit TK_IDENT untuk selector.
   *
   * Setelah selector, jika ada `:`, emit TK_COLON lalu tokenize inline content
   * setelahnya. Jika tidak ada `:`, emit error `E1004`.
   *
   * @param {string} content - Isi baris (mis. `Buat h1: "text"`)
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @param {string} keyword - Keyword yang cocok (mis. 'Buat', 'Halaman')
   * @returns {void}
   */
  // Keywords that ARE the element name (not just a prefix like Buat)
  const SELF_NAMED_KEYWORDS = new Set(['halaman', 'page']);

  PromptJSLexer.prototype._tokenizeBlockOpener = function (content, lineNum, baseCol, keyword) {
    const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_BUAT;
    this.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

    // For self-named keywords like Halaman/Page, the keyword itself is the tag name.
    // e.g. "Halaman:" means Buat halaman: (page root element)
    const kwLower = keyword.toLowerCase();
    const isSelfNamed = SELF_NAMED_KEYWORDS.has(kwLower);

    // Parse selector: tag.class#id or just identifier
    // The colon separates the selector from inline content (e.g. Buat h1: "text")
    // or opens a block body (e.g. Buat div:)
    let afterKeyword;
    if (isSelfNamed) {
      // === Self-named block opener: pages (and the component synonym) ===
      // "Halaman:" / "Page:"          -> anonymous page (no id)
      // "Halaman Beranda:" / "Page Home:" -> named page; the name becomes the
      //                                   root element's id (e.g. id="beranda").
      const selectorTag = kwLower; // 'halaman' | 'page' | 'komponen' | 'component'
      let rest = content.substring(keyword.length).trim();
      // Tolerate a repeated tag, e.g. "Halaman halaman:".
      if (rest.toLowerCase().startsWith(selectorTag)) {
        rest = rest.substring(selectorTag.length).trim();
      }
      let namePart = rest;
      const restColon = rest.indexOf(':');
      if (restColon >= 0) namePart = rest.slice(0, restColon);
      namePart = namePart.trim();
      const pageId = namePart ? namePart.replace(/^#/, '').toLowerCase() : null;

      this.tokens.push(
        new Token(TT.TK_IDENT, selectorTag, lineNum, baseCol + keyword.length + 1, {
          type: 'Selector',
          tag: selectorTag,
          classes: [],
          id: pageId,
        })
      );

      const sColon = content.indexOf(':', keyword.length);
      if (sColon >= 0) {
        this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + sColon + 1));
        const inlineContent = content.substring(sColon + 1).trim();
        if (inlineContent) {
          this._tokenizeExpression(inlineContent, lineNum, baseCol + sColon + 2);
        }
      } else {
        this.errors.push(
          createError(
            'E1004',
            `Block opener tanpa colon di baris ${lineNum}: "${content}"`,
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
      this.tokens.push(new Token(TT.TK_IDENT, declName, lineNum, nameCol));
      const declRest = afterKeyword.substring(declName.length).trim();
      if (declRest.startsWith('(')) {
        const closeIdx = declRest.indexOf(')');
        const paramStr = closeIdx >= 0 ? declRest.substring(1, closeIdx) : declRest.substring(1);
        const parenCol = nameCol + declName.length;
        this.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, parenCol));
        if (paramStr.trim()) {
          this._tokenizeExpression(paramStr, lineNum, parenCol + 1);
        }
        this.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, parenCol + paramStr.length + 1));
      }
      const declColon = content.indexOf(':', keyword.length);
      if (declColon >= 0) {
        this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + declColon + 1));
      } else {
        this.errors.push(
          createError(
            'E1004',
            `Block opener tanpa colon di baris ${lineNum}: "${content}"`,
            lineNum,
            baseCol + 1,
            'Tambahkan : di akhir baris. Contoh: Komponen Kartu(judul):'
          )
        );
      }
      return;
    }

    // === Component invocation: "Buat Name(arg: val, ...)" (no colon, no body) ===
    if (kwToken === TT.TK_BUAT) {
      const invMatch = afterKeyword.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/);
      if (invMatch) {
        const invName = invMatch[1];
        const invArgs = invMatch[2];
        const invNameCol = baseCol + keyword.length + 2;
        this.tokens.push(
          new Token(TT.TK_IDENT, invName, lineNum, invNameCol, {
            type: 'Selector',
            tag: invName,
            classes: [],
            id: null,
          })
        );
        const invParenCol = invNameCol + invName.length;
        this.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, invParenCol));
        if (invArgs.trim()) {
          this._tokenizeExpression(invArgs, lineNum, invParenCol + 1);
        }
        this.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, invParenCol + invArgs.length + 1));
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
      const inlineContent = afterKeyword.substring(colonIdx + 1).trim();

      if (selector) {
        this._tokenizeSelector(selector, lineNum, baseCol + keyword.length + 1);
      }
      // Emit colon token
      const contentColonIdx = content.indexOf(':', keyword.length);
      this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + contentColonIdx + 1));

      // Tokenize inline content after colon (if any)
      if (inlineContent) {
        this._tokenizeExpression(inlineContent, lineNum, baseCol + contentColonIdx + 2);
      }
    } else if (afterKeyword) {
      // No colon at all — this is an error for block openers
      this._tokenizeSelector(afterKeyword, lineNum, baseCol + keyword.length + 1);
      this.errors.push(
        createError(
          'E1004',
          `Block opener tanpa colon di baris ${lineNum}: "${content}"`,
          lineNum,
          baseCol + 1,
          'Tambahkan : di akhir baris untuk membuka blok. Contoh: Buat card:'
        )
      );
    }
  };

  // --- Selector tokenization: tag.class1.class2#id ---
  /**
   * Tokenize selector CSS-style `tag.class#id[atr="val"]`.
   *
   * Emit satu token TK_IDENT dengan `value` berisi tag dan `raw` berisi objek
   * Selector `{ type: 'Selector', tag, classes, id, attributes }`. Atribut
   * dalam `[...]` ditokenisasi terpisah menjadi AttributeNode AST.
   *
   * Jika selector tidak valid (mis. tag kosong), emit error `E1009`.
   *
   * @param {string} selector - String selector (mis. `tombol.cta#daftar`)
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal selector
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeSelector = function (selector, lineNum, baseCol) {
    // Parse selector into components
    let pos = 0;
    let tag = '';
    const classes = [];
    let id = null;

    // First segment: tag name (can include underscore for component names like card_produk)
    while (pos < selector.length && selector[pos] !== '.' && selector[pos] !== '#') {
      tag += selector[pos];
      pos++;
    }

    // Subsequent segments
    while (pos < selector.length) {
      if (selector[pos] === '.') {
        pos++; // skip dot
        let cls = '';
        while (pos < selector.length && selector[pos] !== '.' && selector[pos] !== '#') {
          cls += selector[pos];
          pos++;
        }
        if (cls) classes.push(cls);
      } else if (selector[pos] === '#') {
        pos++; // skip hash
        let idStr = '';
        while (pos < selector.length && selector[pos] !== '.' && selector[pos] !== '#') {
          idStr += selector[pos];
          pos++;
        }
        id = idStr || null;
      } else {
        pos++;
      }
    }

    // Emit selector as structured token value
    this.tokens.push(
      new Token(TT.TK_IDENT, tag, lineNum, baseCol, {
        type: 'Selector',
        tag: tag,
        classes: classes,
        id: id,
      })
    );

    // Also emit class and id tokens for parser convenience
    for (const cls of classes) {
      this.tokens.push(new Token(TT.TK_DOT, cls, lineNum, baseCol));
    }
    if (id) {
      this.tokens.push(new Token(TT.TK_HASH, id, lineNum, baseCol));
    }
  };

  // --- Control flow tokenization ---
  /**
   * Tokenize baris control flow (`Jika`/`If`, `Lainnya`/`Else`, `Ulangi`/`Loop`).
   *
   * Emit keyword token, lalu tokenize sisa baris sebagai ekspresi kondisi
   * (untuk `Jika`/`Ulangi`) atau langsung `:` (untuk `Lainnya`).
   *
   * @param {string} content - Isi baris (mis. `Jika x > 5:`)
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @param {string} keyword - Keyword yang cocok (mis. 'Jika', 'Ulangi')
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeControlFlow = function (content, lineNum, baseCol, keyword) {
    const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_IDENT;
    this.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

    const afterKeyword = content.substring(keyword.length).trim();

    if (keyword.toLowerCase() === 'lainnya' || keyword.toLowerCase() === 'else') {
      // Lainnya:/Else: — just a colon
      if (afterKeyword.trim() === ':' || afterKeyword.trim() === '') {
        if (afterKeyword.trim() === ':') {
          this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + content.length));
        }
        return;
      }
    }

    // Jika/If/Ulangi/Loop with condition
    if (afterKeyword.endsWith(':')) {
      let condition = afterKeyword.substring(0, afterKeyword.length - 1).trim();
      // Counted loop: the trailing `kali`/`times` is the loop suffix (TK_KALI),
      // not the multiply operator. Peel it off before tokenizing the count, so
      // the rest may still use `kali` as multiply (e.g. "Ulangi 2 kali 3 kali:").
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
        this._tokenizeExpression(condition, lineNum, baseCol + keyword.length + 1);
      }
      if (countSuffix) {
        this.tokens.push(
          new Token(
            TT.TK_KALI,
            countSuffix,
            lineNum,
            baseCol + content.lastIndexOf(countSuffix) + 1
          )
        );
      }
      this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + content.indexOf(':') + 1));
    } else {
      if (afterKeyword) {
        this._tokenizeExpression(afterKeyword, lineNum, baseCol + keyword.length + 1);
      }
    }
  };

  // --- Declaration tokenization ---
  /**
   * Tokenize baris deklarasi (`Data`/`Tetap`/`Ubah`/`Turunan`/`Fungsi`/`Saat`/`Kembalikan`).
   *
   * Emit keyword token, lalu tokenize sisa baris dengan strategi kontekstual:
   * - Untuk `Fungsi`/`Func`/`Komponen`/`Component`/`Definisikan`/`Define`:
   *   parse nama fungsi/komponen sebagai TK_IDENT eksplisit (bukan via
   *   _tokenizeExpression), baru parameter dan `:` setelahnya. Ini
   *   menghindari collision dengan word operators (mis. `Fungsi tambah(...)`
   *   di mana `tambah` adalah nama fungsi, bukan operator `+`).
   * - Untuk `Data`/`State`/`Tetap`/`Const`/`Ubah`/`Let`/`Turunan`/`Derived`:
   *   parse nama variabel sebagai TK_IDENT eksplisit, lalu sisa baris
   *   (setelah `=` atau `:`) sebagai expression.
   * - Untuk `Saat`/`When`: parse target sebagai expression (target boleh
   *   `nama` atau `nama.berubah`).
   * - Untuk `Kembalikan`/`Return`: parse ekspresi nilai return.
   *
   * @param {string} content - Isi baris (mis. `Data harga = 1000`)
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @param {string} keyword - Keyword yang cocok (mis. 'Data', 'Tetap')
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeDeclaration = function (content, lineNum, baseCol, keyword) {
    const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_IDENT;
    this.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

    const kwLower = keyword.toLowerCase();
    const afterKeyword = content.substring(keyword.length);
    const afterTrim = afterKeyword.trim();
    if (!afterTrim) return;

    // Offset kolom: posisi awal afterTrim relatif ke baseCol
    const afterStart = afterKeyword.indexOf(afterTrim);
    const afterCol = baseCol + keyword.length + afterStart + 1;

    // ─── Fungsi / Komponen / Definisikan: parse signature ────────────────
    // Signature: Nama(params):
    // Kita harus parse Nama sebagai identifier eksplisit (bukan expression)
    // supaya nama seperti "tambah", "kali", "dan" tidak dianggap word operator.
    if (
      kwLower === 'fungsi' ||
      kwLower === 'func' ||
      kwLower === 'function' ||
      kwLower === 'komponen' ||
      kwLower === 'component' ||
      kwLower === 'definisikan' ||
      kwLower === 'define'
    ) {
      // Match: <identifier> (
      // Tolerate optional space between name and (
      const sigMatch = afterTrim.match(/^([A-Za-z_]\w*)\s*\(/);
      if (sigMatch) {
        const name = sigMatch[1];
        const nameCol = afterCol;
        this.tokens.push(new Token(TT.TK_IDENT, name, lineNum, nameCol));

        // Tokenize parameter list + sisanya via expression tokenizer
        // (di dalam parens, expression context is correct)
        const paramStart = sigMatch[0].length - 1; // index of '('
        const rest = afterTrim.substring(paramStart);
        this._tokenizeExpression(rest, lineNum, afterCol + paramStart);
        return;
      }
      // Fallback: nama tanpa parameter → token sisa sebagai expression
      this._tokenizeExpression(afterTrim, lineNum, afterCol);
      return;
    }

    // ─── Data/Tetap/Ubah/Turunan: parse nama lalu sisa ──────────────────
    // Bentuk: <nama> [: <typeHint>] [= <init>]
    // atau:   <nama> = <init>
    // Kita parse nama sebagai TK_IDENT eksplisit supaya nama seperti
    // "tambah", "kali" tidak dianggap word operator.
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
      // Match: <identifier> [\s:=]
      const nameMatch = afterTrim.match(/^([A-Za-z_]\w*)/);
      if (nameMatch) {
        const name = nameMatch[1];
        this.tokens.push(new Token(TT.TK_IDENT, name, lineNum, afterCol));

        const restStart = nameMatch[0].length;
        const rest = afterTrim.substring(restStart).trim();
        if (rest) {
          // Offset untuk rest: posisi awal rest relatif ke baseCol
          const restAbsStart = afterTrim.indexOf(rest, restStart);
          const restCol = afterCol + restAbsStart;
          // Sisa: bisa `= value`, `: typeHint = value`, atau `: typeHint`
          if (rest.startsWith('=')) {
            this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, restCol + 1));
            const exprPart = rest.substring(1).trim();
            if (exprPart) {
              this._tokenizeExpression(
                exprPart,
                lineNum,
                restCol + 1 + (rest.length - 1 - rest.indexOf(exprPart))
              );
            }
          } else if (rest.startsWith(':')) {
            this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, restCol + 1));
            const afterColon = rest.substring(1).trim();
            // Type hint bisa sampai '=' atau sampai akhir baris
            const eqIdx = afterColon.indexOf('=');
            if (eqIdx >= 0) {
              const typeHint = afterColon.substring(0, eqIdx).trim();
              const initPart = afterColon.substring(eqIdx + 1).trim();
              if (typeHint) {
                this.tokens.push(new Token(TT.TK_IDENT, typeHint, lineNum, restCol + 2));
              }
              this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, restCol + 2 + eqIdx));
              if (initPart) {
                this._tokenizeExpression(initPart, lineNum, restCol + 2 + eqIdx + 1);
              }
            } else if (afterColon) {
              // Hanya type hint, tidak ada init
              this.tokens.push(new Token(TT.TK_IDENT, afterColon, lineNum, restCol + 2));
            }
          }
        }
        return;
      }
      // Fallback: tidak ada nama valid, tokenize sebagai expression
      this._tokenizeExpression(afterTrim, lineNum, afterCol);
      return;
    }

    // ─── Saat/When, Kembalikan/Return: tokenize sebagai expression ──────
    // Saat: target bisa `nama` atau `nama.berubah` → expression context OK
    // Kembalikan: nilai return → expression context OK
    // Tapi kita tetap perlu pastikan nama identifier di posisi awal tidak
    // dianggap word operator. Untuk Saat, target biasanya identifier
    // sederhana; kita ekstrak identifier pertama secara manual.
    if (kwLower === 'saat' || kwLower === 'when') {
      // Target Saat: bisa `nama` atau `nama.path`
      // Match: <identifier>(.identifier)*
      const targetMatch = afterTrim.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)/);
      if (targetMatch) {
        const target = targetMatch[1];
        // Emit setiap bagian sebagai IDENT + DOT
        const parts = target.split('.');
        let partCol = afterCol;
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            this.tokens.push(new Token(TT.TK_DOT, '.', lineNum, partCol));
            partCol += 1;
          }
          this.tokens.push(new Token(TT.TK_IDENT, parts[i], lineNum, partCol));
          partCol += parts[i].length;
        }
        // Sisa (seharusnya `:`) → tokenize sebagai expression
        const rest = afterTrim.substring(targetMatch[0].length).trim();
        if (rest) {
          const restAbsStart = afterTrim.indexOf(rest, targetMatch[0].length);
          this._tokenizeExpression(rest, lineNum, afterCol + restAbsStart);
        }
        return;
      }
      this._tokenizeExpression(afterTrim, lineNum, afterCol);
      return;
    }

    // Fallback default (Kembalikan/Return dan lainnya)
    this._tokenizeExpression(afterTrim, lineNum, afterCol);
  };

  // --- Property line tokenization ---
  /**
   * Tokenize baris property `key = value` (atribut elemen).
   *
   * Emit TK_IDENT untuk `key`, TK_ASSIGN untuk `=`, lalu tokenize ekspresi
   * nilai via `_tokenizeExpression`.
   *
   * @param {string} content - Isi baris (mis. `kelas = "tombol-utama"`)
   * @param {number} lineNum - Nomor baris
   * @param {number} baseCol - Kolom awal content
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizePropertyLine = function (content, lineNum, baseCol) {
    const eqIdx = content.indexOf('=');
    const key = content.substring(0, eqIdx).trim();
    const value = content.substring(eqIdx + 1).trim();

    this.tokens.push(new Token(TT.TK_IDENT, key, lineNum, baseCol + 1));
    this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));

    // Check if value starts with $ (external ref)
    if (value.startsWith('$')) {
      this._tokenizeExpression(value, lineNum, baseCol + eqIdx + 2);
    } else {
      this._tokenizeExpression(value, lineNum, baseCol + eqIdx + 2);
    }
  };

  // --- Expression tokenization (recursive descent for inline expressions) ---
  /**
   * Tokenize ekspresi kompleks (~300 baris, fungsi terbesar di lexer).
   *
   * Mendukung:
   * - Literal: angka, string, boolean, null
   * - Identifier dan external ref `$name.path`
   * - Operator: aritmetika (`+`, `-`, `*`, `/`, `%`, `**`), pembanding
   *   (`>`, `<`, `>=`, `<=`, `==`, `!=`, `===`, `!==`), logika (`&&`, `||`, `!`),
   *   kata (`dan`/`atau`/`tidak`/`tambah`/`kurang`/`kali`/`bagi`/`mod`/`pangkat`/
   *   `lebih dari`/`kurang dari`/`sama dengan`/`tidak sama dengan`/`paling sedikit`/`paling banyak`)
   * - Ternary `? :` (right-associative)
   * - Member access `.prop` dan `[index]`
   * - Call `(...)` (dengan koma separator)
   * - Object literal `{ k: v, ... }` (key identifier/string/number)
   * - Array literal `[a, b, c]`
   * - Grup `(expr)`
   * - Native call `::name(...)` untuk JS interop
   *
   * @param {string} expr - String ekspresi (mis. `x + 5 * (y - 1)`)
   * @param {number} lineNum - Nomor baris ekspresi
   * @param {number} baseCol - Kolom awal ekspresi
   * @returns {void}
   */
  PromptJSLexer.prototype._tokenizeExpression = function (expr, lineNum, baseCol) {
    if (!expr || expr.trim() === '') return;
    expr = expr.trim();

    let pos = 0;
    const len = expr.length;

    while (pos < len) {
      const ch = expr[pos];

      // Whitespace
      if (ch === ' ' || ch === '\t') {
        pos++;
        continue;
      }

      // String literal
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = '';
        pos++; // skip opening quote
        while (pos < len && expr[pos] !== quote) {
          if (expr[pos] === '\\' && pos + 1 < len) {
            str += expr[pos + 1];
            pos += 2;
          } else {
            str += expr[pos];
            pos++;
          }
        }
        if (pos < len) pos++; // skip closing quote
        this.tokens.push(new Token(TT.TK_STRING, str, lineNum, baseCol + pos - str.length - 2));
        continue;
      }

      // Number literal
      if (
        (ch >= '0' && ch <= '9') ||
        (ch === '-' && pos + 1 < len && expr[pos + 1] >= '0' && expr[pos + 1] <= '9')
      ) {
        let num = '';
        if (ch === '-') {
          num += '-';
          pos++;
        }
        while (pos < len && ((expr[pos] >= '0' && expr[pos] <= '9') || expr[pos] === '.')) {
          num += expr[pos];
          pos++;
        }
        this.tokens.push(
          new Token(TT.TK_NUMBER, parseFloat(num), lineNum, baseCol + pos - num.length)
        );
        continue;
      }

      // External reference: $name.path
      if (ch === '$') {
        let ref = '$';
        pos++;
        while (
          pos < len &&
          (expr[pos] === '_' ||
            expr[pos] === '.' ||
            (expr[pos] >= 'a' && expr[pos] <= 'z') ||
            (expr[pos] >= 'A' && expr[pos] <= 'Z') ||
            (expr[pos] >= '0' && expr[pos] <= '9'))
        ) {
          ref += expr[pos];
          pos++;
        }
        this.tokens.push(new Token(TT.TK_EXT_REF, ref, lineNum, baseCol + pos - ref.length + 1));
        continue;
      }

      // Multi-char operators
      if (pos + 2 < len) {
        const triple = expr.substring(pos, pos + 3);
        if (triple === '===' || triple === '!==' || triple === '...') {
          const ttype = triple === '===' ? TT.TK_EQ : triple === '!==' ? TT.TK_NEQ : TT.TK_IDENT;
          this.tokens.push(new Token(ttype, triple, lineNum, baseCol + pos + 1));
          pos += 3;
          continue;
        }
      }
      if (pos + 1 < len) {
        const pair = expr.substring(pos, pos + 2);
        if (
          pair === '>=' ||
          pair === '<=' ||
          pair === '&&' ||
          pair === '||' ||
          pair === '=>' ||
          pair === '**'
        ) {
          let ttype;
          switch (pair) {
            case '>=':
              ttype = TT.TK_GTE;
              break;
            case '<=':
              ttype = TT.TK_LTE;
              break;
            case '&&':
              ttype = TT.TK_AND;
              break;
            case '||':
              ttype = TT.TK_OR;
              break;
            case '=>':
              ttype = TT.TK_ARROW;
              break;
            case '**':
              ttype = TT.TK_POW;
              break;
          }
          this.tokens.push(new Token(ttype, pair, lineNum, baseCol + pos + 1));
          pos += 2;
          continue;
        }
      }

      // Single-char operators & symbols
      switch (ch) {
        case '=':
          this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '>':
          this.tokens.push(new Token(TT.TK_GT, '>', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '<':
          this.tokens.push(new Token(TT.TK_LT, '<', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '+':
          this.tokens.push(new Token(TT.TK_PLUS, '+', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '-':
          this.tokens.push(new Token(TT.TK_MINUS, '-', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '*':
          this.tokens.push(new Token(TT.TK_STAR, '*', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '/':
          this.tokens.push(new Token(TT.TK_SLASH, '/', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '%':
          this.tokens.push(new Token(TT.TK_MOD, '%', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '!':
          this.tokens.push(new Token(TT.TK_NOT, '!', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '.':
          this.tokens.push(new Token(TT.TK_DOT, '.', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '#':
          this.tokens.push(new Token(TT.TK_HASH, '#', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ':':
          this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '?':
          this.tokens.push(new Token(TT.TK_QUESTION, '?', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ',':
          this.tokens.push(new Token(TT.TK_COMMA, ',', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '(':
          this.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ')':
          this.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '[':
          this.tokens.push(new Token(TT.TK_LBRACKET, '[', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ']':
          this.tokens.push(new Token(TT.TK_RBRACKET, ']', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '{':
          this.tokens.push(new Token(TT.TK_LBRACE, '{', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '}':
          this.tokens.push(new Token(TT.TK_RBRACE, '}', lineNum, baseCol + pos + 1));
          pos++;
          continue;
      }

      // Word operators (dan, atau, lebih dari, kali, pangkat, ...)
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        const rest = expr.slice(pos);
        let wop = null;
        for (let wi = 0; wi < WORD_OPERATORS.length; wi++) {
          const m = WORD_OPERATORS[wi].re.exec(rest);
          if (m) {
            wop = { op: WORD_OPERATORS[wi], len: m[0].length };
            break;
          }
        }
        if (wop) {
          this.tokens.push(new Token(wop.op.type, wop.op.symbol, lineNum, baseCol + pos + 1));
          pos += wop.len;
          continue;
        }
      }

      // Identifier or keyword
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
        let ident = '';
        while (
          pos < len &&
          (expr[pos] === '_' ||
            (expr[pos] >= 'a' && expr[pos] <= 'z') ||
            (expr[pos] >= 'A' && expr[pos] <= 'Z') ||
            (expr[pos] >= '0' && expr[pos] <= '9'))
        ) {
          ident += expr[pos];
          pos++;
        }

        // Check if it's a keyword
        const kwType = KEYWORDS[ident.toLowerCase()];
        if (kwType) {
          this.tokens.push(new Token(kwType, ident, lineNum, baseCol + pos - ident.length + 1));
        } else {
          this.tokens.push(
            new Token(TT.TK_IDENT, ident, lineNum, baseCol + pos - ident.length + 1)
          );
        }
        continue;
      }

      // Unknown character
      this.errors.push(
        createError(
          'E1005',
          `Karakter tidak dikenali di baris ${lineNum}: '${ch}'`,
          lineNum,
          baseCol + pos + 1,
          `Hapus atau ganti karakter '${ch}'.`
        )
      );
      pos++;
    }
  };

  // --- Front-matter parser (simple YAML-like) ---
  /**
   * Parse baris front-matter (YAML-like sederhana) menjadi objek.
   *
   * Format yang didukung per key:
   * - File reference: `./path/file.json` atau `/abs/path.json` →
   *   `{ type: 'file', path: '/path' }`
   * - Inline JSON object: `{ "a": 1, ... }` →
   *   `{ type: 'inline', value: { a: 1, ... } }`. Jika JSON strict gagal,
   *   fallback ke lenient (unquoted keys).
   * - Scalar (string/number/boolean): coba JSON.parse dulu; jika gagal,
   *   simpan sebagai string mentah → `{ type: 'inline', value: ... }`.
   *
   * Baris kosong dan baris yang diawali `#` di-skip.
   *
   * @param {string[] | null} lines - Daftar baris front-matter (dari `tokenize()`)
   * @returns {Object<string, any> | null} Objek front-matter dengan key-value pairs, atau `null` jika input kosong
   */
  PromptJSLexer.parseFrontMatter = function (lines) {
    if (!lines || lines.length === 0) return null;
    const result = /** @type {Object<string, any>} */ ({});
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue; // skip comments
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx < 0) continue;
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();

      // File reference: starts with ./ or /
      if (value.startsWith('./') || value.startsWith('/')) {
        result[key] = { type: 'file', path: value };
      }
      // Inline JSON object: starts with {
      else if (value.startsWith('{')) {
        // Try strict JSON first; if fails, try lenient (unquoted keys)
        try {
          result[key] = { type: 'inline', value: JSON.parse(value) };
        } catch {
          try {
            // Lenient: wrap keys in quotes for unquoted YAML-like objects
            const fixed = value.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            result[key] = { type: 'inline', value: JSON.parse(fixed) };
          } catch {
            result[key] = { type: 'inline', value: value };
          }
        }
      }
      // Simple string value
      else {
        // Try as JSON first (numbers, booleans, etc)
        try {
          const parsed = JSON.parse(value);
          result[key] = { type: 'inline', value: parsed };
        } catch {
          result[key] = { type: 'inline', value: value };
        }
      }
    }
    return result;
  };

  /* ==========================================================================
   * 8. EXPORTS
   * ========================================================================== */
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
   * Berguna untuk one-shot tokenization tanpa harus instantiate manual.
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
