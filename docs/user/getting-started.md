# Getting Started / Memulai

> docs/user/ > Getting Started

---

## Apa itu PromptJS?

**PromptJS** adalah bahasa frontend deklaratif dwibahasa (Indonesia dan English) yang dikompilasi menjadi JavaScript vanilla. File dengan ekstensi `.pjs` melewati pipeline 5 tahap — Lexer, Parser, Resolver, Analyzer, Compiler — dan menghasilkan kode JS yang langsung memanipulasi DOM tanpa framework, tanpa virtual DOM, dan tanpa runtime dependency.

**PromptJS** is a bilingual (Indonesian and English) declarative frontend language that compiles to vanilla JavaScript. Files with the `.pjs` extension pass through a 5-stage pipeline — Lexer, Parser, Resolver, Analyzer, Compiler — and produce JS code that directly manipulates the DOM without frameworks, without a virtual DOM, and without runtime dependencies.

### Motto

> Tulis dengan Bahasa yang Kamu Pahami, dan Hasilkan Kode yang Dunia Mengerti.
>
> Write in the Language You Understand, and Produce Code the World Understands.

---

## Mengapa PromptJS? / Why PromptJS?

PromptJS hadir sebagai jembatan antara *coding*, *vibe coding*, dan *prompting*. Bahasa ini meruntuhkan dinding pembatas dalam belajar pemrograman dengan menjaga workflow yang tetap terasa disiplin sebagai aktivitas coding, namun dikemas dalam kenyamanan interaksi layaknya menulis prompt. Dengan kata kunci bilingual, pengguna dapat menulis kode dalam bahasa Indonesia, bahasa Inggris, atau campuran keduanya dalam satu file yang sama — dan semuanya menghasilkan output JavaScript yang identik.

PromptJS bridges *coding*, *vibe coding*, and *prompting*. The language breaks down barriers in learning programming by maintaining a disciplined coding workflow while wrapping it in the comfort of prompt-like interaction. With bilingual keywords, users can write code in Indonesian, English, or a mix of both in the same file — all producing identical JavaScript output.

---

## Fitur Utama / Key Features

