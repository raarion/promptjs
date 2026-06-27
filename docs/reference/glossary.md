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

## Keamanan / Security

PromptJS menanamkan beberapa helper keamanan ke runtime hasil-kompilasi (lihat `src/compiler/emitters/runtime.js`). Helper ini bersifat **fail-closed** — input berbahaya ditolak diam-diam sambil app tetap berjalan.

PromptJS injects several security helpers into the compiled runtime (see `src/compiler/emitters/runtime.js`). These helpers are **fail-closed** — dangerous input is silently rejected while the app keeps running.

| Istilah / Term | Deskripsi / Description |
|----------------|------------------------|
| `__sanitizeHTML` | Helper runtime yang membersihkan string HTML sebelum di-`innerHTML` (mis. untuk `perbarui html`), membuang elemen/atribut berbahaya / Runtime helper that sanitizes HTML strings before `innerHTML` assignment, stripping dangerous elements/attributes (`runtime.js:173`) |
| `__safeAttr` | Helper runtime yang memasang atribut secara aman: memblokir atribut event-handler inline (`on*`) dan URL berskema tidak aman (`javascript:`/`data:`/`vbscript:`) / Runtime helper that sets attributes safely: blocks inline event-handler attributes (`on*`) and unsafe URL schemes (`runtime.js:244`) |
| `__pjs_verifyPeran` | Seam global opsional (`window.__pjs_verifyPeran(peran, allowed)`) untuk verifikasi peran server-side; bila ada dan mengembalikan `false`, akses ditolak / Optional global seam for server-side role verification; if present and it returns `false`, access is denied (`promptjs-compiler.js:136`) |
| Fail-closed | Kebijakan keamanan: bila ragu, tolak. Atribut/URL berbahaya diblokir tanpa menghentikan render / Security policy: when in doubt, deny. Dangerous attributes/URLs are blocked without halting render |
| Auth guard advisory | Pemeriksaan `butuhAuth`/`peran` bersifat client-side/advisory — bukan kontrol keamanan; otorisasi sungguhan WAJIB di server / The `butuhAuth`/`peran` check is client-side/advisory — not a security control; real authorization MUST live on the server |

### Warning runtime keamanan / Runtime security warnings

| Kode / Code | Dipicu oleh / Triggered by | Pesan / Behavior |
|-------------|----------------------------|------------------|
| `PJS-W1001` | `__safeAttr` menolak atribut event-handler inline (`onclick`, `onerror`, ...) | `console.warn('[PromptJS] PJS-W1001: atribut event-handler diblokir demi keamanan: ...')` — atribut tidak dipasang, app tetap jalan |
| `PJS-W1002` | `__safeAttr` menolak URL berskema tidak aman pada atribut URL (`href`, `src`, ...) | `console.warn('[PromptJS] PJS-W1002: URL skema tidak aman diblokir ...')` — atribut tidak dipasang, app tetap jalan |

> Catatan: `PJS-W1001`/`PJS-W1002` adalah warning **runtime** (dicetak ke console browser), berbeda dari kode diagnostik compile-time `Wxxxx` di [Error Codes](error-codes.md). Keduanya memakai konvensi prefix `[PromptJS] KODE: pesan (saran: ...)` berbahasa Indonesia.

---

← [Error Codes](error-codes.md) · [CLI](cli.md) →