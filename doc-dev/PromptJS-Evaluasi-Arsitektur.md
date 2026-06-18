# PromptJS — Evaluasi Arsitektur & Kelayakan

> Berdasarkan pembacaan langsung source code PromptJS (branch `main`) dan spesifikasi PromptJS v0.1.

---

## 1. Verdict: Apakah PromptJS Akan Menjadi DSL Paling Praktis di Dunia?

**Ya, dengan catatan.** Visi PromptJS punya positioning yang secara objektif tidak ditemukan di ekosistem mana pun saat ini — tapi klaim "paling praktis" hanya terpenuhi jika tiga kondisi terpenuhi: (a) transpiler native benar-benar secekat klaim, (b) developer experience (`pjs serve` → lihat hasil) benar-benar zero-friction, dan (c) edge case sintaks tidak menggigit pengguna di tahap produksi. Tiga hal ini bukan given — mereka adalah deliverable yang harus dibuktikan.

Sisanya dari jawaban ini membahas mengapa positioning itu unik, di mana letak kekuatan sesungguhnya, apa risiko yang bisa membunuh proyek, dan rekomendasi arah yang memaksimalkan peluang keberhasilan.

---

## 2. Analisis Positioning: Apa yang Benar-Benar Unik?

### 2.1 Peta Kompetitor dan Celah yang Ditempati PromptJS

| Dimensi | Svelte | Vue SFC | Astro | HTM/Preact | Imba | **PromptJS** |
|---|---|---|---|---|---|---|
| Sintaks mirip prompt AI | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ (ini identitasnya)** |
| Output zero-dependency | ✓ | ✗ | ✓* | ✓ | ✓ | **✓** |
| Prerender statis + hydrate | ✗ | ✗ | ✓ | ✗ | ✗ | **✓** |
| Binary tunggal, zero-install | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** |
| Bahasa Indonesia native | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** |
| Indentation-based, tanpa curly braces | ✗ | ✗ | ✗ | ✗ | ✓ | **✓** |

*Astro menghasilkan zero-JS secara default, tapi framework-nya tetap perlu diinstall.*

Tidak ada produk tunggal di peta ini yang menguasai semua kolom sekaligus. PromptJS menempati intersection yang **secara logis koheren**: sintaks yang bisa ditulis seperti menulis prompt (readability), compile ke vanilla JS (zero-dep), dan distribusi sebagai binary tunggal (zero-install). Ini bukan cosmetic — ini arsitektur.

### 2.2 Mengapa "Readability Setinggi Prompt AI" Bukan Sekadar Marketing

Klaim ini punya substansi teknis nyata. Pertimbangkan:

**Sintaks PromptJS:**
```
Buat tombol.cta:
    "Daftar Sekarang"
    href = "/daftar"
    on_klik = handleDaftar()
```

**JSX setara:**
```jsx
<button className="cta" href="/daftar" onClick={handleDaftar}>
    Daftar Sekarang
</button>
```

**Svelte setara:**
```svelte
<button class="cta" href="/daftar" on:click={handleDaftar}>
    Daftar Sekarang
</button>
```

Dari ketiganya, PromptJS adalah satu-satunya di mana **urutan penulisan mengikuti urutan pikiran**: "Buat tombol" → teksnya apa → attributnya apa → kalau diklik apa yang terjadi. Di JSX dan Svelte, nama tag, atribut, dan children bercampur di satu blok — Anda harus memparse visualmente mana atribut, mana children, mana event. Di PromptJS, urutan baris = urutan deklarasi, dan jenis setiap baris bisa didisambiguasi tanpa melihat konteks sekitarnya (string literal = children, `key = value` = atribut, `on_x` = event, `Buat ...` = child element).

Ini bukan sekadar "lebih enak dibaca" — ini punya implikasi tooling: formatter, linter, dan AI code generation semuanya lebih mudah diimplementasi karena grammar-nya unambiguous per-baris.

### 2.3 Mengapa Binary Tunggal Itu Game-Changer

Download satu file, jalankan. Tidak perlu `npm install`, tidak perlu `node -v` check, tidak perlu `package.json`. Ini bukan convenience — ini adalah **perbedaan kategori pengguna**. Orang yang tidak bisa pakai Svelte karena tidak punya Node.js terinstall, atau yang tidak mau deal dengan npm dependency hell, adalah kategori pengguna yang sama sekali tidak terlayani oleh ekosistem JS manapun saat ini. Go dan Rust membuktikan bahwa binary tunggal membuka segmen pengguna yang sama sekali baru (DevOps engineer yang butuh tool cepat, designer yang mau bikin landing page tanpa setup Node, pelajar yang baru belajar web development).

