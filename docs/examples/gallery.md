# Contoh: Galeri Foto / Example: Photo Gallery

> docs/examples/ > Gallery

Walkthrough aplikasi galeri foto — contoh untuk memahami **data dari front-matter**, **perulangan dengan properti objek**, dan **styling glassmorphism**. Sumber: [`examples/gallery.pjs`](https://github.com/raarion/promptjs/blob/main/examples/gallery.pjs).

A walkthrough of a photo gallery app — an example to understand **front-matter data**, **iteration with object properties**, and **glassmorphism styling**. Source: [`examples/gallery.pjs`](https://github.com/raarion/promptjs/blob/main/examples/gallery.pjs).

---

## Tujuan / Goal

Menampilkan koleksi foto dari data yang didefinisikan di front-matter. Setiap foto punya judul, URL, dan deskripsi — ditampilkan dalam grid kartu responsif.

Display a photo collection from data defined in front-matter. Each photo has a title, URL, and description — displayed in a responsive card grid.

## Konsep yang Dipakai / Concepts Used

| Konsep / Concept | Keyword | Halaman / Page |
|---|---|---|
| Data front-matter | `foto: [...]` di `---` | [directives.md](../language/directives.md) |
| Perulangan / Iteration | `Ulangi untuk … dari …` | [keywords.md](../language/keywords.md) |
| Akses properti / Property access | `item.judul`, `item.url` | [expressions.md](../language/expressions.md) |
| Membuat gambar / Image element | `Buat gambar:` + `src`/`alt` | [syntax-reference.md](../language/syntax-reference.md) |
| Interpolasi front-matter | `$judul` | [directives.md](../language/directives.md) |

---

## Kode `.pjs` (inti logika) / Core Logic

> Blok `Gaya:` (CSS) dihilangkan agar fokus ke logika. / The `Gaya:` block is omitted to focus on logic.

```pjs
---
judul: "Galeri Foto"
foto: [
  {judul: "Senja di Pantai", url: "https://picsum.photos/seed/senja/400/300", deskripsi: "Pemandangan matahari terbenam"},
  {judul: "Gunung Berkabut", url: "https://picsum.photos/seed/gunung/400/300", deskripsi: "Kabut pagi di pegunungan"},
  {judul: "Kota Malam",   url: "https://picsum.photos/seed/kota/400/300",   deskripsi: "Skyline kota di malam hari"},
  {judul: "Hutan Tropis", url: "https://picsum.photos/seed/hutan/400/300",  deskripsi: "Kehijauan hutan hujan"}
]
---

Halaman Galeri:
    Buat div.container:
        Buat h1.page-title: $judul
        Buat p.page-subtitle: "Koleksi foto dari berbagai tempat"

        Buat div.galeri:
            Ulangi untuk item dari foto:
                Buat div.kartu:
                    Buat gambar:
                        src = item.url
                        alt = item.judul
                    Buat div.kartu-body:
                        Buat h3:
                            item.judul
                        Buat p:
                            item.deskripsi
```

---

## Penjelasan / Explanation

### 1. Data di front-matter

```pjs
foto: [
  {judul: "Senja di Pantai", url: "...", deskripsi: "..."},
  ...
]
```

Array objek didefinisikan langsung di front-matter. PromptJS mendukung JSON-like syntax di blok `---`. Data ini tersedia sebagai variabel `foto` di body halaman — tanpa perlu `data`, tanpa perlu fetch.

An array of objects defined directly in front-matter. PromptJS supports JSON-like syntax in the `---` block. This data is available as the `foto` variable in the page body — no `data`, no fetch needed.

### 2. Perulangan dengan properti objek

```pjs
Ulangi untuk item dari foto:
    Buat div.kartu:
        Buat gambar:
            src = item.url
            alt = item.judul
```

Setiap iterasi menciptakan satu kartu. `item.url` dan `item.judul` mengakses properti objek JSON — sama naturalnya dengan JavaScript, tanpa simbol khusus.

Each iteration creates one card. `item.url` and `item.judul` access JSON object properties — as natural as JavaScript, with no special symbols.

### 3. Membuat elemen gambar

```pjs
Buat gambar:
    src = item.url
    alt = item.judul
```

`Buat gambar:` membuat `<img>` element. Atribut `src` dan `alt` di-set langsung — PromptJS mengenali tag HTML standar lewat sistem tag alias.

`Buat gambar:` creates an `<img>` element. `src` and `alt` attributes are set directly — PromptJS recognizes standard HTML tags through the tag alias system.

### 4. Grid responsif otomatis

Blok `Gaya:` menggunakan CSS Grid:
```css
.galeri
    display: grid
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))
    gap: 20px
```

Kartu otomatis menyesuaikan jumlah kolom berdasarkan lebar layar — tanpa JavaScript, tanpa library.

Cards automatically adjust column count based on screen width — no JavaScript, no library.

---

## Cara Menjalankan / How to Run

```bash
pjs compile examples/gallery.pjs
# atau / or
pjs serve
```

---

## Variasi / Latihan / Variations / Exercises

1. **Tambah foto baru** — tambahkan objek ke array `foto` di front-matter, langsung muncul.
2. **Filter berdasarkan kategori** — tambahkan properti `kategori` ke tiap foto, lalu gunakan `Jika` untuk filter.
3. **Lightbox** — tambahkan event `on_klik` pada gambar untuk membuka versi besar.
4. **Loading skeleton** — tambahkan state `data memuat = benar` dan transisi CSS.

---

← [Todo](todo.md) · [SPA →](spa.md)
