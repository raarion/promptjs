/**
 * PromptJS v1.0.0 — CSS Support (Wave I)
 * ============================================================================
 *
 * Handles `Gaya:`/`Style:` blocks in .pjs source files.
 * Compiles indent-based CSS rules to standard CSS string.
 *
 * Syntax (Indonesian):
 *   Gaya:
 *       .kartu
 *           background: white
 *           border-radius: 8px
 *       .kartu h3
 *           color: #333
 *
 * Syntax (English):
 *   Style:
 *       .card
 *           background: white
 *
 * Scoped CSS per component:
 *   Komponen Kartu(judul):
 *       Gaya:
 *           .kartu
 *               background: white
 *       Buat div.kartu:
 *           Buat h3: judul
 *
 * Compiled output uses data-pjs-<name> attribute selectors for scoping.
 */

'use strict';

const TAG_ALIAS_TO_HTML = {
  tombol: 'button',
  ruang: 'div',
  judul: 'h1',
  subjudul: 'h2',
  paragraf: 'p',
  gambar: 'img',
  tautan: 'a',
  masukan: 'input',
  pilihan: 'select',
  kolom: 'textarea',
  tabel: 'table',
  artikel: 'article',
  kanvas: 'canvas',
  opsi: 'option',
  fragmen: 'fragment',
  wadjud: 'h1',
  wadah: 'div',
  kotak: 'div',
  frm: 'form',
  frmMasuk: 'form',
  halaman: 'div',
  card: 'div',
  page: 'div',
  pemisah: 'hr',
  container: 'div',
  navigasi: 'nav',
  kepala: 'header',
  kaki: 'footer',
  bagian: 'section',
  utama: 'main',
  samping: 'aside',
  daftar: 'ul',
  item: 'li',
  rentang: 'span',
  bingkai: 'iframe',
  formulir: 'form',
  daftarterurut: 'ol',
};

/**
 * Translate PromptJS tag aliases to HTML tag names in CSS selectors.
 * Only replaces standalone tag-name tokens (not classes or IDs).
 *
 * @param {string} selector - CSS selector string
 * @returns {string} Selector with translated tag aliases
 */
