/**
 * PromptJS — v8: Component Edge-Cases Review & Inspection.
 * ============================================================================
 * Comprehensive edge-case test suite for component system:
 *
 *   • Component declaration AFTER block comment/string (gaya placement)
 *   • Nested component declaration (genuine nesting, not just invocation)
 *   • No-opt-in output verification (zero data-pjs attributes when not scoped)
 *   • Scoped output consistency across dev/build/prerender modes
 *
 * These tests ensure compiler invariants hold even in uncommon declaration
 * contexts and verify the output inspection rules for scope markers.
 */

import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/**
 * Helper: compile with optional front matter (dev mode by default).
 */
function compileWithMode(source, { mode = 'dev' } = {}) {
  let frontMatter = '';
  if (mode === 'build') {
    frontMatter = '---\nmode: build\n---\n';
  } else if (mode === 'prerender') {
    frontMatter = '---\nmode: prerender\n---\n';
  }
  return Engine.compile(frontMatter + source);
}

/**
 * Helper: count occurrences of a string in the output.
 */
function countOccurrences(str, search) {
  return (str.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

// ─── GAYA: Component declared after comment/string ───────────────────────────
describe('v8 edge-cases — component gaya (after comment/string)', () => {
  it('declares a component after a block comment containing "Komponen X"', () => {
    const source = `
/**
 * Komponen X adalah komponen lama yang sudah tidak dipakai.
 * Sekarang kita ganti dengan yang baru.
 */
Komponen Kartu(judul):
    Buat h2: judul

Halaman Home:
    Buat Kartu(judul: "Halo")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Kartu(props)');
    expect(r.js).toContain('window.Kartu = __komp_Kartu;');
  });

  it('declares a component after a string literal mentioning "Komponen Y"', () => {
    const source = `
tetap teks = "Komponen Y adalah nama reserved."

Komponen Tombol(label):
    Buat button: label

Halaman:
    Buat Tombol(label: "Klik")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Tombol(props)');
  });

  it('declares multiple components, each after comments referencing prior names', () => {
    const source = `
// Komponen Old adalah deprecated.
Komponen V1(x):
    Buat div: x

// Komponen V1 sudah diganti dengan V2.
Komponen V2(x):
    Buat span: x

Halaman:
    Buat V1(x: "first")
    Buat V2(x: "second")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_V1(props)');
    expect(r.js).toContain('function __komp_V2(props)');
  });

  it('handles English variant (Component) after comment', () => {
    const source = `
// Component OldWidget is deprecated.
Component Widget(title):
    Create h1: title

Page Home:
    Create Widget(title: "Welcome")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Widget(props)');
  });
});

// ─── NESTED: Genuine nested component declaration ──────────────────────────
describe('v8 edge-cases — nested component declaration', () => {
  it('declares a component body containing another component declaration', () => {
    const source = `
Komponen Outer(x):
    // Inner is only visible inside Outer
    Komponen Inner(y):
        Buat span: y
    
    Buat div:
        Buat Inner(y: x)

Halaman:
    Buat Outer(x: "nested")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    // Outer function exists
    expect(r.js).toContain('function __komp_Outer(props)');
    // Inner is a local definition (not a top-level export)
    expect(r.js).toContain('function __komp_Inner(props)');
    // Inner should NOT be exported to window (scoped to Outer)
    expect(r.js).not.toContain('window.Inner = __komp_Inner;');
  });

  it('nested component can access outer scope via closure', () => {
    const source = `
Komponen Parent(data):
    Komponen Child(suffix):
        Buat teks: data + "-" + suffix
    
    Buat Child(suffix: "end")

Halaman:
    Buat Parent(data: "start")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Parent(props)');
    expect(r.js).toContain('function __komp_Child(props)');
    // Closure over `data` (Parent's param) inside Child
    expect(r.js).toMatch(/data.*Child/);
  });

  it('multiple nested components at same level in parent body', () => {
    const source = `
Komponen Container(content):
    Komponen Header(title):
        Buat h1: title
    
    Komponen Footer(year):
        Buat p: year
    
    Buat Header(title: "Page")
    Buat div: content
    Buat Footer(year: "2026")

Halaman:
    Buat Container(content: "Body")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Container(props)');
    expect(r.js).toContain('function __komp_Header(props)');
    expect(r.js).toContain('function __komp_Footer(props)');
    // Only Container is exported to window
    expect(r.js).toContain('window.Container = __komp_Container;');
    expect(r.js).not.toContain('window.Header = __komp_Header;');
    expect(r.js).not.toContain('window.Footer = __komp_Footer;');
  });

  it('deeply nested components (3 levels)', () => {
    const source = `
Komponen Level1(a):
    Komponen Level2(b):
        Komponen Level3(c):
            Buat teks: c
        Buat Level3(c: b)
    Buat Level2(b: a)

Halaman:
    Buat Level1(a: "deep")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Level1(props)');
    expect(r.js).toContain('function __komp_Level2(props)');
    expect(r.js).toContain('function __komp_Level3(props)');
    // Only Level1 is exported
    expect(r.js).toContain('window.Level1 = __komp_Level1;');
    expect(r.js).not.toContain('window.Level2 = __komp_Level2;');
    expect(r.js).not.toContain('window.Level3 = __komp_Level3;');
  });
});

// ─── NO-OPT-IN: Verify no data-pjs in non-scoped output ────────────────────
describe('v8 edge-cases — no-opt-in output (zero data-pjs)', () => {
  it('unscoped component output contains zero data-pjs attributes', () => {
    const source = `
Komponen Box(content):
    Buat div.container:
        Buat p: content

Halaman:
    Buat Box(content: "Hello")
`;
    const r = compileWithMode(source, { mode: 'dev' });
    expect(r.success).toBe(true);
    // No scoped style declaration → no data-pjs should appear
    const dataPjsCount = countOccurrences(r.js, 'data-pjs');
    expect(dataPjsCount).toBe(0);
  });

  it('unscoped page with multiple components, zero data-pjs', () => {
    const source = `
Komponen Card(title):
    Buat div: title

Komponen Footer(year):
    Buat footer: year

Halaman:
    Buat Card(title: "Main")
    Buat Footer(year: "2026")
`;
    const r = compileWithMode(source, { mode: 'dev' });
    expect(r.success).toBe(true);
    const dataPjsCount = countOccurrences(r.js, 'data-pjs');
    expect(dataPjsCount).toBe(0);
  });

  it('nested unscoped components, zero data-pjs', () => {
    const source = `
Komponen Outer(x):
    Komponen Inner(y):
        Buat span: y
    Buat Inner(y: x)

Halaman:
    Buat Outer(x: "test")
`;
    const r = compileWithMode(source, { mode: 'dev' });
    expect(r.success).toBe(true);
    const dataPjsCount = countOccurrences(r.js, 'data-pjs');
    expect(dataPjsCount).toBe(0);
  });
});

// ─── SCOPED CONSISTENCY: output identical across modes ──────────────────────
describe('v8 edge-cases — scoped output consistency (dev/build/prerender)', () => {
  it('scoped component produces data-pjs identically across modes', () => {
    const source = `
<style scoped>
.card { border: 1px solid; }
</style>

Komponen Card(title):
    Buat div.card: title

Halaman:
    Buat Card(title: "Scoped")
`;
    const devR = compileWithMode(source, { mode: 'dev' });
    const buildR = compileWithMode(source, { mode: 'build' });
    const prerenderR = compileWithMode(source, { mode: 'prerender' });

    expect(devR.success && buildR.success && prerenderR.success).toBe(true);

    // All three modes should contain data-pjs (style is scoped)
    const devDataPjs = countOccurrences(devR.js, 'data-pjs');
    const buildDataPjs = countOccurrences(buildR.js, 'data-pjs');
    const prerenderDataPjs = countOccurrences(prerenderR.js, 'data-pjs');

    expect(devDataPjs).toBeGreaterThan(0);
    expect(buildDataPjs).toBeGreaterThan(0);
    expect(prerenderDataPjs).toBeGreaterThan(0);
    // All modes should have the same count
    expect(devDataPjs).toBe(buildDataPjs);
    expect(buildDataPjs).toBe(prerenderDataPjs);
  });

  it('unscoped component has zero data-pjs consistently across modes', () => {
    const source = `
Komponen Plain(text):
    Buat div: text

Halaman:
    Buat Plain(text: "Unscoped")
`;
    const devR = compileWithMode(source, { mode: 'dev' });
    const buildR = compileWithMode(source, { mode: 'build' });
    const prerenderR = compileWithMode(source, { mode: 'prerender' });

    expect(devR.success && buildR.success && prerenderR.success).toBe(true);

    // All three modes should have zero data-pjs
    const devDataPjs = countOccurrences(devR.js, 'data-pjs');
    const buildDataPjs = countOccurrences(buildR.js, 'data-pjs');
    const prerenderDataPjs = countOccurrences(prerenderR.js, 'data-pjs');

    expect(devDataPjs).toBe(0);
    expect(buildDataPjs).toBe(0);
    expect(prerenderDataPjs).toBe(0);
  });

  it('scoped nested component output consistent across modes', () => {
    const source = `
<style scoped>
.outer { padding: 10px; }
</style>

Komponen Outer(x):
    <style scoped>
    .inner { margin: 5px; }
    </style>
    
    Komponen Inner(y):
        Buat div.inner: y
    
    Buat div.outer:
        Buat Inner(y: x)

Halaman:
    Buat Outer(x: "nested-scoped")
`;
    const devR = compileWithMode(source, { mode: 'dev' });
    const buildR = compileWithMode(source, { mode: 'build' });
    const prerenderR = compileWithMode(source, { mode: 'prerender' });

    expect(devR.success && buildR.success && prerenderR.success).toBe(true);

    const devDataPjs = countOccurrences(devR.js, 'data-pjs');
    const buildDataPjs = countOccurrences(buildR.js, 'data-pjs');
    const prerenderDataPjs = countOccurrences(prerenderR.js, 'data-pjs');

    // All should have data-pjs due to scoping
    expect(devDataPjs).toBeGreaterThan(0);
    expect(buildDataPjs).toBeGreaterThan(0);
    expect(prerenderDataPjs).toBeGreaterThan(0);
    // Consistency across modes
    expect(devDataPjs).toBe(buildDataPjs);
    expect(buildDataPjs).toBe(prerenderDataPjs);
  });

  it('mixed scoped and unscoped components in same page, modes agree on data-pjs', () => {
    const source = `
<style scoped>
.box { background: blue; }
</style>

Komponen ScopedBox(text):
    Buat div.box: text

Komponen PlainBox(text):
    Buat div: text

Halaman:
    Buat ScopedBox(text: "Scoped")
    Buat PlainBox(text: "Plain")
`;
    const devR = compileWithMode(source, { mode: 'dev' });
    const buildR = compileWithMode(source, { mode: 'build' });
    const prerenderR = compileWithMode(source, { mode: 'prerender' });

    expect(devR.success && buildR.success && prerenderR.success).toBe(true);

    // All modes should have data-pjs count > 0 (at least for ScopedBox)
    const devCount = countOccurrences(devR.js, 'data-pjs');
    const buildCount = countOccurrences(buildR.js, 'data-pjs');
    const prerenderCount = countOccurrences(prerenderR.js, 'data-pjs');

    expect(devCount).toBeGreaterThan(0);
    expect(buildCount).toBeGreaterThan(0);
    expect(prerenderCount).toBeGreaterThan(0);
    // Must match across modes
    expect(devCount).toBe(buildCount);
    expect(buildCount).toBe(prerenderCount);
  });
});

// ─── COMBINED: Gaya + Nested + No-opt-in + Scoped ──────────────────────────
describe('v8 edge-cases — combined (gaya + nested + no-opt-in + scoped)', () => {
  it('nested component after comment, unscoped, zero data-pjs', () => {
    const source = `
// Komponen oldVersion dipindahkan ke dalam Container.
Komponen Container(data):
    /**
     * Komponen Item adalah bagian dari Container.
     * Tidak boleh dipakai di luar.
     */
    Komponen Item(val):
        Buat li: val
    
    Buat ul:
        Buat Item(val: data)

Halaman:
    Buat Container(data: "item1")
`;
    const r = compileWithMode(source);
    expect(r.success).toBe(true);
    const dataPjsCount = countOccurrences(r.js, 'data-pjs');
    expect(dataPjsCount).toBe(0);
    expect(r.js).toContain('function __komp_Container(props)');
    expect(r.js).toContain('function __komp_Item(props)');
    expect(r.js).not.toContain('window.Item = __komp_Item;');
  });

  it('nested scoped component after comment, consistent data-pjs across modes', () => {
    const source = `
<style scoped>
.list { list-style: none; }
</style>

// Komponen List dengan items yang di-scope.
Komponen List(items):
    <style scoped>
    .item { padding: 5px; }
    </style>
    
    /**
     * Komponen ListItem adalah nested, scoped.
     */
    Komponen ListItem(text):
        Buat li.item: text
    
    Buat ul.list:
        Buat ListItem(text: items)

Halaman:
    Buat List(items: "first")
`;
    const devR = compileWithMode(source, { mode: 'dev' });
    const buildR = compileWithMode(source, { mode: 'build' });
    const prerenderR = compileWithMode(source, { mode: 'prerender' });

    expect(devR.success && buildR.success && prerenderR.success).toBe(true);

    const devCount = countOccurrences(devR.js, 'data-pjs');
    const buildCount = countOccurrences(buildR.js, 'data-pjs');
    const prerenderCount = countOccurrences(prerenderR.js, 'data-pjs');

    expect(devCount).toBeGreaterThan(0);
    expect(devCount).toBe(buildCount);
    expect(buildCount).toBe(prerenderCount);
  });
});