### 2.4 Tetapi: "Paling Praktis" ≠ "Paling Populer"

Praktis = mudah dipakai. Populer = banyak yang pakai. Keduanya berkorelasi tapi tidak identik. PromptJS punya hambatan adopsi yang tidak dimiliki Svelte/Vue/Astro: **sintaks Indonesia**. Developer Indonesia akan langsung nyaman, tapi developer internasional perlu membaca dokumen terjemahan — dan honestly, sebagian akan langsung scroll past karena keyword `Buat`, `Jika`, `Ulangi` terasa asing. Ini adalah trade yang harus disadari: Anda menukar global mass-market dengan niche clarity. **Itu bukan kesalahan — itu positioning yang sah** — tapi jangan mengklaim "paling praktis di dunia" tanpa acknowledge bahwa "dunia" di sini lebih ke "dunia developer Indonesia dan orang yang value readability di atas familiaritas sintaks Anglo-Saxon."

---

## 3. Evaluasi Teknis Terhadap Arsitektur yang Diusulkan

### 3.1 Strategi Reuse Pipeline: Evaluasi Per Komponen

Spesifikasi v0.1 mengklaim bahwa Resolver, Analyzer, dan Compiler bisa di-reuse "hampir tanpa modifikasi." Setelah membaca source code langsung, berikut evaluasi jujur:

#### Resolver (807 baris) — **Reuse 85%, bukan 100%**

Yang benar-benar bisa dipakai langsung: scope management, symbol table, hoisting (`gatherGlobals`), validasi referensi, deteksi shadowing, dan sebagian besar visitor. Tapi ada dua titik yang **harus** diubah:

1. **Disambiguasi `Buat tag_html` vs `Buat KomponenKustom` (§8.1 spec)** — Ini menyentuh inti resolver karena harus memodifikasi `visitBuatStatement` untuk mengubah interpretasi node berdasarkan symbol table. Spesifikasi sudah mengakui ini; saya menekankan bahwa kompleksitasnya tidak sepele. Di pipeline saat ini, `buat` dan `gunakan` dispatch ke visitor berbeda di **parser level** — mereka tidak perlu resolusi runtime. Menggabungkannya di bawah `Buat` berarti resolver harus melakukan pekerjaan yang sebelumnya dilakukan parser, dan itu terjadi di fase di mana parser sudah selesai. Ini adalah **fase baru** di pipeline, bukan sekadar "tambah if" di resolver.

2. **Binding data eksternal `$nama`** — Resolver saat ini mengasumsikan semua symbol dideklarasikan di file (`data`, `tetap`, `ubah`, `turunan`, `fungsi`, `komponen`). `$nama` tidak dideklarasikan — ia muncul dari "luar." Resolver akan melempar `E3001` (identifier tidak dideklarasikan) setiap kali menemukan `$produk` karena symbol tidak ada di table. Ini perlu patch: entah menambahkan pre-populate symbol table dengan data dari file `.json`, atau menambahkan flag `isExternal` yang di-skip saat validasi referensi. Spesifikasi tidak merinci ini secara implementatif.

#### Analyzer (547 baris) — **Reuse 90%**

Validasi semantik (lifecycle di luar komponen, `kembalikan` di luar fungsi, dependency cycle) benar-benar tidak terpengaruh oleh perubahan sintaks. Satu-satunya tambahan: auto-fragment wrapping untuk multi-root, dan ini bisa dilakukan di parser (sebelum masuk analyzer) sehingga analyzer tidak perlu diubah sama sekali — sesuai rekomendasi spesifikasi.

#### Compiler/Emitter (715 baris statements + 250 baris expression lowering) — **Reuse 80%**

Mayoritas emitter (`visitBuatStatement`, `visitJikaStatement`, `visitUlangiStatement`, `visitKetikaStatement`) bekerja dari AST dan benar-benar syntax-agnostic. Tapi tiga hal perlu ditambah:

1. **Emitter untuk `TextNode`** — Ini benar-benar baru. Pipeline sebelumnya hanya punya `properties.teks` (satu nilai skalar per elemen). PromptJS butuh `document.createTextNode()` sebagai child sejajar di `body`. Ini bukan adaptasi — ini **emitter baru**.

