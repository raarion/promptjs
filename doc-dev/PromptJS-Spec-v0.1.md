# PromptJS — Spesifikasi Teknis v0.1 (Working Draft)

> Status: draft kerja, hasil audit langsung terhadap source code PromptJS (clone `main`, Juni 2026) + diskusi arsitektur. Tujuan dokumen ini adalah jadi acuan kerja sebelum coding dimulai, bukan dokumen final yang tidak boleh berubah.

---

## 0. Ringkasan Eksekutif

PromptJS dibangun **di atas** pipeline yang sudah matang, bukan dari nol. Pipeline sudah punya 5 tahap yang matang dan teruji (Lexer → Parser → Resolver → Analyzer → Compiler) plus runtime reactivity proxy-based. Bagian terbesar dari pipeline itu — **Resolver, Analyzer, Compiler, dan Runtime** — bekerja di level AST dan sepenuhnya **syntax-agnostic**, sehingga bisa dipakai ulang hampir tanpa modifikasi.

Yang benar-benar harus ditulis ulang adalah **Lexer dan Parser** (karena sintaks permukaan PromptJS — block-style nested, atribut sebagai baris `key = value` — berbeda total dari sintaks arrow-style sebelumnya), ditambah beberapa **fitur yang sama sekali belum ada sebelumnya**: prerendering statis, binding data eksternal, dev server, dan sistem modul multi-file.

Model rendering yang disepakati: **Hybrid (ala Astro)** — prerender statis untuk SEO/first-paint, lalu hydrate jadi reactive di browser.

---

## 1. Prinsip Desain yang Mengikat

1. **Zero dependency di production.** Output ke browser (`dist/*.html`, `dist/*.js`, `dist/*.css`) tidak boleh memuat library/framework eksternal apa pun. Vanilla JS murni hasil compile.
2. **Build tool boleh punya dependency.** `pjs` (CLI) berjalan di mesin developer, boleh pakai Node/Rust/Go + library (misalnya jsdom untuk prerender). Yang diharamkan zero-dependency hanya **output**, bukan **tooling**.
3. **Readability setinggi prompt AI.** Sintaks permukaan harus block-style nested seperti contoh awal (`Buat X:` / `key = value` / string literal sebagai children), bukan arrow-style.
4. **Reactivity eksplisit, bukan auto-tracking.** Mengikuti model reaktivitas PromptJS: `data` dideklarasikan reaktif, watcher (`saat ... berubah`) ditulis manual. Ini sudah diputuskan jauh lebih achievable daripada reactivity otomatis ala Svelte.
5. **Tidak ada `eval()` / `new Function()`.** Diwarisi langsung dari prinsip desain PromptJS — semua tervalidasi statis, dapat diaudit.

---

## 2. Keputusan Arsitektur yang Sudah Disepakati

| # | Keputusan | Status |
|---|---|---|
| 1 | Model: Template engine (build-time) vs Reactive compiler (client) vs **Hybrid** | ✅ **Hybrid** dipilih |
| 2 | Reactivity: auto-tracking vs **eksplisit (proxy + watcher manual)** | ✅ Eksplisit, mewarisi model PromptJS |
| 3 | Interaktivitas: blok JS mentah vs action declaratif vs **keduanya** | ✅ Standard action (fetch, dsb) + escape hatch blok mentah |
| 4 | Engine dasar: tulis dari nol vs **reuse pipeline PromptJS** | ✅ Reuse pipeline sebagai backend |
| 5 | Keyword komponen vs aksi: satu kata kunci vs **dua kata kunci berbeda** | ✅ Dipisah agar grammar tidak ambigu (lihat §8.1) |

---

## 3. Audit Langsung Pipeline PromptJS

PromptJS adalah DSL berbahasa Indonesia yang dikompilasi ke vanilla JS DOM API. Struktur direktori intinya:

