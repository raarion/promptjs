# Tutorial: Build Your First Multi-Page App with PromptJS v0.4.0

> Panduan lengkap membangun aplikasi multi-halaman dengan PromptJS — dari setup hingga deploy.

## Daftar Isi

1. [Setup Proyek](#1-setup-proyek)
2. [Halaman Pertama](#2-halaman-pertama)
3. [Menambah CSS](#3-menambah-css)
4. [Multi-Halaman dengan Routing](#4-multi-halaman-dengan-routing)
5. [Sharing Data antar File (Module System)](#5-sharing-data-antar-file-module-system)
6. [Komponen Reusable](#6-komponen-reusable)
7. [Build untuk Production](#7-build-untuk-production)
8. [Dev Server dengan HMR](#8-dev-server-dengan-hmr)

---

## 1. Setup Proyek

Buat struktur folder berikut:

```
my-app/
├── src/
│   ├── pages/          # Halaman (auto-routing)
│   ├── components/     # Komponen reusable
│   └── styles/         # CSS global (opsional)
├── package.json
└── .gitignore
```

```bash
mkdir -p my-app/src/pages my-app/src/components my-app/src/styles
cd my-app
npm init -y
npm install raarion/promptjs
```

## 2. Halaman Pertama

Buat `src/pages/index.pjs`:

```pjs
Halaman Beranda:
    Buat h1: "Hello PromptJS"
    Buat p: "Ini halaman pertama saya."
```

Compile single file:
```bash
npx pjs compile src/pages/index.pjs --stdout
```

## 3. Menambah CSS

Tambahkan block `Gaya:` di file yang sama:

```pjs
Gaya:
    body
        font-family: system-ui, sans-serif
        margin: 0
        padding: 20px
        background: #f5f5f5
    h1
        color: #1a1a2e
    p
        color: #555
        line-height: 1.6

Halaman Beranda:
    Buat h1: "Hello PromptJS"
    Buat p: "Ini halaman pertama saya dengan CSS."
```

CSS otomatis di-compile ke `prompt.css` saat build. Scoped per halaman dengan `data-pjs-<page>` attribute selector.

### Responsive dengan @media

```pjs
Gaya:
    .container
        max-width: 1200px
        margin: 0 auto
    @media (max-width: 600px)
        .container
            padding: 12px

Halaman:
    Buat div.container:
        Buat h1: "Responsive"
```

## 4. Multi-Halaman dengan Routing

Buat file `.pjs` di `src/pages/` — nama file menentukan route:

```
src/pages/index.pjs      → /
src/pages/about.pjs      → /about
src/pages/blog.pjs       → /blog
src/pages/blog/post.pjs  → /blog/post
```

Contoh `src/pages/about.pjs`:

```pjs
Gaya:
    .about
        max-width: 600px
        margin: 40px auto
        padding: 20px

Halaman Tentang:
    Buat div.about:
        Buat h2: "Tentang Kami"
        Buat p: "Halaman tentang dengan CSS scoped."
```

## 5. Sharing Data antar File (Module System)

Bagikan nilai, fungsi, atau data antar file dengan `kirim`/`terima`:

**`src/pages/config.pjs`** (file pengirim):
```pjs
---
kirim: apiKey = "abc123"
kirim: apiUrl = "https://api.example.com"
---

Halaman Config:
    Buat p: "Config page (tidak di-route ke user)"
```

**`src/pages/index.pjs`** (file penerima):
```pjs
---
terima: apiKey dari "config.pjs"
terima: apiUrl dari "config.pjs"
---

Halaman Beranda:
    Buat p: "API Key: "
    Buat span: $apiKey
```

### English version

```pjs
--- share: apiKey = "abc123" ---
--- get: apiKey from "config.pjs" ---
```

## 6. Komponen Reusable

Buat komponen dengan `Komponen`:

```pjs
Komponen KartuProduk(nama, harga):
    Gaya:
        .produk
            border: 1px solid #ddd
            border-radius: 8px
            padding: 16px
            margin: 8px
        .produk h3
            margin: 0 0 8px 0
        .produk .harga
            color: #0f3460
            font-weight: bold
            font-size: 1.2rem

    Buat div.produk:
        Buat h3: nama
        Buat div.harga:
            "Rp "
            harga

Halaman:
    Buat KartuProduk(nama: "Kopi", harga: 25000)
    Buat KartuProduk(nama: "Teh", harga: 15000)
```

## 7. Build untuk Production

```bash
npx pjs build --out-dir dist
```

Output:
```
dist/
├── index.html          # Halaman beranda
├── about.html          # Halaman tentang
├── prompt.js           # Semua JS di-bundle
├── prompt.css          # Semua CSS di-bundle
└── assets/             # Static files (jika ada)
```

Deploy `dist/` ke hosting statis mana pun (Vercel, Netlify, GitHub Pages, dll).

## 8. Dev Server dengan HMR

```bash
npx pjs serve --port 3000
```

Fitur:
- **Live reload**: file berubah → browser auto-refresh
- **CSS HMR**: CSS berubah → hot-swap tanpa reload
- **Error overlay**: compile error tampil di browser

---

## Cheat Sheet

| Sintaks | Fungsi |
|---------|--------|
| `Buat tag:` | Buat elemen DOM |
| `Gaya:` | CSS block |
| `data x = 0` | Data reaktif |
| `turunan y = x tambah 1` | Computed value |
| `Saat x:` | Watcher |
| `simpan nilai ke x` | Set variabel |
| `Jika kondisi:` | Kondisional |
| `Ulangi untuk x dari arr:` | Loop iterasi |
| `Ulangi 5 kali:` | Counted loop |
| `Ulangi i dari 1 sampai 10:` | Range loop |
| `Komponen Nama(props):` | Deklarasi komponen |
| `Buat Nama(prop: val)` | Instansiasi komponen |
| `kirim: x = val` | Share symbol |
| `terima: x dari "file.pjs"` | Import symbol |

---

*Selamat coding dengan PromptJS!*
