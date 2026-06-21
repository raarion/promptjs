# Changelog

All notable changes to PromptJS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

_No unreleased changes yet._

<!-- Historical [Unreleased] content has been released as v0.3.0 above. -->

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
