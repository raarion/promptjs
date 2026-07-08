// @ts-check

/**
 * Selector tokenizer — tokenizes CSS-style selectors like `tag.class#id[attr="val"]`.
 *
 * @module lexer/tokenizers/selector
 */

'use strict';

const tokenMod = require('../core/token');
const TT = tokenMod.TT;
const Token = tokenMod.Token;

/**
 * Tokenize selector CSS-style `tag.class#id[atr="val"]`.
 *
 * Emit satu token TK_IDENT dengan `value` berisi tag dan `raw` berisi objek
 * Selector `{ type: 'Selector', tag, classes, id, attributes }`. Atribut
 * dalam `[...]` ditokenisasi terpisah menjadi AttributeNode AST.
 *
 * Jika selector tidak valid (mis. tag kosong), emit error `E1009`.
 *
 * @param {PromptJSLexer} lexer - Lexer instance
 * @param {string} selector - String selector (mis. `tombol.cta#daftar`)
 * @param {number} lineNum - Nomor baris
 * @param {number} baseCol - Kolom awal selector
 */
function tokenizeSelector(lexer, selector, lineNum, baseCol) {
  // Parse selector into components
  let pos = 0;
  let tag = '';
  const classes = [];
  let id = null;
  // BUG-2/BUG-4 fix: attributes tokenized from `[attr="val"]` blocks, and the
  // tag/class/id segments now terminate at `[` and whitespace so trailing
  // spaces or attribute blocks never leak into the tag name.
  const attributes = [];
  const isSegStop = function (ch) {
    return ch === '.' || ch === '#' || ch === '[' || ch === ' ' || ch === '\t';
  };

  // First segment: tag name (can include underscore for component names like card_produk)
  while (pos < selector.length && !isSegStop(selector[pos])) {
    tag += selector[pos];
    pos++;
  }

  // Subsequent segments
  while (pos < selector.length) {
    if (selector[pos] === '.') {
      pos++; // skip dot
      let cls = '';
      while (pos < selector.length && !isSegStop(selector[pos])) {
        cls += selector[pos];
        pos++;
      }
      if (cls) classes.push(cls);
    } else if (selector[pos] === '#') {
      pos++; // skip hash
      let idStr = '';
      while (pos < selector.length && !isSegStop(selector[pos])) {
        idStr += selector[pos];
        pos++;
      }
      id = idStr || null;
    } else if (selector[pos] === '[') {
      // Attribute block — supports multiple attributes in one bracket:
      //   [key], [key="val"], [key='val'], [key=val],
      //   [key1=val1 key2="val2" key3], etc.
      pos++; // skip '['
      while (pos < selector.length && selector[pos] !== ']') {
        // Skip whitespace between attributes
        while (pos < selector.length && (selector[pos] === ' ' || selector[pos] === '\t')) {
          pos++;
        }
        if (selector[pos] === ']' || pos >= selector.length) break;

        // Parse key (stop at '=', ']', or whitespace)
        let key = '';
        while (
          pos < selector.length &&
          selector[pos] !== '=' &&
          selector[pos] !== ']' &&
          selector[pos] !== ' ' &&
          selector[pos] !== '\t'
        ) {
          key += selector[pos];
          pos++;
        }
        key = key.trim();

        let value = null; // null => boolean/valueless attribute
        if (selector[pos] === '=') {
          pos++; // skip '='
          let aQuote = null;
          if (selector[pos] === '"' || selector[pos] === "'") {
            aQuote = selector[pos];
            pos++;
          }
          let val = '';
          let isQuoted = false;
          if (aQuote) {
            isQuoted = true;
            while (pos < selector.length && selector[pos] !== aQuote) {
              val += selector[pos];
              pos++;
            }
            if (selector[pos] === aQuote) pos++; // skip closing quote
          } else {
            // Unquoted value: stop at ']' or whitespace
            while (
              pos < selector.length &&
              selector[pos] !== ']' &&
              selector[pos] !== ' ' &&
              selector[pos] !== '\t'
            ) {
              val += selector[pos];
              pos++;
            }
            val = val.trim();
          }
          // BUG-10 FIX: Track whether the value was quoted so the parser can
          // decide between a string literal and a variable reference.
          value = { __raw: val, __quoted: isQuoted };
        }
        if (key) attributes.push({ key: key, value: value });
      }
      if (selector[pos] === ']') pos++; // skip closing ']'
    } else {
      // Whitespace or any other filler between segments: skip silently.
      pos++;
    }
  }

  // Emit selector as structured token value
  lexer.tokens.push(
    new Token(TT.TK_IDENT, tag, lineNum, baseCol, {
      type: 'Selector',
      tag: tag,
      classes: classes,
      id: id,
      attributes: attributes,
    })
  );

  // Also emit class and id tokens for parser convenience
  for (let ci = 0; ci < classes.length; ci++) {
    lexer.tokens.push(new Token(TT.TK_DOT, classes[ci], lineNum, baseCol));
  }
  if (id) {
    lexer.tokens.push(new Token(TT.TK_HASH, id, lineNum, baseCol));
  }
}

module.exports = { tokenizeSelector: tokenizeSelector };
