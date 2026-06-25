# Event Alias / Alias Event DOM

> docs/reference/ → **Event Aliases**
> ← [Tag Aliases](tag-aliases.md) · [Keywords](../language/keywords.md) →

---

PromptJS menyediakan alias event yang ramah bahasa Indonesia untuk mendengarkan event DOM. Setiap alias `on_*` dipetakan ke event handler PromptJS asli.

PromptJS provides friendly Indonesian event aliases to listen for DOM events. Each `on_*` alias is mapped to a native PromptJS event handler.

---

## Event Handler Syntax

### Statement Form (Ketika block)

```pjs
Ketika diklik:
    # handler code
```

### Inline Form (on_* attribute)

```pjs
Buat tombol: "Click"
    on_klik = tambahkan 1 ke hitung
```

Keduanya terdukung. Gunakan bentuk statement untuk handler kompleks, inline untuk aksi sederhana.

Both forms supported. Use statement form for complex handlers, inline for simple actions.

---

## Mouse Events / Event Mouse

| Event Handler | on_* Alias | DOM Event | Deskripsi / Description |
|---------------|-----------|-----------|--------------------------|
| `diklik` | `on_klik` | click | Tombol mouse ditekan & dilepas |
| `diarahkan` | `on_diarahkan` | mouseover | Mouse memasuki elemen |
| `masuk` | `on_masuk` | mouseenter | Mouse masuk (no bubble) |
| `keluar` | `on_keluar` | mouseleave | Mouse keluar (no bubble) |
| `dikonteks` | `on_dikonteks` | contextmenu | Right-click context menu |
| `diseret` | `on_diseret` | dragstart | Drag dimulai |

### Examples
```pjs
Buat tombol: "Click"
    Ketika diklik:
        tampilkan "Diklik!"

Buat div.tooltip: "Hover"
    Ketika masuk:
        tampilkan tooltipContent
```

---

## Input Events / Event Input

| Event Handler | on_* Alias | DOM Event | Deskripsi / Description |
|---------------|-----------|-----------|--------------------------|
| `diketik` | `on_diketik` | input | User mengetik di input |
| `diubah` | `on_diubah` | change | Input berubah & focus hilang |
| `difokus` | `on_difokus` | focus | Elemen dapat fokus |
| `ditinggal` | `on_ditinggal` | blur | Elemen kehilangan fokus |

### Examples
```pjs
Buat masukan#search:
    Ketika diketik:
        simpan search.value ke query

Buat masukan#email[type="email"]:
    Ketika ditinggal:
        validasi email
```

---

## Keyboard Events / Event Keyboard

| Event Handler | on_* Alias | DOM Event | Deskripsi / Description |
|---------------|-----------|-----------|--------------------------|
| `ditekan` | `on_ditekan` | keydown | Tombol keyboard ditekan |
| `dilepas` | `on_dilepas` | keyup | Tombol keyboard dilepas |

### Examples
```pjs
Buat masukan#password[type="password"]:
    Ketika ditekan:
        perbarui strengthIndicator
```

---

## Form Events / Event Formulir

| Event Handler | on_* Alias | DOM Event | Deskripsi / Description |
|---------------|-----------|-----------|--------------------------|
| `disubmit` | `on_disubmit` | submit | Formulir disubmit |
| `dikirim` | `on_dikirim` | submit | Formulir disubmit (alternate) |

### Examples
```pjs
Buat formulir#loginForm:
    Ketika disubmit .cegah:
        ambil dari "/api/login"
            simpan result ko user
```

---

## Document & Window Events / Event Dokumen & Jendela

| Event Handler | on_* Alias | DOM Event | Deskripsi / Description |
|---------------|-----------|-----------|--------------------------|
| `dimuat` | `on_dimuat` | load | Halaman/elemen dimuat |
| `digulir` | `on_digulir` | scroll | Halaman digulir |
| `diubahukuran` | `on_diubahukuran` | resize | Jendela diubah ukuran |
| `salah` | `on_salah` | error | Error terjadi |
| `dilewat` | `on_dilewat` | paste | Konten dipaste |

### Examples
```pjs
Ketika dimuat:
    simpan "Page loaded" ke status
    ambil dari "/api/init"

Ketika digulir:
    Jika scrollPosition.bottom:
        ambil dari "/api/items?page=" + nextPage
```

---

## Event Modifiers / Modifikasi Event

### `.cegah` → preventDefault()

Mencegah perilaku default browser untuk event.

Prevents default browser behavior for the event.

```pjs
Buat tautan#deleteBtn[href="/?delete=1"]: "Delete"
    Ketika diklik .cegah:
        # Prevent link navigation
        hapus item dari daftar

Buat formulir#form:
    Ketika disubmit .cegah:
        # Prevent default form submission
        jalankan sendForm()
```

**Kegunaan umum / Common uses:**
- `.cegah` pada `<a>` click → cegah navigasi
- `.cegah` pada form submit → handle dengan kode custom

---

## Event Handler Categories

### 🖱️ Mouse (6 events)
diklik, diarahkan, masuk, keluar, dikonteks, diseret

### ⌨️ Keyboard (2 events)
ditekan, dilepas

### 📝 Input (4 events)
diketik, diubah, difokus, ditinggal

### 📋 Form (2 events)
disubmit, dikirim

### 📄 Document (5 events)
dimuat, digulir, diubahukuran, salah, dilewat

---

## Quick Reference Card / Kartu Referensi Cepat

```
MOUSE:      diklik, diarahkan, masuk, keluar, dikonteks, diseret
KEYBOARD:   ditekan, dilepas
INPUT:      diketik, diubah, difokus, ditinggal
FORM:       disubmit, dikirim
DOCUMENT:   dimuat, digulir, diubahukuran, salah, dilewat
MODIFIER:   .cegah (preventDefault)
```

---

## Both Syntaxes Comparison

```pjs
# Statement form
Buat tombol#btn1: "Click 1"
    Ketika diklik:
        tambahkan 1 ke hitung

# Inline form
Buat tombol#btn2: "Click 2"
    on_klik = tambahkan 1 ke hitung

# With modifier
Buat tautan: "Delete"
    Ketika diklik .cegah:
        jalankan deleteItem()
```

Keduanya setara. Pilih sesuai kebutuhan kompleksitas.

Both are equivalent. Choose based on complexity.

---

## Bilingual Event Names

Event handlers mendukung bilingual:

```pjs
# Indonesian
Ketika diklik:
    # ...

# English
When click:
    # ...

# Inline English style
on_click = tambahkan 1 ke hitung
```

---

## Common Patterns

### Counter Button
```pjs
data counter = 0

Buat tombol: $counter
    Ketika diklik:
        tambahkan 1 ke counter
```

### Search with Listener
```pjs
Buat masukan#search:
    Ketika diketik:
        simpan search.value ke query
        ambil dari "/api/search?q=" + query
```

### Form Validation
```pjs
Buat formulir#form:
    Buat masukan#email:
        Ketika ditinggal:
            validasi email

    Buat tombol[type="submit"]: "Submit"
        Ketika diklik .cegah:
            Jika $formValid:
                ambil dari "/api/submit"
```

---

## Verification / Verifikasi

✅ [VERIFIED: src/lexer/promptjs-lexer.js lines 296-332]

18 event aliases confirmed against source code.

---

← [Tag Aliases](tag-aliases.md) · [Keywords](../language/keywords.md) →
