// ════════════════════════════════════════════════════════════════════════════
// BUG-03 — Jika at page root with reactive + event handler  (GitHub #62)
// Before fix: auto-fragment wrapped event handler → phantom __el_N variable
//   → compiled JS referenced undeclared variable (ReferenceError at runtime)
//   → in some complex cases, circular AST caused JSON.stringify hang
// After fix: parser excludes KetikaStatement from auto-fragment wrapper,
//   so resolver emits E3005 (clear error) instead of broken JS.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');

// ════════════════════════════════════════════════════════════════════════════
describe('BUG-03 — Jika + event handler at page root', () => {
  // --- core bug reproduction ---

  it('should emit E3005 instead of broken JS for on_ sibling of Buat inside Jika', () => {
    const r = compile(`data aktif = benar

Jika aktif:
    Buat div#a: 'hello'
    on_klik = simpan aktif ke salah`);
    expect(r.success).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('E3005');
  });

  it('should NOT produce phantom undeclared __el_N in output', () => {
    const r = compile(`data aktif = benar

Jika aktif:
    Buat div#a: 'hello'
    on_klik = simpan aktif ke salah`);
    // Even though compilation fails, the JS output should not contain
    // addEventListener on an undeclared variable
    if (r.js) {
      const addEvtMatch = r.js.match(/(__el_\d+)\.addEventListener/);
      if (addEvtMatch) {
        const varName = addEvtMatch[1];
        // The variable must be declared somewhere
        expect(r.js).toContain(`const ${varName}`);
      }
    }
  });

  // --- correct usage still works ---

  it('event handler INSIDE Buat body still works correctly', () => {
    const r = compile(`data aktif = benar

Jika aktif:
    Buat div#a:
        'hello'
        on_klik = simpan aktif ke salah`);
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
    // The event listener should be on the actual element
    expect(r.js).toContain('__el_1.addEventListener');
    // __el_1 must be declared
    expect(r.js).toContain('const __el_1 = document.createElement("div")');
  });

  // --- page-root event handler without target ---

  it('on_ at page root without Buat parent emits E3005', () => {
    const r = compile(`Buat div#a: 'hello'
on_klik = console.log('hi')`);
    expect(r.success).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].code).toBe('E3005');
  });

  it('multiple Buat + on_ at page root emits E3005 for the handler', () => {
    const r = compile(`Buat div#a: 'first'
Buat div#b: 'second'
on_klik = console.log('hi')`);
    expect(r.success).toBe(false);
    expect(r.errors.some((e) => e.code === 'E3005')).toBe(true);
  });

  // --- regression: multi-element without event handler still works ---

  it('multi-element at page root without event handler still auto-fragments', () => {
    const r = compile(`Buat div#a: 'first'
Buat div#b: 'second'`);
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.js).toContain('createElement("div")');
    // Should have two div elements
    const createCount = (r.js.match(/createElement\("div"\)/g) || []).length;
    expect(createCount).toBe(2);
  });

  // --- regression: event handler inside nested Buat still works ---

  it('multi-element inside Buat body (inner auto-fragment) still works', () => {
    const r = compile(`Buat div:
    Buat span: 'a'
    Buat span: 'b'`);
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
    // No phantom variable
    const addEvtMatch = r.js.match(/(__el_\d+)\.addEventListener/);
    if (addEvtMatch) {
      const varName = addEvtMatch[1];
      expect(r.js).toContain(`const ${varName}`);
    }
  });

  // --- edge cases ---

  it('Jika with single Buat + event handler (no auto-fragment needed) emits E3005', () => {
    // Single child → no auto-fragment, event handler is direct sibling
    const r = compile(`Jika benar:
    Buat div: 'x'
    on_klik = simpan foo ke salah`);
    expect(r.success).toBe(false);
    expect(r.errors.some((e) => e.code === 'E3005')).toBe(true);
  });

  it('event handler with explicit identifier target still works', () => {
    // Using ketika with a declared variable target — no E3005 expected
    const r = compile(`data el = document.querySelector('#a')

ketika klik el:
    console.log('hi')`);
    // Explicit target — should NOT get E3005
    const hasE3005 = r.errors.some((e) => e.code === 'E3005');
    expect(hasE3005).toBe(false);
  });

  it('multiple on_ handlers all get E3005 at page root', () => {
    const r = compile(`Buat div#a: 'hello'
on_klik = simpan a ke salah
on_fokus = simpan b ke benar`);
    expect(r.success).toBe(false);
    const e3005Count = r.errors.filter((e) => e.code === 'E3005').length;
    expect(e3005Count).toBe(2);
  });
});
