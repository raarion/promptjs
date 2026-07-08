// @ts-check

/**
 * PromptJS v1.0.0 — Engine (Pipeline Orchestrator) / Orkestrator Pipeline
 * ============================================================================
 *
 * Wires: Lexer → Parser → Resolver → Analyzer → Compiler.
 * v0.4.0: Module system (Wave H) + CSS support (Wave I).
 * v0.8.0: Plugin system — 4 transform hooks applied per compile/build.
 *
 * Extended result: { js, css, errors, warnings, ast, success }
 */

'use strict';

const Lexer = require('../lexer/promptjs-lexer');
const Parser = require('../parser/promptjs-parser');
const Resolver = require('../resolver/promptjs-resolver');
const Analyzer = require('../analyzer/promptjs-analyzer');
const Compiler = require('../compiler/promptjs-compiler');
const Modules = require('./modules');
const CSS = require('./css');
const Plugins = require('./plugins');

const fs = require('fs');
const path = require('path');

/**
 * Hasil kompilasi PromptJS.
 *
 * @typedef {Object} CompileResult
 * @property {string | null} js - Kode JavaScript hasil compile (null jika gagal)
 * @property {string} css - Kode CSS hasil compile Gaya:/Style: blocks (kosong jika tidak ada)
 * @property {Object[]} errors - Daftar error
 * @property {Object[]} warnings - Daftar warning
 * @property {Object | null} ast - Root AST node (null jika gagal sebelum parser selesai)
 * @property {boolean} success - `true` jika js tidak null dan tidak ada error severity 'error'
 * @property {Object | null} sourceMap - Source Map V3 object (v0.5)
 * @property {boolean} isSPA - Whether this page was compiled in SPA mode (v0.6)
 */

/**
 * Constructor PromptJSEngine — orchestrator pipeline 5 tahap.
 *
 * @constructor
 * @this {PromptJSEngine}
 */
function PromptJSEngine() {
  this.errors = [];
  this.warnings = [];
  this.options = {
    source: 'promptjs',
    dev: false,
    dataDir: null,
    loadDataFiles: true,
  };
}

/**
 * Compile a PromptJS source string into vanilla JS.
 *
 * @param {string} sourceInput - PromptJS source code
 * @param {object} [options] - Compilation options
 * @param {string} [options.source] - Source identifier for comments
 * @param {boolean} [options.dev] - Dev mode (includes source maps, HMR helpers)
 * @param {string} [options.dataDir] - Directory to resolve relative data file paths
 * @param {boolean} [options.loadDataFiles] - Whether to load file-referenced data (default: true)
 * @param {string} [options.pageName] - Page name for SPA factory function (v0.6)
 * @param {string} [options.pageRoute] - Route path for SPA page (v0.6)
 * @param {Array} [options.plugins] - Plugin instances (v0.8)
 * @returns {object} { js, css, errors, warnings, ast, sourceMap, success }
 */
