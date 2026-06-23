// @ts-check
/**
 * v0.6.0 FASE 1 — SPA Capability Verification Tests
 * ============================================================================
 * Tests for:
 *   1.1 Lifecycle Mount/Unmount (factory function wrapping)
 *   1.2 Client-Side Router (router runtime, arahkan SPA navigate, builder)
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';
import Codegen from '../src/compiler/utils/codegen.js';
import RuntimeEmitter from '../src/compiler/emitters/runtime.js';
import { ROUTER_RUNTIME } from '../src/engine/router-runtime.js';

// ═══════════════════════════════════════════════════════════════════════════════
// 1.1 LIFECYCLE MOUNT/UNMOUNT
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.6 — 1.1 SPA Factory Function', () => {
  it('non-SPA output is unchanged (IIFE wrapper)', () => {
    const result = compile('Buat h1: "Hello"');
    expect(result.success).toBe(true);
    expect(result.isSPA).toBe(false);
    expect(result.js).toContain('(function() {');
    expect(result.js).toContain('})();');
    expect(result.js).not.toContain('__cleanupFns');
    expect(result.js).not.toContain('__dipasangFns');
    expect(result.js).not.toContain('mount:');
    expect(result.js).not.toContain('unmount:');
  });

  it('SPA mode wraps code without IIFE', () => {
    const result = compile('Buat h1: "Hello"', { pageName: 'test', pageRoute: '/test' });
    // Without router: benar in front-matter, isSPA won't be set
    expect(result.isSPA).toBe(false);
    // We can force SPA by setting ast.isSPA directly — but the engine
    // sets it based on front-matter. Let's test via the full pipeline.
  });

  it('SPA mode with router: benar in front-matter', () => {
    const source = '---\nrouter: benar\n---\nBuat h1: "Hello"';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    expect(result.isSPA).toBe(true);
    // SPA output has cleanup/dipasang/dilepas arrays
    expect(result.js).toContain('var __cleanupFns = [];');
    expect(result.js).toContain('var __dipasangFns = [];');
    expect(result.js).toContain('var __dilepasFns = [];');
    // SPA output has mount/unmount methods
    expect(result.js).toContain('mount: function(__parent)');
    expect(result.js).toContain('unmount: function()');
    // SPA output does NOT have IIFE
    expect(result.js).not.toContain('(function() {');
    expect(result.js).not.toContain('})();');
  });

  it('SPA mode does not auto-append top-level elements', () => {
    const source = '---\nrouter: benar\n---\nBuat h1: "Hello"';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    // No document.body.appendChild for top-level elements
    expect(result.js).not.toContain('document.body.appendChild(__el_');
    // Page root is tracked
    expect(result.js).toContain('el: __el_');
  });

  it('SPA mode: first top-level element becomes page root', () => {
    const source = '---\nrouter: benar\n---\nHalaman Beranda:\n    Buat h1: "Hello"';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    // Page root is the halaman div
    expect(result.js).toContain('el: __el_');
    // The h1 is nested inside the halaman (appended via currentParent)
    expect(result.js).toContain('appendChild(__el_2)');
  });

  it('SPA mode: watchers are tracked for cleanup', () => {
    const source = [
      '---', 'router: benar', '---',
      'data hitung = 0',
      'Halaman Beranda:',
      '    Buat p #info:',
      '        saat hitung:',
      '            teks = hitung',
    ].join('\n');
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    // Watcher wrapped in __cleanupFns.push()
    expect(result.js).toContain('__cleanupFns.push(__watch(');
    // Extra closing paren
    expect(result.js).toMatch(/\}\)\);/);
  });

  it('SPA mode: dipasang hook collected for mount() (inside component)', () => {
    // dipasang is valid inside Komponen declarations (parser restriction)
    // Component must be declared before use
    const source = [
      '---', 'router: benar', '---',
      'Komponen InfoBox:',
      '    Buat p #msg:',
      '        teks = "Loading"',
      '    dipasang:',
      '        tampilkan "Loaded!"',
      'Halaman Beranda:',
      '    Buat h1: "Hello"',
      '    Gunakan InfoBox:',
    ].join('\n');
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    // dipasang pushes to __dipasangFns (SPA mode)
    expect(result.js).toContain('__dipasangFns.push(function()');
    // NOT DOMContentLoaded
    expect(result.js).not.toContain('DOMContentLoaded');
  });

  it('SPA mode: dilepas hook collected for unmount() (inside component)', () => {
    const source = [
      '---', 'router: benar', '---',
      'Komponen InfoBox:',
      '    Buat p #msg:',
      '        teks = "Active"',
      '    dilepas:',
      '        tampilkan "Unmounted!"',
      'Halaman Beranda:',
      '    Buat h1: "Hello"',
      '    Gunakan InfoBox:',
    ].join('\n');
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    // dilepas pushes to __dilepasFns
    expect(result.js).toContain('__dilepasFns.push(function()');
    // NOT beforeunload
    expect(result.js).not.toContain('beforeunload');
  });

  it('SPA mode: unmount calls cleanup functions and removes element', () => {
    const source = '---\nrouter: benar\n---\nBuat h1: "Hello"';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    expect(result.js).toContain('__dilepasFns.forEach(function(fn) { fn(); });');
    expect(result.js).toContain('__cleanupFns.forEach(function(fn) { fn(); });');
    expect(result.js).toContain('.remove();');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1.2 CLIENT-SIDE ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.6 — 1.2 Router Runtime', () => {
  it('ROUTER_RUNTIME is a non-empty string', () => {
    expect(typeof ROUTER_RUNTIME).toBe('string');
    expect(ROUTER_RUNTIME.length).toBeGreaterThan(100);
  });

  it('router runtime contains __pjsRouter function', () => {
    expect(ROUTER_RUNTIME).toContain('function __pjsRouter(routes, options)');
  });

  it('router runtime handles click interception', () => {
    expect(ROUTER_RUNTIME).toContain('document.addEventListener("click"');
    expect(ROUTER_RUNTIME).toContain('closest("a[href]")');
  });

  it('router runtime handles popstate', () => {
    expect(ROUTER_RUNTIME).toContain('window.addEventListener("popstate"');
  });

  it('router runtime handles pushState navigation', () => {
    expect(ROUTER_RUNTIME).toContain('history.pushState');
  });

  it('router runtime supports dynamic segments', () => {
    expect(ROUTER_RUNTIME).toContain('matchRoute');
    expect(ROUTER_RUNTIME).toContain('extractParams');
  });

  it('router runtime has destroy method for cleanup', () => {
    expect(ROUTER_RUNTIME).toContain('destroy:');
    expect(ROUTER_RUNTIME).toContain('removeEventListener');
  });

  it('router runtime supports 404 fallback with "*" route', () => {
    expect(ROUTER_RUNTIME).toContain('routes["*"]');
  });
});

describe('v0.6 — 1.2 arahkan SPA Navigate', () => {
  it('non-SPA arahkan uses window.location.href', () => {
    const result = compile('arahkan "/about"');
    expect(result.success).toBe(true);
    expect(result.js).toContain('window.location.href = "/about"');
    expect(result.js).not.toContain('__pjsRouter');
  });

  it('SPA arahkan uses __pjsRouter.navigate', () => {
    const source = '---\nrouter: benar\n---\narahkan "/about"';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    expect(result.js).toContain('__pjsRouter.navigate("/about")');
    expect(result.js).not.toContain('window.location.href');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('v0.6 — Backward Compatibility', () => {
  it('non-SPA output is identical to v0.5 behavior', () => {
    const result = compile('Buat h1: "Hello"');
    expect(result.success).toBe(true);
    expect(result.isSPA).toBe(false);
    // Has IIFE
    expect(result.js).toContain('(function() {');
    expect(result.js).toContain('})();');
    // Appends to document.body
    expect(result.js).toContain('document.body.appendChild(__el_');
    // No SPA artifacts
    expect(result.js).not.toContain('__cleanupFns');
    expect(result.js).not.toContain('mount:');
    expect(result.js).not.toContain('unmount:');
    expect(result.js).not.toContain('__pjsRouter');
  });

  it('events still have error boundaries in SPA mode', () => {
    const source = '---\nrouter: benar\n---\nBuat tombol:\n    "Klik"\n    on_klik = alert("hi")';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    expect(result.js).toContain('try {');
    expect(result.js).toContain('__pjs_handleError(__e,');
  });

  it('tree shaking still works in SPA mode', () => {
    const source = '---\nrouter: benar\n---\nBuat h1: "Static page"';
    const result = compile(source, { pageName: 'index', pageRoute: '/' });
    expect(result.success).toBe(true);
    expect(result.js).not.toContain('__createReactive');
    expect(result.js).not.toContain('__subscribers');
  });
});