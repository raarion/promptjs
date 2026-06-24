# Kata Kunci / Keywords

> docs/language/ → **Keywords**
> ← [Directives](directives.md) · [Expressions](expressions.md) →

---

PromptJS mendukung kata kunci dwibahasa — Indonesia dan English — yang dapat dicampur dalam satu file. Setiap kata kunci bahasa Indonesia memiliki padanan bahasa Inggris yang menghasilkan output JavaScript identik.

PromptJS supports bilingual keywords — Indonesian and English — that can be mixed in a single file. Every Indonesian keyword has an English counterpart that produces identical JavaScript output.

---

## Struktur & Deklarasi / Structure & Declaration

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `halaman` | `page` | TK_BUAT | Root halaman / Page root |
| `buat` | `create` | TK_BUAT | Buat elemen / Create element |
| `komponen` | `component` | TK_DEFINSIKAN | Deklarasi komponen / Component declaration |
| `definisikan` | `define` | TK_DEFINSIKAN | Definisi umum / General definition |
| `data` | `state` | TK_DATA | State reaktif / Reactive state |
| `tetap` | `const` | TK_TETAP | Konstanta / Constant |
| `ubah` | `let` | TK_UBAH | Variabel mutable / Mutable variable |
| `turunan` | `derived` | TK_TURUNAN | Computed value / Nilai turunan |
| `fungsi` | `func` | TK_FUNGSI | Fungsi / Function |
| | `function` | TK_FUNGSI | Alias panjang / Full alias |

## Kontrol Alur / Flow Control

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `jika` | `if` | TK_JIKA | Kondisi / Conditional |
| `lainnya` | `else` | TK_LAINNYA | Cabang alternatif / Else branch |
| `ulangi` | `loop` | TK_ULANGI | Loop enumerasi / Enum loop |
| `untuk` | `for` | TK_UNTUK | For loop |
| `dari` | `from` | TK_IN | Sumber iterasi / Iteration source |
| `sampai` | `until` | TK_SAMPAI | Batas atas range / Range upper bound |
| `kali` | `times` | TK_KALI | Pengulangan N kali / Repeat N times |
| `saat` | `watch` | TK_SAAT | Watcher reaktif / Reactive watcher |
| `berhenti` | `break` | TK_BERHENTI | Keluar loop / Break loop |
| `kembalikan` | `return` | TK_KEMBALIKAN | Return nilai / Return value |
| `lewati` | `skip` | TK_PASS | Skip iterasi / Skip iteration |
| `pass` | | TK_PASS | Alias English / English alias |

## Aksi / Action Statements

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `ketika` | `when` | TK_KETIKA | Event handler / Penangan event |
| `simpan` | `save` | TK_SIMPAN | Simpan ke storage / Save to storage |
| `tambahkan` | `append` | TK_TAMBAHKAN | Append elemen / Append element |
| `kurangi` | `remove` | TK_KURANGI | Hapus elemen / Remove element |
| `sisipkan` | `insert` | TK_SISIPKAN | Sisipkan elemen / Insert element |
| `tampilkan` | `show` | TK_TAMPILKAN | Tampilkan elemen / Show element |
| `sembunyikan` | `hide` | TK_SEMBUNYIKAN | Sembunyikan elemen / Hide element |
| `hapus` | `delete` | TK_HAPUS | Hapus data/elemen / Delete data/element |
| `kosongkan` | `clear` | TK_KOSONGKAN | Kosongkan / Clear |
| `perbarui` | `update` | TK_PERBARUI | Perbarui properti / Update property |
| `ambil` | `fetch` | TK_AMBIL | Ambil data / Fetch data |
| `arahkan` | `navigate` | TK_ARAHKAN | Navigasi rute / Navigate route |
| `muatulang` | `reload` | TK_MUAT_ULANG | Muat ulang / Reload |
| `kembali` | `back` | TK_KEMBALI | Kembali / Go back |
| `jalankan` | `run` | TK_JALANKAN | Jalankan / Run |
| `gunakan` | `use` | TK_GUNAKAN | Gunakan komponen / Use component |

## Lifecycle Hooks

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `dipasang` | `mounted` | TK_DIPASANG | Setelah mount / After mount |
| `dilepas` | `unmounted` | TK_DILEPAS | Setelah unmount / After unmount |

## Direction / Preposition

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `ke` | `to` | TK_KE | Arah target / Direction target |

## Literal Boolean & Null

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `benar` | `true` | TK_BENAR | Boolean true |
| `salah` | `false` | TK_SALAH | Boolean false |
| `kosong` | `null` | TK_KOSONG | Null |

> **Catatan / Note:** `salah` juga muncul sebagai event alias (`on_salah` → `error`), tapi di konteks expression (bukan setelah `on_`), `salah` diinterpretasikan sebagai boolean literal `false`.

---

## Operator Kata / Word Operators

Operator kata dikenali di dalam ekspresi dan diterjemahkan ke simbol JavaScript:

Word operators are recognized inside expressions and translated to JavaScript symbols:

| Indonesia | Symbol JS | Deskripsi / Description |
|-----------|-----------|-------------------------|
| `tidak sama dengan` | `!==` | Tidak identik / Strict inequality |
| `sama dengan` | `===` | Identik / Strict equality |
| `paling sedikit` | `>=` | Lebih dari atau sama / Greater or equal |
| `paling banyak` | `<=` | Kurang dari atau sama / Less or equal |
| `lebih dari` | `>` | Lebih dari / Greater than |
| `kurang dari` | `<` | Kurang dari / Less than |
| `dan` | `&&` | Logika AND / Logical AND |
| `atau` | `\|\|` | Logika OR / Logical OR |
| `tidak` | `!` | Logika NOT / Logical NOT |
| `negatif` | `-` | Negasi numerik / Numeric negation |
| `tambah` | `+` | Penjumlahan / Addition |
| `kurang` | `-` | Pengurangan / Subtraction |
| `kali` | `*` | Perkalian / Multiplication |
| `bagi` | `/` | Pembagian / Division |
| `mod` | `%` | Modulo |
| `pangkat` | `**` | Eksponen / Exponentiation |

> **Catatan pengenalan / Matching note:** Operator kata diurutkan terpanjang lebih dulu agar frasa multi-kata menang atas awalannya (mis. "tidak sama dengan" sebelum "tidak").

---

← [Syntax Reference](syntax-reference.md) · [Directives](directives.md) →
