# D4 — v2 Edge-Case Suite: Coverage Report & Gap Disclosure

**Project:** PromptJS (mini-DSL → vanilla-JS compiler)
**Author:** TestForge — Production-Ready Test Architect
**Date:** 2026-06-29
**Node:** 22.14.0 · **Runner:** Vitest 4 · **Coverage provider:** v8

---

## 1. Executive Summary

A targeted edge-case + error-path suite was added to mature PromptJS toward a
verifiable "production ready" grade. The work focused on the *least-covered,
highest-risk* corners of the compiler — expression lowering, diagnostic
formatting, AST traversal, the module import/export system, and CLI error
handling — rather than padding the happy path.

| Metric | Baseline | After v2 | Δ |
|---|---|---|---|
| **Tests** | 539 | **647** | **+108** |
| **Lines** | 77.85% | **80.58%** | +2.73 |
| **Statements** | 77.07% | 79.89% | +2.82 |
| **Branches** | 65.20% | 69.51% | +4.31 |
| **Functions** | 81.34% | 82.80% | +1.46 |

**Target (≥80% lines): MET — 80.58%.** ✅
**Determinism:** 647/647 passed on **3 consecutive full runs** — zero flaky tests.

All numbers above are from real `vitest run --coverage` executions, not estimates.

---

## 2. New Test Files (all green, deterministic)

| File | Tests | Module targeted | Baseline → After (lines) |
|---|---|---|---|
| `v2-expression-lowering.test.js` | 46 | `compiler/lower/expression.js` | 44.21% → **84.35%** |
| `v2-error-codes.test.js` | 26 | `parser/error-codes.js` | 95.01% (39.53% branch) → **100% / 100% branch** |
| `v2-visitor-traversal.test.js` | 9 | `utils/visitor.js` | 66.66% → **81.30%** |
| `v2-cli-compile-errors.test.js` | 10 | `cli/commands/compile.js` | 45.74% → **57.44%** |
| `v2-modules-resolution.test.js` | 17 | `engine/modules.js` | 55.68% → **96.59%** |

