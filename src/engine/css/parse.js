'use strict';
const { stripCSSComments } = require('./comments');

/**
 * Indent-based Gaya block -> CSSRule[] parsing.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

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

    // New selector
    currentRule = { selector: trimmed, properties: [], children: [], scope: scope || '' };
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
