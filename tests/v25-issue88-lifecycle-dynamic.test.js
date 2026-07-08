'use strict';

import { describe, it, expect } from 'vitest';
const { JSDOM } = require('jsdom');

/**
 * #88 — Regression tests: dipasang/dilepas hooks in dynamic components
 *
 * Issue: Components created AFTER initial SPA mount() push their dipasang:
 * hook into page-level __dipasangFns which is only forEach'd once at mount.
 * Fix: When inside a Komponen (detected via _componentScopeStack), call
 * dipasang immediately (IIFE) instead of deferring to page-level array.
 *
 * Note: dipasang/dilepas at page level is E4001 in SPA mode.
 * Only component-level lifecycle hooks are relevant to #88.
 */

const { compile } = require('../src/engine/promptjs');

function compileSPA(src) {
  return compile(src, { source: 'app.pjs', pageName: 'app', pageRoute: '/' });
}

function extractFactoryBody(js, componentName) {
  // Walk the JS to find `function __komp_<name>(` and extract via brace matching.
  const marker = `function __komp_${componentName}(`;
  const start = js.indexOf(marker);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < js.length; i++) {
    if (js[i] === '{') depth++;
    if (js[i] === '}') { depth--; if (depth === 0) { return js.substring(start, i + 1); } }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
describe('#88 — dipasang/dilepas lifecycle in dynamic components', () => {
  // ── 1. Component dipasang: after fix, no page-level push ───────
  it('FIXED: component dipasang does NOT push to __dipasangFns', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box():',
      '    dipasang:', '        console.log("box mounted")',
      '    Buat div: "box"',
      '',
      'Buat Box()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Box');
    expect(fb).not.toBeNull();
    expect(fb).not.toContain('__dipasangFns.push');
    expect(fb).toContain('(function() {');
    expect(fb).toContain('box mounted');
  });

  // ── 2. Multiple instances: factory body has no push ──────────────
  it('FIXED: multiple instances — factory body has no push', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box(nama):',
      '    dipasang:', '        console.log("box mounted")',
      '    Buat div: nama',
      '',
      'Buat Box(nama: "satu")',
      'Buat Box(nama: "dua")',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Box');
    expect(fb).not.toBeNull();
    expect(fb).not.toContain('__dipasangFns.push');
  });

  // ── 3. Component dilepas: after fix, no page-level push ─────────────
  it('FIXED: component dilepas does NOT push to __dilepasFns', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box():',
      '    dilepas:', '        console.log("box unmounted")',
      '    Buat div: "box"',
      '',
      'Buat Box()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Box');
    expect(fb).not.toBeNull();
    expect(fb).not.toContain('__dilepasFns.push');
    expect(fb).toContain('box unmounted');
  });

  // ── 4. Component in Ulangi loop: no page-level push ──────────
  it('FIXED: component in Ulangi loop — no page-level push', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'data items = ["a", "b"]', '',
      'Komponen Item(name):',
      '    dipasang:', '        console.log("item mounted")',
      '    Buat div: name',
      '',
      'Buat div#list:',
      '    Ulangi untuk item dari items:',
      '        Buat Item(name: item)',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Item');
    expect(fb).not.toBeNull();
    expect(fb).not.toContain('__dipasangFns.push');
  });

  // ── 5. Component in Saat block: no page-level push ────────────
  it('FIXED: component in Saat block — no page-level push', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'data showCard = false', '',
      'Komponen Card():', '    dipasang:', '        console.log("card mounted")',
      '    Buat div: "card"',
      '',
      'Buat div:', '    Saat showCard:', '        Buat Card()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Card');
    expect(fb).not.toBeNull();
    expect(fb).not.toContain('__dipasangFns.push');
  });

  // ── 6. Non-SPA: unchanged (DOMContentLoaded) ───────────────────────
  it('non-SPA: component dipasang uses DOMContentLoaded (unchanged)', () => {
    const src = [
      'Komponen Box():',
      '    dipasang:', '        console.log("box mounted")',
      '    Buat div: "box"',
      '',
      'Buat Box()',
    ].join('\n');

    const r = compile(src, { source: 'app.pjs' });
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('__dipasangFns');
    expect(r.js).toContain('DOMContentLoaded');
  });

  // ── 7. CSP-safe: no eval or new Function ───────────────────────
  it('output is CSP-safe', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box():', '    dipasang:', '        console.log("m")',    '    Buat div: "b"',
      'Buat Box()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('eval(');
    expect(r.js).not.toContain('new Function');
  });

  // ── 8. E2E jsdom: dipasang fires when factory is called ──────────────
  it('E2E: dipasang fires when component factory is called', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box():',
      '    dipasang:', '        window.__boxMounted = true',
      '    Buat div: "box"',
      '',
      'Buat Box()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);

    // Extract ALL definitions and the Gunakan/instance calls
    const returnIdx = r.js.lastIndexOf('return {');
    const beforePage = r.js.substring(0, returnIdx > 0 ? returnIdx : r.js.length);

    const dom = new JSDOM(
      '<!DOCTYPE html><html><head></head><body></body></html>',
      { runScripts: 'dangerously', url: 'http://localhost' },
    );

    // Eval factory definitions + instance creation
    dom.window.eval(beforePage);

    // After fix + #92 parser fix: assignment executed inside IIFE
    expect(dom.window.__boxMounted).toBe(true);
  });

  // ── 9. Component dipasang WITHOUT Buat (no auto-fragment) ─────────
  it('FIXED: component dipasang without Buat — still IIFE, no push', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box():',
      '    dipasang:', '        console.log("no buat")',
      '',
      'Buat Box()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Box');
    expect(fb).not.toBeNull();
    expect(fb).not.toContain('__dipasangFns.push');
    expect(fb).toContain('(function() {');
    expect(fb).toContain('console.log("no buat")');
  });

  // ── 10. dilepas known limitation: fires at factory call, not DOM remove ─
  it('KNOWN LIMITATION: dilepas fires immediately (IIFE) inside component', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Box():',
      '    dilepas:', '        window.__boxCleaned = true',
      '    Buat div: "box"',
      '',
      'Buat Box()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const fb = extractFactoryBody(r.js, 'Box');
    expect(fb).not.toBeNull();
    // dilepas is IIFE (same as dipasang) — fires at factory call, not DOM remove
    expect(fb).not.toContain('__dilepasFns.push');
    expect(fb).toContain('(function() {');
    expect(fb).toContain('window.__boxCleaned = true');
  });

  // ── 11. Nested component: inner dipasang also uses IIFE ───────────
  it('FIXED: nested component dipasang — inner also IIFE', () => {
    const src = [
      '---', 'router: benar', '---', '',
      'Komponen Inner():',
      '    dipasang:', '        console.log("inner mounted")',
      '    Buat span: "inner"',
      '',
      'Komponen Outer():',
      '    dipasang:', '        console.log("outer mounted")',
      '    Buat Inner()',
      '',
      'Buat Outer()',
    ].join('\n');

    const r = compileSPA(src);
    expect(r.success).toBe(true);
    const innerFb = extractFactoryBody(r.js, 'Inner');
    expect(innerFb).not.toBeNull();
    expect(innerFb).not.toContain('__dipasangFns.push');
    expect(innerFb).toContain('console.log("inner mounted")');

    const outerFb = extractFactoryBody(r.js, 'Outer');
    expect(outerFb).not.toBeNull();
    expect(outerFb).not.toContain('__dipasangFns.push');
    expect(outerFb).toContain('console.log("outer mounted")');
  });
});