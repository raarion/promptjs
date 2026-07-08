// @ts-check

/**
 * Keyword bilingual map: Indonesian/English word → token type.
 *
 * @module lexer/maps/keywords
 */

'use strict';

const TT = require('../core/token').TT;

const KEYWORDS = {
  // Indonesia
  buat: TT.TK_BUAT,
  jika: TT.TK_JIKA,
  kalau: TT.TK_JIKA, // [FIX] alias Indonesia untuk if/jika
  lainnya: TT.TK_LAINNYA,
  ulangi: TT.TK_ULANGI,
  untuk: TT.TK_UNTUK,
  pass: TT.TK_PASS,
  lewati: TT.TK_PASS,
  definisikan: TT.TK_DEFINSIKAN,
  data: TT.TK_DATA,
  tetap: TT.TK_TETAP,
  ubah: TT.TK_UBAH,
  turunan: TT.TK_TURUNAN,
  fungsi: TT.TK_FUNGSI,
  saat: TT.TK_SAAT,
  kembalikan: TT.TK_KEMBALIKAN,
  in: TT.TK_IN,
  dari: TT.TK_IN,
  sampai: TT.TK_SAMPAI, // [FIX] range loop upper bound keyword
  kali: TT.TK_KALI,
  halaman: TT.TK_BUAT, // Page root — synonym for Buat halaman
  komponen: TT.TK_DEFINSIKAN, // Component declaration (alias of Definisikan)

  // English
  create: TT.TK_BUAT,
  page: TT.TK_BUAT, // Page root — synonym for Create page
  component: TT.TK_DEFINSIKAN, // Component declaration (alias of Define)
  if: TT.TK_JIKA,
  else: TT.TK_LAINNYA,
  loop: TT.TK_ULANGI,
  for: TT.TK_UNTUK,
  from: TT.TK_IN,
  until: TT.TK_SAMPAI, // [FIX] English alias for range loop upper bound
  times: TT.TK_KALI,
  define: TT.TK_DEFINSIKAN,
  state: TT.TK_DATA,
  const: TT.TK_TETAP,
  let: TT.TK_UBAH,
  derived: TT.TK_TURUNAN,
  func: TT.TK_FUNGSI,
  function: TT.TK_FUNGSI, // [FIX] English alias for 'func' (full form)
  watch: TT.TK_SAAT,
  return: TT.TK_KEMBALIKAN,
  skip: TT.TK_PASS,

  // Boolean & null literals (bilingual)
  // Catatan: `salah` juga muncul sebagai event alias (`on_salah` → `error`),
  // tapi di konteks expression (bukan setelah `on_`), `salah` harus jadi boolean literal.
  benar: TT.TK_BENAR,
  true: TT.TK_BENAR,
  salah: TT.TK_SALAH,
  false: TT.TK_SALAH,
  kosong: TT.TK_KOSONG,
  null: TT.TK_KOSONG,

  // ─── Action statements (Wave G) ──────────────────────────────────────
  simpan: TT.TK_SIMPAN,
  save: TT.TK_SIMPAN,
  tambahkan: TT.TK_TAMBAHKAN,
  append: TT.TK_TAMBAHKAN,
  kurangi: TT.TK_KURANGI,
  remove: TT.TK_KURANGI,
  sisipkan: TT.TK_SISIPKAN,
  insert: TT.TK_SISIPKAN,
  ketika: TT.TK_KETIKA,
  when: TT.TK_KETIKA,
  berhenti: TT.TK_BERHENTI,
  break: TT.TK_BERHENTI,
  selama: TT.TK_SELAMA, // [FIX] while loop
  while: TT.TK_SELAMA, // [FIX] English alias
  tampilkan: TT.TK_TAMPILKAN,
  show: TT.TK_TAMPILKAN,
  sembunyikan: TT.TK_SEMBUNYIKAN,
  hide: TT.TK_SEMBUNYIKAN,
  hapus: TT.TK_HAPUS,
  delete: TT.TK_HAPUS,
  kosongkan: TT.TK_KOSONGKAN,
  clear: TT.TK_KOSONGKAN,
  perbarui: TT.TK_PERBARUI,
  update: TT.TK_PERBARUI,
  ambil: TT.TK_AMBIL,
  fetch: TT.TK_AMBIL,
  arahkan: TT.TK_ARAHKAN,
  navigate: TT.TK_ARAHKAN,
  muatulang: TT.TK_MUAT_ULANG,
  reload: TT.TK_MUAT_ULANG,
  kembali: TT.TK_KEMBALI,
  back: TT.TK_KEMBALI,
  jalankan: TT.TK_JALANKAN,
  run: TT.TK_JALANKAN,
  gunakan: TT.TK_GUNAKAN,
  use: TT.TK_GUNAKAN,
  dipasang: TT.TK_DIPASANG,
  mounted: TT.TK_DIPASANG,
  dilepas: TT.TK_DILEPAS,
  unmounted: TT.TK_DILEPAS,
  ke: TT.TK_KE,
  to: TT.TK_KE,
  setelah: TT.TK_SETELAH, // [FIX] setelah <target> selesai: (post-completion hook)
  after: TT.TK_SETELAH, // [FIX] English alias
};

module.exports = KEYWORDS;
