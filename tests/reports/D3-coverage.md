# D3 — Coverage Gate

> **Wave**: D3
> **Tanggal**: 2026-06-21
> **Statistik**: 233/238 tests pass (5 skip) • Coverage 62.38% (target: 80%)

---

Coverage gate untuk mencegah regression. Threshold di-set di level saat ini + buffer, dengan dokumentasi path menuju 80%.

## Yang ditambahkan

- `tests/cli-utils.test.js` — 28 tests untuk `src/cli/utils.js` (findPjsFiles, makeColors, formatDiagnostic, resolveOutputPath, ensureDirForFile, formatSize, formatElapsed, printDiagnostics) + `compileOne` dari `cli/commands/compile.js`.
- `tests/ast-factory-coverage.test.js` — 62 tests untuk semua `buat*` functions di `src/parser/ast-factory.js`.
- `tests/cli-visitor-coverage.test.js` — 21 tests untuk `src/utils/visitor.js` (CollectingVisitor, formatAST, accept, traverse, getChildKeys).
- `vitest.config.js` — coverage threshold gate: global 60% statements / 50% branches / 55% functions / 60% lines.

## Path menuju 80%

Coverage 62.38% → 80% butuh tambahan ~17.6%. Strategi untuk mencapai:

### 1. Implementasi keyword yang belum ada (~+8%)
Keyword yang belum diimplementasi di lexer menyebabkan banyak code path di resolver, analyzer, dan compiler tidak pernah dieksekusi:
- `simpan`, `ketika`, `berhenti`, `dipasang`, `perbarui`, `gunakan`, `Tampilkan`, `Sembunyikan`, `Hapus`, `Kosongkan`

### 2. Test CLI commands dengan mocking (~+5%)
- `cli/index.js` — mock `process.exit` untuk test `main()` dispatch
- `cli/commands/build.js` — mock `jsdom` untuk test HTML prerender
- `cli/commands/init.js` — test scaffold template dengan temp-fs.js
- `cli/commands/serve.js` — mock `http.Server` untuk test dev server

### 3. Test compiler statement emitters yang belum covered (~+4%)
Banyak `visit*Statement` di `statements.js` (46% coverage) belum dites karena keyword-nya belum diimplementasi. Implementasi keyword (poin 1) akan otomatis menutup gap ini.
