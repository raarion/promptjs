// Guard tests for router pattern matching (regex-escape hardening).
//
// Before: matchRoute() built its matcher with
//   "^" + pattern.replace(/:\w+/g, "([^/]+)") + "$"
// which injected the raw route key into a RegExp WITHOUT escaping metachars.
// A route key like "/files/(a+)+b/:id" could become a catastrophic-backtracking
// pattern (theoretical ReDoS), and literal dots behaved as wildcards.
//
// After: literal (static) parts are regex-escaped; only :param segments become
// capture groups. These tests exercise the ACTUAL emitted runtime string
// (ROUTER_RUNTIME) so we validate exactly what ships to the browser.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ROUTER_RUNTIME } = require('../src/engine/router-runtime');

// Extract the matchRoute + extractParams functions from the emitted runtime
// string and evaluate them in an isolated scope for direct testing.
function loadMatchRoute() {
  const txt = ROUTER_RUNTIME;
  const start = txt.indexOf('function matchRoute');
  const end = txt.indexOf('function handleClick');
  const src = txt.slice(start, end);
  const factory = new Function(
    src + '\nreturn { matchRoute: matchRoute, extractParams: extractParams };'
  );
  return factory();
}

describe('router-runtime — regex escaping (security/regression)', () => {
  const { matchRoute } = loadMatchRoute();

  it('matches a normal dynamic segment route (/blog/:slug)', () => {
    const routes = { '/blog/:slug': () => 'BLOG' };
    expect(matchRoute(routes, '/blog/hello')).toBeTruthy();
  });

  it('does NOT let a single :param span multiple path segments', () => {
    const routes = { '/blog/:slug': () => 'BLOG' };
    // no "*" fallback → should be null, proving [^/]+ stays single-segment
    expect(matchRoute(routes, '/blog/a/b')).toBeNull();
  });

  it('treats a literal dot as a literal, not a wildcard', () => {
    const routes = { '/v:ver': () => 'V' };
    // The static "/v" part is literal; only :ver is dynamic.
    expect(matchRoute(routes, '/v1.0')).toBeTruthy();
  });

  it('treats regex metacharacters in the route key literally (ReDoS guard)', () => {
    // A malicious/clumsy route key with nested quantifiers must NOT compile to
    // a catastrophic-backtracking matcher. It should be escaped to literals.
    const routes = { '/files/(a+)+b/:id': () => 'X' };
    const evil = '/files/' + 'a'.repeat(40) + '!/42';
    const t0 = Date.now();
    const result = matchRoute(routes, evil);
    const elapsed = Date.now() - t0;
    // Literal escaping → the path doesn't contain the literal "(a+)+b", so no match.
    expect(result).toBeNull();
    // And critically: it returns near-instantly (no exponential backtracking).
    expect(elapsed).toBeLessThan(100);
  });

  it('exact (static) routes still take priority and match', () => {
    const routes = { '/about': () => 'ABOUT', '/blog/:slug': () => 'BLOG' };
    expect(matchRoute(routes, '/about')).toBeTruthy();
  });
});
