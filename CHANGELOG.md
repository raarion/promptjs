# Changelog

All notable changes to PromptJS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — v1.0 Documentation & Bug Fixes

### Fixed — Compiler & Parser Bugs

- **BUG-1 (HIGH)**: Sibling `Buat` blocks with `Ketika` event handlers no longer
  trigger E3005. The parser's `_parseBuatStatement` now correctly merges inline
  content (e.g. `Buat tombol: "Click"`) with a subsequent indented block body
  (e.g. `Ketika diklik:`). Previously, the `Ketika` was parsed as a sibling
  rather than a child, causing the resolver to lose the `buatStack` context.
  Files: `src/parser/promptjs-parser.js`
- **BUG-2 (MEDIUM)**: `tampilkan "string"` now correctly lowers to `alert("string")`
  instead of `document.querySelector("string")`. The compiler auto-detects when
  the target is a string literal or expression (not a DOM selector) and treats
  it as a message. Files: `src/compiler/emitters/statements.js`
- **BUG-3 (LOW)**: `Ketika muat:` now maps to `DOMContentLoaded` (same as
  `Ketika dimuat:`) instead of the `load` event which never fires on non-resource
  elements. Files: `src/compiler/emitters/statements.js`
- **BUG-4 (LOW)**: Removed duplicate `visitJalankanExpression` definition in
  `statements.js` (lines 1459 and 1628). The second definition silently overrode
  the first; the surviving one delegates to `lowerExpression` for robustness.
- **BUG-5 (LOW)**: `__mount` runtime helper is now registered in `compiler.helpers`
  Set when emitted by `visitTampilkanStatement` mount path, preventing potential
  `ReferenceError` at runtime.
- **BUG-6 (LOW)**: Removed dead `currentCleanup` variable from router-runtime.
  The cleanup was already handled inside `unmount()` via `__cleanupFns`; the
  separate `currentCleanup` hook was never assigned.
- **BUG-7 (LOW)**: Populated `ERROR_MESSAGES` for 9 warning codes that previously
  had no message template: W1001, W2001–W2004, W3001–W3003, W5001, W5002.
  These now display proper messages instead of falling back to "Error tidak
  dikenal". Files: `src/parser/error-codes.js`
- **BUG-8 (LOW)**: Removed redundant `transformJS`/`transformCSS` plugin hook
  calls in `builder.js` that were duplicating work already done inside
  `Engine.compile()`. Non-idempotent plugins no longer double-apply transforms.
- **BUG-10 (LOW)**: Static adapter now removes original `prompt.js`/`prompt.css`
  after writing hashed copies. Vercel adapter now moves (not copies) files into
  `.vercel/output/static/`, eliminating duplicate files in `dist/`.

### Changed — Documentation

- **README.md** rewritten as concise landing page (~160 lines, down from 795).
  Repositioned from "mini-DSL template engine" to "bahasa frontend deklaratif
  bilingual". Content moved to structured `docs/` directory.

### Added — Tests

- 7 new regression tests in `tests/v1.0-release.test.js` covering BUG-1, BUG-2,
  and BUG-3 fixes.

## [1.0.0] — 2026-06-24

**Stable Release.** The first production-ready milestone of PromptJS. This release
solidifies all previously experimental features, introduces demo applications,
and prepares the package for public npm distribution as `prompt-js`.

### Added — Demo Applications [EXAMPLES]

- **`examples/todo-app/`** — A reactive to-do list application demonstrating
  `data` declarations, `Ulangi` loops, inline `on_klik` handlers,
  `hapus ... dari ...` array removal, and `simpan` localStorage persistence.
  Includes its own README with build instructions.
- **`examples/dashboard-app/`** — A full SPA dashboard with authentication,
  role-based access control, client-side routing, and per-page settings.
  Demonstrates `butuhAuth: benar`, `peran: admin`, `tokenKey: auth_token`,
  `router: benar`, `arahkan` navigation, and `simpan`/`hapus` with
  localStorage/sessionStorage. Five pages: index, login, dashboard, profil,
  pengaturan. Includes its own README.

### Added — `hapus <item> dari <array>` (HapusDariStatement) [CORE]

- **Statement path** (inside `Ketika diklik:` blocks) — the resolver already
  supported `HapusDariStatement`; now the expression path (inline
  `on_klik = hapus item dari daftar`) also parses and compiles it correctly.