PromptJSEngine.prototype.compile = function (sourceInput, options) {
  this.errors = [];
  this.warnings = [];
  Object.assign(this.options, options || {});

  // v0.8: Apply transformSource hook (before any pipeline stage)
  const plugins = this.options.plugins || [];
  const filename = this.options.source || 'unknown.pjs';
  const source = Plugins.transformSource(plugins, sourceInput, filename);

  // ── v132 #79: CSS scoping opt-in detection ──────────────────────────────
  // `gayaCakupan: benar` (front-matter) opts a file into scoped `Gaya:`
  // output (both the CSS selector string AND a matching DOM attribute
  // stamped by the compiler — see below). Front-matter is normally only
  // available AFTER the real Lexer.tokenize() call, which itself only runs
  // on `cleanSource` (i.e. AFTER CSS extraction). To break this chicken-
  // and-egg dependency, peek-tokenize the RAW `source` here just to read
  // `.frontMatter` — front-matter lines are always the very first lines of
  // a file (either `---`-delimited or implicit known-directives), entirely
  // independent of any `Gaya:`/`Style:` block appearing later, so this is
  // safe even if the peek encounters CSS-derived tokens the lexer doesn't
  // understand (e.g. `@media`) elsewhere in the file — those diagnostics
  // are intentionally discarded; only `.frontMatter` is used here.
  //
  // IMPORTANT (fixes a real bug found during the #79 Lapis 4 audit):
  // `this.options.scope`, if a caller (e.g. Builder.buildPage) passes one,
  // must NEVER cause scoping on its own — before this fix, `buildProject`
  // silently passed a per-page `scope` unconditionally, which would have
  // made EVERY existing project's CSS "scoped" (and, once DOM-stamping is
  // added, actually visibly different) the moment stamping was implemented,
  // with zero consent. Scoping is now gated ONLY by the explicit front-
  // matter opt-in, never by the mere presence of a `scope` option.
  let cssScopingEnabled = false;
  try {
    const fmPeek = Lexer.tokenize(source);
    if (fmPeek.frontMatter && fmPeek.frontMatter.length > 0) {
      const peekFrontMatter = Lexer.parseFrontMatter(fmPeek.frontMatter);
      if (peekFrontMatter && peekFrontMatter.gayaCakupan) {
        const gcRaw = peekFrontMatter.gayaCakupan;
        const gcVal = gcRaw && gcRaw.value !== undefined ? gcRaw.value : gcRaw;
        cssScopingEnabled = gcVal === true || gcVal === 'benar' || gcVal === 'true';
      }
    }
  } catch {
    // A peek failure must never break the real compile pipeline below —
    // fall back to scoping disabled (safest / most backward-compatible).
    cssScopingEnabled = false;
  }

  // File-level scope id: prefer an explicit `options.scope` (e.g. Builder
  // passes the page's file basename) so existing callers keep the same
  // naming; otherwise derive it from `options.source` (also a filename in
  // `compileFile()`, defaults to `"promptjs"`/`"unknown.pjs"` for direct
  // `compile()` calls). Computed unconditionally — it's inert unless
  // `cssScopingEnabled` is true.
  const cssFileScope = this.options.scope || String(filename).replace(/\.pjs$/i, '') || 'promptjs';

  // ── Wave I: CSS extraction (before lexing) ─────────────────────────────
  // Extract Gaya:/Style: blocks from source, produce CSS + clean source.
  // Scoping (selector-string side) only actually applies when the opt-in
  // above is active — see `extractGayaBlocks`'s `opts.scoped` gate.
  const cssResult = CSS.processGayaBlocks(source, cssFileScope, { scoped: cssScopingEnabled });
  let css = cssResult.css;
  const cleanSource = cssResult.cleanSource;

  // ── Stage 1: LEXER ──────────────────────────────────────────────────────
  const lexResult = Lexer.tokenize(cleanSource);

  if (lexResult.errors && lexResult.errors.length > 0) {
    this.errors.push(...lexResult.errors);
    return this._makeResult(null, lexResult.errors, [], null, css);
  }

  // ── Front-matter parsing ────────────────────────────────────────────────
  let frontMatterData = null;
  if (lexResult.frontMatter && lexResult.frontMatter.length > 0) {
    frontMatterData = Lexer.parseFrontMatter(lexResult.frontMatter);

    // Load file-referenced data if enabled
    if (this.options.loadDataFiles && frontMatterData) {
      frontMatterData = this._loadDataFiles(frontMatterData);
    }
  }

  // ── Wave H: Module system — resolve kirim/terima directives ────────────
  if (frontMatterData) {
    const { shares, imports, hasModuleDirectives } =
      Modules.extractModuleDirectives(frontMatterData);
    if (hasModuleDirectives) {
      // Resolve imports (terima/get) by loading referenced files
      if (Object.keys(imports).length > 0) {
        const baseDir = this.options.dataDir || process.cwd();
        const importResult = Modules.resolveImports(imports, baseDir);
        if (importResult.errors.length > 0) {
          this.errors.push(...importResult.errors);
        }
        if (importResult.warnings.length > 0) {
          this.warnings.push(...importResult.warnings);
        }
        // Merge resolved import values into front-matter data
        frontMatterData = Modules.mergeImportsToFrontMatter(frontMatterData, importResult.values);
      }
      // Add shares (kirim) as inline data — they'll be available as $external symbols
      for (const [name, value] of Object.entries(shares)) {
        if (!value || !value.__reExport) {
          frontMatterData[name] = { type: 'inline', value: value };
        }
      }
    }
  }

  // ── Filter compiler directives from front-matter data ─────────────────
  // Keys like `router`, `adapter`, `butuhAuth` are compiler directives,
  // not user data. They should NOT become TetapDeclaration nodes in the AST
  // (which would emit `const router = "benar"` to output — wasteful).
  const FRONT_MATTER_DIRECTIVES = new Set([
    'router',
    'adapter',
    'butuhAuth',
    'redirect',
    'token',
    'tokenKey',
    'peran',
    // Module directives — handled by modules.js, not the parser
    'kirim',
    'share',
    'terima',
    'get',
    // v132 #79: opt-in CSS scoping directive — handled above (CSS
    // extraction stage) and by the compiler, not the parser. Without this
    // entry, `gayaCakupan: benar` would leak into the AST as a spurious
    // `const gayaCakupan = "benar";` TetapDeclaration in the compiled JS.
    'gayaCakupan',
  ]);
  let parserFrontMatter = frontMatterData;
  if (frontMatterData) {
    parserFrontMatter = {};
    for (const [key, val] of Object.entries(frontMatterData)) {
      if (!FRONT_MATTER_DIRECTIVES.has(key)) {
        parserFrontMatter[key] = val;
      }
    }
    if (Object.keys(parserFrontMatter).length === 0) parserFrontMatter = null;
  }

  // ── Stage 2: PARSER ─────────────────────────────────────────────────────
  const parseResult = Parser.parse(lexResult.tokens, parserFrontMatter);

  if (parseResult.errors && parseResult.errors.length > 0) {
    this.errors.push(...parseResult.errors);
    // Still try to continue with partial AST for error recovery
    if (!parseResult.ast) {
      return this._makeResult(null, this.errors, [], null, css);
    }
  }
  // v132 stabilization: surface parser-level warnings (mis. W2005 unknown
  // event modifier) — previously the parser had no warnings channel at all.
  if (parseResult.warnings && parseResult.warnings.length > 0) {
    this.warnings.push(...parseResult.warnings);
  }

  const ast = parseResult.ast;

  // ── Stage 3: RESOLVER ───────────────────────────────────────────────────
  // Pass front-matter data to resolver for $external symbol registration
  const resolver = new Resolver();
  resolver._frontMatterData = frontMatterData; // Patch hook
  // [DX-1 FIX] When the parser hit an unrecoverable token error (E2020), the
  // partial AST contains broken subtrees; suppress the misleading E3001
  // "identifier not declared" cascade that would otherwise blame tags/labels
  // (e.g. "span tidak dideklarasikan") for a syntax error.
  resolver._suppressUndeclaredCascade = !!parseResult.hadFatalParseError;

  let resolveResult;
  try {
    resolveResult = resolver.resolve(ast);
  } catch (resolveErr) {
    this.errors.push({
      code: 'E0000',
      severity: 'error',
      message: `Resolver error: ${resolveErr.message}`,
      suggestion: '',
    });
    return this._makeResult(null, this.errors, [], null, css);
  }

  if (resolveResult.errors && resolveResult.errors.length > 0) {
    this.errors.push(...resolveResult.errors);
  }
  // BUG FIX (D2.1): Resolver warnings (W3002, W3003, W4003) were silently
  // discarded — engine only collected analyzer warnings. Forward resolver
  // warnings to the result so they're visible to the user.
  if (resolveResult.warnings && resolveResult.warnings.length > 0) {
    this.warnings.push(...resolveResult.warnings);
  }

  // ── Stage 4: ANALYZER ───────────────────────────────────────────────────
  const analyzer = new Analyzer();
  let analyzeResult;
  try {
    analyzeResult = analyzer.analyze(resolveResult.ast, {
      usageWarnings: 'normal',
    });
  } catch (analyzeErr) {
    this.errors.push({
      code: 'E0000',
      severity: 'error',
      message: `Analyzer error: ${analyzeErr.message}`,
      suggestion: '',
    });
    return this._makeResult(null, this.errors, [], null, css);
  }

  if (analyzeResult.errors && analyzeResult.errors.length > 0) {
    this.errors.push(...analyzeResult.errors);
  }
  if (analyzeResult.warnings && analyzeResult.warnings.length > 0) {
    this.warnings.push(...analyzeResult.warnings);
  }

  // Stop if there are fatal errors (don't compile invalid code)
  const hasFatalErrors = this.errors.some((e) => e.severity === 'error');
  if (hasFatalErrors) {
    return this._makeResult(null, this.errors, this.warnings, null, css);
  }

  // ── Stage 5: COMPILER ───────────────────────────────────────────────────
  // v0.6: Detect SPA mode from front-matter (router: benar / router: true)
  let isSPA = false;
  const pageName = this.options.pageName || 'page';
  const pageRoute = this.options.pageRoute || null;
  if (frontMatterData && frontMatterData.router) {
    const routerVal = frontMatterData.router;
    const rawVal = routerVal && routerVal.value !== undefined ? routerVal.value : routerVal;
    if (rawVal === true || rawVal === 'benar' || rawVal === 'true') {
      isSPA = true;
    }
  }

  // v0.9: Detect auth directives from front-matter (butuhAuth, redirect, token, tokenKey, peran)
  let butuhAuth = false;
  let authRedirect = '/login';
  let authToken = 'localStorage';
  let authTokenKey = 'token';
  let authPeran = null;
  if (frontMatterData && frontMatterData.butuhAuth) {
    const authVal = frontMatterData.butuhAuth;
    const rawVal = authVal && authVal.value !== undefined ? authVal.value : authVal;
    if (rawVal === true || rawVal === 'benar' || rawVal === 'true') {
      butuhAuth = true;
      // Redirect target
      if (frontMatterData.redirect) {
        const redir = frontMatterData.redirect;
        authRedirect = redir && redir.value !== undefined ? redir.value : redir;
      }
      // Token source (localStorage atau sessionStorage)
      if (frontMatterData.token) {
        const tok = frontMatterData.token;
        const tokVal = tok && tok.value !== undefined ? tok.value : tok;
        // Support dot notation: "localStorage.auth_token" → source=localStorage, key=auth_token
        if (typeof tokVal === 'string' && tokVal.includes('.')) {
          const dotIdx = tokVal.indexOf('.');
          authToken = tokVal.substring(0, dotIdx);
          authTokenKey = tokVal.substring(dotIdx + 1);
        } else {
          authToken = tokVal;
        }
      }
      // Token key name (explicit override, takes precedence over dot notation)
      if (frontMatterData.tokenKey) {
        const tk = frontMatterData.tokenKey;
        authTokenKey = tk && tk.value !== undefined ? tk.value : tk;
      }
      // Role check (v0.9.9: now emits runtime guard)
      if (frontMatterData.peran) {
        const rol = frontMatterData.peran;
        authPeran = rol && rol.value !== undefined ? rol.value : rol;
      }
    }
  }

  // ── S-1 (v1.0.0): Validate auth front-matter sebelum di-emit ke codegen ──
  // Compiler menjahit nilai ini ke output JS, jadi nilai mentah tak-tepercaya
  // tidak boleh lolos. `authToken` di-emit sebagai identifier telanjang →
  // WAJIB whitelist. `authRedirect` di-emit sebagai URL → tolak skema aktif.
  if (butuhAuth) {
    const ALLOWED_TOKEN_STORAGE = ['localStorage', 'sessionStorage'];
    if (!ALLOWED_TOKEN_STORAGE.includes(authToken)) {
      this.errors.push({
        code: 'E5004',
        severity: 'error',
        message: `Sumber penyimpanan token auth tidak valid: "${authToken}". Hanya "localStorage" atau "sessionStorage" yang diizinkan`,
        suggestion:
          'Setel front-matter "token:" ke "localStorage" atau "sessionStorage" (opsional dengan ".namaKunci")',
      });
    }
    // Tolak skema URL aktif pada redirect (javascript:, data:, vbscript:).
    if (typeof authRedirect === 'string') {
      const scheme = authRedirect.trim().toLowerCase();
      if (/^(javascript|data|vbscript):/i.test(scheme)) {
        this.errors.push({
          code: 'E5005',
          severity: 'error',
          message: `Target redirect auth memakai skema tidak aman: "${authRedirect}". Gunakan path relatif/absolut, bukan "javascript:" atau "data:"`,
          suggestion:
            'Setel "redirect:" ke path seperti "/login" atau URL http(s), bukan skema "javascript:"/"data:"',
        });
      }
    }
    if (this.errors.some((e) => e.severity === 'error')) {
      return this._makeResult(null, this.errors, this.warnings, null, css);
    }
  }

  // Attach SPA flags to AST so the compiler can access them
  if (analyzeResult.ast) {
    analyzeResult.ast.isSPA = isSPA;
    analyzeResult.ast.pageName = pageName;
    analyzeResult.ast.pageRoute = pageRoute;
    // v0.9: Attach auth directives
    analyzeResult.ast.butuhAuth = butuhAuth;
    analyzeResult.ast.authRedirect = authRedirect;
    analyzeResult.ast.authToken = authToken;
    analyzeResult.ast.authTokenKey = authTokenKey;
    analyzeResult.ast.authPeran = authPeran;
    // v132 #79: CSS scoping opt-in — compiler needs both the flag (whether
    // to stamp `data-pjs-*` attributes at all) and the file-level scope
    // segment (to build `<fileScope>` / `<fileScope>-<componentName>` ids
    // identical to the ones `CSS.processGayaBlocks` already used above).
    analyzeResult.ast.cssScopingEnabled = cssScopingEnabled;
    analyzeResult.ast.cssFileScope = cssFileScope;
  }

  const compiler = new Compiler();
  let js;
  let sourceMap;
  try {
    js = compiler.compile(analyzeResult.ast);
    // v0.5: Generate source map
    sourceMap = compiler.generateSourceMap();
  } catch (compileErr) {
    this.errors.push({
      code: 'E5001',
      severity: 'error',
      message: `Compiler error: ${compileErr.message}`,
      suggestion: 'Sederhanakan kode atau gunakan tag HTML langsung',
    });
    return this._makeResult(null, this.errors, this.warnings, null, css);
  }

  // v0.8: Apply transformJS and transformCSS hooks (after compile)
  js = Plugins.transformJS(plugins, js, filename);
  css = Plugins.transformCSS(plugins, css, filename);

  return this._makeResult(js, this.errors, this.warnings, analyzeResult.ast, css, sourceMap);
};

