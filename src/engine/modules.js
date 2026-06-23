// @ts-check

/**
 * PromptJS v0.4.0 — Module System (Wave H)
 * ============================================================================
 *
 * Handles `kirim`/`share` and `terima`/`get` front-matter directives
 * for cross-file symbol sharing.
 *
 * Syntax (Indonesian):
 *   --- kirim: apiKey = "abc123" ---
 *   --- terima: apiKey dari "config.pjs" ---
 *
 * Syntax (English):
 *   --- share: apiKey = "abc123" ---
 *   --- get: apiKey from "config.pjs" ---
 *
 * The module system works by:
 * 1. Parsing front-matter for kirim/share and terima/get entries
 * 2. Building a dependency graph from terima directives
 * 3. Loading and resolving referenced files
 * 4. Injecting shared symbols into the consumer's front-matter data
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} SharedEntry
 * @property {string} name - Symbol name to share/import
 * @property {string} [value] - Inline value (for kirim/share with =)
 * @property {string} [from] - Source file path (for terima/get)
 * @property {'share' | 'import'} kind - Whether this is an export or import
 */

/**
 * @typedef {Object} ModuleResolution
 * @property {Object<string, any>} sharedValues - Resolved values from kirim/share
 * @property {Object<string, { from: string, name: string }>} imports - terima/get entries
 * @property {string[]} dependencies - List of file paths this module depends on
 */

/**
 * Extract kirim/share and terima/get entries from front-matter data.
 *
 * @param {Object<string, any>} frontMatterData - Parsed front-matter from lexer
 * @returns {{ shares: Object<string, any>, imports: Object<string, { from: string, name: string }>, hasModuleDirectives: boolean }}
 */
