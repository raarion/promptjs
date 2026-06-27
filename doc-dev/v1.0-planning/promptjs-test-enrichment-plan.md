# Rencana Enrichment Test Suite PromptJS

> **Tujuan:** menaikkan jumlah & kualitas test pass secara terukur agar PromptJS kompetitif di benchmark QA — **tanpa menggelembungkan angka secara artifisial**. Filosofi audit tetap: *test tanpa nilai pembuktian hanyalah angka; setiap test baru harus menutup risiko atau jalur kode nyata.*
>
> **Baseline saat ini (terverifikasi `npx vitest run --coverage`, 27 Jun 2026):**
> **490 test lulus · 21 file · coverage lines 75.38% · branch 63.3% · functions 79.07%**
> Versi tetap **v1.0.0**.

---

## 1. Realitas Benchmark — Kenapa "menyaingi" perlu didefinisikan ulang

Tabel QA benchmark menunjukkan React 10.000+ test, Vue 4.000+, Svelte 3.000+. Mengejar angka mentah itu **menyesatkan** karena ukuran proyek berbeda 50–200×. Metrik yang jujur & kompetitif:

| Metrik | Target realistis | Alasan |
|---|---|---|
| **Coverage lines** | 75.38% → **≥ 90%** | Sebanding dengan compiler matang (Svelte core ~90%+) |
| **Coverage branch** | 63.3% → **≥ 80%** | Branch coverage = kualitas test sebenarnya |
| **Test count** | 490 → **≥ 750** | Pertumbuhan organik dari menutup gap nyata |
| **Rasio test/KLOC** | ukur & publikasikan | Lebih jujur dari angka absolut |
| **Mutation score** | (baru) **≥ 70%** | Bukti test benar-benar mendeteksi bug |

> **Klaim benchmark yang boleh dibuat setelah ini:** "coverage ≥90% lines, ≥80% branch, mutation-tested" — jauh lebih kuat dari sekadar "490 vs 10.000 tests".

---

## 2. Peta Gap Coverage (dari data nyata, prioritas tertinggi dulu)

| Area | Lines now | Target | Gap | Prioritas |
|---|---|---|---|---|
| `cli/commands/serve.js` | **0%** | 70% | 🔴 besar | **P0** |
| `cli/commands/compile.js` | **23%** | 75% | 🔴 besar | **P0** |
| `compiler/lower/expression.js` | **44.58%** | 80% | 🟠 sedang | **P1** |
| `engine/modules.js` | **53.26%** | 80% | 🟠 sedang | **P1** |
| `cli/index.js` | 51.35% | 75% | 🟠 sedang | **P1** |
| `engine/builder.js` | 62.24% | 80% | 🟡 kecil | **P2** |
| `utils/visitor.js` | 63.97% | 85% | 🟡 kecil | **P2** |
| `parser/promptjs-parser.js` | 73.34% | 85% | 🟡 kecil | **P2** |
| `compiler/emitters/statements.js` | 70.94% | 85% | 🟡 kecil | **P2** |
| `resolver/promptjs-resolver.js` | 78.13% | 88% | 🟢 polish | **P3** |

---

## 3. Roadmap Bertahap (per fase, masing-masing dengan gerbang verifikasi)

### Fase A — Tutup nol & near-nol CLI (P0) · est. +40–60 test
**Target:** `serve.js` 0→70%, `compile.js` 23→75%.
- **Langkah konkret:**
  1. Refactor `runServe` agar mengembalikan **handle server** (`{ server, close() }`) sehingga bisa diuji in-process, bukan hanya via subprocess. *Perubahan produksi minimal, backward-compatible.*
  2. Test in-process untuk: routing static file, MIME types, live-reload SSE, **guard traversal S-6** (regresi langsung di unit, bukan hanya e2e), error 404/400.
  3. `compile.js`: uji single-file compile, output ke stdout vs file, flag `--source-map`, error path (file tak ada, syntax error → exit code).
- **Gerbang verifikasi:** `serve.js ≥ 70%`, `compile.js ≥ 75%`, semua test lama tetap lulus, ESLint/tsc clean.

