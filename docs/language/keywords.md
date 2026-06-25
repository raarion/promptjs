# Kata Kunci / Keywords

> docs/language/ → **Keywords**
> ← [Syntax Reference](syntax-reference.md) · [Directives](directives.md) →

---

PromptJS mendukung kata kunci dwibahasa — Indonesia dan English — yang dapat dicampur dalam satu file. Setiap kata kunci Indonesia memiliki padanan English yang menghasilkan output JavaScript identik.

PromptJS supports bilingual keywords — Indonesian and English — that can be mixed in a single file. Every Indonesian keyword has an English counterpart producing identical JavaScript output.

---

## Struktur dan Deklarasi / Structure and Declaration

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `halaman` | `page` | TK_BUAT | Root halaman / Page root |
| `buat` | `create` | TK_BUAT | Buat elemen DOM / Create element |
| `komponen` | `component` | TK_DEFINSIKAN | Deklarasi komponen / Component declaration |
| `definisikan` | `define` | TK_DEFINSIKAN | Definisi umum / General definition |
| `data` | `state` | TK_DATA | State reaktif (Proxy-based) / Reactive state |
| `tetap` | `const` | TK_TETAP | Konstanta (tidak dapat diubah) / Constant |
| `ubah` | `let` | TK_UBAH | Variabel mutable non-reaktif / Mutable variable |
| `turunan` | `derived` | TK_TURUNAN | Computed value (read-only reaktif) / Derived computed |
| `fungsi` | `func` | TK_FUNGSI | Deklarasi fungsi / Function declaration |
| | `function` | TK_FUNGSI | Alias panjang / Full-form alias |

---

## Kontrol Alur / Flow Control

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `jika` | `if` | TK_JIKA | Kondisional / Conditional |
| `kalau` | | TK_JIKA | Alias Indonesia / Indonesian alias |
| `lainnya` | `else` | TK_LAINNYA | Cabang alternatif / Else branch |
| `ulangi` | `loop` | TK_ULANGI | Perulangan / Loop |
| `untuk` | `for` | TK_UNTUK | Pengulangan for / For loop |
| `dari` | `from` | TK_IN | Sumber iterasi / Iteration source |
| `sampai` | `until` | TK_SAMPAI | Batas atas range / Range upper bound |
| `kali` | `times` | TK_KALI | Pengulangan N kali / Repeat N times |
| `saat` | `watch` | TK_SAAT | Watcher reaktif (bukan event) / Reactive watcher |
| `berhenti` | `break` | TK_BERHENTI | Keluar dari loop / Break out of loop |
| `kembalikan` | `return` | TK_KEMBALIKAN | Return nilai / Return value |
| `lewati` | `skip` | TK_PASS | Lewati iterasi / Skip iteration |
| | `pass` | TK_PASS | Alias English / English alias |
| `selama` | `while` | TK_SELAMA | Loop kondisi / While loop |
| `setelah` | `after` | TK_SETELAH | Post-completion hook / Hook setelah selesai |

---

## Alias Multi-Kata / Multi-Word Aliases

Beberapa alias menggunakan dua kata yang dikenali oleh parser via lookahead. Ini BUKAN token tunggal — parser mendeteksi pola dua token berurutan.

Some aliases use two words recognized by the parser via lookahead. These are NOT single tokens — the parser detects a two-token pattern.

| Pola / Pattern | Token | Setara / Equivalent | Catatan / Note |
|----------------|-------|---------------------|------------------|
| `selain itu` | `TK_IDENT` + `TK_IDENT` | `lainnya` / `else` | Hanya valid setelah blok `jika`/`kalau` / Only valid after `jika`/`kalau` block |
| `namun jika` | `TK_IDENT` + `TK_JIKA` | `else if` | Else-if pertama / First else-if form |
| `namun kalau` | `TK_IDENT` + `TK_JIKA` | `else if` | Variant `kalau` / `kalau` variant |
| `tapi jika` | `TK_IDENT` + `TK_JIKA` | `else if` | Else-if alternatif / Alternative else-if form |
| `tapi kalau` | `TK_IDENT` + `TK_JIKA` | `else if` | Variant `kalau` / `kalau` variant |

**Contoh / Example:**

