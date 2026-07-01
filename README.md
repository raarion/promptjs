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
    <img alt="Tests" src="https://img.shields.io/badge/tests-880%20passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white">
    <img alt="Coverage" src="https://img.shields.io/badge/coverage-84.8%25%20lines-86efac?style=for-the-badge&logo=vitest&logoColor=86efac">
    <a href="https://raarion.github.io/promptjs/"><img alt="Live Showcase" src="https://img.shields.io/badge/showcase-live-fca5a5?style=for-the-badge&logo=github&logoColor=fca5a5"></a>
  </p>

  <p><strong>DSL deklaratif dwibahasa. Tulis layaknya prompt — hasilkan vanilla JavaScript production-ready.</strong></p>
  <sup><b><mark>Reaktivitas</mark> • <mark>Komponen</mark> • <mark>Routing</mark> • <mark>Auth</mark> • <mark>Plugin</mark> • <mark>CSP</mark> • <mark>Hardened</mark> • <mark>Zero Deps</mark></b></sup>

  <br/>
  <p><em>Tulis dengan Bahasa yang Kamu Pahami, Hasilkan Kode yang Dunia Mengerti.</em></p>
  <hr>
  <p><strong>[  Coding  ]   ⊷   [  Vibe Coding  ]   ⊷   [  Prompting  ]<br>dan PromptJS adalah jembatan antara ketiganya.</strong></p>
</div>

---

## 🤔 Apa itu PromptJS?

**PromptJS** adalah sebuah **DSL** (*domain-specific language*) — bahasa deklaratif
berbasis indentasi yang dikompilasi menjadi JavaScript vanilla. Ia bukan framework.
Ia tidak membungkus runtime. Ia adalah **compiler**: kamu menulis dengan kata-kata
yang mengalir seperti prompt, dan PromptJS menerjemahkannya menjadi kode bersih
tanpa dependensi.

PromptJS lahir dari sebuah pertanyaan sederhana: **di era di mana semua orang sudah
nyaman menulis prompt ke AI, kenapa menulis kode masih terasa seperti bahasa asing?**

Jawabannya adalah menjembatani tiga dunia yang selama ini terpisah:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontFamily': 'monospace'}}}%%

graph TD
    A["✦ CODING ✦<br/>disiplin, ketat, penuh simbol"] --> P
    B["✦ VIBE CODING ✦<br/>semi-bebas, AI-assisted, eksploratif"] --> P
    C["✦ PROMPTING ✦<br/>bebas, natural, seperti ngomong"] --> P

    P[/"<b>P R O M P T J S</b>"/]

    P --> D["jembatan<br/>antara ketiganya"]

    style A fill:#fff0f3,stroke:#ff8fa3,stroke-width:2px,color:#590d22
    style B fill:#e0f4f8,stroke:#48cae4,stroke-width:2px,color:#023e8a
    style C fill:#e9f5db,stroke:#70e000,stroke-width:2px,color:#1a4301
    style P fill:#ff006e,stroke:#ff99c8,stroke-width:3px,color:#fff
    style D fill:#f8f9fa,stroke:#adb5bd,stroke-width:2px,color:#212529
