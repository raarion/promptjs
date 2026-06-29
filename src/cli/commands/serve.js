// @ts-check

/**
 * PromptJS v1.0.0 — CLI: `serve` Command / Perintah `serve`
 * ============================================================================
 *
 * Dev server dengan live-reload via WebSocket. Compile `.pjs` on-the-fly,
 * serve HTML + JS, dan push reload signal saat file berubah.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { isInsideRoot } = require('../../utils/path-guard');
const { PromptJSEngine } = require('../../engine/promptjs');
const {
  findPjsFiles,
  printDiagnostics,
  formatElapsed,
  formatSize,
  makeColors,
} = require('../utils');

// Minimal WebSocket server for live-reload
const LIVE_RELOAD_JS = `
// PromptJS v1.0.0 Live Reload
(function() {
  var ws = new WebSocket('ws://' + location.host + '/__pjs_reload__');
  ws.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'reload') {
        console.log('[pjs] File changed, reloading...');
        location.reload();
      } else if (msg.type === 'error') {
        showPjsError(msg.errors);
      } else if (msg.type === 'css') {
        var style = document.getElementById('pjs-dev-css');
        if (!style) {
          style = document.createElement('style');
          style.id = 'pjs-dev-css';
          document.head.appendChild(style);
        }
        style.textContent = msg.css;
        console.log('[pjs] CSS updated (HMR)');
      }
    } catch(err) {
      if (e.data === 'reload') location.reload();
    }
  };
  ws.onclose = function() {
    console.log('[pjs] Live reload disconnected. Retrying in 2s...');
    setTimeout(function() { location.reload(); }, 2000);
  };

  function showPjsError(errors) {
    var overlay = document.getElementById('pjs-error-overlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    overlay.innerHTML = '<strong>⚠ PromptJS Compile Error</strong><br>' +
      errors.map(function(e) {
        return '<span style="color:#e94560">' + (e.code || 'E0000') + '</span>: ' +
               (e.message || 'Unknown error') +
               (e.line ? ' (line ' + e.line + ')' : '');
      }).join('<br>');
  }

  window.__pjsClearError = function() {
    var overlay = document.getElementById('pjs-error-overlay');
    if (overlay) overlay.style.display = 'none';
  };
})();
`;

// Error overlay script (injected alongside live-reload)
const ERROR_OVERLAY_JS = `
// PromptJS v1.0.0 Error Overlay — auto-clear on successful compile
(function() {
  window.addEventListener('error', function(e) {
    var overlay = document.getElementById('pjs-error-overlay');
    if (overlay && overlay.style.display === 'block') return;
    // Only show JS runtime errors in dev
    if (e.error) {
      console.error('[pjs] Runtime error:', e.error.message);
    }
  });
})();
`;

// HTML wrapper for compiled .pjs output
/**
 * Bungkus kode JS hasil compile menjadi HTML dengan live-reload script.
 *
 * @param {string} jsCode - Kode JS hasil compile
 * @param {string} filePath - Path file `.pjs` asli
 * @param {{ liveReload: boolean, css?: string, sourceMap?: string|null }} options - Opsi serve
 * @returns {string} String HTML lengkap
 */
