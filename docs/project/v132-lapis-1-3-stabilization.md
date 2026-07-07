# PromptJS v132 — Lapis 1–3 Stabilization Pass

**Status dokumen**: SELESAI (P0 + sebagian P1 diperbaiki dan diverifikasi; P2 disinkronkan, tidak diimplementasikan penuh)
**HEAD awal terverifikasi (sebelum perubahan apa pun)**: `94a02f1bf2fd99be1d5b9423cff99c7e32b5792b` (realtime, `git fetch origin && git reset --hard origin/v132`)
**HEAD akhir (lokal, belum di-push)**: lihat `git log --oneline` di branch `v132` lokal — 10 commit baru di atas `94a02f1`
**Node saat audit**: v20.20.2 / npm 10.8.2 — **DI BAWAH** `engines.node>=22.0.0` yang disyaratkan `package.json`. Semua hasil test/gate di pass ini dicatat dengan caveat ini; **bukan gate rilis final** sampai diverifikasi ulang di Node ≥22.
**Kebijakan**: TIDAK ADA merge ke `main`, TIDAK ADA tag release, TIDAK ADA `npm publish`, TIDAK menutup issue kecuali acceptance criteria terpenuhi DAN scope-nya jujur dinyatakan terbatas — **tidak ada issue yang ditutup dalam pass ini**.
**Akses GitHub**: read-only (GitHub public API via curl). TIDAK ADA kredensial push/auth tersedia di environment sandbox ini (tidak ada `gh` CLI, tidak ada token tersimpan) — semua commit di atas dibuat **lokal ke branch `v132`, TIDAK di-push ke `origin`**. User perlu mem-push manual (mis. lewat `push-console.html` yang sudah ada di workspace, dengan PAT mereka sendiri) atau lewat mekanisme lain yang mereka kontrol. Draft update issue untuk #79/#82/#81 disiapkan di bagian bawah dokumen ini sebagai TEKS, bukan benar-benar diposting ke GitHub.

---

## Baseline sebelum perubahan apa pun

- `git rev-parse HEAD` = `94a02f1bf2fd99be1d5b9423cff99c7e32b5792b`
- `git rev-list --left-right --count origin/main...origin/v132` = `0  22` (v132 22 commit di depan main, 0 di belakang) — tidak berubah dari audit Lapis 1-3.
- `npm ci` → 348 packages, EBADENGINE warning untuk `lint-staged`/`listr2` (dev-only, Node 22 requirement) — dicatat, bukan blocker untuk kerja lokal.
- `npx vitest run` (baseline, SEBELUM perubahan apa pun) → **1180/1180 test PASS**, 66 file test.

## Baseline setelah semua perubahan pass ini

- `npx vitest run` → **1226/1226 test PASS**, 67 file test (66 file lama + `tests/v19-p0-stabilization.test.js` baru, 46 test baru).
- `npm run typecheck` → bersih.
- `npm run lint` → bersih (`eslint . --max-warnings=0`).
- `npm run format:check` → bersih (`prettier --check .`).
- `npm run build` → 16/16 file contoh compiled, 0 failed (sama seperti baseline sebelumnya).
- `npm audit` → 0 vulnerabilities.
- `npm pack --dry-run` → sukses, 345 file total (naik dari 342 di histori sebelumnya karena file baru).
- **Tidak ada regresi**: seluruh 1180 test lama tetap lulus persis seperti sebelumnya, di HEAD manapun sepanjang 10 commit baru.

---

## P0 — Status Akhir

