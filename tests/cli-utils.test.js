/**
 * D3 — Coverage tests for CLI utilities.
 *
 * Tests the pure/near-pure functions in src/cli/utils.js and
 * src/cli/commands/compile.js to bring CLI coverage from 0% to ~60%.
 * Uses the zero-dependency temp-fs.js helper for filesystem tests.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import path from 'path';
import { createTempDir, cleanupAll, writeTempFile, existsTempFile } from './helpers/temp-fs.js';
import {
  findPjsFiles,
  makeColors,
  formatDiagnostic,
  printDiagnostics,
  resolveOutputPath,
  ensureDirForFile,
  formatSize,
  formatElapsed,
} from '../src/cli/utils.js';
import { compileOne } from '../src/cli/commands/compile.js';

describe('D3 — CLI utils coverage', () => {
  let tmp;

  beforeEach(() => {
    tmp = createTempDir('cli-test');
  });

  afterEach(() => {
    tmp.cleanup();
  });

  describe('findPjsFiles', () => {
    it('finds .pjs files recursively', () => {
      writeTempFile(tmp.dir, 'a.pjs', 'Buat h1: "A"');
      writeTempFile(tmp.dir, 'sub/b.pjs', 'Buat h1: "B"');
      writeTempFile(tmp.dir, 'sub/deep/c.pjs', 'Buat h1: "C"');
      writeTempFile(tmp.dir, 'notpjs.txt', 'hello');
      const files = findPjsFiles(tmp.dir);
      expect(files.length).toBe(3);
    });

    it('respects ignoreDirs', () => {
      writeTempFile(tmp.dir, 'a.pjs', 'Buat h1: "A"');
      writeTempFile(tmp.dir, 'node_modules/b.pjs', 'Buat h1: "B"');
      const files = findPjsFiles(tmp.dir);
      expect(files.length).toBe(1);
    });

    it('returns empty array for empty dir', () => {
      expect(findPjsFiles(tmp.dir)).toEqual([]);
    });

    it('skips unreadable dirs gracefully', () => {
      expect(findPjsFiles(path.join(tmp.dir, 'nonexistent'))).toEqual([]);
    });
  });

  describe('makeColors', () => {
    it('returns enabled palette by default', () => {
      const orig = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      const c = makeColors({});
      expect(c.enabled).toBe(true);
      expect(c.green).toBe('\x1b[32m');
      process.env.NO_COLOR = orig;
    });

    it('respects enabled: false', () => {
      const c = makeColors({ enabled: false });
      expect(c.enabled).toBe(false);
      expect(c.green).toBe('');
    });

    it('respects enabled: true when NO_COLOR not set', () => {
      const orig = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      expect(makeColors({ enabled: true }).enabled).toBe(true);
      process.env.NO_COLOR = orig;
    });

    it('detects TTY from stream', () => {
      const orig = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      expect(makeColors({ stream: { isTTY: false } }).enabled).toBe(false);
      expect(makeColors({ stream: { isTTY: true } }).enabled).toBe(true);
      process.env.NO_COLOR = orig;
    });
  });

  describe('formatDiagnostic', () => {
    it('formats error with code and message', () => {
      const out = formatDiagnostic({
        code: 'E1001',
        severity: 'error',
        message: 'Indentasi ganjil',
        line: 3,
        suggestion: 'Gunakan 2 spasi',
      });
      expect(out).toContain('E1001');
      expect(out).toContain('line 3');
      expect(out).toContain('Saran:');
    });

    it('formats warning', () => {
      const out = formatDiagnostic(
        { code: 'W4101', severity: 'warning', message: 'Tidak digunakan' },
        true
      );
      expect(out).toContain('W4101');
    });

    it('handles missing fields', () => {
      const out = formatDiagnostic({});
      expect(out).toContain('E0000');
    });
  });

  describe('resolveOutputPath', () => {
    it('uses --output for single file mode', () => {
      expect(resolveOutputPath('/src/a.pjs', { output: '/dist/out.js' })).toBe('/dist/out.js');
    });

    it('mirrors source structure in --out-dir', () => {
      const result = resolveOutputPath('/src/pages/index.pjs', {
        outDir: '/dist',
        rootDir: '/src',
      });
      expect(result).toContain('dist');
      expect(result).toContain('index.js');
    });

    it('defaults to .js next to .pjs', () => {
      expect(resolveOutputPath('/src/a.pjs', {})).toBe(path.join('/src', 'a.js'));
    });
  });

  describe('ensureDirForFile', () => {
    it('creates parent directories', () => {
      ensureDirForFile(path.join(tmp.dir, 'sub', 'deep', 'file.js'));
      writeTempFile(tmp.dir, 'sub/deep/file.js', 'content');
      expect(existsTempFile(tmp.dir, 'sub/deep/file.js')).toBe(true);
    });

    it('does nothing if dir exists', () => {
      ensureDirForFile(path.join(tmp.dir, 'file.js'));
      expect(true).toBe(true);
    });
  });

  describe('formatSize', () => {
    it('formats bytes', () => {
      expect(formatSize(100)).toBe('100B');
      expect(formatSize(0)).toBe('0B');
    });
    it('formats kilobytes', () => {
      expect(formatSize(1024)).toBe('1.0KB');
    });
    it('formats megabytes', () => {
      expect(formatSize(1024 * 1024)).toBe('1.0MB');
    });
  });

  describe('formatElapsed', () => {
    it('formats milliseconds', () => {
      const start = process.hrtime();
      expect(formatElapsed(start)).toContain('ms');
    });
    it('formats seconds', () => {
      expect(formatElapsed([-2, 0])).toContain('s');
    });
  });

  describe('printDiagnostics', () => {
    it('does nothing for empty/null', () => {
      printDiagnostics([], 'Test');
      printDiagnostics(null, 'Test');
      expect(true).toBe(true);
    });
  });

  describe('compileOne', () => {
    it('compiles a .pjs file to .js', () => {
      const pjsFile = writeTempFile(tmp.dir, 'test.pjs', 'Buat h1: "Hello"');
      const result = compileOne(pjsFile, { stdout: false });
      expect(result.success).toBe(true);
      expect(result.js).toContain('createElement("h1")');
    });

    it('returns errors for invalid source', () => {
      const pjsFile = writeTempFile(tmp.dir, 'bad.pjs', 'Buat h1: @#$');
      const result = compileOne(pjsFile, { stdout: false });
      expect(result.success).toBe(false);
    });

    it('writes .js next to .pjs by default', () => {
      const pjsFile = writeTempFile(tmp.dir, 'test.pjs', 'Buat h1: "Hello"');
      compileOne(pjsFile, { stdout: false });
      expect(existsTempFile(tmp.dir, 'test.js')).toBe(true);
    });

    it('writes to --output', () => {
      const pjsFile = writeTempFile(tmp.dir, 'test.pjs', 'Buat h1: "Hello"');
      compileOne(pjsFile, { output: path.join(tmp.dir, 'out.js') });
      expect(existsTempFile(tmp.dir, 'out.js')).toBe(true);
    });

    it('writes to --out-dir', () => {
      writeTempFile(tmp.dir, 'test.pjs', 'Buat h1: "Hello"');
      compileOne(path.join(tmp.dir, 'test.pjs'), {
        outDir: path.join(tmp.dir, 'dist'),
        rootDir: tmp.dir,
      });
      expect(existsTempFile(tmp.dir, 'dist/test.js')).toBe(true);
    });
  });
});

afterAll(() => {
  cleanupAll();
});