2. **Expression lowering untuk `$nama`** — `lowerExpression()` saat ini hanya mengenali `Identifier`, `BinaryExpression`, `CallExpression`, dll. `$nama` dengan dot-path (`$item.harga`) perlu translasi khusus: saat build-time jadi akses ke data yang di-embed, saat client jadi akses ke `window.__DATA__.item.harga`. Ini perlu branch baru di `lowerExpression`.

3. **Operator `>` dan simbol matematika** — Pipeline sebelumnya memakai keyword Indonesia (`lebih dari`, `kurang dari`, `tambah`, `kali`). PromptJS memakai `>` secara langsung (`Jika $item.stok > 0`). Expression lowering saat ini memetakan `lebih dari` → `>`. PromptJS perlu kebalikannya: `>` langsung lolos tanpa translasi. Ini sepele tapi perlu dipastikan tidak crash lexer/parser.

#### Runtime (152 baris) — **Reuse 100%**

`__createReactive`, `__createComputed`, `__watch`, `__cleanup` — ini benar-benar syntax-agnostic. Proxy-based reactivity, subscriber management, computed effect — semua bekerja di level JavaScript, tidak peduli dari sintaks apa mereka dipanggil. Ini bagian paling berharga untuk dipertahankan apa adanya, dan spesifikasi benar mengatakan "tidak ada alasan menulis ulang."

### 3.2 Lexer dan Parser Baru: Kompleksitas Sebenarnya

Spesifikasi mengatakan ini "tulis ulang total" dan itu benar — tapi yang perlu digarisbawahi adalah **berapa jauh** perbedaan implementasinya dari pipeline sebelumnya.

**Lexer sebelumnya** (1.199 baris) menangani:
- Keyword multi-kata via TRIE (`jika tidak`, `tidak sama dengan`, `ditinggal-kursor`)
- Selektor CSS inline (`#id`, `.class`, `[key="value"]`)
- Region mentah `langsung:` (JS pass-through)
- Komentar `--!` dan `--?`

**Lexer PromptJS** perlu menangani:
- Baris `key = value` (atribut)
- Baris string literal murni (children)
- `Buat identifier[.class][#id]:` (pembuka block)
- `on_nama_event = ekspresi` (event binding)
- `$identifier[.path]` (data eksternal)
- Indentasi (konsep sama, implementasi beda)
- Operator standar `>`, `<`, `+`, `*` secara langsung

Kompleksitas lexer PromptJS sebenarnya **lebih rendah** dari sebelumnya karena grammar-nya lebih reguler: setiap baris punya bentuk yang bisa didisambiguasi dari token pertama (atau jenis token pertama: `Buat` = block opener, string = child, `on_` = event, identifier + `=` = property). Pipeline sebelumnya harus menangani arrow-style (`buat h1 -> teks: nama`) dan keyword multi-kata yang jauh lebih kompleks.

Estimasi: lexer PromptJS ~600-800 baris (lebih ringan dari sebelumnya), parser ~1.200-1.500 baris (sepadan dengan sebelumnya karena disambiguasi baris dalam block memerlukan lookahead).

### 3.3 Fitur yang Harus Dibuat dari Nol: Tingkat Kesulitan Jujur

| Fitur | Estimasi Effort | Risiko | Catatan |
|---|---|---|---|
| Prerenderer (jsdom) | 2-3 minggu | **Rendah** | jsdom sudah matang; output compiler (`createElement`/`appendChild`) langsung jalan di jsdom tanpa modifikasi — ini keuntungan arsitektural sesungguhnya |
| Binding data eksternal | 1-2 minggu | **Sedang** | Sintaks mudah, tapi integrasi ke resolver dan expression lowering perlu desain hati-hati (lihat §3.1 poin 2) |
| Dev server (`pjs serve`) | 1-2 minggu | **Rendah** | Ini murni infrastruktur; tidak menyentuh compiler. WebSocket live-reload adalah solved problem |
| Sistem modul | 3-4 minggu | **Tinggi** | Ini fitur paling berisiko. Gabung semua file jadi satu AST besar sebelum resolver? Itu works untuk 5-10 file. Tapi untuk proyek nyata (50+ file, nested directory, circular reference antar komponen), pendekatan ini akan hit scalability wall. Perlu dipikirkan lebih matang sebelum coding |
| Hydration sungguhan (v2) | 6-8 minggu | **Tinggi** | Spesifikasi benar menunda ini ke v2. Fake hydration (re-run JS, ignore prerender) adalah strategi yang sane untuk MVP |

---

