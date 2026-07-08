'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Data Mutations
 * ============================================================================
 *
 * Simpan, Tambahkan, Kurangi, Sisipkan, Hapus, Perbarui, and Target
 * (sembunyikan/kosongkan/arahkan) statements.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang mutation statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
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
}

module.exports = { install };
