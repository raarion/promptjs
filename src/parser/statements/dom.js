'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;

/**
 * PromptJS v1.0.0 — Parser Statements: DOM (Buat, Selector, TextNode, PropertyOrExpr, Tampilkan)
 * ============================================================================
 *
 * DOM element creation, CSS selector parsing, text node children,
 * property/expression lines inside element bodies, and Tampilkan (show/mount).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang DOM statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse `Buat`/`Create` statement — pembuatan elemen DOM atau instansiasi komponen.
   *
   * Bentuk yang didukung:
   * - `Buat tag.class#id:` — elemen dengan selector
   * - `Buat h1: "text"` — elemen dengan inline text
   * - `Buat NamaKomponen(prop: val)` — instansiasi komponen (jika nama ada di `componentNames`)
   * - `Buat tag: -> aksi` — elemen dengan aksi tunggal
   *
   * Setelah header, parse body block (INDENT ... DEDENT) jika ada.
   *
   * @returns {Object} AST node BuatStatement atau GunakanStatement
   */
  PromptJSParser.prototype._parseBuatStatement = function () {
    const startTok = this._advance(); // consume Buat/Create

    // Parse selector: tag[.class]*[#id]
    const selector = this._parseSelector();

    // Component invocation: "Buat Kartu(judul: "Hai", isi: ...)" — named args, no block.
    if (this._peek().type === TT.TK_LPAREN) {
      this._advance(); // consume (
      const props = [];
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        const keyTok = this._expect(TT.TK_IDENT, 'Expected argument name in component call');
        this._expect(TT.TK_COLON, 'Expected ":" after argument name');
        const valExpr = this._parseExpression();
        if (keyTok) props.push({ key: keyTok.value, value: valExpr });
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")" to close component arguments');
      return AST.buatGunakanStatement(selector.tag, this._makeLoc(startTok), null, props, null);
    }

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after block opener');

    const loc = this._makeLoc(startTok);

    // Check for inline content after colon (e.g. Buat h1: "text" or Buat p: $judul)
    // If the next token is NOT an INDENT, we have inline content
    let body = null;
    let properties = null;
    let inlineChildren = null;

    if (
      this._peek().type !== TT.TK_INDENT &&
      this._peek().type !== TT.TK_DEDENT &&
      !this._atEnd()
    ) {
      // Inline content — parse as expression and create a TextNode or property
      const inlineExpr = this._parseExpression();

      if (inlineExpr) {
        // Wrap inline expression in a TextNode-like body
        if (inlineExpr.type === 'Literal' && typeof inlineExpr.value === 'string') {
          // String literal → TextNode
          const textNode = {
            type: 'TextNode',
            loc: inlineExpr.loc || loc,
            value: inlineExpr.value,
          };
          inlineChildren = [textNode];
        } else {
          // Expression → set as 'teks' property (compatible with PromptJS's BuatStatement.properties.teks)
          properties = { teks: inlineExpr };
        }
      }
    }

    // After inline content, also check for an indented block body.
    // This supports the pattern: `Buat tombol: "Click"` followed by an indented
    // `Ketika diklik:` block. The inline content becomes the first child of the
    // block, and the indented statements become subsequent children.
    if (this._peek().type === TT.TK_INDENT) {
      const blockBody = this._parseBlock();
      if (blockBody && blockBody.body) {
        if (inlineChildren && inlineChildren.length > 0) {
          // Merge inline children as first children, then block body children
          const mergedChildren = inlineChildren.concat(blockBody.body);
          body = AST.buatBlockStatement(mergedChildren, null);
        } else {
          body = blockBody;
        }
      } else if (inlineChildren && inlineChildren.length > 0) {
        body = AST.buatBlockStatement(inlineChildren, null);
      }
    } else if (inlineChildren && inlineChildren.length > 0) {
      // Only inline content, no indented block
      body = AST.buatBlockStatement(inlineChildren, null);
    }

    // Check if this is a component invocation (selector.tag matches known component)
    // This will be re-checked in Resolver, but we set a hint here
    const node = AST.buatBuatStatement(selector, loc, properties, null, body, null);

    // If selector tag is a known component name, mark for Resolver disambiguation
    if (this.componentNames.has(selector.tag)) {
      node._isComponentInvocation = true;
    }

    return node;
  };

  /**
   * Parse selector CSS-style `tag.class#id` (sudah di-emit sebagai objek oleh lexer).
   *
   * @returns {Object} AST node Selector
   */
  PromptJSParser.prototype._parseSelector = function () {
    const tok = this._peek();
    let tag = '';
    const classes = [];
    let id = null;
    const attributes = [];

    // If the IDENT token has raw selector metadata from lexer
    if (
      tok.type === TT.TK_IDENT &&
      tok.raw &&
      typeof tok.raw === 'object' &&
      tok.raw.type === 'Selector'
    ) {
      this._advance();
      const sel = tok.raw;
      tag = sel.tag;
      classes.push(...sel.classes);
      id = sel.id;

      // BUG-2 fix: forward inline attributes `[attr="val"]` from the lexer.
      // BUG-10 fix: distinguish between quoted and unquoted attribute values.
      // Quoted values become Literal nodes; unquoted identifiers become
      // Identifier nodes so they compile to reactive references (e.g. url.value).
      if (Array.isArray(sel.attributes) && sel.attributes.length > 0) {
        for (const a of sel.attributes) {
          let valNode;
          if (a.value == null) {
            // Boolean/valueless attribute, e.g. [disabled]
            valNode = AST.buatLiteral('', 'string', null);
          } else if (typeof a.value === 'object' && a.value.__raw !== undefined) {
            // Structured value from BUG-10 lexer fix
            if (a.value.__quoted) {
              // Quoted string literal: [href="https://example.com"]
              valNode = AST.buatLiteral(String(a.value.__raw), 'string', null);
            } else {
              // Unquoted identifier: [href=url] → variable reference
              const raw = a.value.__raw;
              // Only treat as identifier if it's a valid JS identifier pattern
              if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(raw)) {
                valNode = AST.buatIdentifier(raw, null);
              } else {
                // Complex expression like a URL path — treat as string literal
                valNode = AST.buatLiteral(String(raw), 'string', null);
              }
            }
          } else {
            // Legacy format (plain string value)
            valNode = AST.buatLiteral(String(a.value), 'string', null);
          }
          attributes.push(AST.buatAttributeNode(a.key, valNode, null));
        }
      }

      // Consume any extra DOT and HASH tokens that the lexer also emitted
      while (this._peek().type === TT.TK_DOT || this._peek().type === TT.TK_HASH) {
        this._advance();
      }
    } else if (tok.type === TT.TK_IDENT) {
      tag = this._advance().value;

      // Collect class tokens (DOT) and id token (HASH)
      // But stop if we hit COLON — we don't consume it here
      while (this._peek().type === TT.TK_DOT) {
        this._advance(); // consume DOT token itself
        // The DOT token's value IS the class name (from lexer)
        classes.push(this.tokens[this.pos - 1].value);
      }
      if (this._peek().type === TT.TK_HASH) {
        this._advance(); // consume HASH token itself
        // The HASH token's value IS the id name (from lexer)
        id = this.tokens[this.pos - 1].value;
      }
    }

    return AST.buatSelector(tag, null, id, classes, attributes);
  };

  /**
   * Parse text node — baris string literal sebagai child element.
   *
   * @returns {Object} AST node TextNode
   */
  PromptJSParser.prototype._parseTextNode = function () {
    const tok = this._advance(); // consume STRING
    // TextNode is a special node type — we create it as a PropertyNode with key 'teks'
    // This is compatible with PromptJS's BuatStatement.properties.teks handling
    return {
      type: 'TextNode',
      loc: this._makeLoc(tok),
      value: tok.value,
    };
  };

  /**
   * Parse baris property `key = value` atau ekspresi standalone.
   *
   * Dispatch: jika current token adalah TK_IDENT dan next adalah TK_ASSIGN,
   * parse sebagai property (AttributeNode); jika tidak, parse sebagai ekspresi.
   *
   * @returns {Object | null} AST node AttributeNode atau expression node, atau `null` jika tidak ada
   */
  PromptJSParser.prototype._parsePropertyOrExpr = function () {
    // Check if this is key = value (simple property: "foo = bar")
    // This MUST check peekAt(1) before consuming any tokens so it only
    // matches bare identifiers followed immediately by "=".
    if (this._peekAt(1).type === TT.TK_ASSIGN) {
      const keyTok = this._advance(); // consume key IDENT
      this._advance(); // consume =
      const value = this._parseExpression();
      return AST.buatPropertyNode(keyTok.value, value, this._makeLoc(keyTok), false);
    }

    // #92: Parse as expression first, then check if followed by "=".
    // This handles dot-notation assignment (window.foo = true, obj.prop = 1)
    // which was previously silently dropped because the expression parser
    // consumed "window.foo" but left "= true" unconsumed.
    const left = this._parseExpression();
    if (this._peek().type === TT.TK_ASSIGN) {
      this._advance(); // consume =
      const right = this._parseExpression();
      return AST.buatAssignmentExpression(left, right, left.loc);
    }

    return left;
  };

  /**
   * Parse `tampilkan` statement.
   * `tampilkan <target>` or `tampilkan <target> di <mountTarget>` or
   * `tampilkan <target> dengan mode <mode>`
   */
  PromptJSParser.prototype._parseTampilkanStatement = function () {
    const tok = this._advance();
    const target = this._parseExpression();
    const loc = this._makeLoc(tok);
    const mountTarget = null;
    const mode = null;
    const messageKind = null;

    // Optional `di <mountTarget>` — but `di` is not a keyword, so we check
    // if next token is TK_IDENT with value 'di'. For now, keep it simple.
    // Mode is also optional — skip complex parsing for now.

    return AST.buatTampilkanStatement(target, loc, null, mountTarget, mode, messageKind);
  };
}

module.exports = { install };
