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
    <img alt="Tests" src="https://img.shields.io/badge/tests-431%20passing-a78bfa?style=for-the-badge&logo=vitest&logoColor=a78bfa">
    <a href="https://raarion.github.io/promptjs/"><img alt="Live Showcase" src="https://img.shields.io/badge/showcase-live-fca5a5?style=for-the-badge&logo=github&logoColor=fca5a5"></a>
  </p>

  <p><strong>Bahasa frontend deklaratif dwibahasa yang dikompilasi ke vanilla JavaScript.</strong></p>
  <p><em>Reaktivitas • Komponen • Routing • Auth • Plugin • CSP • Zero Deps</em></p>
  <p><em>Tulis dengan Bahasa yang Kamu Pahami, Hasilkan Kode yang Dunia Mengerti.</em></p>
</div>

---

## 🤔 Apa itu PromptJS?

**PromptJS** adalah bahasa domain-specific (DSL) berbasis indentasi yang mengkompilasi template deklaratif menjadi JavaScript vanilla. Didesain dengan kata kunci bilingual (Indonesia & English), pipeline 5 tahap, dan output zero-runtime-dependency.

PromptJS hadir sebagai jembatan inovatif antara _coding_, _vibe coding_, dan _prompting_ — meruntuhkan dinding pembatas dalam belajar pemrograman dengan menjaga workflow yang tetap terasa disiplin sebagai aktivitas coding, namun dikemas dalam kenyamanan interaksi layaknya menulis prompt.

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

---

## 🔧 Pipeline Kompilasi

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → JS Vanilla
```

| Tahap | File | Tanggung Jawab |
|---|---|---|
| **Lexer** | [`promptjs-lexer.js`](src/lexer/promptjs-lexer.js) | Tokenisasi, keyword bilingual, indentasi → INDENT/DEDENT |
| **Parser** | [`promptjs-parser.js`](src/parser/promptjs-parser.js) | Recursive-descent AST builder, event/tag alias resolution |
| **Resolver** | [`promptjs-resolver.js`](src/resolver/promptjs-resolver.js) | Scope resolution, identifier validation, write tracking |
| **Analyzer** | [`promptjs-analyzer.js`](src/analyzer/promptjs-analyzer.js) | Semantic analysis, type hints, dependency graph, usage warnings |
| **Compiler** | [`promptjs-compiler.js`](src/compiler/promptjs-compiler.js) | Emit vanilla JS + tree-shaken runtime + source maps |

---

## 📂 Repo Map

### 🧬 Engine — Compiler & Runtime

```
src/
├── lexer/
│   ├── [promptjs-lexer.js](src/lexer/promptjs-lexer.js)       ← Tokenizer: karakter → token stream
│   └── [test-lexer.js](src/lexer/test-lexer.js)               ← Lexer test utilities
├── parser/
│   ├── [promptjs-parser.js](src/parser/promptjs-parser.js)    ← Parser: token stream → AST (recursive-descent)
│   ├── [ast-factory.js](src/parser/ast-factory.js)            ← AST node constructors
│   └── [error-codes.js](src/parser/error-codes.js)            ← 70+ kode error/warning bilingual (E/W 1xxx–5xxx)
├── resolver/
│   └── [promptjs-resolver.js](src/resolver/promptjs-resolver.js) ← Scope & reference resolution, write tracking
├── analyzer/
│   ├── [promptjs-analyzer.js](src/analyzer/promptjs-analyzer.js) ← Semantic analysis, type hints, usage warnings
│   └── [dependency-graph.js](src/analyzer/dependency-graph.js)   ← Module dependency graph
├── compiler/
│   ├── [promptjs-compiler.js](src/compiler/promptjs-compiler.js) ← Main codegen: AST → vanilla JS
│   ├── emitters/
│   │   ├── [statements.js](src/compiler/emitters/statements.js)  ← Statement visitors (Buat, Jika, Ulangi, ...)
│   │   └── [runtime.js](src/compiler/emitters/runtime.js)        ← Runtime helpers (reaktivitas, sanitizeHTML)
│   ├── lower/
│   │   └── [expression.js](src/compiler/lower/expression.js)     ← Expression lowering
│   └── utils/
│       └── [codegen.js](src/compiler/utils/codegen.js)           ← Source map (V3 + VLQ) generation
├── engine/
│   ├── [promptjs.js](src/engine/promptjs.js)                     ← Pipeline orchestrator (wires all 5 stages)
│   ├── [builder.js](src/engine/builder.js)                       ← Multi-file project builder
│   ├── [config.js](src/engine/config.js)                         ← pjs.config.js loader + CLI merge
│   ├── [modules.js](src/engine/modules.js)                       ← Module system (Gunakan import)
│   ├── [css.js](src/engine/css.js)                               ← Gaya:/Style: block processor
│   ├── [plugins.js](src/engine/plugins.js)                       ← Plugin transform hooks (4 stage)
│   ├── [router-runtime.js](src/engine/router-runtime.js)         ← SPA client-side router codegen
│   └── adapters/
│       ├── [static.js](src/engine/adapters/static.js)            ← Static export: hashing, meta, sitemap, CSP
│       ├── [node.js](src/engine/adapters/node.js)                ← Node.js server + Dockerfile
│       └── [vercel.js](src/engine/adapters/vercel.js)            ← Vercel serverless output
├── cli/
│   ├── [index.js](src/cli/index.js)                              ← CLI entry point (pjs)
│   ├── [utils.js](src/cli/utils.js)                              ← Colors, formatting, file utils
│   └── commands/
│       ├── [build.js](src/cli/commands/build.js)                 ← pjs build
│       ├── [serve.js](src/cli/commands/serve.js)                 ← pjs serve
│       ├── [compile.js](src/cli/commands/compile.js)             ← pjs compile
│       └── [init.js](src/cli/commands/init.js)                   ← pjs init (scaffolding)
├── utils/
│   └── [visitor.js](src/utils/visitor.js)                        ← Visitor pattern (accept, traverse, getChildKeys)
└── tester/
    └── [test-pipeline.js](src/tester/test-pipeline.js)           ← Pipeline test harness