### Fase B — Expression lowering & module system (P1) · est. +60–80 test
**Target:** `expression.js` 44→80%, `modules.js` 53→80%, `cli/index.js` 51→75%.
- **Langkah konkret:**
  1. Tabel-driven test untuk *setiap* operator & precedence di `expression.js` (aritmetika, logika, ternary, string concat, member access, call) — bilingual ID/EN.
  2. `modules.js`: `Gunakan`/import resolution, circular import, missing module, re-export.
  3. `cli/index.js`: argument parsing tiap subcommand, flag gabungan, help/version output, exit codes.
- **Gerbang verifikasi:** ketiga file ≥ target, branch coverage area naik ≥ 15pp.

### Fase C — Parser/emitter/visitor depth (P2) · est. +80–100 test
**Target:** parser, statements, builder, visitor ke ≥85%.
- **Langkah konkret:**
  1. **Property-based / fuzz-lite** untuk parser: generate `.pjs` valid acak → pastikan tidak crash & round-trip AST stabil.
  2. Snapshot test untuk tiap statement visitor (Buat/Jika/Ulangi/Komponen/Saat/Perbarui) pada output JS.
  3. `visitor.js`: `accept`/`traverse`/`getChildKeys` untuk semua node type.
- **Gerbang verifikasi:** ≥85% lines area parser/emitter, snapshot stabil.

### Fase D — Hardening regresi + Mutation Testing (P3) · est. +40 test + infra
**Target:** kunci permanen + bukti kualitas.
- **Langkah konkret:**
  1. Konsolidasi PoC S-1..S-6 menjadi `tests/security/security-regression.test.js` + dokumentasi `SECURITY.md`.
  2. Integrasikan **Stryker Mutator** (`@stryker-mutator/core` + vitest runner) — jalankan pada `src/compiler/` & `src/engine/`. Target mutation score ≥70%.
  3. Tambah test untuk mutant yang lolos (survived mutants) hingga skor tercapai.
- **Gerbang verifikasi:** mutation score ≥70% pada modul inti, semua regresi keamanan lulus.

---

## 4. Estimasi Akumulatif

| Fase | Test baru | Coverage lines (proyeksi) | Effort |
|---|---|---|---|
| Baseline | — | 75.38% | — |
| + Fase A | +40–60 | ~80% | 1–1.5 hari |
| + Fase B | +60–80 | ~85% | 1.5–2 hari |
| + Fase C | +80–100 | ~90% | 2–3 hari |
| + Fase D | +40 + infra | ~90% + mutation 70% | 1.5–2 hari |
| **Total** | **+220–280 → ~750+ test** | **≥90% lines, ≥80% branch** | **~6–9 hari** |

---

## 5. Prinsip Anti-Pattern (jangan dilanggar)

- ❌ **Jangan** menulis test "assert true" atau test tanpa assertion bermakna hanya demi menaikkan angka.
- ❌ **Jangan** menduplikasi test yang sudah ada dengan input trivial berbeda.
- ✅ **Wajib** setiap test baru menutup baris/branch nyata ATAU mendeteksi mutant nyata.
- ✅ **Wajib** mempertahankan 490 test existing tetap lulus (no regression).
- ✅ **Wajib** tetap pada **v1.0.0** dan tidak keluar dari visi PromptJS (compiler DSL bilingual → vanilla JS, zero-runtime-dependency).

---

## 6. Klaim Benchmark Baru yang Bisa Dipublikasikan (setelah eksekusi)

Setelah roadmap selesai, baris QA di `BENCHMARK.md` bisa diperbarui menjadi:

| Framework | Test Suite | Coverage (lines) | Coverage (branch) | Mutation |
|---|---|---|---|---|
| **PromptJS** | **750+ tests** | **≥90%** 🏆 | **≥80%** 🏆 | **≥70%** 🏆 |
| Svelte 5 | 3,000+ | ~90% | — | — |
| Vue 3 | 4,000+ | — | — | — |
| React 19 | 10,000+ | — | — | — |

> **Pesan kompetitif yang jujur:** "PromptJS mungkin punya test absolut lebih sedikit, tapi **coverage & mutation score-nya transparan dan tinggi** — kualitas, bukan kuantitas."

---

<sub>Rencana ini berbasis data coverage nyata per 27 Juni 2026 (Node, Linux x64). Semua target dapat diverifikasi via `npx vitest run --coverage`. Versi proyek tetap v1.0.0.</sub>
