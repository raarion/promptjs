// @ts-check

/**
 * PromptJS v0.2 — CLI Utility Functions / Fungsi Utilitas CLI
 * ============================================================================
 *
 * Shared helpers for the CLI commands: formatting, file discovery, etc.
 * Helper bersama untuk command CLI: formatting, file discovery, dll.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Palet warna ANSI yang dikembalikan oleh `makeColors`.
 *
 * @typedef {Object} ColorPalette
 * @property {boolean} enabled - Apakah warna aktif
 * @property {string} green - Escape code hijau (atau '' jika disabled)
 * @property {string} cyan - Escape code cyan
 * @property {string} red - Escape code merah
 * @property {string} yellow - Escape code kuning
 * @property {string} gray - Escape code abu-abu
 * @property {string} bold - Escape code bold
 * @property {string} reset - Escape code reset
 */

/**
 * Cari semua file `.pjs` dalam direktori (rekursif).
 *
 * @param {string} dir - Path direktori akar pencarian
 * @param {string[]} [ignoreDirs] - Daftar nama direktori yang di-skip (default: `['node_modules', '.git', 'dist']`)
 * @returns {string[]} Daftar path absolut file `.pjs` yang ditemukan
 */
function findPjsFiles(dir, ignoreDirs) {
  const ignore = ignoreDirs || ['node_modules', '.git', 'dist'];
  const results = [];

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return; // Skip unreadable dirs
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
  return results;
}

/**
 * Build an ANSI color palette, honoring the NO_COLOR / FORCE_COLOR conventions.
 *
 * Resolution order (highest priority first):
 *   1. NO_COLOR (present and non-empty) -> always disabled.
 *   2. FORCE_COLOR (present and non-empty) -> always enabled.
 *   3. An explicit `enabled` boolean (e.g. `--stdout` turns color off).
 *   4. A `stream`'s TTY status (auto-detect; piped output gets no color).
 *   5. Default: enabled.
 *
 * @param {{ enabled?: boolean, stream?: { isTTY?: boolean } }} [opts] - Opsi color
 * @returns {ColorPalette} Palet warna ANSI dengan flag `enabled`
 */
function makeColors(opts) {
  const { enabled, stream } = opts || {};
  let on;
  if (process.env.NO_COLOR != null && process.env.NO_COLOR !== '') {
    on = false;
  } else if (process.env.FORCE_COLOR != null && process.env.FORCE_COLOR !== '') {
    on = true;
  } else if (typeof enabled === 'boolean') {
    on = enabled;
  } else if (stream) {
    on = Boolean(stream.isTTY);
  } else {
    on = true;
  }

  const c = (code) => (on ? code : '');
  return {
    enabled: on,
    green: c('\x1b[32m'),
    cyan: c('\x1b[36m'),
    red: c('\x1b[31m'),
    yellow: c('\x1b[33m'),
    gray: c('\x1b[90m'),
    bold: c('\x1b[1m'),
    reset: c('\x1b[0m'),
  };
}

/**
 * Format diagnostic (error/warning) untuk output terminal.
 *
 * Warna: merah untuk error, kuning untuk warning, abu-abu untuk info.
 *
 * @param {Object} diag - Objek diagnostic dengan field `code`, `message`, `severity`, `line`, `suggestion`
 * @param {boolean} [colorize] - Apakah output diwarnai (default: true)
 * @returns {string} String diagnostic yang siap di-print
 */
function formatDiagnostic(diag, colorize) {
  const { red, yellow, gray, bold, reset } = makeColors({ enabled: colorize !== false });

  const severity = diag.severity === 'error' ? 'error' : 'warning';
  const color = severity === 'error' ? red : yellow;
  const code = diag.code || 'E0000';
  const message = diag.message || 'Unknown error';
  const suggestion = diag.suggestion || '';
  const line = diag.line || '';

  let out = `${color}${bold}${code}${reset} ${color}${message}${reset}`;
  if (line) {
    out += ` ${gray}(line ${line})${reset}`;
  }
  if (suggestion) {
    out += `\n  ${gray}Saran: ${suggestion}${reset}`;
  }

  return out;
}

/**
 * Print daftar diagnostic ke stderr.
 *
 * @param {Object[]} diagnostics - Daftar diagnostic
 * @param {string} label - Label (tidak dipakai, kompatibilitas mundur)
 * @param {boolean} [colorize] - Apakah output diwarnai
 * @returns {void}
 */
function printDiagnostics(diagnostics, label, colorize) {
  if (!diagnostics || diagnostics.length === 0) return;
  const useColor = colorize !== false;

  for (const d of diagnostics) {
    process.stderr.write(formatDiagnostic(d, useColor) + '\n');
  }
}

/**
 * Resolve output path untuk file `.pjs` yang di-compile.
 *
 * Aturan:
 * - Jika `options.output` di-set: tulis ke file tunggal tersebut.
 * - Jika `options.outDir` di-set: mirror struktur source di outDir.
 * - Default: tulis `.js` di sebelah file `.pjs`.
 *
 * @param {string} inputPath - Path file `.pjs` input
 * @param {{ output?: string, outDir?: string, rootDir?: string }} options - Opsi output
 * @returns {string} Path file `.js` output
 */
function resolveOutputPath(inputPath, options) {
  if (options.output) {
    return options.output; // Single file mode
  }

  const parsed = path.parse(inputPath);
  const jsName = parsed.name + '.js';

  if (options.outDir) {
    // Mirror source structure inside outDir
    const relDir = path.relative(options.rootDir || process.cwd(), parsed.dir);
    return path.join(options.outDir, relDir, jsName);
  }

  // Default: .js next to .pjs
  return path.join(parsed.dir, jsName);
}

/**
 * Pastikan direktori parent dari `filePath` ada (buat jika belum).
 *
 * @param {string} filePath - Path file yang akan ditulis
 * @returns {void}
 */
function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Format ukuran file menjadi bentuk yang dapat dibaca manusia (mis. `1.2KB`, `3.4MB`).
 *
 * @param {number} bytes - Ukuran file dalam byte
 * @returns {string} Ukuran terformat
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

/**
 * Format elapsed time dari start hrtime menjadi string (mis. `12.3ms`, `1.50s`).
 *
 * @param {[number, number]} start - Start time dari `process.hrtime()` (tuple [seconds, nanoseconds])
 * @returns {string} Waktu terformat
 */
function formatElapsed(start) {
  const diff = process.hrtime(start);
  const ms = (diff[0] * 1e9 + diff[1]) / 1e6;
  if (ms < 1000) return ms.toFixed(1) + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

module.exports = {
  findPjsFiles,
  makeColors,
  formatDiagnostic,
  printDiagnostics,
  resolveOutputPath,
  ensureDirForFile,
  formatSize,
  formatElapsed,
};