```

### 📚 Dokumentasi

```
docs/
├── user/                                 ← 📖 Panduan pengguna
│   ├── [getting-started.md](docs/user/getting-started.md)     ← Kenalan pertama
│   ├── [installation.md](docs/user/installation.md)           ← Cara install
│   ├── [quick-start.md](docs/user/quick-start.md)             ← Langsung ngoding
│   ├── [first-app.md](docs/user/first-app.md)                 ← Bikin app pertama
│   └── [deployment.md](docs/user/deployment.md)               ← Deploy ke production
├── language/                             ← 🔤 Referensi bahasa
│   ├── [syntax-reference.md](docs/language/syntax-reference.md)  ← Sintaks lengkap
│   ├── [keywords.md](docs/language/keywords.md)                  ← Daftar keyword bilingual
│   ├── [directives.md](docs/language/directives.md)              ← Front-matter directives
│   ├── [reactivity.md](docs/language/reactivity.md)              ← Sistem reaktivitas
│   ├── [routing.md](docs/language/routing.md)                    ← SPA routing
│   ├── [auth.md](docs/language/auth.md)                          ← Auth guard
│   ├── [components.md](docs/language/components.md)              ← Komponen
│   ├── [expressions.md](docs/language/expressions.md)            ← Ekspresi & operator
│   ├── [modules.md](docs/language/modules.md)                    ← Module system
│   ├── [plugins.md](docs/language/plugins.md)                    ← Plugin authoring
│   └── [adapters.md](docs/language/adapters.md)                  ← Deployment adapters + CSP
└── reference/                            ← 📋 Referensi teknis
    ├── [cli.md](docs/reference/cli.md)                           ← CLI commands
    ├── [config.md](docs/reference/config.md)                     ← pjs.config.js schema
    ├── [error-codes.md](docs/reference/error-codes.md)           ← Kode error & warning
    ├── [event-aliases.md](docs/reference/event-aliases.md)       ← Event name mappings
    ├── [tag-aliases.md](docs/reference/tag-aliases.md)           ← HTML tag mappings
    └── [glossary.md](docs/reference/glossary.md)                 ← Glosarium istilah
