'use strict';
const { extractGayaBlocks } = require('./extract');
const { parseGayaRules } = require('./parse');
const { compileCSS } = require('./compile');
const { scopeSelector } = require('./scope');
const { translateCSSSelector } = require('./aliases');
const { sanitizeScopeName, buildScopeId } = require('./scope-naming');

/**
 * Internal aggregator: re-exports the public CSS API + wires processGayaBlocks.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

function processGayaBlocks(source, scope, opts) {
  const { blocks, cleanSource } = extractGayaBlocks(source, scope, opts);
  let css = '';

  for (const block of blocks) {
    const rules = parseGayaRules(block.source, block.scope);
    css += compileCSS(rules, !!block.scope) + '\n';
  }

  return { css: css.trim(), cleanSource };
}

module.exports = {
  extractGayaBlocks,
  parseGayaRules,
  compileCSS,
  scopeSelector,
  translateCSSSelector,
  processGayaBlocks,
  sanitizeScopeName,
  buildScopeId,
};