### P0.1 — `.sekali`/`.once` event modifier silent no-op → **DIPERBAIKI**
- **Root cause**: compiler `MODIFIER_MAP` di `visitKetikaStatement` (`src/compiler/emitters/statements.js`) tidak punya entry untuk `sekali`/`once` — parser sudah benar menangkapnya di `node.modifiers`, tapi compiler mengabaikannya diam-diam.
- **Fix**: `.sekali`/`.once` sekarang dideteksi terpisah (karena semantiknya opsi `addEventListener` ke-3, bukan statement di dalam handler body seperti `.cegah`/`.hentikan`) dan menghasilkan `{ once: true }` di argumen ketiga `addEventListener`, baik di jalur SPA maupun non-SPA.
- **Bonus fix**: ditemukan bug independen — logika backtrack di `_parseKetikaStatement` memakai `this._pos--` padahal field yang benar adalah `this.pos`, sehingga backtrack tidak pernah benar-benar bekerja. Diperbaiki sekalian karena berada di jalur kode yang sama.
- **Bonus fix**: `.capture`/`.passive`/`.self`/`.exact` (modifier yang dikenal dari framework web lain tapi belum diimplementasikan) sekarang menghasilkan warning **W2005** eksplisit, bukan diam-diam diabaikan.
- **Test**: `tests/v19-p0-stabilization.test.js`, describe block `P0.1` (11 test, semua PASS) — mencakup `.sekali`/`.once` tunggal, kombinasi dengan `.cegah`/`.hentikan`, bentuk inline `on_x.sekali = ...`, dan verifikasi `.capture` menghasilkan diagnostic.
- **Commit**: `a1200fb`, `9594ff2` (bagian parser), `b290931` (kode W2005), `91b8bd7` (forwarding warning parser).

### P0.2 — Event handler biasa di dalam `Saat` (SPA) bocor ke cleanup global → **DIPERBAIKI**
- **Root cause**: `visitKetikaStatement` jalur SPA selalu `__cleanupFns.push(...)` tanpa pernah mengecek `_saatCleanupStack`.
- **Fix**: dirutekan lewat helper baru `registerCleanup()` (generalisasi dari `wrapTrackedSubscription`) — cleanup listener sekarang masuk ke array lokal `Saat` terdekat jika ada, baru fallback ke `__cleanupFns` (SPA top-level).
- **Test**: describe block `P0.2` (4 test, semua PASS) — codegen shape, runtime tidak bertambah tanpa batas, elemen lama tidak lagi merespons klik setelah re-render, `unmount()` tetap membersihkan listener yang belum sempat re-render.
- **Commit**: `cf374c3` (helper), `a1200fb` (call site).

