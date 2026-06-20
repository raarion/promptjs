// @ts-check

/**
 * PromptJS v0.2 — Konstanta Tipe Token / Token Type Constants
 * ============================================================================
 *
 * Daftar lengkap tipe token yang dikenali Parser PromptJS.
 * Konstanta ini wajib digunakan alih-alih string literal hard-coded.
 * Berdasarkan: RFC-PARSER-001 §2.3 dan PromptJS-grammar-spec_v0.3.1 §14
 *
 * File ini hanya berisi konstanta string dan array — tidak ada fungsi
 * yang memerlukan JSDoc.
 */

// ─── Struktur ──────────────────────────────────────────────
const TK_BUAT = 'TK_BUAT';
const TK_TAMPILKAN = 'TK_TAMPILKAN';
const TK_SEMBUNYIKAN = 'TK_SEMBUNYIKAN';
const TK_HAPUS = 'TK_HAPUS';
const TK_KOSONGKAN = 'TK_KOSONGKAN';
const TK_PERBARUI = 'TK_PERBARUI';

// ─── Event / Perilaku ──────────────────────────────────────
const TK_KETIKA = 'TK_KETIKA';
const TK_DIKLIK = 'TK_DIKLIK';
const TK_DIKETIK = 'TK_DIKETIK';
const TK_DISUBMIT = 'TK_DISUBMIT';
const TK_DIMUAT = 'TK_DIMUAT';
const TK_DIUBAH = 'TK_DIUBAH';
const TK_DIFOKUS = 'TK_DIFOKUS';
const TK_DITINGGAL = 'TK_DITINGGAL';
const TK_DITEKAN = 'TK_DITEKAN';
const TK_DILEPAS = 'TK_DILEPAS';
const TK_DIARAHKAN = 'TK_DIARAHKAN';
const TK_DITINGGAL_KURSOR = 'TK_DITINGGAL_KURSOR';
const TK_DIGULIR = 'TK_DIGULIR';
const TK_DIPASANG = 'TK_DIPASANG';
const TK_DILEPAS_DARI_DOM = 'TK_DILEPAS_DARI_DOM';

// ─── Alur ──────────────────────────────────────────────────
const TK_LALU = 'TK_LALU';
const TK_SETELAH = 'TK_SETELAH';

// ─── Logika ────────────────────────────────────────────────
const TK_JIKA = 'TK_JIKA';
const TK_KALAU = 'TK_KALAU';
const TK_JIKA_TIDAK = 'TK_JIKA_TIDAK';
const TK_ULANGI = 'TK_ULANGI';
const TK_SELAMA = 'TK_SELAMA';
const TK_BERHENTI = 'TK_BERHENTI';
const TK_LEWATI = 'TK_LEWATI';
const TK_KEMBALIKAN = 'TK_KEMBALIKAN';

// ─── Data / Reaktif ────────────────────────────────────────
const TK_DATA = 'TK_DATA';
const TK_TURUNAN = 'TK_TURUNAN';
const TK_SIMPAN = 'TK_SIMPAN';
const TK_AMBIL = 'TK_AMBIL';
const TK_TETAP = 'TK_TETAP';
const TK_UBAH = 'TK_UBAH';
const TK_TAMBAHKAN = 'TK_TAMBAHKAN';
const TK_SISIPKAN = 'TK_SISIPKAN';
const TK_KURANGI = 'TK_KURANGI';
const TK_SAAT = 'TK_SAAT';
const TK_BERUBAH = 'TK_BERUBAH';

// ─── Komponen / Fungsi ─────────────────────────────────────
const TK_KOMPONEN = 'TK_KOMPONEN';
const TK_GUNAKAN = 'TK_GUNAKAN';
const TK_DENGAN = 'TK_DENGAN';
const TK_DI = 'TK_DI';
const TK_DARI = 'TK_DARI';
const TK_KE = 'TK_KE';
const TK_FUNGSI = 'TK_FUNGSI';
const TK_JALANKAN = 'TK_JALANKAN';

// ─── Jaringan / Navigasi ───────────────────────────────────
const TK_BERHASIL = 'TK_BERHASIL';
const TK_GAGAL = 'TK_GAGAL';
const TK_SELALU = 'TK_SELALU';
const TK_ARAHKAN = 'TK_ARAHKAN';
const TK_MUAT_ULANG = 'TK_MUAT_ULANG';
const TK_KEMBALI = 'TK_KEMBALI';

// ─── Literal ───────────────────────────────────────────────
const TK_BENAR = 'TK_BENAR';
const TK_SALAH = 'TK_SALAH';
const TK_KOSONG = 'TK_KOSONG';
const TK_LITERAL_TEKS = 'TK_LITERAL_TEKS';
const TK_LITERAL_ANGKA = 'TK_LITERAL_ANGKA';

