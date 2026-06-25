# Alias Event / Event Aliases

> docs/reference/ → **Event Aliases**
> ← [Tag Aliases](tag-aliases.md) · [Keywords](../language/keywords.md) →

---

PromptJS menyediakan 32 alias event (`on_*`) yang dipetakan ke event handler PromptJS asli. Alias mendukung bahasa Indonesia dan bahasa Inggris.

PromptJS provides 32 event aliases (`on_*`) mapped to native PromptJS event handlers. Aliases support both Indonesian and English.

---

## Dua Bentuk Sintaksis / Two Syntax Forms

**Bentuk statement (Ketika block) / Statement form:**

```pjs
Buat tombol: "Click"
    Ketika diklik:
        tambahkan 1 ke hitung
```

**Bentuk inline (on_* attribute) / Inline form:**

```pjs
Buat tombol: "Click"
    on_klik = tambahkan 1 ke hitung
```

Keduanya setara. Gunakan bentuk statement untuk handler kompleks, inline untuk aksi sederhana.

Both are equivalent. Use statement form for complex handlers, inline for simple actions.

---

## Modifikasi Event / Event Modifiers

| Modifier | Efek / Effect |
|----------|---------------|
| `.cegah` | Memanggil `preventDefault()` / Calls `preventDefault()` |
| `.hentikan` | Memanggil `stopPropagation()` / Calls `stopPropagation()` |

```pjs
Buat tautan[href="/?delete=1"]: "Delete"
    Ketika diklik .cegah:
        hapus item dari daftar
```

---

## Daftar Lengkap Alias / Complete Alias List

Sumber: `src/lexer/promptjs-lexer.js` baris 296-332 (32 entri)

Source: `src/lexer/promptjs-lexer.js` lines 296-332 (32 entries)

### Mouse (10 alias)

| Alias `on_*` | Event Handler | DOM Event |
|-------------|---------------|-----------|
| `on_klik` | `diklik` | `click` |
| `on_diklik` | `diklik` | `click` |
| `on_click` | `diklik` | `click` |
| `on_diarahkan` | `diarahkan` | `mouseover` |
| `on_mouseover` | `diarahkan` | `mouseover` |
| `on_mouseout` | `ditinggal-kursor` | `mouseout` |
| `on_dragstart` | `diseret` | `dragstart` |
| `on_contextmenu` | `dikonteks` | `contextmenu` |
| `on_mouseenter` | `masuk` | `mouseenter` |
| `on_mouseleave` | `keluar` | `mouseleave` |

### Keyboard (4 alias)

| Alias `on_*` | Event Handler | DOM Event |
|-------------|---------------|-----------|
| `on_ditekan` | `ditekan` | `keydown` |
| `on_dilepas` | `dilepas` | `keyup` |
| `on_keydown` | `ditekan` | `keydown` |
| `on_keyup` | `dilepas` | `keyup` |

### Input (8 alias)

| Alias `on_*` | Event Handler | DOM Event |
|-------------|---------------|-----------|
| `on_diketik` | `diketik` | `input` |
| `on_input` | `diketik` | `input` |
| `on_diubah` | `diubah` | `change` |
| `on_change` | `diubah` | `change` |
| `on_difokus` | `difokus` | `focus` |
| `on_ditinggal` | `ditinggal` | `blur` |
| `on_focus` | `difokus` | `focus` |
| `on_blur` | `ditinggal` | `blur` |

### Form (3 alias)

| Alias `on_*` | Event Handler | DOM Event |
|-------------|---------------|-----------|
| `on_disubmit` | `disubmit` | `submit` |
| `on_dikirim` | `dikirim` | `submit` |
| `on_submit` | `disubmit` | `submit` |

### Document (7 alias)

| Alias `on_*` | Event Handler | DOM Event |
|-------------|---------------|-----------|
| `on_dimuat` | `dimuat` | `load` |
| `on_load` | `dimuat` | `load` |
| `on_digulir` | `digulir` | `scroll` |
| `on_scroll` | `digulir` | `scroll` |
| `on_resize` | `diubahukuran` | `resize` |
| `on_error` | `salah` | `error` |
| `on_paste` | `dilewat` | `paste` |

---

## Event Khusus / Special Events

### Ketika muat: (DOMContentLoaded)

`Ketika muat:` dipetakan ke `DOMContentLoaded`, bukan `load`. Diperbaiki sejak v1.0.

`Ketika muat:` maps to `DOMContentLoaded`, not `load`. Fixed since v1.0.

```pjs
Ketika muat:
    ambil dari "/api/init"
        simpan result ke data
```

### Ketika dipasang: / Ketika dilepas: (Lifecycle SPA)

Ini adalah lifecycle hook SPA, bukan event DOM. Hanya valid di dalam blok komponen.

These are SPA lifecycle hooks, not DOM events. Only valid inside component blocks.

```pjs
Komponen MyWidget:
    Ketika dipasang:
        tampilkan "Widget mounted"
    Ketika dilepas:
        tampilkan "Widget unmounted"
```

---

## Contoh Penggunaan / Usage Examples

```pjs
# Counter dengan statement form
data hitung = 0
Buat tombol: $hitung
    Ketika diklik:
        tambahkan 1 ke hitung

# Search dengan inline form
Buat masukan#search:
    on_diketik = simpan search.value ke query

# Form dengan modifier
Buat formulir#form:
    Ketika disubmit .cegah:
        ambil dari "/api/submit"

# Keyboard shortcut
Buat masukan:
    Ketika ditekan:
        Jika event.key == "Enter":
            jalankan submit()
```

---

← [Tag Aliases](tag-aliases.md) · [Keywords](../language/keywords.md) →