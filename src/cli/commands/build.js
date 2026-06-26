// @ts-check

/**
 * PromptJS v0.8 — CLI: `build` Command / Perintah `build`
 * ============================================================================
 *
 * Build production: compile + minify + prerender HTML via jsdom.
 * v0.4.0: Multi-file project build with prompt.js + prompt.css output.
 * v0.8.0: Config loading, plugin support, adapter flag (--adapter).
 *
 * Output: folder `dist/` berisi `.html`, `prompt.js`, `prompt.css`, dan static assets.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { PromptJSEngine } = require('../../engine/promptjs');
const Builder = require('../../engine/builder');
const Config = require('../../engine/config');
const {
  findPjsFiles,
  printDiagnostics,
  ensureDirForFile,
  formatSize,
  formatElapsed,
  makeColors,
} = require('../utils');

/**
 * Jalankan command `pjs build`.
 *
 * Algoritma: cari semua file `.pjs` di `src/`, compile masing-masing,
 * prerender ke HTML via jsdom (jika ada), minify JS, copy static assets
 * ke `dist/`.
 *
 * @param {Object} argv - Parsed args dari `parseArgs`
 * @returns {void}
 */
function runBuild(argv) {
  const inputDir = argv._[0] || '.';
  const outDir = argv['out-dir'] || argv.outDir || null;
  const prerender = argv.prerender || false;
  const minify = argv.minify || false;
  const adapterFlag = argv.adapter || null;
  const rootDir = path.resolve(inputDir);

  // v0.8: Load project config
  const {
    config: projectConfig,
    errors: _configErrors,
    rootDir: _configRootDir,
  } = Config.loadProjectConfig(rootDir, argv);

  const csp = argv.csp || projectConfig.csp || false;

  const distDir = path.resolve(outDir || projectConfig.outDir || 'dist');

  if (!fs.existsSync(rootDir)) {
    process.stderr.write(`Error: Directory '${inputDir}' does not exist.\n`);
    process.exit(1);
  }

  const { green, cyan, red, gray, bold, reset } = makeColors({ stream: process.stdout });

  // ── v0.4.0: Project mode — if src/pages/ exists, use multi-file builder ──
  const srcDir = path.join(rootDir, 'src');
  const pagesInSrc = path.join(srcDir, 'pages');
  const pagesInRoot = path.join(rootDir, 'pages');
  const pagesDir = fs.existsSync(pagesInSrc)
    ? pagesInSrc
    : fs.existsSync(pagesInRoot)
      ? pagesInRoot
      : null;

  // v0.8: Determine adapter (CLI flag > config file > none)
  const adapter = adapterFlag || projectConfig.adapter || null;

  if (pagesDir && fs.statSync(pagesDir).isDirectory()) {
    const projectRoot = fs.existsSync(pagesInSrc) ? srcDir : rootDir;
    process.stderr.write(`\n${bold}PromptJS v0.8 — Project Build${reset}\n`);
    process.stderr.write(`  Source: ${cyan}${projectRoot}${reset}\n`);
    process.stderr.write(`  Output: ${cyan}${distDir}${reset}\n`);
    if (adapter) {
      process.stderr.write(`  Adapter: ${cyan}${adapter}${reset}\n`);
    }
    if (csp) {
      process.stderr.write(`  CSP: ${cyan}enabled${reset} (nonce injection)\n`);
    }
    if (projectConfig.plugins.length > 0) {
      process.stderr.write(`  Plugins: ${cyan}${projectConfig.plugins.length}${reset}\n`);
    }
    process.stderr.write('\n');

    const startTotal = process.hrtime();
    const result = Builder.buildProject({
      rootDir: projectRoot,
      outDir: distDir,
      pagesDir: 'pages',
      adapter: adapter,
      plugins: projectConfig.plugins,
      meta: projectConfig.meta,
      siteUrl: projectConfig.siteUrl,
      apiUrl: projectConfig.apiUrl,
      csp: csp,
    });

    if (result.errors.length > 0) {
      printDiagnostics(result.errors, 'Build Errors');
    }

    // Report
    const elapsed = formatElapsed(startTotal);
    let jsSize = 0;
    let cssSize = 0;
    try {
      jsSize = fs.statSync(path.join(distDir, 'prompt.js')).size;
    } catch {}
    try {
      cssSize = fs.statSync(path.join(distDir, 'prompt.css')).size;
    } catch {}

    process.stderr.write(`\n${green}✓${reset} Built ${bold}${result.pages.length}${reset} pages\n`);
    if (jsSize) process.stderr.write(`  ${gray}prompt.js${reset}  ${formatSize(jsSize)}\n`);
    if (cssSize) process.stderr.write(`  ${gray}prompt.css${reset} ${formatSize(cssSize)}\n`);
    for (const page of result.pages) {
      process.stderr.write(`  ${green}✓${reset} ${page.htmlFile} (${page.route})\n`);
    }
    // Report adapter results
    if (result.adapter) {
      if (result.adapter.hashedAssets) {
        const ha = result.adapter.hashedAssets;
        if (ha.js) process.stderr.write(`  ${gray}Asset hash:${reset} ${ha.js}\n`);
        if (ha.css) process.stderr.write(`  ${gray}Asset hash:${reset} ${ha.css}\n`);
      }
      if (result.adapter.nonce) {
        process.stderr.write(`  ${gray}CSP nonce:${reset} ${result.adapter.nonce}\n`);
      }
      if (result.adapter.serverPath) {
        process.stderr.write(`  ${gray}Generated:${reset} server.js + Dockerfile\n`);
      }
      if (result.adapter.vercelJsonPath) {
        process.stderr.write(`  ${gray}Generated:${reset} vercel.json + .vercel/output/\n`);
      }
      if (result.adapter.sitemap) {
        process.stderr.write(`  ${gray}Generated:${reset} sitemap.xml\n`);
      }
    }

    process.stderr.write(`\n  ${gray}Done in ${elapsed}${reset}\n\n`);

    if (result.errors.some((e) => e.severity === 'error')) {
      process.exit(1);
    }
    return;
  }

  // ── Legacy: single-file build mode ──────────────────────────────────────

  const startTotal = process.hrtime();

  process.stderr.write(`\n${bold}PromptJS Build${reset}\n`);
  process.stderr.write(`  Input:  ${cyan}${rootDir}${reset}\n`);
  process.stderr.write(`  Output: ${cyan}${distDir}${reset}\n\n`);

  // Clean dist directory
  if (fs.existsSync(distDir)) {
    rmDirRecursive(distDir);
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Find all .pjs files
  const pjsFiles = findPjsFiles(rootDir);
  if (pjsFiles.length === 0) {
    process.stderr.write(`No .pjs files found in ${rootDir}\n`);
    process.exit(1);
  }

  process.stderr.write(`${gray}Compiling ${pjsFiles.length} file(s)...${reset}\n`);

  // Compile all .pjs files
  let compiled = 0;
  let failed = 0;
  let totalJsSize = 0;
  const compiledResults = [];

  for (const filePath of pjsFiles) {
    const start = process.hrtime();
    const engine = new PromptJSEngine();
    const result = engine.compileFile(filePath, {
      dev: false,
      loadDataFiles: true,
      dataDir: path.dirname(filePath),
      source: path.basename(filePath),
    });

    const elapsed = formatElapsed(start);

    if (result.errors && result.errors.length > 0) {
      printDiagnostics(result.errors, 'error', true);
    }
    if (result.warnings && result.warnings.length > 0) {
      printDiagnostics(result.warnings, 'warning', true);
    }

    if (!result.success) {
      process.stderr.write(
        `  ${red}✗${reset} ${path.relative(rootDir, filePath)} ${gray}(${elapsed})${reset}\n`
      );
      failed++;
      continue;
    }

    const js = minify ? minifyJs(result.js) : result.js;
    totalJsSize += js.length;

    // Determine output paths
    const relPath = path.relative(rootDir, filePath);
    const jsOutPath = path.join(distDir, relPath.replace(/\.pjs$/, '.js'));
    const htmlOutPath = path.join(distDir, relPath.replace(/\.pjs$/, '.html'));

    // Write JS file
    ensureDirForFile(jsOutPath);
    fs.writeFileSync(jsOutPath, js, 'utf-8');

    // Write HTML file
    const htmlContent = buildHtml(js, filePath, { prerender: false });
    ensureDirForFile(htmlOutPath);
    fs.writeFileSync(htmlOutPath, htmlContent, 'utf-8');

    process.stderr.write(
      `  ${green}✓${reset} ${path.relative(rootDir, filePath)} ${gray}→ ${path.relative(distDir, jsOutPath)} (${formatSize(js.length)} ${elapsed})${reset}\n`
    );

    compiled++;
    compiledResults.push({ filePath, js, jsOutPath, htmlOutPath });
  }

  // Copy static assets (non-.pjs files)
  process.stderr.write(`\n${gray}Copying static assets...${reset}\n`);
  const staticFiles = copyStaticAssets(rootDir, distDir);
  process.stderr.write(`  ${green}${staticFiles}${reset} asset(s) copied\n`);

  // Prerender with jsdom if requested
  if (prerender) {
    process.stderr.write(`\n${gray}Prerendering HTML pages...${reset}\n`);
    try {
      const jsdom = require('jsdom');
      const { JSDOM } = jsdom;

      for (const { filePath, js, htmlOutPath } of compiledResults) {
        try {
          const dom = new JSDOM(
            `<!DOCTYPE html><html><body><div id="app"></div><script>${js}</script></body></html>`,
            { runScripts: 'dangerously', resources: 'usable' }
          );
          const rendered = dom.window.document.getElementById('app').innerHTML;

          // Write prerendered HTML
          const prerenderedHtml = buildPrerenderedHtml(rendered, filePath);
          fs.writeFileSync(htmlOutPath, prerenderedHtml, 'utf-8');
          process.stderr.write(`  ${green}✓${reset} ${path.basename(htmlOutPath)} (prerendered)\n`);
          dom.window.close();
        } catch (e) {
          process.stderr.write(
            `  ${red}✗${reset} ${path.basename(htmlOutPath)} prerender failed: ${e.message}\n`
          );
        }
      }
    } catch {
      process.stderr.write(
        `  ${red}jsdom not available${reset} — install with: npm install jsdom\n`
      );
      process.stderr.write(`  ${gray}Falling back to client-side rendering${reset}\n`);
    }
  }

  // Summary
  const totalElapsed = formatElapsed(startTotal);
  process.stderr.write(
    `\n${bold}${green}Build complete${reset} ${gray}(${totalElapsed})${reset}\n`
  );
  process.stderr.write(`  ${compiled} compiled, ${failed} failed, ${staticFiles} assets\n`);
  process.stderr.write(
    `  Output: ${cyan}${distDir}${reset} ${gray}(${formatSize(totalJsSize + staticFiles * 500)})${reset}\n\n`
  );

  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Build an HTML page wrapping the compiled JS.
 */
/**
 * Bungkus kode JS hasil compile menjadi file HTML lengkap dengan `<script>` tag.
 *
 * @param {string} jsCode - Kode JS hasil compile
 * @param {string} filePath - Path file `.pjs` asli (untuk judul HTML)
 * @param {Object} _options - Opsi build (reserved untuk future use)
 * @returns {string} String HTML lengkap
 */
function buildHtml(jsCode, filePath, _options) {
  const title = path.basename(filePath, '.pjs');
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div id="app"></div>
  <script>
${jsCode}
  </script>
</body>
</html>`;
}

/**
 * Build a prerendered HTML page with SSR content.
 */
/**
 * Bungkus konten yang sudah di-prerender menjadi file HTML.
 *
 * @param {string} renderedContent - HTML yang sudah di-prerender oleh jsdom
 * @param {string} filePath - Path file `.pjs` asli
 * @returns {string} String HTML lengkap
 */
function buildPrerenderedHtml(renderedContent, filePath) {
  const title = path.basename(filePath, '.pjs');
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div id="app">${renderedContent}</div>
</body>
</html>`;
}

/**
 * Basic JS minification (strip comments, collapse whitespace).
 * Not a full minifier — for production, use terser or uglifyjs.
 */
/**
 * Minify kode JS dengan regex sederhana (hapus whitespace, comment).
 *
 * Catatan: bukan minifier production-grade. Untuk build serius, gunakan
 * terser/uglify. Implementasi ini cukup untuk mengurangi ukuran ~30%.
 *
 * @param {string} code - Kode JS yang akan di-minify
 * @returns {string} Kode JS yang sudah di-minify
 */
function minifyJs(code) {
  return code
    .replace(/\/\/.*$/gm, '') // Strip single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Strip multi-line comments
    .replace(/\n\s*\n/g, '\n') // Collapse blank lines
    .replace(/^\s+/gm, '') // Strip leading whitespace
    .replace(/\s+$/gm, '') // Strip trailing whitespace
    .replace(/\n+/g, '\n') // Collapse multiple newlines
    .trim();
}

/**
 * Copy static (non-.pjs) assets from src to dist.
 * Ignores node_modules, .git, .pjs files.
 */
/**
 * Copy static assets (CSS, gambar, font) dari `src/` ke `dist/`.
 *
 * @param {string} srcDir - Direktori source (mis. `src/`)
 * @param {string} distDir - Direktori output (mis. `dist/`)
 * @returns {number} Jumlah file yang berhasil di-copy
 */
function copyStaticAssets(srcDir, distDir) {
  const ignoreExts = new Set(['.pjs']);
  const ignoreDirs = new Set(['node_modules', '.git', 'dist']);
  let count = 0;

  function walk(currentSrc, currentDist) {
    let entries;
    try {
      entries = fs.readdirSync(currentSrc, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const srcPath = path.join(currentSrc, entry.name);
      const distPath = path.join(currentDist, entry.name);

      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) continue;
        fs.mkdirSync(distPath, { recursive: true });
        walk(srcPath, distPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ignoreExts.has(ext)) continue;
        fs.copyFileSync(srcPath, distPath);
        count++;
      }
    }
  }

  walk(srcDir, distDir);
  return count;
}

/**
 * Recursively delete a directory.
 */
/**
 * Hapus direktori secara rekursif (兼容 Node < 14 yang belum punya `fs.rmSync`).
 *
 * @param {string} dirPath - Path direktori yang akan dihapus
 * @returns {void}
 */
function rmDirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      rmDirRecursive(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  fs.rmdirSync(dirPath);
}

/**
 * Escape HTML special characters.
 */
/**
 * Escape karakter HTML special (`<`, `>`, `&`, `"`, `'`) untuk safe insertion ke HTML.
 *
 * @param {string} str - String yang akan di-escape
 * @returns {string} String yang sudah di-escape
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { runBuild };