```

PromptJS dirancang dengan kata kunci **bilingual** (Indonesia & Inggris) yang bisa
dicampur dalam satu file, pipeline kompilasi 5 tahap, dan output **zero runtime
dependency**. Ia sengaja **ketat pada aturan** — indentasi, struktur blok, pipeline —
agar tetap terasa seperti *coding* yang sesungguhnya. Tapi permukaannya didesain
sedemikian rupa agar **mengalir seperti menulis prompt**: tanpa `{}`, tanpa `</>`,
hampir tanpa simbol — hanya rangkaian kata yang dirangkai sesuai pola.

Hasilnya: sebuah antarmuka baru antara manusia dan kode. **Disiplin seorang
programmer. Kenyamanan seorang prompter. Kekuatan vanilla JavaScript.**

📖 **[Dokumentasi lengkap →](docs/user/getting-started.md)**

---

## 🎥 Live Showcase

Lihat contoh langsung di browser: **https://raarion.github.io/promptjs/**

Setiap file `examples/*.pjs` di-compile menjadi halaman HTML dengan source code di kiri dan live preview di kanan.

---

## 💻 Editor Support

Syntax highlighting untuk VS Code tersedia di folder `editors/vscode/` — lihat [`editors/vscode/README.md`](editors/vscode/README.md).

---

## 🧬 DNA PromptJS — Prinsip yang Kami Pegang

Ini bukan sekadar fitur. Ini adalah **keyakinan desain** yang menjadi tulang
punggung setiap keputusan di PromptJS:

| Prinsip | Artinya |
|---|---|
| 🗣️ **Bahasa adalah akses** | Bilingual bukan fitur tambahan — ia adalah DNA. Kamu bisa menulis `Buat` atau `Create`, `Jika` atau `If`, dalam satu file yang sama. Bahasa ibumu adalah bahasa pemrograman yang valid. |
| 📝 **Menulis kode = menulis prompt** | PromptJS menghilangkan hampir semua simbol sintaks. Tidak ada `{}`, `</>`, atau `() => {}`. Yang tersisa hanya rangkaian kata dalam struktur yang masuk akal — seperti prompt, tapi dengan aturan yang jelas. |
| 🧱 **Disiplin dalam kenyamanan** | Indentasi ketat. Blok terstruktur. Pipeline 5 tahap. PromptJS tidak mengorbankan kedisiplinan coding demi kemudahan — ia membungkusnya dalam permukaan yang manusiawi. |
| ⚡ **Compile, don't wrap** | PromptJS bukan framework yang membungkus runtime. Ia adalah compiler yang menerjemahkan DSL → vanilla JS. Output bersih, zero dependency, tanpa overhead. |
| 🛡️ **Keamanan dari awal, bukan setelahnya** | Zero `eval()`, zero `new Function()`. Sanitizer allowlist. CSP built-in. Setiap fitur keamanan dikunci oleh regression test. |
| 📚 **Dokumentasi adalah fitur, bukan utang** | Setiap keyword, setiap error code, setiap adapter — terdokumentasi. Bilingual. Dengan contoh nyata. |
| 🧪 **Terukur, bukan klaim** | 880 tests. 84.8% coverage. Mutation testing. CI gate ketat. Tidak ada "seharusnya aman" — semua dibuktikan. |
| 🌏 **Dibangun dari Indonesia, untuk dunia** | Bilingual ID/EN. Modul ajar siap pakai. Dirancang agar siapa pun — dari pelajar hingga profesional — bisa mulai coding dengan bahasa yang mereka pahami. |

---

## 🙄 Kenapa Harus PromptJS?

PromptJS adalah **compiler**, bukan framework. Kamu menulis dalam bahasa Indonesia
(atau Inggris) — dengan struktur yang terasa alami seperti menulis prompt — dan
PromptJS mengkompilasinya menjadi JavaScript vanilla yang siap production.

Tanpa React. Tanpa Vue. Tanpa runtime overhead. Tanpa virtual DOM.

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

→ compile → **vanilla JS**. No `node_modules` di output. No virtual DOM. Just clean,
auditable code yang bisa kamu baca dan pahami.

**PromptJS tidak memintamu belajar sintaks baru — ia memintamu merangkai kata
dalam pola yang sudah kamu mengerti.** Hasilnya? JavaScript. Production-ready.
Zero dependencies.

---

## ⚡ Quick Start

```bash
npm install @raarion/prompt-js            # install
pjs init -t counter              # bikin proyek baru
pjs serve --port 3000            # jalanin dev server
pjs build --adapter static       # build production 🚀
```

**Requirements:** Node.js ≥ 22.0.0 (selaras dengan CI; Node 20 sudah EOL sejak 2025-10)

---

## 🔒 Lingkup v1.0.0 (Capability Lock)

v1.0.0 bukan sekadar label versi — ini **batas kemampuan yang dikunci** sebagai
permukaan stabil PromptJS. Kemampuan berikut adalah identitas resmi rilis 1.0.0
dan dijamin stabil di seluruh lini 1.0.x (perubahan yang merusak hanya pada
major berikutnya):

- **Compiler DSL bilingual** — pipeline penuh lexer → parser → resolver →
  analyzer → compiler/emitters, dengan keyword dwibahasa (`Buat`/`Create`,
  `Jika`/`If`, `Ulangi`/`Loop`) dan 70+ kode error/warning bilingual.
- **Reaktivitas** — `data` berbasis Proxy, computed `turunan`, dan watcher `Saat`.
- **Komponen** — `Komponen Nama(props):` yang composeable & reusable.
- **Sistem modul** — `kirim` / `terima` dengan resolusi & deteksi siklus.
- **CSS scoping** — gaya ber-scope per komponen (`Gaya:` / `Style:`) + alias tag.
- **Router SPA** — `router: benar` (pushState, segmen dinamis, lifecycle).
- **Auth guard** — `butuhAuth: benar` + `peran` (client guard berbasis redirect).
- **Adapter deployment** — `static` · `node` · `vercel`, dengan **path-traversal
  guard terpusat** (`src/utils/path-guard.js`) yang dipakai konsisten lintas
  adapter dan CLI `serve`.
- **Target QA tinggi (terukur, bukan klaim)** — gerbang CI menegakkan: Prettier,
  typecheck (JSDoc/checkJs), ESLint `--max-warnings=0`, **880 test / 43 file**,
  ambang coverage per-modul (saat ini ~84.8% lines / 75.23% branch), mutation
  testing Stryker pada inti semantik, plus `npm audit` & CodeQL untuk rantai pasok.

**Di luar lingkup 1.0.0 (post-1.0):** SSR/hydration, state management lintas
rute bawaan, dan plugin runtime pihak ketiga. Hal-hal ini dapat ditambah di
minor/major berikutnya tanpa melanggar kontrak 1.0.x di atas.

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
| **S-15 / S-21** Guard path traversal tersebar di adapter | 🟡 MED | ✅ Fixed | Guard disentralisasi ke util bersama `src/utils/path-guard.js` (`isInsideRoot`/`safeResolve`), diterapkan ke `serve`/`static`/`vercel` (100% test-covered) |
| **T-1** CLI coverage 0% | ⚪ Test | ✅ Fixed | Suite integrasi CLI (spawn binary + serve e2e) |
| **T-2** Coverage cabang adapter/emitter (S-12/S-21/S-24) | ⚪ Test | ✅ Fixed | Suite edge/branch v6 untuk `static`/`vercel`/`statements` (+70 test) |

**Verifikasi akhir di `main`:** ESLint 0 warning · tsc 0 error · Prettier clean · **880/880 test lulus** (43 file) · coverage lines **84.8%** / branch **75.23%** · `npm audit` 0 kerentanan · versi tetap **v1.0.0**.

> ⚠️ **Catatan jujur:** auth guard PromptJS bersifat **client-side/advisory** — bukan kontrol keamanan server. Untuk otorisasi sesungguhnya, verifikasi peran **wajib** dilakukan di server (gunakan seam `window.__pjs_verifyPeran`).

### 🔧 Audit Follow-ups & DX Hardening

Setelah tiga gelombang keamanan, satu PR lanjutan menutup temuan audit & DX yang terverifikasi — **tetap v1.0.0**, keamanan **fail-closed** terjaga, nol regresi:

| # | Perbaikan | Dampak |
|---|---|---|
| 1 | **Scoped CSS translate tag-alias** (`css.js`) | `tombol[data-pjs-x]` → `button[data-pjs-x]` — komponen scoped + tag Indonesia kini ter-style benar |
| 2 | **Router regex escape** (`router-runtime.js`) | Bagian literal route di-escape sebelum `RegExp` — guard ReDoS |
| 3 | **Kanal warning terstruktur** (Lapis 2) | `console.warn` ad-hoc → format berkode `[PromptJS] PJS-Wxxxx: pesan (saran)`; atribut bahaya tetap diblokir |
| 4 | **Konsolidasi `findPjsFiles()`** | 3 salinan → 1 sumber kebenaran di `cli/utils.js` dengan opsi `{ignoreDirs, sort}` |
| 5 | **Hapus `@ts-nocheck`** (`builder.js`, `css.js`) | Blanket-suppress dihapus; typecheck tetap 0 error |
| 6 | **Normalisasi version banner** | Banner identitas `v0.x` → `v1.0.0` (marker historis dipertahankan) |

**QA gate:** **880/880 test** (43 file) · ESLint `--max-warnings=0` · tsc 0 error · Prettier clean · coverage gate ≥80% lines (lines 84.8% / branch 75.23%) · Stryker mutation 63.91% (naik dari baseline 49.72%) · **v1.0.0**.

---

## ⌨️ Penggunaan CLI

```bash
pjs init -t counter          # Scaffold proyek baru (6 template)
pjs compile halaman.pjs      # Kompilasi file tunggal
pjs serve --port 3000        # Dev server dengan live-reload
pjs build --adapter static   # Build produksi (static | node | vercel)
```

📖 **[Referensi CLI lengkap →](docs/reference/cli.md)**

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
| 🛡️ **Hardened Codegen** | Sanitizer allowlist, `__safeAttr` filter `on*` & URL `javascript:`, escape front-matter |

📖 **[Dokumentasi bahasa lengkap →](docs/language/syntax-reference.md)**

---

## 📂 Repo Map

> 🗂️ Klik setiap section buat expand/collapse. Semua file bisa diklik langsung ke source-nya. No cap.

### 🧬 Engine — Compiler & Runtime

<details>
<summary><b>🔽 Click to expand — Engine (Compiler & Runtime)</b></summary>

- `src/`
  - `lexer/`
    - [promptjs-lexer.js](src/lexer/promptjs-lexer.js) ← Tokenizer: karakter → token stream
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
    - [modules.js](src/engine/modules.js) ← Module system (kirim/terima)
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
    - [path-guard.js](src/utils/path-guard.js) ← Path traversal guard terpusat

</details>

### 📚 Dokumentasi

<details>
<summary><b>🔽 Click to expand — Dokumentasi</b></summary>

- `docs/`
  - `user/` ← 📖 Panduan pengguna
    - [getting-started.md](docs/user/getting-started.md) · [installation.md](docs/user/installation.md) · [quick-start.md](docs/user/quick-start.md) · [first-app.md](docs/user/first-app.md) · [deployment.md](docs/user/deployment.md) · [faq.md](docs/user/faq.md)
  - `language/` ← 🔤 Referensi bahasa
    - [syntax-reference.md](docs/language/syntax-reference.md) · [keywords.md](docs/language/keywords.md) · [directives.md](docs/language/directives.md) · [reactivity.md](docs/language/reactivity.md) · [routing.md](docs/language/routing.md) · [auth.md](docs/language/auth.md) · [components.md](docs/language/components.md) · [expressions.md](docs/language/expressions.md) · [modules.md](docs/language/modules.md) · [plugins.md](docs/language/plugins.md) · [adapters.md](docs/language/adapters.md) · [security.md](docs/language/security.md)
  - `reference/` ← 📋 Referensi teknis
    - [cli.md](docs/reference/cli.md) · [config.md](docs/reference/config.md) · [error-codes.md](docs/reference/error-codes.md) · [event-aliases.md](docs/reference/event-aliases.md) · [tag-aliases.md](docs/reference/tag-aliases.md) · [glossary.md](docs/reference/glossary.md)
  - `project/` ← 🏗️ Arsitektur
    - [architecture.md](docs/project/architecture.md) · [compiler-pipeline.md](docs/project/compiler-pipeline.md) · [runtime.md](docs/project/runtime.md) · [roadmap.md](docs/project/roadmap.md) · [testing.md](docs/project/testing.md) · [contributing.md](docs/project/contributing.md)

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

- `tests/` ← 880 tes, 43 file tes
- [snapshot-codegen.test.js](tests/snapshot-codegen.test.js) ← Snapshot codegen
- [v0.5-compiler-infra.test.js](tests/v0.5-compiler-infra.test.js) ← Compiler core
- [v0.6-spa.test.js](tests/v0.6-spa.test.js) ← SPA routing
- [v0.7-data-fetching.test.js](tests/v0.7-data-fetching.test.js) ← Pengambilan data
- [v0.8-adapter.test.js](tests/v0.8-adapter.test.js) ← Adapter + CSP (48 tes)
- [v0.9-auth.test.js](tests/v0.9-auth.test.js) ← Auth guard
- [v1.0-release.test.js](tests/v1.0-release.test.js) ← Tes regresi
- [security/wave1-security.test.js](tests/security/wave1-security.test.js) ← Regresi PoC Gelombang 1 (S-1, S-2, S-3)
- [security/wave2-security.test.js](tests/security/wave2-security.test.js) ← Regresi PoC Gelombang 2 (S-4, S-5, S-6)
- [cli-integration.test.js](tests/cli-integration.test.js) ← CLI e2e (spawn binary + serve, validasi S-6)
- [cli-commands-coverage.test.js](tests/cli-commands-coverage.test.js) ← Cakupan perintah CLI (T-1)
- [cli-compile.test.js](tests/cli-compile.test.js) ← CLI kompilasi unit test (stdout/out-dir/output/dev/error)
- [cli-serve.test.js](tests/cli-serve.test.js) ← CLI serve unit test (in-process, path traversal, 404, 400)
- [pipeline.test.js](tests/pipeline.test.js) ← Pipeline lengkap
- [components.test.js](tests/components.test.js) ← Komponen
- [c4-expressions.test.js](tests/c4-expressions.test.js) ← Cakupan ekspresi
- [cli-utils.test.js](tests/cli-utils.test.js) ← Utilitas CLI
- [extended.test.js](tests/extended.test.js) ← Skenario yang diperluas
- [negative-errors.test.js](tests/negative-errors.test.js) ← Validasi jalur kesalahan
- [negative-complex.test.js](tests/negative-complex.test.js) ← Pengaturan kesalahan/peringatan kompleks

**Suite ketahanan v2–v4 (edge-case, error-path & branch coverage):**

- [v2-expression-lowering.test.js](tests/v2-expression-lowering.test.js) ← Lowering ekspresi (edge & error path)
- [v2-error-codes.test.js](tests/v2-error-codes.test.js) ← Kontrak kode error/warning bilingual
- [v2-modules-resolution.test.js](tests/v2-modules-resolution.test.js) ← Resolusi modul (kirim/terima, siklus)
- [v2-cli-compile-errors.test.js](tests/v2-cli-compile-errors.test.js) ← Jalur kesalahan CLI compile
- [v2-visitor-traversal.test.js](tests/v2-visitor-traversal.test.js) ← Traversal visitor AST
- [v3-resolver-branches.test.js](tests/v3-resolver-branches.test.js) ← Cabang resolver (first pass)
- [v3-analyzer-branches.test.js](tests/v3-analyzer-branches.test.js) ← Cabang analyzer (first pass)
- [v4-resolver-branches.test.js](tests/v4-resolver-branches.test.js) ← Pendalaman cabang resolver
- [v4-analyzer-branches.test.js](tests/v4-analyzer-branches.test.js) ← Pendalaman cabang analyzer

**Suite mutation-hardening v5 (penguatan assertion untuk membunuh mutant Stryker):**

- [v5-resolver-nocoverage.test.js](tests/v5-resolver-nocoverage.test.js) ← Menutup baris NoCoverage resolver (24 tes)
- [v5-diagnostic-text.test.js](tests/v5-diagnostic-text.test.js) ← Assert exact teks `message`/`suggestion` diagnostik (11 tes)
- [v5-symbol-flags.test.js](tests/v5-symbol-flags.test.js) ← Assert flag boolean simbol (`isReactive`/`isWritable`/`kind`) (11 tes)
- [v5-boundary.test.js](tests/v5-boundary.test.js) ← Boundary & conditional expression (17 tes)

**Suite edge/branch v6 + guard path tersentralisasi (S-12/S-15/S-21/S-24):**

- [v6-static-adapter.test.js](tests/v6-static-adapter.test.js) ← Edge/branch adapter `static` (S-12)
- [v6-vercel-adapter.test.js](tests/v6-vercel-adapter.test.js) ← Edge/branch adapter `vercel` (S-21)
- [v6-statements-emitter.test.js](tests/v6-statements-emitter.test.js) ← Edge/branch emitter `statements` (S-24)
- [v6-path-guard.test.js](tests/v6-path-guard.test.js) ← Guard penahanan path bersama `isInsideRoot`/`safeResolve` (S-15/S-21, 100% coverage)

- `.github/workflows/`
  - [ci.yml](.github/workflows/ci.yml) ← CI: format + typecheck + lint + test (matrix Node 22/24) + coverage gate ≥80% + Stryker mutation
  - [pages.yml](.github/workflows/pages.yml) ← GitHub Pages deploy
  - [release.yml](.github/workflows/release.yml) ← npm publish

</details>

### 🛠️ Config & Infra

<details>
<summary><b>🔽 Click to expand — Config & Infra</b></summary>

- [editors/vscode/](editors/vscode/) ← VS Code extension
- [scripts/build-pages.js](scripts/build-pages.js) ← GitHub Pages build script

</details>

---

## 📚 Dokumentasi

| Kategori | Halaman |
|----------|---------|
| **Panduan** | [Getting Started](docs/user/getting-started.md) · [Quick Start](docs/user/quick-start.md) · [First App](docs/user/first-app.md) · [Installation](docs/user/installation.md) · [Deployment](docs/user/deployment.md) · [FAQ](docs/user/faq.md) |
| **Bahasa** | [Syntax Reference](docs/language/syntax-reference.md) · [Keywords](docs/language/keywords.md) · [Directives](docs/language/directives.md) · [Expressions](docs/language/expressions.md) · [Components](docs/language/components.md) · [Reactivity](docs/language/reactivity.md) · [Routing](docs/language/routing.md) · [Auth](docs/language/auth.md) · [Modules](docs/language/modules.md) · [Plugins](docs/language/plugins.md) · [Adapters](docs/language/adapters.md) · [Security](docs/language/security.md) |
| **Contoh** | [Counter](docs/examples/counter.md) · [Todo](docs/examples/todo.md) · [Gallery](docs/examples/gallery.md) · [SPA](docs/examples/spa.md) · [Auth](docs/examples/auth.md) · [Fullstack](docs/examples/fullstack.md) |
| **Referensi** | [CLI](docs/reference/cli.md) · [Config](docs/reference/config.md) · [Error Codes](docs/reference/error-codes.md) · [Event Aliases](docs/reference/event-aliases.md) · [Tag Aliases](docs/reference/tag-aliases.md) · [Glossary](docs/reference/glossary.md) |
| **Proyek** | [Architecture](docs/project/architecture.md) · [Compiler Pipeline](docs/project/compiler-pipeline.md) · [Runtime](docs/project/runtime.md) · [Testing](docs/project/testing.md) · [Contributing](docs/project/contributing.md) · [Roadmap](docs/project/roadmap.md) |

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
| **Test Suite** | **880 tests** (43 file) | 3,000+ | — | 4,000+ | 10,000+ | — |
| **Modul Ajar / Edukasi** | 🚧 Academy | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mekanisme** | Compile → vanilla JS | Compile → vanilla JS | Fine-grained reactive | Virtual DOM | Virtual DOM | Runtime reactive |

> 🏆 = unik / leading di kategori tersebut.  
> 📋 **Data lengkap, metodologi, dan sumber** → [`BENCHMARK.md`](BENCHMARK.md)

---

## 🧪 Kematangan Test, Coverage & Mutation (v5)

> Semua angka di bawah **terverifikasi dari run nyata** pada fresh install (`npm ci`), bukan klaim. Lihat detail metodologi di [`BENCHMARK.md`](BENCHMARK.md).

| Sinyal | Nilai (v5) | Gate CI |
|---|---|---|
| **Test** | **880 lulus / 880** (43 file, vitest) | wajib hijau |
| **Determinisme** | 880/880 pada **3 run berturut-turut** — nol flaky | — |
| **Coverage lines** | **84.8%** (seluruh proyek via `vitest run --coverage`) | ≥ 80% |
| **Coverage branches** | **75.23%** | dipantau |
| **Mutation score — resolver** | **63.91%** (292 mutant, Stryker `stryker.config.json`) | ≥ base 49.72% |
| **TypeScript JSDoc check** | `tsc --noEmit` — **zero errors** | wajib zero |
| **ESLint** | `--max-warnings=0` — **zero problems** | wajib zero |
| **Prettier** | `--check` — **all green** | wajib hijau |
| **npm audit** | **zero production vulnerabilities** | dipantau CI |
| **CodeQL** | **zero alerts** | dipantau CI |
| **Lines of code (src/)** | **~11,700 lines** | budget ≤ 12,300 (+5.5% dari v0.4) |

📖 **[Panduan testing →](docs/project/testing.md)**

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
npm test          # 880 tests, 43 test files
npm run coverage  # gate ≥80% lines (84.8% measured)
npm run mutation  # Stryker (scoped resolver+analyzer) — 63.91% (baseline 49.72%)
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
