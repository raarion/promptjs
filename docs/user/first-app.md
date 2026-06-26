# First App / Aplikasi Pertama

> docs/user/ > First App

---

Tutorial ini membangun aplikasi Todo List interaktif dari nol. Setiap langkah menjelaskan fitur PromptJS yang digunakan beserta bukti dari source code.

This tutorial builds an interactive Todo List application from scratch. Each step explains the PromptJS feature used, with evidence from source code.

---

## Langkah 1: Buat Proyek / Step 1: Create the Project

```bash
pjs init todo-ku
cd todo-ku
```

CLI membuat file `index.pjs` dari template `basic`. Buka file tersebut di editor.

The CLI creates `index.pjs` from the `basic` template. Open the file in your editor.

---

## Langkah 2: State Reaktif / Step 2: Reactive State

Ganti isi `index.pjs` dengan:

Replace the contents of `index.pjs` with:

```pjs
---
judul: "Todo Ku"
---

Halaman Todo:
    data daftar = []
    data tugas = ""
```

**Apa yang terjadi / What happens:**

- Baris `---` membuka dan menutup **front-matter**. Konten di antaranya adalah metadata YAML-like yang diproses oleh parser sebelum kompilasi. Key `judul` disimpan sebagai data dan bisa direferensikan dengan `$judul`.
- `data daftar = []` mendeklarasikan state reaktif. Di balik layar, compiler menghasilkan `Proxy` yang melacak perubahan. Inisialisasi array kosong.
- `data tugas = ""` mendeklarasikan state reaktif kedua untuk input pengguna.

**Bukti / Evidence:** Deklarasi `data` diproses oleh parser menjadi node `DataDeclaration`. Compiler menghasilkan kode `Proxy`-based reactivity di output JS. Front-matter diproses oleh fungsi internal `_parseFrontMatter` di engine (`src/engine/promptjs.js`).

---

## Langkah 3: Elemen UI / Step 3: UI Elements

Tambahkan elemen di bawah deklarasi data:

Add elements below the data declarations:

```pjs
    Buat h1: $judul
    Buat masukan#input-tugas[placeholder="Tulis tugas..."]: ""
    Buat tombol#btn-tambah: "Tambah"
```

**Penjelasan / Explanation:**

- `Buat` (atau `Create`) membuat elemen DOM. `masukan` adalah tag alias untuk `<input>`, `tombol` adalah alias untuk `<button>`. Total ada 65 tag alias yang tersedia.
- `#input-tugas` menambahkan `id="input-tugas"`.
- `[placeholder="Tulis tugas..."]` menambahkan atribut HTML.
- `: ""` adalah konten teks kosong (wajib ada setelah `:` untuk buat statement).
- `$judul` mereferensikan variabel dari front-matter.

**Bukti / Evidence:** Tag alias didefinisikan dalam dua tempat: `src/lexer/promptjs-lexer.js` (untuk tokenisasi) dan `src/compiler/emitters/statements.js` baris ~173-246 (untuk pemetaan ke HTML tag). Misalnya, `masukan` → `<input>`, `tombol` → `<button>`, `daftar` → `<ul>`, `item` → `<li>`. Total 65 alias.

---

## Langkah 4: Event Handler / Step 4: Event Handlers

```pjs
    Buat tombol#btn-tambah: "Tambah"
        Ketika diklik:
            tambahkan tugas ke daftar
            simpan "" ke tugas

    Buat masukan#input-tugas[placeholder="Tulis tugas..."]: ""
        on_ketik = simpan document.querySelector("#input-tugas").value ke tugas
```

**Penjelasan / Explanation:**

- `Ketika diklik:` adalah event handler statement. `diklik` adalah event alias untuk `click` (salah satu dari 32 event alias). Handler ini dikompilasi menjadi `addEventListener('click', ...)` pada elemen parent.
- `tambahkan tugas ke daftar` menambahkan nilai `tugas` ke array `daftar`. Dihasilkan sebagai `daftar.push(tugas)`.
- `simpan "" ke tugas` mereset input. Dihasilkan sebagai `tugas = ""` (atau `__setState("tugas", "")` jika variabel reaktif).
- `on_ketik = ...` adalah inline event handler. `ketik` adalah alias untuk `input` event.

