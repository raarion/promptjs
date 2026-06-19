/**
 * PromptJS v0.2 — PARSER (Tahap 2)
 * ============================================================================
 * Produces AST nodes compatible with PromptJS's ast-factory.js shapes.
 */

'use strict';

const AST = require('./ast-factory');
const TT = require('../lexer/promptjs-lexer').TT;

// Event alias: PromptJS on_x → PromptJS event name
const EVENT_ALIASES = require('../lexer/promptjs-lexer').EVENT_ALIASES;

function PromptJSParser() {
  this.tokens = [];
  this.pos = 0;
  this.errors = [];
  this.componentNames = new Set(); // Track defined components
}

PromptJSParser.prototype.parse = function (tokens, frontMatterData) {
  this.tokens = tokens;
  this.pos = 0;
  this.errors = [];
  this.frontMatterDecls = [];

  // Pre-populate external data from front-matter as TetapDeclaration nodes
  if (frontMatterData) {
    for (const [name, info] of Object.entries(frontMatterData)) {
      this.frontMatterDecls.push(
        AST.buatTetapDeclaration(
          name,
          null,
          AST.buatLiteral(info.type === 'inline' ? info.value : null, 'external', null),
          null,
          null
        )
      );
      // Mark as external for resolver patch
      this.frontMatterDecls[this.frontMatterDecls.length - 1]._isExternal = true;
      this.frontMatterDecls[this.frontMatterDecls.length - 1]._externalInfo = info;
    }
  }

  const body = [];
  while (!this._atEnd()) {
    const tok = this._peek();
    if (tok.type === TT.TK_EOF) break;
    if (tok.type === TT.TK_INDENT || tok.type === TT.TK_DEDENT) {
      this._advance(); // skip standalone indent/dedent
      continue;
    }
    const stmt = this._parseStatement();
    if (stmt) body.push(stmt);
  }

  // Prepend front-matter declarations
  const fullBody = this.frontMatterDecls.concat(body);

  return {
    ast: AST.buatProgramNode(fullBody, null, 'promptjs'),
    errors: this.errors,
  };
};

// --- Helpers ---
PromptJSParser.prototype._peek = function () {
  if (this.pos >= this.tokens.length) return this.tokens[this.tokens.length - 1];
  return this.tokens[this.pos];
};

PromptJSParser.prototype._peekAt = function (offset) {
  const idx = this.pos + offset;
  if (idx >= this.tokens.length) return this.tokens[this.tokens.length - 1];
  return this.tokens[idx];
};

PromptJSParser.prototype._advance = function () {
  const tok = this.tokens[this.pos];
  if (this.pos < this.tokens.length - 1) this.pos++;
  return tok;
};

PromptJSParser.prototype._atEnd = function () {
  return this._peek().type === TT.TK_EOF;
};

PromptJSParser.prototype._match = function (type) {
  if (this._peek().type === type) {
    return this._advance();
  }
  return null;
};

PromptJSParser.prototype._expect = function (type, errorMsg) {
  if (this._peek().type === type) {
    return this._advance();
  }
  const tok = this._peek();
  this.errors.push({
    code: 'E2001',
    severity: 'error',
    message: errorMsg || `Expected ${type}, got ${tok.type}`,
    line: tok.line,
    column: tok.col,
    suggestion: '',
  });
  return null;
};

PromptJSParser.prototype._makeLoc = function (startTok, endTok) {
  return AST.buatLoc(
    { line: startTok.line, column: startTok.col },
    { line: (endTok || startTok).line, column: (endTok || startTok).col }
  );
};

