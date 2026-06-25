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
    <a href="https://raarion.github.io/promptjs/"><img alt="Live Showcase" src="https://img.shields.io/badge/showcase-live-fca5a5?style=for-the-badge&logo=github&logoColor=fca5a5"></a>
  </p>

  <p><strong>Bahasa frontend deklaratif bilingual yang dikompilasi ke vanilla JavaScript — dengan reaktivitas, komponen, routing, auth, plugin, dan adapter deployment.</strong></p>

  <p><em>Tulis dengan Bahasa yang Kamu Pahami, dan Hasilkan Kode yang Dunia Mengerti.</em></p>
</div>

---

## Apa itu PromptJS?

**PromptJS** adalah bahasa domain-specific (DSL) berbasis indentasi yang mengkompilasi template deklaratif menjadi JavaScript vanilla. Didesain dengan kata kunci bilingual (Indonesia & English), pipeline 5 tahap, dan output zero-runtime-dependency.

PromptJS hadir sebagai jembatan inovatif antara _coding_, _vibe coding_, dan _prompting_ — meruntuhkan dinding pembatas dalam belajar pemrograman dengan menjaga workflow yang tetap terasa disiplin sebagai aktivitas coding, namun dikemas dalam kenyamanan interaksi layaknya menulis prompt.

📖 **[Baca dokumentasi lengkap → docs/user/getting-started.md](docs/user/getting-started.md)**

---

## Quick Example

```pjs
---
judul: "Selamat Datang"
---

Halaman Beranda:
    data hitung = 0

    Buat h1: $judul
    Buat tombol: "Klik aku"
        Ketika diklik:
            tambahkan 1 ke hitung
    Buat paragraf:
        "Jumlah: "
        $hitung
```

Menghasilkan JavaScript vanilla yang langsung membuat elemen DOM — tanpa framework, tanpa virtual DOM, tanpa dependency.

---

## Instalasi

```bash
# Dari npm
npm install prompt-js

# Atau dari source
git clone https://github.com/raarion/promptjs.git
cd promptjs && npm install
```

**Requirements:** Node.js ≥ 20.19.0

---

## Penggunaan CLI

```bash
pjs init -t counter          # Scaffold proyek baru (6 template)
pjs compile halaman.pjs      # Kompilasi file tunggal
pjs serve --port 3000        # Dev server dengan live-reload
pjs build --adapter static   # Build produksi (static | node | vercel)
```

---

## Fitur Utama

- **Sintaks blok & indentasi** — tanpa kurung kurawal atau tag penutup
- **Kata kunci bilingual** — `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, dll
- **Reaktivitas Proxy-based** — `data`, `turunan`, `Saat` watcher
- **Sistem komponen** — `Komponen Nama(props):` + `Buat Nama(prop: nilai)`
- **SPA routing** — `router: benar` + lifecycle `dipasang`/`dilepas`
- **Auth guard** — `butuhAuth: benar` + `peran` role-based access
- **Plugin system** — 4 transform hooks (source, JS, CSS, HTML)
- **Deployment adapters** — Static, Node, Vercel
- **Zero dependency** — output JS vanilla murni

---

## Pipeline Kompilasi

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → JS Vanilla
```

| Tahap | Tanggung Jawab |
|-------|----------------|
| Lexer | Tokenisasi, keyword bilingual, event/tag alias |
| Parser | AST builder (recursive descent) |
| Resolver | Resolusi referensi, scope, validasi identifier |
| Analyzer | Analisis semantik, dependency graph, usage tracking |
| Compiler | Emit JS vanilla + tree-shaken runtime helpers |

---

## Dokumentasi

| Kategori | Link |
|----------|------|
| **Panduan** | [Getting Started](docs/user/getting-started.md) · [Quick Start](docs/user/quick-start.md) · [First App](docs/user/first-app.md) · [Deployment](docs/user/deployment.md) |
| **Bahasa** | [Syntax Reference](docs/language/syntax-reference.md) · [Keywords](docs/language/keywords.md) · [Directives](docs/language/directives.md) · [Reactivity](docs/language/reactivity.md) · [Routing](docs/language/routing.md) · [Auth](docs/language/auth.md) |
| **Contoh** | [Counter](docs/examples/counter.md) · [Todo](docs/examples/todo.md) · [Gallery](docs/examples/gallery.md) · [SPA](docs/examples/spa.md) · [Auth](docs/examples/auth.md) |
| **Referensi** | [CLI](docs/reference/cli.md) · [Error Codes](docs/reference/error-codes.md) · [Event Aliases](docs/reference/event-aliases.md) · [Tag Aliases](docs/reference/tag-aliases.md) |
| **Proyek** | [Architecture](docs/project/architecture.md) · [Compiler Pipeline](docs/project/compiler-pipeline.md) · [Runtime](docs/project/runtime.md) · [Contributing](docs/project/contributing.md) · [Roadmap](docs/project/roadmap.md) |

---

## Live Showcase

Lihat contoh langsung di browser: **https://raarion.github.io/promptjs/**

Setiap file `examples/*.pjs` di-compile menjadi halaman HTML dengan source code di kiri dan live preview di kanan.

---

## Editor Support

Syntax highlighting untuk VS Code tersedia di folder `editors/vscode/` — lihat [`editors/vscode/README.md`](editors/vscode/README.md).

---

## Roadmap

- **v0.5–v0.9** ✅ — Compiler infra, SPA, data fetching, plugins, adapters, auth
- **v1.0** ✅ — Demo apps, hapus-dari, web storage lowering, CI/CD, npm publish
- **v1.1+** 🔮 — LSP, hydration, component library, Rust/Go compiler port

---

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan kontribusi.

### Quality Assurance

```bash
npm test          # 416+ tests
npm run lint      # ESLint (zero warnings)
npm run typecheck # JSDoc type checking
```

---

## Lisensi

MIT © [raarion](https://github.com/raarion)
