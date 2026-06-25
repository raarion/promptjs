# Referensi Sintaks / Syntax Reference

> docs/language/ → **Syntax Reference**
> ← [Keywords](keywords.md) · [Directives](directives.md) →

---

Referensi lengkap sintaks PromptJS v1.0. Untuk detail mendalam per topik, lihat halaman khusus masing-masing.

Complete syntax reference for PromptJS v1.0. For in-depth details on each topic, see the dedicated pages.

---

## 1. Front-Matter

Bentuk eksplisit (semua direktif tersedia / all directives available):

```pjs
---
judul: "Dashboard"
deskripsi: "Panel admin"
produk: ./data/items.json
router: benar
adapter: static
butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
peran: admin
---
```

Bentuk implisit (hanya 6 direktif perilaku / only 6 behavioral directives): `router`, `adapter`, `butuhAuth`, `redirect`, `tokenKey`, `peran`. Lihat [Directives](directives.md).

---

## 2. Halaman / Page

```pjs
Halaman NamaHalaman:
    Buat judul: "Judul"
```

```pjs
Page PageName:
    Create h1: "Title"
```

---

## 3. Buat Elemen / Create Element

```pjs
# Dasar / Basic
Buat tombol: "Klik"
Buat paragraf: "Hello"

# CSS selector
Buat div.kontainer: ""
Buat span#harga: "Rp 5000"
Buat h2.judul.utama: "Welcome"

# HTML attributes
Buat masukan[placeholder="Nama"]: ""
Buat gambar[src="/img.png" alt="Foto"]: ""
Buat a[href="/about"]: "About"

# Konten inline setelah ":"
Buat tombol: "Click me"

# Nested (indentasi 2 spasi)
Buat div.kartu:
    Buat h3: "Judul"
    Buat p: "Deskripsi"
```

Semua 63 tag alias tersedia (`tombol`, `ruang`, `navigasi`, dll). Lihat [Tag Aliases](../reference/tag-aliases.md). Sibling `Buat` blocks dengan `Ketika` didukung (BUG-1 fixed).

---

## 4. State / State Declaration

```pjs
data hitung = 0           # Reaktif (Proxy-based) / Reactive
tetap PI = 3.14           # Konstanta / Constant
ubah counter = 0          # Mutable non-reaktif / Mutable non-reactive
turunan ganda = hitung * 2 # Computed, read-only / Computed
```

Lihat [Reactivity](reactivity.md) untuk detail mekanisme Proxy.

---

## 5. Kontrol Alur / Control Flow

```pjs
# Kondisional / Conditional
Jika x > 0:
    Buat span: "Positif"
Lainnya:
    Buat span: "Nol"

# Loop array
Ulangi untuk item dari $daftar:
    Buat li: $item

# Loop N kali
Ulangi 5 kali:
    Buat span: "Item"

# Loop range
Ulangi untuk i dari 1 sampai 10:
    Buat span: $i

# While
Selama x > 0:
    simpan x kurang 1 ke x

# Break
Berhenti

# Skip
Lewati

# Return
kembalikan $hasil
```

---

## 6. Aksi / Action Statements

```pjs
# Simpan (reaktif → __setState, localStorage → setItem, plain → =)
simpan 5 ke hitung
simpan "token" ke localStorage.auth_token

# Tambahkan ke array reaktif
tambahkan item ke daftar

# Kurangi nilai reaktif
kurangi 1 dari hitung

# Hapus localStorage
hapus localStorage.auth_token

# Hapus dari array reaktif
hapus item dari daftar

# Kosongkan elemen
kosongkan daftar

# Perbarui properti elemen (alias: teks/innerHTML, kelas/className, src, href, nilai/value, placeholder, disabled, checked, jenis/type)
perbarui teks ke "Hello"

# Tampilkan string → alert, tampilkan elemen → style.display=''
tampilkan "Pesan"
tampilkan elemen

# Sembunyikan elemen
sembunyikan elemen

# Fetch async
Ambil dari "https://api.example.com/data":
    simpan hasil.ke items

# Navigasi (SPA → __pjsRouter.navigate, non-SPA → location.href)
arahkan "/dashboard"

# Muat ulang (satu kata, concatenated)
muatulang

# Kembali ke halaman sebelumnya
kembali

# Jalankan fungsi
jalankan fungsiKu()
```