```
lexer/      → tokenizer (1 file besar, ~1.461 baris)
parser/     → statement-parser, expression-parser, selector-parser, ast-factory
resolver/   → scope & symbol table, semantic graph
analyzer/   → validasi semantik, deteksi siklus dependency
compiler/   → emitters (per node type) + lowering ekspresi + codegen util
engine/     → API publik (promptjs.js) + CLI (pjs) + bundle standalone
doc-dev/AST-Specification.md → spesifikasi AST resmi (~3000 baris, sangat lengkap)
```

Fakta-fakta kunci yang terverifikasi langsung dari kode (bukan asumsi):

- **`BuatStatement`** (node untuk `buat`) punya slot `properties` (atribut inline) **dan** `body` (children block) di node yang sama — struktur ini sudah cocok dengan visi "atribut + children dalam satu blok" PromptJS.
- **Atribut generik sudah didukung.** Di `compiler/emitters/statements.js`, property apa pun yang bukan `teks`/`html`/`nilai` otomatis jadi `setAttribute(key, value)`. Artinya `style=`, `href=`, `src=`, `target=` **langsung jalan** tanpa ubah compiler sama sekali.
- **Event map jauh lebih lengkap dari yang ditulis di `AST-Specification.md`.** Implementasi nyata di compiler punya ~28 event (termasuk `mouseover`, `mouseout`, `mouseenter`, `mouseleave`, `scroll`, `drag`, `resize`, `contextmenu`, `paste`, dll) — dokumen spec sedikit ketinggalan dari kode. **Source of truth untuk PromptJS harus kode, bukan dokumen spec.**
- **Hoisting global sudah ada.** Resolver mengumpulkan semua `data`/`tetap`/`ubah`/`turunan`/`fungsi`/`komponen` top-level lebih dulu sebelum resolve isi — jadi forward-reference dalam satu file sudah didukung.
- **Tidak ada sistem modul/import.** Tidak ditemukan keyword `impor`/`import` di tokenizer. `pjs build src/` mem-build direktori, tapi tiap file diproses independen — tidak ada cara satu file `.ks` memanggil komponen yang didefinisikan di file lain.
- **Tidak ada dev server.** CLI punya `watch` (rebuild otomatis saat file berubah) tapi tidak ada HTTP server + live-reload browser. `serve` bukan command yang ada.
- **Output compiler murni `document.createElement`/`appendChild`.** Tidak ada mode emit alternatif (misalnya string HTML). Ini penting untuk desain prerenderer (§7.1).

---

## 4. Peta Reuse / Adaptasi / Tulis Ulang (Ringkasan)

| Bagian | Reuse Langsung | Adaptasi/Diubah | Tulis Ulang Total |
|---|:---:|:---:|:---:|
| Lexer | | | ✅ |
| Parser | | | ✅ |
| AST Node Shapes | ✅ (mayoritas) | sebagian kecil | beberapa node baru |
| Resolver | ✅ | ✅ (komponen vs tag, §8.1) | |
| Analyzer | ✅ | ✅ (validasi fragment, §8.2) | |
| Compiler/Emitter | ✅ (mayoritas) | ✅ (data eksternal, §7.2) | |
| Runtime (`__createReactive`, dst) | ✅ | | |
| CLI scaffolding | ✅ (pola command) | | sebagian command baru |
| Prerenderer (SSR statis) | | | ✅ |
| Dev server (`pjs serve`) | | | ✅ |
| Sistem modul/import | | | ✅ |
| Hydration sungguhan | | | ✅ (v2) |

Detail tiap baris dijelaskan di bagian berikut.

---

## 5. Detail per Tahap Pipeline

### 5.1 Lexer — **Tulis Ulang Total**

Alasan: tokenisasi sebelumnya dirancang untuk gaya arrow (`buat h1 -> teks: nama`) dan event inline (`ketika diklik -> aksi`). PromptJS butuh tokenizer yang mengenali:
- Baris `Kata = ekspresi` → kandidat atribut/property
- Baris string literal murni → kandidat children teks
- Baris `Buat identifier[.kelas][#id]:` → pembuka block baru
- Indentasi sebagai pembentuk hierarki (sama prinsipnya dengan pipeline PromptJS, logikanya bisa dijadikan referensi tapi implementasinya beda token)

