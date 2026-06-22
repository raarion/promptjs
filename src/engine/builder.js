// @ts-nocheck

/**
 * PromptJS v0.4.0 — Project Builder (Wave J + K)
 * ============================================================================
 *
 * Multi-file project builder. Compiles all .pjs files in src/pages/ to
 * individual HTML files, bundles all JS into a single prompt.js, and
 * all CSS into a single prompt.css.
 *
 * Output structure (no Indonesian in dist/):
 *   dist/
 *   ├── index.html          # Page HTML
 *   ├── about.html          # Page HTML
 *   ├── blog.html           # Page HTML
 *   ├── prompt.js           # Bundled JS (all pages)
 *   ├── prompt.css          # Bundled CSS (all pages)
 *   └── assets/             # Static assets
 *
 * Usage:
 *   const Builder = require('./builder');
 *   const result = Builder.buildProject({ rootDir: 'src', outDir: 'dist' });
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Engine = require('./promptjs');

/**
 * Find all .pjs files recursively in a directory.
 *
 * @param {string} dir - Root directory
 * @param {string[]} [ignore] - Directories to ignore
 * @returns {string[]} Array of absolute paths
 */
function findPjsFiles(dir, ignore) {
  ignore = ignore || ['node_modules', '.git', 'dist', 'doc-dev', 'tests'];
  const results = [];

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignore.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.pjs')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

/**
 * Generate route path from file path.
 *
 * src/pages/index.pjs → /
 * src/pages/about.pjs → /about
 * src/pages/blog/index.pjs → /blog
 * src/pages/blog/post.pjs → /blog/post
 *
 * @param {string} filePath - Full file path
 * @param {string} pagesDir - Pages directory path
 * @returns {string} Route path (e.g. "/about")
 */
function fileToRoute(filePath, pagesDir) {
  const rel = path.relative(pagesDir, filePath);
  const withoutExt = rel.replace(/\.pjs$/, '');
  const parts = withoutExt.split(path.sep);

  // [slug].pjs → :slug
  const routeParts = parts.map((p) => {
    const dynMatch = p.match(/^\[(.+)\]$/);
    if (dynMatch) return ':' + dynMatch[1];
    return p;
  });

  let route = '/' + routeParts.join('/');

  // index → /
  if (route.endsWith('/index')) {
    route = route.slice(0, -'index'.length) || '/';
  }

  // Remove trailing slash (except root)
  if (route.length > 1 && route.endsWith('/')) {
    route = route.slice(0, -1);
  }

  return route;
}

/**
 * Generate output HTML filename from route.
 *
 * / → index.html
 * /about → about.html
 * /blog → blog.html
 * /blog/post → blog/post.html
 *
 * @param {string} route - Route path
 * @returns {string} HTML filename relative to dist/
 */
function routeToHtmlFile(route) {
  if (route === '/' || route === '') return 'index.html';
  const clean = route.replace(/^\//, '');
  // For nested routes, create subdirectories
  return clean + '.html';
}

/**
 * Build a single page: compile .pjs → extract JS + CSS → generate HTML.
 *
 * @param {string} filePath - Path to .pjs file
 * @param {Object} opts - Build options
 * @returns {{ route: string, htmlFile: string, js: string, css: string, errors: Object[], success: boolean }}
 */
function buildPage(filePath, opts) {
  const engine = new Engine.PromptJSEngine();
  const result = engine.compileFile(filePath, {
    source: path.basename(filePath),
    dataDir: path.dirname(filePath),
    loadDataFiles: !opts.dev,
    scope: opts.scope,
  });

  const route = fileToRoute(filePath, opts.pagesDir);
  const htmlFile = routeToHtmlFile(route);

  return {
    route,
    htmlFile,
    js: result.js || '',
    css: result.css || '',
    errors: result.errors,
    warnings: result.warnings,
    success: result.success,
  };
}

/**
 * Generate HTML wrapper for a page.
 *
 * @param {string} pageRoute - Route path (e.g. "/about")
 * @param {string} pageTitle - Page title
 * @param {Object} opts - Build options
 * @returns {string} HTML string
 */
function generatePageHTML(pageRoute, pageTitle, opts) {
  const cssLink = opts.hasCss ? '<link rel="stylesheet" href="prompt.css">\n  ' : '';
  const jsScript = opts.hasJs ? '<script src="prompt.js" defer></script>' : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  ${cssLink}
</head>
<body>
  <div id="app"></div>
  ${jsScript}
</body>
</html>`;
}

/**
 * Build entire project.
 *
 * @param {Object} opts - Build options
 * @param {string} [opts.rootDir='src'] - Source root directory
 * @param {string} [opts.outDir='dist'] - Output directory
 * @param {string} [opts.pagesDir='pages'] - Pages subdirectory (relative to rootDir)
 * @param {boolean} [opts.dev=false] - Dev mode
 * @returns {{ pages: Object[], js: string, css: string, errors: Object[] }}
 */
function buildProject(opts) {
  opts = opts || {};
  const rootDir = path.resolve(opts.rootDir || 'src');
  const outDir = path.resolve(opts.outDir || 'dist');
  const pagesDir = path.join(rootDir, opts.pagesDir || 'pages');
  const dev = !!opts.dev;

  const errors = [];
  const pages = [];
  let allJs = '';
  let allCss = '';

  // Find all .pjs page files
  const pageFiles = findPjsFiles(pagesDir);

  if (pageFiles.length === 0) {
    errors.push({
      code: 'E0000',
      severity: 'error',
      message: `No .pjs files found in ${pagesDir}`,
      suggestion: 'Buat file .pjs di direktori pages/',
    });
    return { pages, js: '', css: '', errors };
  }

  // Compile each page
  for (const filePath of pageFiles) {
    const pageResult = buildPage(filePath, {
      pagesDir,
      dev,
      scope: path.basename(filePath, '.pjs'),
    });

    if (!pageResult.success) {
      errors.push(...pageResult.errors);
    }

    // Collect JS (with route wrapper)
    if (pageResult.js) {
      const routeVar = JSON.stringify(pageResult.route);
      allJs += `\n// === Page: ${pageResult.route} (${path.basename(filePath)}) ===\n`;
      allJs += `if (window.__PJS_ROUTE__ === ${routeVar} || window.location.pathname === ${routeVar}) {\n`;
      allJs += pageResult.js + '\n';
      allJs += '}\n';
    }

    // Collect CSS
    if (pageResult.css) {
      allCss += `\n/* === Page: ${pageResult.route} === */\n`;
      allCss += pageResult.css + '\n';
    }

    // Generate HTML
    const pageTitle = path.basename(filePath, '.pjs');
    const html = generatePageHTML(pageResult.route, pageTitle, {
      hasCss: !!allCss,
      hasJs: !!allJs,
    });

    pages.push({
      route: pageResult.route,
      htmlFile: pageResult.htmlFile,
      html,
      js: pageResult.js,
      css: pageResult.css,
      success: pageResult.success,
      errors: pageResult.errors,
    });
  }

  // Write output files
  try {
    // Clean dist
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    // Write prompt.js (bundled JS)
    if (allJs) {
      const jsOutput =
        '// PromptJS v0.4.0 — Bundled JavaScript\n' +
        '// Auto-generated. Do not edit.\n' +
        'window.__PJS_ROUTE__ = window.location.pathname;\n' +
        allJs;
      fs.writeFileSync(path.join(outDir, 'prompt.js'), jsOutput, 'utf-8');
    }

    // Write prompt.css (bundled CSS)
    if (allCss) {
      const cssOutput =
        '/* PromptJS v0.4.0 — Bundled CSS */\n' + '/* Auto-generated. Do not edit. */\n' + allCss;
      fs.writeFileSync(path.join(outDir, 'prompt.css'), cssOutput, 'utf-8');
    }

    // Write HTML files
    for (const page of pages) {
      // Create subdirectories for nested routes
      const htmlPath = path.join(outDir, page.htmlFile);
      fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
      fs.writeFileSync(htmlPath, page.html, 'utf-8');
    }

    // Copy static assets if they exist
    const assetsDir = path.join(rootDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      copyDirRecursive(assetsDir, path.join(outDir, 'assets'));
    }
  } catch (e) {
    errors.push({
      code: 'E0000',
      severity: 'error',
      message: `Build write error: ${e.message}`,
      suggestion: 'Periksa permission folder dist/',
    });
  }

  return { pages, js: allJs, css: allCss, errors };
}

/**
 * Copy directory recursively.
 *
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = {
  findPjsFiles,
  fileToRoute,
  routeToHtmlFile,
  buildPage,
  generatePageHTML,
  buildProject,
  copyDirRecursive,
};
