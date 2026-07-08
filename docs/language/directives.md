# Direktif / Directives

> docs/language/ → **Directives**
> ← [Keywords](keywords.md) · [Expressions](expressions.md) →

---

Direktif adalah konfigurasi yang ditempatkan di bagian atas file `.pjs`. Direktif mengontrol perilaku kompilator dan mesin PromptJS tanpa menulis kode imperatif. Ada dua jenis: direktif data (dimuat sebagai variabel) dan direktif perilaku (mengubah cara kompilasi).

Directives are configurations placed at the top of a `.pjs` file. They control compiler and engine behavior without writing imperative code. There are two types: data directives (loaded as variables) and behavioral directives (that change compilation behavior).

---

## Daftar Direktif Perilaku / Behavioral Directive List

Direktif berikut mengubah perilaku kompilasi. Tujuh di antaranya dikenali dalam bentuk implisit (tanpa `---`):

The following directives change compilation behavior. Seven of these are recognized in implicit form (without `---`):

| Direktif | Tipe Nilai | Default | Deskripsi / Description |
|----------|-----------|---------|-------------------------|
| `router` | `benar` / `true` | `salah` | Aktifkan SPA routing / Enable SPA client-side routing |
| `adapter` | string | — | Adapter deployment: `static`, `node`, `vercel` |
| `butuhAuth` | `benar` / `true` | `salah` | Aktifkan auth guard / Enable auth guard |
| `redirect` | string (path) | `/login` | Redirect jika tidak terautentikasi / Redirect if unauthenticated |
| `tokenKey` | string | `token` | Kunci penyimpanan token / Storage key for auth token |
| `peran` | string | — | Peran yang diizinkan / Required role for access |
| `gayaCakupan` | `benar` / `true` | `salah` | Aktifkan CSS scoping opt-in / Enable opt-in CSS scoping |

## Daftar Direktif Data / Data Directive List

Direktif berikut dimuat sebagai data front-matter dan hanya tersedia dalam bentuk eksplisit (`---`):

The following directives are loaded as front-matter data and are only available in explicit form (`---`):

| Direktif | Tipe Nilai | Deskripsi / Description |
|----------|-----------|-------------------------|
| `judul` | string | Judul halaman / Page title |
| `deskripsi` | string | Deskripsi halaman / Page description |
| `produk` | string (path) | Sumber data: `./data/x.json` / Data source path |
| `token` | string | Sumber penyimpanan token: `localStorage` atau `sessionStorage`. Mendukung dot notation: `localStorage.jwt` / Token storage source with optional dot notation |

---

## Sintaksis / Syntax

### Bentuk Eksplisit / Explicit Form

Pembatas `---` wajib di awal dan akhir. Semua direktif (data maupun perilaku) tersedia dalam bentuk ini:

The `---` delimiters are required at start and end. All directives (both data and behavioral) are available in this form:

```pjs
---
judul: "Dashboard Admin"
router: benar
butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
peran: admin
---

Halaman:
    Buat judul: "Dashboard Admin"
```

### Bentuk Implisit / Implicit Form

Hanya 7 direktif perilaku yang dikenali tanpa pembatas. Pemindaian berhenti pada baris kosong, baris bukan-direktif, atau `---`.

Only 7 behavioral directives are recognized without delimiters. Scanning stops at a blank line, non-directive line, or `---`.

**Direktif yang dikenali secara implisit / Implicitly recognized directives:**
`router`, `adapter`, `butuhAuth`, `redirect`, `tokenKey`, `peran`, `gayaCakupan`

```pjs
butuhAuth: benar
tokenKey: auth_token
peran: admin

Halaman:
    Buat judul: "Halaman Terlindungi"
```

**Penting / Important:** Direktif `token` TIDAK dikenali secara implisit. Jika Anda perlu menentukan sumber token, gunakan bentuk eksplisit dengan `---`.

The `token` directive is NOT recognized implicitly. If you need to specify a token source, use the explicit form with `---`.

---

## Detail Direktif / Directive Details

### `router: benar`

Mengaktifkan mode SPA. Kompilator menghasilkan pola factory function untuk setiap halaman dan menyematkan runtime router untuk navigasi sisi klien. Lihat [Routing](routing.md) untuk detail lengkap.

Enables SPA mode. The compiler produces factory functions for each page and embeds the runtime router for client-side navigation. See [Routing](routing.md) for details.

### `adapter: <nama>`

