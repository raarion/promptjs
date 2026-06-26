# Deployment / Penempatan

> docs/user/ > Deployment

---

PromptJS menyediakan 3 deployment adapter yang mengubah output build sesuai target hosting. Adapter dipilih melalui flag `--adapter` pada `pjs build` atau field `adapter` di `pjs.config.js`.

PromptJS provides 3 deployment adapters that transform build output for the target hosting. Adapters are selected via the `--adapter` flag on `pjs build` or the `adapter` field in `pjs.config.js`.

**Bukti / Evidence:** Adapter yang valid didefinisikan di `src/engine/config.js` dalam `KNOWN_ADAPTERS = new Set(['static', 'node', 'vercel'])`. Implementasi masing-masing ada di `src/engine/adapters/`.

---

## Front-Matter Build / Build dengan Multi-Page

Sebelum menggunakan adapter, pastikan proyek memiliki struktur multi-page yang benar:

Before using adapters, ensure the project has a correct multi-page structure:

```
proyek/
├── src/
│   ├── pages/
│   │   ├── index.pjs
│   │   ├── tentang.pjs
│   │   └── blog/[slug].pjs
│   └── assets/
├── pjs.config.js
└── package.json
```

Builder mendeteksi folder `pages/` di dalam `src/` atau di root proyek. Jika ditemukan, builder menjalankan mode project build (bukan single-file legacy mode).

**Bukti / Evidence:** Di `src/cli/commands/build.js`, builder mengecek `src/pages/` lalu `pages/` secara berurutan. Jika salah satu ada, `Builder.buildProject()` dipanggil.

### Rute Dinamis / Dynamic Routes

File dengan `[nama].pjs` di dalam subfolder menghasilkan rute dengan parameter. Misalnya `pages/blog/[slug].pjs` menghasilkan rute `/blog/:slug`. Parameter bisa diakses di halaman melalui argument kedua factory function.

Files with `[name].pjs` in subfolders produce routes with parameters. For example, `pages/blog/[slug].pjs` produces the route `/blog/:slug`.

**Bukti / Evidence:** Fungsi `fileToRoute()` di `builder.js` mengubah `[slug]` menjadi `:slug` menggunakan regex. Parameter diteruskan ke factory function sebagai argumen kedua.

---

## Konfigurasi Build / Build Configuration

File konfigurasi: `pjs.config.js` atau `promptjs.config.js` (dicari secara ascending dari working directory).

Configuration file: `pjs.config.js` or `promptjs.config.js` (searched upward from the working directory).

**Bukti / Evidence:** `CONFIG_FILENAMES = new Set(['pjs.config.js', 'promptjs.config.js'])` di `src/engine/config.js`. Hanya file `.js` yang didukung (bukan `.json`, `.yaml`, atau `.toml`).

```js
// pjs.config.js
module.exports = {
  adapter: 'static',          // 'static' | 'node' | 'vercel'
  outDir: 'dist',             // Direktori output
  pagesDir: 'pages',          // Subfolder halaman (relatif terhadap rootDir)
  assetsDir: 'assets',        // Subfolder aset
  baseUrl: '/',               // Base URL untuk asset

  meta: {
    title: 'Nama Aplikasi',
    description: 'Deskripsi aplikasi',
    ogImage: '/og-image.png',
    ogType: 'website',
  },

  siteUrl: 'https://example.com',  // Untuk sitemap dan canonical URL
  apiUrl: 'https://api.example.com', // Untuk Node adapter API proxy

  plugins: [],                      // Array plugin (fungsi atau objek)
};
```

### Merge dengan CLI / CLI Override

CLI flags selalu mengambil alih konfigurasi file. Flag yang bisa override:

CLI flags always override config file values. Overridable flags:

| Flag CLI | Override Field |
|----------|----------------|
| `--out-dir <dir>` | `config.outDir` |
| `--adapter <name>` | `config.adapter` |

**Bukti / Evidence:** Fungsi `mergeWithCliArgs()` di `config.js` melakukan merge dengan prioritas: CLI > config file > default.

---

## Adapter: Static

Adapter untuk deployment ke CDN atau hosting statis (Netlify, Cloudflare Pages, GitHub Pages, S3, dll).

Adapter for deployment to CDN or static hosting (Netlify, Cloudflare Pages, GitHub Pages, S3, etc.).

```bash
pjs build --adapter static
```

### Apa yang Dilakukan / What It Does

Berdasarkan implementasi di `src/engine/adapters/static.js`, adapter ini melakukan:

Based on the implementation in `src/engine/adapters/static.js`, this adapter:

