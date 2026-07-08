// @ts-check

/**
 * Comment tokenizer — handles `--` and `//` single-line comments (inline in line-dispatch).
 * Also handles block comment (slash-star ... star-slash) logic within the main tokenize loop.
 *
 * This module is intentionally small since single-line comments are just skipped.
 * Block comment handling lives in the main lexer state.js tokenize flow.
 *
 * @module lexer/tokenizers/comments
 */

'use strict';

/**
 * Check whether position `pos` in `line` falls inside a string literal.
 * Handles escaped quotes inside both single and double-quoted strings.
 *
 * @param {string} line - The full source line
 * @param {number} pos  - Character index to check
 * @returns {boolean}
 */
function isInStringAt(line, pos) {
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < pos; i++) {
    if (line[i] === '\\' && (inDouble || inSingle)) {
      i++; // skip escaped char
      continue;
    }
    if (line[i] === '"' && !inSingle) inDouble = !inDouble;
    if (line[i] === "'" && !inDouble) inSingle = !inSingle;
  }
  return inDouble || inSingle;
}

module.exports = { isInStringAt: isInStringAt };
