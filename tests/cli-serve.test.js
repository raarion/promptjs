/**
 * Unit + in-process integration tests untuk CLI `serve` command.
 *
 * Sebelumnya `cli/commands/serve.js` memiliki 0% unit coverage (MEDIUM-3 dari
 * audit 2026-06): logic-nya hanya teruji secara tidak langsung lewat subprocess
 * pada test keamanan S-6. Test ini menjalankan `runServe` IN-PROCESS pada port
 * ephemeral (port 0) lalu melakukan HTTP request nyata ke beberapa route,
 * sehingga jalur kode utama (routing, compile-on-the-fly, static serve,
 * directory listing, guard path-traversal) terhitung sebagai unit coverage.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runServe, wrapInHtml, escapeHtml } = require('../src/cli/commands/serve.js');

// ─── Pure helper unit tests ────────────────────────────────────────────────

describe('serve.js — pure helpers', () => {
  it('escapeHtml meng-escape karakter HTML berbahaya (< > & ")', () => {
    expect(escapeHtml('<script>&"')).toBe('&lt;script&gt;&amp;&quot;');
  });

  it('escapeHtml mengembalikan string apa adanya bila tidak ada karakter spesial', () => {
    expect(escapeHtml('halo dunia')).toBe('halo dunia');
  });

  it('wrapInHtml membungkus JS ke dalam dokumen HTML lengkap dengan title dari nama file', () => {
    const html = wrapInHtml('console.log(1)', '/x/beranda.pjs', { liveReload: false });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>beranda</title>');
    expect(html).toContain('console.log(1)');
    expect(html).toContain('<div id="app"></div>');
  });

  it('wrapInHtml menyuntikkan live-reload + CSS saat opsi diaktifkan', () => {
    const html = wrapInHtml('x', '/a.pjs', { liveReload: true, css: '.a{color:red}' });
    expect(html).toContain('Live Reload');
    expect(html).toContain('.a{color:red}');
    expect(html).toContain('<style>');
  });

  it('wrapInHtml TIDAK menyuntikkan live-reload saat dimatikan', () => {
    const html = wrapInHtml('x', '/a.pjs', { liveReload: false });
    expect(html).not.toContain('Live Reload');
  });
});

// ─── In-process server integration tests ───────────────────────────────────

/** Helper: HTTP GET ke server lokal, resolve { status, body, headers }. */
function get(port, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'GET', headers },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('serve.js — runServe in-process', () => {
  let server;
  let port;
  let tmpDir;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pjs-serve-'));
    fs.writeFileSync(path.join(tmpDir, 'index.pjs'), 'Buat h1:\n  "Beranda"\n');
    fs.writeFileSync(path.join(tmpDir, 'about.pjs'), 'Buat h1:\n  "Tentang"\n');
    fs.writeFileSync(path.join(tmpDir, 'style.css'), 'body{margin:0}');

    server = runServe({ _: [tmpDir], port: 0, 'no-reload': true });
    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });
    port = server.address().port;
  });

  afterAll(() => {
    if (server) server.close();
  });

  it('GET / meng-compile dan menyajikan index.pjs sebagai HTML', async () => {
    const res = await get(port, '/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<!DOCTYPE html>');
    expect(res.body).toContain('Beranda');
  });

  it('GET /about.pjs meng-compile file .pjs spesifik', async () => {
    const res = await get(port, '/about.pjs');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Tentang');
  });

  it('GET /style.css menyajikan static file dengan MIME type benar', async () => {
    const res = await get(port, '/style.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
    expect(res.body).toContain('body{margin:0}');
  });

  it('GET file tidak ada → 404', async () => {
    const res = await get(port, '/tidak-ada.pjs');
    expect(res.status).toBe(404);
  });

  it('path traversal (../) ditolak dengan 403 (S-6 guard)', async () => {
    const res = await get(port, '/../../../etc/passwd');
    expect(res.status).toBe(403);
  });

  it('encoded traversal (%2e%2e%2f) ditolak dengan 403 (S-6 guard)', async () => {
    const res = await get(port, '/%2e%2e%2f%2e%2e%2fetc%2fpasswd');
    expect(res.status).toBe(403);
  });

  it('URL dengan percent-encoding malformed → 400', async () => {
    const res = await get(port, '/%ZZ');
    expect(res.status).toBe(400);
  });
});