- **Parser expression path** — added `dari`/`from` token check after parsing
  `hapus` target in inline event handlers, emitting `buatHapusDariStatement`.
- **Expression lowerer** — new `HapusDariStatement` case in
  `src/compiler/lower/expression.js` handles both reactive (`.value.filter`
  + `__setState`) and plain array filter output.
- **English keyword** — `from` token accepted as alias for `dari` in expression
  path, matching existing statement-path support.

### Added — `simpan`/`hapus` Web Storage Lowering (Expression Path) [CORE]

- **`simpan <value> ke localStorage.<key>`** in inline handlers now compiles
  to `localStorage.setItem("key", value)` instead of the incorrect
  `__setState(null, value)`.
- **`hapus localStorage.<key>`** in inline handlers now compiles to
  `localStorage.removeItem("key")` instead of the incorrect `.remove()`.
- Both `localStorage` and `sessionStorage` are supported in the expression
  lowerer (`src/compiler/lower/expression.js`), mirroring the existing
  statement-path lowering in `src/compiler/emitters/statements.js`.

### Fixed — `arahkan` Expression Path Compilation [CORE]

- **Property name mismatch** — `buatArahkanStatement` creates AST nodes with
  `url` property, but the parser expression path was creating generic nodes
  with `target` property. The expression lowerer now checks both `node.url`
  and `node.target` as fallback.
- **AST factory usage in expression path** — replaced generic
  `{ type, target }` object literals with proper AST factory calls
  (`buatArahkanStatement`, `buatSembunyikanStatement`, `buatHapusStatement`,
  `buatKosongkanStatement`, `buatTampilkanStatement`) to ensure correct
  property names across the compilation pipeline.

### Added — npm Publish Configuration [INFRA]

- **Package name** — changed from `promptjs` (taken on npm) to `prompt-js`.
- **`files` whitelist** — explicit list of included paths in `package.json`,
  excluding compiled `.js` output from examples.
- **`.npmignore`** — excludes dev files, tests, doc-dev, and compiled examples
  from the npm package.
- **CLI shebang** — added `#!/usr/bin/env node` to `src/cli/index.js` for
  direct execution after global install.

### Added — CI/CD Hardening [INFRA]

- **Release workflow** (`.github/workflows/release.yml`) — triggered by `v*`
  tags, runs quality gate (format + typecheck + lint + test), then publishes
  to npm with provenance using `NPM_TOKEN` secret.
- **CI workflow enhancements** — added demo app compilation steps:
  multi-page example, todo-app, and dashboard-app (SPA with auth) are
  compiled in CI to catch regressions.
- **ESLint flat config** — added `examples/**/*.js` to ignores (compiled
  output should not be linted).
- **Prettier ignore** — added `examples/**/*.js` to `.prettierignore`
  (compiled output should not be formatted).

### Tests

- 24 new v1.0-release tests (416 total across all test files):
  - HapusDariStatement (6): inline expression, reactive array, plain hapus,
    localStorage, Ulangi loop, English `from` keyword
  - simpan localStorage/sessionStorage lowering (7): setItem for both stores,
    expression values, non-lowering for regular vars, login flow, logout flow
  - Demo app compilation (11): todo-app compilation, hapus...dari output,
    __setState output, all 5 dashboard pages, login setItem,
    pengaturan removeItem, auth guard, role check

## [0.9.9] — 2026-06-25

**Maturation & Documentation Overhaul.** Role-based access control (peran runtime guard),
configurable token key (tokenKey directive + dot notation), 3 new CLI init templates,
doc-dev directory restructuring, and comprehensive planning for v1.0.0.

### Added — peran Role Check [CORE]

- **`peran: admin` front-matter directive** — now emits runtime role check guard.
  Previously parsed but not evaluated (was deferred to v1.0).
  Auth guard now checks `localStorage.getItem('__peran')` against the declared role.
  If role mismatch, redirects to the configured auth redirect path.
- Role check is emitted after token check (both guards active when both directives present).
- `peran` without `butuhAuth: benar` has no effect (role check is subordinate to auth guard).

### Added — Configurable Token Key [CORE]

- **`tokenKey: <key>` front-matter directive** — specifies the storage key name
  for the auth token. Default: `'token'`. Example: `tokenKey: auth_token` emits
  `localStorage.getItem('auth_token')` instead of `localStorage.getItem('token')`.
