# Autentikasi / Auth

> docs/language/ → **Auth**
> ← [Routing](routing.md) · [Modules](modules.md) →

---

> ⚠️ **PERINGATAN KEAMANAN / SECURITY WARNING**
>
> Auth guard PromptJS adalah **client-side guard** — bukan mekanisme keamanan
> yang sesungguhnya. Token disimpan di `localStorage`/`sessionStorage` dan
> **dapat dengan mudah di-bypass melalui browser DevTools**. Seorang
> penyerang bisa menghapus guard, membaca token, atau memodifikasi kode
> JavaScript kapan saja.
>
> Guard ini hanya berguna untuk **UX flow** (mengarahkan user ke login)
> dan **bukan pengganti autentikasi server-side**. Semua data sensitif
> **WAJIB** dilindungi di sisi server/API — jangan pernah mengandalkan
> auth guard PromptJS sebagai satu-satunya lapisan keamanan.
>
> ⚠️ *The PromptJS auth guard is a **client-side guard** — not real security.*
> *Tokens are stored in localStorage/sessionStorage and **can be easily bypassed***
> *via browser DevTools. Always protect sensitive data server-side.*

---

Auth guard di PromptJS melindungi halaman dengan memeriksa keberadaan token di storage sebelum mengeksekusi kode halaman. Jika token tidak ada atau peran tidak cocok, pengguna di-redirect ke halaman login. Semua logika auth dikompilasi menjadi JavaScript vanila — tidak ada library eksternal.

Auth guard in PromptJS protects pages by checking for a token in storage before executing page code. If the token is missing or the role doesn't match, the user is redirected to the login page. All auth logic compiles to vanilla JavaScript — no external library.

---

## Aktifkan Auth Guard / Enable Auth Guard

```pjs
---
butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
peran: admin
---

Halaman Dashboard:
    Buat judul: "Admin Panel"
```

Kompilator menghasilkan IIFE guard di awal output JS:

The compiler generates an IIFE guard at the beginning of the output JS:

```js
var __token = localStorage.getItem('auth_token');
if (!__token) { window.location.href = '/login'; return; }
var __peran = localStorage.getItem('__peran');
if (__peran !== 'admin') { window.location.href = '/login'; return; }
```

Pengecekan berjalan secara berurutan: token terlebih dahulu, lalu peran. Jika salah satu gagal, `return` langsung menghentikan eksekusi seluruh kode halaman.

Checks run in sequence: token first, then role. If either fails, `return` immediately halts all page code execution.

---

## Direktif Auth / Auth Directives

### `butuhAuth: benar`

Mengaktifkan auth guard. Tanpa direktif ini, halaman dapat diakses tanpa autentikasi meskipun direktif auth lain ditentukan. Lihat [Directives](directives.md) untuk detail sintaksis.

Enables the auth guard. Without this directive, the page is accessible without authentication even if other auth directives are specified. See [Directives](directives.md) for syntax details.

### `redirect: "/login"`

Path tujuan redirect saat autentikasi gagal. Default: `/login`. Digunakan bersama `butuhAuth: benar`.

Redirect destination when authentication fails. Default: `/login`. Used alongside `butuhAuth: benar`.

### `token: localStorage`

Menentukan sumber penyimpanan token. Nilai valid: `localStorage` atau `sessionStorage`. Mendukung dot notation untuk menentukan kunci: `localStorage.jwt` berarti source=`localStorage` dan key=`jwt`. Hanya tersedia dalam bentuk front-matter eksplisit (`---`).

Specifies the token storage source. Valid values: `localStorage` or `sessionStorage`. Supports dot notation to specify the key: `localStorage.jwt` means source=`localStorage` and key=`jwt`. Only available in explicit front-matter form (`---`).

### `tokenKey: auth_token`

Kunci yang digunakan untuk `localStorage.getItem()` atau `sessionStorage.getItem()`. Default: `token`. Mendahului kunci yang diekstrak dari dot notation pada direktif `token`.

The key used for `localStorage.getItem()` or `sessionStorage.getItem()`. Default: `token`. Overrides the key extracted from dot notation in the `token` directive.

### `peran: admin`

Menambahkan pengecekan peran setelah pengecekan token. Compiler menghasilkan `localStorage.getItem('__peran')` dan membandingkan dengan nilai direktif. Jika tidak cocok, redirect terjadi.

Adds a role check after the token check. The compiler generates `localStorage.getItem('__peran')` and compares it with the directive value. If it doesn't match, redirect occurs.

---

## Alur Login / Login Flow

Alur login tipikal menggunakan statement `simpan` ke localStorage:

A typical login flow uses `simpan` statements to localStorage:

```pjs
Halaman Login:
    data nama = ""
    data sandi = ""

    Buat masukan#nama: ""
        Ketika diketik:
            simpan nama.value ke nama

    Buat masukan#sandi[type="password"]: ""
        Ketika diketik:
            simpan sandi.value ke sandi

    Buat tombol: "Login"
        Ketika diklik:
            Jika nama === "admin" dan sandi === "admin":
                simpan "dummy-token-123" ke localStorage.auth_token
                simpan "admin" ke localStorage.__peran
                arahkan "/dashboard"
            Lainnya:
                tampilkan "Login gagal"
```

Perhatikan: `simpan "x" ke localStorage.key` dikompilasi menjadi `localStorage.setItem("key", "x")`.

Note: `simpan "x" ke localStorage.key` compiles to `localStorage.setItem("key", "x")`.

---

## Alur Logout / Logout Flow

```pjs
Buat tombol: "Logout"
    Ketika diklik:
        hapus localStorage.auth_token
        hapus localStorage.__peran
        arahkan "/login"
```

`hapus localStorage.key` dikompilasi menjadi `localStorage.removeItem("key")`.

`hapus localStorage.key` compiles to `localStorage.removeItem("key")`.

---

## Batasan / Limitations

- Multi-peran (`peran: admin,editor`) tidak didukung. Hanya satu peran per halaman. Direncanakan untuk v1.1+.
- `peran` tanpa `butuhAuth` tidak memiliki efek.
- Auth guard hanya memeriksa keberadaan token, bukan validitas token. Validasi token dilakukan di sisi server.

Multi-role (`peran: admin,editor`) is not supported. Only one role per page. Planned for v1.1+.

`peran` without `butuhAuth` has no effect.

The auth guard only checks for token existence, not token validity. Token validation is done server-side.

---

← [Routing](routing.md) · [Modules](modules.md) →