/**
 * Compile a .pjs file.
 *
 * @param {string} filePath - Path to .pjs file
 * @param {object} [options] - Compilation options
 * @returns {object} Same as compile()
 */
PromptJSEngine.prototype.compileFile = function (filePath, options) {
  const opts = Object.assign({}, options || {});
  if (!opts.dataDir) {
    opts.dataDir = path.dirname(path.resolve(filePath));
  }
  if (!opts.source) {
    opts.source = path.basename(filePath);
  }

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch (readErr) {
    return this._makeResult(
      null,
      [
        {
          code: 'E0000',
          severity: 'error',
          message: `Cannot read file: ${filePath} — ${readErr.message}`,
          suggestion: 'Pastikan file ada dan dapat dibaca',
        },
      ],
      [],
      null,
      ''
    );
  }

  return this.compile(source, opts);
};

/**
 * Load data files referenced in front-matter.
 *
 * Replaces `{ type: 'file', path: './data/produk.json' }` with
 * `{ type: 'inline', value: <loaded data> }` so the pipeline can use it directly.
 *
 * Format file yang didukung:
 * - `.json` → parse dengan `JSON.parse`
 * - `.csv` → parse sederhana (first line = headers, koma separator)
 * - Lainnya → treat as raw text string
 *
 * Jika file tidak ditemukan:
 * - Di dev mode: keep as file reference (akan di-load runtime)
 * - Di production: emit warning + set value `null`
 *
 * @param {Object<string, any>} frontMatterData - Data front-matter dari lexer
 * @returns {Object<string, any>} Data front-matter yang sudah di-load
 */
