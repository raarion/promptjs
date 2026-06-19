/**
 * PromptJS — C4 expression tests.
 * Covers word operators (Wave C4.1). Ternary and object literals are added
 * in their respective C4 stages.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

const wrapCond = (cond) => `tetap a = 1\ntetap b = 0\nBuat ruang:\n    Jika ${cond}:\n        "x"`;
const wrapVal = (expr) => `tetap n = ${expr}\nBuat ruang:\n    "x"`;

describe('C4.1 — word operators', () => {
  it('logical dan/atau map to && / ||', () => {
    expect(Engine.compile(wrapCond('a dan b')).js).toContain('(a && b)');
    expect(Engine.compile(wrapCond('a atau b')).js).toContain('(a || b)');
  });

  it('word comparators map to JS comparison operators', () => {
    expect(Engine.compile(wrapCond('a lebih dari b')).js).toContain('(a > b)');
    expect(Engine.compile(wrapCond('a kurang dari b')).js).toContain('(a < b)');
    expect(Engine.compile(wrapCond('a sama dengan b')).js).toContain('(a === b)');
    expect(Engine.compile(wrapCond('a tidak sama dengan b')).js).toContain('(a !== b)');
    expect(Engine.compile(wrapCond('a paling sedikit b')).js).toContain('(a >= b)');
    expect(Engine.compile(wrapCond('a paling banyak b')).js).toContain('(a <= b)');
  });

  it('word arithmetic operators compile correctly', () => {
    expect(Engine.compile(wrapVal('3 kali 2')).js).toContain('(3 * 2)');
    expect(Engine.compile(wrapVal('6 bagi 2')).js).toContain('(6 / 2)');
    expect(Engine.compile(wrapVal('5 tambah 1')).js).toContain('(5 + 1)');
    expect(Engine.compile(wrapVal('5 kurang 1')).js).toContain('(5 - 1)');
    expect(Engine.compile(wrapVal('5 mod 2')).js).toContain('(5 % 2)');
    expect(Engine.compile(wrapVal('2 pangkat 3')).js).toContain('(2 ** 3)');
  });

  it('respects precedence: tambah lower than kali', () => {
    const r = Engine.compile(wrapVal('1 tambah 2 kali 3'));
    expect(r.success).toBe(true);
    expect(r.js).toContain('(1 + (2 * 3))');
  });

  it('does not mistake identifiers that merely start with an operator word', () => {
    // `danau` (lake) must remain an identifier, not the operator `dan`.
    const r = Engine.compile('tetap danau = 5\nBuat ruang:\n    teks = danau');
    expect(r.success).toBe(true);
    expect(r.js).toContain('danau');
  });

  it('symbol operators still work alongside word operators', () => {
    expect(Engine.compile(wrapCond('a > b')).js).toContain('(a > b)');
    expect(Engine.compile(wrapCond('a && b')).js).toContain('(a && b)');
  });

  it('does not break the counted loop suffix "kali"/"times"', () => {
    const id = Engine.compile('Buat ruang:\n    Ulangi 3 kali:\n        "hi"');
    expect(id.success).toBe(true);
    expect(id.js).toContain('for');
    const en = Engine.compile('Buat ruang:\n    Loop 3 times:\n        "hi"');
    expect(en.success).toBe(true);
    expect(en.js).toContain('for');
  });

  it('allows multiply inside a counted-loop count: "Ulangi 2 kali 3 kali"', () => {
    const r = Engine.compile('Buat ruang:\n    Ulangi 2 kali 3 kali:\n        "hi"');
    expect(r.success).toBe(true);
    expect(r.js).toContain('(2 * 3)');
    expect(r.js).toContain('for');
  });
});

describe('C4.2 — ternary conditional', () => {
  const wrapVal = (expr) => `tetap r = ${expr}\nBuat ruang:\n    "x"`;

  it('compiles a simple ternary', () => {
    const r = Engine.compile(wrapVal('1 lebih dari 0 ? "ya" : "tidak"'));
    expect(r.success).toBe(true);
    expect(r.js).toContain('((1 > 0) ? "ya" : "tidak")');
  });

  it('is right-associative when nested', () => {
    const r = Engine.compile(
      wrapVal('2 sama dengan 1 ? "satu" : 2 sama dengan 2 ? "dua" : "lain"')
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('((2 === 1) ? "satu" : ((2 === 2) ? "dua" : "lain"))');
  });

  it('resolves reactive data inside the ternary (appends .value)', () => {
    const r = Engine.compile(
      'data x = 5\ntetap msg = x lebih dari 0 ? "pos" : "neg"\nBuat ruang:\n    "x"'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('((x.value > 0) ? "pos" : "neg")');
  });

  it('works with symbol conditions and parentheses', () => {
    const r = Engine.compile(wrapVal('(3 > 1) ? 10 : 20'));
    expect(r.success).toBe(true);
    expect(r.js).toContain('((3 > 1) ? 10 : 20)');
  });
});
