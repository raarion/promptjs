// @ts-nocheck — prototype methods are installed at module load time by submodules

/**
 * PromptJS v1.0.0 — PARSER (Facade — Tahap 2 Modularization)
 * ============================================================================
 *
 * Behavior-preserving modularization of the former 90KB monolithic parser
 * into 16 focused modules under `src/parser/{core,expressions,statements,shared}/`.
 *
 * This file is now a SMALL ENTRY POINT. The actual parser methods
 * live in the submodules, each exposing `install(PromptJSParser)`.
 * Every method is still mounted onto `PromptJSParser.prototype`
 * exactly as before — only the file layout changed. The external import path
 * (`require('./parser/promptjs-parser')`) and the module exports are
 * preserved, so all consumers are unchanged.
 *
 * No parser behavior, produced AST, or public API was changed by this
 * refactor. See the per-topic modules for the method bodies.
 *
 * Structure:
 *   core/parser-state.js    — parse(), _peek/_advance/_match/_expect/_makeLoc/_parseStatement/_parseBlock
 *   shared/modifiers.js     — VALID_EVENT_MODIFIERS, KNOWN_UNSUPPORTED_MODIFIERS
 *   shared/recovery.js      — MAX_EXPR_DEPTH, EXPR_DEPTH_EXCEEDED
 *   expressions/primary.js  — _parseExpression (depth guard + ternary), _parsePrimaryExpression
 *   expressions/binary.js   — _parseBinaryExpression (precedence climbing)
 *   expressions/member-call.js — _parseUnaryExpression, _parsePostfixExpression
 *   statements/declarations.js — data/tetap/ubah/turunan/fungsi/komponen
 *   statements/dom.js       — Buat/selector/TextNode/PropertyOrExpr/Tampilkan
 *   statements/control-flow.js — Jika/Selama/Berhenti/Kembalikan/SimpleStatement/Pass
 *   statements/events.js    — Ketika/on_x + modifier parsing (W2005)
 *   statements/reactivity.js — Saat/lifecycle(dipasang/dilepas)/Setelah
 *   statements/lists.js     — Ulangi variants + dengan kunci/transisi
 *   statements/fetch.js     — AmbilDom/AmbilLuar
 *   statements/mutations.js — Simpan/Tambahkan/Kurangi/Sisipkan/Hapus/Perbarui/Target
 *   statements/components.js — Gunakan + E2030 safeguard
 *   statements/interop.js   — Jalankan
 */

'use strict';

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

// --- Install all submodules (order matters: core first, then expressions, then statements) ---
require('./core/parser-state').install(PromptJSParser);
require('./expressions/primary').install(PromptJSParser);
require('./expressions/binary').install(PromptJSParser);
require('./expressions/member-call').install(PromptJSParser);
require('./statements/declarations').install(PromptJSParser);
require('./statements/dom').install(PromptJSParser);
require('./statements/control-flow').install(PromptJSParser);
require('./statements/events').install(PromptJSParser);
require('./statements/reactivity').install(PromptJSParser);
require('./statements/lists').install(PromptJSParser);
require('./statements/fetch').install(PromptJSParser);
require('./statements/mutations').install(PromptJSParser);
require('./statements/components').install(PromptJSParser);
require('./statements/interop').install(PromptJSParser);

// --- Module index ---
module.exports = {
  PromptJSParser,
  parse(tokens, frontMatterData) {
    const parser = new PromptJSParser();
    return parser.parse(tokens, frontMatterData);
  },
};
