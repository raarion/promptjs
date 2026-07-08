'use strict';

/**
 * Scope attribute prefix + builder (used by scopeSelector).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

const SCOPE_ATTR_PREFIX = 'data-pjs-';

/**
 * Build the `data-pjs-<scope>` attribute name for a scope id.
 * Verbatim equivalent of the previously-inline `data-pjs-${scope.toLowerCase()}`.
 *
 * @param {string} scope - Raw scope id (already-sanitized segment)
 * @returns {string} Attribute name, e.g. `data-pjs-kartu`
 */
function scopeAttrName(scope) {
  return SCOPE_ATTR_PREFIX + scope.toLowerCase();
}

module.exports = { SCOPE_ATTR_PREFIX, scopeAttrName };
