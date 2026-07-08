'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Fetch (Ambil)
 * ============================================================================
 *
 * AmbilLuar (external URL fetch) and AmbilDom (DOM value fetch) statements.
 * Supports bare inline form, state binding, options (metode/header/isi),
 * and success/error/always branches.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang fetch statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
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
}

module.exports = { install };
