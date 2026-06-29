// @ts-check

/**
 * PromptJS v6 — Shared Path-Traversal Guard (S-15 / S-21)
 * ============================================================================
 *
 * Target: src/utils/path-guard.js
 *
 * The traversal guard used by the dev server (S-6) was extracted into a shared
 * util so the node/static/vercel adapters and the CLI all enforce the SAME,
 * correct containment check (audit recommendation #2). This suite pins the
 * util's contract directly — boundary cases the higher-level adapter tests
 * only touch indirectly — so any regression in the guard is caught at source.
 *
 * Covered:
 *   - isInsideRoot: root itself, descendants, parent escape, sibling-prefix
 *     escape (the original `startsWith` bug), `..` segments, absolute escape,
 *     and a child literally named "..foo" (must NOT be rejected).
 *   - safeResolve: leading-slash normalization (absolute-looking URL joins
 *     UNDER root, not at FS root), `..` escape detection, nested OK paths.
 */

import path from 'path';
import { describe, it, expect } from 'vitest';

const { isInsideRoot, safeResolve } = require('../src/utils/path-guard');

const ROOT = path.resolve('/srv/app');

describe('v6 — path-guard.isInsideRoot', () => {
  it('the root itself is inside (rel === "")', () => {
    expect(isInsideRoot(ROOT, ROOT)).toBe(true);
  });

  it('a direct descendant file is inside', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, 'index.html'))).toBe(true);
  });

  it('a deeply nested descendant is inside', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, 'a', 'b', 'c.js'))).toBe(true);
  });

  it('a parent directory is OUTSIDE', () => {
    expect(isInsideRoot(ROOT, path.resolve('/srv'))).toBe(false);
  });

  it('a "../etc/passwd" escape is OUTSIDE', () => {
    expect(isInsideRoot(ROOT, path.join(ROOT, '..', 'etc', 'passwd'))).toBe(false);
  });

  it('sibling-prefix escape is OUTSIDE (the startsWith() bug case)', () => {
    // "/srv/app-secret/x" string-starts-with "/srv/app" but is NOT contained.
    expect(isInsideRoot(ROOT, path.resolve('/srv/app-secret/x'))).toBe(false);
  });

  it('an unrelated absolute path is OUTSIDE', () => {
    expect(isInsideRoot(ROOT, path.resolve('/var/www/html'))).toBe(false);
  });

  it('a child literally named "..foo" is INSIDE (not a traversal)', () => {
    // The naive `rel.startsWith('..')` check wrongly rejects this; the
    // separator-aware guard correctly keeps it inside.
    expect(isInsideRoot(ROOT, path.join(ROOT, '..foo'))).toBe(true);
  });

  it('normalizes interior ".." that stays inside', () => {
    // /srv/app/a/../b resolves to /srv/app/b → still inside.
    expect(isInsideRoot(ROOT, path.join(ROOT, 'a', '..', 'b'))).toBe(true);
  });
});

describe('v6 — path-guard.safeResolve', () => {
  it('joins a leading-slash URL path UNDER the root (no FS-root reset)', () => {
    const { inside, resolved } = safeResolve(ROOT, '/assets/app.js');
    expect(inside).toBe(true);
    expect(resolved).toBe(path.join(ROOT, 'assets', 'app.js'));
  });

  it('flags a "../" escape as outside', () => {
    const { inside } = safeResolve(ROOT, '../../etc/passwd');
    expect(inside).toBe(false);
  });

  it('flags an encoded-style traversal child as outside', () => {
    // Caller is expected to decodeURIComponent first; once decoded to "..",
    // safeResolve must classify it as an escape.
    const { inside } = safeResolve(ROOT, '..%2f'.replace('%2f', '/') + 'secret');
    expect(inside).toBe(false);
  });

  it('a normal nested path is inside and resolved correctly', () => {
    const { inside, resolved } = safeResolve(ROOT, 'blog/post.html');
    expect(inside).toBe(true);
    expect(resolved).toBe(path.join(ROOT, 'blog', 'post.html'));
  });

  it('strips multiple leading separators before joining', () => {
    const { inside, resolved } = safeResolve(ROOT, '///a/b');
    expect(inside).toBe(true);
    expect(resolved).toBe(path.join(ROOT, 'a', 'b'));
  });
});
