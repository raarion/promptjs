# PromptJS — Level 1 Maturation Roadmap

> **Level 1** merges the original audit's Phase 0 (Truth & Trust), Phase 1
> (Engineering Hygiene) and Phase 2 (Feature Completeness) into a single
> dependency-ordered effort. Source audit: _Catatan Kelayakan & Kematangan —
> PromptJS v0.2_ (commit `9a60726`).

## Ordering principles

1. **Foundation first.** A safety net (tests + CI + lint) is installed before
   any behavioral change so nothing regresses silently.
2. **Decisions before docs.** Feature decisions (named pages, loop syntax,
   components) are made and implemented _before_ user-facing documentation is
   finalized — otherwise the same docs would be written twice.
3. **Documentation is a continuous thread.** Process docs (CHANGELOG,
   CONTRIBUTING) start in Wave A and CHANGELOG is updated every wave; design
   decisions are recorded as they are made; user-facing reference docs are
   finalized once the implemented reality is stable.

## Tooling decisions (locked)

- **Test runner: Vitest** — mature snapshot testing and coverage thresholds are
  core Level 1 requirements; `node:test` snapshots are experimental and
  Node-22-only. Dev-only dependency, so the zero-runtime-dependency promise of
  the _compiled output_ is unaffected.
- **Node support: 20 / 22 / 24** — Node 18 reached end-of-life in April 2025;
  modern tooling (ESLint 10, Vitest 4) requires Node 20+. This is a deliberate
  deviation from the audit's "Node 18/20/22".
- **Named pages: implement** (not removed) — they were always part of the
  design intent.

---

## Wave A — Foundation & Safety Net  ✅ done

- [x] A1. Vitest setup + migrate the 24 manual tests → `tests/`. (F1.1, partial)
- [x] A2. ESLint + Prettier + `.editorconfig`. (F1.4)
- [x] A3. `CHANGELOG.md` + `CONTRIBUTING.md` skeleton (living docs). (F0.4)
- [x] A4. GitHub Actions CI: lint + test + smoke, Node 20/22/24. (F1.5, partial — coverage gate deferred)
- [x] A5. This roadmap document. (F0.2 / docs)

## Wave B — Design Decisions & ADRs  ✅ done

- [x] B1. Named-page semantics: `Halaman Nama:` → **implement** (name → root id). (F2.2)
- [x] B2. Loop-syntax canon: `untuk…in` canonical; `in`/`dari`/`from` aliases;
      counted loop `N kali`/`N times`. (F2.3)
- [x] B3. Component system design (named props; `Buat Name(...)` instantiation). (F2.1, design)
- [x] B4. Recorded B1–B3 in `doc-dev/ADR-001-level1-decisions.md`. (docs)

## Wave C — Feature Implementation _(each feature lands with its tests)_

- [x] C1. Loop-syntax reconciliation + counted loop + `from` alias. (F2.3)
- [x] C2. Named pages `Halaman Nama:` → root element id. (F2.2)
- [x] C3. Full Component system (declaration + named props + `Buat Name(...)`
      instantiation + resolver scoping + valid codegen). (F2.1)
- [ ] C4. Expressions: `Else-if` chains, full ternary/boolean, list/object literals. (F2.4) — **next**

## Wave D — Comprehensive Testing _(syntax now stable)_

- [ ] D1. Snapshot / golden tests for codegen per statement type. (F1.2)
- [ ] D2. Negative-test matrix: every `E####` fired by the right input. (F1.3)
- [ ] D3. Raise coverage ≥ 80% and **enable the coverage gate** in CI. (F1.1 + F1.5)

## Wave E — Final Documentation _(reflects the now-final reality)_

- [ ] E1. Fix the README headline example to final valid syntax. (F0.1)
- [ ] E2. Finalize feature table + event/tag alias tables (remove `...` placeholders). (F0.2 + F2.5)
- [ ] E3. Correct the project-structure diagram (real `src/`, drop `runtime/` &
      `src/promptjs/`, add `examples/` + `tests/`). (F0.3)
- [ ] E4. Add `examples/` (≥3 runnable `.pjs`) and make CI compile examples +
      README snippets. (F0.5)
- [ ] E5. Final CHANGELOG pass for the v0.3 release; reconcile CONTRIBUTING. (F0.4)

## Wave F — Typing _(cross-cutting polish)_

- [ ] F1. JSDoc typing with `checkJs` at hotspots; wire into CI lint. (F1.6)

---

## Definition of done for Level 1

- Every documented example compiles (verified in CI).
- Coverage ≥ 80%; every error code has a test.
- Components + named pages implemented and documented.
- CI green across Node 20/22/24; lint + format clean.
- README is accurate: no advertised-but-dead features, no wrong paths.
