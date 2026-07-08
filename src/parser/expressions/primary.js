'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;
const { EXPR_DEPTH_EXCEEDED, MAX_EXPR_DEPTH } = require('../shared/recovery');

/**
 * PromptJS v1.0.0 — Parser Expressions: Primary & Expression Entry
 * ============================================================================
 *
 * Expression entry point (_parseExpression with depth guard + ternary)
 * and primary expression parser (_parsePrimaryExpression).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang expression entry + primary expression methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  // Attach MAX_EXPR_DEPTH as static property
  PromptJSParser.MAX_EXPR_DEPTH = MAX_EXPR_DEPTH;

  /**
   * Entry point parsing ekspresi — delegate ke `_parseBinaryExpression(0)`.
   *
   * @returns {Object} AST node expression
   */
  PromptJSParser.prototype._parseExpression = function () {
    // LOW-4: lindungi dari rekursi ekspresi yang terlalu dalam (stack overflow).
    // Entry terluar (depth 0 → 1) menangkap sentinel agar parser memancarkan
    // E2029 dan tetap mengembalikan node, bukan melempar RangeError mentah.
    const isOutermost = this._exprDepth === 0;
    this._exprDepth++;
    if (this._exprDepth > PromptJSParser.MAX_EXPR_DEPTH) {
      this._exprDepth--;
      throw EXPR_DEPTH_EXCEEDED;
    }
    try {
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
    } catch (err) {
      if (err === EXPR_DEPTH_EXCEEDED) {
        if (isOutermost) {
          const tok = this._peek();
          this.errors.push({
            code: 'E2029',
            severity: 'error',
            message: `Ekspresi terlalu dalam (melebihi batas kedalaman ${PromptJSParser.MAX_EXPR_DEPTH})`,
            line: tok ? tok.line : 0,
            column: tok ? tok.col : 0,
            suggestion: 'Sederhanakan ekspresi atau pecah menjadi beberapa langkah/variabel.',
          });
          // Kembalikan node literal placeholder agar caller tetap mendapat AST valid.
          return AST.buatLiteral(null, 'null', this._makeLoc(tok || this._peek()));
        }
        throw err; // teruskan ke entry terluar
      }
      throw err;
    } finally {
      this._exprDepth--;
    }
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

    // Identifier or keyword-as-identifier (or arrow function: x => expr)
    if (tok.type === TT.TK_IDENT) {
      this._advance();
      // BUG-05 FIX: Check if this is a single-param arrow function (x => expr)
      if (this._peek().type === TT.TK_ARROW) {
        this._advance(); // consume =>
        const params = [AST.buatIdentifier(tok.value, this._makeLoc(tok))];
        const body = this._parseExpression();
        return AST.buatArrowFunctionExpression(params, body, this._makeLoc(tok), true);
      }
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
      // LIM-2 FIX: "arahkan ke <url>" — optional "ke" after arahkan (inline expression path)
      if (kwTok.type === TT.TK_ARAHKAN && this._peek().type === TT.TK_KE) {
        this._advance(); // consume optional "ke"
      }
      const target = this._parseExpression();
      const loc = this._makeLoc(kwTok);
      // v1.0: "hapus <item> dari <array>" → HapusDariStatement (inline expression path)
      if (kwTok.type === TT.TK_HAPUS && this._peek() && this._peek().type === TT.TK_IN) {
        this._advance(); // consume dari/from
        const fromArray = this._parseExpression();
        return AST.buatHapusDariStatement(target, fromArray, loc, null);
      }
      // Use AST factory functions for proper property names (url vs target, etc.)
      if (kwTok.type === TT.TK_ARAHKAN) return AST.buatArahkanStatement(target, loc, null);
      if (kwTok.type === TT.TK_SEMBUNYIKAN) return AST.buatSembunyikanStatement(target, loc, null);
      if (kwTok.type === TT.TK_HAPUS) return AST.buatHapusStatement(target, loc, null);
      if (kwTok.type === TT.TK_KOSONGKAN) return AST.buatKosongkanStatement(target, loc, null);
      if (kwTok.type === TT.TK_TAMPILKAN) return AST.buatTampilkanStatement(target, loc, null);
      // Fallback
      return { type: 'ArahkanStatement', loc, target };
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
        // Two forms: "kurangi target" (decrement by 1) or "kurangi value dari target" (subtract value)
        const firstArg = this._parseExpression();
        // Check if "dari/from/in" follows → "kurangi <value> dari <target>"
        if (this._peek() && this._peek().type === TT.TK_IN) {
          this._advance(); // consume dari/from/in
          const target = this._parseExpression();
          return { type: 'KurangiStatement', loc: this._makeLoc(kwTok), target, value: firstArg };
        }
        // LIM-4 FIX: detect "kurangi <literal> ke <target>" — invalid form (inline path)
        if (this._peek() && this._peek().type === TT.TK_KE && firstArg.type === 'Literal') {
          this._advance(); // consume ke
          this._parseExpression(); // consume the mistaken target
          const errorLoc = this._makeLoc(kwTok);
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
            loc: errorLoc,
          });
          return { type: 'ErrorNode', loc: errorLoc };
        }
        // "kurangi target" → decrement by 1
        return { type: 'KurangiStatement', loc: this._makeLoc(kwTok), target: firstArg };
      }
      let value = this._parseExpression();
      // BUG-16 FIX: Support space-separated method arguments in inline simpan
      if (this._peek() && this._peek().type !== TT.TK_KE) {
        if (value && (value.type === 'MemberExpression' || value.type === 'Identifier')) {
          const args = [];
          while (this._peek() && this._peek().type !== TT.TK_KE && !this._atEnd()) {
            const arg = this._parseExpression();
            args.push(arg);
          }
          if (args.length > 0) {
            value = {
              type: 'CallExpression',
              callee: value,
              arguments: args,
              loc: value.loc,
            };
          }
        }
      }
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

    // Parenthesized expression OR arrow function params: (x, y) => expr
    if (tok.type === TT.TK_LPAREN) {
      this._advance();
      // BUG-05 FIX: Check if this is an arrow function by looking for pattern: (id, id, ...) =>
      // Save position for backtracking
      const savedPos = this.pos;
      const savedTokens = this.tokens.slice();
      const possibleParams = [];
      let isArrow = false;
      try {
        // Try to parse as parameter list
        if (this._peek().type === TT.TK_RPAREN) {
          // () => expr  (zero params)
          this._advance(); // consume )
          if (this._peek().type === TT.TK_ARROW) {
            isArrow = true;
          }
        } else if (this._peek().type === TT.TK_IDENT) {
          // Parse comma-separated identifiers
          while (true) {
            if (this._peek().type !== TT.TK_IDENT) break;
            const paramTok = this._advance();
            possibleParams.push(AST.buatIdentifier(paramTok.value, this._makeLoc(paramTok)));
            if (this._peek().type === TT.TK_COMMA) {
              this._advance(); // consume comma
            } else {
              break;
            }
          }
          if (this._peek().type === TT.TK_RPAREN) {
            this._advance(); // consume )
            if (this._peek().type === TT.TK_ARROW) {
              isArrow = true;
            }
          }
        }
      } catch {
        // Not an arrow function, will backtrack
      }
      if (isArrow) {
        // It IS an arrow function: (x, y) => expr
        this._advance(); // consume =>
        const body = this._parseExpression();
        return AST.buatArrowFunctionExpression(possibleParams, body, this._makeLoc(tok), true);
      }
      // Not an arrow function — backtrack and parse as parenthesized expression
      this.pos = savedPos;
      this.tokens = savedTokens;
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
    // [DX-1 FIX] Human-readable E2020: show the offending source text (`tok.value`)
    // instead of leaking the internal token name (`TK_BUAT`), and always attach an
    // actionable Saran. The `_hadFatalParseError` flag lets the resolver suppress
    // the misleading cascade (e.g. a phantom E3001 "span tidak dideklarasikan").
    const shown =
      tok.value !== undefined && tok.value !== null && String(tok.value).length > 0
        ? `"${tok.value}"`
        : 'token tidak terduga';
    this._hadFatalParseError = true;
    this.errors.push({
      code: 'E2020',
      severity: 'error',
      message: `Token tidak terduga ${shown} di baris ${tok.line}. Kemungkinan blok sebelumnya kosong atau kurang isi/label.`,
      line: tok.line,
      column: tok.col,
      suggestion:
        'Pastikan blok sebelumnya memiliki isi (mis. label/teks setelah ":"), atau periksa sintaks di sekitar posisi ini.',
    });
    return AST.buatLiteral(null, 'null', null);
  };
}

module.exports = { install };
