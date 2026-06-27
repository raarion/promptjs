# Quick Start / Memulai Cepat

> docs/user/ > Quick Start

---

Panduan ini membawa kamu dari nol ke halaman PromptJS pertama yang berjalan di browser dalam 5 langkah. Semua perintah di bawah terbukti berfungsi berdasarkan implementasi CLI di `src/cli/commands/`.

This guide takes you from zero to your first running PromptJS page in the browser in 5 steps. All commands below are verified against the CLI implementation in `src/cli/commands/`.

---

## Langkah 1: Scaffold Proyek / Step 1: Scaffold a Project

CLI menyediakan 6 template yang bisa langsung digunakan:

The CLI provides 6 ready-to-use templates:

| Template | Deskripsi / Description | File yang Dibuat / Files Created |
|----------|-------------------------|----------------------------------|
| `basic` | Halaman dengan data JSON / Page with JSON data | `index.pjs`, `data/produk.json`, `README.md` |
| `counter` | Penghitung interaktif / Interactive counter | `index.pjs`, `README.md` |
| `gallery` | Galeri produk data-driven / Data-driven gallery | `index.pjs`, `data/produk.json`, `README.md` |
| `spa` | Aplikasi SPA multi-halaman / Multi-page SPA | `index.pjs`, `pages/*.pjs`, `README.md` |
| `fullstack` | Auth + routing + peran / Auth + routing + roles | `index.pjs`, `pages/*.pjs`, `data/`, `README.md` |
| `blog` | Blog data-driven / Data-driven blog | `index.pjs`, `pages/*.pjs`, `data/artikel.json`, `README.md` |

**Bukti / Evidence:** Daftar template didefinisikan dalam konstanta `TEMPLATES` di `src/cli/commands/init.js` baris 20-359.

```bash
# Buat proyek baru / Create a new project
pjs init aplikasi-saya

# Dengan template tertentu / With a specific template
pjs init -t counter aplikasi-saya
```

Jika direktori target sudah ada dan tidak kosong, gunakan `--force` untuk menimpa:

If the target directory already exists and is not empty, use `--force` to overwrite:

```bash
pjs init -t spa --force aplikasi-saya
```

---

## Langkah 2: Jalankan Dev Server / Step 2: Run the Dev Server

```bash
cd aplikasi-saya
pjs serve
```

Dev server akan berjalan di `http://localhost:3000`. Fitur-fitur dev server (berdasarkan `src/cli/commands/serve.js`):

The dev server runs at `http://localhost:3000`. Dev server features (based on `src/cli/commands/serve.js`):

- **On-the-fly compilation** — setiap file `.pjs` dikompilasi saat pertama kali diakses, lalu di-cache berdasarkan `mtime` file.
- **Live reload via WebSocket** — saat file `.pjs`, `.json`, atau `.css` berubah, browser otomatis reload. Koneksi WebSocket berada di path `/__pjs_reload__`.
- **Error overlay** — jika kompilasi gagal, pesan error (termasuk kode error dan saran) ditampilkan di overlay bawah layar.
- **Directory listing** — jika tidak ada `index.pjs` atau `index.html`, server menampilkan daftar file.
- **Static file serving** — file non-`.pjs` (CSS, JS, gambar, font) dilayani dengan MIME type yang sesuai.
- **Path traversal protection** — request yang mencoba mengakses di luar root direktori akan ditolak (403).

Gunakan port berbeda jika 3000 sudah dipakai:

Use a different port if 3000 is already in use:

```bash
pjs serve --port 8080
```

Nonaktifkan live reload jika tidak diperlukan:

Disable live reload if not needed:

```bash
pjs serve --no-reload
```

---

## Langkah 3: Kompilasi File Tunggal / Step 3: Compile a Single File

```bash
pjs compile index.pjs
```

Output default: file `.js` dengan nama yang sama di direktori yang sama. Untuk melihat output di terminal tanpa menulis file:

Default output: a `.js` file with the same name in the same directory. To see output in the terminal without writing a file:

```bash
pjs compile index.pjs --stdout
```

Tentukan output secara eksplisit:

Specify output explicitly:

```bash
pjs compile index.pjs -o dist/halaman.js
```

Kompilasi seluruh direktori:

Compile an entire directory:

```bash
pjs compile src/ --out-dir dist/
```

**Bukti / Evidence:** Implementasi di `src/cli/commands/compile.js`. Fungsi `compileOne()` memanggil `engine.compileFile()` dan menulis hasil ke path output.

