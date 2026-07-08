'use strict';
const { scopeAttrName } = require('./global-escape');

/**
 * Scope attribute selector application (scopeSelector).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

function scopeSelector(selector, scope) {
  const scopeAttr = scopeAttrName(scope);
  // Split by comma for multiple selectors
  return selector
    .split(',')
    .map((s) => {
      s = s.trim();
      // Don't add scope to @-rules
      if (s.startsWith('@')) return s;
      // Add attribute selector at end of first part
      // e.g. ".card h3" → ".card[data-pjs-kartu] h3"
      const parts = s.split(/\s+/);
      parts[0] = parts[0] + `[${scopeAttr}]`;
      return parts.join(' ');
    })
    .join(', ');
}

module.exports = { scopeSelector };
