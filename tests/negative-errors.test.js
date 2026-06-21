/**
 * D2 — Negative-test matrix untuk error codes yang aktif di-throw.
 *
 * Setiap test memverifikasi bahwa kode error `E####` yang spesifik muncul
 * untuk input yang salah. Ini melengkapi D1 (snapshot codegen) dengan
 * tes negatif yang memastikan error handling bekerja dengan benar.
 *
 * Error codes yang TIDAK bisa dipicu karena feature gap (keyword belum
 * diimplementasi di lexer) dicatat di tests/reports/D2-negative.md
 * bagian "Feature Gap".
 *
 * Bug fix dari D1 yang juga dites di sini:
 * - E3001 untuk `namaTidakAda` (sebelum D1, `benar`/`salah`/`kosong`
 *   salah dikenali sebagai identifier → E3001 false positive)
 * - E3001 untuk `Saat hitung` (sebelum D1, target SaatStatement
 *   salah di-stringify → "[object Object]" alih-alih nama identifier)
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/**
 * Helper: compile source dan cek apakah kode error tertentu muncul.
 *
 * @param {string} source - Source code `.pjs`
 * @param {string} expectedCode - Kode error yang diharapkan (mis. 'E1001')
 * @param {string} [severity] - 'error' (default) atau 'warning'
 * @returns {Object} Result compile
 */
function expectError(source, expectedCode, severity = 'error') {
  const r = Engine.compile(source);
  const diags = severity === 'warning' ? r.warnings : r.errors;
  const found = (diags || []).some((e) => e.code === expectedCode);
  if (!found) {
    const allCodes = [...(r.errors || []), ...(r.warnings || [])].map(
      (e) => `${e.code}${e.severity === 'warning' ? '(W)' : ''}`
    );
    expect.fail(`Expected ${expectedCode} but got: [${allCodes.join(', ')}]. success=${r.success}`);
  }
  return r;
}