### Watch Mode

Kompilasi otomatis setiap kali file berubah:

Automatic recompilation every time a file changes:

```bash
pjs compile src/ --watch
```

Watch mode menggunakan `fs.watch()` secara rekursif dengan debounce 100ms per file. Hanya file `.pjs` yang memicu rekompile.

Watch mode uses recursive `fs.watch()` with 100ms debounce per file. Only `.pjs` files trigger recompilation.

---

## Langkah 4: Build Produksi / Step 4: Production Build

```bash
pjs build
```

Perintah ini mendeteksi secara otomatis apakah proyek adalah mode **SPA** (jika folder `pages/` ada dan salah satu halaman memiliki `router: benar`) atau **MPA** (multi-page app tanpa routing klien).

This command automatically detects whether the project is **SPA** mode (if `pages/` exists and any page has `router: benar`) or **MPA** mode (multi-page app without client-side routing).

**Mode SPA / SPA Mode** menghasilkan:

Produces a single `index.html` + `prompt.js` + `prompt.css`. Setiap halaman dibungkus dalam factory function `function __page_{name}(__parent) { ... }`. Router runtime di-embed langsung ke `prompt.js`. Rute dinamis didukung — misalnya `blog/[slug].pjs` menjadi rute `/blog/:slug`.

**Mode MPA / MPA Mode** menghasilkan:

Produces per-route `.html` files + `prompt.js` + `prompt.css`. Setiap halaman dibungkus dalam kondisi route matching.

**Bukti / Evidence:** Implementasi di `src/engine/builder.js` fungsi `buildProject()`. Deteksi SPA dilakukan pada pass pertama kompilasi.

### Build Options

| Opsi / Option | Deskripsi / Description |
|---------------|-------------------------|
| `--out-dir <dir>` | Direktori output (default: `dist`) / Output directory |
| `--adapter <name>` | Adapter deployment: `static`, `node`, atau `vercel` / Deployment adapter |
| `--minify` | Minifikasi JS dasar (strip comment, collapse whitespace) / Basic JS minification |
| `--prerender` | Pre-render HTML menggunakan jsdom (perlu `npm install jsdom`) / Pre-render HTML via jsdom |
| `--csp` | Aktifkan mode Content-Security-Policy / Enable Content-Security-Policy mode |

```bash
# Build dengan adapter static + minify
pjs build --adapter static --minify

# Build ke direktori kustom
pjs build --out-dir public

# Build ramah CSP (untuk hosting dengan header CSP ketat)
pjs build --adapter static --csp
```

**Bukti / Evidence:** Opsi build diparsing di `src/cli/commands/build.js` fungsi `runBuild()`. Minifikasi menggunakan fungsi `minifyJs()` yang strip comment dan collapse whitespace (bukan minifier production-grade).

---

## Langkah 5: Buka di Browser / Step 5: Open in Browser

### Saat Development

Buka `http://localhost:3000` setelah menjalankan `pjs serve`. File `.pjs` dikompilasi on-the-fly dan disajikan sebagai HTML lengkap dengan `<div id="app">`, live-reload script, dan error overlay.

Open `http://localhost:3000` after running `pjs serve`. `.pjs` files are compiled on-the-fly and served as complete HTML with `<div id="app">`, live-reload script, and error overlay.

### Setelah Build

Buka file `dist/index.html` langsung di browser, atau serve menggunakan server statis:

Open `dist/index.html` directly in the browser, or serve using a static server:

```bash
# Jika menggunakan Node adapter
node dist/server.js

# Atau server statis sederhana / Or a simple static server
npx serve dist
```

---

## Ringkasan Perintah / Command Summary

```bash
pjs init -t counter nama-proyek    # Scaffold / Scaffold
pjs serve                           # Dev server (port 3000) / Dev server
pjs serve --port 8080              # Port kustom / Custom port
pjs compile file.pjs               # Kompilasi file / Compile file
pjs compile file.pjs --stdout     # Output ke terminal / Output to terminal
pjs compile src/ -w               # Watch mode / Watch mode
pjs build                          # Build produksi / Production build
pjs build --adapter static         # Build + adapter / Build + adapter
pjs build --minify                 # Build + minify / Build + minify
pjs version                        # Cek versi / Check version
pjs help                           # Bantuan / Help
```

---

← [Installation](installation.md) · [First App →](first-app.md)