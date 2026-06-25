# Ekspresi / Expressions

> docs/language/ → **Expressions**
> ← [Directives](directives.md) · [Components](components.md) →

---

Ekspresi dalam PromptJS mendukung literal standar JavaScript, referensi variabel, operator simbol dan kata, serta pemanggilan method. Seluruh ekspresi di-lower ke JavaScript vanila oleh compiler.

Expressions in PromptJS support standard JavaScript literals, variable references, symbol and word operators, and method calls. All expressions are lowered to vanilla JavaScript by the compiler.

---

## Literal / Literals

| Tipe | Contoh / Example | Output JS |
|------|-------------------|-----------|
| String | `"Halo"`, `'Dunia'` | `"Halo"`, `'Dunia'` |
| Number | `42`, `3.14`, `0xFF` | `42`, `3.14`, `255` |
| Boolean | `benar`, `salah` | `true`, `false` |
| Null | `kosong` | `null` |
| Array | `[1, 2, 3]` | `[1, 2, 3]` |
| Object | `{nama: "Ani"}` | `{nama: "Ani"}` |

PromptJS menggunakan `salah` untuk false, bukan `palsu`. Ini adalah pilihan desain yang disengaja.

PromptJS uses `salah` for false, not `palsu`. This is a deliberate design choice.

---

## Referensi Variabel / Variable References

```pjs
$nama              # data/state variable (reaktif)
$nama              # front-matter data
$item.harga        # property access
$daftar[0]         # index access
```

Variabel yang diawali `$` mengacu pada deklarasi `data`, `tetap`, `ubah`, `turunan`, parameter komponen, atau data front-matter. Variabel yang diawali `$` juga dapat mengakses properti dan indeks dengan sintaks titik atau kurung siku.

Variables prefixed with `$` reference `data`, `tetap`, `ubah`, `turunan` declarations, component parameters, or front-matter data. Dollar-prefixed variables can also access properties and indices with dot or bracket syntax.

---

## Operator Simbol / Symbol Operators

Operator JavaScript standar dapat digunakan langsung di dalam ekspresi:

Standard JavaScript operators can be used directly inside expressions:

| Operator | Fungsi / Function |
|----------|-------------------|
| `+` `-` `*` `/` `%` `**` | Aritmetika / Arithmetic |
| `===` `!==` `>` `<` `>=` `<=` | Perbandingan / Comparison |
| `&&` `\|\|` `!` | Logika / Logical |
| `+` | Penggabungan string / String concatenation |

Ternary JavaScript standar juga didukung dalam ekspresi:

Standard JavaScript ternary is also supported in expressions:

```pjs
Buat span: $stok > 0 ? "Tersedia" : "Habis"
```

---

## Operator Kata / Word Operators

Selain operator simbol, PromptJS menyediakan operator dalam bentuk kata Indonesia yang diterjemahkan ke simbol JavaScript. Operator kata diurutkan terpanjang lebih dulu agar frasa multi-kata menang:

Besides symbol operators, PromptJS provides word-form operators in Indonesian that translate to JavaScript symbols. Word operators are ordered longest-first so multi-word phrases win:

| Indonesia | JS | Kategori / Category |
|-----------|-----|---------------------|
| `tidak sama dengan` | `!==` | Perbandingan / Comparison |
| `sama dengan` | `===` | Perbandingan / Comparison |
| `paling sedikit` | `>=` | Perbandingan / Comparison |
| `paling banyak` | `<=` | Perbandingan / Comparison |
| `lebih dari` | `>` | Perbandingan / Comparison |
| `kurang dari` | `<` | Perbandingan / Comparison |
| `dan` | `&&` | Logika / Logical |
| `atau` | `\|\|` | Logika / Logical |
| `tidak` | `!` | Logika / Logical |
| `negatif` | `-` | Aritmetika / Arithmetic |
| `tambah` | `+` | Aritmetika / Arithmetic |
| `kurang` | `-` | Aritmetika / Arithmetic |
| `kali` | `*` | Aritmetika / Arithmetic |
| `bagi` | `/` | Aritmetika / Arithmetic |
| `mod` | `%` | Aritmetika / Arithmetic |
| `pangkat` | `**` | Aritmetika / Arithmetic |

**Contoh / Example:**
```pjs
Jika hitung lebih dari 10 dan nama tidak sama dengan "":
    Buat span: "Ditemukan"

tambahkan hitung tambah 1
```

---

## Pemanggilan Method / Method Calls

Method JavaScript standar dapat dipanggil langsung pada variabel:

Standard JavaScript methods can be called directly on variables:

```pjs
$daftar.filter(x => x > 0)
$teks.toUpperCase()
$jumlah.toFixed(2)
```

---

## Fungsi Bawaan / Built-in Functions

Beberapa fungsi bawaan PromptJS di-inlining pada waktu kompilasi. Sebagian menjadi helper runtime (untuk nilai reaktif), sebagian langsung di-substitusi:

Some PromptJS built-in functions are inlined at compile time. Some become runtime helpers (for reactive values), others are directly substituted:

| Fungsi / Function | Lowering / Compiled To |
|-------------------|----------------------|
| `panjang(arr)` | `arr.length` (di-inline) |
| `apakahKosong(x)` | `x===null\|\|x===undefined\|\|...` (di-inline) / atau runtime helper untuk reaktif |
| `apakahAda(arr, item)` | `arr.includes(item)` (di-inline) / atau runtime helper untuk reaktif |
| `untukSetiap(arr, fn)` | `arr.forEach(fn)` |
| `saring(arr, fn)` | `arr.filter(fn)` |
| `pilih(arr, fn)` | `arr.map(fn)` |
| `urutkan(arr)` | `arr.sort()` |
| `balik(arr)` | `arr.reverse()` |
| `temukan(arr, fn)` | `arr.find(fn)` |
| `sisip(arr, val)` | `arr.push(val)` |

---

← [Directives](directives.md) · [Components](components.md) →