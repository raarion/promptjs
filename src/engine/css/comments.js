'use strict';

/**
 * CSS comment stripping (block + line, string-safe).
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

function stripCSSComments(css) {
  let result = '';
  let i = 0;
  const len = css.length;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBlockComment = false;
  let inLineComment = false;
  let parenDepth = 0; // track url(), var(), calc() etc.

  while (i < len) {
    const ch = css[i];
    const next = i + 1 < len ? css[i + 1] : '';

    // Inside a string: handle escape sequences, track string boundaries
    if (inSingleQuote || inDoubleQuote) {
      if (ch === '\\' && i + 1 < len) {
        result += ch + css[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"' && !inSingleQuote) {
        inDoubleQuote = false;
        result += ch;
        i++;
        continue;
      }
      if (ch === "'" && !inDoubleQuote) {
        inSingleQuote = false;
        result += ch;
        i++;
        continue;
      }
      result += ch;
      i++;
      continue;
    }

    // Inside a block comment: only look for closing */
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Inside a line comment: only look for newline
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        result += ch;
      }
      i++;
      continue;
    }

    // Not in any special context — check for comment/string/paren opens
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    // Only treat // as line comment when NOT inside a CSS function
    // (e.g. url(https://...) should NOT have // treated as comment)
    if (ch === '/' && next === '/' && parenDepth === 0) {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '"') {
      inDoubleQuote = true;
      result += ch;
      i++;
      continue;
    }
    if (ch === "'") {
      inSingleQuote = true;
      result += ch;
      i++;
      continue;
    }

    // Track parenthesis depth for url(), var(), calc(), etc.
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

    // Normal character
    result += ch;
    i++;
  }

  return result;
}

module.exports = { stripCSSComments };