## 4. Kelemahan dan Risiko yang Harus Diakui

### 4.1 Sintaks Indonesia = Double-Edged Sword

Keyword `Buat`, `Jika`, `Ulangi`, `Lainnya` sangat ramah untuk penutur bahasa Indonesia. Tapi ini berarti:
- **Tooling ekosistem (syntax highlighting, LSP, formatter) harus dibuat dari nol.** Tidak bisa pakai ready-made parser untuk HTML/JSX/Vue.
- **AI code completion** (Copilot, Cursor) tidak akan mengenal sintaks ini — setidaknya sampai PromptJS punya cukup training data di wild.
- **Stack Overflow / dokumentasi komunitas** akan selamanya berbahasa Indonesia — ini membatasi kontributor internasional.

Mitigasi: pertimbangkan **bilingual keyword** — `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop` — sebagai opt-in mode. Ini tidak mengubah compiler (cuma tambah alias di lexer), tapi membuka pintu adopsi global tanpa mengorbankan identitas Indonesia.

### 4.2 Indentation-Based Syntax dan Editor Support

Indentasi sebagai struktur program adalah keputusan yang berani (Python, Pug/Jade, Slim membuktikan ini bisa works). Tapi masalah yang dihadapi Python selama 20 tahun — tab vs space, editor yang salah indent, copy-paste yang merusak struktur — akan dihadapi PromptJS juga.

Pipeline sudah punya penanganan `TK_INDENT`/`TK_DEDENT` yang matang (5MB stress test lolos), dan ini bisa dipinjam secara konseptual. Tapi **VS Code extension** yang mengkonversi Tab → 2-space secara otomatis, yang menampilkan indent guide, yang mencegah salah-indent — ini semua harus disediakan di hari peluncuran, bukan "nanti menyusul." Tanpa ini, developer akan frustasi di menit pertama.

### 4.3 Sistem Modul: Pertanyaan Terbuka yang Paling Kritis

Spesifikasi mengusulkan "gabung semua file jadi satu AST besar sebelum resolver" sebagai solusi v1. Ini works sebagai proof-of-concept. Tapi:

- Bagaimana nama komponen yang sama di dua file berbeda? (namespace conflict)
- Bagaimana file yang hanya berisi definisi komponen (tanpa `Buat halaman:`) vs file yang berisi halaman?
- Bagaimana hot-reload parsial di dev server? Kalau satu file berubah, apa semua file harus di-recompile?

Rekomendasi: untuk v1, gunakan konvensi **folder-based routing** (ala Astro/SvelteKit) — setiap file `.pjs` di `src/pages/` jadi satu halaman, setiap file `.pjs` di `src/components/` jadi komponen yang bisa dipanggil. Ini menghindari keyword `impor` sekaligus memberi struktur yang jelas. File komponen di-scan dan di-gabung sebelum compile halaman, tapi hanya komponen yang direferensikan (bukan semua file di direktori).

### 4.4 Transpiler Rust/Go: Jangan Mulai Dari Sini

Spesifikasi mengatakan "compiler Zero-Dependensi (Rust/Go)." Ini ambisius dan secara positioning kuat — tapi secara praktis, **ini harus jadi langkah ke-3, bukan langkah ke-1.**

Alasannya sederhana: PromptJS ditulis di JavaScript. Resolver, Analyzer, Compiler, dan Runtime semua JavaScript. Jika Anda mulai dengan Rust/Go, Anda harus menulis ulang **semua pipeline** dari nol — bukan cuma Lexer dan Parser, tapi juga 807 baris Resolver, 547 baris Analyzer, 715+250 baris Compiler/Emitter, dan 152 baris Runtime. Itu ~2.471 baris kode yang sudah teruji, plus semua edge case yang tertangani oleh 313+ assertion.

Urutan yang sane: (1) Implement PromptJS di JavaScript, reuse pipeline PromptJS, buktikan konsep bekerja. (2) Kalau konsep bekerja, **port ke Rust/Go** sebagai proyek terpisah — ini justified karena sekarang Anda punya test suite yang bisa memvalidasi output binary vs output JavaScript. (3) Launch binary sebagai "PromptJS 2.0" atau "PromptJS Native."

Mulai dari Rust/Go = membangun katedral tanpa blueprint. Anda akan menghabiskan 3 bulan menulis resolver di Rust sebelum bisa compile satu baris `Buat judul: "Halo"` — dan Anda tidak punya test suite untuk memvalidasi bahwa resolver Rust Anda setara dengan resolver JS PromptJS.

