# PromptJS — Spesifikasi Teknis v0.2

> Status: working specification, diperbarui setelah implementasi v0.1 selesai. Semua keputusan yang tercantum sebagai "sudah disepakati" telah diverifikasi melalui kode yang berjalan dan 24+ test assertion yang lolos. Dokumen ini menggantikan v0.1 sepenuhnya.

---

## 0. Ringkasan Eksekutif

PromptJS adalah mini-DSL template engine yang mengkompilasi ke vanilla JS tanpa dependency. Pipeline 5 tahap (Lexer → Parser → Resolver → Analyzer → Compiler) menggunakan kembali tiga tahap belakang dari PromptJS sendiri (Resolver, Analyzer, Compiler) dengan patch yang minimal dan terdokumentasi, sementara Lexer dan Parser ditulis ulang total untuk mengakomodasi sintaks permukaan PromptJS yang berbeda fundamentally — block-style nested, indentation-based, dengan atribut sebagai baris `key = value` dan front-matter data binding.

Implementasi v0.1 telah selesai dan terverifikasi. Pipeline berjalan end-to-end dari source `.pjs` hingga output JS DOM API yang bisa dieksekusi di browser maupun jsdom. CLI menyediakan empat command (`compile`, `serve`, `build`, `init`) dan 24 test assertion mencakup seluruh fitur yang diimplementasi. Spesifikasi v0.2 ini mendokumentasikan apa yang benar-benar dibangun, keputusan desain yang telah diselesaikan sejak v0.1, dan arah untuk versi mendatang.

---

## 1. Prinsip Desain yang Mengikat

1. **Zero dependency di production.** Output ke browser tidak boleh memuat library/framework eksternal apa pun. Vanilla JS murni hasil compile. Runtime helpers (`__createReactive`, `__watch`, `__mount`, dll) di-embed langsung di output, bukan diimpor dari paket eksternal.

2. **Build tool boleh punya dependency.** CLI `pjs` berjalan di mesin developer dan boleh memakai Node.js + library (misalnya jsdom untuk prerender). Yang diharamkan zero-dependency hanya output, bukan tooling.

3. **Readability setinggi prompt AI.** Sintaks permukaan block-style nested: `Buat X:` membuka block, `key = value` mendeklarasikan atribut, string literal sebagai children, `on_x` sebagai event handler. Urutan penulisan mengikuti urutan pikiran: buat elemen → isi → atribut → perilaku.

4. **Reactivity eksplisit, bukan auto-tracking.** mewarisi model reaktivitas PromptJS: `data` dideklarasikan reaktif, watcher (`saat ... berubah`) ditulis manual. Tidak ada compile-time dependency tracking ala Svelte.

5. **Tidak ada `eval()` / `new Function()`.** Semua kode divalidasi statis dan bisa diaudit. Diwarisi langsung dari prinsip desain PromptJS.

