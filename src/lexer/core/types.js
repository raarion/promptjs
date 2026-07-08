// @ts-check

/**
 * Shared JSDoc typedefs untuk PromptJS lexer.
 * File ini murni deklarasi tipe — tidak ada runtime code.
 *
 * @module lexer/core/types
 */

'use strict';

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

module.exports = {};
