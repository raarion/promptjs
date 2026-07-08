'use strict';
const { translateCSSSelector } = require('./aliases');
const { scopeSelector } = require('./scope');

/**
 * CSSRule[] -> standard CSS string compilation.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 *
 * v132 #79: rules marked `global: true` (via `:global()` in source)
 * skip `scopeSelector` even when `scoped` is true — the selector is
 * emitted as-is (after alias translation), so it matches globally.
 */

function compileCSS(rules, scoped) {
  const lines = [];

  for (const rule of rules) {
    // Handle at-rules (@media, etc.)
    if (rule.selector.startsWith('@')) {
      lines.push(`${rule.selector} {`);
      for (const child of rule.children) {
        const isChildGlobal = !!child.global;
        const sel =
          scoped && child.scope && !isChildGlobal
            ? scopeSelector(translateCSSSelector(child.selector), child.scope)
            : translateCSSSelector(child.selector);
        lines.push(`  ${sel} {`);
        for (const prop of child.properties) {
          lines.push(`    ${prop.key}: ${prop.value};`);
        }
        lines.push('  }');
      }
      lines.push('}');
      continue;
    }

    // Regular rule — skip scoping when rule.global is true (:global escape)
    const isGlobal = !!rule.global;
    const sel =
      scoped && rule.scope && !isGlobal
        ? scopeSelector(translateCSSSelector(rule.selector), rule.scope)
        : translateCSSSelector(rule.selector);
    lines.push(`${sel} {`);
    for (const prop of rule.properties) {
      lines.push(`  ${prop.key}: ${prop.value};`);
    }
    lines.push('}');
  }

  return lines.join('\n');
}

module.exports = { compileCSS };
