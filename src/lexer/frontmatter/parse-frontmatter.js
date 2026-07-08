// @ts-check

/**
 * Parse baris front-matter (YAML-like sederhana) menjadi objek.
 *
 * Format yang didukung per key:
 * - File reference: `./path/file.json` atau `/abs/path.json` →
 *   `{ type: 'file', path: '/path' }`
 * - Inline JSON object: `{ "a": 1, ... }` →
 *   `{ type: 'inline', value: { a: 1, ... } }`. Jika JSON strict gagal,
 *   fallback ke lenient (unquoted keys).
 * - Scalar (string/number/boolean): coba JSON.parse dulu; jika gagal,
 *   simpan sebagai string mentah → `{ type: 'inline', value: ... }`.
 *
 * Baris kosong dan baris yang diawali `#` di-skip.
 *
 * @module lexer/frontmatter/parse-frontmatter
 * @param {string[] | null} lines - Daftar baris front-matter (dari `tokenize()`)
 * @returns {Object<string, any> | null} Objek front-matter dengan key-value pairs, atau `null` jika input kosong
 */
'use strict';

const fmAssign = require('./duplicate-keys').fmAssign;

function parseFrontMatter(lines) {
  if (!lines || lines.length === 0) return null;
  const result = /** @type {Object<string, any>} */ ({});
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue; // skip comments
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) continue;
    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();

    // File reference: starts with ./ or / AND ends with a data file extension
    if (
      (value.startsWith('./') || value.startsWith('/')) &&
      /\.(json|csv|txt|yml|yaml|xml)$/i.test(value)
    ) {
      fmAssign(result, key, { type: 'file', path: value });
    }
    // Inline JSON object: starts with {
    else if (value.startsWith('{')) {
      // Try strict JSON first; if fails, try lenient (unquoted keys)
      try {
        fmAssign(result, key, { type: 'inline', value: JSON.parse(value) });
      } catch {
        try {
          // Lenient: wrap keys in quotes for unquoted YAML-like objects
          const fixed = value.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
          fmAssign(result, key, { type: 'inline', value: JSON.parse(fixed) });
        } catch {
          fmAssign(result, key, { type: 'inline', value: value });
        }
      }
    }
    // Simple string value
    else {
      // Try as JSON first (numbers, booleans, etc)
      try {
        const parsed = JSON.parse(value);
        fmAssign(result, key, { type: 'inline', value: parsed });
      } catch {
        fmAssign(result, key, { type: 'inline', value: value });
      }
    }
  }
  return result;
}

module.exports = { parseFrontMatter: parseFrontMatter };