```

### 📦 Contoh & Demo

```
examples/
├── [counter.pjs](examples/counter.pjs)                    ← Counter interaktif
├── [todo.pjs](examples/todo.pjs)                          ← Todo list sederhana
├── [gallery.pjs](examples/gallery.pjs)                    ← Galeri gambar
├── todo-app/                                              ← Todo app lengkap (reactive + localStorage)
├── dashboard-app/                                         ← Dashboard SPA (auth, routing, role-based)
└── multi-page/                                            ← Multi-page site
```

### 🧪 Testing & CI

```
tests/                                                     ← 431 tests, 17 test files
├── [snapshot-codegen.test.js](tests/snapshot-codegen.test.js)       ← Snapshot codegen
├── [v0.5-compiler-infra.test.js](tests/v0.5-compiler-infra.test.js) ← Compiler core
├── [v0.6-spa.test.js](tests/v0.6-spa.test.js)                       ← SPA routing
├── [v0.7-data-fetching.test.js](tests/v0.7-data-fetching.test.js)   ← Data fetching
├── [v0.8-adapter.test.js](tests/v0.8-adapter.test.js)               ← Adapters + CSP (48 tests)
├── [v0.9-auth.test.js](tests/v0.9-auth.test.js)                     ← Auth guard
├── [v1.0-release.test.js](tests/v1.0-release.test.js)               ← Regression tests
├── [pipeline.test.js](tests/pipeline.test.js)                       ← Full pipeline
├── [components.test.js](tests/components.test.js)                   ← Komponen
├── [c4-expressions.test.js](tests/c4-expressions.test.js)           ← Expression coverage
├── [cli-utils.test.js](tests/cli-utils.test.js)                     ← CLI utils
├── [extended.test.js](tests/extended.test.js)                       ← Extended scenarios
├── [negative-errors.test.js](tests/negative-errors.test.js)         ← Error path validation
└── [negative-complex.test.js](tests/negative-complex.test.js)       ← Complex error/warning setup
```

### 🛠️ Config & Infra

```
.github/workflows/
├── [ci.yml](.github/workflows/ci.yml)                     ← CI: lint + typecheck + test
├── [pages.yml](.github/workflows/pages.yml)               ← GitHub Pages deploy
└── [release.yml](.github/workflows/release.yml)           ← npm publish
[editors/vscode/](editors/vscode/)                         ← VS Code extension
[scripts/build-pages.js](scripts/build-pages.js)           ← GitHub Pages build script
```

---

## 🏫 PromptJS Academy

> ⚡ **Pre-release — modul sedang disiapkan.**

PromptJS dirancang bukan cuma buat developer — tapi juga buat siapa pun yang baru mulai belajar ngoding. Ke depan, PromptJS Academy akan menyediakan modul ajar siap pakai:

```
modul-ajar/                      ← 🚧 Coming soon
├── dasar/
│   ├── 01-kenalan.md            ← Apa itu coding & PromptJS
│   ├── 02-variabel.md           ← data, tetap, ubah
│   ├── 03-elemen.md             ← Buat h1, p, tombol, gambar
│   ├── 04-event.md              ← Ketika diklik, diketik
│   ├── 05-kondisi.md            ← Jika/Lainnya
│   ├── 06-perulangan.md         ← Ulangi/Untuk
│   └── 07-proyek-akhir.md       ← Bikin app pertama
├── menengah/
│   ├── 08-komponen.md           ← Komponen & props
│   ├── 09-reaktivitas.md        ← data, turunan, Saat
│   ├── 10-routing.md            ← Multi-page SPA
│   ├── 11-auth.md               ← Login & guard
│   └── 12-api.md                ← Ambil data dari API
├── mahir/
│   ├── 13-plugin.md             ← Bikin plugin sendiri
│   ├── 14-deploy.md             ← Build + deploy production
│   ├── 15-csp.md                ← Security hardening
│   └── 16-proyek-final.md       ← Full-stack capstone
├── guru/
│   ├── rpp/                     ← Rencana Pelaksanaan Pembelajaran
│   ├── slide/                   ← Slide presentasi per-materi
│   └── evaluasi/                ← Soal latihan & kunci jawaban
└── bootcamp/
    ├── jadwal.md                ← Kurikulum 4/8/12 minggu
    ├── proyek.md                ← Final project specs
    └── sertifikat.md            ← Template sertifikat
```

**Target:** Sekolah (K13/Kurikulum Merdeka), Bootcamp Coding, Kursus Online, Self-taught.

📣 **Mau kontribusi ngajar?** Buka [CONTRIBUTING.md](CONTRIBUTING.md) atau langsung buka issue!

---

## ✔️ Quality Assurance

```bash
npm test          # 431 tests, 17 test files
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
