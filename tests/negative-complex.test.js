/**
 * D2.1 — Complex setup tests untuk error/warning codes yang di-defer dari D2.
 *
 * Test file ini mencakup error/warning codes yang membutuhkan setup kompleks
 * atau bug fix tambahan untuk dipicu. Bug fix yang terkait:
 *
 * - Engine: resolver warnings (W3002, W3003, W4003) sebelumnya silently
 *   discarded — engine hanya collect analyzer warnings. Fixed: engine
 *   sekarang forward resolver warnings ke result.
 * - Parser: type hint parsing (`data x: angka = "teks"`) sebelumnya
 *   hardcoded `typeHint = null`. Fixed: parser sekarang parse
 *   `: typeHint` setelah nama variabel.
 * - Analyzer: visitSaatStatement sebelumnya akses `node.target` sebagai
 *   string, padahal itu AST node. Fixed: extract nama dari Identifier/
 *   MemberExpression (same fix as resolver D1).
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/**
 * Helper: compile source dan cek apakah kode warning/error tertentu muncul.
 */
function expectDiagnostic(source, expectedCode, severity = 'warning') {
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

describe('D2.1 — Complex setup tests', () => {
  // ─── DEFERRED ERROR CODES ──────────────────────────────────────────────

  describe('Error codes (complex setup)', () => {
    it('E4201: dependency cycle pada data turunan', () => {
      // Two `turunan` that reference each other — resolver hoists both
      // via gatherGlobals, so both are visible. Analyzer detects the cycle.
      expectDiagnostic('turunan a = b tambah 1\nturunan b = a tambah 1', 'E4201', 'error');
    });
  });

  // ─── DEFERRED WARNING CODES ────────────────────────────────────────────

  describe('Warning codes (complex setup)', () => {
    it('W4003: deklarasi tetap tanpa nilai awal', () => {
      // `tetap x` without `= value` — analyzer emits W4003.
      expectDiagnostic('tetap x', 'W4003');
    });

    it('W3002: variabel shadowing scope luar', () => {
      // Declare `data x` in global scope, then `data x` again inside
      // a Fungsi body (new scope) — resolver emits W3002.
      expectDiagnostic('data x = 1\nFungsi halo():\n    data x = 2\n    kembalikan x', 'W3002');
    });

    it('W3003: watcher target bukan data reaktif (resolver)', () => {
      // `tetap x = 5` is non-reactive (const). `Saat x:` watches it —
      // resolver emits W3003 because tetap is not reactive.
      expectDiagnostic('tetap x = 5\nSaat x:\n    "berubah"', 'W3003');
    });

    it('W4001: type hint tidak cocok dengan nilai', () => {
      // `data x: angka = "teks"` — type hint says `angka` (number)
      // but value is string. Analyzer's checkTypeHint emits W4001.
      expectDiagnostic('data x: angka = "teks"', 'W4001');
    });

    it('W4104: watcher target bukan data reaktif (analyzer)', () => {
      // Same setup as W3003, but this warning comes from the analyzer
      // (not resolver). Both W3003 and W4104 should fire.
      expectDiagnostic('tetap x = 5\nSaat x:\n    "berubah"', 'W4104');
    });
  });

  // ─── FEATURE GAP — codes yang masih tidak dapat dipicu ─────────────────

  describe('Feature gap (deferred to future wave)', () => {
    // W4102 dan W4103: butuh keyword `simpan` untuk membuat explicit write
    // ke variabel. Tanpa `simpan`, writes hanya terjadi via init
    // (data/tetap/ubah = value) dan property assignment (x = value di
    // Buat body, yang di-parse sebagai atribut elemen, bukan SimpanStatement).
    it.skip('W4102: simbol ditulis tapi tidak pernah dibaca (needs `simpan` keyword)', () => {
      expectDiagnostic('ubah x = 5\nsimpan 10 ke x', 'W4102');
    });

    it.skip('W4103: data reaktif dimutasi tapi tidak dibaca (needs `simpan` keyword)', () => {
      expectDiagnostic('data x = 5\nsimpan 10 ke x', 'W4103');
    });

    // E5001: compiler silently ignores unknown AST node types instead
    // of throwing. E5001 only fires if compiler.compile() throws an
    // exception, which doesn't happen with current code.
    it.skip('E5001: node AST tidak didukung compiler (needs compiler validation)', () => {
      // Would need synthetic AST injection or compiler to validate node types
    });
  });
});