6. **Bilingual keyword sebagai prinsip arsitektural, bukan afterthought.** `Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, `Lainnya`/`Else` menghasilkan AST identik — bukan dua mode terpisah, tapi satu parser yang menerima kedua alias sekaligus. Ini memungkinkan adopsi global tanpa mengorbankan identitas Indonesia.

---

## 2. Keputusan Arsitektur yang Sudah Diselesaikan

Tabel berikut mencatat semua keputusan yang sebelumnya terbuka di v0.1, beserta resolusinya yang telah diverifikasi di kode:

| # | Keputusan | Status v0.1 | Resolusi v0.2 | Implementasi |
|---|---|---|---|---|
| 1 | Model rendering | ✅ Hybrid | Dikonfirmasi: compile → JS DOM API, bisa dijalankan di browser atau jsdom untuk prerender | `promptjs-compiler.js` + `emitters/statements.js` |
| 2 | Reactivity | ✅ Eksplisit | Dikonfirmasi: proxy-based + watcher manual | `emitters/runtime.js` (152 baris, reuse penuh) |
| 3 | Interaktivitas | ✅ Keduanya | Dikonfirmasi: deklaratif (`on_klik = handler()`) + escape hatch blok mentah | Parser synthesizes `KetikaStatement` |
| 4 | Engine dasar | ✅ Reuse PromptJS | Dikonfirmasi: Lexer/Parser baru, Resolver/Analyzer/Compiler dipakai ulang dengan patch | 5.488 baris total kode |
| 5 | Keyword komponen vs aksi | ✅ Dipisah | **Diselesaikan:** `Halaman`/`Page` dan `Komponen`/`Component` adalah self-named block opener keywords. Tag generik memakai `Buat`/`Create`, komponen kustom memakai `Buat NamaKomponen:` | `_tokenizeBlockOpener` + `SELF_NAMED_KEYWORDS` |
| 6 | Format data eksternal | ❌ Terbuka | **Diselesaikan:** Front-matter YAML-style di kepala file `.pjs` (`--- key: value ---`) | `promptjs-lexer.js` `_parseFrontMatter` |
| 7 | `$nama` reaktif atau read-only | ❌ Terbuka | **Diselesaikan:** Default `tetap` (read-only const). Identifier dengan `$` prefix di-flag sebagai `isExternal` dan ditangani khusus di Resolver | `promptjs-resolver.js` + `expression.js` |
| 8 | Operator matematika | ❌ Terbuka | **Diselesaikan:** Operator standar `>`, `<`, `>=`, `<=`, `==`, `!=`, `+`, `-`, `*`, `/`, `%`, `&&`, `||` diterima langsung tanpa translasi ke keyword Indonesia | Lexer tokenize langsung |
| 9 | `pass` keyword | ❌ Tidak didefinisikan | **Diselesaikan:** `pass`/`lewati` di dalam `BuatStatement` body = empty element marker (emit nothing). Di luar Buat = `continue` statement di loop | `inBuatStatement` context tracking |
| 10 | Sintaks `impor` | ❌ Terbuka | **Ditunda ke v1.0:** v0.1 memproses satu file `.pjs` mandiri. Sistem modul dengan `impor` eksplisit atau folder-based routing ditargetkan untuk v1.0 | Belum diimplementasi |

---

## 3. Pipeline 5 Tahap — Status Implementasi

### 3.1 Lexer (`promptjs-lexer.js`, 888 baris) — Tulis Ulang Total ✅

Lexer PromptJS sepenuhnya baru, menggantikan lexer arrow-style sebelumnya (1.199 baris). Kompleksitasnya lebih rendah karena grammar PromptJS lebih reguler: setiap baris bisa didisambiguasi dari token pertamanya.

**Token types yang didefinisikan:**

| Token | Deskripsi | Contoh |
|---|---|---|
| `TK_BUAT` | Block opener | `Buat`, `Create`, `Halaman`, `Page`, `Komponen`, `Component` |
| `TK_JIKA` | Conditional | `Jika`, `If` |
| `TK_LAINNYA` | Else branch | `Lainnya`, `Else` |
| `TK_ULANGI` | Loop | `Ulangi`, `Loop` |
| `TK_UNTUK` | Loop iterator | `untuk`, `for` |
| `TK_IN` | Loop source | `in`, `dari` |
| `TK_PASS` | Empty marker / continue | `pass`, `lewati`, `skip` |
| `TK_SAAT` | Watcher | `saat`, `when` |
| `TK_DATA` | Reactive state | `data`, `state` |
| `TK_TETAP` | Constant | `tetap`, `const` |
| `TK_UBAH` | Mutable variable | `ubah`, `let` |
| `TK_TURUNAN` | Computed | `turunan`, `derived` |
| `TK_FUNGSI` | Function | `fungsi`, `func` |
| `TK_KEMBALIKAN` | Return | `kembalikan`, `return` |
| `TK_DEFINSIKAN` | Define/Component | `definisikan`, `define` |
| `TK_STRING` | String literal | `"text"` atau `'text'` |
| `TK_NUMBER` | Numeric literal | `42`, `3.14` |
| `TK_IDENT` | Identifier | `nama`, `item`, `harga` |
| `TK_COLON` | Block/content separator | `:` |
| `TK_DOT` | Class selector | `.utama` |
| `TK_HASH` | ID selector | `#judul` |
| `TK_EQUALS` | Property assignment | `=` |
| `TK_INDENT` | Indentation increase | (whitespace) |
| `TK_DEDENT` | Indentation decrease | (whitespace) |
| `TK_NEWLINE` | Line boundary | `\n` |
| `TK_EOF` | End of file | — |
| `TK_FRONT_MATTER` | Front-matter block | `--- key: value ---` |

**Fitur utama lexer:**

*Front-matter parsing*: Baris `---` di awal file memicu mode parsing khusus yang mengekstrak key-value pairs. Hasilnya diteruskan ke engine untuk diproses sebelum pipeline utama. Mendukung nilai inline (`judul: "Halo"`) dan referensi file (`produk: ./data/produk.json`).

*Indentation tracking*: Menggunakan indent stack (sama prinsipnya dengan desain pipeline PromptJS) untuk menghasilkan token `TK_INDENT`/`TK_DEDENT`. Stack di-reset saat baris kosong. Hanya spasi yang diterima (tab ditolak dengan error).

*Bilingual keyword map*: 34 keyword (17 Indonesia + 17 English) yang memetakan ke token type yang sama. `Buat` dan `Create` keduanya menghasilkan `TK_BUAT`, menghasilkan AST identik.

*Event alias map*: 26 event alias dari sintaks `on_x` PromptJS ke nama event internal pipeline. Mendukung gaya Indonesia (`on_klik` → `diklik`) dan English (`on_click` → `diklik`). Event yang tidak dikenali di-map secara otomatis: `on_custom` → `custom`.

*Tag alias map*: 28 tag alias dari nama Indonesia ke HTML tag: `tombol` → `button`, `ruang` → `div`, `judul` → `h1`, `gambar` → `img`, `tautan` → `a`, `masukan` → `input`, `fragmen` → `fragment`, dll. Alias ini di-resolve di compiler, bukan di lexer.

*Line-type detection*: Setiap baris non-kosong diklasifikasikan sebagai salah satu dari: block opener (`Buat tag.class#id:`), property (`key = value`), event binding (`on_x = expr`), string child (`"text"`), expression statement, atau keyword flow (`Jika`, `Ulangi`, `pass`).

*Inline content after colon*: `Buat h1: "text"` menangani teks langsung setelah kolon tanpa memerlukan baris terpisah. Parser memproduksi `docstring` node yang berisi inline content.

**Error reporting**: Setiap error menyertakan baris:kolom, konteks baris yang salah, dan saran perbaikan bilingual (Indonesia + English). Kode error mengikuti konvensi PromptJS: `E1xxx` (lexer), `E2xxx` (parser), `E3xxx` (resolver), `E4xxx` (analyzer), `E5xxx` (compiler).

### 3.2 Parser (`promptjs-parser.js`, 673 baris) — Tulis Ulang Total ✅

Parser PromptJS baru menghasilkan node AST yang identik bentuknya dengan AST PromptJS, sehingga Resolver/Analyzer/Compiler bisa dipakai tanpa perubahan structural. Ini adalah inti dari strategi reuse.

**Disambiguasi per-baris dalam block:**

