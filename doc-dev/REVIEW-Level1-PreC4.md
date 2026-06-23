# PromptJS — Pre-C4 Refining Review

> Refining pass over the hastily-landed Level 1 work (Waves A–C3) **before**
> starting C4 (expressions). Goal: pay down cleanliness/consistency debt without
> changing language behavior. All 36 tests stay green; smoke compile unchanged.

## ✅ Applied in this pass (branch `chore/level1-refine`)

These are low-risk, no-behavior-change cleanups, each verified against the test
suite and the smoke compile.

1. **Prettier formatting** — all 23 previously-unformatted source files now pass
   `prettier --check`. (`npm run format` had never been run after the rush.)
2. **Lint warnings: 33 → 0.** Eliminated every `no-unused-vars` warning:
   - Unused `catch (e)` / `catch (e2)` bindings → optional catch binding
     (`} catch {`). (13 sites)
   - Unused function parameters → `_`-prefixed (`node` → `_node`, `head`,
     `options`). The ESLint config already allows the `/^_/` convention. (10 sites)
   - Genuinely dead locals/imports removed: `resolveOutputPath` import,
     `useColor` (build/compile/init/serve — see #2 under "Recommended"),
     `green`, `gray`, `reset`, `open`, `hookName` + its `lifecycleMap`,
     `promptjsEvent`, and two stray `TT` bindings. (10 sites)
3. **CI hardening:**
   - `lint` script now runs `eslint . --max-warnings=0` — warnings fail the build.
   - Added a **Format check** step (`npm run format:check`) to `.github/workflows/ci.yml`
     before lint, so unformatted code can no longer merge.
4. **Removed an advertised-but-dead feature.** The `--open` flag was parsed but
   never implemented, yet advertised in CLI help. Removed the dead parse and the
   two help/JSDoc lines so help matches reality (Level 1 DoD: "no
   advertised-but-dead features"). Re-add cleanly when the feature is built.

### Verified clean signals
- `EVENT_ALIASES` resolution is correctly done in the **parser**
  (`promptjs-parser.js:417`); the lexer's duplicate computation was dead and was
  removed — **not** a behavior change.
- Error codes are consistent: all 66 `E####` codes defined in `error-codes.js`
  are referenced, and no undefined code is referenced. Healthy baseline for the
  Wave D negative-test matrix.

## 🔧 Recommended follow-ups (proposed, NOT applied — your call)

Ordered by value/effort. None block C4, but #1 and #2 are worth doing before the
codebase grows further.

1. **Migrate `var` → `const`/`let` (≈284 occurrences).** The source still uses
   `var` pervasively (e.g. all of `analyzer/dependency-graph.js`). For a Node ≥20
   codebase this is dated and hides accidental rebinding/hoisting bugs.
   - **How:** enable `no-var` + `prefer-const` in `eslint.config.js`, then
     `eslint . --fix` (both rules are auto-fixable). Tests + smoke verify safety.
   - **Risk:** low (mechanical, auto-fixed) but the diff is large (~284 lines).
     Best as its own dedicated commit/PR so review stays readable.
> **Status update:** #1 (var→const) done in PR #2; #2 (color helper) done in
> PR #3; #3 (CLI output) was already satisfied — the only `console.*` calls are
> inside the emitted live-reload browser script, not CLI output.

2. **[DONE — PR #3]** **Centralize color handling + honor `NO_COLOR`.** Color is handled
   inconsistently across CLI commands: `compile.js` correctly gates on
   `useColor = !stdout`, but `build.js` / `init.js` / `serve.js` emitted ANSI
   codes unconditionally (the dead `useColor = true` locals removed in this pass
   were the leftover intent). No command honors the `NO_COLOR` env var or TTY
   detection.
   - **Proposal:** a single `makeColors({ enabled })` helper in `cli/utils.js`
     that respects `process.env.NO_COLOR` and `stream.isTTY`, used by every
     command. This is a small behavior change (color suppression), so it gets its
     own commit + a test.
3. **CLI output consistency.** 46 `console.*` calls coexist with
   `process.stdout/stderr.write`. Pick one convention (suggest `process.std*` for
   machine-friendly output, `console.error` for diagnostics) and apply uniformly.
4. **Stale comment cleanup.** `analyzer/promptjs-analyzer.js` still carries a
   `[H6 FIX] E6xxx → E4xxx baru` migration note; fold the rationale into the ADR
   or delete.

## Wave D/E reminders surfaced by this review
- Coverage baseline ~45% (per STATUS); the coverage gate is still deferred. With
  66 error codes enumerated, the negative-test matrix (D2) has a concrete target.
- `npm run build` finds no `.pjs` files — the `examples/` directory (Wave E / E4)
  doesn't exist yet, so the production build path is effectively untested.

## Net effect
- Format: **23 files fixed → 0 outstanding.**
- Lint: **33 warnings → 0**, and warnings are now build-breaking.
- CI: **+1 gate** (format check); lint hardened.
- Behavior: **unchanged** (except removing the non-functional, falsely-advertised
  `--open` flag). 36/36 tests pass; smoke compile identical.