function translateCSSSelector(selector) {
  // Split into comma-separated groups, process each
  return selector
    .split(',')
    .map((part) => {
      return part
        .trim()
        .split(/\s+/)
        .map((token) => {
          // Extract pure tag name (strip pseudo-classes, attributes, classes, ids)
          // e.g., "tombol.primary:hover" → tag="tombol", suffix=".primary:hover"
          const clean = token.replace(/[:[].*$/, '').replace(/[.#].*$/, '');
          if (TAG_ALIAS_TO_HTML[clean]) {
            return token.replace(clean, TAG_ALIAS_TO_HTML[clean]);
          }
          return token;
        })
        .join(' ');
    })
    .join(', ');
}

/**
 * @typedef {Object} CSSRule
 * @property {string} selector - CSS selector (e.g. ".card", "h1", "@media (max-width: 600px)")
 * @property {{ key: string, value: string }[]} properties - CSS properties
 * @property {CSSRule[]} children - Nested rules (for @media, etc.)
 * @property {string} [scope] - Component scope name (for scoped CSS)
 */

/**
 * @typedef {Object} GayaBlock
 * @property {CSSRule[]} rules - CSS rules
 * @property {string} [scope] - Component scope name
 */

/**
 * Sanitize a raw name (file basename, component name, etc.) into a value
 * safe to embed in a `data-pjs-<scope>` attribute / CSS attribute-selector.
 *
 * Lowercases and collapses any run of non `[a-z0-9]` characters into a
 * single `-` (so `[slug]`, `My File`, `Kartu_2` all become valid, stable,
 * deterministic scope segments). Falls back to `"x"` for an empty/invalid
 * input so a scope value is never emitted as an empty string.
 *
 * @param {string} name - Raw name to sanitize
 * @returns {string} Sanitized scope segment
 */
function sanitizeScopeName(name) {
  const cleaned = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'x';
}

/**
 * Build the full scope id for a `Gaya:` block, given the (already
 * sanitized) file-level scope and an optional active component name.
 *
 * File + component naming, per the #79 maintainer decision
 * (2026-07-07): `data-pjs-<file-scope>-<component-scope>` for
 * component-level styles, `data-pjs-<file-scope>` for page/file-level
 * styles (no active component). Using file+component (rather than
 * component-only) prevents two different files that happen to declare a
 * same-named `Komponen` from colliding on the same scope id.
 *
 * @param {string} fileScope - Already-sanitized file/page scope segment
 * @param {string} [componentName] - Raw component name (sanitized here)
 * @returns {string} Full scope id (without the `data-pjs-` prefix)
 */
function buildScopeId(fileScope, componentName) {
  const filePart = sanitizeScopeName(fileScope);
  if (!componentName) return filePart;
  return `${filePart}-${sanitizeScopeName(componentName)}`;
}

// Matches a `Komponen <Name>(...)`/`Definisikan <Name>(...)` (or English
// `Component`/`Define`) block-opener line, case-insensitively — mirrors the
// keyword aliases recognized by the lexer's KEYWORDS map for component
// declarations. Used ONLY to track "which component am I textually inside"
// while extracting `Gaya:` blocks — CSS extraction runs BEFORE lexing/
// parsing (see module header), so it has no AST to consult and must infer
// component boundaries from raw indentation, same spirit as the lexer's own
// line-based block-opener detection.
const COMPONENT_OPENER_RE = /^(Komponen|Definisikan|Component|Define)\s+([A-Za-z_]\w*)/i;

/**
 * Extract `Gaya:`/`Style:` blocks from source lines.
 *
 * Looks for lines starting with `Gaya:` or `Style:` and collects
 * all indented lines until dedent to original level.
 *
 * When `opts.scoped` is true, also tracks `Komponen`/`Definisikan` block
 * openers (by indentation, dedent-based — the same technique already used
 * to find the end of a `Gaya:` block) so a `Gaya:` block declared INSIDE a
 * component's body is scoped to `<fileScope>-<componentName>` instead of
 * just `<fileScope>`. A `Gaya:` block outside any component (page/file
 * top-level) is scoped to `<fileScope>` alone. Nested components use the
 * INNERMOST currently-open component (a stack, popped on dedent).
 *
 * @param {string} source - Full .pjs source
 * @param {string} [scope] - File/page scope name (for scoped CSS)
 * @param {{ scoped?: boolean }} [opts] - `scoped`: whether to actually apply
 *   scope ids to extracted blocks (opt-in gate). Defaults to `!!scope` for
 *   backward compatibility with the pre-#79 2-arg call shape.
 * @returns {{ blocks: { source: string, scope: string }[], cleanSource: string }}
 */
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

/**
 * Strip CSS comments (both block and line) while preserving comment
 * delimiters that appear inside string literals (quoted values).
 *
 * Uses a character-level state machine instead of regex to correctly
 * handle URLs containing double-slash (e.g. https://...) and string
 * values containing block-comment-like delimiters (e.g. the CSS
 * content property holding open-star-close-star text).
 *
 * @param {string} css - Raw CSS source
 * @returns {string} CSS with comments removed
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

/**
 * Parse CSS rules from indent-based Gaya block source.
 *
 * @param {string} gayaSource - Indent-based CSS source (from Gaya: block)
 * @param {string} [scope] - Component scope name
 * @returns {CSSRule[]}
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

/**
 * Compile CSS rules to standard CSS string.
 *
 * @param {CSSRule[]} rules - Parsed CSS rules
 * @param {boolean} [scoped] - Whether to apply scope attribute selectors
 * @returns {string} Standard CSS string
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

/**
 * Apply scope attribute selector to a CSS selector.
 *
 * `.card` with scope `Kartu` → `.card[data-pjs-kartu]`
 * `h1` with scope `Kartu` → `h1[data-pjs-kartu]`
 *
 * @param {string} selector - CSS selector
 * @param {string} scope - Scope name (component name)
 * @returns {string} Scoped selector
 */
function scopeSelector(selector, scope) {
  const scopeAttr = `data-pjs-${scope.toLowerCase()}`;
  // Split by comma for multiple selectors
  return selector
    .split(',')
    .map((s) => {
      s = s.trim();
      // Don't add scope to @-rules
      if (s.startsWith('@')) return s;
      // Add attribute selector at end of first part
      // e.g. ".card h3" → ".card[data-pjs-kartu] h3"
      const parts = s.split(/\s+/);
      parts[0] = parts[0] + `[${scopeAttr}]`;
      return parts.join(' ');
    })
    .join(', ');
}

/**
 * Full pipeline: extract + parse + compile CSS from .pjs source.
 *
 * @param {string} source - Full .pjs source
 * @param {string} [scope] - File/page scope name
 * @param {{ scoped?: boolean }} [opts] - `scoped`: opt-in gate — see
 *   `extractGayaBlocks`. Defaults to `!!scope` (backward-compatible 2-arg
 *   call shape, unchanged behavior for any existing caller that already
 *   passed a truthy `scope`).
 * @returns {{ css: string, cleanSource: string }}
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
