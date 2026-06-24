# PromptJS — Agent Handoff Document

> **Terakhir diperbarui:** 2026-06-24
> **Versi repo:** v0.9.9 (branch `feat/v0.9.9-maturation`, soon → main)
> **Tujuan:** Memungkinkan AI agent atau developer baru melanjutkan development tanpa konteks percakapan sebelumnya.

---

## 1. STATUS SAAT INI

| Item | Status |
|------|--------|
| Branch | `feat/v0.9.9-maturation` (PR belum dibuat) |
| CI | Hijau di GitHub Actions (Node 22.x + 24.x) |
| Tests | 392 passed, 3 skipped, 16 test files |
| Version | `0.9.0` di package.json (akan di-bump ke 0.9.9) |
| CHANGELOG | Sudah ada entry v0.5.0 s/d v0.9.0 |
| Fase selesai | FASE 0 (v0.5), FASE 1 (v0.6), FASE 2 (v0.7), FASE 3 (v0.8), FASE 4 (v0.9), v0.9.9 Maturation |
| Fase berikutnya | **v1.0.0 — FASE 5: Templates, Demo Apps, Docs, npm Publish** |

### Yang Sudah Selesai di v0.9.9

1. `peran` role check — compiler now emits runtime guard (`__peran !== __allowedPeran → redirect`)
2. `tokenKey` configurable token key — supports `tokenKey: auth_token` directive and dot notation `token: localStorage.auth_token`
3. `tokenKey` added to KNOWN_DIRECTIVES in lexer for implicit front-matter detection
4. 7 new auth tests (22 total in v0.9-auth.test.js)
5. 3 new CLI init templates: `spa`, `fullstack`, `blog`
6. doc-dev/ restructured by version/level/task/phase/type
7. v1.0-planning/ folder created with handoff and planning docs

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
    init.js     → pjs init -t <template>  (6 templates: basic, counter, gallery, spa, fullstack, blog)
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
├── tests/              (16 test files, 392 tests)
├── examples/           (3 .pjs files: counter, gallery, todo)
├── scripts/            (build-pages.js)
├── doc-dev/            (restructured by version/level/type)
│   ├── v0.x/           (historical: specs, roadmaps, reviews, decisions, reference)
│   ├── v1.0-planning/  (v1.0.0 preparation materials)
│   └── tutorial/       (tutorials)
├── assets/             (static assets for examples/showcase)
├── .github/workflows/  (ci.yml, pages.yml — updated to latest action versions)
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
| CI | GitHub Actions (checkout@v7, setup-node@v6) | `ci.yml` (lint+test+smoke), `pages.yml` (deploy) |
| Git hooks | Husky + lint-staged | Pre-commit: format + lint |

### npm Scripts

