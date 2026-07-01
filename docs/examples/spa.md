# Contoh: SPA Multi-Halaman / Example: Multi-Page SPA

> docs/examples/ > SPA

Walkthrough aplikasi Single Page Application (SPA) — navigasi antar halaman tanpa reload, routing client-side, dan sidebar navigasi. Sumber: [`examples/dashboard-app/`](https://github.com/raarion/promptjs/tree/main/examples/dashboard-app).

A walkthrough of a Single Page Application (SPA) — navigating between pages without reload, client-side routing, and sidebar navigation. Source: [`examples/dashboard-app/`](https://github.com/raarion/promptjs/tree/main/examples/dashboard-app).

---

## Tujuan / Goal

Membangun aplikasi multi-halaman dengan navigasi SPA: sidebar dengan link ke Dashboard, Profil, dan Pengaturan. Klik navigasi = konten berganti, tanpa refresh browser. Plus auth guard di halaman utama.

Build a multi-page app with SPA navigation: a sidebar with links to Dashboard, Profile, and Settings. Clicking navigation = content swaps, no browser refresh. Plus an auth guard on the main page.

## Konsep yang Dipakai / Concepts Used

| Konsep / Concept | Keyword | Halaman / Page |
|---|---|---|
| SPA Routing | `router: benar` (implicit via builder) | [routing.md](../language/routing.md) |
| Auth guard | `butuhAuth`, `redirect`, `token` | [auth.md](../language/auth.md) |
| Navigasi / Navigation | `arahkan "/path"` | [keywords.md](../language/keywords.md) |
| Multi-file project | `builder.js` multi-page | [architecture.md](../project/architecture.md) |
| Nav active state | CSS class toggle via JS | [expressions.md](../language/expressions.md) |

---

## Struktur Proyek / Project Structure

```
dashboard-app/
├── index.pjs           # Halaman utama — sidebar layout + auth guard
├── pages/
│   ├── dashboard.pjs   # Dashboard — counter + stats
│   ├── login.pjs       # Login form
│   ├── profil.pjs      # Profil pengguna
│   └── pengaturan.pjs  # Pengaturan + tema
```

---

## Kode Inti: index.pjs (App Shell)

```pjs
---
judul: "PromptJS Dashboard"
butuhAuth: benar
redirect: /login
token: localStorage
tokenKey: auth_token
---

Halaman DashboardApp:
    Buat div.app-shell:
        Buat div.sidebar:
            # Navigasi
            Buat tombol.nav-item.active[data-halaman="dashboard"]:
                Buat span.nav-icon: "📊"
                Buat span: "Dashboard"
            Buat tombol.nav-item[data-halaman="profil"]:
                Buat span.nav-icon: "👤"
                Buat span: "Profil"
            Buat tombol.nav-item[data-halaman="pengaturan"]:
                Buat span.nav-icon: "⚙️"
                Buat span: "Pengaturan"

            # Tombol keluar
            Buat tombol.nav-item#keluar:
                Buat span.nav-icon: "🚪"
                Buat span: "Keluar"

        # Konten halaman (diisi builder)
        Buat div.main-content#konten:
            Buat h2: "Memuat..."
```

### Yang terjadi / What's happening

1. **Auth guard** — `butuhAuth: benar` + `token: localStorage` + `tokenKey: auth_token` → compiler emit guard di awal halaman. Jika token tidak ada, redirect ke `/login`.

2. **Sidebar layout** — `div.app-shell` dengan flexbox: sidebar kiri (260px), konten kanan (flex: 1).

3. **`data-halaman` attributes** — digunakan oleh JavaScript navigasi untuk menandai halaman aktif.

4. **`#konten` container** — builder menyuntikkan konten halaman ke sini saat navigasi SPA.

---

## Kode Inti: dashboard.pjs

```pjs
Halaman Dashboard:
    data hitung = 0
    data pengunjung = 42

    Buat div.page-header:
        Buat h2: $judul
        Buat span: "Selamat datang, Admin"

    Buat div.stats-grid:
        Buat div.stat-card:
            Saat hitung:
                Buat span.stat-number: hitung
            Buat span.stat-label: "Total Counter"
            Buat tombol: "+ Tambah"
                on_klik = simpan hitung tambah 1 ke hitung

    # ... lebih banyak stat cards ...
```

Dashboard mendemonstrasikan **reaktivitas** (`data` + `Saat`) dalam konteks SPA — counter tetap berfungsi normal meski halaman di-mount/unmount via router.

---

## Bagaimana SPA Bekerja / How the SPA Works

PromptJS menggunakan **builder.js** untuk multi-page SPA:

1. Builder mengompilasi semua file `.pjs` halaman menjadi **factory functions**.
2. Builder menyuntikkan **router runtime** (`router-runtime.js`) ke output JS.
3. Setiap halaman jadi fungsi `__page_Nama()` yang mengembalikan `{ el, mount, unmount }`.
4. Saat navigasi: halaman lama di-unmount (cleanup watcher, hapus DOM), halaman baru di-mount.

```
Navigasi ke "/dashboard"
    → router.match("/dashboard")
    → page = __page_Dashboard()
    → page.mount(document.getElementById("konten"))
    → DOM ter-update
    → watcher dari halaman lama sudah di-cleanup
```

> Tidak ada `router: benar` eksplisit di front-matter untuk dashboard-app karena routing ditangani builder.js untuk project multi-file. Untuk file tunggal, gunakan `router: benar`.

---

## Cara Menjalankan / How to Run

```bash
# Build multi-page SPA
pjs build --spa

# Atau dari direktori contoh / Or from example directory
cd examples/dashboard-app
pjs build
```

---

## Variasi / Latihan / Variations / Exercises

1. **Tambah halaman baru** — buat `pages/laporan.pjs`, tambahkan tombol nav.
2. **Dynamic route** — buat halaman blog dengan URL `/blog/:slug`.
3. **Transisi halaman** — tambahkan animasi CSS fade-in/out di mount/unmount.
4. **Breadcrumb** — tampilkan path navigasi saat ini di header.

---

← [Gallery](gallery.md) · [Auth →](auth.md)
