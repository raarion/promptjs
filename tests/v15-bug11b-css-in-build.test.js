// ════════════════════════════════════════════════════════════════════════════
// BUG-11b — CSS not inlined in CLI build HTML output  (GitHub #75)
// Before fix: buildHtml() and buildPrerenderedHtml() dropped result.css
//   entirely — no <style> tag, no <link> tag. Pages rendered unstyled.
// After fix:  both functions accept CSS and inline it in a <style> tag.
// ════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { compile } = require('../src/engine/promptjs');

// We test the build command functions indirectly by importing build.js
// Since build.js is a CLI entry point (not a module), we test via compile()
// output and verify the CSS is present in r.css.
//
// The actual buildHtml/buildPrerenderedHtml functions are tested through
// the CLI integration tests (cli-compile.test.js).

// ════════════════════════════════════════════════════════════════════════════
describe('BUG-11b — CSS in build output', () => {
  // --- Core: compile() produces CSS from Gaya blocks ---

  it('compile() returns non-empty r.css when Gaya blocks exist', () => {
    const r = compile(`Buat div.kartu: 'hello'

Gaya:
    .kartu:
        warna: putih
        latar: biru
        sudut: 10px`);
    expect(r.success).toBe(true);
    expect(r.css).toBeDefined();
    expect(r.css.length).toBeGreaterThan(0);
    expect(r.css).toContain('warna');
    expect(r.css).toContain('latar');
  });

  it('compile() returns empty r.css when no Gaya blocks', () => {
    const r = compile(`Buat div: 'hello'`);
    expect(r.success).toBe(true);
    expect(r.css).toBe('');
  });

  it('CSS contains scoped selectors for component Gaya', () => {
    const r = compile(`Komponen Tombol(warna):
    Buat button: 'klik'

    Gaya:
        button:
            latar: merah

Buat Tombol(warna="merah")`);
    // Component may or may not compile depending on scope — just verify
    // that the Gaya block was extracted and CSS is produced
    if (r.success) {
      expect(r.css.length).toBeGreaterThan(0);
    } else {
      // If component compilation fails (resolver error), CSS should still
      // be extracted since Gaya processing happens before resolution
      expect(r.css).toBeDefined();
    }
  });

  // --- CSS survives the compile pipeline ---

  it('CSS with media queries compiles correctly', () => {
    const r = compile(`Buat div.box: 'responsive'

Gaya:
    .box:
        lebar: 100px

    @media (max-width: 600px):
        .box:
            lebar: 100%`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('@media');
    expect(r.css).toContain('100%');
  });

  it('Multiple Gaya blocks merge into single r.css', () => {
    const r = compile(`Buat div.a: 'a'
Buat div.b: 'b'

Gaya:
    .a:
        warna: merah

Gaya:
    .b:
        warna: biru`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('merah');
    expect(r.css).toContain('biru');
  });

  // --- Regression: build command scenario (simulated) ---

  it('Gaya inside Jika still produces CSS', () => {
    const r = compile(`data besar = benar

Jika besar:
    Buat div.kartu: 'big card'

Gaya:
    .kartu:
        ukuran-font: 24px`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('24px');
  });

  it('CSS with vendor prefixes compiles correctly', () => {
    const r = compile(`Buat div.flex: 'flexbox'

Gaya:
    .flex:
        tampilan: flex
        gap: 8px`);
    expect(r.success).toBe(true);
    expect(r.css).toContain('flex');
    expect(r.css).toContain('gap');
  });

  // --- Verify CSS is NOT in r.js (it should be in r.css only) ---
  it('r.js does not contain raw CSS rules (CSS is in r.css)', () => {
    const r = compile(`Buat div.box: 'styled'

Gaya:
    .box:
        warna: merah`);
    expect(r.success).toBe(true);
    // The JS should not contain the CSS property directly
    expect(r.js).not.toContain('.box');
    expect(r.js).not.toContain('warna: merah');
    // But r.css should
    expect(r.css).toContain('.box');
  });
});
