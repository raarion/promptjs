# Contoh: Counter Interaktif / Example: Interactive Counter

> docs/examples/ > Counter

Walkthrough aplikasi penghitung (counter) — contoh paling sederhana untuk memahami **reaktivitas** PromptJS. Sumber: [`examples/counter.pjs`](https://github.com/raarion/promptjs/blob/main/examples/counter.pjs).

A walkthrough of a counter app — the simplest example to understand PromptJS **reactivity**. Source: [`examples/counter.pjs`](https://github.com/raarion/promptjs/blob/main/examples/counter.pjs).

---

## Tujuan / Goal

Membuat tombol yang menambah angka, dan menampilkan angka itu secara *real-time* setiap kali berubah. Plus tombol reset.

Build a button that increments a number and displays it in *real-time* whenever it changes. Plus a reset button.

## Konsep yang Dipakai / Concepts Used

| Konsep / Concept | Keyword | Halaman / Page |
|---|---|---|
| State reaktif / Reactive state | `data` | [reactivity.md](../language/reactivity.md) |
| Watcher / re-render | `Saat` | [reactivity.md](../language/reactivity.md) |
| Membuat elemen / Element creation | `Buat` | [syntax-reference.md](../language/syntax-reference.md) |
| Event handler | `on_klik` | [event-aliases.md](../reference/event-aliases.md) |
| Update state / State update | `simpan … ke …` | [keywords.md](../language/keywords.md) |
| Interpolasi front-matter | `$judul` | [directives.md](../language/directives.md) |

---

## Kode `.pjs` (inti logika) / Core Logic

> Catatan: blok `Gaya:` (CSS) dihilangkan di sini agar fokus ke logika. Versi lengkap dengan styling ada di repo. / The `Gaya:` (CSS) block is omitted here to focus on logic. The full styled version is in the repo.

```pjs
---
judul: "Counter Interaktif"
---

Halaman Counter:
  data hitung = 0

  Buat div.counter-card:
    Buat h1: $judul
    Buat div.count-display:
      Saat hitung:
        Buat span:
          hitung
    Buat div.click-label: "Jumlah Klik"
    Buat div.btn-group:
      Buat tombol.btn.btn-primary#klik:
        "🔺 Tambah"
        on_klik = simpan hitung tambah 1 ke hitung
      Buat tombol.btn.btn-reset#reset:
        "↺ Reset"
        on_klik = simpan 0 ke hitung
```

---

## Penjelasan Baris demi Baris / Line-by-Line

1. **`judul: "Counter Interaktif"`** — front-matter. Nilainya bisa dipanggil dengan `$judul` di body. / Front-matter; callable as `$judul` in the body.
2. **`Halaman Counter:`** — mendeklarasikan halaman bernama `Counter`. / Declares a page named `Counter`.
3. **`data hitung = 0`** — membuat state reaktif `hitung` (Proxy) dengan nilai awal `0`. / Creates reactive state `hitung` (a Proxy) initialized to `0`.
4. **`Buat div.count-display:`** — membuat `<div class="count-display">`. / Creates `<div class="count-display">`.
5. **`Saat hitung:`** — blok *watcher*. Apa pun di dalamnya akan **di-render ulang** setiap kali `hitung` berubah. / A *watcher* block. Everything inside it **re-renders** whenever `hitung` changes.
6. **`on_klik = simpan hitung tambah 1 ke hitung`** — saat diklik, hitung nilai `hitung + 1` lalu simpan kembali ke `hitung`. Karena ada `Saat hitung`, tampilan otomatis ter-update. / On click, compute `hitung + 1` and store it back into `hitung`. Because of `Saat hitung`, the display updates automatically.
7. **`on_klik = simpan 0 ke hitung`** — tombol reset menyetel `hitung` kembali ke `0`. / The reset button sets `hitung` back to `0`.

---

## Mengapa tampilan ikut berubah? / Why does the display update?

Inilah inti reaktivitas PromptJS: **`data` + `Saat` = binding**.

This is the heart of PromptJS reactivity: **`data` + `Saat` = binding**.

- `data hitung` membungkus nilai dalam Proxy. / `data hitung` wraps the value in a Proxy.
- `simpan … ke hitung` memicu *setter* Proxy. / `simpan … ke hitung` triggers the Proxy setter.
- Setter memberi tahu semua blok `Saat hitung` untuk render ulang. / The setter notifies all `Saat hitung` blocks to re-render.

Tanpa `Saat`, nilai `hitung` tetap berubah di memori, tetapi DOM **tidak** ikut ter-update — reaktivitas bersifat eksplisit.

Without `Saat`, `hitung` still changes in memory, but the DOM does **not** update — reactivity is explicit.

---

## Cara Menjalankan / How to Run

```bash
# Kompilasi satu file / Compile a single file
pjs compile examples/counter.pjs

# Atau jalankan dev server dengan live-reload / Or run the dev server with live-reload
pjs serve
```

> Lihat / See: [reference/cli.md](../reference/cli.md).

---

## Variasi / Latihan / Variations / Exercises

1. **Langkah custom** — ubah `tambah 1` menjadi `tambah 5`. / **Custom step** — change `tambah 1` to `tambah 5`.
2. **Tombol kurang** — tambahkan tombol baru dengan `on_klik = simpan hitung kurang 1 ke hitung`. / **Decrement button** — add a button with `on_klik = simpan hitung kurang 1 ke hitung`.
3. **Batas minimum** — gunakan `Jika`/`Lainnya` agar `hitung` tidak pernah negatif. / **Lower bound** — use `Jika`/`Lainnya` so `hitung` never goes negative.

---

← [Kembali ke Index / Back to Index](../README.md) · [Todo →](todo.md)