1. **Asset hashing** — `prompt.js` dan `prompt.css` di-rename dengan hash MD5 (8 karakter hex). Misalnya `prompt.js` → `prompt.a1b2c3.js`. Semua referensi `<script src>` dan `<link href>` di file HTML diperbarui otomatis. File asli yang tidak di-hash dihapus.

   **Asset hashing** — `prompt.js` and `prompt.css` are renamed with an MD5 hash (8-char hex). All `<script src>` and `<link href>` references in HTML files are updated. Original unhashed files are removed.

2. **Meta tag injection** — Menyisipkan `<meta>` tag Open Graph (`og:title`, `og:description`, `og:image`, `og:type`) dan `<link rel="canonical">` ke semua file HTML, berdasarkan field `meta` dan `siteUrl` dari config.

   **Meta tag injection** — Inserts Open Graph `<meta>` tags and `<link rel="canonical">` into all HTML files.

3. **Sitemap generation** — Menulis `sitemap.xml` berdasarkan daftar rute dan `siteUrl`.

   **Sitemap generation** — Writes `sitemap.xml` based on the route list and `siteUrl`.

4. **404.html** — Untuk SPA, menyalin `index.html` sebagai `404.html` (supaya routing klien tetap bekerja di semua URL). Untuk MPA, menghasilkan halaman 404 sederhana.

   **404.html** — For SPA, copies `index.html` as `404.html`. For MPA, generates a simple 404 page.

### Output Structure

```
dist/
├── index.html
├── tentang.html
├── blog/
│   └── :slug.html
├── prompt.a1b2c3.js      # Hashed
├── prompt.d4e5f6.css     # Hashed
├── assets/
└── sitemap.xml
```

---

## Adapter: Node

Adapter untuk deployment ke server Node.js (VPS, Docker, Cloud Run, dll).

Adapter for deployment to a Node.js server (VPS, Docker, Cloud Run, etc.).

```bash
pjs build --adapter node
```

### Apa yang Dilakukan / What It Does

Berdasarkan implementasi di `src/engine/adapters/node.js`:

Based on the implementation in `src/engine/adapters/node.js`:

1. **Generate `server.js`** — Server HTTP zero-dependency yang hanya menggunakan modul bawaan Node (`http`, `fs`, `path`, `url`). Tidak perlu `npm install` apapun di production.

   **Generate `server.js`** — A zero-dependency HTTP server using only Node built-in modules. No `npm install` needed in production.

2. **SPA mode** — Semua rute non-statis di-serve `index.html` (router klien menangani navigasi).

   **SPA mode** — All non-static routes serve `index.html`.

3. **MPA mode** — Pemetaan rute ke file HTML. Path tanpa ekstensi otomatis ditambahkan `.html`. Jika tidak ditemukan, serve `404.html`.

   **MPA mode** — Route-to-HTML-file mapping. Bare paths get `.html` appended.

4. **API proxy** — Jika `apiUrl` di-set di config, request ke `/api/*` di-proxy ke backend. Berguna saat frontend dan backend terpisah.

   **API proxy** — If `apiUrl` is set, requests to `/api/*` are proxied to the backend.

5. **Generate `Dockerfile`** — Docker image berbasis `node:20-slim`, copy `dist/`, expose port 3000.

   **Generate `Dockerfile`** — Based on `node:20-slim`, copies `dist/`, exposes port 3000.

### Cara Menjalankan / How to Run

```bash
# Jalankan server / Run the server
node dist/server.js

# Dengan port kustom / With custom port
PORT=8080 node dist/server.js

# Atau gunakan Docker / Or use Docker
docker build -t promptjs-app .
docker run -p 3000:3000 promptjs-app
```

### Output Structure

```
dist/
├── index.html
├── prompt.js
├── prompt.css
├── assets/
├── server.js          # ← Generated by adapter
└── Dockerfile         # ← Generated by adapter
```

---

## Adapter: Vercel

Adapter untuk deployment ke Vercel, menggunakan Build Output API v3.

Adapter for deployment to Vercel, using Build Output API v3.

```bash
pjs build --adapter vercel
```

### Apa yang Dilakukan / What It Does

Berdasarkan implementasi di `src/engine/adapters/vercel.js`:

Based on the implementation in `src/engine/adapters/vercel.js`:

1. **Restrukturisasi output** ke format Build Output API v3 — semua file HTML, JS, CSS, dan aset **dipindahkan** (bukan disalin) ke `.vercel/output/static/`. Ini mencegah duplikasi file.

   **Output restructuring** to Build Output API v3 format — all files are **moved** (not copied) to `.vercel/output/static/`.

