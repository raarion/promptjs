<div align="center">
  <div>
  <img src="./assets/PromptJS-logo.svg" alt="PromptJS Logo" width="300">
  </div>
  <div>
  <img src="./assets/prompt-js.svg" alt="PromptJS Logo" width="200">
  </div>

  <p>
    <a href="https://github.com/raarion/promptjs/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-d8b4fe?style=for-the-badge&logo=open-source-initiative&logoColor=d8b4fe"></a>
    <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-86efac?style=for-the-badge&logo=git&logoColor=86efac">
    <img alt="Zero Dependencies" src="https://img.shields.io/badge/runtime-zero--deps-7dd3fc?style=for-the-badge&logo=rocket&logoColor=7dd3fc">
    <img alt="Tests" src="https://img.shields.io/badge/tests-507%20passing-a78bfa?style=for-the-badge&logo=vitest&logoColor=a78bfa">
    <a href="https://raarion.github.io/promptjs/"><img alt="Live Showcase" src="https://img.shields.io/badge/showcase-live-fca5a5?style=for-the-badge&logo=github&logoColor=fca5a5"></a>
  </p>

  <p><strong>Bahasa frontend deklaratif dwibahasa yang dikompilasi ke vanilla JavaScript.</strong></p>
  <sup><b><mark>Reaktivitas</mark> • <mark>Komponen</mark> • <mark>Routing</mark> • <mark>Auth</mark> • <mark>Plugin</mark> • <mark>CSP</mark> • <mark>Hardened</mark> • <mark>Zero Deps</mark></b></sup>
  <p><em>Tulis dengan Bahasa yang Kamu Pahami, Hasilkan Kode yang Dunia Mengerti.</em></p>
</div>

---

## 🤔 Apa itu PromptJS?

**PromptJS** adalah bahasa domain-specific (DSL) berbasis indentasi yang mengkompilasi template deklaratif menjadi JavaScript vanilla. Didesain dengan kata kunci bilingual (Indonesia & English), pipeline 5 tahap, dan output zero-runtime-dependency.

PromptJS hadir sebagai jembatan inovatif antara _coding_, _vibe coding_, dan _prompting_ — meruntuhkan dinding pembatas dalam belajar pemrograman dengan menjaga workflow yang tetap terasa disiplin sebagai aktivitas coding, namun dikemas dalam kenyamanan interaksi layaknya menulis prompt.

## 🙄 Kenapa Harus PromptJS?

PromptJS adalah **compiler**, bukan framework. Kamu nulis dalam bahasa Indonesia (atau Inggris) yang mirip cara ngomong sehari-hari, dan PromptJS ngubah jadi JavaScript vanilla yang siap production — tanpa React, tanpa Vue, tanpa runtime overhead.

```pjs
---
judul: "Halo Dunia"
---

Halaman Utama:
    data hitung = 0

    Buat h1: $judul
    Buat tombol: "Klik aku"
        Ketika diklik:
            tambahkan 1 ke hitung
    Buat paragraf:
        "Diklik: " + hitung + " kali"
```

→ compile → **vanilla JS**. No virtual DOM, no node_modules di output. Just clean code.

📖 **[Mulai sekarang → docs/user/getting-started.md](docs/user/getting-started.md)**

---

## ⚡ Quick Start

```bash
npm install prompt-js            # install
pjs init -t counter              # bikin proyek baru
pjs serve --port 3000            # jalanin dev server
pjs build --adapter static       # build production 🚀
```

**Requirements:** Node.js ≥ 20.19.0

---

## ⌨️ Penggunaan CLI

```bash
pjs init -t counter          # Scaffold proyek baru (6 template)
pjs compile halaman.pjs      # Kompilasi file tunggal
pjs serve --port 3000        # Dev server dengan live-reload
pjs build --adapter static   # Build produksi (static | node | vercel)
```

---

## ⚙️ Fitur

