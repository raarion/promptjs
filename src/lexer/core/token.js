// @ts-check

/**
 * Token type constants, Token constructor, dan error factory untuk PromptJS lexer.
 *
 * @module lexer/core/token
 */

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
  TK_SELAMA: 'TK_SELAMA', // [FIX] selama / while (while loop)
  TK_SETELAH: 'TK_SETELAH', // [FIX] setelah / after (post-completion hook)
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

  // String/collection word-operators (lower to method calls, not infix symbols)
  TK_BERISI: 'TK_BERISI', // berisi / contains  -> .includes()
  TK_DIAWALI: 'TK_DIAWALI', // diawali / starts with -> .startsWith()
  TK_DIAKHIRI: 'TK_DIAKHIRI', // diakhiri / ends with -> .endsWith()

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

module.exports = { TT: TT, Token: Token, createError: createError };
