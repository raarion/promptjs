<div align="center">
  <div>
  <img src="./assets/PromptJS-logo.svg" alt="PromptJS Logo" width="300">
  </div>
  <div>
  <img src="./assets/prompt-js.svg" alt="PromptJS Logo" width="200">
  </div>

  <p>
    <a href="https://github.com/raarion/promptjs/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-d8b4fe?style=for-the-badge&logo=open-source-initiative&logoColor=d8b4fe"></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.4.0-86efac?style=for-the-badge&logo=git&logoColor=86efac">
    <img alt="Zero Dependencies" src="https://img.shields.io/badge/runtime-zero--deps-7dd3fc?style=for-the-badge&logo=rocket&logoColor=7dd3fc">
    <a href="https://raarion.github.io/promptjs/"><img alt="Live Showcase" src="https://img.shields.io/badge/showcase-live-fca5a5?style=for-the-badge&logo=github&logoColor=fca5a5"></a>
  </p>

  <p><strong>A mini-DSL template engine that compiles to vanilla JS with zero dependencies.</strong></p>
  <mark><sup><strong>  Tulis dengan Bahasa yang Kamu Pahami, dan Hasilkan Kode yang Dunia Mengerti.  </strong></sup></mark>
</div>

---

## Apa itu PromptJS?

**PromptJS** adalah bahasa domain-specific (DSL) berbasis indentasi yang mengkompilasi template deklaratif menjadi JavaScript vanilla. Didesain dengan kata kunci bilingual (Indonesia & English), pipeline 5 tahap, dan output zero-runtime-dependency.

### **PromptJS: Jembatan Inovatif antara Coding, Vibe-Coding dan Prompting**
Di tengah maraknya era _AI_ dan tren _vibe coding_ yang mulai menggeser kebiasaan menulis kode tradisional, batasan antara memberikan instruksi (_prompting_) dan pemrograman menjadi semakin **bias**. **PromptJS** hadir dengan harapan menjadi sebuah jembatan inovatif untuk mempertemukan dunia _coding_, _vibe coding_, dan _prompting_ dalam satu kesatuan.

### **Pendekatan Bilingual dan Intuitif**
Melalui pendekatan _bilingual_ (Indonesia & Inggris) yang hampir tanpa simbol sintaksis (_zero syntax symbol_), bahasa ini dirancang agar mengalir seperti rangkaian kata yang _intuitif_ namun tetap patuh pada aturan pola dan format _compiler_ yang ketat. Pengguna akan merasakan pengalaman layaknya menulis sebuah _prompt_ ke AI, sementara di balik layar, _compiler_ **PromptJS** bekerja cerdas memisahkan dan menghubungkan instruksi tersebut ke dalam file HTML, CSS, dan _vanilla JS_ yang terstruktur secara mandiri.

### **Menghancurkan Dinding Pembatas dalam Pemrograman**
> Harapan terbesar dari proyek ini adalah meruntuhkan dinding pembatas dalam belajar pemrograman.
>
Dengan menjaga _workflow_ yang tetap terasa disiplin sebagai aktivitas _coding_ namun dikemas dalam kenyamanan interaksi layaknya hanya menulis _prompt_, **PromptJS** ingin memastikan bahwa siapapun—_bahkan mereka yang baru terbiasa berkomunikasi dengan AI_—dapat mulai menulis kode yang sesungguhnya dengan mudah. Ini adalah ruang di mana struktur logika yang _presisi_ bertemu dengan bahasa yang _manusiawi_, membuka pintu bagi generasi _developer_ baru untuk berkarya tanpa hambatan kerumitan simbol.

## Fitur Utama