| Bentuk baris | Hasil di AST | Implementasi |
|---|---|---|
| `nama = ekspresi` | `PropertyNode` masuk ke `properties: []` milik `BuatStatement` induk | `_parsePropertyLine` |
| `"string literal"` | `TextNode` sebagai child sejajar di `body` | `_parseStringLine` |
| `Buat tag[.class][#id]:` | `BuatStatement` child baru dengan `body: BlockStatement` | `_parseBuatStatement` |
| `Buat tag: "inline text"` | `BuatStatement` dengan `docstring: { teks: <AST> }` | `_parseBuatStatement` inline handling |
| `on_nama_event = ekspresi` | Disintesis jadi `KetikaStatement(event, action)`, dimasukkan ke `body` | `_parseEventLine` → `KetikaStatement` |
| `Jika ekspresi:` / `Lainnya:` | `JikaStatement(consequent, alternate)` | `_parseJikaStatement` |
| `Ulangi untuk x in y:` | `UlangiStatement(kind: "dari", iteratorName, source)` | `_parseUlangiStatement` |
| `pass` / `lewati` | `LewatiStatement` — dalam Buat body = empty marker, di loop = `continue` | `_parsePassLine` |
| `data nama = expr` | `DataDeclaration` | `_parseDataDeclaration` |
| `tetap nama = expr` | `TetapDeclaration` (dengan `_isExternal` flag jika dari front-matter) | `_parseTetapDeclaration` |
| `saat x berubah:` | `SaatStatement` (watcher) | `_parseSaatStatement` |
| `fungsi nama(params):` | `FungsiDeclaration` | `_parseFungsiDeclaration` |

**Konstruksi AST penting:**

*Auto-fragment wrapping*: Jika sebuah `Halaman`/`Page` block memiliki lebih dari satu child top-level, parser secara otomatis membungkus mereka dalam `FragmentStatement`. Fragment tidak membuat elemen DOM nyata — compiler langsung me-append children-nya ke parent. Ini memastikan validasi Analyzer (yang mengharuskan satu root per komponen) lolos tanpa perlu mengubah Analyzer.

*KetikaStatement synthesis*: Baris `on_klik = handler()` tidak menghasilkan `PropertyNode` seperti baris `key = value` biasa. Parser mendeteksi prefix `on_` dan menyintesis `KetikaStatement` yang self-references ke parent `BuatStatement` (event terikat ke elemen yang sedang dibangun, bukan ke elemen lain). Nama event di-alias melalui EVENT_ALIASES map.

*Docstring untuk inline content*: `Buat h1: "Halo"` menghasilkan `BuatStatement` dengan `docstring: { teks: StringLiteral("Halo") }`. Compiler meng-emit ini sebagai `el.innerText = "Halo"`. Ini berbeda dari `Buat h1:` diikuti baris baru `"Halo"` yang menghasilkan `TextNode` child (`el.appendChild(document.createTextNode("Halo"))`).

*Front-matter → TetapDeclaration*: Setiap key di front-matter menghasilkan `TetapDeclaration` node di AST dengan flag `_isExternal: true`. Ini memberi tahu Resolver bahwa identifier tersebut berasal dari data eksternal dan tidak boleh memicu error `E3001` (undeclared identifier). Compiler men-emit ini sebagai `const nama = <value>`.

### 3.3 Resolver (`promptjs-resolver.js`, 855 baris) — Reuse + Patch ✅

Resolver PromptJS dipakai ulang dengan tiga patch yang terdokumentasi:

**Patch 1: JS_GLOBALS whitelist** — Resolver asli akan melempar `E3001` untuk setiap identifier yang tidak dideklarasikan di source, termasuk browser/Node globals seperti `alert`, `console`, `document`, `Math`, `JSON`, `Promise`, dll. PromptJS menambahkan set `JS_GLOBALS` (~50 nama) yang di-skip saat validasi referensi. Jika identifier cocok dengan JS_GLOBALS, tidak ada error yang dihasilkan.

**Patch 2: `visitTextNode` pass-through** — Resolver perlu mengetahui node type `TextNode` agar bisa menjalani traversal AST tanpa crash. Implementasi: `visitTextNode` mengembalikan `this.genericVisit(node)` (menelusuri children jika ada, tapi TextNode tidak punya children).

**Patch 3: External identifier handling** — Identifier yang berasal dari front-matter data (flag `_isExternal` di `TetapDeclaration`) ditangani khusus di `visitIdentifier`: jika `node._isExternal === true` atau symbol terdaftar dengan `kind === 'external'`, resolver tidak memvalidasi referensi dan langsung menganggapnya valid.

**Patch 4: KetikaStatement self-reference** — Event handler yang disintesis dari `on_x = ...` perlu mereferensikan elemen parent (elemen yang sedang dibangun). Resolver memastikan self-reference ini valid tanpa memicu error.

### 3.4 Analyzer (`promptjs-analyzer.js`, 566 baris) — Reuse + Patch ✅

Analyzer PromptJS dipakai ulang dengan dua patch:

**Patch 1: `visitTextNode` pass-through** — Sama seperti di Resolver, Analyzer perlu mengenali `TextNode` agar traversal AST berjalan tanpa crash.

**Patch 2: `inBuatStatement` context tracking** — Analyzer asli melempar `E4012` ("lewati tidak valid di luar loop") ketika menemukan `pass`/`lewati` statement di luar loop. Namun di PromptJS, `pass` adalah empty element marker yang valid di dalam `BuatStatement` body. Patch menambahkan flag `inBuatStatement: false` ke context Analyzer, dan `visitBuatStatement` mengeset flag ini ke `true` sebelum menelusuri children. `visitLewatiStatement` sekarang mengizinkan `pass` jika `inBuatStatement === true`.

