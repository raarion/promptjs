# Lapis 4 — CSS Architecture Audit — PromptJS `v132`

**Repo**: `raarion/promptjs` · **Branch**: `v132` · **HEAD terverifikasi**: `2868e3fa7c92ac0b9a8d320bf5a3641fddc6bbed`
**Tanggal audit**: 2026-07-07 · **Status**: Read-only audit. Tidak ada kode diubah, tidak ada merge/tag/publish/PR, **#79 tidak ditutup**, scoping CSS **tidak diimplementasikan** di sini.

---

## A. Snapshot Audit

- `git fetch origin && git checkout v132 && git reset --hard origin/v132` → HEAD = **`2868e3fa7c92ac0b9a8d320bf5a3641fddc6bbed`**. Ini LEBIH BARU dari baseline Lapis 1–3 (`94a02f1`) — terdapat **12 commit baru**, 11 di antaranya dari sesi Lapis 1–3 Stabilization Pass (sudah di-push oleh user via `push-console.html`), plus **1 commit baru dari maintainer** (`2868e3f fix(v132): repair parenthesized expression backtracking` — micro-fix independen untuk bug backtrack serupa di `_parsePrimaryExpression`, tidak terkait CSS).
- `npm ci` → 348 packages, 0 vulnerabilities. `npx vitest run` (baseline penuh) → **1234/1234 test PASS**, 68 file test.
- Node `v20.20.2` — di bawah `engines.node>=22.0.0`; hasil apa pun di dokumen ini bukan gate rilis final.
- **Status issue #79** (diverifikasi via GitHub API): masih **open**, judul "[v132 backlog] CSS scoping plumbing / component style isolation", memiliki 2 komentar — komentar kedua adalah sync dari sesi Lapis 1–3 sebelumnya (berhasil ter-posting), menegaskan status "partially wired, non-functional end-to-end" dan menyatakan next step adalah audit Lapis 4 ini.
- **File yang dibaca** (audit ini): `src/engine/css.js` (penuh, 458 baris — identik dengan yang dibaca di Lapis 1, tidak berubah), `src/engine/promptjs.js` (bagian pipeline CSS), `src/engine/builder.js` (bagian scope), `src/compiler/promptjs-compiler.js` (dibaca penuh di Lapis 1–3, di-cross-check ulang), `src/compiler/emitters/statements.js` (`visitKomponenDeclaration`, `visitBuatStatement` penuh; `grep` menyeluruh untuk `data-pjs`), `src/cli/commands/build.js` (penuh, termasuk `buildHtml`/`buildPrerenderedHtml`/prerender block), `src/cli/commands/serve.js` (bagian `compilePjs`/`wrapInHtml`), `docs/user/first-app.md` (bagian CSS), `docs/project/lim-mis-mapping-v132.md` (bagian LIM-05 + CSS scoping design decision), `tests/v11-block-comments.test.js` (penuh), `tests/v13-comment-stripping-regression.test.js` (penuh), `tests/v15-bug11b-css-in-build.test.js` (penuh), `tests/css-scoped-alias.test.js` (penuh), `tests/builder-integration.test.js` (bagian CSS).
- Semua temuan diverifikasi dengan **compile+build langsung** (bukan hanya membaca kode), termasuk uji baru yang belum pernah dilakukan sesi sebelumnya (multi-komponen dalam satu file, nested component scope collision).

---

## B. Peta Pipeline CSS Saat Ini

```
source .pjs
  │
  ├─▶ Plugins.transformSource (hook, opsional)
  │
  ├─▶ CSS.processGayaBlocks(source, this.options.scope)   ◀── src/engine/promptjs.js baris 85
  │     TERJADI SEBELUM LEXING. `this.options.scope` adalah SATU nilai string
  │     untuk SELURUH FILE (bukan per-komponen, bukan per-Gaya-block).
  │     │
  │     ├─▶ extractGayaBlocks(source, scope)          [css.js:127]
  │     │     Regex baris-per-baris `^(Gaya|Style):\s*$` — TIDAK sadar AST,
  │     │     TIDAK tahu apakah blok ini ada di dalam `Komponen X` atau
  │     │     di top-level halaman. Setiap blok yang ditemukan diberi
  │     │     `scope` yang SAMA (parameter tunggal yang diteruskan).
  │     │
  │     ├─▶ stripCSSComments(gayaSource)               [css.js:184]
  │     │     State-machine per-karakter, string-aware (BUG-04 fix,
  │     │     commit e24a30a) — menangani `/* */`, `//`, url(), string literal.
  │     │
  │     ├─▶ parseGayaRules(gayaSource, scope)          [css.js:288]
  │     │     Parser indent-based → CSSRule[] (selector, properties, children).
  │     │
  │     ├─▶ compileCSS(rules, scoped)                  [css.js:367]
  │     │     scoped=true → scopeSelector(translateCSSSelector(sel), rule.scope)
  │     │     scoped=false → translateCSSSelector(sel) saja (global, alias tag saja)
  │     │
  │     └─▶ scopeSelector(selector, scope)             [css.js:414]
  │           `.kartu` + scope `X` → `.kartu[data-pjs-x]` — MURNI STRING,
  │           tidak menyentuh AST/compiler/DOM sama sekali.
  │
  ├─▶ cleanSource (source TANPA blok Gaya) → Lexer.tokenize(cleanSource)
  │
  ├─▶ ... Parser → Resolver → Analyzer → Compiler.compile(ast) ...
  │     TIDAK ADA titik mana pun di compiler yang menerima/membaca nilai
  │     `scope` — AST tidak pernah diberi properti scope (beda dengan
  │     `ast.isSPA`/`ast.pageName`/`ast.butuhAuth` yang eksplisit di-attach
  │     di promptjs.js baris ~330). Compiler yang meng-emit
  │     `document.createElement(tag)` (statements.js `visitBuatStatement`,
  │     `visitKomponenDeclaration`) TIDAK PERNAH menyisipkan `setAttribute`
  │     apa pun terkait scope.
  │
  └─▶ _makeResult(js, errors, warnings, ast, css, sourceMap)
        `css` = string CSS (sudah/belum scoped SECARA STRING),
        `js`  = kode JS TANPA jejak scope apa pun.

