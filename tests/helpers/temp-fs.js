'use strict';

/**
 * Zero-dependency temporary filesystem helper for CLI tests.
 *
 * Provides isolated temp directories that are automatically cleaned up after
 * each test. Uses Node's built-in `node:os` and `node:fs` modules — no
 * `memfs` or any external mock library, in keeping with PromptJS's
 * zero-dependency philosophy for tooling.
 *
 * Usage:
 *   const tmp = createTempDir('my-test');
 *   fs.writeFileSync(path.join(tmp.dir, 'file.pjs'), source);
 *   // ... run CLI ...
 *   tmp.cleanup();
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Track all created temp dirs so we can clean them up at process exit
 * even if a test forgot to call `cleanup()`.
 * @type {Set<string>}
 */
const _created = new Set();

/**
 * Create an isolated temp directory with a unique name.
 *
 * @param {string} [prefix='promptjs-test'] - Prefix for the directory name
 * @returns {{ dir: string, cleanup: () => void }} Object with the absolute
 *   path to the temp dir and a `cleanup()` function that recursively removes it.
 */
function createTempDir(prefix = 'promptjs-test') {
  const base = path.join(os.tmpdir(), `${prefix}-`);
  const dir = fs.mkdtempSync(base);
  _created.add(dir);

  return {
    dir,
    cleanup() {
      _created.delete(dir);
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; ignore errors on Windows where files may be locked.
      }
    },
  };
}

/**
 * Remove all temp dirs created in this process — used as a safety net
 * in `afterAll()` of test files.
 */
function cleanupAll() {
  for (const dir of Array.from(_created)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      _created.delete(dir);
    } catch {
      // ignore
    }
  }
}

/**
 * Write a file inside a temp dir, creating parent dirs as needed.
 *
 * @param {string} dir - Temp dir root (from `createTempDir().dir`)
 * @param {string} relPath - Relative path inside the temp dir
 * @param {string} content - File content
 * @returns {string} Absolute path of the written file
 */
function writeTempFile(dir, relPath, content) {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

/**
 * Read a file inside a temp dir.
 *
 * @param {string} dir - Temp dir root
 * @param {string} relPath - Relative path
 * @returns {string} File content
 */
function readTempFile(dir, relPath) {
  return fs.readFileSync(path.join(dir, relPath), 'utf-8');
}

/**
 * Check whether a file exists inside a temp dir.
 *
 * @param {string} dir - Temp dir root
 * @param {string} relPath - Relative path
 * @returns {boolean}
 */
function existsTempFile(dir, relPath) {
  try {
    fs.accessSync(path.join(dir, relPath));
    return true;
  } catch {
    return false;
  }
}

/**
 * List all files (recursive) inside a temp dir, returned as relative paths.
 *
 * @param {string} dir - Temp dir root
 * @returns {string[]} Array of relative paths
 */
function listTempFiles(dir) {
  const out = [];
  function walk(current, relBase) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(path.join(current, ent.name), rel);
      } else {
        out.push(rel);
      }
    }
  }
  walk(dir, '');
  return out.sort();
}

module.exports = {
  createTempDir,
  cleanupAll,
  writeTempFile,
  readTempFile,
  existsTempFile,
  listTempFiles,
};