```
npm test          → vitest run (392 tests)
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
Lihat `doc-dev/v0.x/roadmap/ROADMAP-FULLSTACK-REALISTIS-FIXED.md` untuk analisis lengkap.

---

## 5. VERSI YANG SUDAH SELESAI

### v0.5.0 — FASE 0: Compiler Infrastructure
- Source Maps V3 + VLQ encoding
- Tree Shaking runtime helpers (emit hanya yang dipakai)
- Error Boundaries (try/catch di event handlers + lifecycle hooks)
- Tests: `tests/v0.5-compiler-infra.test.js`

### v0.6.0 — FASE 1: SPA Capability
- Lifecycle mount/unmount (factory function pattern per halaman)
- Client-side router (pushState + popstate, opt-in via `router: benar`)
- Multi-page SPA bundling di builder
- Tests: `tests/v0.6-spa.test.js`

### v0.7.0 — FASE 2: Data Fetching & Event Modifiers
- `Ambil dari URL:` diperkuat (auto async/await wrapper, request options)
- Event modifier `.cegah` (preventDefault)
- Tests: `tests/v0.7-data-fetching.test.js`

### v0.8.0 — FASE 3: Plugin System & Deployment Adapters
- Plugin system: 4 transform hooks (transformSource, transformJS, transformCSS, transformHTML)
- Config loader: `pjs.config.js` / `promptjs.config.js` with CLI merge
- Adapter Static: asset hashing, meta tags (OG), sitemap.xml, 404.html
- Adapter Node: self-contained server.js + Dockerfile + API proxy
- Adapter Vercel: Build Output API v3 (.vercel/output/)
- Tests: `tests/v0.8-adapter.test.js`

### v0.9.0 — FASE 4: Protected Content & Auth Pattern
- `butuhAuth: benar` di front-matter → compiler emit auth guard
- `redirect: "/login"` → redirect target jika tidak auth
- `token: localStorage` / `sessionStorage` → configurable token source
- `hapus localStorage.x` lowering → `localStorage.removeItem("x")`
- Login form pattern support
- Implicit front-matter detection for known directives
- Tests: `tests/v0.9-auth.test.js`

### v0.9.9 — Maturation & Documentation Overhaul
- `peran: admin` → runtime role check in auth guard (token check + peran check)
- `tokenKey: auth_token` → configurable token key name in `getItem()`
- Dot notation in `token:` directive: `localStorage.auth_token` → source + key
- `tokenKey` added to KNOWN_DIRECTIVES for implicit front-matter
- 7 new auth tests (22 total)
- 3 new CLI init templates: `spa` (SPA with routing), `fullstack` (auth + routing + peran), `blog` (data-driven)
- doc-dev/ restructured by version/level/type
- v1.0-planning/ folder with handoff, prerequisites, and demo app plans
- SYNTAX-REFERENCE.md created
- README.md rewritten for v0.9.9

---

## 6. VERSI BERIKUTNYA: v1.0.0 — FASE 5

### Prerequisites (see `doc-dev/v1.0-planning/V1.0-PREREQUISITES.md`)

v1.0.0 requires FASE 5 per the roadmap:
- 6 init templates ✅ (done: basic, counter, gallery, spa, fullstack, blog)
- 2 demo apps (need: todo-app, dashboard-app)
- Complete tutorial for v1.0.0
- Syntax reference ✅ (SYNTAX-REFERENCE.md created)
- CI/CD hardening (branch protection, release workflow)
- npm publish (package name, `npm publish --access public`)

### Critical Design Decisions for v1.0.0

1. **Package name** — `promptjs` vs `@promptjs/cli` vs `pjs` — must decide before npm publish
2. **Peran storage** — currently reads `__peran` from storage; should this be a configurable key?
3. **Multi-peran support** — current `peran: admin` is single-role; should v1.0 support `peran: admin,editor`?
4. **Tutorial language** — bilingual (ID+EN) or Indonesia-only?
5. **Breaking changes** — any API surface changes before 1.0.0 semver lock?

### Aturan Workflow

1. Buat branch `feat/v1.0.0-<scope>`
2. Implement per sub-fase, update CHANGELOG.md
3. Pastikan `npm run format:check && npm run typecheck && npm run lint && npm test` semua hijau
4. Jika tambah dependency: **SELALU jalankan `npm install` dan commit package-lock.json**
5. Commit, push, buat PR
6. User akan squash & merge

---

## 7. PITFALLS & LESSONS LEARNED

1. **SELALU commit package-lock.json** setelah `npm install` / `npm add`. `npm ci` di CI strict dan akan gagal jika lock file tidak cocok.

2. **JSDoc params yang `opts = opts || {}`** harus dideklarasikan optional (`[opts]`) di JSDoc, kalau tidak TypeScript akan error.

3. **`let` di dalam `try {}` block** tidak accessible di luar block. Deklarasikan di luar jika dipakai setelah try-catch.

4. **PromptJS keyword `salah` = false, `benar` = true** — BUKAN `palsu`. Ini prinsip bilingual yang sudah ditetapkan.

5. **`Saat` ≠ `Ketika`** — `Saat` adalah reactive watcher pada data variable, `Ketika` adalah event/lifecycle handler. Jangan tertukar.

6. **Auth guard IIFE** menutupi regular IIFE — jika `butuhAuth` aktif, compiler meng-suppress regular IIFE closing.

7. **Implicit front-matter detection** hanya mengenali key di KNOWN_DIRECTIVES set. Key baru HARUS ditambahkan ke set tersebut.

8. **Version di package.json** tidak otomatis di-update. Harus manual setiap release.

---

## 8. CARA MEMULAI (UNTUK AGENT BARU)

```bash
cd /path/to/promptjs
git checkout main
git pull origin main
npm ci
npm test                    # Pastikan 392 pass
npm run typecheck           # Pastikan 0 errors
npm run lint                # Pastikan 0 problems
```

Untuk mulai v1.0.0:
```bash
git checkout -b feat/v1.0.0-<scope>
# ... implement ...
npm run format:check && npm run typecheck && npm run lint && npm test
git add -A && git commit -m "feat: v1.0.0 — ..."
git push origin feat/v1.0.0-<scope>
# Buat PR via GitHub
```

---

## 9. KONTEKS ROADMAP LENGKAP

Roadmap lengkap ada di: `doc-dev/v0.x/roadmap/ROADMAP-FULLSTACK-REALISTIS-FIXED.md`

Ringkasan timeline:
```
v0.5 (FASE 0) ✅  → Source maps, tree shake, error boundaries
v0.6 (FASE 1) ✅  → Lifecycle mount/unmount, SPA router
v0.7 (FASE 2) ✅  → Ambil dari (diperkuat), event modifiers
v0.8 (FASE 3) ✅  → Plugin system, adapters (static/node/vercel)
v0.9 (FASE 4) ✅  → butuhAuth, auth pattern, login flow
v0.9.9          ✅  → peran role check, tokenKey, init templates, doc restructure
v1.0 (FASE 5) ⬜  → Demo apps, tutorial, CI/CD, npm publish
```

Setelah v1.0: LSP, hydration, component library, Rust/Go compiler port.
