// @ts-check

/**
 * PromptJS v0.2 — Compiler Codegen Utilities / Utilitas Codegen Kompilator
 * ============================================================================
 *
 * Basic codegen utilities separated from the main compiler.
 * Utilitas codegen dasar dipisah dari compiler utama.
 */

'use strict';

/**
 * Context codegen — reference ke instance PromptJSCompiler.
 *
 * @typedef {Object} CodegenContext
 * @property {string[]} output - Array baris kode yang sedang di-emit
 * @property {number} indent - Level indentasi saat ini (0 = top-level)
 * @property {number} varCounter - Counter untuk generate nama variabel unik
 */

/**
 * Emit satu baris kode ke `ctx.output` dengan indentasi yang sesuai.
 *
 * Indentasi: 2 spasi per level (`ctx.indent`).
 *
 * @param {CodegenContext} ctx - Context compiler (instance PromptJSCompiler)
 * @param {string} code - Kode yang akan di-emit
 * @returns {void}
 */
function emit(ctx, code) {
  const spacing = '  '.repeat(ctx.indent || 0);
  ctx.output.push(spacing + code);
}

/**
 * Generate nama variabel unik dengan format `__<prefix>_<counter>`.
 *
 * Counter diincrement di `ctx.varCounter` setiap pemanggilan, sehingga
 * nama yang dihasilkan selalu unik dalam satu sesi kompilasi.
 *
 * @param {CodegenContext} ctx - Context compiler
 * @param {string} [prefix='v'] - Prefix nama variabel (mis. 'v', 'el', 'cb')
 * @returns {string} Nama variabel unik (mis. `__v_1`, `__el_2`)
 */
function genVar(ctx, prefix) {
  prefix = prefix || 'v';
  ctx.varCounter = (ctx.varCounter || 0) + 1;
  return `__${prefix}_${ctx.varCounter}`;
}

/**
 * Escape nilai menjadi string literal JavaScript yang aman (dengan quote).
 *
 * Memakai `JSON.stringify` untuk konsistensi penanganan escape
 * (newlines, tabs, unicode, dll.).
 *
 * @param {*} value - Nilai yang akan di-escape (akan dikonversi ke String dulu)
 * @returns {string} String literal JavaScript (mis. `"hello\nworld"`)
 */
function escapeString(value) {
  return JSON.stringify(String(value));
}

module.exports = {
  emit,
  genVar,
  escapeString,
};
