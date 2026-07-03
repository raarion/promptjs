# Reaktivitas / Reactivity

> docs/language/ → **Reactivity**
> ← [Components](components.md) · [Routing](routing.md) →

---

Sistem reaktivitas PromptJS berbasis Proxy JavaScript. Variabel `data` otomatis memicu pembaruan DOM ketika nilainya berubah, tanpa memerlukan framework eksternal. Semua runtime helper yang diperlukan di-tree-shake sehingga hanya kode yang benar-benar dipakai yang masuk ke output.

PromptJS reactivity is based on JavaScript Proxy. `data` variables automatically trigger DOM updates when their value changes, without requiring an external framework. All needed runtime helpers are tree-shaken so only code that is actually used enters the output.

---

## State Reaktif / Reactive State

Deklarasikan dengan `data` (atau `state`). Variabel ini dibungkus dalam Proxy yang melacak akses baca dan menyalakan subscriber saat nilai berubah.

Declare with `data` (or `state`). These variables are wrapped in a Proxy that tracks read access and fires subscribers when the value changes.

```pjs
data hitung = 0
data nama = ""
data daftar = []
```

**Kompilasi / Compiles to:**
```js
const hitung = __createReactive(0);
const nama = __createReactive("");
const daftar = __createReactive([]);
```

Nilai reaktif dibaca via `.value` dan ditulis via `__setState()` untuk memicu subscriber. Compiler menangani ini otomatis.

Reactive values are read via `.value` and written via `__setState()` to trigger subscribers. The compiler handles this automatically.

---

## Computed / Turunan

Deklarasikan dengan `turunan` (atau `derived`). Nilai dihitung otomatis dari state reaktif lain dan bersifat read-only.

Declare with `turunan` (or `derived`). Values are automatically computed from other reactive state and are read-only.

```pjs
turunan ganda = hitung * 2
turunan label = "Hitung: " + hitung
```

**Kompilasi / Compiles to:**
```js
const ganda = __createComputed(() => (hitung.value * 2));
const label = __createComputed(() => ("Hitung: " + hitung.value));
```

`__createComputed` membuat effect yang otomatis berlangganan ke dependency via Proxy get trap. Jika Anda mencoba menulis ke turunan, kompilator menghasilkan E4004.

`__createComputed` creates an effect that automatically subscribes to dependencies via the Proxy get trap. If you try to write to a derived value, the compiler emits E4004.

---

## Watcher / Saat

`Saat` mengamati perubahan variabel reaktif dan menjalankan callback saat nilai berubah. Ini BERBEDA dengan `Ketika` yang menangani event DOM.

`Saat` watches reactive variable changes and runs a callback when the value changes. This is DIFFERENT from `Ketika` which handles DOM events.

```pjs
data hitung = 0

Saat hitung berubah:
    Buat span.info: "Hitung sekarang: " + $hitung
```

**Kompilasi / Compiles to:**
```js
__watch(hitung, function(n, o) {
    var __el_2 = document.createElement('span');
    __el_2.className = 'info';
    __el_2.innerText = "Hitung sekarang: " + hitung.value;
    // ... append marker span ...
});
```

Kata `berubah` bersifat opsional — `Saat hitung:` juga berfungsi. Watcher menyisipkan marker `<span>` tersembunyi di DOM untuk menampung output.

The word `berubah` is optional — `Saat hitung:` also works. Watchers insert a hidden marker `<span>` in the DOM to hold their output.

---

## Two-way Binding / Ikat Dua Arah

`ikat` (atau `bind`) di dalam body elemen form menautkan `.value` elemen dengan variabel reaktif secara DUA ARAH — tanpa perlu `Ketika ... diketik:` manual atau `querySelector`. Mengetik di input memperbarui state; mengubah state memperbarui input.

`ikat` (or `bind`) inside a form element body links the element's `.value` to a reactive variable BOTH ways — no manual `Ketika ... diketik:` or `querySelector` needed. Typing into the input updates the state; changing the state updates the input.