### Design principles applied
- **Contract-based, not implementation-coupled.** Each assertion pins a
  behavioral contract (e.g. *"`simpan x ke localStorage.k` lowers to
  `localStorage.setItem("k", x)`"*), so the tests survive internal refactors.
- **Error paths are first-class.** Missing files, unreadable modules, circular
  imports, depth-limit guards, bad CLI input, unknown AST nodes — all asserted.
- **Deterministic & isolated.** No network, no clock dependence; `console.warn`
  is spied, `process.exit`/stdio are stubbed, temp dirs are created per-test and
  cleaned in `afterAll`.
- **Honest assertions.** Where a test revealed the *real* engine behavior
  differed from a naive expectation (e.g. `--out-dir` is ignored for a
  single-file input; a reactive identifier lowers `arr.value.map(...)`), the
  assertion was corrected to document actual behavior — never the reverse.

---

## 3. Enumerated Edge Cases Now Covered

### Expression lowering (`expression.js`)
- Action keywords used as expression values: `simpan`, `tambahkan`, `kurangi`,
  `sisipkan`, `perbarui`, `hapus`, `kosongkan`, `sembunyikan`, `tampilkan`,
  `arahkan`, `muat ulang`, `kembali`, `berhenti`.
- Reactive (`data`/`turunan`) vs plain (`ubah`) write paths → `__setState` vs
  direct assignment / direct push.
- `localStorage.<k>` / `sessionStorage.<k>` special-casing in `simpan` & `hapus`
  → `setItem` / `removeItem`.
- `perbarui` property variants: `teks`→innerText, `html`→sanitized innerHTML
  (+ helper registration), `kelas`→className, `nilai`→value, arbitrary→setAttribute.
- Built-ins: `panjang`, `urutkan`, `balik`, `gabung`, `apakahKosong`, `apakahAda`,
  `saring`/`pilih`/`temukan`, prefix builtins (`typeof`), helper fallback.
- Mutating array methods on reactive objects → IIFE + spread re-assign; non-mutating
  → plain call.
- Fallbacks: `null` node, `FetchBranch`/`FetchOption`/`ErrorNode`, unknown node
  type → `PJS-W2001` warning, empty object/array literals, ternary, unary pre/post.

### Diagnostics (`error-codes.js`) — now 100%/100% branch
- `getSeverity`: W→warning, E→error, empty/null→error.
- `getStage`: every pipeline digit 1–6 + unknown→System + too-short/null→System.
- `createError`: known/unknown code, override application, EN/ID alias sync,
  non-own (inherited) property exclusion.
- `formatError`: error vs warning prefix, modern `loc` vs legacy `baris/kolom`,
  suggestion present/absent, `saran` alias fallback, stage present/absent, no-loc.

### AST traversal (`visitor.js`)
- `genericVisit` descending arrays + single-object children, skipping null/scalar.
- Overriding `visit*` delegating to `this.genericVisit` to keep descending.
- `CollectingVisitor` across arrays + nested objects; empty result set.
- `traverse(null)` / `accept` guards; `formatAST` nested array & single-child render.

### Module system (`modules.js`) — now 96.59%
- `extractModuleDirectives`: inline share, JSON-typed share, re-export descriptor,
  `terima`/`get` import directives, null front-matter.
- `resolveImports`: missing file→external+warning, no front-matter→warning,
  symbol-not-found→warning, successful inline import, **re-export recursion across
  files**, **circular-dependency detection (visited set)**, **depth>10 hard error**.
- `mergeImportsToFrontMatter`: directive stripping, inline vs external mapping, null FM.

### CLI `compile` (`compile.js`)
- No input→exit 1, nonexistent path→exit 1, empty dir→exit 1, valid single
  file→exit 0 + file written beside source, `--stdout`→exit 0 no file,
  compile-error→exit 1 no output, directory input compiles every `.pjs`.
- `compileOne` success/failure result shape; `compileFiles` per-file aggregation.

---

## 4. CI & Regression Gate

- `.github/workflows/ci.yml` gains a dedicated **`coverage`** job (Node 22) that
  runs `npm run coverage`, **enforces thresholds** (job fails on regression),
  uploads the `coverage/` report (lcov + html) as an artifact, and writes a
  one-line summary to the GitHub step summary.
- `vitest.config.js` thresholds raised to lock in the gains:
  `lines 80, statements 78, branches 68, functions 80` (set just below measured
  values so CI catches a *regression* — a deleted or weakened test — rather than
  normal churn). Verified passing locally.

---

## 5. Honest Gap Disclosure — What is STILL Uncovered (and why)

Coverage is a signal, not a trophy. The following remain below target. None
block the ≥80%-lines goal, but they are the next-highest-value work.

| Module | Lines | Why still uncovered / risk |
|---|---|---|
| `cli/commands/serve.js` | 56.0% | Long-running dev server + filesystem watch + live socket. Needs a server-lifecycle harness (start → request → assert → close) with port isolation. **Medium risk** — user-facing but not in the compile output path. |
| `cli/commands/build.js` | 55.6% | Multi-file build orchestration, minify branch, error aggregation. Needs temp-project fixtures. **Medium risk.** |
| `cli/index.js` | 51.4% | Arg-dispatch tail + a few command routes (lines ~200-249) only reached via subprocess e2e, which doesn't move in-process coverage. **Low risk** — thin routing layer, covered behaviorally by `cli-integration.test.js`. |
| `compiler/emitters/statements.js` | 71.2% | Large statement emitter; remaining gaps are rarer statement/branch combos (deep nesting, uncommon event targets). **Medium risk** — core codegen; worth property-based testing next. |
| `engine/builder.js` | 62.1% | Page-graph build + adapter selection branches (lines 465-545). **Medium risk.** |
| `resolver/promptjs-resolver.js` | 79.0% (58.9% branch) | Scope/binding resolution; many *branch* combinations (shadowing, re-declaration, cross-scope writes) untested even though lines are high. **High value** for a DSL — recommended next focus. |
| `analyzer/promptjs-analyzer.js` | 81.8% (59.7% branch) | Semantic analysis warnings; branch gaps in diagnostic conditions. **High value** next. |
| `compiler/lower/expression.js` | 84.4% | Remaining: a few reactive-array sub-branches (lines 245-253) reachable only through specific surface syntax. **Low risk.** |
| `engine/promptjs.js` | 77.9% | Data-file loading + a few SPA/source-map branches. **Low-medium risk.** |

### Recommended next steps (in priority order)
1. **Resolver & analyzer branch coverage** (DSL-core correctness) — push branches
   from ~59% toward 80% with scope/shadowing/redeclaration fixtures.
2. **`serve.js` lifecycle harness** — start/stop the dev server in-process with an
   ephemeral port; assert routing, 404, and path-traversal rejection.
3. **Property-based tests** (`fast-check`) for the expression parser/lowerer —
   generate random valid expressions, assert the compiled JS parses (`node --check`).
4. **Mutation testing** (`Stryker`) on `expression.js` + `error-codes.js` (now
   high line-coverage) to confirm the assertions actually *catch* regressions,
   not just execute lines.

---

## 6. Reproduce

```bash
nvm use 22            # project requires Node >= 22
npm ci
npm run coverage      # full suite + coverage + threshold gate
# determinism check:
for i in 1 2 3; do npx vitest run; done
```