// --- Statement dispatch ---
PromptJSParser.prototype._parseStatement = function () {
  const tok = this._peek();

  switch (tok.type) {
    case TT.TK_BUAT:
      return this._parseBuatStatement();
    case TT.TK_JIKA:
      return this._parseJikaStatement();
    case TT.TK_LAINNYA:
      return null; // Handled by Jika parser
    case TT.TK_ULANGI:
      return this._parseUlangiStatement();
    case TT.TK_PASS:
      return this._parsePassStatement();
    case TT.TK_DATA:
    case TT.TK_TETAP:
    case TT.TK_UBAH:
    case TT.TK_TURUNAN:
      return this._parseDataDeclaration();
    case TT.TK_FUNGSI:
      return this._parseFungsiDeclaration();
    case TT.TK_DEFINSIKAN:
      return this._parseDefineComponent();
    case TT.TK_SAAT:
      return this._parseSaatStatement();
    case TT.TK_KEMBALIKAN:
      return this._parseReturnStatement();
    case TT.TK_STRING:
      return this._parseTextNode();
    case TT.TK_ON_EVENT:
      return this._parseOnEventStatement();
    case TT.TK_IDENT:
      return this._parsePropertyOrExpr();
    default:
      this._advance(); // skip unknown
      return null;
  }
};