- **Sintaks blok & indentasi** — tidak perlu kurung kurawal atau tag penutup
- **Kata kunci bilingual** — `Buat`/`Create`, `Jika`/`If`, `Lainnya`/`Else`, `Ulangi`/`Loop`, dll.
- **Front-matter data binding** — `--- key: value ---` di awal file untuk data eksternal
- **Event alias** — `on_klik` → `diklik` → `click`, dll.
- **Tag alias** — `tombol` → `button`, `masukan` → `input`, dll.
- **Auto-fragment** — multiple top-level children otomatis dibungkus fragment
- **Reaktivitas** — Proxy-based reactivity dengan `data`/`turunan`/`Saat`
- **Sistem komponen** — `Komponen Nama(props):` + `Buat Nama(prop: nilai)`
- **Zero dependency** — output JS vanilla, tanpa framework

## Contoh

```pjs
---
judul: "Selamat Datang"
items:
  - "Apel"
  - "Jeruk"
  - "Mangga"
---

Halaman Beranda:
  Buat h1: $judul
  Buat ul:
    Ulangi untuk item dari $items:
      Buat li: item
```

Menghasilkan JavaScript vanilla yang langsung membuat elemen DOM.

### Contoh dengan Reaktivitas

```pjs
data hitung = 0

Buat tombol:
    "Klik aku"
    on_klik = simpan hitung tambah 1 ke hitung

Buat paragraf:
    "Jumlah: "
    hitung
```

### Contoh dengan Komponen

```pjs
Komponen Kartu(judul, isi):
    Buat div.kartu:
        Buat h2: judul
        Buat p: isi

Halaman:
    Buat ruang:
        gunakan Kartu
```

## Instalasi

```bash
git clone https://github.com/raarion/promptjs.git
cd promptjs
npm install
```

## Penggunaan CLI

```bash
# Kompilasi file tunggal
node src/cli/index.js compile halaman.pjs --stdout

# Kompilasi ke direktori
node src/cli/index.js compile src/ --out-dir dist/

# Dev server dengan live-reload
node src/cli/index.js serve --port 3000

# Build produksi
node src/cli/index.js build --minify

# Scaffold proyek baru
node src/cli/index.js init -t gallery
```

## Live Showcase

Lihat contoh langsung di browser tanpa install apa-apa:

**https://raarion.github.io/promptjs/**

Halaman showcase di-generate oleh `scripts/build-pages.js` — setiap file `examples/*.pjs` di-compile menjadi halaman HTML dengan **source code di kiri** dan **live preview di kanan** (iframe sandboxed). Deploy otomatis ke GitHub Pages setiap push ke `main` via workflow `.github/workflows/pages.yml`.

Untuk build showcase secara lokal:

```bash
npm run pages:build         # one-shot, output ke dist-pages/
npm run pages:dev           # watch mode, rebuild otomatis
```

Lalu buka `dist-pages/index.html` di browser.

## Editor Support

Syntax highlighting untuk file `.pjs` tersedia sebagai **VS Code extension** di folder `editors/vscode/`. Lihat [`editors/vscode/README.md`](editors/vscode/README.md) untuk instruksi install manual atau publish ke Marketplace.

Fitur extension:

- Syntax highlighting untuk keyword bilingual (`Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, …)
- Pengenalan front-matter `--- … ---`
- Highlighting untuk `on_event`, `$external`, string, number, boolean, null
- Indentation guide 2-spaces (sesuai spec PromptJS)
- Snippet untuk scaffold cepat (`Halaman`, `Komponen`, `data`, `Buat`, `Jika`, `Ulangi`)

## Pipeline 5 Tahap

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → JS Vanilla
```

| Tahap | File | Tanggung Jawab |
|-------|------|----------------|
| Lexer | `src/lexer/promptjs-lexer.js` | Tokenisasi, keyword bilingual, event/tag alias |
| Parser | `src/parser/promptjs-parser.js` | AST builder (recursive descent) |
| Resolver | `src/resolver/promptjs-resolver.js` | Resolusi referensi, scope, validasi identifier |
| Analyzer | `src/analyzer/promptjs-analyzer.js` | Analisis semantik, dependency graph, usage tracking |
| Compiler | `src/compiler/promptjs-compiler.js` + emitters | Emit JS vanilla, runtime helpers |

## Testing

```bash
npm test          # Run all tests
npm run coverage  # Coverage report
npm run lint      # ESLint
npm run typecheck # JSDoc type checking
```

243 pengujian mencakup: snapshot codegen per statement type, matriks tes negatif untuk 20+ error codes, positive tests untuk semua statement type, CLI utilities, AST factory, dan visitor pattern.

## Referensi Sintaks

### Kata Kunci

#### Deklarasi & Struktur

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Buat | Create | Buat elemen DOM |
| Halaman | Page | Blok halaman (root element) |
| Komponen | Component | Deklarasi komponen |
| Definisikan | Define | Alias untuk Komponen |
| Fungsi | Func | Deklarasi fungsi |
| Data | State | Deklarasi data reaktif |
| Tetap | Const | Deklarasi konstanta |
| Ubah | Let | Deklarasi variabel mutable |
| Turunan | Derived | Deklarasi computed value |

#### Control Flow

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Jika | If | Kondisional |
| Lainnya | Else | Cabang alternatif |
| Ulangi | Loop | Iterasi (untuk/kali/rentang) |
| Selama | While | Loop dengan kondisi |
| Berhenti | Break | Break dari loop |
| lewati | pass | Skip / body kosong |
| Kembalikan | Return | Return dari fungsi |

#### Event & Lifecycle

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Ketika | When | Event handler dengan target |
| Saat | Watch | Watcher reaktif (data.berubah) |
| Dipasang | Mounted | Lifecycle: dipasang ke DOM |
| Dilepas | Unmounted | Lifecycle: dilepas dari DOM |

#### Aksi DOM

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Tampilkan | Show | Tampilkan elemen |
| Sembunyikan | Hide | Sembunyikan elemen |
| Hapus | Delete | Hapus elemen dari DOM |
| Kosongkan | Clear | Kosongkan children |
| Perbarui | Update | Update properti elemen |

#### Aksi Data

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Simpan | Save | Simpan nilai ke variabel |
| Tambahkan | Append | Tambahkan ke array |
| Kurangi | Remove | Kurangi dari array/variabel |
| Sisipkan | Insert | Sisipkan ke array |

#### Navigasi & Lainnya

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Ambil | Fetch | Ambil dari DOM/URL |
| Arahkan | Navigate | Navigasi halaman |
| Muat Ulang | Reload | Reload halaman |
| Kembali | Back | Browser back |
| Jalankan | Run | Panggil fungsi PromptJS |
| Gunakan | Use | Instansiasi komponen |

### Event Alias

| `on_` Prefix | PromptJS Event | DOM Event |
|--------------|----------------|-----------|
| on_klik | diklik | click |
| on_diklik | diklik | click |
| on_click | diklik | click |
| on_input | diketik | input |
| on_keydown | ditekan | keydown |
| on_keyup | dilepas | keyup |
| on_change | diubah | change |
| on_submit | disubmit | submit |
| on_focus | difokus | focus |
| on_blur | ditinggal | blur |
| on_mouseover | diarahkan | mouseover |
| on_mouseout | ditinggal-kursor | mouseout |
| on_mouseenter | masuk | mouseenter |
| on_mouseleave | keluar | mouseleave |
| on_load | dimuat | DOMContentLoaded |
| on_scroll | digulir | scroll |
| on_dragstart | diseret | dragstart |
| on_contextmenu | dikonteks | contextmenu |
| on_paste | dilewat | paste |
| on_resize | diubahukuran | resize |
| on_error | salah | error |

### Tag Alias

| Indonesia | English | Tag HTML |
|-----------|---------|----------|
| tombol | button | `<button>` |
| ruang, wadah | div | `<div>` |
| judul | h1 | `<h1>` |
| subjudul | h2 | `<h2>` |
| paragraf | p | `<p>` |
| gambar | img | `<img>` |
| tautan | a | `<a>` |
| masukan | input | `<input>` |
| pilihan | select | `<select>` |
| kolom | textarea | `<textarea>` |
| tabel | table | `<table>` |
| artikel | article | `<article>` |
| kanvas | canvas | `<canvas>` |
| opsi | option | `<option>` |
| fragmen | fragment | (virtual) |
| pemisah | hr | `<hr>` |
| frm | form | `<form>` |
| navigasi | nav | `<nav>` |
| kepala | header | `<header>` |
| kaki | footer | `<footer>` |
| bagian | section | `<section>` |
| utama | main | `<main>` |
| samping | aside | `<aside>` |
| daftar | ul | `<ul>` |
| daftarterurut | ol | `<ol>` |
| item | li | `<li>` |
| rentang | span | `<span>` |
| bingkai | iframe | `<iframe>` |

## Contoh Lengkap

Lihat direktori `examples/` untuk contoh yang runnable:

- `examples/counter.pjs` — Counter interaktif dengan reaktivitas
- `examples/todo.pjs` — Todo list dengan tambah/hapus
- `examples/gallery.pjs` — Galeri foto dengan front-matter data

## Struktur Proyek

```
promptjs/
├── package.json
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── .github/workflows/
│   ├── ci.yml               # lint • typecheck • test • smoke (Node 20/22/24)
│   └── pages.yml            # Build showcase & deploy to GitHub Pages
├── assets/                  # Logo SVG (PromptJS-logo.svg, prompt-js.svg)
├── doc-dev/
│   ├── ROADMAP-Level-1.md
│   ├── STATUS-Level-1.md
│   ├── ADR-001-level1-decisions.md
│   ├── INVENTARIS-STATEMENT-ERROR-CODES.md
│   ├── PromptJS-Spec-v0.2.md
│   ├── PromptJS-Evaluasi-Arsitektur.md
│   └── REVIEW-Level1-PreC4.md
├── editors/
│   └── vscode/              # VS Code extension skeleton (syntax + snippets)
│       ├── package.json
│       ├── language-configuration.json
│       ├── syntaxes/promptjs.tmLanguage.json
│       ├── snippets/promptjs.json
│       ├── images/promptjs-logo.png
│       └── scripts/convert-icon.js
├── examples/
│   ├── counter.pjs
│   ├── todo.pjs
│   └── gallery.pjs
├── scripts/
│   └── build-pages.js       # Build showcase site → dist-pages/ (for GitHub Pages)
├── src/
│   ├── engine/              # Pipeline orchestrator
│   ├── lexer/               # Tokenizer
│   ├── parser/              # AST builder
│   ├── resolver/            # Reference resolver
│   ├── analyzer/            # Semantic analyzer
│   ├── compiler/            # Code emitter
│   │   ├── emitters/        # Statement visitors + runtime
│   │   ├── lower/           # Expression lowering
│   │   └── utils/           # Codegen helpers
│   ├── cli/                 # Command-line interface
│   │   └── commands/        # compile, serve, build, init
│   ├── utils/               # Visitor pattern
│   └── tester/              # Manual exploration scripts
├── tests/
│   ├── pipeline.test.js
│   ├── extended.test.js
│   ├── c4-expressions.test.js
│   ├── components.test.js
│   ├── snapshot-codegen.test.js
│   ├── negative-errors.test.js
│   ├── negative-complex.test.js
│   ├── cli-utils.test.js
│   ├── ast-factory-coverage.test.js
│   ├── cli-visitor-coverage.test.js
│   ├── helpers/             # Test utilities
│   ├── reports/             # Test reports (Wave D documentation)
│   └── __snapshots__/       # Snapshot files
└── jsconfig.json
```

## Roadmap

- **v0.5** — Modular runtime, tree-shaking, source maps
- **v1.0** — Plugin system, SSR, component hot-reload
- **v2.0** — Hydration runtime, Rust/Go port

## Lisensi

MIT
