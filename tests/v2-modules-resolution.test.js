// @ts-check

/**
 * v2 Edge-Case Suite — Module Import/Export Resolution (src/engine/modules.js)
 * ===========================================================================
 * (baseline 53% lines)
 *
 * Covers the import/export ("kirim"/"terima") directive system end-to-end at
 * the unit level using a real temp filesystem — exercising every diagnostic
 * branch a DSL module loader must get right:
 *   - extractModuleDirectives: inline share, re-export, import directive, none
 *   - resolveImports: missing file → external + warning, no front-matter →
 *     warning, symbol-not-found → warning, successful inline import,
 *     re-export recursion, circular-dependency detection, depth-limit guard
 *   - mergeImportsToFrontMatter: strips directives, maps external vs inline
 */

import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  extractModuleDirectives,
  resolveImports,
  mergeImportsToFrontMatter,
} = require('../src/engine/modules.js');

const tmpRoots = [];
function mkTmp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pjs-mod-'));
  tmpRoots.push(d);
  return d;
}
const inline = (value) => ({ type: 'inline', value });

afterAll(() => {
  for (const d of tmpRoots) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('v2 — extractModuleDirectives', () => {
  it('null front-matter → empty directives, hasModuleDirectives=false', () => {
    const r = extractModuleDirectives(null);
    expect(r.shares).toEqual({});
    expect(r.imports).toEqual({});
    expect(r.hasModuleDirectives).toBe(false);
  });

  it('inline share (kirim: apiKey = "abc") → parsed share value', () => {
    const r = extractModuleDirectives({ kirim: inline('apiKey = "abc"') });
    expect(r.hasModuleDirectives).toBe(true);
    expect(r.shares.apiKey).toBe('abc');
  });

  it('inline share with JSON number → typed value', () => {
    const r = extractModuleDirectives({ kirim: inline('maxRetries = 5') });
    expect(r.shares.maxRetries).toBe(5);
  });

  it('re-export (kirim: fmt dari "utils.pjs") → __reExport descriptor', () => {
    const r = extractModuleDirectives({ kirim: inline('fmt dari "utils.pjs"') });
    expect(r.shares.fmt).toMatchObject({ __reExport: true, from: 'utils.pjs', name: 'fmt' });
  });

  it('import (terima: apiKey dari "config.pjs") → import descriptor', () => {
    const r = extractModuleDirectives({ terima: inline('apiKey dari "config.pjs"') });
    expect(r.imports.apiKey).toMatchObject({ from: 'config.pjs', name: 'apiKey' });
  });

  it('"get" alias is accepted like "terima"', () => {
    const r = extractModuleDirectives({ get: inline("token from 'auth.pjs'") });
    expect(r.imports.token).toMatchObject({ from: 'auth.pjs', name: 'token' });
  });
});

describe('v2 — resolveImports diagnostics', () => {
  it('missing file → external reference + warning (not a hard error)', () => {
    const dir = mkTmp();
    const r = resolveImports({ x: { from: 'nope.pjs', name: 'x' } }, dir);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.values.x).toMatchObject({ __external: true, from: 'nope.pjs' });
  });

  it('file without front-matter → warning, no value', () => {
    const dir = mkTmp();
    fs.writeFileSync(path.join(dir, 'plain.pjs'), 'Buat ruang:\n    "hi"');
    const r = resolveImports({ x: { from: 'plain.pjs', name: 'x' } }, dir);
    expect(r.warnings.some((w) => /no front-matter/.test(w.message))).toBe(true);
    expect(r.values.x).toBeUndefined();
  });

  it('symbol not exported by target → warning', () => {
    const dir = mkTmp();
    fs.writeFileSync(
      path.join(dir, 'conf.pjs'),
      '---\nkirim: other = "v"\n---\nBuat ruang:\n    "x"'
    );
    const r = resolveImports({ apiKey: { from: 'conf.pjs', name: 'apiKey' } }, dir);
    expect(r.warnings.some((w) => /not found/.test(w.message))).toBe(true);
    expect(r.values.apiKey).toBeUndefined();
  });

  it('successful inline import → resolves the shared value', () => {
    const dir = mkTmp();
    fs.writeFileSync(
      path.join(dir, 'conf.pjs'),
      '---\nkirim: apiKey = "secret"\n---\nBuat ruang:\n    "x"'
    );
    const r = resolveImports({ apiKey: { from: 'conf.pjs', name: 'apiKey' } }, dir);
    expect(r.errors).toHaveLength(0);
    expect(r.values.apiKey).toBe('secret');
  });

  it('re-export chain resolves recursively across two files', () => {
    const dir = mkTmp();
    // base.pjs shares the real value; mid.pjs re-exports from base.pjs
    fs.writeFileSync(
      path.join(dir, 'base.pjs'),
      '---\nkirim: fmt = "real"\n---\nBuat ruang:\n    "x"'
    );
    fs.writeFileSync(
      path.join(dir, 'mid.pjs'),
      '---\nkirim: fmt dari "base.pjs"\n---\nBuat ruang:\n    "x"'
    );
    const r = resolveImports({ fmt: { from: 'mid.pjs', name: 'fmt' } }, dir);
    expect(r.errors).toHaveLength(0);
    expect(r.values.fmt).toBe('real');
  });

  it('circular dependency (visited set) → warning, no infinite loop', () => {
    const dir = mkTmp();
    const self = path.resolve(dir, 'a.pjs');
    fs.writeFileSync(self, '---\nkirim: v = "x"\n---\nBuat ruang:\n    "x"');
    const visited = new Set([self]);
    const r = resolveImports({ v: { from: 'a.pjs', name: 'v' } }, dir, visited, 0);
    expect(r.warnings.some((w) => /Circular dependency/.test(w.message))).toBe(true);
  });

  it('depth > 10 → hard error guarding against deep cycles', () => {
    const dir = mkTmp();
    const r = resolveImports({ v: { from: 'x.pjs', name: 'v' } }, dir, new Set(), 11);
    expect(r.errors.some((e) => /depth exceeded 10/.test(e.message))).toBe(true);
  });
});

describe('v2 — mergeImportsToFrontMatter', () => {
  it('strips module directives, keeps plain data', () => {
    const merged = mergeImportsToFrontMatter(
      { judul: inline('Hi'), kirim: inline('x = 1'), terima: inline('y dari "z.pjs"') },
      {}
    );
    expect(merged.judul).toEqual(inline('Hi'));
    expect(merged.kirim).toBeUndefined();
    expect(merged.terima).toBeUndefined();
  });

  it('inline import value → { type: "inline", value }', () => {
    const merged = mergeImportsToFrontMatter({}, { apiKey: 'secret' });
    expect(merged.apiKey).toEqual({ type: 'inline', value: 'secret' });
  });

  it('external import value → { type: "file", path }', () => {
    const merged = mergeImportsToFrontMatter({}, { db: { __external: true, from: 'db.pjs' } });
    expect(merged.db).toEqual({ type: 'file', path: 'db.pjs' });
  });

  it('null front-matter → still merges import values', () => {
    const merged = mergeImportsToFrontMatter(null, { a: 1 });
    expect(merged.a).toEqual({ type: 'inline', value: 1 });
  });
});
