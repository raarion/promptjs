# Kata Kunci / Keywords

> docs/language/ → **Keywords**
> ← [Syntax Reference](syntax-reference.md) · [Directives](directives.md) →

---

PromptJS mendukung kata kunci dwibahasa — Indonesia dan English — yang dapat dicampur dalam satu file. Setiap kata kunci bahasa Indonesia memiliki padanan bahasa Inggris yang menghasilkan output JavaScript identik.

PromptJS supports bilingual keywords — Indonesian and English — that can be mixed in a single file. Every Indonesian keyword has an English counterpart that produces identical JavaScript output.

---

## Struktur & Deklarasi / Structure & Declaration

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `halaman` | `page` | TK_BUAT | Root halaman / Page root |
| `buat` | `create` | TK_BUAT | Buat elemen DOM / Create DOM element |
| `komponen` | `component` | TK_DEFINSIKAN | Deklarasi komponen / Component declaration |
| `definisikan` | `define` | TK_DEFINSIKAN | Definisi umum / General definition |
| `data` | `state` | TK_DATA | State reaktif (Proxy-based) / Reactive state |
| `tetap` | `const` | TK_TETAP | Konstanta / Constant |
| `ubah` | `let` | TK_UBAH | Variabel mutable / Mutable variable |
| `turunan` | `derived` | TK_TURUNAN | Nilai turunan (computed, read-only) / Derived computed |
| `fungsi` | `func` | TK_FUNGSI | Deklarasi fungsi / Function declaration |
| | `function` | TK_FUNGSI | Alias panjang / Full-form alias |

**Contoh / Example:**
```pjs
halaman Dashboard:
    data hitung = 0
    tetap PI = 3.14159
    turunan hasil = hitung * PI

    definisikan Helper:
        fungsi tambah(x):
            kembalikan x + 1
```

---

## Kontrol Alur / Flow Control

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `jika` | `if` | TK_JIKA | Kondisional / Conditional |
| `lainnya` | `else` | TK_LAINNYA | Cabang alternatif / Else branch |
| `ulangi` | `loop` | TK_ULANGI | Perulangan / Loop |
| `untuk` | `for` | TK_UNTUK | Pengulangan dengan iterator / For loop |
| `dari` | `from` | TK_IN | Sumber iterasi / Iteration source |
| | `in` | TK_IN | Alias English untuk `dari` / English alias |
| `sampai` | `until` | TK_SAMPAI | Batas atas range / Range upper bound |
| `kali` | `times` | TK_KALI | Pengulangan N kali / Repeat N times |
| `saat` | `watch` | TK_SAAT | Watcher reaktif / Reactive watcher |
| `berhenti` | `break` | TK_BERHENTI | Keluar dari loop / Break out of loop |
| `kembalikan` | `return` | TK_KEMBALIKAN | Return nilai / Return value |
| `lewati` | `skip` | TK_PASS | Lewati iterasi / Skip iteration |
| | `pass` | TK_PASS | Alias English / English alias |

**Contoh / Example:**
```pjs
jika $hitung > 5:
    buat span: "Besar"
lainnya:
    buat span: "Kecil"

ulangi untuk item dari $daftar:
    buat li: item

ulangi untuk i dari 1 sampai 10:
    buat div: i

ulangi 5 kali:
    buat span: "Item"
```

---

## Aksi / Action Statements

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `ketika` | `when` | TK_KETIKA | Event handler / Penangan event |
| `simpan` | `save` | TK_SIMPAN | Simpan nilai ke variabel / Save value to variable |
| `tambahkan` | `append` | TK_TAMBAHKAN | Tambah item ke array / Append to array |
| `kurangi` | `remove` | TK_KURANGI | Kurangi nilai atau hapus dari array / Decrement or remove from array |
| `sisipkan` | `insert` | TK_SISIPKAN | Sisipkan item ke array / Insert into array |
| `tampilkan` | `show` | TK_TAMPILKAN | Tampilkan pesan (alert) atau elemen / Show message or element |
| `sembunyikan` | `hide` | TK_SEMBUNYIKAN | Sembunyikan elemen / Hide element |
| `hapus` | `delete` | TK_HAPUS | Hapus data / Delete data |
| `kosongkan` | `clear` | TK_KOSONGKAN | Kosongkan konten elemen / Clear element content |
| `perbarui` | `update` | TK_PERBARUI | Perbarui properti / Update property |
| `ambil` | `fetch` | TK_AMBIL | HTTP request async / Async HTTP fetch |
| `arahkan` | `navigate` | TK_ARAHKAN | Navigasi halaman / Navigate to page |
| `muatulang` | `reload` | TK_MUAT_ULANG | Muat ulang halaman / Reload page |
| `kembali` | `back` | TK_KEMBALI | Kembali ke halaman sebelumnya / Go back |
| `jalankan` | `run` | TK_JALANKAN | Jalankan fungsi / Run function |
| `gunakan` | `use` | TK_GUNAKAN | Gunakan komponen / Use component |

**Catatan / Note:** `tampilkan` memiliki 3 mode: (1) string literal atau ekspresi otomatis menjadi `alert()`, (2) `pesan-error` menghasilkan `console.error()`, (3) identifier elemen menghasilkan `__mount()` atau menghapus `display:none`. `simpan` men-emit `__setState()` untuk variabel reaktif, serta mendukung `localStorage.setItem()` / `sessionStorage.setItem()` untuk penyimpanan browser.

**Contoh / Example:**
```pjs
simpan "Hello" ke nama
tambahkan 1 ke hitung
arahkan ke "/dashboard"
muatulang
tampilkan "Selamat datang"
```

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
| `ke` | `to` | TK_KE | Arah target / Direction target |

---

## Literal Boolean & Null

| Indonesia | English | Token | Deskripsi / Description |
|-----------|---------|-------|-------------------------|
| `benar` | `true` | TK_BENAR | Boolean true |
| `salah` | `false` | TK_SALAH | Boolean false |
| `kosong` | `null` | TK_KOSONG | Null |

**Catatan Penting / Important Note:**

PromptJS menggunakan `salah` untuk false, bukan `palsu`. Ini mengikuti prinsip konsistensi dwibahasa — `salah` juga muncul sebagai event alias (`on_salah` menghasilkan `error`), tetapi di konteks ekspresi (bukan setelah `on_`), ia diinterpretasikan sebagai literal boolean `false`.

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
jika hitung sama dengan 10 dan nama tidak sama dengan "":
    buat span: "Ditemukan"
```

---

## Verifikasi / Verification

Diverifikasi terhadap source code: `src/lexer/promptjs-lexer.js` (KEYWORDS, baris 163-260; WORD_OPERATORS, baris 268-291), `src/parser/token-types.js`, dan `src/parser/promptjs-parser.js` (_parseStatement, baris 211-284).

---

← [Syntax Reference](syntax-reference.md) · [Directives](directives.md) →