function wrapInHtml(jsCode, filePath, options) {
  const title = path.basename(filePath, '.pjs');
  const cssCode = options.css || '';
  const cssTag = cssCode ? `<style>\n${cssCode}\n  </style>` : '';
  const reloadScript = options.liveReload ? `\n  <script>${LIVE_RELOAD_JS}</script>` : '';
  const errorOverlay = options.liveReload ? `\n  <script>${ERROR_OVERLAY_JS}</script>` : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>${cssTag}${reloadScript}${errorOverlay}
</head>
<body>
  <div id="app"></div>
  <div id="pjs-error-overlay" style="display:none;position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#e94560;padding:12px 20px;font-family:monospace;font-size:13px;z-index:99999;border-top:2px solid #e94560;max-height:40vh;overflow-y:auto;"></div>
  <script>
${jsCode}
  </script>
</body>
</html>`;
}

/**
 * Jalankan command `pjs serve`.
 *
 * Start HTTP server di `--port` (default 3000), serve file `.pjs` dari
 * current directory, compile on-the-fly, dan inject live-reload script.
 *
 * @param {Object} argv - Parsed args dari `parseArgs`
 * @returns {Object} Instance `http.Server`
 */
function runServe(argv) {
  const inputDir = argv._[0] || '.';
  const port = argv.port || argv.p || 3000;
  const noReload = argv['no-reload'] || false;
  const rootDir = path.resolve(inputDir);

  // Verify directory exists
  if (!fs.existsSync(rootDir)) {
    process.stderr.write(`Error: Directory '${inputDir}' does not exist.\n`);
    process.exit(1);
  }

  const { green, cyan, bold, gray, reset } = makeColors({ stream: process.stdout });

  // WebSocket clients for live-reload
  const wsClients = new Set();

  // Compile cache: filePath -> { html, js, mtime }
  const compileCache = new Map();

  // MIME types
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pjs': 'text/html; charset=utf-8', // Served as HTML
  };

  /**
   * Compile a .pjs file and cache the result.
   */
  function compilePjs(filePath) {
    const start = process.hrtime();
    const engine = new PromptJSEngine();
    const result = engine.compileFile(filePath, {
      dev: true,
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
      // Return error page
      const errorHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Compile Error</title>
<style>body{font-family:monospace;padding:2rem;background:#1e1e1e;color:#d4d4d4}
.error{color:#f48771}.code{color:#dcdcaa}.suggestion{color:#608b4e}</style></head>
<body><h1 class="error">Compile Error</h1><pre>${result.errors
        .map(
          (e) =>
            `<span class="code">${e.code || 'E0000'}</span> <span class="error">${escapeHtml(e.message)}</span>` +
            (e.suggestion
              ? `\n  <span class="suggestion">Saran: ${escapeHtml(e.suggestion)}</span>`
              : '')
        )
        .join('\n')}</pre></body></html>`;
      return { html: errorHtml, js: null, error: true, elapsed };
    }

    const html = wrapInHtml(result.js, filePath, {
      liveReload: !noReload,
      css: result.css || '',
      sourceMap: result.sourceMap || null,
    });
    process.stderr.write(
      `  ${cyan}${path.relative(process.cwd(), filePath)}${reset} ${green}✓${reset} ${gray}(${formatSize(result.js.length)} ${elapsed})${reset}\n`
    );

    return { html, js: result.js, error: false, elapsed };
  }

  /**
   * HTTP request handler.
   */
  function handleRequest(req, res) {
    let urlPath = req.url.split('?')[0]; // Strip query string
    // S-6 (v1.0.0): Decode percent-encoding agar `%2e%2e%2f` (..%2f) tidak lolos
    // dari pemeriksaan traversal di bawah. URL malformed → 400.
    try {
      urlPath = decodeURIComponent(urlPath);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('400 Bad Request');
      return;
    }

    // WebSocket upgrade for live-reload
    if (
      urlPath === '/__pjs_reload__' &&
      req.headers.upgrade &&
      req.headers.upgrade.toLowerCase() === 'websocket'
    ) {
      // Handled in upgrade event
      return;
    }

    // Resolve file path
    let filePath;
    if (urlPath === '/') {
      // Look for index.pjs or index.html
      const indexPaths = ['index.pjs', 'index.html'];
      filePath = null;
      for (const ip of indexPaths) {
        const candidate = path.join(rootDir, ip);
        if (fs.existsSync(candidate)) {
          filePath = candidate;
          break;
        }
      }
      if (!filePath) {
        // Generate directory listing
        serveDirectoryListing(rootDir, res);
        return;
      }
    } else {
      filePath = path.join(rootDir, urlPath);
    }

    // Security: prevent path traversal
    // S-6 (v1.0.0): `resolved.startsWith(rootDir)` cacat — sibling-directory
    // escape lolos (mis. rootDir "/srv/app" vs "/srv/app-secret/x").
    // S-15 (v1.0.1): guard ini disentralisasi ke `src/utils/path-guard.js`
    // (isInsideRoot pakai path.relative) agar konsisten lintas adapter & CLI.
    const resolved = path.resolve(filePath);
    if (!isInsideRoot(rootDir, resolved)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    // Check if it's a .pjs file
    if (resolved.endsWith('.pjs')) {
      servePjs(resolved, req, res);
      return;
    }

    // Serve static file
    serveStatic(resolved, res);
  }

  /**
   * Serve a compiled .pjs file as HTML.
   */
  function servePjs(filePath, req, res) {
    try {
      const stat = fs.statSync(filePath);
      const cached = compileCache.get(filePath);

      // Use cache if file hasn't changed
      if (cached && cached.mtime && cached.mtime.getTime() === stat.mtime.getTime()) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(cached.html);
        return;
      }

      const result = compilePjs(filePath);

      // Cache the result
      compileCache.set(filePath, {
        html: result.html,
        js: result.js,
        mtime: stat.mtime,
        error: result.error,
      });

      res.writeHead(result.error ? 500 : 200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(result.html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + path.basename(filePath));
    }
  }

  /**
   * Serve a static file.
   */
  function serveStatic(filePath, res) {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        // Try as directory with index
        const indexPath = path.join(filePath, 'index.pjs');
        if (fs.existsSync(indexPath)) {
          servePjs(indexPath, null, res);
          return;
        }
        const indexHtml = path.join(filePath, 'index.html');
        if (fs.existsSync(indexHtml)) {
          serveStatic(indexHtml, res);
          return;
        }
        serveDirectoryListing(filePath, res);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }

  /**
   * Generate a simple directory listing.
   */
  function serveDirectoryListing(dirPath, res) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const items = entries
        .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
        .map((e) => {
          const isDir = e.isDirectory();
          const icon = isDir ? '📁' : e.name.endsWith('.pjs') ? '📄' : '📑';
          const href = isDir ? e.name + '/' : e.name;
          return `<li>${icon} <a href="${escapeHtml(href)}">${escapeHtml(e.name)}</a></li>`;
        })
        .join('\n');

      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Index of ${escapeHtml(path.relative(rootDir, dirPath) || '/')}</title>
<style>body{font-family:system-ui;padding:2rem}ul{list-style:none;padding:0}li{padding:0.3rem 0}
a{color:#0066cc;text-decoration:none}a:hover{text-decoration:underline}</style></head>
<body><h1>Index of ${escapeHtml(path.relative(rootDir, dirPath) || '/')}</h1><ul>${items}</ul></body></html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }

  // ── Create HTTP server ──────────────────────────────────────────────────
  const server = http.createServer(handleRequest);

  // WebSocket upgrade handler for live-reload
  server.on('upgrade', (req, socket, _head) => {
    const urlPath = req.url.split('?')[0];
    if (urlPath === '/__pjs_reload__') {
      // Minimal WebSocket handshake
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const crypto = require('crypto');
      const accept = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-5AB5DC65B4C7')
        .digest('base64');

      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          'Sec-WebSocket-Accept: ' +
          accept +
          '\r\n' +
          '\r\n'
      );

      wsClients.add(socket);
      socket.on('close', () => wsClients.delete(socket));
      socket.on('error', () => wsClients.delete(socket));
    }
  });

  // Broadcast reload to all WebSocket clients
  function broadcastReload() {
    const msg = Buffer.from([0x81, 0x07, 0x72, 0x65, 0x6c, 0x6f, 0x61, 0x64]); // "reload"
    for (const client of wsClients) {
      try {
        client.write(msg);
      } catch {
        /* ignore */
      }
    }
  }

  // ── File watcher ────────────────────────────────────────────────────────
  let watcher = null;
  if (!noReload) {
    try {
      watcher = fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        if (!filename.endsWith('.pjs') && !filename.endsWith('.json') && !filename.endsWith('.css'))
          return;

        const filePath = path.join(rootDir, filename);
        process.stderr.write(`  ${cyan}${filename}${reset} changed — recompiling...\n`);

        // Clear cache for changed file
        compileCache.delete(filePath);

        // If it's a .pjs file, pre-compile and notify browsers
        if (filename.endsWith('.pjs') && fs.existsSync(filePath)) {
          compilePjs(filePath);
          broadcastReload();
        } else {
          // CSS/JSON change — just reload
          broadcastReload();
        }
      });
    } catch (e) {
      process.stderr.write(`Warning: File watcher not available: ${e.message}\n`);
    }
  }

  // ── Start server ────────────────────────────────────────────────────────
  server.listen(port, () => {
    process.stderr.write(`\n${green}${bold}PromptJS Dev Server${reset}\n`);
    process.stderr.write(`  ${cyan}Local:${reset}   http://localhost:${port}\n`);
    process.stderr.write(`  ${gray}Root:${reset}   ${rootDir}\n`);
    if (!noReload) {
      process.stderr.write(`  ${gray}Reload:${reset} enabled (WebSocket)\n`);
    }
    process.stderr.write(`\n  ${gray}Press Ctrl+C to stop${reset}\n\n`);

    // Pre-compile all .pjs files
    const pjsFiles = findPjsFiles(rootDir);
    if (pjsFiles.length > 0) {
      process.stderr.write(`${gray}Compiling ${pjsFiles.length} file(s)...${reset}\n`);
      for (const f of pjsFiles) {
        const result = compilePjs(f);
        const stat = fs.statSync(f);
        compileCache.set(f, {
          html: result.html,
          js: result.js,
          mtime: stat.mtime,
          error: result.error,
        });
      }
      process.stderr.write('\n');
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    process.stderr.write(`\n${gray}Shutting down...${reset}\n`);
    if (watcher) watcher.close();
    for (const client of wsClients) {
      try {
        client.end();
      } catch {
        /* ignore */
      }
    }
    server.close();
    process.exit(0);
  });

  return server;
}

/**
 * Escape HTML special characters.
 */
/**
 * Escape karakter HTML special (`<`, `>`, `&`, `"`, `'`).
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

module.exports = { runServe, wrapInHtml, escapeHtml };
