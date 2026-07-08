'use strict';
const { stripCSSComments } = require('./comments');

/**
 * Indent-based Gaya block -> CSSRule[] parsing.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 *
 * v132 #79: `:global(...)` escape hatch — selectors wrapped in
 * `:global(...)` are marked `global: true` so `compileCSS` skips
 * scoping for them. Supports comma-separated selectors inside the
 * wrapper and bare `:global` as a prefix for single selectors.
 */

/**
 * Strip `:global(...)` wrapper from a selector string.
 *
 * Three supported forms:
 *   `:global(.foo)`           → `.foo`          (wrapped single selector)
 *   `:global(.foo, .bar)`    → `.foo, .bar`     (wrapped comma-separated)
 *   `:global(.foo) .bar`     → `.foo .bar`      (prefix — remainder kept)
 *   `:global(.foo) > .bar`   → `.foo > .bar`    (prefix with combinator)
 *
 * @param {string} selector - Raw selector text from Gaya block.
 * @returns {{ selector: string, isGlobal: boolean }}
 */
function stripGlobalWrapper(selector) {
  const m = selector.match(/^:global\(([^)]+)\)(.*)/s);
  if (!m) return { selector, isGlobal: false };
  // m[1] = content inside :global(...), m[2] = any trailing combinator/descendant
  return { selector: (m[1] + m[2]).trim(), isGlobal: true };
}

function parseGayaRules(gayaSource, scope) {
  // BUG-04: Strip CSS comments before parsing so /* ... */ and // don't
  // produce malformed selectors or properties.
  const cleaned = stripCSSComments(gayaSource);
  const lines = cleaned.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  // Find minimum indent (base indent for this block)
  const minIndent = Math.min(...lines.map((l) => l.length - l.trimStart().length));
  const rules = [];
  let currentRule = null;
  let currentAtRule = null;
  let selectorIndent = -1;

  for (const line of lines) {
    const indent = line.length - line.trimStart().length - minIndent;
    const trimmed = line.trim();

    // Property line: "key: value" (more indented than selector)
    const propMatch = trimmed.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (propMatch && currentRule && indent > selectorIndent) {
      currentRule.properties.push({ key: propMatch[1], value: propMatch[2].trim() });
      continue;
    }

    // Selector line (same or less indent than previous selector)
    // Save previous rule
    if (currentRule) {
      if (currentAtRule) {
        currentAtRule.children.push(currentRule);
      } else {
        rules.push(currentRule);
      }
      currentRule = null;
    }

    // Check for @media or other at-rules
    if (trimmed.startsWith('@')) {
      if (currentAtRule) {
        rules.push(currentAtRule);
      }
      currentAtRule = { selector: trimmed, properties: [], children: [], scope: scope || '' };
      selectorIndent = indent;
      continue;
    }

    // Close at-rule if dedenting
    if (currentAtRule && indent <= selectorIndent) {
      rules.push(currentAtRule);
      currentAtRule = null;
    }

    // New selector — check for :global() escape hatch
    const { selector: cleanSelector, isGlobal } = stripGlobalWrapper(trimmed);
    currentRule = {
      selector: cleanSelector,
      properties: [],
      children: [],
      scope: scope || '',
      global: isGlobal,
    };
    selectorIndent = indent;
  }

  // Save last rule
  if (currentRule) {
    if (currentAtRule) {
      currentAtRule.children.push(currentRule);
    } else {
      rules.push(currentRule);
    }
  }
  if (currentAtRule) {
    rules.push(currentAtRule);
  }

  return rules;
}

module.exports = { parseGayaRules };
