'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: Components (Gunakan)
 * ============================================================================
 *
 * Component instantiation via `Gunakan <Name>(props)`.
 * Includes E2030 safeguard for unsupported child blocks (backlog #82).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang component statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse `gunakan` statement (component instantiation).
   * `gunakan <ComponentName>` or `gunakan <ComponentName> dengan <prop>: <val>, ...`
   */
  PromptJSParser.prototype._parseGunakanStatement = function () {
    const tok = this._advance();
    const loc = this._makeLoc(tok);

    // Component name (PascalCase identifier)
    const nameTok = this._expect(TT.TK_IDENT, 'Expected component name after "gunakan"');
    const componentName = nameTok ? nameTok.value : '_';

    // LIM-1 FIX: Optional props in parentheses — "Gunakan Nama(prop: val, prop2: val2)"
    // Mirrors the Buat Nama(prop: val) syntax already supported in _parseBuatStatement.
    let props = null;
    if (this._peek().type === TT.TK_LPAREN) {
      this._advance(); // consume (
      props = [];
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        const keyTok = this._expect(TT.TK_IDENT, 'Expected property name in component props');
        this._expect(TT.TK_COLON, 'Expected ":" after property name');
        const valExpr = this._parseExpression();
        if (keyTok) props.push({ key: keyTok.value, value: valExpr });
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")" to close component props');
    }

    // v132 stabilization (P0.7): `Gunakan NamaKomponen(...):` followed by an
    // indented child block used to be silently accepted here — this function
    // returned immediately without ever looking at the trailing `:`/INDENT,
    // so the child block was left in the token stream and parsed by the
    // ENCLOSING block as ordinary SIBLING statements, positioned next to (not
    // inside) the component instance, with no error or warning at all. Since
    // slots/transclusion (#82) are NOT implemented, a child block here can
    // never actually be rendered as part of the component — surface E2030
    // instead of silently miscompiling. The colon and its block ARE consumed
    // (so parsing can continue cleanly), but the block's statements are
    // deliberately discarded (not attached to the returned GunakanStatement
    // and not left for the enclosing block to pick up as siblings) so nothing
    // is silently rendered in the wrong place.
    if (this._peek().type === TT.TK_COLON) {
      const colonTok = this._peek();
      const savedPos = this.pos;
      this._advance(); // consume the colon
      if (this._peek().type === TT.TK_INDENT) {
        this._parseBlock(); // consume + discard the child block's tokens
        this.errors.push({
          code: 'E2030',
          severity: 'error',
          message: `"Gunakan ${componentName}(...):" dengan blok anak (child block) belum didukung — slot/transklusi belum diimplementasikan (backlog #82).`,
          line: colonTok.line,
          column: colonTok.col,
          suggestion:
            'Slot/transklusi belum didukung (backlog #82). Gunakan "Gunakan NamaKomponen(...)" tanpa blok anak, atau pindahkan konten ke dalam definisi komponen.',
        });
      } else {
        // A trailing colon with NO indented block (e.g. "Gunakan Nama(...):"
        // on its own with nothing indented under it) is harmless — same as
        // today, restore position so the colon is simply not consumed as
        // part of this statement (matches prior behavior for this sub-case).
        this.pos = savedPos;
      }
    }

    return AST.buatGunakanStatement(componentName, loc, null, props, null);
  };
}

module.exports = { install };
