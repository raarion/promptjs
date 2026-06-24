# PromptJS — Agent Handoff Document

> **Terakhir diperbarui:** 2026-06-24
> **Versi repo:** v0.8.0 (main, commit b3e5f31)
> **Tujuan:** Memungkinkan AI agent atau developer baru melanjutkan development tanpa konteks percakapan sebelumnya.

---

## 1. STATUS SAAT INI

| Item | Status |
|------|--------|
| Branch | `main` saja (semua stale branch sudah dihapus) |
| CI | Hijau di GitHub Actions (Node 22.x + 24.x) |
| Tests | 370 passed, 3 skipped, 15 test files |
| Version | `0.4.0` di package.json (BELUM diupdate ke 0.8.0) |
| CHANGELOG | Sudah ada entry v0.5.0 s/d v0.8.0 |
| Fase selesai | FASE 0 (v0.5), FASE 1 (v0.6), FASE 2 (v0.7), FASE 3 (v0.8) |
| Fase berikutnya | **FASE 4 — Protected Content & Auth Pattern (v0.9)** |

### Yang Perlu Ditindaklanjuti Segera

1. **Bump package.json version ke `0.8.0`** — saat ini masih `0.4.0`
2. **Pastikan Husky pre-commit hook bekerja** — `prepare` script ada, `.husky/` harus ada di repo

---

## 2. ARSITEKTUR PROYEK

### 2.1 Compiler Pipeline (4 Fase)

```
Source .pjs
    │
    ▼
[1] Lexer (src/lexer/promptjs-lexer.js)
    → Token stream
    │
    ▼
[2] Parser (src/parser/promptjs-parser.js)
    → AST (Abstract Syntax Tree)
    │
    ▼
[3] Resolver + Analyzer (src/resolver/, src/analyzer/)
    → Resolved AST + dependency graph
    │
    ▼
[4] Compiler (src/compiler/promptjs-compiler.js)
    → Visitor pattern, traverse AST
    → Emit JS via Codegen (src/compiler/utils/codegen.js)
    → Runtime helpers (src/compiler/emitters/runtime.js) — tree-shaken
    → Statements emitter (src/compiler/emitters/statements.js)
    → Expression lowerer (src/compiler/lower/expression.js)
```

### 2.2 Engine Layer

```
Engine (src/engine/promptjs.js)
    → PromptJSEngine class — orchestrator
    → CSS extraction (src/engine/css.js)
    → Module system (src/engine/modules.js)
    → Plugin system (src/engine/plugins.js) — v0.8
    → Config loader (src/engine/config.js) — v0.8
    → Builder (src/engine/builder.js) — multi-page build + SPA bundling
    → Router runtime (src/engine/router-runtime.js) — embedded, opt-in
    → Adapters (src/engine/adapters/) — static, node, vercel
```

### 2.3 CLI

```
src/cli/index.js → entry point
src/cli/commands/
    compile.js  → pjs compile file.pjs
    serve.js    → pjs serve (dev server + WebSocket live-reload)
    build.js    → pjs build [--adapter static|node|vercel] [--spa]
    init.js     → pjs init -t <template>
src/cli/utils.js → shared utilities
```

### 2.4 File Structure

```
promptjs/
├── src/
│   ├── lexer/          (1 file + test-lexer.js)
│   ├── parser/         (4 files: parser, ast-factory, token-types, error-codes)
│   ├── resolver/       (1 file)
│   ├── analyzer/       (2 files)
│   ├── compiler/       (4 files: compiler, codegen, statements, runtime + lower/)
│   ├── engine/         (8 files: promptjs, builder, css, modules, plugins, config, router-runtime)
│   │   └── adapters/   (3 files: node.js, static.js, vercel.js)
│   ├── cli/            (5 files: index, compile, serve, build, init, utils)
│   └── utils/          (1 file: visitor.js)
├── tests/              (15 test files, 370 tests)
├── examples/           (3 .pjs files: counter, gallery, todo)
├── scripts/            (build-pages.js)
├── doc-dev/            (ROADMAP files, this handoff)
├── assets/             (static assets for examples/showcase)
├── .github/workflows/  (ci.yml, pages.yml)
├── .husky/             (pre-commit hooks)
├── jsconfig.json       (JSDoc + checkJs config)
├── vitest.config.js
├── .prettierrc
├── .eslintrc.json
├── package.json
└── CHANGELOG.md
```

---

## 3. TEKNOLOGI & TOOLING

