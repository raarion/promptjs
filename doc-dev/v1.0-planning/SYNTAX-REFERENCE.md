# PromptJS — Syntax Reference (v0.9.9)

> Comprehensive syntax reference for the PromptJS mini-DSL template engine.
> Covers all keywords, directives, expressions, and patterns through v0.9.9.

---

## Table of Contents

1. [Front-Matter Directives](#1-front-matter-directives)
2. [Page Declaration](#2-page-declaration)
3. [Element Creation (Buat / Create)](#3-element-creation-buat--create)
4. [State Declaration](#4-state-declaration)
5. [Control Flow](#5-control-flow)
6. [Action Statements](#6-action-statements)
7. [Event Handlers (Ketika / When)](#7-event-handlers-ketika--when)
8. [Reactive Watchers (Saat / Watch)](#8-reactive-watchers-saat--watch)
9. [Component Definition](#9-component-definition)
10. [Expressions & Operators](#10-expressions--operators)
11. [Tag Aliases](#11-tag-aliases)
12. [Event Aliases](#12-event-aliases)
13. [Auth & Protected Content](#13-auth--protected-content)
14. [SPA Routing](#14-spa-routing)
15. [Comments](#15-comments)

---

## 1. Front-Matter Directives

Front-matter is a YAML-like block at the top of a `.pjs` file. It can be explicit (wrapped in `---`) or implicit (bare `key: value` lines of known directives).

| Directive | Type | Default | Description |
|-----------|------|---------|-------------|
| `judul` | string | — | Page title |
| `deskripsi` | string | — | Page description |
| `produk` | string | — | Data source path (e.g., `./data/produk.json`) |
| `router` | `benar` / `salah` | `salah` | Enable SPA client-side routing |
| `adapter` | string | — | Deployment adapter: `static`, `node`, `vercel` |
| `butuhAuth` | `benar` / `salah` | `salah` | Enable auth guard on this page |
| `redirect` | string | `/login` | Redirect target when auth check fails |
| `token` | string | `localStorage` | Token storage source: `localStorage` or `sessionStorage`. Supports dot notation: `localStorage.auth_token` |
| `tokenKey` | string | `token` | Storage key name for auth token. Overrides dot notation key. |
| `peran` | string | — | Required role for access (e.g., `admin`, `editor`). Emits runtime role check. |

### Explicit Front-Matter

```pjs
---
judul: "Dashboard"
deskripsi: "Admin dashboard"
butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
peran: admin
---
```

### Implicit Front-Matter

Known directives can appear without `---` delimiters at the top of the file:

```pjs
butuhAuth: benar
redirect: "/login"
token: localStorage

Halaman Dashboard:
    Buat h2: "Protected"
```

Recognized implicit keys: `router`, `adapter`, `butuhAuth`, `redirect`, `token`, `tokenKey`, `peran`.

---

## 2. Page Declaration

Every `.pjs` file declares a page as its root construct.

**Indonesia:**
```pjs
Halaman NamaHalaman:
    ...
```

**English:**
```pjs
Page PageName:
    ...
```

The page name becomes the root DOM element. In SPA mode, pages are registered with the router.

---

## 3. Element Creation (Buat / Create)

The `Buat` (or `Create`) keyword creates a DOM element. The syntax supports tag names, CSS selectors, IDs, classes, attributes, and inline content.

### Basic Creation

```pjs
Buat tombol: "Click me"
Buat paragraf: "Hello world"
Buat div: ""
```

### With CSS Selector

```pjs
Buat div.kontainer: ""
Buat h2.judul.utama: "Welcome"
Buat span#harga: "Rp 45000"
Buat button#tambah.besar: "Add"
```

### With HTML Attributes

```pjs
Buat input#nama[placeholder="Enter name"]: ""
Buat input#sandi[type="password"]: ""
Buat img[src="/logo.png" alt="Logo"]: ""
Buat a[href="https://example.com"]: "Visit"
```

### Nested Elements (Indentation-Based)

```pjs
Buat div.kartu:
    Buat h3: "Card Title"
    Buat p: "Card description"
    Buat button: "Action"
```

---

## 4. State Declaration

PromptJS provides three types of state: reactive (`data`), constant (`tetap`), and derived (`turunan`).

### Reactive State (data / state)

```pjs
data hitung = 0
data nama = ""
data daftar = []
data pengguna = kosong
```

Changes to `data` variables trigger reactive updates (if a `Saat` watcher is defined).

### Constant (tetap / const)

```pjs
tetap PI = 3.14159
tetap MAX = 100
```

Constants cannot be reassigned after initialization.

### Derived (turunan / derived)

```pjs
turunan ganda = hitung * 2
turunan label = "Count: " + hitung
```

Derived values are computed from other state variables. They update automatically when dependencies change.

---

## 5. Control Flow

### Conditional (Jika / If)

```pjs
Jika $item.stok > 0:
    Buat span.stok: "In stock"
Lainnya:
    Buat span.habis: "Out of stock"
```

`Lainnya` (or `else`) is optional. Nesting is supported via indentation.

### Loop: Iterate Array (Ulangi untuk ... dari / Loop for ... from)

```pjs
Ulangi untuk item dari $produk:
    Buat div.kartu:
        Buat h3: $item.nama
        Buat span: $item.harga
```

### Loop: Range (Ulangi untuk ... sampai / Loop for ... until)

```pjs
Ulangi untuk i dari 1 sampai 10:
    Buat span: $i
```

### Loop: Count (Ulangi ... kali / Loop ... times)

```pjs
Ulangi 5 kali:
    Buat div: "Item"
```

### Break (Berhenti / break)

```pjs
Ulangi untuk item dari $daftar:
    Jika $item.aktif === salah:
        Berhenti
    Buat span: $item.nama
```

### Pass / Skip (Lewati / skip)

```pjs
Jika $opsi === kosong:
    Lewati
```

---

## 6. Action Statements

Action statements modify state, interact with storage, navigate, or control flow.

### Save (simpan / save)

```pjs
simpan "Hello" ke nama
simpan 0 ke hitung
simpan localStorage.getItem("token") ke authToken
```

### Increment (tambahkan / append)

```pjs
tambahkan 1 ke hitung
tambahkan ", " ke teks
```

### Decrement (kurangi / remove)

```pjs
kurangi 1 dari hitung
```

### Insert (sisipkan / insert)

```pjs
sisipkan item ke daftar
```

### Delete (hapus / delete)

```pjs
hapus localStorage.token
```

Compiles to `localStorage.removeItem("token")`. Works on both `localStorage` and `sessionStorage`.

### Clear (kosongkan / clear)

```pjs
kosongkan daftar
```

### Update (perbarui / update)

```pjs
perbarui item dari daftar
```

### Fetch (ambil / fetch)

```pjs
Ambil dari "https://api.example.com/data":
    simpan hasil.ke daftar
```

Async/await wrapper is automatically added.

### Navigate (arahkan / navigate)

```pjs
arahkan ke "/dashboard"
```

### Reload (muatulang / reload)

```pjs
muatulang
```

### Back (kembali / back)

```pjs
kembali
```

### Run (jalankan / run)

```pjs
jalankan fungsiKu()
```

### Use (gunakan / use)

```pjs
gunakan pluginKu
```

### Show / Hide (tampilkan / sembunyikan)

```pjs
tampilkan elemen
sembunyikan pesan
```

### Return (kembalikan / return)

```pjs
kembalikan $hasil
```

---

## 7. Event Handlers (Ketika / When)

`Ketika` attaches event listeners to elements. It is the primary way to handle user interaction.

**Critical distinction:** `Ketika` is for events and lifecycle. `Saat` is for reactive watchers on data. Do not confuse them.

### DOM Events

```pjs
Buat tombol#tambah: "Add"
    Ketika diklik:
        tambahkan 1 ke hitung
```

### Event Aliases

| PromptJS Alias | DOM Event |
|----------------|-----------|
| `diklik` / `on_click` | `click` |
| `diketik` / `on_input` | `input` |
| `diubah` / `on_change` | `change` |
| `ditekan` / `on_keydown` | `keydown` |
| `dilepas` / `on_keyup` | `keyup` |
| `disubmit` / `on_submit` | `submit` |
| `difokus` / `on_focus` | `focus` |
| `ditinggal` / `on_blur` | `blur` |
| `diarahkan` / `on_mouseover` | `mouseover` |
| `dimuat` / `on_load` | `load` |
| `digulir` / `on_scroll` | `scroll` |
| `diseret` / `on_dragstart` | `dragstart` |
| `dikonteks` / `on_contextmenu` | `contextmenu` |
| `dilewat` / `on_paste` | `paste` |
| `masuk` / `on_mouseenter` | `mouseenter` |
| `keluar` / `on_mouseleave` | `mouseleave` |
| `diubahukuran` / `on_resize` | `resize` |
| `salah` / `on_error` | `error` |

### Event Modifiers

```pjs
Ketika diklik .cegah:
    simpan "stopped" ke status
```

`.cegah` calls `event.preventDefault()` before the handler body.

### Inline Event Binding

Events can also be bound inline on element creation:

```pjs
Buat tombol#kurang: "Less"
    on_klik = kurangi 1 dari hitung
```

---

## 8. Reactive Watchers (Saat / Watch)

`Saat` watches a data variable and triggers when its value changes. This is NOT the same as `Ketika` (which handles DOM events).

```pjs
data hitung = 0

Saat hitung berubah:
    tampilkan "Count is now " + hitung
```

`Saat` compiles to a reactive setter interception — when `hitung` is modified, the watcher body executes.

---

## 9. Component Definition

Components are reusable UI blocks defined with `Definisikan` (or `define`, `komponen`, `component`).

```pjs
Definisikan KartuProduk:
    properti nama, harga, stok

    Buat div.kartu:
        Buat h3: $nama
        Buat span: $harga
        Jika $stok > 0:
            Buat span.tersedia: "Tersedia"
        Lainnya:
            Buat span.habis: "Habis"
```

### Using Components

```pjs
Buat KartuProduk:
    nama = "Kopi Aceh"
    harga = 45000
    stok = 12
```

---

## 10. Expressions & Operators

### Variable References

```pjs
$nama           # state variable
$item.harga     # property access
$daftar[0]      # index access
```

### Arithmetic

| Indonesia | English | JS Equivalent |
|-----------|---------|---------------|
| `tambah` | `+` | `+` |
| `kurang` | `-` | `-` |
| `kali` | `*` | `*` |
| `bagi` | `/` | `/` |
| `mod` | `%` | `%` |
| `pangkat` | `**` | `**` |

### Comparison

| Indonesia | English | JS Equivalent |
|-----------|---------|---------------|
| `sama dengan` | `===` | `===` |
| `tidak sama dengan` | `!==` | `!==` |
| `lebih dari` | `>` | `>` |
| `kurang dari` | `<` | `<` |
| `paling sedikit` | `>=` | `>=` |
| `paling banyak` | `<=` | `<=` |

Standard JS operators (`===`, `!==`, `>`, `<`, `>=`, `<=`) also work.

### Logical

| Indonesia | English | JS Equivalent |
|-----------|---------|---------------|
| `dan` | `&&` | `&&` |
| `atau` | `\|\|` | `\|\|` |
| `tidak` | `!` | `!` |

### Boolean & Null Literals

| Indonesia | English | JS Equivalent |
|-----------|---------|---------------|
| `benar` | `true` | `true` |
| `salah` | `false` | `false` |
| `kosong` | `null` | `null` |

**Important:** PromptJS uses `salah` for false, NOT `palsu`. This is a deliberate design choice following the bilingual keyword principle.

### String Concatenation

```pjs
"Hello, " + $nama
"Rp " + $harga
"Count: " + $hitung
```

### Ternary Expressions

Standard JS ternary syntax is supported in expressions:

```pjs
$stok > 0 ? "Available" : "Out of stock"
```

---

## 11. Tag Aliases

PromptJS tag aliases map friendly names to HTML tags:

| Indonesia | English | HTML Tag |
|-----------|---------|----------|
| `tombol` | `button` | `<button>` |
| `ruang` | `div` | `<div>` |
| `judul` | `h1` | `<h1>` |
| `subjudul` | `h2` | `<h2>` |
| `paragraf` | `p` | `<p>` |
| `gambar` | `img` | `<img>` |
| `tautan` | `a` | `<a>` |
| `masukan` | `input` | `<input>` |
| `pilihan` | `select` | `<select>` |
| `kolom` | `textarea` | `<textarea>` |
| `tabel` | `table` | `<table>` |
| `opsi` | `option` | `<option>` |
| `navigasi` | `nav` | `<nav>` |
| `kepala` | `header` | `<header>` |
| `kaki` | `footer` | `<footer>` |
| `bagian` | `section` | `<section>` |
| `utama` | `main` | `<main>` |
| `samping` | `aside` | `<aside>` |
| `daftar` | `ul` | `<ul>` |
| `daftarterurut` | `ol` | `<ol>` |
| `item` | `li` | `<li>` |
| `rentang` | `span` | `<span>` |
| `artikel` | `article` | `<article>` |
| `kanvas` | `canvas` | `<canvas>` |
| `wadah` | — | `<div>` |
| `pemisah` | `hr` | `<hr>` |
| `fragmen` | `fragment` | DocumentFragment |
| `formulir` | `form` | `<form>` |

Standard HTML tag names (div, span, h1, h2, p, a, img, etc.) also work directly.

---

## 12. Event Aliases

Full event alias map for inline event binding (`on_xxx`):

| Indonesia Style | English Style | DOM Event |
|-----------------|---------------|-----------|
| `on_klik` | `on_click` | `click` |
| `on_diklik` | — | `click` |
| `on_diketik` | `on_input` | `input` |
| `on_ditekan` | `on_keydown` | `keydown` |
| `on_dilepas` | `on_keyup` | `keyup` |
| `on_diubah` | `on_change` | `change` |
| `on_disubmit` | `on_submit` | `submit` |
| `on_dikirim` | — | `submit` |
| `on_difokus` | `on_focus` | `focus` |
| `on_ditinggal` | `on_blur` | `blur` |
| `on_diarahkan` | `on_mouseover` | `mouseover` |
| `on_dimuat` | `on_load` | `load` |
| `on_digulir` | `on_scroll` | `scroll` |
| `on_diseret` | `on_dragstart` | `dragstart` |
| `on_dikonteks` | `on_contextmenu` | `contextmenu` |
| `on_dilewat` | `on_paste` | `paste` |
| `on_salah` | `on_error` | `error` |

---

## 13. Auth & Protected Content

### Basic Auth Guard

```pjs
butuhAuth: benar
---
Halaman Dashboard:
    Buat h1: "Protected Content"
```

Compiles to an IIFE that checks `localStorage.getItem('token')` and redirects to `/login` if absent.

### Custom Redirect

```pjs
butuhAuth: benar
redirect: "/masuk"
---
Halaman Dashboard:
    Buat h1: "Protected"
```

### Custom Token Source

```pjs
butuhAuth: benar
token: sessionStorage
---
Halaman Dashboard:
    Buat h1: "Protected"
```

Checks `sessionStorage.getItem('token')` instead.

### Custom Token Key (tokenKey)

```pjs
butuhAuth: benar
token: localStorage
tokenKey: auth_token
---
Halaman Dashboard:
    Buat h1: "Protected"
```

Checks `localStorage.getItem('auth_token')`.

### Dot Notation in Token Source

```pjs
butuhAuth: benar
token: localStorage.jwt
---
Halaman Dashboard:
    Buat h1: "Protected"
```

Parses `localStorage.jwt` → source=`localStorage`, key=`jwt`. Checks `localStorage.getItem('jwt')`.

**Note:** `tokenKey` overrides the key extracted from dot notation.

### Role-Based Access (peran)

```pjs
butuhAuth: benar
token: localStorage
tokenKey: auth_token
peran: admin
---
Halaman Admin:
    Buat h1: "Admin Panel"
```

Compiles to:
1. Token check: `localStorage.getItem('auth_token')` → redirect if absent
2. Role check: `localStorage.getItem('__peran')` !== `'admin'` → redirect if wrong role

### Full Auth Pattern

```pjs
butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: session_id
peran: admin
router: benar
---
Halaman Dashboard:
    data nama = ""

    Ketika muat:
        simpan localStorage.getItem("user_name") ke nama

    Buat h2: "Halo, " + $nama
```

---

## 14. SPA Routing

Enable client-side routing with the `router: benar` directive:

```pjs
router: benar
---
Halaman Aplikasi:
    Buat nav:
        Buat tombol[data-halaman="beranda"]: "Home"
        Buat tombol[data-halaman="profil"]: "Profile"
    Buat div#konten:
        Buat h2: "Welcome"
```

In SPA mode:
- Each page is compiled as a factory function (mount/unmount lifecycle)
- The runtime router handles `pushState` + `popstate`
- Navigation via `arahkan ke "/path"` or `data-halaman` attributes
- `dipasang` / `dilepas` lifecycle hooks are available

### Lifecycle Hooks

```pjs
Halaman Dashboard:
    data items = []

    Ketika dipasang:
        simpan "mounted" ke status

    Ketika dilepas:
        simpan "unmounted" ke status
```

- `dipasang` (mounted): Called when page is mounted in SPA
- `dilepas` (unmounted): Called when page is unmounted from SPA

---

## 15. Comments

PromptJS supports line comments:

```pjs
# This is a comment
Buat h1: "Hello"  # inline comment
```

Comments start with `#` and extend to end of line. They are stripped during compilation and do not appear in the output JavaScript.

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│                    PromptJS v0.9.9                           │
├──────────────────────────────────────────────────────────────┤
│ Page:        Halaman / Page                                  │
│ Create:      Buat / Create                                   │
│ If:          Jika / If                                       │
│ Else:        Lainnya / Else                                  │
│ Loop:        Ulangi / Loop                                   │
│ For:         untuk / for                                     │
│ From:        dari / from                                     │
│ Until:       sampai / until                                  │
│ Times:       kali / times                                    │
│ State:       data / state                                    │
│ Const:       tetap / const                                   │
│ Derived:     turunan / derived                               │
│ Define:      Definisikan / define / komponen / component     │
│ Function:    fungsi / func / function                        │
│ Watch:       Saat / watch  (reactive watcher on data)       │
│ When:        Ketika / when  (event/lifecycle handler)        │
│ Return:      kembalikan / return                             │
│ Skip:        lewati / skip / pass                            │
│ Break:       berhenti / break                                │
│ Save:        simpan / save                                   │
│ Append:      tambahkan / append                              │
│ Remove:      kurangi / remove                                │
│ Insert:      sisipkan / insert                               │
│ Delete:      hapus / delete                                  │
│ Clear:       kosongkan / clear                               │
│ Update:      perbarui / update                               │
│ Fetch:       ambil / fetch                                   │
│ Navigate:    arahkan / navigate                              │
│ Reload:      muatulang / reload                              │
│ Back:        kembali / back                                   │
│ Run:         jalankan / run                                  │
│ Use:         gunakan / use                                   │
│ Show:        tampilkan / show                                │
│ Hide:        sembunyikan / hide                              │
│ True:        benar / true                                    │
│ False:       salah / false                                   │
│ Null:        kosong / null                                   │
│ To:          ke / to                                         │
│ Mounted:     dipasang / mounted                              │
│ Unmounted:   dilepas / unmounted                             │
├──────────────────────────────────────────────────────────────┤
│ Directives:  butuhAuth, redirect, token, tokenKey, peran,   │
│              router, adapter                                  │
└──────────────────────────────────────────────────────────────┘
```
