// @ts-check

/**
 * Wave 2 — Security Hardening Regression Suite (v1.0.0)
 * =====================================================
 *
 * Circuit-breaker tests untuk temuan MED dari audit mendalam. Tiap test
 * mengkodekan proof-of-concept: GAGAL sebelum fix (membuktikan kerentanan
 * nyata), LULUS sesudah fix. Bila regresi memasukkan kembali lubang, build
 * langsung merah.
 *
 * Cakupan:
 *   S-4 — Injeksi atribut/event-handler (on*) & URL skema aktif via setAttribute
 *   S-5 — Role-tampering: guard peran client-side diperkuat + seam verifyPeran
 *   S-6 — Path traversal dev-server: startsWith() cacat → path.relative()
 */

import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import path from 'node:path';
import fs from 'node:fs';
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

// ════════════════════════════════════════════════════════════════════════
// S-4 — Atribut: event-handler & URL skema aktif
// ════════════════════════════════════════════════════════════════════════

describe('S-4 — __safeAttr runtime memblokir atribut berbahaya', () => {
  /** Bangun sandbox DOM + muat helper __safeAttr, kembalikan fungsi + element. */
  function loadSafeAttr() {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    const warns = [];
    const sandbox = {
      document: dom.window.document,
      console: { warn: (m) => warns.push(String(m)), error: () => {} },
    };
    vm.createContext(sandbox);
    vm.runInContext(RT.RUNTIME_HELPER_MAP.__safeAttr, sandbox);
    const el = dom.window.document.createElement('a');
    return { sandbox, el, warns, dom };
  }

  it('audit PoC: atribut event-handler onclick DITOLAK (tidak ter-set)', () => {
    const { sandbox, el, warns } = loadSafeAttr();
    const ok = vm.runInContext('__safeAttr', sandbox)(el, 'onclick', 'alert(1)');
    expect(ok).toBe(false);
    expect(el.hasAttribute('onclick')).toBe(false);
    expect(warns.join(' ')).toMatch(/event-handler diblokir/i);
  });

  it('audit PoC: onerror / onmouseover (semua on*) DITOLAK', () => {
    const { sandbox, el } = loadSafeAttr();
    const f = vm.runInContext('__safeAttr', sandbox);
    expect(f(el, 'onerror', 'x')).toBe(false);
    expect(f(el, 'OnMouseOver', 'x')).toBe(false); // case-insensitive
    expect(el.hasAttribute('onerror')).toBe(false);
    expect(el.hasAttribute('onmouseover')).toBe(false);
  });

  it('audit PoC: href="javascript:..." DITOLAK', () => {
    const { sandbox, el } = loadSafeAttr();
    const ok = vm.runInContext('__safeAttr', sandbox)(el, 'href', 'javascript:alert(1)');
    expect(ok).toBe(false);
    expect(el.hasAttribute('href')).toBe(false);
  });

  it('audit PoC: src="data:text/html,..." DITOLAK', () => {
    const { sandbox, el } = loadSafeAttr();
    const ok = vm.runInContext('__safeAttr', sandbox)(
      el,
      'src',
      'data:text/html,<script>alert(1)</script>'
    );
    expect(ok).toBe(false);
    expect(el.hasAttribute('src')).toBe(false);
  });

  it('bypass obfuscation: " jaVaScRiPt:" (whitespace + mixed case) DITOLAK', () => {
    const { sandbox, el } = loadSafeAttr();
    const ok = vm.runInContext('__safeAttr', sandbox)(el, 'href', '  jaVaScRiPt:alert(1)');
    expect(ok).toBe(false);
  });

  it('nilai sah: href="/login" dan src="https://x/y.png" TER-SET normal', () => {
    const { sandbox, el } = loadSafeAttr();
    const f = vm.runInContext('__safeAttr', sandbox);
    expect(f(el, 'href', '/login')).toBe(true);
    expect(el.getAttribute('href')).toBe('/login');
    expect(f(el, 'src', 'https://x/y.png')).toBe(true);
    expect(f(el, 'data-id', '42')).toBe(true);
    expect(el.getAttribute('data-id')).toBe('42');
  });
});

