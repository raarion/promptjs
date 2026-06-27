// Tests for the consolidated findPjsFiles() single-source-of-truth.
//
// Previously findPjsFiles() was duplicated in three places (cli/utils.js,
// engine/builder.js, scripts/build-pages.js) with subtly different ignore-sets
// and sorting. They are now a single implementation in src/cli/utils.js whose
// per-caller behavior is driven by an options object. These tests lock in:
//   - backward-compatible array form (ignoreDirs)
//   - new options form ({ ignoreDirs, sort })
//   - builder's re-export still applies its ignore-set + sort
//   - safe handling of non-existent dirs

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import os from 'os';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { findPjsFiles } = require('../src/cli/utils');
const Builder = require('../src/engine/builder');

let tmp;
function mk(rel, content = 'x') {
  const full = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

describe('findPjsFiles — consolidated single source of truth', () => {
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pjs-find-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('finds .pjs files recursively (default options)', () => {
    mk('a.pjs');
    mk('sub/b.pjs');
    mk('sub/ignore-me.txt');
    const files = findPjsFiles(tmp);
    expect(files.filter((f) => f.endsWith('.pjs')).length).toBe(2);
  });

  it('default ignore-set skips node_modules/.git/dist', () => {
    mk('keep.pjs');
    mk('node_modules/dep/x.pjs');
    mk('dist/y.pjs');
    const files = findPjsFiles(tmp);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
    expect(files.some((f) => f.includes(`${path.sep}dist${path.sep}`))).toBe(false);
    expect(files.some((f) => f.endsWith('keep.pjs'))).toBe(true);
  });

  it('backward-compatible array form overrides ignoreDirs', () => {
    mk('keep.pjs');
    mk('secret/s.pjs');
    const files = findPjsFiles(tmp, ['secret']);
    expect(files.some((f) => f.includes('secret'))).toBe(false);
  });

  it('options form { ignoreDirs, sort } sorts results', () => {
    mk('zebra.pjs');
    mk('alpha.pjs');
    const sorted = findPjsFiles(tmp, { sort: true });
    const onlyPjs = sorted.filter((f) => f.endsWith('.pjs'));
    const expected = [...onlyPjs].sort();
    expect(onlyPjs).toEqual(expected);
  });

  it('returns [] for a non-existent directory (no throw)', () => {
    expect(findPjsFiles(path.join(tmp, 'nope'))).toEqual([]);
  });

  it('builder.findPjsFiles re-export applies builder ignore-set (doc-dev/tests) + sort', () => {
    mk('keep.pjs');
    mk('tests/t.pjs');
    mk('doc-dev/d.pjs');
    const files = Builder.findPjsFiles(tmp);
    expect(files.some((f) => f.includes(`${path.sep}tests${path.sep}`))).toBe(false);
    expect(files.some((f) => f.includes('doc-dev'))).toBe(false);
    expect(files.some((f) => f.endsWith('keep.pjs'))).toBe(true);
    // sorted
    expect(files).toEqual([...files].sort());
  });
});
