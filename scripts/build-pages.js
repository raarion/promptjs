// @ts-check

/**
 * PromptJS — GitHub Pages Builder
 * ============================================================================
 *
 * Compiles every `examples/*.pjs` file into a runnable HTML page, then emits
 * a polished showcase landing page (`index.html`) that links to each example
 * and surfaces the source code alongside its live preview.
 *
 * Output directory: `dist-pages/` (consumed by the `pages-deploy.yml` workflow).
 *
 * Usage:
 *   node scripts/build-pages.js                # one-shot build
 *   node scripts/build-pages.js --watch        # rebuild on file change
 *   node scripts/build-pages.js --out-dir foo  # custom output directory
 *
 * Zero external runtime dependencies — uses only Node built-ins + the
 * PromptJS engine itself.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { findPjsFiles: findPjsFilesCore } = require('../src/cli/utils');
const { PromptJSEngine } = require('../src/engine/promptjs');

// ── CLI args ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const watch = argv.includes('--watch');
const outDirIdx = argv.indexOf('--out-dir');
const OUT_DIR = path.resolve(
  outDirIdx !== -1 && argv[outDirIdx + 1] ? argv[outDirIdx + 1] : 'dist-pages'
);
const EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples');
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const REPO_ROOT = path.resolve(__dirname, '..');

// ── Example metadata ────────────────────────────────────────────────────────

/**
 * Metadata untuk setiap example, dipakai di landing page.
 * Atribut `tags` dan `description` ditampilkan sebagai card meta.
 *
 * @type {Record<string, { title: string; description: string; tags: string[] }>}
 */
const EXAMPLE_META = {
  counter: {
    title: 'Counter Interaktif',
    description:
      'Counter sederhana dengan reaktivitas Proxy-based. Klik tombol untuk menambah, reset untuk kembali ke nol.',
    tags: ['reaktivitas', 'data', 'on_klik'],
  },
  todo: {
    title: 'Todo List',
    description:
      'Daftar tugas dengan input, tombol tambah, dan render list via `Ulangi untuk`. Menunjukkan pattern CRUD minimal.',
    tags: ['loop', 'array', 'masukan'],
  },
  gallery: {
    title: 'Galeri Foto',
    description:
      'Galeri kartu foto dari front-matter data binding. Demonstrasi `$external` reference dan nested `Buat`.',
    tags: ['front-matter', 'data binding', 'nested'],
  },
  'todo-app': {
    title: 'Todo App Lengkap',
    description:
      'Aplikasi todo list production-ready dengan reaktivitas, localStorage persistence, dan input handling.',
    tags: ['app', 'localStorage', 'reactive'],
  },
  'dashboard-app': {
    title: 'Dashboard SPA',
    description:
      'Full SPA dashboard dengan autentikasi, role-based access, client-side routing, dan 5 halaman.',
    tags: ['spa', 'auth', 'routing'],
  },
  'multi-page': {
    title: 'Multi-Page Site',
    description: 'Website multi-halaman dengan routing dan shared layout — blog, tentang, beranda.',
    tags: ['multi-page', 'routing', 'layout'],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Baca semua file `.pjs` di folder `examples/` (rekursif).
 *
 * @returns {string[]} Daftar path absolut ke file `.pjs`
 */
function findPjsFiles(startDir) {
  const root = startDir || EXAMPLES_DIR;
  // Delegasi ke sumber kebenaran tunggal (src/cli/utils.js). Ignore-set khusus
  // build-pages: hanya lewati direktori bernama `data`. Pengurutan dipertahankan.
  // Fungsi inti sudah aman terhadap direktori tak-ada (mengembalikan []).
  return findPjsFilesCore(root, { ignoreDirs: ['data'], sort: true });
}

/**
 * Dapatkan nama display untuk example file.
 * Top-level:     counter.pjs → "counter"
 * One level:     todo-app/index.pjs → "todo-app"
 * Two levels:    dashboard-app/pages/dashboard.pjs → "dashboard-app-dashboard"
 *
 * @param {string} filePath - Path absolut ke file .pjs
 * @returns {string} Nama example
 */
function getExampleName(filePath) {
  const rel = path.relative(EXAMPLES_DIR, filePath);
  const parts = rel.split(path.sep);
  if (parts.length === 1) {
    return path.basename(filePath, '.pjs');
  }
  if (parts.length === 2) {
    return parts[0];
  }
  // parts.length >= 3: join all but the filename with hyphens
  const dirParts = parts.slice(0, -1);
  const fileName = path.basename(parts[parts.length - 1], '.pjs');
  if (fileName === 'index') return dirParts.join('-');
  return dirParts.join('-') + '-' + fileName;
}

/**
 * Key untuk metadata lookup — selalu pakai folder parent untuk nested file.
 *
 * @param {string} filePath
 * @returns {string}
 */
function getMetaKey(filePath) {
  const rel = path.relative(EXAMPLES_DIR, filePath);
  const parts = rel.split(path.sep);
  return parts.length === 1 ? path.basename(filePath, '.pjs') : parts[0];
}

/**
 * Dapatkan output filename untuk example.
 *
 * @param {string} filePath - Path absolut ke file .pjs
 * @returns {string} Nama file output HTML
 */
function getExampleOutputName(filePath) {
  return getExampleName(filePath) + '.html';
}

/**
 * Baca versi dari `package.json` repo root.
 *
 * @returns {string} String versi (mis. `'0.3.0'`)
 */
function getVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
    return pkg.version || '0.3.0';
  } catch {
    return '0.3.0';
  }
}

/**
 * Hapus direktori rekursif (kompatibel Node < 14).
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
 * Escape karakter HTML special.
 *
 * @param {string} str - String yang akan di-escape
 * @returns {string} String yang sudah di-escape
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── SVG Icons (emoji replacements) ──────────────────────────────────────────

const ICONS = {
  lexer:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
  parser:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5.5 6.5 12 3l6.5 3.5"/><path d="M3 12l2-2 2 2"/><path d="M17 12l2 2 2-2"/></svg>',
  resolver:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  analyzer:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  compiler:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  globe:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  package:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  zap: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  wrench:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  tree: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8"/><path d="M5 12h14"/><path d="M8 12v4a4 4 0 0 0 8 0v-4"/><circle cx="12" cy="5" r="3"/></svg>',
  shield:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  puzzle:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  map: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  flask:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 9V3h4v6l5 8.5a2 2 0 0 1-1.7 3H6.7a2 2 0 0 1-1.7-3L10 9z"/></svg>',
  check:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  ruler:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>',
  palette:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  arrowRight:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  chevronLeft:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  externalLink:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
};

const COMPLEX_EXAMPLES = new Set(['todo-app', 'dashboard-app', 'multi-page']);

/**
 * Complex example page definitions — maps example name to its page files.
 * Populated during build by scanning directories.
 *
 * @type {Record<string, { pages: { name: string; htmlFile: string; route: string; title: string; source: string; js: string; css: string }[]; isMultiPage: boolean; indexPage: string|null; defaultPage: string|null }>}
 */
