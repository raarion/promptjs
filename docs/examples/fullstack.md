# Contoh: Full-Stack Dashboard / Example: Full-Stack Dashboard

> docs/examples/ > Fullstack

Walkthrough aplikasi dashboard lengkap — SPA routing, auth guard, role check, data fetching, logout, dan 5 halaman berbeda. Ini adalah contoh paling komprehensif yang mendemonstrasikan hampir semua fitur PromptJS v1.0. Sumber: [`examples/dashboard-app/`](https://github.com/raarion/promptjs/tree/main/examples/dashboard-app).

A walkthrough of a complete dashboard app — SPA routing, auth guard, role check, data fetching, logout, and 5 different pages. This is the most comprehensive example, demonstrating nearly every PromptJS v1.0 feature. Source: [`examples/dashboard-app/`](https://github.com/raarion/promptjs/tree/main/examples/dashboard-app).

---

## Yang Didemonstrasikan / What's Demonstrated

| Fitur / Feature | Di mana / Where |
|---|---|
| 🔐 Auth guard | `index.pjs` — `butuhAuth`, `redirect`, `token`, `tokenKey` |
| 👑 Role check | `index.pjs` — `peran: admin` |
| 📄 SPA Routing | `index.pjs` — sidebar nav + builder multi-page |
| 📝 Login form | `pages/login.pjs` — input + validasi + redirect |
| 🔢 Reaktivitas | `pages/dashboard.pjs` — `data` + `Saat` + counter |
| ⚙️ State toggle | `pages/pengaturan.pjs` — tema gelap/terang, notifikasi |
| 👤 Data binding | `pages/profil.pjs` — baca localStorage + tampilkan |
| 🚪 Logout | Semua halaman — `hapus localStorage.x` + `arahkan` |
| 🎨 Styling | Semua halaman — glassmorphism, gradien, grid, animasi |

---

## Struktur Proyek / Project Structure

```
dashboard-app/
├── index.pjs              # App shell: sidebar + auth guard + layout
├── pages/
│   ├── login.pjs          # Halaman login (tanpa auth guard — publik)
│   ├── dashboard.pjs      # Dashboard: counter, stats, metric cards
│   ├── profil.pjs         # Profil: info pengguna, token display
│   └── pengaturan.pjs     # Pengaturan: tema, notifikasi, danger zone
```

**5 halaman** — login (publik) + 4 halaman dalam (dashboard, profil, pengaturan, dan app shell index).

---

## Arsitektur Flow / Architecture Flow

```
User buka /dashboard
    │
    ▼
Auth guard: cek localStorage.auth_token
    │
    ├── Token ADA ──► cek peran (role check)
    │                   │
    │                   ├── Role COCOK ──► render DashboardApp
    │                   └── Role TIDAK ──► redirect /login
    │
    └── Token TIDAK ADA ──► redirect /login
                              │
                              ▼
                         Login form
                              │
                              ▼
                         Login sukses → simpan token + __peran
                              │
                              ▼
                         redirect /dashboard
                              │
                              ▼
                         Auth guard lolos → render app
                              │
                              ▼
                         Sidebar nav: Dashboard | Profil | Pengaturan | Keluar
```

---

## Fitur per Halaman / Features per Page

### 1. Login (`pages/login.pjs`)

```pjs
Halaman Login:
    data nama = ""
    data sandi = ""
    data pesan = ""

    # Input + tombol login
    # Validasi: Jika nama === "admin" → simpan token + redirect
    # Error: simpan pesan → tampil via Saat pesan
```

**Fitur:**
- 2 input field (`nama`, `sandi`) dengan real-time binding
- Pesan error reaktif (`Saat pesan:`)
- Login sukses → simpan 3 key ke localStorage + `arahkan`
- **Ini satu-satunya halaman tanpa auth guard** — publik

### 2. Dashboard (`pages/dashboard.pjs`)

```pjs
Halaman Dashboard:
    data hitung = 0
    data pengunjung = 42

    # Counter card  — Saat hitung: tampilkan hitung
    # Stats card    — pengunjung, task complete
    # Metric cards  — performa, storage
```

**Fitur:**
- Counter interaktif (`simpan hitung tambah 1 ke hitung`)
- `Saat hitung:` — display counter real-time
- `Ketika muat:` — inisialisasi `pengunjung = 42`
- 3 stat cards + 2 metric cards

### 3. Profil (`pages/profil.pjs`)

```pjs
Halaman Profil:
    data nama = ""
    data peran = ""
    data token = ""

    Ketika muat:
        simpan localStorage.getItem("nama_pengguna") ke nama
        simpan localStorage.getItem("__peran") ke peran
        simpan localStorage.getItem("auth_token") ke token

    # Tampilkan: avatar, nama, role badge, token display
    # Tombol logout → hapus semua localStorage + arahkan login
```

**Fitur:**
- `Ketika muat:` — baca data sesi dari localStorage
- Avatar + nama + role badge
- Token display (debugging)
- Logout button

### 4. Pengaturan (`pages/pengaturan.pjs`)

```pjs
Halaman Pengaturan:
    data temaGelap = "aktif"
    data pushNotify = "nonaktif"

    # Toggle tema gelap/terang
    # Dropdown warna aksen (biru/ungu/hijau)
    # Toggle push notification
    # Danger zone: tombol keluar akun
```

**Fitur:**
- State toggle (`Jika temaGelap === "aktif": ... Lainnya: ...`)
- Custom dropdown (`Buat pilihan:` + `Buat opsi:`)
- Danger zone dengan tombol merah
- `Saat temaGelap:` — tampilkan nilai state saat ini

### 5. App Shell (`index.pjs`)

```pjs
---
butuhAuth: benar
redirect: /login
token: localStorage
tokenKey: auth_token
peran: admin
---

Halaman DashboardApp:
    # Sidebar: brand + nav items + user card + logout
    # Main content: #konten (ditempati builder)
```

**Fitur:**
- Auth guard + role check di front-matter
- Sidebar dengan 3 nav item + user card
- Tombol logout di sidebar
- `#konten` placeholder untuk builder menyuntikkan halaman

---

## Cara Menjalankan / How to Run

```bash
# Clone + install
git clone https://github.com/raarion/promptjs.git
cd promptjs
npm install

# Build dashboard app
cd examples/dashboard-app
npx pjs build

# Buka login.html di browser
# Gunakan nama: admin, sandi: (kosongkan saja)
```

---

## Alur Lengkap / Complete Flow

1. Buka `login.html` → lihat form login
2. Ketik "admin" di Nama Pengguna → klik "Masuk"
3. Lihat token tersimpan di localStorage (DevTools → Application)
4. Redirect ke `dashboard.html`
5. Klik "+ Tambah" di counter card — lihat angka berubah real-time
6. Klik "Profil" di sidebar — lihat info sesi + token
7. Klik "Pengaturan" — toggle tema, ubah aksen
8. Klik "Keluar" — semua localStorage dihapus, redirect ke login
9. Coba akses `dashboard.html` langsung — auth guard redirect ke login

---

← [Auth](auth.md) · [Kembali ke Index / Back to Index](../user/getting-started.md)