Menentukan adapter deployment. Mempengaruhi output `pjs build`. Lihat [Adapters](adapters.md) untuk perbandingan lengkap.

Specifies the deployment adapter. Affects `pjs build` output. See [Adapters](adapters.md) for full comparison.

### `butuhAuth: benar`

Mengaktifkan auth guard. Kompilator menghasilkan IIFE yang memeriksa token di storage sebelum mengeksekusi kode halaman. Jika token tidak ada, halaman langsung redirect. Lihat [Auth](auth.md) untuk detail lengkap.

Enables auth guard. The compiler generates an IIFE checking for a token in storage before executing page code. If no token exists, the page redirects immediately. See [Auth](auth.md) for details.

### `redirect: <path>`

Path tujuan redirect jika autentikasi gagal. Default: `/login`.

Redirect destination if authentication fails. Default: `/login`.

### `token: <source>`

Menentukan sumber penyimpanan token. Nilai yang valid: `localStorage`, `sessionStorage`, atau dengan dot notation untuk kunci khusus (misalnya `localStorage.jwt` menunjukkan source=`localStorage`, key=`jwt`). Hanya tersedia dalam bentuk eksplisit.

Specifies the token storage source. Valid values: `localStorage`, `sessionStorage`, or with dot notation for specific keys (e.g. `localStorage.jwt` means source=`localStorage`, key=`jwt`). Only available in explicit form.

### `tokenKey: <nama>`

Kunci penyimpanan untuk token. Default: `token`. Mendahului kunci yang diekstrak dari dot notation pada direktif `token`.

Storage key for the auth token. Default: `token`. Overrides the key extracted from dot notation in the `token` directive.

### `peran: <nama>`

Peran yang diizinkan mengakses halaman. Setelah pengecekan token, kompilator menambahkan pengecekan peran tambahan. Jika `localStorage.getItem('__peran')` tidak cocok, akses ditolak. Saat ini hanya mendukung satu peran per halaman.

Role allowed to access the page. After token check, the compiler adds an additional role check. If `localStorage.getItem('__peran')` doesn't match, access is denied. Currently supports only a single role per page.

### `gayaCakupan: benar`

Mengaktifkan **CSS scoping opt-in** (lihat [issue #79](https://github.com/raarion/promptjs/issues/79)). Secara default (tanpa direktif ini), `Gaya:`/`Style:` bersifat GLOBAL — perilaku tidak berubah untuk proyek lama. Saat diaktifkan:

- Setiap elemen di dalam sebuah `Komponen` mendapat atribut `data-pjs-<namafile>-<namakomponen>`.
- Setiap elemen top-level halaman (di luar `Komponen` mana pun) mendapat atribut `data-pjs-<namafile>`.
- Selector CSS di blok `Gaya:`/`Style:` yang sesuai otomatis ditulis ulang menjadi `[data-pjs-<scope>]` agar cocok dengan atribut tersebut.
- Nama file dan nama komponen di-sanitasi (huruf kecil, karakter non-alfanumerik diganti `-`) sehingga deterministik di semua jalur (`pjs serve`, `pjs build`, `pjs build --prerender`, multi-page project builder).

Enables **opt-in CSS scoping** (see [issue #79](https://github.com/raarion/promptjs/issues/79)). By default (without this directive), `Gaya:`/`Style:` remains GLOBAL — no behavior change for existing projects. When enabled:

- Every element inside a `Komponen` gets a `data-pjs-<fileName>-<componentName>` attribute.
- Every page-level top-level element (outside any `Komponen`) gets a `data-pjs-<fileName>` attribute.
- CSS selectors in the corresponding `Gaya:`/`Style:` block are automatically rewritten to the matching `[data-pjs-<scope>]` attribute selector.
- File and component names are sanitized (lowercased, non-alphanumeric characters replaced with `-`) so the scope id is deterministic across every path (`pjs serve`, `pjs build`, `pjs build --prerender`, the multi-page project builder).

Contoh / Example:

```pjs
---
gayaCakupan: benar
---
Komponen Kartu(judul):
    Gaya:
        .kartu
            background: white
    Buat div.kartu:
        Buat h3: judul
```

Menghasilkan CSS `.kartu[data-pjs-home-kartu] { background: white; }` (jika nama file `home.pjs`) dan DOM `<div class="kartu" data-pjs-home-kartu>`.

---

← [Keywords](keywords.md) · [Expressions](expressions.md) →