// ─── Operator Kata ─────────────────────────────────────────
const TK_DAN = 'TK_DAN';
const TK_ATAU = 'TK_ATAU';
const TK_BUKAN = 'TK_BUKAN';
const TK_SAMA_DENGAN = 'TK_SAMA_DENGAN';
const TK_TIDAK_SAMA_DENGAN = 'TK_TIDAK_SAMA_DENGAN';
const TK_LEBIH_DARI = 'TK_LEBIH_DARI';
const TK_KURANG_DARI = 'TK_KURANG_DARI';
const TK_PALING_SEDIKIT = 'TK_PALING_SEDIKIT';
const TK_PALING_BANYAK = 'TK_PALING_BANYAK';
const TK_ADA_DI = 'TK_ADA_DI';
const TK_TIDAK_ADA_DI = 'TK_TIDAK_ADA_DI';

// ─── Operator Aritmatika Kata ──────────────────────────────────────────────
const TK_MOD = 'TK_MOD';
const TK_PANGKAT = 'TK_PANGKAT';

// ─── Operator Simbol ───────────────────────────────────────
const TK_PANAH = 'TK_PANAH';
const TK_TITIK_DUA = 'TK_TITIK_DUA';
const TK_KOMA = 'TK_KOMA';
const TK_TITIK = 'TK_TITIK';
const TK_PLUS = 'TK_PLUS';
const TK_MINUS = 'TK_MINUS';
const TK_BINTANG = 'TK_BINTANG';
const TK_GARIS_MIRING = 'TK_GARIS_MIRING';
const TK_TANDA_SAMA = 'TK_TANDA_SAMA';

// ─── Kurung ────────────────────────────────────────────────
const TK_KURUNG_BUKA = 'TK_KURUNG_BUKA';
const TK_KURUNG_TUTUP = 'TK_KURUNG_TUTUP';
const TK_KURAWAL_BUKA = 'TK_KURAWAL_BUKA';
const TK_KURAWAL_TUTUP = 'TK_KURAWAL_TUTUP';
const TK_KURUNG_SIKU_BUKA = 'TK_KURUNG_SIKU_BUKA';
const TK_KURUNG_SIKU_TUTUP = 'TK_KURUNG_SIKU_TUTUP';

// ─── Selektor ──────────────────────────────────────────────
const TK_ID = 'TK_ID';
const TK_CLASS = 'TK_CLASS';
const TK_ATRIBUT = 'TK_ATRIBUT';

// ─── Identifier ────────────────────────────────────────────
const TK_IDENTIFIER = 'TK_IDENTIFIER';

// ─── Komentar ──────────────────────────────────────────────
const TK_KOMENTAR_BIASA = 'TK_KOMENTAR_BIASA';
const TK_KOMENTAR_DOC = 'TK_KOMENTAR_DOC';

// ─── Interop / Node ────────────────────────────────────────
const TK_LANGSUNG = 'TK_LANGSUNG';
const TK_BLOK_LANGSUNG = 'TK_BLOK_LANGSUNG';
const TK_FRAGMEN = 'TK_FRAGMEN';

// ─── Kontrol Whitespace & EOF ──────────────────────────────
const TK_INDENT = 'TK_INDENT';
const TK_DEDENT = 'TK_DEDENT';
const TK_BARIS_BARU = 'TK_BARIS_BARU';
const TK_EOF = 'TK_EOF';

// ─── Event Token Set ───────────────────────────────────────
const EVENT_TOKENS = [
  TK_DIKLIK,
  TK_DIKETIK,
  TK_DISUBMIT,
  TK_DIMUAT,
  TK_DIUBAH,
  TK_DIFOKUS,
  TK_DITINGGAL,
  TK_DITEKAN,
  TK_DILEPAS,
  TK_DIARAHKAN,
  TK_DITINGGAL_KURSOR,
  TK_DIGULIR,
  TK_DIPASANG,
  TK_DILEPAS_DARI_DOM,
];

// ─── Keyword Statement Dispatch Map ────────────────────────
const STATEMENT_KEYWORD_TOKENS = [
  TK_BUAT,
  TK_TAMPILKAN,
  TK_SEMBUNYIKAN,
  TK_HAPUS,
  TK_KOSONGKAN,
  TK_PERBARUI,
  TK_KETIKA,
  TK_SAAT,
  TK_SETELAH,
  TK_JIKA,
  TK_ULANGI,
  TK_SELAMA,
  TK_BERHENTI,
  TK_LEWATI,
  TK_KEMBALIKAN,
  TK_DATA,
  TK_TETAP,
  TK_UBAH,
  TK_TURUNAN,
  TK_SIMPAN,
  TK_TAMBAHKAN,
  TK_KURANGI,
  TK_SISIPKAN,
  TK_AMBIL,
  TK_KOMPONEN,
  TK_GUNAKAN,
  TK_FUNGSI,
  TK_JALANKAN,
  TK_ARAHKAN,
  TK_MUAT_ULANG,
  TK_KEMBALI,
  TK_LANGSUNG,
];

