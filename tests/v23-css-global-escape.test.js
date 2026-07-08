'use strict';

import { describe, it, expect } from 'vitest';

/**
 * v132 #79 — `:global()` escape hatch tests
 *
 * When a file has `gayaCakupan: benar` (scoped), selectors wrapped in
 * `:global(...)` must be emitted WITHOUT the `[data-pjs-*]` attribute
 * selector, so they match globally as intended.
 *
 * Edge cases: multiple selectors, @media children, tag alias translation,
 * mix of scoped and global selectors in the same Gaya: block.
 */

const { compile } = require('../src/engine/promptjs');
const { JSDOM } = require('jsdom');

function runInJsdom(src, opts = {}) {
  const r = compile(src, opts);
  if (!r.success) throw new Error(`Compile failed: ${JSON.stringify(r.errors)}`);
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
    runScripts: 'dangerously',
    url: 'http://localhost',
  });
  const styleEl = dom.window.document.createElement('style');
  styleEl.textContent = r.css || '';
  dom.window.document.head.appendChild(styleEl);
  dom.window.eval(r.js);
  return { window: dom.window, result: r };
}

// ─────────────────────────────────────────────────────────────────────────
describe('v23 CSS :global() escape hatch', () => {
  // ── 1. Basic :global() in scoped file ──────────────────────────────────
  describe('basic :global() in scoped file', () => {
    it(':global(.overlay) emits without [data-pjs-*]', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    :global(.overlay)',
        '        position: fixed',
        '        top: 0',
        '    .modal-box',
        '        background: white',
        '',
        'Buat div.modal-box: "test"',
      ].join('\n');
      const r = compile(src, { source: 'app.pjs' });
      expect(r.success).toBe(true);
      // Global selector: NO scope attribute
      expect(r.css).toContain('.overlay {\n  position: fixed;');
      // Verify .overlay line itself has no [data-pjs-*]
      const overlayLine = r.css.split('\n').find((l) => l.includes('.overlay'));
      expect(overlayLine).not.toContain('[data-pjs-');
      // Scoped selector: HAS scope attribute
      expect(r.css).toContain('[data-pjs-app]');
      expect(r.css).toContain('background: white;');
    });

    it(':global(.a, .b) strips wrapper and emits both unscoped', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    :global(.btn-primary, .btn-secondary)',
        '        padding: 8px',
        '',
        'Buat button.btn-primary: "OK"',
      ].join('\n');
      const r = compile(src, { source: 'ui.pjs' });
      expect(r.success).toBe(true);
      expect(r.css).toContain('.btn-primary, .btn-secondary {');
      expect(r.css).toContain('padding: 8px;');
      expect(r.css).not.toContain('[data-pjs-');
    });

    it(':global(.foo) .bar keeps descendant part unscoped too', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    :global(.wrapper) .inner',
        '        margin: 4px',
        '',
        'Buat div: "hi"',
      ].join('\n');
      const r = compile(src, { source: 'test.pjs' });
      expect(r.success).toBe(true);
      expect(r.css).toContain('.wrapper .inner {');
      expect(r.css).not.toContain('[data-pjs-');
    });

    it(':global(.foo) > .bar keeps combinator', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    :global(.parent) > .child',
        '        display: flex',
        '',
        'Buat div: "x"',
      ].join('\n');
      const r = compile(src, { source: 'x.pjs' });
      expect(r.success).toBe(true);
      expect(r.css).toContain('.parent > .child {');
      expect(r.css).not.toContain('[data-pjs-');
    });
  });

  // ── 2. Mix of scoped and global in same Gaya: block ───────────────────
  describe('mixed scoped + global selectors in same block', () => {
    it('scoped selector gets [data-pjs-*] while :global does not', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Komponen Card(title):',
        '    Gaya:',
        '        .card',
        '            border: 1px solid',
        '        :global(.fade-in)',
        '            opacity: 1',
        '        .card-title',
        '            font-size: 18px',
        '    Buat div.card:',
        '        Buat span: title',
        '',
        'Buat Card(title: "Hello")',
      ].join('\n');
      const r = compile(src, { source: 'home.pjs' });
      expect(r.success).toBe(true);
      // Scoped
      expect(r.css).toContain('[data-pjs-home-card]');
      expect(r.css).toContain('border: 1px solid;');
      // Global
      expect(r.css).toContain('.fade-in {');
      expect(r.css).not.toContain('[data-pjs-home-card] .fade-in');
      expect(r.css).not.toContain('.fade-in[data-pjs-');
    });
  });

  // ── 3. :global() inside @media ─────────────────────────────────────────
  describe(':global() inside @media rules', () => {
    it(':global child of @media is unscoped, scoped sibling is scoped', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    @media (max-width: 600px)',
        '        :global(.container)',
        '            padding: 0',
        '        .card',
        '            width: 100%',
        '',
        'Buat div.card: "r"',
      ].join('\n');
      const r = compile(src, { source: 'resp.pjs' });
      expect(r.success).toBe(true);
      expect(r.css).toContain('@media (max-width: 600px) {');
      // Global child: no scope
      expect(r.css).toContain('.container {');
      expect(r.css).not.toContain('[data-pjs-resp] .container');
      // Scoped child: has scope
      expect(r.css).toContain('[data-pjs-resp]');
      expect(r.css).toContain('width: 100%;');
    });
  });

  // ── 4. Tag alias translation still works inside :global() ──────────────
  describe('tag alias translation inside :global()', () => {
    it(':global(tombol) translates to button', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    :global(tombol)',
        '            cursor: pointer',
        '',
        'Buat button: "click"',
      ].join('\n');
      const r = compile(src, { source: 'alias.pjs' });
      expect(r.success).toBe(true);
      // Alias translated even inside :global
      expect(r.css).toContain('button {');
      expect(r.css).not.toContain('tombol');
      expect(r.css).not.toContain('[data-pjs-');
    });
  });

  // ── 5. No opt-in file: :global is a no-op (not stripped, no scoping) ──
  describe('no opt-in: :global() is a no-op', () => {
    it('file without gayaCakupan keeps :global as-is in output (no scoping anyway)', () => {
      const src = [
        'Gaya:',
        '    :global(.overlay)',
        '        position: fixed',
        '',
        'Buat div: "hi"',
      ].join('\n');
      const r = compile(src, { source: 'plain.pjs' });
      expect(r.success).toBe(true);
      // Without scoping enabled, parse still strips :global() wrapper
      // but compileCSS never applies scopeSelector anyway
      expect(r.css).toContain('.overlay {');
      expect(r.css).not.toContain(':global');
      expect(r.css).not.toContain('[data-pjs-');
    });
  });

  // ── 6. End-to-end jsdom: global style actually affects DOM globally ────
  describe('end-to-end: global style affects elements outside scope', () => {
    it('an element without data-pjs-* attribute matches :global rule', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    :global(.reset-margin)',
        '        margin: 0',
        '    .scoped-box',
        '        padding: 8px',
        '',
        'Buat div.scoped-box: "inside"',
      ].join('\n');
      const { window } = runInJsdom(src, { source: 'e2e.pjs' });

      // Inject an external element that does NOT have data-pjs-e2e
      const external = window.document.createElement('div');
      external.className = 'reset-margin';
      window.document.body.appendChild(external);

      // External element gets global style
      const extStyle = window.getComputedStyle(external);
      expect(extStyle.margin).toBe('0px');

      // The scoped-box has padding but NOT margin:0 via :global
      const scopedBox = window.document.querySelector('.scoped-box');
      const scopedStyle = window.getComputedStyle(scopedBox);
      expect(scopedStyle.padding).toBe('8px');
    });
  });

  // ── 7. Component-level :global ─────────────────────────────────────────
  describe('component-level :global', () => {
    it(':global inside a component Gaya block is unscoped', () => {
      const src = [
        '---',
        'gayaCakupan: benar',
        '---',
        'Komponen Modal(title):',
        '    Gaya:',
        '        .modal-bg',
        '            background: black',
        '        :global(body)',
        '            overflow: hidden',
        '    Buat div.modal-bg:',
        '        Buat span: title',
        '',
        'Buat Modal(title: "Test")',
      ].join('\n');
      const r = compile(src, { source: 'modal.pjs' });
      expect(r.success).toBe(true);
      // Component scoped
      expect(r.css).toContain('[data-pjs-modal-modal]');
      // Global escape
      expect(r.css).toContain('body {');
      expect(r.css).toContain('overflow: hidden;');
      expect(r.css).not.toContain('[data-pjs-modal-modal] body');
      expect(r.css).not.toContain('body[data-pjs-');
    });
  });

  // ── 8. Unit: stripGlobalWrapper ────────────────────────────────────────
  describe('stripGlobalWrapper unit', () => {
    // stripGlobalWrapper is internal — tested indirectly via parseGayaRules above
    void require('../src/engine/css/parse');

    // We need to access it — since it's not exported, test via parseGayaRules
    // indirectly above. But let's verify the parsing behavior directly:
    it('parseGayaRules sets global:true for :global selector', () => {
      const { parseGayaRules } = require('../src/engine/css/parse');
      const rules = parseGayaRules(':global(.foo)\n    color: red', 'test');
      expect(rules).toHaveLength(1);
      expect(rules[0].selector).toBe('.foo');
      expect(rules[0].global).toBe(true);
    });

    it('parseGayaRules sets global:false for normal selector', () => {
      const { parseGayaRules } = require('../src/engine/css/parse');
      const rules = parseGayaRules('.bar\n    color: blue', 'test');
      expect(rules).toHaveLength(1);
      expect(rules[0].selector).toBe('.bar');
      expect(rules[0].global).toBe(false);
    });

    it('parseGayaRules handles :global(.a, .b, .c) as global', () => {
      const { parseGayaRules } = require('../src/engine/css/parse');
      const rules = parseGayaRules(':global(.a, .b, .c)\n    margin: 0', 'x');
      expect(rules).toHaveLength(1);
      expect(rules[0].selector).toBe('.a, .b, .c');
      expect(rules[0].global).toBe(true);
    });
  });
});