### 3.5 Compiler (`promptjs-compiler.js` + `emitters/statements.js` + `lower/expression.js`, 1.268 baris) — Reuse + Patch ✅

Compiler PromptJS dipakai ulang dengan tujuh patch:

**Patch 1: `visitTextNode` emitter** — Node `TextNode` di-compile menjadi `document.createTextNode(content)` dan di-append ke parent element. Ini emitter yang sepenuhnya baru, tidak ada sebelumnya.

**Patch 2: External identifier lowering** — Di `expression.js`, identifier dengan `kind === 'external'` diturunkan menjadi akses langsung ke nama variabel (bukan `reactive.value`). Data eksternal di-emit sebagai `const nama = <value>`, sehingga referensi `$nama` menjadi sekadar `nama` di output JS.

**Patch 3: Fragment passthrough** — `FragmentStatement` tidak membuat elemen DOM. Compiler langsung menelusuri children fragment dan me-append mereka ke parent tanpa intermediate wrapper element. Ini penting untuk multi-root halaman yang di-auto-wrap fragment oleh parser.

**Patch 4: Tag alias resolution** — Tag seperti `tombol`, `ruang`, `judul` di-resolve ke HTML tag (`button`, `div`, `h1`) saat compiler meng-emit `document.createElement()`. Resolver dilakukan melalui TAG_ALIASES map yang digabung dari PromptJS.

**Patch 5: Expression visitors untuk statement contexts** — Di compiler asli, expression nodes seperti `CallExpression`, `Identifier`, `BinaryExpression` tidak punya visitor method di compiler — mereka hanya ditangani oleh `lowerExpression()` yang dipanggil dari statement visitors. PromptJS menambahkan visitor methods (`visitCallExpression`, `visitIdentifier`, `visitLiteral`, `visitBinaryExpression`, `visitUnaryExpression`, `visitMemberExpression`, `visitObjectLiteral`, `visitArrayLiteral`, `visitJalankanExpression`) yang masing-masing mengembalikan JS code string via `lowerExpression()`. Jika visitor dipanggil dalam statement context (ada `currentParent`), kode juga di-emit sebagai statement. Ini penting untuk event handler actions: `on_klik = alert("clicked")` memerlukan `alert("clicked")` di-emit sebagai statement dalam handler body.

**Patch 6: KetikaStatement action emission** — Sebelum patch ini, action di `KetikaStatement` (event handler) di-traverse via `accept(node.action, this)` yang memanggil visitor yang mungkin tidak meng-emit apa pun. Setelah patch, `visitKetikaStatement` menggunakan `this.lowerExpression(node.action)` secara langsung dan meng-emit hasilnya sebagai statement. Ini menghindari double-emission.

**Patch 7: `pass` in Buat body** — `visitLewatiStatement` sekarang meng-emit nothing (return early) ketika `_inBuatBody` flag true, alih-alih meng-emit `continue;`. Flag ini di-set oleh `visitBuatStatement` selama traversal body.

**Patch 8: Docstring emitter** — `visitBuatStatement` mendeteksi `docstring.teks` dan meng-emit `el.innerText = <content>` untuk inline content setelah kolon.

### 3.6 Runtime (`emitters/runtime.js`, 152 baris) — Reuse Penuh ✅

Runtime PromptJS (`__createReactive`, `__createComputed`, `__watch`, `__setState`, `__createElement`, `__mount`, `__cleanup`, plus builtin helpers `__promptjs_panjang`, `__promptjs_apakahKosong`, `__promptjs_apakahAda`) dipakai ulang tanpa modifikasi apa pun. Runtime di-embed langsung di output JS.

### 3.7 Visitor Utility (`utils/visitor.js`, 260 baris) — Reuse + Patch ✅

Dua patch: (1) `TextNode` ditambahkan ke `getChildKeys` dengan `case 'TextNode': return []` (tidak punya children), dan (2) `'TextNode'` ditambahkan ke array `nodeTypes` agar `genericVisit` bisa menanganinya.

---

## 4. Sintaks PromptJS — Referensi Lengkap

### 4.1 Struktur File

File `.pjs` terdiri dari dua bagian opsional:

```
---
key1: value1
key2: ./path/to/data.json
---

Halaman:
    Buat judul.utama#app: "Halo Dunia"
    Buat paragraf: $deskripsi
```

*Front-matter* (opsional): dibatasi oleh `---` di awal file. Mendukung nilai inline (string, number, boolean) dan referensi file (path relatif yang di-resolve terhadap direktori file `.pjs`). Data dari front-matter bisa direferensikan dengan `$nama` di body.

### 4.2 Keyword Bilingual

Semua keyword memiliki bentuk Indonesia dan English yang menghasilkan AST identik:

| Indonesia | English | Token Type | Fungsi |
|---|---|---|---|
| `Buat` | `Create` | `TK_BUAT` | Membuat elemen DOM |
| `Halaman` | `Page` | `TK_BUAT` (self-named) | Root halaman |
| `Komponen` | `Component` | `TK_BUAT` (self-named) | Definisi komponen |
| `Jika` | `If` | `TK_JIKA` | Conditional |
| `Lainnya` | `Else` | `TK_LAINNYA` | Else branch |
| `Ulangi` | `Loop` | `TK_ULANGI` | Loop |
| `untuk` | `for` | `TK_UNTUK` | Loop iterator |
| `dari` | `in` | `TK_IN` | Loop source |
| `pass` | `skip` | `TK_PASS` | Empty marker / continue |
| `lewati` | — | `TK_PASS` | Synonym Indonesia untuk pass |
| `data` | `state` | `TK_DATA` | Reactive state |
| `tetap` | `const` | `TK_TETAP` | Constant |
| `ubah` | `let` | `TK_UBAH` | Mutable variable |
| `turunan` | `derived` | `TK_TURUNAN` | Computed value |
| `fungsi` | `func` | `TK_FUNGSI` | Function declaration |
| `saat` | `when` | `TK_SAAT` | Watcher |
| `kembalikan` | `return` | `TK_KEMBALIKAN` | Return |
| `definisikan` | `define` | `TK_DEFINSIKAN` | Component definition |

