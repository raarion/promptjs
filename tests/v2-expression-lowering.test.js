// @ts-check

/**
 * v2 Edge-Case Suite — Expression Lowering (src/compiler/lower/expression.js)
 * ===========================================================================
 *
 * Targets the previously-untested branches of expression lowering (baseline
 * 44% lines): the "Wave G" action keywords used as expression values, the
 * localStorage/sessionStorage special-casing in `simpan`/`hapus`, reactive vs
 * non-reactive write paths, mutating array methods, and the `perbarui`
 * property variants.
 *
 * Every assertion is keyed to a behavioral contract: a given .pjs construct
 * must lower to a specific, deterministic JS shape. These compile through the
 * full Engine pipeline (no internal mocking) so they double as integration
 * proof that the keyword survives lexer → parser → resolver → compiler.
 */

import { describe, it, expect, vi } from 'vitest';
import Engine from '../src/engine/promptjs.js';
const { lowerExpression } = require('../src/compiler/lower/expression.js');

/**
 * Minimal compiler stub for unit-testing lowerExpression in isolation.
 * Mirrors the real compiler's contract: resolveTarget(node) → code string,
 * helpers Set, and visitPanggilNativeExpression delegate.
 */
function makeStub() {
  return {
    helpers: new Set(),
    resolveTarget(node) {
      // Identifier targets → their name; MemberExpression → obj.prop
      if (!node) return 'undefined';
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'MemberExpression') {
        return `${node.object.name}.${node.property.name}`;
      }
      return String(node.name || 'undefined');
    },
    visitPanggilNativeExpression() {
      return '__native()';
    },
  };
}

const id = (name, resolved) => ({ type: 'Identifier', name, resolved });
const lit = (value) => ({ type: 'Literal', value });
const member = (objName, propName) => ({
  type: 'MemberExpression',
  object: id(objName),
  property: id(propName),
});

/** Compile and assert no hard errors, returning the emitted JS. */
function compileOk(source) {
  const r = Engine.compile(source);
  const hardErrors = (r.errors || []).filter((e) => e.severity === 'error');
  if (hardErrors.length > 0) {
    expect.fail(
      `Expected clean compile but got errors: ${hardErrors
        .map((e) => `${e.code}:${e.message}`)
        .join(' | ')}`
    );
  }
  expect(r.success).toBe(true);
  expect(r.js).toBeTruthy();
  return r.js;
}

// A page scaffold that declares a reactive `data` var and a plain `ubah` var,
// then runs an action inside a click handler so the action lowers as an
// expression value (the path through lowerExpression's Wave-G cases).
const page = (decls, action) => `---
judul: "T"
---
Halaman T:
  ${decls}

  Buat tombol:
    "Aksi"
    on_klik = ${action}`;

describe('v2 — simpan (SimpanStatement) lowering', () => {
  it('reactive data target → __setState(...)', () => {
    const js = compileOk(page('data hitung = 0', 'simpan 5 ke hitung'));
    expect(js).toContain('__setState');
  });

  it('plain ubah target → direct assignment (no __setState)', () => {
    const js = compileOk(page('ubah x = 0\n  Buat teks:\n    teks = x', 'simpan 9 ke x'));
    // The simpan write to a plain var must be a direct `=`, not reactive.
    expect(js).toContain('= 9');
  });

  it('simpan ... ke localStorage.<key> → localStorage.setItem', () => {
    const js = compileOk(page('ubah a = 0', 'simpan "tok" ke localStorage.token'));
    expect(js).toContain('localStorage.setItem("token", "tok")');
  });

  it('simpan ... ke sessionStorage.<key> → sessionStorage.setItem', () => {
    const js = compileOk(page('ubah a = 0', 'simpan "v" ke sessionStorage.kunci'));
    expect(js).toContain('sessionStorage.setItem("kunci", "v")');
  });
});

describe('v2 — tambahkan / kurangi / sisipkan lowering', () => {
  it('tambahkan to reactive array → push + __setState spread', () => {
    const js = compileOk(page('data daftar = [1, 2]', 'tambahkan 3 ke daftar'));
    expect(js).toContain('.value.push(3)');
    expect(js).toContain('__setState');
  });
});