```pjs
Jika x > 10:
    Buat span: "Besar"
namun jika x > 5:
    Buat span: "Sedang"
tapi kalau x > 0:
    Buat span: "Kecil"
selain itu:
    Buat span: "Negatif"
```

**Catatan / Note:** `jika tidak` TIDAK didukung sebagai alias else karena `tidak` adalah token operator `TK_NOT` yang menyebabkan konflik parsing.

`jika tidak` is NOT supported as an else alias because `tidak` is the `TK_NOT` operator token, which causes parsing conflicts.

---

## Aksi / Action Statements

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `ketika` | `when` | TK_KETIKA | Event handler / Event handler |
| `simpan` | `save` | TK_SIMPAN | Simpan nilai ke variabel / Save value to variable |
| `tambahkan` | `append` | TK_TAMBAHKAN | Tambah item ke array / Append to array |
| `kurangi` | `remove` | TK_KURANGI | Kurangi nilai / Remove from value |
| `sisipkan` | `insert` | TK_SISIPKAN | Sisipkan item ke array / Insert into array |
| `tampilkan` | `show` | TK_TAMPILKAN | Tampilkan pesan atau elemen / Show message or element |
| `sembunyikan` | `hide` | TK_SEMBUNYIKAN | Sembunyikan elemen / Hide element |
| `hapus` | `delete` | TK_HAPUS | Hapus data atau elemen / Delete data or element |
| `kosongkan` | `clear` | TK_KOSONGKAN | Kosongkan konten elemen / Clear element content |
| `perbarui` | `update` | TK_PERBARUI | Perbarui properti elemen / Update element property |
| `ambil` | `fetch` | TK_AMBIL | HTTP request async / Async HTTP fetch |
| `arahkan` | `navigate` | TK_ARAHKAN | Navigasi halaman / Navigate to page |
| `muatulang` | `reload` | TK_MUAT_ULANG | Muat ulang halaman / Reload page |
| `kembali` | `back` | TK_KEMBALI | Kembali ke halaman sebelumnya / Go back |
| `jalankan` | `run` | TK_JALANKAN | Jalankan fungsi / Run function |
| `gunakan` | `use` | TK_GUNAKAN | Gunakan komponen / Use component |

---

## Lifecycle Hooks

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `dipasang` | `mounted` | TK_DIPASANG | Dipanggil saat komponen/halaman dimount / Called on mount |
| `dilepas` | `unmounted` | TK_DILEPAS | Dipanggil saat komponen/halaman diunmount / Called on unmount |

---

## Preposisi / Preposition

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `ke` | `to` | TK_KE | Arah penyimpanan / Storage direction |

---

## Literal Boolean dan Null / Boolean and Null Literals

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `benar` | `true` | TK_BENAR | Boolean true |
| `salah` | `false` | TK_SALAH | Boolean false |
| `kosong` | `null` | TK_KOSONG | Null |

**Catatan penting / Important note:** PromptJS menggunakan `salah` untuk false, bukan `palsu`. `salah` juga muncul sebagai event alias (`on_salah` menghasilkan `error`), tetapi di konteks ekspresi (bukan setelah `on_`), ia diinterpretasikan sebagai literal boolean `false`.

---

## Operator Kata / Word Operators

Operator kata dikenali di dalam ekspresi dan diterjemahkan ke simbol JavaScript. Diurutkan terpanjang lebih dulu agar frasa multi-kata menang atas awalannya.

Word operators are recognized inside expressions and translated to JavaScript symbols. Ordered longest-first so multi-word phrases win over prefixes.

| Indonesia | Simbol JS | Deskripsi / Description |
|-----------|-----------|-------------------------|
| `tidak sama dengan` | `!==` | Tidak identik / Strict inequality |
| `sama dengan` | `===` | Identik / Strict equality |
| `paling sedikit` | `>=` | Lebih dari atau sama dengan / Greater or equal |
| `paling banyak` | `<=` | Kurang dari atau sama dengan / Less or equal |
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
| `mod` | `%` | Modulo / Modulo |
| `pangkat` | `**` | Eksponen / Exponentiation |

**Contoh / Example:**
```pjs
Jika hitung sama dengan 10 dan nama tidak sama dengan "":
    Buat span: "Ditemukan"

tambahkan hitung tambah 1
```

---

← [Syntax Reference](syntax-reference.md) · [Directives](directives.md) →