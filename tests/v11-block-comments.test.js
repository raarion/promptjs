/**
 * v11 - BUG-04 + LIM-08: Block comment support
 *
 * Tests for:
 * - BUG-04: Block comments inside Gaya blocks no longer break the parser
 * - LIM-08: Block comments work in PromptJS code (lexer level)
 *
 * Regression suite - ensures comment stripping does not affect normal code.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');
const { processGayaBlocks } = require('../src/engine/css');
const { PromptJSLexer } = require('../src/lexer/promptjs-lexer');

// Block comment delimiters - assembled at runtime to avoid
// triggering JS comment parsing in this test file itself.
const BC = '/*';
const BE = '*/';

// ---------------------------------------------------------------------------
// BUG-04: Gaya block comments
// ---------------------------------------------------------------------------
describe('BUG-04: Gaya block comments', () => {
  it('single-line block comment in Gaya is stripped', () => {
    const source = [
      'Gaya:',
      `  ${BC} This is a comment ${BE}`,
      '  .container',
      '    background: white',
      '    color: black',
    ].join('\n');
    const { css } = processGayaBlocks(source);
    expect(css).toContain('.container');
    expect(css).toContain('background: white');
    expect(css).toContain('color: black');
    expect(css).not.toContain('comment');
  });

  it('multi-line block comment in Gaya is stripped', () => {
    const source = [
      'Gaya:',
      `  ${BC}`,
      '   * Multi-line comment',
      '   * describing the layout',
      `   ${BE}`,
      '  .header',
      '    padding: 10px',
    ].join('\n');
    const { css } = processGayaBlocks(source);
    expect(css).toContain('.header');
    expect(css).toContain('padding: 10px');
    expect(css).not.toContain('Multi-line');
    expect(css).not.toContain('describing');
  });

  it('inline block comment in Gaya property value is stripped', () => {
    const source = [
      'Gaya:',
      '  .box',
      `    margin: 0 ${BC} reset margin ${BE}`,
      '    padding: 10px',
    ].join('\n');
    const { css } = processGayaBlocks(source);
    expect(css).toContain('margin: 0');
    expect(css).toContain('padding: 10px');
  });

  it('single-line // comment in Gaya is stripped', () => {
    const source = [
      'Gaya:',
      '  .card',
      '    // This is a CSS comment',
      '    border: 1px solid gray',
    ].join('\n');
    const { css } = processGayaBlocks(source);
    expect(css).toContain('.card');
    expect(css).toContain('border: 1px solid gray');
    expect(css).not.toContain('This is a CSS comment');
  });

  it('Gaya with only comments produces empty CSS', () => {
    const source = [
      'Gaya:',
      `  ${BC} entire block is a comment ${BE}`,
      '  // another comment',
    ].join('\n');
    const { css } = processGayaBlocks(source);
    expect(css).toBe('');
  });

  it('block comment between selectors in Gaya works', () => {
    const source = [
      'Gaya:',
      '  .nav',
      '    display: flex',
      `  ${BC} Separator comment ${BE}`,
      '  .main',
      '    flex: 1',
    ].join('\n');
    const { css } = processGayaBlocks(source);
    expect(css).toContain('.nav');
    expect(css).toContain('.main');
    expect(css).not.toContain('Separator');
  });

  it('full compile with Gaya comments works end-to-end', () => {
    const source = [
      'Halaman Utama:',
      '  Gaya:',
      `    ${BC} Reset styles ${BE}`,
      '    .container',
      '      margin: 0',
      '      padding: 20px',
      '    // Layout',
      '    .content',
      '      display: flex',
      '',
      '  Buat div.container:',
      '    teks = "Hello"',
    ].join('\n');
    const result = compile(source);
    expect(result.js).toContain('container');
    expect(result.css).toContain('.container');
    expect(result.css).toContain('margin: 0');
    expect(result.css).toContain('.content');
    expect(result.css).not.toContain('Reset styles');
    expect(result.css).not.toContain('Layout');
  });
});

// ---------------------------------------------------------------------------
// LIM-08: Block comments in PromptJS code
// ---------------------------------------------------------------------------
describe('LIM-08: Block comments in PromptJS code (lexer)', () => {
  function tokenize(source) {
    const lexer = new PromptJSLexer();
    return lexer.tokenize(source);
  }

  it('single-line block comment is skipped', () => {
    const source = [`${BC} This is a comment ${BE}`, 'Buat div:', '  teks = "hello"'].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('TK_BUAT');
  });

  it('multi-line block comment spanning several lines is skipped', () => {
    const source = [
      BC,
      '  This is a multi-line',
      '  block comment that',
      '  spans three lines',
      BE,
      'Data:',
      '  nama = "world"',
      '',
      'Buat div:',
      '  teks = nama',
    ].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('TK_DATA');
    expect(types).toContain('TK_BUAT');
  });

  it('block comment does not affect indent tracking', () => {
    const source = [
      'Data:',
      `  ${BC} inline comment ${BE}`,
      '  nama = "test"',
      '',
      'Buat div:',
      '  teks = nama',
    ].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
  });

  it('code after closing delimiter on same line is processed', () => {
    const source = [`${BC} comment ${BE} Buat div:`, '  teks = "hello"'].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('TK_BUAT');
  });

  it('unclosed block comment at EOF does not crash', () => {
    const source = ['Data:', '  nama = "test"', `${BC} This comment is never closed`].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('TK_DATA');
  });

  it('block comment inside a block body is skipped', () => {
    const source = [
      'Buat div:',
      `  ${BC} This is a comment inside a block ${BE}`,
      '  teks = "visible"',
    ].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
  });

  it('mixed single-line and block comments work together', () => {
    const source = [
      '-- single line comment',
      `${BC} block comment ${BE}`,
      'Data:',
      '  nama = "test"',
      '// another single line',
      'Buat div:',
      '  teks = nama',
    ].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
  });

  it('division operator with space does not trigger comment', () => {
    const source = ['Data:', '  hasil = 10 / 2 * 3'].join('\n');
    const result = tokenize(source);
    expect(result.errors).toHaveLength(0);
  });

  it('block comment between page-level blocks works', () => {
    const source = [
      'Halaman Utama:',
      '  Buat div:',
      '    teks = "Hello world"',
      '',
      `  ${BC} Comment between blocks ${BE}`,
      '  Buat button:',
      '    teks = "Click me"',
    ].join('\n');
    const result = compile(source);
    expect(result.success).toBe(true);
    expect(result.js).toContain('Hello world');
    expect(result.js).toContain('Click me');
  });
});
