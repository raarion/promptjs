# Perintah CLI / CLI Commands

> docs/reference/ → **CLI Commands**
> ← [Config](config.md) · [Error Codes](error-codes.md) →

---

PromptJS menyediakan CLI (`pjs`) dengan 6 perintah utama: `compile`, `serve`, `build`, `init`, `version`, dan `help`. Jika tidak ada perintah yang dispesifikasikan tetapi sebuah file diberikan, CLI secara otomatis menjalankan `compile`.

PromptJS provides a CLI (`pjs`) with 6 main commands: `compile`, `serve`, `build`, `init`, `version`, and `help`. If no command is specified but a file is given, the CLI automatically runs `compile`.

---

## compile

Sumber: `src/cli/commands/compile.js` (285 LOC)

Mengkompilasi file `.pjs` tunggal atau direktori menjadi JavaScript. Mendukung mode watch dan output ke file atau stdout.

Compiles a single `.pjs` file or directory into JavaScript. Supports watch mode and output to file or stdout.

**Penggunaan / Usage:**

```
pjs compile <file|dir> [options]
```

**Flag / Flags:**

| Flag | Deskripsi / Description |
|------|------------------------|
| `-o, --output <file>` | Output ke file tunggal / Output to a single file |
| `--out-dir <dir>` | Output ke direktori / Output to a directory |
| `--stdout` | Cetak hasil ke stdout / Print result to stdout |
| `-w, --watch` | Kompilasi ulang saat file berubah / Recompile on file change |
| `--dev` | Sertakan source maps / Include source maps |
| `--no-data` | Lewati pemuatan file data / Skip loading data files |

**Contoh / Examples:**

```bash
# Kompilasi file tunggal
pjs compile halaman.pjs

# Output ke file tertentu
pjs compile halaman.pjs -o dist/app.js

# Kompilasi seluruh direktori
pjs compile src/ --out-dir dist/

# Print ke stdout
pjs compile halaman.pjs --stdout

# Mode watch
pjs compile src/ -w --out-dir dist/

# Dengan source maps (mode dev)
pjs compile halaman.pjs --dev -o dist/app.js

# Tanpa data files
pjs compile halaman.pjs --no-data -o dist/app.js

# Default behavior (tanpa perintah eksplisit)
pjs halaman.pjs
```

**Perilaku batch / Batch behavior:**
Saat sebuah direktori diberikan, semua file `.pjs` di dalamnya akan dikompilasi. Jika `--out-dir` digunakan, struktur direktori dipertahankan.

When a directory is given, all `.pjs` files inside it are compiled. If `--out-dir` is used, the directory structure is preserved.

---

## serve

Sumber: `src/cli/commands/serve.js` (517 LOC)

Menjalankan server pengembangan dengan live-reload melalui WebSocket. Pre-kompilasi semua file `.pjs` saat dimulai.

Runs a development server with live-reload via WebSocket. Pre-compiles all `.pjs` files on start.

**Penggunaan / Usage:**

```
pjs serve [dir]
```

**Flag / Flags:**

| Flag | Deskripsi / Description |
|------|------------------------|
| `-p, --port <num>` | Port server (default: 3000) / Server port |
| `--no-reload` | Nonaktifkan live-reload / Disable live-reload |

**Fitur / Features:**

