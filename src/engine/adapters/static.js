// @ts-check

/**
 * PromptJS v1.0.0 — Adapter: Static Export
 * ============================================================================
 *
 * Enhances the default `pjs build` output for production CDN deployment.
 *
 * Adds:
 * - Asset hashing (prompt.a1b2c3.js) for cache busting
 * - <meta> tags (og:title, og:description, canonical) from config
 * - sitemap.xml auto-generation from route list
 * - 404.html fallback for SPA routes
 *
 * Zero-dependency. Uses Node.js crypto for content hashing.
 */

'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * Generate a short content hash from a string.
 *
 * @param {string} content - Content to hash
 * @param {number} [len=8] - Hash length
 * @returns {string} Hex hash
 */
function contentHash(content, len) {
  len = len || 8;
  return crypto.createHash('md5').update(content).digest('hex').slice(0, len);
}

/**
 * Hash a filename: prompt.js → prompt.a1b2c3.js
 *
 * @param {string} filename - Original filename (e.g. "prompt.js")
 * @param {string} content - File content for hashing
 * @returns {string} Hashed filename
 */
function hashFilename(filename, content) {
  const ext = path.extname(filename);
  const base = filename.slice(0, -ext.length);
  const hash = contentHash(content, 8);
  return base + '.' + hash + ext;
}

/**
 * Enhance HTML with <meta> tags from config.
 *
 * @param {string} html - Original HTML
 * @param {Object} meta - Meta config { title, description, ogImage, ... }
 * @param {Object} [opts] - Options
 * @param {string} [opts.siteUrl] - Base URL for canonical
 * @param {string} [opts.route] - Current page route (for canonical)
 * @returns {string} HTML with meta tags injected
 */
function injectMetaTags(html, meta, opts) {
  opts = opts || {};
  const tags = [];

  if (meta && meta.title) {
    tags.push('  <meta name="og:title" content="' + escapeAttr(meta.title) + '">');
  }
  if (meta && meta.description) {
    tags.push('  <meta name="description" content="' + escapeAttr(meta.description) + '">');
    tags.push('  <meta name="og:description" content="' + escapeAttr(meta.description) + '">');
  }
  if (meta && meta.ogImage) {
    tags.push('  <meta name="og:image" content="' + escapeAttr(meta.ogImage) + '">');
  }
  if (meta && meta.ogType) {
    tags.push('  <meta name="og:type" content="' + escapeAttr(meta.ogType) + '">');
  }
  if (opts.siteUrl && opts.route) {
    const canonical = opts.siteUrl.replace(/\/$/, '') + opts.route;
    tags.push('  <link rel="canonical" href="' + escapeAttr(canonical) + '">');
  }

  if (tags.length === 0) return html;

  const metaBlock = tags.join('\n') + '\n';
  return html.replace('</head>', metaBlock + '</head>');
}

/**
 * Generate sitemap.xml from route list.
 *
 * @param {string[]} routes - Array of route paths (e.g. ["/", "/about"])
 * @param {string} siteUrl - Base URL (e.g. "https://example.com")
 * @returns {string} sitemap.xml content
 */
function generateSitemap(routes, siteUrl) {
  const urls = routes
    .map(function (route) {
      return (
        '  <url>\n    <loc>' + escapeXml(siteUrl.replace(/\/$/, '') + route) + '</loc>\n  </url>'
      );
    })
    .join('\n');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    '\n</urlset>\n'
  );
}

/**
 * Generate 404.html fallback page for SPA.
 * Redirects to the SPA shell so client-side router handles 404.
 *
 * @param {string} htmlShell - The SPA index.html content (will be reused as 404)
 * @returns {string} 404.html content
 */
function generate404(htmlShell) {
  // For SPA: the 404 page IS the index.html (client-side router handles it)
  // For MPA: generate a simple 404 page
  if (htmlShell && htmlShell.includes('<div id="app">')) {
    return htmlShell; // SPA: reuse shell
  }

  return (
    '<!DOCTYPE html>\n' +
    '<html lang="id">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>404 — Tidak Ditemukan</title>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <h1>404</h1>\n' +
    '  <p>Halaman tidak ditemukan.</p>\n' +
    '  <a href="/">Kembali ke beranda</a>\n' +
    '</body>\n' +
    '</html>\n'
  );
}

/**
 * Generate a cryptographically random nonce for CSP.
 *
 * @param {number} [len=24] - Nonce length in bytes (48 hex chars)
 * @returns {string} Base64-encoded nonce
 */
function generateNonce(len) {
  len = len || 24;
  return crypto.randomBytes(len).toString('base64');
}

/**
 * Inject CSP meta tag and nonce attributes into HTML.
 *
 * Adds:
 * - <meta http-equiv="Content-Security-Policy"> tag
 * - nonce="..." to <script> and <style> tags
 *
 * @param {string} html - Original HTML
 * @param {string} nonce - CSP nonce value
 * @returns {string} HTML with CSP injection
 */
function injectCSP(html, nonce) {
  // Add CSP meta tag before </head>
  const cspMeta =
    '  <meta http-equiv="Content-Security-Policy" content="' +
    "default-src 'self'; " +
    "script-src 'self' 'nonce-" +
    nonce +
    "'; " +
    "style-src 'self' 'nonce-" +
    nonce +
    "'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self'; " +
    "frame-src 'none'\">\n";

  html = html.replace('</head>', cspMeta + '</head>');

  // Add nonce to all <script> tags
  html = html.replace(/<script(?![^>]*\bnonce=)/g, '<script nonce="' + nonce + '"');

  // Add nonce to all <style> tags
  html = html.replace(/<style(?![^>]*\bnonce=)/g, '<style nonce="' + nonce + '"');

  return html;
}