const _COMPLEX_BUILD = {};

// ── Compile pipeline ───────────────────────────────────────────────────────

/**
 * Compile satu file `.pjs` ke kode JS.
 *
 * @param {string} filePath - Path absolut ke file `.pjs`
 * @returns {{ js: string; warnings: any[]; errors: any[]; source: string }} Hasil compile
 */
function compileExample(filePath) {
  const engine = new PromptJSEngine();
  const result = engine.compileFile(filePath, {
    dev: false,
    loadDataFiles: true,
    dataDir: path.dirname(filePath),
    source: path.basename(filePath),
  });

  const source = fs.readFileSync(filePath, 'utf-8');

  if (!result.success) {
    const errSummary = (result.errors || []).map((e) => `${e.code}: ${e.message}`).join('\n');
    throw new Error(`Compile failed for ${filePath}:\n${errSummary}`);
  }

  return {
    js: result.js,
    css: result.css || '',
    warnings: result.warnings || [],
    errors: result.errors || [],
    source,
  };
}

/**
 * Bangun satu halaman HTML untuk satu example.
 *
 * Layout: header dengan judul + link kembali, lalu dua kolom —
 * kiri: source code `.pjs`, kanan: live preview (iframe srcdoc).
 *
 * @param {string} name - Nama example (mis. `'counter'`)
 * @param {{ js: string; source: string; warnings: any[] }} compiled - Hasil compile
 * @param {string} version - Versi PromptJS
 * @returns {string} String HTML lengkap
 */
