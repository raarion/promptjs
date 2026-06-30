// @ts-check

/**
 * PromptJS v1.0.0 — Path Traversal Guard / Guard Path Traversal
 * ============================================================================
 *
 * Centralized path-containment check, extracted from the dev-server fix
 * (S-6, v1.0.0) so that every adapter and CLI that joins an untrusted path
 * segment onto a root directory shares the SAME, correct guard.
 *
 * Closes S-15 / S-21 structurally: previously the traversal guard lived only
 * in `src/cli/commands/serve.js`, while the `node` / `static` / `vercel`
 * adapters joined paths without a centralized check. Duplicated or absent
 * logic across adapters is exactly the regression risk the audit flagged.
 *
 * Why `path.relative` and NOT `resolved.startsWith(rootDir)`:
 * the naive prefix check has a sibling-directory escape — rootDir
 * "/srv/app" wrongly accepts "/srv/app-secret/x" because the string starts
 * with the root. `path.relative(root, target)` instead yields the step path
 * FROM root TO target; if that path climbs out (`..`) or is absolute, the
 * target is outside the root. This is platform-correct on POSIX and Windows.
 *
 * Zero-dependency. Pure functions — no filesystem access, deterministic.
 */

'use strict';

const path = require('path');

/**
 * Is `candidatePath` contained within `rootDir` (root itself counts as inside)?
 *
 * Both arguments are resolved to absolute paths first, so relative inputs and
 * `..` segments are normalized before the comparison. A candidate equal to the
 * root, or any descendant of it, returns true; anything that escapes (sibling
 * directory, parent, unrelated absolute path) returns false.
 *
 * @param {string} rootDir - The directory the path must stay within.
 * @param {string} candidatePath - The path to test (relative or absolute).
 * @returns {boolean} true when candidatePath is inside (or equal to) rootDir.
 */
function isInsideRoot(rootDir, candidatePath) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidatePath);
  const rel = path.relative(resolvedRoot, resolvedCandidate);
  // rel === ''            → candidate IS the root            → inside
  // rel starts with '..'  → candidate climbs above the root  → outside
  // path.isAbsolute(rel)  → different drive/root (Windows)   → outside
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

/**
 * Safely resolve a (possibly untrusted) child path against a root directory.
 *
 * Joins `childPath` onto `rootDir`, resolves the result, and reports whether it
 * stayed inside the root. Callers decide what to do when `inside` is false
 * (e.g. respond 403, skip the entry, throw) — this helper never touches the
 * filesystem and never throws on traversal, it only classifies.
 *
 * @param {string} rootDir - The trusted base directory.
 * @param {string} childPath - The untrusted segment to append (e.g. a URL path
 *   or a directory-entry name). May contain `..`, leading slashes, etc.
 * @returns {{ inside: boolean, resolved: string }} resolved absolute path and
 *   whether it is contained within rootDir.
 */
function safeResolve(rootDir, childPath) {
  const resolvedRoot = path.resolve(rootDir);
  // Strip a leading separator so an absolute-looking URL path ("/a/b") joins
  // UNDER the root instead of resetting to the filesystem root.
  const normalizedChild = String(childPath).replace(/^[/\\]+/, '');
  const resolved = path.resolve(resolvedRoot, normalizedChild);
  return { inside: isInsideRoot(resolvedRoot, resolved), resolved };
}

module.exports = {
  isInsideRoot,
  safeResolve,
};
