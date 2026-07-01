# Runtime Helpers / Helper Runtime

> docs/project/ > Runtime

Helper JavaScript yang di-emit ke output oleh compiler PromptJS. Setiap helper di-*tree-shake* — hanya di-emit jika benar-benar dipakai oleh kode `.pjs`. Dokumen ini di-*ground* ke `src/compiler/emitters/runtime.js`.

The JavaScript helpers emitted into the output by the PromptJS compiler. Every helper is *tree-shaken* — only emitted when actually used by the `.pjs` code. This document is grounded in `src/compiler/emitters/runtime.js`.

---

## Arsitektur Tree Shaking / Tree Shaking Architecture

Compiler memiliki `this.helpers` = `Set` yang mencatat helper mana yang dipakai selama traversal AST. Saat emit, hanya helper yang ada di Set tersebut yang ditulis ke output.

```
Compiler.helpers (Set)          emitRuntimeHelpers()
      │                              │
      ├── '__createReactive'  ───►   ✅ emitted
      ├── '__watch'           ───►   ✅ emitted
      ├── '__createComputed'  ───►   ❌ skipped (not used)
      └── ...
```

**Dampak:** File `.pjs` sederhana tanpa reaktivitas → output ~20 baris (bukan ~150 baris).

The compiler maintains `this.helpers` = a `Set` tracking which helpers are used during AST traversal. At emit time, only helpers present in the Set are written to output.

**Impact:** A simple `.pjs` file without reactivity → ~20 lines of output (not ~150).

---

## Daftar Helper / Helper Catalog

### Reactive Core

#### `__createReactive(val)`

Membungkus nilai dalam Proxy. Getter melacak subscriber aktif; setter memberi tahu semua subscriber saat nilai berubah.

Wraps a value in a Proxy. The getter tracks the active subscriber; the setter notifies all subscribers when the value changes.

```js
// Dipicu oleh / Triggered by:
data hitung = 0         // → __createReactive(0)
data nama = "Dunia"     // → __createReactive("Dunia")
```

#### `__createComputed(fn)`

Membuat reactive yang nilainya dihitung dari reactive lain. Reaktif terhadap dependency — otomatis re-evaluasi saat dependency berubah.

Creates a reactive whose value is computed from other reactives. Dependency-aware — automatically re-evaluates when dependencies change.

```js
// Dipicu oleh / Triggered by:
turunan total = hitung tambah 1   // → __createComputed(() => hitung.value + 1)
```

#### `__watch(reactive, cb)`

Subscribe ke perubahan reactive. Callback `cb(newVal, oldVal)` dipanggil setiap kali nilai berubah. Mengembalikan fungsi `unsubscribe()`.

Subscribes to reactive changes. Callback `cb(newVal, oldVal)` is called whenever the value changes. Returns an `unsubscribe()` function.

```js
// Dipicu oleh / Triggered by:
Saat hitung:            // → __watch(hitung, (n, o) => { ... })
    Buat span: hitung
```

#### `__setState(reactive, val)`

Set nilai reactive dan trigger semua subscriber.

Sets a reactive value and triggers all subscribers.

```js
// Dipicu oleh / Triggered by:
simpan 42 ke hitung     // → __setState(hitung, 42)
```

#### `__cleanup(reactive)`

Membersihkan semua subscriber dan dependency suatu reactive. Dipanggil saat halaman di-unmount di SPA untuk mencegah memory leak.

Cleans up all subscribers and dependencies of a reactive. Called when a page unmounts in SPA mode to prevent memory leaks.

```js
// Dipicu oleh / Triggered by:
// SPA unmount lifecycle → __cleanup(hitung)
```

---

### Error Boundary

#### `__pjs_handleError(error, context, hook)`

Menangkap error di event handler dan lifecycle hook. Mencegah satu error mematikan seluruh halaman.

Catches errors in event handlers and lifecycle hooks. Prevents a single error from crashing the entire page.

```js
// Compiler membungkus handler dengan try/catch:
// try {
//   __setState(hitung, hitung.value + 1);
// } catch(__e) {
//   __pjs_handleError(__e, "Halaman", "on_klik");
// }
```

---

### Builtin Helpers

