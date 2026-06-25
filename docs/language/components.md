# Komponen / Components

> docs/language/ → **Components**
> ← [Expressions](expressions.md) · [Reactivity](reactivity.md) →

---

Komponen memungkinkan Anda membuat blok UI yang dapat digunakan kembali. Setiap komponen didefinisikan sekali, lalu diinstansiasi di mana saja dengan properti yang berbeda. Komponen dikompilasi menjadi fungsi JavaScript murni tanpa framework.

Components allow you to create reusable UI blocks. Each component is defined once, then instantiated anywhere with different properties. Components compile to plain JavaScript functions with no framework.

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

Nama komponen HARUS dimulai dengan huruf kapital (PascalCase). Jika tidak, kompilator menghasilkan error E2003:

Component names MUST start with an uppercase letter (PascalCase). Otherwise, the compiler emits error E2003:

```pjs
Komponen kartu(judul):    # SALAH → E2003
Komponen Kartu(judul):    # BENAR
```

---

## Instansiasi / Instantiation

Gunakan `Buat NamaKomponen(prop: nilai):` atau `Gunakan NamaKomponen(prop: nilai):`:

Use `Buat ComponentName(prop: value):` or `Gunakan ComponentName(prop: value):`:

```pjs
Buat Kartu(judul: "Kopi Aceh", harga: 45000):
```

Ini dikompilasi menjadi pemanggilan fungsi dengan objek props, kemudian hasilnya di-append ke parent:

This compiles to a function call with a props object, then the result is appended to the parent:

```js
const __komp_1 = __komp_Kartu({judul: "Kopi Aceh", harga: 45000});
parent.appendChild(__komp_1);
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

## Batasan / Limitations

- Komponen harus dideklarasikan SEBELUM digunakan (E3004 jika tidak) / Components must be declared BEFORE use
- Parameter duplikat menghasilkan E4005 / Duplicate parameters produce E4005
- Parameter tanpa default tidak boleh setelah parameter dengan default (E4006) / Required params cannot follow default params
- `data` di dalam komponen memiliki perilaku kompilasi yang berbeda dari halaman / `data` inside components has different compilation behavior than pages
- `Gunakan` hanya boleh merujuk ke komponen (PascalCase), bukan elemen biasa (E4010) / `Gunakan` can only reference components, not regular elements

---

← [Expressions](expressions.md) · [Reactivity](reactivity.md) →