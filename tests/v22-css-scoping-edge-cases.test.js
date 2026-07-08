/**
 * PromptJS v132 — CSS scoping edge-case review after #90
 * ============================================================================
 *
 * This suite replaces the earlier Copilot draft that used non-PromptJS syntax
 * (`<style scoped>`) and fake `mode: build/prerender` front matter. These tests
 * use the real #79 syntax (`gayaCakupan: benar` + `Gaya:`) and real compile /
 * build paths.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { compile, compileFile } = require('../src/engine/promptjs');
const Builder = require('../src/engine/builder');
const { runBuild } = require('../src/cli/commands/build');

const tmpRoots = [];
function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

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

function count(str, needle) {
  return (str.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

describe('v22 CSS scoping edge cases — comments/strings containing Komponen/Component', () => {
  it('a block comment mentioning Komponen before a real component does not create a fake scope', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      '/**',
      ' * Komponen Lama(judul): sudah dihapus.',
      ' * Baris ini hanya komentar, bukan deklarasi komponen.',
      ' */',
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
    expect(r.css).not.toContain('data-pjs-home-lama');
    expect(r.js).toContain('setAttribute("data-pjs-home-kartu"');
  });

  it('a string literal mentioning Komponen does not affect the next component scope', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'tetap catatan = "Komponen Palsu hanya teks biasa"',
      '',
      'Komponen Tombol(label):',
      '    Gaya:',
      '        .btn',
      '            color: blue',
      '    Buat button.btn: label',
      '',
      'Buat Tombol(label: "Klik")',
    ].join('\n');

    const r = compile(src, { source: 'ui.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.btn[data-pjs-ui-tombol]');
    expect(r.css).not.toContain('data-pjs-ui-palsu');
    expect(r.js).toContain('data-pjs-ui-tombol');
  });

  it('English Component keyword in comments is ignored, real English Component declaration still scopes', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      '// Component OldWidget is documentation only.',
      'Component Widget(title):',
      '    Style:',
      '        .widget',
      '            color: green',
      '    Create div.widget: title',
      '',
      'Create Widget(title: "Welcome")',
    ].join('\n');

    const r = compile(src, { source: 'about.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.widget[data-pjs-about-widget]');
    expect(r.css).not.toContain('data-pjs-about-oldwidget');
  });
});

describe('v22 CSS scoping edge cases — no opt-in stays global', () => {
  it('components without gayaCakupan produce zero data-pjs in CSS/JS', () => {
    const src = [
      'Komponen Box(content):',
      '    Gaya:',
      '        .box',
      '            background: white',
      '    Buat div.box:',
      '        Buat p: content',
      '',
      'Buat Box(content: "Hello")',
    ].join('\n');

    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(count(r.css, 'data-pjs')).toBe(0);
    expect(count(r.js, 'data-pjs')).toBe(0);
    expect(r.css).toContain('.box {');
  });

  it('multiple unscoped components in one file still produce zero data-pjs', () => {
    const src = [
      'Komponen Card(title):',
      '    Gaya:',
      '        .card',
      '            color: red',
      '    Buat div.card: title',
      '',
      'Komponen Footer(year):',
      '    Gaya:',
      '        footer',
      '            color: gray',
      '    Buat footer: year',
      '',
      'Buat Card(title: "Main")',
      'Buat Footer(year: "2026")',
    ].join('\n');

    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).not.toContain('data-pjs');
    expect(r.js).not.toContain('data-pjs');
  });
});

describe('v22 CSS scoping edge cases — real gayaCakupan syntax', () => {
  it('scopes top-level Gaya with file scope and component Gaya with file+component scope', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Gaya:',
      '    .page',
      '        padding: 1rem',
      '',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            border: 1px solid black',
      '    Buat div.kartu: judul',
      '',
      'Buat main.page:',
      '    Buat Kartu(judul: "Halo")',
    ].join('\n');

    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.page[data-pjs-home]');
    expect(r.css).toContain('.kartu[data-pjs-home-kartu]');
    expect(r.js).toContain('setAttribute("data-pjs-home"');
    expect(r.js).toContain('setAttribute("data-pjs-home-kartu"');
  });

  it('same component name in different files produces different file+component scope ids', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Kartu(judul):',
      '    Gaya:',
      '        .kartu',
      '            background: white',
      '    Buat div.kartu: judul',
      '',
      'Buat Kartu(judul: "Halo")',
    ].join('\n');

    const home = compile(src, { source: 'home.pjs' });
    const dashboard = compile(src, { source: 'dashboard.pjs' });
    expect(home.success).toBe(true);
    expect(dashboard.success).toBe(true);
    expect(home.css).toContain('data-pjs-home-kartu');
    expect(home.js).toContain('data-pjs-home-kartu');
    expect(dashboard.css).toContain('data-pjs-dashboard-kartu');
    expect(dashboard.js).toContain('data-pjs-dashboard-kartu');
  });
});