function buildExamplePage(name, compiled, version) {
  const meta = EXAMPLE_META[name] || {
    title: name,
    description: '',
    tags: [],
  };

  const previewHtml = buildPreviewIframe(compiled.js, meta.title, compiled.css);
  const sourceHtml = escapeHtml(compiled.source);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)} — PromptJS Showcase</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" type="image/svg+xml" href="assets/PromptJS-logo.svg">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="index.html" class="logo-link">
        <img src="assets/PromptJS-logo.svg" alt="PromptJS" class="logo-mark" width="36" height="36">
        <span class="logo-text">PromptJS</span>
        <span class="version-pill">v${escapeHtml(version)}</span>
      </a>
      <nav class="header-nav">
        <a href="https://github.com/raarion/promptjs" target="_blank" rel="noopener">GitHub</a>
        <a href="https://github.com/raarion/promptjs/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Changelog</a>
      </nav>
    </div>
  </header>

  <main class="container example-page">
    <a href="index.html" class="back-link">← Kembali ke showcase</a>

    <div class="example-header">
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="example-description">${escapeHtml(meta.description)}</p>
      <div class="tag-row">
        ${meta.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('\n        ')}
      </div>
    </div>

    <div class="split-view">
      <section class="source-panel" aria-label="Source code .pjs">
        <div class="panel-header">
          <span class="panel-title">${escapeHtml(name)}.pjs</span>
          <button type="button" class="copy-btn" data-copy-target="source-${escapeHtml(name)}">Copy</button>
        </div>
        <pre class="source-code" id="source-${escapeHtml(name)}"><code>${sourceHtml}</code></pre>
      </section>

      <section class="preview-panel" aria-label="Live preview">
        <div class="panel-header">
          <span class="panel-title">Live Preview</span>
          <button type="button" class="reload-btn" data-reload="preview-${escapeHtml(name)}">Reload</button>
        </div>
        <iframe
          id="preview-${escapeHtml(name)}"
          class="preview-frame"
          title="Preview ${escapeHtml(meta.title)}"
          srcdoc="${escapeHtml(previewHtml)}"
          sandbox="allow-scripts"
        ></iframe>
      </section>
    </div>

    ${
      compiled.warnings.length > 0
        ? `<details class="warnings">
      <summary>${compiled.warnings.length} warning(s) dari compiler</summary>
      <ul>
        ${compiled.warnings
          .map(
            (w) =>
              `<li><code>${escapeHtml(w.code || '')}</code> ${escapeHtml(w.message || '')}</li>`
          )
          .join('\n        ')}
      </ul>
    </details>`
        : ''
    }
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>
        PromptJS v${escapeHtml(version)} — MIT License.
        <a href="https://github.com/raarion/promptjs">github.com/raarion/promptjs</a>
      </p>
    </div>
  </footer>

  <script>
    // Copy-to-clipboard
    document.querySelectorAll('.copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = document.getElementById(btn.getAttribute('data-copy-target'));
        if (!target) return;
        var text = target.innerText;
        navigator.clipboard.writeText(text).then(function() {
          var prev = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = prev; }, 1500);
        });
      });
    });
    // Reload iframe
    document.querySelectorAll('.reload-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var frame = document.getElementById(btn.getAttribute('data-reload'));
        if (!frame) return;
        var src = frame.getAttribute('srcdoc');
        frame.removeAttribute('srcdoc');
        frame.setAttribute('srcdoc', src);
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Build a standalone HTML page for a complex example's sub-page.
 * Each page is fully self-contained with inline JS + CSS.
 *
 * @param {string} jsCode - Compiled JS (with absolute paths already fixed)
 * @param {string} css - Compiled CSS
 * @param {string} title - Page title
 * @param {string} navHtml - Navigation bar HTML
 * @param {string} backLink - Link back to showcase
 * @returns {string} Complete HTML page
 */
function buildStandalonePageHtml(jsCode, css, title, navHtml, _backLink) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${css ? `<style>\n${css}\n  </style>` : ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .app-nav {
      display: flex; align-items: center; gap: 0; padding: 0;
      background: rgba(15,12,41,0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      font-size: 0.88rem;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .app-nav .nav-brand {
      font-weight: 800; color: #fff; padding: 0.7rem 1.2rem;
      font-size: 0.9rem; letter-spacing: -0.2px;
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center; gap: 0.4rem;
    }
    .app-nav .nav-back {
      color: #a78bfa; font-size: 0.8rem; padding: 0.7rem 1rem;
      font-weight: 500; transition: background 0.15s;
      text-decoration: none; display: flex; align-items: center; gap: 0.3rem;
    }
    .app-nav .nav-back:hover { background: rgba(167,139,250,0.1); text-decoration: none; }
    .app-nav .nav-link {
      color: #8888a0; padding: 0.7rem 1.1rem; text-decoration: none;
      font-weight: 500; font-size: 0.84rem;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 0.15s ease;
    }
    .app-nav .nav-link:hover { color: #e0e0e0; border-bottom-color: rgba(167,139,250,0.5); text-decoration: none; }
    .app-nav .nav-sep { color: rgba(255,255,255,0.1); padding: 0; }
    .__promptjs_watcher_marker { display: inline; }
  </style>
</head>
<body>
  ${navHtml}
  <div id="app"></div>
  <script>
${jsCode}
  </script>
</body>
</html>`;
}

/**
 * Fix absolute path references in compiled JS so they work as relative
 * links within a subdirectory on GitHub Pages.
 *
 * - "/page.html" → "page.html"
 * - "/page" (redirect/arahkan) → "page.html"
 * - "/" (root redirect) → "index.html"
 *
 * @param {string} jsCode - Compiled JS code
 * @param {string[]} knownPages - List of known page names (without .html)
 * @returns {string} Fixed JS code
 */
function fixAbsolutePaths(jsCode, knownPages) {
  let result = jsCode;

  // Fix "/page.html" → "page.html"
  result = result.replace(/(["'])\/([a-zA-Z][a-zA-Z0-9_-]*\.html)\1/g, '$1$2$1');

  // Fix "/page" (redirects/arahkan) → "page.html" for known pages
  for (const page of knownPages) {
    const escaped = escapeRegex(page);
    // Match: "/pageName" followed by quote, space, or paren
    const re = new RegExp('(["\'])\\/' + escaped + '(?=["\'\\s)])', 'g');
    result = result.replace(re, '$1' + page + '.html');
  }

  // Fix "/" (root redirect) → "index.html"
  result = result.replace(/(["'])\/(["')\s;,])/g, '$1index.html$2');

  return result;
}

/**
 * Escape special regex characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build navigation bar HTML for a complex example.
 *
 * @param {string} complexName - Example name
 * @param {{ name: string; htmlFile: string; title: string }[]} pages - List of pages
 * @returns {string} HTML nav bar
 */
function buildNavBar(complexName, pages) {
  const links = pages
    .map((p) => `<a href="${escapeHtml(p.htmlFile)}" class="nav-link">${escapeHtml(p.title)}</a>`)
    .join('\n    ');

  return `  <nav class="app-nav">
    <span class="nav-brand">🐬 ${escapeHtml(complexName)}</span>
    <a href="../${complexName}.html" class="nav-back">${ICONS.chevronLeft} Showcase</a>
    ${links}
  </nav>`;
}

function buildComplexExamplePage(name, meta, source, version) {
  const sourceHtml = escapeHtml(source);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)} — PromptJS Showcase</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" type="image/svg+xml" href="assets/PromptJS-logo.svg">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="index.html" class="logo-link">
        <img src="assets/PromptJS-logo.svg" alt="PromptJS" class="logo-mark" width="36" height="36">
        <span class="logo-text">PromptJS</span>
        <span class="version-pill">v${escapeHtml(version)}</span>
      </a>
      <nav class="header-nav">
        <a href="https://github.com/raarion/promptjs" target="_blank" rel="noopener">GitHub</a>
        <a href="https://github.com/raarion/promptjs/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Changelog</a>
      </nav>
    </div>
  </header>

  <main class="container example-page">
    <a href="index.html" class="back-link"><span class="back-icon">${ICONS.chevronLeft}</span> Kembali ke showcase</a>

    <div class="example-header">
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="example-description">${escapeHtml(meta.description)}</p>
      <div class="tag-row">
        ${meta.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('\n        ')}
      </div>
    </div>

    <div class="app-open-section">
      <a href="${escapeHtml(name)}/index.html" target="_blank" class="app-open-btn">
        Buka Aplikasi ${ICONS.externalLink}
      </a>
      <p class="app-note">Aplikasi terbuka di tab baru dengan navigasi penuh.</p>
    </div>

    <section class="source-panel" aria-label="Source code">
      <div class="panel-header">
        <span class="panel-title">${escapeHtml(name)}/index.pjs</span>
        <button type="button" class="copy-btn" data-copy-target="source-${escapeHtml(name)}">Copy</button>
      </div>
      <pre class="source-code" id="source-${escapeHtml(name)}"><code>${sourceHtml}</code></pre>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>
        PromptJS v${escapeHtml(version)} — MIT License.
        <a href="https://github.com/raarion/promptjs">github.com/raarion/promptjs</a>
      </p>
    </div>
  </footer>

  <script>
    document.querySelectorAll('.copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = document.getElementById(btn.getAttribute('data-copy-target'));
        if (!target) return;
        var text = target.innerText;
        navigator.clipboard.writeText(text).then(function() {
          var prev = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = prev; }, 1500);
        });
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Bangun HTML untuk iframe preview — bungkus JS hasil compile menjadi
 * dokumen HTML minimal dengan mount point `<div id="app">`.
 *
 * @param {string} jsCode - Kode JS hasil compile
 * @param {string} title - Judul halaman (untuk `<title>`)
 * @param {string} css - CSS hasil compile
 * @returns {string} String HTML untuk `srcdoc`
 */
function buildPreviewIframe(jsCode, title, css) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>${css ? `\n  <style>\n${css}\n  </style>` : ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .__promptjs_watcher_marker { display: inline; }
  </style>
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
 * Bangun landing page showcase dengan card untuk tiap example.
 *
 * @param {{ name: string; meta: any; source: string; jsSize: number }[]} examples - Daftar example
 * @param {string} version - Versi PromptJS
 * @returns {string} String HTML landing page
 */
function buildIndexPage(examples, version) {
  // Deduplicate: 1 card per parent example (metaKey)
  const seen = new Set();
  const unique = [];
  for (const ex of examples) {
    const key = ex.metaKey || ex.name;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(ex);
    }
  }

  const cards = unique
    .map(
      (
        ex
      ) => `      <a class="example-card${ex.isComplex ? ' card-complex' : ''}" href="${escapeHtml(ex.outName)}">
        <div class="card-header">
          <h3>${escapeHtml(ex.meta.title)}${ex.isComplex ? '<span class="card-badge">App</span>' : ''}</h3>
          <span class="card-size">${(ex.jsSize / 1024).toFixed(1)} KB JS</span>
        </div>
        <p class="card-description">${escapeHtml(ex.meta.description)}</p>
        <div class="tag-row">
          ${ex.meta.tags
            .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
            .join('\n          ')}
        </div>
        <pre class="card-snippet"><code>${escapeHtml(ex.source.split('\n').slice(0, 8).join('\n'))}${
          ex.source.split('\n').length > 8 ? '\n…' : ''
        }</code></pre>
        <span class="card-cta">${ex.isComplex ? 'Buka Aplikasi' : 'Lihat live'} ${ICONS.arrowRight}</span>
      </a>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PromptJS — Showcase</title>
  <meta name="description" content="PromptJS — DSL bilingual Indonesia-English yang compile ke vanilla JS. Lihat contoh langsung di browser tanpa install.">
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" type="image/svg+xml" href="assets/PromptJS-logo.svg">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="index.html" class="logo-link">
        <img src="assets/PromptJS-logo.svg" alt="PromptJS" class="logo-mark" width="36" height="36">
        <span class="logo-text">PromptJS</span>
        <span class="version-pill">v${escapeHtml(version)}</span>
      </a>
      <nav class="header-nav">
        <a href="https://github.com/raarion/promptjs" target="_blank" rel="noopener">GitHub</a>
        <a href="https://github.com/raarion/promptjs/blob/main/README.md" target="_blank" rel="noopener">Docs</a>
        <a href="https://github.com/raarion/promptjs/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Changelog</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container hero-inner">
     <div class="logo-wrapper">
      <img src="assets/PromptJS-logo.svg" alt="PromptJS-Logo" class="hero-logo" width="400" height="400">
      <img src="assets/prompt-js.svg" alt="PromptJS" class="hero-logo" width="320">
    </div>
      <p class="hero-tagline">
        <em>DSL</em> deklaratif dwibahasa.
      </p>
      <p class="hero-tagline-sub">
        Tulis seperti prompt — hasilkan vanilla JavaScript production-ready.
      </p>
      <p class="hero-bridge">
        Coding ⊷ Vibe Coding ⊷ Prompting. PromptJS adalah jembatannya.
      </p>
      <p class="hero-sub">
       PromptJS adalah compiler — bukan framework. Ia menerjemahkan kode yang kamu tulis layaknya prompt menjadi vanilla JavaScript tanpa runtime dependency, tanpa virtual DOM, tanpa overhead.
      </p>
      <div class="hero-stats">
        <div class="stat-pill">
          <span class="stat-value">0</span>
          <span class="stat-label">Runtime Deps</span>
        </div>
        <div class="stat-pill">
          <span class="stat-value">3.5 KB</span>
          <span class="stat-label">Counter App</span>
        </div>
        <div class="stat-pill">
          <span class="stat-value">880</span>
          <span class="stat-label">Tests Passing</span>
        </div>
        <div class="stat-pill">
          <span class="stat-value">ID+EN</span>
          <span class="stat-label">Bilingual</span>
        </div>
        <div class="stat-pill">
          <span class="stat-value">9.8ms</span>
          <span class="stat-label">Compile</span>
        </div>
        <div class="stat-pill">
          <span class="stat-value">84.8%</span>
          <span class="stat-label">Coverage</span>
        </div>
      </div>
      <div class="hero-actions">
        <a href="#examples" class="btn btn-primary">Lihat Contoh</a>
        <a href="https://www.npmjs.com/package/@raarion/prompt-js" class="btn btn-secondary" target="_blank" rel="noopener">npm install @raarion/prompt-js</a>
        <a href="https://github.com/raarion/promptjs" class="btn btn-ghost" target="_blank" rel="noopener">GitHub Repo</a>
        <a href="https://github.com/raarion/promptjs/blob/main/README.md" class="btn btn-ghost" target="_blank" rel="noopener">Dokumentasi</a>
      </div>
    </div>
  </section>

  <main class="container" id="examples">
    <h2 class="section-title">Showcase</h2>
    <div class="example-grid">
${cards}
    </div>
  </main>

  <section class="container features">
    <h2 class="section-title">Kenapa PromptJS?</h2>
    <div class="feature-grid">
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.globe}</span> Bilingual</h3>
        <p>Keyword dwibahasa Indonesia &amp; English — <code>Buat</code>/<code>Create</code>, <code>Jika</code>/<code>If</code>, <code>Ulangi</code>/<code>Loop</code>. Semua error message juga bilingual.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.package}</span> Zero Runtime Deps</h3>
        <p>Output JS vanilla murni. Tidak ada framework, tidak ada virtual DOM. Node.js cuma dibutuhkan untuk kompilasi — output bisa jalan di browser apa aja.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.zap}</span> Reaktivitas</h3>
        <p>Proxy-based reactivity dengan <code>data</code>, computed <code>turunan</code>, dan <code>Saat</code> watcher. Serasa <code>useState</code> + <code>useEffect</code> — tanpa React.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.wrench}</span> Pipeline 5 Tahap</h3>
        <p><strong>Lexer → Parser → Resolver → Analyzer → Compiler</strong>. Setiap tahap punya error reporting berkode (70+ kode) dengan saran bilingual.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.tree}</span> AST-Based</h3>
        <p>Full Abstract Syntax Tree dengan recursive-descent parser. Bukan string replacement — kompilasi sungguhan dengan semantic analysis.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.shield}</span> CSP Ready</h3>
        <p>Zero <code>eval()</code>, zero <code>new Function()</code>, semua event pakai <code>addEventListener</code>. Flag <code>--csp</code> untuk nonce injection.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.puzzle}</span> Komponen</h3>
        <p><code>Komponen Nama(props):</code> — composeable component system dengan props, children, dan lifecycle.</p>
      </div>
      <div class="feature">
        <h3><span class="feature-icon">${ICONS.map}</span> SPA + Auth</h3>
        <p>Client-side routing (<code>router: benar</code>), dynamic segments, auth guard (<code>butuhAuth</code>), role-based access.</p>
      </div>
    </div>
  </section>

  <section class="container pipeline-section">
    <h2 class="section-title">Pipeline Kompilasi</h2>
    <div class="pipeline-flow">
      <svg viewBox="0 0 900 120" xmlns="http://www.w3.org/2000/svg" class="pipeline-svg" role="img" aria-label="Pipeline Kompilasi PromptJS">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#a66fb5"/>
          </marker>
          <linearGradient id="stageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#d3b6e9;stop-opacity:0.4"/>
            <stop offset="100%" style="stop-color:#7dd3fc;stop-opacity:0.4"/>
          </linearGradient>
        </defs>
        <g><rect x="10" y="20" width="140" height="70" rx="12" fill="url(#stageGrad)" stroke="#a66fb5" stroke-width="1.5"/><text x="80" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#a66fb5" font-family="system-ui,sans-serif">Lexer</text><text x="80" y="68" text-anchor="middle" font-size="10" fill="#6b7280" font-family="system-ui,sans-serif">Tokenisasi bilingual</text></g>
        <line x1="155" y1="55" x2="180" y2="55" stroke="#a66fb5" stroke-width="1.5" marker-end="url(#arrowhead)"/>
        <g><rect x="185" y="20" width="140" height="70" rx="12" fill="url(#stageGrad)" stroke="#a66fb5" stroke-width="1.5"/><text x="255" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#a66fb5" font-family="system-ui,sans-serif">Parser</text><text x="255" y="68" text-anchor="middle" font-size="10" fill="#6b7280" font-family="system-ui,sans-serif">Recursive-descent AST</text></g>
        <line x1="330" y1="55" x2="355" y2="55" stroke="#a66fb5" stroke-width="1.5" marker-end="url(#arrowhead)"/>
        <g><rect x="360" y="20" width="140" height="70" rx="12" fill="url(#stageGrad)" stroke="#a66fb5" stroke-width="1.5"/><text x="430" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#a66fb5" font-family="system-ui,sans-serif">Resolver</text><text x="430" y="68" text-anchor="middle" font-size="10" fill="#6b7280" font-family="system-ui,sans-serif">Scope resolution</text></g>
        <line x1="505" y1="55" x2="530" y2="55" stroke="#a66fb5" stroke-width="1.5" marker-end="url(#arrowhead)"/>
        <g><rect x="535" y="20" width="140" height="70" rx="12" fill="url(#stageGrad)" stroke="#a66fb5" stroke-width="1.5"/><text x="605" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#a66fb5" font-family="system-ui,sans-serif">Analyzer</text><text x="605" y="68" text-anchor="middle" font-size="10" fill="#6b7280" font-family="system-ui,sans-serif">Semantic analysis</text></g>
        <line x1="680" y1="55" x2="705" y2="55" stroke="#a66fb5" stroke-width="1.5" marker-end="url(#arrowhead)"/>
        <g><rect x="710" y="20" width="140" height="70" rx="12" fill="url(#stageGrad)" stroke="#86efac" stroke-width="1.5"/><text x="780" y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#059669" font-family="system-ui,sans-serif">Compiler</text><text x="780" y="68" text-anchor="middle" font-size="10" fill="#6b7280" font-family="system-ui,sans-serif">Vanilla JS output</text></g>
        <text x="10" y="108" font-size="9" fill="#9ca3af" font-family="system-ui,sans-serif">.pjs source</text>
        <text x="845" y="108" font-size="9" fill="#9ca3af" font-family="system-ui,sans-serif" text-anchor="end">.js + .css</text>
      </svg>
    </div>
  </section>

  <section class="container benchmark-teaser">
    <h2 class="section-title">Perbandingan</h2>
    <p class="section-sub">Counter app sederhana yang sama. <a href="https://github.com/raarion/promptjs/blob/main/BENCHMARK.md" target="_blank" rel="noopener">Lihat benchmark lengkap →</a></p>
    <div class="bench-mini">
      <div class="bench-bar">
        <span class="bench-name">PromptJS</span>
        <span class="bench-bar-track"><span class="bench-bar-fill" style="width:8%">3.5 KB</span></span>
      </div>
      <div class="bench-bar">
        <span class="bench-name">Svelte 5</span>
        <span class="bench-bar-track"><span class="bench-bar-fill bench-accent-2" style="width:12%">~5 KB</span></span>
      </div>
      <div class="bench-bar">
        <span class="bench-name">SolidJS</span>
        <span class="bench-bar-track"><span class="bench-bar-fill bench-accent-3" style="width:48%">22 KB</span></span>
      </div>
      <div class="bench-bar">
        <span class="bench-name">Alpine.js</span>
        <span class="bench-bar-track"><span class="bench-bar-fill bench-accent-3" style="width:95%">45 KB</span></span>
      </div>
      <div class="bench-bar">
        <span class="bench-name">Vue 3</span>
        <span class="bench-bar-track"><span class="bench-bar-fill bench-accent-3" style="width:100%">46 KB</span></span>
      </div>
    </div>
    <p class="bench-note">Ukuran runtime production (gzip) — PromptJS &amp; Svelte: output compiled app.</p>
  </section>

  <section class="container qa-section">
    <h2 class="section-title">Quality Assurance</h2>
    <div class="qa-grid">
      <div class="qa-badge">
        <span class="qa-icon">${ICONS.flask}</span>
        <span class="qa-num">880</span>
        <span class="qa-label">Tests</span>
      </div>
      <div class="qa-badge">
        <span class="qa-icon">${ICONS.check}</span>
        <span class="qa-num">0</span>
        <span class="qa-label">ESLint Warnings</span>
      </div>
      <div class="qa-badge">
        <span class="qa-icon">${ICONS.ruler}</span>
        <span class="qa-num">0</span>
        <span class="qa-label">Type Errors</span>
      </div>
      <div class="qa-badge">
        <span class="qa-icon">${ICONS.palette}</span>
        <span class="qa-num">100%</span>
        <span class="qa-label">Prettier</span>
      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <p>
        PromptJS v${escapeHtml(version)} — MIT License.
        <a href="https://github.com/raarion/promptjs">github.com/raarion/promptjs</a>
      </p>
      <p class="footer-meta">
        Halaman ini di-generate oleh <code>scripts/build-pages.js</code>.
      </p>
    </div>
  </footer>