── Output tahap dev/build/prerender ──

Dev server (src/cli/commands/serve.js, compilePjs):
  engine.compileFile(filePath, { dev:true, loadDataFiles:true, dataDir, source })
  ── TIDAK ADA `scope` di opsi ini ──
  → result.css (SELALU global, translateCSSSelector saja, TIDAK PERNAH scoped)
  → wrapInHtml(js, filePath, { css: result.css }) → `<style>${css}</style>` INLINE

Build CLI — mode Project (ada `pages/`, src/engine/builder.js buildProject):
  buildPage(filePath, { scope: path.basename(filePath, '.pjs') })
  ── scope = NAMA FILE HALAMAN, bukan nama komponen ──
  → per halaman: result.css di-gabung ke `allCss`
  → ditulis ke SATU file `dist/prompt.css` (gabungan semua halaman)
  → tiap halaman dapat `<link rel="stylesheet" href="prompt.css">` di HTML-nya
  → CSS STRING benar-benar scoped per halaman (`[data-pjs-<namahalaman>]`)
    TAPI JS-nya (`dist/prompt.js`) TIDAK PERNAH stamp atribut yang cocok

Build CLI — mode Legacy (single-file, TANPA `pages/`, src/cli/commands/build.js runBuild):
  engine.compileFile(filePath, { dev:false, loadDataFiles:true, dataDir, source })
  ── TIDAK ADA `scope` di opsi ini SAMA SEKALI ──
  → result.css SELALU GLOBAL (bukan cuma "non-functional scoped", tapi memang
    tidak pernah dicoba di-scope)
  → buildHtml(js, filePath, { css: result.css }) → `<style>${css}</style>` INLINE

Prerender (--prerender flag, HANYA tersedia di mode Legacy, TIDAK ADA di mode Project):
  Menggunakan `compiledResults` dari loop legacy (js, css per file, css SELALU global)
  → jsdom render `js` ke `<div id="app">`, ambil `innerHTML`
  → buildPrerenderedHtml(rendered, filePath, css) → `<style>${css}</style>` INLINE +
    HTML hasil render (bukan `<script>`, sudah di-"SSR" via jsdom)
```

---

## C. Perilaku Style Global Saat Ini

- **Default murni global**: setiap `Gaya:`/`Style:` block, apa pun konteksnya (top-level halaman ATAU di dalam `Komponen`), menghasilkan CSS standar tanpa scoping SAMA SEKALI kecuali caller secara eksplisit meneruskan opsi `scope` ke `Engine.compile()`/`compileFile()`.
- **Hanya SATU jalur runtime yang pernah meneruskan `scope`**: `src/engine/builder.js` (`buildProject`, mode Project multi-halaman) — dan nilainya adalah **nama file halaman**, bukan nama komponen.
- **Dev server dan mode Legacy build TIDAK PERNAH meneruskan `scope` sama sekali** — CSS di kedua jalur ini selalu 100% global, tanpa kemungkinan menjadi "scoped tapi rusak" — memang tidak pernah dicoba.
- **Bahkan saat `scope` diteruskan (mode Project)**, granularitasnya adalah **per file/halaman**, BUKAN per komponen — dikonfirmasi langsung: dua `Komponen` berbeda (`Kartu` dan `Modal`) yang dideklarasikan dalam SATU file `.pjs` menghasilkan `[data-pjs-<namafile>]` yang **SAMA** untuk keduanya, bukan `[data-pjs-kartu]` dan `[data-pjs-modal]` seperti yang dicontohkan di komentar header `src/engine/css.js` sendiri ("Scoped CSS per component: `Komponen Kartu(judul): Gaya: ...`").
- **Bahkan kalau granularitas itu benar, DOM stamping tidak pernah terjadi** — jadi hasil akhirnya, di SEMUA jalur (dev, build Project, build Legacy, prerender), style yang ditulis pengguna selalu berlaku SECARA GLOBAL di DOM nyata, terlepas dari apakah CSS *string*-nya sudah mengandung selector `[data-pjs-*]` atau tidak (karena atribut itu tidak pernah ada di elemen manapun, selector tersebut hanya tidak pernah match apa pun — CSS tersebut secara efektif menjadi *dead CSS*, bukan "leaked global").

---

## D. Status Scoping Saat Ini

### D.1 — Sudah Ada (terverifikasi via compile+build langsung)

| Komponen | Status | Evidence |
|---|---|---|
| `scopeSelector(selector, scope)` — transformasi string `.kartu` → `.kartu[data-pjs-x]` | ✅ Ada & benar | `src/engine/css.js:414`; `tests/css-scoped-alias.test.js` (6 test, semua PASS, termasuk kasus alias tag, compound selector, `@media` nested) |
| `translateCSSSelector` (alias tag Indonesia → HTML) dikomposisi dengan benar di jalur scoped MAUPUN non-scoped | ✅ Ada & benar | `css.js:81-101`; regresi BUG sebelumnya (`tombol[data-pjs-...]` bukannya `button[data-pjs-...]`) sudah diperbaiki, dites eksplisit |
| `extractGayaBlocks`/`parseGayaRules`/`compileCSS` menerima parameter `scope` dan mem-propagate-nya ke tiap `CSSRule.scope` | ✅ Ada & benar | `css.js:127-358`, diverifikasi baca kode + compile langsung |
| `Builder.buildProject` meneruskan `scope: path.basename(filePath, '.pjs')` per halaman | ✅ Ada & benar | `src/engine/builder.js:250`; `tests/builder-integration.test.js` ("extracts CSS and writes prompt.css" — PASS, CSS string benar-benar mengandung `h1[data-pjs-index]`) |
| Stripping komentar CSS string-aware (BUG-04) | ✅ Ada & benar, teruji lengkap | `css.js:184-279`; `tests/v11-block-comments.test.js` (16 test), `tests/v13-comment-stripping-regression.test.js` (10 test) — SEMUA PASS, termasuk edge case URL `https://`, string literal berisi delimiter comment |
| CSS ter-inline dengan benar ke HTML pada ketiga jalur output (dev/build/prerender) | ✅ Ada & benar (tapi selalu SEBAGAI STRING GLOBAL) | `serve.js:102-103`, `build.js:305-306` & `:321-333`; `tests/v15-bug11b-css-in-build.test.js` (BUG-11b, sudah diperbaiki dari kondisi SEBELUMNYA di mana CSS di-drop total dari HTML) |