PromptJSEngine.prototype._loadDataFiles = function (frontMatterData) {
  const dataDir = this.options.dataDir || process.cwd();
  const result = /** @type {Object<string, any>} */ ({});

  for (const [name, info] of Object.entries(frontMatterData)) {
    if (info.type === 'file') {
      const filePath = path.resolve(dataDir, info.path);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.json') {
          result[name] = { type: 'inline', value: JSON.parse(content) };
        } else if (ext === '.csv') {
          // Basic CSV parsing: split lines, split commas, first line = headers
          const lines = content.trim().split('\n');
          const headers = lines[0].split(',').map((h) => h.trim());
          const rows = lines.slice(1).map((line) => {
            const vals = line.split(',').map((v) => v.trim());
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = vals[i] || '';
            });
            return obj;
          });
          result[name] = { type: 'inline', value: rows };
        } else {
          // Treat as text
          result[name] = { type: 'inline', value: content };
        }
      } catch (loadErr) {
        // If file not found in dev mode, keep as file reference (will be loaded at runtime)
        if (this.options.dev) {
          result[name] = info; // Keep as file reference
        } else {
          this.warnings.push({
            code: 'W0000',
            severity: 'warning',
            message: `Cannot load data file: ${info.path} — ${loadErr.message}`,
            suggestion: 'Pastikan file data ada di path yang benar',
          });
          result[name] = { type: 'inline', value: null };
        }
      }
    } else {
      result[name] = info; // Already inline
    }
  }

  return result;
};