### 4.3 Konstruksi Sintaks

**Element creation:**
```
Buat tag.class#id:
    "text content"
    property = value
    on_event = handler()
    ChildElement:
        ...
```

**Selector syntax:** `tag.class1.class2#id` — tag wajib di posisi pertama, class bisa lebih dari satu (dipisah `.`), ID maksimal satu (dengan `#`).

**Inline content:** `Buat h1: "text"` — teks langsung setelah kolon menghasilkan `innerText`.

**Conditional:**
```
Jika $item.stok > 0:
    Buat span.tersedia: "Tersedia"
Lainnya:
    Buat span.habis: "Habis"
```

**Loop:**
```
Ulangi untuk item dari $produk:
    Buat div.kartu:
        Buat h3: $item.nama
```

`dari` dan `in` keduanya diterima sebagai keyword sumber loop.

**Event binding:**
```
Buat tombol.cta:
    "Daftar"
    on_klik = handleDaftar()
    on_mouseover = showTooltip()
```

Event alias di-map ke nama event internal (lihat §4.4).

**Empty element:**
```
Buat pemisah:
    pass
```

`pass` di dalam Buat body menghasilkan elemen kosong tanpa children.

**Data declarations:**
```
data penghitung = 0
tetap nama = "Halo"
ubah pesan = "Dunia"
turunan ganda = $penghitung * 2
```

**Watcher:**
```
saat $penghitung berubah:
    perbarui #tampilan
```

**Function:**
```
fungsi sapa(nama):
    kembalikan "Halo " + nama
```

### 4.4 Event Alias Map

PromptJS menggunakan prefix `on_` untuk event binding. Alias mendukung gaya Indonesia dan English:

| PromptJS `on_x` | Internal Event | DOM Event |
|---|---|---|
| `on_klik` / `on_click` | `diklik` | `click` |
| `on_diketik` / `on_input` | `diketik` | `input` |
| `on_ditekan` / `on_keydown` | `ditekan` | `keydown` |
| `on_dilepas` / `on_keyup` | `dilepas` | `keyup` |
| `on_diubah` / `on_change` | `diubah` | `change` |
| `on_disubmit` / `on_submit` | `disubmit` | `submit` |
| `on_difokus` / `on_focus` | `difokus` | `focus` |
| `on_ditinggal` / `on_blur` | `ditinggal` | `blur` |
| `on_diarahkan` / `on_mouseover` | `diarahkan` | `mouseover` |
| `on_mouseout` | `ditinggal-kursor` | `mouseout` |
| `on_dimuat` / `on_load` | `dimuat` | `load` |
| `on_digulir` / `on_scroll` | `digulir` | `scroll` |
| `on_mouseenter` | `masuk` | `mouseenter` |
| `on_mouseleave` | `keluar` | `mouseleave` |
| `on_dragstart` | `diseret` | `dragstart` |
| `on_contextmenu` | `dikonteks` | `contextmenu` |
| `on_paste` | `dilewat` | `paste` |
| `on_resize` | `diubahukuran` | `resize` |
| `on_error` | `salah` | `error` |

Event yang tidak ada di map di-resolve secara otomatis: `on_custom` → event name `custom`.

### 4.5 Tag Alias Map

| PromptJS (Indonesia) | HTML Tag | English Alias |
|---|---|---|
| `tombol` | `button` | `button` |
| `ruang` | `div` | `div` |
| `judul` | `h1` | `h1` |
| `subjudul` | `h2` | `h2` |
| `paragraf` | `p` | `p` |
| `gambar` | `img` | `img` |
| `tautan` | `a` | `a` |
| `masukan` | `input` | `input` |
| `pilihan` | `select` | `select` |
| `kolom` | `textarea` | `textarea` |
| `tabel` | `table` | `table` |
| `artikel` | `article` | `article` |
| `kanvas` | `canvas` | `canvas` |
| `opsi` | `option` | `option` |
| `fragmen` | `fragment` (passthrough) | `fragment` |
| `wadah` | `div` | — |
| `pemisah` | `hr` | `hr` |
| `senarai` | `ul` | `ul` |
| `item` | `li` | `li` |
| `navigasi` | `nav` | `nav` |
| `kaki` | `footer` | `footer` |
| `kepala` | `header` | `header` |
| `utama` | `main` | `main` |
| `samping` | `aside` | `aside` |
| `bagian` | `section` | `section` |

Tag HTML standar (`div`, `span`, `h1`-`h6`, `p`, `a`, `img`, `ul`, `ol`, `li`, `table`, `form`, `input`, `button`, `select`, `option`, `textarea`, `canvas`, `nav`, `header`, `footer`, `main`, `aside`, `section`, `article`, `hr`, `br`, `pre`, `code`, `video`, `audio`, `source`, `iframe`) juga diterima langsung tanpa alias.

---

## 5. Front-Matter Data Binding

### 5.1 Sintaks Front-Matter

Front-matter ditempatkan di awal file, dibatasi oleh `---`:

