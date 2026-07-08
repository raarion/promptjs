'use strict';

const AST = require('../ast-factory');
const TT = require('../../lexer/promptjs-lexer').TT;
const EVENT_ALIASES = require('../../lexer/promptjs-lexer').EVENT_ALIASES;
const { VALID_EVENT_MODIFIERS, KNOWN_UNSUPPORTED_MODIFIERS } = require('../shared/modifiers');

/**
 * PromptJS v1.0.0 — Parser Statements: Events
 * ============================================================================
 *
 * Ketika (block-form event handler with modifiers) and On-Event
 * (inline `on_x.mod = ...` form, synthesized into KetikaStatement).
 *
 * Both paths share the same modifier tables (from shared/modifiers.js)
 * so they cannot drift out of sync.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/parser/promptjs-parser.js`. Every method is installed onto
 * `PromptJSParser.prototype` exactly as before; only the file layout changed.
 */

/**
 * Pasang event statement methods ke `PromptJSParser.prototype`.
 *
 * @param {Function} PromptJSParser - Constructor PromptJSParser
 * @returns {void}
 */
function install(PromptJSParser) {
  /**
   * Parse `ketika` statement (event handler with explicit target).
   * `ketika <target> <event>: <body>` or `ketika <target> <event> -> <action>`
   * Simplified: `ketika <event>: <body>`
   */
  PromptJSParser.prototype._parseKetikaStatement = function () {
    const tok = this._advance();
    const loc = this._makeLoc(tok);

    // Parse event name (identifier)
    const eventTok = this._expect(TT.TK_IDENT, 'Expected event name after "ketika"');
    const event = eventTok ? eventTok.value : 'diklik';

    // BUG-09 FIX: Parse event modifiers (.cegah, .hentikan, .sekali, etc.)
    // "Ketika diklik .cegah:" → event="diklik", modifiers=["cegah"]
    //
    // v132 stabilization (P0.1): the original backtrack below referenced
    // `this._pos` (undefined field — the real position counter is `this.pos`),
    // so it was always a no-op; a DOT consumed while probing an invalid
    // modifier was never actually put back. This accidentally still worked for
    // the common case (a bare-identifier target immediately after the DOT),
    // but the DOT itself was silently dropped from the token stream — fixed to
    // use the correct field name so the backtrack genuinely restores position.
    const modifiers = [];
    while (this._peek().type === TT.TK_DOT) {
      const dotPos = this.pos; // position of THIS dot, restored on backtrack
      this._advance(); // consume DOT
      const modTok = this._peek();
      const modName = modTok.type === TT.TK_IDENT ? modTok.value.toLowerCase() : null;
      if (modName && VALID_EVENT_MODIFIERS[modName]) {
        this._advance(); // consume modifier name
        modifiers.push(modName);
      } else if (modName && KNOWN_UNSUPPORTED_MODIFIERS[modName]) {
        // v132 stabilization (P0.1): a recognizable-but-unimplemented
        // modifier name (e.g. .capture/.passive) must NOT be silently
        // swallowed as if it were a target expression — surface W2005 so
        // the developer knows it has NO effect, instead of guessing.
        this._advance(); // consume the modifier-looking identifier
        this.warnings.push({
          code: 'W2005',
          severity: 'warning',
          message: `Event modifier ".${modName}" dikenal tapi belum diimplementasikan — tidak berpengaruh pada compile ini.`,
          line: modTok.line,
          column: modTok.col,
          suggestion:
            'Modifier yang didukung saat ini: .cegah/.prevent, .hentikan/.stop, .sekali/.once.',
        });
      } else {
        // Not a modifier at all — this DOT is part of a target expression.
        // Backtrack to just before THIS dot (modifiers already consumed in
        // earlier loop iterations, if any, remain consumed) so target parsing
        // below sees the untouched `.member` token sequence.
        this.pos = dotPos;
        break;
      }
    }

    // Optional target
    let target = null;
    if (this._peek().type === TT.TK_IDENT && this._peek().value !== 'diklik') {
      target = this._parseExpression();
    }

    // Expect colon
    this._expect(TT.TK_COLON, 'Expected ":" after ketika event');

    const body = this._parseBlock();

    const node = AST.buatKetikaStatement(event, loc, null, target, body, null);
    if (modifiers.length > 0) {
      node.modifiers = modifiers;
    }
    return node;
  };

  /**
   * Parse `on_event = expr` line sebagai KetikaStatement.
   *
   * Resolusi alias event (`on_klik` → `click`) dilakukan di sini via `EVENT_ALIASES`.
   *
   * @returns {Object} AST node KetikaStatement
   */
  PromptJSParser.prototype._parseOnEventStatement = function () {
    const startTok = this._advance(); // consume ON_EVENT
    let rawEventName = startTok.value; // e.g. "on_dikirim.cegah.hentikan"

    // v0.7: Parse modifiers from the event name string.
    // Lexer produces event name as "on_dikirim.cegah" (modifier embedded in string).
    //
    // v132 stabilization (P0.1): this loop previously silently DROPPED any
    // dot-suffix that wasn't in the valid-modifier list (including
    // recognizable-but-unimplemented names like `.capture`/`.passive`) with no
    // diagnostic at all — reuses the SAME two module-level modifier tables as
    // `_parseKetikaStatement` so the inline (`on_x.mod = ...`) and block
    // (`Ketika x.mod:`) forms can never drift out of sync on which modifiers
    // are recognized/supported again.
    const modifiers = [];
    if (rawEventName.includes('.')) {
      const parts = rawEventName.split('.');
      rawEventName = parts[0]; // The actual event name (e.g. "on_dikirim")
      for (let i = 1; i < parts.length; i++) {
        const mod = parts[i].toLowerCase();
        if (VALID_EVENT_MODIFIERS[mod]) {
          modifiers.push(mod);
        } else if (KNOWN_UNSUPPORTED_MODIFIERS[mod]) {
          this.warnings.push({
            code: 'W2005',
            severity: 'warning',
            message: `Event modifier ".${mod}" dikenal tapi belum diimplementasikan — tidak berpengaruh pada compile ini.`,
            line: startTok.line,
            column: startTok.col,
            suggestion:
              'Modifier yang didukung saat ini: .cegah/.prevent, .hentikan/.stop, .sekali/.once.',
          });
        }
        // Anything else (unrecognized dot-suffix) is silently ignored here,
        // unchanged from prior behavior — the lexer already committed the
        // entire "on_x.suffix" string as a single ON_EVENT token value by this
        // point, so there is no token-level backtrack available in this path
        // (unlike the block `Ketika` form). A completely unknown suffix most
        // likely indicates a typo in a modifier name; W2005 only fires for
        // names that match a KNOWN (but unimplemented) modifier vocabulary to
        // avoid false positives on unrelated dotted identifiers.
      }
    }

    // Map to PromptJS event name
    const promptjsEvent = EVENT_ALIASES[rawEventName] || rawEventName;

    // Expect =
    this._expect(TT.TK_ASSIGN, 'Expected "=" after event name');

    // v1.1: Inline fetch as event action.
    // `on_klik = ambil dari "url"` (± `: <branches>`) parses the RHS as a full
    // AmbilLuarStatement (external fetch), NOT an expression. The block-form
    // (`Ketika diklik:` newline `Ambil dari …:`) already worked; this closes the
    // inline-form gap so a developer can wire a fetch straight onto an event
    // without dropping to a nested block or vanilla JS.
    //
    // We detect `ambil`/`fetch` followed by `dari`/`from`/`in` (TK_IN). The
    // legacy DOM form (`ambil nilai dari elemen`) is intentionally NOT accepted
    // here — as an event action it is meaningless, so it falls through to the
    // expression path and errors as before (no silent behaviour change).
    let action;
    if (this._peek().type === TT.TK_AMBIL && this._peekAt(1).type === TT.TK_IN) {
      action = this._parseAmbilStatement();
    } else {
      // Parse action expression (default path — unchanged).
      action = this._parseExpression();
    }

    const loc = this._makeLoc(startTok);

    // Synthesize KetikaStatement with modifiers
    const node = AST.buatKetikaStatement(promptjsEvent, loc, null, null, null, action);
    if (modifiers.length > 0) {
      node.modifiers = modifiers;
    }
    return node;
  };
}

module.exports = { install };
