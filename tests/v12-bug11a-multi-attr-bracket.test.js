// ════════════════════════════════════════════════════════════════════════════
// BUG-11a — multi-attribute in same bracket  (GitHub #75)
// Before fix: [href="url" rel=ext] only captured href; rel was silently lost.
// After fix:  all space-separated attributes inside one [] are captured.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');

// ════════════════════════════════════════════════════════════════════════════
describe('BUG-11a — multi-attribute in single bracket', () => {
  // --- core multi-attr cases ---

  it('quoted + quoted: [href="https://example.com" rel="external"]', () => {
    const r = compile(`Halaman B:
  Buat a[href="https://example.com" rel="external"]: "Link"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("a")');
    expect(r.js).toContain('"href", "https://example.com"');
    expect(r.js).toContain('"rel", "external"');
  });

  it('boolean + quoted: [disabled href="url"]', () => {
    const r = compile(`Halaman B:
  Buat tombol[disabled href="https://example.com"]: "Klik"`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"disabled", ""');
    expect(r.js).toContain('"href", "https://example.com"');
  });

  it('unquoted + unquoted: [data_x="1" data_y="2"]', () => {
    const r = compile(`Halaman B:
  Buat div[data_x="1" data_y="2"]: ""`);
    expect(r.success).toBe(true);
    const json = JSON.stringify(r.ast);
    expect(json).toContain('"key":"data_x"');
    expect(json).toContain('"key":"data_y"');
  });

  it('three attributes mixed types: [a="1" b="two" c]', () => {
    const r = compile(`Halaman B:
  Buat div[a="1" b="two" c]: ""`);
    expect(r.success).toBe(true);
    const json = JSON.stringify(r.ast);
    // a="1" quoted, b="two" quoted, c boolean
    expect(json).toContain('"key":"a"');
    expect(json).toContain('"key":"b"');
    expect(json).toContain('"key":"c"');
  });

  it('docs example: [src="/img.png" alt="Foto"]', () => {
    const r = compile(`Halaman B:
  Buat gambar[src="/img.png" alt="Foto"]: ""`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('document.createElement("img")');
    expect(r.js).toContain('"src", "/img.png"');
    expect(r.js).toContain('"alt", "Foto"');
  });

  it('single-quoted + double-quoted in same bracket: [tipe="submit" kelas=\'btn\']', () => {
    const r = compile(`Halaman B:
  Buat masukan[tipe="submit" kelas='btn']: ""`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"tipe", "submit"');
    expect(r.js).toContain('"kelas", "btn"');
  });

  // --- regression: single attribute still works ---

  it('single quoted attribute still works: [placeholder="ketik"]', () => {
    const r = compile(`Halaman B:
  Buat masukan[placeholder="ketik"]:`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"placeholder", "ketik"');
  });

  it('boolean attribute still works: [disabled]', () => {
    const r = compile(`Halaman B:
  Buat masukan[disabled]:`);
    expect(r.success).toBe(true);
    expect(r.js).toMatch(/"disabled",\s*""/);
  });

  // --- regression: multiple brackets still works ---

  it('separate brackets still works: [placeholder="ketik"][disabled]', () => {
    const r = compile(`Halaman B:
  Buat masukan[placeholder="ketik"][disabled]:`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('"placeholder", "ketik"');
    expect(r.js).toMatch(/"disabled",\s*""/);
  });

  it('id + separate brackets: masukan#nama[placeholder="x"][disabled]', () => {
    const r = compile(`Halaman B:
  Buat masukan#nama[placeholder="x"][disabled]:`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('.id = "nama"');
    expect(r.js).toContain('"placeholder", "x"');
    expect(r.js).toMatch(/"disabled",\s*""/);
  });

  // --- mixed: multi-attr bracket + separate bracket ---

  it('multi-attr bracket + separate bracket: [a="1" b="2"][c="3"]', () => {
    const r = compile(`Halaman B:
  Buat div[a="1" b="2"][c="3"]: ""`);
    expect(r.success).toBe(true);
    const json = JSON.stringify(r.ast);
    expect(json).toContain('"key":"a"');
    expect(json).toContain('"key":"b"');
    expect(json).toContain('"key":"c"');
  });

  it('multi-attr bracket + class: div.aktif[src="/a.png" alt="A"]', () => {
    const r = compile(`Halaman B:
  Buat div.aktif[src="/a.png" alt="A"]: ""`);
    expect(r.success).toBe(true);
    expect(r.js).toContain('.className = "aktif"');
    expect(r.js).toContain('"src", "/a.png"');
    expect(r.js).toContain('"alt", "A"');
  });

  // --- AST structure verification ---

  it('AST has correct number of attributes for multi-attr bracket', () => {
    const r = compile(`Halaman B:
  Buat div[x=1 y="2" z]: ""`);
    expect(r.success).toBe(true);
    const json = JSON.stringify(r.ast);
    // Count occurrences of "type":"AttributeNode"
    const count = (json.match(/"type":"AttributeNode"/g) || []).length;
    expect(count).toBe(3);
  });

  // --- edge cases ---

  it('extra spaces between attributes are handled: [a="1"   b="x"]', () => {
    // spaces between attributes are skipped
    const r = compile(`Halaman B:
  Buat div[a="1"   b="x"]: ""`);
    expect(r.success).toBe(true);
    const json = JSON.stringify(r.ast);
    expect(json).toContain('"key":"a"');
    expect(json).toContain('"key":"b"');
  });

  it('tab-separated attributes work', () => {
    const r = compile(`Halaman B:
  Buat div[a="1"\tb="x"]: ""`);
    expect(r.success).toBe(true);
    const json = JSON.stringify(r.ast);
    expect(json).toContain('"key":"a"');
    expect(json).toContain('"key":"b"');
  });
});
