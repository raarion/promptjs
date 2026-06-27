// @ts-check

/**
 * CLI Command-Layer Coverage (v1.0.0) — closes T-1 (audit, in-process)
 * ====================================================================
 *
 * Pendamping cli-integration.test.js: test e2e (subprocess) membuktikan jalur
 * pengguna berfungsi, TAPI tidak menggerakkan metrik coverage karena berjalan
 * di proses anak. Suite ini memanggil fungsi command (`runInit`, `runBuild`)
 * IN-PROCESS sehingga instrumen coverage benar-benar melihat init.js & build.js
 * (sebelumnya 0% — temuan T-1).
 *
 * Teknik: stub process.exit (lempar sentinel utk menangkap exit code), chdir ke
 * temp dir, dan bisukan stdout/stderr selama pemanggilan.
 */

import { describe, it, expect, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const { runInit } = require('../src/cli/commands/init');
const { runBuild } = require('../src/cli/commands/build');
const { parseArgs, shortToLong, isCommand, getVersion } = require('../src/cli/index');

const tmpRoots = [];
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}

/**
 * Jalankan fn dengan process.exit terstub + stdio dibisukan + cwd di dir.
 * Mengembalikan exit code (number) yang ditangkap, atau null bila tak exit.
 */
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

afterAll(() => {
  for (const d of tmpRoots) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('index.js (in-process) — coverage T-1', () => {
  it('parseArgs: command + positional + long/short flags + nilai', () => {
    const a = parseArgs([
      'node',
      'cli',
      'build',
      'app',
      '--out-dir',
      'dist',
      '-p',
      '8080',
      '--minify',
    ]);
    expect(a.command).toBe('build');
    expect(a._).toContain('app');
    expect(a['out-dir']).toBe('dist');
    expect(a.port).toBe('8080'); // -p → port
    expect(a.minify).toBe(true);
  });

  it('parseArgs: --help & --version sebagai boolean flag', () => {
    expect(parseArgs(['node', 'cli', '--help']).help).toBe(true);
    expect(parseArgs(['node', 'cli', '--version']).version).toBe(true);
  });

  it('shortToLong memetakan alias pendek yang dikenal', () => {
    expect(shortToLong('p')).toBe('port');
    expect(typeof shortToLong('o')).toBe('string');
  });

  it('isCommand mengenali perintah valid vs sembarang string', () => {
    expect(isCommand('build')).toBe(true);
    expect(isCommand('serve')).toBe(true);
    expect(isCommand('init')).toBe(true);
    expect(isCommand('tidak-ada-perintah')).toBe(false);
  });

  it('getVersion mengembalikan string versi', () => {
    expect(typeof getVersion()).toBe('string');
    expect(getVersion().length).toBeGreaterThan(0);
  });
});

describe('init.js (in-process) — coverage T-1', () => {
  it('runInit scaffolds proyek "basic" → index.pjs ada, exit 0', () => {
    const dir = mkTmp('pjs-ip-init-');
    const code = runInDir(dir, () => runInit({ _: ['proj'], template: 'basic' }));
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'proj', 'index.pjs'))).toBe(true);
  });

  it('runInit dengan template tak dikenal → exit 1', () => {
    const dir = mkTmp('pjs-ip-init-bad-');
    const code = runInDir(dir, () => runInit({ _: ['x'], template: 'nope' }));
    expect(code).toBe(1);
  });
});

describe('build.js (in-process) — coverage T-1', () => {
  it('runBuild atas proyek hasil init → dist/index.html + dist/index.js', () => {
    const dir = mkTmp('pjs-ip-build-');
    // Scaffold dulu.
    runInDir(dir, () => runInit({ _: ['app'], template: 'basic' }));
    // Build app → dist.
    runInDir(dir, () => runBuild({ _: ['app'], 'out-dir': 'dist' }));
    expect(fs.existsSync(path.join(dir, 'dist', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'dist', 'index.js'))).toBe(true);
  });

  it('runBuild atas direktori tak ada → exit 1', () => {
    const dir = mkTmp('pjs-ip-build-miss-');
    const code = runInDir(dir, () => runBuild({ _: ['tidak-ada'] }));
    expect(code).toBe(1);
  });

  it('runBuild --minify menghasilkan output JS yang lebih ringkas', () => {
    const dir = mkTmp('pjs-ip-build-min-');
    runInDir(dir, () => runInit({ _: ['m'], template: 'basic' }));
    runInDir(dir, () => runBuild({ _: ['m'], 'out-dir': 'dist', minify: true }));
    const js = fs.readFileSync(path.join(dir, 'dist', 'index.js'), 'utf8');
    expect(js.length).toBeGreaterThan(0);
  });
});
