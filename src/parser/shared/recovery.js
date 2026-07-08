'use strict';

/**
 * PromptJS v1.0.0 — Parser Shared: Error Recovery Constants
 * ============================================================================
 *
 * Constants for expression depth limiting and error recovery.
 */

/** Sentinel internal untuk menghentikan rekursi ekspresi yang terlalu dalam. */
const EXPR_DEPTH_EXCEEDED = Symbol('EXPR_DEPTH_EXCEEDED');

/**
 * Batas kedalaman rekursi ekspresi. Input patologis (mis. ribuan tanda kurung
 * bersarang `(((...)))` atau unary `!!!!...`) sebelumnya bisa membuat call
 * stack JS overflow (RangeError mentah). Dengan guard ini, parser memancarkan
 * error terstruktur E2029 alih-alih crash (LOW-4 dari audit 2026-06).
 * @type {number}
 */
const MAX_EXPR_DEPTH = 350;

module.exports = { EXPR_DEPTH_EXCEEDED, MAX_EXPR_DEPTH };
