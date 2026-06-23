/**
 * v0.4.0 Integration Tests — Builder end-to-end (Wave J/K)
 *
 * Tests the multi-file project builder: compile .pjs files in src/pages/,
 * bundle JS into prompt.js, CSS into prompt.css, generate per-page HTML.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import path from 'path';
import {
  createTempDir,
  cleanupAll,
  writeTempFile,
  existsTempFile,
  readTempFile,
} from './helpers/temp-fs.js';
const Builder = require('../src/engine/builder.js');
const Engine = require('../src/engine/promptjs.js');

describe('v0.4.0 — Builder Integration', () => {
  let tmp;

  beforeEach(() => {
    tmp = createTempDir('builder-test');
  });

  afterEach(() => {
    tmp.cleanup();
  });

  describe('fileToRoute', () => {
    it('maps index.pjs to /', () => {
      expect(Builder.fileToRoute('/src/pages/index.pjs', '/src/pages')).toBe('/');
    });

    it('maps about.pjs to /about', () => {
      expect(Builder.fileToRoute('/src/pages/about.pjs', '/src/pages')).toBe('/about');
    });

    it('maps blog/index.pjs to /blog', () => {
      expect(Builder.fileToRoute('/src/pages/blog/index.pjs', '/src/pages')).toBe('/blog');
    });

    it('maps blog/post.pjs to /blog/post', () => {
      expect(Builder.fileToRoute('/src/pages/blog/post.pjs', '/src/pages')).toBe('/blog/post');
    });

    it('maps [slug].pjs to /:slug', () => {
      expect(Builder.fileToRoute('/src/pages/blog/[slug].pjs', '/src/pages')).toBe('/blog/:slug');
    });
  });

  describe('routeToHtmlFile', () => {
    it('maps / to index.html', () => {
      expect(Builder.routeToHtmlFile('/')).toBe('index.html');
    });

    it('maps /about to about.html', () => {
      expect(Builder.routeToHtmlFile('/about')).toBe('about.html');
    });

    it('maps /blog to blog.html', () => {
      expect(Builder.routeToHtmlFile('/blog')).toBe('blog.html');
    });

    it('maps /blog/post to blog/post.html', () => {
      expect(Builder.routeToHtmlFile('/blog/post')).toBe('blog/post.html');
    });
  });

  describe('buildProject — single page', () => {
    it('builds a single-page project', () => {
      writeTempFile(tmp.dir, 'pages/index.pjs', 'Buat h1: "Hello"');

      const result = Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      expect(result.errors.length).toBe(0);
      expect(result.pages.length).toBe(1);
      expect(result.pages[0].route).toBe('/');
      expect(result.pages[0].htmlFile).toBe('index.html');
      expect(result.pages[0].js).toContain('createElement');
      expect(result.pages[0].success).toBe(true);
    });

    it('writes prompt.js to dist/', () => {
      writeTempFile(tmp.dir, 'pages/index.pjs', 'Buat h1: "Hello"');

      Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      expect(existsTempFile(tmp.dir, 'dist/prompt.js')).toBe(true);
      const js = readTempFile(tmp.dir, 'dist/prompt.js');
      expect(js).toContain('PromptJS v0.4.0');
      expect(js).toContain('createElement');
    });

    it('writes index.html to dist/', () => {
      writeTempFile(tmp.dir, 'pages/index.pjs', 'Buat h1: "Hello"');

      Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      expect(existsTempFile(tmp.dir, 'dist/index.html')).toBe(true);
      const html = readTempFile(tmp.dir, 'dist/index.html');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('prompt.js');
    });
  });

  describe('buildProject — multi-page', () => {
    it('builds multiple pages with routing', () => {
      writeTempFile(tmp.dir, 'pages/index.pjs', 'Buat h1: "Home"');
      writeTempFile(tmp.dir, 'pages/about.pjs', 'Buat h1: "About"');
      writeTempFile(tmp.dir, 'pages/blog/index.pjs', 'Buat h1: "Blog"');

      const result = Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      expect(result.pages.length).toBe(3);
      const routes = result.pages.map((p) => p.route);
      expect(routes).toContain('/');
      expect(routes).toContain('/about');
      expect(routes).toContain('/blog');

      expect(existsTempFile(tmp.dir, 'dist/index.html')).toBe(true);
      expect(existsTempFile(tmp.dir, 'dist/about.html')).toBe(true);
      expect(existsTempFile(tmp.dir, 'dist/blog.html')).toBe(true);

      // Single prompt.js for all pages
      expect(existsTempFile(tmp.dir, 'dist/prompt.js')).toBe(true);
      const js = readTempFile(tmp.dir, 'dist/prompt.js');
      expect(js).toContain('"/"');
      expect(js).toContain('"/about"');
      expect(js).toContain('"/blog"');
    });
  });

  describe('buildProject — CSS support', () => {
    it('extracts CSS and writes prompt.css', () => {
      writeTempFile(
        tmp.dir,
        'pages/index.pjs',
        [
          'Gaya:',
          '    h1',
          '        color: #333',
          '    .card',
          '        background: white',
          '',
          'Buat h1: "Hello"',
        ].join('\n')
      );

      const result = Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      expect(result.css).toContain('color: #333');
      expect(result.css).toContain('background: white');
      expect(existsTempFile(tmp.dir, 'dist/prompt.css')).toBe(true);

      const css = readTempFile(tmp.dir, 'dist/prompt.css');
      expect(css).toContain('PromptJS v0.4.0');
      expect(css).toContain('h1[data-pjs-index]');
    });

    it('includes CSS link in HTML', () => {
      writeTempFile(
        tmp.dir,
        'pages/index.pjs',
        ['Gaya:', '    h1', '        color: red', '', 'Buat h1: "Hi"'].join('\n')
      );

      Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      const html = readTempFile(tmp.dir, 'dist/index.html');
      expect(html).toContain('prompt.css');
      expect(html).toContain('prompt.js');
    });
  });

  describe('buildProject — error handling', () => {
    it('reports compile errors', () => {
      writeTempFile(tmp.dir, 'pages/bad.pjs', 'Buat h1: @#$');

      const result = Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles empty pages directory', () => {
      // Create the directory but no .pjs files
      writeTempFile(tmp.dir, 'pages/.keep', '');

      const result = Builder.buildProject({
        rootDir: tmp.dir,
        outDir: path.join(tmp.dir, 'dist'),
        pagesDir: 'pages',
      });

      // Builder reports error for no pages found, but doesn't crash
      expect(result.pages.length).toBe(0);
    });
  });

  describe('Engine — CSS support', () => {
    it('returns css in compile result', () => {
      const r = Engine.compile('Gaya:\n    h1\n        color: blue\n\nBuat h1:\n    "Hi"');
      expect(r.css).toContain('color: blue');
      expect(r.success).toBe(true);
    });

    it('returns empty css when no Gaya block', () => {
      const r = Engine.compile('Buat h1:\n    "Hi"');
      expect(r.css).toBe('');
      expect(r.success).toBe(true);
    });

    it('supports @media queries', () => {
      const r = Engine.compile(
        [
          'Gaya:',
          '    .card',
          '        padding: 16px',
          '    @media (max-width: 600px)',
          '        .card',
          '            padding: 8px',
          '',
          'Buat div.card:',
          '    "Hi"',
        ].join('\n')
      );

      expect(r.css).toContain('@media (max-width: 600px)');
      expect(r.css).toContain('padding: 8px');
    });
  });

  describe('Engine — module system', () => {
    it('handles kirim directive in front-matter', () => {
      const r = Engine.compile('---\nkirim: apiKey = "abc123"\n---\nBuat h1: $apiKey');
      expect(r.success).toBe(true);
      expect(r.js).toContain('apiKey');
    });

    it('handles share (English) directive', () => {
      const r = Engine.compile('---\nshare: version = "1.0"\n---\nBuat h1: $version');
      expect(r.success).toBe(true);
      expect(r.js).toContain('version');
    });

    it('handles terima with missing file (warning, not error)', () => {
      const r = Engine.compile(
        ['---', 'terima: config dari "nonexistent.pjs"', '---', 'Buat h1: "Hello"'].join('\n')
      );

      // Should still compile successfully (with warning)
      expect(r.success).toBe(true);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });
});

afterAll(() => {
  cleanupAll();
});
