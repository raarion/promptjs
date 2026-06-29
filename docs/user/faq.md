# FAQ / Pertanyaan yang Sering Diajukan

> docs/user/ > FAQ

Kumpulan pertanyaan umum dan miskonsepsi seputar PromptJS. Setiap jawaban di-*ground* ke perilaku nyata di `src/`, `tests/`, dan `examples/`.

Common questions and misconceptions about PromptJS. Every answer is grounded in actual behavior found in `src/`, `tests/`, and `examples/`.

---

## Konsep Dasar / Core Concepts

### Apakah PromptJS sebuah framework? / Is PromptJS a framework?

**Bukan.** PromptJS adalah **compiler** (mini-DSL template engine). File `.pjs` Anda dikompilasi *ahead-of-time* menjadi JavaScript vanilla statis. Tidak ada framework yang berjalan di browser pengguna — yang dikirim hanyalah JS biasa hasil kompilasi.

**No.** PromptJS is a **compiler** (a mini-DSL template engine). Your `.pjs` files are compiled *ahead-of-time* into static vanilla JavaScript. No framework runs in the user's browser — only the plain compiled JS is shipped.

> Bukti / Evidence: `package.json` → `"description": "PromptJS — a mini-DSL template engine that compiles to vanilla JS with zero dependencies"`; entry `"main": "src/engine/promptjs.js"`.

### Apakah saya butuh React, Vue, atau Svelte? / Do I need React, Vue, or Svelte?

**Tidak.** PromptJS tidak bergantung pada framework apa pun. Output-nya murni vanilla JS yang memanipulasi DOM secara langsung — tanpa virtual DOM.

**No.** PromptJS does not depend on any framework. Its output is pure vanilla JS that manipulates the DOM directly — no virtual DOM.

### Benarkah output-nya "zero dependency"? / Is the output really "zero dependency"?

**Ya, untuk output produksi.** `package.json` mendeklarasikan `"sideEffects": false` dan tidak punya `dependencies` runtime — hanya `devDependencies` (vitest, eslint, typescript, prettier) yang dipakai saat *build*, bukan saat *runtime*. Runtime helper yang dihasilkan compiler bersifat *tree-shakeable*: hanya helper yang benar-benar dipakai yang masuk ke output akhir.

**Yes, for the production output.** `package.json` declares `"sideEffects": false` and has no runtime `dependencies` — only `devDependencies` used during *build*, never at *runtime*. The compiler's runtime helpers are tree-shakeable: only the helpers you actually use end up in the final output.

---

## Bahasa & Sintaks / Language & Syntax

### Bisakah saya mencampur keyword Indonesia dan English? / Can I mix Indonesian and English keywords?

**Bisa.** Keyword bilingual adalah prinsip arsitektural, bukan fitur tambahan. `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, dan 50+ pasangan lainnya menghasilkan output JavaScript yang **identik**. Anda boleh memakai keduanya dalam satu file.

**Yes.** Bilingual keywords are an architectural principle, not an add-on. `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, and 50+ other pairs produce **identical** JavaScript output. You may use both within a single file.

> Lihat / See: [language/keywords.md](../language/keywords.md).

### Kenapa tidak ada kurung kurawal `{}` atau tag penutup? / Why no curly braces or closing tags?

Struktur ditentukan oleh **indentasi** (mirip Python), bukan simbol. Ini bagian dari prinsip *"zero syntax symbol"* — kode `.pjs` mengalir seperti menulis prompt. Konsistensi indentasi sangat penting; campuran tab dan spasi dapat memicu error parser.

Structure is determined by **indentation** (Python-like), not symbols. This follows the *"zero syntax symbol"* principle — `.pjs` code flows like writing a prompt. Indentation consistency is critical; mixing tabs and spaces can trigger parser errors.

### Bagaimana cara membuat state reaktif? / How do I create reactive state?

Deklarasikan dengan `data`, lalu observasi perubahannya dengan blok `Saat`. Reaktivitas bersifat **eksplisit** — tidak ada auto-tracking ajaib.

Declare with `data`, then observe changes with a `Saat` block. Reactivity is **explicit** — there is no magic auto-tracking.

```pjs
data hitung = 0

Buat div.count-display:
  Saat hitung:
    Buat span:
      hitung

Buat tombol#klik:
  "Tambah"
  on_klik = simpan hitung tambah 1 ke hitung
```

> Pola di atas diambil dari `examples/counter.pjs`. / The pattern above is taken from `examples/counter.pjs`. Lihat [language/reactivity.md](../language/reactivity.md).

---

## Keamanan / Security

### Apakah `butuhAuth` membuat aplikasi saya aman? / Does `butuhAuth` make my app secure?

