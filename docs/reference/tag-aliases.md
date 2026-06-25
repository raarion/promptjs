# Tag Alias / Alias Tag HTML

> docs/reference/ → **Tag Aliases**
> ← [Keywords](../language/keywords.md) · [Event Aliases](event-aliases.md) →

---

PromptJS menyediakan alias nama tag yang ramah bahasa Indonesia untuk menggantikan tag HTML standar. Setiap alias dipetakan ke tag HTML asli saat kompilasi.

PromptJS provides friendly Indonesian tag aliases to replace standard HTML tag names. Each alias is mapped to its native HTML tag during compilation.

---

## Text & Content / Teks & Konten

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `tombol` | `<button>` | Tombol interaktif / Interactive button |
| `tautan` | `<a>` | Tautan / Hyperlink |
| `judul` | `<h1>` | Judul utama / Main heading |
| `subjudul` | `<h2>` | Subjudul / Subheading |
| `paragraf` | `<p>` | Paragraf / Paragraph |
| `rentang` | `<span>` | Rentang teks / Inline text |
| `pemisah` | `<hr>` | Pemisah garis / Horizontal rule |
| `label` | `<label>` | Label form / Form label |

---

## Container / Wadah

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `ruang` | `<div>` | Kontainer generik / Generic container |
| `wadah` | `<div>` | Wadah semantik / Semantic container |
| `bagian` | `<section>` | Bagian semantik / Semantic section |
| `artikel` | `<article>` | Artikel / Article |
| `utama` | `<main>` | Konten utama / Main content |
| `samping` | `<aside>` | Sidebar / Sidebar |
| `fragmen` | DocumentFragment | Wrapper tanpa render / No-render wrapper |

---

## Navigation / Navigasi

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `navigasi` | `<nav>` | Navigasi / Navigation menu |
| `kepala` | `<header>` | Header halaman / Page header |
| `kaki` | `<footer>` | Footer halaman / Page footer |

---

## Form & Input / Formulir & Masukan

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `formulir` / `form` | `<form>` | Formulir / Form container |
| `masukan` | `<input>` | Masukan teks / Text input |
| `pilihan` | `<select>` | Pilihan dropdown / Select dropdown |
| `opsi` | `<option>` | Opsi dalam select / Option in select |
| `kolom` | `<textarea>` | Kolom teks multibaris / Multiline textarea |

---

## List / Daftar

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `daftar` | `<ul>` | Daftar tidak terurut / Unordered list |
| `daftarterurut` | `<ol>` | Daftar terurut / Ordered list |
| `item` | `<li>` | Item daftar / List item |

---

## Media / Media

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `gambar` | `<img>` | Gambar / Image |
| `kanvas` | `<canvas>` | Canvas drawing / Canvas |
| `video` | `<video>` | Video / Video |
| `audio` | `<audio>` | Audio / Audio |
| `bingkai` | `<iframe>` | Bingkai tertanam / Embedded iframe |

---

## Table / Tabel

| Alias | HTML Tag | Deskripsi / Description |
|-------|----------|-------------------------|
| `tabel` | `<table>` | Tabel / Table |

Standard tags `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` tidak punya alias (gunakan nama standar).

---

## CSS Classes & IDs / Kelas & ID CSS

Semua alias mendukung CSS classes dan IDs:

All aliases support CSS classes and IDs:

```pjs
Buat tombol#submitBtn.btn.btn-primary: "Submit"
Buat ruang.kontainer.dengan-padding: ""
Buat daftar.list-inline#navigation: ""
```

---

## Examples / Contoh

### Card Pattern
```pjs
Buat ruang.kartu:
    Buat gambar[src="/image.jpg" alt="Product"]: ""
    Buat judul: "Product Name"
    Buat paragraf: "Description"
    Buat tombol: "Buy"
```

### Form
```pjs
Buat formulir#loginForm:
    Buat label: "Email"
    Buat masukan#email[type="email"]: ""
    
    Buat label: "Password"
    Buat masukan#password[type="password"]: ""
    
    Buat tombol[type="submit"]: "Login"
```

### Navigation
```pjs
Buat kepala:
    Buat navigasi:
        Buat tautan[href="/"]: "Home"
        Buat tautan[href="/about"]: "About"

Buat kaki:
    Buat paragraf: "© 2026 Company"
```

---

## Quick Reference Card / Kartu Referensi Cepat

```
TEXT:       tombol, tautan, judul, subjudul, paragraf, rentang, pemisah
CONTAINER:  ruang, wadah, bagian, artikel, utama, samping, fragmen
NAVIGATION: navigasi, kepala, kaki
FORM:       formulir, masukan, pilihan, opsi, kolom
LIST:       daftar, daftarterurut, item
MEDIA:      gambar, kanvas, video, audio, bingkai
TABLE:      tabel
```

---

## Fallback ke HTML Standar

Jika alias tidak ada, gunakan nama tag HTML standar:

If an alias doesn't exist, use standard HTML tag name:

```pjs
Buat video[src="/movie.mp4"]: ""
Buat svg: ""
Buat br: ""
```

---

## Verification / Verifikasi

✅ [VERIFIED: src/lexer/promptjs-lexer.js lines 337-402]

32 tag aliases confirmed against source code.

---

← [Keywords](../language/keywords.md) · [Event Aliases](event-aliases.md) →
