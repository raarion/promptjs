# Dashboard App — PromptJS Demo

Aplikasi dashboard SPA yang mendemonstrasikan fitur-fitur PromptJS v0.9.9+:

- **SPA Routing** — `router: benar` dengan multi-halaman
- **Auth Guard** — `butuhAuth: benar` + redirect ke login
- **Token Key** — `tokenKey: auth_token` untuk custom storage key
- **Role Check** — `peran: admin` di dashboard.pjs
- **Login Flow** — Set token + peran ke localStorage, redirect
- **Logout** — `hapus localStorage.auth_token` + `hapus localStorage.__peran`
- **Lifecycle** — `Ketika muat:` untuk init data
- **Reactive State** — `data` + `Saat` watcher + counter
- **SPA Navigation** — `data-halaman` attribute + `arahkan ke`

## Cara Menjalankan

```bash
# Dari root promptjs
node src/cli/index.js serve examples/dashboard-app/ --spa

# Atau build
node src/cli/index.js build examples/dashboard-app/ --adapter static --spa
```

## Alur Aplikasi

1. User membuka app → tidak ada token → redirect ke `/login`
2. Login dengan nama "admin" → token + peran disimpan → redirect ke `/dashboard`
3. Dashboard punya `peran: admin` → hanya admin yang bisa akses
4. Navigasi SPA antar halaman tanpa reload
5. Logout → hapus token + peran → redirect ke `/login`

## Fitur PromptJS yang Digunakan

| Fitur | Contoh di Kode |
|-------|---------------|
| `butuhAuth: benar` | index.pjs — auth guard di seluruh app |
| `tokenKey: auth_token` | index.pjs — custom token key |
| `peran: admin` | dashboard.pjs — role-based access |
| `router: benar` | index.pjs — SPA mode |
| `hapus localStorage.x` | pengaturan.pjs — logout via removeItem |
| `arahkan ke` | login.pjs — redirect setelah login |
| `Ketika muat:` | dashboard.pjs, profil.pjs — init data |
| `Ketika diklik:` | login.pjs, pengaturan.pjs — event handlers |
| `tambahkan / kurangi` | dashboard.pjs — counter ops |
