# D4 — SESI-2 Point-2: `turunan` dependency-cycle detection & forward-ref hoisting

**Date:** 2026-07-04 · **Branch:** `v132-sesi2` (base `b9247c7`) · **Node:** v22.14.0 (cross-checked v20.20.2)
**Suite added:** `tests/v10-turunan-cycle-hoisting.test.js` (9 tests)
**Verdict:** ✅ **Behavior already correct** — no source change needed. Locked in with a regression suite.

---

## 1. Task

SESI-2 Point-2 asked to implement **hoisting** of `turunan` declarations (two-phase: collect
all symbols first, then resolve bodies) so that **mutual forward-reference cycles** between
derived values surface as **E4201 (dependency cycle)** instead of being pre-empted by
**E3001 (undeclared identifier)** from the resolver guard — covering mutual A↔B, chains
A→B→C→A, and self-cycles — WITHOUT breaking valid non-cycle forward-refs, and WITHOUT
regressing E3001 for genuinely-unknown identifiers.

## 2. Verification FIRST (evidence-based, real `compile(src)`)

Before touching any code I probed the **actual** current behavior on the branch head. Results
were **identical on Node v22.14.0 and v20.20.2** (no version-dependent behavior):

| Case | Source | `success` | Diagnostics |
|---|---|---|---|
| A) mutual A↔B | `turunan a = b + 1` / `turunan b = a + 1` | `false` | **E4201** `a -> b -> a` |
| B) chain A→B→C→A | `a=b+1` / `b=c+1` / `c=a+1` | `false` | **E4201** `a -> b -> c -> a` |
| C) self-cycle | `turunan c = c + a` | `false` | **E4201** `c -> c` |
| D) valid fwd non-cycle | `turunan c = a + b` (a,b `data` later) | `true` | none; deps `c->a`,`c->b` |
| E) unknown ident | `turunan c = a + zzz` | `false` | **E3001** `zzz` (no spurious E4201) |
| F) valid turunan chain | `a=b+1` / `b=c+1` / `c` data | `true` | none; deps `a->b`,`b->c` |

**Conclusion:** every case the report wanted is **already handled correctly**. The report's
premise ("mutual forward-ref kena E3001 dulu") reflects an **earlier state** of the codebase,
not branch `v132-sesi2`.

## 3. Root cause of "why it already works" (file:line)

Two mechanisms already cooperate; the requested hoisting is one of them and **already exists**:

1. **Hoisting is already implemented** — `PromptJSResolver.gatherGlobals()`
   (`src/resolver/promptjs-resolver.js:486`) pre-scans the top-level AST and adds **every**
   top-level declaration — `Data`/`Tetap`/`Ubah`/`Fungsi`/`Komponen` **and `TurunanDeclaration`**
   (`:495`) — into the global scope. It is invoked at `resolve()` (`:399`) **before** the main
   `accept(ast, this)` traversal. Therefore a top-level `turunan` that forward-references another
   top-level symbol is **legal** and `visitIdentifier` (`:519`) finds it in scope → **no E3001**.

2. **Cycle detection records all computed edges** — `buildDependencyGraph()`
   (`src/analyzer/dependency-graph.js`) collects `turunan` init references as `computed` edges,
   **including the self-edge** (the S2-INK-1 fix from the previous round removed the
   `ref.symbol.id === sym.id` guard and dedupes edges). `detectCycles()` runs DFS and emits
   **E4201** with the full cycle path (`from -> … -> from`).

Because forward-refs are hoisted (so no premature E3001) **and** the graph is complete (so the
cycle is seen), E4201 fires exactly when it should.

## 4. Decision: no source change (honest trade-off)

The user explicitly authorized stopping safely if the fix "memang tidak bisa dan tidak perlu".
Re-implementing hoisting or altering the resolver traversal here would be **change for its own
sake**: it risks broad regression across the 1066-test baseline (E3001 ordering, symbol
shadowing, `saat`/watcher edges) for **zero behavioral gain**. The correct professional action
is to **convert "happens to work" into "proven & gated"** — an exhaustive regression suite.

## 5. Regression suite added — `tests/v10-turunan-cycle-hoisting.test.js` (9 tests)

- **Cycle → E4201, not E3001:** mutual A↔B (asserts path `a -> b -> a`, `severity:error`,
  `stage:Analyzer`, non-empty suggestion, **and explicitly `has(E3001)===false`**); 3-node
  chain (path `a -> b -> c -> a`); self-cycle (`c -> c`); 2-cycle embedded in a 4-node graph.
- **Valid forward-refs stay valid:** `turunan` reading `data` declared later (asserts deps
  `c->a`,`c->b` recorded for reactivity); valid turunan chain `a->b->c`; diamond-shaped
  non-cycle (`d<-b,d<-c,b<-a,c<-a`) → success, **no false-positive E4201**.
- **Error-path integrity:** genuinely-unknown identifier → still **E3001** (`zzz`), no spurious
  E4201; a source with BOTH a real cycle AND an unknown ident still reports E3001 (`qqq`).

## 6. Quality gate (all green, Node 22)

| Gate | Result |
|---|---|
| v10 isolated | **9/9 passed** |
| Full suite | **1075 tests / 57 files passed** (1066 baseline + 9 new) |
| Determinism | **3× consecutive full runs, 0 flaky** |
| Coverage | **85.82% stmts / 76.23% branch** (unchanged — test-only addition) |
| Module coverage | resolver **98.5%/82.12%**, analyzer **94.01%/90.16%**, `error-codes.js` **99.65%** |
| Typecheck | `tsc --noEmit` exit 0 |
| ESLint | v10 exit 0 (0 warnings) |
| Prettier | v10 clean |

## 7. Remaining gaps (honest disclosure — unchanged from SESI-2, NOT fixed here)

1. **Mutual forward-ref cycle:** _now confirmed to already work_ (this report). No open gap.
2. **Non-top-level `turunan`:** hoisting via `gatherGlobals` covers **top-level** declarations.
   `turunan` nested inside a component/page scope relies on the normal (non-hoisted) in-scope
   ordering; cross-scope forward-ref cycles at nested scope are out of scope for Point-2 and
   were not part of the reported repro. Not changed.
3. `Gunakan Nama(prop:val)` still → E3001 (prop-parsing unimplemented) — tracked separately.
