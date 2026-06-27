// @ts-check

/**
 * Wave 1 — Security Regression Suite (v1.0.0)
 * ===========================================
 *
 * Circuit-breaker tests: tiap test mengkodekan proof-of-concept dari audit
 * mendalam (commit 587802f). Test ini GAGAL sebelum fix (membuktikan
 * kerentanan nyata) dan LULUS sesudah fix. Jika regresi memasukkan kembali
 * lubang, build langsung merah.
 *
 * Cakupan:
 *   S-1 — Code-injection via front-matter auth (token/redirect/key/peran)
 *   S-3 — Inkonsistensi sanitasi `html` (dua jalur emit innerHTML)
 *   S-2 — Sanitizer __sanitizeHTML dapat di-bypass (regex blocklist)
 */

import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const PJS = require('../../src/engine/promptjs');
const RT = require('../../src/compiler/emitters/runtime');

/** Compile satu sumber .pjs via engine penuh. */
function compile(src) {
  return PJS.compile(src);
}
/** Ambil hanya error fatal (severity 'error'). */
function errorsOf(result) {
  return (result.errors || []).filter((e) => e.severity === 'error');
}

// ════════════════════════════════════════════════════════════════════════════
// S-1 — Code-injection via front-matter auth
// ════════════════════════════════════════════════════════════════════════════