/**
 * Build result object — format konsisten untuk return value `compile` / `compileFile`.
 *
 * `success` di-set `true` hanya jika `js` tidak null DAN tidak ada error dengan
 * severity 'error' di `errors` (warning tidak mempengaruhi success).
 *
 * @param {string | null} js - Kode JavaScript hasil compile (null jika gagal)
 * @param {Object[]} errors - Daftar error
 * @param {Object[]} warnings - Daftar warning
 * @param {Object | null} [ast] - Root AST node (opsional)
 * @param {string} [css] - Kode CSS hasil compile (opsional)
 * @param {Object} [sourceMap] - Source map V3 (opsional, v0.5)
 * @returns {CompileResult} Result object
 */
PromptJSEngine.prototype._makeResult = function (js, errors, warnings, ast, css, sourceMap) {
  return /** @type {CompileResult} */ ({
    js: js,
    css: css || '',
    errors: errors || [],
    warnings: warnings || [],
    ast: ast || null,
    sourceMap: sourceMap || null,
    isSPA: (ast && ast.isSPA) || false,
    success: js !== null && (!errors || errors.every((e) => e.severity !== 'error')),
  });
};

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  PromptJSEngine: PromptJSEngine,
  compile(source, options) {
    const engine = new PromptJSEngine();
    return engine.compile(source, options);
  },
  compileFile(filePath, options) {
    const engine = new PromptJSEngine();
    return engine.compileFile(filePath, options);
  },
};