### D.2 — Belum Ada / Belum Tersambung (terverifikasi via compile+build langsung, BUKAN dugaan)

| Gap | Status | Evidence |
|---|---|---|
| **DOM attribute stamping** — tidak ada `setAttribute('data-pjs-x', ...)` di compiler manapun | ❌ Tidak ada sama sekali | `grep -rn "data-pjs" src/compiler/` → **0 hasil**. Compile langsung `Engine.compile(src, {scope:'HalamanX'})` menghasilkan CSS `.kartu[data-pjs-halamanx]{...}` TAPI `r.js` (`grep data-pjs`) → **tidak ditemukan** |
| **Granularitas scope salah** — file-level, bukan component-level, meski dokumentasi header `css.js` mengklaim "Scoped CSS per component" | ❌ Desain tidak konsisten dengan dokumentasi sendiri | Compile langsung: dua `Komponen` (`Kartu`, `Modal`) dalam SATU file menghasilkan scope attribute **SAMA** (`data-pjs-myfile`), bukan berbeda per komponen |
| **`ast.scope` tidak pernah di-attach** — beda dengan `ast.isSPA`/`ast.pageName`/`ast.butuhAuth` yang eksplisit diteruskan dari engine ke compiler | ❌ Compiler tidak punya akses ke scope | `src/engine/promptjs.js` baris ~330-340: hanya `isSPA`, `pageName`, `pageRoute`, `butuhAuth*` yang di-attach ke `analyzeResult.ast`; `scope` TIDAK ADA di daftar ini |
| **Dev server tidak pernah meneruskan `scope`** | ❌ CSS di dev server SELALU global, tanpa upaya scoping sama sekali | `src/cli/commands/serve.js` baris 177-181: `engine.compileFile(filePath, {dev, loadDataFiles, dataDir, source})` — tidak ada key `scope` |
| **Mode Legacy build tidak pernah meneruskan `scope`** | ❌ Sama seperti dev server | `src/cli/commands/build.js` baris ~189-194 (jalur `runBuild` legacy): tidak ada key `scope` di opsi `compileFile` |
| **Prerender hanya ada di mode Legacy** — mode Project (multi-halaman) TIDAK PUNYA jalur prerender sama sekali | ❌ Gap arsitektural terpisah (bukan cuma soal CSS, tapi relevan untuk desain scoping karena keduanya harus konsisten) | `src/cli/commands/build.js`: blok `if (prerender)` (baris 244+) HANYA memproses `compiledResults` dari loop legacy; tidak ada pemanggilan setara untuk `Builder.buildProject` |
| **Tidak ada mekanisme opt-in/opt-out** — scope sepenuhnya tergantung pada apakah CALLER (builder/CLI/dev-server) memilih meneruskan opsi `scope`, TIDAK ADA sintaks PromptJS (front-matter, keyword) untuk developer memilih | ❌ Tidak ada permukaan bahasa untuk fitur ini sama sekali | `grep` menyeluruh di `src/parser/`, `src/lexer/` untuk `scope`/`cakupan` terkait CSS → tidak ditemukan; keputusan sepenuhnya di sisi tooling (builder), bukan sintaks `.pjs` |
| **Test yang ada tidak akan pernah menangkap gap ini** | ❌ Blind spot test yang sudah dikonfirmasi | `tests/css-scoped-alias.test.js` (murni unit test fungsi string), `tests/builder-integration.test.js` (assert `dist/prompt.css` doang, tidak pernah assert `dist/prompt.js`/`dist/index.html`) |

### D.3 — Verified vs Suspected