**Bukti / Evidence:** Event alias didefinisikan di `src/lexer/promptjs-lexer.js` baris ~303-339 (32 entri). `diklik` → `click`, `ketik` → `input`. Statement `tambahkan` diproses oleh `TambahkanStatement` di compiler. Inline event handler diproses oleh parser di `_parseInlineEventHandler`.

---

## Langkah 5: Render Daftar / Step 5: Render the List

```pjs
    Buat daftar.todo-list:
        Saat daftar:
            kosongkan daftar.todo-list
            Ulangi untuk item dari daftar:
                Buat item.todo-item:
                    Buat span: $item
                    Buat tombol.hapus: "Hapus"
                        Ketika diklik:
                            hapus item dari daftar
```

**Penjelasan / Explanation:**

- `Saat daftar:` adalah reactive watcher. Setiap kali `daftar` berubah (karena Proxy), blok ini dijalankan ulang secara otomatis. Ini bukan event handler — `Saat` memantau perubahan data, sedangkan `Ketika` menangani event DOM.
- `kosongkan daftar.todo-list` mengosongkan `innerHTML` elemen sebelum re-render (mencegah duplikasi).
- `Ulangi untuk item dari daftar:` melakukan iterasi array. Setiap elemen bisa diakses via `$item` atau `item`.
- `hapus item dari daftar` menghapus elemen tertentu dari array. Dihasilkan sebagai `daftar.splice(daftar.indexOf(item), 1)`.
- `Buat item.todo-item:` — `item` adalah tag alias untuk `<li>`.

**Bukti / Evidence:** `Saat` diproses sebagai `SaatStatement` oleh parser. Compiler menghasilkan kode reactive observer. `Ulangi` diproses sebagai `UlangiStatement` dan menghasilkan loop `for...of` atau `forEach`. `hapus...dari` diproses oleh `HapusDariStatement` yang memiliki dua compilation path (statement dan expression), keduanya ditambahkan di v1.0.0.

---

## Langkah 6: CSS / Step 6: Styling

Tambahkan blok `Gaya:` (atau `Style:`) di dalam halaman:

Add a `Gaya:` (or `Style:`) block inside the page:

```pjs
    Gaya:
        body:
            font-family: system-ui
            background: #f0f0f0
            padding: 2rem
        h1:
            color: #333
        .todo-list:
            list-style: none
            padding: 0
        .todo-item:
            display: flex
            align-items: center
            gap: 0.5rem
            padding: 0.5rem
            background: white
            margin-bottom: 0.5rem
            border-radius: 4px
        .hapus:
            background: #ff4444
            color: white
            border: none
            padding: 0.25rem 0.75rem
            border-radius: 4px
            cursor: pointer
        #input-tugas:
            padding: 0.5rem
            font-size: 1rem
            width: 60%
        #btn-tambah:
            padding: 0.5rem 1rem
            font-size: 1rem
            background: #007bff
            color: white
            border: none
            border-radius: 4px
            cursor: pointer
```

**Penjelasan / Explanation:**

Blok `Gaya:` menggunakan sintaks CSS indentasi — selector diikuti properti yang indentasi di bawahnya. Compiler mengekstrak CSS ini dan memisahkannya dari output JS. Pada dev server, CSS disisipkan langsung di `<style>` tag. Pada production build, CSS digabungkan menjadi satu file `prompt.css`.

**Bukti / Evidence:** Ekstraksi CSS dilakukan oleh modul `src/engine/css.js`. Pada dev server (`serve.js`), CSS disisipkan via `<style>` tag di HTML wrapper. Pada multi-page build (`builder.js`), CSS semua halaman digabung ke `prompt.css`.

---

## Langkah 7: Hitungan Tugas / Step 7: Task Count

