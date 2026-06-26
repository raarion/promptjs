# Glosarium / Glossary

> docs/reference/ → **Glossary / Glosarium**
> ← [Error Codes](error-codes.md) · [CLI](cli.md) →

---

Daftar istilah penting dalam PromptJS beserta terjemahan dan deskripsi.

A list of important terms in PromptJS with translations and descriptions.

---

## Keyword & Statement / Keyword & Pernyataan

| Istilah ID | English Term | Deskripsi / Description |
|-----------|--------------|------------------------|
| Halaman | Page | Root container statement, juga digunakan untuk MPA routes / Root container statement, also used for MPA routes |
| Buat | Create | Membuat elemen DOM / Creates DOM elements |
| Ketika | When | Event handler statement / Event handler statement |
| Saat | Watch | Watcher reaktivitas, bukan event handler / Reactivity watcher, not an event handler |
| Jika | If | Kondisional / Conditional |
| Lainnya | Else | Cabang else dari kondisional. Multi-kata: `selain itu` / Else branch of conditional. Multi-word: `selain itu` |
| Ulangi | Loop | Perulangan (ulangi ... dari ... :, ulangi ... kali :, ulangi ... dari ... sampai ... :) / Loop construct |
| Jalankan | Run | Menjalankan fungsi / Executes a function |
| Berhenti | Break | Keluar dari loop atau event handler / Exits loop or event handler |
| Lewati | Continue | Lewati iterasi saat ini dalam loop / Skips current iteration in loop |
| Kembalikan | Return | Mengembalikan nilai dari fungsi/komponen / Returns a value from function/component |
| Langsung | Inline JS | Menjalankan kode JavaScript langsung / Executes JavaScript code directly |

---

## Data & State / Data & Keadaan

| Istilah ID | English Term | Deskripsi / Description |
|-----------|--------------|------------------------|
| data | state | State reaktif berbasis Proxy / Proxy-based reactive state |
| turunan | derived | Computed property, read-only reaktif / Computed property, read-only reactive |
| tetap | const | Konstanta, tidak dapat diubah setelah inisialisasi / Constant, cannot be changed after initialization |
| ubah | let | Variabel mutable non-reaktif / Non-reactive mutable variable |
| simpan | save | Menyimpan nilai ke variabel / Saves a value to a variable |

---

## Aksi / Actions

| Istilah ID | English Term | Deskripsi / Description |
|-----------|--------------|------------------------|
| tambahkan | append | Menambah item ke array / Adds item to array |
| kurangi | remove | Mengurangi nilai variabel / Decrements a variable value |
| hapus | delete | Menghapus elemen DOM atau item array / Deletes DOM element or array item |
| sisipkan | insert | Menyisipkan item ke array pada posisi tertentu / Inserts item to array at position |
| tampilkan | show | Menampilkan pesan/elemen / Shows a message or element |
| sembunyikan | hide | Menyembunyikan elemen DOM / Hides a DOM element |
| kosongkan | clear | Mengosongkan innerHTML elemen / Clears element innerHTML |
| perbarui | update | Memperbarui properti elemen (teks, html, kelas, src, href, dll.) / Updates element properties |

---

## Komponen & Modul / Component & Module

| Istilah ID | English Term | Deskripsi / Description |
|-----------|--------------|------------------------|
| Komponen | Component | Definisi komponen reusable / Reusable component definition |
| Gunakan | Use | Instansiasi komponen / Component instantiation |
| kirim | share | Export module / Module export |
| terima | get | Import module / Module import |

---

## Navigasi / Navigation

| Istilah ID | English Term | Deskripsi / Description |
|-----------|--------------|------------------------|
| arahkan | navigate | Navigasi ke halaman lain / Navigate to another page |
| muatulang | reload | Memuat ulang halaman (satu kata, concatenated) / Reloads the page (one word, concatenated) |
| kembali | back | Kembali ke halaman sebelumnya / Goes back to previous page |
| setelah | after | Hook post-completion: `setelah <target> selesai:` / Post-completion hook |

---

## Struktur & Gaya / Structure & Style

| Istilah ID | English Term | Deskripsi / Description |
|-----------|--------------|------------------------|
| Gaya | Style | Blok CSS / CSS block |
| Front-matter | Front-matter | Metadata di awal file, dibatasi `---` / Metadata at the start of a file, delimited by `---` |

---

## Internal / Internal

| Istilah | Deskripsi / Description |
|---------|------------------------|
| buatStack | Stack internal parser untuk melacak konteks Blok Buat / Internal parser stack for tracking Create block context |
| Pipeline | Alur kompilasi 5 tahap: Lexer, Parser, Resolver, Analyzer, Compiler / 5-stage compilation pipeline: Lexer, Parser, Resolver, Analyzer, Compiler |
| Tree-shaking | Hanya menyertakan runtime helper yang dipakai dalam output / Only includes used runtime helpers in output |
| Adapter | Strategi deployment: `static`, `node`, `vercel` / Deployment strategy: `static`, `node`, `vercel` |
| Plugin | Hook transform untuk memodifikasi output kompilasi / Transform hook for modifying compilation output |

---

← [Error Codes](error-codes.md) · [CLI](cli.md) →