**Semua temuan di atas berstatus VERIFIED** (bukan suspected) — setiap klaim diverifikasi ulang di sesi ini dengan salah satu dari: (a) `grep` langsung terhadap source terbaru di HEAD `2868e3f`, (b) `node -e` compile langsung dengan opsi `scope` dan inspeksi `r.css`/`r.js`, (c) full CLI build (`node src/cli/index.js build ...`) dan inspeksi file output `dist/*.css`/`dist/*.js`/`dist/*.html`, (d) menjalankan test suite yang ada.

Tidak ada temuan "suspected" (belum diverifikasi) yang tersisa dari audit Lapis 1 sebelumnya — semua sudah dikonfirmasi ulang di HEAD terbaru ini, dan **temuan baru** (granularitas file vs komponen; dev-server & prerender-mode-Project tidak pernah mencoba scoping) ditambahkan sebagai perluasan dari audit sebelumnya.

---

## E. Alternatif Desain Scoping

| Model | Deskripsi | Kelebihan | Kekurangan / Risiko |
|---|---|---|---|
| **E1. Global-only / defer** | Biarkan seperti sekarang, hapus infrastruktur setengah-jalan atau biarkan apa adanya, dokumentasikan sebagai "tidak didukung" | Nol risiko baru, nol pekerjaan | Tidak menyelesaikan kebutuhan nyata (komponen reusable dengan style collision); infrastruktur CSS-string yang sudah ada jadi mubazir/membingungkan (kode "scoped" yang tidak pernah benar-benar men-scope apa pun) |
| **E2. Atribut scoped opt-in** (mirip Vue `data-v-xxxxxx`, sudah direkomendasikan draf desain sebelumnya) | Developer memilih file/komponen mana yang di-scope via directive eksplisit; default tetap global | Backward-compatible total (tidak ada proyek lama yang rusak); minim overhead runtime (hanya atribut statis); granularitas bisa disesuaikan (per file ATAU per komponen) | Butuh directive baru di front-matter/sintaks; developer harus eksplisit "mengaktifkan" — mudah lupa; tetap perlu compiler pass baru untuk stamping |
| **E3. Scoped by default + escape hatch global** | Semua `Gaya:` di dalam `Komponen` otomatis di-scope ke komponen tsb.; global butuh sintaks eksplisit (`:global(...)` atau blok `Gaya global:`) | Paling aman untuk KODE BARU (default aman, tidak ada footgun collision); sesuai ekspektasi umum developer modern (CSS Modules/Vue SFC style) | **BREAKING CHANGE untuk proyek lama** yang sudah punya `Gaya:` di dalam `Komponen` mengandalkan perilaku global saat ini (walau saat ini itu adalah bug bukan fitur, secara teknis tetap breaking); butuh migrasi/flag versi |
| **E4. Shadow DOM** | Setiap komponen dirender ke dalam shadow root asli browser, isolasi CSS otomatis dari browser | Isolasi PALING KUAT (bahkan dari CSS custom properties leak, `:host` styling asli) | Bertentangan dengan filosofi "zero-dependency, output vanilla sederhana" PromptJS; kompatibilitas SSR/prerender (jsdom) untuk Shadow DOM lebih rumit; styling global (misal reset CSS) jadi sulit menembus shadow boundary tanpa `::part`/`::slotted`; overhead konsep baru yang besar untuk codebase yang saat ini 100% DOM API polos |
| **E5. CSS Modules / hash-like model** | Setiap class di-hash unik saat compile (`.kartu` → `.kartu_a1b2c3`), classList di-rewrite otomatis di kedua sisi (CSS dan JS `className`) | Isolasi kuat tanpa Shadow DOM; sudah familiar bagi developer JS modern | Kompleksitas lebih tinggi dari atribut scoped (perlu rewrite `className`/`classList` di SEMUA titik kode yang menyentuhnya — `visitBuatStatement`, `on_kelas` binding, dsb. — bukan hanya SATU titik `createElement`); nama class di dalam JS string literal (`el.className = "kartu"`) HARUS ikut di-rewrite, meningkatkan permukaan bug |

---

## F. Rekomendasi Desain Final

**Model yang direkomendasikan: E2 (atribut scoped, OPT-IN, bukan default) — konsisten dengan draf desain yang SUDAH ADA di `lim-mis-mapping-v132.md`, dengan koreksi granularitas dan penambahan detail implementasi yang sebelumnya tidak eksplisit.**

Alasan memilih E2 dibanding E3 (default+escape-hatch): PromptJS v132 SUDAH punya kode berjalan yang menulis `Gaya:` di dalam `Komponen` dengan asumsi implisit "global" (walau itu sendiri adalah bug, bukan fitur yang didokumentasikan sebagai final) — mengubah default menjadi scoped berisiko mengejutkan proyek yang sudah ada tanpa jalur migrasi yang jelas. Opt-in menghormati prinsip "tidak ada proyek lama yang rusak" yang sudah ditulis eksplisit di draf desain sebelumnya.

### Sintaks PromptJS

Front-matter flag per file/halaman (paling sederhana, konsisten dengan pola `router: benar`/`butuhAuth: benar` yang sudah ada):

```pjs
---
gayaCakupan: benar
---
Komponen Kartu(judul):
    Gaya:
        .kartu
            background: white
    Buat div.kartu:
        Buat h3: judul
```

