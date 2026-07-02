/**
 * PromptJS — Regression: documentation examples must match the real grammar.
 *
 * Three doc snippets were verified WRONG against the actual compiler and fixed
 * (F-2, F-3a, F-3b). Each locks a red→green pair: the CORRECTED form (as now
 * shown in the docs) must compile, and the OLD/wrong form must fail — so the
 * docs can never silently drift back to teaching invalid syntax.
 *
 *   F-3b  docs/language/syntax-reference.md
 *         WRONG: `perbarui teks ke "Hello"`  (there is no `ke` form)
 *         RIGHT: `perbarui teks ".sel": "Hello"`  (value after `:`)
 *
 *   F-3a  docs/language/security.md
 *         WRONG: `atur isi ke jahat`  (`atur` is not a keyword)
 *         RIGHT: `perbarui html "#sel": jahat`  (routed through __sanitizeHTML)
 *
 *   F-2   docs/language/syntax-reference.md
 *         WRONG: page-level `Ketika dipasang:`  (double error: not a `Ketika`
 *                event, and lifecycle is component-only)
 *         RIGHT: bare `dipasang:` / `dilepas:` INSIDE a Komponen; page-level
 *                lifecycle uses `Ketika muat:`.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

const codesOf = (r) => (r.errors || []).map((e) => e.code);

describe('docs sync — syntax-reference / security examples (regression)', () => {
  // ── F-3b: perbarui <prop> <selector>: <value> ─────────────────────────────
  it('F-3b: corrected `perbarui teks ".sel": "Hello"` compiles', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    Buat div.judul: "x"\n' +
        '    Buat button: "go"\n' +
        '        Ketika diklik:\n' +
        '            perbarui teks ".judul": "Hello"'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('.innerText = "Hello"');
  });

  it('F-3b: old `perbarui teks ke "Hello"` (no `ke` form) fails', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    Buat button: "go"\n' +
        '        Ketika diklik:\n' +
        '            perbarui teks ke "Hello"'
    );
    expect(r.success).toBe(false);
  });

  // ── F-3a: security XSS demo must use a real keyword + go through sanitizer ─
  it('F-3a: corrected `perbarui html "#keluar": jahat` routes through __sanitizeHTML', () => {
    const r = Engine.compile(
      'data jahat = "<b>x</b>"\n' +
        'Halaman P:\n' +
        '    Buat div#keluar: ""\n' +
        '    Buat button: "go"\n' +
        '        Ketika diklik:\n' +
        '            perbarui html "#keluar": jahat'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('__sanitizeHTML(');
  });

  it('F-3a: old `atur isi ke jahat` (`atur` not a keyword) fails', () => {
    const r = Engine.compile(
      'data jahat = "x"\n' +
        'Halaman P:\n' +
        '    Buat div#keluar: ""\n' +
        '    Buat button: "go"\n' +
        '        Ketika diklik:\n' +
        '            atur isi ke jahat'
    );
    expect(r.success).toBe(false);
  });

  // ── F-2: lifecycle blocks are bare `dipasang:` inside a component ──────────
  it('F-2: corrected bare `dipasang:`/`dilepas:` inside a Komponen compiles', () => {
    const r = Engine.compile(
      '---\n' +
        'router: benar\n' +
        '---\n' +
        'Komponen Widget:\n' +
        '    Buat p #msg: "Loading"\n' +
        '    dipasang:\n' +
        '        tampilkan "Loaded!"\n' +
        '    dilepas:\n' +
        '        tampilkan "Unmounted!"\n' +
        'Halaman Beranda:\n' +
        '    Buat h1: "Hello"\n' +
        '    Gunakan Widget:',
      { pageName: 'index', pageRoute: '/' }
    );
    expect(r.success).toBe(true);
  });

  it('F-2: page-level lifecycle `dipasang:` is rejected with E4001 (component-only)', () => {
    const r = Engine.compile('Halaman P:\n    dipasang:\n        tampilkan "x"\n    Buat div: "y"');
    expect(r.success).toBe(false);
    expect(codesOf(r)).toContain('E4001');
  });

  it('F-2: page-level `Ketika muat:` is the valid page lifecycle and compiles', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    data status = ""\n' +
        '    Ketika muat:\n' +
        '        simpan "Ready" ke status\n' +
        '    Buat div: $status'
    );
    expect(r.success).toBe(true);
  });
});
