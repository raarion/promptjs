# Contoh: Todo List / Example: Todo List

> docs/examples/ > Todo

Walkthrough aplikasi daftar tugas (todo) — contoh untuk memahami **list reaktif**, **input pengguna**, dan operasi **tambah/hapus** item. Sumber: [`examples/todo.pjs`](https://github.com/raarion/promptjs/blob/main/examples/todo.pjs).

A walkthrough of a todo list app — an example to understand **reactive lists**, **user input**, and **add/remove** operations. Source: [`examples/todo.pjs`](https://github.com/raarion/promptjs/blob/main/examples/todo.pjs).

---

## Tujuan / Goal

Membuat daftar tugas: ketik teks, tekan tambah, item muncul di daftar; klik tombol hapus untuk menghapus item. Jumlah item ditampilkan secara *real-time*.

Build a todo list: type text, press add, the item appears in the list; click the delete button to remove it. The item count updates in *real-time*.

## Konsep yang Dipakai / Concepts Used

| Konsep / Concept | Keyword | Halaman / Page |
|---|---|---|
| List reaktif / Reactive list | `data daftar = []` | [reactivity.md](../language/reactivity.md) |
| Input teks / Text input | `Buat masukan`, `on_diketik` | [event-aliases.md](../reference/event-aliases.md) |
| Perulangan / Iteration | `Ulangi untuk … dari …` | [keywords.md](../language/keywords.md) |
| Tambah item / Add item | `tambahkan … ke …` | [keywords.md](../language/keywords.md) |
| Hapus item / Remove item | `hapus … dari …` | [keywords.md](../language/keywords.md) |
| Fungsi bawaan / Built-in | `panjang(daftar)` | [expressions.md](../language/expressions.md) |

---

## Kode `.pjs` (inti logika) / Core Logic

> Blok `Gaya:` (CSS) dihilangkan agar fokus ke logika. / The `Gaya:` (CSS) block is omitted to focus on logic.

```pjs
---
judul: "Todo List"
---

Halaman Todo:
    data daftar = []
    data teks = ""

    Buat div.todo-wrapper:
        Buat h1: $judul
        Buat div.todo-stats:
            Buat span:
                "📋 "
            Saat daftar:
                Buat span:
                    panjang(daftar)
            Buat span:
                " item"

        Buat div.input-group:
            Buat masukan#todo-input:
                placeholder = "Tulis tugas baru..."
                on_diketik = simpan document.querySelector("#todo-input").value ke teks
            Buat tombol#btn-tambah:
                "+ Tambah"
                on_klik = tambahkan teks ke daftar

        Buat daftar.todo-list:
            Ulangi untuk item dari daftar:
                Buat li.todo-item:
                    Buat span.todo-text: item
                    Buat tombol.delete-btn: "✕"
                        on_klik = hapus item dari daftar
```

---

## Penjelasan / Explanation

### 1. Dua state reaktif / Two reactive states

```pjs
data daftar = []   # array item tugas / array of todo items
data teks = ""     # teks input saat ini / current input text
```

`daftar` adalah list reaktif; `teks` menyimpan apa yang sedang diketik pengguna. / `daftar` is a reactive list; `teks` holds what the user is currently typing.

### 2. Menampilkan jumlah item / Displaying the count

```pjs
Saat daftar:
    Buat span:
        panjang(daftar)
```

`Saat daftar` membuat jumlah item (`panjang(daftar)`) ter-update otomatis setiap kali list berubah. / `Saat daftar` makes the item count (`panjang(daftar)`) update automatically whenever the list changes.

### 3. Menangkap input / Capturing input

```pjs
on_diketik = simpan document.querySelector("#todo-input").value ke teks
```

Setiap ketikan menyimpan nilai input ke state `teks`. / Each keystroke stores the input value into the `teks` state.

### 4. Menambah item / Adding an item

```pjs
on_klik = tambahkan teks ke daftar
```

`tambahkan teks ke daftar` mendorong nilai `teks` ke `daftar`. Karena `daftar` reaktif, daftar di layar dan hitungan item langsung ter-update. / `tambahkan teks ke daftar` pushes the value of `teks` onto `daftar`. Since `daftar` is reactive, the on-screen list and item count update instantly.

### 5. Mengulang & menghapus / Looping & removing

```pjs
Ulangi untuk item dari daftar:
    Buat li.todo-item:
        Buat span.todo-text: item
        Buat tombol.delete-btn: "✕"
            on_klik = hapus item dari daftar
```

`Ulangi untuk item dari daftar` me-render satu `<li>` per item. Tombol hapus memanggil `hapus item dari daftar` untuk membuang item itu. / `Ulangi untuk item dari daftar` renders one `<li>` per item. The delete button calls `hapus item dari daftar` to remove that item.

---

## Cara Menjalankan / How to Run

```bash
pjs serve            # dev server + live-reload
# atau / or
pjs compile examples/todo.pjs
```

---

## Variasi / Latihan / Variations / Exercises

1. **Cegah item kosong** — bungkus `tambahkan` dengan `Jika teks !== "":`. / **Prevent empty items** — wrap `tambahkan` in `Jika teks !== "":`.
2. **Reset input** — setelah menambah, `simpan "" ke teks`. / **Clear input** — after adding, `simpan "" ke teks`.
3. **Pesan kosong** — tampilkan teks "Belum ada tugas" saat `panjang(daftar)` = 0 dengan `Jika`. / **Empty message** — show "No tasks yet" when `panjang(daftar)` is 0 using `Jika`.
4. **Persistensi** — simpan `daftar` ke `localStorage` agar tetap ada setelah refresh. / **Persistence** — save `daftar` to `localStorage` so it survives refresh.

---

← [Counter](counter.md) · [Kembali ke Index / Back to Index](../README.md)
