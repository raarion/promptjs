'use strict';

/**
 * Scope-id naming helpers (sanitize + build) for #79 scoped CSS.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

function sanitizeScopeName(name) {
  const cleaned = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'x';
}

function buildScopeId(fileScope, componentName) {
  const filePart = sanitizeScopeName(fileScope);
  if (!componentName) return filePart;
  return `${filePart}-${sanitizeScopeName(componentName)}`;
}

module.exports = { sanitizeScopeName, buildScopeId };
