// @ts-check

/**
 * PromptJS v6 — Static Adapter Branch & Edge Coverage (S-12)
 * ============================================================================
 *
 * Target: src/engine/adapters/static.js
 * Baseline gap (full suite): branch 88.88%, uncovered lines 72, 75,
 * 320-321, 338.
 *
 * The existing v0.8 suite only puts HTML at the TOP level of dist, so the
 * recursive descent in findHtmlFiles (lines 320-321) and the non-index route
 * derivation in deriveRouteFromHtml (line 338) never run. injectMetaTags is
 * also never given ogImage/ogType (lines 72, 75). This suite covers all of
 * those via a NESTED html layout + a full meta object.
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';

const AdapterStatic = require('../src/engine/adapters/static');

const tmpDirs = [];

function makeTempDir() {
  const dir = path.join('/tmp', 'pjs-v6-static-' + Math.random().toString(36).slice(2, 8));
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

// ── injectMetaTags ogImage / ogType branches (lines 72, 75) ────────────────
describe('v6 — static.injectMetaTags full meta', () => {
  it('injects og:image and og:type when present in meta', () => {
    const html = '<html><head></head><body></body></html>';
    const result = AdapterStatic.injectMetaTags(html, {
      title: 'Full',
      description: 'desc',
      ogImage: 'https://cdn.example.com/cover.png',
      ogType: 'article',
    });
    expect(result).toContain('og:image');
    expect(result).toContain('https://cdn.example.com/cover.png');
    expect(result).toContain('og:type');
    expect(result).toContain('article');
  });

  it('escapes attribute-breaking characters in meta values', () => {
    const html = '<html><head></head><body></body></html>';
    const result = AdapterStatic.injectMetaTags(html, {
      title: 'A "quoted" & <tagged> title',
    });
    // Raw double-quote / angle brackets must be escaped, not passed through.
    expect(result).not.toContain('"quoted"');
    expect(result).toContain('&quot;');
  });

  it('only ogImage (no title/desc) still injects the image tag', () => {
    const html = '<html><head></head></html>';
    const result = AdapterStatic.injectMetaTags(html, { ogImage: '/cover.jpg' });
    expect(result).toContain('og:image');
    expect(result).not.toContain('og:title');
  });
});

// ── findHtmlFiles recursion + deriveRouteFromHtml non-index (320-321, 338) ──
describe('v6 — static.runStaticAdapter with NESTED html', () => {
  function seedNestedDist() {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(path.join(distDir, 'blog'), { recursive: true });

    const js = 'var __x = document.createElement("h1");';
    const css = 'h1{color:red}';
    const topHtml =
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="prompt.css"></head>' +
      '<body><script src="prompt.js"></script></body></html>';
    // NESTED page in a subdirectory — forces findHtmlFiles to recurse and
    // deriveRouteFromHtml to take the non-index ('/blog/post') branch.
    const nestedHtml =
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="prompt.css"></head>' +
      '<body><script src="prompt.js"></script></body></html>';

    fs.writeFileSync(path.join(distDir, 'prompt.js'), js);
    fs.writeFileSync(path.join(distDir, 'prompt.css'), css);
    fs.writeFileSync(path.join(distDir, 'index.html'), topHtml);
    fs.writeFileSync(path.join(distDir, 'blog', 'post.html'), nestedHtml);
    return distDir;
  }

  it('hashes assets and rewrites references in BOTH top-level and nested HTML', () => {
    const distDir = seedNestedDist();

    const result = AdapterStatic.runStaticAdapter({
      outDir: distDir,
      isSPA: false,
      routes: ['/', '/blog/post'],
      meta: {
        title: 'Nested Site',
        description: 'has nested pages',
        ogImage: '/og.png',
        ogType: 'website',
      },
      siteUrl: 'https://example.com',
    });

    expect(result.hashedAssets.js).toMatch(/^prompt\.[0-9a-f]{8}\.js$/);
    expect(result.hashedAssets.css).toMatch(/^prompt\.[0-9a-f]{8}\.css$/);

    // Nested page must have its asset refs rewritten (proves recursion ran).
    const nested = fs.readFileSync(path.join(distDir, 'blog', 'post.html'), 'utf-8');
    expect(nested).toContain(result.hashedAssets.js);
    expect(nested).toContain(result.hashedAssets.css);

    // og tags injected into nested page too.
    expect(nested).toContain('og:image');
    expect(nested).toContain('og:type');

    // Canonical URL for the nested page uses the DERIVED non-index route.
    expect(nested).toContain('https://example.com/blog/post');

    // Top page canonical uses '/' (index → '/').
    const top = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    expect(top).toContain('rel="canonical"');
    expect(top).toContain('https://example.com/');

    // MPA mode → standalone 404 generated.
    expect(fs.existsSync(path.join(distDir, '404.html'))).toBe(true);
    const fourOhFour = fs.readFileSync(path.join(distDir, '404.html'), 'utf-8');
    expect(fourOhFour).toContain('404');
  });

  it('SPA mode generates a 404 that reuses the index shell', () => {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const shell = '<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>';
    fs.writeFileSync(path.join(distDir, 'index.html'), shell);

    AdapterStatic.runStaticAdapter({ outDir: distDir, isSPA: true });

    expect(fs.existsSync(path.join(distDir, '404.html'))).toBe(true);
    const fourOhFour = fs.readFileSync(path.join(distDir, '404.html'), 'utf-8');
    // SPA 404 == index shell (reused), so it contains the app mount point.
    expect(fourOhFour).toContain('id="app"');
  });

  it('runs cleanly when no prompt.js/prompt.css exist (skips hashing branches)', () => {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    // Only an index.html — no prompt.js / prompt.css. The existsSync(jsPath)
    // and existsSync(cssPath) guards take their FALSE branch.
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html><head></head><body></body></html>');

    const result = AdapterStatic.runStaticAdapter({ outDir: distDir, isSPA: false });
    expect(result.hashedAssets.js).toBeUndefined();
    expect(result.hashedAssets.css).toBeUndefined();
    expect(result.errors.length).toBe(0);
    // MPA 404 still generated.
    expect(fs.existsSync(path.join(distDir, '404.html'))).toBe(true);
  });

  it('runStaticAdapter() with no args defaults opts to {} (default-arg branch)', () => {
    const dir = makeTempDir();
    const prevCwd = process.cwd();
    try {
      process.chdir(dir);
      fs.mkdirSync('dist', { recursive: true });
      fs.writeFileSync(path.join('dist', 'index.html'), '<html></html>');
      const result = AdapterStatic.runStaticAdapter();
      expect(result.errors.length).toBe(0);
      expect(result.nonce).toBeNull();
    } finally {
      process.chdir(prevCwd);
    }
  });

  it('CSP injection rewrites every (nested) HTML file and returns a nonce', () => {
    const distDir = seedNestedDist();
    const result = AdapterStatic.runStaticAdapter({ outDir: distDir, csp: true });
    expect(typeof result.nonce).toBe('string');
    expect(result.nonce.length).toBeGreaterThan(10);

    const nested = fs.readFileSync(path.join(distDir, 'blog', 'post.html'), 'utf-8');
    expect(nested).toContain('Content-Security-Policy');
    expect(nested).toContain(result.nonce);
  });
});