2. **Generate `vercel.json`** — Untuk SPA, menambahkan rewrite `/(.*) → /index.html` dan cache headers untuk aset. Untuk MPA, hanya cache headers.

   **Generate `vercel.json`** — For SPA, adds rewrite `/(.*) → /index.html` and cache headers for assets.

3. **Generate `config.json`** — Konfigurasi Build Output API v3 dengan route table dan cache headers.

   **Generate `config.json`** — Build Output API v3 configuration with route table and cache headers.

### Deploy ke Vercel / Deploy to Vercel

```bash
# Build terlebih dahulu / Build first
pjs build --adapter vercel

# Deploy menggunakan Vercel CLI / Deploy using Vercel CLI
npx vercel
```

### Output Structure

```
dist/
├── .vercel/
│   ├── output/
│   │   ├── config.json     # Build Output API v3 config
│   │   └── static/         # All HTML, JS, CSS, assets
│   │       ├── index.html
│   │       ├── prompt.js
│   │       ├── prompt.css
│   │       └── assets/
├── vercel.json             # Vercel project config
```

---

## Plugin System / Sistem Plugin

Plugin memungkinkan transformasi konten pada 4 tahap pipeline. Didefinisikan di `pjs.config.js`:

Plugins allow content transformation at 4 pipeline stages. Defined in `pjs.config.js`:

**Bukti / Evidence:** Kontrak plugin didefinisikan di `src/engine/plugins.js`. Plugin bisa berupa fungsi atau objek dengan field `name`.

```js
// pjs.config.js
module.exports = {
  plugins: [
    // Plugin sebagai objek / Plugin as object
    {
      name: 'my-plugin',
      transformSource(source, filename) {
        // Dijalankan sebelum kompilasi / Runs before compilation
        return source;
      },
      transformJS(js, filename) {
        // Dijalankan setelah kompilasi JS / Runs after JS compilation
        return js;
      },
      transformCSS(css, filename) {
        // Dijalankan setelah ekstraksi CSS / Runs after CSS extraction
        return css;
      },
      transformHTML(html, filename) {
        // Dijalankan setelah generate HTML (hanya di build mode) / Runs after HTML generation
        return html;
      },
    },
    // Plugin sebagai fungsi / Plugin as function
    function myFactoryPlugin() {
      return {
        name: 'factory-plugin',
        transformJS(js) { return js; },
      };
    },
  ],
};
```

| Hook | Kapan Dijalankan / When Applied | Lokasi / Location |
|------|-------------------------------|-------------------|
| `transformSource` | Sebelum pipeline kompilasi / Before compilation pipeline | `src/engine/promptjs.js` |
| `transformJS` | Setelah compiler emit JS / After compiler emits JS | `src/engine/promptjs.js` |
| `transformCSS` | Setelah ekstraksi CSS / After CSS extraction | `src/engine/promptjs.js` |
| `transformHTML` | Setelah generate HTML / After HTML generation | `src/engine/builder.js` |

Catatan: error pada plugin bersifat **non-fatal** — dicatat ke stderr, kompilasi tetap berlanjut. Plugin diterapkan secara berurutan (urutan di array penting).

Note: Plugin errors are **non-fatal** — logged to stderr, compilation continues. Plugins are applied sequentially (array order matters).

---

## Module System / Sistem Modul

PromptJS mendukung sharing simbol antar file melalui front-matter directive `kirim`/`share` dan `terima`/`get`.

PromptJS supports cross-file symbol sharing via front-matter directives `kirim`/`share` and `terima`/`get`.

**Bukti / Evidence:** Implementasi di `src/engine/modules.js`.

```pjs
// config.pjs
---
kirim: apiKey = "abc123"
kirim: baseUrl dari "env.pjs"
---

Halaman Config:
    Buat span: $apiKey
```

```pjs
// halaman.pjs
---
terima: apiKey dari "config.pjs"
terima: baseUrl dari "config.pjs"
---

Halaman Utama:
    Buat span: $apiKey
    Buat span: $baseUrl
```

- `kirim: apiKey = "abc123"` — share nilai inline (diparse sebagai JSON jika memungkinkan).
- `kirim: baseUrl dari "env.pjs"` — re-export dari file lain.
- `terima: apiKey dari "config.pjs"` — import simbol dari file lain.
- Cycle detection aktif — maksimal 10 level rekursi, jika melebihi akan error.
- Jika file tidak ditemukan, warning di-emit dan simbol tetap `undefined` di runtime.

---

← [First App](first-app.md) · [← Kembali ke README](../../README.md)