</body>
</html>`;
}

/**
 * CSS untuk seluruh halaman showcase.
 *
 * @returns {string} String CSS
 */
function buildStylesheet() {
  return `/* PromptJS Showcase — Modern Design System v2.0
 * Generated by scripts/build-pages.js
 * Design: Dark elegant with glassmorphism accents
 */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

:root {
  --bg: #0a0a14;
  --bg-elevated: #13132b;
  --surface: rgba(255,255,255,0.04);
  --surface-hover: rgba(255,255,255,0.07);
  --text: #e8e8ed;
  --text-muted: #8888a0;
  --text-dim: #5c5c78;
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.14);
  --accent: #a78bfa;
  --accent-soft: rgba(167,139,250,0.15);
  --accent-glow: rgba(167,139,250,0.3);
  --accent-2: #38bdf8;
  --accent-2-soft: rgba(56,189,248,0.15);
  --accent-3: #34d399;
  --accent-3-soft: rgba(52,211,153,0.15);
  --gradient-hero: linear-gradient(135deg, #1a1a3e 0%, #0f0f2e 30%, #1a0a2e 60%, #0a1628 100%);
  --gradient-accent: linear-gradient(135deg, #a78bfa, #38bdf8);
  --gradient-accent-reverse: linear-gradient(135deg, #38bdf8, #34d399);
  --code-bg: #0d0d1f;
  --code-text: #cdd6f4;
  --radius: 16px;
  --radius-sm: 10px;
  --radius-xs: 6px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.4);
  --shadow-lg: 0 16px 48px rgba(0,0,0,0.5);
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

* { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.65;
}

::selection {
  background: rgba(167,139,250,0.3);
  color: #fff;
}

a { color: var(--accent-2); text-decoration: none; transition: color var(--transition); }
a:hover { color: #7dd3fc; }

.container {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* ── Ambient background ───────────────────────────────────────────────── */

body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse 80% 80% at 20% 0%, rgba(167,139,250,0.08), transparent),
    radial-gradient(ellipse 60% 60% at 80% 100%, rgba(56,189,248,0.06), transparent),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(52,211,153,0.04), transparent);
  pointer-events: none;
}

/* ── Header ───────────────────────────────────────────────────────────── */

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10,10,20,0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  gap: 1rem;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--text);
  transition: opacity var(--transition);
}
.logo-link:hover { opacity: 0.85; text-decoration: none; color: var(--text); }