**Yang bisa dipinjam secara konseptual (bukan kode):** penanganan `TK_INDENT`/`TK_DEDENT` terbukti matang (lolos uji performa 5MB). Pola desain ini layak dicontoh, tapi kode lexer-nya sendiri tidak bisa dipakai langsung karena grammar token berbeda.

### 5.2 Parser — **Tulis Ulang Total, dengan Target AST yang Sama**

Ini adalah bagian paling penting dari keseluruhan strategi: **parser PromptJS harus menghasilkan node AST yang identik bentuknya dengan AST internal**, supaya Resolver/Analyzer/Compiler bisa dipakai tanpa diubah.

Aturan disambiguasi yang harus diimplementasikan parser baru (per baris dalam sebuah block):

| Bentuk baris | Hasil di AST |
|---|---|
| `nama = ekspresi` | masuk ke `properties: PropertyNode[]` milik `BuatStatement` induk |
| `"string literal"` | property `teks` sintetis, **atau** child `TextNode` (lihat catatan di bawah) |
| `Buat tag[.kelas][#id]:` lalu indent | child baru: `BuatStatement` dengan `body: BlockStatement` |
| `on_nama_event = ekspresi` | disintesis jadi `KetikaStatement(event, action)`, dimasukkan ke `body`, **bukan** `properties` |
| `Jika ekspresi:` / `Lainnya:` | `JikaStatement` (consequent/alternate) |
| `Ulangi untuk x in y:` | `UlangiStatement(kind: "dari", iteratorName: x, source: y)` |

**Catatan penting — multi-children teks:** Contoh awal PromptJS punya kasus campuran teks + elemen di anak yang sama:
```
Buat paragraf.deskripsi:
    "Ini adalah framework "
    Buat span.nama:
        "SEMAQ"
    " versi 1.0"
```
Pipeline sebelumnya tidak punya node teks campuran semacam ini secara native — `properties.teks` sebelumnya cuma menerima satu nilai skalar per elemen, bukan list children campuran teks+elemen. Ini kemungkinan **butuh node AST baru** (`TextNode` sebagai child biasa, sejajar dengan `BuatStatement` lain di `body`), dan compiler perlu emitter baru untuk node ini (`appendChild(document.createTextNode(...))`). **Ini satu-satunya titik di mana AST perlu node baru, bukan cuma reuse.**

### 5.3 Resolver — **Reuse Penuh + 1 Adaptasi**

Resolver PromptJS (scope, symbol table, semantic graph) sepenuhnya bekerja di level AST — tidak peduli sintaks asal. Bisa dipakai langsung untuk: validasi referensi variabel, deteksi shadowing, hoisting top-level.

**Adaptasi yang diperlukan:** lihat §8.1 (disambiguasi `Buat tag` vs `Buat NamaKomponen`).

### 5.4 Analyzer — **Reuse Penuh + 1 Adaptasi**

Validasi semantik (lifecycle di luar komponen, `kembalikan` di luar fungsi, dependency cycle pada `turunan`) semuanya reuse. Tambahan yang diperlukan: validasi auto-fragment untuk multi-root (§8.2).

### 5.5 Compiler/Emitter — **Reuse Mayoritas**

Hampir semua visitor (`visitBuatStatement`, `visitJikaStatement`, `visitUlangiStatement`, `visitKetikaStatement`, `visitKomponenDeclaration`, dll) bisa dipakai langsung karena bekerja dari AST, bukan dari teks sumber. Yang perlu ditambah:
- Emitter untuk `TextNode` baru (lihat §5.2).
- Emitter untuk binding data eksternal (`$nama`) — lihat §7.2.
- Mode emit ganda: emit untuk runtime browser (sudah ada) **dan** kemampuan dijalankan di Node+jsdom untuk prerender (lihat §7.1) — secara teknis ini tidak butuh emitter baru, karena kode yang dihasilkan compiler (`document.createElement`, dst) memang bisa dijalankan di jsdom tanpa modifikasi.

