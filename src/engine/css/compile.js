'use strict';
const { translateCSSSelector } = require('./aliases');
const { scopeSelector } = require('./scope');

/**
 * CSSRule[] -> standard CSS string compilation.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

function compileCSS(rules, scoped) {
  const lines = [];

  for (const rule of rules) {
    // Handle at-rules (@media, etc.)
    if (rule.selector.startsWith('@')) {
      lines.push(`${rule.selector} {`);
      for (const child of rule.children) {
        const sel =
          scoped && child.scope
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

    // Regular rule
    const sel =
      scoped && rule.scope
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
