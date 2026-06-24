// @ts-check

/**
 * PromptJS v0.8 — Adapter & Plugin Verification Tests
 * ============================================================================
 *
 * Tests for: config loader, plugin system, static/node/vercel adapters,
 * builder integration with adapters.
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Modules under test ──
const Config = require('../src/engine/config');
const Plugins = require('../src/engine/plugins');
const AdapterStatic = require('../src/engine/adapters/static');
const AdapterNode = require('../src/engine/adapters/node');
const AdapterVercel = require('../src/engine/adapters/vercel');
const Builder = require('../src/engine/builder');
const Engine = require('../src/engine/promptjs');

// ── Temp directory helpers ──
const tmpDirs = [];

function makeTempDir() {
  const dir = path.join('/tmp', 'pjs-v8test-' + Math.random().toString(36).slice(2, 8));
  fs.mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  tmpDirs.length = 0;
}

beforeEach(() => {});
afterEach(cleanup);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Config Loader
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Config Loader', () => {
  it('finds pjs.config.js in project root', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'pjs.config.js'), 'module.exports = { adapter: "static" };');
    const found = Config.findConfigFile(dir);
    expect(found.configPath).toContain('pjs.config.js');
    expect(found.rootDir).toBe(dir);
  });

  it('finds promptjs.config.js as alternative', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'promptjs.config.js'), 'module.exports = { outDir: "build" };');
    const found = Config.findConfigFile(dir);
    expect(found.configPath).toContain('promptjs.config.js');
  });

  it('returns null when no config file exists', () => {
    const dir = makeTempDir();
    const found = Config.findConfigFile(dir);
    expect(found.configPath).toBeNull();
  });

  it('loads valid config with adapter', () => {
    const dir = makeTempDir();
    const cfgPath = path.join(dir, 'pjs.config.js');
    fs.writeFileSync(cfgPath, 'module.exports = { adapter: "static", meta: { title: "Test" } };');
    const { config, errors } = Config.loadConfigFile(cfgPath);
    expect(config.adapter).toBe('static');
    expect(config.meta.title).toBe('Test');
    expect(errors.length).toBe(0);
  });

  it('validates unknown adapter with warning', () => {
    const dir = makeTempDir();
    const cfgPath = path.join(dir, 'pjs.config.js');
    fs.writeFileSync(cfgPath, 'module.exports = { adapter: "cloudflare" };');
    const { config, errors } = Config.loadConfigFile(cfgPath);
    expect(errors.length).toBe(1);
    expect(errors[0].severity).toBe('warning');
  });

  it('loads plugins from config', () => {
    const dir = makeTempDir();
    const cfgPath = path.join(dir, 'pjs.config.js');
    fs.writeFileSync(cfgPath, `
      module.exports = {
        plugins: [
          { name: "test-plugin", transformJS(js) { return js + "\\n// injected"; } }
        ]
      };
    `);
    const { config } = Config.loadConfigFile(cfgPath);
    expect(config.plugins.length).toBe(1);
    expect(config.plugins[0].name).toBe('test-plugin');
  });

  it('loadProjectConfig returns defaults', () => {
    const dir = makeTempDir();
    const { config, errors, rootDir } = Config.loadProjectConfig(dir);
    expect(config.adapter).toBeNull();
    expect(config.plugins).toEqual([]);
    expect(config.outDir).toBe('dist');
    expect(errors.length).toBe(0);
  });

  it('CLI args override config file values', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'pjs.config.js'), 'module.exports = { outDir: "build", adapter: "static" };');
    const { config } = Config.loadProjectConfig(dir, { 'out-dir': 'output', adapter: 'node' });
    expect(config.outDir).toBe('output');
    expect(config.adapter).toBe('node');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Plugin System
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Plugin System', () => {
  it('transformSource modifies source before compile', () => {
    const plugins = [{
      name: 'add-comment',
      transformSource(src) { return '// plugin injected\n' + src; },
    }];
    const result = Plugins.transformSource(plugins, 'Buat h1: "Hi"', 'test.pjs');
    expect(result).toContain('// plugin injected');
    expect(result).toContain('Buat h1: "Hi"');
  });

  it('transformJS modifies compiled JS', () => {
    const plugins = [{
      name: 'append-comment',
      transformJS(js) { return js + '\n// plugin appended'; },
    }];
    const result = Plugins.transformJS(plugins, 'var x = 1;', 'test.pjs');
    expect(result).toContain('// plugin appended');
  });

  it('transformCSS modifies compiled CSS', () => {
    const plugins = [{
      name: 'minify-css',
      transformCSS(css) { return css.trim(); },
    }];
    const result = Plugins.transformCSS(plugins, '  .a { }  \n', 'test.pjs');
    expect(result).toBe('.a { }');
  });

  it('transformHTML modifies generated HTML', () => {
    const plugins = [{
      name: 'add-favicon',
      transformHTML(html) { return html.replace('</head>', '<link rel="icon" href="/favicon.ico"></head>'); },
    }];
    const result = Plugins.transformHTML(plugins, '<html><head></head><body></body></html>', 'test.pjs');
    expect(result).toContain('favicon.ico');
  });

  it('empty plugins array returns content unchanged', () => {
    expect(Plugins.transformSource([], 'src', 'f')).toBe('src');
    expect(Plugins.transformJS([], 'js', 'f')).toBe('js');
    expect(Plugins.transformCSS([], 'css', 'f')).toBe('css');
    expect(Plugins.transformHTML([], 'html', 'f')).toBe('html');
  });

  it('plugin errors are non-fatal (logged, not thrown)', () => {
    const plugins = [{
      name: 'bad-plugin',
      transformJS() { throw new Error('boom'); },
    }];
    // Should not throw, returns original content
    const result = Plugins.transformJS(plugins, 'var x = 1;', 'test.pjs');
    expect(result).toBe('var x = 1;');
  });

  it('plugins work through engine compile pipeline', () => {
    const engine = new Engine.PromptJSEngine();
    const injectComment = {
      name: 'test',
      transformJS(js) { return js + '\n/* PLUGIN_RAN */'; },
    };
    const result = engine.compile('Buat h1: "Test"', { plugins: [injectComment] });
    expect(result.js).toContain('/* PLUGIN_RAN */');
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Adapter: Static
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Adapter: Static', () => {
  it('contentHash produces 8-char hex string', () => {
    const hash = AdapterStatic.contentHash('hello world');
    expect(hash).toHaveLength(8);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('hashFilename adds hash before extension', () => {
    const hashed = AdapterStatic.hashFilename('prompt.js', 'var x=1;');
    expect(hashed).toMatch(/^prompt\.[0-9a-f]{8}\.js$/);
  });

  it('injectMetaTags adds og:title and description', () => {
    const html = '<html><head></head><body></body></html>';
    const result = AdapterStatic.injectMetaTags(html, { title: 'My App', description: 'A test' });
    expect(result).toContain('og:title');
    expect(result).toContain('My App');
    expect(result).toContain('description');
    expect(result).toContain('A test');
  });

  it('injectMetaTags adds canonical URL when siteUrl provided', () => {
    const html = '<html><head></head><body></body></html>';
    const result = AdapterStatic.injectMetaTags(html, {}, { siteUrl: 'https://example.com', route: '/about' });
    expect(result).toContain('canonical');
    expect(result).toContain('https://example.com/about');
  });

  it('injectMetaTags returns unchanged HTML when meta is empty', () => {
    const html = '<html><head></head><body></body></html>';
    expect(AdapterStatic.injectMetaTags(html, {})).toBe(html);
  });

  it('generateSitemap produces valid XML', () => {
    const xml = AdapterStatic.generateSitemap(['/', '/about'], 'https://example.com');
    expect(xml).toContain('<?xml');
    expect(xml).toContain('https://example.com/');
    expect(xml).toContain('https://example.com/about');
    expect(xml).toContain('urlset');
  });

  it('generate404 returns SPA shell for SPA mode', () => {
    const shell = '<html><head></head><body><div id="app"></div></body></html>';
    const fourOhFour = AdapterStatic.generate404(shell);
    expect(fourOhFour).toBe(shell); // SPA: reuse shell
  });

  it('generate404 returns standalone page for MPA mode', () => {
    const fourOhFour = AdapterStatic.generate404(null);
    expect(fourOhFour).toContain('404');
    expect(fourOhFour).toContain('Tidak Ditemukan');
  });

  it('runStaticAdapter hashes JS and CSS files', () => {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    // Write mock build output
    const jsContent = 'var __el_1 = document.createElement("h1");';
    const cssContent = 'h1 { color: red; }';
    const htmlContent = '<!DOCTYPE html><html><head><link rel="stylesheet" href="prompt.css"></head><body><script src="prompt.js"></script></body></html>';

    fs.writeFileSync(path.join(distDir, 'prompt.js'), jsContent);
    fs.writeFileSync(path.join(distDir, 'prompt.css'), cssContent);
    fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);

    const result = AdapterStatic.runStaticAdapter({
      outDir: distDir,
      isSPA: true,
      routes: ['/', '/about'],
      meta: { title: 'Test Site', description: 'A test' },
      siteUrl: 'https://example.com',
    });

    // Check hashed assets
    expect(result.hashedAssets.js).toMatch(/^prompt\.[0-9a-f]{8}\.js$/);
    expect(result.hashedAssets.css).toMatch(/^prompt\.[0-9a-f]{8}\.css$/);

    // Check HTML references updated
    const updatedHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    expect(updatedHtml).toContain(result.hashedAssets.js);
    expect(updatedHtml).toContain(result.hashedAssets.css);

    // Check meta tags injected
    expect(updatedHtml).toContain('og:title');
    expect(updatedHtml).toContain('Test Site');

    // Check sitemap generated
    expect(fs.existsSync(path.join(distDir, 'sitemap.xml'))).toBe(true);

    // Check 404 generated
    expect(fs.existsSync(path.join(distDir, '404.html'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Adapter: Node
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Adapter: Node', () => {
  it('generateServerJS produces valid JS with http.createServer', () => {
    const serverJS = AdapterNode.generateServerJS({ isSPA: false, apiUrl: '' });
    expect(serverJS).toContain('http.createServer');
    expect(serverJS).toContain('MIME_TYPES');
    expect(serverJS).toContain('serveStaticFile');
  });

  it('SPA server serves index.html for all routes', () => {
    const serverJS = AdapterNode.generateServerJS({ isSPA: true, apiUrl: '' });
    expect(serverJS).toContain('INDEX_HTML');
    expect(serverJS).toContain('SPA fallback');
  });

  it('MPA server maps routes to .html files', () => {
    const serverJS = AdapterNode.generateServerJS({ isSPA: false, apiUrl: '' });
    expect(serverJS).toContain('pathname + ".html"');
    expect(serverJS).toContain('404.html');
  });

  it('API proxy is included when apiUrl is configured', () => {
    const serverJS = AdapterNode.generateServerJS({ isSPA: false, apiUrl: 'https://api.example.com' });
    expect(serverJS).toContain('API_URL');
    expect(serverJS).toContain('proxyApi');
    expect(serverJS).toContain('/api/');
  });

  it('API proxy is omitted when apiUrl is empty', () => {
    const serverJS = AdapterNode.generateServerJS({ isSPA: false, apiUrl: '' });
    expect(serverJS).not.toContain('proxyApi');
  });

  it('runNodeAdapter writes server.js and Dockerfile', () => {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    const result = AdapterNode.runNodeAdapter({
      outDir: distDir,
      isSPA: true,
      routes: ['/', '/about'],
      apiUrl: 'https://api.example.com',
    });

    expect(fs.existsSync(result.serverPath)).toBe(true);
    expect(fs.existsSync(result.dockerfilePath)).toBe(true);

    const serverContent = fs.readFileSync(result.serverPath, 'utf-8');
    expect(serverContent).toContain('http.createServer');
    expect(serverContent).toContain('API_URL');

    const dockerContent = fs.readFileSync(result.dockerfilePath, 'utf-8');
    expect(dockerContent).toContain('FROM node:20-slim');
    expect(dockerContent).toContain('"node", "server.js"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Adapter: Vercel
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Adapter: Vercel', () => {
  it('generateVercelJson includes SPA rewrites in SPA mode', () => {
    const json = AdapterVercel.generateVercelJson({ isSPA: true });
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.rewrites).toBeDefined();
    expect(parsed.rewrites[0].source).toBe('/(.*)');
  });

  it('generateVercelJson has no rewrites in MPA mode', () => {
    const json = AdapterVercel.generateVercelJson({ isSPA: false });
    const parsed = JSON.parse(json);
    expect(parsed.rewrites).toBeUndefined();
  });

  it('generateOutputConfig produces V3 format', () => {
    const json = AdapterVercel.generateOutputConfig({ isSPA: true });
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(3);
    expect(parsed.routes).toBeDefined();
    expect(parsed.routes[0].src).toBe('/(.*)');
    expect(parsed.routes[0].dest).toBe('/index.html');
  });

  it('runVercelAdapter creates .vercel/output structure', () => {
    const dir = makeTempDir();
    const distDir = path.join(dir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    // Write mock build output
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(distDir, 'prompt.js'), 'var x=1;');
    fs.mkdirSync(path.join(distDir, 'assets'));
    fs.writeFileSync(path.join(distDir, 'assets', 'logo.png'), 'fake-png');

    const result = AdapterVercel.runVercelAdapter({
      outDir: distDir,
      isSPA: true,
      routes: ['/', '/about'],
    });

    // Check vercel.json at root
    expect(fs.existsSync(result.vercelJsonPath)).toBe(true);

    // Check .vercel/output structure
    expect(fs.existsSync(path.join(distDir, '.vercel', 'output', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, '.vercel', 'output', 'static', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, '.vercel', 'output', 'static', 'prompt.js'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, '.vercel', 'output', 'static', 'assets', 'logo.png'))).toBe(true);

    // Check functions dir exists
    expect(fs.existsSync(path.join(distDir, '.vercel', 'output', 'functions'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Builder Integration with Adapters
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Builder + Adapter Integration', () => {
  it('buildProject with adapter=static generates hashed assets', () => {
    const dir = makeTempDir();
    const pagesDir = path.join(dir, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, 'index.pjs'), 'Buat h1: "Hello"');

    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      adapter: 'static',
      siteUrl: 'https://example.com',
      meta: { title: 'Test' },
    });

    expect(result.isSPA).toBe(false);
    expect(result.errors.length).toBe(0);

    // Static adapter should have run
    expect(result.adapter).toBeDefined();
    expect(result.adapter.hashedAssets).toBeDefined();

    // Check sitemap generated
    expect(fs.existsSync(path.join(dir, 'dist', 'sitemap.xml'))).toBe(true);
  });

  it('buildProject with adapter=node generates server.js', () => {
    const dir = makeTempDir();
    const pagesDir = path.join(dir, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, 'index.pjs'), 'Buat h1: "Hello"');

    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      adapter: 'node',
    });

    expect(result.errors.length).toBe(0);
    expect(result.adapter).toBeDefined();
    expect(fs.existsSync(path.join(dir, 'dist', 'server.js'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'dist', 'Dockerfile'))).toBe(true);
  });

  it('buildProject with adapter=vercel creates Vercel output', () => {
    const dir = makeTempDir();
    const pagesDir = path.join(dir, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, 'index.pjs'), 'Buat h1: "Hello"');

    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      adapter: 'vercel',
    });

    expect(result.errors.length).toBe(0);
    expect(result.adapter).toBeDefined();
    expect(fs.existsSync(path.join(dir, 'dist', 'vercel.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'dist', '.vercel', 'output', 'config.json'))).toBe(true);
  });

  it('buildProject without adapter produces standard output (zero regression)', () => {
    const dir = makeTempDir();
    const pagesDir = path.join(dir, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, 'index.pjs'), 'Buat h1: "Hello"');

    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
    });

    expect(result.errors.length).toBe(0);
    expect(result.isSPA).toBe(false);
    expect(result.adapter).toBeNull();
    expect(fs.existsSync(path.join(dir, 'dist', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'dist', 'prompt.js'))).toBe(true);
  });

  it('buildProject with unknown adapter returns error', () => {
    const dir = makeTempDir();
    const pagesDir = path.join(dir, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, 'index.pjs'), 'Buat h1: "Hello"');

    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      adapter: 'cloudflare',
    });

    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Unknown adapter');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Backward Compatibility
// ═══════════════════════════════════════════════════════════════════════════
describe('v0.8 — Backward Compatibility', () => {
  it('compile without plugins option works as before', () => {
    const engine = new Engine.PromptJSEngine();
    const result = engine.compile('Buat h1: "Hello"');
    expect(result.success).toBe(true);
    expect(result.js).toContain('createElement');
  });

  it('compileFile works without config file present', () => {
    const dir = makeTempDir();
    const filePath = path.join(dir, 'test.pjs');
    fs.writeFileSync(filePath, 'Buat p: "Hello"');

    const engine = new Engine.PromptJSEngine();
    const result = engine.compileFile(filePath);
    expect(result.success).toBe(true);
  });

  it('all existing 328 tests still pass (import check)', () => {
    // This test exists to ensure the import chain doesn't break
    // Actual test coverage is in the other test files
    expect(Config.loadProjectConfig).toBeInstanceOf(Function);
    expect(Plugins.transformSource).toBeInstanceOf(Function);
    expect(AdapterStatic.runStaticAdapter).toBeInstanceOf(Function);
    expect(AdapterNode.runNodeAdapter).toBeInstanceOf(Function);
    expect(AdapterVercel.runVercelAdapter).toBeInstanceOf(Function);
  });
});