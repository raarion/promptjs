/**
 * PromptJS — Regression: v1.2 documentation & showcase examples must compile.
 *
 * The v1.2 doc/showcase sync phase added prose + code for four features and
 * corrected several lifecycle-syntax examples that were verified WRONG against
 * the real grammar. Docs are only trustworthy if every code block a reader can
 * copy actually compiles. This suite compiles each documented snippet (and the
 * new showcase example file) so the docs can never silently drift back to
 * teaching invalid syntax.
 *
 * Coverage:
 *   reactivity.md  — inline fetch (forget / bind / English / branches) + auto state
 *   reactivity.md  — two-way binding (ikat / bind)
 *   expressions.md — membership operators (berisi / diawali / diakhiri)
 *   components.md  — default parameters
 *   routing.md + event-aliases.md — CORRECTED lifecycle (bare `dipasang:`/`dilepas:`
 *                    inside a Komponen; page-level `Ketika muat:`), and the OLD
 *                    wrong forms (`Ketika dipasang:` anywhere) must still fail.
 *   examples/fitur-v1-2.pjs — the showcase example compiles clean.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Engine from '../src/engine/promptjs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ok = (src) => {
  const r = Engine.compile(src);
  return r.success && (r.errors || []).length === 0;
};
const codesOf = (src) => (Engine.compile(src).errors || []).map((e) => e.code);

describe('docs sync v1.2 — inline fetch (reactivity.md)', () => {
  it('fetch-and-forget: `on_klik = ambil dari "url"`', () => {
    expect(
      ok(
        'Halaman P:\n' +
          '    data items = []\n' +
          '    Buat tombol #b: "Muat"\n' +
          '        on_klik = ambil dari "https://api.test/items"\n'
      )
    ).toBe(true);
  });

  it('bind + auto state: `on_klik = ambil dari "url" ke items`', () => {
    expect(
      ok(
        'Halaman P:\n' +
          '    data items = []\n' +
          '    data items_memuat = salah\n' +
          '    data items_galat = ""\n' +
          '    Buat tombol #b: "Muat"\n' +
          '        on_klik = ambil dari "https://api.test/items" ke items\n' +
          '    Jika items_memuat:\n' +
          '        Buat p: "Memuat..."\n' +
          '    Jika items_galat tidak sama dengan "":\n' +
          '        Buat p: "Gagal: " + $items_galat\n'
      )
    ).toBe(true);
  });

  it('English: `on_click = fetch from "url" ke items`', () => {
    expect(
      ok(
        'Page P:\n' +
          '    data items = []\n' +
          '    Create button #b: "Load"\n' +
          '        on_click = fetch from "https://api.test/items" ke items\n'
      )
    ).toBe(true);
  });

  it('branches: `berhasil:` / `gagal:`', () => {
    expect(
      ok(
        'Halaman P:\n' +
          '    data items = []\n' +
          '    Buat tombol #b: "Muat"\n' +
          '        on_klik = ambil dari "https://api.test/items":\n' +
          '            berhasil:\n' +
          '                simpan __data ke items\n' +
          '            gagal:\n' +
          '                tampilkan "Gagal memuat"\n'
      )
    ).toBe(true);
  });
});

describe('docs sync v1.2 — two-way binding (reactivity.md)', () => {
  it('`ikat = state` compiles', () => {
    expect(ok('Halaman P:\n    data nama = ""\n    Buat masukan #f:\n        ikat = nama\n')).toBe(
      true
    );
  });
  it('`bind = state` (English) compiles', () => {
    expect(ok('Page P:\n    data name = ""\n    Create input #f:\n        bind = name\n')).toBe(
      true
    );
  });
});

describe('docs sync v1.2 — membership operators (expressions.md)', () => {
  it('`berisi` / `diakhiri` in a condition', () => {
    expect(
      ok(
        'Halaman P:\n' +
          '    data nama = ""\n' +
          '    data email = ""\n' +
          '    Jika nama berisi "admin" atau email diakhiri "@corp.com":\n' +
          '        Buat span: "Akses khusus"\n'
      )
    ).toBe(true);
  });
  it('`diawali` in a `turunan`', () => {
    expect(ok('Halaman P:\n    data url = ""\n    turunan adalahApi = url diawali "/api"\n')).toBe(
      true
    );
  });
});

describe('docs sync v1.2 — default parameters (components.md)', () => {
  it('`Komponen Tombol(label, varian: "primer"):` compiles', () => {
    expect(
      ok(
        'Komponen Tombol(label, varian: "primer"):\n' +
          '    Buat tombol: $label\n' +
          'Halaman P:\n' +
          '    Gunakan Tombol label="Klik"\n'
      )
    ).toBe(true);
  });
  it('required-after-default is rejected with E4006', () => {
    expect(codesOf('Komponen Salah(varian: "primer", label):\n    Buat span: $label\n')).toContain(
      'E4006'
    );
  });
});

describe('docs sync v1.2 — CORRECTED lifecycle (routing.md / event-aliases.md)', () => {
  it('bare `dipasang:` / `dilepas:` inside a Komponen compiles', () => {
    expect(
      ok(
        'Komponen MyWidget:\n' +
          '    dipasang:\n' +
          '        tampilkan "Widget mounted"\n' +
          '    dilepas:\n' +
          '        tampilkan "Widget unmounted"\n'
      )
    ).toBe(true);
  });

  it('corrected routing.md block (Komponen + bare dipasang + fetch branches) compiles', () => {
    expect(
      ok(
        'Komponen Dashboard:\n' +
          '    data items = []\n' +
          '    dipasang:\n' +
          '        Ambil dari "/api/items":\n' +
          '            berhasil:\n' +
          '                simpan __data ke items\n' +
          '    dilepas:\n' +
          '        kosongkan items\n'
      )
    ).toBe(true);
  });

  it('page-level `Ketika muat:` compiles', () => {
    expect(ok('Halaman P:\n    data d = []\n    Ketika muat:\n        tampilkan "loaded"\n')).toBe(
      true
    );
  });

  // Guards against reintroducing the OLD wrong forms the docs used to teach.
  it('OLD WRONG `Ketika dipasang:` inside a Komponen must FAIL', () => {
    expect(ok('Komponen W:\n    Ketika dipasang:\n        tampilkan "x"\n')).toBe(false);
  });
  it('OLD WRONG page-level `Ketika dipasang:` must FAIL (E4001)', () => {
    expect(
      codesOf('Halaman P:\n    data i = []\n    Ketika dipasang:\n        tampilkan "x"\n')
    ).toContain('E4001');
  });
});

describe('showcase sync v1.2 — examples/fitur-v1-2.pjs', () => {
  it('the showcase example compiles clean', () => {
    const src = readFileSync(resolve(__dirname, '..', 'examples', 'fitur-v1-2.pjs'), 'utf8');
    const r = Engine.compile(src);
    expect(r.success).toBe(true);
    expect(r.errors || []).toEqual([]);
  });
});

// ─── K1d (v1.3.1): reactive list + keyed diff docs / showcase ────────────────
describe('docs sync v1.3 — reactive list & keyed diff (reactivity.md)', () => {
  it('reactive non-keyed loop snippet compiles', () => {
    expect(
      ok(
        'Halaman P:\n    data daftar = []\n    Ulangi untuk item dari $daftar:\n        Buat teks: item.label\n'
      )
    ).toBe(true);
  });

  it('keyed `dengan kunci <expr>` snippet compiles and emits __keyedList', () => {
    const r = Engine.compile(
      'Halaman P:\n' +
        '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n' +
        '        Buat teks: item.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.errors || []).toEqual([]);
    // the documented keyed behaviour must actually be wired (honest keyword)
    expect(r.js).toContain('__keyedList(');
  });

  it('syntax-reference.md keyed loop snippet compiles', () => {
    expect(
      ok(
        'Halaman P:\n    data daftar = []\n    Ulangi untuk item dari $daftar dengan kunci item.id:\n        Buat li: item.label\n'
      )
    ).toBe(true);
  });
});

describe('showcase sync v1.3 — examples/keyed-list.pjs', () => {
  it('the keyed-list showcase example compiles clean', () => {
    const src = readFileSync(resolve(__dirname, '..', 'examples', 'keyed-list.pjs'), 'utf8');
    const r = Engine.compile(src);
    expect(r.success).toBe(true);
    expect(r.errors || []).toEqual([]);
  });

  it('the showcase actually exercises the keyed diff (emits __keyedList)', () => {
    const src = readFileSync(resolve(__dirname, '..', 'examples', 'keyed-list.pjs'), 'utf8');
    const r = Engine.compile(src);
    expect(r.js).toContain('__keyedList(');
    // core principle: showcase output carries zero eval / zero new Function
    expect(r.js).not.toMatch(/\beval\(|new Function\(/);
  });
});
