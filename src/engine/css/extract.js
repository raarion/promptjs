'use strict';
const { buildScopeId } = require('./scope-naming');

/**
 * Gaya:/Style: block extraction from .pjs source.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

const COMPONENT_OPENER_RE = /^(Komponen|Definisikan|Component|Define)\s+([A-Za-z_]\w*)/i;

function extractGayaBlocks(source, scope, opts) {
  const scoped =
    opts && Object.prototype.hasOwnProperty.call(opts, 'scoped') ? !!opts.scoped : !!scope;
  const lines = source.split('\n');
  const blocks = [];
  const cleanLines = [];
  let i = 0;

  // Stack of currently-open component contexts: { indent, name }.
  // `indent` is the indentation of the "Komponen X(...):" opener line
  // itself — the component's BODY is whatever is indented MORE than that.
  const componentStack = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      cleanLines.push(line);
      i++;
      continue;
    }

    const lineIndent = line.length - line.trimStart().length;

    if (scoped) {
      // Pop any component contexts we've dedented out of.
      while (
        componentStack.length > 0 &&
        lineIndent <= componentStack[componentStack.length - 1].indent
      ) {
        componentStack.pop();
      }
      const compMatch = trimmed.match(COMPONENT_OPENER_RE);
      if (compMatch) {
        componentStack.push({ indent: lineIndent, name: compMatch[2] });
      }
    }

    // Check for Gaya: or Style: at start of line (not indented = top-level or component-level)
    if (/^(Gaya|Style):\s*$/.test(trimmed)) {
      const blockIndent = lineIndent;
      const blockLines = [];
      const activeComponent =
        scoped && componentStack.length > 0 ? componentStack[componentStack.length - 1].name : null;
      const blockScope = scoped ? buildScopeId(scope, activeComponent) : '';

      // Collect all indented lines
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine.trim() === '') {
          blockLines.push(nextLine);
          i++;
          continue;
        }
        const nextIndent = nextLine.length - nextLine.trimStart().length;
        if (nextIndent <= blockIndent && nextLine.trim() !== '') {
          break; // Dedent — end of Gaya block
        }
        blockLines.push(nextLine);
        i++;
      }

      blocks.push({
        source: blockLines.join('\n'),
        scope: blockScope,
      });
    } else {
      cleanLines.push(line);
      i++;
    }
  }

  return { blocks, cleanSource: cleanLines.join('\n') };
}

module.exports = { extractGayaBlocks };
