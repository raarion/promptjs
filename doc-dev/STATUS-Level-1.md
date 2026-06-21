# PromptJS — Level 1 Status Map (quick TODO)

> Snapshot cepat: apa yang **sudah** dan **belum** dikerjakan di Level 1.
> Detail lengkap & urutan: `ROADMAP-Level-1.md`. Keputusan desain: `ADR-001-level1-decisions.md`.
> Per snapshot ini: **238 tes lulus** (5 skip), lint 0 error/0 warning, smoke-compile OK, coverage 59%.

## ✅ Sudah selesai

### Wave A — Fondasi & jaring pengaman
- [x] Vitest + migrasi 24 tes manual → `tests/`
- [x] ESLint 10 (flat) + Prettier + `.editorconfig`
- [x] GitHub Actions CI: lint + test + smoke + typecheck (Node 20/22/24)
- [x] `CHANGELOG.md`, `CONTRIBUTING.md`, `ROADMAP-Level-1.md`
- [x] npm scripts: test, coverage, lint, format, build, typecheck
- [x] `engines.node >= 20.19`
- [x] Bug lint nyata diperbaiki: duplikat key `label`; komentar tak tertutup di `test-lexer.js`; `hasOwnProperty` tak aman (2); `no-case-declarations` (6)

### Wave B — Keputusan & ADR
- [x] ADR-001: halaman bernama (implement), kanon loop, desain komponen named-props

### Wave C — Implementasi fitur
- [x] **C1** Loop: counted loop `Ulangi N kali` / `Loop N times`; alias separator `in`/`dari`/`from`
- [x] **C2** Halaman bernama: `Halaman Beranda:` → `id="beranda"` (anonim tetap jalan)
- [x] **C3** Sistem Komponen (rebuild): `Komponen Nama(props):` + `Buat Nama(k: v)`; factory props-object; bilingual; alias `Definisikan`; error `E3004`
- [x] **C4** Ekspresi: operator kata, ternary `? :`, literal objek `{...}`

### Wave D — Pengujian komprehensif ✅
- [x] D1: Snapshot/golden test codegen per statement (44 tests + 5 bug fixes)
- [x] D2: Matriks tes negatif tiap kode `E####` (22 tests)
- [x] D2.1: Complex setup tests (9 tests + 3 bug fixes)
- [x] D3: Coverage gate + 111 tests (coverage 62%, gate at 60%)

### Wave F — Typing ✅
- [x] JSDoc + `checkJs` di titik panas; integrasi ke lint CI

### Wave G — Keyword Activation ✅
- [x] 16 keyword diaktifkan di lexer (simpan, ketika, berhenti, dipasang, dilepas,
      perbarui, gunakan, tampilkan, sembunyikan, hapus, kosongkan, ambil,
      arahkan, muatulang, kembali, jalankan)
- [x] Parser dispatch + parse methods untuk semua keyword
- [x] Expression lowering untuk action keywords
- [x] 5 error codes baru terpicu: E3003, E3005, E4001, E4011, E4101
- [x] 2 warning codes baru terpicu: W4102, W4103
- [x] 4 skipped tests di-aktifkan
- [x] 6 new negative tests untuk error/warning codes

## ⏳ Belum dikerjakan

### Wave E — Dokumentasi final
- [ ] Perbaiki contoh headline README ke sintaks valid
- [ ] Finalkan tabel fitur + alias event/tag (hapus placeholder `...`)
- [ ] Koreksi diagram struktur proyek (hapus `runtime/` & `src/promptjs/`, tambah `examples/`+`tests/`)
- [ ] `examples/` ≥3 `.pjs` runnable + diuji di CI
- [ ] Pass final CHANGELOG untuk rilis v0.3

## 🐞 Known issues (terlacak)
- ~~Operator kata belum dikenali parser (`3 kali 2` → E3001)~~ — **resolved di C4**:
  operator kata kini ditokenisasi langsung ke token operator yang sesuai.
