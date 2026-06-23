# ADR-001 — Level 1 design decisions (Wave B)

> Architecture Decision Record for the loop, named-page, and component work in
> the Level 1 maturation effort. Status of each decision is noted inline.
> Audit basis: _Catatan Kelayakan & Kematangan — PromptJS v0.2_ (commit `9a60726`).

---

## B1 — Named pages: **implement** (Accepted, done in Wave C2)

`Halaman Nama:` / `Page Name:` are now supported. The optional page name becomes
the **`id` of the page's root element** (lowercased), while the anonymous form
`Halaman:` / `Page:` continues to produce a root element with no id.

- `Halaman Beranda:` → root element `<halaman>` with `id = "beranda"`.
- `Page Home:` → root element with `id = "home"`.

**Rationale.** Named pages were always part of the intended design and are
advertised in the README/keyword table. Mapping the name to an `id` is simple,
backward compatible, and useful as an anchor/routing target. Implemented entirely
in the lexer's self-named block-opener path (no parser/compiler changes needed —
the existing selector→id pipeline carries it through).

## B2 — Loop syntax canon (Accepted, done in Wave C1)

- **Canonical iteration:** `Ulangi untuk <x> in <source>:` / `Loop for <x> in <source>:`.
- **Separator aliases:** `in`, `dari`, and `from` are interchangeable
  (`dari`/`from` map to the same token as `in`).
- **Counted loop:** `Ulangi N kali:` / `Loop N times:` is now implemented and
  lowers to `for (let __i = 0; __i < N; __i++) { ... }`.

**Rationale.** The downstream pipeline (resolver/analyzer/compiler) already
handled `kind: 'kali'` and `'rentang'`; only the lexer keyword (`kali`/`times`
→ `TK_KALI`) and a parser branch were missing. `untuk`/`for` remains **required**
for the iterating form, so the old README form `Ulangi item dari $items:` (no
`untuk`) stays invalid and will be corrected in the docs (Wave E), per the
"canonical syntax" decision.

**Known related gap (out of scope, logged):** the word-operators
(`kali`/`tambah`/`dan`/`sama dengan`…) are present in the compiler's expression
lowering map but are **not recognized by the parser** (e.g. `3 kali 2` raises
`E3001`). The word-multiply operator is therefore non-functional independent of
this change; reusing `kali` as the counted-loop suffix introduces no regression.

## B3 — Component system (Accepted design; implementation pending in Wave C3)

### Current reality (evidence)

The component machinery is **non-functional end-to-end**, not merely incomplete:

- **Declaration mis-tokenizes parameters.** `Definisikan Kartu(judul):` lexes the
  name as a single identifier `"Kartu(judul)"` (the selector tokenizer swallows
  the parentheses), so the parser's parameter loop never runs.
- **Invalid codegen.** That produces `function __komp_Kartu(judul)() { ... }` and
  `window.Kartu(judul) = ...` — syntactically invalid JS that the engine never
  validates, so `success` is misleadingly `true`.
- **No working instantiation.** The `komponen`/`component` keyword is just a
  synonym for `Buat` (element creation). `visitGunakanStatement` exists in the
  compiler but there is **no `Gunakan`/`Use` case in the parser dispatch**, so no
  `GunakanStatement` node is ever produced. `Buat Kartu(...)` is silently ignored.
- **Inconsistent props contract.** The factory is emitted with **positional**
  params while the dead `Gunakan` emitter passes a **single props object** —
  the two halves disagree.

### Decision

Rebuild the component system coherently around a **named-props** contract:

- **Declaration:** `Komponen Kartu(judul, isi):` (the `Komponen`/`Component`
  keyword declares; `Definisikan`/`Define` kept as an alias). Parameters are
  tokenized properly as `name (LPAREN ident (COMMA ident)* RPAREN)`.
- **Instantiation:** `Buat Kartu(judul: "Hai", isi: "...")` — named arguments.
- **Factory contract:** components compile to a function taking a single
  `props` object: `function __komp_Kartu(props) { const { judul, isi } = props; ... }`,
  returning the root node. Instantiation calls `__komp_Kartu({ judul: "Hai", ... })`
  and appends the result to the current parent.
- **Scoping:** declared params are added as local symbols in the resolver's
  component scope so the body can reference them without `E3001`.

**Rationale.** Named props read well in a bilingual declarative DSL, match the
approved instantiation syntax, and remove the positional/object inconsistency.
Reusing `Buat` for instantiation keeps a single "create" verb for both elements
and components (disambiguated by PascalCase / the component registry).

### Open confirmation

Props are **named** (object), not positional. If positional args
(`Buat Kartu("Hai", "...")`) are preferred, that is the one point to revisit
before C3 implementation.
