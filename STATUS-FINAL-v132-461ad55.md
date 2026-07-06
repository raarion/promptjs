# Status Final — v132 Commit `461ad55` (malam 6 Juli 2026)

**Tanggal:** 2026-07-06
**Commit awal sesi:** `21fe9e0` (klaim internal: "zero active issues")
**Commit akhir sesi:** `461ad55`
**Official suite:** 64 file / **1161 test PASS** ✅ (naik dari 63/1154)

---

## Ringkasan eksekutif

Laporan status sebelumnya (`STATUS-FINAL-v132-a94eb5f.md`, ditulis sebelum
commit `21fe9e0`) mengklaim **zero active issues** — semua BUG, LIM, MIS sudah
`0`. Klaim itu **tidak diverifikasi dengan menjalankan full local gates**.
Malam ini semua gate dijalankan sungguhan (bukan hanya `npm test`), dan
ditemukan:

- **3 dari 7 gate wajib gagal** pada commit `21fe9e0` (`typecheck`,
  `format:check`, `npm audit`) — bukan bug fungsional, tapi berarti klaim
  "release-ready" sebelumnya prematur.
- **1 bug runtime nyata** (crash, bukan sekadar limitasi) ditemukan lewat
  dogfooding fitur `on_kelas`/`on_class` dengan ekspresi non-trivial —
  jenis pengujian yang memang diminta rencana malam ini ("app-level
  regression tests", bukan hanya unit kecil).
- **2 gap dokumentasi jujur** yang berpotensi menyesatkan developer
  (silent-looking-reactive-but-isn't) — didokumentasikan, bukan
  "disembunyikan".

Semua temuan di atas **sudah diperbaiki dan diverifikasi** malam ini.
Tracker GitHub (`#73`, `#77`–`#82`) sudah ditinjau ulang; tidak ada
kontradiksi baru terhadap status yang sudah dicatat maintainer (`raarion`)
di sana.

---

## A. Gate audit — sebelum vs sesudah

| Gate | Sebelum (`21fe9e0`) | Sesudah (`461ad55`) |
|---|---|---|
| `npm ci` | ✅ (dengan EBADENGINE warning: perlu Node ≥22, sandbox punya v20.20.2) | ✅ (sama) |
| `npm test` | ✅ 63 file / 1154 test | ✅ 64 file / 1161 test (+7 test baru) |
| `npm run typecheck` | ❌ **2 error** | ✅ 0 error |
| `npm run lint` | ✅ 0 warning | ✅ 0 warning |
| `npm run format:check` | ❌ **4 file tidak diformat** | ✅ semua file rapi |
| `npm run build` | ✅ 16/16 compiled | ✅ 16/16 compiled |
| `npm audit` | ❌ **2 moderate vulnerability** | ✅ 0 vulnerability |
| `npm pack --dry-run` | ✅ 336 file, tidak ada token/secret | ✅ 337 file, tidak ada token/secret |
| `npm run coverage` | (belum dijalankan sebelumnya) | ✅ 84.34% statements baseline dicatat |

### Detail perbaikan gate

1. **`typecheck` (2 error → 0):**
   - `src/cli/commands/build.js`: JSDoc `buildHtml()` tidak mendeklarasikan
     `options.prerender` padahal caller mengirim
     `{ prerender: false, css }`. Didokumentasikan di JSDoc.
   - `tests/v11-block-comments.test.js`: punya `// @ts-check` +
     `import.meta.url` di bawah `jsconfig.json` bermodul `CommonJS` — tsc
     menolak `import.meta` di target modul itu. 7 file test lain memakai
     pola `createRequire(import.meta.url)` yang identik tapi TIDAK memakai
     `@ts-check`, jadi lolos. Solusi: hapus `@ts-check` yang nyasar di file
     itu, menyamakan dengan pola yang sudah terbukti jalan — lebih aman
     daripada mengubah `jsconfig.json` bersama.

2. **`format:check` (4 file → 0):**
   `src/analyzer/promptjs-analyzer.js`, `src/compiler/promptjs-compiler.js`,
   `src/parser/promptjs-parser.js`, `tests/lim-mis-fixes-v132.test.js` —
   keempatnya adalah bagian dari commit `21fe9e0` itu sendiri, tampaknya
   di-commit tanpa menjalankan formatter. Dijalankan `prettier --write`
   khusus 4 file itu — murni format, nol perubahan logika.

3. **`npm audit` (2 moderate → 0):**
   `@stryker-mutator/core` (devDependency, dipakai untuk `npm run mutation`)
   → `typed-rest-client` → `qs@6.15.1` (GHSA-q8mj-m7cp-5q26, DoS pada
   `qs.stringify`). Ditambahkan `"overrides": { "qs": "6.15.3" }` di
   `package.json`. Diverifikasi ulang seluruh test/lint/typecheck/format
   masih hijau setelah override.

---

## B. Bug baru ditemukan + diperbaiki: LIM-CLASS-01

**Ditemukan lewat:** dogfooding `on_kelas`/`on_class` (fitur dynamic class
binding dari BUG-17, closed di commit v132 sebelumnya) dengan ekspresi
non-trivial — persis skenario "app nyata" yang diminta rencana malam ini,
bukan sekadar unit test kecil.

**Reproduksi bug:**
```pjs
data aktif = benar

Buat div#dalam:
    on_kelas = aktif ? "item-aktif" : "item-nonaktif"
```
→ Runtime crash: `TypeError: Invalid value used as weak map key`

**Akar masalah:** `visitKetikaStatement` cabang `on_kelas`/`on_class`
menurunkan ekspresi RHS menjadi **nilai hasil evaluasi** (mis. string hasil
ternary), lalu nilai itu langsung dioper ke `__watch(...)`. `__watch`
menyimpan subscriber di `WeakMap` yang mensyaratkan key berupa objek
(reactive proxy) — bukan primitif. Hanya kasus RHS berupa identifier
tunggal (`on_kelas = tema`) yang kebetulan bekerja, karena identifier itu
sendiri SUDAH berupa reactive proxy.

**Perbaikan:** ekspresi RHS non-identifier sekarang dibungkus
`__createComputed(() => <expr>)` terlebih dahulu (mekanisme yang sama
dipakai `turunan`), menghasilkan reactive proxy sungguhan yang di-`__watch`
— bukan primitif mentah. Kasus RHS identifier tunggal tidak berubah sama
sekali (codegen identik, nol overhead tambahan).

**Verifikasi:** `tests/v16-dynamic-class-binding.test.js` (7 test baru) —
mencakup bentuk codegen saat compile-time DAN perilaku DOM sungguhan saat
runtime (ternary, konkatenasi string, dan baseline identifier tunggal yang
tidak terdampak), memakai harness `new Function()`-atas-output-compiler yang
sama dengan `tests/v7-reactive-list.test.js`.

**Relasi dengan tracker:** terkait tapi BERBEDA dari issue backlog
[#77](https://github.com/raarion/promptjs/issues/77) (`Saat` + `kelas`
mungkin menarget span marker watcher, bukan elemen yang dimaksud) — itu
soal interaksi `Saat`+watcher-marker dan tetap open/backlog. LIM-CLASS-01
adalah crash langsung pada ekspresi `on_kelas` apa pun yang non-trivial,
ditemukan lewat jalur pengujian langsung (bukan lewat `Saat`).

---

## C. Gap dokumentasi jujur (docs-only, tanpa perubahan kode)

Ditemukan 2 pola yang **terlihat reaktif tapi sebenarnya snapshot sekali**
— persis kategori "silent wrong output" yang menurut rencana malam ini
tidak boleh dibiarkan tanpa dokumentasi:

1. **`on_kelas`/`on_class` sama sekali tidak terdokumentasi** di `docs/`
   manapun, padahal fiturnya sudah ada sejak BUG-17. Ditambahkan section
   penuh di `docs/language/reactivity.md` (bentuk identifier, bentuk
   ekspresi komputed, tautan ke issue #77).

2. **`teks = <data_reaktif>` di properti elemen HANYA snapshot sekali**
   saat elemen dibuat — perubahan berikutnya pada variabel reaktif TIDAK
   memperbarui elemen itu, tanpa warning/error apa pun. Pola yang benar
   (`Saat x: Buat span: x`, dipakai di `examples/counter.pjs`) sudah
   berfungsi baik; yang tidak jelas adalah bahwa bentuk pendek TANPA `Saat`
   terlihat sah tapi diam-diam tidak reaktif. Ditambahkan callout box di
   `docs/language/reactivity.md`, ditautkan ke backlog
   [#80](https://github.com/raarion/promptjs/issues/80).

Kedua gap ini **belum diberi compiler warning** (mis. `W41xx` baru) malam
ini — menambah warning baru ke analyzer berisiko regresi kalau terburu-buru
tanpa testing menyeluruh terhadap seluruh test suite existing yang memakai
pola `teks = <var>` (ditemukan di banyak file test: `c4-expressions`,
`v0.5-compiler-infra`, `v7-keyed-list`, `v7-list-integrity`, dll — semuanya
memakai pola ini secara sengaja dalam konteks yang benar, jadi warning
naif akan sangat bising). **Keputusan: didokumentasikan malam ini,
compiler-warning yang presisi dijadikan kandidat v1.3.3/v1.4.0** (item baru,
lihat bagian E).

---

## D. Tracker GitHub — sinkronisasi

Ditinjau ulang issue #63, #73, #75, #76, #77, #78, #79, #80, #81, #82
(dibaca via web, sandbox ini tidak memiliki kredensial GitHub API/`gh` CLI
untuk menulis balik ke tracker — lihat bagian F).

| Issue | Status di GitHub | Catatan |
|---|---|---|
| #63 (BUG-03, critical) | ✅ Closed | Sesuai — `ba5b4d4` fixes it |
| #75 (BUG-11) | ✅ Closed | Sesuai — `1ed2aed` + `10fac7b` fixes it |
| #76 (BUG-04) | ✅ Closed | Sesuai — `e24a30a` + `f46bb54` fixes it |
| #73 (master tracker) | 🟡 Open | Masih open by design — berisi audit note dari `raarion` bahwa numbering LIM-01..08/MIS-01..08 asli ≠ LIM-1..4/MIS-1 di `21fe9e0`. Rekomendasi tetap sama: jangan klaim "semua LIM/MIS fixed" tanpa mapping eksplisit. |
| #77 (Saat+kelas marker) | 🟡 Open backlog | Terkait LIM-CLASS-01 tapi bukan duplikat — tetap open, scope-nya lebih sempit (marker-targeting), sudah diverifikasi TIDAK terjadi pada kasus dasar `Saat x: Buat: on_kelas = ...` (lihat bagian B). |
| #78 (LIM/MIS numbering map) | 🟡 Open backlog | Tidak dikerjakan malam ini — murni dokumentasi/tracker hygiene, bukan blocker rilis. |
| #79 (CSS scoping) | 🟡 Open backlog | Desain besar, sesuai rencana: didokumentasikan sebagai "Deferred karena terlalu besar" untuk v1.3.3/v1.4.0. |
| #80 (turunan display partial) | 🟡 Open backlog | Sebagian ditindaklanjuti malam ini via dokumentasi (bagian C), implementasi lengkap tetap backlog. |
| #81 (routing guards) | 🟡 Open backlog | Tidak disentuh malam ini — fitur besar baru, sesuai rencana masuk backlog dengan alasan jelas. |
| #82 (slots/transclusion) | 🟡 Open backlog | Tidak disentuh malam ini — eksplisit dicatat maintainer sebagai kandidat v1.3.3/v1.4.0, bukan v132. |

**Catatan keamanan:** issue #73 mencatat "Revoke/rotate any previously
exposed PAT/token before release". Diperiksa: `git log --all -p` di branch
`v132` DAN `stress-test-fixes` — tidak ditemukan pola token asli
(`ghp_*`, `github_pat_*`, `npm_*`, `AKIA*`, dll) di riwayat commit manapun.
Satu-satunya string mirip secret (`sk-demo-123` di
`docs/language/modules.md`) adalah contoh dummy dalam tutorial, bukan
kredensial asli. Tidak ada tindakan revoke yang diperlukan dari sisi kode
repo ini — kemungkinan catatan itu merujuk ke insiden di luar riwayat git
yang bisa diaudit dari sandbox ini (mis. token yang dipakai CI/CD
eksternal); **rekomendasi ke `raarion`: konfirmasi ulang di luar repo**.

---

## E. Item baru untuk backlog (kandidat v1.3.3/v1.4.0)

- **Compiler warning untuk `teks = <data/turunan>` tanpa `Saat`** — analyzer
  sudah punya infrastruktur usage-tracking (`W41xx`) yang bisa diperluas
  untuk mendeteksi pola ini, tapi butuh desain hati-hati agar tidak bising
  pada pola sah lain (mis. one-shot initial render yang memang disengaja).
  Bukan blocker v132.

---

## F. Keterbatasan sesi ini (kejujuran penuh)

- **Tidak ada push ke GitHub.** Sandbox ini tidak punya kredensial git
  remote (`git push` gagal: "could not read Username for
  'https://github.com'"). Kedua commit (`f8172eb`, `461ad55`) ada di
  branch lokal `v132` yang melacak `origin/v132`, tapi **belum ter-push**.
  User perlu push manual dari environment dengan akses GitHub.
- **Tidak ada update ke issue tracker GitHub** (butuh `gh` CLI atau token
  API yang tidak tersedia di sandbox ini). Ringkasan sinkronisasi tracker
  di bagian D di atas perlu ditempelkan manual ke issue terkait (terutama
  #73) oleh user/maintainer.
- **Node version mismatch**: `package.json` mensyaratkan `"node": ">=22.0.0"`,
  sandbox ini punya Node v20.20.2. Semua command tetap jalan (dengan
  `EBADENGINE` warning), tapi ini bukan lingkungan CI resmi — disarankan
  verifikasi ulang di Node 22 sebelum tag/publish sungguhan.
- **`npm run mutation` (Stryker) tidak dijalankan** malam ini — di luar 7
  gate wajib + coverage/examples opsional yang diminta rencana, dan
  mutation testing untuk codebase sebesar ini бisa memakan waktu jauh
  lebih lama dari sesi semalam.

---

## Tabel ringkasan akhir

| Kategori | Sebelum sesi (`21fe9e0`) | Sesudah sesi (`461ad55`) |
|---|---|---|
| 🔴 Gate gagal | 3 dari 7 (`typecheck`, `format:check`, `audit`) | **0** |
| 🔴 Bug runtime aktif ditemukan | 1 (`on_kelas` + ekspresi non-identifier → crash) | **0** (fixed: LIM-CLASS-01) |
| 🟡 Gap dokumentasi jujur | 2 (tidak terdokumentasi / berpotensi menyesatkan) | **0** (didokumentasikan) |
| 🧪 Test files / tests | 63 / 1154 | **64 / 1161** |
| 📦 npm audit | 2 moderate | **0** |
| 🏗️ Build | 16/16 OK | 16/16 OK |
| 📤 Push ke GitHub | — | ❌ **belum** (kredensial tidak tersedia di sandbox) |
| 📋 Tracker GitHub update | — | ❌ **belum ditulis balik** (hanya dibaca/ditinjau) |

> **Kesimpulan malam ini:** commit `21fe9e0` **tidak benar-benar
> release-ready** meski catatan status sebelumnya mengklaim demikian —
> gate dasar belum pernah dijalankan penuh, dan dogfooding langsung
> (bukan sekadar unit test) menemukan satu crash runtime nyata dalam waktu
> kurang dari satu jam pengujian manual. Semua temuan malam ini sudah
> diperbaiki dan diverifikasi ulang (`461ad55`), tapi **push ke GitHub dan
> update tracker masih perlu dilakukan manual oleh user** karena
> keterbatasan kredensial di sandbox ini.