**Granularitas yang direkomendasikan: PER KOMPONEN, bukan per file** — ini KOREKSI terhadap draf desain lama (yang mengasumsikan per file/hash-path) dan terhadap implementasi builder saat ini (yang secara tidak sengaja sudah per-file). Alasan: dokumentasi `css.js` sendiri sejak awal mengklaim "Scoped CSS per component" — mengoreksi granularitas ke component-level sekaligus MEMENUHI klaim dokumentasi yang sudah ada dan lebih berguna (dua komponen berbeda dalam satu file TIDAK collide satu sama lain, sesuai ekspektasi developer yang menulis banyak komponen reusable per file). `Gaya:` di TOP-LEVEL halaman (di luar `Komponen` manapun) tetap dianggap "page scope" (scope = nama halaman) jika `gayaCakupan: benar` aktif — perilaku sekarang (builder sudah punya mekanisme ini) dipertahankan untuk kasus ini saja.

### Deklarasi Global Style

Setelah scoping opt-in tersedia, style yang perlu tetap global (reset CSS, layout dasar, font) dideklarasikan dengan salah satu dari dua cara:
1. **Tidak menyalakan `gayaCakupan: benar`** di file tersebut (default tetap global, sesuai perilaku hari ini) — cocok untuk file `layout.pjs`/`global.pjs` bersama.
2. **Escape hatch `:global(...)`** di dalam blok `Gaya:` yang scoped, untuk kasus jarang di mana SATU selector spesifik perlu menembus scope-nya sendiri (mis. styling elemen dari library eksternal yang di-`ambil dari` markup mentah).

### Alur Compiler