| Fitur | Deskripsi |
|---|---|
| 🧠 **Sintaks Indentasi** | Python-style — tanpa `{}`, tanpa `</tutup>`. Blok dari indentasi |
| 🌐 **Bilingual** | Keyword dwibahasa: `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop` |
| 🌳 **AST-based** | Full Abstract Syntax Tree — recursive-descent parser + structured node types |
| ⚡ **Reaktivitas** | Proxy-based `data`, computed `turunan`, `Saat` watcher |
| 🧩 **Komponen** | `Komponen Nama(props):` — composeable, reusable |
| 🗺️ **SPA Routing** | `router: benar` — pushState, dynamic segments, lifecycle |
| 🔐 **Auth Guard** | `butuhAuth: benar` + `peran` — redirect-based client guard |
| 🔌 **Plugin System** | 4 transform hooks: source → JS → CSS → HTML |
| 📦 **Adapters** | `static` · `node` · `vercel` — pilih target deployment |
| 🛡️ **CSP Ready** | `--csp` flag — nonce injection buat production hardening |
| 🌳 **Tree Shaking** | Runtime helpers cuma di-emit kalo dipake — output minimal |
| 🔒 **Safe Output** | Zero `eval()`, zero `new Function()`, no dynamic code execution |
| 🛡️ **Hardened Codegen** | Sanitizer allowlist (Sanitizer API/DOM), `__safeAttr` filter `on*` & URL `javascript:`, escape front-matter — lihat [Keamanan](#-keamanan--security-hardening) |

---

## 📊 Benchmark Ringkasan (Summary)

> TL;DR: PromptJS vs kompetitor lain dalam satu tabel. Data lengkap & sumber ada di [`BENCHMARK.md`](BENCHMARK.md).

| Dimensi | PromptJS | Svelte 5 | SolidJS | Vue 3 | React 19 | Alpine.js |
|---|---|---|---|---|---|---|
| **Output Size** (counter app) | **3.5 KB** ✅ | 3–6 KB | 22 KB + app | 46 KB + app | 42 KB + app | 45 KB + app |
| **Compile Time** | **9.8 ms** | ~20 ms | ~5 ms | ~15 ms | ~50 ms | 0 (no compile) |
| **Runtime Deps** | **0** 🏆 | 0 | 3 | 5 | 2 | 1 |
| **node_modules** (install) | **28 MB** ✅ | 32 MB | 18 MB | 48 MB | 52 MB | 12 MB |
| **No `eval()` / `new Function()`** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CSP Built-in** (`--csp` flag) | **✅** 🏆 | ❌ manual | ❌ manual | ❌ manual | ❌ manual | ❌ manual |
| **Keyword Bilingual** (ID + EN) | **✅** 🏆 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Docs Bilingual** | **✅** 🏆 | ❌ | ❌ | parsial | banyak | ❌ |
| **Test Suite** | 507 tests | 3,000+ | — | 4,000+ | 10,000+ | — |
| **Modul Ajar / Edukasi** | 🚧 Academy | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mekanisme** | Compile → vanilla JS | Compile → vanilla JS | Fine-grained reactive | Virtual DOM | Virtual DOM | Runtime reactive |

> 🏆 = unik / leading di kategori tersebut.  
> 📋 **Data lengkap, metodologi, dan sumber** → [`BENCHMARK.md`](BENCHMARK.md)

---

## 🔧 Pipeline Kompilasi

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → JS Vanilla
```

| Tahap | File | Tanggung Jawab |
|---|---|---|
| **Lexer** | [promptjs-lexer.js](src/lexer/promptjs-lexer.js) | Tokenisasi, keyword bilingual, indentasi → INDENT/DEDENT |
| **Parser** | [promptjs-parser.js](src/parser/promptjs-parser.js) | Recursive-descent AST builder, event/tag alias resolution |
| **Resolver** | [promptjs-resolver.js](src/resolver/promptjs-resolver.js) | Scope resolution, identifier validation, write tracking |
| **Analyzer** | [promptjs-analyzer.js](src/analyzer/promptjs-analyzer.js) | Semantic analysis, type hints, dependency graph, usage warnings |
| **Compiler** | [promptjs-compiler.js](src/compiler/promptjs-compiler.js) | Emit vanilla JS + tree-shaken runtime + source maps |

---

## 🎥 Live Showcase

Lihat contoh langsung di browser: **https://raarion.github.io/promptjs/**

Setiap file `examples/*.pjs` di-compile menjadi halaman HTML dengan source code di kiri dan live preview di kanan.

---

## 💻 Editor Support

Syntax highlighting untuk VS Code tersedia di folder `editors/vscode/` — lihat [`editors/vscode/README.md`](editors/vscode/README.md).

---

## 📂 Repo Map

> 🗂️ Klik setiap section buat expand/collapse. Semua file bisa diklik langsung ke source-nya. No cap.

### 🧬 Engine — Compiler & Runtime

<details>
<summary><b>🔽 Click to expand — Engine (Compiler & Runtime)</b></summary>

- `src/`
  - `lexer/`
    - [promptjs-lexer.js](src/lexer/promptjs-lexer.js) ← Tokenizer: karakter → token stream
    - [test-lexer.js](src/lexer/test-lexer.js) ← Lexer test utilities
  - `parser/`
    - [promptjs-parser.js](src/parser/promptjs-parser.js) ← Parser: token stream → AST (recursive-descent)
    - [ast-factory.js](src/parser/ast-factory.js) ← AST node constructors
    - [error-codes.js](src/parser/error-codes.js) ← 70+ kode error/warning bilingual (E/W 1xxx–5xxx)
  - `resolver/`
    - [promptjs-resolver.js](src/resolver/promptjs-resolver.js) ← Scope & reference resolution, write tracking
  - `analyzer/`
    - [promptjs-analyzer.js](src/analyzer/promptjs-analyzer.js) ← Semantic analysis, type hints, usage warnings
    - [dependency-graph.js](src/analyzer/dependency-graph.js) ← Module dependency graph
  - `compiler/`
    - [promptjs-compiler.js](src/compiler/promptjs-compiler.js) ← Main codegen: AST → vanilla JS
    - `emitters/`
      - [statements.js](src/compiler/emitters/statements.js) ← Statement visitors (Buat, Jika, Ulangi, ...)
      - [runtime.js](src/compiler/emitters/runtime.js) ← Runtime helpers (reaktivitas, sanitizeHTML)
    - `lower/`
      - [expression.js](src/compiler/lower/expression.js) ← Expression lowering
    - `utils/`
      - [codegen.js](src/compiler/utils/codegen.js) ← Source map (V3 + VLQ) generation
  - `engine/`
    - [promptjs.js](src/engine/promptjs.js) ← Pipeline orchestrator (wires all 5 stages)
    - [builder.js](src/engine/builder.js) ← Multi-file project builder
    - [config.js](src/engine/config.js) ← pjs.config.js loader + CLI merge
    - [modules.js](src/engine/modules.js) ← Module system (Gunakan import)
    - [css.js](src/engine/css.js) ← Gaya:/Style: block processor
    - [plugins.js](src/engine/plugins.js) ← Plugin transform hooks (4 stage)
    - [router-runtime.js](src/engine/router-runtime.js) ← SPA client-side router codegen
    - `adapters/`
      - [static.js](src/engine/adapters/static.js) ← Static export: hashing, meta, sitemap, CSP
      - [node.js](src/engine/adapters/node.js) ← Node.js server + Dockerfile
      - [vercel.js](src/engine/adapters/vercel.js) ← Vercel serverless output
  - `cli/`
    - [index.js](src/cli/index.js) ← CLI entry point (pjs)
    - [utils.js](src/cli/utils.js) ← Colors, formatting, file utils
    - `commands/`
      - [build.js](src/cli/commands/build.js) ← pjs build
      - [serve.js](src/cli/commands/serve.js) ← pjs serve
      - [compile.js](src/cli/commands/compile.js) ← pjs compile
      - [init.js](src/cli/commands/init.js) ← pjs init (scaffolding)
  - `utils/`
    - [visitor.js](src/utils/visitor.js) ← Visitor pattern (accept, traverse, getChildKeys)
  - `tester/`
    - [test-pipeline.js](src/tester/test-pipeline.js) ← Pipeline test harness

</details>

### 📚 Dokumentasi

<details>
<summary><b>🔽 Click to expand — Dokumentasi</b></summary>

- `docs/`
  - `user/` ← 📖 Panduan pengguna
    - [getting-started.md](docs/user/getting-started.md) ← Kenalan pertama
    - [installation.md](docs/user/installation.md) ← Cara install
    - [quick-start.md](docs/user/quick-start.md) ← Langsung ngoding
    - [first-app.md](docs/user/first-app.md) ← Bikin app pertama
    - [deployment.md](docs/user/deployment.md) ← Deploy ke production
  - `language/` ← 🔤 Referensi bahasa
    - [syntax-reference.md](docs/language/syntax-reference.md) ← Sintaks lengkap
    - [keywords.md](docs/language/keywords.md) ← Daftar keyword bilingual
    - [directives.md](docs/language/directives.md) ← Front-matter directives
    - [reactivity.md](docs/language/reactivity.md) ← Sistem reaktivitas
    - [routing.md](docs/language/routing.md) ← SPA routing
    - [auth.md](docs/language/auth.md) ← Auth guard
    - [components.md](docs/language/components.md) ← Komponen
    - [expressions.md](docs/language/expressions.md) ← Ekspresi & operator
    - [modules.md](docs/language/modules.md) ← Module system
    - [plugins.md](docs/language/plugins.md) ← Plugin authoring
    - [adapters.md](docs/language/adapters.md) ← Deployment adapters + CSP
    - [security.md](docs/language/security.md) ← Keamanan
  - `reference/` ← 📋 Referensi teknis
    - [cli.md](docs/reference/cli.md) ← CLI commands
    - [config.md](docs/reference/config.md) ← pjs.config.js schema
    - [error-codes.md](docs/reference/error-codes.md) ← Kode error & warning
    - [event-aliases.md](docs/reference/event-aliases.md) ← Event name mappings
    - [tag-aliases.md](docs/reference/tag-aliases.md) ← HTML tag mappings
    - [glossary.md](docs/reference/glossary.md) ← Glosarium istilah

</details>

### 📦 Contoh & Demo

<details>
<summary><b>🔽 Click to expand — Contoh & Demo</b></summary>

- `examples/`
  - [counter.pjs](examples/counter.pjs) ← Counter interaktif
  - [todo.pjs](examples/todo.pjs) ← Todo list sederhana
  - [gallery.pjs](examples/gallery.pjs) ← Galeri gambar
  - `todo-app/` ← Todo app lengkap (reactive + localStorage)
  - `dashboard-app/` ← Dashboard SPA (auth, routing, role-based)
  - `multi-page/` ← Multi-page site

</details>

### 🧪 Testing & CI

<details>
<summary><b>🔽 Click to expand — Testing & CI</b></summary>

- `tests/` ← 507 tests, 24 test files
  - [snapshot-codegen.test.js](tests/snapshot-codegen.test.js) ← Snapshot codegen
  - [v0.5-compiler-infra.test.js](tests/v0.5-compiler-infra.test.js) ← Compiler core
  - [v0.6-spa.test.js](tests/v0.6-spa.test.js) ← SPA routing
  - [v0.7-data-fetching.test.js](tests/v0.7-data-fetching.test.js) ← Data fetching
  - [v0.8-adapter.test.js](tests/v0.8-adapter.test.js) ← Adapters + CSP (48 tests)
  - [v0.9-auth.test.js](tests/v0.9-auth.test.js) ← Auth guard
  - [v1.0-release.test.js](tests/v1.0-release.test.js) ← Regression tests
  - [security/wave1-security.test.js](tests/security/wave1-security.test.js) ← Wave 1 PoC regresi (S-1, S-2, S-3)
  - [security/wave2-security.test.js](tests/security/wave2-security.test.js) ← Wave 2 PoC regresi (S-4, S-5, S-6)
  - [cli-integration.test.js](tests/cli-integration.test.js) ← CLI e2e (spawn binary + serve, validasi S-6)
  - [cli-commands-coverage.test.js](tests/cli-commands-coverage.test.js) ← CLI commands coverage (T-1)
  - [pipeline.test.js](tests/pipeline.test.js) ← Full pipeline
  - [components.test.js](tests/components.test.js) ← Komponen
  - [c4-expressions.test.js](tests/c4-expressions.test.js) ← Expression coverage
  - [cli-utils.test.js](tests/cli-utils.test.js) ← CLI utils
  - [extended.test.js](tests/extended.test.js) ← Extended scenarios
  - [negative-errors.test.js](tests/negative-errors.test.js) ← Error path validation
  - [negative-complex.test.js](tests/negative-complex.test.js) ← Complex error/warning setup

</details>

### 🛠️ Config & Infra

<details>
<summary><b>🔽 Click to expand — Config & Infra</b></summary>

- `.github/workflows/`
  - [ci.yml](.github/workflows/ci.yml) ← CI: lint + typecheck + test
  - [pages.yml](.github/workflows/pages.yml) ← GitHub Pages deploy
  - [release.yml](.github/workflows/release.yml) ← npm publish
- [editors/vscode/](editors/vscode/) ← VS Code extension
- [scripts/build-pages.js](scripts/build-pages.js) ← GitHub Pages build script

</details>

---

## 🛡️ Keamanan / Security Hardening

> PromptJS v1.0.0 telah melalui audit keamanan mendalam dan **tiga gelombang perbaikan** yang ter-merge ke `main`. Semua temuan HIGH & MEDIUM ditutup dan dikunci oleh regression test ber-PoC.

| Temuan | Severity | Status | Ringkasan perbaikan |
|---|---|---|---|
| **S-1** Code-injection front-matter auth | 🔴 HIGH | ✅ Fixed | Whitelist storage + `escapeString()` pada nilai input |
| **S-2** Sanitizer regex bypass | 🔴 HIGH | ✅ Fixed | Allowlist berbasis Sanitizer API / parsing DOM (safe-by-default) |
| **S-3** `html:` tak tersanitasi (element-creation) | 🔴 HIGH | ✅ Fixed | Satu jalur emit HTML tunggal melewati sanitizer |
| **S-4** Injeksi atribut/event-handler | 🟡 MED | ✅ Fixed | Helper `__safeAttr` tolak `on*` & URL berbahaya (4 sink) |
| **S-5** Peran auth mudah dipalsukan | 🟡 MED | ✅ Fixed | Seam `__pjs_verifyPeran` + warning jujur (client-side advisory) |
| **S-6** Dev-server path traversal | 🟡 MED | ✅ Fixed | `path.relative()` + `decodeURIComponent` anti-`%2e%2e` |
| **T-1** CLI coverage 0% | ⚪ Test | ✅ Fixed | Suite integrasi CLI (spawn binary + serve e2e) |

**Verifikasi akhir di `main`:** ESLint 0 warning · tsc 0 error · Prettier clean · **507/507 test lulus** · `npm audit` 0 kerentanan · versi tetap **v1.0.0**.

> ⚠️ **Catatan jujur:** auth guard PromptJS bersifat **client-side/advisory** — bukan kontrol keamanan server. Untuk otorisasi sesungguhnya, verifikasi peran **wajib** dilakukan di server (gunakan seam `window.__pjs_verifyPeran`).

### 🔧 Audit Follow-ups & DX Hardening (PR #37 · `2e19456`)

Setelah tiga gelombang keamanan, satu PR lanjutan menutup temuan audit & DX yang terverifikasi — **tetap v1.0.0**, keamanan **fail-closed** terjaga, nol regresi:

| # | Perbaikan | Dampak |
|---|---|---|
| 1 | **Scoped CSS translate tag-alias** (`css.js`) | `tombol[data-pjs-x]` → `button[data-pjs-x]` — komponen scoped + tag Indonesia kini ter-style benar |
| 2 | **Router regex escape** (`router-runtime.js`) | Bagian literal route di-escape sebelum `RegExp` — guard ReDoS |
| 3 | **Kanal warning terstruktur** (Lapis 2) | `console.warn` ad-hoc → format berkode `[PromptJS] PJS-Wxxxx: pesan (saran)`; atribut bahaya tetap diblokir |
| 4 | **Konsolidasi `findPjsFiles()`** | 3 salinan → 1 sumber kebenaran di `cli/utils.js` dengan opsi `{ignoreDirs, sort}` |
| 5 | **Hapus `@ts-nocheck`** (`builder.js`, `css.js`) | Blanket-suppress dihapus; typecheck tetap 0 error |
| 6 | **Normalisasi version banner** | Banner identitas `v0.x` → `v1.0.0` (marker historis dipertahankan) |

**QA gate PR #37:** **507/507 test** (24 file, +17 test regresi baru) · ESLint `--max-warnings=0` · tsc 0 error · Prettier clean · **v1.0.0**.

---

## 🏫 PromptJS Academy

> ⚡ **Pre-release — modul sedang disiapkan.**

PromptJS dirancang bukan cuma buat developer — tapi juga buat siapa pun yang baru mulai belajar ngoding. Ke depan, PromptJS Academy akan menyediakan modul ajar siap pakai:

<details>
<summary><b>🔽 Click to expand — PromptJS Academy (Coming Soon)</b></summary>

- `modul-ajar/` ← 🚧 Coming soon
  - `dasar/`
    - `01-kenalan.md` ← Apa itu coding & PromptJS
    - `02-variabel.md` ← data, tetap, ubah
    - `03-elemen.md` ← Buat h1, p, tombol, gambar
    - `04-event.md` ← Ketika diklik, diketik
    - `05-kondisi.md` ← Jika/Lainnya
    - `06-perulangan.md` ← Ulangi/Untuk
    - `07-proyek-akhir.md` ← Bikin app pertama
  - `menengah/`
    - `08-komponen.md` ← Komponen & props
    - `09-reaktivitas.md` ← data, turunan, Saat
    - `10-routing.md` ← Multi-page SPA
    - `11-auth.md` ← Login & guard
    - `12-api.md` ← Ambil data dari API
  - `mahir/`
    - `13-plugin.md` ← Bikin plugin sendiri
    - `14-deploy.md` ← Build + deploy production
    - `15-csp.md` ← Security hardening
    - `16-proyek-final.md` ← Full-stack capstone
  - `guru/`
    - `rpp/` ← Rencana Pelaksanaan Pembelajaran
    - `slide/` ← Slide presentasi per-materi
    - `evaluasi/` ← Soal latihan & kunci jawaban
  - `bootcamp/`
    - `jadwal.md` ← Kurikulum 4/8/12 minggu
    - `proyek.md` ← Final project specs
    - `sertifikat.md` ← Template sertifikat

</details>

**Target:** Sekolah, Bootcamp Coding, Kursus Online/Offline, Self-taught.

📣 **Mau ikut berkontribusi?** Buka [CONTRIBUTING.md](CONTRIBUTING.md) atau langsung buka issue!

---

## ✔️ Quality Assurance

```bash
npm test          # 507 tests, 24 test files
npm run lint      # ESLint — zero warnings
npm run typecheck # tsc — zero errors
npm run format    # Prettier
```

---

## 🤝 Kontribusi

PromptJS terbuka buat siapa aja — dari bug fix, feature request, sampai modul ajar. Cek [CONTRIBUTING.md](CONTRIBUTING.md) buat panduan lengkap.

---

## 📜 Lisensi

MIT © [raarion](https://github.com/raarion)

---

<div align="center">
  <sub>Dibangun dengan 💚 di Indonesia • Built with 💚 in Indonesia</sub>
</div>