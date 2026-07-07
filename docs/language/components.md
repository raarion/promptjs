# Komponen / Components

> docs/language/ → **Components**
> ← [Expressions](expressions.md) · [Reactivity](reactivity.md) →

---

Komponen memungkinkan Anda membuat blok UI yang dapat digunakan kembali. Setiap komponen didefinisikan sekali, lalu diinstansiasi di mana saja dengan properti yang berbeda. Komponen dikompilasi menjadi fungsi JavaScript murni tanpa framework.

Components allow you to create reusable UI blocks. Each component is defined once, then instantiated anywhere with different properties. Components compile to plain JavaScript functions with no framework.

> Verifikasi sumber / Source verification: `src/parser/promptjs-parser.js` (parsing nama PascalCase, baris ~1663), `src/resolver/promptjs-resolver.js` (E3004/E4010, baris ~848–872), `src/analyzer/promptjs-analyzer.js` (E4005/E4006, baris ~432–445), `src/parser/error-codes.js` (definisi kode error).

---

## Definisi Komponen / Component Definition

Gunakan kata kunci `Komponen` (atau `component`) atau `Definisikan` (atau `define`) diikuti nama yang dimulai huruf kapital dan parameter dalam kurung:

Use the `Komponen` (or `component`) or `Definisikan` (or `define`) keyword followed by a PascalCase name and parameters in parentheses:

```pjs
Komponen Kartu(judul, harga):
    Buat div.kartu:
        Buat h3: $judul
        Buat span.harga: "Rp " + $harga
        Jika $stok > 0:
            Buat span.tersedia: "Tersedia"
        Lainnya:
            Buat span.habis: "Habis"
```

Parameter diakses di dalam body komponen menggunakan prefiks `$`. Parameter tidak memiliki tipe — semua nilai diteruskan sebagaimana adanya.

Parameters are accessed inside the component body using the `$` prefix. Parameters are untyped — all values are passed as-is.

---

## Aturan Nama / Naming Rules

Nama komponen HARUS dimulai dengan huruf kapital (PascalCase). Jika tidak, kompilator menghasilkan error **E2003** (saran: "Gunakan PascalCase untuk nama komponen").

Component names MUST start with an uppercase letter (PascalCase). Otherwise, the compiler emits error **E2003** (suggestion: "Use PascalCase for component names").

```pjs
Komponen kartu(judul):    # SALAH / WRONG → E2003
Komponen Kartu(judul):    # BENAR / CORRECT
```

---

## Parameter dengan Default / Default Parameters

Parameter boleh memiliki nilai default. Aturannya: parameter **tanpa** default tidak boleh muncul setelah parameter **dengan** default — jika dilanggar, kompilator menghasilkan **E4006**.

Parameters may have default values. The rule: a parameter **without** a default cannot appear after a parameter **with** a default — violating this yields **E4006**.

```pjs
Komponen Tombol(label, varian: "primer"):   # BENAR / CORRECT
    Buat button.btn: $label

Komponen Salah(varian: "primer", label):     # SALAH / WRONG → E4006
    Buat button: $label
```

Parameter duplikat dalam satu definisi komponen menghasilkan **E4005** (saran: "Hapus salah satu deklarasi parameter").

Duplicate parameters within a single component definition produce **E4005** (suggestion: "Remove one of the parameter declarations").

```pjs
Komponen Salah(judul, judul):   # SALAH / WRONG → E4005
    Buat h3: $judul
```

---

## Instansiasi / Instantiation

Gunakan `Buat NamaKomponen(prop: nilai):` atau `Gunakan NamaKomponen(prop: nilai):`:

Use `Buat ComponentName(prop: value):` or `Gunakan ComponentName(prop: value):`:

```pjs
Buat Kartu(judul: "Kopi Aceh", harga: 45000):
```

> **Catatan verifikasi (v132 Lapis 1–3 Stabilization Pass, 2026-07-07).** Contoh persis di atas (dengan trailing colon) sebelumnya GAGAL kompilasi akibat bug lexer (colon di dalam tanda kurung `(judul: ...)` salah terdeteksi sebagai penutup blok) — sudah diperbaiki dan diverifikasi ulang dengan regression test (`tests/v19-p0-stabilization.test.js`, P0.6) yang meng-compile teks contoh dokumentasi ini APA ADANYA. Bentuk tanpa trailing colon (`Buat Kartu(judul: "Kopi Aceh", harga: 45000)`) selalu bekerja dan tetap didukung.
>
> **Verification note (v132 Lapis 1–3 Stabilization Pass, 2026-07-07).** The exact example above (with a trailing colon) previously FAILED to compile due to a lexer bug (a colon inside the parentheses `(judul: ...)` was mis-detected as the block-opener colon) — this has been fixed and re-verified with a regression test (`tests/v19-p0-stabilization.test.js`, P0.6) that compiles this documentation example verbatim. The form without a trailing colon (`Buat Kartu(judul: "Kopi Aceh", harga: 45000)`) always worked and remains supported.

Ini dikompilasi menjadi pemanggilan fungsi dengan objek props, kemudian hasilnya di-append ke parent:

This compiles to a function call with a props object, then the result is appended to the parent:

```js
const __komp_1 = __komp_Kartu({judul: "Kopi Aceh", harga: 45000});
parent.appendChild(__komp_1);
```

### `Buat` vs `Gunakan`

