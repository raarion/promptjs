# Issue: P1.1 — Dynamic Component `dipasang` Hook Tidak Terpanggil Setelah SPA Mount

**Label:** `bug`, `architecture`, `lifecycle`, `p1`
**Status:** Open

## Deskripsi Masalah

Saat ini, di PromptJS (v132 Lapis 1-3), komponen yang dirender *secara dinamis* setelah aplikasi SPA di-mount awal (misalnya karena elemen ditambahkan ke dalam sebuah `reactive list` atau melalui blok `Saat` yang kondisinya baru terpenuhi) **tidak pernah memicu hook `dipasang`** mereka.

### Root Cause

Ini adalah gap arsitektural di desain awal PromptJS. Hook lifecycle seperti `__dipasangFns` dan `__dilepasFns` diimplementasikan sebagai array *page-level* (level-halaman). 

Ketika `mount()` SPA berjalan, array page-level ini hanya di-iterasi dan di-execute **sekali** pada titik mount awal. Oleh karena itu, komponen-komponen dinamis yang lahir belakangan tidak punya mekanisme untuk menjalankan hook `dipasang` mereka sendiri; mekanisme page-level sudah berlalu.

## Dampak (Impact)

- **Ketidakkonsistenan Siklus Hidup (Lifecycle Inconsistency)**: Komponen statis dan dinamis seharusnya mematuhi kontrak lifecycle yang sama, tetapi saat ini yang dinamis menjadi "anak tiri" dan tidak bisa diandalkan untuk memanggil `dipasang`.
- **Sulitnya Inisialisasi Lokal**: Setiap komponen dinamis yang memerlukan setup JS manual (seperti inisialisasi plugin UI pihak ketiga, canvas, atau manipulasi DOM khusus) setelah mereka terpasang ke DOM akan gagal, karena tidak ada hook tepercaya untuk melakukannya.
- **Developer Confusion**: Pengguna framework tidak akan tahu bahwa `dipasang` tidak jalan pada list item reaktif / perenderan kondisional.

## Rekomendasi / Alternatif Solusi (TBD)

Karena perbaikan ini membutuhkan refactor arsitektural dari level halaman (page-level lifecycle) menjadi level instansi komponen (component-level lifecycle), risiko perubahannya tinggi untuk semantik eksekusi yang sudah berjalan sekarang. Berikut beberapa rute yang bisa diambil untuk desain ke depan:

1. **Menggunakan `MutationObserver` pada Root Komponen**:
   Mengawasi perubahan DOM untuk mendeteksi kapan elemen benar-benar di-attach ke document body. (Note: saat ini sudah dipakai untuk syntax event `Ketika dipasang`, tetapi *belum* untuk lifecycle block `dipasang:`).
   
2. **Memanggil `dipasang` Langsung di Titik Component Factory**:
   Compiler atau engine runtime memanggil fungsi dipasang secara sinkron sesaat setelah instansi komponen di-render dan digabungkan ke tree (butuh kontrak kuat antara compiler dan engine runtime).
   
3. **Menggeser Semua Lifecycle ke Component Instance**:
   Menyimpan fungsi `dipasang` / `dilepas` bukan lagi di array page-level tunggal, tetapi diregister dan melekat ke *Virtual Node* atau metadata wrapper setiap kali sebuah komponen digenerate, dan trigger pemanggilannya dirangkai bersama mekanisme dom update list/SPA router.

## Next Steps

Perlu keputusan teknis (ADR baru) apakah akan mengambil rute 1, 2, atau 3. Implementasi ini bisa dibawa pada siklus stabilisasi berikutnya (Lapis 2/3 follow-up) dengan test E2E yang memastikan item baru dalam *reactive list* maupun re-render *blok Saat* selalu memanggil hook `dipasang` secara andal.
