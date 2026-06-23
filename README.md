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

## Daftar Isi

- [Apa itu PromptJS?](#apa-itu-promptjs)
- [Fitur Utama](#fitur-utama)
- [Contoh](#contoh)
- [Instalasi](#instalasi)
- [Penggunaan CLI](#penggunaan-cli)
- [Live Showcase](#live-showcase)
- [Editor Support](#editor-support)
- [Pipeline Kompilasi](#pipeline-kompilasi)
- [Tech Stack](#tech-stack)
- [Testing](#testing)
- [Referensi Sintaks](#referensi-sintaks)
- [Contoh Lengkap](#contoh-lengkap)
- [Struktur Proyek](#struktur-proyek)
- [Peta Proyek PromptJS](#peta-proyek-promptjs)
- [Roadmap](#roadmap)
- [Lisensi](#lisensi)

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

<details>
<summary><b>✨ Lihat contoh lainnya — Reaktivitas & Komponen</b></summary>

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

</details>

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

<details>
<summary><b>⌨️ Referensi singkat — CLI Commands (alias <code>pjs</code>)</b></summary>

- `pjs init` → Setup project baru
- `pjs compile <file>` → Compile single file
- `pjs build [--minify]` → Full build dengan optimasi
- `pjs serve` → Dev server dengan hot reload

</details>

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

## Pipeline Kompilasi

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

## Tech Stack

- **Language**: JavaScript (100%)
- **Runtime**: Node.js ≥20.19.0
- **Testing**: Vitest 4.1.9 + jsdom
- **Linting**: ESLint 10.5.0 + Prettier 3.8.4
- **Type Checking**: TypeScript (JSDoc)
- **Editor Support**: VS Code extension dengan syntax highlighting

## Testing

```bash
npm test          # Run all tests
npm run coverage  # Coverage report
npm run lint      # ESLint
npm run typecheck # JSDoc type checking
```

263 pengujian mencakup: snapshot codegen per statement type, matriks tes negatif untuk 20+ error codes, positive tests untuk semua statement type, CLI utilities, AST factory, dan visitor pattern.

<details>
<summary><b>🧰 Semua Development Scripts</b></summary>

```bash
npm test                 # Run tests
npm test:watch         # Watch mode
npm coverage           # Coverage report
npm lint              # Check linting
npm lint:fix          # Auto-fix linting
npm typecheck         # TypeScript check
npm format            # Format code
npm build             # Build production (minified)
npm pjs               # CLI command
npm pages:build       # Build documentation site
npm pages:dev         # Dev docs site
```

</details>

## Referensi Sintaks

### Kata Kunci

<details>
<summary><b>📐 Deklarasi & Struktur</b></summary>

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

</details>

<details>
<summary><b>🔁 Control Flow</b></summary>

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Jika | If | Kondisional |
| Lainnya | Else | Cabang alternatif |
| Ulangi | Loop | Iterasi (untuk/kali/rentang) |
| Selama | While | Loop dengan kondisi |
| Berhenti | Break | Break dari loop |
| lewati | pass | Skip / body kosong |
| Kembalikan | Return | Return dari fungsi |

</details>

<details>
<summary><b>🎯 Event & Lifecycle</b></summary>

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Ketika | When | Event handler dengan target |
| Saat | Watch | Watcher reaktif (data.berubah) |
| Dipasang | Mounted | Lifecycle: dipasang ke DOM |
| Dilepas | Unmounted | Lifecycle: dilepas dari DOM |

</details>

<details>
<summary><b>🧩 Aksi DOM</b></summary>

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Tampilkan | Show | Tampilkan elemen |
| Sembunyikan | Hide | Sembunyikan elemen |
| Hapus | Delete | Hapus elemen dari DOM |
| Kosongkan | Clear | Kosongkan children |
| Perbarui | Update | Update properti elemen |

</details>

<details>
<summary><b>💾 Aksi Data</b></summary>

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Simpan | Save | Simpan nilai ke variabel |
| Tambahkan | Append | Tambahkan ke array |
| Kurangi | Remove | Kurangi dari array/variabel |
| Sisipkan | Insert | Sisipkan ke array |

</details>

<details>
<summary><b>🧭 Navigasi & Lainnya</b></summary>

| Indonesia | English | Fungsi |
|-----------|---------|--------|
| Ambil | Fetch | Ambil dari DOM/URL |
| Arahkan | Navigate | Navigasi halaman |
| Muat Ulang | Reload | Reload halaman |
| Kembali | Back | Browser back |
| Jalankan | Run | Panggil fungsi PromptJS |
| Gunakan | Use | Instansiasi komponen |

</details>

<details>
<summary><b>🖱️ Event Alias</b></summary>

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

</details>

<details>
<summary><b>🏷️ Tag Alias</b></summary>

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

</details>

## Contoh Lengkap

Lihat direktori `examples/` untuk contoh yang runnable:

- `examples/counter.pjs` — Counter interaktif dengan reaktivitas
- `examples/todo.pjs` — Todo list dengan tambah/hapus
- `examples/gallery.pjs` — Galeri foto dengan front-matter data

## Struktur Proyek

<details>
<summary><b>📂 Lihat struktur folder lengkap</b></summary>

```
promptjs/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Pipeline testing dan linting
│       └── pages.yml                 # Deployment GitHub Pages
│
├── .editorconfig                     # Konfigurasi editor
├── .gitignore                        # File yang diabaikan Git
├── .prettierrc.json                  # Konfigurasi Prettier formatter
├── .prettierignore                   # File yang diabaikan Prettier
├── eslint.config.js                  # Konfigurasi ESLint
├── jsconfig.json                     # Konfigurasi JS path aliases
├── vitest.config.js                  # Konfigurasi unit testing
├── package.json                      # Dependencies & scripts
├── package-lock.json                 # Lock file
│
├── README.md                         # Dokumentasi utama
├── CHANGELOG.md                      # Riwayat versi
├── CONTRIBUTING.md                   # Panduan kontribusi
├── LICENSE                           # MIT License
│
├── src/                              # Core source code
│   ├── lexer/
│   │   ├── promptjs-lexer.js         # Tokenizer untuk .pjs syntax
│   │   └── test-lexer.js             # Utility untuk testing lexer
│   │
│   ├── parser/
│   │   ├── promptjs-parser.js        # Parser AST dari tokens
│   │   ├── ast-factory.js            # Factory untuk membuat AST nodes
│   │   ├── token-types.js            # Definisi tipe token
│   │   └── error-codes.js            # Error codes & pesan
│   │
│   ├── compiler/
│   │   ├── promptjs-compiler.js      # Compiler orchestrator
│   │   ├── lower/
│   │   │   └── expression.js         # Lowering untuk expressions
│   │   ├── emitters/
│   │   │   ├── runtime.js            # Runtime helpers generator
│   │   │   └── statements.js         # Code generation untuk statements
│   │   └── utils/
│   │       └── codegen.js            # Code generation utilities
│   │
│   ├── engine/
│   │   ├── promptjs.js               # Main entry point (package.json main)
│   │   ├── builder.js                # DOM builder utilities
│   │   ├── css.js                    # CSS parsing & injection
│   │   └── modules.js                # Module system & resolution
│   │
│   ├── resolver/
│   │   └── promptjs-resolver.js      # Module & import resolver
│   │
│   ├── analyzer/
│   │   ├── promptjs-analyzer.js      # Static analysis & validation
│   │   └── dependency-graph.js       # Dependency tracking
│   │
│   ├── tester/
│   │   └── test-pipeline.js          # Built-in testing framework
│   │
│   ├── cli/
│   │   ├── index.js                  # CLI entry point (bin: pjs)
│   │   ├── utils.js                  # CLI utilities
│   │   └── commands/
│   │       ├── build.js              # Build & minify command
│   │       ├── compile.js            # Compile single file command
│   │       ├── init.js               # Project initialization
│   │       └── serve.js              # Dev server dengan hot reload
│   │
│   └── utils/
│       └── visitor.js                # AST visitor pattern helper
│
├── tests/                            # Test suite (Vitest)
│   ├── ast-factory-coverage.test.js  # AST factory tests
│   ├── builder-integration.test.js   # Builder integration tests
│   ├── c4-expressions.test.js        # C4 component expression tests
│   ├── cli-utils.test.js             # CLI utilities tests
│   ├── cli-visitor-coverage.test.js  # CLI visitor tests
│   ├── components.test.js            # Component tests
│   ├── extended.test.js              # Extended functionality tests
│   ├── negative-complex.test.js      # Complex error scenarios
│   ├── negative-errors.test.js       # Error handling tests
│   ├── pipeline.test.js              # Full pipeline tests
│   ├── snapshot-codegen.test.js      # Code generation snapshots
│   ├── __snapshots__/                # Vitest snapshot files
│   ├── helpers/
│   │   ├── generate-d1-report.js     # D1 architecture report generator
│   │   ├── generate-d2-report.js     # D2 architecture report generator
│   │   ├── report-generator.js       # Generic report builder
│   │   └── temp-fs.js                # Temporary filesystem helper
│   └── reports/                      # Generated test reports
│
├── examples/                         # Demo projects
│   ├── counter.pjs                   # Simple counter example
│   ├── gallery.pjs                   # Gallery component example
│   ├── todo.pjs                      # TODO app example
│   └── multi-page/
│       └── src/
│           └── pages/
│               ├── index.pjs         # Homepage
│               ├── blog.pjs          # Blog page
│               └── tentang.pjs       # About page (Indonesian)
│
├── editors/
│   └── vscode/
│       ├── package.json              # VS Code extension manifest
│       ├── language-configuration.json
│       ├── syntaxes/
│       │   └── promptjs.tmLanguage.json    # Syntax highlighting
│       ├── snippets/
│       │   └── promptjs.json         # Code snippets
│       └── images/
│           └── promptjs-logo.png     # Extension icon
│
├── assets/
│   ├── PromptJS-logo.svg             # Logo SVG
│   └── prompt-js.svg                 # Icon SVG
│
├── scripts/
│   └── build-pages.js                # GitHub Pages build script
│
└── doc-dev/                          # Development documentation
    ├── ADR-001-level1-decisions.md   # Architecture Decision Records
    ├── PromptJS-Spec-v0.1.md         # Specification v0.1
    ├── PromptJS-Spec-v0.2.md         # Specification v0.2 (latest)
    ├── PromptJS-Evaluasi-Arsitektur.md  # Architecture evaluation
    ├── INVENTARIS-STATEMENT-ERROR-CODES.md
    ├── REVIEW-Level1-PreC4.md        # Level 1 review
    ├── ROADMAP-Level-1.md            # Development roadmap
    ├── STATUS-Level-1.md             # Current status
    └── TUTORIAL-v0.4.md              # v0.4 tutorial
```

</details>

## Peta Proyek PromptJS

> **Base URL:** `https://github.com/raarion/promptjs/blob/main/`

---

<details>
<summary><b>🔧 Konfigurasi & Tooling</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`.editorconfig`](https://github.com/raarion/promptjs/blob/main/.editorconfig) | Konfigurasi editor |
| 2 | [`.gitignore`](https://github.com/raarion/promptjs/blob/main/.gitignore) | File yang diabaikan Git |
| 3 | [`.prettierrc.json`](https://github.com/raarion/promptjs/blob/main/.prettierrc.json) | Konfigurasi Prettier formatter |
| 4 | [`.prettierignore`](https://github.com/raarion/promptjs/blob/main/.prettierignore) | File yang diabaikan Prettier |
| 5 | [`eslint.config.js`](https://github.com/raarion/promptjs/blob/main/eslint.config.js) | Konfigurasi ESLint |
| 6 | [`jsconfig.json`](https://github.com/raarion/promptjs/blob/main/jsconfig.json) | Konfigurasi JS path aliases |
| 7 | [`vitest.config.js`](https://github.com/raarion/promptjs/blob/main/vitest.config.js) | Konfigurasi unit testing |
| 8 | [`package.json`](https://github.com/raarion/promptjs/blob/main/package.json) | Dependencies & scripts |
| 9 | [`package-lock.json`](https://github.com/raarion/promptjs/blob/main/package-lock.json) | Lock file |

</details>

<details>
<summary><b>🚀 CI/CD & Deployment</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`ci.yml`](https://github.com/raarion/promptjs/blob/main/.github/workflows/ci.yml) | Pipeline testing dan linting |
| 2 | [`pages.yml`](https://github.com/raarion/promptjs/blob/main/.github/workflows/pages.yml) | Deployment GitHub Pages |

</details>

<details>
<summary><b>📝 Dokumentasi</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`README.md`](https://github.com/raarion/promptjs/blob/main/README.md) | Dokumentasi utama |
| 2 | [`CHANGELOG.md`](https://github.com/raarion/promptjs/blob/main/CHANGELOG.md) | Riwayat versi |
| 3 | [`CONTRIBUTING.md`](https://github.com/raarion/promptjs/blob/main/CONTRIBUTING.md) | Panduan kontribusi |
| 4 | [`LICENSE`](https://github.com/raarion/promptjs/blob/main/LICENSE) | MIT License |

</details>

<details>
<summary><b>🔤 Lexer (Tokenizer)</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`promptjs-lexer.js`](https://github.com/raarion/promptjs/blob/main/src/lexer/promptjs-lexer.js) | Tokenizer untuk .pjs syntax |
| 2 | [`test-lexer.js`](https://github.com/raarion/promptjs/blob/main/src/lexer/test-lexer.js) | Utility untuk testing lexer |

</details>

<details>
<summary><b>🌳 Parser & AST</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`promptjs-parser.js`](https://github.com/raarion/promptjs/blob/main/src/parser/promptjs-parser.js) | Parser AST dari tokens |
| 2 | [`ast-factory.js`](https://github.com/raarion/promptjs/blob/main/src/parser/ast-factory.js) | Factory untuk membuat AST nodes |
| 3 | [`token-types.js`](https://github.com/raarion/promptjs/blob/main/src/parser/token-types.js) | Definisi tipe token |
| 4 | [`error-codes.js`](https://github.com/raarion/promptjs/blob/main/src/parser/error-codes.js) | Error codes & pesan |

</details>

<details>
<summary><b>⚙️ Compiler</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`promptjs-compiler.js`](https://github.com/raarion/promptjs/blob/main/src/compiler/promptjs-compiler.js) | Compiler orchestrator |
| 2 | [`expression.js`](https://github.com/raarion/promptjs/blob/main/src/compiler/lower/expression.js) | Lowering untuk expressions |
| 3 | [`runtime.js`](https://github.com/raarion/promptjs/blob/main/src/compiler/emitters/runtime.js) | Runtime helpers generator |
| 4 | [`statements.js`](https://github.com/raarion/promptjs/blob/main/src/compiler/emitters/statements.js) | Code generation untuk statements |
| 5 | [`codegen.js`](https://github.com/raarion/promptjs/blob/main/src/compiler/utils/codegen.js) | Code generation utilities |

</details>

<details>
<summary><b>⚡ Engine & Runtime</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`promptjs.js`](https://github.com/raarion/promptjs/blob/main/src/engine/promptjs.js) | Main entry point (package.json main) |
| 2 | [`builder.js`](https://github.com/raarion/promptjs/blob/main/src/engine/builder.js) | DOM builder utilities |
| 3 | [`css.js`](https://github.com/raarion/promptjs/blob/main/src/engine/css.js) | CSS parsing & injection |
| 4 | [`modules.js`](https://github.com/raarion/promptjs/blob/main/src/engine/modules.js) | Module system & resolution |

</details>

<details>
<summary><b>🔗 Resolver & Analyzer</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`promptjs-resolver.js`](https://github.com/raarion/promptjs/blob/main/src/resolver/promptjs-resolver.js) | Module & import resolver |
| 2 | [`promptjs-analyzer.js`](https://github.com/raarion/promptjs/blob/main/src/analyzer/promptjs-analyzer.js) | Static analysis & validation |
| 3 | [`dependency-graph.js`](https://github.com/raarion/promptjs/blob/main/src/analyzer/dependency-graph.js) | Dependency tracking |

</details>

<details>
<summary><b>🖥️ CLI (Command Line Interface)</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`index.js`](https://github.com/raarion/promptjs/blob/main/src/cli/index.js) | CLI entry point (bin: pjs) |
| 2 | [`utils.js`](https://github.com/raarion/promptjs/blob/main/src/cli/utils.js) | CLI utilities |
| 3 | [`build.js`](https://github.com/raarion/promptjs/blob/main/src/cli/commands/build.js) | Build & minify command |
| 4 | [`compile.js`](https://github.com/raarion/promptjs/blob/main/src/cli/commands/compile.js) | Compile single file command |
| 5 | [`init.js`](https://github.com/raarion/promptjs/blob/main/src/cli/commands/init.js) | Project initialization |
| 6 | [`serve.js`](https://github.com/raarion/promptjs/blob/main/src/cli/commands/serve.js) | Dev server dengan hot reload |

</details>

<details>
<summary><b>🧪 Testing</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`test-pipeline.js`](https://github.com/raarion/promptjs/blob/main/src/tester/test-pipeline.js) | Built-in testing framework |
| 2 | [`ast-factory-coverage.test.js`](https://github.com/raarion/promptjs/blob/main/tests/ast-factory-coverage.test.js) | AST factory tests |
| 3 | [`builder-integration.test.js`](https://github.com/raarion/promptjs/blob/main/tests/builder-integration.test.js) | Builder integration tests |
| 4 | [`c4-expressions.test.js`](https://github.com/raarion/promptjs/blob/main/tests/c4-expressions.test.js) | C4 component expression tests |
| 5 | [`cli-utils.test.js`](https://github.com/raarion/promptjs/blob/main/tests/cli-utils.test.js) | CLI utilities tests |
| 6 | [`cli-visitor-coverage.test.js`](https://github.com/raarion/promptjs/blob/main/tests/cli-visitor-coverage.test.js) | CLI visitor tests |
| 7 | [`components.test.js`](https://github.com/raarion/promptjs/blob/main/tests/components.test.js) | Component tests |
| 8 | [`extended.test.js`](https://github.com/raarion/promptjs/blob/main/tests/extended.test.js) | Extended functionality tests |
| 9 | [`negative-complex.test.js`](https://github.com/raarion/promptjs/blob/main/tests/negative-complex.test.js) | Complex error scenarios |
| 10 | [`negative-errors.test.js`](https://github.com/raarion/promptjs/blob/main/tests/negative-errors.test.js) | Error handling tests |
| 11 | [`pipeline.test.js`](https://github.com/raarion/promptjs/blob/main/tests/pipeline.test.js) | Full pipeline tests |
| 12 | [`snapshot-codegen.test.js`](https://github.com/raarion/promptjs/blob/main/tests/snapshot-codegen.test.js) | Code generation snapshots |

</details>

<details>
<summary><b>🛠️ Test Helpers</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`generate-d1-report.js`](https://github.com/raarion/promptjs/blob/main/tests/helpers/generate-d1-report.js) | D1 architecture report generator |
| 2 | [`generate-d2-report.js`](https://github.com/raarion/promptjs/blob/main/tests/helpers/generate-d2-report.js) | D2 architecture report generator |
| 3 | [`report-generator.js`](https://github.com/raarion/promptjs/blob/main/tests/helpers/report-generator.js) | Generic report builder |
| 4 | [`temp-fs.js`](https://github.com/raarion/promptjs/blob/main/tests/helpers/temp-fs.js) | Temporary filesystem helper |

</details>

<details>
<summary><b>📚 Examples & Demos</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`counter.pjs`](https://github.com/raarion/promptjs/blob/main/examples/counter.pjs) | Simple counter example |
| 2 | [`gallery.pjs`](https://github.com/raarion/promptjs/blob/main/examples/gallery.pjs) | Gallery component example |
| 3 | [`todo.pjs`](https://github.com/raarion/promptjs/blob/main/examples/todo.pjs) | TODO app example |
| 4 | [`index.pjs`](https://github.com/raarion/promptjs/blob/main/examples/multi-page/src/pages/index.pjs) | Homepage |
| 5 | [`blog.pjs`](https://github.com/raarion/promptjs/blob/main/examples/multi-page/src/pages/blog.pjs) | Blog page |
| 6 | [`tentang.pjs`](https://github.com/raarion/promptjs/blob/main/examples/multi-page/src/pages/tentang.pjs) | About page (Indonesian) |

</details>

<details>
<summary><b>🎨 Assets & Branding</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`PromptJS-logo.svg`](https://github.com/raarion/promptjs/blob/main/assets/PromptJS-logo.svg) | Logo SVG |
| 2 | [`prompt-js.svg`](https://github.com/raarion/promptjs/blob/main/assets/prompt-js.svg) | Icon SVG |

</details>

<details>
<summary><b>📝 VS Code Extension</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`package.json`](https://github.com/raarion/promptjs/blob/main/editors/vscode/package.json) | VS Code extension manifest |
| 2 | [`language-configuration.json`](https://github.com/raarion/promptjs/blob/main/editors/vscode/language-configuration.json) | Language configuration |
| 3 | [`promptjs.tmLanguage.json`](https://github.com/raarion/promptjs/blob/main/editors/vscode/syntaxes/promptjs.tmLanguage.json) | Syntax highlighting |
| 4 | [`promptjs.json`](https://github.com/raarion/promptjs/blob/main/editors/vscode/snippets/promptjs.json) | Code snippets |
| 5 | [`promptjs-logo.png`](https://github.com/raarion/promptjs/blob/main/editors/vscode/images/promptjs-logo.png) | Extension icon |

</details>

<details>
<summary><b>🔨 Scripts & Build</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`build-pages.js`](https://github.com/raarion/promptjs/blob/main/scripts/build-pages.js) | GitHub Pages build script |

</details>

<details>
<summary><b>📋 Dev Documentation (doc-dev)</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`ADR-001-level1-decisions.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/ADR-001-level1-decisions.md) | Architecture Decision Records |
| 2 | [`PromptJS-Spec-v0.1.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/PromptJS-Spec-v0.1.md) | Specification v0.1 |
| 3 | [`PromptJS-Spec-v0.2.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/PromptJS-Spec-v0.2.md) | Specification v0.2 (latest) |
| 4 | [`PromptJS-Evaluasi-Arsitektur.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/PromptJS-Evaluasi-Arsitektur.md) | Architecture evaluation |
| 5 | [`INVENTARIS-STATEMENT-ERROR-CODES.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/INVENTARIS-STATEMENT-ERROR-CODES.md) | Statement error codes inventory |
| 6 | [`REVIEW-Level1-PreC4.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/REVIEW-Level1-PreC4.md) | Level 1 review |
| 7 | [`ROADMAP-Level-1.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/ROADMAP-Level-1.md) | Development roadmap |
| 8 | [`STATUS-Level-1.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/STATUS-Level-1.md) | Current status |
| 9 | [`TUTORIAL-v0.4.md`](https://github.com/raarion/promptjs/blob/main/doc-dev/TUTORIAL-v0.4.md) | v0.4 tutorial |

</details>

<details>
<summary><b>🔧 Utilities</b></summary>

| # | File | Keterangan |
|---|------|------------|
| 1 | [`visitor.js`](https://github.com/raarion/promptjs/blob/main/src/utils/visitor.js) | AST visitor pattern helper |

</details>


---
## Roadmap

- **v0.5** — Modular runtime, tree-shaking, source maps
- **v1.0** — Plugin system, SSR, component hot-reload
- **v2.0** — Hydration runtime, Rust/Go port

## Lisensi

MIT
