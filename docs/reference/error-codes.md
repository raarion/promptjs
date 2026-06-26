# Kode Error / Error Codes

> docs/reference/ → **Error Codes**
> ← [CLI](cli.md) · [Event Aliases](event-aliases.md) →

---

PromptJS menggunakan sistem kode error/warning 5 digit. Total 84 kode: 65 error (`E`) dan 19 warning (`W`). Setiap kode dikaitkan dengan tahap kompilasi.

PromptJS uses a 5-digit error/warning code system. Total of 84 codes: 65 errors (`E`) and 19 warnings (`W`). Each code is associated with a compilation stage.

**Konvensi penomoran / Numbering convention:**

| Rentang / Range | Tahap / Stage | Jumlah / Count |
|----------------|---------------|----------------|
| E1xxx / W1xxx | Lexer | 9E + 1W = 10 |
| E2xxx / W2xxx | Parser | 28E + 4W = 32 |
| E3xxx / W3xxx | Resolver | 5E + 3W = 8 |
| E4xxx / W4xxx | Analyzer | 15E + 8W = 23 |
| E5xxx / W5xxx | Compiler | 3E + 2W = 5 |
| E6xxx / W6xxx | Runtime | 4E + 0W = 4 |
| E0xxx / W0xxx | System | 1E + 1W = 2 |

**Format output / Output format:**

```
✗ Baris 5, Kolom 12 [Lexer] [E1002]
<message>
Saran: <suggestion>
```

Objek error memiliki field bilingual: `code`/`kode`, `message`/`pesan`, `suggestion`/`saran`.

Error objects have bilingual fields: `code`/`kode`, `message`/`pesan`, `suggestion`/`saran`.

---

