// @ts-nocheck

/**
 * PromptJS v0.8 — Project Builder (Wave J + K + SPA + Adapters)
 * ============================================================================
 *
 * Multi-file project builder. Compiles all .pjs files in src/pages/.
 *
 * v0.4.0 (MPA mode): Separate HTML files per route, bundled JS/CSS.
 * v0.6.0 (SPA mode): Single HTML, client-side router, factory functions.
 * v0.8.0 (Adapters): Plugin hooks, config loading, adapter post-processing.
 *
 * SPA mode is activated when any page has `router: benar` in front-matter.
 * Without it, output is identical to v0.4.0 (zero regression).
 *
 * Usage:
 *   const Builder = require('./builder');
 *   const result = Builder.buildProject({ rootDir: 'src', outDir: 'dist' });
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Engine = require('./promptjs');
const { ROUTER_RUNTIME } = require('./router-runtime');
const Plugins = require('./plugins');

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
 * @param {string} route - Route path
 * @returns {string} HTML filename relative to dist/
 */
function routeToHtmlFile(route) {
  if (route === '/' || route === '') return 'index.html';
  const clean = route.replace(/^\//, '');
  return clean + '.html';
}

/**
 * Generate a safe JavaScript identifier from a route path.
 *
 * / → index
 * /about → about
 * /blog/:slug → blog_slug
 *
 * @param {string} route - Route path
 * @returns {string} Safe identifier
 */
function routeToPageName(route) {
  if (route === '/' || route === '') return 'index';
  return route
    .replace(/^\//, '')
    .replace(/:/g, '_')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Build a single page: compile .pjs → extract JS + CSS.
 *
 * @param {string} filePath - Path to .pjs file
 * @param {Object} opts - Build options
 * @param {boolean} [opts.spa] - Compile in SPA mode (factory function)
 * @returns {{ route: string, pageName: string, htmlFile: string, js: string, css: string, errors: Object[], success: boolean, isSPA: boolean }}
 */
function buildPage(filePath, opts) {
  const engine = new Engine.PromptJSEngine();
  const route = fileToRoute(filePath, opts.pagesDir);
  const pageName = routeToPageName(route);

  const result = engine.compileFile(filePath, {
    source: path.basename(filePath),
    dataDir: path.dirname(filePath),
    loadDataFiles: !opts.dev,
    scope: opts.scope,
    // v0.6: Pass SPA options
    pageName: pageName,
    pageRoute: route,
  });

  return {
    route,
    pageName,
    htmlFile: routeToHtmlFile(route),
    js: result.js || '',
    css: result.css || '',
    errors: result.errors,
    warnings: result.warnings,
    success: result.success,
    isSPA: !!result.isSPA,
  };
}

/**
 * Generate HTML wrapper for a page (MPA mode).
 *
 * @param {string} pageTitle - Page title
 * @param {Object} opts - Build options
 * @returns {string} HTML string
 */
function generatePageHTML(pageTitle, opts) {
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
 * Generate SPA HTML shell (single page with router).
 *
 * @param {string} title - Site title
 * @param {Object} opts - Build options
 * @returns {string} HTML string
 */
function generateSPAHTML(title, opts) {
  const cssLink = opts.hasCss ? '<link rel="stylesheet" href="prompt.css">\n  ' : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${cssLink}
</head>
<body>
  <div id="app"></div>
  <script src="prompt.js" defer></script>
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
 * @param {string} [opts.adapter=null] - Adapter name: 'static', 'node', 'vercel', or null
 * @param {Object[]} [opts.plugins=[]] - Loaded plugins for transform hooks
 * @param {Object} [opts.meta={}] - Meta tags for static adapter
 * @param {string} [opts.siteUrl=''] - Site URL for sitemap/canonical
 * @param {string} [opts.apiUrl=''] - API URL for Node adapter proxy
 * @returns {{ pages: Object[], js: string, css: string, errors: Object[], isSPA: boolean, adapter: Object|null }}
 */
function buildProject(opts) {
  opts = opts || {};
  const rootDir = path.resolve(opts.rootDir || 'src');
  const outDir = path.resolve(opts.outDir || 'dist');
  const pagesDir = path.join(rootDir, opts.pagesDir || 'pages');
  const dev = !!opts.dev;
  const plugins = opts.plugins || [];
  const adapter = opts.adapter || null;

  const errors = [];
  const pages = [];
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
    return { pages, js: '', css: '', errors, isSPA: false };
  }

  // First pass: compile all pages and detect SPA mode
  let isSPA = false;
  const pageResults = [];
  for (const filePath of pageFiles) {
    const pageResult = buildPage(filePath, {
      pagesDir,
      dev,
      scope: path.basename(filePath, '.pjs'),
    });
    pageResults.push(pageResult);
    if (pageResult.isSPA) isSPA = true;
    if (!pageResult.success) errors.push(...pageResult.errors);
    // v0.8: Apply plugin transform hooks per page
    pageResult.js = Plugins.transformJS(plugins, pageResult.js, path.basename(filePath));
    pageResult.css = Plugins.transformCSS(plugins, pageResult.css, path.basename(filePath));
  }

  // Collect CSS from all pages
  for (const pr of pageResults) {
    if (pr.css) {
      allCss += `\n/* === Page: ${pr.route} === */\n`;
      allCss += pr.css + '\n';
    }
  }

  let adapterResult = null;

  // Write output files
  try {
    // Clean dist
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir, { recursive: true });

    if (isSPA) {
      // ═══ SPA MODE ═══
      // Compile all pages as factory functions, generate route table + router
      let spaJs = '';
      spaJs += '// PromptJS v0.8 — SPA Bundle\n';
      spaJs += '// Auto-generated. Do not edit.\n\n';

      // Emit each page as a named factory function.
      // Compiler SPA output has structure:
      //   - Header comments (// Generated by...)
      //   - Runtime helpers (tree-shaken)
      //   - "// === User Code ===" marker
      //   - var __cleanupFns = []; etc.
      //   - ... page body ...
      //   - return { el, mount, unmount };
      //
      // For bundling: extract runtime helpers from the FIRST page only
      // (they're identical across pages), then wrap each page's user code
      // in a named factory function.

      let runtimeExtracted = false;

      for (const pr of pageResults) {
        if (!pr.js) continue;

        const lines = pr.js.split('\n');
        const userCodeIdx = lines.findIndex((l) => l.includes('// === User Code ==='));

        if (!runtimeExtracted && userCodeIdx > 0) {
          // Extract header + runtime helpers (everything before user code)
          for (let i = 0; i < userCodeIdx; i++) {
            spaJs += lines[i] + '\n';
          }
          spaJs += '\n';
          runtimeExtracted = true;
        }

        // Extract user code (everything from "// === User Code ===" onward)
        const userLines = userCodeIdx >= 0 ? lines.slice(userCodeIdx + 1) : lines;

        spaJs += `// === Page: ${pr.route} (${pr.pageName}) ===\n`;
        spaJs += `function __page_${pr.pageName}(__parent) {\n`;
        for (const line of userLines) {
          if (line.trim()) {
            spaJs += '  ' + line + '\n';
          } else {
            spaJs += '\n';
          }
        }
        spaJs += '\n}\n\n';
      }

      // Build route table
      spaJs += '// === Route Table ===\n';
      spaJs += 'var __PJS_ROUTES = {\n';
      for (const pr of pageResults) {
        if (pr.js) {
          const routeKey = pr.route.replace(/'/g, "\\'");
          spaJs += `  "${routeKey}": __page_${pr.pageName},\n`;
        }
      }
      spaJs += '};\n\n';

      // Embed router runtime
      spaJs += '// === Router Runtime ===\n';
      spaJs += ROUTER_RUNTIME + '\n\n';

      // Initialize router
      spaJs += '// === Initialize ===\n';
      spaJs += '__pjsRouter(__PJS_ROUTES);\n';

      fs.writeFileSync(path.join(outDir, 'prompt.js'), spaJs, 'utf-8');

      // Write single SPA HTML
      const html = generateSPAHTML('PromptJS SPA', { hasCss: !!allCss });
      fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
    } else {
      // ═══ MPA MODE (v0.4 behavior, zero regression) ═══
      let allJs = '';

      for (const pr of pageResults) {
        if (pr.js) {
          const routeVar = JSON.stringify(pr.route);
          allJs += `\n// === Page: ${pr.route} (${pr.pageName}) ===\n`;
          allJs += `if (window.__PJS_ROUTE__ === ${routeVar} || window.location.pathname === ${routeVar}) {\n`;
          allJs += pr.js + '\n';
          allJs += '}\n';
        }

        // Generate per-page HTML
        const pageTitle = path.basename(pr.route.replace(/^\//, ''), '.pjs') || 'PromptJS';
        const html = generatePageHTML(pageTitle, { hasCss: !!allCss, hasJs: !!allJs });
        pages.push({
          route: pr.route,
          htmlFile: pr.htmlFile,
          html,
          js: pr.js,
          css: pr.css,
          success: pr.success,
          errors: pr.errors,
        });
      }

      if (allJs) {
        const jsOutput =
          '// PromptJS v0.8 — Bundled JavaScript\n' +
          '// Auto-generated. Do not edit.\n' +
          'window.__PJS_ROUTE__ = window.location.pathname;\n' +
          allJs;
        fs.writeFileSync(path.join(outDir, 'prompt.js'), jsOutput, 'utf-8');
      }

      // Write HTML files
      for (const page of pages) {
        const htmlPath = path.join(outDir, page.htmlFile);
        fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
        fs.writeFileSync(htmlPath, page.html, 'utf-8');
      }
    }

    // Write CSS
    if (allCss) {
      const cssOutput =
        '/* PromptJS v0.8 — Bundled CSS */\n' + '/* Auto-generated. Do not edit. */\n' + allCss;
      fs.writeFileSync(path.join(outDir, 'prompt.css'), cssOutput, 'utf-8');
    }

    // Copy static assets if they exist
    const assetsDir = path.join(rootDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      copyDirRecursive(assetsDir, path.join(outDir, 'assets'));
    }

    // v0.8: Apply adapter post-processing
    if (adapter) {
      const routes = pageResults
        .filter(function (pr) {
          return pr.success;
        })
        .map(function (pr) {
          return pr.route;
        });
      try {
        adapterResult = runAdapter(adapter, {
          outDir: outDir,
          isSPA: isSPA,
          routes: routes,
          meta: opts.meta || {},
          siteUrl: opts.siteUrl || '',
          apiUrl: opts.apiUrl || '',
        });
        if (adapterResult.errors && adapterResult.errors.length > 0) {
          errors.push(...adapterResult.errors);
        }
      } catch (adapterErr) {
        errors.push({
          code: 'E0000',
          severity: 'error',
          message: 'Adapter error: ' + adapterErr.message,
          suggestion: 'Check adapter name: ' + adapter,
        });
      }
    }

    // v0.8: Apply transformHTML hooks on all generated HTML files
    applyHtmlPlugins(outDir, plugins);
  } catch (e) {
    errors.push({
      code: 'E0000',
      severity: 'error',
      message: `Build write error: ${e.message}`,
      suggestion: 'Periksa permission folder dist/',
    });
  }

  return { pages, js: '', css: allCss, errors, isSPA, adapter: adapterResult };
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

/**
 * Run an adapter by name.
 *
 * @param {string} name - Adapter name ('static', 'node', 'vercel')
 * @param {Object} opts - Adapter options
 * @returns {Object} Adapter result
 */
function runAdapter(name, opts) {
  const AdapterStatic = require('./adapters/static');
  const AdapterNode = require('./adapters/node');
  const AdapterVercel = require('./adapters/vercel');

  switch (name) {
    case 'static':
      return AdapterStatic.runStaticAdapter(opts);
    case 'node':
      return AdapterNode.runNodeAdapter(opts);
    case 'vercel':
      return AdapterVercel.runVercelAdapter(opts);
    default:
      return {
        errors: [
          {
            code: 'E0000',
            severity: 'error',
            message: 'Unknown adapter: ' + name,
            suggestion: 'Use static, node, or vercel',
          },
        ],
      };
  }
}

/**
 * Apply transformHTML plugin hooks to all .html files in a directory.
 *
 * @param {string} dir - Directory to process
 * @param {Object[]} plugins - Loaded plugins
 */
function applyHtmlPlugins(dir, plugins) {
  if (!plugins || plugins.length === 0) return;
  const htmlFiles = findHtmlFiles(dir);
  for (let i = 0; i < htmlFiles.length; i++) {
    const htmlPath = htmlFiles[i];
    let html = fs.readFileSync(htmlPath, 'utf-8');
    html = Plugins.transformHTML(plugins, html, path.basename(htmlPath));
    fs.writeFileSync(htmlPath, html, 'utf-8');
  }
}

/**
 * Find all .html files recursively.
 *
 * @param {string} dir - Directory
 * @returns {string[]} HTML file paths
 */
function findHtmlFiles(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const sub = findHtmlFiles(fullPath);
        results = results.concat(sub);
      } else if (entry.name.endsWith('.html')) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

module.exports = {
  findPjsFiles,
  fileToRoute,
  routeToHtmlFile,
  routeToPageName,
  buildPage,
  generatePageHTML,
  generateSPAHTML,
  buildProject,
  copyDirRecursive,
  runAdapter,
};