```pjs
data nama = ""

Buat masukan #f:
    ikat = nama

Buat p: "Halo, " + $nama
```

**Kompilasi / Compiles to:**
```js
const __el = document.createElement("input");
__el.value = nama.value;                                            // state -> input (awal)
__el.addEventListener("input", (event) => { __setState(nama, event.target.value); }); // input -> state
__watch(nama, (__v) => { if (__el.value !== __v) __el.value = __v; });                 // state -> input
```

Penulisan `state -> input` bersifat _caret-safe_: hanya menulis saat nilai benar-benar berbeda, sehingga tidak mengganggu posisi kursor saat pengguna mengetik. Dalam mode SPA (`router: benar`), listener `input` dan unsub `__watch` otomatis didaftarkan ke `__cleanupFns` agar tidak bocor antar-rute.

The `state -> input` write is _caret-safe_: it only writes when the value actually differs, so it never disturbs the caret while the user types. In SPA mode (`router: benar`), both the `input` listener and the `__watch` unsub are auto-registered into `__cleanupFns` so nothing leaks across routes.

> Bandingkan dengan `nilai = <expr>` yang hanya menetapkan nilai awal satu arah (tanpa sinkronisasi balik). / Contrast with `nilai = <expr>`, which only sets an initial one-way value (no write-back sync).

---

## Fetch Inline sebagai Aksi Event / Inline Fetch as Event Action

Selain bentuk-blok `Ketika diklik:` → `Ambil dari "url":`, fetch dapat dipasang **langsung** pada handler event sebagai aksi inline. Bentuk ini menghilangkan kebutuhan blok bersarang atau JS vanilla untuk kasus umum "klik → ambil data".

Besides the block form `Ketika diklik:` → `Ambil dari "url":`, a fetch can be wired **directly** onto an event handler as an inline action. This removes the need for a nested block or vanilla JS for the common "click → fetch" case.

```pjs
on_klik = ambil dari "https://api.test/items"            # fetch-and-forget
on_klik = ambil dari "https://api.test/items" ke items   # bind hasil + auto state
on_klik = fetch from "https://api.test/items" ke items   # English (fetch/from/ke)
```

### Auto-state `.memuat` / `.galat` (opt-in)

Saat di-bind dengan `ke <target>`, emitter menyetir dua variabel reaktif pendamping opsional: `<target>_memuat` (boolean loading) dan `<target>_galat` (pesan error). Setiap penulisan di-`typeof`-guard, jadi flag yang **tidak** dideklarasikan hanyalah no-op tak berbahaya — deklarasikan `data <target>_memuat = salah` / `data <target>_galat = ""` untuk mengaktifkannya.

When bound with `ke <target>`, the emitter drives two optional companion reactive vars: `<target>_memuat` (loading boolean) and `<target>_galat` (error message). Every write is `typeof`-guarded, so an **undeclared** flag is a harmless no-op — declare `data <target>_memuat = salah` / `data <target>_galat = ""` to opt in.

```pjs
Halaman P:
    data items = []
    data items_memuat = salah
    data items_galat = ""

    Buat tombol #b: "Muat"
        on_klik = ambil dari "https://api.test/items" ke items

    Jika items_memuat:
        Buat p: "Memuat..."
    Jika items_galat tidak sama dengan "":
        Buat p: "Gagal: " + $items_galat
```

**Urutan state / State ordering:** `<target>_memuat` → `benar` tepat sebelum request; `<target>_galat` di-clear sebelum request; on-success `<target>` diisi hasil (`__data`); on-error `<target>_galat` di-set pesan; `<target>_memuat` → `salah` di `finally`. Tanpa `ke`, fetch bersifat _fetch-and-forget_ (tak menyentuh state).