- **Dot notation in `token:` directive** — `token: localStorage.auth_token` parses
  into source=`localStorage` + key=`auth_token`. Equivalent to `token: localStorage`
  + `tokenKey: auth_token`.
- **`tokenKey` takes precedence** over dot notation key when both are present.
- `tokenKey` added to KNOWN_DIRECTIVES set in lexer for implicit front-matter detection.

### Added — CLI Init Templates

- **`spa` template** (`pjs init -t spa`) — SPA app with `router: benar`, navigation,
  and 3 pages (beranda, tentang, kontak).
- **`fullstack` template** (`pjs init -t fullstack`) — Auth-protected dashboard with
  `butuhAuth: benar`, `peran: admin`, `tokenKey: auth_token`, `router: benar`,
  login page, dashboard, and settings.
- **`blog` template** (`pjs init -t blog`) — Data-driven blog with article listing
  from `data/artikel.json` via `Ulangi` loop.

### Added — Documentation & Planning

- **doc-dev/ restructured** by version/level/type:
  - `v0.x/specs/` — historical language specifications (v0.1, v0.2)
  - `v0.x/roadmap/` — roadmaps & status maps
  - `v0.x/review/` — architecture evaluations & reviews
  - `v0.x/decisions/` — architecture decision records
  - `v0.x/reference/` — inventories & reference tables
  - `v1.0-planning/` — v1.0.0 preparation materials
  - `tutorial/` — tutorials
- **SYNTAX-REFERENCE.md** — comprehensive syntax reference covering all keywords,
  directives, expressions, tag aliases, event aliases, auth patterns, and SPA routing.
- **V1.0-PREREQUISITES.md** — readiness checklist, decisions required, growth budget,
  and estimated timeline for v1.0.0.
- **V1.0-DEMO-APPS.md** — specifications for todo-app and dashboard-app demo applications.
- **HANDOFF.md** updated to v0.9.9 with current status, architecture, and pitfalls.

### Changed

- **README.md** — version badge updated to 0.9.9, features expanded (auth, SPA, tokenKey),
  test count updated to 392, roadmap updated through v0.9.9, doc-dev links updated.
- **v0.9 auth tests** — section 4.5 updated from "v1.0 Evaluation" to "v0.9.9 Runtime Guard",
  now verifies peran role check emission.
- **Section numbering** in v0.9 auth tests updated (4.6→4.7, etc.) to accommodate
  new 4.6 "Configurable Token Key" test section.

### Tests

- 7 new auth tests (22 total in v0.9-auth.test.js):
  - peran role check emission
  - peran check after token check (ordering)
  - no peran check when peran absent
  - custom token key via tokenKey directive
  - token key from dot notation
  - tokenKey override of dot notation
  - default "token" key when no tokenKey

## [0.9.0] — 2026-06-25

**Protected Content & Auth Pattern.** Authentication guard compilation,
token source configuration, `hapus` lowering for Web Storage API, and
role (peran) front-matter parsing.

### Added — 4.1 Auth Guard Compilation [CORE]

- **`butuhAuth: benar` front-matter directive** — triggers IIFE-wrapped
  auth guard that checks for token presence before executing page code.
- **`redirect: "/path"` front-matter** — specifies the redirect target
  when authentication fails (`window.location.href = '/path'`).
- **`token: localStorage | sessionStorage` front-matter** — configures
  which Web Storage API is checked for the auth token. Defaults to
  `localStorage` when omitted.
- Auth guard emits `(function() { var __token = <storage>.getItem('token'); if (!__token) { window.location.href = '<redirect>'; return; } ... })();`
- No extra IIFE wrapping when auth guard is active (prevents double `})();`).

### Added — 4.2 Token Source Configuration [CORE]

- **localStorage token source** — `token: localStorage` emits
  `localStorage.getItem('token')` in the auth guard.
- **sessionStorage token source** — `token: sessionStorage` emits
  `sessionStorage.getItem('token')` in the auth guard.
- **Default fallback** — when `token` directive is omitted, defaults
  to `localStorage.getItem('token')`.

### Added — 4.3 `hapus` Lowering for Web Storage [CORE]

- **`hapus localStorage.x` lowering** — `hapus localStorage.token`
  compiles to `localStorage.removeItem("token")` instead of the
  delete operator, which is ineffective on Web Storage API.