---

## 7. Event Handler / Ketika

```pjs
# Statement form
Buat tombol: "Klik"
    Ketika diklik:
        tambahkan 1 ke hitung

# Inline form
Buat tombol: "Klik"
    on_klik = tambahkan 1 ke hitung

# Dengan modifier
Buat tautan[href="/"]: "Link"
    Ketika diklik .cegah:
        arahkan "/other"

# Lifecycle SPA
Ketika dipasang:
    ambil dari "/api/init"
Ketika dilepas:
    kosongkan items

# Muat (→ DOMContentLoaded)
Ketika muat:
    simpan "Ready" ke status
```

32 event alias tersedia. Lihat [Event Aliases](../reference/event-aliases.md).

---

## 8. Watcher / Saat

```pjs
data hitung = 0
Saat hitung berubah:
    Buat span: "Sekarang: " + $hitung
```

Kata `berubah` opsional. `Saat` BERBEDA dari `Ketika` — `Saat` untuk data reaktif, `Ketika` untuk event DOM. Lihat [Reactivity](reactivity.md).

---

## 9. Komponen / Component

```pjs
Komponen Kartu(judul, harga):
    Buat div.kartu:
        Buat h3: $judul
        Buat span: $harga

# Instansiasi
Buat Kartu(judul: "Kopi", harga: 45000):
```

Nama komponen HARUS PascalCase. Lihat [Components](components.md).

---

## 10. Ekspresi / Expressions

```pjs
# Variable reference
$nama
$item.harga
$daftar[0]

# Operator simbol standar
hitung + 1
x > 0 dan y < 10

# Operator kata
hitung tambah 1
x sama dengan 10
x dan y
tidak kosong

# Ternary
x > 0 ? "A" : "B"

# Method call
$daftar.filter(x => x > 0)
```

Lihat [Expressions](expressions.md) dan [Keywords](keywords.md) untuk daftar lengkap operator kata.

---

## 11. CSS / Gaya

```pjs
Gaya:
    .kartu:
        border: 1px solid #ccc
        padding: 16px
        border-radius: 8px
    .judul:
        font-size: 1.5em
        font-weight: bold
```

Blok `Gaya` (atau `Style`) diekstrak SEBELUM lexing. CSS di-scope via `[data-pjs-<scope>]`. Mendukung selector CSS standar termasuk pseudo-class seperti `:hover`.

The `Gaya` (or `Style`) block is extracted BEFORE lexing. CSS is scoped via `[data-pjs-<scope>]`. Supports standard CSS selectors including pseudo-classes like `:hover`.

---

## 12. Komentar / Comments

```pjs
# Ini komentar baris tunggal
Buat h1: "Hello"  # komentar inline

[[ Ini komentar blok
   bisa multi-baris ]]
```

Komentar dihilangkan saat kompilasi dan tidak muncul di output JavaScript.

Comments are stripped during compilation and do not appear in the output JavaScript.

---

## Quick Reference Card

```
HALAMAN:       Halaman / Page
ELEMEN:       Buat / Create
STATE:        data / state | tetap / const | ubah / let | turunan / derived
KONDISI:      Jika / If | Lainnya / Else
LOOP:         Ulangi / Loop | untuk / for | dari / from | sampai / until | kali / times | Selama / while
WATCHER:      Saat / Watch (data reaktif, bukan event)
EVENT:        Ketika / When (event DOM dan lifecycle)
ACTION:       simpan / save | tambahkan / append | kurangi / remove | hapus / delete
NAVIGASI:     arahkan / navigate | muatulang / reload | kembali / back
LAINNYA:      tampilkan / show | sembunyikan / hide | kosongkan / clear | perbarui / update
FETCH:        Ambil dari / Fetch from
COMPONENT:    Komponen / Component | Gunakan / Use
LIFECYCLE:    dipasang / mounted | dilepas / unmounted
BOOLEAN:      benar / true | salah / false | kosong / null
COMMENT:      # line | [[ block ]]
CSS:          Gaya: / Style:
```

---

← [Keywords](keywords.md) · [Directives](directives.md) →