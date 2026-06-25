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

## Tree-Shaking Runtime Helpers / Helper yang Di-Tree-Shake

Compiler mempertahankan Set `helpers` selama traversal AST. Setiap visitor menambahkan nama helper yang dipakai. `emitRuntimeHelpers()` hanya memancang helper yang ada di Set.

The compiler maintains a `helpers` Set during AST traversal. Each visitor adds the names of helpers it uses. `emitRuntimeHelpers()` only emits helpers present in the Set.

| Helper | Digunakan saat / Used When | Fungsi / Purpose |
|--------|---------------------------|-------------------|
| `__createReactive` | Deklarasi `data` | Proxy wrapper dengan subscriber tracking |
| `__createComputed` | Deklarasi `turunan` | Computed effect yang auto-subscribe ke deps |
| `__watch` | Statement `Saat` | Manual watcher subscription |
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