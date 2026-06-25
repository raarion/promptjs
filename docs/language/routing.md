# Routing / Perute

> docs/language/ → **Routing**
> ← [Reactivity](reactivity.md) · [Auth](auth.md) →

---

Routing SPA di PromptJS diaktifkan dengan direktif `router: benar`. Setiap halaman `.pjs` dikompilasi menjadi fungsi factory yang mengembalikan objek `{el, mount, unmount}`. Runtime router menangani navigasi sisi klien tanpa reload halaman.

SPA routing in PromptJS is enabled with the `router: benar` directive. Each `.pjs` page is compiled into a factory function returning `{el, mount, unmount}`. The runtime router handles client-side navigation without page reloads.

---

## Mengaktifkan SPA / Enabling SPA

```pjs
---
router: benar
---

Halaman Aplikasi:
    Buat nav:
        Buat tombol[data-halaman="beranda"]: "Beranda"
        Buat tombol[data-halaman="profil"]: "Profil"
    Buat div#konten:
```

Tanpa `router: benar`, setiap file `.pjs` dikompilasi secara mandiri ke HTML + JS (mode MPA).

Without `router: benar`, each `.pjs` file compiles independently to HTML + JS (MPA mode).

---

## Kompilasi SPA / SPA Compilation

Dalam mode SPA, setiap halaman dibungkus dalam fungsi factory:

In SPA mode, each page is wrapped in a factory function:

```js
function __page_index(__parent) {
    var __cleanupFns = [];
    var __dipasangFns = [];
    var __dilepasFns = [];
    // ... user code ...
    return {
        el: __root,
        mount: function(p) {
            (p || document.body).appendChild(__root);
            __dipasangFns.forEach(function(f) { f(); });
        },
        unmount: function() {
            __dilepasFns.forEach(function(f) { f(); });
            __cleanupFns.forEach(function(f) { f(); });
            __root.remove();
        }
    };
}
```

Semua halaman didaftarkan dalam tabel rute:

All pages are registered in the route table:

```js
var __PJS_ROUTES = {
    "/": __page_index,
    "/profil": __page_profil,
    "*": __page_404
};
__pjsRouter(__PJS_ROUTES);
```

---

## Navigasi / Navigation

### Via Kode / Via Code

```pjs
arahkan "/dashboard"
```

Dalam mode SPA, ini dikompilasi menjadi `__pjsRouter.navigate("/dashboard")`. Tanpa SPA, menjadi `window.location.href = "/dashboard"`.

In SPA mode, this compiles to `__pjsRouter.navigate("/dashboard")`. Without SPA, it becomes `window.location.href = "/dashboard"`.

### Via DOM / Via DOM

Link `<a>` dan elemen dengan atribut `data-halaman` otomatis di-intercept oleh click handler global router. Navigasi terjadi tanpa reload halaman.

`<a>` links and elements with the `data-halaman` attribute are automatically intercepted by the router's global click handler. Navigation occurs without page reload.

```pjs
Buat tautan[href="/about"]: "Tentang"
Buat tombol[data-halaman="profil"]: "Profil"
```

Router melewatkan link dengan target `_blank`, `javascript:`, atau URL eksternal (berbeda origin).

The router skips links with `_blank` target, `javascript:` URLs, or external (cross-origin) URLs.

---

## Pencocokan Rute / Route Matching

`matchRoute(path, routes)` menggunakan prioritas berikut:

1. **Exact match** — rute yang persis sama dengan path
2. **Dynamic params** — rute dengan `:slug` (misal `/user/:id`)
3. **Wildcard** — rute `*` sebagai fallback 404

`matchRoute(path, routes)` uses the following priority:

1. **Exact match** — route exactly matching the path
2. **Dynamic params** — route with `:slug` (e.g. `/user/:id`)
3. **Wildcard** — `*` route as 404 fallback

`extractParams(pattern, path)` mengekstrak nilai parameter dinamis ke objek yang bisa diakses di handler.

`extractParams(pattern, path)` extracts dynamic parameter values into an accessible object in the handler.

---

## Lifecycle SPA / SPA Lifecycle

```pjs
Halaman Dashboard:
    data items = []

    Ketika dipasang:
        ambil dari "/api/items":
            simpan hasil.ke items

    Ketika dilepas:
        kosongkan items
```

| Lifecycle | Kompilasi / Compilation | Kapan Dipanggil / When Called |
|-----------|----------------------|---------------------------|
| `Ketika dipasang:` | `__dipasangFns.push(fn)` | Setelah mount / After mount |
| `Ketika dilepas:` | `__dilepasFns.push(fn)` | Sebelum unmount / Before unmount |
| `Ketika muat:` | `DOMContentLoaded` (non-SPA) / sama seperti dipasang (SPA) | Saat halaman siap / When page is ready |

---

## MPA vs SPA / MPA vs SPA

| Aspek / Aspect | MPA (default) | SPA (`router: benar`) |
|----------------|---------------|----------------------|
| Kompilasi / Compilation | Setiap file jadi HTML + JS mandiri / Each file becomes standalone HTML + JS | Fungsi factory + router runtime / Factory functions + router runtime |
| Navigasi / Navigation | Full page reload | Client-side (pushState) |
| Lifecycle / Lifecycle | Tidak ada / None | `dipasang` / `dilepas` |
| File output / Output | `index.html`, `about.html`, ... | `index.html` + `prompt.js` (berisi semua rute / containing all routes) |

---

← [Reactivity](reactivity.md) · [Auth](auth.md) →