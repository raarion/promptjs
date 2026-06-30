# Security Policy

## Supported Versions

PromptJS follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Security fixes are provided for the latest released minor of the current major.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately via GitHub's
[Private Vulnerability Reporting](https://github.com/raarion/promptjs/security/advisories/new)
("Report a vulnerability" under the **Security** tab).

When reporting, please include where possible:

- The affected file/module (e.g. `src/engine/adapters/node.js`).
- A minimal proof-of-concept (a `.pjs` snippet or request that triggers it).
- The impact (e.g. arbitrary file read, code injection in emitted output).
- Any suggested remediation.

### What to expect

- **Acknowledgement** within **72 hours**.
- A **triage assessment** (severity + affected versions) within **7 days**.
- For confirmed issues, a coordinated fix with a regression test before public
  disclosure. We aim to ship a patch within **30 days** of triage.

## Scope & Threat Model

PromptJS is a **compile-time DSL → JavaScript** toolchain plus thin serve
adapters. The runtime output is **zero-dependency**. Security-relevant surfaces:

- **Emitted code correctness** — the compiler must not emit unsafe JS from
  well-formed `.pjs` input.
- **Serve adapters & CLI dev server** — path containment is centralized in
  `src/utils/path-guard.js` to prevent path traversal across the `node`,
  `static`, and `vercel` adapters and the CLI `serve` command.
- **Build/supply chain** — runtime is zero-dep; dev dependencies are monitored
  via Dependabot and an `npm audit` gate in CI.

Out of scope: vulnerabilities in third-party hosting platforms, and issues
requiring a compromised developer machine or maliciously crafted local files
that the operator already trusts.

## Regression Tests

Every confirmed vulnerability ships with a red→green regression test under
`tests/security/` so the issue cannot silently reappear.