### 5.6 Runtime (`__createReactive`, `__createComputed`, `__watch`, `__mount`) — **Reuse Penuh**

Ini bagian paling berharga untuk dipertahankan apa adanya: reactivity proxy-based yang sudah teruji 313+ assertion. Tidak ada alasan menulis ulang.

---

## 6. Tabel Pemetaan Sintaks PromptJS → Konsep Pipeline

| Sintaks PromptJS (contoh awal) | Konsep Pipeline yang Dipakai | Catatan |
|---|---|---|
| `Buat card:` | `BuatStatement` | tag generik |
| `style = "padding:16px..."` | `PropertyNode` (fallback `setAttribute`) | sudah jalan tanpa ubah compiler |
| `Buat judul.utama#judul:` | `Selector{tag, classes, id}` | identik konsepnya |
| `"Halo, Beb!"` | properti `teks` / `TextNode` baru | lihat §5.2 |
| `Buat tombol.cta:` + `href=` / `target=` | `PropertyNode` → `setAttribute` | langsung jalan |
| `on_klik = handleDaftar()` | `KetikaStatement(event:"diklik", action:...)` | translasi nama event |
| `on_mouseover = ...` | `KetikaStatement(event:"diarahkan")` di compiler (mapped ke `mouseover`) | penamaan event internal agak membingungkan, perlu tabel alias di parser baru |
| `Buat gambar.produk: src = $produk.gambarUrl` | `PropertyNode` + reference data eksternal | lihat §7.2, **bukan** fitur native sebelumnya |
| `Ulangi untuk item in $keranjang:` | `UlangiStatement(kind:"dari")` | `$keranjang` juga butuh §7.2 |
| `Jika $item.stok > 0: ... Lainnya:` | `JikaStatement` | operator `>` perlu ditranslasi ke `"lebih dari"` di lexer/parser baru — **tidak perlu ubah Analyzer/Compiler** |
| `Buat card_produk:` (komponen kustom) | `GunakanStatement` ATAU `BuatStatement` tergantung resolusi | lihat §8.1 — ini keputusan desain, bukan sekadar mapping |

---

## 7. Fitur yang Benar-Benar Harus Dibuat dari Nol

Pipeline sebelumnya tidak punya empat hal ini sama sekali — bukan soal adaptasi, tapi pembuatan baru.

### 7.1 Prerenderer Statis (build-time SSR)

**Cara kerja yang diusulkan:**
1. `pjs build` compile file `.pjs` → JS lewat pipeline (lexer baru → parser baru → resolver/analyzer/compiler, tidak berubah).
2. JS hasil compile (isinya `document.createElement`/`appendChild` murni) dijalankan di **Node + jsdom** (dependency build-tool, bukan production).
3. DOM hasil eksekusi di-serialize (`.outerHTML`) jadi `index.html` statis.
4. Data eksternal yang dipakai saat render (lihat §7.2) di-embed sebagai `<script>window.__DATA__ = {...}</script>` di halaman yang sama, supaya hydration di browser tidak perlu fetch ulang.
5. File JS yang sama dikirim juga sebagai `<script src="app.js">` untuk langkah hydration di browser.

Ini sepenuhnya baru — Pipeline sebelumnya tidak punya konsep eksekusi di luar browser sungguhan sama sekali.

### 7.2 Binding Data Eksternal (`$nama`)

