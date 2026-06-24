# Direktif / Directives

> docs/language/ → **Directives**
> ← [Keywords](keywords.md) · [Auth](auth.md) →

---

Direktif adalah konfigurasi yang ditempatkan di bagian atas file `.pjs`, sebelum kode halaman. Direktif mengontrol perilaku kompilator dan mesin PromptJS tanpa menulis kode imperatif.

Directives are configurations placed at the top of a `.pjs` file, before page code. Directives control compiler and engine behavior without writing imperative code.

---

## Daftar Direktif / Directive List

Ada 7 direktif yang dikenali oleh PromptJS:

There are 7 directives recognized by PromptJS:

| Direktif | Tipe Nilai | Deskripsi / Description |
|----------|-----------|-------------------------|
| `router` | `benar` / `true` | Aktifkan SPA routing / Enable SPA routing |
| `adapter` | `static` · `node` · `vercel` | Adapter deployment / Deployment adapter |
| `butuhAuth` | `benar` / `true` | Aktifkan auth guard / Enable auth guard |
| `redirect` | string (path) | Redirect jika tidak auth / Redirect if unauthenticated |
| `token` | string | Nilai token awal / Initial token value |
| `tokenKey` | string | Kunci localStorage untuk token / localStorage key for token |
| `peran` | string (mis. `admin`) | Peran yang diizinkan / Required role |

---

## Sintaksis / Syntax

Direktif dapat ditulis dalam dua bentuk: **eksplisit** (dengan pembatas `---`) atau **implisit** (tanpa pembatas).

Directives can be written in two forms: **explicit** (with `---` delimiters) or **implicit** (without delimiters).

### Bentuk Eksplisit / Explicit Form

```pjs
---
router: benar
adapter: node
butuhAuth: benar
tokenKey: auth_token
peran: admin
---

Halaman:
    Buat judul: "Dashboard Admin"
```

Pembatas `---` wajib di awal dan akhir blok direktif. Konten apa pun setelah pembatas penutup diperlakukan sebagai kode halaman.

The `---` delimiters are required at the start and end of the directive block. Any content after the closing delimiter is treated as page code.

### Bentuk Implisit / Implicit Form

```pjs
router: benar
adapter: node

Halaman:
    Buat judul: "Dashboard Admin"
```

Dalam bentuk implisit, kompilator memindai baris-baris awal file. Jika baris pertama yang tidak kosong berisi direktif yang dikenali (`key: value` di mana `key` adalah salah satu dari 7 direktif), kompilator melanjutkan pemindaian hingga menemukan baris yang bukan direktif atau baris kosong.

In implicit form, the compiler scans the initial lines of the file. If the first non-blank line contains a recognized directive (`key: value` where `key` is one of the 7 directives), the compiler continues scanning until it finds a non-directive line or a blank line.

**Aturan implisit / Implicit rules:**
1. Baris pertama harus berisi direktif yang dikenali / First line must contain a recognized directive
2. Pemindaian berhenti pada baris kosong, baris bukan-direktif, atau `---` / Scanning stops at a blank line, non-directive line, or `---`
3. Jika baris pertama bukan direktif, seluruh file diperlakukan sebagai kode halaman / If the first line is not a directive, the entire file is treated as page code

---

## Kombinasi Direktif / Directive Combinations

### SPA dengan Auth / SPA with Auth

```pjs
---
router: benar
butuhAuth: benar
tokenKey: my_app_token
redirect: /login
---

Halaman:
    Buat judul: "Halaman Terlindungi"
```

### Full-stack dengan Adapter / Full-stack with Adapter

```pjs
---
router: benar
adapter: node
butuhAuth: benar
peran: admin
tokenKey: admin_token
---

Halaman:
    Buat judul: "Admin Panel"
```

### Multi-peran (penundaan) / Multi-role (deferred)

> **Catatan / Note:** Saat ini `peran` hanya mendukung satu peran per halaman. Dukungan multi-peran (`peran: admin, editor`) direncanakan untuk v1.1+.

---

## Detail Direktif / Directive Details

### `router: benar`

Mengaktifkan mode SPA. Kompilator menghasilkan pola factory function dan menyematkan runtime `__pjsRouter` untuk navigasi sisi klien. Semua halaman dalam proyek dikompilasi sebagai rute yang terdaftar di router.

Enables SPA mode. The compiler produces a factory function pattern and embeds the `__pjsRouter` runtime for client-side navigation. All pages in the project are compiled as routes registered in the router.

→ Lihat [Routing](routing.md) untuk detail lengkap.

### `adapter: <nama>`

Menentukan adapter deployment. Mempengaruhi cara `pjs build` menghasilkan output.

Specifies the deployment adapter. Affects how `pjs build` produces output.

| Adapter | Deskripsi / Description |
|---------|-------------------------|
| `static` | HTML + JS statis, cocok untuk hosting statis / Static HTML + JS, suitable for static hosting |
| `node` | Server Node.js dengan Express-style routing / Node.js server with Express-style routing |
| `vercel` | Serverless functions untuk Vercel / Serverless functions for Vercel |

### `butuhAuth: benar`

Mengaktifkan auth guard. Kompilator menghasilkan IIFE guard yang memeriksa keberadaan token di `localStorage` sebelum mengeksekusi kode halaman. Jika token tidak ada, halaman tidak di-render.

Enables auth guard. The compiler generates an IIFE guard that checks for a token in `localStorage` before executing page code. If no token exists, the page is not rendered.

→ Lihat [Auth](auth.md) untuk detail lengkap.

### `redirect: <path>`

Digunakan bersama `butuhAuth: benar`. Jika pengguna tidak terautentikasi, router mengarahkan ke path ini.

Used alongside `butuhAuth: benar`. If the user is unauthenticated, the router redirects to this path.

### `token: <nilai>`

Menetapkan nilai token awal (biasanya untuk keperluan testing). Token disimpan di `localStorage` dengan kunci yang ditentukan `tokenKey`.

Sets an initial token value (typically for testing). The token is stored in `localStorage` under the key specified by `tokenKey`.

### `tokenKey: <nama>`

Menentukan kunci `localStorage` untuk menyimpan token autentikasi. Default: `'pjs_token'`.

Specifies the `localStorage` key for storing the authentication token. Default: `'pjs_token'`.

### `peran: <nama>`

Menentukan peran yang diizinkan mengakses halaman. Setelah pengecekan token, kompilator menghasilkan pengecekan peran tambahan. Jika peran pengguna tidak cocok, akses ditolak.

Specifies the role allowed to access the page. After token check, the compiler generates an additional role check. If the user's role doesn't match, access is denied.

---

← [Keywords](keywords.md) · [Auth](auth.md) →