- WebSocket live-reload pada endpoint `/__pjs_reload__`
- Error overlay yang diinjeksi di browser
- Pre-kompilasi semua file `.pjs` saat server dimulai
- Proteksi path-traversal keamanan (guard bersama `isInsideRoot`, lihat [Security › Path Containment](../language/security.md#penahanan-path--path-containment--v101))
- Saat file `.pjs`/aset berubah, server menyiarkan satu pesan WebSocket `"reload"` ke semua klien (full page reload). Tidak ada CSS Hot-Module Replacement granular — perubahan CSS ikut memicu reload halaman penuh.

- WebSocket live-reload on the `/__pjs_reload__` endpoint
- Error overlay injected in the browser
- Pre-compiles all `.pjs` files when the server starts
- Path-traversal security protection (shared `isInsideRoot` guard, see [Security › Path Containment](../language/security.md#penahanan-path--path-containment--v101))
- On `.pjs`/asset change, the server broadcasts a single `"reload"` WebSocket message to all clients (full page reload). There is no granular CSS Hot-Module Replacement — CSS changes also trigger a full page reload.

**Contoh / Examples:**

```bash
# Server default di port 3000
pjs serve

# Server di port tertentu
pjs serve -p 8080

# Serve direktori tertentu
pjs serve src/pages/

# Tanpa live-reload
pjs serve --no-reload
```

---

## build

Sumber: `src/cli/commands/build.js` (447 LOC)

Membangun proyek untuk produksi. Mendukung mode file tunggal dan mode proyek multi-file. Memuat konfigurasi dari `pjs.config.js` atau `promptjs.config.js`.

Builds the project for production. Supports single-file mode and multi-file project mode. Loads config from `pjs.config.js` or `promptjs.config.js`.

**Penggunaan / Usage:**

```
pjs build [dir]
```

**Flag / Flags:**

| Flag | Deskripsi / Description |
|------|------------------------|
| `--out-dir <dir>` | Direktori output (default: `dist`) / Output directory |
| `--adapter <name>` | Adapter deployment: `static`, `node`, `vercel` / Deployment adapter |
| `--prerender` | Pra-render HTML dengan jsdom / Pre-render HTML with jsdom |
| `--minify` | Minifikasi output JS / Minify output JS |
| `--csp` | Aktifkan mode Content-Security-Policy (mis. emisi yang ramah CSP) / Enable Content-Security-Policy mode (CSP-friendly emission). Meng-override `csp` di config file / Overrides `csp` in config file |

**Perilaku / Behavior:**

- Mendeteksi direktori halaman: `src/pages/` atau `pages/`
- Mendukung mode file tunggal dan mode proyek multi-file
- Menjalankan adapter setelah build jika dispesifikasikan

- Detects pages directory: `src/pages/` or `pages/`
- Supports single-file mode and multi-file project mode
- Runs adapter after build if specified

**Contoh / Examples:**

```bash
# Build default
pjs build

# Build ke direktori tertentu
pjs build --out-dir public/

# Build dengan adapter
pjs build --adapter static

# Build dengan prerender
pjs build --prerender

# Build dengan minifikasi
pjs build --minify

# Kombinasi
pjs build --out-dir dist/ --adapter node --minify
```

---

## init

Sumber: `src/cli/commands/init.js` (445 LOC)

Menyediakan template proyek awal. Mendukung 6 template dengan jumlah file yang berbeda.

Provides initial project templates. Supports 6 templates with different file counts.

**Penggunaan / Usage:**

```
pjs init [name]
```

**Flag / Flags:**

| Flag | Deskripsi / Description |
|------|------------------------|
| `-t, --template <name>` | Nama template / Template name |
| `--force` | Timpa file yang sudah ada / Overwrite existing files |

**Template yang tersedia / Available templates:**

| Template | Jumlah File / File Count | File yang dibuat / Files Created | Catatan / Notes |
|----------|-------------------------|----------------------------------|-----------------|
| `basic` | 3 | `index.pjs`, `data/produk.json`, `README.md` | Template dasar / Basic template |
| `counter` | 2 | `index.pjs`, `README.md` | Contoh counter sederhana / Simple counter |
| `gallery` | 3 | `index.pjs`, `data/produk.json`, `README.md` | Galeri produk / Product gallery |
| `spa` | 5 | `index.pjs` + 3 file halaman, `README.md` | Termasuk `router: benar` / Includes `router: benar` |
| `fullstack` | 5 | `index.pjs`, `pages/login.pjs`, `pages/pengaturan.pjs`, `data/users.json`, `README.md` | Auth + roles + router |
| `blog` | 4 | `index.pjs`, `pages/artikel.pjs`, `data/artikel.json`, `README.md` | Daftar artikel data-driven / Data-driven article listing |

**Contoh / Examples:**

```bash
# Inisialisasi proyek baru dengan nama
pjs init my-app

# Pilih template tertentu
pjs init my-app -t counter

# Template SPA dengan router
pjs init my-app -t spa

# Template fullstack
pjs init my-app -t fullstack

# Timpa file yang sudah ada
pjs init my-app -t basic --force
```

---

## version

Mencetak versi PromptJS yang terinstal dari `package.json`.

Prints the installed PromptJS version from `package.json`.

**Penggunaan / Usage:**

```bash
pjs version
```

---

## help

Menampilkan teks bantuan dengan semua perintah dan opsi yang tersedia.

Displays help text with all available commands and options.

**Penggunaan / Usage:**

```bash
pjs help
```

---

← [Config](config.md) · [Error Codes](error-codes.md) →