describe('D2 — Negative-test matrix', () => {
  // ─── LEXER ERRORS (E1xxx) ──────────────────────────────────────────────

  describe('Lexer errors (E1xxx)', () => {
    it('E1001: indentasi ganjil (bukan kelipatan 2)', () => {
      expectError('Buat h1:\n "Halo"', 'E1001');
    });

    it('E1002: indentasi tidak konsisten (dedent ke level yang tidak ada)', () => {
      expectError('Buat h1:\n    "a"\n  "b"', 'E1002');
    });

    it('E1003: string tidak ditutup', () => {
      expectError('Buat h1:\n    "Halo', 'E1003');
    });

    it('E1004: block opener tanpa colon', () => {
      expectError('Buat h1', 'E1004');
    });

    it('E1005: karakter tidak dikenali', () => {
      expectError('Buat h1: @#$', 'E1005');
    });
  });

  // ─── PARSER ERRORS (E2xxx) ─────────────────────────────────────────────

  describe('Parser errors (E2xxx)', () => {
    it('E2001: token tidak sesuai yang diharapkan', () => {
      expectError('Ulangi untuk:', 'E2001');
    });

    it('E2010: expected "untuk/for" setelah "ulangi/loop"', () => {
      expectError('Ulangi 3: "item"', 'E2010');
    });
  });

  // ─── RESOLVER ERRORS (E3xxx) ───────────────────────────────────────────

  describe('Resolver errors (E3xxx)', () => {
    it('E3001: identifier tidak dideklarasikan', () => {
      expectError('tetap x = namaTidakAda', 'E3001');
    });

    it('E3002: simbol duplikat dalam scope yang sama', () => {
      expectError('data x = 1\ndata x = 2', 'E3002');
    });

    it('E3004: menggunakan komponen sebelum deklarasi', () => {
      expectError('Buat TidakAdaKomponen(nama: "hai")', 'E3004');
    });
  });

  // ─── ANALYZER ERRORS (E4xxx) ───────────────────────────────────────────

  describe('Analyzer errors (E4xxx)', () => {
    it('E4005: parameter duplikat dalam komponen', () => {
      expectError('Komponen Kartu(judul, judul):\n    Buat div:\n        "hai"', 'E4005');
    });

    it('E4012: "lewati" di luar loop', () => {
      expectError('lewati', 'E4012');
    });

    it('E4013: "kembalikan" di luar fungsi/komponen', () => {
      expectError('kembalikan 5', 'E4013');
    });
  });

  // ─── ENGINE ERRORS (E0xxx, E5xxx) ──────────────────────────────────────

  describe('Engine errors (E0xxx)', () => {
    it('E0000: system error (file tidak dapat dibaca)', () => {
      const r = Engine.compileFile('/path/tidak/ada.pjs');
      const found = (r.errors || []).some((e) => e.code === 'E0000');
      if (!found) {
        expect.fail(`Expected E0000 but got: ${JSON.stringify(r.errors)}`);
      }
    });
  });

  // ─── WARNING CODES ─────────────────────────────────────────────────────

  describe('Warning codes (Wxxxx)', () => {
    it('W4101: simbol dideklarasikan tapi tidak digunakan', () => {
      expectError('tetap x = 5\nBuat h1:\n    "Halo"', 'W4101', 'warning');
    });

    // Wave G: W4003 dan W3002 sekarang terpicu berkat bug fix D2.1
    // (engine forward resolver warnings ke result).
    it('W4003: deklarasi tetap tanpa nilai awal', () => {
      expectError('tetap x', 'W4003', 'warning');
    });

    it('W3002: variabel shadowing scope luar', () => {
      expectError(
        'data x = 1\nFungsi halo():\n    data x = 2\n    kembalikan x',
        'W3002',
        'warning'
      );
    });
  });

  // ─── WAVE G: Newly triggerable error codes ──────────────────────────
  // These error codes were feature gaps in D2/D2.1 because the keywords
  // were not implemented. Wave G activated the keywords, so these codes
  // can now be tested.

  describe('Wave G — newly triggerable error codes', () => {
    it('E3003: menulis ke variabel tetap (const) via simpan', () => {
      expectError('tetap x = 5\nsimpan 10 ke x', 'E3003', 'error');
    });

    it('E3005: ketika tanpa target di luar blok buat/komponen', () => {
      expectError('ketika diklik:\n    "hai"', 'E3005', 'error');
    });

    it('E4001: lifecycle hook di luar komponen', () => {
      expectError('dipasang:\n    "hai"', 'E4001', 'error');
    });

    it('E4011: berhenti di luar loop/handler', () => {
      expectError('berhenti', 'E4011', 'error');
    });

    it('W4102: simbol ditulis tapi tidak pernah dibaca (via simpan)', () => {
      expectError('ubah x = 5\nsimpan 10 ke x', 'W4102', 'warning');
    });

    it('W4103: data reaktif dimutasi tapi tidak dibaca (via simpan)', () => {
      expectError('data x = 5\nsimpan 10 ke x', 'W4103', 'warning');
    });
  });

  // ─── STATEMENT TYPE POSITIVE TESTS ─────────────────────────────────────
  // Verifikasi bahwa statement type yang sebelumnya belum ada test khusus
  // (PassStatement, FungsiDeclaration, SaatStatement, KembalikanStatement)
  // sekarang compile dengan benar (bug fix D1 memungkinkan ini).

  describe('Statement type positive tests', () => {
    it('PassStatement: "pass" compiles to empty element', () => {
      const r = Engine.compile('Buat ruang.kotak:\n    pass');
      expect(r.success).toBe(true);
      expect(r.js).toContain('document.createElement("div")');
      expect(r.js).not.toContain('continue;');
    });

    it('PassStatement: "lewati" compiles to empty element', () => {
      const r = Engine.compile('Buat ruang.kotak:\n    lewati');
      expect(r.success).toBe(true);
    });

    it('FungsiDeclaration: function with parameters compiles', () => {
      const r = Engine.compile('Fungsi tambah(a, b):\n    kembalikan a + b');
      expect(r.success).toBe(true);
      expect(r.js).toContain('function tambah(a, b)');
    });

    it('SaatStatement: watcher compiles to __watch', () => {
      const r = Engine.compile('data hitung = 0\nSaat hitung:\n    "berubah"');
      expect(r.success).toBe(true);
      expect(r.js).toContain('__watch');
    });

    it('KembalikanStatement: return inside function compiles', () => {
      const r = Engine.compile('Fungsi halo():\n    kembalikan "hai"');
      expect(r.success).toBe(true);
      expect(r.js).toContain('return "hai"');
    });
  });
});
