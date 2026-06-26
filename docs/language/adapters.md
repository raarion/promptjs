# Adapter / Adapters

> docs/language/ → **Adapters**
> ← [Plugins](plugins.md) · [Syntax Reference](syntax-reference.md) →

---

Adapter menentukan bagaimana output `pjs build` disiapkan untuk deployment. Pilih adapter melalui `--adapter <nama>` di CLI atau `adapter` di konfigurasi proyek. PromptJS menyediakan 3 adapter.

Adapters determine how `pjs build` output is packaged for deployment. Select an adapter via `--adapter <name>` in CLI or `adapter` in project config. PromptJS provides 3 adapters.

---

## Adapter Static / Static Adapter

Output statis yang siap di-deploy ke hosting file (Netlify, GitHub Pages, S3, dll).

Static output ready to deploy to file hosting (Netlify, GitHub Pages, S3, etc.).

**Apa yang dilakukan / What it does:**

1. Hash `prompt.js` menjadi `prompt.<hash8>.js` dan `prompt.css` menjadi `prompt.<hash8>.css` (file asli dihapus setelah hashing)
2. Patch setiap file `.html` dengan referensi script/css yang sudah di-hash
3. Injeksi meta tags (`<title>`, `<meta name="description">`, `<meta property="og:image">`) dari front-matter
4. Generate `sitemap.xml` jika `siteUrl` dikonfigurasi
5. Generate `404.html` jika `pages/404.pjs` ada

**Penggunaan / Usage:**
```bash
pjs build --adapter static
```

**Output / Output:**
```
dist/
  index.html
  about.html
  prompt.a1b2c3d4.js
  prompt.e5f6g7h8.css
  assets/
  sitemap.xml   (jika siteUrl dikonfigurasi)
  404.html     (jika pages/404.pjs ada)
```

---

## Adapter Node / Node Adapter

Server HTTP Node.js zero-dependency dengan Dockerfile untuk deployment container.

Zero-dependency Node.js HTTP server with Dockerfile for container deployment.

**Apa yang dilakukan / What it does:**

1. Tulis `server.js` — server HTTP murni (hanya `http`, `fs`, `path`, `url`, tanpa Express atau dependensi lain)
2. Tulis `Dockerfile` — `FROM node:20-slim`
3. Server menangani: file HTML (static), file JS/CSS (static), `/api/*` (reverse proxy ke `apiUrl` jika dikonfigurasi)

**Penggunaan / Usage:**
```bash
pjs build --adapter node
```

**Output / Output:**
```
dist/
  index.html
  about.html
  prompt.js
  prompt.css
  assets/
  server.js
  Dockerfile
```

---

## Adapter Vercel / Vercel Adapter

Output sesuai spesifikasi Vercel Build Output API v3 untuk deployment serverless.

Output conforming to Vercel Build Output API v3 specification for serverless deployment.

**Apa yang dilakukan / What it does:**

1. Tulis `.vercel/output/config.json` (framework preset, routes)
2. Pindahkan (bukan salin) file ke `.vercel/output/static/` — file asli dihapus dari root `dist/`
3. Tulis `vercel.json` (framework version, routes configuration)
4. Jika `apiUrl` dikonfigurasi, tulis API function di `.vercel/output/functions/api/index.js` (reverse proxy)

**Penggunaan / Usage:**
```bash
pjs build --adapter vercel
```

**Output / Output:**
```
dist/
  .vercel/
    output/
      config.json
      static/
        index.html
        about.html
        prompt.js
        prompt.css
        assets/
      functions/
        api/
          index.js   (jika apiUrl dikonfigurasi)
  vercel.json
```

---

## CSP (Content Security Policy) — v1.0.1

PromptJS mendukung Content Security Policy dengan flag `--csp` pada perintah `build`. Saat diaktifkan, adapter static akan:

PromptJS supports Content Security Policy via the `--csp` flag on the `build` command. When enabled, the static adapter will:

- Menghasilkan `<meta http-equiv="Content-Security-Policy">` tag di HTML
- Menginjeksi `nonce="..."` ke semua `<script>` dan `<style>` tag
- Nonce di-generate secara kriptografis per build (Base64, 24 bytes)

- Generate a `<meta http-equiv="Content-Security-Policy">` tag in HTML
- Inject `nonce="..."` into all `<script>` and `<style>` tags
- Nonce is cryptographically generated per build (Base64, 24 bytes)

### Penggunaan / Usage

```bash
# CLI flag
pjs build --adapter static --csp

# Atau via pjs.config.js
# Or via pjs.config.js
module.exports = {
  csp: true,
  adapter: 'static'
};
```

### Kebijakan default / Default policy

```
default-src 'self'
script-src 'self' 'nonce-{NONCE}'
style-src 'self' 'nonce-{NONCE}'
img-src 'self' data: https:
connect-src 'self' https:
font-src 'self'
frame-src 'none'
```

### Kompatibilitas / Compatibility

PromptJS secara default sudah kompatibel dengan CSP ketat — semua event handler
menggunakan `addEventListener` (bukan inline `onclick`), tidak ada `eval()`, dan
tidak ada `javascript:` URL. Flag `--csp` menambahkan lapisan nonce untuk
mengamankan inline `<script>` dan `<style>` tag di HTML shell.

PromptJS is already CSP-compatible by default — all event handlers use
`addEventListener` (not inline `onclick`), no `eval()`, and no `javascript:`
URLs. The `--csp` flag adds the nonce layer to secure inline `<script>` and
`<style>` tags in the HTML shell.

---

## Perbandingan / Comparison

| Aspek / Aspect | Static | Node | Vercel |
|---------------|--------|------|--------|
| Output utama / Primary output | HTML + hashed JS/CSS | HTML + server.js + Dockerfile | .vercel/output/ |
| File asli dihapus / Originals removed | Ya (hashed) / Yes | Tidak / No | Ya (dipindahkan) / Yes (moved) |
| Sitemap | Ya (jika siteUrl) / Yes | Tidak / No | Tidak / No |
| 404 page | Ya (jika ada) / Yes | Tidak / No | Tidak / No |
| API proxy | Tidak / No | Ya (jika apiUrl) / Yes | Ya (jika apiUrl) / Yes |
| Server-side | Tidak / No | Ya (Node.js HTTP) / Yes | Ya (serverless) / Yes |
| CSP support | Ya / Yes | Tidak / No | Tidak / No |
| Konfigurasi tambahan / Extra config | `siteUrl` untuk sitemap | `apiUrl` untuk API proxy | `apiUrl` untuk API proxy |

---

← [Plugins](plugins.md) · [Syntax Reference](syntax-reference.md) →