describe('S-1 — Auth front-matter code-injection', () => {
  it("audit PoC: token storage breakout (localStorage'); window.PWNED=1) ditolak (E5004)", () => {
    const src = `butuhAuth: benar
token: localStorage'); window.PWNED=1; ((
---
Buat ruang:
  "hi"`;
    const result = compile(src);
    const errs = errorsOf(result);
    expect(errs.map((e) => e.code)).toContain('E5004');
    // Output diblokir total — tidak ada JS yang di-emit dengan payload.
    expect(result.js).toBeNull();
  });

  it('hanya localStorage / sessionStorage yang diterima sebagai token storage', () => {
    for (const bad of ['cookieStore', 'window', 'eval', 'document']) {
      const r = compile(`butuhAuth: benar\ntoken: ${bad}\n---\nBuat ruang:\n  "hi"`);
      expect(errorsOf(r).map((e) => e.code)).toContain('E5004');
    }
    for (const ok of ['localStorage', 'sessionStorage']) {
      const r = compile(`butuhAuth: benar\ntoken: ${ok}\n---\nBuat ruang:\n  "hi"`);
      expect(errorsOf(r)).toEqual([]);
    }
  });

  it('tokenKey & redirect berbahaya di-escape menjadi string literal valid (tidak breakout)', () => {
    const src = `butuhAuth: benar
token: localStorage
tokenKey: x'); window.PWNED=2; ('
redirect: "/login'); window.PWNED=3; ('"
---
Buat ruang:
  "hi"`;
    const result = compile(src);
    expect(errorsOf(result)).toEqual([]);
    expect(result.js).toBeTruthy();
    // Bukti utama: output JS PARSE valid (payload terkurung dalam string literal).
    expect(() => new vm.Script(result.js)).not.toThrow();
    // PWNED muncul HANYA sebagai data di dalam string getItem("..."), bukan kode.
    expect(result.js).toContain('getItem("x\'); window.PWNED=2; (\'")');
  });

  it('redirect dengan skema aktif (javascript:/data:/vbscript:) ditolak (E5005)', () => {
    for (const scheme of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:msgbox']) {
      const r = compile(
        `butuhAuth: benar\ntoken: localStorage\nredirect: "${scheme}"\n---\nBuat ruang:\n  "hi"`
      );
      expect(errorsOf(r).map((e) => e.code)).toContain('E5005');
    }
  });

  it('peran berbahaya di-escape (tidak breakout dari __allowedPeran)', () => {
    const src = `butuhAuth: benar
token: localStorage
peran: admin'; window.PWNED=4; var x='
---
Buat ruang:
  "hi"`;
    const result = compile(src);
    expect(errorsOf(result)).toEqual([]);
    expect(() => new vm.Script(result.js)).not.toThrow();
  });

  it('jalur auth yang sah tetap berfungsi (no regression)', () => {
    const src = `butuhAuth: benar
token: sessionStorage
tokenKey: jwt
redirect: "/masuk"
---
Buat ruang:
  "Konten terlindungi"`;
    const result = compile(src);
    expect(errorsOf(result)).toEqual([]);
    expect(result.js).toContain('sessionStorage.getItem("jwt")');
    expect(result.js).toContain('/masuk');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// S-3 — Konsistensi sanitasi html (tidak ada innerHTML mentah)
// ════════════════════════════════════════════════════════════════════════════

describe('S-3 — html selalu melewati __sanitizeHTML', () => {
  it('helper emitHtmlAssignment selalu membungkus dengan __sanitizeHTML', () => {
    const Compiler = require('../../src/compiler/promptjs-compiler');
    /** @type {any} */
    const c = new Compiler();
    c.output = [];
    c.indent = 0;
    c.helpers = new Set();
    c.emitHtmlAssignment('__el_1', 'userData');
    expect(c.output[0]).toBe('__el_1.innerHTML = __sanitizeHTML(userData);');
    expect(c.helpers.has('__sanitizeHTML')).toBe(true);
  });

  it('property html (visitPropertyNode) di-emit dengan __sanitizeHTML', () => {
    const Compiler = require('../../src/compiler/promptjs-compiler');
    /** @type {any} */
    const c = new Compiler();
    c.output = [];
    c.indent = 0;
    c.helpers = new Set();
    c.currentParent = '__el_1';
    c.lowerExpression = () => 'rawHtml';
    c.visitPropertyNode({ key: 'html', value: { type: 'Literal', value: 'x' } });
    const line = c.output.find((l) => l.includes('innerHTML'));
    expect(line).toContain('__sanitizeHTML(');
    expect(line).not.toMatch(/innerHTML\s*=\s*rawHtml\s*;/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// S-2 — Sanitizer berbasis allowlist menetralkan bypass
// ════════════════════════════════════════════════════════════════════════════

describe('S-2 — __sanitizeHTML allowlist menetralkan XSS', () => {
  /** Materialisasi fungsi __sanitizeHTML yang di-emit, di dalam DOM jsdom. */
  function makeSanitizer() {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    const ctx = {
      document: dom.window.document,
      DOMParser: dom.window.DOMParser,
      window: dom.window,
    };
    vm.createContext(ctx);
    const src = RT.RUNTIME_HELPER_MAP.__sanitizeHTML;
    return vm.runInContext('(' + src.replace(/^function __sanitizeHTML/, 'function') + ')', ctx);
  }

  const sanitize = makeSanitizer();

  /** True jika output masih mengandung vektor berbahaya. */
  function isDangerous(out) {
    const low = String(out).toLowerCase();
    return (
      /<script/.test(low) ||
      /\son\w+\s*=/.test(low) ||
      /(javascript|vbscript|data)\s*:/.test(low) ||
      /<(iframe|object|embed|base|form|svg)\b/.test(low) ||
      /srcdoc/.test(low)
    );
  }

  const vectors = [
    ['audit: iframe srcdoc', '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>'],
    ['audit: href javascript&colon;', '<a href="javascript&colon;alert(1)">x</a>'],
    ['script tag', '<script>alert(1)</script>'],
    ['img onerror', '<img src=x onerror=alert(1)>'],
    ['svg onload', '<svg onload=alert(1)></svg>'],
    ['object data js', '<object data="javascript:alert(1)"></object>'],
    ['embed src js', '<embed src="javascript:alert(1)">'],
    ['base href js', '<base href="javascript:alert(1)">'],
    ['a href data:html', '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
    ['a href plain js', '<a href="javascript:alert(1)">x</a>'],
    ['obfuscated scheme', '<a HREF="  jAvAsCrIpT:alert(1)">x</a>'],
    ['form action js', '<form action="javascript:alert(1)"><button>go</button></form>'],
  ];

  it.each(vectors)('menetralkan vektor: %s', (_name, payload) => {
    expect(isDangerous(sanitize(payload))).toBe(false);
  });

  it('mempertahankan HTML kaya yang benign (tidak over-strip)', () => {
    const out = sanitize(
      '<p class="x">Hello <strong>world</strong> <a href="https://example.com">link</a></p>'
    );
    expect(out).toContain('<strong>world</strong>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('Hello');
  });

  it('input non-string aman (tidak melempar)', () => {
    expect(() => sanitize(null)).not.toThrow();
    expect(() => sanitize(undefined)).not.toThrow();
    expect(() => sanitize(123)).not.toThrow();
  });
});