// ─── Sinkronisasi Kontekstual ──────────────────────────────
const SYNC_STATEMENT_TOKENS = STATEMENT_KEYWORD_TOKENS.slice();

// Ekspresi infix operator tokens
const INFIX_OPERATOR_TOKENS = [
  TK_PLUS,
  TK_MINUS,
  TK_BINTANG,
  TK_GARIS_MIRING,
  TK_MOD,
  TK_PANGKAT,
  TK_DAN,
  TK_ATAU,
  TK_SAMA_DENGAN,
  TK_TIDAK_SAMA_DENGAN,
  TK_LEBIH_DARI,
  TK_KURANG_DARI,
  TK_PALING_SEDIKIT,
  TK_PALING_BANYAK,
  TK_ADA_DI,
  TK_TIDAK_ADA_DI,
];

module.exports = {
  TK_BUAT,
  TK_TAMPILKAN,
  TK_SEMBUNYIKAN,
  TK_HAPUS,
  TK_KOSONGKAN,
  TK_PERBARUI,
  TK_KETIKA,
  TK_DIKLIK,
  TK_DIKETIK,
  TK_DISUBMIT,
  TK_DIMUAT,
  TK_DIUBAH,
  TK_DIFOKUS,
  TK_DITINGGAL,
  TK_DITEKAN,
  TK_DILEPAS,
  TK_DIARAHKAN,
  TK_DITINGGAL_KURSOR,
  TK_DIGULIR,
  TK_DIPASANG,
  TK_DILEPAS_DARI_DOM,
  TK_LALU,
  TK_SETELAH,
  TK_JIKA,
  TK_KALAU,
  TK_JIKA_TIDAK,
  TK_ULANGI,
  TK_SELAMA,
  TK_BERHENTI,
  TK_LEWATI,
  TK_KEMBALIKAN,
  TK_DATA,
  TK_TURUNAN,
  TK_SIMPAN,
  TK_AMBIL,
  TK_TETAP,
  TK_UBAH,
  TK_TAMBAHKAN,
  TK_SISIPKAN,
  TK_KURANGI,
  TK_SAAT,
  TK_BERUBAH,
  TK_KOMPONEN,
  TK_GUNAKAN,
  TK_DENGAN,
  TK_DI,
  TK_DARI,
  TK_KE,
  TK_FUNGSI,
  TK_JALANKAN,
  TK_BERHASIL,
  TK_GAGAL,
  TK_SELALU,
  TK_ARAHKAN,
  TK_MUAT_ULANG,
  TK_KEMBALI,
  TK_BENAR,
  TK_SALAH,
  TK_KOSONG,
  TK_LITERAL_TEKS,
  TK_LITERAL_ANGKA,
  TK_DAN,
  TK_ATAU,
  TK_BUKAN,
  TK_SAMA_DENGAN,
  TK_TIDAK_SAMA_DENGAN,
  TK_LEBIH_DARI,
  TK_KURANG_DARI,
  TK_PALING_SEDIKIT,
  TK_PALING_BANYAK,
  TK_ADA_DI,
  TK_TIDAK_ADA_DI,
  TK_MOD,
  TK_PANGKAT,
  TK_PANAH,
  TK_TITIK_DUA,
  TK_KOMA,
  TK_TITIK,
  TK_PLUS,
  TK_MINUS,
  TK_BINTANG,
  TK_GARIS_MIRING,
  TK_TANDA_SAMA,
  TK_KURUNG_BUKA,
  TK_KURUNG_TUTUP,
  TK_KURAWAL_BUKA,
  TK_KURAWAL_TUTUP,
  TK_KURUNG_SIKU_BUKA,
  TK_KURUNG_SIKU_TUTUP,
  TK_ID,
  TK_CLASS,
  TK_ATRIBUT,
  TK_IDENTIFIER,
  TK_KOMENTAR_BIASA,
  TK_KOMENTAR_DOC,
  TK_LANGSUNG,
  TK_BLOK_LANGSUNG,
  TK_FRAGMEN,
  TK_INDENT,
  TK_DEDENT,
  TK_BARIS_BARU,
  TK_EOF,
  EVENT_TOKENS,
  STATEMENT_KEYWORD_TOKENS,
  SYNC_STATEMENT_TOKENS,
  INFIX_OPERATOR_TOKENS,
};