- **`hapus sessionStorage.x` lowering** — same pattern for sessionStorage.
- **Property name extraction** — dot-access property (`localStorage.token`)
  is extracted as a string argument to `removeItem()`.
- Works in all statement contexts: event handlers (`on_klik`), lifecycle
  hooks (`Ketika muat:`), and standalone statements.

### Added — 4.5 Peran (Role) Parsing [CORE]

- **`peran: <role>` front-matter directive** — parsed and attached to
  AST as `ast.authPeran`. Role-based access evaluation is a v1.0
  feature; v0.9 parses the directive without emitting runtime checks.

### Changed

- **Lexer: Implicit front-matter detection** — bare key-value directives
  (without `---` opener) are now recognized when keys match known compiler
  directives (`router`, `adapter`, `butuhAuth`, `redirect`, `token`, `peran`).
  Prevents E3001 errors for `butuhAuth: benar` at file start. Leading blank
  lines are skipped during detection.
- **Compiler: Auth guard + IIFE logic** — when `butuhAuth` is true, the
  regular IIFE wrapper is suppressed (auth guard IIFE replaces it). Prevents
  double `})();` in compiled output.
- 15 new verification tests in `tests/v0.9-auth.test.js`.
- **385 tests passing** (370 existing + 15 new).

## [0.8.0] — 2026-06-24

**Full-Stack via Adapter.** Plugin system with 4 transform hooks,
3 deployment adapters (static, node, vercel), and project config loading.

### Added — 3.1 Plugin System [ENGINE]

- **Plugin contract** — objects with optional hooks: `transformSource`,
  `transformJS`, `transformCSS`, `transformHTML`. Non-fatal errors
  (plugin crashes are caught and logged, never kill the build).
- **4 transform hooks in engine** — `Plugins.transformSource()` runs
  before CSS extraction; `transformJS`/`transformCSS` run after
  compilation; `transformHTML` runs after HTML generation in builder.
- **`src/engine/plugins.js`** — zero-dependency plugin runner with
  `applyHook()` generic function + per-hook convenience wrappers.
- **`src/engine/config.js`** — project config loader. Searches for
  `pjs.config.js` or `promptjs.config.js` upward from cwd. Validates
  adapter names, plugin shapes. Merges with CLI flags (CLI wins).

### Added — 3.2 Adapter: Static Export [PLUGIN]

- **`src/engine/adapters/static.js`** — `runStaticAdapter()` post-processor.
- **Asset hashing** — `prompt.js` → `prompt.a1b2c3.js` (MD5, 8-char hex)
  for cache busting. HTML references auto-updated.
- **`<meta>` tag injection** — `og:title`, `og:description`, `og:image`,
  `canonical` from config `meta` + `siteUrl`.
- **`sitemap.xml`** auto-generation from route list + `siteUrl`.
- **`404.html`** fallback — SPA mode reuses `index.html`; MPA generates
  standalone 404 page.

### Added — 3.3 Adapter: Node Server [PLUGIN]

- **`src/engine/adapters/node.js`** — `runNodeAdapter()` generates
  a self-contained `server.js` (zero runtime deps, Node.js built-ins only).
- **Static file serving** with MIME types and immutable cache headers.
- **SPA mode** — all non-static routes serve `index.html`.
- **MPA mode** — route-to-`.html` mapping with 404 fallback.
- **API proxy** — when `apiUrl` configured, `/api/*` requests are
  forwarded to the backend. Off by default.
- **Dockerfile template** — `FROM node:20-slim`, `COPY dist/ .`, `CMD ["node", "server.js"]`.

### Added — 3.4 Adapter: Vercel [PLUGIN]

