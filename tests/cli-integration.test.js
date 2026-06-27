// @ts-check

/**
 * CLI Integration Tests (v1.0.0) — closes T-1 (audit)
 * ===================================================
 *
 * Audit T-1: lapisan CLI command (index.js dispatch, init/build/serve) berada
 * pada coverage 0% — jalur yang dipakai pengguna setiap hari sama sekali tak
 * teruji. Suite ini menjalankan BINARY CLI sungguhan sebagai subprocess
 * (end-to-end), bukan memanggil fungsi internal: ini mengeksekusi parsing arg,
 * dispatch perintah, scaffolding, build, dan dev-server nyata.
 *
 * Bonus: request live ke dev-server memvalidasi kembali guard traversal S-6.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = path.resolve(__dirname, '../src/cli/index.js');
const tmpRoots = [];

function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
/** Jalankan CLI sinkron; kembalikan {stdout, status}. */
function runCli(args, opts = {}) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf8',
      cwd: opts.cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { stdout, status: 0 };
  } catch (e) {
    return { stdout: (e.stdout || '') + (e.stderr || ''), status: e.status || 1 };
  }
}
/** GET sederhana, resolve {status, body}. */
function httpGet(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

afterAll(() => {
  for (const d of tmpRoots) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

// ════════════════════════════════════════════════════════════════════════
// index.js — dispatch, version, help
// ════════════════════════════════════════════════════════════════════════

describe('CLI index.js — dispatch & meta', () => {
  it('`version` mencetak versi dan exit 0', () => {
    const { stdout, status } = runCli(['version']);
    expect(status).toBe(0);
    expect(stdout).toMatch(/PromptJS v\d+\.\d+\.\d+/);
  });

  it('`--help` mencetak bantuan dan exit 0', () => {
    const { stdout, status } = runCli(['--help']);
    expect(status).toBe(0);
    expect(stdout.length).toBeGreaterThan(20);
  });

  it('tanpa argumen mencetak help (tidak crash)', () => {
    const { status } = runCli([]);
    expect(status).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// init.js — scaffolding
// ════════════════════════════════════════════════════════════════════════

describe('CLI init — scaffolding proyek', () => {
  it('`init demo` membuat struktur proyek (index.pjs)', () => {
    const cwd = mkTmp('pjs-init-');
    const { status } = runCli(['init', 'demo', '--template', 'basic'], { cwd });
    expect(status).toBe(0);
    expect(fs.existsSync(path.join(cwd, 'demo', 'index.pjs'))).toBe(true);
  });

  it('template tak dikenal → pesan error (exit non-zero)', () => {
    const cwd = mkTmp('pjs-init-bad-');
    const { stdout, status } = runCli(['init', 'x', '--template', 'tidak-ada'], { cwd });
    expect(status).not.toBe(0);
    expect(stdout).toMatch(/[Uu]nknown template/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// build.js — produksi dist
// ════════════════════════════════════════════════════════════════════════

describe('CLI build — kompilasi proyek', () => {
  it('`init` lalu `build` menghasilkan index.html + index.js di dist', () => {
    const cwd = mkTmp('pjs-build-');
    expect(runCli(['init', 'app', '--template', 'basic'], { cwd }).status).toBe(0);
    const { status } = runCli(['build', 'app', '--out', 'dist'], { cwd });
    expect(status).toBe(0);
    expect(fs.existsSync(path.join(cwd, 'dist', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(cwd, 'dist', 'index.js'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// serve.js — dev-server live (incl. S-6 traversal guard regression)
// ════════════════════════════════════════════════════════════════════════

describe('CLI serve — dev-server live', () => {
  /** Start `pjs serve` di port unik, tunggu siap, jalankan fn, lalu kill. */
  async function withServer(cwd, port, fn) {
    const child = spawn('node', [CLI, 'serve', '.', '--port', String(port), '--no-reload'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
      // Tunggu server siap (poll root).
      let ready = false;
      for (let i = 0; i < 40; i++) {
        await sleep(150);
        try {
          await httpGet(port, '/');
          ready = true;
          break;
        } catch {
          /* belum siap */
        }
      }
      expect(ready).toBe(true);
      await fn();
    } finally {
      child.kill('SIGKILL');
    }
  }

  it('menyajikan file dalam root DAN menolak traversal (S-6) di server nyata', async () => {
    const cwd = mkTmp('pjs-serve-');
    // Proyek minimal + file rahasia di luar root sebagai sibling.
    fs.mkdirSync(path.join(cwd, 'site'));
    fs.writeFileSync(path.join(cwd, 'site', 'index.html'), '<h1>ok</h1>');
    fs.writeFileSync(path.join(cwd, 'secret.txt'), 'TOP SECRET');
    const port = 35000 + Math.floor(Math.random() * 2000);

    await withServer(path.join(cwd, 'site'), port, async () => {
      // File sah di dalam root → 200.
      const ok = await httpGet(port, '/index.html');
      expect(ok.status).toBe(200);
      expect(ok.body).toContain('ok');

      // Traversal klasik → BUKAN 200 dengan isi rahasia.
      const trav = await httpGet(port, '/../secret.txt');
      expect(trav.body.includes('TOP SECRET')).toBe(false);

      // Encoded traversal (%2e%2e) → juga tidak membocorkan rahasia.
      const enc = await httpGet(port, '/%2e%2e/secret.txt');
      expect(enc.body.includes('TOP SECRET')).toBe(false);
    });
  }, 20000);
});