// --- Buat Statement ---
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

  if (this._peek().type !== TT.TK_INDENT && this._peek().type !== TT.TK_DEDENT && !this._atEnd()) {
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
        const blockBody = AST.buatBlockStatement([textNode], null);
        body = blockBody;
      } else {
        // Expression → set as 'teks' property (compatible with PromptJS's BuatStatement.properties.teks)
        properties = { teks: inlineExpr };
      }
    }
  } else {
    // Parse block body (indented children)
    body = this._parseBlock();
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

// --- Selector parsing ---
PromptJSParser.prototype._parseSelector = function () {
  const tok = this._peek();
  let tag = '';
  const classes = [];
  let id = null;

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

  return AST.buatSelector(tag, null, id, classes, []);
};

// --- Block parsing ---
PromptJSParser.prototype._parseBlock = function () {
  const statements = [];

  // Expect INDENT
  if (this._peek().type !== TT.TK_INDENT) {
    // Empty block (no children)
    return null;
  }
  this._advance(); // consume INDENT

  // Parse statements until DEDENT
  while (this._peek().type !== TT.TK_DEDENT && !this._atEnd()) {
    const stmt = this._parseStatement();
    if (stmt) statements.push(stmt);
  }

  if (this._peek().type === TT.TK_DEDENT) {
    this._advance(); // consume DEDENT
  }

  if (statements.length === 0) return null;

  // Auto-fragment: if multiple top-level children, wrap in fragment
  if (statements.length > 1) {
    const fragSelector = AST.buatSelector('fragment', null, null, [], []);
    const fragBody = AST.buatBlockStatement(statements, null);
    return AST.buatBlockStatement(
      [AST.buatBuatStatement(fragSelector, null, null, null, fragBody, null)],
      null
    );
  }

  return AST.buatBlockStatement(statements, null);
};

// --- Jika Statement ---
PromptJSParser.prototype._parseJikaStatement = function () {
  const startTok = this._advance(); // consume Jika/If

  // Parse condition expression
  const condition = this._parseExpression();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after condition');

  const loc = this._makeLoc(startTok);

  // Parse consequent block
  const consequent = this._parseBlock();

  // Check for Lainnya/Else
  let alternate = null;
  if (this._peek().type === TT.TK_LAINNYA) {
    this._advance(); // consume Lainnya/Else
    if (this._peek().type === TT.TK_COLON) this._advance(); // optional colon
    alternate = this._parseBlock();
  }

  return AST.buatJikaStatement(condition, consequent, loc, null, alternate);
};

// --- Ulangi Statement ---
PromptJSParser.prototype._parseUlangiStatement = function () {
  const startTok = this._advance(); // consume Ulangi/Loop

  // Counted loop: "Ulangi N kali:" / "Loop N times:" (kind = 'kali').
  if (this._peek().type !== TT.TK_UNTUK) {
    const countExpr = this._parseExpression();
    if (countExpr && this._peek().type === TT.TK_KALI) {
      this._advance(); // consume kali/times
      this._expect(TT.TK_COLON, 'Expected ":" after counted loop');
      const countLoc = this._makeLoc(startTok);
      const countBody = this._parseBlock();
      return AST.buatUlangiStatement(null, countExpr, countBody, 'kali', countLoc, null, null);
    }
    // Neither "untuk/for" nor a valid "N kali/times" counted loop.
    this.errors.push({
      code: 'E2010',
      severity: 'error',
      message: 'Expected "untuk/for" after "ulangi/loop"',
      line: startTok.line,
      column: startTok.col,
      suggestion: 'Syntax: Ulangi untuk item in $collection:  (atau: Ulangi N kali:)',
    });
    return null;
  }
  this._advance(); // consume untuk/for

  // Iterator name
  const iteratorTok = this._expect(TT.TK_IDENT, 'Expected iterator variable name');
  const iteratorName = iteratorTok ? iteratorTok.value : '_';

  // Expect "in"
  if (this._peek().type !== TT.TK_IN) {
    this.errors.push({
      code: 'E2011',
      severity: 'error',
      message: 'Expected "in" after iterator name',
      line: this._peek().line,
      column: this._peek().col,
      suggestion: 'Syntax: Ulangi untuk item in $collection:',
    });
    return null;
  }
  this._advance(); // consume in

  // Source expression
  const source = this._parseExpression();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after loop source');

  const loc = this._makeLoc(startTok);

  // Parse body block
  const body = this._parseBlock();

  return AST.buatUlangiStatement(iteratorName, source, body, 'dari', loc, null, null);
};

// --- Pass Statement ---
PromptJSParser.prototype._parsePassStatement = function () {
  const tok = this._advance(); // consume pass/Lewati
  return AST.buatLewatiStatement(this._makeLoc(tok));
};

// --- Text Node (NEW — string literal as child) ---
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

// --- On-Event Statement (synthesized into KetikaStatement) ---
PromptJSParser.prototype._parseOnEventStatement = function () {
  const startTok = this._advance(); // consume ON_EVENT
  const eventName = startTok.value;

  // Map to PromptJS event name
  const promptjsEvent = EVENT_ALIASES[eventName] || eventName;

  // Expect =
  this._expect(TT.TK_ASSIGN, 'Expected "=" after event name');

  // Parse action expression
  const action = this._parseExpression();

  const loc = this._makeLoc(startTok);

  // Synthesize KetikaStatement (self-referencing — target will be resolved in Resolver)
  return AST.buatKetikaStatement(promptjsEvent, loc, null, null, null, action);
};

// --- Property or Expression line ---
PromptJSParser.prototype._parsePropertyOrExpr = function () {
  // Check if this is key = value
  if (this._peekAt(1).type === TT.TK_ASSIGN) {
    const keyTok = this._advance(); // consume key IDENT
    this._advance(); // consume =
    const value = this._parseExpression();
    return AST.buatPropertyNode(keyTok.value, value, this._makeLoc(keyTok), false);
  }

  // Otherwise it's an expression statement
  return this._parseExpression();
};

// --- Data declarations ---
PromptJSParser.prototype._parseDataDeclaration = function () {
  const kindTok = this._advance(); // consume keyword
  const keyword = kindTok.value.toLowerCase();

  // Parse name
  const nameTok = this._expect(TT.TK_IDENT, 'Expected variable name');
  const name = nameTok ? nameTok.value : '_';

  // Optional type hint
  const typeHint = null;
  // (PromptJS v0.1 doesn't support type hints yet)

  // Expect =
  let init = null;
  if (this._match(TT.TK_ASSIGN)) {
    init = this._parseExpression();
  }

  const loc = this._makeLoc(kindTok);

  switch (keyword) {
    case 'data':
    case 'state':
      return AST.buatDataDeclaration(name, typeHint, init, loc, null);
    case 'tetap':
    case 'const':
      return AST.buatTetapDeclaration(name, typeHint, init, loc, null);
    case 'ubah':
    case 'let':
      return AST.buatUbahDeclaration(name, typeHint, init, loc, null);
    case 'turunan':
    case 'derived':
      return AST.buatTurunanDeclaration(name, typeHint, init, loc, null);
    default:
      return AST.buatTetapDeclaration(name, typeHint, init, loc, null);
  }
};

// --- Fungsi Declaration ---
PromptJSParser.prototype._parseFungsiDeclaration = function () {
  const startTok = this._advance(); // consume Fungsi/Func
  const nameTok = this._expect(TT.TK_IDENT, 'Expected function name');
  const name = nameTok ? nameTok.value : '_fn';

  // Parse parameters
  const params = [];
  if (this._match(TT.TK_LPAREN)) {
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      const pTok = this._expect(TT.TK_IDENT, 'Expected parameter name');
      if (pTok) params.push(AST.buatParameter(pTok.value, null, null, null));
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")"');
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after function signature');

  const loc = this._makeLoc(startTok);
  const body = this._parseBlock();

  return AST.buatFungsiDeclaration(name, params, body, loc, null, null);
};

// --- Define Component ---
PromptJSParser.prototype._parseDefineComponent = function () {
  const startTok = this._advance(); // consume Definisikan/Define
  const nameTok = this._expect(TT.TK_IDENT, 'Expected component name');
  const name = nameTok ? nameTok.value : '_comp';

  // Register component name for disambiguation
  this.componentNames.add(name);

  // Parse parameters
  const params = [];
  if (this._match(TT.TK_LPAREN)) {
    while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
      const pTok = this._expect(TT.TK_IDENT, 'Expected parameter name');
      if (pTok) params.push(AST.buatParameter(pTok.value, null, null, null));
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RPAREN, 'Expected ")"');
  }

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after component definition');

  const loc = this._makeLoc(startTok);
  const body = this._parseBlock();

  return AST.buatKomponenDeclaration(name, params, body, loc, null, null);
};

// --- Saat Statement ---
PromptJSParser.prototype._parseSaatStatement = function () {
  const startTok = this._advance(); // consume Saat/When

  // Parse target (the reactive variable being watched)
  const target = this._parseExpression();

  // Expect colon
  this._expect(TT.TK_COLON, 'Expected ":" after saat target');

  const loc = this._makeLoc(startTok);
  const body = this._parseBlock();

  return AST.buatSaatStatement(target, body, loc, null);
};

// --- Return Statement ---
PromptJSParser.prototype._parseReturnStatement = function () {
  const startTok = this._advance(); // consume Kembalikan/Return
  let value = null;
  if (
    this._peek().type !== TT.TK_COLON &&
    this._peek().type !== TT.TK_INDENT &&
    this._peek().type !== TT.TK_DEDENT
  ) {
    value = this._parseExpression();
  }
  return AST.buatKembalikanStatement(this._makeLoc(startTok), value);
};

// --- Expression parsing (Pratt-style, simplified) ---
PromptJSParser.prototype._parseExpression = function () {
  return this._parseBinaryExpression(0);
};

PromptJSParser.prototype._parseBinaryExpression = function (minPrec) {
  let left = this._parseUnaryExpression();

  const PRECEDENCE = {
    [TT.TK_OR]: 1,
    [TT.TK_AND]: 2,
    [TT.TK_EQ]: 3,
    [TT.TK_NEQ]: 3,
    [TT.TK_GT]: 4,
    [TT.TK_GTE]: 4,
    [TT.TK_LT]: 4,
    [TT.TK_LTE]: 4,
    [TT.TK_PLUS]: 5,
    [TT.TK_MINUS]: 5,
    [TT.TK_STAR]: 6,
    [TT.TK_SLASH]: 6,
    [TT.TK_MOD]: 6,
  };

  while (true) {
    const opTok = this._peek();
    const prec = PRECEDENCE[opTok.type];
    if (!prec || prec < minPrec) break;

    this._advance(); // consume operator
    const right = this._parseBinaryExpression(prec + 1);

    // Map operator token to JS operator string
    const opMap = {
      [TT.TK_PLUS]: '+',
      [TT.TK_MINUS]: '-',
      [TT.TK_STAR]: '*',
      [TT.TK_SLASH]: '/',
      [TT.TK_MOD]: '%',
      [TT.TK_GT]: '>',
      [TT.TK_GTE]: '>=',
      [TT.TK_LT]: '<',
      [TT.TK_LTE]: '<=',
      [TT.TK_EQ]: '===',
      [TT.TK_NEQ]: '!==',
      [TT.TK_AND]: '&&',
      [TT.TK_OR]: '||',
    };
    const opStr = opMap[opTok.type] || opTok.value;

    left = AST.buatBinaryExpression(opStr, left, right, this._makeLoc(opTok));
  }

  return left;
};

PromptJSParser.prototype._parseUnaryExpression = function () {
  if (this._peek().type === TT.TK_NOT) {
    const opTok = this._advance();
    const operand = this._parseUnaryExpression();
    return AST.buatUnaryExpression('!', operand, this._makeLoc(opTok), true);
  }
  if (this._peek().type === TT.TK_MINUS) {
    const opTok = this._advance();
    const operand = this._parseUnaryExpression();
    return AST.buatUnaryExpression('-', operand, this._makeLoc(opTok), true);
  }
  return this._parsePostfixExpression();
};

PromptJSParser.prototype._parsePostfixExpression = function () {
  let expr = this._parsePrimaryExpression();

  while (true) {
    if (this._peek().type === TT.TK_DOT) {
      this._advance(); // consume DOT
      const propTok = this._expect(TT.TK_IDENT, 'Expected property name after "."');
      if (propTok) {
        expr = AST.buatMemberExpression(expr, AST.buatIdentifier(propTok.value, null), null);
      }
    } else if (this._peek().type === TT.TK_LPAREN) {
      // Function call
      this._advance(); // consume (
      const args = [];
      while (this._peek().type !== TT.TK_RPAREN && !this._atEnd()) {
        args.push(this._parseExpression());
        if (!this._match(TT.TK_COMMA)) break;
      }
      this._expect(TT.TK_RPAREN, 'Expected ")"');
      expr = AST.buatCallExpression(expr, args, null);
    } else {
      break;
    }
  }

  return expr;
};

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

  // Identifier or keyword-as-identifier
  if (tok.type === TT.TK_IDENT) {
    this._advance();
    return AST.buatIdentifier(tok.value, this._makeLoc(tok));
  }

  // Parenthesized expression
  if (tok.type === TT.TK_LPAREN) {
    this._advance();
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
      const keyTok = this._expect(TT.TK_IDENT, 'Expected property key');
      if (!this._match(TT.TK_COLON) && !this._match(TT.TK_ASSIGN)) break;
      const val = this._parseExpression();
      if (keyTok) props.push(AST.buatPropertyNode(keyTok.value, val, null, false));
      if (!this._match(TT.TK_COMMA)) break;
    }
    this._expect(TT.TK_RBRACE, 'Expected "}"');
    return AST.buatObjectLiteral(props, null);
  }

  // Fallback: skip and report
  this._advance();
  this.errors.push({
    code: 'E2020',
    severity: 'error',
    message: `Unexpected token: ${tok.type} ("${tok.value}")`,
    line: tok.line,
    column: tok.col,
    suggestion: '',
  });
  return AST.buatLiteral(null, 'null', null);
};

// --- Module index ---
module.exports = {
  PromptJSParser,
  parse(tokens, frontMatterData) {
    const parser = new PromptJSParser();
    return parser.parse(tokens, frontMatterData);
  },
};
