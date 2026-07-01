# Arsitektur Proyek / Project Architecture

> docs/project/ > Architecture

Gambaran menyeluruh arsitektur PromptJS: pipeline kompilasi, engine layer, CLI, dan struktur file. Setiap bagian di-*ground* ke file nyata di `src/`.

A comprehensive overview of PromptJS architecture: the compiler pipeline, engine layer, CLI, and file structure. Each section is grounded in actual files under `src/`.

---

## Diagram Arsitektur / Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                     CLI (src/cli/)                    │
│  compile.js  ·  serve.js  ·  build.js  ·  init.js   │
│                                                      │
│  pjs compile → pjs serve → pjs build → pjs init      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                Engine (src/engine/)                   │
│                                                      │
│  promptjs.js ─── orchestrator                        │
│  builder.js  ─── multi-page build + SPA bundling      │
│  css.js      ─── CSS extraction                      │
│  modules.js  ─── module system (kirim/terima)        │
│  plugins.js  ─── 4 transform hooks                   │
│  config.js   ─── pjs.config.js loader                │
│  router-runtime.js ── client-side SPA router         │
│  adapters/   ─── static.js, node.js, vercel.js       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            Compiler (src/compiler/)                   │
│                                                      │
│  promptjs-compiler.js ─── visitor pattern            │
│  emitters/statements.js ── AST → JS statements       │
│  emitters/runtime.js ─── tree-shaken helpers         │
│  lower/expression.js ─── expression lowering         │
│  utils/codegen.js ─── code generation utilities      │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Lexer   │ │  Parser  │ │ Resolver │
    │  src/    │ │  src/    │ │  src/    │
    │  lexer/  │ │  parser/ │ │ resolver/│
    └──────────┘ └──────────┘ └──────────┘
                       │
                       ▼
                ┌──────────┐
                │ Analyzer │
                │  src/    │
                │ analyzer/│
                └──────────┘