function extractModuleDirectives(frontMatterData) {
  const shares = /** @type {Object<string, any>} */ ({});
  const imports = /** @type {Object<string, { from: string, name: string }>} */ ({});
  let hasModuleDirectives = false;

  if (!frontMatterData) return { shares, imports, hasModuleDirectives };

  for (const [key, info] of Object.entries(frontMatterData)) {
    // Check for kirim:/share: entries
    // Front-matter parser produces { type: 'inline', value: ... }
    // For kirim: apiKey = "abc123", the key would be "kirim" and value would be the rest
    if (key === 'kirim' || key === 'share') {
      hasModuleDirectives = true;
      const val = info && info.value !== undefined ? info.value : info;
      if (typeof val === 'string') {
        // Parse "apiKey = \"abc123\"" or "formatTanggal dari utils.pjs"
        const shareMatch = val.match(/^(\w+)\s*=\s*(.+)$/);
        if (shareMatch) {
          // Inline value: kirim: apiKey = "abc123"
          const name = shareMatch[1];
          let value = shareMatch[2].trim();
          // Try to parse as JSON for proper typing
          try {
            value = JSON.parse(value);
          } catch {
            /* keep as string */
          }
          shares[name] = value;
        } else {
          // Re-export: kirim: formatTanggal dari "utils.pjs"
          const reExportMatch = val.match(/^(\w+)\s+(?:dari|from)\s+["'](.+?)["']$/);
          if (reExportMatch) {
            shares[reExportMatch[1]] = {
              __reExport: true,
              from: reExportMatch[2],
              name: reExportMatch[1],
            };
          }
        }
      }
    }

    // Check for terima:/get: entries
    if (key === 'terima' || key === 'get') {
      hasModuleDirectives = true;
      const val = info && info.value !== undefined ? info.value : info;
      if (typeof val === 'string') {
        // Parse "apiKey dari \"config.pjs\"" or "apiKey from 'config.pjs'"
        const importMatch = val.match(/^(\w+)\s+(?:dari|from)\s+["'](.+?)["']$/);
        if (importMatch) {
          imports[importMatch[1]] = { from: importMatch[2], name: importMatch[1] };
        }
      }
    }
  }

  return { shares, imports, hasModuleDirectives };
}

/**
 * Resolve module imports by loading referenced files and extracting their shares.
 *
 * @param {Object<string, { from: string, name: string }>} imports - terima/get entries
 * @param {string} baseDir - Base directory for resolving relative paths
 * @param {Set<string>} [visited] - Set of already-visited files (cycle detection)
 * @param {number} [depth] - Current recursion depth (max 10)
 * @returns {{ values: Object<string, any>, errors: Object[], warnings: Object[] }}
 */
function resolveImports(imports, baseDir, visited, depth) {
  visited = visited || new Set();
  depth = depth || 0;
  const values = {};
  const errors = [];
  const warnings = [];

  if (depth > 10) {
    errors.push({
      code: 'E0000',
      severity: 'error',
      message: 'Module import depth exceeded 10 — possible circular dependency.',
      suggestion: 'Periksa apakah ada import melingkar antar file .pjs.',
    });
    return { values, errors, warnings };
  }

  for (const [localName, imp] of Object.entries(imports)) {
    const resolvedPath = path.resolve(baseDir, imp.from);

    // Cycle detection
    if (visited.has(resolvedPath)) {
      warnings.push({
        code: 'W0000',
        severity: 'warning',
        message: `Circular dependency detected: ${imp.from} already visited.`,
        suggestion: 'Hindari import melingkar antar file .pjs.',
      });
      continue;
    }

    // Check file exists
    if (!fs.existsSync(resolvedPath)) {
      // In dev mode, emit as external reference
      values[localName] = { __external: true, from: imp.from, name: imp.name };
      warnings.push({
        code: 'W0000',
        severity: 'warning',
        message: `Module file not found: ${imp.from} — symbol "${localName}" will be undefined at runtime.`,
        suggestion: `Pastikan file "${imp.from}" ada di path yang benar.`,
      });
      continue;
    }

    // Read and parse the referenced file
    let source;
    try {
      source = fs.readFileSync(resolvedPath, 'utf-8');
    } catch (e) {
      errors.push({
        code: 'E0000',
        severity: 'error',
        message: `Cannot read module file: ${imp.from} — ${e.message}`,
        suggestion: 'Pastikan file dapat dibaca.',
      });
      continue;
    }

    // Extract front-matter from the referenced file
    // We only need the front-matter, not the full compile
    const fmMatch = source.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      warnings.push({
        code: 'W0000',
        severity: 'warning',
        message: `Module file ${imp.from} has no front-matter — no symbols to share.`,
        suggestion: `Tambahkan front-matter dengan "kirim:" di ${imp.from}.`,
      });
      continue;
    }

    // Parse front-matter lines
    const fmLines = fmMatch[1].split('\n');
    const fmData = {};
    for (const line of fmLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx < 0) continue;
      const fmKey = trimmed.substring(0, colonIdx).trim();
      const fmVal = trimmed.substring(colonIdx + 1).trim();
      fmData[fmKey] = { type: 'inline', value: fmVal };
    }

    // Extract shares from the referenced file
    const { shares: refShares } = extractModuleDirectives(fmData);

    // Find the requested symbol
    if (imp.name in refShares) {
      const sharedVal = refShares[imp.name];

      // If it's a re-export, resolve recursively
      if (sharedVal && sharedVal.__reExport) {
        const newVisited = new Set(visited);
        newVisited.add(resolvedPath);
        const subResult = resolveImports(
          { [sharedVal.name]: { from: sharedVal.from, name: sharedVal.name } },
          path.dirname(resolvedPath),
          newVisited,
          depth + 1
        );
        if (subResult.errors.length > 0) {
          errors.push(...subResult.errors);
        } else {
          values[localName] = subResult.values[sharedVal.name] || null;
        }
      } else {
        values[localName] = sharedVal;
      }
    } else {
      warnings.push({
        code: 'W0000',
        severity: 'warning',
        message: `Symbol "${imp.name}" not found in ${imp.from}.`,
        suggestion: `Pastikan ${imp.from} memiliki "kirim: ${imp.name} = ..." di front-matter.`,
      });
    }
  }

  return { values, errors, warnings };
}

/**
 * Merge resolved import values into front-matter data so the rest of the
 * pipeline (resolver, compiler) can use them as $external symbols.
 *
 * @param {Object<string, any>} frontMatterData - Original front-matter data
 * @param {Object<string, any>} importValues - Resolved import values
 * @returns {Object<string, any>} Merged front-matter data
 */
function mergeImportsToFrontMatter(frontMatterData, importValues) {
  const result = /** @type {Object<string, any>} */ ({});
  if (frontMatterData) {
    for (const [key, val] of Object.entries(frontMatterData)) {
      // Skip kirim/terima/share/get entries — they're module directives, not data
      if (key === 'kirim' || key === 'share' || key === 'terima' || key === 'get') continue;
      result[key] = val;
    }
  }
  // Add resolved import values as inline data
  for (const [name, value] of Object.entries(importValues)) {
    if (value && value.__external) {
      // External reference — keep as file reference for runtime loading
      result[name] = { type: 'file', path: value.from };
    } else {
      result[name] = { type: 'inline', value: value };
    }
  }
  return result;
}

module.exports = {
  extractModuleDirectives,
  resolveImports,
  mergeImportsToFrontMatter,
};