Keduanya menginstansiasi komponen. `Gunakan` (atau `use`) bersifat **eksplisit-hanya-komponen**: ia HARUS merujuk ke nama PascalCase yang terdaftar sebagai komponen. Merujuk ke elemen biasa atau nama yang bukan komponen menghasilkan **E4010** (saran: "Pastikan nama yang direferensikan adalah komponen (PascalCase)").

Both instantiate a component. `Gunakan` (or `use`) is **component-only**: it MUST reference a PascalCase name registered as a component. Referencing a regular element or a non-component name produces **E4010** (suggestion: "Ensure the referenced name is a component (PascalCase)").

```pjs
Gunakan Kartu(judul: "Kopi", harga: 30000):   # BENAR / CORRECT
Gunakan div(...):                               # SALAH / WRONG → E4010
```

---

## Output Kompilasi / Compiled Output

Setiap komponen menghasilkan dua hal: fungsi factory dan registrasi global:

Each component produces two things: a factory function and a global registration:

```js
function __komp_Kartu(props) {
    props = props || {};
    const judul = props.judul;
    const harga = props.harga;
    const __root = document.createElement('div');
    __root.className = 'kartu';
    // ... element creation ...
    return __root;
}
window.Kartu = __komp_Kartu;
```

Registrasi `window.Nama` memungkinkan komponen dirujuk secara dinamis. Fungsi factory mengembalikan elemen root yang siap di-append ke parent.

The `window.Name` registration allows the component to be referenced dynamically. The factory function returns a root element ready to be appended to the parent.

---

## Ringkasan Kode Error / Error Code Summary

| Kode / Code | Kondisi / Condition | Tahap / Stage | Saran / Suggestion |
|-------------|---------------------|---------------|--------------------|
| `E2003` | Nama komponen tidak PascalCase / Component name not PascalCase | Parser | Gunakan PascalCase / Use PascalCase |
| `E3004` | Komponen dipakai sebelum dideklarasi / Component used before declaration | Resolver | Pindahkan deklarasi sebelum penggunaan / Move declaration before use |
| `E4005` | Parameter duplikat / Duplicate parameter | Analyzer | Hapus salah satu deklarasi / Remove one declaration |
| `E4006` | Param wajib setelah param default / Required param after default param | Analyzer | Pindahkan param default ke akhir / Move default params to the end |
| `E4010` | `Gunakan` merujuk non-komponen / `Gunakan` references a non-component | Resolver/Analyzer | Pastikan nama adalah komponen / Ensure name is a component |

> Daftar kode lengkap: [Error Codes](../reference/error-codes.md).

---

## Batasan / Limitations

- Komponen harus dideklarasikan SEBELUM digunakan (E3004 jika tidak) / Components must be declared BEFORE use.
- Parameter duplikat menghasilkan E4005 / Duplicate parameters produce E4005.
- Parameter tanpa default tidak boleh setelah parameter dengan default (E4006) / Required params cannot follow default params.
- `data` di dalam komponen memiliki perilaku kompilasi yang berbeda dari halaman / `data` inside components has different compilation behavior than pages.
- `Gunakan` hanya boleh merujuk ke komponen (PascalCase), bukan elemen biasa (E4010) / `Gunakan` can only reference components, not regular elements.
- Nama komponen harus PascalCase (E2003 jika tidak) — divalidasi sejak v132 Lapis 1–3 Stabilization Pass / Component names must be PascalCase (E2003 otherwise) — enforced since the v132 Lapis 1–3 Stabilization Pass.
- Prop yang tidak dikenal pada instansiasi komponen (mis. salah ketik nama prop) menghasilkan peringatan W4005 / An unrecognized prop passed to a component instantiation (e.g. a typo'd prop name) produces a W4005 warning.
- **Belum ada slot/transklusi (v132 backlog).** Komponen bersarang (nesting) sudah berfungsi, tetapi belum ada cara meneruskan konten anak dari pemanggil ke dalam body komponen (mis. body kartu kustom, header/body/footer modal). Desain minimal (default-slot saja, tanpa slot bernama) sudah ditulis di [LIM/MIS Mapping v132 § Slots design decision](../project/lim-mis-mapping-v132.md#slots-design-decision-82), dijadwalkan v1.3.3/v1.4.0. Sejak v132 Lapis 1–3 Stabilization Pass, menulis `Gunakan NamaKomponen(...):` dengan blok anak (indented child block) TIDAK LAGI dikompilasi diam-diam sebagai sibling statement — sekarang menghasilkan error **E2030** yang jelas. Progres: [GitHub issue #82](https://github.com/raarion/promptjs/issues/82).
- **No slot/transclusion yet (v132 backlog).** Nested components already work, but there is no way to pass child content from the caller into a component's body (e.g. custom card bodies, modal header/body/footer). A minimal design (default slot only, no named slots) is written up in [LIM/MIS Mapping v132 § Slots design decision](../project/lim-mis-mapping-v132.md#slots-design-decision-82), scheduled for v1.3.3/v1.4.0. Since the v132 Lapis 1–3 Stabilization Pass, writing `Gunakan NamaKomponen(...):` with an indented child block is NO LONGER silently compiled as sibling statements — it now produces a clear **E2030** error instead. Tracking: [GitHub issue #82](https://github.com/raarion/promptjs/issues/82).

---

← [Expressions](expressions.md) · [Reactivity](reactivity.md) →
