# Changelog

All notable changes to PromptJS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

This entry tracks the **Level 1 maturation effort** (merge of roadmap phases 0–2).
See [`doc-dev/ROADMAP-Level-1.md`](doc-dev/ROADMAP-Level-1.md) for the full ordered plan.

### Changed — Pre-C4 refining pass

- Formatted all source files with Prettier (23 files that the rushed Waves A–C3
  had left unformatted).
- Eliminated all 33 `no-unused-vars` lint warnings (unused catch bindings,
  unused params `_`-prefixed, dead locals/imports removed). No behavior change.
- **CI hardened:** `lint` now runs with `--max-warnings=0`, and a `format:check`
  step was added to the workflow so unformatted/warning-laden code can't merge.
- Removed the `--open` serve flag from CLI help/JSDoc — it was advertised but
  never implemented. Will be re-added when the feature actually lands.
- Added [`doc-dev/REVIEW-Level1-PreC4.md`](doc-dev/REVIEW-Level1-PreC4.md)
  documenting the pass and proposing larger follow-up refactors (`var`→`const`
  migration, centralized `NO_COLOR`-aware color helper).

### Added — Wave A (Foundation & Safety Net)

- **Vitest** test framework. The 24 hand-rolled assertion tests in
  `src/tester/test-all.js` and `src/tester/test-extended.js` were migrated to
  `tests/pipeline.test.js` and `tests/extended.test.js`.
- **ESLint 10** (flat config, `eslint.config.js`) + **Prettier** +
  `.editorconfig` for consistent style and static checks.
- **GitHub Actions CI** (`.github/workflows/ci.yml`): lint + test + smoke
  compile across Node 20 / 22 / 24.
- `CHANGELOG.md` and `CONTRIBUTING.md`.
- npm scripts: `test`, `test:watch`, `coverage`, `lint`, `lint:fix`,
  `format`, `format:check`, `build`.
- `engines.node` set to `>=20.19.0`.

### Fixed — Wave A

- **Duplicate object key** `'label'` in the lexer tag-alias map
  (`src/lexer/promptjs-lexer.js`).
- **Unterminated block comment** in `src/lexer/test-lexer.js` that made the
  whole scratch file a syntax error (it was never part of `npm test`, so this
  went unnoticed).
- Unsafe `obj.hasOwnProperty(...)` calls replaced with
  `Object.prototype.hasOwnProperty.call(...)` in `error-codes.js` and
  `visitor.js`.
- `no-case-declarations` violations in `src/compiler/lower/expression.js`
  (case bodies that declare `const`/`let` are now block-scoped). No behavior
  change — purely scoping hygiene.

### Added — Wave B/C (Design decisions + first features)

- **ADR-001** (`doc-dev/ADR-001-level1-decisions.md`) recording the loop,
  named-page, and component decisions.
- **Named pages**: `Halaman Nama:` / `Page Name:` now compile; the page name
  becomes the root element's `id` (e.g. `Halaman Beranda:` → `id="beranda"`).
  Anonymous `Halaman:` / `Page:` is unchanged.
- **Counted loops**: `Ulangi N kali:` / `Loop N times:` now compile to
  `for (let __i = 0; __i < N; __i++)`. (The downstream pipeline already
  supported `kind: 'kali'`; only the `kali`/`times` → `TK_KALI` lexer keyword
  and a parser branch were missing.)
- **Loop separator aliases**: `from` (English) joins `in` and `dari` as
  interchangeable separators in `Ulangi untuk x <sep> source:`.
- **Component system (rebuilt, Wave C3)**: declaration via `Komponen Name(p1, p2):`
  / `Component Name(...):` (with `Definisikan` / `Define` kept as aliases) and
  instantiation via `Buat Name(p1: v1, p2: v2)` / `Create Name(...)` using named
  arguments. Components compile to a `props`-object factory
  (`function __komp_Name(props) { const p1 = props.p1; … return __root; }`) that
  is appended to the current parent on instantiation. Undeclared components raise
  `E3004`. The previous machinery mis-tokenized parameters and emitted invalid JS.

### Changed — Wave C

- The counted-loop test that was previously `todo` is now a real passing test;
  added tests for English `times`, the `from`/`dari` aliases, and named pages.



### Known issues (tracked for later waves)

- Word-operators (`kali`/`tambah`/`dan`/`sama dengan`…) are present in the
  compiler's expression lowering but not recognized by the parser (e.g.
  `3 kali 2` → `E3001`). Logged for the expression work (Wave C4).

## [0.2.0] — 2026-06-19

Baseline release audited for this effort (commit `9a60726`).

### Highlights

- Clean 5-stage compile pipeline: Lexer → Parser → Resolver → Analyzer → Compiler.
- Bilingual (Indonesian/English) keyword set.
- Front-matter data binding (`$var`), conditionals, `untuk…in` loops, event
  handlers, tag/event aliases, auto-fragment wrapping, Proxy-based reactive runtime.
- 64-code bilingual error registry with line:column and suggestions.
- CLI: `compile`, `serve`, `build`, `init` (with `--minify` and jsdom prerender).

[Unreleased]: https://github.com/raarion/promptjs/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/raarion/promptjs/releases/tag/v0.2.0
