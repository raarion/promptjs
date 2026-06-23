/**
 * D1 — Snapshot Codegen Tests
 *
 * Mengunci output codegen per statement type dan expression type,
 * sehingga regression terdeteksi otomatis. Snapshot berisi user code
 * saja (bagian setelah runtime helpers) supaya perubahan runtime
 * helpers tidak membuat semua snapshot fail.
 *
 * Bug fix yang terkait dengan test ini:
 * - Lexer: _tokenizeDeclaration sekarang parse nama identifier secara
 *   eksplisit untuk Fungsi/Komponen/Data/Tetap/Ubah/Turunan/Saat,
 *   menghindari collision dengan word operators (`tambah`/`kali`/`dan`).
 * - Resolver: visitSaatStatement sekarang handle target berupa AST node
 *   (Identifier/MemberExpression), bukan hanya string.
 * - Compiler: visitBuatStatement untuk fragment sekarang mewariskan
 *   compiledVarName dari parent, sehingga event handler tanpa target
 *   eksplisit (mis. `on_klik = ...` di dalam multi-child Buat body)
 *   resolve ke parent element yang benar.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

/**
 * Ekstrak user code dari output compiler — bagian setelah
 * `// === User Code ===` dan sebelum IIFE closer `})();`.
 *
 * @param {string} js - Full compiler output
 * @returns {string} User code saja (trim), atau full output kalau marker tidak ditemukan
 */
function extractUserCode(js) {
  if (!js) return '';
  const startMarker = '// === User Code ===';
  const startIdx = js.indexOf(startMarker);
  if (startIdx < 0) return js;
  const afterStart = js.slice(startIdx + startMarker.length);
  const endMatch = afterStart.match(/\}\)\(\);\s*$/);
  if (!endMatch) return afterStart.trim();
  return afterStart.slice(0, endMatch.index).trim();
}

/**
 * Compile source dan kembalikan user code saja.
 *
 * @param {string} source - Source code `.pjs`
 * @returns {string} User code hasil compile
 */
function compileUser(source) {
  const r = Engine.compile(source);
  return extractUserCode(r.js);
}

