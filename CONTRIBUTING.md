# Contributing to PromptJS

Thanks for your interest in PromptJS! This guide covers the development
workflow, project layout, and quality gates.

## Prerequisites

- **Node.js >= 20.19** (Node 18 is EOL and no longer supported).
- npm (ships with Node).

## Setup

```bash
git clone https://github.com/raarion/promptjs.git
cd promptjs
npm install
```

## Everyday commands

| Command              | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `npm test`           | Run the Vitest suite once.                              |
| `npm run test:watch` | Run Vitest in watch mode while developing.              |
| `npm run coverage`   | Run tests with a V8 coverage report.                    |
| `npm run lint`       | Lint all source with ESLint.                            |
| `npm run lint:fix`   | Auto-fix lint issues where possible.                    |
| `npm run format`     | Format the codebase with Prettier.                      |
| `npm run format:check` | Check formatting without writing.                     |
| `npm run build`      | Build (`compile --minify`, jsdom prerender).            |

Quick manual compile of a single file:

```bash
node src/cli/index.js compile path/to/file.pjs --stdout
```

## Project layout

```
promptjs/
├── src/
│   ├── engine/      # Pipeline orchestrator (compile entry point)
│   ├── lexer/       # Tokenizer (indentation, bilingual keywords, aliases)
│   ├── parser/      # AST builder + error-code registry
│   ├── resolver/    # Symbol table, scopes, reference resolution
│   ├── analyzer/    # Semantic analysis, dependency graph
│   ├── compiler/    # Codegen: emitters/, lower/, utils/
│   ├── cli/         # CLI: compile, serve, build, init
│   ├── utils/       # Visitor pattern helpers
│   └── tester/      # Manual exploration scripts (NOT the automated suite)
├── tests/           # Automated Vitest suite (the source of truth)
├── doc-dev/         # Specs, architecture notes, roadmap
└── .github/workflows/  # CI
```

> The automated test suite lives in **`tests/`**. Files under `src/tester/`
> and `src/lexer/test-lexer.js` are manual scratch/debug scripts and are not
> run by `npm test`.

## The 5-stage pipeline

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → vanilla JS
```

When diagnosing a failure, identify the stage from the error code family:
`E1xxx` lexer, `E2xxx` parser, `E3xxx` resolver, `E4xxx` analyzer,
`E5xxx` compiler, `E6xxx` runtime/engine, `E0xxx` system.

## Adding tests

- Put new tests in `tests/*.test.js` using Vitest (`describe` / `it` / `expect`).
- Import the compiler via `import Engine from '../src/engine/promptjs.js'` and
  assert on `Engine.compile(source, options)` results
  (`{ js, errors, warnings, ast, success }`).
- When you add or fix an **error code**, add a negative test that asserts the
  exact code fires (this matrix is being built out in Wave D).

## Quality gates (CI)

Every push / PR runs, across Node 20 / 22 / 24:

1. `npm run lint`
2. `npm test`
3. A smoke compile through the CLI.

A coverage threshold (target ≥ 80%) and `format:check` will be promoted to hard
gates as the test suite matures — see the roadmap.

## Commit / PR conventions

- Keep commits focused; describe the *why*, not just the *what*.
- Update `CHANGELOG.md` (the `[Unreleased]` section) for any user-visible change.
- If you change the DSL surface, update the relevant `doc-dev/` spec and the
  README examples in the same PR — **docs and code ship together.**

## Roadmap

The current maturation plan is tracked in
[`doc-dev/ROADMAP-Level-1.md`](doc-dev/ROADMAP-Level-1.md).