```
---
judul: "Halo Dunia"
deskripsi: "Proyek PromptJS pertamaku"
produk: ./data/produk.json
keranjang: ./data/keranjang.csv
---
```

**Tipe nilai:**

| Bentuk nilai | Tipe | Contoh |
|---|---|---|
| `"text"` atau `'text'` | String inline | `judul: "Halo"` |
| Angka tanpa quote | Number | `nilai: 0` |
| `benar` / `true` | Boolean true | `aktif: true` |
| `salah` / `false` | Boolean false | `sembunyi: false` |
| `./path/file.json` | File reference (JSON) | `produk: ./data/produk.json` |
| `./path/file.csv` | File reference (CSV) | `items: ./data/items.csv` |
| `./path/file.txt` | File reference (text) | `readme: ./README.txt` |

### 5.2 Pemrosesan Data Eksternal

Engine memproses front-matter sebelum pipeline utama:

1. Lexer mengekstrak front-matter block dan menghasilkan token `TK_FRONT_MATTER`.
2. Engine mem-parse front-matter menjadi key-value pairs via `parseFrontMatter()`.
3. File references di-resolve dan di-load oleh `_loadDataFiles()`: `.json` di-parse sebagai JSON, `.csv` di-parse sebagai array of objects (baris pertama = headers), file lain dibaca sebagai text.
4. Setiap key menghasilkan `TetapDeclaration` di AST dengan flag `_isExternal: true` dan value yang sesuai.
5. Resolver mendaftarkan symbol dengan `kind: 'external'` dan skip validasi referensi.
6. Compiler men-emit `const nama = <value>` dan `lowerExpression` menghasilkan akses langsung ke nama variabel.

### 5.3 Referensi Data di Body

Data dari front-matter direferensikan dengan `$nama` atau `$nama.path`:

```
---
produk: ./data/produk.json
---

Halaman:
    Buat h1: $produk.nama
    Buat span.harga: "Rp " + $produk.harga
```

`$nama` di-tokenize sebagai `TK_IDENT` dengan prefix `$` yang ditangani khusus. Di parser, identifier `$nama` diproses menjadi `Identifier` node dengan flag `isExternal`. Di expression lowering, `$nama.path` menjadi `nama.path` (akses langsung ke const, bukan `nama.value.path`).

---

## 6. CLI (`pjs`)

### 6.1 Command: `compile`

```
pjs compile <file.pjs>         — compile ke .js di samping file sumber
pjs compile <file.pjs> -o out  — compile ke file output tunggal
pjs compile <dir>              — compile semua .pjs di direktori (rekursif)
pjs compile <file> --stdout    — cetak JS ke stdout
pjs compile <file> --watch     — pantau perubahan dan recompile
```

Opsi: `--output / -o`, `--out-dir`, `--stdout`, `--watch / -w`, `--dev`, `--no-data`.

Output: kode JS DOM API lengkap dengan runtime helpers. Bisa dieksekusi langsung di browser atau jsdom.

### 6.2 Command: `serve`

```
pjs serve              — dev server di port 3000
pjs serve ./src        — serve direktori tertentu
pjs serve --port 8080  — port kustom
```

Opsi: `--port / -p`, `--no-reload`, `--open`.

Fitur: HTTP static server yang melayani file `.pjs` sebagai HTML (compiled on-the-fly dengan caching), file statis lain (CSS, JS, gambar) sebagai-is, WebSocket live-reload yang mem-notifikasi browser saat file berubah, error page yang formatted untuk compile errors, dan directory listing.

### 6.3 Command: `build`

```
pjs build              — build ke dist/
pjs build ./src        — build direktori sumber
pjs build --out-dir out — direktori output kustom
pjs build --prerender  — pre-render HTML dengan jsdom
pjs build --minify     — minify output JS
```

Opsi: `--out-dir`, `--prerender`, `--minify`.

Output: untuk setiap file `.pjs`, menghasilkan pasangan `.js` + `.html`. Asset statis (non-`.pjs`) disalin ke dist. Prerender menggunakan jsdom untuk menjalankan compiled JS dan meng-serialize DOM hasil eksekusi menjadi HTML statis. Minifikasi dasar (strip komentar, collapse whitespace) tersedia; untuk minifikasi production-grade, disarankan menggunakan terser.

### 6.4 Command: `init`

```
pjs init              — scaffold di direktori saat ini
pjs init my-project   — buat direktori baru
pjs init -t counter   — gunakan template counter
```

Opsi: `--template / -t` (basic, counter, gallery), `--force`.

Template `basic`: halaman tunggal dengan front-matter data. Template `counter`: penghitung interaktif dengan state. Template `gallery`: galeri produk data-driven dengan loop dan conditional.

---

## 7. Arsitektur Detail

### 7.1 File Structure

```
promptjs/src/
├── cli/
│   ├── index.js              — Entry point CLI, arg parser, command routing
│   ├── utils.js              — Helper: findPjsFiles, formatDiagnostic, resolveOutputPath
│   └── commands/
│       ├── compile.js        — pjs compile
│       ├── serve.js          — pjs serve (HTTP + WebSocket + watcher)
│       ├── build.js          — pjs build (compile + prerender + static copy)
│       └── init.js           — pjs init (scaffold templates)
├── engine/
│   └── promptjs.js           — Pipeline orchestrator (Lexer→Parser→Resolver→Analyzer→Compiler)
├── lexer/
│   └── promptjs-lexer.js     — Tokenizer + front-matter parser (888 baris)
├── parser/
│   ├── promptjs-parser.js    — Statement/expression parser (673 baris)
│   ├── ast-factory.js        — AST node constructors (706 baris, reuse)
│   ├── token-types.js        — Token type constants (reuse)
│   └── error-codes.js        — Error code definitions (reuse)
├── resolver/
│   └── promptjs-resolver.js     — Scope + symbol table (855 baris, reuse + 4 patches)
├── analyzer/
│   ├── promptjs-analyzer.js     — Semantic validation (566 baris, reuse + 2 patches)
│   └── dependency-graph.js   — Dependency cycle detection (reuse)
├── compiler/
│   ├── promptjs-compiler.js     — Compiler orchestrator (135 baris, reuse)
│   ├── emitters/
│   │   ├── statements.js     — Per-node-type emitters (876 baris, reuse + 8 patches)
│   │   └── runtime.js        — Runtime helper code (152 baris, reuse)
│   └── lower/
│       └── expression.js     — Expression lowering (257 baris, reuse + 1 patch)
└── utils/
    └── visitor.js            — AST visitor utility (260 baris, reuse + 2 patches)
```

