// @ts-check

/**
 * v2 Edge-Case Suite — CLI `compile` command error paths
 * ======================================================
 * (src/cli/commands/compile.js — baseline 45% lines)
 *
 * Exercises the in-process error/exit branches of `runCompile` and the
 * success/failure branches of `compileOne` / `compileFiles`, using the same
 * process.exit-stub + chdir + muted-stdio harness as the existing
 * cli-commands-coverage suite. These prove the CLI fails loudly and with the
 * right exit code on bad input — the production-readiness contract for a CLI.
 */

import { describe, it, expect, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const { runCompile, compileOne, compileFiles } = require('../src/cli/commands/compile');

const tmpRoots = [];
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}

/** Run fn with process.exit stubbed (captures code), stdio muted, cwd in dir. */
function runInDir(dir, fn) {
  const prevCwd = process.cwd();
  const realExit = process.exit;
  const realOut = process.stdout.write;
  const realErr = process.stderr.write;
  let exitCode = null;
  // @ts-ignore
  process.exit = (code) => {
    exitCode = code == null ? 0 : code;
    throw new Error('__EXIT__' + exitCode);
  };
  // @ts-ignore
  process.stdout.write = () => true;
  // @ts-ignore
  process.stderr.write = () => true;
  try {
    process.chdir(dir);
    fn();
  } catch (e) {
    if (!String(e.message).startsWith('__EXIT__')) throw e;
  } finally {
    process.chdir(prevCwd);
    process.exit = realExit;
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return exitCode;
}

const VALID = 'Buat ruang:\n    "Halo"';
const INVALID = 'Buat h1:\n\t"tab indent is E1002"';

afterAll(() => {
  for (const d of tmpRoots) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('v2 — runCompile error/exit paths', () => {
  it('no input file → exit code 1', () => {
    const dir = mkTmp('pjs-compile-');
    const code = runInDir(dir, () => runCompile({ _: [] }));
    expect(code).toBe(1);
  });

  it('nonexistent path → exit code 1 (statSync throws)', () => {
    const dir = mkTmp('pjs-compile-');
    const code = runInDir(dir, () => runCompile({ _: ['does-not-exist.pjs'] }));
    expect(code).toBe(1);
  });

  it('directory with no .pjs files → exit code 1', () => {
    const dir = mkTmp('pjs-compile-');
    const empty = path.join(dir, 'empty');
    fs.mkdirSync(empty);
    const code = runInDir(dir, () => runCompile({ _: ['empty'] }));
    expect(code).toBe(1);
  });

  it('valid single file → compiles, writes .js next to source, exit code 0', () => {
    const dir = mkTmp('pjs-compile-');
    fs.writeFileSync(path.join(dir, 'ok.pjs'), VALID);
    // For a single-file input, output lands beside the source (ok.js).
    const code = runInDir(dir, () => runCompile({ _: ['ok.pjs'] }));
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'ok.js'))).toBe(true);
  });

  it('stdout mode → exit 0 without writing a file', () => {
    const dir = mkTmp('pjs-compile-');
    fs.writeFileSync(path.join(dir, 'ok.pjs'), VALID);
    const code = runInDir(dir, () => runCompile({ _: ['ok.pjs'], stdout: true }));
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'ok.js'))).toBe(false);
  });

  it('file with compile errors → exit code 1, no output written', () => {
    const dir = mkTmp('pjs-compile-');
    fs.writeFileSync(path.join(dir, 'bad.pjs'), INVALID);
    const code = runInDir(dir, () => runCompile({ _: ['bad.pjs'], 'out-dir': 'dist' }));
    expect(code).toBe(1);
    expect(fs.existsSync(path.join(dir, 'dist', 'bad.js'))).toBe(false);
  });

  it('directory input compiles every .pjs found → exit code 0', () => {
    const dir = mkTmp('pjs-compile-');
    const src = path.join(dir, 'src');
    fs.mkdirSync(src);
    fs.writeFileSync(path.join(src, 'a.pjs'), VALID);
    fs.writeFileSync(path.join(src, 'b.pjs'), VALID);
    const code = runInDir(dir, () => runCompile({ _: ['src'], 'out-dir': 'out' }));
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'out', 'a.js'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'out', 'b.js'))).toBe(true);
  });
});

describe('v2 — compileOne / compileFiles unit behavior', () => {
  it('compileOne on a valid file → success:true with js + jsSize', () => {
    const dir = mkTmp('pjs-one-');
    const f = path.join(dir, 'ok.pjs');
    fs.writeFileSync(f, VALID);
    const out = mkTmp('pjs-one-out-');
    const r = runCaptured(() => compileOne(f, { outDir: out, rootDir: dir, stdout: false }));
    expect(r.success).toBe(true);
    expect(typeof r.js).toBe('string');
    expect(r.jsSize).toBeGreaterThan(0);
  });

  it('compileOne on an invalid file → success:false with errors', () => {
    const dir = mkTmp('pjs-one-');
    const f = path.join(dir, 'bad.pjs');
    fs.writeFileSync(f, INVALID);
    const r = runCaptured(() => compileOne(f, { stdout: true }));
    expect(r.success).toBe(false);
    expect(Array.isArray(r.errors)).toBe(true);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('compileFiles aggregates per-file results (1 ok + 1 bad)', () => {
    const dir = mkTmp('pjs-files-');
    const ok = path.join(dir, 'ok.pjs');
    const bad = path.join(dir, 'bad.pjs');
    fs.writeFileSync(ok, VALID);
    fs.writeFileSync(bad, INVALID);
    const out = mkTmp('pjs-files-out-');
    const results = runCaptured(() =>
      compileFiles([ok, bad], { outDir: out, rootDir: dir, stdout: false })
    );
    expect(results).toHaveLength(2);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success)).toHaveLength(1);
  });
});

/** Run fn with stdio muted (compileOne writes diagnostics), returning its value. */
function runCaptured(fn) {
  const realOut = process.stdout.write;
  const realErr = process.stderr.write;
  // @ts-ignore
  process.stdout.write = () => true;
  // @ts-ignore
  process.stderr.write = () => true;
  try {
    return fn();
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
}
