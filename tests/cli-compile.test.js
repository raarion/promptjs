/**
 * Unit tests untuk CLI `compile` command.
 *
 * Sebelumnya `cli/commands/compile.js` hanya 23% stmt / 7.84% branch coverage
 * (MEDIUM-4 dari audit 2026-06). Test ini melatih jalur inti `compileOne`,
 * `compileFiles`, dan `runCompile` (stdout, out-dir, output, dev, error path)
 * menggunakan direktori temporer nyata.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runCompile, compileOne, compileFiles } = require('../src/cli/commands/compile.js');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pjs-compile-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** Tulis file .pjs ke tmpDir dan kembalikan path absolutnya. */
function writePjs(name, src) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, src, 'utf-8');
  return p;
}

describe('compile.js — compileOne', () => {
  it('meng-compile file valid dan mengembalikan JS (success=true)', () => {
    const f = writePjs('ok.pjs', 'Buat h1:\n  "Halo"\n');
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = compileOne(f, { stdout: false, outDir: tmpDir, rootDir: tmpDir });
    stderr.mockRestore();
    expect(r.success).toBe(true);
    expect(typeof r.js).toBe('string');
    expect(r.jsSize).toBeGreaterThan(0);
  });

  it('menulis output ke disk saat bukan mode stdout', () => {
    const f = writePjs('page.pjs', 'Buat h1:\n  "X"\n');
    const outDir = path.join(tmpDir, 'dist');
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    compileOne(f, { stdout: false, outDir, rootDir: tmpDir });
    const outFile = path.join(outDir, 'page.js');
    expect(fs.existsSync(outFile)).toBe(true);
    expect(fs.readFileSync(outFile, 'utf-8').length).toBeGreaterThan(0);
  });

  it('mode stdout menulis JS ke stdout, bukan ke file', () => {
    const f = writePjs('s.pjs', 'Buat h1:\n  "S"\n');
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const r = compileOne(f, { stdout: true });
    expect(r.success).toBe(true);
    expect(out).toHaveBeenCalled();
  });

  it('mengembalikan success=false untuk source yang error', () => {
    const f = writePjs('bad.pjs', 'Data x = 1.2.3\n');
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = compileOne(f, { stdout: false, outDir: tmpDir, rootDir: tmpDir });
    expect(r.success).toBe(false);
    expect(Array.isArray(r.errors)).toBe(true);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('dev mode tetap menghasilkan compile sukses', () => {
    const f = writePjs('dev.pjs', 'Buat h1:\n  "D"\n');
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const r = compileOne(f, { stdout: false, dev: true, outDir: tmpDir, rootDir: tmpDir });
    expect(r.success).toBe(true);
  });
});

describe('compile.js — compileFiles', () => {
  it('meng-compile banyak file dan mengembalikan satu hasil per file', () => {
    const a = writePjs('a.pjs', 'Buat h1:\n  "A"\n');
    const b = writePjs('b.pjs', 'Buat h1:\n  "B"\n');
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const results = compileFiles([a, b], { stdout: false, outDir: tmpDir, rootDir: tmpDir });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });
});

describe('compile.js — runCompile', () => {
  it('meng-compile direktori dan menulis output ke out-dir', () => {
    writePjs('one.pjs', 'Buat h1:\n  "1"\n');
    writePjs('two.pjs', 'Buat h1:\n  "2"\n');
    const outDir = path.join(tmpDir, 'build');
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    // runCompile memanggil process.exit() di akhir (perilaku CLI); cegah agar
    // tidak menghentikan test runner.
    vi.spyOn(process, 'exit').mockImplementation(() => undefined);

    runCompile({ _: [tmpDir], 'out-dir': outDir });

    expect(fs.existsSync(path.join(outDir, 'one.js'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'two.js'))).toBe(true);
  });

  it('meng-compile satu file ke stdout tanpa menulis file', () => {
    const f = writePjs('single.pjs', 'Buat h1:\n  "Solo"\n');
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined);

    runCompile({ _: [f], stdout: true });

    expect(out).toHaveBeenCalled();
  });
});
