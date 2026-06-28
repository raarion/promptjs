# Testing / Pengujian

> docs/project/ > Testing

Cara menjalankan, memahami, dan menulis test untuk PromptJS. Di-*ground* ke skrip nyata di `package.json` dan struktur folder `tests/`.

How to run, understand, and write tests for PromptJS. Grounded in the actual scripts in `package.json` and the `tests/` folder structure.

---

## Test Runner / Test Runner

PromptJS menggunakan **Vitest** (`devDependencies` → `vitest`, `@vitest/coverage-v8`) dengan **jsdom** untuk simulasi DOM.

PromptJS uses **Vitest** with **jsdom** for DOM simulation.

| Perintah / Command | Fungsi / Purpose |
|---|---|
| `npm test` | Jalankan semua test sekali (`vitest run`). / Run all tests once. |
| `npm run test:watch` | Mode watch (`vitest`). / Watch mode. |
| `npm run coverage` | Laporan coverage (`vitest run --coverage`). / Coverage report. |

> Bukti / Evidence: `package.json` → `"scripts"`.

---

## Struktur `tests/` / `tests/` Structure

Test diorganisasi berdasarkan area dan milestone versi. Beberapa berkas penting:

Tests are organized by area and version milestone. Some notable files:

| Berkas / File | Cakupan / Coverage |
|---|---|
| `pipeline.test.js` | Pipeline kompilasi end-to-end. / End-to-end compilation pipeline. |
| `components.test.js` | Komponen & props. / Components & props. |
| `css-scoped-alias.test.js` | Scoped CSS & alias. / Scoped CSS & aliases. |
| `router-regex-escape.test.js` | Keamanan regex router. / Router regex safety. |
| `negative-errors.test.js`, `negative-complex.test.js` | Skenario error (negative tests). / Error scenarios. |
| `snapshot-codegen.test.js` | Snapshot output codegen (`__snapshots__/`). / Codegen output snapshots. |
| `v0.5-…` … `v1.0-release.test.js` | Test per milestone (infra compiler, SPA, data-fetching, adapter, auth, rilis). / Per-milestone tests. |
| `security/wave1-security.test.js`, `security/wave2-security.test.js` | Regresi keamanan (XSS, sanitasi). / Security regression. |
| `helpers/` | Utilitas test: `temp-fs.js`, report generators. / Test utilities. |
| `reports/` | Laporan terformat (`D1-snapshot.md`, `D2-negative.md`, `D3-coverage.md`). / Formatted reports. |

> Direktori di atas diverifikasi langsung dari tree repo `main`. / The directories above are verified directly from the repo `main` tree.

---

## Menjalankan Subset Test / Running a Test Subset

```bash
# Satu berkas / A single file
npx vitest run tests/components.test.js

# Berdasarkan nama test / By test name
npx vitest run -t "scoped css"

# Mode watch untuk satu berkas / Watch a single file
npx vitest tests/pipeline.test.js
```

---

## Menulis Test Baru / Writing a New Test

Pola umum: kompilasi sumber `.pjs`, lalu uji output JS atau DOM hasil eksekusinya di jsdom.

General pattern: compile a `.pjs` source, then assert on the JS output or on the executed DOM in jsdom.

```js
import { describe, it, expect } from "vitest";
// import API engine sesuai entry (src/engine/promptjs.js)
// import the engine API per the entry point (src/engine/promptjs.js)

describe("counter", () => {
  it("menambah hitung saat diklik / increments on click", () => {
    const sumber = `
---
judul: "Counter"
---
Halaman Counter:
  data hitung = 0
  Buat tombol#klik:
    "Tambah"
    on_klik = simpan hitung tambah 1 ke hitung
`;
    // 1. compile sumber → JS / compile source → JS
    // 2. jalankan di jsdom / run in jsdom
    // 3. simulasikan klik, assert nilai / simulate click, assert value
    expect(sumber).toContain("data hitung = 0");
  });
});
```

> Untuk pola test nyata, baca berkas `tests/*.test.js` yang relevan sebagai referensi. / For real test patterns, read the relevant `tests/*.test.js` file as a reference.

### Pedoman / Guidelines

1. **Satu perilaku per test** — nama `it(...)` mendeskripsikan satu ekspektasi. / **One behavior per test** — the `it(...)` name describes one expectation.
2. **Sertakan negative test** — pastikan input salah memunculkan kode error yang benar. / **Include negative tests** — ensure bad input raises the correct error code.
3. **Perbarui snapshot dengan sengaja** — jalankan `npx vitest run -u` hanya jika perubahan output memang diinginkan. / **Update snapshots deliberately** — run `npx vitest run -u` only when the output change is intended.
4. **Jangan turunkan coverage** — tambahkan test untuk kode baru. / **Don't lower coverage** — add tests for new code.

---

## Sebelum Commit / Before Committing

Jalankan gerbang kualitas lengkap (lihat [contributing.md](contributing.md)):

Run the full quality gate (see [contributing.md](contributing.md)):

```bash
npm test            # semua test hijau / all tests green
npm run lint        # ESLint 0 warning
npm run typecheck   # tsc tanpa error / tsc with no errors
npm run format:check
```

---

← [Compiler Pipeline](compiler-pipeline.md) · [Contributing →](contributing.md)
