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
 * Extract `Gaya:`/`Style:` blocks from source lines.
 *
 * Looks for lines starting with `Gaya:` or `Style:` and collects
 * all indented lines until dedent to original level.
 *
 * @param {string} source - Full .pjs source
 * @param {string} [scope] - Component scope name (for scoped CSS)
 * @returns {{ blocks: { source: string, scope: string }[], cleanSource: string }}
 */
function extractGayaBlocks(source, scope) {
  const lines = source.split('\n');
  const blocks = [];
  const cleanLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for Gaya: or Style: at start of line (not indented = top-level or component-level)
    if (/^(Gaya|Style):\s*$/.test(trimmed)) {
      const blockIndent = line.length - line.trimStart().length;
      const blockLines = [];

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
        scope: scope || '',
      });
    } else {
      cleanLines.push(line);
      i++;
    }
  }

  return { blocks, cleanSource: cleanLines.join('\n') };
}

/**
 * Parse CSS rules from indent-based Gaya block source.
 *
 * @param {string} gayaSource - Indent-based CSS source (from Gaya: block)
 * @param {string} [scope] - Component scope name
 * @returns {CSSRule[]}
 */
function parseGayaRules(gayaSource, scope) {
  const lines = gayaSource.split('\n').filter((l) => l.trim() !== '');
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
 * @param {string} [scope] - Component scope name
 * @returns {{ css: string, cleanSource: string }}
 */
function processGayaBlocks(source, scope) {
  const { blocks, cleanSource } = extractGayaBlocks(source, scope);
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
};