```pjs
    Buat paragraf.info:
        "Total tugas: "
        panjang(daftar)
```

**Penjelasan / Explanation:**

`panjang(daftar)` adalah runtime helper yang menghasilkan `daftar.length`. Helper ini di-tree-shake — hanya disertakan di output jika dipakai. Karena menggunakan `$daftar` (variabel reaktif) di dekatnya, perubahan pada `daftar` akan memicu update.

**Bukti / Evidence:** `panjang` adalah salah satu runtime helper di `src/compiler/emitters/runtime.js`. Helper dipancangkan hanya jika digunakan (tree-shaking via `compiler.helpers` Set).

---

## Kode Lengkap / Complete Code

Berikut file `index.pjs` lengkap:

Here is the complete `index.pjs` file:

```pjs
---
judul: "Todo Ku"
---

Halaman Todo:
    data daftar = []
    data tugas = ""

    Gaya:
        body:
            font-family: system-ui
            background: #f0f0f0
            padding: 2rem
        h1:
            color: #333
        .todo-list:
            list-style: none
            padding: 0
        .todo-item:
            display: flex
            align-items: center
            gap: 0.5rem
            padding: 0.5rem
            background: white
            margin-bottom: 0.5rem
            border-radius: 4px
        .hapus:
            background: #ff4444
            color: white
            border: none
            padding: 0.25rem 0.75rem
            border-radius: 4px
            cursor: pointer
        #input-tugas:
            padding: 0.5rem
            font-size: 1rem
            width: 60%
        #btn-tambah:
            padding: 0.5rem 1rem
            font-size: 1rem
            background: #007bff
            color: white
            border: none
            border-radius: 4px
            cursor: pointer

    Buat h1: $judul
    Buat masukan#input-tugas[placeholder="Tulis tugas..."]: ""
        on_ketik = simpan document.querySelector("#input-tugas").value ke tugas
    Buat tombol#btn-tambah: "Tambah"
        Ketika diklik:
            tambahkan tugas ke daftar
            simpan "" ke tugas

    Buat paragraf.info:
        "Total tugas: "
        panjang(daftar)

    Buat daftar.todo-list:
        Saat daftar:
            kosongkan daftar.todo-list
            Ulangi untuk item dari daftar:
                Buat item.todo-item:
                    Buat span: $item
                    Buat tombol.hapus: "Hapus"
                        Ketika diklik:
                            hapus item dari daftar
```

---

## Jalankan / Run

```bash
pjs serve
```

Buka `http://localhost:3000` di browser. Ketik tugas, klik "Tambah", dan lihat daftar terupdate secara reaktif. Klik "Hapus" untuk menghapus item.

Open `http://localhost:3000` in the browser. Type a task, click "Tambah", and watch the list update reactively. Click "Hapus" to remove items.

---

## Apa yang Dipelajari / What You Learned

| Fitur / Feature | Keyword | Kompile ke / Compiles to |
|-----------------|---------|-------------------------|
| State reaktif / Reactive state | `data` | `Proxy`-based object |
| Event handler / Event handler | `Ketika` / `When` | `addEventListener()` |
| Inline event / Inline event | `on_xxx = ...` | Inline event attribute |
| Loop / Loop | `Ulangi` / `Loop` | `for...of` / `forEach` |
| Reactive watcher / Reactive watcher | `Saat` / `Watch` | Observer yang re-render |
| Array append / Array append | `tambahkan` / `append` | `Array.push()` |
| Array remove / Array remove | `hapus...dari` | `Array.splice(indexOf, 1)` |
| Tag alias / Tag alias | `masukan`, `tombol`, `daftar`, `item` | `<input>`, `<button>`, `<ul>`, `<li>` |
| CSS block / CSS block | `Gaya:` / `Style:` | Ekstraksi CSS terpisah |
| Runtime helper / Runtime helper | `panjang()` | `.length` |

---

← [Quick Start](quick-start.md) · [Deployment →](deployment.md)