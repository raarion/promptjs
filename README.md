# PromptJS

> _A mini-DSL template engine that compiles to vanilla JS with zero dependencies._

PromptJS adalah bahasa domain-specific (DSL) berbasis indentasi yang mengkompilasi template deklaratif menjadi JavaScript vanilla. Didesain dengan kata kunci bilingual (Indonesia & English), pipeline 5 tahap, dan output zero-runtime-dependency.

---

## Fitur Utama

- **Sintaks blok & indentasi** — tidak perlu kurung kurawal atau tag penutup
- **Kata kunci bilingual** — `Buat`/`Create`, `Jika`/`If`, `Lainnya`/`Else`, `Ulangi`/`Loop`, dll.
- **Front-matter data binding** — `--- key: value ---` di awal file untuk data eksternal
- **Event alias** — `on_klik` → `diklik` → `click`, dll.
- **Tag alias** — `tombol` → `button`, `masukan` → `input`, dll.
- **Auto-fragment** — multiple top-level children otomatis dibungkus fragment
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
    Ulangi item dari $items:
      Buat li: item
```

Menghasilkan JavaScript vanilla yang langsung membuat elemen DOM.

## Instalasi

```bash
git clone https://github.com/raarion/promptjs.git
cd promptjs
```

## Penggunaan CLI

```bash
# Kompilasi file tunggal
node src/cli/index.js compile halaman.pjs --stdout

# Kompilasi ke direktori
node src/cli/index.js compile src/ --out dist/

# Dev server dengan live-reload
node src/cli/index.js serve --port 3000

# Build produksi
node src/cli/index.js build --minify

# Scaffold proyek baru
node src/cli/index.js init -t gallery
```

## Pipeline 5 Tahap

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → JS Vanilla
```

| Tahap      | File                                         | Tanggung Jawab                                    |
|------------|----------------------------------------------|----------------------------------------------------|
| Lexer      | `lexer/promptjs-lexer.js`                    | Tokenisasi, keyword bilingual, event/tag alias     |
| Parser     | `parser/promptjs-parser.js`                  | AST (compatibel dengan ast-factory internal)       |
| Resolver   | `resolver/promptjs-resolver.js`              | Resolusi referensi, validasi identifier            |
| Analyzer   | `analyzer/promptjs-analyzer.js`              | Analisis semantik, konteks `pass`/`lewati`         |
| Compiler   | `compiler/promptjs-compiler.js` + emitters   | Emit JS vanilla, runtime helpers                   |

## Testing

```bash
npm test
```

24 pengujian mencakup: kompilasi dasar, kata kunci bilingual, TextNode, KetikaStatement, referensi eksternal, operator, loop, pass/lewati, auto-fragment, JS_GLOBALS, front-matter, dan lainnya.

## Referensi Sintaks

### Kata Kunci

| Indonesia | English   | Fungsi                        |
|-----------|-----------|-------------------------------|
| Buat      | Create    | Buat elemen DOM               |
| Jika      | If        | Kondisional                   |
| Lainnya   | Else      | Cabang alternatif             |
| Ulangi    | Loop      | Iterasi                       |
| Ketika    | When      | Event handler                 |
| Tetap     | Const     | Deklarasi konstanta           |
| Halaman   | Page      | Blok halaman                  |
| Komponen  | Component | Blok komponen                 |
| lewati    | pass      | Skip / body kosong            |

### Event Alias

| Alias Indonesia | Alias Inggris | Event DOM |
|-----------------|---------------|-----------|
| diklik          | on_click      | click     |
| diubah          | on_change     | change    |
| dikirim         | on_submit     | submit    |
| masuk           | on_mouseenter | mouseenter|
| ...             | ...           | ...       |

### Tag Alias

| Alias Indonesia | Alias Inggris | Tag HTML  |
|-----------------|---------------|-----------|
| tombol          | btn           | button    |
| masukan         | inp           | input     |
| teks            | txt           | span      |
| gambar          | img_          | img       |
| ...             | ...           | ...       |

## Struktur Proyek

```
promptjs/
├── package.json
├── README.md
├── .gitignore
├── assets/
├── doc-dev/
│   ├── PromptJS-Evaluasi-Arsitektur.md
│   ├── PromptJS-Spec-v0.1.md
│   └── PromptJS-Spec-v0.2.md
└── src/
    └── promptjs/
        ├── engine/           # Orchestrator utama
        ├── lexer/             # Tokenizer
        ├── parser/            # AST builder
        ├── resolver/          # Reference resolver
        ├── analyzer/          # Semantic analyzer
        ├── compiler/          # Code emitter
        │   ├── emitters/     # Statement visitors + runtime
        │   ├── lower/        # Expression lowering
        │   └── utils/        # Codegen helpers
        ├── cli/               # Command-line interface
        │   └── commands/     # compile, serve, build, init
        ├── utils/             # Visitor pattern
        ├── runtime/           # (Placeholder — future modular runtime)
        └── tester/
            ├── test-all.js
            ├── test-pipeline.js
            └── test-extended.js
```

## Roadmap

- **v0.5** — Modular runtime, tree-shaking, source maps
- **v1.0** — Plugin system, SSR, component hot-reload
- **v2.0** — Hydration runtime, Rust/Go port

## Lisensi

MIT
