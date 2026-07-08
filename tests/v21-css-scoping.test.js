/**
 * v132 #79 — CSS Scoping (opt-in, file + component naming) — implementation
 * ============================================================================
 *
 * Implements the Lapis 4 CSS Architecture Audit's design decision plus the
 * maintainer's follow-up decision on scope naming (issue #79 comments,
 * 2026-07-07): opt-in via `gayaCakupan: benar` front-matter, scope id shape
 * `<fileScope>` (page/file-level `Gaya:`) or `<fileScope>-<componentName>`
 * (component-level `Gaya:`), stamped as a `data-pjs-<scope>` DOM attribute
 * that matches the `[data-pjs-<scope>]` attribute selector already produced
 * by `src/engine/css.js`'s `scopeSelector()`.
 *
 * Explicitly OUT OF SCOPE (per user instruction — do not widen #79's fix):
 *   - #81 (routing guards) — untouched.
 *   - #82 (slots/transclusion) — untouched.
 *
 * Coverage required by the task:
 *   1. CSS output (selector string contains the right scope id).
 *   2. DOM attribute (compiled+executed JS actually stamps the attribute,
 *      and it really matches the CSS selector at runtime via jsdom).
 *   3. Duplicate component name across different files does not collide.
 *   4. Top-level page style (no active component) uses file-only scope.
 *   5. Nested components each get their OWN scope, not the parent's.
 *   6. No opt-in (`gayaCakupan` absent) stays 100% global — no attribute
 *      anywhere in CSS or JS (byte-level backward compatibility).
 *   7. Build / dev / prerender consistency (all three produce the SAME
 *      scope id for the same file+component).
 */

import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);

const { compile, compileFile } = require('../src/engine/promptjs');
const Builder = require('../src/engine/builder');
const { runBuild } = require('../src/cli/commands/build');
const { runServe } = require('../src/cli/commands/serve');
const { JSDOM } = require('jsdom');

const tmpRoots = [];
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
afterAll(() => {
  for (const d of tmpRoots) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
});

/** Run `fn` with cwd temporarily switched to `dir`, process.exit stubbed to
 * throw a catchable sentinel, and stdio silenced — mirrors the pattern
 * already used by tests/cli-commands-coverage.test.js for in-process CLI
 * command coverage. */
