// @ts-check

/**
 * PromptJS v0.5 — Compiler Codegen Utilities / Utilitas Codegen Kompilator
 * ============================================================================
 *
 * v0.5 additions:
 * - VLQ encoding for source map generation
 * - generateSourceMap() — produces Source Map V3 JSON
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

// ============================================================================
// SOURCE MAP V3 + VLQ ENCODING (v0.5)
// ============================================================================

/**
 * VLQ Base64 encoding table.
 * Standard Source Map V3 VLQ: A-Z (0-25), a-z (26-51), 0-9 (52-61), +, /
 * @type {string}
 */
const VLQ_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode a single integer as VLQ Base64 string.
 *
 * VLQ encoding:
 * - Sign bit di bit ke-6 (nilai 1 = negatif)
 * - 5 bit data per character
 * - Jika masih ada bit tersisa, set continuation bit (bit ke-5 = 1)
 *
 * @param {number} value - Integer to encode
 * @returns {string} VLQ-encoded string
 */
function encodeVLQ(value) {
  // Convert to signed 6-bit representation
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;

  let encoded = '';

  do {
    let digit = vlq & 0x1F; // 5 bits of data
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 0x20; // Set continuation bit
    }
    encoded += VLQ_BASE64[digit];
  } while (vlq > 0);

  return encoded;
}

/**
 * Generate a Source Map V3 object from compiler state.
 *
 * Mappings encode: [outputCol, sourceFileIdx, sourceLine0, sourceCol0]
 * per output line yang memiliki mapping.
 *
 * @param {Object} compiler - Instance PromptJSCompiler with .sourceMapData, .currentSource, .output
 * @returns {Object} Source Map V3 object
 */
function generateSourceMap(compiler) {
  const mappings = [];
  const data = compiler.sourceMapData || [];
  const output = compiler.output || [];
  const sourceFile = compiler.currentSource || 'program.pjs';

  // Sort mappings by output line for correct ordering
  const sorted = data.slice().sort((a, b) => a.outputLine - b.outputLine);

  let prevOutputCol = 0;
  let prevSourceLine = 0;
  let prevSourceCol = 0;

  for (const entry of sorted) {
    // Delta encode
    const outputCol = 0; // All our emit calls start at column 0 (after indent)
    const sourceLine0 = entry.sourceLine - 1; // 0-indexed
    const sourceCol0 = entry.sourceCol || 0; // 0-indexed
    const sourceFileIdx = 0; // Always single file for now

    const dCol = outputCol - prevOutputCol;
    const dSrc = sourceFileIdx; // Always 0, so delta = 0
    const dSrcLine = sourceLine0 - prevSourceLine;
    const dSrcCol = sourceCol0 - prevSourceCol;

    mappings.push(
      encodeVLQ(dCol) +
      encodeVLQ(dSrc) +
      encodeVLQ(dSrcLine) +
      encodeVLQ(dSrcCol)
    );

    prevOutputCol = outputCol;
    prevSourceLine = sourceLine0;
    prevSourceCol = sourceCol0;
  }

  return {
    version: 3,
    file: sourceFile,
    sourceRoot: '',
    sources: [sourceFile],
    names: [],
    mappings: mappings.join(';'), // Semicolon = new output line
  };
}

module.exports = {
  emit,
  genVar,
  escapeString,
  generateSourceMap,
  encodeVLQ,
};