### P0.3 — `ikat` input→state di dalam `Saat` (SPA) bocor → **DIPERBAIKI**
- **Root cause**: `emitTwoWayBinding` arah input→state punya bug identik dengan P0.2 (asimetri — arah state→input sudah benar sejak fix #77, arah lainnya tidak).
- **Fix**: sama, dirutekan lewat `registerCleanup()`.
- **Test**: describe block `P0.3` (5 test, semua PASS) — kedua arah binding diverifikasi tetap bekerja setelah re-render, listener lama benar-benar mati.
- **Commit**: `cf374c3`, `a1200fb`.

### P0.4 — Event handler per-item di reactive list bocor saat re-render → **DIPERBAIKI**
- **Root cause**: baik non-keyed (K1a, full re-render) maupun keyed (K1b, `__keyedList`) tidak pernah membersihkan listener item lama sebelum node-nya dibuang/diganti.
- **Fix non-keyed**: setiap render list sekarang punya array cleanup lokal (dideklarasikan di luar callback `__watch`, persis seperti pola `Saat`), di-drain di awal setiap render sebelum `replaceChildren()`.
- **Fix keyed**: setiap node item punya `__pjsCleanup` miliknya sendiri (bukan array per-render, karena node keyed bisa DI-REUSE lintas render) — `__keyedList` (runtime.js) men-drain `__pjsCleanup` node yang di-replace/di-remove, node yang di-reuse (`__pjsSame` true) sama sekali tidak disentuh.
- **Test**: describe block `P0.4` (6 test, semua PASS, termasuk 2 test berbasis jsdom untuk keyed list karena butuh `insertBefore`/`nextSibling` asli) — non-keyed tidak bertambah tanpa batas, item lama tidak merespons klik, keyed node yang sama-persis di-reuse tanpa double-cleanup, keyed node yang berubah nilainya di-cleanup dengan benar, item baru tetap berfungsi.
- **Commit**: `cf374c3` (stack reuse), `a1200fb` (K1a), `5c33a4d` (K1b runtime).

### P0.5 — Inline `ambil ... ke ...` di dalam `Saat` bocor AbortController + race condition → **DIPERBAIKI**
- **Root cause**: `visitAmbilLuarStatement` sama seperti P0.2/P0.3 — `AbortController` baru dibuat tiap render tapi hanya di-abort saat unmount total, sehingga request lama (stale) bisa resolve belakangan dan menimpa data terbaru.
- **Fix**: `registerCleanup()` juga diterapkan di sini — saat `Saat` re-render, `AbortController` render sebelumnya benar-benar di-abort SEBELUM render baru dimulai.
- **Test**: describe block `P0.5` (4 test, semua PASS) — codegen, tidak bertambah tanpa batas, **request stale tidak menimpa data terbaru** (diverifikasi dengan skenario 3 request async yang resolve tidak berurutan), `unmount()` tetap meng-abort request yang sedang berjalan.
- **Commit**: `cf374c3`, `a1200fb`.

### P0.6 — `Buat NamaKomponen(prop: val):` (trailing colon) rusak karena lexer → **DIPERBAIKI**
- **Root cause**: regex `_tokenizeBlockOpener` untuk deteksi component-invocation mensyaratkan baris berakhir PERSIS di `)` (anchor `$`), sehingga bentuk dengan trailing colon tidak pernah match, jatuh ke pencarian "colon pertama" yang salah menangkap colon di DALAM tanda kurung.
- **Fix**: regex sekarang menerima trailing `:` opsional setelah `)`, diemit sebagai `TK_COLON` yang benar.
- **Test**: describe block `P0.6` (6 test, semua PASS) — **mengompilasi contoh PERSIS dari `docs/language/components.md` dan `docs/language/syntax-reference.md` apa adanya**, memverifikasi selector normal (`Buat div.kartu:`) dan atribut bracket berisi colon tidak terpengaruh, bentuk tanpa colon tetap bekerja.
- **Commit**: `b1df02e`.

### P0.7 — `Gunakan NamaKomponen(...):` dengan child block diam-diam jadi sibling → **DIPERBAIKI (diagnostic, bukan slot)**
- **Root cause**: `_parseGunakanStatement` tidak pernah mengecek token setelah `)`, sehingga colon+block yang ditulis user tertinggal di token stream dan di-parse ulang sebagai statement independen oleh block level di atasnya.
- **Fix**: parser sekarang mengecek `TK_COLON`+`TK_INDENT` setelah props, mengonsumsi (membuang) block tersebut, dan memunculkan error **E2030** yang jelas. **Ini BUKAN implementasi slot** — hanya mencegah silent-miscompile, sesuai instruksi eksplisit untuk tidak mengimplementasikan slot penuh dalam pass ini.
- **Test**: describe block `P0.7` (4 test, semua PASS) — diagnostic muncul, pesannya menyebut "slot"/"child"/"blok", konten tidak lagi ter-render sebagai sibling, `Gunakan` tanpa child block tetap bersih tanpa diagnostic terkait slot.
- **Commit**: `9594ff2`.

---

## P1 — Status Akhir

### P1.1 — Dynamic component `dipasang` hook setelah SPA mount → **TIDAK DIPERBAIKI, DIDOKUMENTASIKAN**
- **Verifikasi ulang** (compile+run manual, konsisten dengan temuan Lapis 3): komponen yang dibuat SETELAH `mount()` awal (via reactive list yang bertambah atau `Saat` yang baru render belakangan) TIDAK PERNAH memicu hook `dipasang`-nya, karena `__dipasangFns`/`__dilepasFns` adalah array PAGE-LEVEL yang hanya di-`forEach` sekali di titik `mount()`/`unmount()` — bukan per-instance komponen.
- **Kenapa tidak diperbaiki di pass ini**: ini memerlukan perubahan arsitektural (lifecycle level-instance komponen, bukan level-halaman) yang berisiko tinggi mengubah semantik timing untuk kode yang sudah bekerja hari ini, dan tidak ada mekanisme "tahu kapan komponen benar-benar ter-attach ke DOM" yang murah untuk diimplementasikan tanpa observer tambahan (MutationObserver, yang sudah dipakai untuk `Ketika dipasang` bentuk event tapi TIDAK untuk lifecycle `dipasang:` bentuk komponen). Sesuai instruksi eksplisit ("jika butuh desain besar, dokumentasikan dan buka/update issue follow-up"), ini didokumentasikan sebagai gap yang tetap ada, bukan dipaksa fix cepat.
- **Rekomendasi next step**: perlu keputusan desain terpisah (kemungkinan di Lapis 2/3 follow-up atau issue baru) tentang bagaimana instance-level lifecycle untuk komponen dinamis harus bekerja — opsi yang mungkin: (a) `MutationObserver` pada root komponen, (b) memanggil `dipasang`-nya langsung di titik factory dipanggil DAN diketahui akan segera di-attach (butuh kontrak baru antara compiler dan caller), (c) menunda keputusan sampai ada kebutuhan nyata dari dogfooding.
- **Tidak ada test baru ditambahkan untuk ini** karena tidak ada fix — perilaku status-quo (yang sudah gagal) tetap sama, sudah didokumentasikan di audit Lapis 3 sebelumnya.

### P1.2 — PascalCase validation (E2003) tidak aktif → **DIPERBAIKI**
- **Root cause**: E2003 didefinisikan lengkap di registry (`error-codes.js`) dan didokumentasikan di `components.md`, tapi tidak pernah dipanggil oleh parser/resolver/analyzer manapun.
- **Fix**: `visitKomponenDeclaration` di Analyzer sekarang memvalidasi `/^[A-Z]/` pada nama komponen, memunculkan E2003 jika gagal.
- **Test**: describe block `P1.2` (3 test, semua PASS) — nama lowercase menghasilkan E2003, PascalCase tetap bersih, alias `Definisikan` tidak terpengaruh.
- **Commit**: `f3c4761`.

### P1.3 — Unknown/typo prop tidak divalidasi → **DIPERBAIKI (warning, bukan error)**
- **Root cause**: `visitGunakanStatement` tidak pernah membandingkan prop yang diberikan caller dengan parameter yang dideklarasikan komponen.
- **Fix**: Analyzer sekarang membandingkan nama prop terhadap `declarationNode.params`, memunculkan **W4005** (warning, bukan error — scope komponen chained ke deklarasi, jadi ada skenario sah di mana "unknown" prop sengaja dikonsumsi lewat scope luar) untuk prop yang tidak cocok, dengan saran berisi daftar parameter yang valid.
- **Test**: describe block `P1.3` (4 test, semua PASS) — typo menghasilkan W4005 dengan saran benar, prop valid tidak memicu warning, default parameter tidak menghasilkan false-positive, bentuk `Buat NamaKomponen(...)` juga tervalidasi (AST sama).
- **Commit**: `f3c4761`.

---

## P2 — Status Akhir (sinkronisasi saja, tidak diimplementasikan penuh)

### P2.1 — CSS scoping `#79` → **STATUS DIPERBARUI, TIDAK DIIMPLEMENTASIKAN**
- `docs/project/lim-mis-mapping-v132.md` (entri LIM-05) diperbarui untuk mengoreksi klaim "design not started" menjadi **"partially wired, non-functional end-to-end"** — sesuai temuan Lapis 1: sisi string CSS (`scopeSelector`, `processGayaBlocks`) dan plumbing builder (per-halaman `scope`) sudah lengkap, tapi compiler TIDAK PERNAH menempelkan atribut `data-pjs-*` ke elemen DOM manapun, sehingga selector scoped tidak pernah match.
- **Tidak ada implementasi ditambahkan** — sesuai instruksi eksplisit, keputusan desain penuh ditunda ke Lapis 4.
- **Commit**: `fb824a9`.

### P2.2 — Slots `#82` → **DIAGNOSTIC MINIMAL DITAMBAHKAN (bukan full slots)**
- Lihat P0.7 di atas — `Gunakan NamaKomponen(...):` dengan child block sekarang menghasilkan E2030, bukan silent miscompile.
- `docs/project/lim-mis-mapping-v132.md` (entri MIS-08) dan `docs/language/components.md` diperbarui untuk mendokumentasikan fix ini sebagai "minimal safeguard", BUKAN implementasi slot — desain slot penuh tetap tercatat sebagai deferred ke v1.3.3/v1.4.0, tidak berubah dari audit Lapis 3.
- **Commit**: `fb824a9` (docs), `9594ff2` (kode P0.7).

### P2.3 — Routing guards `#81` → **DIBIARKAN BACKLOG, TIDAK DISENTUH**
- Tidak ada perubahan kode maupun dokumentasi terkait #81 dalam pass ini, sesuai instruksi eksplisit.

---

## Files Changed (ringkasan)

```
src/parser/error-codes.js                  — kode diagnostic baru (W2005, E2030)
src/parser/promptjs-parser.js              — P0.1 (backtrack fix, modifier tables),
                                              P0.7 (child-block diagnostic)
src/lexer/promptjs-lexer.js                — P0.6 (colon-in-parens fix)
src/compiler/promptjs-compiler.js          — registerCleanup() helper baru
src/compiler/emitters/statements.js        — P0.1 ({once:true}), P0.2 (Ketika),
                                              P0.3 (ikat), P0.4 (K1a list cleanup)
src/compiler/emitters/runtime.js           — P0.4 (__keyedList per-item cleanup)
src/analyzer/promptjs-analyzer.js          — P1.2 (E2003), P1.3 (W4005)
src/engine/promptjs.js                     — forward parser warnings
docs/language/components.md                — P0.6/P0.7 verifikasi + P1.2/P1.3 catatan
docs/project/lim-mis-mapping-v132.md       — P2.1/P2.2 status sync
tests/v19-p0-stabilization.test.js         — BARU, 46 test (semua P0 + P1.2/P1.3)
```

**Total**: 10 commit lokal di atas `94a02f1` pada branch `v132`, TIDAK di-push ke `origin`.

---

## Draft Update Issue GitHub (BELUM diposting — tidak ada kredensial di environment ini)

### Draft untuk #79 (biarkan tetap OPEN)

```md
Update from `v132` Lapis 1–3 Stabilization Pass.

This issue should remain open.

Checked:
- HEAD (local, not yet pushed): 10 commits above `94a02f1` on `v132`
- Evidence:
  - `src/engine/css.js` (`scopeSelector`, `processGayaBlocks`) — fully implemented, generates correct `[data-pjs-<scope>]` selectors
  - `src/engine/builder.js` (`buildProject`) — passes `scope` per page, correctly wired
  - `grep -rln "data-pjs" src/` — confirms the string ONLY appears in `css.js`, never in any compiler/statement-emitter file
  - Full CLI build test (`node src/cli/index.js build ... `) confirms `dist/prompt.css` contains correctly-scoped selectors while `dist/prompt.js` never sets the corresponding `data-pjs-*` attribute on any element

Current result:
- Confirmed the correct status is "partially wired, non-functional end-to-end", not "not started" — the CSS-string generation and builder plumbing already exist and work correctly in isolation, but the missing DOM-attribute-stamping half means scoped selectors can never match a real element in practice.
- `docs/project/lim-mis-mapping-v132.md` (LIM-05 entry) has been corrected to reflect this.

Blocker:
- Full fix requires stamping `data-pjs-<scope>` onto the root element in `visitBuatStatement`/`visitKomponenDeclaration` (src/compiler/emitters/statements.js) plus a Lapis 4 (CSS Architecture) design decision on opt-in vs default scoping, page-level vs component-level scope granularity, and interaction with the legacy single-file build mode (which doesn't attempt scoping at all today).

Next step:
- Lapis 4 CSS Architecture audit to produce the actual design decision and, if approved, the implementation.

No merge/tag/npm publish is recommended.
```

### Draft untuk #82 (biarkan tetap OPEN)

```md
Update from `v132` Lapis 1–3 Stabilization Pass.

This issue should remain open.

Checked:
- HEAD (local, not yet pushed): 10 commits above `94a02f1` on `v132`
- Evidence:
  - `src/parser/promptjs-parser.js` (`_parseGunakanStatement`) — previously silently miscompiled a `Gunakan NamaKomponen(...):` child block as unrelated sibling statements, with zero diagnostics
  - `tests/v19-p0-stabilization.test.js` (P0.7 describe block, 4 tests) — confirms the fix

Current result:
- A minimal safeguard has been added: writing a child block under `Gunakan NamaKomponen(...):` now produces a clear **E2030** error instead of silently compiling it in the wrong place. This is explicitly NOT a slots/transclusion implementation — it only prevents a confusing silent-wrong compile while the real feature remains designed-but-unbuilt.
- The existing minimal-slots design (default-slot only, closure-based, documented in `docs/project/lim-mis-mapping-v132.md` § Slots design decision) remains the recommended direction, unchanged by this pass.

Blocker:
- Full slots/transclusion implementation remains deferred to v1.3.3/v1.4.0 per the existing design decision — this pass deliberately did not implement it, per explicit stabilization-pass scope boundaries.

Next step:
- A future Lapis 3/4 follow-up (or dedicated implementation session, with maintainer approval) to build the minimal default-slot model.

No merge/tag/npm publish is recommended.
```

### Draft untuk #81 (biarkan tetap OPEN, tidak ada perubahan)

```md
Update from `v132` Lapis 1–3 Stabilization Pass.

This issue should remain open. No changes were made in this pass related to routing guards — explicitly out of scope per the stabilization-pass task list (P2.3: "Biarkan sebagai backlog architecture. Jangan implement di pass ini kecuali diminta khusus.").

No merge/tag/npm publish is recommended.
```

---

## Master Tracker (belum dibuat sebagai issue GitHub baru — draft saja)

Jika user (dengan akses push/API yang sesuai) ingin membuat issue tracker baru untuk pass ini:

**Title**: `[v132] Lapis 1–3 Stabilization Pass — parser, lifecycle cleanup, component syntax`

**Body** (draft):

```md
## v132 Lapis 1–3 Stabilization Pass

Verified on realtime `origin/v132`, HEAD `94a02f1bf2fd99be1d5b9423cff99c7e32b5792b` at start.
10 commits added locally on top (not yet pushed — see PR/branch for details).

### P0 (all fixed, all with regression tests in `tests/v19-p0-stabilization.test.js`)
- [x] P0.1 — `.sekali`/`.once` event modifier now emits `{ once: true }`
- [x] P0.2 — `Ketika` inside `Saat` (SPA) cleanup now routed via `registerCleanup()`
- [x] P0.3 — `ikat` input→state listener cleanup symmetry fixed
- [x] P0.4 — reactive list per-item event handler cleanup (keyed + non-keyed)
- [x] P0.5 — inline `ambil` inside `Saat`: AbortController cleanup + stale-race fixed
- [x] P0.6 — `Buat NamaKomponen(prop: val):` trailing-colon lexer bug fixed
- [x] P0.7 — `Gunakan NamaKomponen(...):` child block now diagnosed (E2030), not silently miscompiled

### P1
- [ ] P1.1 — dynamic component `dipasang` hook after SPA mount — DEFERRED, documented, needs design decision
- [x] P1.2 — E2003 PascalCase validation activated
- [x] P1.3 — W4005 unknown-prop warning added

### P2 (synced, not implemented)
- CSS scoping (#79): status corrected to "partially wired, non-functional end-to-end"
- Slots (#82): minimal E2030 diagnostic added; full slots still deferred
- Routing guards (#81): untouched, remains backlog

### Policy
- No merge to `main`, no tag, no `npm publish` in this pass.
- Node used for local verification: v20.20.2 (does NOT satisfy `engines.node>=22.0.0` — final release gate must be re-run on Node ≥22).
- No claim of "battle-ready", "full Pure PJS", or "production-ready full-stack" is made.
```

---

## Final Gate Results (Node 20.20.2 — NOT a substitute for a Node ≥22 final gate)

```
npx vitest run          → 1226/1226 tests PASS, 67 files (was 1180/66 before this pass)
npm run typecheck        → clean
npm run lint             → clean (eslint . --max-warnings=0)
npm run format:check     → clean (prettier --check .)
npm run build            → 16/16 examples compiled, 0 failed
npm audit                → 0 vulnerabilities
npm pack --dry-run       → success, 345 files inspected
```

**Caveat eksplisit**: environment ini menjalankan Node v20.20.2, DI BAWAH `engines.node>=22.0.0`. Hasil di atas TIDAK dianggap sebagai release gate final — perlu dijalankan ulang di Node ≥22 sebelum klaim rilis apa pun dibuat.
