/**
 * PromptJS v1.0.0 — CSS Support (Wave I) — entry facade
 * ============================================================================
 *
 * Behavior-preserving modularization of the former monolithic
 * `src/engine/css.js`.
 *
 * This file is now a SMALL ENTRY FACADE. The implementation lives in
 * `./css/` (see `aliases.js`, `comments.js`, `extract.js`, `parse.js`,
 * `compile.js`, `scope.js`, `scope-naming.js`, `global-escape.js`,
 * `index.js`). Every public function is still exported from here with the
 * same names and signatures, so callers (`src/compiler/promptjs-compiler.js`
 * and the CSS tests) are unchanged.
 *
 * Public API (unchanged):
 *   extractGayaBlocks, parseGayaRules, compileCSS, scopeSelector,
 *   translateCSSSelector, processGayaBlocks, sanitizeScopeName, buildScopeId
 */

'use strict';

const CSS = require('./css/index');

module.exports = CSS;
