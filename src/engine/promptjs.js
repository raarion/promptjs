// @ts-check

/**
 * PromptJS v0.2 — Engine (Pipeline Orchestrator) / Orkestrator Pipeline
 * ============================================================================
 *
 * Wires: Lexer → Parser → Resolver → Analyzer → Compiler.
 * Adapted from promptjs/engine/promptjs.js but with PromptJS-specific pipeline.
 *
 * Key differences from PromptJS engine:
 *   - Front-matter data extraction before lexing
 *   - Front-matter data passed to parser for $external pre-declaration
 *   - Data file loading for file-referenced front-matter entries
 *   - Tag alias resolution at compile time
 *   - TextNode handling in all downstream stages
 */

'use strict';

const Lexer = require('../lexer/promptjs-lexer');
const Parser = require('../parser/promptjs-parser');
const Resolver = require('../resolver/promptjs-resolver');
const Analyzer = require('../analyzer/promptjs-analyzer');
const Compiler = require('../compiler/promptjs-compiler');

const fs = require('fs');
const path = require('path');

/**
 * Hasil kompilasi PromptJS.
 *
 * @typedef {Object} CompileResult
 * @property {string | null} js - Kode JavaScript hasil compile (null jika gagal)
 * @property {Object[]} errors - Daftar error
 * @property {Object[]} warnings - Daftar warning
 * @property {Object | null} ast - Root AST node (null jika gagal sebelum parser selesai)
 * @property {boolean} success - `true` jika js tidak null dan tidak ada error severity 'error'
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
 * @param {string} source - PromptJS source code
 * @param {object} [options] - Compilation options
 * @param {string} [options.source] - Source identifier for comments
 * @param {boolean} [options.dev] - Dev mode (includes source maps, HMR helpers)
 * @param {string} [options.dataDir] - Directory to resolve relative data file paths
 * @param {boolean} [options.loadDataFiles] - Whether to load file-referenced data (default: true)
 * @returns {object} { js, errors, warnings, ast, semantic }
 */
PromptJSEngine.prototype.compile = function (source, options) {
  this.errors = [];
  this.warnings = [];
  Object.assign(this.options, options || {});

  // ── Stage 1: LEXER ──────────────────────────────────────────────────────
  const lexResult = Lexer.tokenize(source);

  if (lexResult.errors && lexResult.errors.length > 0) {
    this.errors.push(...lexResult.errors);
    return this._makeResult(null, lexResult.errors, []);
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

  // ── Stage 2: PARSER ─────────────────────────────────────────────────────
  const parseResult = Parser.parse(lexResult.tokens, frontMatterData);

  if (parseResult.errors && parseResult.errors.length > 0) {
    this.errors.push(...parseResult.errors);
    // Still try to continue with partial AST for error recovery
    if (!parseResult.ast) {
      return this._makeResult(null, this.errors, []);
    }
  }

  const ast = parseResult.ast;

  // ── Stage 3: RESOLVER ───────────────────────────────────────────────────
  // Pass front-matter data to resolver for $external symbol registration
  const resolver = new Resolver();
  resolver._frontMatterData = frontMatterData; // Patch hook

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
    return this._makeResult(null, this.errors, []);
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
    return this._makeResult(null, this.errors, []);
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
    return this._makeResult(null, this.errors, this.warnings);
  }

  // ── Stage 5: COMPILER ───────────────────────────────────────────────────
  const compiler = new Compiler();
  let js;
  try {
    js = compiler.compile(analyzeResult.ast);
  } catch (compileErr) {
    this.errors.push({
      code: 'E5001',
      severity: 'error',
      message: `Compiler error: ${compileErr.message}`,
      suggestion: 'Sederhanakan kode atau gunakan tag HTML langsung',
    });
    return this._makeResult(null, this.errors, this.warnings);
  }

  return this._makeResult(js, this.errors, this.warnings, analyzeResult.ast);
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
      []
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
 * @param {Object} [ast] - Root AST node (opsional)
 * @returns {CompileResult} Result object
 */
PromptJSEngine.prototype._makeResult = function (js, errors, warnings, ast) {
  return {
    js: js,
    errors: errors || [],
    warnings: warnings || [],
    ast: ast || null,
    success: js !== null && (!errors || errors.every((e) => e.severity !== 'error')),
  };
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
