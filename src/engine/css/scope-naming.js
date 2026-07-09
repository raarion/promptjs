'use strict';

/**
 * Scope-id naming helpers (sanitize + build) for #79 scoped CSS.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

function sanitizeScopeName(name) {
  const input = String(name || '').toLowerCase();
  let cleaned = '';
  let lastWasDash = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const code = ch.charCodeAt(0);
    const isLowerAscii = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;

    if (isLowerAscii || isDigit) {
      cleaned += ch;
      lastWasDash = false;
    } else if (!lastWasDash && cleaned.length > 0) {
      cleaned += '-';
      lastWasDash = true;
    }
  }

  if (cleaned.endsWith('-')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned || 'x';
}

function buildScopeId(fileScope, componentName) {
  const filePart = sanitizeScopeName(fileScope);
  if (!componentName) return filePart;
  return `${filePart}-${sanitizeScopeName(componentName)}`;
}

module.exports = { sanitizeScopeName, buildScopeId };