1. **Resolver** (bukan hanya engine-level `options.scope`) perlu menandai setiap `KomponenDeclaration` dengan scope id uniknya sendiri saat traverse — karena granularitas per-komponen berarti keputusan "scope mana" harus diketahui SAAT compiler mem-visit node di dalam `Komponen` tersebut, bukan sebagai satu nilai global untuk seluruh compile call.
2. **`extractGayaBlocks`** perlu diberi tahu "blok Gaya ini ada di dalam Komponen bernama X" — ini MEMERLUKAN PERUBAHAN ARSITEKTURAL: saat ini ekstraksi CSS terjadi SEBELUM lexing/parsing (murni regex atas source string mentah), sehingga tidak punya akses ke AST/nama komponen sama sekali. Ada dua opsi:
   - **(a) Pindahkan ekstraksi Gaya ke SETELAH parsing** (butuh AST node `GayaBlock`/`StyleBlock` sebagai child dari `KomponenDeclaration`/`Program`, diproses compiler seperti node lain) — perubahan besar pada urutan pipeline yang sudah mapan sejak awal (dari komentar "Wave I: CSS extraction (before lexing)").
   - **(b) Pertahankan ekstraksi regex-berbasis-string SEBELUM lexing, tapi buat regex tersebut sadar terhadap baris `Komponen <Nama>(...)：` sebagai penanda konteks** (mirip cara `_tokenizeBlockOpener` di lexer mendeteksi `Komponen`) — lebih kecil perubahannya, tapi tetap rapuh (duplikasi logika deteksi "component boundary" antara css.js dan lexer/parser, berisiko divergen seperti kasus P0.1's `VALID_MODIFIERS` yang dulu terduplikasi di dua tempat pada Lapis 1-3).
   - **Rekomendasi**: opsi (b) untuk v1.3.3 (lebih kecil, lebih cepat, cukup untuk model minimal), dengan CATATAN eksplisit bahwa opsi (a) adalah arah jangka panjang yang lebih bersih jika PromptJS nanti butuh fitur CSS-in-component yang lebih canggih (CSS variables per-instance, dsb.).
3. **Compiler `visitKomponenDeclaration`**: SEGERA setelah `document.createElement("div")` untuk `__root`, emit `__root.setAttribute("data-pjs-<hash>", "");` — hash di-generate dari NAMA KOMPONEN (bukan path file), konsisten dan deterministik across compile (bukan random) supaya build reproducible.
4. **Compiler `visitBuatStatement`**: elemen top-level di dalam body komponen (dan turunannya, KECUALI yang di dalam nested `Komponen` lain — itu dapat scope milik komponennya sendiri) mewarisi atribut scope yang sama. Cara paling sederhana: SETIAP elemen yang dibuat SELAMA proses `accept(node.body, this)` di dalam `visitKomponenDeclaration` mendapat `setAttribute` yang sama — bisa diimplementasikan dengan compiler state `this._currentComponentScope` (mirip pola `this.currentParent`/`this._inBuatBody` yang sudah ada), di-push/pop seperti stack yang sudah dipakai untuk `_saatCleanupStack`.

### Penulisan Ulang Selector

Tidak berubah dari implementasi yang SUDAH ADA dan SUDAH BENAR — `scopeSelector`/`translateCSSSelector`/`compileCSS` di `css.js` sudah bekerja dengan baik secara string-level (6 test PASS). Perubahan HANYA diperlukan pada bagaimana nilai `scope` diperoleh (per-komponen, bukan per-file) — bukan pada MEKANISME transformasi selector itu sendiri.

### Pembuatan Hash/Scope

Direkomendasikan **nama komponen di-lowercase langsung** (SAMA seperti implementasi `scopeSelector` hari ini: `data-pjs-${scope.toLowerCase()}`) untuk versi minimal — BUKAN hash acak/content-based. Alasan: nama komponen di PromptJS WAJIB PascalCase dan unik dalam satu file (tidak ada duplicate component name yang valid, berbeda dari CSS Modules yang biasanya butuh hash karena class name bisa duplikat lintas file). Risiko collision HANYA muncul jika dua KOMPONEN BERBEDA FILE punya nama sama persis (mis. dua file berbeda sama-sama punya `Komponen Kartu`) — ini kasus nyata yang perlu diputuskan: apakah dua `Kartu` di file berbeda harus dianggap "komponen yang sama" (scope sama, gaya digabung) atau "kebetulan nama sama" (harus scope berbeda, butuh disambiguasi file path). **Direkomendasikan: scope = `<namafile>_<namakomponen>` di-lowercase** untuk keamanan penuh, dengan biaya sedikit lebih verbose di atribut DOM — ini adalah keputusan desain yang HARUS dikonfirmasi eksplisit sebelum implementasi, karena mengubahnya nanti adalah breaking change pada atribut yang sudah di-generate.

### Cara Stamp Atribut DOM

**Gunakan `setAttribute` langsung, BUKAN `__safeAttr`/`emitSafeAttribute`.** Alasan: `__safeAttr` (dan helper `emitSafeAttribute` yang membungkusnya) dirancang untuk memfilter **nilai yang berasal dari ekspresi PromptJS milik pengguna** (potensi XSS/URL-scheme berbahaya, lihat security hardening S-4 dari audit sebelumnya) — nilai atribut scope adalah STRING LITERAL YANG DIHASILKAN COMPILER SENDIRI (bukan input pengguna), sehingga tidak butuh (dan tidak boleh disamakan dengan) jalur sanitasi runtime yang sama. Emit langsung: `${varName}.setAttribute("data-pjs-<scope>", "");` — lebih murah (tanpa helper runtime tambahan) dan lebih jelas maksudnya saat dibaca di output JS.

### Kompatibilitas Backward

- **Tanpa `gayaCakupan: benar`**: nol perubahan perilaku — proyek lama tetap compile dan berjalan identik.
- **Builder (`buildProject`) perlu diaudit ulang**: implementasi HARI INI sudah meneruskan `scope: path.basename(filePath, '.pjs')` TANPA syarat opt-in apa pun — begitu DOM-stamping diimplementasikan, SEMUA proyek yang memakai mode Project (punya `pages/`) akan TIBA-TIBA mendapat CSS yang benar-benar ter-scope per HALAMAN (bukan per komponen) tanpa mereka minta — ini sendiri berpotensi menjadi **breaking change tak terduga** kalau tidak ditangani hati-hati. **Rekomendasi eksplisit**: builder HARUS diubah untuk TIDAK meneruskan `scope` secara default lagi — hanya meneruskannya jika file punya front-matter `gayaCakupan: benar`, SAMA seperti mode Legacy dan dev-server.

### Batasan yang Harus Didokumentasikan

- Scoping HANYA memengaruhi selector yang ditulis di dalam blok `Gaya:` milik komponen/halaman yang sama — TIDAK memengaruhi CSS eksternal (`<link>` manual, CSS pihak ketiga).
- Scoping adalah **atribut selector**, BUKAN isolasi sungguhan seperti Shadow DOM — selector CSS Global (`*`, `body`, elemen tanpa class/id spesifik) yang ditulis TANPA `gayaCakupan` tetap bisa "menembus masuk" secara visual walau tidak "keluar" (anak komponen yang di-scope tetap child dari DOM biasa, bukan shadow tree — CSS global seperti `* { box-sizing: border-box; }` di file lain tetap berlaku untuk SEMUA elemen termasuk yang di dalam komponen scoped).
- `:global(...)` escape hatch HANYA valid di dalam blok `Gaya:` yang scoped — dipakai di luar konteks itu seharusnya menjadi no-op/warning, bukan error keras (supaya tidak mengejutkan salinan-tempel kode).

---

## G. Risiko Kompatibilitas dan Risiko Implementasi

**Risiko kompatibilitas:**
1. **Builder saat ini sudah "diam-diam" meneruskan scope per halaman TANPA opt-in** — jika DOM-stamping ditambahkan tanpa mengubah perilaku builder ini dulu, SEMUA proyek mode-Project yang ada akan otomatis mendapat CSS ter-scope per halaman begitu saja (lihat bagian F di atas) — ini HARUS diperbaiki BERSAMAAN dengan implementasi DOM-stamping, bukan setelahnya, supaya tidak ada jendela waktu di mana perilaku berubah tanpa opt-in eksplisit.
2. **Proyek yang (secara tidak sengaja) mengandalkan style GLOBAL dari `Gaya:` di dalam `Komponen`** — karena bug ini sudah ada sejak awal, ada kemungkinan (walau kecil) proyek nyata menulis style di dalam komponen dengan asumsi implisit "ini akan global juga" (misalnya styling children lewat descendant selector yang menembus batas komponen) — begitu opt-in diaktifkan, style itu akan berhenti berfungsi untuk anak yang bukan bagian dari komponen tersebut. Mitigasi: opt-in eksplisit (bukan default) sudah menangani ini untuk proyek YANG TIDAK opt-in; proyek yang MEMILIH opt-in perlu didokumentasikan dengan jelas soal perubahan perilaku ini.
3. **Interaksi dengan CSS scoping HARUS didefinisikan ulang jika/ketika slot/transclusion (#82) diimplementasikan** — audit Lapis 3 menemukan bahwa konten slot secara konseptual "milik" scope CALLER (bukan scope komponen yang menerima slot). Jika CSS scoping diimplementasikan LEBIH DULU tanpa mempertimbangkan slot, ada risiko konten slot mendapat atribut scope KOMPONEN (salah) alih-alih atribut scope HALAMAN PEMANGGIL (benar) — ini adalah pertanyaan desain yang SEHARUSNYA dijawab compiler dengan memberi elemen slot content atribut scope milik AST ASALNYA (scope caller), bukan scope tempat splice terjadi — MIRIP dengan cara resolver harus me-resolve identifier di slot content terhadap scope caller (rekomendasi Lapis 3 F).

**Risiko implementasi:**
1. **Perubahan arsitektural pada urutan pipeline** (opsi (a) di bagian F) berisiko tinggi — CSS extraction sudah SEBELUM lexing sejak desain awal ("Wave I"), memindahkannya ke setelah parsing adalah perubahan besar yang menyentuh banyak titik (`promptjs.js`, lexer front-matter parsing, dsb.) — direkomendasikan HANYA opsi (b) untuk v1.3.3.
2. **Duplikasi logika deteksi "component boundary"** antara `css.js` (jika memakai opsi b) dan lexer/parser (`_tokenizeBlockOpener`, `_parseDefineComponent`) — riwayat Lapis 1-3 sudah menunjukkan pola ini (dua salinan `VALID_MODIFIERS` yang berbeda) rawan divergen seiring waktu. Mitigasi: satu sumber kebenaran (mis. regex/util yang di-share, bukan diduplikasi).
3. **Kompiler perlu state baru (`_currentComponentScope`)** yang mirip `_saatCleanupStack`/`currentParent` — risiko regresi rendah jika mengikuti pola stack push/pop yang sudah terbukti, tapi TETAP butuh test menyeluruh untuk nested component (lihat bagian H).
4. **Builder harus diubah untuk membaca front-matter SEBELUM memutuskan scope** — saat ini `buildPage` meneruskan `scope` SEBELUM tahu apakah file itu punya `gayaCakupan: benar` (front-matter baru diparse di dalam `engine.compileFile`) — perlu urutan baca front-matter lebih awal di builder, atau meneruskan flag opt-in secara terpisah dan biarkan ENGINE yang memutuskan apakah scope benar-benar diterapkan (opsi kedua lebih aman, tidak mengubah urutan pemanggilan builder).

---

## H. Rencana Test untuk #79

Sebelum #79 layak dipertimbangkan untuk ditutup, MINIMAL diperlukan:

1. **Compile output CSS** — `r.css` benar-benar mengandung selector ter-scope PER KOMPONEN (bukan per file) untuk kasus dua komponen berbeda dalam satu file (regresi eksplisit terhadap temuan D.2 audit ini).
2. **Runtime DOM attribute stamping** — `r.js` yang di-`new Function()`-kan dan dijalankan menghasilkan elemen dengan `getAttribute('data-pjs-<scope>')` yang SESUAI dengan selector di `r.css` (test yang SAMA SEKALI TIDAK ADA hari ini — semua test CSS yang ada hanya string-level).
3. **Build HTML** (mode Project) — `dist/prompt.js` yang dijalankan (via jsdom atau `new Function`) menghasilkan DOM dengan atribut yang match selector di `dist/prompt.css` — bukan hanya assert isi string `prompt.css` seperti `tests/builder-integration.test.js` hari ini.
4. **Build HTML** (mode Legacy) — pastikan perilaku SESUAI desain (default global TANPA opt-in; dengan opt-in `gayaCakupan: benar`, scope diterapkan dan di-stamp).
5. **Prerender HTML** — output SSR (jsdom-rendered `innerHTML`) mengandung atribut scope yang sesuai (perlu test baru KARENA prerender saat ini hanya ada di mode Legacy — begitu opt-in scoping diimplementasikan, prerender+scoping WAJIB diuji bersamaan, sebelum diperluas ke mode Project kalau prerender-mode-Project suatu saat dibangun).
6. **Dev server output** — HTML dari `wrapInHtml` (live reload dev mode) juga menghasilkan DOM ter-scope dengan benar saat opt-in aktif — SAAT INI dev server tidak diuji sama sekali untuk CSS (hanya diuji lewat `cli-serve.test.js` untuk fungsi server-nya, bukan isi CSS).
7. **Nested components** — komponen `Induk` yang men-`Gunakan` komponen `Anak` di dalamnya: elemen milik `Anak` mendapat scope `Anak`, elemen milik `Induk` (di LUAR `Anak`) mendapat scope `Induk` — TIDAK saling tertukar/tercampur (regresi eksplisit terhadap temuan D.2 tentang nested component scope collision).
8. **Global escape hatch** — `:global(...)` di dalam blok scoped menghasilkan selector TANPA atribut scope, sementara selector lain di blok yang sama tetap ter-scope.
9. **Multiple pages** (mode Project) — dua halaman berbeda yang masing-masing punya komponen dengan NAMA SAMA (mis. keduanya punya `Komponen Kartu`) TIDAK saling collide — verifikasi keputusan desain scope=`<namafile>_<namakomponen>` (bagian F) benar-benar mencegah tabrakan lintas file.
10. **Regresi untuk CSS comments dan BUG-11b** — pastikan implementasi baru TIDAK merusak 16 test `v11-block-comments`, 10 test `v13-comment-stripping-regression`, dan 8 test `v15-bug11b-css-in-build` yang sudah PASS hari ini (dijalankan ulang di sesi ini, semua hijau, jadi ini adalah baseline yang harus tetap hijau setelah perubahan).
11. **Opt-out/tanpa `gayaCakupan`** — proyek TANPA front-matter tersebut menghasilkan CSS **identik byte-per-byte** dengan perilaku hari ini (jaminan backward compatibility, bukan hanya "berhasil compile" tapi "outputnya sama persis").

---

## I. Keputusan

### Siap diimplementasikan, atau masih perlu penelitian?

**Belum sepenuhnya siap untuk implementasi langsung** — desain di bagian F sudah cukup matang untuk MODEL MINIMAL (atribut opt-in, per-komponen), TAPI ada **satu keputusan desain yang HARUS dikonfirmasi eksplisit oleh maintainer sebelum baris kode pertama ditulis**: skema penamaan scope (`<namakomponen>` saja vs `<namafile>_<namakomponen>`) — karena ini mempengaruhi output atribut DOM yang, begitu dirilis, menjadi API publik implisit (developer bisa saja menulis CSS custom yang menargetkan `[data-pjs-kartu]` secara manual) dan mengubahnya nanti adalah breaking change.

### Jika siap, implementation stages yang aman:

1. **Stage 1 (paling kecil, paling aman)**: perbaiki builder agar TIDAK lagi meneruskan `scope` secara default tanpa opt-in (menutup risiko kompatibilitas G.1) — ini adalah PERBAIKAN BUG murni (perilaku diam-diam berubah tanpa consent), TIDAK memerlukan fitur baru, bisa dilakukan independen dari sisa desain.
2. **Stage 2**: tambahkan parsing front-matter `gayaCakupan: benar` (resolver/engine level) — murni parsing, belum ada efek compiler.
3. **Stage 3**: implementasikan DOM-stamping di compiler untuk granularitas PER FILE dulu (paling sederhana, sudah ada infrastrukturnya di builder) — sebagai langkah antara sebelum granularitas per-komponen, dengan test lengkap sesuai bagian H butir 1-6, 8, 10-11.
4. **Stage 4**: perluas ke granularitas per-komponen (butuh perubahan compiler state `_currentComponentScope` seperti dijelaskan di F) — dengan test lengkap butir 7 dan 9.
5. **Stage 5**: sinkronkan builder (mode Project) dan Legacy+dev-server agar SEMUA jalur memakai mekanisme opt-in yang sama secara konsisten.

### Jika belum siap, blocker:

- **Keputusan skema penamaan scope** (di atas) — WAJIB dijawab maintainer, bukan diasumsikan oleh implementer.
- **Interaksi dengan slot (#82)** — belum ada keputusan final tentang bagaimana scope diterapkan pada konten slot (lihat G.3) — TIDAK BLOCKING untuk Stage 1-3 (karena slot belum ada), TAPI harus diputuskan SEBELUM Stage 4 jika slot sudah diimplementasikan duluan.
- **Keputusan opsi (a) vs (b) untuk arsitektur ekstraksi** (bagian F) — direkomendasikan (b), tapi ini tetap keputusan yang perlu dikonfirmasi, bukan diasumsikan.

---

## J. Panduan Serah Terima untuk Lapis 5

1. **Bawa temuan "infrastruktur setengah-jalan" sebagai pola berulang** — Lapis 1 (CSS DOM-stamping), Lapis 3 (slot body `Gunakan` disalahartikan sebagai sibling), dan Lapis 4 ini (granularitas scope file vs komponen) semuanya menunjukkan pola yang sama: kode/dokumentasi mengklaim sesuatu bekerja lebih canggih dari implementasi sebenarnya. Untuk Lapis 5 (kemungkinan besar routing guards #81 berdasarkan urutan backlog), **JANGAN percaya komentar/dokumentasi tanpa compile+run langsung**.
2. **Pertanyaan terbuka untuk Lapis 5/implementasi CSS scoping mendatang**: bagaimana `butuhAuth`/routing guard berinteraksi dengan CSS scoped jika suatu saat ada styling khusus untuk "halaman terkunci"/"redirect state"? Kemungkinan tidak relevan, tapi perlu dicatat sebagai pertanyaan silang antar-layer.
3. **Item spesifik untuk diverifikasi ulang** (jangan percaya laporan diri sesi ini tanpa re-run): repro di bagian D.2 (`Engine.compile(src, {scope:'MyFile'})` dengan dua komponen) sudah dijalankan langsung, hasilnya tercatat lengkap di atas — bisa dipakai sebagai starting point regression test begitu implementasi dimulai.
4. **Larangan yang tetap berlaku**: jangan implementasikan CSS scoping tanpa keputusan desain skema penamaan (bagian I), jangan implementasikan #81/#82 di sini, jangan merge/tag/publish/PR, jangan tutup #79, jangan klaim release-ready/battle-ready/Pure-PJS-penuh/fixed. Semua klaim baru harus tetap evidence-first dengan nama file/fungsi/test/command.
5. **Commit baru dari maintainer** (`2868e3f`, micro-fix backtrack) sudah terverifikasi tidak berkaitan dengan CSS dan tidak menimbulkan regresi (1234/1234 test PASS) — dicatat di sini supaya Lapis 5 tidak perlu menyelidikinya ulang dari nol.

---

*Dokumen ini adalah keluaran Lapis 4. Semua temuan gap (bagian D.2) didokumentasikan dengan evidence compile+build langsung — TIDAK diimplementasikan, dan #79 TIDAK ditutup, sesuai scope audit murni read-only.*