---

## 5. Apa yang Tertulis di Spesifikasi v0.1 yang Sudah Benar

Spesifikasi v0.1 luar biasa solid sebagai working draft. Berikut keputusan yang sudah tepat:

1. **Model Hybrid (prerender + hydrate)** — Ini pilihan arsitektural yang tepat. Murni static = tidak interaktif. Murni reactive = lambat first-paint. Hybrid = best of both worlds, dibuktikan oleh Astro.

2. **Reactivity eksplisit, bukan auto-tracking** — Menulis ulang Svelte's compiler untuk auto-dependency-tracking adalah proyek riset PhD. Proxy + watcher manual sudah teruji di pipeline PromptJS (313+ assertion) dan lebih achievable oleh tim kecil.

3. **Tidak ada `eval()` / `new Function()`** — Ini prinsip keamanan yang tidak boleh dikompromi. Semua code di-generate statis, dapat diaudit.

4. **Fake hydration di v1, hydration sungguhan di v2** — Ini pengambilan keputusan yang pragmatis dan mature. Banyak framework (termasuk Astro versi awal) memakai pendekatan serupa.

5. **Source of truth = kode, bukan dokumen spec** — Temuan bahwa event map di implementasi (28 event) lebih lengkap dari spec menunjukkan sikap engineering yang benar: audit langsung ke kode.

---

## 6. Apa yang Perlu Ditambah atau Diperbaiki di Spesifikasi

### 6.1 Yang Hilang: Error Message Design

Spesifikasi tidak membahas apa yang pengguna lihat saat salah ketik. Ini bukan detail — ini adalah **80% dari developer experience.** Pesan error pipeline sudah punya kode (`E3001`, `E6002`) dan saran perbaikan — ini harus diwariskan dan diperkaya di PromptJS.

Rekomendasi: tambahkan §12 "Error Message Design" yang menspesifikasikan: setiap error menyertakan (a) baris:kolom di source `.pjs`, (b) konteks baris yang salah (highlight karakter bermasalah), (c) saran perbaikan dalam bahasa Indonesia, dan (d) link ke dokumentasi error code.

### 6.2 Yang Hilang: CSS Scoping Strategy

Saat ini `style = "padding:16px; background:#fff"` adalah string global — sama seperti inline style di HTML. Tapi untuk komponen yang bisa dipakai ulang, developer butuh scoped CSS (CSS yang hanya berlaku di dalam komponen, tidak bocor ke luar). Vue punya `<style scoped>`, Svelte punya auto-scoping, Astro punya `<style>` yang di-scope otomatis. PromptJS belum punya rencana untuk ini.

Rekomendasi: di v1, gunakan konvensi BEM-style (`.card__judul`, `.card__deskripsi`) tanpa framework support. Di v2, tambahkan `Buat gaya:` block yang di-compile jadi scoped CSS dengan attribute selector (`[data-pjs-xxx]`).

### 6.3 Yang Perlu Diperjelas: Data Eksternal — Dari Mana Persisnya?

Pertanyaan terbuka §9.1 ("$produk dari mana?") adalah yang paling menghambat implementasi. Tanpa keputusan ini, compiler tidak bisa dibangun.

Rekomendasi: gunakan **front-matter di kepala file `.pjs`**:

```
---
produk: ./data/produk.json
keranjang: ./data/keranjang.json
---

Buat halaman:
    Buat gambar.produk:
        src = $produk.gambarUrl
```

Alasan: (a) file data selalu bersebelahan dengan file yang memakainya (tidak perlu konfigurasi terpisah), (b) parser bisa membaca front-matter sebelum pipeline utama, (c) konvensi ini sudah dikenal dari Hugo/Jekyll/Astro, (d) tidak perlu folder khusus `data/` yang harus dikonfigurasi.

### 6.4 Yang Perlu Ditambah: `pass` Keyword

Contoh spesifikasi punya `Buat pemisah: pass` — ini adalah empty block. Tapi `pass` sebagai keyword tidak didefinisikan di mana pun di spesifikasi. Apakah ini synonym untuk blok kosong? Apakah ini sama dengan Python `pass`? Harus didefinisikan eksplisit: `pass` = elemen tanpa children atau atribut (self-closing), di-compile jadi `<hr>` (kalau `pemisah`) atau `<div></div>` (kalau generik).

---

## 7. Rekomendasi Roadmap Revisi

Berdasarkan analisis di atas, saya merekomendasikan roadmap berikut:

### v0.1 (Proof of Concept, 4-6 minggu)
- Lexer + Parser PromptJS di **JavaScript**, menghasilkan AST yang compatible secara internal
- Pipeline: Lexer PromptJS → Parser PromptJS → Resolver → Analyzer → Compiler
- Subset: `Buat`, property, teks tunggal, `Jika/Lainnya`, `Ulangi`
- CLI: `pjs compile source.pjs` → output JS ke stdout
- **Target:** buktikan pipeline benar-benar nyambung, satu halaman statis bisa di-render

### v0.5 (Developer Preview, +6-8 minggu)
- Tambah: `TextNode` campuran, auto-fragment, disambiguasi komponen, event alias lengkap
- CLI: `pjs serve` (dev server dengan live-reload, render di browser)
- Front-matter data binding (`$nama`)
- Folder-based routing (`src/pages/`, `src/components/`)
- **Target:** developer bisa membangun situs multi-halaman dengan komponen

### v1.0 (Production Ready, +8-12 minggu)
- Prerenderer jsdom → output `dist/` berisi `.html`, `.css`, `.js`
- CLI: `pjs build` → folder dist siap deploy
- Fake hydration
- VS Code extension minimal (syntax highlighting, indent guide)
- Error message dengan konteks dan saran
- **Target:** situs produksi bisa di-deploy ke Vercel/Netlify/cdn statis manapun

### v2.0 (Native Binary + Hydration, +16-24 minggu)
- Port ke Rust (atawa Go) untuk binary tunggal
- Hydration sungguhan
- Scoped CSS
- Sistem modul dengan `impor` eksplisit
- Bilingual keyword (opsional)
- **Target:** `curl | sh` install, binary 5MB, compile 1000-line file dalam <50ms

---

## 8. Kesimpulan

PromptJS punya visi yang **koheren secara arsitektural** dan menempati celah yang **secara objektif kosong** di ekosistem web development saat ini: template engine berbahasa Indonesia yang compile ke vanilla JS zero-dependency, didistribusi sebagai binary tunggal, dengan sintaks yang mengikuti urutan pikiran manusia bukan urutan mesin.

Tiga pilar klaim Anda — readability setinggi prompt AI, kecepatan sekencang Svelte, kemudahan instalasi sekecil Go — semuanya **technically achievable**, tapi dengan nuansa:

- **Readability**: terbukti, dan ini bukan cosmetic — ini punya implikasi tooling nyata (unambiguous per-baris grammar). Tapi hanya untuk penutur bahasa Indonesia atau orang yang value clarity di atas familiaritas.

- **Kecepatan sekencang Svelte**: ini tergantung pada implementasi native binary. Versi JavaScript akan lebih lambat dari Svelte compiler (yang sudah sangat optimized). Klaim kecepatan hanya valid setelah port ke Rust/Go selesai.

- **Kemudahan instalasi sekecil Go**: ini paling achievable dari ketiganya — binary tunggal adalah solved problem (Go, Rust, Zig, Bun semua membuktikan). Tapi, sekali lagi, hanya setelah port ke native selesai.

Risiko terbesar bukan teknis — risiko terbesar adalah **membangun katedral tanpa blueprint**: mulai dari Rust/Go sebelum pipeline JavaScript terbukti bekerja, atau mendesain sistem modul sebelum kasus penggunaan nyata terkumpul. Mitigasi: iterasi cepat di JavaScript dulu, buktikan konsep, baru port ke native.

PromptJS bukan sekadar DSL — kalau dieksekusi dengan benar, ini adalah **gerbang masuk web development untuk jutaan developer Indonesia** yang selama ini harus berpikir dalam bahasa Inggris untuk menulis HTML. Itu lebih dari sekadar "praktis." Itu adalah demokratisasi akses.

---

*Evaluasi ini berdasarkan pembacaan langsung: `lexer/promptjs-lexer.js` (1.199 baris), `parser/statement-parser.js` (1.697 baris), `parser/ast-factory.js` (706 baris), `parser/expression-parser.js` (548 baris), `resolver/promptjs-resolver.js` (807 baris), `analyzer/promptjs-analyzer.js` (547 baris), `compiler/promptjs-compiler.js` (125 baris), `compiler/emitters/statements.js` (715 baris), `compiler/emitters/runtime.js` (152 baris), `compiler/lower/expression.js` (250 baris), `engine/promptjs.js` (363 baris), dan `PromptJS-Spec-v0.1.md`.*
