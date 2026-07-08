---
name: CheckJs cross-module prototype augmentation
description: How to make tsc checkJs happy when a facade file attaches methods to a constructor's prototype from separate submodule files.
---

## Rule
When a facade file installs methods onto `Constructor.prototype` (or static properties) at runtime from submodule files, TypeScript checkJs cannot infer those members cross-file. Declare stub implementations on the prototype **in the same file as the constructor** so the type checker sees them.

**Why:** TypeScript checkJs resolves prototype augmentation only within a single file. Dynamic assignment in a separate facade file is invisible to the type checker from the perspective of the constructor's module.

**How to apply:**
1. In the constructor file, add stub prototype methods (bodies can be no-ops or `throw`) for every method the facade will attach at runtime.
2. Add `/** @typedef {import('./types.js').Foo} Foo */` at the top of any file that references a typedef from another module — JSDoc typedefs are file-scoped in checkJs, not global.
3. For shared typedefs used across many files, create a pure `types.js` file (no runtime exports beyond `module.exports = {}`) and import from it everywhere.
4. For static properties assigned on the constructor in the facade, declare a stub assignment in the constructor file too (`Constructor.staticProp = function() {}`).
5. Tool files (`prettierignore`, `eslint.config.js`) must explicitly exclude Replit-managed directories (`.local/`, `.cache/`) to prevent skill/state files from failing format and lint gates.