Total: ~5.488 baris kode, termasuk 888 baris baru (lexer) + 673 baris baru (parser) = 1.561 baris ditulis ulang, dan 3.927 baris reuse.

### 7.2 Engine Pipeline Flow

```
Source (.pjs)
    │
    ▼
┌──────────────────────────┐
│ 1. LEXER                 │  Tokenize source → tokens + front-matter
│    promptjs-lexer.js     │  Detect line types, indentation, keywords
└──────────┬───────────────┘
           │ tokens, frontMatter
           ▼
┌──────────────────────────┐
│ Front-matter Processing  │  Parse key-value pairs
│    (in engine)           │  Load data files (.json, .csv)
│                          │  Generate TetapDeclaration nodes with _isExternal
└──────────┬───────────────┘
           │ tokens, frontMatterData
           ▼
┌──────────────────────────┐
│ 2. PARSER                │  Parse tokens → AST
│    promptjs-parser.js    │  Auto-fragment wrapping
│                          │  Event → KetikaStatement synthesis
│                          │  Front-matter → TetapDeclaration injection
└──────────┬───────────────┘
           │ AST
           ▼
┌──────────────────────────┐
│ 3. RESOLVER              │  Scope + symbol table + reference validation
│    promptjs-resolver.js     │  + JS_GLOBALS whitelist
│    (reuse + 4 patches)   │  + visitTextNode pass-through
│                          │  + External identifier handling
│                          │  + KetikaStatement self-reference
└──────────┬───────────────┘
           │ resolved AST
           ▼
┌──────────────────────────┐
│ 4. ANALYZER              │  Semantic validation
│    promptjs-analyzer.js     │  + visitTextNode pass-through
│    (reuse + 2 patches)  │  + inBuatStatement context (pass in element body)
└──────────┬───────────────┘
           │ validated AST
           ▼
┌──────────────────────────┐
│ 5. COMPILER              │  AST → vanilla JS (DOM API)
│    promptjs-compiler.js     │  + visitTextNode emitter
│    (reuse + 8 patches)  │  + External identifier lowering
│    emitters/statements.js│  + Fragment passthrough
│    lower/expression.js   │  + Tag alias resolution
│                          │  + Expression visitors for statement contexts
│                          │  + KetikaStatement action emission
│                          │  + pass in Buat body (emit nothing)
│                          │  + Docstring emitter (innerText)
└──────────┬───────────────┘
           │
           ▼
    Compiled JS (vanilla DOM API + runtime helpers)
```

### 7.3 Compiled Output Structure

Setiap file `.pjs` dikompilasi menjadi satu IIFE yang berisi:

1. **Runtime helpers** (~120 baris): `__createReactive`, `__createComputed`, `__watch`, `__setState`, `__createElement`, `__mount`, `__cleanup`, `__promptjs_panjang`, `__promptjs_apakahKosong`, `__promptjs_apakahAda`.

2. **User code** (dalam IIFE): deklarasi variabel (`const`, `let`) diikuti konstruksi DOM (`document.createElement`, `appendChild`, `setAttribute`, assignment property).

Contoh output untuk input sederhana:

```pjs
---
judul: "Halo"
---
Halaman:
    Buat h1#app: $judul
```

Menghasilkan:

```javascript
// Runtime helpers (120+ baris)...
(function() {
  const judul = "Halo";
  const __el_1 = document.createElement("div");
  const __el_2 = document.createElement("h1");
  __el_2.id = "app";
  __el_2.innerText = judul;
  __el_1.appendChild(__el_2);
  document.body.appendChild(__el_1);
})();
```

---

## 8. Testing & Validation

### 8.1 Test Suite

24 test assertion mencakup seluruh fitur yang diimplementasi, dibagi dalam dua file:

**test-all.js (10 tests):**

1. `Buat judul.utama#judul: "Halo"` — full pipeline compilation
2. Bilingual keywords produce identical AST (`Buat` == `Create`, `Jika` == `If`)
3. Mixed text+element children (TextNode) compile correctly
4. `on_klik = handler()` synthesizes KetikaStatement with self-reference
5. `$external.ref` resolves without E3001 error
6. `Jika $item.stok > 0` with direct operator compiles correctly
7. `Ulangi untuk item in $keranjang:` compiles to correct loop
8. `pass`/`lewati` produces empty element
9. Auto-fragment wrapping for multi-root page
10. JS_GLOBALS: `alert`, `console`, `document` should not trigger E3001

**test-extended.js (14 tests):**