**Tidak sepenuhnya — ini penting.** `butuhAuth: benar` menghasilkan *guard* sisi-klien (IIFE) yang mengecek token di `localStorage`/`sessionStorage` sebelum halaman dieksekusi. Ini berguna untuk **UX** (mengarahkan pengguna yang belum login), **bukan** kontrol keamanan yang sebenarnya. Siapa pun dapat mem-bypass cek sisi-klien.

**Not entirely — this is important.** `butuhAuth: benar` emits a client-side *guard* (IIFE) that checks a token in `localStorage`/`sessionStorage` before the page executes. This is useful for **UX** (redirecting unauthenticated users), **not** real security control. Anyone can bypass a client-side check.

> **Wajib:** verifikasi otorisasi sebenarnya **di server**. Guard PromptJS bersifat *advisory*. / **Mandatory:** enforce real authorization **on the server**. The PromptJS guard is *advisory*. Lihat [language/auth.md](../language/auth.md).

### Apakah PromptJS melindungi dari XSS? / Does PromptJS protect against XSS?

**Sebagian, secara *fail-closed*.** Codegen melakukan sanitasi: assignment `innerHTML` lewat properti `html` dilewatkan ke `__sanitizeHTML()` yang membuang `<script>` dan event handler; atribut difilter `__safeAttr` yang menolak atribut `on*` dan URL `javascript:`. Tetap berhati-hatilah dengan data dari pengguna.

**Partially, in a *fail-closed* manner.** Codegen sanitizes: `innerHTML` assignments via the `html` property pass through `__sanitizeHTML()` which strips `<script>` and event handlers; attributes are filtered by `__safeAttr` which rejects `on*` attributes and `javascript:` URLs. Still, treat user-provided data with care.

> Bukti / Evidence: `tests/security/wave1-security.test.js`, `tests/security/wave2-security.test.js`. Lihat [language/security.md](../language/security.md).

### Apakah ada `eval()` atau `new Function()` di output? / Any `eval()` or `new Function()` in the output?

**Tidak.** Semua kode dikompilasi secara statis. Tidak ada eksekusi dinamis, sehingga output kompatibel dengan Content-Security-Policy (CSP) yang ketat.

**No.** All code is compiled statically. There is no dynamic execution, so the output is compatible with a strict Content-Security-Policy (CSP).

---

## Tooling & Deployment

### Versi Node berapa yang dibutuhkan? / Which Node version is required?

**Node ≥ 22.0.0**, sesuai `"engines"` di `package.json`. Versi lama (mis. Node 20) tidak didukung secara resmi.

**Node ≥ 22.0.0**, per `"engines"` in `package.json`. Older versions (e.g., Node 20) are not officially supported.

### Bagaimana cara menjalankan CLI? / How do I run the CLI?

Binary-nya bernama `pjs` (lihat `"bin": { "pjs": "src/cli/index.js" }`). Command utama: `init`, `compile`, `serve`, `build`.

The binary is named `pjs` (see `"bin": { "pjs": "src/cli/index.js" }`). Main commands: `init`, `compile`, `serve`, `build`.

> Lihat / See: [reference/cli.md](../reference/cli.md).

### Ke mana saya bisa deploy? / Where can I deploy?

Tiga adapter bawaan: `static` (CDN + asset hashing + sitemap), `node` (server mandiri + Dockerfile), dan `vercel` (Build Output API). Pilih lewat flag `--adapter` saat `pjs build`.

Three built-in adapters: `static` (CDN + asset hashing + sitemap), `node` (self-contained server + Dockerfile), and `vercel` (Build Output API). Choose via the `--adapter` flag during `pjs build`.

> Lihat / See: [user/deployment.md](deployment.md) dan [language/adapters.md](../language/adapters.md).

---

## Belajar & Komunitas / Learning & Community

### Saya pemula total. Dari mana mulai? / I'm a complete beginner. Where do I start?

Ikuti urutan: [Getting Started](getting-started.md) → [Installation](installation.md) → [Quick Start](quick-start.md) → [First App](first-app.md). Setelah itu, coba walkthrough [Counter](../examples/counter.md) dan [Todo](../examples/todo.md).

Follow the order: [Getting Started](getting-started.md) → [Installation](installation.md) → [Quick Start](quick-start.md) → [First App](first-app.md). After that, try the [Counter](../examples/counter.md) and [Todo](../examples/todo.md) walkthroughs.

### Apa itu "PromptJS Academy"? / What is "PromptJS Academy"?

Program modul ajar (status *Pre-release*) untuk sekolah, bootcamp, kursus, dan pembelajar mandiri. Materinya disusun berlapis: Dasar → Menengah → Mahir. Lihat README utama bagian Academy.

A teaching-module program (status *Pre-release*) for schools, bootcamps, courses, and self-learners. Materials are layered: Basic → Intermediate → Advanced. See the Academy section in the main README.

---

← [Deployment](deployment.md) · [Kembali ke Index / Back to Index](../README.md)