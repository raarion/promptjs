# Changelog

All notable changes to PromptJS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[Unreleased]: https://github.com/raarion/promptjs/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/raarion/promptjs/releases/tag/v0.8.0
[0.6.0]: https://github.com/raarion/promptjs/releases/tag/v0.6.0
[0.2.0]: https://github.com/raarion/promptjs/releases/tag/v0.2.0