- **`src/engine/adapters/vercel.js`** — `runVercelAdapter()` restructures
  `dist/` into [Vercel Build Output API v3](https://vercel.com/docs/build-output-api/v3)
  format (`.vercel/output/config.json` + `static/` + `functions/`).
- **`vercel.json`** with SPA rewrites (SPA mode) and cache headers
  for assets.
- **`config.json`** V3 with route matching (SPA fallback or MPA per-route).

### Changed

- Engine `compile()` applies `transformSource` before pipeline and
  `transformJS`/`transformCSS` after compilation (when plugins present).
- Builder `buildProject()` accepts `adapter`, `plugins`, `meta`,
  `siteUrl`, `apiUrl` options. Runs adapter post-processing after
  standard build output. Applies `transformHTML` hooks on all HTML files.
- CLI `build` command: loads `pjs.config.js`, accepts `--adapter <name>`,
  reports adapter output (hashed assets, server.js, vercel.json, sitemap).
- CLI help text updated with `--adapter` option.
- Builder version strings updated to **v0.8**.
- 42 new verification tests in `tests/v0.8-adapter.test.js`.
- 2 existing tests updated (removed version string assertions).
- **370 tests passing** (328 existing + 42 new).

## [0.6.0] — 2026-06-24

**SPA Capability.** Client-side routing, page lifecycle mount/unmount,
and zero-overhead SPA activation via front-matter.

### Added — 1.1 Lifecycle Mount/Unmount [CORE]

- **SPA factory function wrapping** — when `router: benar` is in front-matter,
  compiled code is wrapped in a named factory function (e.g. `__page_index`)
  instead of an IIFE. Returns `{ el, mount(parent), unmount() }`.
- **Page root tracking** — first top-level element in SPA mode becomes
  the page root (`this._spaPageRoot`), appended by `mount()` instead of
  auto-appending to `document.body`.
- **Cleanup arrays** — `__cleanupFns[]`, `__dipasangFns[]`, `__dilepasFns[]`
  initialized in SPA mode for lifecycle management.
- **Watcher cleanup** — `visitSaatStatement` wraps `__watch()` calls in
  `__cleanupFns.push()` so unsub functions are called on unmount.
- **Lifecycle hook collection** — `visitLifecycleStatement` in SPA mode
  pushes `dipasang` hooks to `__dipasangFns` (called in `mount()`) and
  `dilepas` hooks to `__dilepasFns` (called in `unmount()`), instead of
  binding to DOMContentLoaded/beforeunload.

### Added — 1.2 Client-Side Router [PLUGIN]

- **Router runtime** (`src/engine/router-runtime.js`) — zero-dependency
  `__pjsRouter()` function embedded at compile time when SPA mode is active.
  Supports: exact + dynamic segment route matching, pushState navigation,
  `<a href>` click interception, `popstate` handling, 404 fallback (`"*"` route),
  and `destroy()` for full cleanup.
- **SPA-activated `arahkan`** — `visitArahkanStatement` emits
  `__pjsRouter.navigate(url)` instead of `window.location.href` when in SPA mode.
- **Builder SPA mode** — `buildProject()` detects `router: benar` in any page's
  front-matter. In SPA mode: compiles all pages as factory functions,
  generates a route table (`__PJS_ROUTES`), embeds router runtime, and
  produces a single `index.html`. In MPA mode (no `router: benar`): output
  is identical to v0.4.0 (zero regression).
- **`routeToPageName()`** helper — converts route paths to safe JS identifiers
  (`/` → `index`, `/about` → `about`, `/blog/:slug` → `blog_slug`).

### Changed

- Engine `compile()` result includes `isSPA` boolean field.
- Engine accepts `options.pageName` and `options.pageRoute` for SPA compilation.
- `frontMatterData.router` with value `benar`/`true` activates SPA mode.
- Compiler version header updated to **v0.6**.
- Builder version strings updated to **v0.6**.
- `visitSaatStatement` marker element appends to page root in SPA mode.
- 22 new verification tests in `tests/v0.6-spa.test.js`.
- Builder integration test version expectations updated.
- **306 tests passing** (284 existing + 22 new).

## [0.5.0] — 2026-06-24

**Compiler Infrastructure.** Source maps, tree shaking, and error boundaries —
foundations that all future phases build upon.

### Added — 0.1 Source Maps (V3 + VLQ)

- **VLQ Base64 encoding** in `compiler/utils/codegen.js` — `encodeVLQ()` for
  signed integer encoding, `generateSourceMap()` for V3 JSON generation.
- **Source location tracking** — every top-level AST node with `loc` records
  a mapping `{ sourceLine, sourceCol, outputLine }` during compilation.
- **Source Map V3 object** returned in `compile()` result as `sourceMap` field.
- Delta-encoded mappings per output line, semicolon-delimited.

### Added — 0.2 Tree Shaking Runtime Helpers

- **Per-helper code map** (`RUNTIME_HELPER_MAP`) — each runtime helper stored
  as independent string, emitted only when used.
- **`compiler.helpers` Set** — visitors add helper names during AST traversal;
  `emitRuntimeHelpers()` iterates the Set and emits only needed helpers.
- **Reactive infrastructure** (`__subscribers`, `__effectMap`, etc.) emitted
  only when at least one reactive helper is needed.
- **Static-only output** (no data/watch/events) = ~16 lines, zero runtime helpers.
- **Backward compat**: `RUNTIME_HELPERS` monolith string still exported for
  legacy consumers.

### Added — 0.3 Error Boundaries

- **`__pjs_handleError(error, context, hook)`** — logs to console with
  `[PromptJS]` prefix, calls `window.__pjsClearError()` if available.
- **try/catch wrapping** in every event handler (`visitKetikaStatement`) —
  caught errors are forwarded to `__pjs_handleError` with context and hook name.
- Error boundary helper only emitted when events are present (tree-shaken).

### Fixed

- **Critical: Tree shaking bug** — `emitRuntimeHelpers()` was called BEFORE
  AST traversal, so `this.helpers` Set was always empty. Fixed by deferring
  helper emission to AFTER traversal, using output array redirect + splice.
- **Source map data recording** — `sourceMapData` was never populated because
  visitors didn't pass `loc` to `emit()`. Fixed by recording mappings in the
  `compile()` loop for each top-level node with source location.

### Changed

- All version headers updated to **v0.5**.
- `compile()` algorithm changed to 4-phase: header → AST traversal (collect
  helpers + source map data) → generate helpers → splice into output.
- `engine/promptjs.js` — `compile()` result now includes `sourceMap` field.
- 21 new verification tests in `tests/v0.5-compiler-infra.test.js`.
- 3 snapshot tests updated for error boundary output.
- **284 tests passing** (263 existing + 21 new).

## [0.4.0] — 2026-06-22

**The Maturation Wave.** PromptJS becomes a real full-stack DSL:
multi-file projects, CSS support, module system, and dev server HMR.

### Added — Wave H: Module System (`kirim`/`terima`)

- **Cross-file symbol sharing** via front-matter directives:
  `kirim: apiKey = "abc123"` (share) / `terima: apiKey dari "config.pjs"` (import).
  English: `share:` / `get: ... from "..."`.
- **Cycle detection** with max depth 10.
- **Re-export** support: `kirim: formatTanggal dari "utils.pjs"`.
- **Symbol injection**: resolved imports merged into front-matter as `$external` symbols.
- `src/engine/modules.js` — zero-dependency module resolver.

### Added — Wave I: CSS Support (`Gaya:`/`Style:`)

- **Indent-based CSS blocks** in `.pjs` source:
  ```pjs
  Gaya:
      .card
          background: white
          border-radius: 8px
  ```
- **`@media` query** support with nested rules.
- **Scoped CSS** per page/component via `data-pjs-<name>` attribute selectors.
- **Extended CompileResult**: `{ js, css, errors, warnings, ast, success }`.
- `src/engine/css.js` — zero-dependency CSS extractor + parser + compiler.

### Added — Wave J: Multi-file Project & Routing

- **Folder-based routing** (ala Astro/Next.js):
  `src/pages/index.pjs` → `/`, `src/pages/about.pjs` → `/about`,
  `src/pages/blog/[slug].pjs` → `/blog/:slug`.
- **Project builder**: `src/engine/builder.js` compiles all pages,
  bundles JS + CSS.
- **Route-aware JS**: single `prompt.js` with `window.__PJS_ROUTE__` guards.

### Added — Wave K: Build Pipeline

- **Output**: `dist/` with `index.html`, `about.html`, `prompt.js`, `prompt.css`.
  No Indonesian in output filenames.
- **CLI auto-detection**: `pjs build` detects `src/pages/` for project mode,
  falls back to legacy single-file mode.
- **Static assets** copy from `src/assets/` to `dist/assets/`.

### Added — Wave L: Developer Experience

- **HMR (Hot Module Replacement)**: CSS changes pushed via WebSocket
  without full page reload.
- **Error overlay**: compile errors displayed as fixed-bottom overlay
  with error code, message, and line number. Auto-clears on recompile.
- **Upgraded live-reload**: JSON message protocol (reload/error/css).

### Changed

- All version headers updated from v0.2/v0.3 to **v0.4.0**.
- `package.json` version bumped to 0.4.0.
- Engine `compile()` now returns `css` field in result.

## [0.3.0] — 2026-06-21

**Level 1 Maturation complete.** 243 tests, 56 bilingual keywords, 66 error codes,
coverage gate at 60%, 3 runnable examples, zero-dependency runtime.

### Added — Wave E (Final Documentation)

- **README rewrite** with valid syntax examples, complete keyword table
  (40+ keywords), full event alias table (21 entries), full tag alias table
  (28 entries), corrected project structure diagram, examples section.
  Added badges: MIT license, v0.3.0, zero-deps.
- **`examples/` directory** with 3 runnable `.pjs` files:
  `counter.pjs`, `todo.pjs`, `gallery.pjs`.
- **CI step** to compile all examples on every push/PR.

### Added — Wave G (Keyword Activation)

- **16 keyword activated** in lexer: simpan, tambahkan, kurangi, sisipkan,
  ketika, berhenti, tampilkan, sembunyikan, hapus, kosongkan, perbarui,
  ambil, arahkan, muatulang, kembali, jalankan, gunakan, dipasang, dilepas.
- **Parser dispatch** + 10 new parse methods for action statements.
- **Expression lowering** for 14 action statement types.
- **5 error codes newly triggerable**: E3003, E3005, E4001, E4011, E4101.
- **2 warning codes newly triggerable**: W4102, W4103.
- **Bug fix**: JalankanExpression lowering caused stack overflow.
- **English keyword aliases corrected**: when→TK_KETIKA, watch→TK_SAAT,
  delete→TK_HAPUS, function→TK_FUNGSI, sampai/until→TK_SAMPAI.
- **Range loop** `Ulangi i dari 1 sampai 5:` now works (parser handle
  range loop without `untuk` prefix).

### Added — Wave D (Comprehensive Testing)

- **D1**: 44 snapshot tests + 5 bug fixes (lexer word operator collision,
  boolean/null literals, parser primary expression, resolver SaatStatement
  target, compiler fragment compiledVarName).
- **D2**: 22 negative tests for 14 error codes + 5 positive tests.
- **D2.1**: 9 complex setup tests + 3 bug fixes (engine resolver warnings
  forwarding, parser type hint parsing, analyzer SaatStatement target).
- **D3**: 111 coverage tests + coverage gate at 60%.
- **Test reports**: 4 Markdown reports in `tests/reports/`.
- **Zero-dependency test helpers**: temp-fs.js, report-generator.js.

### Added — Wave F (JSDoc Typing)

- **Per-file `// @ts-check`** on all 13 production source files.
- **`jsconfig.json`** + `typescript` + `@types/node` devDependencies.
- **`npm run typecheck`** script + CI gate.
- **533 `@param`**, **297 `@returns`**, **20 `@typedef`** across codebase.
- **Bilingual module headers** (ID/EN).

### Changed — Wave D/F/G

- ESLint config: `no-var` + `prefer-const` enabled, `--max-warnings=0`.
- CI: 6 gates (format, typecheck, lint, test, smoke, examples) across
  Node 20/22/24.
- vitest.config.js: coverage threshold gate (60% statements).

### Fixed — Cumulative bug fixes (15 total across Waves D1, D2.1, G)

1. Lexer `_tokenizeDeclaration` word operator collision (`Fungsi tambah()` → `+`)
2. Lexer `TK_BENAR`/`TK_SALAH`/`TK_KOSONG` undefined in TT object
3. Parser `_parsePrimaryExpression` missing boolean/null literal cases
4. Resolver `visitSaatStatement` target access (AST node vs string)
5. Compiler `visitBuatStatement` fragment `compiledVarName` inheritance
6. Engine resolver warnings silently discarded
7. Parser `_parseDataDeclaration` type hint hardcoded null
8. Analyzer `visitSaatStatement` target access (same as #4)
9. Compiler `JalankanExpression` lowering infinite recursion
10. Lexer `when` mapped to `TK_SAAT` (should be `TK_KETIKA`)
11. Lexer `watch`/`delete`/`function` English aliases missing
12. Parser `_parseUlangiStatement` range loop without `untuk` prefix
13. Lexer `_tokenizeDeclaration` Data/Tetap/Ubah init value not parsed
14. Lexer `_tokenizeDeclaration` Saat target tokenization (word operator collision)
15. Compiler `on_klik` event handler fragment `__el_N` off-by-one

## [Unreleased]

### Added — Post-v0.3.0 release preparation

- **`files` field** di `package.json` — npm publish hanya menyertakan
  `src/`, `examples/`, `assets/`, dan dokumen inti (README, CHANGELOG,
  LICENSE, CONTRIBUTING). `tests/`, `doc-dev/`, `editors/`, `scripts/`
  tidak ikut terpublish ke npm registry (mengurangi ukuran tarball
  secara signifikan).
- **`repository`, `homepage`, `bugs` fields** di `package.json` —
  metadata standar npm untuk discoverability di npmjs.com dan
  `npm repo`/`npm bugs` commands.
- **`sideEffects: false`** di `package.json` — sinyal tree-shaking
  untuk bundler modern (webpack, rollup, vite, esbuild).
- **`author`** field di `package.json`.
- **`pages:build` dan `pages:dev` scripts** — builder showcase site
  untuk GitHub Pages.
- **`scripts/build-pages.js`** — builder zero-dep yang compile semua
  `examples/*.pjs` menjadi halaman HTML split-view (source code di
  kiri, live preview iframe di kanan) + landing page showcase.
  Output: `dist-pages/` (di-gitignore).
- **`.github/workflows/pages.yml`** — workflow auto-deploy ke GitHub
  Pages setiap push ke `main` (atau manual via `workflow_dispatch`).
  Menggunakan `actions/upload-pages-artifact@v3` dan
  `actions/deploy-pages@v4`. URL target: `https://raarion.github.io/promptjs/`.
- **`editors/vscode/`** — VS Code extension skeleton:
  - `syntaxes/promptjs.tmLanguage.json` — TextMate grammar untuk
    keyword bilingual (56+), front-matter, event alias, external
    ref, tag aliases, prose operators, booleans/null.
  - `language-configuration.json` — bracket matching, auto-closing
    pairs, indentation rules (`:` increase, `Lainnya`/`Else`/
    `Berhenti`/`Kembalikan` decrease).
  - `snippets/promptjs.json` — 13 snippets scaffold (`halaman`,
    `komponen`, `buat`, `data`, `turunan`, `jika`, `ulangi`,
    `ulangi-kali`, `saat`, `ketika`, `dipasang`, `simpan`, `fm`).
  - `images/promptjs-logo.png` — icon 128×128 (converted dari
    `assets/PromptJS-logo.svg` via `scripts/convert-icon.js`).
  - `README.md`, `CHANGELOG.md`, `LICENSE`, `.vscodeignore`.
  - Extension validated dengan `vsce package` → 10.09 KB VSIX.
- **README badge** baru: "showcase-live" → `https://raarion.github.io/promptjs/`.
- **README section** baru: "Live Showcase" dan "Editor Support".
- **README project structure** diupdate untuk refleksikan folder
  baru: `editors/vscode/`, `scripts/`, dan workflow `pages.yml`.

### Changed

- **`.gitignore`** — tambah entry untuk `dist-pages/` dan
  `editors/vscode/{node_modules,.vscode,*.vsix}`.
- **`package.json` keywords** — ditambah `bilingual`, `frontend`,
  `vanilla-js`, `reactive`, `dom` untuk SEO di npm registry.

## [0.2.0] — 2026-06-19

Baseline release audited for this effort (commit `9a60726`).

### Highlights

- Clean 5-stage compile pipeline: Lexer → Parser → Resolver → Analyzer → Compiler.
- Bilingual (Indonesian/English) keyword set.
- Front-matter data binding (`$var`), conditionals, `untuk…in` loops, event
  handlers, tag/event aliases, auto-fragment wrapping, Proxy-based reactive runtime.
- 64-code bilingual error registry with line:column and suggestions.
- CLI: `compile`, `serve`, `build`, `init` (with `--minify` and jsdom prerender).

[Unreleased]: https://github.com/raarion/promptjs/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/raarion/promptjs/releases/tag/v1.0.0
[0.9.9]: https://github.com/raarion/promptjs/releases/tag/v0.9.9
[0.9.0]: https://github.com/raarion/promptjs/releases/tag/v0.9.0
[0.8.0]: https://github.com/raarion/promptjs/releases/tag/v0.8.0
[0.6.0]: https://github.com/raarion/promptjs/releases/tag/v0.6.0
[0.2.0]: https://github.com/raarion/promptjs/releases/tag/v0.2.0
