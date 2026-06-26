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
function findPjsFiles() {
  if (!fs.existsSync(EXAMPLES_DIR)) return [];
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'data') {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.pjs')) {
        results.push(fullPath);
      }
    }
  }
  walk(EXAMPLES_DIR);
  return results.sort();
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

  const previewHtml = buildPreviewIframe(compiled.js, meta.title);
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
 * Bangun HTML untuk iframe preview — bungkus JS hasil compile menjadi
 * dokumen HTML minimal dengan mount point `<div id="app">`.
 *
 * @param {string} jsCode - Kode JS hasil compile
 * @param {string} title - Judul halaman (untuk `<title>`)
 * @returns {string} String HTML untuk `srcdoc`
 */
function buildPreviewIframe(jsCode, title) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 1.5rem; color: #1f2937; background: #fafafa; }
    button { font: inherit; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; margin-right: 0.4rem; }
    button:hover { background: #f3f4f6; }
    input { font: inherit; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #d1d5db; width: 100%; max-width: 20rem; }
    ul { padding-left: 1.2rem; }
    li { margin: 0.2rem 0; }
    h1 { font-size: 1.5rem; }
    h3 { font-size: 1rem; margin: 0.4rem 0 0; }
    /* Gallery grid layout */
    .galeri { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .kartu { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.6rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .kartu img { width: 100%; height: 140px; object-fit: cover; border-radius: 4px; display: block; background: #f3f4f6; }
    /* Counter highlight */
    #counter p { font-size: 1.1rem; }
    /* Todo spacing */
    #todo input { margin-bottom: 0.5rem; }
    #todo ul { margin: 0.5rem 0; }
    /* Watcher marker shouldn't affect layout */
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
      (ex) => `      <a class="example-card" href="${escapeHtml(ex.outName)}">
        <div class="card-header">
          <h3>${escapeHtml(ex.meta.title)}</h3>
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
        <span class="card-cta">Lihat live →</span>
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
        Tulis dengan Bahasa yang Kamu Pahami, dan Hasilkan Kode yang Dunia Mengerti.
      </p>
      <p class="hero-sub">
        Bahasa frontend deklaratif dwibahasa yang dikompilasi ke vanilla JavaScript — dengan reaktivitas, komponen, routing, auth, plugin, dan adapter deployment.
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
          <span class="stat-value">431</span>
          <span class="stat-label">Tests Passing</span>
        </div>
        <div class="stat-pill">
          <span class="stat-value">ID+EN</span>
          <span class="stat-label">Bilingual</span>
        </div>
      </div>
      <div class="hero-actions">
        <a href="#examples" class="btn btn-primary">Lihat Contoh</a>
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
        <h3>🌐 Bilingual</h3>
        <p>Keyword dwibahasa Indonesia &amp; English — <code>Buat</code>/<code>Create</code>, <code>Jika</code>/<code>If</code>, <code>Ulangi</code>/<code>Loop</code>. Semua error message juga bilingual.</p>
      </div>
      <div class="feature">
        <h3>📦 Zero Runtime Deps</h3>
        <p>Output JS vanilla murni. Tidak ada framework, tidak ada virtual DOM. Node.js cuma dibutuhkan untuk kompilasi — output bisa jalan di browser apa aja.</p>
      </div>
      <div class="feature">
        <h3>⚡ Reaktivitas</h3>
        <p>Proxy-based reactivity dengan <code>data</code>, computed <code>turunan</code>, dan <code>Saat</code> watcher. Serasa <code>useState</code> + <code>useEffect</code> — tanpa React.</p>
      </div>
      <div class="feature">
        <h3>🔧 Pipeline 5 Tahap</h3>
        <p><strong>Lexer → Parser → Resolver → Analyzer → Compiler</strong>. Setiap tahap punya error reporting berkode (70+ kode) dengan saran bilingual.</p>
      </div>
      <div class="feature">
        <h3>🌳 AST-Based</h3>
        <p>Full Abstract Syntax Tree dengan recursive-descent parser. Bukan string replacement — kompilasi sungguhan dengan semantic analysis.</p>
      </div>
      <div class="feature">
        <h3>🛡️ CSP Ready</h3>
        <p>Zero <code>eval()</code>, zero <code>new Function()</code>, semua event pakai <code>addEventListener</code>. Flag <code>--csp</code> untuk nonce injection.</p>
      </div>
      <div class="feature">
        <h3>🧩 Komponen</h3>
        <p><code>Komponen Nama(props):</code> — composeable component system dengan props, children, dan lifecycle.</p>
      </div>
      <div class="feature">
        <h3>🗺️ SPA + Auth</h3>
        <p>Client-side routing (<code>router: benar</code>), dynamic segments, auth guard (<code>butuhAuth</code>), role-based access.</p>
      </div>
    </div>
  </section>

  <section class="container pipeline-section">
    <h2 class="section-title">Pipeline Kompilasi</h2>
    <div class="pipeline-flow">
      <div class="pipeline-step">
        <div class="step-icon">🔤</div>
        <div class="step-title">Lexer</div>
        <div class="step-desc">Tokenisasi bilingual, indentasi → INDENT/DEDENT</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <div class="step-icon">🌲</div>
        <div class="step-title">Parser</div>
        <div class="step-desc">Recursive-descent AST builder</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <div class="step-icon">🔍</div>
        <div class="step-title">Resolver</div>
        <div class="step-desc">Scope resolution, write tracking</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <div class="step-icon">📊</div>
        <div class="step-title">Analyzer</div>
        <div class="step-desc">Semantic analysis, type hints</div>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <div class="step-icon">⚙️</div>
        <div class="step-title">Compiler</div>
        <div class="step-desc">Vanilla JS + source maps</div>
      </div>
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
        <span class="qa-icon">🧪</span>
        <span class="qa-num">431</span>
        <span class="qa-label">Tests</span>
      </div>
      <div class="qa-badge">
        <span class="qa-icon">✅</span>
        <span class="qa-num">0</span>
        <span class="qa-label">ESLint Warnings</span>
      </div>
      <div class="qa-badge">
        <span class="qa-icon">📐</span>
        <span class="qa-num">0</span>
        <span class="qa-label">Type Errors</span>
      </div>
      <div class="qa-badge">
        <span class="qa-icon">🎨</span>
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
  return `/* PromptJS Showcase — Stylesheet
 * Generated by scripts/build-pages.js
 * Color palette: soft pastels matching the logo (sky-blue, lavender, mint)
 */

:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #1f2937;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --accent: #a66fb5;
  --accent-soft: #d3b6e9;
  --accent-2: #7dd3fc;
  --accent-3: #86efac;
  --code-bg: #1e1e2e;
  --code-text: #cdd6f4;
  --radius: 12px;
  --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.08);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* ── Header ─────────────────────────────────────────────────────────────── */

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text);
}

.logo-link:hover { text-decoration: none; }

.logo-text { font-weight: 700; font-size: 1.1rem; }

.version-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: #5b3a6b;
}

.header-nav { display: flex; gap: 1.2rem; }
.header-nav a { color: var(--text-muted); font-size: 0.9rem; }
.header-nav a:hover { color: var(--text); text-decoration: none; }

/* ── Hero ───────────────────────────────────────────────────────────────── */

.hero {
  text-align: center;
  padding: 4rem 1.5rem 3rem;
  background:
    radial-gradient(circle at 20% 20%, rgba(215, 182, 233, 0.35), transparent 50%),
    radial-gradient(circle at 80% 0%, rgba(125, 211, 252, 0.35), transparent 50%),
    radial-gradient(circle at 50% 100%, rgba(134, 239, 172, 0.25), transparent 50%);
}

.hero-inner { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }

.logo-wrapper { display: flex; flex-direction: column; gap: 0; }
.logo-wrapper img { margin: auto; }

.hero-logo { width: 100%; max-width: 320px; height: auto; margin-bottom: 1.5rem; align-self: center; }

.hero-tagline {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 0.8rem;
  color: var(--text);
}

.hero-sub {
  font-size: 1rem;
  color: var(--text-muted);
  margin: 0 0 1.5rem;
  max-width: 600px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 1.2rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.6rem 1.2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 90px;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--accent);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.btn:hover { text-decoration: none; transform: translateY(-1px); }

.btn-primary {
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover { background: #9259a6; color: #fff; }

.btn-ghost {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}

.btn-ghost:hover { background: #fff; }

/* ── Section ────────────────────────────────────────────────────────────── */

.section-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 3rem 0 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border);
}

/* ── Example grid (landing page) ────────────────────────────────────────── */

.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.example-card {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  color: var(--text);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.example-card:hover {
  text-decoration: none;
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent-soft);
  color: var(--text);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.card-size {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.card-description {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 0.8rem;
}

.tag-row { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.8rem; }

.tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: #5b3a6b;
  font-weight: 500;
}

.card-snippet {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 0.8rem;
  border-radius: var(--radius-sm);
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0 0 0.8rem;
  max-height: 180px;
  overflow-y: hidden;
}

.card-cta {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
}

/* ── Features ───────────────────────────────────────────────────────────── */

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
  margin-bottom: 3rem;
}

.feature {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.2rem;
}

.feature h3 {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  color: var(--accent);
}

.feature p { margin: 0; font-size: 0.9rem; color: var(--text-muted); }
.feature code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85em; }

/* ── Example page (split view) ──────────────────────────────────────────── */

.example-page { padding: 2rem 1.5rem 4rem; }

.back-link {
  display: inline-block;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.example-header { margin-bottom: 2rem; }
.example-header h1 { margin: 0 0 0.4rem; font-size: 1.8rem; }
.example-description { margin: 0 0 0.6rem; color: var(--text-muted); }

.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  align-items: stretch;
}

@media (max-width: 880px) {
  .split-view { grid-template-columns: 1fr; }
}

.source-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 480px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--border);
  background: #fafafa;
}