.logo-mark { border-radius: 8px; }

.logo-text {
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.3px;
}

.version-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: #c4b5fd;
  letter-spacing: 0.02em;
}

.header-nav { display: flex; gap: 1.5rem; align-items: center; }
.header-nav a {
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 500;
  padding: 0.3rem 0;
  border-bottom: 1.5px solid transparent;
  transition: color var(--transition), border-color var(--transition);
}
.header-nav a:hover {
  color: var(--text);
  text-decoration: none;
  border-bottom-color: var(--accent);
}

/* ── Hero ──────────────────────────────────────────────────────────────── */

.hero {
  text-align: center;
  padding: 5rem 1.5rem 4rem;
  background: var(--gradient-hero);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(167,139,250,0.12) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(56,189,248,0.08) 0%, transparent 50%);
  pointer-events: none;
}

.hero-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 0.5rem;
}
.logo-wrapper img { margin: auto; filter: drop-shadow(0 0 30px rgba(167,139,250,0.3)); }

.hero-logo {
  width: 100%;
  max-width: 280px;
  height: auto;
  margin-bottom: 1.5rem;
  align-self: center;
}

.hero-tagline {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 1rem;
  color: #fff;
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.hero-tagline em {
  font-style: normal;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline-sub {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0.5rem 0 0.6rem;
  color: var(--text-muted);
  letter-spacing: -0.2px;
}

.hero-bridge {
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0 0 1.5rem;
  color: var(--accent-glow);
  letter-spacing: 0.02em;
}

.hero-sub {
  font-size: 1.05rem;
  color: var(--text-muted);
  margin: 0 0 2rem;
  max-width: 560px;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.8rem 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 100px;
  backdrop-filter: blur(8px);
  transition: border-color var(--transition), transform var(--transition);
}
.stat-pill:hover {
  border-color: var(--accent-glow);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 900;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-top: 2px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 1.5rem;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 0.95rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: -0.2px;
}

.btn:hover { text-decoration: none; transform: translateY(-2px); }
.btn:active { transform: translateY(0); }

.btn-primary {
  background: var(--gradient-accent);
  color: #0a0a14;
  box-shadow: 0 4px 20px var(--accent-glow);
}
.btn-primary:hover {
  box-shadow: 0 6px 28px rgba(167,139,250,0.45);
  color: #0a0a14;
}

.btn-secondary {
  background: var(--accent-2-soft);
  border-color: rgba(125,211,252,0.3);
  color: var(--accent-2);
  font-family: monospace;
  font-size: 0.85rem;
}
.btn-secondary:hover { background: rgba(125,211,252,0.2); color: #bae6fd; }

.btn-ghost {
  background: var(--surface);
  border-color: var(--border-strong);
  color: var(--text);
}
.btn-ghost:hover { background: var(--surface-hover); border-color: rgba(255,255,255,0.2); color: #fff; }

.btn-accent {
  background: var(--accent-3-soft);
  border-color: rgba(52,211,153,0.25);
  color: var(--accent-3);
}
.btn-accent:hover { background: rgba(52,211,153,0.2); color: #6ee7b7; }

/* ── Section ───────────────────────────────────────────────────────────── */

.section-title {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 3.5rem 0 1.8rem;
  letter-spacing: -0.4px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.section-title::after {
  content: '';
  flex: 1;
  height: 1.5px;
  background: linear-gradient(90deg, var(--border-strong), transparent);
  border-radius: 1px;
}

.section-sub {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: -1.2rem 0 1.8rem;
}
.section-sub a { color: var(--accent-2); font-weight: 600; }

/* ── Example grid (landing page) ───────────────────────────────────────── */

.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.example-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.6rem;
  color: var(--text);
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}

.example-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-accent-reverse);
  opacity: 0;
  transition: opacity var(--transition);
}

.example-card:hover {
  text-decoration: none;
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent-glow);
  color: var(--text);
}
.example-card:hover::before { opacity: 1; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.6rem;
  gap: 0.5rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.2px;
}

.card-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: var(--accent-3-soft);
  color: var(--accent-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-left: 0.4rem;
  vertical-align: middle;
}

.card-size {
  font-size: 0.7rem;
  color: var(--text-dim);
  white-space: nowrap;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  background: var(--surface);
  border-radius: var(--radius-xs);
}

.card-description {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin: 0 0 0.9rem;
  line-height: 1.5;
  flex-shrink: 0;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.tag {
  font-size: 0.68rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--accent-2-soft);
  color: #7dd3fc;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.card-snippet {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', Monaco, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  overflow: hidden;
  margin: 0 0 0.9rem;
  max-height: 155px;
  border: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0;
}

.card-cta {
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.card-complex {
  border-color: rgba(52,211,153,0.15);
}
.card-complex::before {
  background: linear-gradient(90deg, var(--accent-3), var(--accent-2));
}

/* ── Features ──────────────────────────────────────────────────────────── */

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.2rem;
  margin-bottom: 3rem;
}

.feature {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  transition: border-color var(--transition), transform var(--transition);
}
.feature:hover {
  border-color: rgba(167,139,250,0.25);
  transform: translateY(-2px);
}

.feature h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #e0e0f0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.feature p { margin: 0; font-size: 0.88rem; color: var(--text-muted); line-height: 1.55; }
.feature code {
  background: rgba(167,139,250,0.1);
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-xs);
  font-size: 0.85em;
  color: #c4b5fd;
}

/* ── Example page (split view) ─────────────────────────────────────────── */

.example-page { padding: 2rem 1.5rem 4rem; }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 1.8rem;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-xs);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: all var(--transition);
}
.back-link:hover { color: #fff; border-color: var(--border-strong); text-decoration: none; }

.example-header { margin-bottom: 2.5rem; }
.example-header h1 {
  margin: 0 0 0.5rem;
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.5px;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.example-description { margin: 0 0 0.8rem; color: var(--text-muted); font-size: 1rem; }

.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: stretch;
}

@media (max-width: 880px) {
  .split-view { grid-template-columns: 1fr; }
}

.source-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 480px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
}