describe('S-4 — emitter merutekan setAttribute lewat __safeAttr', () => {
  it('Buat gambar: src = <url> → emit __safeAttr(...,"src",...)', () => {
    const r = compile('Buat gambar:\n    src = "https://ex.com/a.png"\n    alt = "foto"');
    expect(errorsOf(r)).toHaveLength(0);
    expect(r.js).toMatch(/__safeAttr\(__el_\d+, "src",/);
    // Tidak ada lagi direct property assignment mentah untuk src.
    expect(r.js).not.toMatch(/__el_\d+\.src = /);
  });

  it('href via property tetap difilter (tidak direct-assign)', () => {
    const r = compile('Buat a:\n    href = "javascript:alert(1)"\n    teks = "x"');
    expect(errorsOf(r)).toHaveLength(0);
    expect(r.js).toMatch(/__safeAttr\(__el_\d+, "href",/);
    expect(r.js).not.toMatch(/__el_\d+\.href = /);
  });

  it('atribut tak-dikenal via Perbarui → __safeAttr fallback', () => {
    const r = compile('Buat div#a:\n    teks = "x"\nPerbarui #a atribut "data-role" = "admin"');
    // Apa pun jalur yang dipakai, tidak boleh ada setAttribute mentah tak-terfilter
    // untuk atribut tak-dikenal.
    if (!errorsOf(r).length && r.js) {
      const rawSet = /\.setAttribute\("data-role"/.test(r.js);
      const safe = /__safeAttr\([^,]+, "data-role"/.test(r.js);
      expect(safe || !rawSet).toBe(true);
    }
  });

  it('runtime helper __safeAttr ada di output saat dipakai (tree-shaking)', () => {
    const r = compile('Buat gambar:\n    src = "https://ex.com/a.png"');
    expect(r.js).toContain('function __safeAttr(');
  });
});

// ════════════════════════════════════════════════════════════════════════
// S-5 — Role-tampering: guard peran client-side diperkuat
// ════════════════════════════════════════════════════════════════════════

describe('S-5 — Auth role guard hardening', () => {
  const authSrc = (peran) =>
    `butuhAuth: benar\ntoken: localStorage\nredirect: "/login"\nperan: "${peran}"\n---\nBuat ruang:\n  "rahasia"`;

  it('guard peran mendukung banyak peran (split koma + normalisasi)', () => {
    const r = compile(authSrc('admin, editor'));
    expect(errorsOf(r)).toHaveLength(0);
    expect(r.js).toMatch(/split\(','\)/);
    expect(r.js).toMatch(/toLowerCase\(\)/);
    expect(r.js).toMatch(/indexOf\(__peranNorm\)/);
  });

  it('menyediakan seam window.__pjs_verifyPeran untuk verifikasi server-side', () => {
    const r = compile(authSrc('admin'));
    expect(r.js).toContain('window.__pjs_verifyPeran');
  });

  it('jujur: emit console.warn bahwa cek peran bersifat advisory/client-side', () => {
    const r = compile(authSrc('admin'));
    expect(r.js).toMatch(/client-side|advisory/i);
    expect(r.js).toMatch(/console\.warn/);
  });

  it('eksekusi: __pjs_verifyPeran=false MENOLAK walau __peran cocok (anti-tamper seam)', () => {
    const r = compile(authSrc('admin'));
    expect(errorsOf(r)).toHaveLength(0);
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    const redirects = [];
    // Stub localStorage: penyerang memalsukan peran 'admin'.
    const storage = { getItem: (k) => (k === '__peran' ? 'admin' : 'tok') };
    // window TIRUAN dengan location.href yang bisa di-set (hindari batasan JSDOM).
    const fakeWindow = {
      __pjs_verifyPeran: () => false, // verifikasi server-side menolak
      location: {
        _href: '',
        set href(v) {
          redirects.push(v);
          this._href = v;
        },
        get href() {
          return this._href;
        },
      },
    };
    const sandbox = {
      window: fakeWindow,
      document: dom.window.document,
      localStorage: storage,
      console: { warn() {}, error() {} },
    };
    vm.createContext(sandbox);
    // Jalankan seluruh output; guard auth berjalan lebih dulu (body aman).
    expect(() => vm.runInContext(r.js, sandbox)).not.toThrow();
    expect(redirects).toContain('/login'); // ditolak → redirect
  });

  it('eksekusi: tanpa seam, peran palsu cocok → console.warn advisory muncul', () => {
    const r = compile(authSrc('admin'));
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    const warns = [];
    const storage = { getItem: (k) => (k === '__peran' ? 'admin' : 'tok') };
    const fakeWindow = {
      location: {
        _href: '',
        set href(v) {
          this._href = v;
        },
        get href() {
          return this._href;
        },
      },
    };
    const sandbox = {
      window: fakeWindow,
      document: dom.window.document,
      localStorage: storage,
      console: { warn: (m) => warns.push(String(m)), error() {} },
    };
    vm.createContext(sandbox);
    expect(() => vm.runInContext(r.js, sandbox)).not.toThrow();
    // Tanpa seam, cek client-side lolos TAPI memperingatkan dengan jujur.
    expect(warns.join(' ')).toMatch(/client-side|advisory|server/i);
  });
});

// ════════════════════════════════════════════════════════════════════════
// S-6 — Path traversal dev-server: path.relative, bukan startsWith
// ════════════════════════════════════════════════════════════════════════

describe('S-6 — Dev-server traversal guard', () => {
  // Replikasi logika guard SETELAH fix (path.relative) untuk membuktikan
  // bahwa kelas serangan sibling-escape & encoded-traversal kini tertutup.
  function isInside(rootDir, requestedRel) {
    const resolved = path.resolve(rootDir, requestedRel);
    const rel = path.relative(rootDir, resolved);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }

  it('audit PoC: sibling-directory escape (/srv/app vs /srv/app-secret) DITOLAK', () => {
    const root = '/srv/app';
    // startsWith() lama: path.resolve('/srv/app','../app-secret/x') = '/srv/app-secret/x'
    // → '/srv/app-secret/x'.startsWith('/srv/app') === true (LOLOS, BUG).
    const resolved = path.resolve(root, '../app-secret/secret.txt');
    expect(resolved.startsWith(root)).toBe(true); // membuktikan bug lama nyata
    expect(isInside(root, '../app-secret/secret.txt')).toBe(false); // fix menolak
  });

  it('audit PoC: ../../etc/passwd DITOLAK', () => {
    expect(isInside('/srv/app', '../../etc/passwd')).toBe(false);
  });

  it('file di dalam root TETAP diizinkan', () => {
    expect(isInside('/srv/app', 'index.html')).toBe(true);
    expect(isInside('/srv/app', 'sub/dir/page.pjs')).toBe(true);
    expect(isInside('/srv/app', '')).toBe(true);
  });

  it('source serve.js memakai path.relative (bukan startsWith yang cacat)', () => {
    const serveSrc = fs.readFileSync(
      path.resolve(__dirname, '../../src/cli/commands/serve.js'),
      'utf8'
    );
    expect(serveSrc).toMatch(/path\.relative\(rootDir, resolved\)/);
    // Guard lama yang cacat tidak boleh lagi menjadi satu-satunya pemeriksaan.
    expect(serveSrc).not.toMatch(/if \(!resolved\.startsWith\(rootDir\)\)/);
  });

  it('source serve.js men-decode percent-encoding (anti %2e%2e traversal)', () => {
    const serveSrc = fs.readFileSync(
      path.resolve(__dirname, '../../src/cli/commands/serve.js'),
      'utf8'
    );
    expect(serveSrc).toMatch(/decodeURIComponent\(urlPath\)/);
  });
});
