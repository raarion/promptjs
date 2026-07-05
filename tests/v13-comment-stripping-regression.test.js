// ════════════════════════════════════════════════════════════════════════════
// Regression tests for comment-stripping regressions introduced in e24a30a
// (BUG-04 + LIM-08 block comment support).
//
// Three bugs, all sharing the same root cause: comment stripping was NOT
// string-aware — regex/indexOf matched delimiters inside string literals.
//
// Bug #1 (P2): CSS url(https://...) truncated by // comment stripping
// Bug #2 (P1): Lexer deletes /* ... */ inside PromptJS string literals
// Bug #3 (P3): CSS content: "/* ... */" emptied by block comment regex
//
// All three are fixed by using string-aware state machines.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');
const { parseGayaRules } = require('../src/engine/css');
const { PromptJSLexer } = require('../src/lexer/promptjs-lexer');

// ════════════════════════════════════════════════════════════════════════════
// Bug #1 (P2) — CSS https:// URL truncated by // comment stripping
// ════════════════════════════════════════════════════════════════════════════
describe('Bug #1 — CSS URL with https:// NOT truncated', () => {
  it('Gaya URL https:// is NOT truncated by comment stripping', () => {
    const r = compile(`Halaman B:
  Buat div.hero:
    teks = "hero"
  Gaya:
    .hero
      background: url(https://example.com/bg.png)
      color: white`);
    expect(r.success).toBe(true);
    // CSS output is in r.css, not r.js
    expect(r.css).toContain('background: url(https://example.com/bg.png)');
    // Verify the URL is complete (not truncated after https:)
    expect(r.css).toContain('example.com/bg.png');
  });

  it('Gaya URL http:// is NOT truncated by comment stripping', () => {
    const r = compile(`Halaman B:
  Buat div.card:
    teks = "card"
  Gaya:
    .card
      background-image: url(http://cdn.example.com/img.png)
      border: 1px solid gray`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('background-image: url(http://cdn.example.com/img.png)');
    // Verify the URL is complete (not truncated after http:)
    expect(r.css).toContain('cdn.example.com/img.png');
  });

  it('Gaya protocol-relative URL //cdn... is NOT truncated', () => {
    const r = compile(`Halaman B:
  Buat div.box:
    teks = "box"
  Gaya:
    .box
      background: url(//cdn.example.com/font.woff2)`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('url(//cdn.example.com/font.woff2)');
  });

  it('legitimate // comment in Gaya IS still stripped correctly', () => {
    // Real // comments (outside url() and strings) should still be removed
    const rules = parseGayaRules(`.hero\n  background: red // this is a comment\n  color: white`);
    expect(rules.length).toBe(1);
    expect(rules[0].properties[0].key).toBe('background');
    expect(rules[0].properties[0].value).toBe('red');
    expect(rules[0].properties[1].key).toBe('color');
    expect(rules[0].properties[1].value).toBe('white');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bug #2 (P1 Kritis) — /* ... */ inside PromptJS string literal preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Bug #2 — block comment delimiters inside PromptJS strings are preserved', () => {
  it('block comment delimiters inside PromptJS string are preserved', () => {
    const r = compile(`Halaman Utama:
  Buat div:
    teks = "ini bukan /* komentar */ tapi teks biasa"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"ini bukan /* komentar */ tapi teks biasa"');
    expect(r.js).not.toContain('"ini bukan tapi teks biasa"');
  });

  it('lexer does not strip block-comment delimiters from inside a string literal', () => {
    const lexer = new PromptJSLexer();
    const source = `Halaman B:
  Buat div:
    teks = "ini bukan /* komentar */ tapi teks biasa"`;
    const result = lexer.tokenize(source);
    const stringTokens = result.tokens.filter((t) => t.type === 'TK_STRING').map((t) => t.value);
    expect(stringTokens).toContain('ini bukan /* komentar */ tapi teks biasa');
  });

  it('real block comment on its own line is still stripped', () => {
    const r = compile(`Halaman B:
  /* ini komentar asli */
  Buat div:
    teks = "hello"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"hello"');
  });

  it('escaped quote before star-slash does not confuse string tracking', () => {
    const r = compile(`Halaman B:
  Buat div:
    teks = "quote\\" lalu /* ini bukan komentar */ sisanya"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"quote\\" lalu /* ini bukan komentar */ sisanya"');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bug #3 (P3) — /* ... */ inside CSS string value preserved
// ════════════════════════════════════════════════════════════════════════════
describe('Bug #3 — CSS content string containing block comment delimiters is preserved', () => {
  it('CSS content string with block-comment-like text is preserved', () => {
    const r = compile(`Halaman B:
  Buat div.badge:
    teks = "badge"
  Gaya:
    .badge::before
      content: "/* bukan komentar */"`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('content: "/* bukan komentar */"');
    expect(r.css).not.toContain('content: ""');
  });

  it('CSS property with single-quoted string containing double-slash is preserved', () => {
    const r = compile(`Halaman B:
  Buat div.box:
    teks = "box"
  Gaya:
    .box
      font-family: 'Custom // Font'`);
    expect(r.success).toBe(true);
    expect(r.css).toContain("font-family: 'Custom // Font'");
  });
});
