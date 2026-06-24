# v1.0.0 Release Plan

## Phase A: Demo Apps [x] Complete
- [x] A1: Create todo-app example
- [x] A2: Create dashboard-app example (SPA with auth)

## Phase B: npm Publish Prep [x] Complete
- [x] B1: Update package.json (name: prompt-js, version: 1.0.0, files whitelist)
- [x] B2: Add .npmignore
- [x] B3: Add shebang to CLI entry point
- [x] B4: npm publish --dry-run passes

## Phase C: CI/CD Hardening
- [x] C1: Create release workflow (.github/workflows/release.yml)
- [x] C2: Enhance CI workflow with demo app compilation steps
- [x] C3: Verify quality gate passes (format:check + typecheck + lint + test)

## Phase D: Final Polish
- [ ] D1: Bump version to 1.0.0 (ALREADY DONE in B2)
- [x] D2: Update CHANGELOG.md for v1.0.0
- [x] D3: Update README.md version badge and final polish
- [x] D4: Update HANDOFF.md for v1.0.0
- [x] D5: Final quality gate verification
- [ ] D6: Commit, push, create PR