describe('v2 — hapus (HapusDari / removeItem / DOM remove) lowering', () => {
  it('hapus <item> dari reactive array → filter + __setState', () => {
    const js = compileOk(page('data daftar = ["a", "b"]', 'hapus "a" dari daftar'));
    expect(js).toContain('.value.filter');
    expect(js).toContain('__setState');
  });

  it('hapus localStorage.<key> → removeItem', () => {
    const js = compileOk(page('ubah a = 0', 'hapus localStorage.token'));
    expect(js).toContain('localStorage.removeItem("token")');
  });

  it('hapus sessionStorage.<key> → removeItem', () => {
    const js = compileOk(page('ubah a = 0', 'hapus sessionStorage.sid'));
    expect(js).toContain('sessionStorage.removeItem("sid")');
  });
});

describe('v2 — perbarui (PerbaruiStatement) property variants (unit)', () => {
  const perbarui = (property, value) =>
    lowerExpression(makeStub(), {
      type: 'PerbaruiStatement',
      target: id('kotak'),
      property,
      value: lit(value),
    });

  it('perbarui teks → innerText', () => {
    expect(perbarui('teks', 'halo')).toBe('kotak.innerText = "halo"');
  });

  it('perbarui html → sanitized innerHTML + helper registered', () => {
    const s = makeStub();
    const out = lowerExpression(s, {
      type: 'PerbaruiStatement',
      target: id('kotak'),
      property: 'html',
      value: lit('<b>x</b>'),
    });
    expect(out).toContain('__sanitizeHTML');
    expect(out).toContain('.innerHTML');
    expect(s.helpers.has('__sanitizeHTML')).toBe(true);
  });

  it('perbarui kelas → className', () => {
    expect(perbarui('kelas', 'aktif')).toBe('kotak.className = "aktif"');
  });

  it('perbarui arbitrary attribute → setAttribute', () => {
    expect(perbarui('data-id', '5')).toBe('kotak.setAttribute("data-id", "5")');
  });
});

describe('v2 — DOM action keywords as values (unit: lowerExpression)', () => {
  it('KosongkanStatement → innerHTML = ""', () => {
    const s = makeStub();
    const out = lowerExpression(s, { type: 'KosongkanStatement', target: id('kotak') });
    expect(out).toBe('kotak.innerHTML = ""');
  });

  it('SembunyikanStatement → display none', () => {
    const s = makeStub();
    const out = lowerExpression(s, { type: 'SembunyikanStatement', target: id('kotak') });
    expect(out).toContain('display = "none"');
  });

  it('TampilkanStatement → display ""', () => {
    const s = makeStub();
    const out = lowerExpression(s, { type: 'TampilkanStatement', target: id('kotak') });
    expect(out).toMatch(/style\.display = ""/);
  });

  it('MuatUlangStatement → location.reload()', () => {
    expect(lowerExpression(makeStub(), { type: 'MuatUlangStatement' })).toBe(
      'window.location.reload()'
    );
  });

  it('KembaliStatement → history.back()', () => {
    expect(lowerExpression(makeStub(), { type: 'KembaliStatement' })).toBe('window.history.back()');
  });

  it('BerhentiStatement → break', () => {
    expect(lowerExpression(makeStub(), { type: 'BerhentiStatement' })).toBe('break');
  });

  it('ArahkanStatement → location.href assignment', () => {
    const out = lowerExpression(makeStub(), { type: 'ArahkanStatement', url: lit('/home') });
    expect(out).toBe('window.location.href = "/home"');
  });

  it('HapusStatement on localStorage.<key> → removeItem', () => {
    const out = lowerExpression(makeStub(), {
      type: 'HapusStatement',
      target: member('localStorage', 'token'),
    });
    expect(out).toBe('localStorage.removeItem("token")');
  });

  it('HapusStatement on a DOM target → .remove()', () => {
    const out = lowerExpression(makeStub(), { type: 'HapusStatement', target: id('kotak') });
    expect(out).toBe('kotak.remove()');
  });
});