describe('D1 — Snapshot Codegen', () => {
  // ─── STATEMENT TYPES ───────────────────────────────────────────────────

  describe('Statement: BuatStatement', () => {
    it('buat-simple: Buat h1: "Hello"', () => {
      expect(compileUser('Buat h1: "Hello"')).toMatchSnapshot();
    });

    it('buat-selector: Buat tombol.cta#daftar:', () => {
      expect(compileUser('Buat tombol.cta#daftar:\n    "Klik"')).toMatchSnapshot();
    });

    it('buat-bilingual: Create div.box:', () => {
      expect(compileUser('Create div.box:\n    "Content"')).toMatchSnapshot();
    });

    it('buat-fragment: auto-fragment multi-child', () => {
      expect(compileUser('Buat ruang:\n    "First"\n    "Second"')).toMatchSnapshot();
    });

    it('buat-pass: empty body marker', () => {
      expect(compileUser('Buat ruang.kotak:\n    pass')).toMatchSnapshot();
    });
  });

  describe('Statement: JikaStatement', () => {
    it('jika-basic: Jika stok > 0', () => {
      expect(
        compileUser('tetap stok = 5\nBuat ruang:\n    Jika stok > 0:\n        "Ada"')
      ).toMatchSnapshot();
    });

    it('jika-lainnya: with else branch', () => {
      expect(
        compileUser(
          'tetap stok = 0\nBuat ruang:\n    Jika stok > 0:\n        "Ada"\n    Lainnya:\n        "Habis"'
        )
      ).toMatchSnapshot();
    });

    it('jika-word-operator: Jika stok lebih dari 0', () => {
      expect(
        compileUser('tetap stok = 5\nBuat ruang:\n    Jika stok lebih dari 0:\n        "Ada"')
      ).toMatchSnapshot();
    });
  });

  describe('Statement: UlangiStatement', () => {
    it('ulangi-counted: Ulangi 3 kali', () => {
      expect(compileUser('Buat ul:\n    Ulangi 3 kali:\n        "Item"')).toMatchSnapshot();
    });

    it('ulangi-iterasi: Ulangi untuk item in daftar', () => {
      expect(
        compileUser(
          'tetap daftar = [1, 2, 3]\nBuat ul:\n    Ulangi untuk item in daftar:\n        "Item"'
        )
      ).toMatchSnapshot();
    });

    it('ulangi-rentang: Ulangi untuk i in [1,2,3,4,5]', () => {
      // Catatan: range loop `Ulangi i dari A sampai B` adalah feature gap
      // yang belum diimplementasi di parser. Sebagai workaround, pakai
      // array literal sebagai source iterasi.
      expect(
        compileUser('Buat ul:\n    Ulangi untuk i in [1, 2, 3, 4, 5]:\n        "Item"')
      ).toMatchSnapshot();
    });
  });

  describe('Statement: Declarations', () => {
    it('data-declaration: Data hitung = 0', () => {
      expect(compileUser('data hitung = 0\nBuat ruang:\n    "Halo"')).toMatchSnapshot();
    });

    it('tetap-declaration: Tetap PI = 3.14', () => {
      expect(compileUser('tetap PI = 3.14\nBuat ruang:\n    "Halo"')).toMatchSnapshot();
    });

    it('ubah-declaration: Ubah nama = "Budi"', () => {
      expect(compileUser('ubah nama = "Budi"\nBuat ruang:\n    "Halo"')).toMatchSnapshot();
    });

    it('turunan-declaration: Turunan total = a + b', () => {
      expect(
        compileUser('data a = 5\ndata b = 3\nturunan total = a + b\nBuat ruang:\n    "Halo"')
      ).toMatchSnapshot();
    });
  });

  describe('Statement: FungsiDeclaration', () => {
    it('fungsi-no-params: Fungsi halo():', () => {
      expect(compileUser('Fungsi halo():\n    kembalikan "hai"')).toMatchSnapshot();
    });

    it('fungsi-with-params: Fungsi tambah(a, b):', () => {
      expect(compileUser('Fungsi tambah(a, b):\n    kembalikan a + b')).toMatchSnapshot();
    });
  });

  describe('Statement: KomponenDeclaration', () => {
    it('komponen-basic: Komponen Kartu(judul):', () => {
      expect(
        compileUser('Komponen Kartu(judul):\n    Buat div:\n        "Kartu"')
      ).toMatchSnapshot();
    });
  });

  describe('Statement: SaatStatement', () => {
    it('saat-basic: Saat hitung', () => {
      expect(compileUser('data hitung = 0\nSaat hitung:\n    "berubah"')).toMatchSnapshot();
    });
  });

  describe('Statement: KembalikanStatement', () => {
    it('kembalikan-value: kembalikan "hai"', () => {
      expect(compileUser('Fungsi halo():\n    kembalikan "hai"')).toMatchSnapshot();
    });
  });

  describe('Statement: PassStatement', () => {
    it('pass-lewati: lewati keyword', () => {
      expect(compileUser('Buat ruang:\n    lewati')).toMatchSnapshot();
    });
  });

  describe('Statement: TextNode', () => {
    it('textnode-inline: inline text in Buat', () => {
      expect(compileUser('Buat ruang:\n    "Hello PromptJS!"')).toMatchSnapshot();
    });
  });

  describe('Statement: OnEventStatement', () => {
    it('on-event-klik: on_klik = alert("hi")', () => {
      expect(compileUser('Buat tombol:\n    "Klik"\n    on_klik = alert("hi")')).toMatchSnapshot();
    });
  });

  describe('Statement: PropertyLine', () => {
    it('property-basic: kelas = "tombol"', () => {
      expect(compileUser('Buat tombol:\n    kelas = "tombol-utama"')).toMatchSnapshot();
    });
  });

  // ─── EXPRESSIONS ───────────────────────────────────────────────────────

  describe('Expression: Literal', () => {
    it('literal-number: tetap x = 42', () => {
      expect(compileUser('tetap x = 42')).toMatchSnapshot();
    });

    it('literal-string: tetap nama = "Budi"', () => {
      expect(compileUser('tetap nama = "Budi"')).toMatchSnapshot();
    });

    it('literal-boolean: tetap aktif = benar', () => {
      expect(compileUser('tetap aktif = benar')).toMatchSnapshot();
    });

    it('literal-null: tetap kosong = kosong', () => {
      expect(compileUser('tetap kosong = kosong')).toMatchSnapshot();
    });
  });

  describe('Expression: BinaryExpression', () => {
    it('binary-symbol: 3 + 4 * 2', () => {
      expect(compileUser('tetap x = 3 + 4 * 2')).toMatchSnapshot();
    });

    it('binary-word: 3 tambah 4 kali 2', () => {
      expect(compileUser('tetap x = 3 tambah 4 kali 2')).toMatchSnapshot();
    });

    it('binary-compare: x > 5', () => {
      expect(compileUser('tetap x = 5\ntetap y = x > 3')).toMatchSnapshot();
    });

    it('binary-logic: benar dan salah', () => {
      expect(compileUser('tetap x = benar dan salah')).toMatchSnapshot();
    });
  });

  describe('Expression: UnaryExpression', () => {
    it('unary-not: tidak benar', () => {
      expect(compileUser('tetap x = tidak benar')).toMatchSnapshot();
    });

    it('unary-negate: -5', () => {
      expect(compileUser('tetap x = -5')).toMatchSnapshot();
    });
  });

  describe('Expression: ConditionalExpression (ternary)', () => {
    it('ternary-basic: x > 3 ? "besar" : "kecil"', () => {
      expect(compileUser('tetap x = 5\ntetap y = x > 3 ? "besar" : "kecil"')).toMatchSnapshot();
    });
  });

  describe('Expression: MemberExpression', () => {
    it('member-access: orang.nama', () => {
      expect(compileUser('tetap orang = { nama: "Budi" }\ntetap n = orang.nama')).toMatchSnapshot();
    });
  });

  describe('Expression: CallExpression', () => {
    it('call-builtin: panjang(arr)', () => {
      expect(compileUser('tetap arr = [1, 2, 3]\ntetap n = panjang(arr)')).toMatchSnapshot();
    });

    it('call-js-global: alert("hi")', () => {
      expect(compileUser('Buat tombol:\n    on_klik = alert("hi")')).toMatchSnapshot();
    });
  });

  describe('Expression: ObjectLiteral', () => {
    it('object-basic: { nama: "Budi", umur: 30 }', () => {
      expect(compileUser('tetap orang = { nama: "Budi", umur: 30 }')).toMatchSnapshot();
    });

    it('object-string-key: { "nama-lengkap": "Budi" }', () => {
      expect(compileUser('tetap orang = { "nama-lengkap": "Budi" }')).toMatchSnapshot();
    });
  });

  describe('Expression: ArrayLiteral', () => {
    it('array-basic: [1, 2, 3]', () => {
      expect(compileUser('tetap arr = [1, 2, 3]')).toMatchSnapshot();
    });

    it('array-mixed: [1, "dua", benar]', () => {
      expect(compileUser('tetap arr = [1, "dua", benar]')).toMatchSnapshot();
    });
  });

  // ─── COMPOSITE (end-to-end) ────────────────────────────────────────────

  describe('Composite: end-to-end', () => {
    it('composite-counter: data + tombol + on_klik + alert', () => {
      // Catatan: `simpan ... ke ...` adalah feature gap yang belum
      // diimplementasi. Sebagai composite test yang end-to-end, kita
      // pakai alert() (JS global) untuk verifikasi event handler bekerja.
      expect(
        compileUser(`data hitung = 0
Buat tombol:
    "Klik aku"
    on_klik = alert(hitung)`)
      ).toMatchSnapshot();
    });

    it('composite-list: Ulangi dengan Data array', () => {
      expect(
        compileUser(`tetap items = ["Apel", "Jeruk", "Mangga"]
Buat ul:
    Ulangi untuk item in items:
        Buat li:
            item`)
      ).toMatchSnapshot();
    });
  });
});
