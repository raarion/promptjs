/**
 * PromptJS v0.1 — CLI `build` Command
 * ============================================================================
 * Compiles .pjs files and produces a dist/ folder with:
 *   - Compiled JS files
 *   - Prerendered HTML pages (using jsdom or inline execution)
 *   - Static assets copied as-is
 *
 * Usage:
 *   pjs build                      — build current dir → dist/
 *   pjs build ./src                — build specific dir
 *   pjs build --out-dir out        — custom output directory
 *   pjs build --prerender          — prerender HTML with jsdom
 *   pjs build --minify             — minify output JS
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { PromptJSEngine } = require('../../engine/promptjs');
const {
  findPjsFiles,
  printDiagnostics,
  resolveOutputPath,
  ensureDirForFile,
  formatSize,
  formatElapsed
} = require('../utils');

function runBuild(argv) {
  const inputDir = argv._[0] || '.';
  const outDir = argv['out-dir'] || argv.outDir || 'dist';
  const prerender = argv.prerender || false;
  const minify = argv.minify || false;
  const rootDir = path.resolve(inputDir);
  const distDir = path.resolve(outDir);

  if (!fs.existsSync(rootDir)) {
    process.stderr.write(`Error: Directory '${inputDir}' does not exist.\n`);
    process.exit(1);
  }

  const useColor = true;
  const green = '\x1b[32m';
  const cyan = '\x1b[36m';
  const red = '\x1b[31m';
  const gray = '\x1b[90m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';

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
      source: path.basename(filePath)
    });

    const elapsed = formatElapsed(start);

    if (result.errors && result.errors.length > 0) {
      printDiagnostics(result.errors, 'error', true);
    }
    if (result.warnings && result.warnings.length > 0) {
      printDiagnostics(result.warnings, 'warning', true);
    }

    if (!result.success) {
      process.stderr.write(`  ${red}✗${reset} ${path.relative(rootDir, filePath)} ${gray}(${elapsed})${reset}\n`);
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
          const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div><script>${js}</script></body></html>`,
            { runScripts: 'dangerously', resources: 'usable' });
          const rendered = dom.window.document.getElementById('app').innerHTML;

          // Write prerendered HTML
          const prerenderedHtml = buildPrerenderedHtml(rendered, filePath);
          fs.writeFileSync(htmlOutPath, prerenderedHtml, 'utf-8');
          process.stderr.write(`  ${green}✓${reset} ${path.basename(htmlOutPath)} (prerendered)\n`);
          dom.window.close();
        } catch (e) {
          process.stderr.write(`  ${red}✗${reset} ${path.basename(htmlOutPath)} prerender failed: ${e.message}\n`);
        }
      }
    } catch (e) {
      process.stderr.write(`  ${red}jsdom not available${reset} — install with: npm install jsdom\n`);
      process.stderr.write(`  ${gray}Falling back to client-side rendering${reset}\n`);
    }
  }

  // Summary
  const totalElapsed = formatElapsed(startTotal);
  process.stderr.write(`\n${bold}${green}Build complete${reset} ${gray}(${totalElapsed})${reset}\n`);
  process.stderr.write(`  ${compiled} compiled, ${failed} failed, ${staticFiles} assets\n`);
  process.stderr.write(`  Output: ${cyan}${distDir}${reset} ${gray}(${formatSize(totalJsSize + staticFiles * 500)})${reset}\n\n`);

  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Build an HTML page wrapping the compiled JS.
 */
function buildHtml(jsCode, filePath, options) {
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
function minifyJs(code) {
  return code
    .replace(/\/\/.*$/gm, '')           // Strip single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')   // Strip multi-line comments
    .replace(/\n\s*\n/g, '\n')          // Collapse blank lines
    .replace(/^\s+/gm, '')              // Strip leading whitespace
    .replace(/\s+$/gm, '')              // Strip trailing whitespace
    .replace(/\n+/g, '\n')              // Collapse multiple newlines
    .trim();
}

/**
 * Copy static (non-.pjs) assets from src to dist.
 * Ignores node_modules, .git, .pjs files.
 */
function copyStaticAssets(srcDir, distDir) {
  const ignoreExts = new Set(['.pjs']);
  const ignoreDirs = new Set(['node_modules', '.git', 'dist']);
  let count = 0;

  function walk(currentSrc, currentDist) {
    let entries;
    try {
      entries = fs.readdirSync(currentSrc, { withFileTypes: true });
    } catch (e) {
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
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { runBuild };
