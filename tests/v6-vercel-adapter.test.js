// @ts-check

/**
 * PromptJS v6 — Vercel Adapter Branch & Edge Coverage (S-21)
 * ============================================================================
 *
 * Target: src/engine/adapters/vercel.js
 * Baseline gap (full suite): branch 65.38%, uncovered lines 92, 190.
 *
 * The existing v0.8 adapter suite only exercises the SPA path of
 * generateOutputConfig and a FLAT assets dir in runVercelAdapter. This suite
 * drives the MPA route-mapping branch (line ~92) and the nested-directory
 * recursion in copyDirRecursive (line ~190), plus default-arg fallbacks.
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';

const AdapterVercel = require('../src/engine/adapters/vercel');

const tmpDirs = [];

function makeTempDir() {
  const dir = path.join('/tmp', 'pjs-v6-vercel-' + Math.random().toString(36).slice(2, 8));
  fs.mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  tmpDirs.length = 0;
});

// ── generateVercelJson edge cases ──────────────────────────────────────────
describe('v6 — vercel.generateVercelJson', () => {
  it('MPA mode (no opts) produces version 2 with no rewrites/headers', () => {
    const parsed = JSON.parse(AdapterVercel.generateVercelJson());
    expect(parsed.version).toBe(2);
    expect(parsed.rewrites).toBeUndefined();
    expect(parsed.headers).toBeUndefined();
  });

  it('SPA mode emits rewrites AND cache-control headers', () => {
    const parsed = JSON.parse(AdapterVercel.generateVercelJson({ isSPA: true }));
    expect(parsed.rewrites[0].destination).toBe('/index.html');
    expect(Array.isArray(parsed.headers)).toBe(true);
    // assets + js/css cache headers
    const sources = parsed.headers.map((h) => h.source);
    expect(sources).toContain('/assets/(.*)');
    expect(parsed.headers[0].headers[0].value).toContain('immutable');
  });
});

// ── generateOutputConfig MPA branch (covers line ~92) ──────────────────────
describe('v6 — vercel.generateOutputConfig MPA route mapping', () => {
  it('MPA with multiple routes maps each non-root route to <route>.html', () => {
    const json = AdapterVercel.generateOutputConfig({
      isSPA: false,
      routes: ['/', '/about', '/blog/post'],
    });
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(3);

    // First route is always the explicit '/' -> /index.html
    expect(parsed.routes[0]).toEqual({ src: '/', dest: '/index.html', status: 200 });

    // The '/' inside opts.routes is skipped (continue), non-root routes mapped.
    const dests = parsed.routes.map((r) => r.dest);
    expect(dests).toContain('/about.html');
    expect(dests).toContain('/blog/post.html');

    // Route src uses the optional-trailing-slash form.
    const aboutRoute = parsed.routes.find((r) => r.dest === '/about.html');
    expect(aboutRoute.src).toBe('/about/?');
    expect(aboutRoute.status).toBe(200);

    // '/' must NOT be duplicated from the routes array (skipped via continue).
    const rootMatches = parsed.routes.filter((r) => r.src === '//?');
    expect(rootMatches.length).toBe(0);
  });

  it('MPA without a routes array still emits root + asset cache route', () => {
    const parsed = JSON.parse(AdapterVercel.generateOutputConfig({ isSPA: false }));
    expect(parsed.routes[0].dest).toBe('/index.html');
    const last = parsed.routes[parsed.routes.length - 1];
    expect(last.src).toBe('/assets/(.*)');
    expect(last.continue).toBe(true);
    expect(last.headers['Cache-Control']).toContain('immutable');
  });

  it('no opts at all defaults to MPA (version 3, root route present)', () => {
    const parsed = JSON.parse(AdapterVercel.generateOutputConfig());
    expect(parsed.version).toBe(3);
    expect(parsed.routes.some((r) => r.dest === '/index.html')).toBe(true);
  });
});

// ── runVercelAdapter nested dir recursion (covers copyDirRecursive line ~190)
describe('v6 — vercel.runVercelAdapter nested assets', () => {
  it('recursively moves NESTED asset directories into .vercel/output/static', () => {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(distDir, 'prompt.js'), 'var x=1;');
    // DEEP nesting: assets/img/icons/logo.png — forces copyDirRecursive to
    // recurse through multiple directory levels (the previously-uncovered
    // isDirectory() recursion branch) before hitting the file copy branch.
    fs.mkdirSync(path.join(distDir, 'assets', 'img', 'icons'), { recursive: true });
    fs.writeFileSync(path.join(distDir, 'assets', 'img', 'icons', 'logo.png'), 'fake-png');
    fs.writeFileSync(path.join(distDir, 'assets', 'style.css'), 'h1{}');

    const result = AdapterVercel.runVercelAdapter({
      outDir: distDir,
      isSPA: false,
      routes: ['/', '/about'],
    });

    expect(result.errors.length).toBe(0);

    const staticRoot = path.join(distDir, '.vercel', 'output', 'static');
    // Deep nested file moved correctly
    expect(fs.existsSync(path.join(staticRoot, 'assets', 'img', 'icons', 'logo.png'))).toBe(true);
    expect(fs.existsSync(path.join(staticRoot, 'assets', 'style.css'))).toBe(true);
    expect(fs.existsSync(path.join(staticRoot, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(staticRoot, 'prompt.js'))).toBe(true);

    // Originals MOVED (not copied): source assets dir removed from dist root.
    expect(fs.existsSync(path.join(distDir, 'assets'))).toBe(false);
    expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(false);

    // MPA config.json was generated (exercises the MPA branch end-to-end).
    const cfg = JSON.parse(
      fs.readFileSync(path.join(distDir, '.vercel', 'output', 'config.json'), 'utf-8')
    );
    expect(cfg.routes.some((r) => r.dest === '/about.html')).toBe(true);
  });

  it('runVercelAdapter() with NO args defaults opts to {} (covers default-arg branch)', () => {
    const dir = makeTempDir();
    const prevCwd = process.cwd();
    try {
      process.chdir(dir);
      fs.mkdirSync('dist', { recursive: true });
      fs.writeFileSync(path.join('dist', 'index.html'), '<html></html>');
      // No opts object at all → opts = opts || {} fallback executes.
      const result = AdapterVercel.runVercelAdapter();
      expect(fs.existsSync(result.vercelJsonPath)).toBe(true);
      // Defaults to MPA (isSPA undefined) → config.json has root html route.
      const cfg = JSON.parse(
        fs.readFileSync(path.join(dir, 'dist', '.vercel', 'output', 'config.json'), 'utf-8')
      );
      expect(cfg.version).toBe(3);
    } finally {
      process.chdir(prevCwd);
    }
  });

  it('defaults outDir to "dist" relative to cwd when omitted', () => {
    const dir = makeTempDir();
    const prevCwd = process.cwd();
    try {
      process.chdir(dir);
      fs.mkdirSync('dist', { recursive: true });
      fs.writeFileSync(path.join('dist', 'index.html'), '<html></html>');
      const result = AdapterVercel.runVercelAdapter({ isSPA: true });
      expect(fs.existsSync(result.vercelJsonPath)).toBe(true);
      expect(fs.existsSync(path.join(dir, 'dist', '.vercel', 'output', 'config.json'))).toBe(true);
    } finally {
      process.chdir(prevCwd);
    }
  });
});
