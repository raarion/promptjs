/**
 * PromptJS v0.2 — CLI Utility Functions
 * ============================================================================
 * Shared helpers for the CLI commands: formatting, file discovery, etc.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Find all .pjs files in a directory (recursively).
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
 * Returns an object of escape codes (empty strings when disabled) plus the
 * resolved `enabled` flag, so callers can both colorize and gate other output.
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
 * Format a compilation error/warning for terminal output.
 * Colors: red for errors, yellow for warnings, gray for info.
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
 * Print diagnostics to stderr.
 */
function printDiagnostics(diagnostics, label, colorize) {
  if (!diagnostics || diagnostics.length === 0) return;
  const useColor = colorize !== false;

  for (const d of diagnostics) {
    process.stderr.write(formatDiagnostic(d, useColor) + '\n');
  }
}

/**
 * Resolve output path for a compiled .pjs file.
 * If --out-dir is specified, mirror the source structure in that directory.
 * If --output is specified, write to that single file.
 * Otherwise, write .js next to the .pjs file.
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
 * Ensure the directory for a file path exists.
 */
function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Format file size in human-readable form.
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

/**
 * Get elapsed time string from a start hrtime.
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
