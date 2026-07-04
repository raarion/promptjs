// @ts-check
/**
 * v10 — SESI-2 Point-2 regression suite: `turunan` dependency-cycle detection
 * ============================================================================
 * Locks in the behavior requested in SESI-2 Point-2 ("mutual forward-reference
 * cycle antar `turunan` harus terdeteksi sebagai E4201, bukan E3001").
 *
 * VERDICT (verified via real `compile(src)`, Node v22.14.0 AND v20.20.2 —
 * identical on both): the behavior is ALREADY CORRECT on branch v132-sesi2
 * (@b9247c7). Two mechanisms already cooperate:
 *   1. `PromptJSResolver.gatherGlobals()` (src/resolver/promptjs-resolver.js:486,
 *      called at :399 BEFORE traversal) hoists every top-level declaration —
 *      including `TurunanDeclaration` — into the global scope. So forward-refs
 *      between top-level `turunan` are legal and do NOT hit E3001.
 *   2. `buildDependencyGraph()` (src/analyzer/dependency-graph.js) records
 *      computed edges (self-edge included since the S2-INK-1 fix) and
 *      `detectCycles()` surfaces E4201 with the full cycle path.
 *
 * Because the fix the report asked for is already in place, the professional
 * move is NOT to re-touch working resolver/grammar code (risk of broad
 * regression for no gain) but to PIN the behavior with an exhaustive
 * edge/error-path suite so it can never silently regress. Each case below is
 * asserted end-to-end on the real engine.
 *
 * Cases:
 *   - mutual A<->B            → E4201 (path a -> b -> a), success:false
 *   - 3-node chain A->B->C->A → E4201 (path a -> b -> c -> a)
 *   - self-cycle c = c + a    → E4201 (path c -> c)              [S2-INK-1]
 *   - valid forward-ref (turunan reads data declared later) → success, no E4201/E3001
 *   - valid turunan chain a->b->c (no back edge) → success, correct deps
 *   - diamond non-cycle d<-b, d<-c, b<-a, c<-a → success (no false positive)
 *   - genuinely unknown identifier → still E3001 (no regression)
 *   - forward-ref to a later `turunan` that is itself valid → success
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/engine/promptjs.js';

/** @param {any[]} list @param {string} code */
const has = (list, code) => (list || []).some((e) => e.code === code);
/** @param {any[]} list @param {string} code */
const find = (list, code) => (list || []).find((e) => e.code === code);

// ════════════════════════════════════════════════════════════════════════
// Cycle detection → E4201 (the reported concern)
// ════════════════════════════════════════════════════════════════════════
describe('v10 Point-2 — turunan dependency cycle surfaces E4201 (not E3001)', () => {
  it('mutual forward-ref A<->B → E4201, NOT E3001, success:false', () => {
    const r = compile('turunan a = b + 1\nturunan b = a + 1\ntampilkan a');
    expect(r.success).toBe(false);
    expect(has(r.errors, 'E4201')).toBe(true);
    // The whole point: hoisting means the forward-ref is legal, so NO E3001
    // "undeclared identifier" masks the real cycle.
    expect(has(r.errors, 'E3001')).toBe(false);
    const e = find(r.errors, 'E4201');
    expect(e.severity).toBe('error');
    expect(e.stage).toBe('Analyzer');
    // Cycle path must name both members and close the loop.
    expect(e.message).toMatch(/a -> b -> a/);
    expect(e.suggestion).toBeTruthy();
  });

  it('3-node chain A->B->C->A → E4201 with full cycle path', () => {
    const r = compile('turunan a = b + 1\nturunan b = c + 1\nturunan c = a + 1\ntampilkan a');
    expect(r.success).toBe(false);
    expect(has(r.errors, 'E4201')).toBe(true);
    expect(has(r.errors, 'E3001')).toBe(false);
    expect(find(r.errors, 'E4201').message).toMatch(/a -> b -> c -> a/);
  });

  it('self-cycle `turunan c = c + a` → E4201 path c -> c (S2-INK-1)', () => {
    const r = compile('data a = 1\nturunan c = c + a\ntampilkan c');
    expect(r.success).toBe(false);
    expect(has(r.errors, 'E4201')).toBe(true);
    expect(find(r.errors, 'E4201').message).toMatch(/c -> c/);
  });

  it('longer mutual cycle inside a 4-node graph is still caught', () => {
    // a and b form a 2-cycle; c/d are innocent bystanders reading a.
    const r = compile(
      'turunan a = b + 1\nturunan b = a + 1\nturunan d = a + 1\ndata z = 0\ntampilkan a'
    );
    expect(r.success).toBe(false);
    expect(has(r.errors, 'E4201')).toBe(true);
    expect(has(r.errors, 'E3001')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Valid forward-refs must STAY valid (no over-eager rejection)
// ════════════════════════════════════════════════════════════════════════
describe('v10 Point-2 — valid forward-refs are not broken', () => {
  it('turunan reads data declared LATER → success, no E4201/E3001', () => {
    const r = compile('turunan c = a + b\ndata a = 1\ndata b = 2\ntampilkan c');
    expect(r.success).toBe(true);
    expect(has(r.errors, 'E4201')).toBe(false);
    expect(has(r.errors, 'E3001')).toBe(false);
    // Dependency edges must still be recorded correctly for reactivity.
    const deps = (r.ast.semantic.dependencies || [])
      .filter((d) => d.kind === 'computed')
      .map((d) => d.from + '->' + d.to)
      .sort();
    expect(deps).toEqual(['c->a', 'c->b']);
  });

  it('valid turunan chain a->b->c (no back edge) → success, deps correct', () => {
    const r = compile('turunan a = b + 1\nturunan b = c + 1\ndata c = 5\ntampilkan a');
    expect(r.success).toBe(true);
    expect(has(r.errors, 'E4201')).toBe(false);
    const deps = (r.ast.semantic.dependencies || [])
      .filter((d) => d.kind === 'computed')
      .map((d) => d.from + '->' + d.to)
      .sort();
    expect(deps).toEqual(['a->b', 'b->c']);
  });

  it('diamond-shaped non-cycle deps (d<-b, d<-c, b<-a, c<-a) → success (no false positive)', () => {
    const r = compile(
      'data a = 1\nturunan b = a + 1\nturunan c = a + 2\nturunan d = b + c\ntampilkan d'
    );
    expect(r.success).toBe(true);
    expect(has(r.errors, 'E4201')).toBe(false);
    expect(has(r.errors, 'E3001')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Error-path integrity — genuine unknowns must still be E3001
// ════════════════════════════════════════════════════════════════════════
describe('v10 Point-2 — E3001 still fires for truly-undeclared identifiers', () => {
  it('unknown identifier in a turunan init → E3001 (not swallowed by hoisting)', () => {
    const r = compile('turunan c = a + zzz\ndata a = 1\ntampilkan c');
    expect(r.success).toBe(false);
    expect(has(r.errors, 'E3001')).toBe(true);
    expect(find(r.errors, 'E3001').message).toMatch(/zzz/);
    // Not a cycle → no spurious E4201.
    expect(has(r.errors, 'E4201')).toBe(false);
  });

  it('unknown identifier that is NOT part of any cycle still reports E3001', () => {
    const r = compile('turunan a = b + 1\nturunan b = a + qqq\ntampilkan a');
    // Here a<->b is a real cycle AND qqq is undeclared. Both diagnostics are
    // legitimate; the crucial invariant is that E3001 for qqq is present.
    expect(r.success).toBe(false);
    expect(has(r.errors, 'E3001')).toBe(true);
    expect(find(r.errors, 'E3001').message).toMatch(/qqq/);
  });
});