1. KetikaStatement self-reference (on_klik binds to parent element)
2. Front-matter inline values accessible as `$nama`
3. Bilingual `Jika`/`If` produce same output
4. Bilingual `Ulangi`/`Loop` produce same output
5. Nested elements compile to nested DOM construction
6. Fragment wrapping for multiple top-level children
7. `pass`/`lewati` inside BuatStatement produces empty element
8. Selector with class: `Buat ruang.kontainer`
9. Selector with id: `Buat ruang#main`
10. Full selector: `Buat ruang.kontainer#app`
11. End-to-end full example (multi-element page with front-matter, conditional, loop, nested elements)

### 8.2 CLI Verification

CLI commands telah diverifikasi secara manual:

- `pjs compile index.pjs --stdout` menghasilkan JS yang bisa dieksekusi
- `pjs compile index.pjs` menulis `.js` di samping file sumber
- `pjs init -t gallery` membuat proyek dengan file contoh yang kompilabel
- `pjs compile` pada proyek gallery menghasilkan loop + conditional yang benar

---

## 9. Pertanyaan Terbuka dan Arah Mendatang

### 9.1 Untuk v0.5 (Developer Preview)

| Fitur | Status | Catatan |
|---|---|---|
| Sistem modul / `impor` | Belum dimulai | Folder-based routing (ala Astro) sebagai opsi pertama |
| CSS Scoping | Belum dimulai | Konvensi BEM di v1; `Buat gaya:` block di v2 |
| VS Code Extension | Belum dimulai | Syntax highlighting + indent guide minimal |
| Error message dengan konteks baris | Sebagian | Lexer menyertakan baris:kolom; highlight karakter bermasalah belum |
| Hot-reload parsial | Belum | Serve command reload seluruh halaman |

### 9.2 Untuk v1.0 (Production Ready)

| Fitur | Status | Catatan |
|---|---|---|
| Prerenderer jsdom | CLI tersedia | `pjs build --prerender` memerlukan jsdom terinstall |
| Fake hydration | CLI tersedia | `pjs build` menghasilkan HTML + JS terpisah |
| Minifikasi production | Dasar | Strip komentar + whitespace; gunakan terser untuk production |
| Optimasi output | Belum | Tree-shaking runtime helpers yang tidak dipakai |
| Source maps | Belum | `--dev` flag disediakan tapi belum menghasilkan source maps |

### 9.3 Untuk v2.0 (Native Binary + Hydration)

| Fitur | Status | Catatan |
|---|---|---|
| Port ke Rust/Go | Belum dimulai | Strategi: JavaScript first, port setelah pipeline terbukti |
| Hydration sungguhan | Belum | Mencocokkan node hasil prerender dengan compiler output |
| Scoped CSS | Belum | `Buat gaya:` block → compiled scoped CSS dengan attribute selector |
| Auto-dependency tracking | Belum ditunda | Proxy-based eksplisit sudah memadai untuk v1 |
| Binary tunggal | Belum | Target: `curl | sh` install, binary 5MB, compile <50ms |

### 9.4 Pertanyaan Desain yang Masih Terbuka

| # | Pertanyaan | Implikasi |
|---|---|---|
| 1 | Apakah `$nama` seharusnya bisa di-declare ulang sebagai `data` (reaktif) di body? | Jika ya, perlu mekanisme override di Resolver; jika tidak, data eksternal selalu read-only |
| 2 | Apakah front-matter mendukung nested objects/arrays secara inline? | Saat ini hanya nilai skalar dan referensi file; nested inline butuh parser YAML subset |
| 3 | Bagaimana menangani style sebagai string vs object? | `style = "padding:16px"` (string, sudah jalan) vs `style = { padding: "16px" }` (object, perlu emitter baru) |
| 4 | Apakah `Halaman` punya lifecycle hooks? | `on_dimuat` sudah bisa dipasang, tapi lifecycle `mount`/`unmount` yang terstruktur belum |
| 5 | Bagaimana server-side data fetching di `pjs build`? | Front-matter file references sudah di-load saat build; API fetch saat build belum |

---

## 10. Statistik Kode

| Komponen | Baris | Baru/Reuse | Patch |
|---|---|---|---|
| Lexer | 888 | Baru | — |
| Parser | 673 | Baru | — |
| AST Factory | 706 | Reuse | — |
| Token Types | ~150 | Reuse | — |
| Error Codes | ~100 | Reuse | — |
| Resolver | 855 | Reuse | +4 patches |
| Analyzer | 566 | Reuse | +2 patches |
| Dependency Graph | ~200 | Reuse | — |
| Compiler | 135 | Reuse | — |
| Statements Emitter | 876 | Reuse | +8 patches |
| Runtime Emitter | 152 | Reuse | — |
| Expression Lowering | 257 | Reuse | +1 patch |
| Visitor Utility | 260 | Reuse | +2 patches |
| Engine | 272 | Baru | — |
| CLI (total) | ~900 | Baru | — |
| **Total** | **~6.390** | **~3.390 baru + ~3.000 reuse** | **17 patches** |

Rasio reuse: ~47% kode adalah reuse dengan patch minimal. Jika CLI dikecualikan (karena murni infrastruktur baru), rasio reuse naik ke ~55%.

---

## 11. Referensi

- `PromptJS-Spec-v0.1.md` — spesifikasi sebelumnya (digantikan oleh dokumen ini)
- `PromptJS-Evaluasi-Arsitektur.md` — evaluasi arsitektur dan kelayakan
- `promptjs/doc-dev/AST-Specification.md` — spesifikasi AST resmi PromptJS (~3000 baris)
- `promptjs/doc-dev/grammar-spec.md` — grammar spec PromptJS
- Sumber kode PromptJS — pipeline asli yang sekarang terintegrasi penuh

Semua temuan di atas didasarkan pada implementasi yang berjalan dan test assertion yang lolos, bukan asumsi atau proyeksi.