Pipeline sebelumnya tidak punya konsep ini — semua state didefinisikan inline di file (`data x = ...`). PromptJS butuh:
- Sintaks baru `$identifier[.path]` di parser, dibedakan dari `Identifier` biasa lewat flag `isExternal: true`.
- Sumber data: file `.json`/`.yaml` bersebelahan dengan `.pjs` (perlu diputuskan konvensi penamaan/lokasi — belum diputuskan, lihat §9).
- Saat **prerender** (§7.1): nilai `$produk` dibaca langsung dari file oleh build tool.
- Saat **hydrate** di browser: nilai dibaca dari `window.__DATA__` yang sudah di-embed, bukan fetch ulang.
- Keputusan desain yang masih terbuka: apakah `$nama` diperlakukan sebagai `data` reaktif (bisa berubah di client) atau `tetap` (read-only props dari luar)? **Rekomendasi: default `tetap` (read-only), kecuali dideklarasikan ulang secara eksplisit jadi `data` lokal** — supaya tidak ambigu kapan sesuatu reaktif.

### 7.3 Dev Server (`pjs serve`)

Pipeline sebelumnya punya `watch` (rebuild file saat berubah) tapi bukan dev server. PromptJS butuh: HTTP static server + file watcher + mekanisme reload browser (WebSocket sederhana atau polling). Ini murni infrastruktur tooling, tidak menyentuh pipeline compiler sama sekali.

### 7.4 Sistem Modul / Import Multi-File

Pipeline sebelumnya memproses tiap file independen, tanpa cara memanggil komponen yang didefinisikan di file lain. Proyek nyata pasti butuh memecah file (komponen di file terpisah). Perlu didesain dari nol: sintaks `impor`, resolusi path, dan bagaimana symbol table lintas-file digabung sebelum masuk ke Resolver (kemungkinan solusinya: gabungkan semua file jadi satu AST besar sebelum diserahkan ke Resolver, supaya Resolver tidak perlu diubah — ini lebih sederhana daripada mengubah Resolver agar sadar modul).

### 7.5 Hydration Sungguhan (ditunda ke v2)

v1 memakai "fake hydration": browser menjalankan ulang compiled JS dan membangun ulang seluruh DOM dari nol (mengabaikan hasil prerender setelah first paint). Ini sederhana tapi ada kedipan singkat dan kehilangan sebagian manfaat SSR. Hydration sungguhan (mencocokkan node hasil prerender dengan yang dibuat compiler lewat path/index, lalu cuma menempelkan event listener) adalah pekerjaan compiler baru yang signifikan — **secara sadar didorong ke v2**, sama seperti reactivity otomatis yang sudah diputuskan ditunda sebelumnya.

---

## 8. Perubahan di Level Engine (Bukan Cuma Frontend Parser)

### 8.1 Disambiguasi `Buat tag_html` vs `Buat NamaKomponenKustom`

Ini keputusan desain paling besar yang menyentuh Resolver. Di pipeline sebelumnya, `buat` (elemen DOM) dan `gunakan` (panggil komponen) adalah dua kata kunci terpisah secara gramatikal — parser sudah tahu bedanya sebelum sampai ke Resolver. PromptJS ingin menyatukan keduanya di bawah kata kerja `Buat` saja (`Buat card_produk:` terlihat sama dengan `Buat div:`).

**Konsekuensi:** disambiguasi ini *tidak bisa* dilakukan di parser (parser tidak tahu identifier mana yang komponen tanpa lihat tabel simbol). Harus dilakukan di **fase Resolver**, dengan logika: jika `node.selector.tag` cocok dengan nama yang sudah terdaftar sebagai `komponen` di symbol table (hasil `gatherGlobals`), ubah interpretasi node dari `BuatStatement` jadi setara `GunakanStatement`. Ini adalah **perubahan nyata di Resolver**, bukan cuma di parser baru.

**Implikasi tambahan:** karena disambiguasi butuh symbol table komponen yang sudah lengkap, definisi komponen (`Definisikan` / kata kunci baru — lihat keputusan §2 poin 5) wajib dikumpulkan lebih dulu sebelum resolve pemakaian. `gatherGlobals` sudah punya pola hoisting yang pas untuk ini — tinggal dipastikan urutan eksekusinya benar untuk kasus lintas-file (§7.4).

### 8.2 Auto-Fragment untuk Multi-Root