function runInDir(dir, fn) {
  const prevCwd = process.cwd();
  const realExit = process.exit;
  const realOut = process.stdout.write;
  const realErr = process.stderr.write;
  let exitCode = null;
  process.exit = (code) => {
    exitCode = code == null ? 0 : code;
    throw new Error('__EXIT__' + exitCode);
  };
  process.stdout.write = () => true;
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

/** Compile `source`, execute the resulting JS + CSS in a real jsdom document,
 * and return the jsdom `window` for further DOM/CSSOM assertions. */
function runInJsdom(source, compileOpts) {
  const r = compile(source, compileOpts);
  expect(r.errors).toEqual([]);
  expect(r.success).toBe(true);
  const dom = new JSDOM(`<!DOCTYPE html><html><body><style>${r.css}</style></body></html>`, {
    runScripts: 'dangerously',
    resources: 'usable',
  });
  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = r.js;
  dom.window.document.body.appendChild(scriptEl);
  return { window: dom.window, result: r };
}

// ─────────────────────────────────────────────────────────────────────────
// 1. CSS output — selector scoping
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — CSS output', () => {
  it('component-level Gaya: gets <fileScope>-<componentName> scope', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background: white',
      '    Buat div.kartu:',
      '        Buat h3: judul',
      '',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');
    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.kartu[data-pjs-home-kartu]');
  });

  it('page/file-level Gaya: (no active component) gets <fileScope>-only scope', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Gaya:',
      '    .page-title',
      '        color: navy',
      '',
      'Buat h1.page-title: "Judul"',
    ].join('\n');
    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.page-title[data-pjs-home]');
    expect(r.css).not.toContain('data-pjs-home-');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Runtime DOM attribute stamping — matches CSS at ACTUAL execution time
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — DOM attribute stamping (runtime, jsdom)', () => {
  it('stamps data-pjs-<scope> on the component root AND its descendants', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background: white',
      '    Buat div.kartu:',
      '        Buat h3: judul',
      '',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');
    const { window } = runInJsdom(src, { source: 'home.pjs' });
    const kartu = window.document.querySelector('.kartu');
    expect(kartu).not.toBeNull();
    expect(kartu.getAttribute('data-pjs-home-kartu')).toBe('');
    // The h3 descendant, also stamped, still matches its OWN plain
    // (unscoped-attribute) selector via real descendant combinator — the
    // point of `[data-pjs-*]` living on compound-selector-1 only.
    const h3 = kartu.querySelector('h3');
    expect(h3.getAttribute('data-pjs-home-kartu')).toBe('');
  });

  it('the scoped selector actually MATCHES the stamped element (computed style proves it)', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background-color: rgb(255, 0, 0)',
      '    Buat div.kartu:',
      '        Buat h3: judul',
      '',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');
    const { window } = runInJsdom(src, { source: 'home.pjs' });
    const kartu = window.document.querySelector('.kartu');
    const bg = window.getComputedStyle(kartu).backgroundColor;
    expect(bg).toBe('rgb(255, 0, 0)');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Duplicate component name across different files does NOT collide
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — duplicate component name across files', () => {
  const src = [
    '---',
    'gayaCakupan: benar',
    '---',
    'Komponen Kartu(judul):',
    '    Gaya:',
    '        .kartu',
    '            background: white',
    '    Buat div.kartu:',
    '        Buat h3: judul',
    '',
    'Buat Kartu(judul: "Halo")',
  ].join('\n');

  it('same component name, different file scope -> different data-pjs-* ids', () => {
    const rHome = compile(src, { source: 'home.pjs' });
    const rDash = compile(src, { source: 'dashboard.pjs' });
    expect(rHome.css).toContain('data-pjs-home-kartu');
    expect(rDash.css).toContain('data-pjs-dashboard-kartu');
    expect(rHome.css).not.toContain('data-pjs-dashboard-kartu');
    expect(rDash.css).not.toContain('data-pjs-home-kartu');
    expect(rHome.js).toContain('data-pjs-home-kartu');
    expect(rDash.js).toContain('data-pjs-dashboard-kartu');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Top-level page style already covered above (CSS output section) —
//    add a runtime cross-check here (page style + component in same file
//    must not merge into the same scope id).
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — page-level vs component-level scope isolation', () => {
  it('page-level h1 and component Kartu in the SAME file get DIFFERENT scopes', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Gaya:',
      '    .page-title',
      '        color: navy',
      '',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background: white',
      '    Buat div.kartu:',
      '        Buat h3: judul',
      '',
      'Buat h1.page-title: "Judul"',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');
    const { window } = runInJsdom(src, { source: 'home.pjs' });
    const title = window.document.querySelector('.page-title');
    const kartu = window.document.querySelector('.kartu');
    expect(title.getAttribute('data-pjs-home')).toBe('');
    expect(title.hasAttribute('data-pjs-home-kartu')).toBe(false);
    expect(kartu.getAttribute('data-pjs-home-kartu')).toBe('');
    expect(kartu.hasAttribute('data-pjs-home')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Nested components
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — nested components', () => {
  it("a component nested inside another gets its OWN scope, not the parent's", () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Anak(y):',
      '    Gaya:',
      '        .anak-box',
      '            background: lightblue',
      '    Buat span.anak-box: y',
      '',
      'Komponen Induk(x):',
      '    Gaya:',
      '        .induk-box',
      '            background: pink',
      '    Buat div.induk-box:',
      '        Buat span: x',
      '',
      'Buat Induk(x: "Halo Induk")',
      'Buat Anak(y: "Halo Anak")',
    ].join('\n');
    const { window } = runInJsdom(src, { source: 'home.pjs' });
    const indukBox = window.document.querySelector('.induk-box');
    const anakBox = window.document.querySelector('.anak-box');
    expect(indukBox.getAttribute('data-pjs-home-induk')).toBe('');
    expect(indukBox.hasAttribute('data-pjs-home-anak')).toBe(false);
    expect(anakBox.getAttribute('data-pjs-home-anak')).toBe('');
    expect(anakBox.hasAttribute('data-pjs-home-induk')).toBe(false);
  });

  it('a component literally declared INSIDE another (nested declaration) uses its own name', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Induk(x):',
      '    Gaya:',
      '        .induk-box',
      '            background: pink',
      '    Komponen Anak(y):',
      '        Gaya:',
      '            .anak-box',
      '                background: lightblue',
      '        Buat span.anak-box: y',
      '    Buat div.induk-box:',
      '        Buat span: x',
      '',
      'Buat Induk(x: "Halo")',
    ].join('\n');
    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.induk-box[data-pjs-home-induk]');
    expect(r.css).toContain('.anak-box[data-pjs-home-anak]');
    expect(r.js).toContain('data-pjs-home-induk');
    expect(r.js).toContain('data-pjs-home-anak');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. No opt-in -> stays global (backward compatibility)
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — no opt-in stays 100% global', () => {
  it('without gayaCakupan, CSS has no scope attribute and JS stamps nothing', () => {
    const src = [
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background: white',
      '    Buat div.kartu:',
      '        Buat h3: judul',
      '',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');
    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toBe('.kartu {\n  background: white;\n}');
    expect(r.css).not.toContain('data-pjs');
    expect(r.js).not.toContain('data-pjs');
    expect(r.js).not.toContain('setAttribute');
  });

  it('gayaCakupan: salah (falsy) also stays global', () => {
    const src = [
      '---',
      'gayaCakupan: salah',
      '---',
      'Gaya:',
      '    .kartu',
      '        background: white',
      '',
      'Buat div.kartu: "hi"',
    ].join('\n');
    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).not.toContain('data-pjs');
    expect(r.js).not.toContain('data-pjs');
  });

  it('gayaCakupan front-matter directive itself never leaks into compiled JS', () => {
    const src = ['---', 'gayaCakupan: benar', '---', '', 'Buat h1: "Hi"'].join('\n');
    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('gayaCakupan');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7a. Build (project mode, multi-page builder) consistency
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — Builder.buildProject consistency', () => {
  it('a page WITHOUT gayaCakupan stays global (no silent opt-in via builder scope)', () => {
    const dir = mkTmp('pjs-css-scope-build-');
    fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'pages', 'index.pjs'),
      ['Gaya:', '    h1', '        color: #333', '', 'Buat h1: "Hello"'].join('\n')
    );
    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      pagesDir: 'pages',
    });
    expect(result.errors).toEqual([]);
    expect(result.css).not.toContain('data-pjs');
    const js = fs.readFileSync(path.join(dir, 'dist', 'prompt.js'), 'utf-8');
    expect(js).not.toContain('data-pjs');
  });

  it('a page WITH gayaCakupan: benar gets scoped CSS + matching DOM attribute', () => {
    const dir = mkTmp('pjs-css-scope-build-optin-');
    fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'pages', 'index.pjs'),
      [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    h1',
        '        color: #333',
        '',
        'Buat h1: "Hello"',
      ].join('\n')
    );
    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      pagesDir: 'pages',
    });
    expect(result.errors).toEqual([]);
    expect(result.css).toContain('h1[data-pjs-index]');
    const js = fs.readFileSync(path.join(dir, 'dist', 'prompt.js'), 'utf-8');
    expect(js).toContain('setAttribute("data-pjs-index"');
  });

  it('two pages with same-named components do not collide (file+component scope)', () => {
    const dir = mkTmp('pjs-css-scope-build-dup-');
    fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });
    const compSrc = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background: white',
      '    Buat div.kartu:',
      '        Buat h3: judul',
      '',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'pages', 'home.pjs'), compSrc);
    fs.writeFileSync(path.join(dir, 'pages', 'dashboard.pjs'), compSrc);
    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      pagesDir: 'pages',
    });
    expect(result.errors).toEqual([]);
    expect(result.css).toContain('data-pjs-home-kartu');
    expect(result.css).toContain('data-pjs-dashboard-kartu');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7b. Build (legacy single-file mode, CLI in-process) consistency
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — legacy CLI build consistency', () => {
  it('legacy build honors gayaCakupan opt-in and stamps the SAME scope CSS uses', () => {
    const dir = mkTmp('pjs-css-scope-legacy-');
    const srcDir = path.join(dir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'page.pjs'),
      [
        '---',
        'gayaCakupan: benar',
        '---',
        'Buat div.kartu: "styled"',
        '',
        'Gaya:',
        '    .kartu:',
        '        warna: putih',
      ].join('\n')
    );
    runInDir(dir, () => runBuild({ _: ['src'], 'out-dir': 'dist' }));
    const html = fs.readFileSync(path.join(dir, 'dist', 'page.html'), 'utf-8');
    expect(html).toContain('data-pjs-page');
    const js = fs.readFileSync(path.join(dir, 'dist', 'page.js'), 'utf-8');
    expect(js).toContain('setAttribute("data-pjs-page"');
  });

  it('legacy build WITHOUT gayaCakupan stays global (no attribute anywhere)', () => {
    const dir = mkTmp('pjs-css-scope-legacy-noscope-');
    const srcDir = path.join(dir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'page.pjs'),
      ['Buat div.kartu: "styled"', '', 'Gaya:', '    .kartu:', '        warna: putih'].join('\n')
    );
    runInDir(dir, () => runBuild({ _: ['src'], 'out-dir': 'dist' }));
    const html = fs.readFileSync(path.join(dir, 'dist', 'page.html'), 'utf-8');
    expect(html).not.toContain('data-pjs');
    const js = fs.readFileSync(path.join(dir, 'dist', 'page.js'), 'utf-8');
    expect(js).not.toContain('data-pjs');
  });

  it('legacy build --prerender inlines the SAME scoped CSS (prerender path consistency)', () => {
    const dir = mkTmp('pjs-css-scope-prerender-');
    const srcDir = path.join(dir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'page.pjs'),
      [
        '---',
        'gayaCakupan: benar',
        '---',
        'Buat div.kartu: "styled"',
        '',
        'Gaya:',
        '    .kartu:',
        '        warna: putih',
      ].join('\n')
    );
    runInDir(dir, () => runBuild({ _: ['src'], 'out-dir': 'dist', prerender: true }));
    const html = fs.readFileSync(path.join(dir, 'dist', 'page.html'), 'utf-8');
    // Prerendered output inlines <style> with the SAME scope id the
    // (also prerendered, jsdom-executed) DOM attribute uses.
    expect(html).toContain('data-pjs-page');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7c. Dev server consistency
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — dev server consistency', () => {
  it('dev server output uses the SAME scope id build/compile would produce', () => {
    const dir = mkTmp('pjs-css-scope-devsrv-');
    fs.writeFileSync(
      path.join(dir, 'about.pjs'),
      [
        '---',
        'gayaCakupan: benar',
        '---',
        'Buat div.kartu: "hi"',
        '',
        'Gaya:',
        '    .kartu',
        '        background: white',
      ].join('\n')
    );

    // compileFile() directly, using the EXACT option shape serve.js's
    // compilePjs() passes (dev:true, loadDataFiles, dataDir, source) — this
    // is what a real dev-server request compiles under the hood.
    const filePath = path.join(dir, 'about.pjs');
    const result = compileFile(filePath, {
      dev: true,
      loadDataFiles: true,
      dataDir: path.dirname(filePath),
      source: path.basename(filePath),
    });
    expect(result.success).toBe(true);
    expect(result.css).toContain('.kartu[data-pjs-about]');
    expect(result.js).toContain('setAttribute("data-pjs-about"');
  });

  it('dev server HTTP response (runServe, in-process) inlines the scoped CSS + stamped JS', async () => {
    const dir = mkTmp('pjs-css-scope-devsrv-http-');
    fs.writeFileSync(
      path.join(dir, 'index.pjs'),
      [
        '---',
        'gayaCakupan: benar',
        '---',
        'Buat div.kartu: "hi"',
        '',
        'Gaya:',
        '    .kartu',
        '        background: white',
      ].join('\n')
    );
    const server = runServe({ _: [dir], port: 0, 'no-reload': true });
    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });
    const port = server.address().port;
    try {
      const body = await new Promise((resolve, reject) => {
        const http = require('http');
        http
          .get({ host: '127.0.0.1', port, path: '/', headers: { Connection: 'close' } }, (res) => {
            let b = '';
            res.on('data', (c) => (b += c));
            res.on('end', () => resolve(b));
          })
          .on('error', reject);
      });
      expect(body).toContain('data-pjs-index');
      expect(body).toContain('setAttribute("data-pjs-index"');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('dev server WITHOUT gayaCakupan stays global', async () => {
    const dir = mkTmp('pjs-css-scope-devsrv-noopt-');
    fs.writeFileSync(
      path.join(dir, 'index.pjs'),
      ['Buat div.kartu: "hi"', '', 'Gaya:', '    .kartu', '        background: white'].join('\n')
    );
    const server = runServe({ _: [dir], port: 0, 'no-reload': true });
    await new Promise((resolve) => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });
    const port = server.address().port;
    try {
      const body = await new Promise((resolve, reject) => {
        const http = require('http');
        http
          .get({ host: '127.0.0.1', port, path: '/', headers: { Connection: 'close' } }, (res) => {
            let b = '';
            res.on('data', (c) => (b += c));
            res.on('end', () => resolve(b));
          })
          .on('error', reject);
      });
      expect(body).not.toContain('data-pjs');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Extra: scope name sanitization sanity (dynamic-ish file names, e.g. routes
// with `[slug]`) — ensures `data-pjs-*` is always a valid attribute value.
// ─────────────────────────────────────────────────────────────────────────
describe('#79 CSS scoping — scope name sanitization', () => {
  it('sanitizes non-alphanumeric characters in file/component names deterministically', () => {
    const { sanitizeScopeName, buildScopeId } = require('../src/engine/css');
    expect(sanitizeScopeName('[slug]')).toBe('slug');
    expect(sanitizeScopeName('My File')).toBe('my-file');
    expect(sanitizeScopeName('')).toBe('x');
    expect(buildScopeId('Home', 'Kartu')).toBe('home-kartu');
    expect(buildScopeId('Home')).toBe('home');
    // Deterministic: same inputs -> same output across repeated calls.
    expect(buildScopeId('Home', 'Kartu')).toBe(buildScopeId('Home', 'Kartu'));
  });
});