/**
 * Run the static adapter: hash assets, inject meta, generate sitemap + 404.
 * v1.0.1: Add CSP support via `opts.csp`.
 *
 * @param {Object} [opts] - Adapter options
 * @param {string} [opts.outDir] - Output directory
 * @param {string[]} [opts.routes] - Route paths
 * @param {boolean} [opts.isSPA] - Whether this is an SPA build
 * @param {Object} [opts.meta] - Meta tags config
 * @param {string} [opts.siteUrl] - Site URL for sitemap/canonical
 * @param {boolean} [opts.csp] - Enable CSP nonce injection (v1.0.1)
 * @returns {{ hashedAssets: Object, sitemap: string, errors: Object[], nonce: string|null }}
 */
function runStaticAdapter(opts) {
  opts = opts || {};
  const errors = [];
  const hashedAssets = {};

  const outDir = path.resolve(opts.outDir || 'dist');
  const jsPath = path.join(outDir, 'prompt.js');
  const cssPath = path.join(outDir, 'prompt.css');
  const htmlIndexPath = path.join(outDir, 'index.html');

  // Hash JS
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    const hashedJsName = hashFilename('prompt.js', jsContent);
    const hashedJsPath = path.join(outDir, hashedJsName);
    fs.writeFileSync(hashedJsPath, jsContent, 'utf-8');
    hashedAssets.js = hashedJsName;

    // Remove the original unhashed file to avoid duplication (BUG-10 fix)
    fs.rmSync(jsPath, { force: true });

    // Update references in HTML files
    const htmlFiles = findHtmlFiles(outDir);
    for (let i = 0; i < htmlFiles.length; i++) {
      const htmlPath = htmlFiles[i];
      let html = fs.readFileSync(htmlPath, 'utf-8');
      html = html.replace(/src=["']prompt\.js["']/g, 'src="' + hashedJsName + '"');
      fs.writeFileSync(htmlPath, html, 'utf-8');
    }
  }

  // Hash CSS
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const hashedCssName = hashFilename('prompt.css', cssContent);
    const hashedCssPath = path.join(outDir, hashedCssName);
    fs.writeFileSync(hashedCssPath, cssContent, 'utf-8');
    hashedAssets.css = hashedCssName;

    // Remove the original unhashed file to avoid duplication (BUG-10 fix)
    fs.rmSync(cssPath, { force: true });

    // Update references in HTML files
    const htmlFiles2 = findHtmlFiles(outDir);
    for (let j = 0; j < htmlFiles2.length; j++) {
      const htmlPath2 = htmlFiles2[j];
      let html2 = fs.readFileSync(htmlPath2, 'utf-8');
      html2 = html2.replace(/href=["']prompt\.css["']/g, 'href="' + hashedCssName + '"');
      fs.writeFileSync(htmlPath2, html2, 'utf-8');
    }
  }

  // Inject meta tags into HTML files
  if (opts.meta && Object.keys(opts.meta).length > 0) {
    const htmlFiles3 = findHtmlFiles(outDir);
    for (let k = 0; k < htmlFiles3.length; k++) {
      const htmlPath3 = htmlFiles3[k];
      let html3 = fs.readFileSync(htmlPath3, 'utf-8');
      // Derive route from filename for canonical
      const route = deriveRouteFromHtml(htmlPath3, outDir);
      html3 = injectMetaTags(html3, opts.meta, {
        siteUrl: opts.siteUrl,
        route: route,
      });
      fs.writeFileSync(htmlPath3, html3, 'utf-8');
    }
  }

  // Generate sitemap.xml
  let sitemap = '';
  if (opts.siteUrl && opts.routes && opts.routes.length > 0) {
    sitemap = generateSitemap(opts.routes, opts.siteUrl);
    fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf-8');
  }

  // Generate 404.html
  if (opts.isSPA && fs.existsSync(htmlIndexPath)) {
    const shellContent = fs.readFileSync(htmlIndexPath, 'utf-8');
    const fourOhFour = generate404(shellContent);
    fs.writeFileSync(path.join(outDir, '404.html'), fourOhFour, 'utf-8');
  } else if (!opts.isSPA) {
    const fourOhFourMpa = generate404(null);
    fs.writeFileSync(path.join(outDir, '404.html'), fourOhFourMpa, 'utf-8');
  }

  // v1.0.1: CSP injection
  let nonce = null;
  if (opts.csp) {
    nonce = generateNonce();
    const htmlFiles4 = findHtmlFiles(outDir);
    for (let m = 0; m < htmlFiles4.length; m++) {
      const htmlPath4 = htmlFiles4[m];
      let html4 = fs.readFileSync(htmlPath4, 'utf-8');
      html4 = injectCSP(html4, nonce);
      fs.writeFileSync(htmlPath4, html4, 'utf-8');
    }
  }

  return { hashedAssets: hashedAssets, sitemap: sitemap, errors: errors, nonce: nonce };
}

// ── Helpers ──

/**
 * @param {string} dir - Directory to search
 * @returns {string[]} HTML file paths
 */
function findHtmlFiles(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = findHtmlFiles(fullPath);
        results = results.concat(sub);
      } else if (entry.name.endsWith('.html')) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

/**
 * @param {string} htmlPath - Absolute HTML file path
 * @param {string} outDir - Output directory
 * @returns {string} Route path
 */
function deriveRouteFromHtml(htmlPath, outDir) {
  const rel = path.relative(outDir, htmlPath);
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\.html$/, '');
}

/**
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  contentHash,
  hashFilename,
  injectMetaTags,
  generateSitemap,
  generate404,
  runStaticAdapter,
};