| Tool | Versi/Config | Keterangan |
|------|-------------|------------|
| Node.js | 24.x (dev), 22.x + 24.x (CI) | Node 20 sudah EOL |
| Runtime | Vanilla JS (CommonJS `require`) | Zero dependency di production output |
| Build tool deps | vitest, typescript, prettier, eslint | Hanya untuk dev |
| Testing | Vitest 4.x | `npm test` = `vitest run` |
| Type checking | TypeScript JSDoc (`checkJs: true`) | `jsconfig.json`, `npm run typecheck` |
| Linting | ESLint + Prettier | `npm run lint` (zero warnings allowed) |
| CI | GitHub Actions | `ci.yml` (lint+test+smoke), `pages.yml` (deploy) |
| Git hooks | Husky + lint-staged | Pre-commit: format + lint |

### npm Scripts

```
npm test          → vitest run (370 tests)
npm run typecheck → tsc --noEmit
npm run lint      → eslint . --max-warnings=0
npm run format    → prettier --write .
npm run format:check → prettier --check .
npm run build     → pjs build --minify
npm run pjs       → node src/cli/index.js (CLI access)
```

### CI Pipeline (harus selalu hijau)

1. Checkout + setup Node
2. `npm ci` — **PASTIKAN package-lock.json selalu di-sync!**
3. `npm run format:check`
4. `npm run typecheck`
5. `npm run lint`
6. `npm test`
7. Smoke compile: `pjs compile` file test
8. Compile all examples

---

## 4. 9 PRINSIP DESAIN (MENGIKAT)

```
① Zero dependency di production output
② Build tool boleh punya dependency
③ Readability setinggi prompt AI
④ Reactivity eksplisit, bukan auto-tracking
⑤ Tidak ada eval() / new Function()
⑥ Bilingual keyword (Indonesia + Inggris) sebagai prinsip arsitektural
⑦ Jembatan antara coding, vibe-coding, dan prompting
⑧ Zero syntax symbol — mengalir seperti menulis prompt
⑨ Meruntuhkan dinding pembatas dalam belajar pemrograman
```

**Setiap fitur baru HARUS diaudit terhadap prinsip ini.**
Lihat `doc-dev/ROADMAP-FULLSTACK-REALISTIS-FIXED.md` untuk analisis lengkap.

---

## 5. VERSI YANG SUDAH SELESAI

### v0.5.0 — FASE 0: Compiler Infrastructure
- Source Maps V3 + VLQ encoding
- Tree Shaking runtime helpers (emit hanya yang dipakai)
- Error Boundaries (try/catch di event handlers + lifecycle hooks)
- File: `src/compiler/utils/codegen.js`, `src/compiler/emitters/runtime.js`, `src/compiler/promptjs-compiler.js`
- Tests: `tests/v0.5-compiler-infra.test.js`

### v0.6.0 — FASE 1: SPA Capability
- Lifecycle mount/unmount (factory function pattern per halaman)
- Client-side router (pushState + popstate, opt-in via `router: benar`)
- Multi-page SPA bundling di builder
- File: `src/engine/router-runtime.js`, `src/engine/builder.js`, `src/compiler/emitters/statements.js`
- Tests: `tests/v0.6-spa.test.js`

### v0.7.0 — FASE 2: Data Fetching & Event Modifiers
- `Ambil dari URL:` diperkuat (auto async/await wrapper, request options)
- Event modifier `.cegah` (preventDefault)
- File: `src/compiler/emitters/statements.js`, `src/parser/promptjs-parser.js`
- Tests: `tests/v0.7-data-fetching.test.js`

### v0.8.0 — FASE 3: Plugin System & Deployment Adapters
- Plugin system: 4 transform hooks (transformSource, transformJS, transformCSS, transformHTML)
- Config loader: `pjs.config.js` / `promptjs.config.js` with CLI merge
- Adapter Static: asset hashing, meta tags (OG), sitemap.xml, 404.html
- Adapter Node: self-contained server.js + Dockerfile + API proxy
- Adapter Vercel: Build Output API v3 (.vercel/output/)
- `--adapter` flag di CLI build command
- File: `src/engine/plugins.js`, `src/engine/config.js`, `src/engine/adapters/*`, `src/cli/commands/build.js`
- Tests: `tests/v0.8-adapter.test.js` (42 tests)

---

## 6. VERSI BERIKUTNYA: v0.9 — FASE 4

### Protected Content & Auth Pattern