.panel-title {
  font-family: 'SF Mono', 'Fira Code', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
}

.copy-btn,
.reload-btn {
  font-size: 0.75rem;
  padding: 0.3rem 0.7rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  cursor: pointer;
  color: var(--text-muted);
  font-weight: 600;
  transition: all var(--transition);
  font-family: inherit;
}
.copy-btn:hover,
.reload-btn:hover { background: var(--accent-soft); border-color: var(--accent-glow); color: #c4b5fd; }

.source-code {
  flex: 1;
  margin: 0;
  padding: 1.2rem;
  background: var(--code-bg);
  color: var(--code-text);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', Monaco, Consolas, monospace;
  font-size: 0.84rem;
  line-height: 1.6;
  overflow: auto;
  white-space: pre;
  tab-size: 2;
}

.preview-frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: #fff;
  min-height: 400px;
}

.warnings {
  margin-top: 1.5rem;
  padding: 1rem 1.2rem;
  background: rgba(251,191,36,0.06);
  border: 1px solid rgba(251,191,36,0.2);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}
.warnings summary { cursor: pointer; font-weight: 700; color: #fbbf24; }
.warnings ul { margin: 0.5rem 0 0; padding-left: 1.2rem; color: var(--text-muted); }
.warnings code {
  background: rgba(251,191,36,0.1);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.9em;
}

/* ── Pipeline Flow ────────────────────────────────────────────────────── */

.pipeline-section { margin-bottom: 3rem; }

.pipeline-flow {
  padding: 2rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

/* ── Benchmark Teaser ─────────────────────────────────────────────────── */

.benchmark-teaser { margin-bottom: 3rem; }

.bench-mini { max-width: 560px; }

.bench-bar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.6rem;
}

.bench-name {
  font-size: 0.8rem;
  font-weight: 700;
  min-width: 85px;
  color: var(--text);
}

.bench-bar-track {
  flex: 1;
  height: 26px;
  background: var(--surface);
  border-radius: var(--radius-xs);
  overflow: hidden;
  border: 1px solid var(--border);
}

.bench-bar-fill {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  background: var(--gradient-accent-reverse);
  border-radius: var(--radius-xs);
  font-size: 0.7rem;
  font-weight: 700;
  color: #0a0a14;
  padding-right: 0.6rem;
  min-width: fit-content;
}

.bench-accent-2 { background: var(--gradient-accent); }
.bench-accent-3 { background: rgba(255,255,255,0.12); }

.bench-note {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 0.8rem;
}

/* ── QA Section ───────────────────────────────────────────────────────── */

.qa-section { margin-bottom: 3rem; }

.qa-grid {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.qa-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 130px;
  backdrop-filter: blur(8px);
  transition: border-color var(--transition);
}
.qa-badge:hover { border-color: var(--accent-glow); }

.qa-icon { font-size: 1.3rem; margin-bottom: 0.4rem; }
.qa-num {
  font-size: 1.8rem;
  font-weight: 900;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.qa-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

/* ── SVG Icons ────────────────────────────────────────────────────────── */

.feature-icon { display: inline-flex; align-items: center; }
.feature-icon svg { display: block; color: var(--accent); }
.qa-icon svg { display: block; margin: 0 auto; color: var(--accent); }

.pipeline-svg { width: 100%; max-width: 900px; height: auto; display: block; margin: 0 auto; }

/* ── Complex App Cards ────────────────────────────────────────────────── */

.app-open-section {
  margin: 2.5rem 0;
  text-align: center;
  padding: 3rem 2rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  position: relative;
  overflow: hidden;
}

.app-open-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 0%, rgba(52,211,153,0.08), transparent 60%);
  pointer-events: none;
}

