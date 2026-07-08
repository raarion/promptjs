# LIM/MIS Numbering Mapping — v132 (resolves #78)

> **Purpose.** Issue [#78](https://github.com/raarion/promptjs/issues/78) flagged
> a release-note risk: a later `v132` commit (`21fe9e0`) used short labels
> `LIM-1..4` / `MIS-1`, while the original stress-test tracker
> ([#73](https://github.com/raarion/promptjs/issues/73)) uses `LIM-01..08` /
> `MIS-01..08`. Without an explicit mapping it is easy to accidentally claim
> "all LIM/MIS fixed" when only a differently-numbered subset was addressed.
> This document is that mapping. It also folds in the additional
> architecture-level issues opened during the `v132` audit (#77, #79–#82),
> since those *are* the original LIM/MIS items in practice.

**Branch:** `v132` · **Head at time of writing:** `5dec780` (built on `49664fc`)

---

## Original `LIM-01..08` (from the Notion Lite stress test, issue #73)

| Original label | Description | Short/latest label | Related issue | Related commit/test | Status | Release-note wording |
|---|---|---|---|---|---|---|
| LIM-01 | No event delegation — every handler compiles to its own `addEventListener` | — (not renumbered) | — | `src/compiler/emitters/statements.js` (`visitKetikaStatement`) | **By design / Not applicable.** PromptJS intentionally compiles each `Ketika`/`on_*` to a direct `addEventListener` call — there is no virtual DOM or synthetic event system to delegate through. This is a valid, explicit architectural choice (simpler generated code, no delegation bugs), not an unfinished feature. | "PromptJS does not use event delegation by design; each handler is a direct `addEventListener` call." |
| LIM-02 | `turunan` computed values not reactive in display | Overlaps with backlog [#80](https://github.com/raarion/promptjs/issues/80) | #80 | `docs/language/reactivity.md` (documented in `9415eb5`); `tests/v10-turunan-cycle-hoisting.test.js` (computed dependency mechanics) | **Partial — documented, not fully solved.** `turunan` recomputes correctly and works inside `Saat` (`Saat computed:` re-renders on every dependency change — verified). But a *direct* one-shot property assignment (`teks = <turunan>`, no `Saat`) is a snapshot, not a live binding — same caveat as plain `data`. Docs now say this explicitly; ergonomic direct-binding support remains backlog per #80. | "`turunan` is reactive when read inside `Saat` (or watched via `__watch`); direct property assignment without `Saat` is a one-time snapshot — this is documented, not silently broken." |
| LIM-03 | No keyed list reconciliation (full re-render on change) | — (solved pre-`21fe9e0`) | closed via #47–#49 roadmap (K1a/K1b) | `tests/v7-keyed-list.test.js`, `tests/v7-list-integrity.test.js`, `docs/language/reactivity.md` §"Diff Berkunci" | **✅ Fixed.** `Ulangi untuk ... dari <reactive> dengan kunci <expr>:` performs real keyed diff reconciliation over actual DOM nodes (`Map<key, node>`, reused/reordered via `insertBefore`), landed in v1.3.1 well before this stress-test round. Confirmed present and tested on current `v132` HEAD. | "Keyed list reconciliation is implemented and tested (`dengan kunci`)." |
| LIM-04 | No component lifecycle hooks (`onMount`, `onDestroy`) | — (solved pre-`21fe9e0`) | — | `docs/language/keywords.md` (`dipasang`/`dilepas`), `src/compiler/emitters/statements.js` (`visitLifecycleStatement`) | **✅ Fixed.** `dipasang`/`mounted` and `dilepas`/`unmounted` lifecycle hooks exist and compile to the SPA mount/unmount factory functions. Confirmed present on current `v132` HEAD. | "Lifecycle hooks (`dipasang`/`dilepas`) are implemented." |
| LIM-05 | No CSS scoping — all styles global | [#79](https://github.com/raarion/promptjs/issues/79) | #79 | `src/engine/css.js` (`scopeSelector`, `processGayaBlocks`, `buildScopeId`, `sanitizeScopeName`), `src/engine/promptjs.js` (opt-in detection + AST scope flags), `src/compiler/promptjs-compiler.js` (`currentCssScopeAttr`, `_componentScopeStack`), `src/compiler/emitters/statements.js` (`visitKomponenDeclaration`, `visitBuatStatement` — DOM stamping), `src/engine/builder.js` (per-page scope, now opt-in-gated), `tests/v21-css-scoping.test.js` (21 tests) | **✅ Implemented (2026-07-08), STATUS UPDATED from "partially wired, non-functional end-to-end."** CSS scoping is now opt-in via `gayaCakupan: benar` front-matter (never on by default — existing projects are byte-identical without it). Scope naming follows the maintainer's decision recorded on issue #79 (2026-07-07): `data-pjs-<fileScope>` for page/file-level `Gaya:` blocks, `data-pjs-<fileScope>-<componentName>` for component-level ones — so two different files declaring a same-named `Komponen` never collide. The compiler now actually stamps the matching `data-pjs-*` attribute on every element created inside the relevant scope (`visitKomponenDeclaration` for the component root, `visitBuatStatement` for every element, tracked via a `_componentScopeStack` push/pop mirroring the existing `_saatCleanupStack` pattern), so the CSS selector's `[data-pjs-*]` attribute selector genuinely matches real DOM nodes — verified end-to-end via jsdom (computed style assertions, not just string containment). Dev server, project builder, and legacy CLI build (including `--prerender`) all derive the SAME scope id for the same file, verified by dedicated tests. The previously-silent bug where `buildProject` passed a `scope` to every page UNCONDITIONALLY (which would have made DOM-stamping a surprise breaking change) was fixed as part of this work — scoping is now applied only when a page explicitly opts in. Remaining known limitation: because `Gaya:` extraction still happens via string/indentation scanning BEFORE lexing (not a full AST pass — see Lapis 4 audit's design section F, option (b), accepted for this implementation), component-boundary detection can theoretically mis-track boundaries inside deeply unusual comment/string constructs; ordinary code is unaffected (verified with block comments, string literals, and `--`/`//` line comments containing component-like text). Issue kept **open** pending maintainer's explicit closure decision — closure is not implied by this status update. | "CSS scoping is implemented as an explicit opt-in (`gayaCakupan: benar`); without it, projects remain unchanged (100% global, byte-identical). When enabled, styles are scoped per file and per component (`data-pjs-<file>[-<component>]`), matching real DOM attributes stamped by the compiler — verified end-to-end, not just at the CSS-string level ([#79](https://github.com/raarion/promptjs/issues/79))." |
| LIM-06 | No nested components | — (solved pre-`21fe9e0`) | — | `docs/language/components.md`, `tests/components.test.js`, `tests/v7-component-default-params.test.js` | **✅ Fixed.** Components can reference/instantiate other components (`Gunakan <Nama>(...)`) and nest arbitrarily. Confirmed present and tested. What remains open is *slots/transclusion* specifically (passing child content INTO a component) — tracked separately as [#82](https://github.com/raarion/promptjs/issues/82), not the same as "no nested components." | "Nested components work; passing arbitrary child content into a component (slots) is separate backlog ([#82](https://github.com/raarion/promptjs/issues/82))." |
| LIM-07 | No form input two-way binding | — (solved pre-`21fe9e0`) | — | `docs/language/reactivity.md` §"Two-way Binding"; `tests/v7-two-way-binding.test.js` | **✅ Fixed.** `ikat`/`bind` inside a form element body wires `.value` both ways (`state -> input` and `input -> state`) with zero vanilla JS. Confirmed present, tested, and — as of `5dec780` — leak-free even when declared inside a re-rendering `Saat` block. | "Two-way binding (`ikat`) is implemented and tested." |
| LIM-08 | No comment syntax that works everywhere | — (solved pre-`21fe9e0`) | #76 (BUG-04, closed) | `e24a30a`, `f46bb54`; `tests/v11-block-comments.test.js`, `tests/v13-comment-stripping-regression.test.js` | **✅ Fixed.** Block comments (`/* ... */`) now work inside `Gaya:` blocks and PromptJS code generally, including string-aware stripping so URLs/CSS `content` values aren't corrupted. | "Block comment support (`/* ... */`) works throughout PromptJS source, including inside `Gaya:` blocks." |

---

## Original `MIS-01..08` (missing features, from the same stress test)

| Original label | Description | Short/latest label | Related issue | Related commit/test | Status | Release-note wording |
|---|---|---|---|---|---|---|
| MIS-01 | No array map/render (list transformation) | — (solved pre-`21fe9e0`) | — | `docs/language/expressions.md` (`pilih(arr, fn)` → `.map(fn)`); reactive `Ulangi untuk` | **✅ Fixed.** `pilih(arr, fn)` maps arrays; reactive lists (`Ulangi untuk ... dari <reactive>`) render array transformations directly. | "Array transformation (`pilih`) and reactive list rendering are implemented." |
| MIS-02 | No async/await | — (not applicable — different mechanism) | — | `docs/language/keywords.md` (`ambil`/`fetch`); `docs/language/reactivity.md` §"Fetch Inline" | **By design / Not applicable.** PromptJS doesn't expose raw `async`/`await` syntax to the user; instead `ambil`/`fetch` (with `.memuat`/`.galat` auto-state) covers the async-HTTP use case declaratively, compiling to promise-based vanilla JS under the hood. This is an intentional DSL-level abstraction, not a missing primitive — no evidence of real apps needing raw `await` that `ambil` can't express. | "PromptJS expresses async HTTP via the declarative `ambil` (fetch) construct rather than exposing raw `async`/`await`." |
| MIS-03 | No error boundaries | — (solved pre-`21fe9e0`) | — | `docs/language/reactivity.md` §Tree-Shaking table (`__pjs_handleError`); `src/compiler/emitters/statements.js` (catch block in `visitKetikaStatement`) | **✅ Fixed.** Every `Ketika`/event-handler body is wrapped in a try/catch that routes to `__pjs_handleError` (console.error + clears any error overlay), acting as a per-handler error boundary. | "Event handlers have built-in error-boundary behavior via `__pjs_handleError`." |
| MIS-04 | No routing guards | [#81](https://github.com/raarion/promptjs/issues/81) | #81 | `docs/language/auth.md` (`butuhAuth`, page-level only) | **❌ Open — backlog, deferred.** Page-level `butuhAuth: benar` exists (redirects if unauthenticated) but there is no per-route conditional guard API (e.g. "redirect away from login if already authenticated", async guard checks). See [Design Decision](#routing-guards-design-decision-81) below. | "v132 has page-level auth guards (`butuhAuth`); flexible per-route guard flows are planned for a future release ([#81](https://github.com/raarion/promptjs/issues/81))." |
| MIS-05 | No CSS variables support | — (solved — plain CSS passthrough) | — | `Gaya:` blocks emit literal CSS text | **✅ Fixed / Not actually missing.** `Gaya:` blocks pass property values through as literal CSS text, so standard CSS custom properties (`--my-color: red;` / `color: var(--my-color);`) already work — PromptJS doesn't need special syntax for a feature native CSS already provides. Verified: no special-casing in `src/engine/css.js` rejects or mangles `--*`/`var(...)` syntax. | "CSS custom properties (`--var`, `var(...)`) work as plain CSS inside `Gaya:` blocks — no special PromptJS syntax needed." |
| MIS-06 | No conditional attributes | — (solved — plain expressions) | — | `src/compiler/emitters/statements.js` (`emitSafeAttribute` takes any lowered expression) | **✅ Fixed / Not actually missing.** Any attribute value accepts a full expression (ternary, boolean, etc.), e.g. `disabled=aktif ? "" : null`-style patterns lower like any other attribute value through `emitSafeAttribute`. There is no separate "conditional attribute" syntax needed — expressions already flow through. (Note: attributes are NOT currently auto-reactive without `Saat`/`on_*`, same caveat as LIM-02/#80.) | "Attribute values accept arbitrary expressions, including conditionals; automatic reactivity without `Saat` follows the same documented boundary as `turunan` display (#80)." |
| MIS-07 | No dynamic tag names | — (real gap, not yet tracked pre-#78) | New: recommend folding into [#79](https://github.com/raarion/promptjs/issues/79) (CSS scoping issue already asks "how should scoping behave with dynamic tag names?") or filing as its own small backlog item | — | **❌ Open — confirmed gap.** There is no `Buat <expr>:` form where the tag name itself is a runtime variable (e.g. rendering `h1`/`h2`/`h3` based on a `nivel` variable) — tag names are parsed as static selector tokens. Real-world impact is narrow (heading-level components, generic wrapper components) so this is lower priority than #79/#81/#82. | "Dynamic tag names (`Buat <expr>:`) are not supported in v132; tag names must be static. Tracked as a small follow-up." |
| MIS-08 | No slot/transclusion for components | [#82](https://github.com/raarion/promptjs/issues/82) | #82 | `src/parser/promptjs-parser.js` (`_parseGunakanStatement`, E2030) | **❌ Open — backlog, deferred.** Confirmed real gap: no syntax for passing child content into a component (card bodies, modal headers, layout wrappers). See [Design Decision](#slots-design-decision-82) below. **UPDATE (v132 Lapis 1–3 Stabilization Pass, 2026-07-07):** the Lapis 3 audit found that `Gunakan NamaKomponen(...):` followed by an indented child block previously compiled SILENTLY — the block was misparsed as unrelated sibling statements next to the component instance, with zero diagnostics, rather than being treated as "unused/not yet supported." This has been fixed as a stabilization-pass minimal safeguard (NOT a slots implementation): the parser now consumes such a child block and emits **E2030** ("child block belum didukung — slot/transklusi belum diimplementasikan"), so the situation is now diagnosed instead of silently miscompiled. Full slots/transclusion implementation is still deferred pending a Lapis 3/4 design decision, per the design section below — this fix only prevents a confusing silent-wrong compile in the meantime. | "Slots/transclusion for components are not yet supported in v132 ([#82](https://github.com/raarion/promptjs/issues/82)); writing a child block under `Gunakan NamaKomponen(...):` now produces a clear error (E2030) instead of silently compiling it in the wrong place." |

---

## Summary table (for release notes)

| Bucket | Count | Status |
|---|---|---|
| Original BUG (17 total) | 17/17 | ✅ All fixed/closed on `v132` (per #73 tracker sync) |
| LIM-01..08 | 7 fixed/N-A, 1 partial (#80) | CSS scoping (#79) fully implemented including `:global()` escape hatch |
| MIS-01..08 | 5 fixed/N-A, 3 open (#81, #82, dynamic tags) | Routing guards and slots are the two real remaining feature gaps; dynamic tag names is a smaller, newly-identified gap |

**Recommended release-note wording (safe, per #78's acceptance criteria):**

> v132 fixes 100% of the original BUG bucket (17/17) from the Notion Lite
> stress test. Of the original LIM/MIS findings: event delegation, async/await,
> CSS variables, and conditional attributes were re-evaluated and found to be
> either working-as-designed or already solved by existing constructs — not
> real gaps. Keyed lists, lifecycle hooks, nested components, two-way binding,
> comment syntax, array mapping, error boundaries, and **CSS scoping** are
> confirmed implemented and tested. Two genuine architecture-level gaps remain,
> explicitly deferred with tracked design issues: **routing guards**
> ([#81](https://github.com/raarion/promptjs/issues/81)) and **slots/transclusion**
> ([#82](https://github.com/raarion/promptjs/issues/82)). Direct reactive
> display/property binding without `Saat` remains a documented, honest
> limitation ([#80](https://github.com/raarion/promptjs/issues/80)), and dynamic
> tag names are a newly-identified smaller gap. None of these are silent —
> every one either works, is documented, or has a tracked issue.

---

## Design decisions for the three deferred architecture gaps

These sections give each backlog issue (#79, #81, #82) the "minimal design
final + issue jelas + keputusan v132 vs v1.3.3/v1.4.0" called for by the
fast-track plan's LIM/MIS handling rule ("LIM/MIS besar yang krusial untuk
full-stack frontend: minimal harus punya desain final, issue jelas, dan
keputusan apakah masuk v132 malam ini atau masuk v1.3.3/v1.4.0").

### CSS scoping design decision (#79)

**Decision: Implemented on `v132` (2026-07-08), opt-in — see "Implementation
status" below.** The design below is kept for historical record; the
"Implementation status" note reflects what actually shipped, including the
maintainer's follow-up naming decision (issue #79 comment, 2026-07-07).

**Recommended model:** opt-in, compile-time-generated scope attribute —
mirrors Vue's `data-v-xxxxxx` approach because it requires no runtime
overhead (attribute matching only, no shadow DOM, no CSS-in-JS runtime) and
composes cleanly with the existing zero-dependency-output philosophy.

- **Opt-in via a per-page/per-component directive**, e.g. a front-matter flag
  `gayaCakupan: benar` (scoped: true) or a `Gaya cakupan:` block variant —
  default remains GLOBAL (today's behavior) so nothing breaks for existing
  `.pjs` files.
- **Mechanism:** compiler generates a short hash from the source file path
  (e.g. `data-pjs-a1b2c3`), appends it as an attribute to every element
  created within that file's `Buat` statements, and rewrites each selector
  in the matching `Gaya:` block to include `[data-pjs-a1b2c3]`. Pure string
  transform at compile time — no runtime cost, no new helper needed.
- **Global styles** remain declared in a `Gaya:` block in a file that does
  NOT opt into scoping (e.g. a shared `layout.pjs` or top-level page file),
  or via an explicit `:global(...)` escape hatch inside a scoped block for
  the rare case of intentionally leaking one selector.
- **Build/prerender interaction:** none — the scope attribute is just
  another static attribute on the element, already covered by the existing
  `emitSafeAttribute`/CSS-inlining pipeline (BUG-11b, `10fac7b`).
- **Dynamic tag names / nested components:** scoping attaches to the
  compiled OUTPUT element regardless of tag, so it is compatible with any
  future dynamic-tag-name support (MIS-07) without redesign.

**Why v1.3.3, not v132 (original plan):** this needed new compiler passes
(selector rewriting, scope-id generation, directive parsing) plus a full test
matrix (scoped vs global, opt-in directive parsing, build/prerender inlining
with scope attributes, nested-component interaction) — realistically more
than a same-night fast-track addition, hence the original deferral.

**Implementation status (2026-07-08):** implemented on `v132` following the
Lapis 4 CSS Architecture Audit (`docs/project/lapis-4-css-architecture-audit-v132.md`)
and a subsequent maintainer decision on issue #79 recorded 2026-07-07T17:19:29Z.
Differences from the original draft above:

- **Scope naming uses file + component, not a hash.** Maintainer decision:
  `data-pjs-<fileScope>` for page/file-level `Gaya:`, `data-pjs-<fileScope>-
  <componentScope>` for component-level `Gaya:` — chosen over a
  component-only or content-hash scheme specifically to prevent collisions
  when two different files declare a same-named `Komponen` (e.g. two
  `Komponen Kartu` in `home.pjs` and `dashboard.pjs`). Both segments are
  sanitized/lowercased deterministically (`sanitizeScopeName` in
  `src/engine/css.js`), so the same inputs always produce the same output
  across dev/build/prerender.
- **Granularity is per-component, not per-file**, correcting the pre-existing
  builder behavior the Lapis 4 audit found (`buildProject` used to pass one
  scope for an entire page, so two components in the same file would have
  collided under the ORIGINAL half-implemented mechanism). Implemented via a
  compiler-side `_componentScopeStack` (mirrors the existing
  `_saatCleanupStack` push/pop pattern) that tracks the innermost currently-
  open `Komponen` while emitting `visitBuatStatement`/`visitKomponenDeclaration`.
- **DOM stamping is real**, not just a CSS-string transform: every element
  the compiler emits gets `setAttribute("data-pjs-<scope>", "")` when
  scoping is active, so the CSS selector's `[data-pjs-*]` attribute selector
  genuinely matches — verified via jsdom (`tests/v21-css-scoping.test.js`),
  including a computed-style assertion, not just string containment.
- **Builder no longer scopes silently.** The Lapis 4 audit found that
  `Builder.buildProject` ALREADY passed a `scope` to every page unconditionally
  — a latent bug that would have made DOM-stamping a surprise breaking change
  the moment it shipped. This was fixed as part of #79's implementation: a
  page is only scoped when its OWN front-matter has `gayaCakupan: benar`.
- **`:global(...)` escape hatch IS implemented** (2026-07-08, same session
  as the scoping work). Selectors wrapped in `:global(...)` inside a
  scoped `Gaya:` block are marked `global: true` by the CSS parser; the
  compile step skips `scopeSelector()` for these rules, so they match
  globally without a `[data-pjs-*]` attribute selector. Supports
  comma-separated selectors inside the wrapper, descendant/combinator
  suffixes (`:global(.overlay) .content`), and works inside `@media`
  children. Tag aliases are still translated inside `:global()` (e.g.
  `tombol` → `button`). Verified by 13 dedicated tests
  (`tests/v23-css-global-escape.test.js`) plus a dogfood E2E example
  (`examples/kedai-kopi/index.pjs`, 6 tests in
  `tests/v24-dogfood-kedai-kopi.test.js`).
- Dev server, project builder, and legacy CLI build (`pjs build`, including
  `--prerender`) were all verified to derive the SAME scope id for the same
  file — no inconsistency between the three output paths.

Issue #79 is **ready to close**. All acceptance criteria are met: opt-in
scoping via `gayaCakupan: benar`, per-component scope naming,
real DOM stamping, builder gating, `:global()` escape hatch, 60+ tests
across 5 dedicated test files, a dogfood example, and full documentation.
The only remaining known limitation (Gaya extraction via string/indentation
scanning) is an accepted design trade-off, not a gap.

### Routing guards design decision (#81)

**Decision: Deferred to v1.3.3, NOT v132.**

**Recommended model:** declarative per-route guard directive, sync-first,
async-capable, explicitly documented as UX-only (matching the existing
`butuhAuth` honesty precedent in `docs/language/auth.md`).

- **Syntax direction** (front-matter, page-level, extending the existing
  `butuhAuth`/`redirect` directives already in `docs/language/directives.md`):

  ```pjs
  ---
  router: benar
  butuhAuth: benar          # existing: redirect if NOT authenticated
  jikaAuth: "/dashboard"    # NEW: redirect AWAY if ALREADY authenticated
                            #      (e.g. for a login/register page)
  ---
  ```

- **Async guard support:** allow `butuhAuth` to optionally point at a
  user-supplied verification hook (mirroring the existing
  `window.__pjs_verifyPeran` pattern for role checks) — e.g.
  `window.__pjs_verifyAuthAsync` returning a Promise<boolean>, checked
  before the page factory runs. Sync remains the default/simple path.
- **CSP-safety requirement (from the issue's own acceptance criteria):**
  the guard must compile to plain `if`/`Promise.then` control flow — no
  `eval`/`new Function`, consistent with the rest of the compiler output.
- **Honest docs requirement:** every doc mentioning this feature must
  repeat the existing `docs/language/auth.md` warning verbatim — these are
  UX/routing conveniences, not a security boundary, exactly like the
  current `butuhAuth`.

**Why v1.3.3, not v132:** needs new directive parsing, resolver validation
(e.g. reject `jikaAuth` without `router: benar`), analyzer support, compiler
codegen for the async path, and a test suite covering allowed/blocked/
redirect/async-failure per the issue's own acceptance criteria — a genuinely
new feature surface, not a bugfix. Also lower urgency than CSS scoping since
`butuhAuth` already covers the most common "protect this page" case today.

### Slots design decision (#82)

**Decision: Deferred to v1.3.3 or v1.4.0 (explicitly agreed by `raarion` in
the issue itself: "Likely better for v1.3.3/v1.4.0 than a rushed v132
release unless scope is kept very small").**

**Recommended minimal model (default-slot only, no named slots initially):**

- **Syntax direction:** a component body may contain a `Slot:` /
  `transklusi:` placeholder; the CALLER's `Gunakan <Nama>(...)：` block body
  (currently unused for non-prop content) supplies the children to render
  there:

  ```pjs
  Komponen Kartu(judul):
      Buat div.kartu:
          Buat h3: judul
          Slot:              # placeholder — replaced by caller's body

  Gunakan Kartu(judul: "Halo"):
      Buat p: "Konten body kartu di sini"   # becomes the Slot content
  ```

- **Reactive slot content:** since slot content is just AST from the
  CALLER's scope spliced into the component's render body at compile time
  (not a runtime portal), reactive state referenced in the slot content
  continues to work exactly as if it were written inline — no new runtime
  primitive needed.
- **Named slots:** explicitly OUT of scope for the minimal version (matches
  "keep scope very small"); revisit only if default-slot usage in dogfooded
  apps proves insufficient.
- **Compiles to:** pure vanilla JS append — the component factory function
  accepts an extra `__slotFn` parameter (a closure emitted by the caller)
  and calls it at the `Slot:` position instead of a hardcoded body — no
  vDOM, no new helper class needed beyond what `visitKomponenDeclaration`
  already does for props.

**Why v1.3.3/v1.4.0, not v132:** this is new component-architecture surface
area (parser grammar for `Slot:`, resolver scope-splicing semantics,
compiler codegen for the extra closure parameter, full test matrix) that
the issue's own author explicitly flagged as too large for a "rushed v132
release." Agreeing with that assessment rather than second-guessing it.