**State ordering:** `<target>_memuat` → `true` right before the request; `<target>_galat` cleared before the request; on success `<target>` receives the result (`__data`); on error `<target>_galat` is set; `<target>_memuat` → `false` in `finally`. Without `ke`, the fetch is _fetch-and-forget_ (touches no state).

### Bentuk inline dengan cabang / Inline form with branches

Untuk logika kustom, bentuk inline juga menerima blok `berhasil:`/`gagal:` (respons tersedia sebagai `__data`):

For custom logic, the inline form also accepts `berhasil:`/`gagal:` branches (the response is available as `__data`):

```pjs
Buat tombol #b: "Muat"
    on_klik = ambil dari "https://api.test/items":
        berhasil:
            simpan __data ke items
        gagal:
            tampilkan "Gagal memuat"
```

> Bentuk-blok lama (`Ketika diklik:` → `Ambil dari`) tetap didukung penuh tanpa perubahan. / The classic block form (`Ketika diklik:` → `Ambil dari`) remains fully supported and unchanged.

---

## Mutasi Array Reaktif / Reactive Array Mutation

Metode mutasi array (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`) pada objek reaktif dibungkus dalam IIFE + spread copy untuk memastikan subscriber terpicu:

Array mutation methods on reactive objects are wrapped in IIFE + spread copy to ensure subscribers are triggered:

```pjs
tambahkan item ke daftar
```

**Kompilasi / Compiles to:**
```js
daftar.value.push(item.value);
__setState(daftar, [...daftar.value]);
```

---

## Daftar Reaktif & Keyed Diff / Reactive Lists & Keyed Diff (v1.3.0)

Sejak v1.3.0, `Ulangi untuk … dari <sumber>:` yang bersumber pada nilai **reaktif** (`data` atau `turunan`) akan **me-render ulang daftar secara otomatis** setiap kali array berubah. Sumber **non-reaktif** (`tetap`, `ubah`, atau literal) tetap memakai `forEach` sekali jalan seperti sebelumnya — tidak ada `__watch`, tanpa overhead.

Since v1.3.0, `Ulangi untuk … dari <source>:` over a **reactive** value (`data` or `turunan`) **re-renders the list automatically** whenever the array changes. A **non-reactive** source (`tetap`, `ubah`, or a literal) keeps the original one-shot `forEach` — no `__watch`, no overhead.

```pjs
data daftar = []
Ulangi untuk item dari $daftar:
    Buat teks: item.label
```

Jalur reaktif membungkus render dalam `__watch(daftar, …)`, membersihkan marker via `replaceChildren()`, dan menjaga guard `Array.isArray` (sumber non-array atau `null` merender kosong tanpa error). Dalam mode SPA (`router: benar`), unsub dari `__watch` didaftarkan ke `__cleanupFns` sehingga tidak bocor antar-rute.

The reactive path wraps the render in `__watch(daftar, …)`, clears the marker via `replaceChildren()`, and keeps an `Array.isArray` guard (a non-array or `null` source renders empty without throwing). In SPA mode (`router: benar`), the `__watch` unsub is registered into `__cleanupFns` so it never leaks across routes.

### Diff Berkunci / Keyed Diff — `dengan kunci <expr>`

Tambahkan `dengan kunci <expr>` untuk mengaktifkan **rekonsiliasi berkunci** (Opsi B) di atas **node DOM asli** — **tanpa Virtual DOM**. Setiap item dipetakan `Map<kunci, node>`; saat array berubah, node yang kuncinya sama **dipakai ulang** (di-`insertBefore` untuk menata ulang), node baru dirender, node yang kuncinya hilang dihapus. Ini menjaga identitas DOM (fokus input, state scroll, animasi) tetap stabil saat urutan berubah.

Add `dengan kunci <expr>` to switch on **keyed reconciliation** (Opsi B) over the **real DOM nodes** — **no Virtual DOM**. Each item is mapped in a `Map<key, node>`; when the array changes, nodes with an unchanged key are **reused** (reordered via `insertBefore`), new nodes are rendered, and nodes whose key disappeared are removed. This keeps DOM identity (input focus, scroll state, animations) stable across reordering.

```pjs
data daftar = []
Ulangi untuk item dari $daftar dengan kunci item.id:
    Buat teks: item.label
```

> **Keyword jujur / Honest keyword.** `dengan kunci` **benar-benar** mengubah perilaku menjadi keyed diff (node dipakai ulang saat urutan berubah). **Tanpa** `dengan kunci`, loop reaktif memakai render-ulang penuh (K1a) — kata kunci tidak pernah "bohong". · `dengan kunci` genuinely switches to the keyed diff (nodes are reused on reorder). **Without** it, the reactive loop uses a full re-render (K1a) — the keyword never lies.

**Kapan pakai yang mana / When to use which:**

| Situasi / Situation | Rekomendasi / Recommendation |
| --- | --- |
| Daftar statis / jarang berubah · static / rarely-changing list | Non-keyed (`Ulangi untuk …`) — paling ringan |
| Sumber reaktif tetapi append-only · reactive, append-only | Non-keyed reaktif — cukup |
| Reorder / insert / remove di tengah · reorder / insert / remove in the middle | **Keyed** (`dengan kunci`) — jaga identitas node |
| Item berisi input / fokus / animasi · items hold input / focus / animation | **Keyed** — hindari kehilangan state saat urutan berubah |

**Edge case yang ditangani / Handled edge cases:**

- **Kunci duplikat / duplicate keys** → di-disambiguasi sebagai `` `${kunci}__${indeks}` `` sehingga tiap item punya slot stabil.
- **Array kosong / empty array** → marker dibersihkan (0 anak).
- **Non-array guard** → `null`/objek/angka merender kosong tanpa error (`Array.isArray`).
- **Nested loop** → tiap level punya marker + `__keyedList` sendiri.
- **Two-way binding di dalam item** → tetap berfungsi; `__setState` terpasang per item.

> **C-1 (teardown aman / safe teardown).** Watcher daftar dibersihkan lewat `unsub` yang dikembalikan `__watch` (didaftarkan via `__cleanupFns.push`), **bukan** `__cleanup(sumber)` yang destruktif. Dengan begitu, membongkar satu daftar **tidak mematikan** watcher lain (mis. `Saat`) pada sumber yang sama. · The list watcher is torn down through the `unsub` returned by `__watch` (registered via `__cleanupFns.push`), **not** the destructive `__cleanup(source)` — so unmounting one list never kills a sibling watcher (e.g. a `Saat`) on the same source.

**Prinsip inti tetap / Core principles preserved:** keyed diff bekerja murni atas node DOM nyata — **NO vDOM, zero `eval()`, zero `new Function()`**. Reorder memakai `insertBefore` reverse O(n) sederhana (LIS ditunda hingga benchmark menuntut). · the keyed diff works purely over real DOM nodes — **NO vDOM, zero `eval()`, zero `new Function()`**. Reordering uses a simple reverse O(n) `insertBefore` (LIS deferred until a benchmark demands it).

---

## Transisi Daftar (FLIP) — v1.3.1

Tambahkan `dengan transisi <nama>` **setelah** `dengan kunci <expr>` untuk mengaktifkan animasi **FLIP** (First → Last → Invert → Play) pada keyed list. Tanpa modifier ini, perilaku K1b tidak berubah sama sekali — **opt-in murni**.

Add `dengan transisi <name>` **after** `dengan kunci <expr>` to enable **FLIP** (First → Last → Invert → Play) animations on a keyed list. Without this modifier, K1b behaviour is completely unchanged — **purely opt-in**.

```pjs
data daftar = []
Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi fade:
    Buat li: item.label
```

> **Transisi butuh kunci / Transitions require a key.** `dengan transisi` hanya berlaku bila loop juga memakai `dengan kunci`. Tanpa `dengan kunci`, modifier transisi diabaikan dan tidak ada animasi — **keyword jujur**. · `dengan transisi` only takes effect when the loop also uses `dengan kunci`. Without `dengan kunci`, the transition modifier is ignored and no animation occurs — **honest keyword**.

### Mekanik FLIP / FLIP Mechanics

FLIP bekerja murni via **CSS class + `transform`** — tanpa vDOM, tanpa `eval()`, tanpa `new Function()`:

FLIP works purely via **CSS class + `transform`** — no vDOM, no `eval()`, no `new Function()`:

1. **First** — ukur posisi (`getBoundingClientRect`) semua node _sebelum_ rekonsiliasi.
2. **Last** — jalankan rekonsiliasi keyed (K1b): node dipakai ulang, diurutkan ulang, node baru dimasukkan, node lama ditandai untuk dihapus.
3. **Invert** — hitung delta posisi; terapkan `transform: translate(dx, dy)` instan (tanpa transisi) agar node tampak di posisi lama.
4. **Play** — hapus `transform` (dengan CSS `transition: transform`) sehingga node bergerak mulus ke posisi baru.

### Kelas CSS / CSS Classes

Tiga kelas ditambahkan/dihapus otomatis oleh runtime. Nama default diturunkan dari `<nama>` yang diberikan:

| Kelas / Class | Default | Kapan / When |
|---|---|---|
| `<nama>-enter` | mis. `fade-enter` | Ditambah ke node baru saat dimasukkan; dihapus setelah frame pertama (play enter). |
| `<nama>-leave` | mis. `fade-leave` | Ditambah ke node yang akan dihapus; node baru dihapus dari DOM **setelah** `transitionend`. |
| `<nama>-move` | mis. `fade-move` | Ditambah ke node yang berpindah posisi selama fase Play; dihapus setelah `transitionend`. |

**Contoh CSS minimal / Minimal CSS example:**

```css
/* Enter: fade in */
.fade-enter { opacity: 0; }

/* Leave: fade out (node tetap di DOM sampai transisi selesai) */
.fade-leave { opacity: 0; transition: opacity 0.3s; }

/* Move: geser mulus ke posisi baru */
.fade-move { transition: transform 0.3s; }
```

Nama kelas dapat dikustomisasi via opsi runtime (lihat `__flipList` di tabel helper di bawah).

### Aksesibilitas / Accessibility

Runtime **menghormati `prefers-reduced-motion`**. Bila media query `(prefers-reduced-motion: reduce)` aktif, semua animasi dilewati: rekonsiliasi tetap berjalan (DOM benar), tetapi tidak ada class enter/leave/move yang ditambahkan dan tidak ada `transform` yang diterapkan. Mutasi terjadi instan.

The runtime **respects `prefers-reduced-motion`**. When the `(prefers-reduced-motion: reduce)` media query is active, all animations are skipped: reconciliation still runs (DOM is correct), but no enter/leave/move classes are added and no `transform` is applied. Mutations happen instantly.

### Edge Case yang Ditangani / Handled Edge Cases

- **Interupsi mutasi cepat / Rapid mutation interruption** — bila array berubah lagi sebelum animasi selesai, FLIP baru dijalankan dari posisi saat ini; listener `transitionend` lama di-cleanup via `{once: true}` + safety timeout sehingga tidak ada listener yang bocor.
- **Leave sebelum remove / Leave-before-remove** — node yang dihapus tetap di DOM selama animasi leave berlangsung; baru dilepas dari DOM setelah `transitionend` (atau safety timeout). Ini menjaga animasi fade-out tetap terlihat.
- **Identitas node terjaga / Node identity preserved** — node yang berpindah posisi adalah **node DOM yang sama** (bukan dibuat ulang); fokus input, scroll state, dan animasi CSS yang sedang berjalan tidak terganggu.
- **SPA navigate-away** — bila pengguna berpindah rute saat transisi berlangsung, `__cleanupFns` memastikan semua listener `transitionend` dan watcher daftar dibersihkan. Tidak ada kebocoran memori atau listener orphan.

### Prinsip Inti / Core Principles

Transisi FLIP **tidak melanggar** prinsip inti PromptJS:

- **NO vDOM** — animasi bekerja langsung atas node DOM nyata.
- **Zero `eval()` / zero `new Function()`** — animasi via penambahan class CSS dan `style.transform`; tidak ada kode yang di-eval.
- **CSP-safe** — tidak ada string yang dieksekusi sebagai kode; aman untuk Content Security Policy ketat.

---

## Tree-Shaking Runtime Helpers / Helper yang Di-Tree-Shake

Compiler mempertahankan Set `helpers` selama traversal AST. Setiap visitor menambahkan nama helper yang dipakai. `emitRuntimeHelpers()` hanya memancang helper yang ada di Set.

The compiler maintains a `helpers` Set during AST traversal. Each visitor adds the names of helpers it uses. `emitRuntimeHelpers()` only emits helpers present in the Set.

| Helper | Digunakan saat / Used When | Fungsi / Purpose |
|--------|---------------------------|-------------------|
| `__createReactive` | Deklarasi `data` | Proxy wrapper dengan subscriber tracking |
| `__createComputed` | Deklarasi `turunan` | Computed effect yang auto-subscribe ke deps |
| `__watch` | Statement `Saat`, daftar reaktif `Ulangi untuk` | Manual watcher subscription (re-render daftar / list re-render) |
| `__keyedList` | `Ulangi untuk … dengan kunci` | Keyed diff `Map<kunci,node>` atas DOM asli (Opsi B, no vDOM) |
| `__flipList` | `Ulangi untuk … dengan kunci … dengan transisi` | FLIP transitions (enter/leave/move) di atas `__keyedList`; opt-in, CSP-safe |
| `__setState` | `simpan` ke variabel reaktif, mutasi array | Trigger reactive update pada Proxy |
| `__cleanup` | Internal | Unsubscribe semua dependency reactive |
| `__pjs_handleError` | Event handler `Ketika` | Error boundary: console.error + clear overlay |
| `__promptjs_panjang` | `panjang(x)` pada nilai reaktif | Length check untuk reactive values |
| `__promptjs_apakahKosong` | `apakahKosong(x)` pada nilai reaktif | Empty check untuk reactive values |
| `__promptjs_apakahAda` | `apakahAda(arr, item)` pada reaktif | Includes check untuk reactive values |

Infrastruktur reaktif bersama (`__subscribers` WeakMap, `__effectMap` WeakMap, `__activeEffect`, `__effectId`) hanya di-emit jika ada helper reaktif yang dipakai.

The shared reactive infrastructure (`__subscribers` WeakMap, `__effectMap` WeakMap, `__activeEffect`, `__effectId`) is only emitted if any reactive helper is used.

---

## Deteksi Siklus Dependency / Dependency Cycle Detection

Analyzer menggunakan `DependencyGraph` dengan algoritma DFS tiga warna pada edge computed antar `turunan`. Jika ditemukan siklus, error E4201 dipancang:

The analyzer uses `DependencyGraph` with a three-color DFS algorithm on computed edges between `turunan` declarations. If a cycle is found, error E4201 is emitted:

```pjs
turunan a = b
turunan b = a
# → E4201: Dependency cycle pada data turunan
```

---

## Variabel Non-Reaktif / Non-Reactive Variables

`ubah` (atau `let`) menghasilkan variabel JavaScript biasa tanpa Proxy. Perubahan nilainya TIDAK memicu pembaruan DOM:

`ubah` (or `let`) produces a plain JavaScript variable without Proxy. Changing its value does NOT trigger DOM updates:

```pjs
ubah i = 0
# Compiles to: let i = 0;
```

---

← [Components](components.md) · [Routing](routing.md) →