.app-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 2rem;
  background: var(--gradient-accent-reverse);
  color: #0a0a14;
  border-radius: var(--radius-sm);
  font-weight: 800;
  font-size: 1.05rem;
  text-decoration: none;
  transition: all var(--transition);
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 20px rgba(52,211,153,0.2);
}

.app-open-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(52,211,153,0.35);
  color: #0a0a14;
  text-decoration: none;
}

.app-open-btn svg { vertical-align: -2px; }

.app-note {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--text-dim);
  position: relative;
  z-index: 1;
}

.back-icon { vertical-align: -3px; display: inline-flex; color: var(--text-muted); }

/* ── App page tabs ────────────────────────────────────────────────────── */

.app-page-tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.app-page-tab {
  padding: 0.4rem 1rem;
  border-radius: var(--radius-xs);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all var(--transition);
  text-decoration: none;
  font-family: inherit;
}
.app-page-tab:hover {
  color: #fff;
  border-color: var(--accent-2);
  background: var(--accent-2-soft);
}

/* ── Footer ────────────────────────────────────────────────────────────── */

.site-footer {
  border-top: 1px solid var(--border);
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.85rem;
  background: var(--bg-elevated);
}

.site-footer p { margin: 0.3rem 0; }
.site-footer a { color: var(--accent-2); }
.footer-meta { font-size: 0.75rem; opacity: 0.6; }
.footer-meta code {
  background: var(--surface);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.85em;
  color: var(--text-muted);
}
`;
}

/**
 * Copy direktori asset statis (logo SVG) ke `dist-pages/assets/`.
 *
 * @returns {void}
 */
function copyAssets() {
  const destDir = path.join(OUT_DIR, 'assets');
  fs.mkdirSync(destDir, { recursive: true });

  if (!fs.existsSync(ASSETS_DIR)) return;
  const files = fs.readdirSync(ASSETS_DIR);
  for (const file of files) {
    const srcPath = path.join(ASSETS_DIR, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, path.join(destDir, file));
    }
  }
}

// ── Build pipeline ─────────────────────────────────────────────────────────

/**
 * Jalankan full build: bersihkan out-dir, compile semua examples,
 * tulis HTML pages, stylesheet, dan asset.
 *
 * @returns {{ examples: number; bytes: number }} Ringkasan build
 */
function build() {
  const start = process.hrtime();
  const version = getVersion();

  process.stderr.write(`\nPromptJS Pages Builder\n`);
  process.stderr.write(`  Examples: ${EXAMPLES_DIR}\n`);
  process.stderr.write(`  Output:   ${OUT_DIR}\n`);
  process.stderr.write(`  Version:  v${version}\n\n`);

  // Clean output
  if (fs.existsSync(OUT_DIR)) {
    rmDirRecursive(OUT_DIR);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pjsFiles = findPjsFiles();
  if (pjsFiles.length === 0) {
    process.stderr.write(`No .pjs files found in ${EXAMPLES_DIR}\n`);
    process.exit(1);
  }

  /** @type {{ name: string; meta: any; source: string; jsSize: number; compiled: any }[]} */
  const examples = [];

  for (const filePath of pjsFiles) {
    // Skip complex examples — handled by Builder below
    const metaKey = getMetaKey(filePath);
    if (COMPLEX_EXAMPLES.has(metaKey)) continue;

    const name = getExampleName(filePath);
    const meta = EXAMPLE_META[metaKey] ||
      EXAMPLE_META[name] || {
        title: name,
        description: '',
        tags: [],
      };

    const shortPath = path.relative(EXAMPLES_DIR, filePath);
    process.stderr.write(`  Compiling ${shortPath} ... `);
    const compiled = compileExample(filePath);
    process.stderr.write(`${compiled.js.length} bytes\n`);

    // Write example page
    const html = buildExamplePage(name, compiled, version);
    const outName = getExampleOutputName(filePath);
    fs.writeFileSync(path.join(OUT_DIR, outName), html, 'utf-8');

    examples.push({
      name,
      outName,
      metaKey,
      meta,
      source: compiled.source,
      jsSize: compiled.js.length,
      compiled,
    });
  }

  // ── Build complex examples (standalone pages, no Builder routing) ─────────
  for (const complexName of COMPLEX_EXAMPLES) {
    const complexDir = path.join(EXAMPLES_DIR, complexName);
    if (!fs.existsSync(complexDir)) continue;

    const mainMeta = EXAMPLE_META[complexName] || { title: complexName, description: '', tags: [] };
    const complexOutDir = path.join(OUT_DIR, complexName);
    fs.mkdirSync(complexOutDir, { recursive: true });

    // Detect structure
    const pagesInRoot = path.join(complexDir, 'pages');
    const pagesInSrc = path.join(complexDir, 'src', 'pages');
    const hasMultiPage = fs.existsSync(pagesInRoot) || fs.existsSync(pagesInSrc);

    // Determine the main pjs file for source display on showcase card
    const mainPjsPath = fs.existsSync(path.join(complexDir, 'index.pjs'))
      ? path.join(complexDir, 'index.pjs')
      : fs.existsSync(path.join(complexDir, 'src', 'pages', 'index.pjs'))
        ? path.join(complexDir, 'src', 'pages', 'index.pjs')
        : null;

    process.stderr.write(`  Building ${complexName} ... `);

    try {
      if (hasMultiPage) {
        // ── Multi-page: compile each .pjs as a standalone page ──────────
        const pagesDirPath = fs.existsSync(pagesInSrc) ? pagesInSrc : pagesInRoot;
        const pjsFiles = findPjsFiles(pagesDirPath);

        /** @type {{ name: string; htmlFile: string; route: string; title: string; source: string; js: string; css: string }[]} */
        const builtPages = [];
        const pageNames = [];

        for (const pjsPath of pjsFiles) {
          const fileName = path.basename(pjsPath, '.pjs');
          const htmlFile = fileName === 'index' ? 'index.html' : fileName + '.html';
          const compiled = compileExample(pjsPath);
          pageNames.push(fileName);

          builtPages.push({
            name: fileName,
            htmlFile,
            route: '/' + fileName,
            title:
              fileName === 'index'
                ? 'Beranda'
                : fileName.charAt(0).toUpperCase() + fileName.slice(1),
            source: compiled.source,
            js: compiled.js,
            css: compiled.css || '',
          });
        }

        // If no index.html page exists, create a redirect to the first page
        const hasIndex = builtPages.some((p) => p.htmlFile === 'index.html');
        const defaultPage = builtPages.find((p) => p.htmlFile !== 'index.html') || builtPages[0];

        // Build nav bar (will be the same for all pages in this example)
        const navHtml = buildNavBar(complexName, builtPages);

        // Generate standalone HTML for each page
        let _totalJsSize = 0;
        for (const page of builtPages) {
          // Fix absolute paths in compiled JS for relative navigation
          const fixedJs = fixAbsolutePaths(page.js, pageNames);
          _totalJsSize += fixedJs.length;
          const pageHtml = buildStandalonePageHtml(
            fixedJs,
            page.css,
            page.title,
            navHtml,
            complexName
          );
          fs.writeFileSync(path.join(complexOutDir, page.htmlFile), pageHtml, 'utf-8');
        }

        // Create index.html redirect if missing
        if (!hasIndex && defaultPage) {
          const redirectHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(defaultPage.htmlFile)}">
  <title>${escapeHtml(mainMeta.title)}</title>
</head>
<body>
  <p>Mengalihkan ke <a href="${escapeHtml(defaultPage.htmlFile)}">${escapeHtml(defaultPage.title)}</a>...</p>
</body>
</html>`;
          fs.writeFileSync(path.join(complexOutDir, 'index.html'), redirectHtml, 'utf-8');
        }

        process.stderr.write(`${builtPages.length} pages`);
      } else {
        // ── Single-file app (e.g. todo-app): compile & wrap standalone ─────
        if (!mainPjsPath) {
          process.stderr.write(`skipped (no index.pjs)\n`);
          continue;
        }

        const compiled = compileExample(mainPjsPath);

        // Fix front-matter data: compiler serializes arrays/objects as JSON strings
        // with Indonesian keywords (benar/salah) that aren't valid JSON.
        // Match: const varName = "[{...}]"  →  const varName = JSON.parse("[{...}]".replace(/benar/g,'true').replace(/salah/g,'false'))
        let fixedJs = compiled.js;
        fixedJs = fixedJs.replace(
          /(const\s+\w+\s*=\s*)"(\[[\s\S]*?\])"/g,
          function (_match, prefix, jsonStr) {
            if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
              return (
                prefix +
                'JSON.parse("' +
                jsonStr +
                '".replace(/benar/g,"true").replace(/salah/g,"false"))'
              );
            }
            return _match;
          }
        );

        const fullHtml = buildStandalonePageHtml(
          fixedJs,
          compiled.css,
          mainMeta.title,
          '',
          complexName
        );
        fs.writeFileSync(path.join(complexOutDir, 'index.html'), fullHtml, 'utf-8');

        process.stderr.write(`1 page`);
      }

      process.stderr.write('\n');

      // Build showcase page for complex example
      const mainSource = mainPjsPath ? fs.readFileSync(mainPjsPath, 'utf-8') : '';
      const html = buildComplexExamplePage(complexName, mainMeta, mainSource, version);
      const outName = complexName + '.html';
      fs.writeFileSync(path.join(OUT_DIR, outName), html, 'utf-8');

      examples.push({
        name: complexName,
        outName,
        metaKey: complexName,
        meta: mainMeta,
        source: mainSource,
        jsSize: 0,
        compiled: { js: '', css: '', warnings: [], errors: [] },
        isComplex: true,
      });
    } catch (err) {
      process.stderr.write(`failed: ${err.message}\n`);
    }
  }

  // Write index page
  const indexHtml = buildIndexPage(examples, version);
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml, 'utf-8');

  // Write stylesheet
  fs.writeFileSync(path.join(OUT_DIR, 'styles.css'), buildStylesheet(), 'utf-8');

  // Copy assets
  copyAssets();

  const elapsed = process.hrtime(start);
  const ms = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(1);
  const totalBytes = examples.reduce((sum, ex) => sum + ex.jsSize, 0);

  process.stderr.write(`\n[OK] Built ${examples.length} example(s) in ${ms}ms\n`);
  process.stderr.write(`  Total JS: ${(totalBytes / 1024).toFixed(1)} KB\n`);
  process.stderr.write(`  Output:   ${OUT_DIR}\n\n`);

  return { examples: examples.length, bytes: totalBytes };
}

// ── Watch mode ─────────────────────────────────────────────────────────────

/**
 * Watch `examples/` untuk perubahan, rebuild otomatis.
 *
 * @returns {void}
 */
function watchMode() {
  process.stderr.write(`\nWatching ${EXAMPLES_DIR} for changes...\n`);
  process.stderr.write(`Press Ctrl+C to stop.\n\n`);

  let debounceTimer = null;
  build();

  fs.watch(EXAMPLES_DIR, { recursive: true }, (_event, filename) => {
    if (!filename || !filename.endsWith('.pjs')) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      process.stderr.write(`\nChange detected: ${filename}\n`);
      try {
        build();
      } catch (err) {
        process.stderr.write(`Build failed: ${err.message}\n`);
      }
    }, 200);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    if (watch) {
      watchMode();
    } else {
      build();
    }
  } catch (err) {
    process.stderr.write(`\n[FAIL] Build failed: ${err.message}\n`);
    if (err.stack) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
}

module.exports = { build, buildExamplePage, buildIndexPage, buildStylesheet };
