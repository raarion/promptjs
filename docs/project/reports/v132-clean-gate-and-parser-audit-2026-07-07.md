# v132 Clean Gate + Parser `this.pos` Micro-Audit Report — 2026-07-07

## Branch / commit context

The local repository only exposes the current branch (`work`), but the latest
11 commits are the v132 stabilization sequence. Reviewed commits:

1. `113be36` docs(v132): finalize Lapis 1-3 Stabilization Pass tracking document
2. `0468a70` docs(v132): P2 status sync -- CSS scoping and slots status corrections, honest wording
3. `17e98fc` fix(v132): P1.2/P1.3 -- activate E2003 PascalCase validation, add W4005 unknown-prop warning
4. `cca00e9` fix(v132): P0.1/P0.7 -- parser-side fixes: modifier backtrack bug, W2005, E2030
5. `780da34` fix(v132): forward parser-level warnings (W2005) into engine result
6. `15b694e` feat(v132): add W2005 and E2030 diagnostic codes for stabilization pass
7. `0343c51` fix(v132): P0.6 -- lexer no longer misparses colon inside component-invocation parens as block-opener
8. `a0dd9f4` fix(v132): P0.4 -- __keyedList drains per-item __pjsCleanup before discarding a node
9. `4916903` fix(v132): P0.1 -- .sekali/.once event modifier now emits { once: true }
10. `3dbb455` fix(v132): P0.1/P0.2-P0.5 -- generalize cleanup ownership via registerCleanup()
11. `707a374` test(v132): add failing regression tests for Lapis 1-3 P0 findings

## Node clean gate

Requested clean gate was executed in order. Important environment note: the
container currently resolves `node` to `v24.15.0`, not Node 22. `package.json`
requires `>=22.0.0`, so the runtime is compatible with the declared engine, but
this was not an exact Node 22 binary.

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | Pass | Installed 401 packages. npm printed `Unknown env config "http-proxy"` warning. |
| `npm test` | Pass | Final post-fix run: 68 files / 1228 tests passed. |
| `npm run typecheck` | Pass | `tsc --noEmit -p jsconfig.json`. |
| `npm run lint` | Pass | `eslint . --max-warnings=0`. |
| `npm run format:check` | Pass | All matched files use Prettier style. |
| `npm run build` | Pass | 16 `.pjs` files compiled; one existing W4103 analyzer warning for `sandi`. |
| `npm audit` | Warning / blocked | npm registry audit bulk endpoint returned HTTP 403 Forbidden. |
| `npm pack --dry-run` | Pass | Tarball dry-run succeeded; 346 files, 906.8 kB package size. |

## Parser `this._pos` micro-audit

Scope requested: parenthesized expression and arrow function parsing.

### Finding

`src/parser/promptjs-parser.js` had a real cursor bug in the parenthesized
expression / parenthesized arrow-function branch:

- it saved `const savedPos = this._pos;`
- and restored with `this._pos = savedPos;`
- but the parser's real cursor field is `this.pos`.

This meant the speculative arrow-parameter probe for `(ident, ...)` could not
rewind the parser when the sequence was actually a parenthesized expression.
The nearby v132 `Ketika` modifier backtrack fix had already documented the same
class of typo in another parser path, but this parenthesized-expression path was
still affected.

### Fix

Changed the speculative parse save/restore to use `this.pos`, preserving the
existing arrow-function detection behavior.

### Regression coverage

Added `tests/v20-parser-pos-regression.test.js` with two focused checks:

- `(hitung) tambah 2` compiles successfully as a parenthesized identifier
  expression after the failed arrow-parameter probe rewinds.
- `(a, b) => a + b` still compiles successfully as a parenthesized-parameter
  arrow function.

Status: bug fixed and verified by targeted regression test.

## P1.1 dynamic component lifecycle tracker

Created a dedicated tracker issue document at:

- `docs/project/issues/P1.1-dynamic-component-lifecycle.md`

This keeps P1.1 out of being “only in a report markdown”. The tracker captures
problem statement, why it is an architecture gap, acceptance criteria, and the
candidate design directions that should be evaluated before implementation.

## Follow-up notes

- `npm audit` should be rerun in an environment where the npm registry audit
  endpoint is reachable/authenticated.
- If an exact Node 22 clean-gate result is required, rerun the same command list
  with a Node 22 binary; this container currently provides Node `v24.15.0`.