.panel-title {
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.copy-btn,
.reload-btn {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text);
}

.copy-btn:hover,
.reload-btn:hover { background: var(--accent-soft); border-color: var(--accent-soft); }

.source-code {
  flex: 1;
  margin: 0;
  padding: 1rem;
  background: var(--code-bg);
  color: var(--code-text);
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.55;
  overflow: auto;
  white-space: pre;
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
  padding: 0.8rem 1rem;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.warnings summary { cursor: pointer; font-weight: 600; color: #9a3412; }
.warnings ul { margin: 0.5rem 0 0; padding-left: 1.2rem; }
.warnings code { background: #ffedd5; padding: 0.1rem 0.3rem; border-radius: 3px; }

/* ── Pipeline Flow ─────────────────────────────────────────────────────── */

.pipeline-section { margin-bottom: 3rem; }

.pipeline-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.pipeline-step {
  text-align: center;
  padding: 0.8rem;
  min-width: 100px;
}

.step-icon { font-size: 1.5rem; margin-bottom: 0.3rem; }
.step-title { font-weight: 700; font-size: 0.9rem; color: var(--accent); }
.step-desc { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem; }

.pipeline-arrow {
  font-size: 1.2rem;
  color: var(--text-muted);
  font-weight: 700;
}

@media (max-width: 700px) {
  .pipeline-flow { flex-direction: column; }
  .pipeline-arrow { transform: rotate(90deg); }
}

/* ── Benchmark Teaser ─────────────────────────────────────────────────── */

.benchmark-teaser { margin-bottom: 3rem; }

.section-sub { color: var(--text-muted); font-size: 0.9rem; margin: -1rem 0 1.5rem; }

.bench-mini { max-width: 500px; }

.bench-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.bench-name {
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 80px;
  color: var(--text);
}

.bench-bar-track {
  flex: 1;
  height: 24px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.bench-bar-fill {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  background: var(--accent-3);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #fff;
  padding-right: 0.5rem;
  min-width: fit-content;
}

.bench-accent-2 { background: var(--accent-2); }
.bench-accent-3 { background: var(--accent); }

.bench-note {
  font-size: 0.75rem;
  color: var(--text-muted);
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
  padding: 1.2rem 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 120px;
}

.qa-icon { font-size: 1.3rem; margin-bottom: 0.3rem; }
.qa-num { font-size: 1.5rem; font-weight: 800; color: var(--accent); }
.qa-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

/* ── Footer ─────────────────────────────────────────────────────────────── */

.site-footer {
  border-top: 1px solid var(--border);
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.site-footer p { margin: 0.3rem 0; }
.footer-meta { font-size: 0.75rem; opacity: 0.7; }
.footer-meta code {
  background: #f3f4f6;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.85em;
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
    const name = getExampleName(filePath);
    const metaKey = getMetaKey(filePath);
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

  process.stderr.write(`\n✓ Built ${examples.length} example(s) in ${ms}ms\n`);
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
    process.stderr.write(`\n✗ Build failed: ${err.message}\n`);
    if (err.stack) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
}

module.exports = { build, buildExamplePage, buildIndexPage, buildStylesheet };
