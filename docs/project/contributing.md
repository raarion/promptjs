# Berkontribusi / Contributing

> docs/project/ > Contributing

Panduan ringkas untuk berkontribusi ke PromptJS. Versi lengkap ada di [`CONTRIBUTING.md`](https://github.com/raarion/promptjs/blob/main/CONTRIBUTING.md) di root repo. Di-*ground* ke skrip nyata di `package.json`.

A concise guide to contributing to PromptJS. The full version lives in [`CONTRIBUTING.md`](https://github.com/raarion/promptjs/blob/main/CONTRIBUTING.md) at the repo root. Grounded in the actual scripts in `package.json`.

---

## Prasyarat / Prerequisites

- **Node ≥ 22.0.0** (lihat `"engines"` di `package.json`). / See `"engines"` in `package.json`.
- **npm** untuk dependensi pengembangan. / npm for dev dependencies.
- Git.

```bash
git clone https://github.com/raarion/promptjs.git
cd promptjs
npm install
```

---

## Alur Kontribusi / Contribution Flow

1. **Fork & branch** — buat branch fitur dari `main`. / Create a feature branch off `main`.
   ```bash
   git checkout -b fitur/nama-singkat
   ```
2. **Tulis kode + test** — setiap perubahan perilaku wajib disertai test. / Every behavior change must include tests. Lihat [testing.md](testing.md).
3. **Jalankan gerbang kualitas** (lihat bagian berikut). / Run the quality gate (next section).
4. **Commit** — pesan jelas dan deskriptif. / Clear, descriptive commit messages.
5. **Pull Request** — jelaskan *apa* dan *mengapa*, tautkan issue terkait. / Explain *what* and *why*, link related issues.

> Catatan: hook Git dikelola oleh **husky** (`"prepare": "husky"`) dan **lint-staged**, sehingga sebagian cek berjalan otomatis saat commit. / Git hooks are managed by **husky** and **lint-staged**, so some checks run automatically on commit.

---

## Gerbang Kualitas (QA Gate) / Quality Gate

Sebelum membuka PR, **semua** perintah berikut harus lulus tanpa error/warning:

Before opening a PR, **all** of the following must pass with zero errors/warnings:

| Perintah / Command | Standar / Standard |
|---|---|
| `npm test` | Semua test hijau (`vitest run`). / All tests green. |
| `npm run lint` | ESLint **0 warning** (`--max-warnings=0`). / Zero ESLint warnings. |
| `npm run typecheck` | `tsc --noEmit` tanpa error (`jsconfig.json`). / No type errors. |
| `npm run format:check` | Prettier konsisten. / Prettier-consistent formatting. |

Perbaiki otomatis bila perlu / Auto-fix where possible:

```bash
npm run lint:fix
npm run format
```

> Bukti / Evidence: `package.json` → `"scripts"`.

---

## Prinsip Desain yang Wajib Dijaga / Design Principles to Uphold

Kontribusi harus konsisten dengan filosofi PromptJS:

Contributions must stay consistent with the PromptJS philosophy:

1. **Zero dependency di output produksi** — jangan tambahkan runtime dependency. / **Zero dependency in production output** — do not add runtime dependencies.
2. **Tanpa `eval()` / `new Function()`** — semua kode dikompilasi statis. / **No `eval()` / `new Function()`** — all code is statically compiled.
3. **Bilingual keyword** (ID + EN) harus tetap menghasilkan output identik. / Bilingual keywords must keep producing identical output.
4. **Reaktivitas eksplisit** — tidak ada auto-tracking ajaib. / **Explicit reactivity** — no magic auto-tracking.
5. **Keamanan fail-closed** — jaga sanitasi codegen; jangan melemahkan filter atribut/HTML. / **Fail-closed security** — preserve codegen sanitization; don't weaken attribute/HTML filters.

> Lihat / See: [getting-started.md](../user/getting-started.md) (9 prinsip desain), [security.md](../language/security.md).

---

## Menambah Keyword / Alias Baru / Adding a New Keyword / Alias

Karena PromptJS bilingual, penambahan keyword harus berpasangan (ID + EN) dan diuji:

Because PromptJS is bilingual, new keywords must come in pairs (ID + EN) and be tested:

1. Daftarkan pasangan keyword di lexer/resolver. / Register the keyword pair in the lexer/resolver.
2. Pastikan kedua bentuk meng-compile ke output yang sama. / Ensure both forms compile to identical output.
3. Tambahkan entri ke [keywords.md](../language/keywords.md). / Add an entry to keywords.md.
4. Tambahkan test (positif + negatif). / Add tests (positive + negative).

---

## Melaporkan Bug / Reporting Bugs

Buka issue di [GitHub Issues](https://github.com/raarion/promptjs/issues) dengan: versi Node, langkah reproduksi, sumber `.pjs` minimal, output yang diharapkan vs aktual, dan kode error (bila ada).

Open an issue on [GitHub Issues](https://github.com/raarion/promptjs/issues) with: Node version, reproduction steps, a minimal `.pjs` source, expected vs actual output, and the error code (if any).

> Lihat / See: [reference/error-codes.md](../reference/error-codes.md).

---

← [Testing](testing.md) · [Kembali ke Index / Back to Index](../README.md)
