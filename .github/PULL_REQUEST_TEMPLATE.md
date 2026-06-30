# PromptJS — Pull Request

## Summary

<!-- What does this PR change, and WHY? Link any related issue: Closes #__ -->

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Docs / chore / refactor (no runtime behavior change)
- [ ] Security fix (includes a regression test under `tests/security/`)

## Quality gates

<!-- All must pass locally before requesting review. CI enforces the same gates. -->

- [ ] `npm run format:check` — Prettier clean
- [ ] `npm run typecheck` — JSDoc/checkJs clean
- [ ] `npm run lint` — ESLint `--max-warnings=0` clean
- [ ] `npm run coverage` — tests pass and per-module thresholds hold (no regression)
- [ ] Smoke compile (`node src/cli/index.js compile …`) still succeeds

## Checklist

- [ ] I added/updated tests that prove my change works (red→green for fixes).
- [ ] I updated docs (`README.md`, `docs/`, `CHANGELOG.md` `[Unreleased]`) as needed.
- [ ] My change keeps the runtime **zero-dependency**.
- [ ] I did not commit secrets, tokens, or generated build artifacts.

## Notes for reviewers

<!-- Anything that needs special attention, trade-offs, or follow-ups. -->