#### `__promptjs_panjang(val)`

Mengembalikan panjang nilai (string length, array length, atau 0). Versi runtime dari builtin `panjang()`.

Returns the length of a value (string length, array length, or 0). Runtime version of the `panjang()` builtin.

```js
// Dipicu oleh / Triggered by:
panjang(daftar)          // → __promptjs_panjang(daftar)
panjang("halo")          // → __promptjs_panjang("halo")
```

#### `__promptjs_apakahKosong(val)`

Mengembalikan `true` jika nilai null, undefined, string kosong, atau array kosong. Versi runtime dari builtin `apakahKosong()`.

Returns `true` if the value is null, undefined, an empty string, or an empty array. Runtime version of the `apakahKosong()` builtin.

#### `__promptjs_apakahAda(arr, item)`

Mengembalikan `true` jika item ditemukan dalam array (atau string). Versi runtime dari builtin `apakahAda()`.

Returns `true` if the item is found in the array (or string). Runtime version of the `apakahAda()` builtin.

---

### Security Helpers (v1.0.0)

#### `__sanitizeHTML(html)`

Sanitizer HTML berbasis **parsing DOM dengan ALLOWLIST** — bukan regex blocklist. Strategi aman-secara-default:

1. Pakai Sanitizer API native (`Element.prototype.setHTML`) bila tersedia.
2. Fallback: parse via `DOMParser`, buang semua tag/atribut di luar allowlist.
3. Tanpa DOM (mis. SSR): escape penuh ke teks.

HTML sanitizer based on **DOM parsing with an ALLOWLIST** — not a regex blocklist. Safe-by-default strategy:

1. Use native Sanitizer API (`Element.prototype.setHTML`) when available.
2. Fallback: parse via `DOMParser`, strip all tags/attributes outside the allowlist.
3. No DOM (e.g., SSR): full text escape.

#### `__safeAttr(el, name, value)`

Titik tunggal untuk semua `setAttribute` dinamis. Keamanan:

- Event handler `on*` → **DITOLAK** total
- Atribut URL (`href`, `src`, dll.) dengan skema `javascript:`/`data:`/`vbscript:` → **DITOLAK**
- Atribut `style` dengan ekspresi berbahaya → **DITOLAK**
- `srcset` dicek per kandidat URL

Single point for all dynamic `setAttribute` calls. Security:

- `on*` event handlers → **REJECTED** entirely
- URL attributes (`href`, `src`, etc.) with `javascript:`/`data:`/`vbscript:` schemes → **REJECTED**
- `style` attribute with dangerous expressions → **REJECTED**
- `srcset` checked per URL candidate

---

## Shared Infrastructure

Jika ada helper reaktif yang dipakai, shared infrastructure berikut selalu di-emit:

If any reactive helper is used, the following shared infrastructure is always emitted:

```js
var __subscribers = new WeakMap();
var __effectMap = new WeakMap();
var __activeEffect = null;
var __effectId = 0;
```

Ini adalah state global yang dipakai bersama oleh `__createReactive`, `__createComputed`, `__watch`, dan `__cleanup`.

This is global state shared by `__createReactive`, `__createComputed`, `__watch`, and `__cleanup`.

---

## Emit Order

Helper di-emit dalam urutan logis yang ketat:

Helpers are emitted in a strict logical order:

1. Reactive core: `__createReactive` → `__createComputed` → `__watch` → `__setState` → `__cleanup`
2. Error boundary: `__pjs_handleError`
3. Builtins: `__promptjs_panjang` → `__promptjs_apakahKosong` → `__promptjs_apakahAda`
4. Security: `__sanitizeHTML` → `__safeAttr`

---

## Contoh Output / Output Example

Input `.pjs`:
```pjs
Halaman:
    data hitung = 0
    Buat tombol:
        "Klik"
        on_klik = simpan hitung tambah 1 ke hitung
    Saat hitung:
        Buat span: hitung
```

Output JS (hanya helper yang dipakai):
```js
// Shared infra + __createReactive + __watch + __setState
// (~80 baris, bukan ~150 karena __createComputed dan __cleanup tidak di-emit)
```

---

← [Architecture](architecture.md) · [Roadmap →](roadmap.md)