```

---

## Struktur File / File Structure

```
promptjs/
├── src/
│   ├── lexer/               (1 file)
│   │   └── promptjs-lexer.js
│   ├── parser/              (3 files)
│   │   ├── promptjs-parser.js
│   │   ├── ast-factory.js
│   │   └── error-codes.js
│   ├── resolver/            (1 file)
│   │   └── promptjs-resolver.js
│   ├── analyzer/            (2 files)
│   │   ├── promptjs-analyzer.js
│   │   └── dependency-graph.js
│   ├── compiler/            (5 files)
│   │   ├── promptjs-compiler.js
│   │   ├── emitters/runtime.js
│   │   ├── emitters/statements.js
│   │   ├── lower/expression.js
│   │   └── utils/codegen.js
│   ├── engine/              (8 files + adapters/)
│   │   ├── promptjs.js
│   │   ├── builder.js
│   │   ├── css.js
│   │   ├── modules.js
│   │   ├── plugins.js
│   │   ├── config.js
│   │   ├── router-runtime.js
│   │   └── adapters/
│   │       ├── static.js
│   │       ├── node.js
│   │       └── vercel.js
│   ├── cli/                 (6 files)
│   │   ├── index.js
│   │   ├── utils.js
│   │   └── commands/
│   │       ├── compile.js
│   │       ├── serve.js
│   │       ├── build.js
│   │       └── init.js
│   └── utils/               (2 files)
│       ├── visitor.js
│       └── path-guard.js
├── tests/                   (17+ test files)
├── examples/                (counter, todo, gallery, dashboard-app, multi-page)
├── docs/                    (user-facing documentation)
├── doc-dev/                 (internal dev documentation)
│   ├── v0.x/                (historical)
│   ├── v1.0-planning/       (v1.0 preparation)
│   └── tutorial/            (archived tutorials)
└── assets/                  (static assets)
```

---

## Compiler Pipeline

Source `.pjs` melewati **5 tahap** sebelum menjadi vanilla JS:

| Tahap / Stage | Modul / Module | Input → Output |
|---|---|---|
| **1. Lexer** | `src/lexer/promptjs-lexer.js` | Teks `.pjs` → Token stream |
| **2. Parser** | `src/parser/promptjs-parser.js` | Token stream → AST |
| **3. Resolver** | `src/resolver/promptjs-resolver.js` | AST → Resolved AST |
| **4. Analyzer** | `src/analyzer/promptjs-analyzer.js` | Resolved AST → Dependency graph |
| **5. Compiler** | `src/compiler/promptjs-compiler.js` | Resolved AST → Vanilla JS |

> Detail lengkap: [compiler-pipeline.md](compiler-pipeline.md).

---

## Engine Layer

### PromptJSEngine (`promptjs.js`)

Kelas orkestrator utama. Menggabungkan seluruh pipeline:
- Menerima source `.pjs` dan opsi konfigurasi
- Menjalankan Lexer → Parser → Resolver → Analyzer → Compiler
- Mengekstrak CSS via `css.js`
- Menangani modul via `modules.js`
- Menerapkan plugin via `plugins.js`
- Mengembalikan `{ js, css, modules, ... }`

### Builder (`builder.js`)

Multi-page build + SPA bundling:
- Mengompilasi beberapa file `.pjs` sekaligus
- Menghasilkan route table untuk SPA
- Menyatukan CSS dari semua halaman
- Output: satu file JS bundle + satu file CSS

### CSS (`css.js`)

Ekstraksi CSS dari blok `Gaya:`:
- Parse blok gaya indentasi-bebas
- Output CSS string yang valid

### Modules (`modules.js`)

Sistem modul `kirim`/`terima` (export/import):
- Lacak dependensi antar file
- Emit module registry di output JS

### Plugins (`plugins.js`)

4 transform hooks:
- `transformSource(source, filename)` → sebelum compile
- `transformJS(js, filename)` → setelah compile JS
- `transformCSS(css, filename)` → setelah compile CSS
- `transformHTML(html, filename)` → setelah generate HTML

### Config (`config.js`)

Loader untuk `pjs.config.js` / `promptjs.config.js`:
- Merge konfigurasi dari file + CLI flags
- Prioritas: CLI > config file > default

### Router Runtime (`router-runtime.js`)

Client-side SPA router (~150 baris):
- Di-embed hanya jika `router: benar` di front-matter
- pushState + popstate
- Dynamic route matching (`/blog/:slug`)
- Auto-intercept `<a href>` internal

### Adapters

| Adapter | File | Output |
|---|---|---|
| **Static** | `adapters/static.js` | `dist/` — HTML + JS + CSS + assets |
| **Node** | `adapters/node.js` | `dist/server.js` — self-contained server |
| **Vercel** | `adapters/vercel.js` | `.vercel/output/` — Build Output API v3 |

---

## CLI Commands

| Command | File | Fungsi / Purpose |
|---|---|---|
| `pjs compile <file>` | `commands/compile.js` | Kompilasi satu file `.pjs` |
| `pjs serve` | `commands/serve.js` | Dev server + WebSocket live-reload |
| `pjs build` | `commands/build.js` | Production build dengan adapter |
| `pjs init -t <template>` | `commands/init.js` | Inisialisasi proyek dari template |

---

## Runtime Helpers

Helpers yang di-emit ke output JS (tree-shaken — hanya yang dipakai):

| Helper | Dipicu oleh / Triggered by | Fungsi |
|---|---|---|
| `__createReactive` | `data x = ...` | Proxy-based reactive state |
| `__createComputed` | `turunan x = ...` | Computed value dari reactive |
| `__watch` | `Saat x:` | Subscribe ke perubahan reactive |
| `__setState` | `simpan ... ke x` | Set nilai reactive |
| `__cleanup` | unmount halaman | Cleanup watcher |
| `__pjs_handleError` | error di handler | Error boundary |
| `__sanitizeHTML` | konten dinamis | HTML sanitizer (allowlist-based) |
| `__safeAttr` | `setAttribute` dinamis | Blokir `on*` handler + URL berbahaya |

> Detail lengkap: [runtime.md](runtime.md).

---

## 9 Prinsip Desain / 9 Design Principles

```
① Zero dependency di production output
② Build tool boleh punya dependency
③ Readability setinggi prompt AI
④ Reactivity eksplisit, bukan auto-tracking
⑤ Tidak ada eval() / new Function()
⑥ Bilingual keyword (Indonesia + Inggris) sebagai prinsip arsitektural
⑦ Jembatan antara coding, vibe-coding, dan prompting
⑧ Zero syntax symbol — mengalir seperti menulis prompt
⑨ Meruntuhkan dinding pembatas dalam belajar pemrograman
```

Setiap fitur diaudit terhadap 9 prinsip ini. Lihat [roadmap.md](roadmap.md) untuk analisis per fitur.

---

## Teknologi & Tooling

| Tool | Keterangan |
|---|---|
| **Runtime** | Vanilla JS (CommonJS `require`) — zero dep di production |
| **Testing** | Vitest 4.x + jsdom |
| **Type check** | TypeScript JSDoc (`checkJs: true`) via `jsconfig.json` |
| **Linting** | ESLint + Prettier |
| **CI** | GitHub Actions (Node 22.x + 24.x) |
| **Git hooks** | Husky + lint-staged |

---

← [Compiler Pipeline](compiler-pipeline.md) · [Runtime →](runtime.md)
