// Regression tests for scoped CSS tag-alias translation.
//
// Bug (pre-fix): in compileCSS(), the scoped branch called scopeSelector()
// directly on the raw selector, bypassing translateCSSSelector(). As a result,
// a scoped component using an Indonesian tag alias (e.g. `tombol`) emitted an
// invalid selector `tombol[data-pjs-...]` instead of `button[data-pjs-...]`,
// silently breaking the component's styling.
//
// Fix: compose scopeSelector(translateCSSSelector(sel), scope) in both ternary
// branches. These tests fail before the fix and pass after it, and also guard
// against regressions for non-alias and compound selectors.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { compileCSS, scopeSelector, translateCSSSelector } = require('../src/engine/css');

describe('scoped CSS — tag alias translation (regression)', () => {
  it('translates an aliased tag inside a scoped rule (tombol → button)', () => {
    const rules = [
      {
        selector: 'tombol',
        scope: 'Kartu',
        properties: [{ key: 'color', value: 'red' }],
        children: [],
      },
    ];
    const css = compileCSS(rules, true);
    // Must contain the HTML tag, scoped — NOT the raw Indonesian alias.
    expect(css).toContain('button[data-pjs-kartu]');
    expect(css).not.toContain('tombol[data-pjs-kartu]');
  });

  it('keeps non-alias selectors intact while scoping (.card h3)', () => {
    const rules = [
      {
        selector: '.card h3',
        scope: 'Kartu',
        properties: [{ key: 'margin', value: '0' }],
        children: [],
      },
    ];
    const css = compileCSS(rules, true);
    // Scope attribute lands on the first compound part, descendant preserved.
    expect(css).toContain('.card[data-pjs-kartu] h3');
  });

  it('handles compound selector with class + pseudo (tombol.primary:hover)', () => {
    const rules = [
      {
        selector: 'tombol.primary:hover',
        scope: 'Kartu',
        properties: [{ key: 'opacity', value: '0.8' }],
        children: [],
      },
    ];
    const css = compileCSS(rules, true);
    // Tag alias translated; class + pseudo preserved; scope applied.
    expect(css).toContain('button.primary:hover');
    expect(css).toContain('data-pjs-kartu');
    expect(css).not.toMatch(/\btombol\b/);
  });

  it('translates aliased tag inside a scoped @media child rule', () => {
    const rules = [
      {
        selector: '@media (max-width: 600px)',
        scope: 'Kartu',
        properties: [],
        children: [
          {
            selector: 'tombol',
            scope: 'Kartu',
            properties: [{ key: 'display', value: 'block' }],
            children: [],
          },
        ],
      },
    ];
    const css = compileCSS(rules, true);
    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('button[data-pjs-kartu]');
    expect(css).not.toContain('tombol[data-pjs-kartu]');
  });

  it('non-scoped path still translates aliases (no regression)', () => {
    const rules = [
      {
        selector: 'tombol',
        properties: [{ key: 'color', value: 'blue' }],
        children: [],
      },
    ];
    const css = compileCSS(rules, false);
    expect(css).toContain('button {');
    expect(css).not.toMatch(/\btombol\b/);
  });

  it('composition helper sanity: scopeSelector(translateCSSSelector(x))', () => {
    expect(scopeSelector(translateCSSSelector('tombol'), 'Kartu')).toBe('button[data-pjs-kartu]');
    expect(scopeSelector(translateCSSSelector('.card h3'), 'Kartu')).toBe(
      '.card[data-pjs-kartu] h3'
    );
  });
});