**Scope (dari roadmap):**
- `butuhAuth: benar` di front-matter → compiler emit auth guard (localStorage/sessionStorage check + redirect)
- `redirect: "/login"` → redirect target jika tidak auth
- `token: localStorage` / `sessionStorage` → configurable token source
- `peran: "admin"` → optional role check (v1.0+)
- `hapus localStorage.x` lowering → `localStorage.removeItem("x")`
- Login form pattern (sudah bisa dengan fitur yang ada, hanya docs)
- Core: ~50 baris tambahan

**File yang akan berubah:**
- `src/parser/promptjs-parser.js` — parse `butuhAuth`, `redirect`, `token`, `peran` di front-matter
- `src/compiler/emitters/statements.js` — emit auth guard wrapper
- `src/compiler/lower/expression.js` — lowering `hapus` pada MemberExpression
- `src/compiler/emitters/runtime.js` — mungkin helper baru untuk auth check
- `tests/v0.9-auth.test.js` — baru

**Estimasi:** ~50 baris core + ~200 baris tests = 2 minggu

### Aturan Workflow

1. Buat branch `feat/v0.9-auth`
2. Implement per sub-fase, update CHANGELOG.md setelah tiap fase
3. Pastikan `npm run format:check && npm run typecheck && npm run lint && npm test` semua hijau
4. Jika tambah dependency: **SELALU jalankan `npm install` dan commit package-lock.json**
5. Commit, push, buat PR
6. User akan squash & merge

---

## 7. BUG YANG SUDAH DIFIX DI SESI INI (REFERENCE)

| Bug | File | Fix |
|-----|------|-----|
| `spaJs` used before declaration | `src/engine/builder.js:292` | Tambah `let spaJs = '';` sebelum SPA block |
| `adapterResult` scoping | `src/engine/builder.js:281,425` | Pindah deklarasi ke scope fungsi |
| 16 JSDoc type errors | Multiple files | Buat params optional, fix @param names, tambah `plugins` + `sourceMap` |
| package-lock.json out of sync | `package-lock.json` | `npm install` — 676 lines added (48 packages missing) |

---

## 8. PITFALLS & LESSONS LEARNED

1. **SELALU commit package-lock.json** setelah `npm install` / `npm add`. `npm ci` di CI strict dan akan gagal jika lock file tidak cocok.

2. **JSDoc params yang `opts = opts \|\| {}`** harus dideklarasikan optional (`[opts]`) di JSDoc, kalau tidak TypeScript akan error karena `{}` tidak punya required properties.

3. **`let` di dalam `try {}` block** tidak accessible di luar block. Jika variabel dipakai di `return` setelah try-catch, deklarasikan di luar.

4. **Husky `prepare` script** memanggil `husky install` yang sudah deprecated. Masih bekerja tapi perlu diganti di v0.9.

5. **CI `branches` filter** di YAML — pastikan `[main]` tidak ter-corrupt. Cek dengan `python3 -c "open(...,'rb').read()"` jika ada keraguan (terminal display bisa strip `[m` sebagai ANSI escape).

6. **Version di package.json** tidak otomatis di-update. Harus manual. Saat ini masih `0.4.0`, harusnya `0.8.0`.

---

## 9. CARA MEMULAI (UNTUK AGENT BARU)

```bash
cd /home/z/my-project/promptjs
git checkout main
git pull origin main
npm ci
npm test                    # Pastikan 370 pass
npm run typecheck           # Pastikan 0 errors
npm run lint                # Pastikan 0 problems
```

Untuk mulai v0.9:
```bash
git checkout -b feat/v0.9-auth
# ... implement ...
npm run format:check && npm run typecheck && npm run lint && npm test
git add -A && git commit -m "feat: v0.9.0 — ..."
git push origin feat/v0.9-auth
# Buat PR via GitHub
```

---

## 10. KONTeks ROADMAP LENGKAP

Roadmap lengkap ada di: `doc-dev/ROADMAP-FULLSTACK-REALISTIS-FIXED.md`

Ringkasan timeline:
```
v0.5 (FASE 0) ✅  → Source maps, tree shake, error boundaries
v0.6 (FASE 1) ✅  → Lifecycle mount/unmount, SPA router
v0.7 (FASE 2) ✅  → Ambil dari (diperkuat), event modifiers
v0.8 (FASE 3) ✅  → Plugin system, adapters (static/node/vercel)
v0.9 (FASE 4) ⬜  → butuhAuth, auth pattern, login flow  (~2 minggu)
v1.0 (FASE 5) ⬜  → Templates, demo apps, docs, npm publish  (~2-3 minggu)
```

Setelah v1.0: LSP, hydration, component library, Rust/Go compiler port.