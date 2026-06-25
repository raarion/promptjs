# Alias Tag / Tag Aliases

> docs/reference/ → **Tag Aliases**
> ← [Keywords](../language/keywords.md) · [Event Aliases](event-aliases.md) →

---

PromptJS menyediakan 65 alias nama tag yang dipetakan ke tag HTML standar saat kompilasi. Termasuk alias bahasa Indonesia dan nama tag HTML standar yang didaftarkan ulang.

PromptJS provides 65 tag name aliases mapped to standard HTML tags during compilation. Includes Indonesian language aliases and re-registered standard HTML tag names.

---

## Teks & Konten / Text & Content (18 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `tombol` | `<button>` | Alias Indonesia / Indonesian alias |
| `button` | `<button>` | Standar / Standard |
| `judul` | `<h1>` | Alias Indonesia / Indonesian alias |
| `h1` | `<h1>` | Standar / Standard |
| `subjudul` | `<h2>` | Alias Indonesia / Indonesian alias |
| `h2` | `<h2>` | Standar / Standard |
| `h3` | `<h3>` | Standar / Standard |
| `h4` | `<h4>` | Standar / Standard |
| `h5` | `<h5>` | Standar / Standard |
| `h6` | `<h6>` | Standar / Standard |
| `paragraf` | `<p>` | Alias Indonesia / Indonesian alias |
| `p` | `<p>` | Standar / Standard |
| `span` | `<span>` | Standar / Standard |
| `rentang` | `<span>` | Alias Indonesia / Indonesian alias |
| `tautan` | `<a>` | Alias Indonesia / Indonesian alias |
| `a` | `<a>` | Standar / Standard |
| `pemisah` | `<hr>` | Alias Indonesia / Indonesian alias |
| `hr` | `<hr>` | Standar / Standard |

---

## Kontainer / Container (13 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `ruang` | `<div>` | Alias Indonesia / Indonesian alias |
| `div` | `<div>` | Standar / Standard |
| `wadah` | `<div>` | Alias Indonesia / Indonesian alias |
| `artikel` | `<article>` | Alias Indonesia / Indonesian alias |
| `article` | `<article>` | Standar / Standard |
| `section` | `<section>` | Standar / Standard |
| `bagian` | `<section>` | Alias Indonesia / Indonesian alias |
| `main` | `<main>` | Standar / Standard |
| `utama` | `<main>` | Alias Indonesia / Indonesian alias |
| `aside` | `<aside>` | Standar / Standard |
| `samping` | `<aside>` | Alias Indonesia / Indonesian alias |
| `fragmen` | `DocumentFragment` | Alias Indonesia / Indonesian alias |
| `fragment` | `DocumentFragment` | Standar / Standard |

`fragmen` dan `fragment` dipetakan ke `DocumentFragment`, bukan tag HTML. Digunakan sebagai wrapper yang tidak menghasilkan elemen DOM.

`fragmen` and `fragment` map to `DocumentFragment`, not an HTML tag. Used as a no-render wrapper.

---

## Navigasi / Navigation (6 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `nav` | `<nav>` | Standar / Standard |
| `navigasi` | `<nav>` | Alias Indonesia / Indonesian alias |
| `header` | `<header>` | Standar / Standard |
| `kepala` | `<header>` | Alias Indonesia / Indonesian alias |
| `footer` | `<footer>` | Standar / Standard |
| `kaki` | `<footer>` | Alias Indonesia / Indonesian alias |

---

## Form & Masukan / Form & Input (10 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `masukan` | `<input>` | Alias Indonesia / Indonesian alias |
| `input` | `<input>` | Standar / Standard |
| `pilihan` | `<select>` | Alias Indonesia / Indonesian alias |
| `select` | `<select>` | Standar / Standard |
| `opsi` | `<option>` | Alias Indonesia / Indonesian alias |
| `option` | `<option>` | Standar / Standard |
| `kolom` | `<textarea>` | Alias Indonesia / Indonesian alias |
| `textarea` | `<textarea>` | Standar / Standard |
| `formulir` | `<form>` | Alias Indonesia / Indonesian alias |
| `form` | `<form>` | Standar / Standard |
| `frm` | `<form>` | Alias pendek / Short alias |
| `label` | `<label>` | Standar / Standard |

---

## Daftar / List (6 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `ul` | `<ul>` | Standar / Standard |
| `daftar` | `<ul>` | Alias Indonesia / Indonesian alias |
| `ol` | `<ol>` | Standar / Standard |
| `daftarterurut` | `<ol>` | Alias Indonesia (satu kata) / Indonesian alias (one word) |
| `li` | `<li>` | Standar / Standard |
| `item` | `<li>` | Alias Indonesia / Indonesian alias |

`daftarterurut` ditulis sebagai satu kata tanpa spasi atau tanda hubung.

`daftarterurut` is written as one word without spaces or hyphens.

---

## Media (7 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `gambar` | `<img>` | Alias Indonesia / Indonesian alias |
| `img` | `<img>` | Standar / Standard |
| `kanvas` | `<canvas>` | Alias Indonesia / Indonesian alias |
| `canvas` | `<canvas>` | Standar / Standard |
| `video` | `<video>` | Standar / Standard |
| `audio` | `<audio>` | Standar / Standard |
| `iframe` | `<iframe>` | Standar / Standard |
| `bingkai` | `<iframe>` | Alias Indonesia / Indonesian alias |

---

## Tabel / Table (2 alias)

| Alias | Tag HTML | Catatan / Note |
|-------|----------|----------------|
| `tabel` | `<table>` | Alias Indonesia / Indonesian alias |
| `table` | `<table>` | Standar / Standard |

Tag turunan tabel `thead`, `tbody`, `tr`, `th`, `td` tidak memiliki alias. Gunakan nama standar.

Table child tags `thead`, `tbody`, `tr`, `th`, `td` have no alias. Use standard names.

---

## Tag Tanpa Alias / Tags Without Alias

Tag HTML standar berikut tidak memiliki alias dan harus digunakan dengan nama aslinya:

The following standard HTML tags have no alias and must be used by their original names:

`thead`, `tbody`, `tr`, `th`, `td`, `br`, `svg`, `style`, `script`, `link`, `meta`, `head`, `body`, `html`

---

## Contoh Penggunaan / Usage Examples

```pjs
# Menggunakan alias Indonesia
Buat ruang.kartu:
    Buat judul: "Produk"
    Buat paragraf: "Deskripsi produk"
    Buat gambar[src="/img.jpg" alt="Foto"]: ""
    Buat tombol: "Beli"

# Menggunakan nama standar
Buat div.container:
    Buat h1: "Title"
    Buat p: "Content"
    Buat img[src="/photo.jpg"]: ""

# Dengan CSS classes dan IDs
Buat tombol#submitBtn.btn.btn-primary: "Submit"
Buat formulir#loginForm:
    Buat label: "Email"
    Buat masukan#email[type="email"]: ""

# Navigasi
Buat kepala:
    Buat navigasi:
        Buat tautan[href="/"]: "Home"
Buat kaki:
    Buat paragraf: "2026 Company"

# Daftar
Buat daftar:
    Ulangi item dari data.items:
        Buat item: $item.nama

# Fragment (tidak merender wrapper)
Buat fragmen:
    Buat paragraf: "Baris 1"
    Buat paragraf: "Baris 2"
```

---

← [Keywords](../language/keywords.md) · [Event Aliases](event-aliases.md) →