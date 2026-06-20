# PromptJS — Level 1 Status Map (quick TODO)

> Snapshot cepat: apa yang **sudah** dan **belum** dikerjakan di Level 1.
> Detail lengkap & urutan: `ROADMAP-Level-1.md`. Keputusan desain: `ADR-001-level1-decisions.md`.
> Per snapshot ini: **52 tes lulus**, lint 0 error/0 warning, smoke-compile OK.

## ✅ Sudah selesai

### Wave A — Fondasi & jaring pengaman
- [x] Vitest + migrasi 24 tes manual → `tests/`
- [x] ESLint 10 (flat) + Prettier + `.editorconfig`
- [x] GitHub Actions CI: lint + test + smoke (Node 20/22/24)
- [x] `CHANGELOG.md`, `CONTRIBUTING.md`, `ROADMAP-Level-1.md`
- [x] npm scripts: test, coverage, lint, format, build
- [x] `engines.node >= 20.19`
- [x] Bug lint nyata diperbaiki: duplikat key `label`; komentar tak tertutup di `test-lexer.js`; `hasOwnProperty` tak aman (2); `no-case-declarations` (6)

### Wave B — Keputusan & ADR
- [x] ADR-001: halaman bernama (implement), kanon loop, desain komponen named-props

### Wave C — Implementasi fitur
- [x] **C1** Loop: counted loop `Ulangi N kali` / `Loop N times`; alias separator `in`/`dari`/`from`
- [x] **C2** Halaman bernama: `Halaman Beranda:` → `id="beranda"` (anonim tetap jalan)
- [x] **C3** Sistem Komponen (rebuild): `Komponen Nama(props):` + `Buat Nama(k: v)`; factory props-object; bilingual; alias `Definisikan`; error `E3004`
- [x] **C4** Ekspresi (3 sub-fitur — **selesai**):
  - [x] Operator kata `dan`/`atau` + pembanding kata (`lebih dari`, `kurang dari`, `sama dengan`, `tidak sama dengan`, `paling sedikit`, `paling banyak`) + aritmetika kata (`tambah`/`kurang`/`kali`/`bagi`/`mod`/`pangkat`). Simbol tetap jalan; sufiks counted-loop `kali`/`times` tetap aman.
  - [x] Ternary `? :` (TK_QUESTION, right-assoc, resolver menelusuri reaktif `.value`)
  - [x] Literal objek `{...}` — key identifier **& string/number**; nilai boleh ekspresi C4 + data reaktif

## ⏳ Belum dikerjakan

### Wave D — Pengujian komprehensif
- [ ] Snapshot/golden test codegen per statement
- [ ] Matriks tes negatif tiap kode `E####`
- [ ] Coverage ≥80% + nyalakan gerbang coverage di CI (baseline saat ini ~45%)

### Wave E — Dokumentasi final
- [ ] Perbaiki contoh headline README ke sintaks valid
- [ ] Finalkan tabel fitur + alias event/tag (hapus placeholder `...`)
- [ ] Koreksi diagram struktur proyek (hapus `runtime/` & `src/promptjs/`, tambah `examples/`+`tests/`)
- [ ] `examples/` ≥3 `.pjs` runnable + diuji di CI
- [ ] Pass final CHANGELOG untuk rilis v0.3

### Wave F — Typing
- [x] JSDoc + `checkJs` di titik panas; integrasi ke lint CI

## 🐞 Known issues (terlacak)
- ~~Operator kata belum dikenali parser (`3 kali 2` → E3001)~~ — **resolved di C4**:
  operator kata kini ditokenisasi langsung ke token operator yang sesuai.