describe('v22 CSS scoping edge cases — nested component usage', () => {
  it('top-level components can be composed and keep separate CSS scopes', () => {
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Komponen Inner(y):',
      '    Gaya:',
      '        .inner',
      '            margin: 5px',
      '    Buat span.inner: y',
      '',
      'Komponen Outer(x):',
      '    Gaya:',
      '        .outer',
      '            padding: 10px',
      '    Buat div.outer:',
      '        Buat Inner(y: x)',
      '',
      'Buat Outer(x: "nested")',
    ].join('\n');

    const r = compile(src, { source: 'home.pjs' });
    expect(r.success).toBe(true);
    expect(r.css).toContain('.outer[data-pjs-home-outer]');
    expect(r.css).toContain('.inner[data-pjs-home-inner]');
    expect(r.js).toContain('data-pjs-home-outer');
    expect(r.js).toContain('data-pjs-home-inner');
    expect(r.js).toContain('window.Outer = __komp_Outer;');
    expect(r.js).toContain('window.Inner = __komp_Inner;');
  });
});

describe('v22 CSS scoping edge cases — real output paths', () => {
  it('compileFile/dev-style options use the same scope id as compile(source)', () => {
    const dir = mkTmp('pjs-v22-dev-');
    const filePath = path.join(dir, 'about.pjs');
    const src = [
      '---',
      'gayaCakupan: benar',
      '---',
      'Buat div.kartu: "hi"',
      '',
      'Gaya:',
      '    .kartu',
      '        background: white',
    ].join('\n');
    fs.writeFileSync(filePath, src);

    const direct = compile(src, { source: 'about.pjs' });
    const fromFile = compileFile(filePath, {
      dev: true,
      loadDataFiles: true,
      dataDir: path.dirname(filePath),
      source: path.basename(filePath),
    });

    expect(direct.success).toBe(true);
    expect(fromFile.success).toBe(true);
    expect(direct.css).toContain('.kartu[data-pjs-about]');
    expect(fromFile.css).toContain('.kartu[data-pjs-about]');
    expect(fromFile.js).toContain('setAttribute("data-pjs-about"');
  });

  it('Builder.buildProject: no opt-in page stays global, opt-in page is scoped', () => {
    const dir = mkTmp('pjs-v22-builder-');
    fs.mkdirSync(path.join(dir, 'pages'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'pages', 'global.pjs'),
      ['Gaya:', '    h1', '        color: black', '', 'Buat h1: "Global"'].join('\n')
    );
    fs.writeFileSync(
      path.join(dir, 'pages', 'scoped.pjs'),
      [
        '---',
        'gayaCakupan: benar',
        '---',
        'Gaya:',
        '    h1',
        '        color: blue',
        '',
        'Buat h1: "Scoped"',
      ].join('\n')
    );

    const result = Builder.buildProject({
      rootDir: dir,
      outDir: path.join(dir, 'dist'),
      pagesDir: 'pages',
    });
    expect(result.errors).toEqual([]);

    const css = fs.readFileSync(path.join(dir, 'dist', 'prompt.css'), 'utf-8');
    const js = fs.readFileSync(path.join(dir, 'dist', 'prompt.js'), 'utf-8');
    expect(css).toContain('h1 {');
    expect(css).toContain('h1[data-pjs-scoped]');
    expect(js).toContain('setAttribute("data-pjs-scoped"');
    expect(js).not.toContain('setAttribute("data-pjs-global"');
  });

  it('legacy runBuild with --prerender preserves scoped CSS and rendered DOM scope attribute', () => {
    const dir = mkTmp('pjs-v22-prerender-');
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
        '    .kartu',
        '        background: white',
      ].join('\n')
    );

    runInDir(dir, () => runBuild({ _: ['src'], 'out-dir': 'dist', prerender: true }));
    const html = fs.readFileSync(path.join(dir, 'dist', 'page.html'), 'utf-8');
    expect(html).toContain('.kartu[data-pjs-page]');
    expect(html).toContain('data-pjs-page');
  });
});
