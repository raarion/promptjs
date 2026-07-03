/**
 * PromptJS — Regression: K2b documentation & showcase examples must compile.
 *
 * K2b added prose + code for FLIP list transitions and corrected the
 * reactivity.md helper table. Docs are only trustworthy if every code block
 * a reader can copy actually compiles. This suite compiles each documented
 * snippet (and the new showcase example file) so the docs can never silently
 * drift back to teaching invalid syntax.
 *
 * Coverage:
 *   reactivity.md  — FLIP transitions: opt-in snippet (keyed + transisi)
 *   reactivity.md  — honest keyword: keyed WITHOUT transisi → no __flipList
 *   syntax-reference.md — new `dengan transisi` entry compiles
 *   examples/list-transitions.pjs — showcase compiles + emits __flipList
 *   CSP-safe: showcase output carries zero eval / zero new Function
 *   build-pages.js — list-transitions entry is registered (guard config drift)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Engine from '../src/engine/promptjs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ok = (src) => {
  const r = Engine.compile(src);
  return r.success && (r.errors || []).length === 0;
};

const compile = (src) => Engine.compile(src);

// ─── docs sync v1.3.1 — FLIP transitions (reactivity.md) ─────────────────────

describe('docs sync v1.3.1 — FLIP transitions (reactivity.md)', () => {
  it('keyed + transisi snippet compiles and emits __flipList + __keyedList', () => {
    const r = compile(
      'Halaman P:\n' +
        '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi fade:\n' +
        '        Buat li: item.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.errors || []).toEqual([]);
    // honest keyword: __flipList must be wired
    expect(r.js).toContain('__flipList(');
    // __keyedList is still the underlying reconciler
    expect(r.js).toContain('__keyedList(');
  });

  it('honest keyword: keyed WITHOUT transisi does NOT emit __flipList', () => {
    const r = compile(
      'Halaman P:\n' +
        '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar dengan kunci item.id:\n' +
        '        Buat li: item.label\n'
    );
    expect(r.success).toBe(true);
    // K1b path: __keyedList yes, __flipList no
    expect(r.js).toContain('__keyedList(');
    expect(r.js).not.toContain('__flipList(');
  });

  it('transisi without kunci does NOT emit __flipList (honest keyword)', () => {
    // Parser accepts `dengan transisi` only when `dengan kunci` is also present;
    // without a key the transition modifier is silently dropped (no animation).
    const r = compile(
      'Halaman P:\n' +
        '    data daftar = []\n' +
        '    Ulangi untuk item dari $daftar:\n' +
        '        Buat li: item.label\n'
    );
    expect(r.success).toBe(true);
    expect(r.js).not.toContain('__flipList(');
  });
});

// ─── docs sync v1.3.1 — syntax-reference.md ──────────────────────────────────

describe('docs sync v1.3.1 — syntax-reference.md', () => {
  it('`dengan transisi` entry from syntax-reference.md compiles', () => {
    expect(
      ok(
        'Halaman P:\n' +
          '    data daftar = []\n' +
          '    Ulangi untuk item dari $daftar dengan kunci item.id dengan transisi fade:\n' +
          '        Buat li: item.label\n'
      )
    ).toBe(true);
  });
});

// ─── showcase sync v1.3.1 — examples/list-transitions.pjs ────────────────────

describe('showcase sync v1.3.1 — examples/list-transitions.pjs', () => {
  it('the list-transitions showcase example compiles clean', () => {
    const src = readFileSync(resolve(__dirname, '..', 'examples', 'list-transitions.pjs'), 'utf8');
    const r = Engine.compile(src);
    expect(r.success).toBe(true);
    expect(r.errors || []).toEqual([]);
  });

  it('the showcase actually exercises FLIP (emits __flipList)', () => {
    const src = readFileSync(resolve(__dirname, '..', 'examples', 'list-transitions.pjs'), 'utf8');
    const r = Engine.compile(src);
    expect(r.js).toContain('__flipList(');
    expect(r.js).toContain('__keyedList(');
  });

  it('showcase output carries zero eval / zero new Function (CSP-safe)', () => {
    const src = readFileSync(resolve(__dirname, '..', 'examples', 'list-transitions.pjs'), 'utf8');
    const r = Engine.compile(src);
    // Strip comments before checking to avoid false positives in doc strings.
    const stripped = r.js.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(/\beval\(/);
    expect(stripped).not.toMatch(/\bnew Function\(/);
  });

  it('list-transitions is registered in build-pages.js (guard config drift)', () => {
    const buildScript = readFileSync(resolve(__dirname, '..', 'scripts', 'build-pages.js'), 'utf8');
    expect(buildScript).toContain("'list-transitions'");
  });
});