| Fitur / Feature | Deskripsi / Description |
|-----------------|-------------------------|
| **Sintaks blok & indentasi** / Block & indentation syntax | Tidak perlu kurung kurawal `{}` atau tag penutup `</div>` — struktur ditentukan oleh indentasi. / No curly braces or closing tags — structure is determined by indentation. |
| **Kata kunci bilingual** / Bilingual keywords | Setiap keyword Indonesia punya padanan English: `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, dan 50+ pasangan lainnya. / Every Indonesian keyword has an English counterpart: 50+ pairs. |
| **Reaktivitas Proxy-based** / Proxy-based reactivity | Deklarasi `data` menggunakan `Proxy` JavaScript. Perubahan nilai otomatis memicu re-render melalui `Saat` watcher. / `data` declarations use JavaScript `Proxy`. Value changes automatically trigger re-render via `Saat` watchers. |
| **Sistem komponen** / Component system | Deklarasikan komponen dengan `Komponen Nama(props):` dan instansiasi dengan `Buat Nama(prop: nilai)`. Props di-resolve oleh compiler. / Declare components with `Komponen Nama(props):` and instantiate with `Buat Nama(prop: nilai)`. |
| **SPA routing** / Client-side routing | Tambahkan `router: benar` di front-matter, dan compiler otomatis menghasilkan router `pushState` dengan lifecycle `dipasang`/`dilepas` (mounted/unmounted). / Add `router: benar` in front-matter, and the compiler generates a `pushState` router with mount/unmount lifecycle. |
| **Auth guard** / Authentication guard | `butuhAuth: benar` menghasilkan IIFE yang mengecek token di `localStorage`/`sessionStorage` sebelum mengeksekusi halaman. Mendukung `peran` untuk role-based access. / Emits a guard IIFE that checks token in storage before page execution. Supports role-based access. |
| **Plugin system** / Plugin system | 4 transform hooks: `transformSource`, `transformJS`, `transformCSS`, `transformHTML`. Plugin didefinisikan di `pjs.config.js`. / 4 transform hooks defined in `pjs.config.js`. |
| **Deployment adapters** / Deployment adapters | 3 adapter bawaan: `static` (CDN + asset hashing + sitemap), `node` (self-contained server + Dockerfile), `vercel` (Build Output API v3). / 3 built-in adapters for different deployment targets. |
| **Zero dependency** / Zero dependency | Output JS vanilla murni. Runtime helpers di-tree-shake — hanya helper yang dipakai yang masuk ke output akhir. / Pure vanilla JS output. Runtime helpers are tree-shaken. |
| **XSS sanitization** / XSS sanitization | Sejak v1.0.1, semua `innerHTML` assignment melalui properti `html` di-sanitize oleh `__sanitizeHTML()` yang menghilangkan `<script>` tag dan event handler. / Since v1.0.1, all `innerHTML` assignments via the `html` property are sanitized. |

---

## Prinsip Desain / Design Principles

PromptJS dibangun di atas 9 prinsip yang mengikat:

PromptJS is built on 9 binding design principles:

1. **Zero dependency** di production output — framework dan library tidak dibutuhkan di runtime.
2. **Build tool boleh punya dependency** — devDependencies (vitest, typescript, eslint) hanya untuk pengembangan.
3. **Readability setinggi prompt AI** — kode `.pjs` harus mudah dibaca seperti prompt.
4. **Reactivity eksplisit, bukan auto-tracking** — perubahan state hanya ter-tracking jika dideklarasikan dengan `data`/`turunan` dan di-observe dengan `Saat`.
5. **Tidak ada `eval()` / `new Function()`** — semua kode dikompilasi secara statis.
6. **Bilingual keyword** (Indonesia + English) sebagai prinsip arsitektural — bukan fitur tambahan.
7. **Jembatan antara coding, vibe-coding, dan prompting** — memudahkan transisi dari AI prompting ke coding nyata.
8. **Zero syntax symbol** — mengalir seperti menulis prompt, bukan menulis kode tradisional.
9. **Meruntuhkan dinding pembatas dalam belajar pemrograman** — bahasa menjadi jembatan, bukan penghalang.

---

## Struktur File Proyek / Project File Structure

Sebuah proyek PromptJS tipikal memiliki struktur berikut:

A typical PromptJS project has the following structure:

```
proyek-saya/
├── index.pjs              # Halaman utama / Main page
├── pages/                 # Halaman tambahan (untuk SPA/MPA) / Additional pages
│   ├── tentang.pjs
│   └── kontak.pjs
├── components/            # Komponen reusable / Reusable components
│   └── kartu.pjs
├── data/                  # File data (JSON, CSV) / Data files
│   └── produk.json
├── assets/                # Aset statis (gambar, font) / Static assets
├── pjs.config.js          # Konfigurasi proyek / Project config
└── package.json           # (opsional, untuk npm) / (optional, for npm)
```

- File `.pjs` adalah sumber utama. Front-matter (di antara `---`) berisi metadata dan direktif.
- `.pjs` files are the primary source. Front-matter (between `---`) contains metadata and directives.
- Folder `pages/` digunakan untuk multi-page build. Jika salah satu halaman memiliki `router: benar`, builder otomatis menghasilkan output SPA.
- The `pages/` folder is used for multi-page builds. If any page has `router: benar`, the builder automatically produces SPA output.

---

## Apa Selanjutnya? / What's Next?

| Langkah / Step | Halaman / Page |
|----------------|----------------|
| Instalasi PromptJS / Install PromptJS | [Installation](installation.md) |
| 5 menit pertama / Your first 5 minutes | [Quick Start](quick-start.md) |
| Tutorial lengkap / Full tutorial | [First App](first-app.md) |
| Deployment ke production / Deploy to production | [Deployment](deployment.md) |

---

← [Kembali ke README](../../README.md)