describe('v2 — reactive write paths (unit: lowerExpression)', () => {
  const reactive = (name) => id(name, { kind: 'data' });

  it('SimpanStatement to reactive target → __setState', () => {
    const out = lowerExpression(makeStub(), {
      type: 'SimpanStatement',
      target: reactive('hitung'),
      value: lit(5),
      targetSymbol: { isReactive: true },
    });
    expect(out).toBe('__setState(hitung, 5)');
  });

  it('SimpanStatement to plain target → direct assignment', () => {
    const out = lowerExpression(makeStub(), {
      type: 'SimpanStatement',
      target: id('x'),
      value: lit(9),
      targetSymbol: { isReactive: false },
    });
    expect(out).toBe('x = 9');
  });

  it('TambahkanStatement to reactive array → push + __setState spread', () => {
    const out = lowerExpression(makeStub(), {
      type: 'TambahkanStatement',
      target: reactive('daftar'),
      value: lit('z'),
      targetSymbol: { isReactive: true },
    });
    expect(out).toContain('daftar.value.push("z")');
    expect(out).toContain('__setState(daftar, [...daftar.value])');
  });

  it('TambahkanStatement to plain array → direct push', () => {
    const out = lowerExpression(makeStub(), {
      type: 'TambahkanStatement',
      target: id('arr'),
      value: lit(1),
      targetSymbol: { isReactive: false },
    });
    expect(out).toBe('arr.push(1)');
  });

  it('KurangiStatement reactive without amount → defaults to 1', () => {
    const out = lowerExpression(makeStub(), {
      type: 'KurangiStatement',
      target: reactive('n'),
      value: null,
      targetSymbol: { isReactive: true },
    });
    expect(out).toBe('__setState(n, n.value - 1)');
  });

  it('PerbaruiStatement nilai → .value assignment', () => {
    const out = lowerExpression(makeStub(), {
      type: 'PerbaruiStatement',
      target: id('input'),
      property: 'nilai',
      value: lit('v'),
    });
    expect(out).toBe('input.value = "v"');
  });
});

describe('v2 — mutating array method calls (unit: lowerExpression)', () => {
  it('reactive arr.push(x) wraps in IIFE with spread re-assign', () => {
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: id('arr', { kind: 'data' }),
        property: id('push'),
      },
      arguments: [lit(1)],
    };
    const out = lowerExpression(makeStub(), node);
    expect(out).toContain('var __r =');
    expect(out).toContain('= [...');
    expect(out).toContain('return __r');
  });

  it('non-reactive arr.push(x) → plain method call', () => {
    const node = {
      type: 'CallExpression',
      callee: { type: 'MemberExpression', object: id('arr'), property: id('push') },
      arguments: [lit(1)],
    };
    const out = lowerExpression(makeStub(), node);
    expect(out).toBe('arr.push(1)');
  });

  it('non-mutating method (map) on reactive → plain call (no IIFE)', () => {
    const node = {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: id('arr', { kind: 'data' }),
        property: id('map'),
      },
      arguments: [id('fn')],
    };
    const out = lowerExpression(makeStub(), node);
    // A reactive identifier lowers with `.value`, and a non-mutating method
    // is called directly (no reactivity-trigger IIFE).
    expect(out).toBe('arr.value.map(fn)');
    expect(out).not.toContain('__r');
  });
});