`KomponenDeclaration` mengharuskan satu root per komponen kecuali dibungkus `fragmen` secara eksplisit (divalidasi Analyzer). Struktur `Buat halaman:` di PromptJS sering punya beberapa anak top-level sejajar (`Buat card: ...` lalu `Buat pemisah: ...`). Parser baru harus otomatis membungkus children top-level halaman dengan node `fragmen` — supaya lolos validasi Analyzer tanpa perlu mengubah Analyzer itu sendiri.

### 8.3 Event Enum

Sudah cukup lengkap (28 event, lihat §3) — **tidak perlu ekstensi**, hanya perlu tabel alias nama event versi PromptJS (`on_klik`, `on_mouseover`, dst) ke nama event internal (`diklik`, `diarahkan`, dst) di parser baru.

---

## 9. Risiko & Pertanyaan Terbuka (Belum Diputuskan)

| # | Pertanyaan | Kenapa Penting |
|---|---|---|
| 1 | Format & lokasi file data eksternal (`$produk` dari mana persis)? `.json` di folder `data/`? Front-matter di kepala file `.pjs`? | Menentukan desain loader §7.2 |
| 2 | `$nama` default reaktif atau read-only? | Menentukan apakah perubahan data eksternal di client butuh re-render |
| 3 | Sintaks `impor` seperti apa — per file, per folder, atau implisit (semua file dalam direktori otomatis tergabung)? | Menentukan kompleksitas §7.4 |
| 4 | Bagaimana menangani `style="..."` sebagai string vs sebagai object key-value (`style = { padding: "16px" }`)? Compiler cuma `setAttribute("style", string)` — tidak ada object-to-CSS conversion. | Kalau mau dukung object style, perlu emitter baru |
| 5 | License MIT mengharuskan retensi notice — perlu dipastikan atribusi dijaga jika source langsung di-fork. | Administratif, bukan teknis, tapi wajib dicatat. Tapi PromptJS adalah proyek asli milikku sendiri |

---

## 10. Roadmap Bertahap

**v0.1 (Proof of Concept)**
- Lexer + parser baru untuk subset kecil: `Buat`, properti, teks tunggal (belum mixed text+element), `Jika/Lainnya`, `Ulangi`.
- Pipeline disambung langsung ke Resolver/Analyzer/Compiler tanpa modifikasi apa pun.
- Output: jalankan di browser saja (belum ada prerender). Tujuannya cuma membuktikan pipeline benar-benar nyambung.

**v0.5**
- Tambah: `TextNode` campuran teks+elemen, auto-fragment (§8.2), disambiguasi komponen (§8.1), event alias lengkap.
- Tambah CLI `pjs serve` (dev server tanpa prerender, langsung render di browser — paling sederhana dulu).

**v1.0**
- Prerenderer jsdom (§7.1), binding data eksternal (§7.2), fake hydration.
- Sistem modul dasar (§7.4) — boleh versi paling sederhana (semua file dalam satu folder otomatis tergabung, tanpa keyword `impor` di v1.0).

**v2.0**
- Hydration sungguhan (§7.5).
- Sistem modul dengan `impor` eksplisit dan resolusi path.
- Possibly: dukungan style sebagai object (poin §9.4).

---

## 11. Lampiran — Referensi File Sumber Pipeline yang Diaudit

- `doc-dev/AST-Specification.md` — spesifikasi AST resmi, jadi acuan utama bentuk node.
- `compiler/emitters/statements.js` — visitor per node type, termasuk event map lengkap dan fallback `setAttribute`.
- `resolver/promptjs-resolver.js` — `gatherGlobals` (hoisting), scope & symbol table.
- `engine/promptjs-cli.js` — pola command CLI (`compile`, `check`, `inspect`, `graph`, `build`, `watch`, `format`, `init`) — dijadikan referensi struktur, bukan disalin langsung karena command baru (`serve`) tidak ada presedennya di sini.

Semua temuan di atas berasal dari pembacaan langsung source code, bukan dari README saja — README cukup representatif tapi tidak selengkap audit langsung (contoh: event map README/spec lebih pendek dari implementasi nyata).