## Lexer (E1xxx / W1xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E1001 | Error | Indentasi tidak valid: {n} spasi ditemukan, PromptJS memakai 2 spasi per level | Gunakan 2, 4, 6, atau 8 spasi (kelipatan 2) |
| E1002 | Error | Indentasi tidak valid: karakter TAB ditemukan | Ganti semua tab menjadi spasi (2, 4, 6, ...) |
| E1003 | Error | Indentasi tidak konsisten: {n} spasi tidak cocok dengan level indentasi manapun | Periksa baris di atasnya dan gunakan indentasi yang konsisten |
| E1004 | Error | String tidak ditutup: tanda kutip penutup tidak ditemukan | Tambahkan tanda kutip penutup yang sesuai |
| E1005 | Error | Karakter tidak dikenali: "{char}" | Periksa karakter dan pastikan sesuai dengan spesifikasi PromptJS |
| E1006 | Error | Komentar blok "[[" tidak ditutup dengan "]]" | Tambahkan "]]" untuk menutup komentar blok |
| E1007 | Error | Blok DocString "[[" tidak ditutup dengan "]]" | Tambahkan "]]" untuk menutup blok DocString |
| E1008 | Error | Angka literal tidak valid | Periksa format angka (desimal, heksadesimal, dll.) |
| E1009 | Error | Selector CSS tidak valid | Pastikan selector CSS valid (#id, .class, tag) |
| W1001 | Warning | DocString tidak menempel ke node manapun | - |

---

## Parser (E2xxx / W2xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E2001 | Error | Diharapkan {expected}, tetapi ditemukan "{actual}" | Periksa sintaksis pada lokasi yang ditunjuk |
| E2002 | Error | Selector tidak valid | Pastikan selector diawali nama tag HTML atau identifier |
| E2003 | Error | Nama komponen harus diawali huruf kapital | Gunakan PascalCase untuk nama komponen |
| E2004 | Error | Blok aksi diharapkan setelah ":" | Tambahkan indentasi atau "->" untuk aksi tunggal |
| E2005 | Error | Kurung tutup ")" tidak ditemukan | Tambahkan ")" pada akhir ekspresi |
| E2006 | Error | Kurung kurawal tutup "}" tidak ditemukan | Tambahkan "}" pada akhir objek literal |
| E2007 | Error | Kurung siku tutup "]" tidak ditemukan | Tambahkan "]" pada akhir array/atribut |
| E2008 | Error | Nilai awal diharapkan setelah "=" | Tambahkan nilai setelah "=" |
| E2009 | Error | Kondisi tidak valid | Periksa ekspresi kondisi |
| E2010 | Error | Keyword tidak dikenali di posisi statement | Periksa konteks penggunaan keyword |
| E2011 | Error | Operator tidak didukung | Gunakan "langsung:" untuk operasi yang tidak didukung |
| E2012 | Error | Argumen fungsi tidak valid | Periksa sintaksis argumen |
| E2013 | Error | Parameter komponen/fungsi tidak valid | Periksa sintaksis parameter |
| E2014 | Error | Properti objek literal tidak valid | Periksa sintaksis objek literal |
| E2015 | Error | Selector CSS tidak valid | Periksa konteks penggunaan selector |
| E2016 | Error | Token "->" diharapkan | Gunakan pola: perbarui <properti> <target> -> <nilai> |
| E2017 | Error | Target event tidak valid | Periksa target dan nama event |
| E2018 | Error | Nama event tidak valid | Periksa nama event (diklik, diketik, ditekan, dll.) |
| E2019 | Error | "lainnya" hanya valid di akhir rantai "jika"/"kalau" | Pastikan "lainnya" mengikuti "jika" atau "kalau" |
| E2020 | Error | Indentasi tidak konsisten | Periksa indentasi (2 spasi per level) |
| E2021 | Error | Sumber data ulangi tidak valid | Gunakan: ulangi <nama> dari <sumber>: / ulangi <N> kali: / ulangi <nama> dari <A> sampai <B>: |
| E2022 | Error | Target "tampilkan" tidak valid | Periksa target tampilkan |
| E2023 | Error | Token tidak terduga di akhir file | Ini menandakan bug Lexer; laporkan ke tim |
| E2024 | Error | "ambil" tanpa konteks yang jelas | Gunakan: ambil <jenis> dari <sumber> -> simpan ke <nama> atau ambil dari <url>: |
| E2025 | Error | Daftar props "gunakan" tidak valid | Gunakan: gunakan <Komponen> dengan <prop>: <nilai> |
| E2026 | Error | Ekspresi kosong tidak valid | Tambahkan ekspresi yang valid |
| E2027 | Error | Properti perbarui tidak dikenali | Gunakan properti yang didukung: teks, html, kelas, src, href, dll. |
| E2028 | Error | Body komponen/fungsi kosong | Tambahkan setidaknya satu statement di dalam body |
| W2001 | Warning | DocString tidak menempel ke node manapun | - |
| W2002 | Warning | Blok kosong terdeteksi | - |
| W2003 | Warning | Rantai "jika" tanpa cabang "lainnya" | - |
| W2004 | Warning | Jumlah argumen mungkin tidak sesuai | - |

---

## Resolver (E3xxx / W3xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E3001 | Error | Identifier "{name}" tidak dideklarasikan | Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu |
| E3002 | Error | Simbol "{name}" sudah dideklarasikan dalam scope yang sama | Gunakan nama yang berbeda atau hapus deklarasi duplikat |
| E3003 | Error | Variabel tetap "{name}" tidak dapat diubah setelah inisialisasi | Gunakan "ubah" jika variabel perlu diubah, bukan "tetap" |
| E3004 | Error | Komponen "{name}" digunakan sebelum dideklarasi | Pindahkan deklarasi komponen sebelum penggunaannya |
| E3005 | Error | "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen" | Tambahkan target pada "ketika" atau letakkan di dalam blok "buat"/"komponen" |
| W3001 | Warning | Variabel "{name}" dideklarasikan tapi tidak pernah digunakan | - |
| W3002 | Warning | Variabel "{name}" shadowing variabel di scope luar | - |
| W3003 | Warning | Watcher target bukan data reaktif | - |

---

## Analyzer (E4xxx / W4xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E4001 | Error | Lifecycle hook hanya valid di dalam komponen | Pindahkan lifecycle hook ke dalam definisi komponen |
| E4002 | Error | Ekspresi turunan tidak boleh mengandung aksi side-effect | Hapus aksi simpan/tambahkan/kurangi dari ekspresi turunan |
| E4003 | Error | Tipe data tidak kompatibel | Pastikan tipe data operan kompatibel |
| E4004 | Error | Data turunan "{name}" bersifat read-only dan tidak boleh diubah | Gunakan data (var) biasa jika perlu mengubah nilainya |
| E4005 | Error | Parameter duplikat dalam komponen | Hapus salah satu deklarasi parameter |
| E4006 | Error | Parameter tanpa default tidak boleh setelah parameter dengan default | Pindahkan parameter dengan default ke akhir daftar |
| E4007 | Error | Mode tampilkan tidak valid | Mode yang valid: tambahkan, ganti, awalan, sebelum, sesudah |
| E4008 | Error | Properti perbarui tidak didukung | Gunakan properti yang didukung oleh perbarui |
| E4009 | Error | Event name tidak dikenali | Gunakan nama event yang valid: diklik, diketik, ditekan, dll. |
| E4010 | Error | Penggunaan "gunakan" untuk non-komponen | Pastikan nama yang direferensikan adalah komponen (PascalCase) |
| E4011 | Error | "berhenti" tidak valid di luar loop atau event handler | "berhenti" hanya valid di dalam loop atau event handler |
| E4012 | Error | "lewati" tidak valid di luar loop | Gunakan "lewati" hanya di dalam "ulangi" atau "selama" |
| E4013 | Error | "kembalikan" tidak valid di luar fungsi atau komponen | Gunakan "kembalikan" hanya di dalam fungsi atau komponen |
| E4101 | Error | Target tidak dapat ditulis | Gunakan target yang writable atau ubah deklarasi menjadi data/ubah sesuai kebutuhan. |
| E4201 | Error | Dependency cycle pada data turunan | Ubah salah satu ekspresi turunan agar tidak saling bergantung secara melingkar. |
| W4001 | Warning | (type hint mismatch) | - |
| W4002 | Warning | (lifecycle in loop/handler) | - |
| W4003 | Warning | (tetap tanpa init) | - |
| W4004 | Warning | - | - |
| W4101 | Warning | Simbol "{name}" dideklarasikan tetapi tidak pernah digunakan | Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut. |
| W4102 | Warning | Simbol "{name}" ditulis tetapi tidak pernah dibaca | Pastikan nilai yang ditulis benar-benar dibaca, atau hapus penulisan yang tidak perlu. |
| W4103 | Warning | Data reaktif dimutasi tetapi tidak pernah dibaca | Jika state reaktif tidak pernah dibaca, pertimbangkan ubah biasa atau hapus mutasinya. |
| W4104 | Warning | Watcher target bukan data reaktif | Gunakan data/turunan reaktif sebagai target watcher. |

Catatan: W4001-W4004 tidak memiliki pesan di `ERROR_MESSAGES` — ini adalah tipe hint internal.

Note: W4001-W4004 have no message in `ERROR_MESSAGES` — these are internal type hints.

---

## Compiler (E5xxx / W5xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E5001 | Error | Node AST bertipe "{type}" tidak didukung oleh compiler | Periksa apakah node type sudah didukung oleh compiler |
| E5002 | Error | Gagal menurunkan ekspresi ke JavaScript | Sederhanakan ekspresi atau gunakan "langsung:" untuk JS interop |
| E5003 | Error | Selector tidak dapat dikompilasi | Periksa format selector CSS |
| W5001 | Warning | Kode yang dihasilkan mungkin tidak berjalan sesuai harapan | - |
| W5002 | Warning | Fitur eksperimental digunakan | - |

---

## Runtime (E6xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E6001 | Error | "berhenti" tidak valid di luar loop atau handler | "berhenti" hanya valid di dalam loop atau event handler |
| E6002 | Error | "lewati" tidak valid di luar loop | Gunakan "lewati" hanya di dalam "ulangi" atau "selama" |
| E6003 | Error | "kembalikan" tidak valid di luar fungsi atau komponen | Gunakan "kembalikan" hanya di dalam fungsi atau komponen |
| E6004 | Error | Pipeline gagal | Lihat detail error pada tahap yang gagal |

---

## System (E0xxx / W0xxx)

| Kode | Tingkat | Pesan / Message | Saran / Suggestion |
|------|---------|-----------------|-------------------|
| E0000 | Error | System error | Periksa stack trace atau laporkan sebagai bug |
| W0000 | Warning | Peringatan sistem | Periksa detail peringatan untuk informasi lebih lanjut |

`W0000` juga digunakan saat nama adapter tidak dikenali dalam konfigurasi.

`W0000` is also used when an unknown adapter name is specified in configuration.

---

← [CLI](cli.md) · [Event Aliases](event-aliases.md) →