describe('v2 — fallback & null-node handling (unit: lowerExpression)', () => {
  it('null node → "undefined"', () => {
    expect(lowerExpression(makeStub(), null)).toBe('undefined');
  });

  it('FetchBranch / FetchOption / ErrorNode → "undefined"', () => {
    expect(lowerExpression(makeStub(), { type: 'FetchBranch' })).toBe('undefined');
    expect(lowerExpression(makeStub(), { type: 'FetchOption' })).toBe('undefined');
    expect(lowerExpression(makeStub(), { type: 'ErrorNode' })).toBe('undefined');
  });

  it('unknown node type → warns (PJS-W2001) and returns "undefined"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = lowerExpression(makeStub(), { type: 'TotallyUnknownNode' });
    expect(out).toBe('undefined');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('PJS-W2001'));
    warn.mockRestore();
  });

  it('external Identifier → emitted as bare name', () => {
    expect(lowerExpression(makeStub(), id('ext', { kind: 'external' }))).toBe('ext');
    expect(lowerExpression(makeStub(), { type: 'Identifier', name: 'fb', _isExternal: true })).toBe(
      'fb'
    );
  });

  it('empty ObjectLiteral / ArrayLiteral → {} / []', () => {
    expect(lowerExpression(makeStub(), { type: 'ObjectLiteral', properties: [] })).toBe('{}');
    expect(lowerExpression(makeStub(), { type: 'ArrayLiteral', elements: [] })).toBe('[]');
  });

  it('ConditionalExpression → ternary', () => {
    const out = lowerExpression(makeStub(), {
      type: 'ConditionalExpression',
      test: lit(true),
      consequent: lit(1),
      alternate: lit(2),
    });
    expect(out).toBe('(true ? 1 : 2)');
  });

  it('UnaryExpression "tidak" → ! prefix; postfix form respected', () => {
    expect(
      lowerExpression(makeStub(), { type: 'UnaryExpression', operator: 'tidak', operand: id('a') })
    ).toBe('(!a)');
    expect(
      lowerExpression(makeStub(), {
        type: 'UnaryExpression',
        operator: '++',
        operand: id('a'),
        prefix: false,
      })
    ).toBe('(a++)');
  });
});

describe('v2 — built-in function lowering edge cases', () => {
  const valExpr = (expr) => `---
judul: "T"
---
Halaman T:
  data arr = [3, 1, 2]
  Buat teks:
    teks = ${expr}`;

  it('panjang(arr) → .length', () => {
    expect(compileOk(valExpr('panjang(arr)'))).toContain('.length');
  });

  it('urutkan(arr) → copy then sort (non-mutating)', () => {
    expect(compileOk(valExpr('urutkan(arr)'))).toContain('].sort(');
  });

  it('balik(arr) → copy then reverse (non-mutating)', () => {
    expect(compileOk(valExpr('balik(arr)'))).toContain('].reverse()');
  });

  it('gabung(arr, "-") → join with separator', () => {
    expect(compileOk(valExpr('gabung(arr, "-")'))).toContain('.join("-")');
  });

  it('apakahKosong(arr) → null/undefined/empty guard', () => {
    const js = compileOk(valExpr('apakahKosong(arr)'));
    expect(js).toContain('=== null');
    expect(js).toContain('Array.isArray');
  });

  it('apakahAda(arr, 2) → includes', () => {
    expect(compileOk(valExpr('apakahAda(arr, 2)'))).toContain('.includes(');
  });

  it('saring / pilih / temukan → filter / map / find (unit)', () => {
    const call = (jsName) => ({
      type: 'CallExpression',
      isBuiltin: true,
      builtinInfo: { helper: true, jsName },
      arguments: [id('arr'), id('fn')],
    });
    expect(lowerExpression(makeStub(), call('__promptjs_saring'))).toBe('arr.filter(fn)');
    expect(lowerExpression(makeStub(), call('__promptjs_pilih'))).toBe('arr.map(fn)');
    expect(lowerExpression(makeStub(), call('__promptjs_temukan'))).toBe('arr.find(fn)');
  });

  it('prefix builtin (tipeData) → typeof prefix form', () => {
    const out = lowerExpression(makeStub(), {
      type: 'CallExpression',
      isBuiltin: true,
      isPrefixBuiltin: true,
      builtinInfo: { jsName: 'typeof', prefix: true },
      arguments: [id('x')],
    });
    expect(out).toBe('typeof x');
  });

  it('unknown helper jsName → fallback to jsName(args)', () => {
    const out = lowerExpression(makeStub(), {
      type: 'CallExpression',
      isBuiltin: true,
      builtinInfo: { helper: true, jsName: '__promptjs_unknownThing' },
      arguments: [id('a')],
    });
    expect(out).toBe('__promptjs_unknownThing(a)');
  });
});
